import { googleClientIdGenerated } from './google-client-id.generated';

export const environment = {
  production: true,
  googleClientId: googleClientIdGenerated || 'YOUR_GOOGLE_CLIENT_ID_HERE',
  apiBaseUrl: 'https://REMPLACER_PAR_URL_RAILWAY',
  ordonnancePublicBaseUrl: 'https://REMPLACER_PAR_URL_VERCEL',
};
