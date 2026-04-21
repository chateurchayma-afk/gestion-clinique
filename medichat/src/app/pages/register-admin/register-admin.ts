import { Component, inject, signal, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { GoogleAuthService, GOOGLE_GSI_BUTTON_HOST_ID } from '../../services/google-auth.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-register-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register-admin.html',
  styleUrls: ['../register-patient/register-patient.css', './register-admin.css']
})
export class RegisterAdmin implements OnInit, AfterViewInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly googleAuth = inject(GoogleAuthService);
  private readonly toast = inject(ToastService);

  readonly googleLoading = signal(false);

  nom = '';
  prenom = '';
  email = '';
  telephone = '';
  motDePasse = '';
  confirmPassword = '';
  message = '';
  errorMessage = '';

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

  onRegister(): void {
    this.errorMessage = '';
    this.message = '';

    if (this.motDePasse !== this.confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas';
      return;
    }
    if (this.motDePasse.length < 6) {
      this.errorMessage = 'Le mot de passe doit contenir au moins 6 caractères';
      return;
    }

    const data = {
      nom: this.nom.trim(),
      prenom: this.prenom.trim(),
      email: this.email.trim().toLowerCase(),
      motDePasse: this.motDePasse,
      telephone: this.telephone.trim() || null
    };

    this.authService.registerAdmin(data).subscribe({
      next: () => {
        this.message = 'Compte administrateur créé avec succès';
        setTimeout(() => void this.router.navigate(['/login']), 1200);
      },
      error: (error: unknown) => {
        const err = error as { error?: unknown; message?: string };
        const body = err.error;
        if (typeof body === 'string' && body.trim()) {
          this.errorMessage = body;
        } else if (body && typeof body === 'object' && 'message' in body) {
          const m = (body as { message?: string }).message;
          this.errorMessage = typeof m === 'string' && m.trim() ? m : 'Erreur lors de la création du compte';
        } else {
          this.errorMessage = err.message?.trim() || 'Erreur lors de la création du compte';
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
        void this.router.navigate(['/admin/dashboard']);
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
