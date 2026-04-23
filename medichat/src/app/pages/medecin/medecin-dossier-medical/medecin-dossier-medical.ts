import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../../core/toast.service';
import { MedecinPortalService } from '../../../services/medecin-portal.service';
import { Patient } from '../../../services/patient.service';

const LS_PREFIX = 'medichat_dossier_patient_';

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

  readonly patients = signal<Patient[]>([]);
  patientId: number | null = null;
  form: DossierMedicalForm = emptyDossier();

  ngOnInit(): void {
    this.medecinPortal.getMesPatients().subscribe({
      next: (list) => {
        this.patients.set(list ?? []);
        if (list[0]) {
          this.patientId = list[0].id;
          this.hydrateFromStorage();
        }
      },
      error: () => this.toast.show('Impossible de charger les patients.', 'error')
    });
  }

  onPatientChange(): void {
    this.hydrateFromStorage();
  }

  private lsKey(id: number): string {
    return `${LS_PREFIX}${id}`;
  }

  private hydrateFromStorage(): void {
    if (this.patientId == null) {
      this.form = emptyDossier();
      return;
    }
    const raw = localStorage.getItem(this.lsKey(this.patientId));
    if (raw) {
      try {
        const o = JSON.parse(raw) as Partial<DossierMedicalForm>;
        this.form = { ...emptyDossier(), ...o };
        return;
      } catch {
        /* ignore */
      }
    }
    this.form = emptyDossier();
  }

  save(): void {
    if (this.patientId == null) {
      this.toast.show('Sélectionnez un patient.', 'error');
      return;
    }
    try {
      localStorage.setItem(this.lsKey(this.patientId), JSON.stringify(this.form));
      this.toast.show('Dossier enregistré sur cet appareil.', 'success');
    } catch {
      this.toast.show('Mémoire locale pleine ou indisponible.', 'error');
    }
  }

  reset(): void {
    if (this.patientId == null) {
      return;
    }
    if (!confirm('Effacer le brouillon de dossier pour ce patient ?')) {
      return;
    }
    localStorage.removeItem(this.lsKey(this.patientId));
    this.form = emptyDossier();
    this.toast.show('Brouillon effacé.', 'info');
  }
}
