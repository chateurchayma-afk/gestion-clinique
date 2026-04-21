import { Component, OnInit, AfterViewInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { Specialite, SpecialiteService } from '../../services/specialite.service';
import { ToastService } from '../../core/toast.service';
import { GoogleAuthService, GOOGLE_GSI_BUTTON_HOST_ID } from '../../services/google-auth.service';

@Component({
  selector: 'app-register-medecin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register-medecin.html',
  styleUrls: ['./register-medecin.css']
})
export class RegisterMedecin implements OnInit, AfterViewInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly specialiteService = inject(SpecialiteService);
  private readonly toast = inject(ToastService);
  private readonly googleAuth = inject(GoogleAuthService);

  readonly specialitesSelect = signal<Specialite[]>([]);
  readonly googleLoading = signal(false);

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

  private googleSignupMounted = false;

  ngOnInit(): void {
    void this.googleAuth.ensureScriptLoaded().catch(() => {});

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

  ngAfterViewInit(): void {
    setTimeout(() => this.tryMountGoogleSignup(), 150);
  }

  private tryMountGoogleSignup(): void {
    if (this.googleSignupMounted) {
      return;
    }
    if (!document.getElementById(GOOGLE_GSI_BUTTON_HOST_ID)) {
      return;
    }

    void this.googleAuth
      .renderOfficialGoogleButton(
        (token: string) => this.authenticateWithGoogle(token),
        { buttonText: 'signup_with' }
      )
      .then(() => {
        this.googleSignupMounted = true;
      })
      .catch((err: unknown) => {
        const msg =
          err instanceof Error ? err.message : "Erreur lors de l'initialisation de Google";
        this.errorMessage = msg;
        this.toast.show(msg, 'error');
        console.error('Google init error:', err);
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

  private authenticateWithGoogle(googleToken: string): void {
    this.googleLoading.set(true);
    this.googleAuth.authenticateWithGoogle(googleToken).subscribe({
      next: (response) => {
        this.googleLoading.set(false);
        localStorage.setItem('jwt_token', response.token);
        void this.router.navigate(['/medecin/rendez-vous']);
      },
      error: (error: { error?: { message?: string } }) => {
        this.googleLoading.set(false);
        console.error('Erreur authentification Google :', error);
        const backendMsg = error?.error?.message;
        this.toast.show(
          typeof backendMsg === 'string' && backendMsg.trim()
            ? backendMsg
            : "Erreur lors de l'inscription avec Google",
          'error'
        );
      },
    });
  }
}
