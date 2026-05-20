import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService } from '../../../core/toast.service';
import { CreneauJour, Medecin, MedecinService } from '../../../services/medecin.service';
import { RendezVousCreatePayload, RendezVousPatientService } from '../../../services/rendez-vous-patient.service';

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
  readonly loadingMed = signal(false);
  /** Chargement du catalogue quand aucun medecinId dans l’URL (true au 1er rendu jusqu’à résolution des params). */
  readonly catalogueLoading = signal(true);
  readonly catalogueMedecins = signal<Medecin[]>([]);
  readonly catalogueError = signal(false);
  readonly submitting = signal(false);
  readonly creneaux = signal<CreneauJour[]>([]);
  readonly loadingCreneaux = signal(false);

  medecinId: number | null = null;
  dateRendezVous = '';
  heureDebut = '';
  heureFin = '';

  readonly slotsJour = computed((): (string | number[])[] => {
    const d = this.dateRendezVous;
    if (!d) {
      return [];
    }
    const jour = this.creneaux().find((c) => c.date === d);
    return jour?.heuresDebut ?? [];
  });

  readonly joursDisponibles = computed((): CreneauJour[] =>
    this.creneaux().filter((c) => (c.heuresDebut?.length ?? 0) > 0)
  );

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((pm) => {
      const raw = pm.get('medecinId');
      const id = raw != null ? parseInt(raw, 10) : NaN;
      if (Number.isNaN(id) || id < 1) {
        this.loadingMed.set(false);
        this.medecin.set(null);
        this.medecinId = null;
        this.catalogueLoading.set(true);
        this.loadCatalogueForChoice();
        return;
      }
      this.catalogueLoading.set(false);
      this.medecinId = id;
      this.catalogueMedecins.set([]);
      this.catalogueError.set(false);
      this.loadMedecin(id);
    });
  }

  /** Permet d’arriver sur « Nouveau rendez-vous » sans query : choix du médecin sur la page. */
  private loadCatalogueForChoice(): void {
    this.catalogueLoading.set(true);
    this.catalogueError.set(false);
    this.medecinService.getCatalogue({ sort: 'nom', disponible: true }).subscribe({
      next: (list) => {
        const rows = list.filter((m) => m.statutValidation === 'VALIDE' && m.disponible !== false);
        this.catalogueMedecins.set(rows);
        this.catalogueLoading.set(false);
      },
      error: () => {
        this.catalogueMedecins.set([]);
        this.catalogueError.set(true);
        this.catalogueLoading.set(false);
      }
    });
  }

  choisirMedecinDepuisListe(id: number): void {
    if (!Number.isFinite(id) || id < 1) {
      return;
    }
    void this.router.navigate(['/patient-dashboard/rendez-vous/nouveau'], { queryParams: { medecinId: id } });
  }

  libelleMedecinOption(m: Medecin): string {
    const spec = m.specialite?.nom?.trim();
    return spec ? ` — ${spec}` : '';
  }

  estDisponible(m: Medecin): boolean {
    return m.disponible !== false;
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
        void this.router.navigate(['/patient-dashboard/rendez-vous/nouveau'], { replaceUrl: true, queryParams: {} });
      }
    });
  }

  private loadCreneaux(medecinId: number): void {
    this.loadingCreneaux.set(true);
    this.medecinService.getCatalogueCreneaux(medecinId, undefined, 21).subscribe({
      next: (rows) => {
        this.creneaux.set(rows);
        this.loadingCreneaux.set(false);
        const firstAvailable = rows.find((r) => (r.heuresDebut?.length ?? 0) > 0);
        const selectedStillAvailable = rows.some(
          (r) => r.date === this.dateRendezVous && (r.heuresDebut?.length ?? 0) > 0
        );
        if ((!this.dateRendezVous || !selectedStillAvailable) && firstAvailable) {
          this.dateRendezVous = firstAvailable.date;
          this.heureDebut = '';
          this.heureFin = '';
        } else if (!firstAvailable) {
          this.dateRendezVous = '';
          this.heureDebut = '';
          this.heureFin = '';
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

  submit(): void {
    const m = this.medecin();
    if (!m || !this.dateRendezVous || !this.heureDebut) {
      this.toast.show('Veuillez choisir un créneau disponible.', 'error');
      return;
    }
    if (m.disponible === false) {
      this.toast.show('Ce médecin n’accepte pas de nouveaux rendez-vous.', 'error');
      return;
    }
    if (!this.creneauSelectionneDisponible()) {
      this.toast.show('Ce créneau n’est plus disponible. Choisissez un autre horaire.', 'error');
      this.heureDebut = '';
      this.heureFin = '';
      return;
    }
    const fin = this.heureFin.trim();
    const payload: RendezVousCreatePayload = {
      medecinId: m.id,
      dateRendezVous: this.dateRendezVous,
      heureDebut: this.normalizeTime(this.heureDebut),
      modeConsultation: 'PRESENTIEL',
      motif: null
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

  formatDateOption(iso: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      return iso;
    }
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(date);
  }

  creneauSelectionneDisponible(): boolean {
    const selected = this.normalizeHeureAffichage(this.heureDebut);
    if (!selected) {
      return false;
    }
    return this.slotsJour().some((h) => this.normalizeHeureAffichage(h) === selected);
  }
}
