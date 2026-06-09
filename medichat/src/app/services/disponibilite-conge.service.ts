import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';

export type JourSemaine =
  | 'LUNDI' | 'MARDI' | 'MERCREDI' | 'JEUDI'
  | 'VENDREDI' | 'SAMEDI' | 'DIMANCHE';

export interface Disponibilite {
  id: number;
  jour: JourSemaine;
  heureDebut: string;
  heureFin: string;
}

export interface DisponibiliteRequest {
  jour: JourSemaine;
  heureDebut: string;
  heureFin: string;
}

export interface Conge {
  id: number;
  dateDebut: string;
  dateFin: string;
  motif: string | null;
}

export interface CongeRequest {
  dateDebut: string;
  dateFin: string;
  motif?: string | null;
}

@Injectable({ providedIn: 'root' })
export class DisponibiliteCongeService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/api/medecin`;

  // ── Disponibilités ──────────────────────────────────────────────────────────

  getDisponibilites(): Observable<Disponibilite[]> {
    return this.http.get<Disponibilite[]>(`${this.base}/disponibilites`);
  }

  addDisponibilite(body: DisponibiliteRequest): Observable<Disponibilite> {
    return this.http.post<Disponibilite>(`${this.base}/disponibilites`, body);
  }

  updateDisponibilite(id: number, body: DisponibiliteRequest): Observable<Disponibilite> {
    return this.http.put<Disponibilite>(`${this.base}/disponibilites/${id}`, body);
  }

  deleteDisponibilite(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/disponibilites/${id}`);
  }

  // ── Congés ──────────────────────────────────────────────────────────────────

  getConges(): Observable<Conge[]> {
    return this.http.get<Conge[]>(`${this.base}/conges`);
  }

  addConge(body: CongeRequest): Observable<Conge> {
    return this.http.post<Conge>(`${this.base}/conges`, body);
  }

  updateConge(id: number, body: CongeRequest): Observable<Conge> {
    return this.http.put<Conge>(`${this.base}/conges/${id}`, body);
  }

  deleteConge(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/conges/${id}`);
  }
}
