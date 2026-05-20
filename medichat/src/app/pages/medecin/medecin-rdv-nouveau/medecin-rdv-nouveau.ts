import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '../../../core/toast.service';
import { MedecinContextService } from '../../../core/medecin-context.service';
import {
  AdminRendezVousCreatePayload,
  AdminRendezVousService
} from '../../../services/admin-rendez-vous.service';
import { MedecinPortalService } from '../../../services/medecin-portal.service';
import { Patient } from '../../../services/patient.service';

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

@Component({
  selector: 'app-medecin-rdv-nouveau',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './medecin-rdv-nouveau.html',
  styleUrls: ['./medecin-rdv-nouveau.css', '../medecin-pro.css']
})
export class MedecinRdvNouveau implements OnInit {
  private readonly ctx = inject(MedecinContextService);
  private readonly medecinPortal = inject(MedecinPortalService);
  private readonly adminRdv = inject(AdminRendezVousService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly medecinId = signal<number | null>(null);
  readonly patients = signal<Patient[]>([]);
  readonly loadMeta = signal(true);
  readonly submitting = signal(false);

  patientId: number | null = null;
  dateRdv = todayIso();
  heureDebut = '09:00';
  heureFin = '';

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
      }
    });
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
      modeConsultation: 'PRESENTIEL',
      motif: null
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
        void this.router.navigate(['/medecin-dashboard', 'rendez-vous']);
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
