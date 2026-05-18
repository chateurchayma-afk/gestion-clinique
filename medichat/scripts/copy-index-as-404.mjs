/**
 * Netlify / hébergeurs statiques : en l’absence de règle /* -> index.html,
 * une requête sur /ordonnance peut renvoyer une vraie 404 avant Angular.
 * Dupliquer index.html en 404.html permet souvent de charger l’app sur ces chemins.
 */
import { copyFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const browser = join(__dirname, '..', 'dist', 'medichat', 'browser');
const indexPath = join(browser, 'index.html');
const destPath = join(browser, '404.html');

try {
  await copyFile(indexPath, destPath);
  console.log('[spa-404] Copié index.html -> 404.html');
} catch (e) {
  console.warn('[spa-404] Ignoré (build absent ou chemin différent) :', (e && e.message) || e);
}
