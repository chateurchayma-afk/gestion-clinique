import { Component, signal, inject, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { GoogleAuthService, GOOGLE_GSI_BUTTON_HOST_ID } from '../../services/google-auth.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-register-patient',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register-patient.html',
  styleUrls: ['./register-patient.css']
})
export class RegisterPatient implements OnInit, AfterViewInit {
  nom = '';
  prenom = '';
  email = '';
  motDePasse = '';
  confirmPassword = '';
  telephone = '';
  adresse = '';
  message = '';
  errorMessage = '';

  readonly googleLoading = signal(false);

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly googleAuth = inject(GoogleAuthService);
  private readonly toast = inject(ToastService);

  private googleSignupMounted = false;

  ngOnInit(): void {
    void this.googleAuth.ensureScriptLoaded().catch(() => {});
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

    if (this.motDePasse !== this.confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas';
      return;
    }

    const data = {
      nom: this.nom,
      prenom: this.prenom,
      email: this.email,
      motDePasse: this.motDePasse,
      telephone: this.telephone
    };

    this.authService.registerPatient(data).subscribe({
      next: (response: any) => {
        console.log(response);
        this.message = 'Compte patient créé avec succès';

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1000);
      },
      error: (error: any) => {
        console.error(error);

        if (error?.error) {
          this.errorMessage =
            typeof error.error === 'string'
              ? error.error
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
        void this.router.navigate(['/patient-dashboard/accueil']);
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
