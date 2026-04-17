import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Envoie le JWT pour les appels API (profil / routes sécurisées), sauf /api/auth/*.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('/api/') || req.url.includes('/api/auth/')) {
    return next(req);
  }
  const raw = localStorage.getItem('user');
  if (!raw) {
    return next(req);
  }
  try {
    const u = JSON.parse(raw) as { token?: string | null };
    const token = u?.token;
    if (token) {
      return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
    }
  } catch {
    /* ignore JSON invalide */
  }
  return next(req);
};
