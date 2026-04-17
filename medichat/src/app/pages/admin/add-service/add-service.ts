import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ServiceMedicalService } from '../../../services/service-medical.service';
import { ToastService } from '../../../core/toast.service';

@Component({
  selector: 'app-add-service',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-service.html',
  styleUrl: './add-service.css'
})
export class AddService {
  private readonly router = inject(Router);
  private readonly serviceMedicalService = inject(ServiceMedicalService);
  private readonly toast = inject(ToastService);

  form = {
    nom: '',
    departement: '',
    prix: '',
    description: ''
  };

  errorMessage = '';
  isSubmitting = false;

  onSubmit(): void {
    this.errorMessage = '';
    const nom = this.form.nom.trim();
    if (!nom) {
      this.errorMessage = 'Le nom du service est obligatoire.';
      return;
    }

    this.isSubmitting = true;
    this.serviceMedicalService
      .create({
        nom,
        departement: this.form.departement.trim() || null,
        prix: this.form.prix.trim() || null,
        description: this.form.description.trim() || null
      })
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.toast.show('Service enregistré avec succès.', 'success');
          void this.router.navigate(['/admin/services']);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error(err);
          const body = err?.error;
          if (typeof body === 'string' && body.trim()) {
            this.errorMessage = body;
          } else {
            this.errorMessage = 'Impossible d’enregistrer le service.';
          }
          this.toast.show(this.errorMessage, 'error', 5500);
        }
      });
  }

  goBack(): void {
    void this.router.navigate(['/admin/services']);
  }
}
