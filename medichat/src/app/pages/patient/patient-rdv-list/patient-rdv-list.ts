import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../../core/toast.service';
import {
  RendezVousPatient,
  RendezVousPatientService,
  StatutRendezVous
} from '../../../services/rendez-vous-patient.service';

@Component({
  selector: 'app-patient-rdv-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './patient-rdv-list.html',
  styleUrl: './patient-rdv-list.css'
})
export class PatientRdvList implements OnInit {
  private readonly rdvService = inject(RendezVousPatientService);
  private readonly toast = inject(ToastService);

  readonly rdvs = signal<RendezVousPatient[]>([]);
  readonly loading = signal(true);
  readonly cancellingId = signal<number | null>(null);

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.rdvService.list().subscribe({
      next: (list) => {
        this.rdvs.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.show('Impossible de charger vos rendez-vous.', 'error');
      }
    });
  }

  labelStatut(s: StatutRendezVous): string {
    switch (s) {
      case 'EN_ATTENTE':
        return 'En attente';
      case 'CONFIRME':
        return 'Confirmé';
      case 'ANNULE':
        return 'Annulé';
      case 'TERMINE':
        return 'Terminé';
      default:
        return s;
    }
  }

  labelMode(m: string): string {
    return m === 'ONLINE' ? 'En ligne' : 'Présentiel';
  }

  formatHeure(t: string): string {
    if (!t) {
      return '';
    }
    return t.length >= 5 ? t.slice(0, 5) : t;
  }

  peutAnnuler(r: RendezVousPatient): boolean {
    return r.statut === 'EN_ATTENTE' || r.statut === 'CONFIRME';
  }

  annuler(r: RendezVousPatient): void {
    if (!this.peutAnnuler(r)) {
      return;
    }
    if (!confirm('Annuler ce rendez-vous ?')) {
      return;
    }
    this.cancellingId.set(r.id);
    this.rdvService.annuler(r.id).subscribe({
      next: () => {
        this.cancellingId.set(null);
        this.toast.show('Rendez-vous annulé.', 'success');
        this.reload();
      },
      error: (err) => {
        this.cancellingId.set(null);
        const msg =
          typeof err?.error?.message === 'string'
            ? err.error.message
            : "Impossible d'annuler ce rendez-vous.";
        this.toast.show(msg, 'error');
      }
    });
  }
}
