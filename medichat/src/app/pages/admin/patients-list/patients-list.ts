import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PatientService, Patient } from '../../../services/patient.service';
import { ToastService } from '../../../core/toast.service';

@Component({
  selector: 'app-patients-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './patients-list.html',
  styleUrl: './patients-list.css'
})
export class PatientsList implements OnInit {
  private readonly toast = inject(ToastService);

  patients = signal<Patient[]>([]);
  loading = signal(true);
  searchTerm = signal('');

  constructor(private patientService: PatientService) {}

  ngOnInit(): void {
    this.patientService.getAllPatients().subscribe({
      next: (data) => {
        this.patients.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erreur API patients :', err);
        this.loading.set(false);
        this.toast.show('Impossible de charger la liste des patients.', 'error');
      }
    });
  }

  onSearch(value: string): void {
    this.searchTerm.set(value.toLowerCase().trim());
  }

  filteredPatients = computed(() => {
    const term = this.searchTerm();

    if (!term) {
      return this.patients();
    }

    return this.patients().filter((p) => {
      const fullName =
        `${p.utilisateur?.prenom ?? ''} ${p.utilisateur?.nom ?? ''}`.toLowerCase();

      const email = (p.utilisateur?.email ?? '').toLowerCase();
      const situation = (p.situationMatrimoniale ?? '').toLowerCase();
      const dossier = (p.numeroDossier ?? '').toLowerCase();

      return (
        fullName.includes(term) ||
        email.includes(term) ||
        situation.includes(term) ||
        dossier.includes(term)
      );
    });
  });

  deletePatient(p: Patient, event: Event): void {
    event.stopPropagation();
    const name = `${p.utilisateur?.prenom ?? ''} ${p.utilisateur?.nom ?? ''}`.trim();
    if (!confirm(`Supprimer le patient ${name || '(sans nom)'} ?`)) {
      return;
    }
    this.patientService.deletePatient(p.id).subscribe({
      next: () => {
        this.toast.show('Patient supprimé.', 'success');
        this.patients.set(this.patients().filter((x) => x.id !== p.id));
      },
      error: (err) => {
        console.error(err);
        this.toast.show('Suppression impossible.', 'error');
      }
    });
  }
}