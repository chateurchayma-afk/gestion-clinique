import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { inject } from '@angular/core';
import { MedecinService, Medecin } from '../../../services/medecin.service';
import { ToastService } from '../../../core/toast.service';

@Component({
  selector: 'app-medecins-validation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './medecins-validation.html',
  styleUrls: ['./medecins-validation.css']
})
export class MedecinsValidation implements OnInit {
  private readonly medecinService = inject(MedecinService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly medecins = signal<Medecin[]>([]);
  readonly savingId = signal<number | null>(null);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.medecinService.getMedecinsEnAttente().subscribe({
      next: (list) => {
        this.medecins.set(list ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.toast.show('Impossible de charger les médecins en attente.', 'error');
        this.loading.set(false);
      }
    });
  }

  valider(m: Medecin): void {
    this.savingId.set(m.id);
    this.medecinService.setValidationStatut(m.id, 'VALIDE').subscribe({
      next: () => {
        this.medecins.update((list) => list.filter((x) => x.id !== m.id));
        this.savingId.set(null);
        this.toast.show(
          `Dr. ${m.utilisateur.prenom} ${m.utilisateur.nom} validé. Il peut maintenant se connecter.`,
          'success'
        );
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
      next: () => {
        this.medecins.update((list) => list.filter((x) => x.id !== m.id));
        this.savingId.set(null);
        this.toast.show(
          `Compte de Dr. ${m.utilisateur.prenom} ${m.utilisateur.nom} refusé.`,
          'success'
        );
      },
      error: () => {
        this.savingId.set(null);
        this.toast.show('Refus impossible.', 'error');
      }
    });
  }

  initiales(m: Medecin): string {
    const p = m.utilisateur.prenom.charAt(0).toUpperCase();
    const n = m.utilisateur.nom.charAt(0).toUpperCase();
    return `${p}${n}`;
  }
}
