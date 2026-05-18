import { inject, Injectable } from '@angular/core';
import { catchError, map, type Observable, of } from 'rxjs';
import { MedecinPortalService } from '../services/medecin-portal.service';

/**
 * Résout l’identifiant du médecin connecté (fiche {@code Medecin}, pas l’utilisateur).
 */
@Injectable({ providedIn: 'root' })
export class MedecinContextService {
  private readonly portal = inject(MedecinPortalService);

  getCurrentUtilisateurId(): number | null {
    const raw = localStorage.getItem('user');
    if (!raw) {
      return null;
    }
    try {
      const u = JSON.parse(raw) as { id?: number | string };
      const n = u?.id;
      if (typeof n === 'number' && n > 0) {
        return n;
      }
      if (typeof n === 'string' && /^\d+$/.test(n)) {
        const x = parseInt(n, 10);
        return x > 0 ? x : null;
      }
    } catch {
      return null;
    }
    return null;
  }

  /**
   * {@code GET /api/medecin/moi} (ou repli) — ne peut pas échouer silencieusement comme un balayage
   * de {@code GET /api/medecins} où le médecin courant peut être absent de la liste optimisée.
   */
  resolveMedecinId(): Observable<number | null> {
    return this.portal.getMoi().pipe(
      map((m) => (typeof m?.id === 'number' && m.id > 0 ? m.id : null)),
      catchError(() => of(null))
    );
  }
}
