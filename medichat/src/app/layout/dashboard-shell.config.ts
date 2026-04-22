export interface DashboardNavItem {
  label: string;
  path: string;
  exact?: boolean;
}

export interface DashboardNavSection {
  title?: string | null;
  items: DashboardNavItem[];
}

export interface DashboardShellConfig {
  roleTag: string;
  userRoleLabel: string;
  navSections: DashboardNavSection[];
}

export const PATIENT_SHELL: DashboardShellConfig = {
  roleTag: 'Espace patient',
  userRoleLabel: 'Patient',
  navSections: [
    {
      title: null,
      items: [
        { label: 'Tableau de bord', path: '/patient-dashboard/accueil', exact: true },
        { label: 'Médecins', path: '/patient-dashboard/medecins' },
        { label: 'Mes rendez-vous', path: '/patient-dashboard/rendez-vous' },
        { label: 'Mon profil', path: '/patient-dashboard/profil', exact: true }
      ]
    }
  ]
};

export const ADMIN_SHELL: DashboardShellConfig = {
  roleTag: 'Administration',
  userRoleLabel: 'Admin',
  navSections: [
    {
      title: null,
      items: [
        { label: 'Tableau de bord', path: '/admin/dashboard', exact: true },
        { label: 'Mon profil', path: '/admin/mon-profil', exact: true },
        { label: 'Liste des médecins', path: '/admin/medecins' },
        { label: 'Ajouter un médecin', path: '/admin/add-medecin' },
        { label: 'Planning des médecins', path: '/admin/planning-medecins' },
        { label: 'Liste des patients', path: '/admin/patients' },
        { label: 'Ajouter un patient', path: '/admin/add-patient' },
        { label: 'Rendez-vous', path: '/admin/rdv' },
        { label: 'Liste des services', path: '/admin/services' },
        { label: 'Liste des spécialités', path: '/admin/specialites' }
      ]
    }
  ]
};

export const MEDECIN_SHELL: DashboardShellConfig = {
  roleTag: 'Espace médecin',
  userRoleLabel: 'Médecin',
  navSections: [
    {
      title: null,
      items: [
        { label: 'Médecin — Accueil', path: '/medecin-dashboard/accueil', exact: true },
        { label: 'Profil', path: '/medecin-dashboard/mon-profil', exact: true },
        { label: 'Liste des patients', path: '/medecin-dashboard/patients' },
        { label: 'Rendez-vous', path: '/medecin-dashboard/rendez-vous' },
        { label: 'Dossier médical', path: '/medecin-dashboard/dossier-medical' },
        { label: 'Consultation', path: '/medecin-dashboard/consultation' },
        { label: 'Ordonnance PDF', path: '/medecin-dashboard/ordonnance-pdf' }
      ]
    }
  ]
};
