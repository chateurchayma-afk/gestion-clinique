import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';

export interface UtilisateurMe {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  adresse: string | null;
  ville: string | null;
  gouvernorat: string | null;
  codePostal: string | null;
  role: string;
  actif: boolean;
}

export interface UpdateMePayload {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string | null;
  adresse?: string | null;
  ville?: string | null;
  gouvernorat?: string | null;
  codePostal?: string | null;
  motDePasse?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AccountProfilService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/api/utilisateurs`;

  getMe(): Observable<UtilisateurMe> {
    return this.http.get<UtilisateurMe>(`${this.base}/me`);
  }

  updateMe(body: UpdateMePayload): Observable<UtilisateurMe> {
    return this.http.put<UtilisateurMe>(`${this.base}/me`, body);
  }
}
