import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { RegisterMedecin } from './pages/register-medecin/register-medecin';
import { RegisterPatient } from './pages/register-patient/register-patient';
import { RegisterAdmin } from './pages/register-admin/register-admin';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password';
import { AdminDashboard } from './pages/admin/admin-dashboard/admin-dashboard';
import { MedecinsList } from './pages/admin/medecins-list/medecins-list';
import { AddMedecin } from './pages/admin/add-medecin/add-medecin';
import { PatientsList } from './pages/admin/patients-list/patients-list';
import { AddPatient } from './pages/admin/add-patient/add-patient';
import { SpecialitesList } from './pages/admin/specialites-list/specialites-list';
import { AddSpecialite } from './pages/admin/add-specialite/add-specialite';
import { ServicesList } from './pages/admin/services-list/services-list';
import { AddService } from './pages/admin/add-service/add-service';
import { PlanningMedecins } from './pages/admin/planning-medecins/planning-medecins';
import { AdminRendezVousList } from './pages/admin/admin-rendez-vous-list/admin-rendez-vous-list';
import { DashboardShell } from './layout/dashboard-shell';
import { ADMIN_SHELL, MEDECIN_SHELL, PATIENT_SHELL } from './layout/dashboard-shell.config';
import { NotFound } from './pages/not-found/not-found';
import { MedecinAccueil } from './pages/medecin/medecin-accueil/medecin-accueil';
import { MedecinConsultation } from './pages/medecin/medecin-consultation/medecin-consultation';
import { MedecinDossierMedical } from './pages/medecin/medecin-dossier-medical/medecin-dossier-medical';
import { MedecinOrdonnancePdf } from './pages/medecin/medecin-ordonnance-pdf/medecin-ordonnance-pdf';
import { MedecinPatientsList } from './pages/medecin/medecin-patients-list/medecin-patients-list';
import { MedecinRendezVous } from './pages/medecin/medecin-rendez-vous/medecin-rendez-vous';
import { PatientHome } from './pages/patient/patient-home/patient-home';
import { PatientMedecins } from './pages/patient/patient-medecins/patient-medecins';
import { PatientRdvList } from './pages/patient/patient-rdv-list/patient-rdv-list';
import { PatientRdvNew } from './pages/patient/patient-rdv-new/patient-rdv-new';
import { PatientMedecinProfil } from './pages/patient/patient-medecin-profil/patient-medecin-profil';
import { PatientProfil } from './pages/patient/patient-profil/patient-profil';
import { AccountProfil } from './pages/account-profil/account-profil';
import { adminGuard } from './core/admin.guard';
import { medecinGuard } from './core/medecin.guard';
import { patientGuard } from './core/patient.guard';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'register/medecin', component: RegisterMedecin },
  { path: 'register/patient', component: RegisterPatient },
  { path: 'register/admin', component: RegisterAdmin },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'admindashboard', redirectTo: 'admin/dashboard', pathMatch: 'full' },
  { path: 'admin-dashboard', redirectTo: 'admin/dashboard', pathMatch: 'full' },
  {
    path: 'admin',
    component: DashboardShell,
    canActivate: [adminGuard],
    data: { shell: ADMIN_SHELL },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: AdminDashboard },
      { path: 'mon-profil', component: AccountProfil },
      { path: 'medecins', component: MedecinsList },
      { path: 'add-medecin', component: AddMedecin },
      { path: 'edit-medecin/:id', component: AddMedecin },
      { path: 'patients', component: PatientsList },
      { path: 'add-patient', component: AddPatient },
      { path: 'edit-patient/:id', component: AddPatient },
      { path: 'specialites', component: SpecialitesList },
      { path: 'add-specialite', component: AddSpecialite },
      { path: 'services', component: ServicesList },
      { path: 'add-service', component: AddService },
      { path: 'planning-medecins', component: PlanningMedecins },
      { path: 'rendez-vous', pathMatch: 'full', redirectTo: 'rdv' },
      { path: 'rdv', component: AdminRendezVousList }
    ]
  },
  {
    path: 'medecin-dashboard',
    component: DashboardShell,
    canActivate: [medecinGuard],
    data: { shell: MEDECIN_SHELL },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'accueil' },
      { path: 'accueil', component: MedecinAccueil },
      { path: 'mon-profil', component: AccountProfil },
      { path: 'patients', component: MedecinPatientsList },
      { path: 'rendez-vous', component: MedecinRendezVous },
      { path: 'dossier-medical', component: MedecinDossierMedical },
      { path: 'consultation', component: MedecinConsultation },
      { path: 'ordonnance-pdf', component: MedecinOrdonnancePdf }
    ]
  },
  {
    path: 'patient-dashboard',
    component: DashboardShell,
    canActivate: [patientGuard],
    data: { shell: PATIENT_SHELL },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'accueil' },
      { path: 'accueil', component: PatientHome },
      { path: 'profil', component: PatientProfil },
      { path: 'medecins/profil/:id', component: PatientMedecinProfil },
      { path: 'medecins', component: PatientMedecins },
      { path: 'rendez-vous/nouveau', component: PatientRdvNew },
      { path: 'rendez-vous', component: PatientRdvList }
    ]
  },
  { path: '**', component: NotFound }
];
