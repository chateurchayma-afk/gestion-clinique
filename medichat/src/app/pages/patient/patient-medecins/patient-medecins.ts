import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastService } from '../../../core/toast.service';
import { CatalogueMedecinsQuery, Medecin, MedecinService } from '../../../services/medecin.service';
import { Specialite, SpecialiteService } from '../../../services/specialite.service';

@Component({
  selector: 'app-patient-medecins',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-medecins.html',
  styleUrl: './patient-medecins.css'
})
export class PatientMedecins implements OnInit {
  private readonly medecinService = inject(MedecinService);
  private readonly specialiteService = inject(SpecialiteService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly medecins = signal<Medecin[]>([]);
  readonly specialites = signal<Specialite[]>([]);
  readonly loading = signal(true);
  /** Catalogue complet trié par nom (suggestions du champ recherche) */
  readonly medecinsPourNoms = signal<Medecin[]>([]);

  searchNom = '';
  specialiteFilter: number | '' = '';
  sortKey: 'nom' | 'experience' | 'disponible' = 'nom';

  ngOnInit(): void {
    this.specialiteService.getAll().subscribe({
      next: (list) => {
        const sorted = [...list].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
        this.specialites.set(sorted);
      },
      error: () => this.toast.show('Impossible de charger les spécialités.', 'error')
    });
    this.medecinService.getCatalogue({ sort: 'nom' }).subscribe({
      next: (list) => this.medecinsPourNoms.set(list),
      error: () => this.medecinsPourNoms.set([])
    });
    this.reloadMedecins();
  }

  /** Valeur datalist : prénom + nom (recherche API plus fiable qu’avec « Dr. »). */
  libelleMedecinDatalist(m: Medecin): string {
    const p = (m.utilisateur.prenom ?? '').trim();
    const n = (m.utilisateur.nom ?? '').trim();
    return `${p} ${n}`.trim();
  }

  reloadMedecins(scrollToResults = false): void {
    this.loading.set(true);
    const q: CatalogueMedecinsQuery = {
      sort: this.sortKey
    };
    if (this.specialiteFilter !== '' && this.specialiteFilter != null) {
      q.specialiteId = Number(this.specialiteFilter);
    }
    if (this.searchNom.trim()) {
      q.q = this.searchNom.trim();
    }
    this.medecinService.getCatalogue(q).subscribe({
      next: (list) => {
        this.medecins.set(list);
        this.loading.set(false);
        if (scrollToResults) {
          queueMicrotask(() => {
            document.getElementById('medecins-resultats')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }
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

  /** Page profil dédiée. */
  voirProfil(m: Medecin): void {
    void this.router.navigate(['/patient-dashboard/medecins/profil', m.id]);
  }

  /** Page de réservation (même flux que la fiche médecin). */
  prendreRdvSurPlace(m: Medecin): void {
    if (!this.estDisponible(m)) {
      return;
    }
    void this.router.navigate(['/patient-dashboard/rendez-vous/nouveau'], {
      queryParams: { medecinId: m.id }
    });
  }
}
