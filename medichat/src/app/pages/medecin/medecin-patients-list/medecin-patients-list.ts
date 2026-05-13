import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../../core/toast.service';
import { MedecinPortalService } from '../../../services/medecin-portal.service';
import { Patient, PatientService, PatientUpdatePayload } from '../../../services/patient.service';
import { UtilisateurService } from '../../../services/utilisateur.service';

type PatientEditModel = {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  motDePasse: string;
  adresse: string;
  ville: string;
  gouvernorat: string;
  codePostal: string;
  dateNaissance: string;
  sexe: string;
  situationMatrimoniale: string;
  contactUrgenceNom: string;
  contactUrgenceTelephone: string;
  methodeContactPreferee: string;
  numeroDossier: string;
};

@Component({
  selector: 'app-medecin-patients-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './medecin-patients-list.html',
  styleUrls: ['./medecin-patients-list.css', '../medecin-pro.css']
})
export class MedecinPatientsList implements OnInit {
  private readonly medecinPortal = inject(MedecinPortalService);
  private readonly toast = inject(ToastService);
  private readonly patientService = inject(PatientService);
  private readonly utilisateurService = inject(UtilisateurService);

  readonly rows = signal<Patient[]>([]);
  readonly loading = signal(true);

  expandedId: number | null = null;
  editingId: number | null = null;
  savingId: number | null = null;
  togglingId: number | null = null;
  openMenuId: number | null = null;
  editModel: PatientEditModel | null = null;
  confirmTarget: Patient | null = null;

  ngOnInit(): void {
    this.medecinPortal.getMesPatients().subscribe({
      next: (list) => {
        this.rows.set(list ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.show('Impossible de charger les patients.', 'error');
      }
    });
  }

  toggleDetails(patient: Patient): void {
    if (this.expandedId === patient.id) {
      this.expandedId = null;
      this.cancelEdit();
      return;
    }
    this.expandedId = patient.id;
  }

  toggleMenu(patientId: number, event: Event): void {
    event.stopPropagation();
    this.openMenuId = this.openMenuId === patientId ? null : patientId;
  }

  closeMenu(): void {
    this.openMenuId = null;
  }

  isActionDisabled(patient: Patient): boolean {
    return !this.isActif(patient) || this.savingId === patient.id || this.togglingId === patient.id;
  }

  canView(patient: Patient): boolean {
    return this.savingId !== patient.id && this.togglingId !== patient.id;
  }

  canAccessDossier(patient: Patient): boolean {
    return this.savingId !== patient.id && this.togglingId !== patient.id;
  }

  startEdit(patient: Patient): void {
    this.expandedId = patient.id;
    this.editingId = patient.id;
    this.editModel = this.toEditModel(patient);
    this.openMenuId = null;
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editModel = null;
  }

  saveEdit(patient: Patient): void {
    if (!this.editModel) {
      return;
    }

    const v = this.editModel;
    if (!v.nom.trim() || !v.prenom.trim() || !v.email.trim() || !v.telephone.trim()) {
      this.toast.show('Nom, prénom, email et téléphone sont obligatoires.', 'error');
      return;
    }

    const payload: PatientUpdatePayload = {
      nom: v.nom.trim(),
      prenom: v.prenom.trim(),
      email: v.email.trim().toLowerCase(),
      telephone: v.telephone.trim(),
      motDePasse: v.motDePasse?.trim() ? v.motDePasse.trim() : null,
      adresse: v.adresse?.trim() || null,
      ville: v.ville?.trim() || null,
      gouvernorat: v.gouvernorat?.trim() || null,
      codePostal: v.codePostal?.trim() || null,
      dateNaissance: v.dateNaissance?.trim() || null,
      sexe: v.sexe || null,
      situationMatrimoniale: v.situationMatrimoniale?.trim() || null,
      contactUrgenceNom: v.contactUrgenceNom?.trim() || null,
      contactUrgenceTelephone: v.contactUrgenceTelephone?.trim() || null,
      methodeContactPreferee: v.methodeContactPreferee || null,
      numeroDossier: v.numeroDossier?.trim() || null,
      photo: patient.utilisateur.photo ?? null
    };

    this.savingId = patient.id;
    this.patientService.updatePatient(patient.id, payload).subscribe({
      next: (updated) => {
        this.rows.set(this.rows().map((row) => (row.id === updated.id ? updated : row)));
        this.savingId = null;
        this.cancelEdit();
        this.toast.show('Patient modifié avec succès.', 'success');
      },
      error: (err) => {
        console.error(err);
        this.savingId = null;
        this.toast.show('Modification impossible.', 'error');
      }
    });
  }

  toggleActif(patient: Patient, event?: Event): void {
    event?.stopPropagation();
    const current = this.isActif(patient);
    this.toggleActifConfirmed(patient, !current);
  }

  openDeactivateModal(patient: Patient): void {
    this.confirmTarget = patient;
  }

  cancelDeactivate(): void {
    this.confirmTarget = null;
  }

  confirmDeactivate(): void {
    if (!this.confirmTarget) {
      return;
    }
    this.toggleActifConfirmed(this.confirmTarget, false);
    this.confirmTarget = null;
  }

  private toggleActifConfirmed(patient: Patient, nextActif: boolean): void {
    const u = patient.utilisateur;
    this.togglingId = patient.id;
    this.utilisateurService
      .updateProfil(u.id, {
        nom: u.nom ?? '',
        prenom: u.prenom ?? '',
        email: u.email ?? '',
        telephone: u.telephone ?? null,
        adresse: u.adresse ?? null,
        ville: u.ville ?? null,
        gouvernorat: u.gouvernorat ?? null,
        codePostal: u.codePostal ?? null,
        actif: nextActif
      })
      .subscribe({
        next: (updated) => {
          this.rows.set(
            this.rows().map((row) =>
              row.id === patient.id
                ? { ...row, utilisateur: { ...row.utilisateur, actif: updated.actif } }
                : row
            )
          );
          this.togglingId = null;
          this.toast.show(updated.actif ? 'Patient réactivé.' : 'Patient désactivé.', 'success');
        },
        error: (err) => {
          console.error(err);
          this.togglingId = null;
          this.toast.show('Mise à jour du statut impossible.', 'error');
        }
      });
  }

  isActif(patient: Patient): boolean {
    return patient.utilisateur.actif ?? true;
  }

  formatDerniereConsultation(value?: string | null): string {
    if (!value) {
      return '—';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleDateString('fr-FR');
  }

  private toEditModel(patient: Patient): PatientEditModel {
    const u = patient.utilisateur;
    const dateNaissance = u.dateNaissance ? String(u.dateNaissance).slice(0, 10) : '';

    return {
      nom: u.nom ?? '',
      prenom: u.prenom ?? '',
      email: u.email ?? '',
      telephone: u.telephone ?? '',
      motDePasse: '',
      adresse: u.adresse ?? '',
      ville: u.ville ?? '',
      gouvernorat: u.gouvernorat ?? '',
      codePostal: u.codePostal ?? '',
      dateNaissance,
      sexe: u.sexe ?? '',
      situationMatrimoniale: patient.situationMatrimoniale ?? '',
      contactUrgenceNom: patient.contactUrgenceNom ?? '',
      contactUrgenceTelephone: patient.contactUrgenceTelephone ?? '',
      methodeContactPreferee: patient.methodeContactPreferee ?? 'TELEPHONE',
      numeroDossier: patient.numeroDossier ?? ''
    };
  }
}
