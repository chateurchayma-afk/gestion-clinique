import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../../core/toast.service';
import { AdminDashboardService, DashboardStats } from '../../../services/admin-dashboard.service';
import { Medecin, MedecinService } from '../../../services/medecin.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard implements OnInit {
  private readonly toast = inject(ToastService);
  private readonly adminStats = inject(AdminDashboardService);
  private readonly medecinService = inject(MedecinService);

  stats = signal<DashboardStats | null>(null);
  pendingMedecins = signal<Medecin[]>([]);
  loadingStats = signal(true);
  loadingPending = signal(true);

  ngOnInit(): void {
    this.reloadStats();
    this.reloadPending();
  }

  reloadStats(): void {
    this.loadingStats.set(true);
    this.adminStats.getStats().subscribe({
      next: (s) => {
        this.stats.set(s);
        this.loadingStats.set(false);
      },
      error: () => {
        this.loadingStats.set(false);
        this.toast.show('Impossible de charger les statistiques.', 'error');
      }
    });
  }

  reloadPending(): void {
    this.loadingPending.set(true);
    this.medecinService.getMedecinsEnAttente().subscribe({
      next: (list) => {
        this.pendingMedecins.set(list);
        this.loadingPending.set(false);
      },
      error: () => {
        this.loadingPending.set(false);
        this.toast.show('Impossible de charger les médecins en attente.', 'error');
      }
    });
  }

  labelRole(role: string): string {
    switch (role) {
      case 'PATIENT':
        return 'Patients';
      case 'MEDECIN':
        return 'Médecins';
      case 'ADMIN':
        return 'Administrateurs';
      default:
        return role;
    }
  }

  valider(m: Medecin): void {
    this.medecinService.setValidationStatut(m.id, 'VALIDE').subscribe({
      next: () => {
        this.toast.show(`Dr. ${m.utilisateur.prenom} ${m.utilisateur.nom} validé.`, 'success');
        this.reloadPending();
        this.reloadStats();
      },
      error: (err) => {
        const msg =
          typeof err?.error === 'string' && err.error.trim()
            ? err.error
            : 'Validation impossible.';
        this.toast.show(msg, 'error');
      }
    });
  }

  refuser(m: Medecin): void {
    if (!confirm(`Refuser l'inscription de Dr. ${m.utilisateur.prenom} ${m.utilisateur.nom} ?`)) {
      return;
    }
    this.medecinService.setValidationStatut(m.id, 'REFUSE').subscribe({
      next: () => {
        this.toast.show('Demande refusée.', 'success');
        this.reloadPending();
        this.reloadStats();
      },
      error: (err) => {
        const msg =
          typeof err?.error === 'string' && err.error.trim()
            ? err.error
            : 'Action impossible.';
        this.toast.show(msg, 'error');
      }
    });
  }

  comingSoon(event: Event): void {
    event.preventDefault();
    this.toast.show('Fonctionnalité à venir.', 'info');
  }
}
