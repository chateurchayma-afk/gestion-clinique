import { HttpClient, HttpParams } from '@angular/common/http';
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


export interface Medecin {
  id: number;
  utilisateur: UtilisateurMedecin;
  experienceAnnees: number | null;
  matricule: string | null;
  biographie: string | null;
  statutValidation: string | null;
  disponible: boolean | null;
  /** Note 0–5 (optionnelle, côté admin / base). */
  noteMoyenne?: number | null;
  specialite: Specialite | null;
  /** Prix de consultation du médecin */
  prixConsultation?: number | null;
}

export interface CatalogueMedecinsQuery {
  specialiteId?: number | null;
  q?: string | null;
  disponible?: boolean | null;
  sort?: string | null;
}

export interface CatalogueHighlights {
  medecinsPopulairesIds: number[];
  medecinsDisponiblesAujourdhuiIds: number[];
}

export interface CreneauJour {
  date: string;
  /** Heure ISO (`"09:30:00"`) ou parfois tableau `[h, m, s]` selon la config Jackson. */
  heuresDebut: (string | number[])[];
}

export interface ProchainCreneau {
  date: string;
  heureDebut: string | number[];
  heureFin: string | number[];
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
  
  disponible?: boolean | null;
  qualifications?: string | null;
  formation?: string | null;
  certifications?: string | null;
  departement?: string | null;
  position?: string | null;
  prixConsultation?: number | null;
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

  /** Catalogue patient (filtres / tri côté API). */
  getCatalogue(query?: CatalogueMedecinsQuery): Observable<Medecin[]> {
    let params = new HttpParams();
    const q = query ?? {};
    if (q.specialiteId != null && q.specialiteId > 0) {
      params = params.set('specialiteId', String(q.specialiteId));
    }
    
    if (q.q != null && q.q.trim()) {
      params = params.set('q', q.q.trim());
    }
    if (q.disponible === true || q.disponible === false) {
      params = params.set('disponible', String(q.disponible));
    }
    if (q.sort != null && q.sort.trim()) {
      params = params.set('sort', q.sort.trim());
    }
    return this.http.get<Medecin[]>(`${this.apiUrl}/catalogue`, { params });
  }

  getCatalogueHighlights(): Observable<CatalogueHighlights> {
    return this.http.get<CatalogueHighlights>(`${this.apiUrl}/catalogue/highlights`);
  }

  getCatalogueCreneaux(medecinId: number, from?: string | null, days = 14): Observable<CreneauJour[]> {
    let params = new HttpParams().set('days', String(days));
    if (from) {
      params = params.set('from', from);
    }
    return this.http.get<CreneauJour[]>(`${this.apiUrl}/catalogue/${medecinId}/creneaux`, { params });
  }

  getProchainCreneau(medecinId: number): Observable<ProchainCreneau> {
    return this.http.get<ProchainCreneau>(`${this.apiUrl}/catalogue/${medecinId}/prochain-creneau`);
  }

  getCatalogueMedecin(id: number): Observable<Medecin> {
    return this.http.get<Medecin>(`${this.apiUrl}/catalogue/${id}`);
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
