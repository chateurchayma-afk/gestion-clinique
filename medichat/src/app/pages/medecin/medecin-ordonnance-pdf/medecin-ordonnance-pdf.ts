import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/toast.service';
import { MedecinPortalService } from '../../../services/medecin-portal.service';
import { OrdonnanceService } from '../../../services/ordonnance.service';
import { Patient } from '../../../services/patient.service';
import { RouterLink } from '@angular/router';
import {
  formatLignesPourOrdonnance,
  LS_CONSULTATION_BROUILLON,
  LS_ORDONNANCE_META,
  LS_ORDONNANCE_TEXTE,
  parseConsultationBrouillon
} from '../medecin-ordonnance-sync';
import html2pdf from 'html2pdf.js';
import QRCode from 'qrcode';
import { encodeOrdonnanceQrUrl } from '../../../core/ordonnance-qr-codec';
import { environment } from '../../../../environments/environment';

function isoToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatFr(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return iso;
  }
  const [a, b, c] = iso.split('-');
  return `${c}/${b}/${a}`;
}

@Component({
  selector: 'app-medecin-ordonnance-pdf',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './medecin-ordonnance-pdf.html',
  styleUrls: ['./medecin-ordonnance-pdf.css', '../medecin-pro.css']
})
export class MedecinOrdonnancePdf implements OnInit {
  private readonly medecinPortal = inject(MedecinPortalService);
  private readonly toast = inject(ToastService);
  private readonly ordonnanceService = inject(OrdonnanceService);
  readonly patients = signal<Patient[]>([]);
  /** Génération PDF (html2pdf) en cours */
  readonly pdfBusy = signal(false);
  readonly saveBusy = signal(false);
  readonly qrDataUrl = signal('');
  patientId: number | null = null;
  medicamentsText = signal('');
  dateOrdonnance = isoToday();
  medecinLabel = 'Médecin';
  medecinAddr = 'Cabinet — adresse, ville';
  medecinAdresse = '';
  medecinVille = '';
  medecinTel = '—';
  medecinEmail = '—';
  private qrTimer: ReturnType<typeof setTimeout> | null = null;

  readonly selectedPatient = computed(() => {
    const id = this.patientId;
    if (id == null) {
      return null;
    }
    return this.patients().find((p) => p.id === id) ?? null;
  });

  readonly patientName = computed(() => {
    const p = this.selectedPatient();
    if (!p) {
      return '';
    }
    return `${p.utilisateur.prenom} ${p.utilisateur.nom}`.trim();
  });

  readonly canEncodeQr = computed(() => {
    return this.patientId != null && this.medicamentsText().trim().length > 0;
  });

  readonly bodyLines = computed(() => {
    const t = this.medicamentsText().trim();
    if (t) {
      return t.split('\n').filter((l) => l.trim().length > 0);
    }
    return [] as string[];
  });

  ngOnInit(): void {
    this.hydrateUser();
    this.hydrateFromApi();

    this.medecinPortal.getMesPatients().subscribe({
      next: (list) => {
        const L = list ?? [];
        this.patients.set(L);
        this.importFromConsultation(L);
        if (this.patientId != null && !L.some((p) => p.id === this.patientId)) {
          this.patientId = null;
        }
        // Aucun patient valide → formulaire complètement vide
        if (this.patientId == null) {
          this.medicamentsText.set('');
          this.dateOrdonnance = isoToday();
          this.persist();
        }
        this.scheduleQrUpdate();
      },
      error: () => this.toast.show('Patients indisponibles.', 'error')
    });
  }

  private hydrateUser(): void {
    const raw = localStorage.getItem('user');
    if (raw) {
      try {
        const u = JSON.parse(raw) as { prenom?: string; nom?: string; email?: string; telephone?: string };
        const n = [u.prenom, u.nom].filter(Boolean).join(' ').trim();
        if (n) {
          this.medecinLabel = `Dr. ${n}`;
        }
        if (u.email) {
          this.medecinEmail = u.email;
        }
        if (u.telephone) {
          this.medecinTel = u.telephone;
        }
      } catch {
        /* */
      }
    }
  }

  private hydrateFromApi(): void {
    this.medecinPortal.getMoi().subscribe({
      next: (m) => {
        const u = m.utilisateur;
        const n = [u.prenom, u.nom].filter(Boolean).join(' ').trim();
        if (n) {
          this.medecinLabel = `Dr. ${n}`;
        }
        if (u.email) {
          this.medecinEmail = u.email;
        }
        if (u.telephone) {
          this.medecinTel = u.telephone;
        }
        this.medecinAdresse = u.adresse?.trim() ?? '';
        this.medecinVille = u.ville?.trim() ?? '';
        const addrParts = [this.medecinAdresse, this.medecinVille].filter((x) => x.length > 0);
        if (addrParts.length > 0) {
          this.medecinAddr = addrParts.join(', ');
        }
      },
      error: () => {
        /* fallback to localStorage data */
      }
    });
  }

  private importFromConsultation(_list: Patient[]): void {
    const cons = parseConsultationBrouillon(localStorage.getItem(LS_CONSULTATION_BROUILLON));
    if (!cons?.patientId) return;
    const fromConsultation = formatLignesPourOrdonnance(cons.lignes ?? [], cons.notes);
    if (fromConsultation.trim().length > 0) {
      this.medicamentsText.set(fromConsultation);
      this.patientId = cons.patientId;
      this.persist();
    }
  }

  persist(): void {
    try {
      localStorage.setItem(
        LS_ORDONNANCE_META,
        JSON.stringify({ dateOrdonnance: this.dateOrdonnance, patientId: this.patientId })
      );
      localStorage.setItem(LS_ORDONNANCE_TEXTE, this.medicamentsText());
    } catch {
      /* */
    }
    this.scheduleQrUpdate();
  }

