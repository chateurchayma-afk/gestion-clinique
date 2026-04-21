import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** Aligné sur {@code AuthResponse} du backend (login / Google). */
export interface GoogleAuthResponse {
  message?: string;
  token: string;
  role?: string;
  email?: string;
  id?: number;
  nom?: string;
  prenom?: string;
}

export interface GoogleTokenPayload {
  token: string; // Google ID Token
}

/** Texte du bouton Google (voir doc GSI `renderButton`). */
export type GoogleSignInButtonText = 'signin_with' | 'signup_with' | 'continue_with';

const PLACEHOLDER_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID_HERE';

/** Élément attendu dans le template pour `renderButton` (évite One Tap / `prompt()` → `gsi/issue`). */
export const GOOGLE_GSI_BUTTON_HOST_ID = 'google-gsi-button-host';

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private readonly http = inject(HttpClient);
  private readonly googleClientId = (environment.googleClientId ?? '').trim();
  private googleScript: HTMLScriptElement | null = null;
  private googleToken: string | null = null;
  /** Loads `gsi/client` once; does not call `initialize`. */
  private scriptReady: Promise<void> | null = null;
  /** Un seul `initialize()` par cycle de vie de page (recommandé par Google). */
  private gsiInitialized = false;
  /** Handler du dernier clic « Se connecter avec Google ». */
  private credentialConsumer: ((credential: string) => void) | null = null;

  /**
   * Charge le script Google Identity Services (sans `initialize`).
   */
  ensureScriptLoaded(): Promise<void> {
    if (this.scriptReady) {
      return this.scriptReady;
    }

    this.scriptReady = new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;

      script.onload = () => {
        if (window.google?.accounts?.id) {
          resolve();
        } else {
          this.scriptReady = null;
          reject(new Error('Google SDK failed to load'));
        }
      };

      script.onerror = () => {
        this.scriptReady = null;
        reject(new Error('Failed to load Google SDK'));
      };

      document.head.appendChild(script);
      this.googleScript = script;
    });

    return this.scriptReady;
  }

  /**
   * @deprecated Utilisez `ensureScriptLoaded`.
   */
  initializeGoogle(): Promise<void> {
    return this.ensureScriptLoaded();
  }

  private isGoogleClientConfigured(): boolean {
    return (
      this.googleClientId.length > 0 &&
      this.googleClientId !== PLACEHOLDER_CLIENT_ID &&
      this.googleClientId.includes('.apps.googleusercontent.com')
    );
  }

  /**
   * Un seul appel à `google.accounts.id.initialize` : évite les avertissements GSI
   * et les conflits FedCM. Le callback délègue au handler posé par le dernier `signInWithGoogle`.
   */
  private ensureGsiInitializedOnce(): void {
    if (this.gsiInitialized) {
      return;
    }
    const id = window.google!.accounts.id;
    id.initialize({
      client_id: this.googleClientId,
      ux_mode: 'popup',
      auto_select: false,
      /** FedCM pour le bouton : évite souvent gsi/button 403 / iframe en mode classique (voir doc Google). */
      use_fedcm_for_button: true,
      callback: (response: { credential?: string }) => {
        if (response?.credential) {
          this.googleToken = response.credential;
          this.credentialConsumer?.(response.credential);
        }
      },
      error_callback: () => {
        console.error('Google Sign-In error');
      },
    });
    this.gsiInitialized = true;
  }

  /**
   * Affiche uniquement le bouton officiel « Continuer avec Google » / « S'inscrire avec Google »
   * dans l’élément {@link GOOGLE_GSI_BUTTON_HOST_ID}.
   */
  renderOfficialGoogleButton(
    onCredential: (credential: string) => void,
    opts?: { buttonText?: GoogleSignInButtonText }
  ): Promise<void> {
    if (!this.isGoogleClientConfigured()) {
      return Promise.reject(
        new Error(
          'Client Google OAuth non configuré. Définissez NG_APP_GOOGLE_CLIENT_ID ou VITE_GOOGLE_CLIENT_ID dans medichat/.env, puis lancez `npm run env:sync` ou `npm start`.'
        )
      );
    }

    const buttonText = opts?.buttonText ?? 'continue_with';

    return this.ensureScriptLoaded().then(() => {
      const host = document.getElementById(GOOGLE_GSI_BUTTON_HOST_ID);
      if (!host) {
        throw new Error(`Élément #${GOOGLE_GSI_BUTTON_HOST_ID} introuvable dans le template.`);
      }

      this.googleToken = null;
      this.credentialConsumer = onCredential;
      this.ensureGsiInitializedOnce();

      host.innerHTML = '';
      host.style.display = 'flex';
      window.google!.accounts.id.renderButton(host, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: buttonText,
        locale: 'fr',
        shape: 'rectangular',
        width: '280px',
      });
    });
  }

  /** @deprecated Préférez {@link renderOfficialGoogleButton}. */
  signInWithGoogle(
    onCredential: (credential: string) => void,
    opts?: { buttonText?: GoogleSignInButtonText }
  ): Promise<void> {
    return this.renderOfficialGoogleButton(onCredential, opts);
  }

  /**
   * Déclenche One Tap après un `initialize` déjà effectué (flux avancé).
   */
  prompt(): void {
    if (!window.google?.accounts?.id) {
      console.error('Google SDK not loaded');
      return;
    }
    window.google.accounts.id.prompt();
  }

  getGoogleToken(): string | null {
    return this.googleToken;
  }

  resetGoogleToken(): void {
    this.googleToken = null;
  }

  authenticateWithGoogle(googleToken: string): Observable<GoogleAuthResponse> {
    const apiBaseUrl = environment.apiBaseUrl;
    return this.http.post<GoogleAuthResponse>(`${apiBaseUrl}/api/auth/google`, {
      token: googleToken,
    });
  }

  /**
   * @deprecated Utilisez `signInWithGoogle` uniquement.
   */
  handleGoogleCallback(callback: (token: string) => void): void {
    this.credentialConsumer = callback;
    if (window.google?.accounts?.id && this.isGoogleClientConfigured()) {
      this.ensureGsiInitializedOnce();
    }
  }

  cleanup(): void {
    if (this.googleScript?.parentNode) {
      this.googleScript.parentNode.removeChild(this.googleScript);
      this.googleScript = null;
    }
    this.scriptReady = null;
    this.gsiInitialized = false;
    this.credentialConsumer = null;
  }
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (element: HTMLElement | null, options: Record<string, unknown>) => void;
          prompt: (momentListener?: (notification: unknown) => void) => void;
        };
      };
    };
  }
}
