import { HttpErrorResponse } from '@angular/common/http';

/** Message lisible pour les erreurs HTTP des appels API (toasts / bandeaux). */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 403) {
      return 'Accès refusé (403). Déconnectez-vous puis reconnectez-vous pour rafraîchir la session.';
    }
    if (err.status === 401) {
      return 'Session expirée ou non reconnue. Reconnectez-vous.';
    }
    if (err.status === 0) {
      return 'Impossible de joindre le serveur (vérifiez que le backend est démarré et l’URL dans .env).';
    }
    const body = err.error as { message?: string } | string | null | undefined;
    if (typeof body === 'object' && body && typeof body.message === 'string' && body.message.trim()) {
      return body.message.trim();
    }
    if (typeof body === 'string' && body.trim()) {
      return body.trim();
    }
  }
  return fallback;
}
