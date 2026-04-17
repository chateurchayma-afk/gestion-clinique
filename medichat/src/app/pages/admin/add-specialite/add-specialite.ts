import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SpecialiteService } from '../../../services/specialite.service';
import { ToastService } from '../../../core/toast.service';

@Component({
  selector: 'app-add-specialite',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-specialite.html',
  styleUrl: './add-specialite.css'
})
export class AddSpecialite {
  private readonly router = inject(Router);
  private readonly specialiteService = inject(SpecialiteService);
  private readonly toast = inject(ToastService);

  form = {
    nom: '',
    description: ''
  };

  errorMessage = '';
  isSubmitting = false;

  onSubmit(): void {
    this.errorMessage = '';
    const nom = this.form.nom.trim();
    if (!nom) {
      this.errorMessage = 'Le nom de la spécialité est obligatoire.';
      return;
    }

    this.isSubmitting = true;
    this.specialiteService
      .create({
        nom,
        description: this.form.description.trim() || null
      })
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.toast.show('Spécialité ajoutée avec succès.', 'success');
          void this.router.navigate(['/admin/specialites']);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error(err);
          const body = err?.error;
          if (typeof body === 'string' && body.trim()) {
            this.errorMessage = body;
          } else {
            this.errorMessage = 'Impossible d’enregistrer (nom peut-être déjà utilisé).';
          }
          this.toast.show(this.errorMessage, 'error', 5500);
        }
      });
  }

  goBack(): void {
    void this.router.navigate(['/admin/specialites']);
  }
}
