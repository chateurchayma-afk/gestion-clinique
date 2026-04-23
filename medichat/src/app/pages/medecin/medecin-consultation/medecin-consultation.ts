import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastService } from '../../../core/toast.service';
import { MedecinPortalService } from '../../../services/medecin-portal.service';
import { Patient } from '../../../services/patient.service';
import {
  formatLignesPourOrdonnance,
  LS_CONSULTATION_BROUILLON,
  LS_ORDONNANCE_META,
  LS_ORDONNANCE_TEXTE
} from '../medecin-ordonnance-sync';

export interface LigneOrdonnance {
  medicament: string;
  posologie: string;
  dureeJours: string;
}

@Component({
  selector: 'app-medecin-consultation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './medecin-consultation.html',
  styleUrls: ['./medecin-consultation.css', '../medecin-pro.css']
})
export class MedecinConsultation implements OnInit {
  private readonly medecinPortal = inject(MedecinPortalService);
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
    this.medecinPortal.getMesPatients().subscribe({
      next: (list) => {
        const L = list ?? [];
        this.patients.set(L);
        const raw = localStorage.getItem(LS_CONSULTATION_BROUILLON);
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
            this.patientId = o.patientId ?? L[0]?.id ?? null;
            this.antecedents = o.antecedents ?? '';
            this.symptomes = o.symptomes ?? '';
            this.diagnostic = o.diagnostic ?? '';
            this.notes = o.notes ?? '';
            if (o.lignes?.length) {
              this.lignes = o.lignes;
            }
          } catch {
            this.patientId = L[0]?.id ?? null;
          }
        } else {
          this.patientId = L[0]?.id ?? null;
        }
        if (this.patientId != null && !L.some((p) => p.id === this.patientId)) {
          this.patientId = L[0]?.id ?? null;
        }
      },
      error: () => this.toast.show('Chargement patients impossible.', 'error')
    });
  }

  addLigne(): void {
    this.lignes = [...this.lignes, { medicament: '', posologie: '', dureeJours: '' }];
    this.persist();
  }

  removeLigne(i: number): void {
    if (this.lignes.length <= 1) {
      this.lignes[0] = { medicament: '', posologie: '', dureeJours: '' };
      this.persist();
      return;
    }
    this.lignes = this.lignes.filter((_, j) => j !== i);
    this.persist();
  }

  persist(): void {
    try {
      localStorage.setItem(
        LS_CONSULTATION_BROUILLON,
        JSON.stringify({
          patientId: this.patientId,
          antecedents: this.antecedents,
          symptomes: this.symptomes,
          diagnostic: this.diagnostic,
          notes: this.notes,
          lignes: this.lignes
        })
      );
      const ordText = formatLignesPourOrdonnance(this.lignes, this.notes);
      localStorage.setItem(LS_ORDONNANCE_TEXTE, ordText);
      let dateOrdonnance: string | undefined;
      try {
        const metaRaw = localStorage.getItem(LS_ORDONNANCE_META);
        if (metaRaw) {
          const o = JSON.parse(metaRaw) as { dateOrdonnance?: string };
          dateOrdonnance = o.dateOrdonnance;
        }
      } catch {
        /* */
      }
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem(
        LS_ORDONNANCE_META,
        JSON.stringify({ dateOrdonnance: dateOrdonnance ?? today, patientId: this.patientId })
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
