import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/api-base';
import { ToastService } from '../../../core/toast.service';
import { Patient, PatientService } from '../../../services/patient.service';

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
  selector: 'app-add-patient',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-patient.html',
  styleUrls: ['./add-patient.css', '../add-medecin/add-medecin.css']
})
export class AddPatient implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly patientService = inject(PatientService);

  activeTab: 'personnel' | 'dossier' = 'personnel';
  patientForm: FormGroup;
  isEdit = false;
  patientId: number | null = null;
  isSubmitting = false;
  errorMessage = '';
  loadError = '';

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

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const parsed = parseInt(idParam, 10);
      if (!Number.isNaN(parsed)) {
        this.isEdit = true;
        this.patientId = parsed;
        const pwd = this.patientForm.get('motDePasse');
        pwd?.clearValidators();
        pwd?.setValidators(optionalPasswordMin6());
        pwd?.updateValueAndValidity();
        this.loadPatient(parsed);
      }
    }
  }

  private loadPatient(id: number): void {
    this.patientService.getPatientById(id).subscribe({
      next: (p) => this.patchFromPatient(p),
      error: (err) => {
        console.error(err);
        this.loadError = 'Impossible de charger ce patient.';
        this.toast.show(this.loadError, 'error');
      }
    });
  }

  private patchFromPatient(p: Patient): void {
    const u = p.utilisateur;
    const dn = u.dateNaissance
      ? typeof u.dateNaissance === 'string'
        ? (u.dateNaissance as string).slice(0, 10)
        : ''
      : '';

    this.patientForm.patchValue({
      nom: u.nom ?? '',
      prenom: u.prenom ?? '',
      email: u.email ?? '',
      telephone: u.telephone ?? '',
      dateNaissance: dn,
      sexe: u.sexe ?? '',
      adresse: u.adresse ?? '',
      ville: u.ville ?? '',
      gouvernorat: u.gouvernorat ?? '',
      codePostal: u.codePostal ?? '',
      motDePasse: '',
      situationMatrimoniale: p.situationMatrimoniale ?? '',
      contactUrgenceNom: p.contactUrgenceNom ?? '',
      contactUrgenceTelephone: p.contactUrgenceTelephone ?? '',
      methodeContactPreferee: p.methodeContactPreferee ?? 'TELEPHONE',
      numeroDossier: p.numeroDossier ?? '',
      photo: u.photo ?? ''
    });
  }

  setTab(tab: 'personnel' | 'dossier'): void {
    this.activeTab = tab;
  }

  goBack(): void {
    void this.router.navigate(['/admin/patients']);
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

    if (this.isEdit && this.patientId != null) {
      const payload = {
        nom: v.nom.trim(),
        prenom: v.prenom.trim(),
        email: v.email.trim().toLowerCase(),
        telephone: v.telephone.trim(),
        motDePasse: v.motDePasse?.trim() ? v.motDePasse.trim() : null,
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

      this.patientService.updatePatient(this.patientId, payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.toast.show('Patient modifié avec succès.', 'success');
          void this.router.navigate(['/admin/patients']);
        },
        error: (err) => {
          this.isSubmitting = false;
          const msg =
            typeof err?.error === 'string' && err.error.trim()
              ? err.error
              : 'Erreur lors de la modification.';
          this.errorMessage = msg;
          this.toast.show(msg, 'error', 5500);
        }
      });
      return;
    }

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
        void this.router.navigate(['/admin/patients']);
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
