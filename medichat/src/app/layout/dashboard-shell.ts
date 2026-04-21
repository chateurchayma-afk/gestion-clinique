import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ActivatedRouteSnapshot,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';
import { filter } from 'rxjs/operators';
import { UserSessionService } from '../core/user-session.service';
import { RendezVousPatient, RendezVousPatientService } from '../services/rendez-vous-patient.service';
import type { DashboardShellConfig } from './dashboard-shell.config';

interface StoredUser {
  id?: number;
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
  private readonly userSession = inject(UserSessionService);
  private readonly rdvPatientService = inject(RendezVousPatientService);

  readonly navOpen = signal(false);
  readonly pageTitle = signal('Tableau de bord');
  readonly notifOpen = signal(false);
  readonly notifLoading = signal(false);
  readonly notifMessages = signal<string[]>([]);

  readonly shellConfig: DashboardShellConfig = this.resolveShell();

  readonly user = signal<StoredUser | null>(this.readUser());

  readonly profileLink = computed(() => {
    const role = (this.user()?.role ?? '').toString().trim().toUpperCase();
    if (role === 'ADMIN') {
      return '/admin/mon-profil';
    }
    if (role === 'MEDECIN') {
      return '/medecin-dashboard/mon-profil';
    }
    if (role === 'PATIENT') {
      return '/patient-dashboard/profil';
    }
    return '/login';
  });

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

  readonly hasNotifications = computed(() => this.notifMessages().length > 0);

  constructor() {
    this.userSession.profileUpdated$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.user.set(this.readUser());
    });
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe(() => {
      this.pageTitle.set(this.computePageTitle(this.router.url));
      this.navOpen.set(false);
      this.notifOpen.set(false);
      this.user.set(this.readUser());
      this.reloadNotifications();
    });
    this.pageTitle.set(this.computePageTitle(this.router.url));
    this.reloadNotifications();
  }

  toggleNotifications(): void {
    this.notifOpen.update((v) => !v);
    if (this.notifOpen()) {
      this.reloadNotifications();
    }
  }

  private reloadNotifications(): void {
    if (!this.isPatient()) {
      this.notifMessages.set([]);
      this.notifLoading.set(false);
      return;
    }

    this.notifLoading.set(true);
    this.rdvPatientService.list().subscribe({
      next: (rows) => {
        const upcoming = this.upcomingWithin7Days(rows ?? []);
        const lines = upcoming.map((r) => {
          const d = this.parseRdvDateTime(r);
          if (!d) {
            return `Vous avez un rendez-vous avec Dr. ${r.medecinPrenom} ${r.medecinNom} dans les 7 jours.`;
          }
          const day = d.toLocaleDateString('fr-FR');
          const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          return `Rendez-vous le ${day} a ${time} avec Dr. ${r.medecinPrenom} ${r.medecinNom}.`;
        });
        this.notifMessages.set(lines);
        this.notifLoading.set(false);
      },
      error: () => {
        this.notifMessages.set([]);
        this.notifLoading.set(false);
      }
    });
  }

  private isPatient(): boolean {
    const role = (this.user()?.role ?? '').toString().trim().toUpperCase();
    return role === 'PATIENT';
  }

  private parseRdvDateTime(r: RendezVousPatient): Date | null {
    const dateRaw = (r.dateRendezVous ?? '').toString().trim();
    const datePart = dateRaw.length >= 10 ? dateRaw.slice(0, 10) : dateRaw;
    const mDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
    if (!mDate) {
      return null;
    }

    const timeRaw = (r.heureDebut ?? '').toString().trim();
    const mTime = /^(\d{2}):(\d{2})/.exec(timeRaw);

    const y = Number(mDate[1]);
    const mo = Number(mDate[2]);
    const da = Number(mDate[3]);
    const hh = mTime ? Number(mTime[1]) : 0;
    const mm = mTime ? Number(mTime[2]) : 0;

    if (
      !Number.isFinite(y) ||
      !Number.isFinite(mo) ||
      !Number.isFinite(da) ||
      !Number.isFinite(hh) ||
      !Number.isFinite(mm)
    ) {
      return null;
    }

    return new Date(y, mo - 1, da, hh, mm, 0, 0);
  }

  private upcomingWithin7Days(rows: RendezVousPatient[]): RendezVousPatient[] {
    const now = new Date();
    const max = new Date(now);
    max.setDate(max.getDate() + 7);

    return [...rows]
      .filter((r) => r.statut === 'CONFIRME')
      .map((r) => ({ row: r, dt: this.parseRdvDateTime(r) }))
      .filter((x) => x.dt !== null && x.dt >= now && x.dt <= max)
      .sort((a, b) => (a.dt!.getTime() - b.dt!.getTime()))
      .map((x) => x.row);
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
      return 'Planning des médecins';
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
    if (url.includes('/admin/mon-profil') || url.includes('/medecin-dashboard/mon-profil')) {
      return 'Mon profil';
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
