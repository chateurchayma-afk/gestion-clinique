import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../../core/toast.service';
import { MedecinContextService } from '../../../core/medecin-context.service';
import { AdminRendezVousPlanningItem, AdminRendezVousService, StatutRendezVousAdmin } from '../../../services/admin-rendez-vous.service';
import { MedecinPortalService } from '../../../services/medecin-portal.service';
import { Patient } from '../../../services/patient.service';

const STATUT_FILTRE_VALUES: ReadonlyArray<StatutRendezVousAdmin | 'TOUS'> = [
  'TOUS',
  'EN_ATTENTE',
  'CONFIRME',
  'ANNULE',
  'TERMINE'
];

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Dimanche = premier jour de la semaine affichée (comme l’admin planning). */
function startOfWeekSunday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDaysDate(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function compareHeureDebut(a: AdminRendezVousPlanningItem, b: AdminRendezVousPlanningItem): number {
  const sa = formatHeureSortable(a.heureDebut);
  const sb = formatHeureSortable(b.heureDebut);
  return sa.localeCompare(sb);
}

function formatHeureSortable(value: string | number[] | Record<string, unknown>): string {
  if (typeof value === 'string') {
    return value.slice(0, 8).padEnd(8, '0');
  }
  if (Array.isArray(value) && value.length >= 2) {
    const h = Number(value[0]);
    const m = Number(value[1]);
    if (Number.isFinite(h) && Number.isFinite(m)) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    }
  }
  return '';
}

