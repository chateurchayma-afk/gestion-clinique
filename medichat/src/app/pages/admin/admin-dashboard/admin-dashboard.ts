import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../../core/toast.service';
import { AdminDashboardService, DashboardStats } from '../../../services/admin-dashboard.service';
import {
  AdminRendezVousPlanningItem,
  AdminRendezVousService
} from '../../../services/admin-rendez-vous.service';
import { Medecin, MedecinService } from '../../../services/medecin.service';

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

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard implements OnInit {
  private readonly toast = inject(ToastService);
  private readonly adminStats = inject(AdminDashboardService);
  private readonly medecinService = inject(MedecinService);
  private readonly adminRdv = inject(AdminRendezVousService);

  stats = signal<DashboardStats | null>(null);
  pendingMedecins = signal<Medecin[]>([]);
  pendingRdvs = signal<AdminRendezVousPlanningItem[]>([]);
  loadingStats = signal(true);
  loadingPending = signal(true);
  loadingRdvPending = signal(true);
  savingRdvId = signal<number | null>(null);

  ngOnInit(): void {
    this.reloadStats();
    this.reloadPending();
    this.reloadPendingRdvs();
  }

  reloadStats(): void {
    this.loadingStats.set(true);
    this.adminStats.getStats().subscribe({
      next: (s) => {
        this.stats.set(s);
        this.loadingStats.set(false);
      },
      error: () => {
        this.loadingStats.set(false);
        this.toast.show('Impossible de charger les statistiques.', 'error');
      }
    });
  }

  reloadPending(): void {
    this.loadingPending.set(true);
    this.medecinService.getMedecinsEnAttente().subscribe({
      next: (list) => {
        this.pendingMedecins.set(list);
        this.loadingPending.set(false);
      },
      error: () => {
        this.loadingPending.set(false);
        this.toast.show('Impossible de charger les médecins en attente.', 'error');
      }
    });
  }

  reloadPendingRdvs(): void {
    this.loadingRdvPending.set(true);
    this.adminRdv.listEnAttente().subscribe({
      next: (rows) => {
        this.pendingRdvs.set(rows ?? []);
        this.loadingRdvPending.set(false);
      },
      error: () => {
        this.loadingRdvPending.set(false);
        this.toast.show('Impossible de charger les rendez-vous en attente.', 'error');
      }
    });
  }

  dateRdv(r: AdminRendezVousPlanningItem): string {
    return normalizeApiDate(r.dateRendezVous) || '—';
  }

  heureRdv(r: AdminRendezVousPlanningItem): string {
    const a = normalizeHeure(r.heureDebut);
    const b = normalizeHeure(r.heureFin);
    if (a && b) {
      return `${a} – ${b}`;
    }
    return a || '—';
  }

  confirmerRdv(r: AdminRendezVousPlanningItem): void {
    this.savingRdvId.set(r.id);
    this.adminRdv.updateStatut(r.id, 'CONFIRME').subscribe({
      next: () => {
        this.savingRdvId.set(null);
        this.toast.show('Rendez-vous confirmé.', 'success');
        this.reloadPendingRdvs();
      },
      error: () => {
        this.savingRdvId.set(null);
        this.toast.show('Confirmation impossible.', 'error');
      }
    });
  }

  labelRole(role: string): string {
    switch (role) {
      case 'PATIENT':
        return 'Patients';
      case 'MEDECIN':
        return 'Médecins';
      case 'ADMIN':
        return 'Administrateurs';
      default:
        return role;
    }
  }

  valider(m: Medecin): void {
    this.medecinService.setValidationStatut(m.id, 'VALIDE').subscribe({
      next: () => {
        this.toast.show(`Dr. ${m.utilisateur.prenom} ${m.utilisateur.nom} validé.`, 'success');
        this.reloadPending();
        this.reloadStats();
      },
      error: (err) => {
        const msg =
          typeof err?.error === 'string' && err.error.trim()
            ? err.error
            : 'Validation impossible.';
        this.toast.show(msg, 'error');
      }
    });
  }

  refuser(m: Medecin): void {
    if (!confirm(`Refuser l'inscription de Dr. ${m.utilisateur.prenom} ${m.utilisateur.nom} ?`)) {
      return;
    }
    this.medecinService.setValidationStatut(m.id, 'REFUSE').subscribe({
      next: () => {
        this.toast.show('Demande refusée.', 'success');
        this.reloadPending();
        this.reloadStats();
      },
      error: (err) => {
        const msg =
          typeof err?.error === 'string' && err.error.trim()
            ? err.error
            : 'Action impossible.';
        this.toast.show(msg, 'error');
      }
    });
  }
}
