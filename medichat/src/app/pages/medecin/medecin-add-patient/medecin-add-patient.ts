import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import { API_BASE_URL } from '../../../core/api-base';
import { ToastService } from '../../../core/toast.service';

function optionalPasswordMin6(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = control.value;
    if (v == null || String(v).length === 0) {
      return null;
    }
    return String(v).length < 6
      ? { minlength: { requiredLength: 6, actualLength: String(v).length } }
      : null;
  };
}

@Component({
  selector: 'app-medecin-add-patient',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './medecin-add-patient.html',
  styleUrls: ['../../admin/add-patient/add-patient.css', '../../admin/add-medecin/add-medecin.css']
})
export class MedecinAddPatient {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  activeTab: 'personnel' | 'dossier' = 'personnel';
  patientForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';

  constructor() {
    this.patientForm = this.fb.group({
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
      situationMatrimoniale: [''],
      contactUrgenceNom: [''],
      contactUrgenceTelephone: [''],
      methodeContactPreferee: ['TELEPHONE'],
      numeroDossier: [''],
      photo: ['']
    });
  }

  setTab(tab: 'personnel' | 'dossier'): void {
    this.activeTab = tab;
  }

  goBack(): void {
    void this.router.navigate(['/medecin-dashboard/patients']);
  }

  onSubmit(): void {
    if (this.patientForm.invalid) {
      this.markFormGroupTouched();
      this.errorMessage = 'Veuillez corriger les erreurs dans le formulaire.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const v = this.patientForm.value;
    const dateNaissance =
      v.dateNaissance != null && String(v.dateNaissance).trim() !== ''
        ? String(v.dateNaissance).trim()
        : null;

    const payload = {
      nom: v.nom.trim(),
      prenom: v.prenom.trim(),
      email: v.email.trim().toLowerCase(),
      motDePasse: v.motDePasse,
      telephone: v.telephone.trim(),
      adresse: v.adresse?.trim() || null,
      ville: v.ville?.trim() || null,
      gouvernorat: v.gouvernorat?.trim() || null,
      codePostal: v.codePostal?.trim() || null,
      dateNaissance,
      sexe: v.sexe || null,
      photo: v.photo?.trim() || null,
      situationMatrimoniale: v.situationMatrimoniale?.trim() || null,
      contactUrgenceNom: v.contactUrgenceNom?.trim() || null,
      contactUrgenceTelephone: v.contactUrgenceTelephone?.trim() || null,
      methodeContactPreferee: v.methodeContactPreferee || null,
      numeroDossier: v.numeroDossier?.trim() || null
    };

    this.http
      .post(`${API_BASE_URL}/api/auth/register-patient`, payload, { responseType: 'text' })
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.toast.show('Patient ajouté avec succès.', 'success');
          void this.router.navigate(['/medecin-dashboard/patients']);
        },
        error: (err) => {
          this.isSubmitting = false;
          const msg =
            typeof err?.error === 'string' && err.error.trim()
              ? err.error
              : 'Erreur lors de l’ajout du patient.';
          this.errorMessage = msg;
          this.toast.show(msg, 'error', 5500);
        }
      });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.patientForm.controls).forEach((key) => {
      this.patientForm.get(key)?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const control = this.patientForm.get(fieldName);
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
    }
    return '';
  }
}
