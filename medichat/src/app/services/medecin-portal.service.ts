import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { API_BASE_URL } from '../core/api-base';
import type { Medecin } from './medecin.service';
import type { Patient } from './patient.service';

/**
 * API médecin connecté : préfère {@code /api/rendez-vous/medecin/*} (même contrôleur que le planning),
 * avec repli sur {@code /api/medecin/*} pour les anciens déploiements.
 */
@Injectable({ providedIn: 'root' })
export class MedecinPortalService {
  private readonly http = inject(HttpClient);
  private readonly rdvMed = `${API_BASE_URL}/api/rendez-vous/medecin`;
  private readonly legacy = `${API_BASE_URL}/api/medecin`;

  getMoi(): Observable<Medecin> {
    return this.http.get<Medecin>(`${this.rdvMed}/moi`).pipe(
      catchError((err: unknown) =>
        err instanceof HttpErrorResponse && err.status === 404
          ? this.http.get<Medecin>(`${this.legacy}/moi`)
          : throwError(() => err)
      )
    );
  }

  getMesPatients(): Observable<Patient[]> {
    return this.http.get<Patient[]>(`${this.rdvMed}/mes-patients`).pipe(
      catchError((err: unknown) =>
        err instanceof HttpErrorResponse && err.status === 404
          ? this.http.get<Patient[]>(`${this.legacy}/mes-patients`)
          : throwError(() => err)
      )
    );
  }
}
