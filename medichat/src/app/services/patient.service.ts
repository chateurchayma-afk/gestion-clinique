import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';

export interface UtilisateurPatient {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  dateNaissance?: string | null;
  sexe?: string | null;
  ville?: string | null;
  adresse?: string | null;
  gouvernorat?: string | null;
  codePostal?: string | null;
}

export interface Patient {
  id: number;
  utilisateur: UtilisateurPatient;
  situationMatrimoniale: string | null;
  contactUrgenceNom: string | null;
  contactUrgenceTelephone: string | null;
  methodeContactPreferee: string | null;
  numeroDossier: string | null;
}

export interface PatientUpdatePayload {
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
  situationMatrimoniale?: string | null;
  contactUrgenceNom?: string | null;
  contactUrgenceTelephone?: string | null;
  methodeContactPreferee?: string | null;
  numeroDossier?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private http = inject(HttpClient);
  private apiUrl = `${API_BASE_URL}/api/patients`;

  getAllPatients(): Observable<Patient[]> {
    return this.http.get<Patient[]>(this.apiUrl);
  }

  getPatientById(id: number): Observable<Patient> {
    return this.http.get<Patient>(`${this.apiUrl}/${id}`);
  }

  updatePatient(id: number, body: PatientUpdatePayload): Observable<Patient> {
    return this.http.put<Patient>(`${this.apiUrl}/${id}`, body);
  }

  deletePatient(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
