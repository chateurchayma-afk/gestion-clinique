import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../../core/toast.service';
import { MedecinContextService } from '../../../core/medecin-context.service';
import {
  AdminRendezVousPlanningItem,
  AdminRendezVousService
} from '../../../services/admin-rendez-vous.service';
import {
  DossierMedicalResponse,
  DossierMedicalService,
  DossierMedicalVersionResponse
} from '../../../services/dossier-medical.service';
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

export type PatientPanelMode = 'coords' | 'edit' | 'dossier' | 'rdv' | 'historique';

function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatHeure(value: string | number[] | Record<string, unknown>): string {
  if (typeof value === 'string') {
    return value.length >= 5 ? value.slice(0, 5) : value;
  }
  if (Array.isArray(value) && value.length >= 2) {
    const h = Number(value[0]);
    const mi = Number(value[1]);
    if (Number.isFinite(h) && Number.isFinite(mi)) {
      return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
    }
  }
  return '—';
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

function labelStatutRdv(statut: string): string {
  switch ((statut ?? '').toUpperCase()) {
    case 'EN_ATTENTE':
      return 'En attente';
    case 'CONFIRME':
      return 'Confirmé';
    case 'ANNULE':
      return 'Annulé';
    case 'TERMINE':
      return 'Terminé';
    default:
      return statut || '—';
  }
}

@Component({
  selector: 'app-medecin-patients-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './medecin-patients-list.html',
  styleUrls: ['./medecin-patients-list.css', '../medecin-pro.css']
})
export class MedecinPatientsList implements OnInit {
  private readonly medecinPortal = inject(MedecinPortalService);
  private readonly medecinCtx = inject(MedecinContextService);
  private readonly dossierMedical = inject(DossierMedicalService);
  private readonly adminRdv = inject(AdminRendezVousService);
  private readonly toast = inject(ToastService);
  private readonly patientService = inject(PatientService);
  private readonly utilisateurService = inject(UtilisateurService);

  readonly rows = signal<Patient[]>([]);
  readonly loading = signal(true);
  readonly dossierLoading = signal(false);
  readonly dossierData = signal<DossierMedicalResponse | null>(null);
  readonly historiqueLoading = signal(false);
  readonly historiqueRows = signal<DossierMedicalVersionResponse[]>([]);
  readonly expandedVersionId = signal<number | null>(null);
  readonly rdvLoading = signal(false);
  readonly rdvRows = signal<AdminRendezVousPlanningItem[]>([]);

  expandedId: number | null = null;
  panelMode: PatientPanelMode = 'coords';
  editingId: number | null = null;
  savingId: number | null = null;
  togglingId: number | null = null;
  openMenuId: number | null = null;
  editModel: PatientEditModel | null = null;
  confirmTarget: Patient | null = null;
  private medecinId: number | null = null;

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

    this.medecinCtx.resolveMedecinId().subscribe({
      next: (id) => {
        this.medecinId = id;
      }
    });
  }

  collapsePatient(): void {
    this.expandedId = null;
    this.panelMode = 'coords';
    this.cancelEdit();
    this.dossierData.set(null);
    this.historiqueRows.set([]);
    this.expandedVersionId.set(null);
    this.rdvRows.set([]);
  }

  private openPanel(patient: Patient, mode: PatientPanelMode): void {
    if (this.expandedId === patient.id && this.panelMode === mode) {
      this.collapsePatient();
      return;
    }
    this.cancelEdit();
    this.expandedId = patient.id;
    this.panelMode = mode;
    this.dossierData.set(null);
    this.historiqueRows.set([]);
    this.expandedVersionId.set(null);
    if (mode === 'dossier') {
      this.loadDossier(patient.id);
    } else if (mode === 'rdv') {
      this.loadRendezVous(patient.id);
    } else {
      this.rdvRows.set([]);
    }
  }

  toggleDetails(patient: Patient): void {
    this.openPanel(patient, 'coords');
  }

  toggleEdit(patient: Patient): void {
    if (this.isActionDisabled(patient)) {
      return;
    }
    if (this.expandedId === patient.id && this.panelMode === 'edit') {
      this.collapsePatient();
      return;
    }
    this.expandedId = patient.id;
    this.panelMode = 'edit';
    this.editingId = patient.id;
    this.editModel = this.toEditModel(patient);
    this.openMenuId = null;
    this.dossierData.set(null);
    this.historiqueRows.set([]);
    this.expandedVersionId.set(null);
    this.rdvRows.set([]);
  }

  openDossier(patient: Patient): void {
    if (!this.canAccessDossier(patient)) {
      return;
    }
    this.openPanel(patient, 'dossier');
  }

  openRendezVous(patient: Patient): void {
    if (!this.canAccessDossier(patient)) {
      return;
    }
    this.openPanel(patient, 'rdv');
  }

  isPanelActive(patient: Patient, mode: PatientPanelMode): boolean {
    return this.expandedId === patient.id && this.panelMode === mode;
  }

  panelTitle(patient: Patient): string {
    switch (this.panelMode) {
      case 'dossier':
        return 'Dossier médical';
      case 'rdv':
        return 'Rendez-vous';
      case 'edit':
        return 'Modifier le patient';
      default:
        return 'Coordonnées patient';
    }
  }

  panelSubtitle(patient: Patient): string {
    const name = `${patient.utilisateur.prenom} ${patient.utilisateur.nom}`.trim();
    switch (this.panelMode) {
      case 'dossier':
        return `Informations médicales de ${name}`;
      case 'rdv':
        return `Historique des rendez-vous de ${name}`;
      case 'edit':
        return 'Mettez à jour les informations du patient.';
      default:
        return 'Informations personnelles et dossier.';
    }
  }

  tipVoir(patient: Patient): string {
    return this.isPanelActive(patient, 'coords') ? 'Masquer la fiche' : 'Voir la fiche';
  }

  tipDossier(patient: Patient): string {
    if (!this.canAccessDossier(patient)) {
      return 'Action indisponible';
    }
    return this.isPanelActive(patient, 'dossier')
      ? 'Masquer le dossier médical'
      : 'Ouvrir le dossier médical';
  }

  tipRdv(patient: Patient): string {
    if (!this.canAccessDossier(patient)) {
      return 'Action indisponible';
    }
    return this.isPanelActive(patient, 'rdv')
      ? 'Masquer les rendez-vous'
      : 'Voir les rendez-vous';
  }

  tipEdit(patient: Patient): string {
    if (this.isActionDisabled(patient)) {
      return 'Patient désactivé';
    }
    return this.isPanelActive(patient, 'edit') ? 'Masquer le formulaire' : 'Modifier le patient';
  }

  formatRdvDate(value: string | number[] | Record<string, unknown>): string {
    const iso = parseIsoDate(value);
    if (!iso) {
      return '—';
    }
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    return d.toLocaleDateString('fr-FR');
  }

  formatRdvHeure(value: string | number[] | Record<string, unknown>): string {
    return formatHeure(value);
  }

  labelRdvStatut(statut: string): string {
    return labelStatutRdv(statut);
  }

  displayDossierVal(value: string | null | undefined): string {
    const t = (value ?? '').trim();
    return t || '—';
  }

  formatDossierTaille(cm: string | null | undefined): string {
    const t = (cm ?? '').trim();
    if (!t) {
      return '—';
    }
    return /cm/i.test(t) ? t : `${t} cm`;
  }

  formatDossierPoids(kg: string | null | undefined): string {
    const t = (kg ?? '').trim();
    if (!t) {
      return '—';
    }
    return /kg/i.test(t) ? t : `${t} kg`;
  }

  labelRappelFrequence(code: string | null | undefined): string {
    const map: Record<string, string> = {
      CHAQUE_JOUR: 'Chaque jour',
      DEUX_FOIS_JOUR: 'Deux fois par jour',
      CHAQUE_SEMAINE: 'Chaque semaine',
      CHAQUE_MOIS: 'Chaque mois'
    };
    const key = (code ?? '').trim();
    return map[key] ?? (key || '—');
  }

  labelTabac(code: string | null | undefined): string {
    const map: Record<string, string> = {
      jamais: 'Jamais',
      ancien: 'Ancien fumeur',
      occasionnel: 'Occasionnel',
      actif: 'Fumeur actif'
    };
    const key = (code ?? '').trim();
    return map[key] ?? (key || '—');
  }

  labelAlcool(code: string | null | undefined): string {
    const map: Record<string, string> = {
      aucune: 'Aucune',
      moderee: 'Modérée',
      elevee: 'Élevée'
    };
    const key = (code ?? '').trim();
    return map[key] ?? (key || '—');
  }

  labelActivite(code: string | null | undefined): string {
    const map: Record<string, string> = {
      faible: 'Faible',
      moderee2: 'Modérée',
      elevee2: 'Élevée',
      sportif: 'Activité sportive régulière'
    };
    const key = (code ?? '').trim();
    return map[key] ?? (key || '—');
  }

  antecedentsFamiliaux(d: DossierMedicalResponse): { label: string; actif: boolean }[] {
    return [
      { label: 'Diabète', actif: !!d.famDiabete },
      { label: 'Hypertension', actif: !!d.famHypertension },
      { label: 'Asthme', actif: !!d.famAsthme },
      { label: 'Maladies cardiaques', actif: !!d.famCardiaque },
      { label: 'Troubles de santé mentale', actif: !!d.famMentaux },
      { label: 'Cancer', actif: !!d.famCancer }
    ];
  }

  private loadDossier(patientId: number): void {
    this.dossierLoading.set(true);
    this.dossierData.set(null);
    this.dossierMedical.getByPatientId(patientId).subscribe({
      next: (d) => {
        this.dossierData.set(d);
        this.dossierLoading.set(false);
      },
      error: () => {
        this.dossierLoading.set(false);
        this.dossierData.set(null);
        this.toast.show('Dossier médical introuvable pour ce patient.', 'error');
      }
    });
  }

  private loadRendezVous(patientId: number): void {
    this.rdvLoading.set(true);
    this.rdvRows.set([]);
    const run = (medecinId: number | null) => {
      this.adminRdv.listPlanning(isoOffset(-730), isoOffset(730), medecinId).subscribe({
        next: (list) => {
          const rows = (list ?? [])
            .filter((r) => Number(r.patientId) === Number(patientId))
            .sort((a, b) => {
              const da = parseIsoDate(a.dateRendezVous);
              const db = parseIsoDate(b.dateRendezVous);
              if (da !== db) {
                return db.localeCompare(da);
              }
              return formatHeure(b.heureDebut).localeCompare(formatHeure(a.heureDebut));
            });
          this.rdvRows.set(rows);
          this.rdvLoading.set(false);
        },
        error: () => {
          this.rdvLoading.set(false);
          this.toast.show('Impossible de charger les rendez-vous.', 'error');
        }
      });
    };
    if (this.medecinId != null) {
      run(this.medecinId);
      return;
    }
    this.medecinCtx.resolveMedecinId().subscribe({
      next: (id) => {
        this.medecinId = id;
        run(id);
      }
    });
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
    this.toggleEdit(patient);
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editModel = null;
    if (this.panelMode === 'edit') {
      this.panelMode = 'coords';
    }
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
        this.panelMode = 'coords';
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
