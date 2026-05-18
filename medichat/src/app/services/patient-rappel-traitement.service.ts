import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';

export interface RappelTraitementPatient {
  actif: boolean;
  traitement: string | null;
  frequence: string | null;
  messageRenouvellement: string | null;
}

@Injectable({ providedIn: 'root' })
export class PatientRappelTraitementService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/api/patient/dossier-medical/rappel-traitement`;

  getMonRappel(): Observable<RappelTraitementPatient> {
    return this.http.get<RappelTraitementPatient>(this.url);
  }
}
