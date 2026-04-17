import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { Specialite, SpecialiteService } from '../../services/specialite.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-register-medecin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register-medecin.html',
  styleUrls: ['./register-medecin.css']
})
export class RegisterMedecin implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly specialiteService = inject(SpecialiteService);
  private readonly toast = inject(ToastService);

  readonly specialitesSelect = signal<Specialite[]>([]);

  nom = '';
  prenom = '';
  email = '';
  /** Id de spécialité choisie (chaîne pour le select), ou chaîne vide */
  specialiteId = '';
  experience = '';
  telephone = '';
  motDePasse = '';
  adresse = '';
  message = '';
  errorMessage = '';

  ngOnInit(): void {
    this.specialiteService.getAll().subscribe({
      next: (list) => {
        const sorted = [...list].sort((a, b) =>
          a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' })
        );
        this.specialitesSelect.set(sorted.slice(0, 10));
      },
      error: () => {
        this.toast.show('Impossible de charger les spécialités.', 'error');
        this.specialitesSelect.set([]);
      }
    });
  }

  onRegister() {
    this.errorMessage = '';
    this.message = '';

    if (!this.specialiteId) {
      this.errorMessage = 'Veuillez choisir une spécialité dans la liste.';
      return;
    }

    const data = {
      nom: this.nom.trim(),
      prenom: this.prenom.trim(),
      email: this.email.trim().toLowerCase(),
      motDePasse: this.motDePasse,
      telephone: this.telephone.trim(),
      specialiteId: parseInt(this.specialiteId, 10)
    };

    this.authService.registerMedecin(data).subscribe({
      next: () => {
        this.message = 'Compte médecin créé avec succès';

        setTimeout(() => {
          void this.router.navigate(['/login']);
        }, 1000);
      },
      error: (error: unknown) => {
        console.error(error);

        if (error && typeof error === 'object' && 'error' in error) {
          const err = error as { error?: string };
          this.errorMessage =
            typeof err.error === 'string' && err.error.trim()
              ? err.error
              : 'Erreur lors de la création du compte';
        } else {
          this.errorMessage = 'Erreur lors de la création du compte';
        }
      }
    });
  }
}
