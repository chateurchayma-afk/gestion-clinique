import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/toast.service';
import {
  AdminRendezVousCreatePayload,
  AdminRendezVousPlanningItem,
  AdminRendezVousService
} from '../../../services/admin-rendez-vous.service';
import { Medecin, MedecinService } from '../../../services/medecin.service';
import { Patient, PatientService } from '../../../services/patient.service';
import type { ModeConsultation } from '../../../services/rendez-vous-patient.service';

const PALETTE = ['#d1fae5', '#dbeafe', '#ffe4e6', '#ffedd5'];
const PALETTE_ACCENT = ['#059669', '#2563eb', '#e11d48', '#c2410c'];

/** Dimanche = premier jour de la semaine affichée. */
function startOfWeekSunday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
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

/** `yyyy-MM-dd` → date locale (midi pour éviter les décalages fuseau). */
function parseIsoToLocalDate(iso: string): Date {
  const [y, mo, d] = iso.split('-').map((x) => parseInt(x, 10));
  return new Date(y, mo - 1, d, 12, 0, 0, 0);
}

/** Date API (Jackson string, tableau ou objet Java 8 time). */
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

@Component({
  selector: 'app-planning-medecins',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './planning-medecins.html',
  styleUrls: ['../admin-dashboard/admin-dashboard.css', './planning-medecins.css']
})
export class PlanningMedecins implements OnInit {
  private readonly adminRdv = inject(AdminRendezVousService);
  private readonly medecinService = inject(MedecinService);
  private readonly patientService = inject(PatientService);
  private readonly toast = inject(ToastService);

  readonly START_HOUR = 8;
  readonly END_HOUR = 18;
  readonly hourTicks: number[] = [];

  weekStart = signal<Date>(startOfWeekSunday(new Date()));
  headerMonth = signal(new Date().getMonth());
  headerYear = signal(new Date().getFullYear());

  calendarMonth = signal(new Date().getMonth());
  calendarYear = signal(new Date().getFullYear());

  filterMedecinId = signal<number | null>(null);
  rdvs = signal<AdminRendezVousPlanningItem[]>([]);
  loadingRdvs = signal(false);
  medecins = signal<Medecin[]>([]);
  patients = signal<Patient[]>([]);
  loadingRefs = signal(true);

  showAddModal = signal(false);
  /** Détail d’un créneau (clic sur le calendrier). */
  selectedRdv = signal<AdminRendezVousPlanningItem | null>(null);
  exportMenuOpen = signal(false);
  submitting = signal(false);

  formPatientId: number | null = null;
  formMedecinId: number | null = null;
  formDate = '';
  formHeureDebut = '09:00';
  formHeureFin = '';
  formMode: ModeConsultation = 'PRESENTIEL';
  formMotif = '';

  readonly headerYears = [2024, 2025, 2026, 2027, 2028];

  readonly monthNames = [
    'Jan',
    'Fév',
    'Mar',
    'Avr',
    'Mai',
    'Juin',
    'Juil',
    'Août',
    'Sep',
    'Oct',
    'Nov',
    'Déc'
  ];

  readonly weekDays = computed(() => {
    const start = this.weekStart();
    const out: { date: Date; iso: string; label: string; sub: string }[] = [];
    const fmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
    for (let i = 0; i < 7; i++) {
      const d = addDays(start, i);
      const iso = toIsoDate(d);
      const label = fmt.format(d);
      const sub = `${d.getDate()}`;
      out.push({ date: d, iso, label, sub });
    }
    return out;
  });

