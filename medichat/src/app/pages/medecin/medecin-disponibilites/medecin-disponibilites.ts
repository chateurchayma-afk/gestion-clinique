import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/toast.service';
import {
  Conge,
  CongeRequest,
  Disponibilite,
  DisponibiliteCongeService,
  DisponibiliteRequest,
  JourSemaine
} from '../../../services/disponibilite-conge.service';

interface DisponibiliteForm {
  jour: JourSemaine;
  heureDebut: string;
  heureFin: string;
}

interface CongeForm {
  dateDebut: string;
  dateFin: string;
  motif: string;
}

@Component({
  selector: 'app-medecin-disponibilites',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './medecin-disponibilites.html',
  styleUrls: ['./medecin-disponibilites.css', '../medecin-pro.css']
})
export class MedecinDisponibilites implements OnInit {
  private readonly svc = inject(DisponibiliteCongeService);
  private readonly toast = inject(ToastService);

  readonly tab = signal<'disponibilites' | 'conges'>('disponibilites');
  readonly disponibilites = signal<Disponibilite[]>([]);
  readonly conges = signal<Conge[]>([]);
  readonly saving = signal(false);

  readonly JOURS: { value: JourSemaine; label: string }[] = [
    { value: 'LUNDI',    label: 'Lundi' },
    { value: 'MARDI',    label: 'Mardi' },
    { value: 'MERCREDI', label: 'Mercredi' },
    { value: 'JEUDI',    label: 'Jeudi' },
    { value: 'VENDREDI', label: 'Vendredi' },
    { value: 'SAMEDI',   label: 'Samedi' },
    { value: 'DIMANCHE', label: 'Dimanche' },
  ];

  readonly jourLabel: Record<JourSemaine, string> = {
    LUNDI: 'Lundi', MARDI: 'Mardi', MERCREDI: 'Mercredi', JEUDI: 'Jeudi',
    VENDREDI: 'Vendredi', SAMEDI: 'Samedi', DIMANCHE: 'Dimanche'
  };

  // ── Disponibilités form ────────────────────────────────────────────────────
  showDispForm = false;
  editDispId: number | null = null;
  dispForm: DisponibiliteForm = { jour: 'LUNDI', heureDebut: '08:00', heureFin: '12:00' };

  // ── Congés form ────────────────────────────────────────────────────────────
  showCongeForm = false;
  editCongeId: number | null = null;
  congeForm: CongeForm = { dateDebut: '', dateFin: '', motif: '' };

  ngOnInit(): void {
    this.loadDisponibilites();
    this.loadConges();
  }

  setTab(t: 'disponibilites' | 'conges'): void {
    this.tab.set(t);
  }

  // ── Disponibilités ─────────────────────────────────────────────────────────

  loadDisponibilites(): void {
    this.svc.getDisponibilites().subscribe({
      next: (list) => this.disponibilites.set(list),
      error: () => this.toast.show('Chargement des disponibilités impossible.', 'error')
    });
  }

  openAddDisp(): void {
    this.editDispId = null;
    this.dispForm = { jour: 'LUNDI', heureDebut: '08:00', heureFin: '12:00' };
    this.showDispForm = true;
  }

  openEditDisp(d: Disponibilite): void {
    this.editDispId = d.id;
    this.dispForm = {
      jour: d.jour,
      heureDebut: d.heureDebut.substring(0, 5),
      heureFin: d.heureFin.substring(0, 5)
    };
    this.showDispForm = true;
  }

  cancelDisp(): void {
    this.showDispForm = false;
    this.editDispId = null;
  }

  saveDisp(): void {
    if (!this.dispForm.heureDebut || !this.dispForm.heureFin) {
      this.toast.show('Renseignez les heures.', 'error');
      return;
    }
    const body: DisponibiliteRequest = {
      jour: this.dispForm.jour,
      heureDebut: this.dispForm.heureDebut,
      heureFin: this.dispForm.heureFin
    };
    this.saving.set(true);
    const req$ = this.editDispId != null
      ? this.svc.updateDisponibilite(this.editDispId, body)
      : this.svc.addDisponibilite(body);

    req$.subscribe({
      next: () => {
        this.toast.show(this.editDispId != null ? 'Disponibilité modifiée.' : 'Disponibilité ajoutée.', 'success');
        this.showDispForm = false;
        this.editDispId = null;
        this.saving.set(false);
        this.loadDisponibilites();
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Erreur lors de l\'enregistrement.';
        this.toast.show(msg, 'error');
        this.saving.set(false);
      }
    });
  }

  deleteDisp(id: number): void {
    if (!confirm('Supprimer cette disponibilité ?')) return;
    this.svc.deleteDisponibilite(id).subscribe({
      next: () => {
        this.toast.show('Disponibilité supprimée.', 'success');
        this.loadDisponibilites();
      },
      error: () => this.toast.show('Suppression impossible.', 'error')
    });
  }

  // ── Congés ─────────────────────────────────────────────────────────────────

  loadConges(): void {
    this.svc.getConges().subscribe({
      next: (list) => this.conges.set(list),
      error: () => this.toast.show('Chargement des congés impossible.', 'error')
    });
  }

  openAddConge(): void {
    this.editCongeId = null;
    this.congeForm = { dateDebut: '', dateFin: '', motif: '' };
    this.showCongeForm = true;
  }

  openEditConge(c: Conge): void {
    this.editCongeId = c.id;
    this.congeForm = {
      dateDebut: c.dateDebut,
      dateFin: c.dateFin,
      motif: c.motif ?? ''
    };
    this.showCongeForm = true;
  }

  cancelConge(): void {
    this.showCongeForm = false;
    this.editCongeId = null;
  }

  saveConge(): void {
    if (!this.congeForm.dateDebut || !this.congeForm.dateFin) {
      this.toast.show('Renseignez les dates.', 'error');
      return;
    }
    const body: CongeRequest = {
      dateDebut: this.congeForm.dateDebut,
      dateFin: this.congeForm.dateFin,
      motif: this.congeForm.motif || null
    };
    this.saving.set(true);
    const req$ = this.editCongeId != null
      ? this.svc.updateConge(this.editCongeId, body)
      : this.svc.addConge(body);

    req$.subscribe({
      next: () => {
        this.toast.show(this.editCongeId != null ? 'Congé modifié.' : 'Congé ajouté.', 'success');
        this.showCongeForm = false;
        this.editCongeId = null;
        this.saving.set(false);
        this.loadConges();
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Erreur lors de l\'enregistrement.';
        this.toast.show(msg, 'error');
        this.saving.set(false);
      }
    });
  }

  deleteConge(id: number): void {
    if (!confirm('Supprimer ce congé ?')) return;
    this.svc.deleteConge(id).subscribe({
      next: () => {
        this.toast.show('Congé supprimé.', 'success');
        this.loadConges();
      },
      error: () => this.toast.show('Suppression impossible.', 'error')
    });
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  isCongeActif(c: Conge): boolean {
    const today = new Date().toISOString().slice(0, 10);
    return c.dateDebut <= today && today <= c.dateFin;
  }

  isCongeAVenir(c: Conge): boolean {
    const today = new Date().toISOString().slice(0, 10);
    return c.dateDebut > today;
  }
}
