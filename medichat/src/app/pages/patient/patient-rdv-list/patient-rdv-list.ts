import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import * as QRCode from 'qrcode';
import { apiErrorMessage } from '../../../core/api-error-message';
import { encodeRendezVousQrUrl } from '../../../core/rendez-vous-qr-codec';
import { ToastService } from '../../../core/toast.service';
import { environment } from '../../../../environments/environment';
import { CreneauJour, MedecinService } from '../../../services/medecin.service';
import { PatientProfilService } from '../../../services/patient-profil.service';
import {
  RendezVousPatient,
  RendezVousPatientService,
  StatutRendezVous
} from '../../../services/rendez-vous-patient.service';

function parseIsoToLocalDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfWeekSunday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDaysDate(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseRdvIsoDate(r: RendezVousPatient): string {
  return (r.dateRendezVous ?? '').slice(0, 10);
}

function compareHeurePatient(a: RendezVousPatient, b: RendezVousPatient): number {
  return (a.heureDebut ?? '').slice(0, 8).localeCompare((b.heureDebut ?? '').slice(0, 8));
}

function timeToMins(value: string): number {
  const p = (value ?? '').split(':').map((x) => parseInt(x, 10));
  if (p.length >= 2 && p.every((x) => !isNaN(x))) return p[0] * 60 + p[1];
  return 9 * 60;
}

@Component({
  selector: 'app-patient-rdv-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './patient-rdv-list.html',
  styleUrls: ['./patient-rdv-list.css', '../patient-pro.css']
})
export class PatientRdvList implements OnInit {
  private readonly rdvService = inject(RendezVousPatientService);
  private readonly profilService = inject(PatientProfilService);
  private readonly medecinService = inject(MedecinService);
  private readonly toast = inject(ToastService);

  readonly rdvs = signal<RendezVousPatient[]>([]);
  readonly loading = signal(true);
  readonly cancellingId = signal<number | null>(null);
  readonly reportingId = signal<number | null>(null);
  readonly selectedRdv = signal<RendezVousPatient | null>(null);
  readonly qrRdv = signal<RendezVousPatient | null>(null);
  readonly qrCodeDataUrl = signal<string>('');
  readonly qrGenerating = signal(false);
  readonly patientLabel = signal('Patient');
  readonly reportRdv = signal<RendezVousPatient | null>(null);
  readonly creneaux = signal<CreneauJour[]>([]);
  readonly loadingCreneaux = signal(false);

  readonly viewMode = signal<'liste' | 'calendrier'>('calendrier');
  readonly weekStart = signal<Date>(startOfWeekSunday(new Date()));
  readonly filterStatut = signal<StatutRendezVous | 'TOUS'>('TOUS');
  readonly calHeaderMonth = signal(new Date().getMonth());
  readonly calHeaderYear = signal(new Date().getFullYear());

  readonly calHourStart = 8;
  readonly calHourEnd = 19;

  readonly moisOptions = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  readonly anneeOptions: number[] = Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 10 + i);
  readonly miniCalWeekdayLabels = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];

  reportDate = '';
  reportHeureDebut = '';
  reportHeureFin = '';

  readonly slotsReport = computed((): (string | number[])[] => {
    const d = this.reportDate;
    if (!d) return [];
    const jour = this.creneaux().find((c) => c.date === d);
    return jour?.heuresDebut ?? [];
  });

  readonly calendarWeekDays = computed(() => {
    const start = this.weekStart();
    const out: { date: Date; iso: string; label: string; shortLabel: string; dom: string; monthShort: string }[] = [];
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

  readonly weekRangeLabel = computed(() => {
    const start = this.weekStart();
    const end = addDaysDate(start, 6);
    const fmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    return `${fmt.format(start)} – ${fmt.format(end)}`;
  });

  readonly rdvsByDay = computed(() => {
    const statut = this.filterStatut();
    const map = new Map<string, RendezVousPatient[]>();
    for (const r of this.rdvs()) {
      if (statut !== 'TOUS' && r.statut !== statut) continue;
      const iso = parseRdvIsoDate(r);
      if (!iso) continue;
      if (!map.has(iso)) map.set(iso, []);
      map.get(iso)!.push(r);
    }
    for (const list of map.values()) list.sort(compareHeurePatient);
    return map;
  });

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

    const cells: { iso: string; dom: string; inMonth: boolean; isToday: boolean; inSelectedWeek: boolean; date: Date }[] = [];
    for (let i = 0; i < startPad; i++) {
      const day = prevDim - startPad + i + 1;
      const d = new Date(y, m - 1, day);
      const iso = toIsoDate(d);
      cells.push({ date: d, iso, dom: String(day), inMonth: false, isToday: iso === today, inSelectedWeek: iso >= w0iso && iso <= w6iso });
    }
    for (let day = 1; day <= dim; day++) {
      const d = new Date(y, m, day);
      const iso = toIsoDate(d);
      cells.push({ date: d, iso, dom: String(day), inMonth: true, isToday: iso === today, inSelectedWeek: iso >= w0iso && iso <= w6iso });
    }
    while (cells.length % 7 !== 0) {
      const prev = cells[cells.length - 1];
      const d = addDaysDate(prev.date, 1);
      const iso = toIsoDate(d);
      cells.push({ date: d, iso, dom: String(d.getDate()), inMonth: false, isToday: iso === today, inSelectedWeek: iso >= w0iso && iso <= w6iso });
    }
    return cells;
  });

  readonly miniCalTitle = computed(() => `${this.moisOptions[this.calHeaderMonth()]} ${this.calHeaderYear()}`);

  ngOnInit(): void {
    this.reload();
    this.profilService.getProfil().subscribe({
      next: (p) => {
        const name = `${p.utilisateur.prenom} ${p.utilisateur.nom}`.trim();
        this.patientLabel.set(name || 'Patient');
      },
      error: () => this.patientLabel.set('Patient')
    });
  }

  private syncHeaderFromWeek(): void {
    const mid = addDaysDate(this.weekStart(), 3);
    this.calHeaderMonth.set(mid.getMonth());
    this.calHeaderYear.set(mid.getFullYear());
  }

  setViewMode(mode: 'liste' | 'calendrier'): void {
    this.viewMode.set(mode);
    if (mode === 'calendrier') this.syncHeaderFromWeek();
  }

  prevWeek(): void {
    this.weekStart.update((d) => addDaysDate(d, -7));
    this.syncHeaderFromWeek();
  }

  nextWeek(): void {
    this.weekStart.update((d) => addDaysDate(d, 7));
    this.syncHeaderFromWeek();
  }

  goThisWeek(): void {
    this.weekStart.set(startOfWeekSunday(new Date()));
    this.syncHeaderFromWeek();
  }

  miniCalPrevMonth(): void {
    let m = this.calHeaderMonth();
    let y = this.calHeaderYear();
    if (--m < 0) { m = 11; y--; }
    this.calHeaderMonth.set(m);
    this.calHeaderYear.set(y);
    this.weekStart.set(startOfWeekSunday(new Date(y, m, 15)));
  }

  miniCalNextMonth(): void {
    let m = this.calHeaderMonth();
    let y = this.calHeaderYear();
    if (++m > 11) { m = 0; y++; }
    this.calHeaderMonth.set(m);
    this.calHeaderYear.set(y);
    this.weekStart.set(startOfWeekSunday(new Date(y, m, 15)));
  }

  jumpToMiniDay(d: Date): void {
    this.weekStart.set(startOfWeekSunday(d));
    this.syncHeaderFromWeek();
  }

  calendarHourTicks(): number[] {
    const out: number[] = [];
    for (let h = this.calHourStart; h < this.calHourEnd; h++) out.push(h);
    return out;
  }

  eventGridStyle(r: RendezVousPatient): Record<string, string> {
    const startM = timeToMins(r.heureDebut ?? '');
    let endM = timeToMins(r.heureFin ?? '');
    if (endM <= startM) endM = startM + 30;
    const g0 = this.calHourStart * 60;
    const g1 = this.calHourEnd * 60;
    if (endM <= g0 || startM >= g1) return { display: 'none' };
    const clampedStart = Math.max(startM, g0);
    const clampedEnd = Math.min(endM, g1);
    const total = g1 - g0;
    const top = ((clampedStart - g0) / total) * 100;
    const height = Math.max(((clampedEnd - clampedStart) / total) * 100, 3);
    return { top: `${top}%`, height: `${height}%` };
  }

  rdvsPourJour(iso: string): RendezVousPatient[] {
    return this.rdvsByDay().get(iso) ?? [];
  }

  isTodayIso(iso: string): boolean {
    return iso === todayIso();
  }

  onHeaderMonthSelect(index: number | string): void {
    const m = typeof index === 'string' ? parseInt(index, 10) : index;
    this.calHeaderMonth.set(m);
    this.weekStart.set(startOfWeekSunday(new Date(this.calHeaderYear(), m, 15)));
  }

  onHeaderYearSelect(y: number | string): void {
    const year = typeof y === 'string' ? parseInt(y, 10) : y;
    this.calHeaderYear.set(year);
    this.weekStart.set(startOfWeekSunday(new Date(year, this.calHeaderMonth(), 15)));
  }

  exportCsv(): void {
    const rows = this.rdvs();
    if (!rows.length) { this.toast.show('Aucun rendez-vous à exporter.', 'error'); return; }
    const esc = (v: unknown): string => {
      const s = String(v ?? '').replace(/"/g, '""');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
    };
    const header = ['Date', 'Heure début', 'Heure fin', 'Médecin', 'Spécialité', 'Statut'];
    const lines = rows.map((r) => [
      esc(this.formatDateCourt(r)), esc(this.formatHeure(r.heureDebut)), esc(this.formatHeure(r.heureFin)),
      esc(`Dr. ${r.medecinPrenom ?? ''} ${r.medecinNom ?? ''}`.trim()),
      esc(r.specialiteNom ?? 'Consultation'), esc(this.labelStatut(r.statut))
    ].join(','));
    const blob = new Blob(['﻿' + [header.join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `mes-rdv-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click(); URL.revokeObjectURL(a.href);
  }

  reload(): void {
    this.loading.set(true);
    this.rdvService.list().subscribe({
      next: (list) => { this.rdvs.set(list ?? []); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast.show('Impossible de charger vos rendez-vous.', 'error'); }
    });
  }

  labelStatut(s: StatutRendezVous): string {
    switch (s) {
      case 'EN_ATTENTE': return 'En attente';
      case 'CONFIRME': return 'Confirmé';
      case 'ANNULE': return 'Annulé';
      case 'TERMINE': return 'Terminé';
      default: return s;
    }
  }

  openDetails(r: RendezVousPatient): void { this.selectedRdv.set(r); }
  closeDetails(): void { this.selectedRdv.set(null); }

  async openQrCode(r: RendezVousPatient): Promise<void> {
    if (this.qrGenerating()) return;
    this.closeDetails();
    this.qrRdv.set(r);
    await this.generateQrCode(r);
  }

  closeQrCode(): void { this.qrRdv.set(null); this.qrCodeDataUrl.set(''); }

  private async generateQrCode(r: RendezVousPatient): Promise<void> {
    this.qrGenerating.set(true);
    try {
      const qrData = encodeRendezVousQrUrl({
        baseUrl: environment.ordonnancePublicBaseUrl, id: r.id,
        patient: this.patientLabel(), medecin: `Dr. ${r.medecinPrenom} ${r.medecinNom}`,
        specialite: r.specialiteNom, date: r.dateRendezVous,
        heureDebut: r.heureDebut, heureFin: r.heureFin, mode: 'PRESENTIEL', motif: null, statut: r.statut
      });
      this.qrCodeDataUrl.set(await QRCode.toDataURL(qrData, { width: 300, margin: 2, errorCorrectionLevel: 'H' }));
    } catch {
      this.toast.show('Impossible de générer le QR code.', 'error');
    } finally {
      this.qrGenerating.set(false);
    }
  }

  openReport(r: RendezVousPatient): void {
    if (!this.peutReporter(r)) return;
    this.closeDetails();
    this.reportRdv.set(r);
    this.reportDate = r.dateRendezVous;
    this.reportHeureDebut = this.formatHeure(r.heureDebut);
    this.reportHeureFin = this.formatHeure(r.heureFin);
    this.loadCreneaux(r.medecinId);
  }

  closeReport(): void {
    this.reportRdv.set(null); this.creneaux.set([]);
    this.reportDate = ''; this.reportHeureDebut = ''; this.reportHeureFin = '';
  }

  onReportDateChange(): void { this.reportHeureDebut = ''; this.reportHeureFin = ''; }

  choisirCreneauReport(heureRaw: string | number[]): void {
    const h = this.normalizeHeureAffichage(heureRaw);
    this.reportHeureDebut = h;
    const parts = h.split(':').map((x) => parseInt(x, 10));
    const m = (parts[1] ?? 0) + 30;
    let hh = parts[0] ?? 0, mm = m;
    if (mm >= 60) { hh += 1; mm -= 60; }
    this.reportHeureFin = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  submitReport(): void {
    const r = this.reportRdv();
    if (!r || !this.reportDate || !this.reportHeureDebut) {
      this.toast.show("Veuillez renseigner la date et l'heure.", 'error'); return;
    }
    const fin = this.reportHeureFin.trim();
    const payload: { dateRendezVous: string; heureDebut: string; heureFin?: string } = {
      dateRendezVous: this.reportDate, heureDebut: this.normalizeTime(this.reportHeureDebut)
    };
    if (fin.length > 0) payload.heureFin = this.normalizeTime(fin);
    this.reportingId.set(r.id);
    this.rdvService.reporter(r.id, payload).subscribe({
      next: () => { this.reportingId.set(null); this.toast.show('Rendez-vous reporté. En attente de confirmation.', 'success'); this.closeReport(); this.reload(); },
      error: (err) => { this.reportingId.set(null); this.toast.show(apiErrorMessage(err, 'Impossible de reporter ce rendez-vous.'), 'error'); }
    });
  }

  private loadCreneaux(medecinId: number): void {
    this.loadingCreneaux.set(true);
    this.medecinService.getCatalogueCreneaux(medecinId, undefined, 21).subscribe({
      next: (rows: CreneauJour[]) => {
        this.creneaux.set(rows); this.loadingCreneaux.set(false);
        if (!this.reportDate && rows.length > 0) this.reportDate = rows[0].date;
      },
      error: () => { this.creneaux.set([]); this.loadingCreneaux.set(false); }
    });
  }

  formatDateLong(r: RendezVousPatient): string {
    const iso = r.dateRendezVous ?? '';
    if (iso.length < 10) return iso;
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(parseIsoToLocalDate(iso));
  }

  formatHeure(t: string): string {
    if (!t) return '';
    return t.length >= 5 ? t.slice(0, 5) : t;
  }

  formatDateCourt(r: RendezVousPatient): string {
    const iso = parseRdvIsoDate(r);
    if (!iso || iso.length < 10) return r.dateRendezVous ?? '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  formatHeureChip(raw: string | number[] | unknown): string {
    return this.normalizeHeureAffichage(raw);
  }

  peutAnnuler(r: RendezVousPatient): boolean { return r.statut !== 'ANNULE' && r.statut !== 'TERMINE'; }
  peutReporter(r: RendezVousPatient): boolean { return r.statut !== 'ANNULE' && r.statut !== 'TERMINE'; }

  annuler(r: RendezVousPatient): void {
    if (!this.peutAnnuler(r) || !confirm('Annuler ce rendez-vous ?')) return;
    this.cancellingId.set(r.id);
    this.rdvService.annuler(r.id).subscribe({
      next: () => { this.cancellingId.set(null); this.toast.show('Rendez-vous annulé.', 'success'); this.reload(); },
      error: (err) => {
        this.cancellingId.set(null);
        const msg = typeof err?.error?.message === 'string' ? err.error.message : "Impossible d'annuler ce rendez-vous.";
        this.toast.show(msg, 'error');
      }
    });
  }

  private normalizeHeureAffichage(raw: string | number[] | unknown): string {
    if (Array.isArray(raw) && raw.length >= 2) return `${String(Number(raw[0])).padStart(2, '0')}:${String(Number(raw[1])).padStart(2, '0')}`;
    if (typeof raw === 'string') return raw.length >= 5 ? raw.slice(0, 5) : raw;
    return '';
  }

  private normalizeTime(t: string): string {
    const s = t.trim();
    if (s.length === 5) return `${s}:00`;
    return s.length >= 8 ? s.slice(0, 8) : s;
  }
}
