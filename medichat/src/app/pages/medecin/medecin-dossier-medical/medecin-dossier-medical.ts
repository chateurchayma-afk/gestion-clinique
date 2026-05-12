import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ToastService } from '../../../core/toast.service';
import { MedecinPortalService } from '../../../services/medecin-portal.service';
import { Patient } from '../../../services/patient.service';
import { DossierMedicalService } from '../../../services/dossier-medical.service';

export interface DossierMedicalForm {
  groupeSanguin: string;
  tailleCm: string;
  poidsKg: string;
  allergies: string;
  medicaments: string;
  maladiesChroniques: string;
  interventions: string;
  hospitalisations: string;
  famDiabete: boolean;
  famHypertension: boolean;
  famAsthme: boolean;
  famCardiaque: boolean;
  famMentaux: boolean;
  famCancer: boolean;
  tabac: string;
  alcool: string;
  activite: string;
  alimentation: string;
}

function emptyDossier(): DossierMedicalForm {
  return {
    groupeSanguin: '',
    tailleCm: '',
    poidsKg: '',
    allergies: '',
    medicaments: '',
    maladiesChroniques: '',
    interventions: '',
    hospitalisations: '',
    famDiabete: false,
    famHypertension: false,
    famAsthme: false,
    famCardiaque: false,
    famMentaux: false,
    famCancer: false,
    tabac: '',
    alcool: '',
    activite: '',
    alimentation: ''
  };
}

@Component({
  selector: 'app-medecin-dossier-medical',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './medecin-dossier-medical.html',
  styleUrls: ['./medecin-dossier-medical.css', '../medecin-pro.css']
})
export class MedecinDossierMedical implements OnInit {
  private readonly medecinPortal = inject(MedecinPortalService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly dossierMedical = inject(DossierMedicalService);

  readonly patients = signal<Patient[]>([]);
  readonly loadingDossier = signal(false);
  readonly savingDossier = signal(false);
  patientId: number | null = null;
  form: DossierMedicalForm = emptyDossier();
  private pendingPatientId: number | null = null;
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private hasPendingChanges = false;

  ngOnInit(): void {
    const queryId = this.route.snapshot.queryParamMap.get('patientId');
    if (queryId) {
      const parsed = Number(queryId);
      this.pendingPatientId = Number.isFinite(parsed) ? parsed : null;
    }

    this.medecinPortal.getMesPatients().subscribe({
      next: (list) => {
        this.patients.set(list ?? []);
        const pick =
          this.pendingPatientId != null
            ? list.find((p) => p.id === this.pendingPatientId) ?? null
            : null;
        if (pick) {
          this.patientId = pick.id;
          this.pendingPatientId = null;
          this.loadDossier();
          return;
        }
        if (list[0]) {
          this.patientId = list[0].id;
          this.loadDossier();
        }
      },
      error: () => this.toast.show('Impossible de charger les patients.', 'error')
    });
  }

  onPatientChange(): void {
    this.clearAutoSave();
    this.loadDossier();
  }

  private loadDossier(): void {
    if (this.patientId == null) {
      this.form = emptyDossier();
      return;
    }

    this.loadingDossier.set(true);
    this.dossierMedical.getByPatientId(this.patientId).subscribe({
      next: (dossier) => {
        this.form = { ...emptyDossier(), ...dossier };
        this.loadingDossier.set(false);
      },
      error: (err) => {
        this.loadingDossier.set(false);
        if (err instanceof HttpErrorResponse && err.status === 404) {
          this.form = emptyDossier();
          return;
        }
        if (err instanceof HttpErrorResponse) {
          const msg =
            typeof err.error?.message === 'string' && err.error.message.trim()
              ? err.error.message
              : `Chargement du dossier impossible (erreur ${err.status}).`;
          this.toast.show(msg, 'error');
          return;
        }
        this.toast.show('Chargement du dossier impossible.', 'error');
      }
    });
  }

  save(): void {
    if (this.patientId == null) {
      this.toast.show('Sélectionnez un patient.', 'error');
      return;
    }

    this.saveInternal(true);
  }

  queueAutoSave(): void {
    if (this.patientId == null || this.loadingDossier()) {
      return;
    }
    this.hasPendingChanges = true;
    this.clearAutoSave();
    this.autoSaveTimer = setTimeout(() => {
      if (!this.hasPendingChanges) {
        return;
      }
      this.saveInternal(false);
    }, 800);
  }

  private saveInternal(showToast: boolean): void {
    if (this.patientId == null) {
      return;
    }

    this.savingDossier.set(true);
    this.dossierMedical.saveForPatient(this.patientId, this.form).subscribe({
      next: (dossier) => {
        this.form = { ...emptyDossier(), ...dossier };
        this.savingDossier.set(false);
        this.hasPendingChanges = false;
        if (showToast) {
          this.toast.show('Dossier enregistré dans la base.', 'success');
        }
      },
      error: (err) => {
        this.savingDossier.set(false);
        if (err instanceof HttpErrorResponse) {
          const msg =
            typeof err.error?.message === 'string' && err.error.message.trim()
              ? err.error.message
              : `Enregistrement impossible (erreur ${err.status}).`;
          if (showToast) {
            this.toast.show(msg, 'error');
          }
          return;
        }
        if (showToast) {
          this.toast.show('Enregistrement impossible.', 'error');
        }
      }
    });
  }

  private clearAutoSave(): void {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  reset(): void {
    if (this.patientId == null) {
      return;
    }
    if (!confirm('Effacer le brouillon de dossier pour ce patient ?')) {
      return;
    }
    this.form = emptyDossier();
    this.saveInternal(true);
  }
}
