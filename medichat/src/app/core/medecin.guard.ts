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

function returnUrlParam(fullPath: string): string {
  const p = (fullPath || '').replace(/^\//, '').split('?')[0].split('#')[0];
  if (!p || !/^[a-zA-Z0-9/_-]+$/.test(p)) {
    return '';
  }
  return p;
}

export const medecinGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  if (storedRole() === 'MEDECIN') {
    return true;
  }
  const ret = returnUrlParam(state.url);
  void router.navigate(['/login'], {
    queryParams: ret ? { returnUrl: ret, needMedecin: '1' } : {}
  });
  return false;
};
