import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MedecinService, Medecin } from '../../../services/medecin.service';
import { ToastService } from '../../../core/toast.service';

@Component({
  selector: 'app-medecins-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './medecins-list.html',
  styleUrl: './medecins-list.css',
})
export class MedecinsList implements OnInit {
  private readonly toast = inject(ToastService);

  medecins = signal<Medecin[]>([]);
  loading = signal(true);
  searchTerm = signal('');
  savingId = signal<number | null>(null);

  constructor(private medecinService: MedecinService) {}

  ngOnInit(): void {
    this.medecinService.getAllMedecins().subscribe({
      next: (data) => {
        this.medecins.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.show('Impossible de charger la liste des médecins.', 'error');
      }
    });
  }

  onSearch(value: string): void {
    this.searchTerm.set(value.toLowerCase().trim());
  }

  readonly pendingCount = computed(() =>
    this.medecins().filter(
      (m) => m.statutValidation === 'EN_ATTENTE' || !m.statutValidation
    ).length
  );

  readonly filteredMedecins = computed(() => {
    const term = this.searchTerm();
    if (!term) return this.medecins();
    return this.medecins().filter((m) => {
      const fullName = `${m.utilisateur.prenom} ${m.utilisateur.nom}`.toLowerCase();
      const specialite = m.specialite?.nom?.toLowerCase() || '';
      const email = m.utilisateur.email.toLowerCase();
      return fullName.includes(term) || specialite.includes(term) || email.includes(term);
    });
  });

  valider(m: Medecin): void {
    this.savingId.set(m.id);
    this.medecinService.setValidationStatut(m.id, 'VALIDE').subscribe({
      next: (updated) => {
        this.medecins.update((list) => list.map((x) => (x.id === updated.id ? updated : x)));
        this.savingId.set(null);
        this.toast.show(`Dr. ${m.utilisateur.prenom} ${m.utilisateur.nom} validé avec succès.`, 'success');
      },
      error: () => {
        this.savingId.set(null);
        this.toast.show('Validation impossible.', 'error');
      }
    });
  }

  refuser(m: Medecin): void {
    if (!confirm(`Refuser le compte de Dr. ${m.utilisateur.prenom} ${m.utilisateur.nom} ?`)) return;
    this.savingId.set(m.id);
    this.medecinService.setValidationStatut(m.id, 'REFUSE').subscribe({
      next: (updated) => {
        this.medecins.update((list) => list.map((x) => (x.id === updated.id ? updated : x)));
        this.savingId.set(null);
        this.toast.show(`Compte de Dr. ${m.utilisateur.prenom} ${m.utilisateur.nom} refusé.`, 'success');
      },
      error: () => {
        this.savingId.set(null);
        this.toast.show('Refus impossible.', 'error');
      }
    });
  }

  deleteMedecin(m: Medecin, event: Event): void {
    event.stopPropagation();
    const name = `${m.utilisateur.prenom} ${m.utilisateur.nom}`.trim();
    if (!confirm(`Supprimer le médecin Dr. ${name} ?`)) return;
    this.medecinService.deleteMedecin(m.id).subscribe({
      next: () => {
        this.toast.show('Médecin supprimé.', 'success');
        this.medecins.set(this.medecins().filter((x) => x.id !== m.id));
      },
      error: () => {
        this.toast.show('Suppression impossible.', 'error');
      }
    });
  }

  validationLabel(statut: string | null): string {
    if (!statut || statut === 'EN_ATTENTE') return 'En attente';
    if (statut === 'VALIDE') return 'Validé';
    if (statut === 'REFUSE') return 'Refusé';
    return statut;
  }

  validationClass(statut: string | null): string {
    if (!statut || statut === 'EN_ATTENTE') return 'badge-attente';
    if (statut === 'VALIDE') return 'badge-valide';
    if (statut === 'REFUSE') return 'badge-refuse';
    return '';
  }
}
