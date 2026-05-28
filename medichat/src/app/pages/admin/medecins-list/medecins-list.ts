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

  constructor(private medecinService: MedecinService) {}

  ngOnInit(): void {
    this.medecinService.getAllMedecins().subscribe({
      next: (data) => {
        this.medecins.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erreur API médecins :', err);
        this.loading.set(false);
        this.toast.show('Impossible de charger la liste des médecins.', 'error');
      }
    });
  }

  onSearch(value: string): void {
    this.searchTerm.set(value.toLowerCase().trim());
  }

  filteredMedecins = computed(() => {
    const term = this.searchTerm();

    if (!term) {
      return this.medecins();
    }

    return this.medecins().filter((m) => {
      const fullName =
        `${m.utilisateur.prenom} ${m.utilisateur.nom}`.toLowerCase();

      const specialite = m.specialite?.nom?.toLowerCase() || '';
      const email = m.utilisateur.email.toLowerCase();

      return (
        fullName.includes(term) ||
        specialite.includes(term) ||
        email.includes(term)
      );
    });
  });

  deleteMedecin(m: Medecin, event: Event): void {
    event.stopPropagation();
    const name = `${m.utilisateur.prenom} ${m.utilisateur.nom}`.trim();
    if (!confirm(`Supprimer le médecin Dr. ${name} ?`)) {
      return;
    }
    this.medecinService.deleteMedecin(m.id).subscribe({
      next: () => {
        this.toast.show('Médecin supprimé.', 'success');
        this.medecins.set(this.medecins().filter((x) => x.id !== m.id));
      },
      error: (err) => {
        console.error(err);
        this.toast.show('Suppression impossible.', 'error');
      }
    });
  }
}