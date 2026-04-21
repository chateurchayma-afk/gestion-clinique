import { Component, computed, inject, signal } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';
import { filter } from 'rxjs/operators';
import type { DashboardShellConfig } from './dashboard-shell.config';

interface StoredUser {
  token?: string;
  role?: string;
  email?: string;
  nom?: string;
  prenom?: string;
}

const FALLBACK_SHELL: DashboardShellConfig = {
  roleTag: 'Espace',
  userRoleLabel: 'Utilisateur',
  navSections: [{ title: null, items: [] }]
};

@Component({
  selector: 'app-dashboard-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './dashboard-shell.html',
  styleUrl: './dashboard-shell.css'
})
export class DashboardShell {
  private readonly router = inject(Router);

  readonly navOpen = signal(false);
  readonly pageTitle = signal('Tableau de bord');

  readonly shellConfig: DashboardShellConfig = this.resolveShell();

  readonly user = signal<StoredUser | null>(this.readUser());

  readonly userInitials = computed(() => {
    const u = this.user();
    const p = (u?.prenom ?? '').trim().charAt(0);
    const n = (u?.nom ?? '').trim().charAt(0);
    const fromName = `${p}${n}`.toUpperCase();
    if (fromName.length >= 1) {
      return fromName.length >= 2 ? fromName : `${fromName}${(u?.email ?? '?').charAt(0).toUpperCase()}`;
    }
    const em = (u?.email ?? '').trim();
    return em.length >= 2 ? em.slice(0, 2).toUpperCase() : '??';
  });

  readonly userDisplayName = computed(() => {
    const u = this.user();
    const full = `${(u?.prenom ?? '').trim()} ${(u?.nom ?? '').trim()}`.trim();
    if (full) {
      return full;
    }
    return (u?.email ?? '').trim() || 'Utilisateur';
  });

  constructor() {
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe(() => {
      this.pageTitle.set(this.computePageTitle(this.router.url));
      this.navOpen.set(false);
    });
    this.pageTitle.set(this.computePageTitle(this.router.url));
  }

  private resolveShell(): DashboardShellConfig {
    let n: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
    while (n) {
      const shell = n.data['shell'] as DashboardShellConfig | undefined;
      if (shell?.navSections?.length) {
        return shell;
      }
      n = n.firstChild;
    }
    return FALLBACK_SHELL;
  }

  private readUser(): StoredUser | null {
    const raw = localStorage.getItem('user');
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as StoredUser;
    } catch {
      return null;
    }
  }

  private computePageTitle(url: string): string {
    if (url.includes('/patient-dashboard/profil')) {
      return 'Mon profil';
    }
    if (url.includes('/patient-dashboard/medecins/profil/')) {
      return 'Fiche médecin';
    }
    if (url.includes('/patient-dashboard/medecins')) {
      return 'Médecins';
    }
    if (url.includes('/patient-dashboard/rendez-vous/nouveau')) {
      return 'Nouveau rendez-vous';
    }
    if (url.includes('/patient-dashboard/rendez-vous')) {
      return 'Mes rendez-vous';
    }
    if (url.includes('/admin/rdv')) {
      return 'Rendez-vous';
    }
    if (url.includes('/admin/planning-medecins')) {
      return 'Planning';
    }
    if (url.includes('/admin/medecins')) {
      return 'Médecins';
    }
    if (url.includes('/admin/patients')) {
      return 'Patients';
    }
    if (url.includes('/admin/add-medecin') || url.includes('/admin/edit-medecin')) {
      return 'Médecin';
    }
    if (url.includes('/admin/add-patient') || url.includes('/admin/edit-patient')) {
      return 'Patient';
    }
    if (url.includes('/admin/specialites') || url.includes('/admin/add-specialite')) {
      return 'Spécialités';
    }
    if (url.includes('/admin/services') || url.includes('/admin/add-service')) {
      return 'Services';
    }
    if (url.includes('/admin/dashboard')) {
      return 'Tableau de bord';
    }
    if (url.includes('/medecin-dashboard')) {
      return 'Accueil';
    }
    return 'Tableau de bord';
  }

  toggleNav(): void {
    this.navOpen.update((v) => !v);
  }

  closeNav(): void {
    this.navOpen.set(false);
  }

  logout(): void {
    localStorage.removeItem('user');
    void this.router.navigate(['/login']);
  }
}
