import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../../core/toast.service';
import { Patient } from '../../../services/patient.service';
import { PatientProfilService } from '../../../services/patient-profil.service';
import { finalize, timeout } from 'rxjs';

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
  selector: 'app-patient-profil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './patient-profil.html',
  styleUrls: ['./patient-profil.css', '../patient-pro.css']
})
export class PatientProfil implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly profilService = inject(PatientProfilService);

  activeTab: 'personnel' | 'dossier' = 'personnel';
  patientForm: FormGroup;
  isSubmitting = false;
  readonly loading = signal(true);
  errorMessage = '';
  readonly loadError = signal('');

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
      telephone: ['', [Validators.required, Validators.pattern(/^[+]?[0-9\s\-()]{8,15}$/)]],
      motDePasse: ['', optionalPasswordMin6()],
      situationMatrimoniale: [''],
      contactUrgenceNom: [''],
      contactUrgenceTelephone: [''],
      methodeContactPreferee: ['TELEPHONE'],
      numeroDossier: [''],
      photo: ['']
    });
  }

  ngOnInit(): void {
    const pwd = this.patientForm.get('motDePasse');
    pwd?.setValidators(optionalPasswordMin6());
    pwd?.updateValueAndValidity();
    this.loadProfil();
  }

  retryLoad(): void {
    this.loadProfil();
  }

  private loadProfil(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.profilService
      .getProfil()
      .pipe(
        timeout(20000),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (p) => {
          if (!p?.utilisateur) {
            this.loadError.set('Profil incomplet côté serveur. Réessayez ou reconnectez-vous.');
            this.toast.show(this.loadError(), 'error');
            return;
          }
          this.patchFromPatient(p);
        },
        error: (err) => {
          const msg = this.loadProfilErrorMessage(err);
          this.loadError.set(msg);
          this.toast.show(msg, 'error');
        }
      });
  }

  private loadProfilErrorMessage(err: { status?: number; error?: unknown }): string {
    if (err?.status === 0) {
      return 'Serveur inaccessible. Vérifiez que le backend tourne sur http://localhost:8081.';
    }
    if (err?.status === 401 || err?.status === 403) {
      return 'Session expirée ou accès refusé. Reconnectez-vous.';
    }
    const e = err?.error;
    if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: string }).message === 'string') {
      return (e as { message: string }).message;
    }
    return 'Impossible de charger votre profil.';
  }

  private patchFromPatient(p: Patient): void {
    const u = p.utilisateur;
    if (!u) {
      return;
    }
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

  get photoUrl(): string {
    return String(this.patientForm.get('photo')?.value ?? '').trim();
  }

  get initials(): string {
    const prenom = String(this.patientForm.get('prenom')?.value ?? '').trim();
    const nom = String(this.patientForm.get('nom')?.value ?? '').trim();
    return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase() || 'PT';
  }

  get displayName(): string {
    const prenom = String(this.patientForm.get('prenom')?.value ?? '').trim();
    const nom = String(this.patientForm.get('nom')?.value ?? '').trim();
    return `${prenom} ${nom}`.trim() || 'Mon profil patient';
  }

  get contactLine(): string {
    const parts = [
      this.patientForm.get('ville')?.value,
      this.patientForm.get('gouvernorat')?.value
    ]
      .map((v) => (v != null ? String(v).trim() : ''))
      .filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'À compléter';
  }

  get methodeContactLabel(): string {
    const m = String(this.patientForm.get('methodeContactPreferee')?.value ?? 'TELEPHONE');
    switch (m) {
      case 'EMAIL':
        return 'E-mail';
      case 'SMS':
        return 'SMS';
      default:
        return 'Téléphone';
    }
  }

  get sexeLabel(): string {
    const s = String(this.patientForm.get('sexe')?.value ?? '');
    if (s === 'HOMME') {
      return 'Homme';
    }
    if (s === 'FEMME') {
      return 'Femme';
    }
    return 'Non renseigné';
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

    this.profilService.updateProfil(payload).subscribe({
      next: (updated) => {
        this.isSubmitting = false;
        this.patchFromPatient(updated);
        this.patientForm.get('motDePasse')?.setValue('');
        this.syncLocalUserEmail(updated.utilisateur.email);
        this.toast.show('Profil mis à jour.', 'success');
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = this.extractError(err);
        this.errorMessage = msg;
        this.toast.show(msg, 'error', 5500);
      }
    });
  }

  private syncLocalUserEmail(email: string): void {
    const raw = localStorage.getItem('user');
    if (!raw) {
      return;
    }
    try {
      const u = JSON.parse(raw) as Record<string, unknown>;
      u['email'] = email;
      localStorage.setItem('user', JSON.stringify(u));
    } catch {
      /* ignore */
    }
  }

  private extractError(err: { error?: unknown }): string {
    const e = err?.error;
    if (typeof e === 'string' && e.trim()) {
      return e.trim();
    }
    if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: string }).message === 'string') {
      return (e as { message: string }).message;
    }
    return 'Erreur lors de l’enregistrement.';
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
        return 'Adresse e-mail invalide';
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
