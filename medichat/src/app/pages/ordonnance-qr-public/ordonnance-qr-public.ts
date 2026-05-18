import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest, map } from 'rxjs';
import {
  decodeOrdonnanceQrData,
  isOrdonnancePayloadEmpty,
  type OrdonnanceQrDecoded
} from '../../core/ordonnance-qr-codec';

/** Affichage page publique (v1 legacy ou v2 compact). */
export type OrdonnanceQrPayloadV1 = OrdonnanceQrDecoded;

/** Extrait la charge utile depuis le hash (#data=...) après scan QR. */
export function extractDataFromFragment(frag: string | null): string {
  if (frag == null || !String(frag).trim()) {
    return '';
  }
  let part = String(frag).trim();
  if (part.startsWith('/')) {
    part = part.slice(1).trim();
  }
  if (part.startsWith('data=')) {
    let v = part.slice(5);
    try {
      v = decodeURIComponent(v);
    } catch {
      /* déjà brut */
    }
    return v.trim();
  }
  if (part.startsWith('z:')) {
    return part.trim();
  }
  if (/^[A-Za-z0-9_-]+$/.test(part)) {
    return part.trim();
  }
  return '';
}

function formatFrDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return iso;
  }
  const [a, b, c] = iso.split('-');
  return `${c}/${b}/${a}`;
}

@Component({
  selector: 'app-ordonnance-qr-public',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ordonnance-qr-public.html',
  styleUrl: './ordonnance-qr-public.css'
})
export class OrdonnanceQrPublic implements OnInit {
  private readonly route = inject(ActivatedRoute);

  readonly payload = signal<OrdonnanceQrPayloadV1 | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = signal(true);
  readonly formattedDate = signal<string>('');

  ngOnInit(): void {
    combineLatest([
      this.route.queryParamMap.pipe(map((pm) => (pm.get('data') ?? '').trim())),
      this.route.fragment.pipe(map((f) => extractDataFromFragment(f)))
    ]).subscribe(([fromQuery, fromFrag]) => {
      void this.applyRaw(fromQuery || fromFrag);
    });

    queueMicrotask(() => this.tryFallbackFromLocation());
    setTimeout(() => this.tryFallbackFromLocation(), 80);
    setTimeout(() => this.tryFallbackFromLocation(), 300);
  }

  private tryFallbackFromLocation(): void {
    if (typeof window === 'undefined' || this.payload()) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const fromQuery = (params.get('data') ?? '').trim();
    if (fromQuery) {
      void this.applyRaw(fromQuery);
      return;
    }
    const h = window.location.hash;
    if (!h || h.length < 8) {
      return;
    }
    const inner = h.startsWith('#') ? h.slice(1) : h;
    const raw = extractDataFromFragment(inner);
    if (raw) {
      void this.applyRaw(raw);
    }
  }

  private async applyRaw(raw: string): Promise<void> {
    this.loading.set(true);
    if (!raw?.trim()) {
      this.payload.set(null);
      this.error.set('Lien incomplet : aucune donnée d’ordonnance.');
      this.formattedDate.set('');
      this.loading.set(false);
      return;
    }
    const decoded = await decodeOrdonnanceQrData(raw);
    if (!decoded) {
      this.payload.set(null);
      this.error.set(
        'Ce QR n’a pas pu être lu. Réessayez plus près de l’écran, avec bonne lumière, ou demandez une nouvelle ordonnance au médecin.'
      );
      this.formattedDate.set('');
      this.loading.set(false);
      return;
    }
    if (isOrdonnancePayloadEmpty(decoded)) {
      this.payload.set(null);
      this.error.set(
        'L’ordonnance est vide (patient ou traitement manquant). Le médecin doit sélectionner un patient, saisir le traitement, puis régénérer le PDF avant impression.'
      );
      this.formattedDate.set('');
      this.loading.set(false);
      return;
    }
    this.payload.set(decoded);
    this.error.set(null);
    this.formattedDate.set(decoded.date ? formatFrDate(decoded.date) : '');
    this.loading.set(false);
  }
}
