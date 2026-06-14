import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';

// ── Request types ──────────────────────────────────────────

export interface AnnulationRequest {
  jourSemaine: number;
  mois: number;
  heureDebutH: number;
  age: number;
  nbRdvTotal: number;
  nbAnnulationsPassees: number;
  tauxAnnulationHistorique: number;
  sexe: string;
  gouvernorat: string;
  methodeContactPreferee: string;
  specialiteNom: string;
  experienceAnnees: number;
  prixVsMoyenne: number;
  tauxAnnulationMotif: number;
}

export interface UrgenceRequest {
  symptomes: string;
}

export interface AnomalieRequest {
  nbMedicaments: number;
  nbMedicamentsUniques: number;
  dureeMaxJours: number;
  posologieCode: number;
  experienceAnnees: number;
  medecinJunior: number;
  aDoublons: number;
  nbOrdMedecinTotal: number;
  amoxicilline1g: number;
  cetirizine10mg: number;
  doliprane: number;
  ibuprofene400mg: number;
  omeprazole20mg: number;
  paracetamol500mg: number;
  spasfon: number;
  vitamineD: number;
}

export interface RecommandationRequest {
  patientId: number;
  specialite: string;
  topN: number;
}

export interface SegmentationRequest {
  age: number;
  sexeEnc: number;
  situationMatrimonialeEnc: number;
  methodeContactPrefereeEnc: number;
  nbRdvTotal: number;
  tauxAnnulation: number;
  tauxCompletion: number;
  nbConsultations: number;
  nbOrdonnances: number;
  nbSpecialitesDistinctes: number;
  prixMoyConsultation: number;
}

// ── Response types ─────────────────────────────────────────

export interface AnnulationResponse {
  probabiliteAnnulation: number;
  niveauRisque: string;
  couleur: string;
  recommandation: string;
  creneauDetecte?: string;
  estWeekend?: boolean;
}

export interface UrgenceResponse {
  niveau: string;
  couleur: string;
  probabilites: Record<string, number>;
  message: string;
}

export interface AnomalieResponse {
  scoreRisque: number;
  niveau: string;
  couleur: string;
  estAnomalie: boolean;
  message: string;
}

export interface MedecinRecommande {
  medecinId: number;
  nom: string;
  prenom: string;
  specialite: string;
  scoreCompatibilite: number;
  experienceAnnees: number;
  noteMoyenne: number;
  prixConsultation: number;
}

export interface RecommandationResponse {
  recommandations: MedecinRecommande[];
  mode: string;
  nbResultats: number;
}

export interface JourPrevision {
  date: string;
  jour: string;
  nbRdvPrevu: number;
  estWeekend: boolean;
}

export interface PrevisionResponse {
  previsions: JourPrevision[];
  total30j: number;
  moyenneParJourOuvrable: number;
  periode: string;
}

export interface SegmentationResponse {
  cluster: number;
  emoji: string;
  nomCluster: string;
  couleur: string;
  description: string;
  tailleGroupe: number;
}

// ── Service ────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class MlPredictionService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/api/ml`;

  predictAnnulation(req: AnnulationRequest): Observable<AnnulationResponse> {
    return this.http.post<AnnulationResponse>(`${this.base}/annulation`, req);
  }

  predictUrgence(req: UrgenceRequest): Observable<UrgenceResponse> {
    return this.http.post<UrgenceResponse>(`${this.base}/urgence`, req);
  }

  predictAnomalie(req: AnomalieRequest): Observable<AnomalieResponse> {
    return this.http.post<AnomalieResponse>(`${this.base}/anomalie`, req);
  }

  predictRecommandation(req: RecommandationRequest): Observable<RecommandationResponse> {
    return this.http.post<RecommandationResponse>(`${this.base}/recommandation`, req);
  }

  previsionCharge(dateDebut: string, nbJours: number): Observable<PrevisionResponse> {
    return this.http.get<PrevisionResponse>(`${this.base}/prevision-charge`, {
      params: { dateDebut, nbJours: nbJours.toString() }
    });
  }

  predictSegmentation(req: SegmentationRequest): Observable<SegmentationResponse> {
    return this.http.post<SegmentationResponse>(`${this.base}/segmentation`, req);
  }
}
