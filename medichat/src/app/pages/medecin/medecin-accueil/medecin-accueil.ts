import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/toast.service';
import {
  AdminRendezVousPlanningItem,
  AdminRendezVousService
} from '../../../services/admin-rendez-vous.service';
import { Medecin, MedecinService } from '../../../services/medecin.service';

const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

function normalizeApiDate(v: unknown): string {
  if (v == null || v === '') {
    return '';
  }
  if (typeof v === 'string') {
    const s = v.trim();
    return s.length >= 10 ? s.slice(0, 10) : s;
  }
  if (Array.isArray(v) && v.length >= 3) {
    const y = Number(v[0]);
    const mo = Number(v[1]);
    const da = Number(v[2]);
    if (Number.isFinite(y) && Number.isFinite(mo) && Number.isFinite(da)) {
      return `${y}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`;
    }
  }
  if (typeof v === 'object' && v !== null && 'year' in v) {
    const o = v as { year?: number; monthValue?: number; dayOfMonth?: number };
    if (
      typeof o.year === 'number' &&
      typeof o.monthValue === 'number' &&
      typeof o.dayOfMonth === 'number'
    ) {
      return `${o.year}-${String(o.monthValue).padStart(2, '0')}-${String(o.dayOfMonth).padStart(2, '0')}`;
    }
  }
  return '';
}

function normalizeHeure(raw: unknown): string {
  if (Array.isArray(raw) && raw.length >= 2) {
    const hh = Number(raw[0]);
    const mm = Number(raw[1]);
    if (Number.isFinite(hh) && Number.isFinite(mm)) {
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    }
  }
  if (typeof raw === 'string') {
    return raw.length >= 5 ? raw.slice(0, 5) : raw;
  }
  if (typeof raw === 'object' && raw !== null && 'hour' in raw) {
    const o = raw as { hour?: number; minute?: number };
    if (typeof o.hour === 'number' && typeof o.minute === 'number') {
      return `${String(o.hour).padStart(2, '0')}:${String(o.minute).padStart(2, '0')}`;
    }
  }
  return '';
}

type RdvStatut = string;

type TopScope = 'annee' | 'mois' | 'semaine';

@Component({
  selector: 'app-medecin-accueil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './medecin-accueil.html',
  styleUrl: './medecin-accueil.css'
})
export class MedecinAccueil implements OnInit {
  private readonly medecinService = inject(MedecinService);
  private readonly rdvService = inject(AdminRendezVousService);
  private readonly toast = inject(ToastService);

  readonly years = this.buildYearOptions();
  selectedYear = signal(new Date().getFullYear());
  readonly topScope = signal<TopScope>('annee');

  readonly medecinId = signal<number | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly loading = signal(true);
  readonly rdvs = signal<AdminRendezVousPlanningItem[]>([]);

  readonly monthLabels = MONTHS_SHORT;

  readonly filteredForTop = computed(() => {
    const list = this.rdvs();
    return list.filter((r) => inDateRangeForTop(r, this.selectedYear(), this.topScope()));
  });

  readonly kpis = computed(() => {
    const list = this.rdvs();
    const y = this.selectedYear();
    const yearList = list.filter((r) => inYear(r, y));
    const patients = new Set(yearList.map((r) => r.patientId));
    let termines = 0;
    let attente = 0;
    let annules = 0;
    for (const r of yearList) {
      const s = (r.statut ?? '').toUpperCase();
      if (s === 'TERMINE') {
        termines++;
      } else if (s === 'ANNULE') {
        annules++;
      } else {
        attente++;
      }
    }
    return {
      totalPatients: patients.size,
      termines,
      enAttente: attente,
      annules,
      totalRdvs: yearList.length
    };
  });

  readonly monthly = computed(() => {
    const list = this.rdvs();
    const y = this.selectedYear();
    const yearList = list.filter((r) => inYear(r, y));
    const totalByMonth = Array(12).fill(0) as number[];
    const terminesByMonth = Array(12).fill(0) as number[];
    for (const r of yearList) {
      const d = parseRdvDate(r);
      if (!d || d.getFullYear() !== y) {
        continue;
      }
      const m = d.getMonth();
      totalByMonth[m]++;
      if ((r.statut ?? '').toUpperCase() === 'TERMINE') {
        terminesByMonth[m]++;
      }
    }
    const maxVal = Math.max(1, ...totalByMonth, ...terminesByMonth);
    return { totalByMonth, terminesByMonth, maxVal };
  });

