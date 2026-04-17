import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

function storedRole(): string {
  const raw = localStorage.getItem('user');
  if (!raw) {
    return '';
  }
  try {
    const u = JSON.parse(raw) as { role?: string | null };
    return (u?.role ?? '').toString().trim().toUpperCase();
  } catch {
    return '';
  }
}

/** Accès réservé aux comptes avec rôle ADMIN (après connexion). */
export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (storedRole() === 'ADMIN') {
    return true;
  }
  void router.navigate(['/login']);
  return false;
};
