// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.

import { googleClientIdGenerated } from './google-client-id.generated';

export const environment = {
  production: false,
  /** Rempli depuis medichat/.env via `npm run env:sync` (exécuté avant start/build). */
  googleClientId: googleClientIdGenerated || 'YOUR_GOOGLE_CLIENT_ID_HERE',
  apiBaseUrl: 'http://localhost:8081',
  /** URL publique Netlify pour l'ordonnance QR (sans slash final). */
  ordonnancePublicBaseUrl: 'https://medichat2004.netlify.app',
};