  readonly topPatients = computed(() => {
    const list = this.filteredForTop();
    const m = new Map<
      number,
      { id: number; prenom: string; nom: string; count: number }
    >();
    for (const r of list) {
      const id = r.patientId;
      const cur = m.get(id);
      if (cur) {
        cur.count++;
      } else {
        m.set(id, {
          id,
          prenom: r.patientPrenom ?? '',
          nom: r.patientNom ?? '',
          count: 1
        });
      }
    }
    return [...m.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  });

  readonly recentRdvs = computed(() => {
    const list = this.rdvs();
    const y = this.selectedYear();
    const yearList = list.filter((r) => {
      const d = parseRdvDate(r);
      return d && d.getFullYear() === y;
    });
    return [...yearList]
      .sort((a, b) => compareRdvDateTime(b, a))
      .slice(0, 8);
  });

  readonly donutStyle = computed(() => {
    const { termines, enAttente, annules } = this.kpis();
    const total = termines + enAttente + annules;
    if (total <= 0) {
      return { background: '#e5e7eb' };
    }
    const c1 = '#15803d';
    const c2 = '#4f6fa8';
    const c3 = '#e11d48';
    let a = 0;
    const t1 = (termines / total) * 360;
    const t2 = (enAttente / total) * 360;
    const t3 = (annules / total) * 360;
    const g = `conic-gradient(${c1} ${a}deg ${(a += t1)}deg, ${c2} ${a}deg ${(a += t2)}deg, ${c3} ${a}deg ${(a + t3).toFixed(2)}deg)`;
    return { background: g };
  });

  ngOnInit(): void {
    this.resolveMedecinAndLoad();
  }

  onSelectYear(yr: string): void {
    const n = Number(yr);
    if (!Number.isFinite(n)) {
      return;
    }
    this.selectedYear.set(n);
    const id = this.medecinId();
    if (id) {
      this.loadPlanning(id);
    }
  }

  setTopScope(v: string): void {
    if (v === 'annee' || v === 'mois' || v === 'semaine') {
      this.topScope.set(v);
    }
  }

  private buildYearOptions(): number[] {
    const y = new Date().getFullYear();
    return [y, y - 1, y - 2];
  }

  private resolveMedecinAndLoad(): void {
    this.loadError.set(null);
    this.loading.set(true);
    const raw = localStorage.getItem('user');
    let userId: number | null = null;
    if (raw) {
      try {
        const u = JSON.parse(raw) as { id?: number };
        if (typeof u?.id === 'number' && u.id > 0) {
          userId = u.id;
        }
      } catch {
        userId = null;
      }
    }
    if (userId == null) {
      this.loadError.set('Session introuvable. Reconnectez-vous.');
      this.loading.set(false);
      return;
    }

    this.medecinService.getAllMedecins().subscribe({
      next: (list: Medecin[]) => {
        const m = list.find((x) => (x.utilisateur?.id ?? 0) === userId);
        if (!m?.id) {
          this.loadError.set('Profil médecin introuvable pour ce compte.');
          this.loading.set(false);
          return;
        }
        this.medecinId.set(m.id);
        this.loadPlanning(m.id);
      },
      error: () => {
        this.toast.show('Impossible de résoudre le profil médecin.', 'error');
        this.loadError.set('Chargement du profil impossible.');
        this.loading.set(false);
      }
    });
  }

  private loadPlanning(medecinId: number): void {
    this.loading.set(true);
    const y = this.selectedYear();
    const start = `${y}-01-01`;
    const end = `${y}-12-31`;
    this.rdvService.listPlanning(start, end, medecinId, {}).subscribe({
      next: (rows) => {
        this.rdvs.set(rows ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.toast.show('Impossible de charger le planning des rendez-vous.', 'error');
        this.rdvs.set([]);
        this.loading.set(false);
      }
    });
  }

  dateLine(r: AdminRendezVousPlanningItem): string {
    const d = normalizeApiDate(r.dateRendezVous);
    return d || '—';
  }

  heureLine(r: AdminRendezVousPlanningItem): string {
    const a = normalizeHeure(r.heureDebut);
    const b = normalizeHeure(r.heureFin);
    if (a && b) {
      return `${a} – ${b}`;
    }
    return a || '—';
  }

  statutPillClass(s: RdvStatut): string {
    const u = (s ?? '').toUpperCase();
    if (u === 'TERMINE') {
      return 'pill-ok';
    }
    if (u === 'ANNULE') {
      return 'pill-bad';
    }
    if (u === 'CONFIRME') {
      return 'pill-info';
    }
    return 'pill-wait';
  }

  statutLabel(s: RdvStatut): string {
    const u = (s ?? '').toUpperCase();
    if (u === 'TERMINE') {
      return 'Terminé';
    }
    if (u === 'ANNULE') {
      return 'Annulé';
    }
    if (u === 'CONFIRME') {
      return 'Confirmé';
    }
    if (u === 'EN_ATTENTE') {
      return 'En attente';
    }
    return s || '—';
  }

  initials(prenom: string, nom: string): string {
    const p = (prenom ?? '').trim().charAt(0);
    const n = (nom ?? '').trim().charAt(0);
    return `${p}${n}`.toUpperCase() || '?';
  }

  barHeight(count: number, max: number): number {
    if (max <= 0) {
      return 0;
    }
    return Math.round((count / max) * 100);
  }
}

function parseRdvDate(r: AdminRendezVousPlanningItem): Date | null {
  const s = normalizeApiDate(r.dateRendezVous);
  if (!s) {
    return null;
  }
  const d = new Date(`${s}T12:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

function inYear(r: AdminRendezVousPlanningItem, year: number): boolean {
  const d = parseRdvDate(r);
  return d != null && d.getFullYear() === year;
}

function inDateRangeForTop(r: AdminRendezVousPlanningItem, year: number, scope: TopScope): boolean {
  const d = parseRdvDate(r);
  if (!d) {
    return false;
  }
  const t = d.getTime();
  const now = new Date();
  if (scope === 'semaine') {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return t >= weekAgo.getTime() && t <= now.getTime() + 86_400_000;
  }
  if (d.getFullYear() !== year) {
    return false;
  }
  if (scope === 'annee') {
    return true;
  }
  if (scope === 'mois') {
    return d.getMonth() === now.getMonth();
  }
  return true;
}

function compareRdvDateTime(a: AdminRendezVousPlanningItem, b: AdminRendezVousPlanningItem): number {
  const da = normalizeApiDate(a.dateRendezVous);
  const db = normalizeApiDate(b.dateRendezVous);
  if (da !== db) {
    return da < db ? -1 : 1;
  }
  return normalizeHeure(a.heureDebut).localeCompare(normalizeHeure(b.heureDebut));
}
