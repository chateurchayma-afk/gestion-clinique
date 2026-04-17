import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  showForm = false;
  email = '';
  motDePasse = '';
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

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
          void this.router.navigate(['/admin-dashboard']);
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