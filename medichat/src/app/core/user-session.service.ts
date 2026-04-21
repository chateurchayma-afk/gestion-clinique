import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Notifie le shell (avatar / nom) après mise à jour du profil dans localStorage.
 */
@Injectable({ providedIn: 'root' })
export class UserSessionService {
  private readonly profileUpdated = new Subject<void>();
  readonly profileUpdated$ = this.profileUpdated.asObservable();

  emitProfileUpdated(): void {
    this.profileUpdated.next();
  }
}
