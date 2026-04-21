import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';
import type { ModeConsultation } from './rendez-vous-patient.service';

export interface AdminRendezVousPlanningItem {
  id: number;
  /** `yyyy-MM-dd` côté API ; formats tableau / objet gérés dans le composant planning. */
  dateRendezVous: string | number[] | Record<string, unknown>;
  heureDebut: string | number[] | Record<string, unknown>;
  heureFin: string | number[] | Record<string, unknown>;
  statut: string;
  modeConsultation: string;
  motif: string | null;
  patientId: number;
  patientNom: string;
  patientPrenom: string;
  medecinId: number;
  medecinNom: string;
  medecinPrenom: string;
  /** Annulation depuis l’espace patient : l’admin ne peut pas réactiver ce rendez-vous. */
  annuleParPatient?: boolean;
}

export type StatutRendezVousAdmin = 'EN_ATTENTE' | 'CONFIRME' | 'ANNULE' | 'TERMINE';

export interface AdminRendezVousCreatePayload {
  patientId: number;
  medecinId: number;
  dateRendezVous: string;
  heureDebut: string;
  heureFin?: string | null;
  modeConsultation: ModeConsultation;
  motif?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminRendezVousService {
  private readonly http = inject(HttpClient);
  /** Toutes les opérations clinique RDV (comme {@code /api/medecins}). */
  private readonly urlRdv = `${API_BASE_URL}/api/rendez-vous`;

  /**
   * Planning période. Passer {@code statut: 'CONFIRME'} pour n’afficher que les RDV confirmés (planning médecins).
   * {@code GET /api/rendez-vous/planning}
   */
  listPlanning(
    startIsoDate: string,
    endIsoDate: string,
    medecinId?: number | null,
    opts?: { statut?: StatutRendezVousAdmin | null }
  ): Observable<AdminRendezVousPlanningItem[]> {
    let params = new HttpParams().set('start', startIsoDate).set('end', endIsoDate);
    if (medecinId != null && medecinId > 0) {
      params = params.set('medecinId', String(medecinId));
    }
    const st = opts?.statut;
    if (st != null) {
      params = params.set('statut', st);
    }
    return this.http.get<AdminRendezVousPlanningItem[]>(`${this.urlRdv}/planning`, { params });
  }

  create(body: AdminRendezVousCreatePayload): Observable<AdminRendezVousPlanningItem> {
    return this.http.post<AdminRendezVousPlanningItem>(this.urlRdv, body);
  }

  /** {@code GET /api/rendez-vous/en-attente} — même idée que médecins en attente. */
  listEnAttente(): Observable<AdminRendezVousPlanningItem[]> {
    return this.http.get<AdminRendezVousPlanningItem[]>(`${this.urlRdv}/en-attente`);
  }

  /** Liste des RDV (patient + admin) — {@code GET …/rendez-vous/gestion}. */
  listGestion(statut?: StatutRendezVousAdmin | '' | null): Observable<AdminRendezVousPlanningItem[]> {
    let params = new HttpParams();
    const s = statut ?? '';
    if (s !== '') {
      params = params.set('statut', s);
    }
    return this.http.get<AdminRendezVousPlanningItem[]>(`${this.urlRdv}/gestion`, { params });
  }

  /** {@code PATCH …/rendez-vous/{id}/statut} — corps {@code { statut }}. */
  updateStatut(id: number, statut: StatutRendezVousAdmin): Observable<AdminRendezVousPlanningItem> {
    return this.http.patch<AdminRendezVousPlanningItem>(`${this.urlRdv}/${id}/statut`, { statut });
  }
}
