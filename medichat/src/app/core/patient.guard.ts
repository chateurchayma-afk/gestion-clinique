import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

function storedUser(): { role?: string | null; token?: string | null } | null {
  const raw = localStorage.getItem('user');
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as { role?: string | null; token?: string | null };
  } catch {
    return null;
  }
}

/** Espace patient : JWT présent et rôle PATIENT. */
export const patientGuard: CanActivateFn = () => {
  const router = inject(Router);
  const u = storedUser();
  const role = (u?.role ?? '').toString().trim().toUpperCase();
  const token = (u?.token ?? '').toString().trim();
  if (role === 'PATIENT' && token.length > 0) {
    return true;
  }
  void router.navigate(['/login']);
  return false;
};
