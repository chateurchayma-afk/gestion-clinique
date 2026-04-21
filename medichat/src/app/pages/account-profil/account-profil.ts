import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ToastService } from '../../core/toast.service';
import { UserSessionService } from '../../core/user-session.service';
import { AccountProfilService, UtilisateurMe } from '../../services/account-profil.service';

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
  selector: 'app-account-profil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './account-profil.html',
  styleUrl: './account-profil.css'
})
export class AccountProfil implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly api = inject(AccountProfilService);
  private readonly userSession = inject(UserSessionService);

  form: FormGroup;
  loading = true;
  submitting = false;
  loadError = '';

  constructor() {
    this.form = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      telephone: [''],
      adresse: [''],
      ville: [''],
      gouvernorat: [''],
      codePostal: [''],
      motDePasse: ['', optionalPasswordMin6()]
    });
  }

  ngOnInit(): void {
    const hydrated = this.hydrateFromLocalStorage();
    if (hydrated) {
      this.loading = false;
    }

    this.api
      .getMe()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (u) => {
          this.loadError = '';
          this.patchFromServer(u);
        },
        error: () => {
          if (!hydrated) {
            this.loadError = 'Impossible de charger votre profil.';
            this.toast.show(this.loadError, 'error');
          } else {
            this.toast.show(
              'Le serveur ne répond pas tout de suite. Les champs principaux viennent de votre session ; réessayez pour charger adresse et téléphone.',
              'info',
              5500
            );
          }
        }
      });
  }

  /**
   * Affiche tout de suite nom / prénom / email depuis la session de connexion,
   * pour éviter un écran vide pendant l’appel réseau.
   */
  private hydrateFromLocalStorage(): boolean {
    const raw = localStorage.getItem('user');
    if (!raw) {
      return false;
    }
    try {
      const u = JSON.parse(raw) as { email?: string; nom?: string; prenom?: string };
      const email = (u?.email ?? '').trim();
      if (!email) {
        return false;
      }
      this.form.patchValue({
        nom: (u.nom ?? '').trim(),
        prenom: (u.prenom ?? '').trim(),
        email
      });
      return true;
    } catch {
      return false;
    }
  }

  private patchFromServer(u: UtilisateurMe): void {
    this.form.patchValue({
      nom: u.nom ?? '',
      prenom: u.prenom ?? '',
      email: u.email ?? '',
      telephone: u.telephone ?? '',
      adresse: u.adresse ?? '',
      ville: u.ville ?? '',
      gouvernorat: u.gouvernorat ?? '',
      codePostal: u.codePostal ?? '',
      motDePasse: ''
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting = true;
    const v = this.form.getRawValue();
    const body = {
      nom: String(v.nom).trim(),
      prenom: String(v.prenom).trim(),
      email: String(v.email).trim().toLowerCase(),
      telephone: String(v.telephone ?? '').trim() || null,
      adresse: String(v.adresse ?? '').trim() || null,
      ville: String(v.ville ?? '').trim() || null,
      gouvernorat: String(v.gouvernorat ?? '').trim() || null,
      codePostal: String(v.codePostal ?? '').trim() || null,
      motDePasse: String(v.motDePasse ?? '').trim() || null
    };
    this.api.updateMe(body).subscribe({
      next: (u) => {
        this.submitting = false;
        this.toast.show('Profil enregistré.', 'success');
        this.form.patchValue({ motDePasse: '' });
        this.mergeStoredUser(u);
        this.userSession.emitProfileUpdated();
      },
      error: (err) => {
        this.submitting = false;
        const msg =
          typeof err?.error?.message === 'string' ? err.error.message : 'Enregistrement impossible.';
        this.toast.show(msg, 'error');
      }
    });
  }

  private mergeStoredUser(u: UtilisateurMe): void {
    const raw = localStorage.getItem('user');
    if (!raw) {
      return;
    }
    try {
      const cur = JSON.parse(raw) as Record<string, unknown>;
      cur['email'] = u.email;
      cur['nom'] = u.nom;
      cur['prenom'] = u.prenom;
      cur['id'] = u.id;
      localStorage.setItem('user', JSON.stringify(cur));
    } catch {
      /* ignore */
    }
  }
}
