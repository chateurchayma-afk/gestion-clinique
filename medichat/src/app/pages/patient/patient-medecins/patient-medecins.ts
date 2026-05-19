import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastService } from '../../../core/toast.service';
import { Medecin, MedecinService } from '../../../services/medecin.service';
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

  /** Catalogue complet (médecins validés). */
  private readonly allMedecins = signal<Medecin[]>([]);

  readonly medecins = signal<Medecin[]>([]);
  readonly specialites = signal<Specialite[]>([]);
  readonly loading = signal(true);
  readonly medecinsPourNoms = signal<Medecin[]>([]);
  readonly allMedecinsCount = signal(0);

  searchNom = '';
  specialiteFilter: number | '' = '';

  ngOnInit(): void {
    this.specialiteService.getAll().subscribe({
      next: (list) => {
        const sorted = [...list].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
        this.specialites.set(sorted);
      },
      error: () => this.toast.show('Impossible de charger les spécialités.', 'error')
    });
    this.loadAllMedecins();
  }

  libelleMedecinDatalist(m: Medecin): string {
    const p = (m.utilisateur.prenom ?? '').trim();
    const n = (m.utilisateur.nom ?? '').trim();
    return `${p} ${n}`.trim();
  }

  private loadAllMedecins(): void {
    this.loading.set(true);
    this.medecinService.getCatalogue({ sort: 'nom' }).subscribe({
      next: (list) => {
        const rows = list ?? [];
        this.allMedecins.set(rows);
        this.allMedecinsCount.set(rows.length);
        this.medecinsPourNoms.set(rows);
        this.applyFilters();
        this.loading.set(false);
      },
      error: () => {
        this.allMedecins.set([]);
        this.medecinsPourNoms.set([]);
        this.medecins.set([]);
        this.loading.set(false);
        this.toast.show('Impossible de charger les médecins.', 'error');
      }
    });
  }

  reloadMedecins(): void {
    this.applyFilters();
  }

  private applyFilters(): void {
    const needle = this.searchNom.trim().toLowerCase();
    const specId =
      this.specialiteFilter !== '' && this.specialiteFilter != null
        ? Number(this.specialiteFilter)
        : null;

    let rows = [...this.allMedecins()];

    if (specId != null && Number.isFinite(specId)) {
      rows = rows.filter((m) => m.specialite?.id === specId);
    }

    if (needle) {
      rows = rows.filter((m) => this.matchesSearch(m, needle));
    }

    rows.sort((a, b) => {
      const na = `${a.utilisateur.nom} ${a.utilisateur.prenom}`.toLowerCase();
      const nb = `${b.utilisateur.nom} ${b.utilisateur.prenom}`.toLowerCase();
      return na.localeCompare(nb, 'fr');
    });

    this.medecins.set(rows);
  }

  private matchesSearch(m: Medecin, needle: string): boolean {
    const prenom = (m.utilisateur.prenom ?? '').toLowerCase();
    const nom = (m.utilisateur.nom ?? '').toLowerCase();
    const full = `${prenom} ${nom}`.trim();
    const fullRev = `${nom} ${prenom}`.trim();
    return (
      prenom.includes(needle) ||
      nom.includes(needle) ||
      full.includes(needle) ||
      fullRev.includes(needle)
    );
  }

  estDisponible(m: Medecin): boolean {
    return m.disponible !== false;
  }

  libelleDisponibilite(m: Medecin): string {
    return this.estDisponible(m) ? 'Disponible' : 'Occupé';
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

  voirProfil(m: Medecin): void {
    void this.router.navigate(['/patient-dashboard/medecins/profil', m.id]);
  }

  prendreRdvSurPlace(m: Medecin): void {
    if (!this.estDisponible(m)) {
      return;
    }
    void this.router.navigate(['/patient-dashboard/rendez-vous/nouveau'], {
      queryParams: { medecinId: m.id }
    });
  }
}
