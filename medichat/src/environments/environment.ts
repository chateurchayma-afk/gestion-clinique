// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.

import { googleClientIdGenerated } from './google-client-id.generated';

export const environment = {
  production: false,
  /** Rempli depuis medichat/.env via `npm run env:sync` (exécuté avant start/build). */
  googleClientId: googleClientIdGenerated || 'YOUR_GOOGLE_CLIENT_ID_HERE',
  apiBaseUrl: 'http://localhost:8081',
  /**
   * URL de base **vue depuis le téléphone** qui scanne le QR (sans slash final).
   * - Ne pas utiliser seul `http://localhost:4200` : sur le mobile, localhost = le téléphone.
   * - En local : IP LAN du PC, ex. `http://192.168.1.42:4200` et `ng serve --host 0.0.0.0`.
   * - En prod : l’URL HTTPS déployée (ex. Netlify).
   */
  ordonnancePublicBaseUrl: 'https://medichat2004.netlify.app',
};
