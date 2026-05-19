import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import {
  decodeRendezVousQrData,
  isRendezVousPayloadEmpty,
  type RendezVousQrDecoded
} from '../../core/rendez-vous-qr-codec';

export type RendezVousQrData = RendezVousQrDecoded;

/** Extrait la charge utile depuis le hash (#data=...) apres scan QR. */
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
      /* deja brut */
    }
    return v.trim();
  }
  if (part.startsWith('{')) {
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

function formatHeure(time: string): string {
  if (!time) {
    return '';
  }
  return time.length >= 5 ? time.slice(0, 5) : time;
}

@Component({
  selector: 'app-rendez-vous-qr-public',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rendez-vous-qr-public.html',
  styleUrl: './rendez-vous-qr-public.css'
})
export class RendezVousQrPublic implements OnInit {
  private readonly route = inject(ActivatedRoute);

  readonly payload = signal<RendezVousQrData | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = signal(true);
  readonly formattedDate = signal<string>('');

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(map((pm) => (pm.get('data') ?? '').trim()))
      .subscribe((fromQuery) => {
        if (fromQuery) {
          void this.applyRaw(fromQuery);
        }
      });

    this.route.fragment
      .pipe(map((f) => extractDataFromFragment(f)))
      .subscribe((fromFrag) => {
        if (fromFrag && !this.payload()) {
          void this.applyRaw(fromFrag);
        }
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
      this.error.set('Aucune donnee trouvee');
      this.payload.set(null);
      this.formattedDate.set('');
      this.loading.set(false);
      return;
    }

    const data = decodeRendezVousQrData(raw);
    if (!data) {
      this.error.set('Impossible de lire les donnees du QR code');
      this.payload.set(null);
      this.formattedDate.set('');
      this.loading.set(false);
      return;
    }
    if (isRendezVousPayloadEmpty(data)) {
      this.error.set('Le rendez-vous est vide ou incomplet.');
      this.payload.set(null);
      this.formattedDate.set('');
      this.loading.set(false);
      return;
    }
    this.payload.set(data);
    this.formattedDate.set(data.date ? formatFrDate(data.date) : '');
    this.error.set(null);
    this.loading.set(false);
  }

  getStatutColor(statut: string | null | undefined): string {
    switch (statut) {
      case 'CONFIRME':
        return '#13aa55';
      case 'EN_ATTENTE':
        return '#f5a623';
      case 'ANNULE':
        return '#d0021b';
      case 'TERMINE':
        return '#4f6fa8';
      default:
        return '#65748a';
    }
  }

  getStatutLabel(statut: string | null | undefined): string {
    switch (statut) {
      case 'EN_ATTENTE':
        return 'En attente';
      case 'CONFIRME':
        return 'Confirme';
      case 'ANNULE':
        return 'Annule';
      case 'TERMINE':
        return 'Termine';
      default:
        return statut || '-';
    }
  }

  getModeLabel(mode: string | null | undefined): string {
    const upper = (mode ?? '').trim().toUpperCase();
    if (upper === 'ONLINE') {
      return 'En ligne';
    }
    if (upper === 'PRESENTIEL') {
      return 'Presentiel';
    }
    return mode || '-';
  }

  formatHeure(time: string | null | undefined): string {
    return formatHeure(time ?? '');
  }
}
