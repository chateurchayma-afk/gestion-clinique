import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';

export interface DossierMedicalPayload {
  groupeSanguin: string;
  tailleCm: string;
  poidsKg: string;
  allergies: string;
  medicaments: string;
  maladiesChroniques: string;
  interventions: string;
  hospitalisations: string;
  famDiabete: boolean;
  famHypertension: boolean;
  famAsthme: boolean;
  famCardiaque: boolean;
  famMentaux: boolean;
  famCancer: boolean;
  tabac: string;
  alcool: string;
  activite: string;
  alimentation: string;
  rappelTraitementNom: string;
  rappelTraitementFrequence: string;
}

export interface DossierMedicalResponse extends DossierMedicalPayload {
  id: number;
  patientId: number;
}

export interface DossierMedicalVersionResponse extends DossierMedicalPayload {
  id: number;
  versionNumero: number;
  modifieLe: string;
  modifieParNom: string | null;
  modifieParPrenom: string | null;
}

@Injectable({ providedIn: 'root' })
export class DossierMedicalService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/api/medecin/dossier-medical`;

  getByPatientId(patientId: number): Observable<DossierMedicalResponse> {
    return this.http.get<DossierMedicalResponse>(`${this.base}/${patientId}`);
  }

  saveForPatient(patientId: number, payload: DossierMedicalPayload): Observable<DossierMedicalResponse> {
    return this.http.put<DossierMedicalResponse>(`${this.base}/${patientId}`, payload);
  }

  getHistorique(patientId: number): Observable<DossierMedicalVersionResponse[]> {
    return this.http.get<DossierMedicalVersionResponse[]>(`${this.base}/${patientId}/historique`);
  }
}
