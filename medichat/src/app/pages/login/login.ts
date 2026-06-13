import { Location } from '@angular/common';
import { Component, OnInit, AfterViewInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { GoogleAuthService, GOOGLE_GSI_BUTTON_HOST_ID } from '../../services/google-auth.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login implements OnInit, AfterViewInit {
  private readonly authService = inject(AuthService);
  private readonly googleAuth = inject(GoogleAuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);

  showForm = signal(false);
  email = '';
  motDePasse = '';
  errorMessage = '';
  pendingMessage = '';
  googleLoading = signal(false);
  readonly canInstall = signal(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private deferredInstallPrompt: any = null;
  private googleWelcomeMounted = false;
  private returnUrl = '';
  guardHint = '';

  ngOnInit(): void {
    // Recuperer le prompt capturé globalement avant qu'Angular charge
    const win = window as any;
    if (win.__pwaInstallPrompt) {
      this.deferredInstallPrompt = win.__pwaInstallPrompt;
      this.canInstall.set(true);
    }

    // Ecouter si l'evenement arrive apres l'initialisation
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      (window as any).__pwaInstallPrompt = e;
      this.canInstall.set(true);
    });

    // Evenement personnalise dispatche depuis index.html
    window.addEventListener('pwainstallready', () => {
      if ((window as any).__pwaInstallPrompt) {
        this.deferredInstallPrompt = (window as any).__pwaInstallPrompt;
        this.canInstall.set(true);
      }
    });

    window.addEventListener('appinstalled', () => {
      this.deferredInstallPrompt = null;
      (window as any).__pwaInstallPrompt = null;
      this.canInstall.set(false);
    });

    void this.googleAuth.ensureScriptLoaded().catch(() => {});

    this.route.queryParamMap.subscribe((q) => {
      this.returnUrl = (q.get('returnUrl') ?? '').trim();

      if (q.get('form') === '1') {
        this.showForm.set(true);
        this.guardHint = '';
        this.errorMessage = '';
        this.pendingMessage = '';
        this.email = '';
        this.motDePasse = '';
        this.googleWelcomeMounted = false;
        this.location.replaceState('/login');
        setTimeout(() => document.getElementById('login-email')?.focus(), 0);
        return;
      }

      if (q.get('welcome') === '1') {
        this.showForm.set(false);
        this.guardHint = '';
        this.errorMessage = '';
        this.email = '';
        this.motDePasse = '';
        this.googleWelcomeMounted = false;
        this.location.replaceState('/login');
        setTimeout(() => document.getElementById('login-welcome-btn')?.focus(), 0);
        setTimeout(() => this.tryMountGoogleWelcome(), 150);
        return;
      }

      if (q.get('needAdmin') === '1') {
        this.guardHint =
          "L'administration requiert un compte administrateur. Connectez-vous avec un compte ADMIN.";
        this.showForm.set(true);
        this.googleWelcomeMounted = false;
      }
      if (q.get('needMedecin') === '1') {
        this.guardHint =
          "Cet espace requiert un compte medecin. Connectez-vous avec un compte MEDECIN.";
        this.showForm.set(true);
        this.googleWelcomeMounted = false;
      }

      if (!this.showForm()) {
        setTimeout(() => this.tryMountGoogleWelcome(), 150);
      }
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.tryMountGoogleWelcome(), 150);
  }

  async installApp(): Promise<void> {
    if (!this.deferredInstallPrompt) {
      this.toast.show("L'installation n'est pas disponible sur ce navigateur.", 'error');
      return;
    }
    await this.deferredInstallPrompt.prompt();
    const result = await this.deferredInstallPrompt.userChoice;
    if (result.outcome === 'accepted') {
      this.deferredInstallPrompt = null;
      (window as any).__pwaInstallPrompt = null;
      this.canInstall.set(false);
      this.toast.show('Application installée avec succès !', 'success');
    }
  }

  showLoginForm() {
    this.showForm.set(true);
    this.googleWelcomeMounted = false;
    setTimeout(() => document.getElementById('login-email')?.focus(), 0);
  }

  private tryMountGoogleWelcome(): void {
    if (this.showForm() || this.googleWelcomeMounted) {
      return;
    }
    if (!document.getElementById(GOOGLE_GSI_BUTTON_HOST_ID)) {
      return;
    }

    void this.googleAuth
      .renderOfficialGoogleButton(
        (googleToken: string) => {
          this.googleLoading.set(true);
          this.googleAuth.authenticateWithGoogle(googleToken).subscribe({
            next: (response) => {
              localStorage.setItem('user', JSON.stringify(response));
              this.googleLoading.set(false);
              this.toast.show('Connexion reussie avec Google !', 'success');
              this.redirectAfterLogin(response.role ?? '');
            },
            error: (error) => {
              this.googleLoading.set(false);
              const msg = error?.error?.message || 'Erreur lors de la connexion Google.';
              this.errorMessage = msg;
              this.toast.show(msg, 'error');
              console.error('Google auth error:', error);
            },
          });
        },
        { buttonText: 'continue_with' }
      )
      .then(() => {
        this.googleWelcomeMounted = true;
      })
      .catch((err: unknown) => {
        console.warn('Google bouton (login accueil):', err);
        this.errorMessage =
          err instanceof Error ? err.message : "Impossible d'afficher le bouton Google.";
        this.toast.show(this.errorMessage, 'error');
      });
  }

  private redirectAfterLogin(role: string): void {
    const roleUpper = (role ?? '').toString().trim().toUpperCase();
    if (roleUpper === 'ADMIN') {
      const ru = this.returnUrl;
      if (ru && /^[a-zA-Z0-9/_-]+$/.test(ru)) {
        void this.router.navigateByUrl('/' + ru);
      } else {
        void this.router.navigate(['/admin/dashboard']);
      }
    } else if (roleUpper === 'MEDECIN') {
      const ru = this.returnUrl;
      if (ru && /^[a-zA-Z0-9/_-]+$/.test(ru)) {
        void this.router.navigateByUrl('/' + ru);
      } else {
        void this.router.navigate(['/medecin-dashboard/accueil']);
      }
    } else if (roleUpper === 'PATIENT') {
      void this.router.navigate(['/patient-dashboard', 'accueil']);
    } else {
      void this.router.navigate(['/']);
    }
  }

  onLogin() {
    this.errorMessage = '';
    this.pendingMessage = '';
    const data = {
      email: this.email.trim().toLowerCase(),
      motDePasse: this.motDePasse,
    };

    this.authService.login(data).subscribe({
      next: (response) => {
        const role = (response?.role ?? '').toString().trim().toUpperCase();
        const token = response?.token ?? null;
        const message: string = (response?.message ?? '').toString().trim();

        if (!token || !role) {
          const msgLower = message.toLowerCase();
          if (msgLower.includes('attente') || msgLower.includes('validation')) {
            this.pendingMessage = message || "Votre compte est en attente de validation par l'administrateur.";
          } else if (msgLower.includes('refus')) {
            this.errorMessage = message || "Votre compte a ete refuse. Contactez l'administrateur.";
          } else {
            this.errorMessage = message || 'Email ou mot de passe incorrect';
          }
          return;
        }

        localStorage.setItem('user', JSON.stringify(response));

        if (role === 'ADMIN') {
          const ru = this.returnUrl;
          if (ru && /^[a-zA-Z0-9/_-]+$/.test(ru)) {
            void this.router.navigateByUrl('/' + ru);
          } else {
            void this.router.navigate(['/admin/dashboard']);
          }
        } else if (role === 'MEDECIN') {
          const ru = this.returnUrl;
          if (ru && /^[a-zA-Z0-9/_-]+$/.test(ru)) {
            void this.router.navigateByUrl('/' + ru);
          } else {
            void this.router.navigate(['/medecin-dashboard/accueil']);
          }
        } else if (role === 'PATIENT') {
          void this.router.navigate(['/patient-dashboard', 'accueil']);
        } else {
          void this.router.navigate(['/']);
        }
      },
      error: (error) => {
        const body = error?.error;
        if (typeof body?.message === 'string') {
          this.errorMessage = body.message;
        } else if (typeof body === 'string' && body.trim()) {
          this.errorMessage = body;
        } else {
          this.errorMessage = 'Email ou mot de passe incorrect';
        }
      },
    });
  }
}
