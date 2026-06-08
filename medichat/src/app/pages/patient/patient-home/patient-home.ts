import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { UserSessionService } from '../../../core/user-session.service';
import { CatalogueHighlights, Medecin, MedecinService } from '../../../services/medecin.service';
import { PatientProfilService } from '../../../services/patient-profil.service';
import { PatientRappelTraitementService, RappelTraitementPatient } from '../../../services/patient-rappel-traitement.service';
import {
  NotificationItem,
  NotificationService,
  isPatientSpecialNotification
} from '../../../services/notification.service';
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

// Nom de la table Power BI et colonne email — à adapter selon votre modèle Power BI
const PBI_TABLE_PATIENT = 'DIM_PATIENT';
const PBI_COLUMN_PATIENT = 'patient_id';
const PBI_REPORT_URL_PATIENT = 'https://app.powerbi.com/reportEmbed?reportId=1e35b4c1-39b6-4f8a-9036-74fc2c358855&autoAuth=true&ctid=604f1a96-cbe8-43f8-abbf-f8eaf5d85730';

@Component({
  selector: 'app-patient-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './patient-home.html',
  styleUrl: './patient-home.css'
})
export class PatientHome implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly medecinService = inject(MedecinService);
  private readonly rdvService = inject(RendezVousPatientService);
  private readonly rappelTraitementService = inject(PatientRappelTraitementService);
  private readonly notificationService = inject(NotificationService);
  private readonly userSession = inject(UserSessionService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly patientProfil = inject(PatientProfilService);

  pbiUrl: SafeResourceUrl = '';

  readonly loading = signal(true);
  readonly rdvs = signal<RendezVousPatient[]>([]);
  readonly medecins = signal<Medecin[]>([]);
  readonly highlights = signal<CatalogueHighlights | null>(null);
  readonly rappelTraitement = signal<RappelTraitementPatient | null>(null);
  /** Notification prioritaire non lue (rappel traitement). */
  readonly specialNotification = signal<NotificationItem | null>(null);
  /** Prénom depuis la session (localStorage), mis à jour après édition du profil. */
  readonly patientPrenom = signal<string>('');

  readonly totalRdvs = computed(() => this.rdvs().length);

  readonly todayLabel = computed(() =>
    new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date())
  );

  /** Nombre de rendez-vous encore à venir (non annulés, date/heure ≥ maintenant). */
  readonly rdvsAVenirCount = computed(() => {
    const list = this.rdvsActifs();
    const now = new Date();
    const todayIso = this.toIsoLocal(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
    const nowMin = now.getHours() * 60 + now.getMinutes();
    let n = 0;
    for (const r of list) {
      const d = r.dateRendezVous.slice(0, 10);
      if (d < todayIso) {
        continue;
      }
      if (d === todayIso && minutesFromMidnight(r.heureDebut) < nowMin) {
        continue;
      }
      n++;
    }
    return n;
  });

  /** Médecins distincts avec au moins un RDV non annulé. */
  readonly medecinsConsultesCount = computed(() => this.countRdvsParMedecin().size);

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

  constructor() {
    this.userSession.profileUpdated$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.refreshPatientPrenomFromStorage();
    });
  }

  ngOnInit(): void {
    this.buildPbiUrl();
    this.refreshPatientPrenomFromStorage();
    this.loading.set(true);
    forkJoin({
      medecins: this.medecinService.getCatalogue({ sort: 'nom', disponible: true }),
      highlights: this.medecinService.getCatalogueHighlights(),
      rdvs: this.rdvService.list(),
      rappel: this.rappelTraitementService.getMonRappel().pipe(
        catchError(() =>
          of<RappelTraitementPatient>({
            actif: false,
            traitement: null,
            frequence: null,
            messageRenouvellement: null
          })
        )
      ),
      notifs: this.notificationService.recent(12).pipe(catchError(() => of<NotificationItem[]>([])))
    }).subscribe({
      next: ({ medecins, highlights, rdvs, rappel, notifs }) => {
        this.medecins.set(medecins ?? []);
        this.highlights.set(highlights ?? null);
        this.rdvs.set(rdvs ?? []);
        this.rappelTraitement.set(rappel ?? null);
        this.specialNotification.set(this.pickSpecialUnread(notifs ?? []));
        this.loading.set(false);
      },
      error: () => {
        this.rdvService.list().subscribe({
          next: (rows) => {
            this.rdvs.set(rows ?? []);
            this.medecins.set([]);
            this.highlights.set(null);
            this.rappelTraitement.set(null);
            this.specialNotification.set(null);
            this.loading.set(false);
          },
          error: () => {
            this.loading.set(false);
          }
        });
      }
    });
  }

  dismissSpecialNotification(): void {
    const n = this.specialNotification();
    if (!n) {
      return;
    }
    this.notificationService.markRead(n.id).subscribe({
      next: () => this.specialNotification.set(null),
      error: () => this.specialNotification.set(null)
    });
  }

  private pickSpecialUnread(items: NotificationItem[]): NotificationItem | null {
    return (
      items.find((n) => !n.isRead && !n.archived && isPatientSpecialNotification(n.type)) ?? null
    );
  }

  private buildPbiUrl(): void {
    this.patientProfil.getProfil().subscribe({
      next: (patient) => {
        const url = `${PBI_REPORT_URL_PATIENT}&filter=${PBI_TABLE_PATIENT}/${PBI_COLUMN_PATIENT} eq ${patient.id}`;
        this.pbiUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      },
      error: () => {
        this.pbiUrl = this.sanitizer.bypassSecurityTrustResourceUrl(PBI_REPORT_URL_PATIENT);
      }
    });
  }

  private refreshPatientPrenomFromStorage(): void {
    try {
      const raw = localStorage.getItem('user');
      const u = raw ? (JSON.parse(raw) as { prenom?: string }) : null;
      this.patientPrenom.set((u?.prenom ?? '').trim());
    } catch {
      this.patientPrenom.set('');
    }
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
