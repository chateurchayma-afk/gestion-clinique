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
      return '—';
    }
    return `${p.utilisateur.prenom} ${p.utilisateur.nom}`.trim();
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
    const rawMeta = localStorage.getItem(LS_ORDONNANCE_META);
    if (rawMeta) {
      try {
        const o = JSON.parse(rawMeta) as { dateOrdonnance?: string; patientId?: number };
        if (o.dateOrdonnance) {
          this.dateOrdonnance = o.dateOrdonnance;
        }
        if (o.patientId) {
          this.patientId = o.patientId;
        }
      } catch {
        /* */
      }
    }
    const rawTxt = localStorage.getItem(LS_ORDONNANCE_TEXTE);
    if (rawTxt) {
      this.medicamentsText.set(rawTxt);
    }

    this.medecinPortal.getMesPatients().subscribe({
      next: (list) => {
        const L = list ?? [];
        this.patients.set(L);
        this.importFromConsultation(L);
        if (this.patientId != null && !L.some((p) => p.id === this.patientId)) {
          this.patientId = L[0]?.id ?? null;
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
        const addrParts = [u.adresse, u.ville].filter((x) => x && String(x).trim().length > 0);
        if (addrParts.length > 0) {
          this.medecinAddr = addrParts.join(', ');
        }
      },
      error: () => {
        /* fallback to localStorage data */
      }
    });
  }

  private importFromConsultation(list: Patient[]): void {
    const cons = parseConsultationBrouillon(localStorage.getItem(LS_CONSULTATION_BROUILLON));
    const fromConsultation = cons
      ? formatLignesPourOrdonnance(cons.lignes ?? [], cons.notes)
      : '';
    if (fromConsultation.trim().length > 0 && !this.medicamentsText().trim()) {
      this.medicamentsText.set(fromConsultation);
      this.patientId = cons?.patientId ?? this.patientId ?? list[0]?.id ?? null;
      this.persist();
      return;
    }
    if (this.medicamentsText().trim().length > 0) {
      this.patientId = this.patientId ?? list[0]?.id ?? null;
      return;
    }
    this.patientId = this.patientId ?? list[0]?.id ?? null;
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

  private buildQrPayload(): string {
    const base = (environment.ordonnancePublicBaseUrl ?? '').trim().replace(/\/+$/g, '');
    if (!base) {
      return '';
    }
    const payload = {
      v: 'v1',
      id: this.buildOrdonnanceFileName(),
      patient: this.patientName(),
      date: this.dateOrdonnance,
      medecin: this.medecinLabel,
      medecinAddr: this.medecinAddr,
      medecinTel: this.medecinTel,
      medecinEmail: this.medecinEmail,
      meds: this.medicamentsText().trim()
    };
    const encoded = this.toBase64Url(JSON.stringify(payload));
    return `${base}/?data=${encoded}`;
  }

  private toBase64Url(input: string): string {
    const utf8 = encodeURIComponent(input).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    );
    const b64 = btoa(utf8);
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  private async updateQrCode(): Promise<void> {
    const payload = this.buildQrPayload();
    if (!payload.trim()) {
      this.qrDataUrl.set('');
      return;
    }
    try {
      const dataUrl = await QRCode.toDataURL(payload, { width: 140, margin: 1 });
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
    const qrUrl = this.buildQrPayload();
    this.saveBusy.set(true);
    this.ordonnanceService
      .create({
        patientId: this.patientId,
        dateOrdonnance: this.dateOrdonnance,
        medicamentsText: meds,
        qrUrl
      })
      .subscribe({
        next: () => {
          this.toast.show('Ordonnance enregistrée.', 'success');
          this.saveBusy.set(false);
        },
        error: () => {
          this.toast.show('Enregistrement impossible.', 'error');
          this.saveBusy.set(false);
        }
      });
  }

  /** Dialogue d’impression du navigateur. */
  async printOrdonnance(): Promise<void> {
    this.persist();
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
