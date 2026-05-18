import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../core/api-error-message';
import { ToastService } from '../../../core/toast.service';
import { CreneauJour, MedecinService } from '../../../services/medecin.service';
import { PatientProfilService } from '../../../services/patient-profil.service';
import {
  RendezVousPatient,
  RendezVousPatientService,
  StatutRendezVous
} from '../../../services/rendez-vous-patient.service';
import { buildRecuData, buildRecuFilename, downloadRdvRecuFromData } from '../patient-rdv-recu-pdf';

function parseIsoToLocalDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Dimanche = premier jour de la semaine affichée (comme l’espace médecin). */
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

function parseRdvIsoDate(r: RendezVousPatient): string {
  return (r.dateRendezVous ?? '').slice(0, 10);
}

function compareHeurePatient(a: RendezVousPatient, b: RendezVousPatient): number {
  return (a.heureDebut ?? '').slice(0, 8).localeCompare((b.heureDebut ?? '').slice(0, 8));
}

@Component({
  selector: 'app-patient-rdv-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './patient-rdv-list.html',
  styleUrl: './patient-rdv-list.css'
})
export class PatientRdvList implements OnInit {
  private readonly rdvService = inject(RendezVousPatientService);
  private readonly medecinService = inject(MedecinService);
  private readonly profilService = inject(PatientProfilService);
  private readonly toast = inject(ToastService);

  readonly rdvs = signal<RendezVousPatient[]>([]);
  readonly loading = signal(true);
  readonly cancellingId = signal<number | null>(null);
  readonly reportingId = signal<number | null>(null);
  readonly selectedRdv = signal<RendezVousPatient | null>(null);
  readonly reportRdv = signal<RendezVousPatient | null>(null);
  readonly creneaux = signal<CreneauJour[]>([]);
  readonly loadingCreneaux = signal(false);
  readonly recuPdfBusy = signal(false);
  readonly patientLabel = signal('Patient');
  /** Liste (tableau) ou calendrier hebdomadaire. */
  readonly viewMode = signal<'liste' | 'calendrier'>('liste');
  readonly weekStart = signal<Date>(startOfWeekSunday(new Date()));
  reportDate = '';
  reportHeureDebut = '';
  reportHeureFin = '';

