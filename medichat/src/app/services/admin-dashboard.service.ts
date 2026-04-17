import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';

export interface RoleStat {
  role: string;
  count: number;
  pourcentage: number;
}

export interface DashboardStats {
  totalUtilisateurs: number;
  repartitionRoles: RoleStat[];
  medecinsEnAttente: number;
  medecinsValides: number;
  medecinsRefuses: number;
}

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/api/admin/stats`;

  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(this.url);
  }
}
