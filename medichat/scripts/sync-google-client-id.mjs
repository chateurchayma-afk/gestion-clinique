/**
 * Lit medichat/.env et écrit src/environments/google-client-id.generated.ts
 * pour que Angular utilise le même Client ID que le backend.
 *
 * Variables reconnues (la première trouvée gagne) :
 * NG_APP_GOOGLE_CLIENT_ID, VITE_GOOGLE_CLIENT_ID, GOOGLE_CLIENT_ID
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
const outPath = path.join(projectRoot, 'src', 'environments', 'google-client-id.generated.ts');

const keys = [
  'NG_APP_GOOGLE_CLIENT_ID',
  'VITE_GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_ID',
];

function parseEnvValue(raw) {
  let v = raw.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v.trim();
}

function readClientIdFromDotEnv() {
  if (!fs.existsSync(envPath)) {
    return '';
  }
  const text = fs.readFileSync(envPath, 'utf8');
  const map = new Map();
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (m) {
      map.set(m[1], parseEnvValue(m[2] ?? ''));
    }
  }
  for (const k of keys) {
    const val = map.get(k);
    if (val) {
      return val;
    }
  }
  return '';
}

const clientId = readClientIdFromDotEnv();
const out = `/* Fichier généré par scripts/sync-google-client-id.mjs — ne pas éditer à la main */
export const googleClientIdGenerated = ${JSON.stringify(clientId)};
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, out, 'utf8');

if (clientId) {
  console.log('[env:sync] Google Client ID écrit dans google-client-id.generated.ts');
} else {
  console.warn(
    '[env:sync] Aucun Client ID trouvé dans .env (' +
      keys.join(', ') +
      '). Le frontend gardera le libellé d’erreur côté Google Sign-In.'
  );
}
