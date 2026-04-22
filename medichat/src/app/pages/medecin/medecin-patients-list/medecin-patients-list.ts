import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/toast.service';
import { Patient, PatientService } from '../../../services/patient.service';

@Component({
  selector: 'app-medecin-patients-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './medecin-patients-list.html',
  styleUrls: ['./medecin-patients-list.css', '../medecin-pro.css']
})
export class MedecinPatientsList implements OnInit {
  private readonly patients = inject(PatientService);
  private readonly toast = inject(ToastService);

  readonly rows = signal<Patient[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.patients.getAllPatients().subscribe({
      next: (list) => {
        this.rows.set(list ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.show('Impossible de charger les patients.', 'error');
      }
    });
  }
}