function parseIsoDate(value: string | number[] | Record<string, unknown>): string {
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  if (Array.isArray(value) && value.length >= 3) {
    const [y, m, d] = value;
    if (typeof y === 'number' && typeof m === 'number' && typeof d === 'number') {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  return '';
}

function timeToMinutes(value: string | number[] | Record<string, unknown>): number {
  if (typeof value === 'string') {
    const p = value.split(':').map((x) => parseInt(x, 10));
    if (p.length >= 2 && p.every((x) => !Number.isNaN(x))) {
      return p[0] * 60 + p[1];
    }
  }
  if (Array.isArray(value) && value.length >= 2) {
    const h = Number(value[0]);
    const mi = Number(value[1]);
    if (Number.isFinite(h) && Number.isFinite(mi)) {
      return h * 60 + mi;
    }
  }
  return 9 * 60;
}

@Component({
  selector: 'app-medecin-rendez-vous',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './medecin-rendez-vous.html',
  styleUrls: ['./medecin-rendez-vous.css', '../medecin-pro.css']
})
export class MedecinRendezVous implements OnInit {
  private readonly ctx = inject(MedecinContextService);
  private readonly medecinPortal = inject(MedecinPortalService);
  private readonly adminRdv = inject(AdminRendezVousService);
  private readonly toast = inject(ToastService);

  readonly medecinId = signal<number | null>(null);
  readonly patients = signal<Patient[]>([]);
  readonly loadMeta = signal(true);
  readonly listLoading = signal(true);
  /** Vue liste (tableau) ou calendrier hebdomadaire (patients par jour). */
  readonly viewMode = signal<'liste' | 'calendrier'>('calendrier');

  readonly rdvRows = signal<AdminRendezVousPlanningItem[]>([]);
  readonly calendarRows = signal<AdminRendezVousPlanningItem[]>([]);
  readonly calendarLoading = signal(false);
  readonly weekStart = signal<Date>(startOfWeekSunday(new Date()));
  readonly selectedId = signal<number | null>(null);

  readonly filterStatut = signal<StatutRendezVousAdmin | 'TOUS'>('TOUS');
  readonly filterPatientId = signal<number | null>(null);
  /** Fenêtre large par défaut : une plage trop courte masquait tous les RDV alors que l’API en renvoie. */
  readonly filterFrom = signal(isoOffset(-730));
  readonly filterTo = signal(isoOffset(730));

  readonly filteredRows = computed(() => {
    const rows = this.rdvRows();
    const pid = this.filterPatientId();
    const from = this.filterFrom();
    const to = this.filterTo();
    return rows.filter((r) => {
      if (pid != null && Number(r.patientId) !== Number(pid)) {
        return false;
      }
      const d = parseIsoDate(r.dateRendezVous);
      if (from && d && d < from) {
        return false;
      }
      if (to && d && d > to) {
        return false;
      }
      return true;
    });
  });

  /** L’API a renvoyé des lignes mais le filtre client (dates / patient) les a tous exclus. */
  readonly listeFiltreExcludeTout = computed(
    () => !this.listLoading() && this.rdvRows().length > 0 && this.filteredRows().length === 0
  );

  readonly calendarWeekDays = computed(() => {
    const start = this.weekStart();
    const out: {
      date: Date;
      iso: string;
      label: string;
      shortLabel: string;
      dom: string;
      monthShort: string;
    }[] = [];
    const dowFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
    const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
    for (let i = 0; i < 7; i++) {
      const d = addDaysDate(start, i);
      const dol = dowFmt.format(d);
      out.push({
        date: d,
        iso: toIsoDate(d),
        label: dol,
        shortLabel: dol.replace(/\.$/, ''),
        dom: String(d.getDate()),
        monthShort: monthFmt.format(d).replace(/\.$/, '')
      });
    }
    return out;
  });

  /** Plage horaire affichée (créneaux du matin / après-midi). */
  readonly calHourStart = 8;
  readonly calHourEnd = 19;

  readonly calHeaderMonth = signal(new Date().getMonth());
  readonly calHeaderYear = signal(new Date().getFullYear());

  readonly moisOptions = [
    'Janvier',
    'Février',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juillet',
    'Août',
    'Septembre',
    'Octobre',
    'Novembre',
    'Décembre'
  ];

  readonly anneeOptions: number[] = Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 10 + i);

  readonly miniCalWeekdayLabels = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];

  readonly miniCalCells = computed(() => {
    const y = this.calHeaderYear();
    const m = this.calHeaderMonth();
    const first = new Date(y, m, 1);
    const startPad = first.getDay();
    const dim = new Date(y, m + 1, 0).getDate();
    const prevDim = new Date(y, m, 0).getDate();
    const w0 = this.weekStart();
    const w6 = addDaysDate(w0, 6);
    const w0iso = toIsoDate(w0);
    const w6iso = toIsoDate(w6);
    const today = todayIso();

    const cells: {
      iso: string;
      dom: string;
      inMonth: boolean;
      isToday: boolean;
      inSelectedWeek: boolean;
      date: Date;
    }[] = [];

    for (let i = 0; i < startPad; i++) {
      const day = prevDim - startPad + i + 1;
      const d = new Date(y, m - 1, day);
      const iso = toIsoDate(d);
      cells.push({
        date: d,
        iso,
        dom: String(day),
        inMonth: false,
        isToday: iso === today,
        inSelectedWeek: iso >= w0iso && iso <= w6iso
      });
    }
    for (let day = 1; day <= dim; day++) {
      const d = new Date(y, m, day);
      const iso = toIsoDate(d);
      cells.push({
        date: d,
        iso,
        dom: String(day),
        inMonth: true,
        isToday: iso === today,
        inSelectedWeek: iso >= w0iso && iso <= w6iso
      });
    }
    while (cells.length % 7 !== 0) {
      const prev = cells[cells.length - 1];
      const d = addDaysDate(prev.date, 1);
      const iso = toIsoDate(d);
      cells.push({
        date: d,
        iso,
        dom: String(d.getDate()),
        inMonth: false,
        isToday: iso === today,
        inSelectedWeek: iso >= w0iso && iso <= w6iso
      });
    }
    return cells;
  });

  readonly miniCalTitle = computed(() => {
    return `${this.moisOptions[this.calHeaderMonth()]} ${this.calHeaderYear()}`;
  });

  readonly weekRangeLabel = computed(() => {
    const start = this.weekStart();
    const end = addDaysDate(start, 6);
    const fmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    return `${fmt.format(start)} – ${fmt.format(end)}`;
  });

  readonly rdvsByDay = computed(() => {
    const rows = this.calendarRows();
    const pid = this.filterPatientId();
    const map = new Map<string, AdminRendezVousPlanningItem[]>();
    for (const r of rows) {
      if (pid != null && Number(r.patientId) !== Number(pid)) {
        continue;
      }
      const iso = parseIsoDate(r.dateRendezVous);
      if (!iso) {
        continue;
      }
      if (!map.has(iso)) {
        map.set(iso, []);
      }
      map.get(iso)!.push(r);
    }
    for (const list of map.values()) {
      list.sort(compareHeureDebut);
    }
    return map;
  });

  readonly selectedRdvDetail = computed((): AdminRendezVousPlanningItem | null => {
    const id = this.selectedId();
    if (id == null) {
      return null;
    }
    return (
      this.calendarRows().find((x) => x.id === id) ??
      this.rdvRows().find((x) => x.id === id) ??
      null
    );
  });

  ngOnInit(): void {
    this.medecinPortal.getMesPatients().subscribe({
      next: (list) => {
        this.patients.set(list ?? []);
      },
      error: () => this.toast.show('Liste des patients indisponible.', 'error')
    });

    this.ctx.resolveMedecinId().subscribe((id) => {
      this.medecinId.set(id);
      this.loadMeta.set(false);
      if (id == null) {
        this.toast.show('Profil médecin introuvable. Reconnectez-vous.', 'error');
        this.listLoading.set(false);
        return;
      }
      this.reloadRendezVous();
      this.reloadCalendar();
      this.syncHeaderFromWeek();
    });
  }

  private syncHeaderFromWeek(): void {
    const mid = addDaysDate(this.weekStart(), 3);
    this.calHeaderMonth.set(mid.getMonth());
    this.calHeaderYear.set(mid.getFullYear());
  }

  setViewMode(mode: 'liste' | 'calendrier'): void {
    this.viewMode.set(mode);
    this.selectedId.set(null);
    if (mode === 'calendrier') {
      this.syncHeaderFromWeek();
      this.reloadCalendar();
    }
  }

  prevWeek(): void {
    this.weekStart.update((d) => addDaysDate(d, -7));
    this.syncHeaderFromWeek();
    this.reloadCalendar();
  }

  nextWeek(): void {
    this.weekStart.update((d) => addDaysDate(d, 7));
    this.syncHeaderFromWeek();
    this.reloadCalendar();
  }

  goThisWeek(): void {
    this.weekStart.set(startOfWeekSunday(new Date()));
    this.syncHeaderFromWeek();
    this.reloadCalendar();
  }

  rdvsPourJour(iso: string): AdminRendezVousPlanningItem[] {
    return this.rdvsByDay().get(iso) ?? [];
  }

  calendarHourTicks(): number[] {
    const out: number[] = [];
    for (let h = this.calHourStart; h < this.calHourEnd; h++) {
      out.push(h);
    }
    return out;
  }

  eventGridStyle(r: AdminRendezVousPlanningItem): Record<string, string> {
    const pos = this.computeEventPosition(r);
    if (!pos) {
      return { display: 'none' };
    }
    return {
      top: `${pos.top}%`,
      height: `${pos.height}%`
    };
  }

  private computeEventPosition(
    r: AdminRendezVousPlanningItem
  ): { top: number; height: number } | null {
    const startM = timeToMinutes(r.heureDebut);
    let endM = timeToMinutes(r.heureFin);
    if (endM <= startM) {
      endM = startM + 30;
    }
    const g0 = this.calHourStart * 60;
    const g1 = this.calHourEnd * 60;
    if (endM <= g0 || startM >= g1) {
      return null;
    }
    const clampedStart = Math.max(startM, g0);
    const clampedEnd = Math.min(endM, g1);
    const total = g1 - g0;
    const top = ((clampedStart - g0) / total) * 100;
    const height = Math.max(((clampedEnd - clampedStart) / total) * 100, 3);
    return { top, height };
  }

  miniCalPrevMonth(): void {
    let m = this.calHeaderMonth();
    let y = this.calHeaderYear();
    m--;
    if (m < 0) {
      m = 11;
      y--;
    }
    this.calHeaderMonth.set(m);
    this.calHeaderYear.set(y);
    this.weekStart.set(startOfWeekSunday(new Date(y, m, 15)));
    this.reloadCalendar();
  }

  miniCalNextMonth(): void {
    let m = this.calHeaderMonth();
    let y = this.calHeaderYear();
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
    this.calHeaderMonth.set(m);
    this.calHeaderYear.set(y);
    this.weekStart.set(startOfWeekSunday(new Date(y, m, 15)));
    this.reloadCalendar();
  }

  jumpToMiniDay(d: Date): void {
    this.weekStart.set(startOfWeekSunday(d));
    this.syncHeaderFromWeek();
    this.reloadCalendar();
  }

  onHeaderMonthSelect(index: number | string): void {
    const m = typeof index === 'string' ? parseInt(index, 10) : index;
    const y = this.calHeaderYear();
    this.calHeaderMonth.set(m);
    this.weekStart.set(startOfWeekSunday(new Date(y, m, 15)));
    this.reloadCalendar();
  }

  onHeaderYearSelect(y: number | string): void {
    const year = typeof y === 'string' ? parseInt(y, 10) : y;
    const m = this.calHeaderMonth();
    this.calHeaderYear.set(year);
    this.weekStart.set(startOfWeekSunday(new Date(year, m, 15)));
    this.reloadCalendar();
  }

  exportCalendarPrint(): void {
    globalThis.print();
  }

  onFilterStatutChange(value: string): void {
    const v = STATUT_FILTRE_VALUES.find((x) => x === value);
    if (v != null) {
      this.filterStatut.set(v);
    }
    this.reloadRendezVous();
    this.reloadCalendar();
  }

  reloadRendezVous(): void {
    const medId = this.medecinId();
    if (!medId) {
      this.rdvRows.set([]);
      this.listLoading.set(false);
      return;
    }
    this.listLoading.set(true);
    const statut = this.filterStatut();
    const s = statut === 'TOUS' ? null : statut;
    this.adminRdv.listGestion(s).subscribe({
      next: (rows) => {
        const filtered = (rows ?? []).filter((r) => Number(r.medecinId) === Number(medId));
        this.rdvRows.set(filtered);
        this.listLoading.set(false);
      },
      error: () => {
        this.rdvRows.set([]);
        this.listLoading.set(false);
        this.toast.show('Rendez-vous indisponibles.', 'error');
      }
    });
  }

  reloadCalendar(): void {
    const medId = this.medecinId();
    if (!medId) {
      this.calendarRows.set([]);
      this.calendarLoading.set(false);
      return;
    }
    this.calendarLoading.set(true);
    const start = this.weekStart();
    const end = addDaysDate(start, 6);
    const st = this.filterStatut();
    const opts = st === 'TOUS' ? undefined : { statut: st };
    this.adminRdv.listPlanning(toIsoDate(start), toIsoDate(end), medId, opts).subscribe({
      next: (rows) => {
        this.calendarRows.set(rows ?? []);
        this.calendarLoading.set(false);
      },
      error: () => {
        this.calendarRows.set([]);
        this.calendarLoading.set(false);
        this.toast.show('Planning indisponible.', 'error');
      }
    });
  }

  toggleDetails(id: number): void {
    this.selectedId.set(this.selectedId() === id ? null : id);
  }

  closeRdvDetail(): void {
    this.selectedId.set(null);
  }

  formatDate(value: string | number[] | Record<string, unknown>): string {
    const iso = parseIsoDate(value);
    if (!iso) {
      return '—';
    }
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  formatTime(value: string | number[] | Record<string, unknown>): string {
    if (typeof value === 'string') {
      return value.slice(0, 5);
    }
    if (Array.isArray(value) && value.length >= 2) {
      const [h, m] = value;
      if (typeof h === 'number' && typeof m === 'number') {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
    }
    return '—';
  }

  statutLabel(value: string): string {
    switch (value) {
      case 'CONFIRME':
        return 'Confirmé';
      case 'ANNULE':
        return 'Annulé';
      case 'TERMINE':
        return 'Terminé';
      default:
        return 'En attente';
    }
  }

  isTodayIso(iso: string): boolean {
    return iso === todayIso();
  }

  refreshAll(): void {
    this.reloadRendezVous();
    this.reloadCalendar();
  }

  /** Remet les filtres liste sur une large période et tous les patients. */
  resetFiltresListe(): void {
    this.filterPatientId.set(null);
    this.filterFrom.set(isoOffset(-730));
    this.filterTo.set(isoOffset(730));
    this.filterStatut.set('TOUS');
    this.reloadRendezVous();
    this.reloadCalendar();
  }
}
