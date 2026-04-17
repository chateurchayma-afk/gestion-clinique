import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';

export interface Specialite {
  id: number;
  nom: string;
  description: string | null;
}

@Injectable({ providedIn: 'root' })
export class SpecialiteService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/api/specialites`;

  getAll(): Observable<Specialite[]> {
    return this.http.get<Specialite[]>(this.url);
  }

  create(body: { nom: string; description?: string | null }): Observable<Specialite> {
    return this.http.post<Specialite>(this.url, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
