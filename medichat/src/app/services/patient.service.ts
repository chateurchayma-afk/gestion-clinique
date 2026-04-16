import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface UtilisateurPatient {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  dateNaissance?: string | null;
  sexe?: string | null;
  ville?: string | null;
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

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8081/api/patients';

  getAllPatients(): Observable<Patient[]> {
    return this.http.get<Patient[]>(this.apiUrl);
  }
}