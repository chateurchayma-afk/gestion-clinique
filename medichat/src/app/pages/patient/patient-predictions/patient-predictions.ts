import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/toast.service';
import {
  MlPredictionService,
  RecommandationResponse
} from '../../../services/ml-prediction.service';

@Component({
  selector: 'app-patient-predictions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-predictions.html',
  styleUrls: ['./patient-predictions.css']
})
export class PatientPredictions implements OnInit {
  private readonly ml = inject(MlPredictionService);
  private readonly toast = inject(ToastService);

  loading = signal(false);
  result = signal<RecommandationResponse | null>(null);

  specialite = '';
  topN = 5;

  readonly SPECIALITES = [
    'Médecine générale', 'Cardiologie', 'Dermatologie', 'Gynécologie',
    'Neurologie', 'Ophtalmologie', 'ORL', 'Orthopédie', 'Pédiatrie',
    'Psychiatrie', 'Rhumatologie', 'Stomatologie', 'Urologie'
  ];

  predict(): void {
    this.loading.set(true);
    this.result.set(null);
    this.ml.predictRecommandation({
      patientId: 0,
      specialite: this.specialite,
      topN: this.topN
    }).subscribe({
      next: (res) => { this.result.set(res); this.loading.set(false); },
      error: () => {
        this.toast.show('Erreur lors de la recommandation.', 'error');
        this.loading.set(false);
      }
    });
  }

  readonly starsArray = [1, 2, 3, 4, 5];

  isStarFilled(i: number, note: number): boolean {
    return i <= Math.round(note);
  }

  // scoreCompatibilite est déjà en 0–100 (Python multiplie par 100)
  scorePct(score: number): string {
    return Math.min(score, 100).toFixed(0);
  }

  scoreRingFill(score: number): number {
    return Math.min(score, 100) / 100 * 94.2;
  }

  ngOnInit(): void {}
}
