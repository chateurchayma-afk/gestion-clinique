import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastService } from '../../../core/toast.service';
import { Patient, PatientService } from '../../../services/patient.service';

export interface LigneOrdonnance {
  medicament: string;
  posologie: string;
  dureeJours: string;
}

const LS_KEY = 'medichat_consultation_brouillon';

@Component({
  selector: 'app-medecin-consultation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './medecin-consultation.html',
  styleUrls: ['./medecin-consultation.css', '../medecin-pro.css']
})
export class MedecinConsultation implements OnInit {
  private readonly patientsApi = inject(PatientService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly patients = signal<Patient[]>([]);
  patientId: number | null = null;
  antecedents = '';
  symptomes = '';
  diagnostic = '';
  notes = '';
  lignes: LigneOrdonnance[] = [
    { medicament: '', posologie: '', dureeJours: '' },
    { medicament: '', posologie: '', dureeJours: '' }
  ];

  ngOnInit(): void {
    this.patientsApi.getAllPatients().subscribe({
      next: (list) => {
        this.patients.set(list ?? []);
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
          try {
            const o = JSON.parse(raw) as {
              patientId?: number;
              antecedents?: string;
              symptomes?: string;
              diagnostic?: string;
              notes?: string;
              lignes?: LigneOrdonnance[];
            };
            this.patientId = o.patientId ?? list[0]?.id ?? null;
            this.antecedents = o.antecedents ?? '';
            this.symptomes = o.symptomes ?? '';
            this.diagnostic = o.diagnostic ?? '';
            this.notes = o.notes ?? '';
            if (o.lignes?.length) {
              this.lignes = o.lignes;
            }
            return;
          } catch {
            /* ignore */
          }
        }
        this.patientId = list[0]?.id ?? null;
      },
      error: () => this.toast.show('Chargement patients impossible.', 'error')
    });
  }

  addLigne(): void {
    this.lignes = [...this.lignes, { medicament: '', posologie: '', dureeJours: '' }];
  }

  removeLigne(i: number): void {
    if (this.lignes.length <= 1) {
      this.lignes[0] = { medicament: '', posologie: '', dureeJours: '' };
      return;
    }
    this.lignes = this.lignes.filter((_, j) => j !== i);
  }

  persist(): void {
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({
          patientId: this.patientId,
          antecedents: this.antecedents,
          symptomes: this.symptomes,
          diagnostic: this.diagnostic,
          notes: this.notes,
          lignes: this.lignes
        })
      );
    } catch {
      /* */
    }
  }

  save(): void {
    this.persist();
    this.toast.show('Consultation enregistrée (brouillon sur cet appareil).', 'success');
  }

  genererOrdonnance(): void {
    this.persist();
    void this.router.navigate(['/medecin-dashboard/ordonnance-pdf']);
  }
}
