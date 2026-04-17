import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';

export interface ServiceMedical {
  id: number;
  nom: string;
  departement: string | null;
  prix: string | null;
  description: string | null;
}

@Injectable({ providedIn: 'root' })
export class ServiceMedicalService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/api/services`;

  getAll(): Observable<ServiceMedical[]> {
    return this.http.get<ServiceMedical[]>(this.url);
  }

  create(body: Omit<ServiceMedical, 'id'>): Observable<ServiceMedical> {
    return this.http.post<ServiceMedical>(this.url, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
