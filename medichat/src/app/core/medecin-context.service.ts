import { inject, Injectable } from '@angular/core';
import { catchError, map, type Observable, of } from 'rxjs';
import { MedecinService } from '../services/medecin.service';

/**
 * Résout l’identifiant du médecin connecté (profil lié à l’utilisateur).
 */
@Injectable({ providedIn: 'root' })
export class MedecinContextService {
  private readonly medecins = inject(MedecinService);

  getCurrentUtilisateurId(): number | null {
    const raw = localStorage.getItem('user');
    if (!raw) {
      return null;
    }
    try {
      const u = JSON.parse(raw) as { id?: number };
      if (typeof u?.id === 'number' && u.id > 0) {
        return u.id;
      }
    } catch {
      return null;
    }
    return null;
  }

  /** Retourne l’id de la fiche {@link /api/medecins} du médecin connecté, ou `null`. */
  resolveMedecinId(): Observable<number | null> {
    const uid = this.getCurrentUtilisateurId();
    if (uid == null) {
      return of(null);
    }
    return this.medecins.getAllMedecins().pipe(
      map((list) => {
        const m = list.find((x) => (x.utilisateur?.id ?? 0) === uid);
        return m?.id ?? null;
      }),
      catchError(() => of(null))
    );
  }
}
