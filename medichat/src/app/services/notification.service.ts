import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';

export type NotificationType =
  | 'NOUVEAU_RENDEZ_VOUS'
  | 'RENDEZ_VOUS_ANNULE'
  | 'NOUVEAU_PATIENT'
  | 'NOUVEAU_MEDECIN'
  | 'CONSULTATION_TERMINEE'
  | 'ORDONNANCE_CREEE'
  | 'PROFIL_MODIFIE'
  | 'RAPPEL_TRAITEMENT'
  | 'ALERTE_SYSTEME';

/** Notification prioritaire affichée différemment pour le patient. */
export function isPatientSpecialNotification(type: NotificationType): boolean {
  return type === 'RAPPEL_TRAITEMENT';
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  archived: boolean;
  createdAt: string;
}

export interface NotificationPageResponse {
  items: NotificationItem[];
  page: number;
  size: number;
  total: number;
  unreadCount: number;
}

/** Jackson peut exposer le champ boolean sous "read" au lieu de "isRead". */
function normalizeNotification(raw: NotificationItem & { read?: boolean }): NotificationItem {
  return {
    ...raw,
    isRead: Boolean(raw.isRead ?? raw.read ?? false),
    archived: Boolean(raw.archived ?? false)
  };
}

function normalizePage(res: NotificationPageResponse): NotificationPageResponse {
  return {
    ...res,
    items: (res.items ?? []).map((n) => normalizeNotification(n as NotificationItem & { read?: boolean }))
  };
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_BASE_URL}/api/notifications`;

  list(filter: string, query: string, page: number, size: number): Observable<NotificationPageResponse> {
    let params = new HttpParams()
      .set('filter', filter || 'all')
      .set('page', String(page ?? 0))
      .set('size', String(size ?? 20));
    if (query && query.trim()) {
      params = params.set('query', query.trim());
    }
    return this.http
      .get<NotificationPageResponse>(this.apiUrl, { params })
      .pipe(map((res) => normalizePage(res)));
  }

  recent(limit = 6): Observable<NotificationItem[]> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http
      .get<NotificationItem[]>(`${this.apiUrl}/recent`, { params })
      .pipe(
        map((list) =>
          (list ?? []).map((n) => normalizeNotification(n as NotificationItem & { read?: boolean }))
        )
      );
  }

  unreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/unread-count`);
  }

  markRead(id: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/read/${id}`, {});
  }

  markUnread(id: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/unread/${id}`, {});
  }

  markAllRead(): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/read-all`, {});
  }

  archiveOld(): Observable<{ updated: number }> {
    return this.http.put<{ updated: number }>(`${this.apiUrl}/archive-old`, {});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