  readonly miniCalendarCells = computed(() => {
    const y = this.calendarYear();
    const m = this.calendarMonth();
    const first = new Date(y, m, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: { day: number | null; inMonth: boolean }[] = [];
    for (let i = 0; i < startPad; i++) {
      cells.push({ day: null, inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, inMonth: true });
    }
    while (cells.length % 7 !== 0 || cells.length < 42) {
      cells.push({ day: null, inMonth: false });
    }
    return cells;
  });

  readonly weekIsoSet = computed(() => new Set(this.weekDays().map((d) => d.iso)));

  readonly rdvCountWeek = computed(() => this.rdvs().length);

  constructor() {
    for (let h = this.START_HOUR; h < this.END_HOUR; h++) {
      this.hourTicks.push(h);
    }
  }

  ngOnInit(): void {
    this.syncHeaderFromWeek();
    this.syncCalendarFromWeek();
    this.loadRefs();
    this.bootstrapPlanningWeek();
  }

  /**
   * Charge une fenêtre large de RDV pour placer la semaine affichée sur la première date
   * à venir (ex. réservations patient en mai alors qu’on est encore en avril).
   */
  private bootstrapPlanningWeek(): void {
    const todayIso = toIsoDate(new Date());
    const wideStart = startOfWeekSunday(addDays(new Date(), -14));
    const wideEnd = addDays(wideStart, 98);
    const mid = this.filterMedecinId();
    this.loadingRdvs.set(true);
    this.adminRdv.listPlanning(toIsoDate(wideStart), toIsoDate(wideEnd), mid, { statut: 'CONFIRME' }).subscribe({
      next: (rows) => {
        const anchor = this.weekStartForFirstUpcomingRdv(rows, todayIso);
        if (anchor != null) {
          this.weekStart.set(anchor);
          this.syncHeaderFromWeek();
          this.syncCalendarFromWeek();
        }
        this.loadPlanning();
      },
      error: (err) => {
        this.loadingRdvs.set(false);
        this.toast.show(this.planningErrorMessage(err), 'error');
        this.loadPlanning(true);
      }
    });
  }

  /** Première date de RDV >= aujourd’hui → dimanche de cette semaine ; sinon null. */
  private weekStartForFirstUpcomingRdv(rows: AdminRendezVousPlanningItem[], todayIso: string): Date | null {
    const dates = [
      ...new Set(rows.map((r) => normalizeApiDate(r.dateRendezVous)).filter((d) => d.length >= 10))
    ].sort();
    const firstUpcoming = dates.find((d) => d >= todayIso);
    if (!firstUpcoming) {
      return null;
    }
    return startOfWeekSunday(parseIsoToLocalDate(firstUpcoming));
  }

  private loadRefs(): void {
    this.loadingRefs.set(true);
    let pending = 2;
    const done = (): void => {
      pending -= 1;
      if (pending === 0) {
        this.loadingRefs.set(false);
      }
    };
    this.medecinService.getAllMedecins().subscribe({
      next: (rows) => {
        this.medecins.set(rows);
        done();
      },
      error: () => {
        this.toast.show('Impossible de charger les médecins.', 'error');
        done();
      }
    });
    this.patientService.getAllPatients().subscribe({
      next: (rows) => {
        this.patients.set(rows);
        done();
      },
      error: () => {
        this.toast.show('Impossible de charger les patients.', 'error');
        done();
      }
    });
  }

  loadPlanning(suppressErrorToast = false): void {
    const ws = this.weekStart();
    const end = addDays(ws, 6);
    const mid = this.filterMedecinId();
    this.loadingRdvs.set(true);
    this.adminRdv.listPlanning(toIsoDate(ws), toIsoDate(end), mid, { statut: 'CONFIRME' }).subscribe({
      next: (rows) => {
        this.rdvs.set(rows);
        this.loadingRdvs.set(false);
      },
      error: (err) => {
        this.rdvs.set([]);
        this.loadingRdvs.set(false);
        if (!suppressErrorToast) {
          this.toast.show(this.planningErrorMessage(err), 'error');
        }
      }
    });
  }

  private planningErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { message?: string } | null;
      if (typeof body?.message === 'string' && body.message.trim()) {
        return body.message;
      }
      if (err.status === 0) {
        return 'Serveur injoignable (vérifiez que le backend tourne, ex. port 8081).';
      }
      return `Impossible de charger le planning (erreur ${err.status}).`;
    }
    return 'Impossible de charger le planning.';
  }

  labelStatutRdv(statut: string): string {
    switch (statut) {
      case 'EN_ATTENTE':
        return 'En attente';
      case 'CONFIRME':
        return 'Confirmé';
      case 'ANNULE':
        return 'Annulé';
      case 'TERMINE':
        return 'Terminé';
      default:
        return statut;
    }
  }

  /** Même date `yyyy-MM-dd` que dans « Mes rendez-vous » patient. */
  rdvDateIso(r: AdminRendezVousPlanningItem): string {
    return normalizeApiDate(r.dateRendezVous);
  }

  rdvsForDay(iso: string): AdminRendezVousPlanningItem[] {
    return this.rdvs().filter((r) => normalizeApiDate(r.dateRendezVous) === iso);
  }

  layoutDay(iso: string): Array<{ raw: AdminRendezVousPlanningItem; lane: number; lanes: number }> {
    const items = this.rdvsForDay(iso);
    if (items.length === 0) {
      return [];
    }
    const sorted = [...items].sort(
      (a, b) => this.minutesFromDayStart(a.heureDebut) - this.minutesFromDayStart(b.heureDebut)
    );
    type Active = { end: number; lane: number };
    let active: Active[] = [];
    const out: Array<{ raw: AdminRendezVousPlanningItem; lane: number; lanes: number }> = [];
    let maxLane = 0;
    for (const raw of sorted) {
      const s = this.minutesFromDayStart(raw.heureDebut);
      const e = this.minutesFromDayStart(raw.heureFin);
      active = active.filter((a) => a.end > s);
      const used = new Set(active.map((a) => a.lane));
      let lane = 0;
      while (used.has(lane)) {
        lane += 1;
      }
      active.push({ end: e, lane });
      maxLane = Math.max(maxLane, lane);
      out.push({ raw, lane, lanes: 0 });
    }
    const lanes = maxLane + 1;
    return out.map((o) => ({ ...o, lanes }));
  }

  eventStyle(raw: AdminRendezVousPlanningItem, lane: number, lanes: number): Record<string, string> {
    const s = this.minutesFromDayStart(raw.heureDebut);
    const e = this.minutesFromDayStart(raw.heureFin);
    const dayStart = this.START_HOUR * 60;
    const dayEnd = this.END_HOUR * 60;
    const total = dayEnd - dayStart;
    const top = ((s - dayStart) / total) * 100;
    const h = ((e - s) / total) * 100;
    const w = 100 / lanes;
    const left = lane * w;
    return {
      top: `${top}%`,
      height: `${Math.max(h, 2.5)}%`,
      left: `${left}%`,
      width: `${w}%`
    };
  }

  cardColor(medecinId: number): string {
    return PALETTE[Math.abs(medecinId) % PALETTE.length];
  }

  accentColor(medecinId: number): string {
    return PALETTE_ACCENT[Math.abs(medecinId) % PALETTE_ACCENT.length];
  }

  openRdvDetails(r: AdminRendezVousPlanningItem): void {
    this.showAddModal.set(false);
    this.selectedRdv.set(r);
  }

  closeRdvDetails(): void {
    this.selectedRdv.set(null);
  }

  labelMode(m: string | null | undefined): string {
    const u = (m ?? '').toString().trim().toUpperCase();
    if (u === 'ONLINE') {
      return 'En ligne';
    }
    if (u === 'PRESENTIEL') {
      return 'Présentiel';
    }
    return m || '—';
  }

  formatDateLong(r: AdminRendezVousPlanningItem): string {
    const iso = this.rdvDateIso(r);
    if (iso.length < 10) {
      return iso;
    }
    const d = parseIsoToLocalDate(iso);
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(d);
  }

  motifOuDefaut(m: string | null | undefined): string {
    const s = (m ?? '').trim();
    return s.length > 0 ? s : 'Aucun motif renseigné';
  }

  /** Hauteur du bloc en % de la grille horaire (pour compacter l’affichage). */
  slotHeightPercent(raw: AdminRendezVousPlanningItem): number {
    const s = this.minutesFromDayStart(raw.heureDebut);
    const e = this.minutesFromDayStart(raw.heureFin);
    const dayStart = this.START_HOUR * 60;
    const dayEnd = this.END_HOUR * 60;
    const total = dayEnd - dayStart;
    if (total <= 0 || e <= s) {
      return 0;
    }
    return ((e - s) / total) * 100;
  }

  prevWeek(): void {
    this.weekStart.update((d) => addDays(d, -7));
    this.syncHeaderFromWeek();
    this.syncCalendarFromWeek();
    this.loadPlanning();
  }

  nextWeek(): void {
    this.weekStart.update((d) => addDays(d, 7));
    this.syncHeaderFromWeek();
    this.syncCalendarFromWeek();
    this.loadPlanning();
  }

  /** Affiche la semaine calendaire contenant aujourd’hui (même logique que les réservations patient). */
  goToThisWeek(): void {
    this.weekStart.set(startOfWeekSunday(new Date()));
    this.syncHeaderFromWeek();
    this.syncCalendarFromWeek();
    this.loadPlanning();
  }

  onHeaderDateApply(): void {
    const first = new Date(this.headerYear(), this.headerMonth(), 1);
    this.weekStart.set(startOfWeekSunday(first));
    this.syncCalendarFromWeek();
    this.loadPlanning();
  }

  onSelectMedecinFilter(id: unknown): void {
    let v: number | null = null;
    if (typeof id === 'number' && !Number.isNaN(id)) {
      v = id;
    } else if (typeof id === 'string' && id !== '' && !Number.isNaN(Number(id))) {
      v = Number(id);
    }
    this.filterMedecinId.set(v);
    this.loadPlanning();
  }

  miniPrevMonth(): void {
    let m = this.calendarMonth();
    let y = this.calendarYear();
    if (m === 0) {
      m = 11;
      y -= 1;
    } else {
      m -= 1;
    }
    this.calendarMonth.set(m);
    this.calendarYear.set(y);
  }

  miniNextMonth(): void {
    let m = this.calendarMonth();
    let y = this.calendarYear();
    if (m === 11) {
      m = 0;
      y += 1;
    } else {
      m += 1;
    }
    this.calendarMonth.set(m);
    this.calendarYear.set(y);
  }

  pickMiniDay(day: number): void {
    const d = new Date(this.calendarYear(), this.calendarMonth(), day);
    this.weekStart.set(startOfWeekSunday(d));
    this.syncHeaderFromWeek();
    this.loadPlanning();
  }

  isMiniSelected(day: number): boolean {
    const d = new Date(this.calendarYear(), this.calendarMonth(), day);
    return this.weekIsoSet().has(toIsoDate(d));
  }

  openAddModal(): void {
    this.selectedRdv.set(null);
    const today = toIsoDate(new Date());
    this.formPatientId = this.patients()[0]?.id ?? null;
    const m = this.medecins().find((x) => x.statutValidation === 'VALIDE') ?? this.medecins()[0];
    this.formMedecinId = m?.id ?? null;
    this.formDate = today;
    this.formHeureDebut = '09:00';
    this.formHeureFin = '';
    this.formMode = 'PRESENTIEL';
    this.formMotif = '';
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
  }

  submitAdd(): void {
    if (!this.formPatientId || !this.formMedecinId || !this.formDate || !this.formHeureDebut.trim()) {
      this.toast.show('Patient, médecin, date et heure de début sont obligatoires.', 'error');
      return;
    }
    const body: AdminRendezVousCreatePayload = {
      patientId: this.formPatientId,
      medecinId: this.formMedecinId,
      dateRendezVous: this.formDate,
      heureDebut: this.normalizeTime(this.formHeureDebut),
      modeConsultation: this.formMode,
      motif: this.formMotif.trim() || null
    };
    const fin = this.formHeureFin.trim();
    if (fin.length > 0) {
      body.heureFin = this.normalizeTime(fin);
    }
    this.submitting.set(true);
    this.adminRdv.create(body).subscribe({
      next: () => {
        this.submitting.set(false);
        this.toast.show('Rendez-vous créé.', 'success');
        this.closeAddModal();
        this.loadPlanning();
      },
      error: (err) => {
        this.submitting.set(false);
        const msg =
          typeof err?.error?.message === 'string' ? err.error.message : 'Création impossible.';
        this.toast.show(msg, 'error');
      }
    });
  }

  exportCsv(): void {
    this.exportMenuOpen.set(false);
    const rows = this.rdvs();
    const header = [
      'id',
      'date',
      'debut',
      'fin',
      'patient',
      'medecin',
      'statut',
      'mode'
    ].join(',');
    const lines = rows.map((r) => {
      const p = `"${r.patientPrenom} ${r.patientNom}"`.replace(/""/g, '""');
      const m = `"Dr ${r.medecinPrenom} ${r.medecinNom}"`.replace(/""/g, '""');
      return [
        r.id,
        normalizeApiDate(r.dateRendezVous),
        this.normalizeHeureAffichage(r.heureDebut),
        this.normalizeHeureAffichage(r.heureFin),
        p,
        m,
        r.statut,
        r.modeConsultation
      ].join(',');
    });
    const csv = '\uFEFF' + [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planning-medecins-${toIsoDate(this.weekStart())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  toggleExportMenu(): void {
    this.exportMenuOpen.update((v) => !v);
  }

  trackHour(h: number): number {
    return h;
  }

  formatHourLabel(h: number): string {
    const d = new Date();
    d.setHours(h, 0, 0, 0);
    return new Intl.DateTimeFormat('fr-FR', { hour: 'numeric', minute: '2-digit' }).format(d);
  }

  minutesFromDayStart(raw: unknown): number {
    const t = this.normalizeHeureAffichage(raw);
    const [hh, mm] = t.split(':').map((x) => parseInt(x, 10));
    return (hh ?? 0) * 60 + (mm ?? 0);
  }

  normalizeHeureAffichage(raw: unknown): string {
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

  private normalizeTime(t: string): string {
    const s = t.trim();
    if (s.length === 5) {
      return `${s}:00`;
    }
    return s.length >= 8 ? s.slice(0, 8) : s;
  }

  private syncHeaderFromWeek(): void {
    const w = this.weekStart();
    this.headerMonth.set(w.getMonth());
    this.headerYear.set(w.getFullYear());
  }

  private syncCalendarFromWeek(): void {
    const w = this.weekStart();
    this.calendarMonth.set(w.getMonth());
    this.calendarYear.set(w.getFullYear());
  }

  medecinsPlanningOptions(): Medecin[] {
    return this.medecins().filter((m) => m.statutValidation === 'VALIDE');
  }
}
