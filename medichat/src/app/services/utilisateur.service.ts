import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';

export interface UpdateUtilisateurPayload {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string | null;
  adresse?: string | null;
  ville?: string | null;
  gouvernorat?: string | null;
  codePostal?: string | null;
  motDePasse?: string | null;
  actif?: boolean | null;
}

export interface UtilisateurProfil {
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

@Injectable({ providedIn: 'root' })
export class UtilisateurService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/api/utilisateurs`;

  updateProfil(id: number, body: UpdateUtilisateurPayload): Observable<UtilisateurProfil> {
    return this.http.put<UtilisateurProfil>(`${this.base}/${id}`, body);
  }
}
