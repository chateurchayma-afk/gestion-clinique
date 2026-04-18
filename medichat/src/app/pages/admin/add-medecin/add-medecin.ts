import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/api-base';
import { ToastService } from '../../../core/toast.service';
import { Specialite, SpecialiteService } from '../../../services/specialite.service';
import { Medecin, MedecinService } from '../../../services/medecin.service';

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
  selector: 'app-add-medecin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-medecin.html',
  styleUrls: ['./add-medecin.css']
})
export class AddMedecin implements OnInit {
  private readonly toast = inject(ToastService);
  private readonly specialiteService = inject(SpecialiteService);
  private readonly medecinService = inject(MedecinService);
  private readonly route = inject(ActivatedRoute);

  readonly specialitesSelect = signal<Specialite[]>([]);

  activeTab: 'personnel' | 'professionnel' = 'personnel';
  medecinForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  isEdit = false;
  medecinId: number | null = null;
  /** Conserve service / disponibilité à l’édition (pas de champs dédiés dans le formulaire). */
  private serviceMedicalIdSnapshot: number | null = null;
  private disponibleSnapshot = true;

  constructor(
    private readonly fb: FormBuilder,
    private readonly http: HttpClient,
    private readonly router: Router
  ) {
    this.medecinForm = this.fb.group({
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
      photo: [''],
      specialite: [''],
      numeroLicence: [''],
      qualifications: [''],
      experienceAnnees: [null as number | null, [Validators.min(0)]],
      formation: [''],
      certifications: [''],
      departement: [''],
      position: [''],
      biographie: ['']
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

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const parsed = parseInt(idParam, 10);
      if (!Number.isNaN(parsed)) {
        this.isEdit = true;
        this.medecinId = parsed;
        const pwd = this.medecinForm.get('motDePasse');
        pwd?.clearValidators();
        pwd?.setValidators(optionalPasswordMin6());
        pwd?.updateValueAndValidity();
        this.loadMedecin(parsed);
      }
    }
  }

  private loadMedecin(id: number): void {
    this.medecinService.getMedecinById(id).subscribe({
      next: (m) => this.patchFromMedecin(m),
      error: () => {
        this.errorMessage = 'Impossible de charger ce médecin.';
        this.toast.show(this.errorMessage, 'error');
      }
    });
  }

  private patchFromMedecin(m: Medecin): void {
    const u = m.utilisateur;
    const dn = u.dateNaissance
      ? typeof u.dateNaissance === 'string'
        ? (u.dateNaissance as string).slice(0, 10)
        : ''
      : '';

    this.serviceMedicalIdSnapshot = m.serviceMedical?.id ?? null;
    this.disponibleSnapshot = m.disponible ?? true;

    this.medecinForm.patchValue({
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
      photo: u.photo ?? '',
      motDePasse: '',
      specialite: m.specialite?.id != null ? String(m.specialite.id) : '',
      numeroLicence: m.matricule ?? '',
      experienceAnnees: m.experienceAnnees ?? null,
      biographie: m.biographie ?? '',
      qualifications: '',
      formation: '',
      certifications: '',
      departement: '',
      position: ''
    });
  }

  setTab(tab: 'personnel' | 'professionnel'): void {
    this.activeTab = tab;
  }

  goBack(): void {
    void this.router.navigate(['/admin/medecins']);
  }

  private emptyToNull<T>(v: T): T | null {
    if (v === '' || v === undefined) {
      return null;
    }
    return v as T | null;
  }

  private parseExperience(v: unknown): number | null {
    if (v === '' || v === null || v === undefined) {
      return null;
    }
    const n = typeof v === 'number' ? v : parseInt(String(v), 10);
    return Number.isNaN(n) ? null : n;
  }

  onSubmit(): void {
    if (this.medecinForm.invalid) {
      this.markFormGroupTouched();
      this.errorMessage = 'Veuillez corriger les erreurs dans le formulaire.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const v = this.medecinForm.value;
    const dateNaissance = this.emptyToNull(v.dateNaissance) as string | null;
    const specialiteId =
      v.specialite !== '' && v.specialite != null ? parseInt(String(v.specialite), 10) : null;

    if (this.isEdit && this.medecinId != null) {
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
        experienceAnnees: this.parseExperience(v.experienceAnnees),
        matricule: v.numeroLicence?.trim() || null,
        biographie: v.biographie?.trim() || null,
        qualifications: v.qualifications?.trim() || null,
        formation: v.formation?.trim() || null,
        certifications: v.certifications?.trim() || null,
        departement: v.departement?.trim() || null,
        position: v.position?.trim() || null,
        specialiteId,
        serviceMedicalId: this.serviceMedicalIdSnapshot,
        disponible: this.disponibleSnapshot
      };

      this.medecinService.updateMedecin(this.medecinId, payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.toast.show('Médecin modifié avec succès.', 'success');
          void this.router.navigate(['/admin/medecins']);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.errorMessage = this.extractError(err);
          this.toast.show(this.errorMessage, 'error', 5500);
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
      experienceAnnees: this.parseExperience(v.experienceAnnees),
      matricule: v.numeroLicence?.trim() || null,
      biographie: v.biographie?.trim() || null,
      qualifications: v.qualifications?.trim() || null,
      formation: v.formation?.trim() || null,
      certifications: v.certifications?.trim() || null,
      departement: v.departement?.trim() || null,
      position: v.position?.trim() || null,
      specialiteId,
      serviceMedicalId: null,
      disponible: true
    };

    this.http
      .post(`${API_BASE_URL}/api/auth/register-medecin`, payload, { responseType: 'text' })
      .subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toast.show('Médecin ajouté avec succès.', 'success');
        void this.router.navigate(['/admin/medecins']);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = this.extractError(err);
        this.toast.show(this.errorMessage, 'error', 5500);
      }
    });
  }

  private extractError(err: unknown): string {
    const e = err as { error?: unknown };
    if (typeof e.error === 'string' && e.error.trim()) {
      return e.error;
    }
    return 'Erreur lors de l’enregistrement du médecin.';
  }

  private markFormGroupTouched(): void {
    Object.keys(this.medecinForm.controls).forEach((key) => {
      this.medecinForm.get(key)?.markAsTouched();
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
