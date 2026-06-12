import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';
import type { Medecin } from './medecin.service';
import type { Patient } from './patient.service';

@Injectable({ providedIn: 'root' })
export class MedecinPortalService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/api/medecin`;

  getMoi(): Observable<Medecin> {
    return this.http.get<Medecin>(`${this.base}/moi`);
  }

  getMesPatients(): Observable<Patient[]> {
    return this.http.get<Patient[]>(`${this.base}/mes-patients`);
  }
}
