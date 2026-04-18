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
import { NotFound } from './pages/not-found/not-found';
import { RoleHome } from './pages/role-home/role-home';
import { adminGuard } from './core/admin.guard';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'register/medecin', component: RegisterMedecin },
  { path: 'register/patient', component: RegisterPatient },
  { path: 'register/admin', component: RegisterAdmin },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'admin-dashboard', component: AdminDashboard, canActivate: [adminGuard] },
  { path: 'admin/medecins', component: MedecinsList, canActivate: [adminGuard] },
  { path: 'admin/add-medecin', component: AddMedecin, canActivate: [adminGuard] },
  { path: 'admin/edit-medecin/:id', component: AddMedecin, canActivate: [adminGuard] },
  { path: 'admin/patients', component: PatientsList, canActivate: [adminGuard] },
  { path: 'admin/add-patient', component: AddPatient, canActivate: [adminGuard] },
  { path: 'admin/edit-patient/:id', component: AddPatient, canActivate: [adminGuard] },
  { path: 'admin/specialites', component: SpecialitesList, canActivate: [adminGuard] },
  { path: 'admin/add-specialite', component: AddSpecialite, canActivate: [adminGuard] },
  { path: 'admin/services', component: ServicesList, canActivate: [adminGuard] },
  { path: 'admin/add-service', component: AddService, canActivate: [adminGuard] },
  {
    path: 'medecin-dashboard',
    component: RoleHome,
    data: {
      title: 'Espace médecin',
      subtitle: 'Votre tableau de bord sera enrichi au fil du projet.'
    }
  },
  {
    path: 'patient-dashboard',
    component: RoleHome,
    data: {
      title: 'Espace patient',
      subtitle: 'Retrouvez ici prochainement vos rendez-vous et messages.'
    }
  },
  { path: '**', component: NotFound }
];
