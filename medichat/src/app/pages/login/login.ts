import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login implements OnInit {
  showForm = false;
  email = '';
  motDePasse = '';
  errorMessage = '';
  /** Cible après connexion admin (provenant de la garde). */
  private returnUrl = '';
  /** Message si l’accès admin a été refusé faute de session. */
  guardHint = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((q) => {
      this.returnUrl = (q.get('returnUrl') ?? '').trim();
      if (q.get('needAdmin') === '1') {
        this.guardHint =
          'L’administration requiert un compte administrateur. Connectez-vous avec un compte ADMIN.';
        this.showForm = true;
      }
    });
  }

  showLoginForm() {
    this.showForm = true;
  }

  onLogin() {
    this.errorMessage = '';
    const data = {
      email: this.email.trim().toLowerCase(),
      motDePasse: this.motDePasse
    };

    this.authService.login(data).subscribe({
      next: (response) => {
        localStorage.setItem('user', JSON.stringify(response));

        const role = (response?.role ?? '').toString().trim().toUpperCase();
        if (role === 'ADMIN') {
          const ru = this.returnUrl;
          if (ru && /^[a-zA-Z0-9/_-]+$/.test(ru)) {
            void this.router.navigateByUrl('/' + ru);
          } else {
            void this.router.navigate(['/admin-dashboard']);
          }
        } else if (role === 'MEDECIN') {
          void this.router.navigate(['/medecin-dashboard']);
        } else if (role === 'PATIENT') {
          void this.router.navigate(['/patient-dashboard']);
        } else {
          void this.router.navigate(['/']);
        }
      },
      error: (error) => {
        console.error(error);
        const body = error?.error;
        if (typeof body?.message === 'string') {
          this.errorMessage = body.message;
        } else if (typeof body === 'string' && body.trim()) {
          this.errorMessage = body;
        } else {
          this.errorMessage = 'Email ou mot de passe incorrect';
        }
      }
    });
  }
}