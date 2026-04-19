import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService } from '../../../core/toast.service';
import { CreneauJour, Medecin, MedecinService, ProchainCreneau } from '../../../services/medecin.service';
import {
  ModeConsultation,
  RendezVousCreatePayload,
  RendezVousPatientService
} from '../../../services/rendez-vous-patient.service';

@Component({
  selector: 'app-patient-rdv-new',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './patient-rdv-new.html',
  styleUrl: './patient-rdv-new.css'
})
export class PatientRdvNew implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly medecinService = inject(MedecinService);
  private readonly rdvService = inject(RendezVousPatientService);
  private readonly toast = inject(ToastService);

  readonly medecin = signal<Medecin | null>(null);
  readonly loadingMed = signal(true);
  readonly submitting = signal(false);
  readonly creneaux = signal<CreneauJour[]>([]);
  readonly loadingCreneaux = signal(false);
  readonly prochainLoading = signal(false);

  medecinId: number | null = null;
  dateRendezVous = '';
  heureDebut = '';
  heureFin = '';
  modeConsultation: ModeConsultation = 'PRESENTIEL';
  motif = '';

  readonly slotsJour = computed((): (string | number[])[] => {
    const d = this.dateRendezVous;
    if (!d) {
      return [];
    }
    const jour = this.creneaux().find((c) => c.date === d);
    return jour?.heuresDebut ?? [];
  });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((pm) => {
      const raw = pm.get('medecinId');
      const id = raw != null ? parseInt(raw, 10) : NaN;
      if (Number.isNaN(id) || id < 1) {
        this.loadingMed.set(false);
        this.medecin.set(null);
        this.medecinId = null;
        return;
      }
      this.medecinId = id;
      this.loadMedecin(id);
    });
  }

  private loadMedecin(id: number): void {
    this.loadingMed.set(true);
    this.medecinService.getCatalogueMedecin(id).subscribe({
      next: (m) => {
        this.medecin.set(m);
        this.loadingMed.set(false);
        this.loadCreneaux(id);
      },
      error: () => {
        this.medecin.set(null);
        this.loadingMed.set(false);
        this.toast.show('Médecin introuvable ou non publié au catalogue.', 'error');
      }
    });
  }

  private loadCreneaux(medecinId: number): void {
    this.loadingCreneaux.set(true);
    this.medecinService.getCatalogueCreneaux(medecinId, undefined, 21).subscribe({
      next: (rows) => {
        this.creneaux.set(rows);
        this.loadingCreneaux.set(false);
        if (!this.dateRendezVous && rows.length > 0) {
          this.dateRendezVous = rows[0].date;
        }
      },
      error: () => {
        this.creneaux.set([]);
        this.loadingCreneaux.set(false);
      }
    });
  }

  onDateChange(): void {
    this.heureDebut = '';
    this.heureFin = '';
  }

  choisirCreneau(heureRaw: string | number[]): void {
    const h = this.normalizeHeureAffichage(heureRaw);
    this.heureDebut = h;
    const parts = h.split(':').map((x) => parseInt(x, 10));
    const m = (parts[1] ?? 0) + 30;
    let hh = parts[0] ?? 0;
    let mm = m;
    if (mm >= 60) {
      hh += 1;
      mm -= 60;
    }
    this.heureFin = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  appliquerProchainCreneau(): void {
    const m = this.medecin();
    if (!m) {
      return;
    }
    this.prochainLoading.set(true);
    this.medecinService.getProchainCreneau(m.id).subscribe({
      next: (p: ProchainCreneau) => {
        this.prochainLoading.set(false);
        this.dateRendezVous = p.date;
        this.heureDebut = this.normalizeHeureAffichage(p.heureDebut);
        this.heureFin = this.normalizeHeureAffichage(p.heureFin);
        this.toast.show('Prochain créneau libre appliqué.', 'info');
      },
      error: () => {
        this.prochainLoading.set(false);
        this.toast.show('Aucun créneau automatique trouvé pour ce médecin.', 'error');
      }
    });
  }

  submit(): void {
    const m = this.medecin();
    if (!m || !this.dateRendezVous || !this.heureDebut) {
      this.toast.show('Veuillez renseigner la date et l’heure de début.', 'error');
      return;
    }
    if (m.disponible === false) {
      this.toast.show('Ce médecin n’accepte pas de nouveaux rendez-vous.', 'error');
      return;
    }
    const fin = this.heureFin.trim();
    const payload: RendezVousCreatePayload = {
      medecinId: m.id,
      dateRendezVous: this.dateRendezVous,
      heureDebut: this.normalizeTime(this.heureDebut),
      modeConsultation: this.modeConsultation,
      motif: this.motif.trim() || null
    };
    if (fin.length > 0) {
      payload.heureFin = this.normalizeTime(fin);
    }

    this.submitting.set(true);
    this.rdvService.create(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.toast.show('Demande de rendez-vous enregistrée.', 'success');
        void this.router.navigate(['/patient-dashboard/rendez-vous']);
      },
      error: (err) => {
        this.submitting.set(false);
        const msg =
          typeof err?.error?.message === 'string'
            ? err.error.message
            : 'Impossible de créer le rendez-vous.';
        this.toast.show(msg, 'error');
      }
    });
  }

  private normalizeTime(t: string): string {
    const s = t.trim();
    if (s.length === 5) {
      return `${s}:00`;
    }
    return s.length >= 8 ? s.slice(0, 8) : s;
  }

  /** Affichage HH:mm depuis réponse API (string ou tableau Jackson). */
  normalizeHeureAffichage(raw: string | number[] | unknown): string {
    if (Array.isArray(raw) && raw.length >= 2) {
      const hh = Number(raw[0]);
      const mm = Number(raw[1]);
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    }
    if (typeof raw === 'string') {
      return raw.length >= 5 ? raw.slice(0, 5) : raw;
    }
    return '';
  }

  formatHeureChip(raw: string | number[] | unknown): string {
    return this.normalizeHeureAffichage(raw);
  }
}
