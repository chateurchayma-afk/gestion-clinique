import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';

export interface OrdonnanceNotifyRequest {
  patientId: number;
  dateOrdonnance?: string | null;
}

export interface OrdonnanceCreateRequest {
  patientId: number;
  dateOrdonnance?: string | null;
  medicamentsText?: string | null;
  qrUrl?: string | null;
}

export interface OrdonnanceResponse {
  id: number;
  patientId: number;
  medecinId: number;
  dateOrdonnance: string;
  createdAt: string;
}

export interface OrdonnancePatient {
  id: number;
  numeroOrdonnance: string;
  dateOrdonnance: string;
  createdAt: string;
  medecinNom: string;
  medecinPrenom: string;
  medecinSpecialite: string | null;
  medecinTelephone: string | null;
  medecinEmail: string | null;
  medicamentsText: string | null;
  qrUrl: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class OrdonnanceService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_BASE_URL}/api/ordonnances`;

  notifyCreated(body: OrdonnanceNotifyRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/notify`, body);
  }

  create(body: OrdonnanceCreateRequest): Observable<OrdonnanceResponse> {
    return this.http.post<OrdonnanceResponse>(this.apiUrl, body);
  }

  getMesOrdonnances(): Observable<OrdonnancePatient[]> {
    return this.http.get<OrdonnancePatient[]>(`${API_BASE_URL}/api/patient/ordonnances`);
  }

  getOrdonnance(id: number): Observable<OrdonnancePatient> {
    return this.http.get<OrdonnancePatient>(`${API_BASE_URL}/api/patient/ordonnances/${id}`);
  }
}
