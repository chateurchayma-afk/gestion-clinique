import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../../core/toast.service';
import { CatalogueMedecinsQuery, Medecin, MedecinService } from '../../../services/medecin.service';
import { ServiceMedical, ServiceMedicalService } from '../../../services/service-medical.service';
import { Specialite, SpecialiteService } from '../../../services/specialite.service';

@Component({
  selector: 'app-patient-medecins',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './patient-medecins.html',
  styleUrl: './patient-medecins.css'
})
export class PatientMedecins implements OnInit {
  private readonly medecinService = inject(MedecinService);
  private readonly specialiteService = inject(SpecialiteService);
  private readonly serviceMedicalService = inject(ServiceMedicalService);
  private readonly toast = inject(ToastService);

  readonly medecins = signal<Medecin[]>([]);
  readonly specialites = signal<Specialite[]>([]);
  readonly services = signal<ServiceMedical[]>([]);
  readonly loading = signal(true);
  readonly popularIds = signal<Set<number>>(new Set());
  readonly todayIds = signal<Set<number>>(new Set());

  searchNom = '';
  specialiteFilter: number | '' = '';
  serviceFilter: number | '' = '';
  /** '' = tous, 'true' / 'false' string for ngModel select */
  disponibleFilter: '' | 'true' | 'false' = '';
  sortKey: 'nom' | 'experience' | 'disponible' = 'nom';

  readonly medecinsPopulaires = computed(() => {
    const pop = this.popularIds();
    return this.medecins().filter((m) => pop.has(m.id));
  });

  readonly medecinsDispoAujourdhui = computed(() => {
    const t = this.todayIds();
    return this.medecins().filter((m) => t.has(m.id));
  });

  ngOnInit(): void {
    this.specialiteService.getAll().subscribe({
      next: (list) => {
        const sorted = [...list].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
        this.specialites.set(sorted);
      },
      error: () => this.toast.show('Impossible de charger les spécialités.', 'error')
    });
    this.serviceMedicalService.getAll().subscribe({
      next: (list) => this.services.set([...list].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))),
      error: () => this.services.set([])
    });
    this.medecinService.getCatalogueHighlights().subscribe({
      next: (h) => {
        this.popularIds.set(new Set(h.medecinsPopulairesIds ?? []));
        this.todayIds.set(new Set(h.medecinsDisponiblesAujourdhuiIds ?? []));
      },
      error: () => {
        this.popularIds.set(new Set());
        this.todayIds.set(new Set());
      }
    });
    this.reloadMedecins();
  }

  reloadMedecins(): void {
    this.loading.set(true);
    const q: CatalogueMedecinsQuery = {
      sort: this.sortKey
    };
    if (this.specialiteFilter !== '' && this.specialiteFilter != null) {
      q.specialiteId = Number(this.specialiteFilter);
    }
    if (this.serviceFilter !== '' && this.serviceFilter != null) {
      q.serviceMedicalId = Number(this.serviceFilter);
    }
    if (this.searchNom.trim()) {
      q.q = this.searchNom.trim();
    }
    if (this.disponibleFilter === 'true' || this.disponibleFilter === 'false') {
      q.disponible = this.disponibleFilter === 'true';
    }
    this.medecinService.getCatalogue(q).subscribe({
      next: (list) => {
        this.medecins.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.show('Impossible de charger les médecins.', 'error');
      }
    });
  }

  estDisponible(m: Medecin): boolean {
    return m.disponible !== false;
  }

  libelleDisponibilite(m: Medecin): string {
    return this.estDisponible(m) ? 'Disponible' : 'Occupé';
  }

  /** Affichage étoiles : note backend ou estimation visuelle si absente. */
  noteAffichee(m: Medecin): number {
    if (m.noteMoyenne != null && m.noteMoyenne >= 0 && m.noteMoyenne <= 5) {
      return Math.round(m.noteMoyenne * 2) / 2;
    }
    return 4 + (m.id % 6) * 0.1;
  }

  etoilesPleines(m: Medecin): number {
    return Math.floor(this.noteAffichee(m));
  }

  etoileDemi(m: Medecin): boolean {
    const n = this.noteAffichee(m);
    return n - Math.floor(n) >= 0.5;
  }

  aNoteReelle(m: Medecin): boolean {
    return m.noteMoyenne != null && m.noteMoyenne >= 0;
  }

  initiales(m: Medecin): string {
    const p = m.utilisateur.prenom?.charAt(0) ?? '';
    const n = m.utilisateur.nom?.charAt(0) ?? '';
    return (p + n).toUpperCase();
  }

  photoUrl(m: Medecin): string | null {
    const p = m.utilisateur.photo?.trim();
    return p ? p : null;
  }

  isPopular(m: Medecin): boolean {
    return this.popularIds().has(m.id);
  }

  isDispoAujourdhui(m: Medecin): boolean {
    return this.todayIds().has(m.id);
  }
}
