import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../core/api-base';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class Register {
  nom: string = '';
  prenom: string = '';
  email: string = '';
  motDePasse: string = '';
  confirmerMotDePasse: string = '';
  telephone: string = '';
  adresse: string = '';
  messageErreur: string = '';
  messageSucces: string = '';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  register(): void {
    this.messageErreur = '';
    this.messageSucces = '';

    if (
      !this.nom ||
      !this.prenom ||
      !this.email ||
      !this.motDePasse ||
      !this.confirmerMotDePasse ||
      !this.telephone
    ) {
      this.messageErreur = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }

    if (this.motDePasse !== this.confirmerMotDePasse) {
      this.messageErreur = 'Les mots de passe ne correspondent pas.';
      return;
    }

    const body = {
      nom: this.nom,
      prenom: this.prenom,
      email: this.email,
      motDePasse: this.motDePasse,
      telephone: this.telephone
    };

    this.http
      .post(`${API_BASE_URL}/api/auth/register-patient`, body, { responseType: 'text' })
      .subscribe({
        next: (response) => {
          console.log('Inscription réussie :', response);
          this.messageSucces = 'Compte créé avec succès.';
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 1000);
        },
        error: (error) => {
          console.error('Erreur inscription :', error);

          if (error?.error) {
            this.messageErreur = typeof error.error === 'string'
              ? error.error
              : 'Erreur lors de la création du compte.';
          } else {
            this.messageErreur = 'Erreur lors de la création du compte.';
          }
        }
      });
  }
}