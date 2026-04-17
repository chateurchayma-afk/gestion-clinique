import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/api-base';
import { ToastService } from '../../../core/toast.service';
import { Specialite, SpecialiteService } from '../../../services/specialite.service';

@Component({
  selector: 'app-add-medecin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-medecin.html',
  styleUrls: ['./add-medecin.css']
})
export class AddMedecin implements OnInit {
  private readonly toast = inject(ToastService);
  private readonly specialiteService = inject(SpecialiteService);

  /** Jusqu’à 10 spécialités (triées par nom), chargées depuis l’API */
  readonly specialitesSelect = signal<Specialite[]>([]);

  activeTab: 'personnel' | 'professionnel' = 'personnel';
  medecinForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';

  constructor(private fb: FormBuilder, private http: HttpClient, private router: Router) {
    this.medecinForm = this.fb.group({
      // Informations personnelles
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      dateNaissance: [''],
      sexe: [''],
      adresse: [''],
      ville: [''],
      gouvernorat: [''],
      codePostal: [''],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.required, Validators.pattern(/^[\+]?[0-9\s\-\(\)]{8,15}$/)]],
      motDePasse: ['', [Validators.required, Validators.minLength(6)]],

      // Informations professionnelles
      specialite: [''],
      numeroLicence: [''],
      qualifications: [''],
      experienceAnnees: [null, [Validators.min(0)]],
      formation: [''],
      certifications: [''],
      departement: [''],
      position: ['']
    });
  }

  ngOnInit(): void {
    this.specialiteService.getAll().subscribe({
      next: (list) => {
        const sorted = [...list].sort((a, b) =>
          a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' })
        );
        this.specialitesSelect.set(sorted.slice(0, 10));
      },
      error: () => {
        this.toast.show('Impossible de charger la liste des spécialités.', 'error');
        this.specialitesSelect.set([]);
      }
    });
  }

  setTab(tab: 'personnel' | 'professionnel'): void {
    this.activeTab = tab;
  }

  goBack(): void {
    void this.router.navigate(['/admin/medecins']);
  }

  onSubmit(): void {
    if (this.medecinForm.invalid) {
      this.markFormGroupTouched();
      this.errorMessage = 'Veuillez corriger les erreurs dans le formulaire.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const formValue = this.medecinForm.value;

    const payload = {
      nom: formValue.nom.trim(),
      prenom: formValue.prenom.trim(),
      email: formValue.email.trim().toLowerCase(),
      motDePasse: formValue.motDePasse,
      telephone: formValue.telephone.trim(),
      adresse: formValue.adresse?.trim() || null,
      ville: formValue.ville?.trim() || null,
      gouvernorat: formValue.gouvernorat?.trim() || null,
      codePostal: formValue.codePostal?.trim() || null,
      dateNaissance: formValue.dateNaissance || null,
      sexe: formValue.sexe || null,
      experienceAnnees: formValue.experienceAnnees,
      matricule: formValue.numeroLicence?.trim() || null,
      biographie: null, // Peut être étendu plus tard
      specialiteId:
        formValue.specialite !== '' && formValue.specialite != null
          ? parseInt(String(formValue.specialite), 10)
          : null,
      serviceMedicalId: null, // Peut être étendu plus tard
      disponible: true
    };

    this.http.post(`${API_BASE_URL}/api/auth/register-medecin`, payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toast.show('Médecin ajouté avec succès.', 'success');
        void this.router.navigate(['/admin/medecins']);
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error(err);
        if (err.error && typeof err.error === 'string') {
          this.errorMessage = err.error;
        } else {
          this.errorMessage = 'Erreur lors de l’ajout du médecin. Vérifiez les données saisies.';
        }
        this.toast.show(this.errorMessage, 'error', 5500);
      }
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.medecinForm.controls).forEach(key => {
      const control = this.medecinForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const control = this.medecinForm.get(fieldName);
    if (control && control.errors && control.touched) {
      if (control.errors['required']) {
        return 'Ce champ est obligatoire';
      }
      if (control.errors['email']) {
        return 'Adresse email invalide';
      }
      if (control.errors['minlength']) {
        return `Minimum ${control.errors['minlength'].requiredLength} caractères`;
      }
      if (control.errors['pattern']) {
        return 'Format invalide';
      }
      if (control.errors['min']) {
        return 'Valeur invalide';
      }
    }
    return '';
  }
}