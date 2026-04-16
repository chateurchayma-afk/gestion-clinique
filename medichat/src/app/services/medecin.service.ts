import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface UtilisateurMedecin {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
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

@Injectable({
  providedIn: 'root'
})
export class MedecinService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8081/api/medecins';

  getAllMedecins(): Observable<Medecin[]> {
    return this.http.get<Medecin[]>(this.apiUrl);
  }
}