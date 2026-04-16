import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-register-patient',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register-patient.html',
  styleUrls: ['./register-patient.css']
})
export class RegisterPatient {
  nom = '';
  prenom = '';
  email = '';
  motDePasse = '';
  confirmPassword = '';
  telephone = '';
  adresse = '';
  message = '';
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

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
}