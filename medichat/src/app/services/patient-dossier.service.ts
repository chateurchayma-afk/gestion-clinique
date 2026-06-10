import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';

export interface RendezVousHistoriqueItem {
  id: number;
  dateRendezVous: string;
  heureDebut: string | null;
  medecinNom: string;
  medecinPrenom: string;
  medecinSpecialite: string | null;
  motif: string | null;
  statut: string;
  modeConsultation: string | null;
  prixConsultation: number | null;
}

export interface PatientDossierResponse {
  nom: string;
  prenom: string;
  dateNaissance: string | null;
  sexe: string | null;
  numeroDossier: string | null;
  dossierId: number | null;
  groupeSanguin: string | null;
  tailleCm: string | null;
  poidsKg: string | null;
  allergies: string | null;
  medicaments: string | null;
  maladiesChroniques: string | null;
  interventions: string | null;
  hospitalisations: string | null;
  famDiabete: boolean;
  famHypertension: boolean;
  famAsthme: boolean;
  famCardiaque: boolean;
  famMentaux: boolean;
  famCancer: boolean;
  tabac: string | null;
  alcool: string | null;
  activite: string | null;
  alimentation: string | null;
  rappelTraitementNom: string | null;
  rappelTraitementFrequence: string | null;
  updatedAt: string | null;
  updatedByMedecinNom: string | null;
  updatedByMedecinPrenom: string | null;
  historique: RendezVousHistoriqueItem[];
}

@Injectable({ providedIn: 'root' })
export class PatientDossierService {
  private readonly http = inject(HttpClient);

  getMonDossier(): Observable<PatientDossierResponse> {
    return this.http.get<PatientDossierResponse>(`${API_BASE_URL}/api/patient/dossier-medical`);
  }
}
