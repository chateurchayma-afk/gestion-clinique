import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-add-patient',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-patient.html',
  styleUrl: './add-patient.css'
})
export class AddPatient {
  form = {
    nom: '',
    prenom: '',
    dateNaissance: '',
    sexe: '',
    situationMatrimoniale: '',
    ville: '',
    adresse: '',
    gouvernorat: '',
    codePostal: '',
    email: '',
    telephone: '',
    methodeContactPreferee: 'TELEPHONE',
    motDePasse: '123456'
  };

  constructor(private http: HttpClient, private router: Router) {}

  goBack(): void {
    this.router.navigate(['/admin/patients']);
  }

  onSubmit(): void {
    const payload = {
      nom: this.form.nom,
      prenom: this.form.prenom,
      email: this.form.email,
      motDePasse: this.form.motDePasse,
      telephone: this.form.telephone,
      adresse: this.form.adresse,
      ville: this.form.ville,
      gouvernorat: this.form.gouvernorat,
      codePostal: this.form.codePostal
    };

    this.http.post('http://localhost:8081/api/auth/register-patient', payload)
      .subscribe({
        next: () => {
          alert('Patient ajouté avec succès');
          this.router.navigate(['/admin/patients']);
        },
        error: (err) => {
          console.error(err);
          alert('Erreur lors de l’ajout du patient');
        }
      });
  }
}