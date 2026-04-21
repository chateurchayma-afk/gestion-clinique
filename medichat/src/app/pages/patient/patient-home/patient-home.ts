import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CatalogueHighlights, Medecin, MedecinService } from '../../../services/medecin.service';
import {
  RendezVousPatient,
  RendezVousPatientService,
  StatutRendezVous
} from '../../../services/rendez-vous-patient.service';

function parseLocalDate(iso: string): Date {
  const p = (iso ?? '').slice(0, 10);
  const [y, m, d] = p.split('-').map((x) => parseInt(x, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return new Date(0);
  }
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function minutesFromMidnight(t: string): number {
  const s = (t ?? '').trim();
  const core = s.length >= 5 ? s.slice(0, 5) : s;
  const [hh, mm] = core.split(':').map((x) => parseInt(x, 10));
  return (hh ?? 0) * 60 + (mm ?? 0);
}

@Component({
  selector: 'app-patient-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './patient-home.html',
  styleUrl: './patient-home.css'
})
export class PatientHome implements OnInit {
  private readonly medecinService = inject(MedecinService);
  private readonly rdvService = inject(RendezVousPatientService);

  readonly loading = signal(true);
  readonly rdvs = signal<RendezVousPatient[]>([]);
  readonly medecins = signal<Medecin[]>([]);
  readonly highlights = signal<CatalogueHighlights | null>(null);

  readonly totalRdvs = computed(() => this.rdvs().length);

  readonly rdvsActifs = computed(() => this.rdvs().filter((r) => r.statut !== 'ANNULE'));

  readonly trendText = computed(() => {
    const list = this.rdvsActifs();
    const now = new Date();
    const d7 = new Date(now);
    d7.setDate(d7.getDate() - 7);
    const d14 = new Date(now);
    d14.setDate(d14.getDate() - 14);
    const inLast7 = list.filter((r) => parseLocalDate(r.dateRendezVous) >= d7).length;
    const inPrev7 = list.filter((r) => {
      const d = parseLocalDate(r.dateRendezVous);
      return d >= d14 && d < d7;
    }).length;
    if (inPrev7 === 0) {
      return inLast7 > 0 ? `+${inLast7} sur les 7 derniers jours` : 'Activité récente';
    }
    const pct = Math.round(((inLast7 - inPrev7) / inPrev7) * 100);
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct}% vs la semaine précédente`;
  });

  readonly prochainRdv = computed((): RendezVousPatient | null => {
    const list = this.rdvsActifs();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const todayIso = this.toIsoLocal(todayStart);
    const sorted = [...list].sort((a, b) => {
      const da = parseLocalDate(a.dateRendezVous).getTime();
      const db = parseLocalDate(b.dateRendezVous).getTime();
      if (da !== db) {
        return da - db;
      }
      return minutesFromMidnight(a.heureDebut) - minutesFromMidnight(b.heureDebut);
    });
    for (const r of sorted) {
      const d = r.dateRendezVous.slice(0, 10);
      if (d < todayIso) {
        continue;
      }
      if (d === todayIso) {
        if (minutesFromMidnight(r.heureDebut) >= nowMin) {
          return r;
        }
        continue;
      }
      return r;
    }
    return null;
  });

  readonly recentRdvs = computed(() => {
    const list = [...this.rdvs()];
    return list
      .sort((a, b) => {
        const db = parseLocalDate(b.dateRendezVous).getTime();
        const da = parseLocalDate(a.dateRendezVous).getTime();
        if (db !== da) {
          return db - da;
        }
        return minutesFromMidnight(b.heureDebut) - minutesFromMidnight(a.heureDebut);
      })
      .slice(0, 6);
  });

  readonly medecinsAffiches = computed(() => {
    const cat = this.medecins();
    const h = this.highlights();
    const counts = this.countRdvsParMedecin();
    const pop = new Set(h?.medecinsPopulairesIds ?? []);
    const scored = cat.map((m) => ({
      m,
      n: counts.get(m.id) ?? 0,
      pop: pop.has(m.id) ? 1 : 0,
      note: m.noteMoyenne ?? 0
    }));
    scored.sort((a, b) => {
      if (b.n !== a.n) {
        return b.n - a.n;
      }
      if (b.pop !== a.pop) {
        return b.pop - a.pop;
      }
      if (b.note !== a.note) {
        return b.note - a.note;
      }
      const na = `${a.m.utilisateur.prenom} ${a.m.utilisateur.nom}`.toLowerCase();
      const nb = `${b.m.utilisateur.prenom} ${b.m.utilisateur.nom}`.toLowerCase();
      return na.localeCompare(nb, 'fr');
    });
    return scored.slice(0, 5).map((x) => ({ medecin: x.m, bookings: x.n }));
  });

  ngOnInit(): void {
    this.loading.set(true);
    forkJoin({
      medecins: this.medecinService.getCatalogue({ sort: 'nom', disponible: true }),
      highlights: this.medecinService.getCatalogueHighlights(),
      rdvs: this.rdvService.list()
    }).subscribe({
      next: ({ medecins, highlights, rdvs }) => {
        this.medecins.set(medecins ?? []);
        this.highlights.set(highlights ?? null);
        this.rdvs.set(rdvs ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.rdvService.list().subscribe({
          next: (rows) => {
            this.rdvs.set(rows ?? []);
            this.medecins.set([]);
            this.highlights.set(null);
            this.loading.set(false);
          },
          error: () => {
            this.loading.set(false);
          }
        });
      }
    });
  }

  private countRdvsParMedecin(): Map<number, number> {
    const m = new Map<number, number>();
    for (const r of this.rdvs()) {
      if (r.statut === 'ANNULE') {
        continue;
      }
      m.set(r.medecinId, (m.get(r.medecinId) ?? 0) + 1);
    }
    return m;
  }

  private toIsoLocal(d: Date): string {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${day}`;
  }

  initials(m: Medecin): string {
    const p = (m.utilisateur.prenom ?? '').trim().charAt(0);
    const n = (m.utilisateur.nom ?? '').trim().charAt(0);
    return `${p}${n}`.toUpperCase() || 'DR';
  }

  photoUrl(m: Medecin): string | null {
    const u = m.utilisateur.photo;
    return u && u.trim().length > 0 ? u.trim() : null;
  }

  formatLongDate(iso: string): string {
    const d = parseLocalDate(iso);
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(d);
  }

  formatHeureRange(r: RendezVousPatient): string {
    const a = this.shortHeure(r.heureDebut);
    const b = this.shortHeure(r.heureFin);
    return `${a} – ${b}`;
  }

  shortHeure(t: string): string {
    const s = (t ?? '').trim();
    return s.length >= 5 ? s.slice(0, 5) : s;
  }

  labelMode(m: string): string {
    return m === 'ONLINE' ? 'En ligne' : 'Présentiel';
  }

  labelStatut(s: StatutRendezVous): string {
    switch (s) {
      case 'EN_ATTENTE':
        return 'En attente';
      case 'CONFIRME':
        return 'Confirmé';
      case 'ANNULE':
        return 'Annulé';
      case 'TERMINE':
        return 'Terminé';
      default:
        return s;
    }
  }

  statutClass(s: StatutRendezVous): string {
    switch (s) {
      case 'CONFIRME':
        return 'pill--ok';
      case 'EN_ATTENTE':
        return 'pill--wait';
      case 'ANNULE':
        return 'pill--bad';
      case 'TERMINE':
        return 'pill--done';
      default:
        return '';
    }
  }

  specialiteLabel(m: Medecin): string {
    return m.specialite?.nom?.trim() || '—';
  }
}
