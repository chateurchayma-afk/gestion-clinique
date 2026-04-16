import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-add-medecin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-medecin.html',
  styleUrls: ['./add-medecin.css']
})
export class AddMedecin {
  activeTab: 'personnel' | 'professionnel' = 'personnel';

  form = {
    nom: '',
    prenom: '',
    dateNaissance: '',
    sexe: '',
    adresse: '',
    ville: '',
    gouvernorat: '',
    codePostal: '',
    email: '',
    telephone: '',

    specialite: '',
    numeroLicence: '',
    qualifications: '',
    experienceAnnees: '',
    formation: '',
    certifications: '',
    departement: '',
    position: '',

    motDePasse: '123456'
  };

  constructor(private http: HttpClient, private router: Router) {}

  setTab(tab: 'personnel' | 'professionnel'): void {
    this.activeTab = tab;
  }

  goBack(): void {
    this.router.navigate(['/admin/medecins']);
  }

  onSubmit(): void {
    const payload = {
      nom: this.form.nom,
      prenom: this.form.prenom,
      dateNaissance: this.form.dateNaissance,
      sexe: this.form.sexe,
      email: this.form.email,
      motDePasse: this.form.motDePasse,
      telephone: this.form.telephone,
      adresse: this.form.adresse,
      ville: this.form.ville,
      gouvernorat: this.form.gouvernorat,
      codePostal: this.form.codePostal
    };

    this.http.post('http://localhost:8081/api/auth/register-medecin', payload)
      .subscribe({
        next: () => {
          alert('Médecin ajouté avec succès');
          this.router.navigate(['/admin/medecins']);
        },
        error: (err) => {
          console.error(err);
          alert('Erreur lors de l’ajout du médecin');
        }
      });
  }
}