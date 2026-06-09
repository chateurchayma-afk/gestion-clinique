import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css']
})
export class ForgotPasswordComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  newPassword = '';
  confirmPassword = '';

  loading = false;
  successMessage = '';
  errorMessage = '';

  onSubmit(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (!this.email.trim()) {
      this.errorMessage = 'Veuillez entrer votre adresse e-mail.';
      return;
    }
    if (!this.newPassword || this.newPassword.length < 6) {
      this.errorMessage = 'Le mot de passe doit contenir au moins 6 caractères.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas.';
      return;
    }

    this.loading = true;
    this.authService.resetPassword(this.email.trim().toLowerCase(), this.newPassword).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Mot de passe mis à jour avec succès !';
        setTimeout(() => void this.router.navigate(['/login'], { queryParams: { form: '1' } }), 1500);
      },
      error: (err) => {
        this.loading = false;
        const msg = typeof err?.error === 'string' && err.error.trim()
          ? err.error
          : 'Erreur lors de la réinitialisation.';
        this.errorMessage = msg;
      }
    });
  }
}
