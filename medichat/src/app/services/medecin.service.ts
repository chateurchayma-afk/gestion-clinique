import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';

export interface UtilisateurMedecin {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  dateNaissance?: string | null;
  sexe?: string | null;
  adresse?: string | null;
  ville?: string | null;
  gouvernorat?: string | null;
  codePostal?: string | null;
  photo?: string | null;
}

export interface Specialite {
  id: number;
  nom: string;
  description?: string | null;
}

export interface ServiceMedical {
  id: number;
  nom: string;
  description?: string | null;
}

export interface Medecin {
  id: number;
  utilisateur: UtilisateurMedecin;
  experienceAnnees: number | null;
  matricule: string | null;
  biographie: string | null;
  statutValidation: string | null;
  disponible: boolean | null;
  specialite: Specialite | null;
  serviceMedical: ServiceMedical | null;
}

/** Corps pour PUT /api/medecins/{id} (aligné sur MedecinFullUpdateRequest côté Java). */
export interface MedecinFullUpdatePayload {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  motDePasse?: string | null;
  adresse?: string | null;
  ville?: string | null;
  gouvernorat?: string | null;
  codePostal?: string | null;
  dateNaissance?: string | null;
  sexe?: string | null;
  photo?: string | null;
  experienceAnnees?: number | null;
  matricule?: string | null;
  biographie?: string | null;
  specialiteId?: number | null;
  serviceMedicalId?: number | null;
  disponible?: boolean | null;
  qualifications?: string | null;
  formation?: string | null;
  certifications?: string | null;
  departement?: string | null;
  position?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class MedecinService {
  private http = inject(HttpClient);
  private apiUrl = `${API_BASE_URL}/api/medecins`;

  getAllMedecins(): Observable<Medecin[]> {
    return this.http.get<Medecin[]>(this.apiUrl);
  }

  getMedecinById(id: number): Observable<Medecin> {
    return this.http.get<Medecin>(`${this.apiUrl}/${id}`);
  }

  updateMedecin(id: number, body: MedecinFullUpdatePayload): Observable<Medecin> {
    return this.http.put<Medecin>(`${this.apiUrl}/${id}`, body);
  }

  getMedecinsEnAttente(): Observable<Medecin[]> {
    return this.http.get<Medecin[]>(`${this.apiUrl}/en-attente`);
  }

  setValidationStatut(id: number, statut: 'VALIDE' | 'REFUSE'): Observable<Medecin> {
    return this.http.patch<Medecin>(`${this.apiUrl}/${id}/validation`, { statut });
  }

  deleteMedecin(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
