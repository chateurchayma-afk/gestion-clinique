import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/toast.service';
import { MedecinContextService } from '../../../core/medecin-context.service';
import {
  AdminRendezVousCreatePayload,
  AdminRendezVousPlanningItem,
  AdminRendezVousService,
  StatutRendezVousAdmin
} from '../../../services/admin-rendez-vous.service';
import { MedecinPortalService } from '../../../services/medecin-portal.service';
import { Patient } from '../../../services/patient.service';
import type { ModeConsultation } from '../../../services/rendez-vous-patient.service';

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function normalizeTime(t: string): string {
  const s = t.trim();
  if (s.length === 5) {
    return `${s}:00`;
  }
  return s.length >= 8 ? s.slice(0, 8) : s;
}

function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

@Component({
  selector: 'app-medecin-rendez-vous',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  readonly submitting = signal(false);
  readonly listLoading = signal(true);
  readonly showForm = signal(false);

  readonly rdvRows = signal<AdminRendezVousPlanningItem[]>([]);
  readonly selectedId = signal<number | null>(null);

  readonly filterStatut = signal<StatutRendezVousAdmin | 'TOUS'>('TOUS');
  readonly filterPatientId = signal<number | null>(null);
  readonly filterFrom = signal(isoOffset(-30));
  readonly filterTo = signal(isoOffset(60));

  readonly filteredRows = computed(() => {
    const rows = this.rdvRows();
    const pid = this.filterPatientId();
    const from = this.filterFrom();
    const to = this.filterTo();
    return rows.filter((r) => {
      if (pid && r.patientId !== pid) {
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

  patientId: number | null = null;
  dateRdv = todayIso();
  heureDebut = '09:00';
  heureFin = '';
  mode: ModeConsultation = 'PRESENTIEL';
  motif = '';

  ngOnInit(): void {
    this.medecinPortal.getMesPatients().subscribe({
      next: (list) => {
        this.patients.set(list ?? []);
        this.patientId = list[0]?.id ?? null;
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
    });
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
        const filtered = (rows ?? []).filter((r) => r.medecinId === medId);
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

  toggleForm(): void {
    this.showForm.update((v) => !v);
  }

  toggleDetails(id: number): void {
    this.selectedId.set(this.selectedId() === id ? null : id);
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

  submit(): void {
    const medId = this.medecinId();
    if (!this.patientId || !medId || !this.dateRdv?.trim() || !this.heureDebut?.trim()) {
      this.toast.show('Sélectionnez un patient, une date et une heure de début.', 'error');
      return;
    }
    const body: AdminRendezVousCreatePayload = {
      patientId: this.patientId,
      medecinId: medId,
      dateRendezVous: this.dateRdv,
      heureDebut: normalizeTime(this.heureDebut),
      modeConsultation: this.mode,
      motif: this.motif.trim() || null
    };
    const fin = this.heureFin.trim();
    if (fin.length > 0) {
      body.heureFin = normalizeTime(fin);
    }
    this.submitting.set(true);
    this.adminRdv.create(body).subscribe({
      next: () => {
        this.submitting.set(false);
        this.toast.show('Rendez-vous enregistré.', 'success');
        this.motif = '';
        this.dateRdv = todayIso();
        this.showForm.set(false);
        this.reloadRendezVous();
      },
      error: (err: { error?: { message?: string } | string }) => {
        this.submitting.set(false);
        const msg =
          typeof err?.error === 'object' && err.error?.message
            ? err.error.message
            : 'Création impossible.';
        this.toast.show(msg, 'error');
      }
    });
  }
}
