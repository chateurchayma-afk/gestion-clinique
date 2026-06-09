import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/toast.service';
import {
  AdminRendezVousPlanningItem,
  AdminRendezVousService,
  StatutRendezVousAdmin
} from '../../../services/admin-rendez-vous.service';

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

function normalizeHeureAffichage(raw: unknown): string {
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
  selector: 'app-admin-rendez-vous-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-rendez-vous-list.html',
  styleUrls: ['./admin-rendez-vous-list.css']
})
export class AdminRendezVousList implements OnInit {
  private readonly adminRdv = inject(AdminRendezVousService);
  private readonly toast = inject(ToastService);

  readonly rows = signal<AdminRendezVousPlanningItem[]>([]);
  readonly loading = signal(true);
  readonly savingId = signal<number | null>(null);

  filtreStatut: '' | StatutRendezVousAdmin = '';
  readonly searchQuery = signal('');

  readonly filteredRows = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.rows();
    return this.rows().filter((r) => {
      const patient = `${r.patientPrenom ?? ''} ${r.patientNom ?? ''}`.toLowerCase();
      const medecin = `${r.medecinPrenom ?? ''} ${r.medecinNom ?? ''}`.toLowerCase();
      return patient.includes(q) || medecin.includes(q);
    });
  });

  readonly statutOptions: { value: StatutRendezVousAdmin; label: string }[] = [
    { value: 'EN_ATTENTE', label: 'En attente' },
    { value: 'CONFIRME', label: 'Confirmé' },
    { value: 'ANNULE', label: 'Annulé' },
    { value: 'TERMINE', label: 'Terminé' }
  ];

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    const f = this.filtreStatut === '' ? null : this.filtreStatut;
    this.adminRdv.listGestion(f).subscribe({
      next: (list) => {
        this.rows.set(list);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const apiMsg = typeof err.error?.message === 'string' ? err.error.message : '';
        const hint =
          err.status === 0
            ? 'Serveur injoignable (vérifiez que le backend tourne sur le port configuré dans api-base).'
            : `Erreur ${err.status}.`;
        this.toast.show(apiMsg || hint, 'error');
      }
    });
  }

  onFiltreChange(): void {
    this.reload();
  }

  dateAffichee(r: AdminRendezVousPlanningItem): string {
    return normalizeApiDate(r.dateRendezVous);
  }

  heureRange(r: AdminRendezVousPlanningItem): string {
    const a = normalizeHeureAffichage(r.heureDebut);
    const b = normalizeHeureAffichage(r.heureFin);
    if (a && b) {
      return `${a} – ${b}`;
    }
    return a || '—';
  }

  labelStatut(s: string): string {
    const o = this.statutOptions.find((x) => x.value === s);
    return o?.label ?? s;
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

  motifCourt(m: string | null): string {
    const s = (m ?? '').trim();
    if (!s) {
      return '—';
    }
    return s.length > 80 ? `${s.slice(0, 77)}…` : s;
  }

  statutSelectDisabled(r: AdminRendezVousPlanningItem): boolean {
    return r.statut === 'ANNULE' && r.annuleParPatient === true;
  }

  pillClass(s: string): string {
    switch (s) {
      case 'CONFIRME':
        return 'pill pill-ok';
      case 'ANNULE':
        return 'pill pill-bad';
      case 'TERMINE':
        return 'pill pill-done';
      default:
        return 'pill pill-wait';
    }
  }

  countStatut(s: StatutRendezVousAdmin): number {
    return this.rows().filter((r) => r.statut === s).length;
  }

  initiales(prenom: string | null | undefined, nom: string | null | undefined): string {
    const p = (prenom ?? '').trim().charAt(0).toUpperCase();
    const n = (nom ?? '').trim().charAt(0).toUpperCase();
    return `${p}${n}` || '?';
  }

  onStatutChange(r: AdminRendezVousPlanningItem, nouveau: StatutRendezVousAdmin): void {
    if (this.statutSelectDisabled(r)) {
      return;
    }
    if (nouveau === r.statut) {
      return;
    }
    this.savingId.set(r.id);
    this.adminRdv.updateStatut(r.id, nouveau).subscribe({
      next: (updated) => {
        this.rows.update((list) => list.map((x) => (x.id === updated.id ? updated : x)));
        this.savingId.set(null);
        this.toast.show('Statut mis à jour.', 'success');
      },
      error: (err: HttpErrorResponse) => {
        this.savingId.set(null);
        const msg =
          typeof err?.error?.message === 'string' ? err.error.message : 'Mise à jour impossible.';
        this.toast.show(msg, 'error');
        void this.reload();
      }
    });
  }
}
