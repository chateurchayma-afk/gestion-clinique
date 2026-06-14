import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/toast.service';
import {
  MlPredictionService,
  AnnulationResponse,
  UrgenceResponse,
  AnomalieResponse
} from '../../../services/ml-prediction.service';

type Tab = 'annulation' | 'urgence' | 'anomalie';

@Component({
  selector: 'app-medecin-predictions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './medecin-predictions.html',
  styleUrls: ['./medecin-predictions.css', '../medecin-pro.css']
})
export class MedecinPredictions implements OnInit {
  private readonly ml = inject(MlPredictionService);
  private readonly toast = inject(ToastService);

  readonly activeTab = signal<Tab>('annulation');

  // ── ML-01 Annulation — champs visibles ───────────────────
  annulLoading = signal(false);
  annulResult = signal<AnnulationResponse | null>(null);

  // Champs saisis par le médecin
  annul = {
    sexe: 'FEMME',
    age: 35,
    gouvernorat: 'Tunis',
    methodeContact: 'SMS',
    nbRdvTotal: 5,
    nbAnnulationsPassees: 1,
    // Date & heure du RDV
    dateRdv: this.todayIso(),
    heureRdv: 9,
    // Médecin
    specialite: 'Médecine générale',
    experienceAnnees: 10,
    // Champs simplifiés → convertis en valeurs numériques
    prixPositionnement: 'moyenne',   // 'moins_cher' | 'moyenne' | 'plus_cher'
    motifFrequence: 'occasionnel'    // 'courant' | 'occasionnel' | 'rare'
  };

  readonly GOUVERNORATS = [
    'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa',
    'Jendouba', 'Kairouan', 'Kasserine', 'Kébili', 'Le Kef', 'Mahdia',
    'La Manouba', 'Médenine', 'Monastir', 'Nabeul', 'Sfax', 'Sidi Bouzid',
    'Siliana', 'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan'
  ];

  readonly HEURES = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

  readonly PRIX_OPTIONS = [
    { value: 'moins_cher', label: 'Moins cher que la moyenne',   num: 0.8 },
    { value: 'moyenne',    label: 'Dans la moyenne',             num: 1.0 },
    { value: 'plus_cher',  label: 'Plus cher que la moyenne',    num: 1.2 }
  ];

  readonly MOTIF_OPTIONS = [
    { value: 'courant',     label: 'Motif très courant (grippe, contrôle…)', num: 0.25 },
    { value: 'occasionnel', label: 'Motif occasionnel (suivi, bilan…)',      num: 0.12 },
    { value: 'rare',        label: 'Motif rare (spécialiste, urgence…)',     num: 0.05 }
  ];

  get tauxAnnulationHistorique(): number {
    const total = Math.max(this.annul.nbRdvTotal, 1);
    return Math.min(this.annul.nbAnnulationsPassees / total, 1);
  }

  get prixVsMoyenne(): number {
    return this.PRIX_OPTIONS.find(o => o.value === this.annul.prixPositionnement)?.num ?? 1.0;
  }

  get tauxAnnulationMotif(): number {
    return this.MOTIF_OPTIONS.find(o => o.value === this.annul.motifFrequence)?.num ?? 0.12;
  }

  get jourSemaine(): number {
    if (!this.annul.dateRdv) return 1;
    const d = new Date(this.annul.dateRdv);
    return (d.getDay() + 6) % 7; // lundi=0 … dimanche=6
  }

  get moisRdv(): number {
    if (!this.annul.dateRdv) return new Date().getMonth() + 1;
    return new Date(this.annul.dateRdv).getMonth() + 1;
  }

  get jourLabel(): string {
    const labels = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    return labels[this.jourSemaine] ?? '—';
  }