  readonly calendarWeekDays = computed(() => {
    const start = this.weekStart();
    const out: { date: Date; iso: string; label: string; dom: string }[] = [];
    const dowFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
    for (let i = 0; i < 7; i++) {
      const d = addDaysDate(start, i);
      out.push({
        date: d,
        iso: toIsoDate(d),
        label: dowFmt.format(d),
        dom: String(d.getDate())
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
    const map = new Map<string, RendezVousPatient[]>();
    for (const r of this.rdvs()) {
      const iso = parseRdvIsoDate(r);
      if (!iso) {
        continue;
      }
      if (!map.has(iso)) {
        map.set(iso, []);
      }
      map.get(iso)!.push(r);
    }
    for (const list of map.values()) {
      list.sort(compareHeurePatient);
    }
    return map;
  });

  readonly slotsJour = computed((): (string | number[])[] => {
    const d = this.reportDate;
    if (!d) {
      return [];
    }
    const jour = this.creneaux().find((c) => c.date === d);
    return jour?.heuresDebut ?? [];
  });

  ngOnInit(): void {
    this.reload();
    this.profilService.getProfil().subscribe({
      next: (p) => {
        const name = `${p.utilisateur.prenom} ${p.utilisateur.nom}`.trim();
        this.patientLabel.set(name || 'Patient');
      },
      error: () => {
        this.patientLabel.set('Patient');
      }
    });
  }

  setViewMode(mode: 'liste' | 'calendrier'): void {
    this.viewMode.set(mode);
  }

  prevWeek(): void {
    this.weekStart.update((d) => addDaysDate(d, -7));
  }

  nextWeek(): void {
    this.weekStart.update((d) => addDaysDate(d, 7));
  }

  goThisWeek(): void {
    this.weekStart.set(startOfWeekSunday(new Date()));
  }

  rdvsPourJour(iso: string): RendezVousPatient[] {
    return this.rdvsByDay().get(iso) ?? [];
  }

  isTodayIso(iso: string): boolean {
    return iso === todayIso();
  }

  reload(): void {
    this.loading.set(true);
    this.rdvService.list().subscribe({
      next: (list) => {
        this.rdvs.set(list ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.show('Impossible de charger vos rendez-vous.', 'error');
      }
    });
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

  labelMode(m: string): string {
    const u = (m ?? '').trim().toUpperCase();
    if (u === 'ONLINE') {
      return 'En ligne';
    }
    if (u === 'PRESENTIEL') {
      return 'Présentiel';
    }
    return m || '—';
  }

  openDetails(r: RendezVousPatient): void {
    this.closeReport();
    this.selectedRdv.set(r);
  }

  closeDetails(): void {
    this.selectedRdv.set(null);
  }

  openReport(r: RendezVousPatient): void {
    if (!this.peutReporter(r)) {
      return;
    }
    this.closeDetails();
    this.reportRdv.set(r);
    this.reportDate = r.dateRendezVous;
    this.reportHeureDebut = this.formatHeure(r.heureDebut);
    this.reportHeureFin = this.formatHeure(r.heureFin);
    this.loadCreneaux(r.medecinId);
  }

  closeReport(): void {
    this.reportRdv.set(null);
    this.creneaux.set([]);
    this.reportDate = '';
    this.reportHeureDebut = '';
    this.reportHeureFin = '';
  }

  onReportDateChange(): void {
    this.reportHeureDebut = '';
    this.reportHeureFin = '';
  }

  choisirCreneauReport(heureRaw: string | number[]): void {
    const h = this.normalizeHeureAffichage(heureRaw);
    this.reportHeureDebut = h;
    const parts = h.split(':').map((x) => parseInt(x, 10));
    const m = (parts[1] ?? 0) + 30;
    let hh = parts[0] ?? 0;
    let mm = m;
    if (mm >= 60) {
      hh += 1;
      mm -= 60;
    }
    this.reportHeureFin = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  submitReport(): void {
    const r = this.reportRdv();
    if (!r || !this.reportDate || !this.reportHeureDebut) {
      this.toast.show('Veuillez renseigner la date et l’heure.', 'error');
      return;
    }
    const fin = this.reportHeureFin.trim();
    const payload: {
      dateRendezVous: string;
      heureDebut: string;
      heureFin?: string;
    } = {
      dateRendezVous: this.reportDate,
      heureDebut: this.normalizeTime(this.reportHeureDebut)
    };
    if (fin.length > 0) {
      payload.heureFin = this.normalizeTime(fin);
    }

    this.reportingId.set(r.id);
    this.rdvService.reporter(r.id, payload).subscribe({
      next: () => {
        this.reportingId.set(null);
        this.toast.show('Rendez-vous reporté. En attente de confirmation.', 'success');
        this.closeReport();
        this.reload();
      },
      error: (err) => {
        this.reportingId.set(null);
        this.toast.show(
          apiErrorMessage(err, 'Impossible de reporter ce rendez-vous.'),
          'error'
        );
      }
    });
  }

  private loadCreneaux(medecinId: number): void {
    this.loadingCreneaux.set(true);
    this.medecinService.getCatalogueCreneaux(medecinId, undefined, 21).subscribe({
      next: (rows) => {
        this.creneaux.set(rows);
        this.loadingCreneaux.set(false);
        if (!this.reportDate && rows.length > 0) {
          this.reportDate = rows[0].date;
        }
      },
      error: () => {
        this.creneaux.set([]);
        this.loadingCreneaux.set(false);
      }
    });
  }

  formatDateLong(r: RendezVousPatient): string {
    const iso = r.dateRendezVous ?? '';
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

  formatHeure(t: string): string {
    if (!t) {
      return '';
    }
    return t.length >= 5 ? t.slice(0, 5) : t;
  }

  /** Affichage jj/mm/aaaa à partir du champ date API. */
  formatDateCourt(r: RendezVousPatient): string {
    const iso = parseRdvIsoDate(r);
    if (!iso || iso.length < 10) {
      return r.dateRendezVous ?? '—';
    }
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  formatHeureChip(raw: string | number[] | unknown): string {
    return this.normalizeHeureAffichage(raw);
  }

  peutAnnuler(r: RendezVousPatient): boolean {
    return r.statut !== 'ANNULE' && r.statut !== 'TERMINE';
  }

  peutReporter(r: RendezVousPatient): boolean {
    return this.peutAnnuler(r);
  }

  async downloadRecu(r: RendezVousPatient): Promise<void> {
    if (this.recuPdfBusy()) {
      return;
    }
    this.recuPdfBusy.set(true);
    const generatedAt = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'long',
      timeStyle: 'short'
    }).format(new Date());
    const data = buildRecuData(r, this.patientLabel(), generatedAt);

    try {
      await downloadRdvRecuFromData(data, buildRecuFilename(r));
      this.toast.show('Reçu PDF enregistré.', 'success');
    } catch {
      this.toast.show('Impossible de générer le PDF.', 'error');
    } finally {
      this.recuPdfBusy.set(false);
    }
  }

  annuler(r: RendezVousPatient): void {
    if (!this.peutAnnuler(r)) {
      return;
    }
    if (!confirm('Annuler ce rendez-vous ?')) {
      return;
    }
    this.cancellingId.set(r.id);
    this.rdvService.annuler(r.id).subscribe({
      next: () => {
        this.cancellingId.set(null);
        this.toast.show('Rendez-vous annulé.', 'success');
        this.reload();
      },
      error: (err) => {
        this.cancellingId.set(null);
        const msg =
          typeof err?.error?.message === 'string'
            ? err.error.message
            : "Impossible d'annuler ce rendez-vous.";
        this.toast.show(msg, 'error');
      }
    });
  }

  private normalizeTime(t: string): string {
    const s = t.trim();
    if (s.length === 5) {
      return `${s}:00`;
    }
    return s.length >= 8 ? s.slice(0, 8) : s;
  }

  private normalizeHeureAffichage(raw: string | number[] | unknown): string {
    if (Array.isArray(raw) && raw.length >= 2) {
      const hh = Number(raw[0]);
      const mm = Number(raw[1]);
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    }
    if (typeof raw === 'string') {
      return raw.length >= 5 ? raw.slice(0, 5) : raw;
    }
    return '';
  }
}
