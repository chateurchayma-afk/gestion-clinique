import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-register-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register-admin.html',
  styleUrls: ['../register-patient/register-patient.css', './register-admin.css']
})
export class RegisterAdmin {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  nom = '';
  prenom = '';
  email = '';
  telephone = '';
  motDePasse = '';
  confirmPassword = '';
  message = '';
  errorMessage = '';

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
}
