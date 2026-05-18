import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';

export type ModeConsultation = 'ONLINE' | 'PRESENTIEL';
export type StatutRendezVous = 'EN_ATTENTE' | 'CONFIRME' | 'ANNULE' | 'TERMINE';

export interface RendezVousPatient {
  id: number;
  medecinId: number;
  medecinNom: string;
  medecinPrenom: string;
  specialiteNom: string | null;
  dateRendezVous: string;
  heureDebut: string;
  heureFin: string;
  modeConsultation: ModeConsultation;
  motif: string | null;
  statut: StatutRendezVous;
}

export interface RendezVousCreatePayload {
  medecinId: number;
  dateRendezVous: string;
  heureDebut: string;
  heureFin?: string | null;
  modeConsultation: ModeConsultation;
  motif?: string | null;
}

export interface RendezVousReporterPayload {
  dateRendezVous: string;
  heureDebut: string;
  heureFin?: string | null;
}

@Injectable({ providedIn: 'root' })
export class RendezVousPatientService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/api/patient/rendez-vous`;

  list(): Observable<RendezVousPatient[]> {
    return this.http.get<RendezVousPatient[]>(this.url);
  }

  create(body: RendezVousCreatePayload): Observable<RendezVousPatient> {
    return this.http.post<RendezVousPatient>(this.url, body);
  }

  annuler(id: number): Observable<void> {
    return this.http.patch<void>(`${this.url}/${id}/annuler`, {});
  }

  reporter(id: number, body: RendezVousReporterPayload): Observable<RendezVousPatient> {
    return this.http.patch<RendezVousPatient>(`${this.url}/${id}/reporter`, body);
  }
}
