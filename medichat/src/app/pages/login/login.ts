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
    const data = {
      email: this.email,
      motDePasse: this.motDePasse
    };

    this.authService.login(data).subscribe({
      next: (response) => {
        localStorage.setItem('user', JSON.stringify(response));

        if (response.role === 'ADMIN') {
          this.router.navigate(['/admin-dashboard']);
        } else if (response.role === 'MEDECIN') {
          this.router.navigate(['/medecin-dashboard']);
        } else if (response.role === 'PATIENT') {
          this.router.navigate(['/patient-dashboard']);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (error) => {
        console.error(error);
        this.errorMessage = 'Email ou mot de passe incorrect';
      }
    });
  }
}