  predictAnnulation(): void {
    this.annulLoading.set(true);
    this.annulResult.set(null);
    this.ml.predictAnnulation({
      jourSemaine: this.jourSemaine,
      mois: this.moisRdv,
      heureDebutH: this.annul.heureRdv,
      age: this.annul.age,
      nbRdvTotal: this.annul.nbRdvTotal,
      nbAnnulationsPassees: this.annul.nbAnnulationsPassees,
      tauxAnnulationHistorique: this.tauxAnnulationHistorique,
      sexe: this.annul.sexe,
      gouvernorat: this.annul.gouvernorat,
      methodeContactPreferee: this.annul.methodeContact,
      specialiteNom: this.annul.specialite,
      experienceAnnees: this.annul.experienceAnnees,
      prixVsMoyenne: this.prixVsMoyenne,
      tauxAnnulationMotif: this.tauxAnnulationMotif
    }).subscribe({
      next: (res) => { this.annulResult.set(res); this.annulLoading.set(false); },
      error: () => {
        this.toast.show('Erreur lors de la prédiction.', 'error');
        this.annulLoading.set(false);
      }
    });
  }

  // ── ML-03 Urgence ─────────────────────────────────────────
  urgenceLoading = signal(false);
  urgenceResult = signal<UrgenceResponse | null>(null);
  symptomes = '';

  predictUrgence(): void {
    if (!this.symptomes.trim()) {
      this.toast.show('Veuillez saisir les symptômes.', 'error');
      return;
    }
    this.urgenceLoading.set(true);
    this.urgenceResult.set(null);
    this.ml.predictUrgence({ symptomes: this.symptomes }).subscribe({
      next: (res) => { this.urgenceResult.set(res); this.urgenceLoading.set(false); },
      error: () => {
        this.toast.show('Erreur lors de l\'analyse d\'urgence.', 'error');
        this.urgenceLoading.set(false);
      }
    });
  }

  probabilitesEntries(prob: Record<string, number>): { key: string; value: number }[] {
    return Object.entries(prob)
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value);
  }

  // ── ML-05 Anomalie ordonnance ─────────────────────────────
  anomalieLoading = signal(false);
  anomalieResult = signal<AnomalieResponse | null>(null);

  anomalieForm = {
    nbMedicaments: 3,
    nbMedicamentsUniques: 3,
    dureeMaxJours: 7,
    posologieCode: 1,
    experienceAnnees: 10,
    aDoublons: false,
    nbOrdMedecinTotal: 50,
    amoxicilline1g: false,
    cetirizine10mg: false,
    doliprane: false,
    ibuprofene400mg: false,
    omeprazole20mg: false,
    paracetamol500mg: false,
    spasfon: false,
    vitamineD: false
  };

  predictAnomalie(): void {
    this.anomalieLoading.set(true);
    this.anomalieResult.set(null);
    const f = this.anomalieForm;
    this.ml.predictAnomalie({
      nbMedicaments: f.nbMedicaments,
      nbMedicamentsUniques: f.nbMedicamentsUniques,
      dureeMaxJours: f.dureeMaxJours,
      posologieCode: f.posologieCode,
      experienceAnnees: f.experienceAnnees,
      medecinJunior: f.experienceAnnees < 3 ? 1 : 0,
      aDoublons: f.aDoublons ? 1 : 0,
      nbOrdMedecinTotal: f.nbOrdMedecinTotal,
      amoxicilline1g: f.amoxicilline1g ? 1 : 0,
      cetirizine10mg: f.cetirizine10mg ? 1 : 0,
      doliprane: f.doliprane ? 1 : 0,
      ibuprofene400mg: f.ibuprofene400mg ? 1 : 0,
      omeprazole20mg: f.omeprazole20mg ? 1 : 0,
      paracetamol500mg: f.paracetamol500mg ? 1 : 0,
      spasfon: f.spasfon ? 1 : 0,
      vitamineD: f.vitamineD ? 1 : 0
    }).subscribe({
      next: (res) => { this.anomalieResult.set(res); this.anomalieLoading.set(false); },
      error: () => {
        this.toast.show('Erreur lors de l\'analyse d\'ordonnance.', 'error');
        this.anomalieLoading.set(false);
      }
    });
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
  }

  private todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  ngOnInit(): void {}
}