  onMedicamentsChange(value: string): void {
    this.medicamentsText.set(value ?? '');
    this.persist();
  }

  private scheduleQrUpdate(): void {
    if (this.qrTimer) {
      clearTimeout(this.qrTimer);
    }
    this.qrTimer = setTimeout(() => {
      void this.updateQrCode();
    }, 250);
  }

  private async buildQrPayloadAsync(): Promise<string> {
    const base = (environment.ordonnancePublicBaseUrl ?? '').trim().replace(/\/+$/g, '');
    if (!base || !this.canEncodeQr()) {
      return '';
    }
    return encodeOrdonnanceQrUrl({
      baseUrl: base,
      patient: this.patientName(),
      date: this.dateOrdonnance,
      medecin: this.medecinLabel,
      meds: this.medicamentsText().trim(),
      medecinAdresse: this.medecinAdresse,
      medecinVille: this.medecinVille,
      medecinTel: this.medecinTel,
      medecinEmail: this.medecinEmail
    });
  }

  private async updateQrCode(): Promise<void> {
    const payload = await this.buildQrPayloadAsync();
    if (!payload.trim()) {
      this.qrDataUrl.set('');
      return;
    }
    try {
      const dataUrl = await QRCode.toDataURL(payload, {
        width: 320,
        margin: 4,
        errorCorrectionLevel: 'M',
        color: { dark: '#0f172a', light: '#ffffff' }
      });
      this.qrDataUrl.set(dataUrl);
    } catch {
      this.qrDataUrl.set('');
    }
  }

  private async ensureQrReady(): Promise<void> {
    await this.updateQrCode();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const img = document.querySelector('#ordonnance-print .mec-ord-qr img') as HTMLImageElement | null;
    if (img && !img.complete) {
      await new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      });
    }
  }

  /** Télécharge un fichier .pdf (pas le dialogue d’impression). */
  async downloadPdfFile(): Promise<void> {
    this.persist();
    if (!this.canEncodeQr()) {
      this.toast.show('Sélectionnez un patient et saisissez le traitement avant le PDF / QR.', 'error');
      return;
    }
    await this.ensureQrReady();
    const el = document.getElementById('ordonnance-print');
    if (!el) {
      this.toast.show('Aperçu introuvable.', 'error');
      return;
    }
    this.pdfBusy.set(true);
    const filename = this.buildOrdonnanceFileName();
    const options = {
      margin: 10,
      filename,
      image: { type: 'jpeg' as const, quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, logging: false, letterRendering: true },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };
    try {
      await html2pdf().set(options).from(el).save();
      this.toast.show('Fichier PDF enregistré.', 'success');
    } catch {
      this.toast.show('Export PDF impossible. Utilisez « Imprimer » puis enregistrer en PDF.', 'error');
    } finally {
      this.pdfBusy.set(false);
    }
  }

  saveOrdonnance(): void {
    if (!this.patientId) {
      this.toast.show('Sélectionnez un patient.', 'error');
      return;
    }
    const meds = this.medicamentsText().trim();
    if (!meds) {
      this.toast.show('Renseignez le traitement prescrit.', 'error');
      return;
    }
    // Tronquer le texte des médicaments pour respecter la colonne DB (2000)
    let medsToSend = meds;
    if (meds.length > 2000) {
      medsToSend = meds.slice(0, 2000);
      this.toast.show('Traitement trop long — tronqué à 2000 caractères.', 'info');
    }
    this.saveBusy.set(true);
    void this.buildQrPayloadAsync()
      .then((qrUrlFull) => {
        const qrUrl = qrUrlFull && qrUrlFull.length > 500 ? qrUrlFull.slice(0, 500) : qrUrlFull;
        this.ordonnanceService
          .create({
            patientId: this.patientId!,
            dateOrdonnance: this.dateOrdonnance,
            medicamentsText: medsToSend,
            qrUrl
          })
          .subscribe({
            next: () => {
              this.toast.show('Ordonnance enregistrée.', 'success');
              this.saveBusy.set(false);
              this.patientId = null;
              this.medicamentsText.set('');
              this.dateOrdonnance = isoToday();
              this.persist();
            },
            error: (err) => {
              try {
                const msg = err?.error?.message || err?.message || 'Enregistrement impossible.';
                this.toast.show(String(msg), 'error');
              } catch (e) {
                this.toast.show('Enregistrement impossible.', 'error');
              }
              // eslint-disable-next-line no-console
              console.error('saveOrdonnance error', err);
              this.saveBusy.set(false);
            }
          });
      })
      .catch(() => {
        this.toast.show('Impossible de préparer le lien QR.', 'error');
        this.saveBusy.set(false);
      });
  }

  /** Dialogue d’impression du navigateur. */
  async printOrdonnance(): Promise<void> {
    this.persist();
    if (!this.canEncodeQr()) {
      this.toast.show('Sélectionnez un patient et saisissez le traitement avant l’impression.', 'error');
      return;
    }
    await this.ensureQrReady();
    globalThis.print();
  }

  private buildOrdonnanceFileName(): string {
    const d = (this.dateOrdonnance ?? isoToday()).replaceAll(/[^0-9-]/g, '') || 'date';
    const raw = (this.patientName() || '')
      .replaceAll(/[—–]/g, '')
      .trim()
      .replaceAll(/[<>":/\\|?*\s]+/g, '_')
      .replaceAll(/_+/g, '_')
      .replaceAll(/^_+|_+$/g, '') || 'Ordonnance';
    return `${raw}-${d}.pdf`;
  }

  formatFrDisplay(iso: string): string {
    return formatFr(iso);
  }

}
