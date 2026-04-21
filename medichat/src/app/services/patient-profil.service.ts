import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';
import { Patient, PatientUpdatePayload } from './patient.service';

@Injectable({ providedIn: 'root' })
export class PatientProfilService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/api/patient/profil`;

  getProfil(): Observable<Patient> {
    return this.http.get<Patient>(this.url);
  }

  updateProfil(body: PatientUpdatePayload): Observable<Patient> {
    return this.http.put<Patient>(this.url, body);
  }
}
