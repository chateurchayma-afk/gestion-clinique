import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/toast.service';
import {
  MlPredictionService,
  PrevisionResponse,
  SegmentationResponse,
} from '../../../services/ml-prediction.service';

type Tab = 'prevision' | 'segmentation';

@Component({
  selector: 'app-admin-predictions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-predictions.html',
  styleUrls: ['./admin-predictions.css']
})
export class AdminPredictions implements OnInit {
  private readonly ml = inject(MlPredictionService);
  private readonly toast = inject(ToastService);

  readonly activeTab = signal<Tab>('prevision');

  // ── ML-04 Prévision de charge ─────────────────────────────
  prevLoading = signal(false);
  prevResult = signal<PrevisionResponse | null>(null);

  prevForm = {
    dateDebut: new Date().toISOString().split('T')[0],
    nbJours: 30
  };

  readonly NB_JOURS_OPTIONS = [
    { label: '7 jours',   value: 7  },
    { label: '14 jours',  value: 14 },
    { label: '30 jours',  value: 30 },
    { label: '60 jours',  value: 60 },
    { label: '90 jours',  value: 90 },
  ];

  get dateFinEstimee(): string {
    if (!this.prevForm.dateDebut) return '';
    const d = new Date(this.prevForm.dateDebut + 'T12:00:00');
    d.setDate(d.getDate() + Number(this.prevForm.nbJours) - 1);
    return d.toISOString().split('T')[0];
  }

  loadPrevision(): void {
    this.prevLoading.set(true);
    this.prevResult.set(null);
    this.ml.previsionCharge(this.prevForm.dateDebut, Number(this.prevForm.nbJours)).subscribe({
      next: (res) => { this.prevResult.set(res); this.prevLoading.set(false); },
      error: () => {
        this.toast.show('Erreur lors de la prévision de charge.', 'error');
        this.prevLoading.set(false);
      }
    });
  }

  maxNbRdv(res: PrevisionResponse): number {
    const vals = res.previsions.map((j) => j.nbRdvPrevu);
    return Math.max(...vals, 1);
  }

  barHeight(nbRdv: number, max: number): number {
    return Math.round((nbRdv / max) * 100);
  }

  // ── ML-06 Segmentation — champs UI ───────────────────────
  segLoading = signal(false);
  segResult = signal<SegmentationResponse | null>(null);

  seg = {
    age: 35,
    sexe: 0,               // 0=Femme 1=Homme
    situationMat: 0,       // 0=Célibataire 1=Marié 2=Divorcé 3=Veuf
    methodeContact: 1,     // 0=Email 1=SMS 2=Téléphone
    nbRdvTotal: 10,
    nbAnnulations: 2,      // → tauxAnnulation = 20%
    nbConsultations: 7,    // → tauxCompletion = 70%
    nbOrdonnances: 4,
    nbSpecialites: 2,
    prixMoyen: 45.0
  };

  get tauxAnnulation(): number {
    return Math.min(this.seg.nbAnnulations / Math.max(this.seg.nbRdvTotal, 1), 1);
  }

  get tauxCompletion(): number {
    return Math.min(this.seg.nbConsultations / Math.max(this.seg.nbRdvTotal, 1), 1);
  }

  get segDataError(): string {
    if (this.seg.nbRdvTotal <= 0) {
      return 'Le nombre total de RDV doit être supérieur à 0 pour classifier un patient.';
    }
    if ((this.seg.nbAnnulations + this.seg.nbConsultations) > this.seg.nbRdvTotal) {
      const surplus = (this.seg.nbAnnulations + this.seg.nbConsultations) - this.seg.nbRdvTotal;
      return `Incohérence : annulations (${this.seg.nbAnnulations}) + consultations (${this.seg.nbConsultations}) dépassent le total RDV (${this.seg.nbRdvTotal}) de ${surplus}.`;
    }
    return '';
  }

  get segDataValid(): boolean {
    return this.segDataError === '';
  }

  predictSegmentation(): void {
    if (!this.segDataValid) {
      this.toast.show(this.segDataError, 'error');
      return;
    }
    this.segLoading.set(true);
    this.segResult.set(null);
    this.ml.predictSegmentation({
      age: this.seg.age,
      sexeEnc: this.seg.sexe,
      situationMatrimonialeEnc: this.seg.situationMat,
      methodeContactPrefereeEnc: this.seg.methodeContact,
      nbRdvTotal: this.seg.nbRdvTotal,
      tauxAnnulation: this.tauxAnnulation,
      tauxCompletion: this.tauxCompletion,
      nbConsultations: this.seg.nbConsultations,
      nbOrdonnances: this.seg.nbOrdonnances,
      nbSpecialitesDistinctes: this.seg.nbSpecialites,
      prixMoyConsultation: this.seg.prixMoyen
    }).subscribe({
      next: (res) => { this.segResult.set(res); this.segLoading.set(false); },
      error: () => {
        this.toast.show('Erreur lors de la segmentation.', 'error');
        this.segLoading.set(false);
      }
    });
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
  }

  ngOnInit(): void {}
}
