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
import {
  NotificationItem,
  NotificationService,
  isPatientSpecialNotification
} from '../services/notification.service';
import { forkJoin } from 'rxjs';
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
  private readonly notificationService = inject(NotificationService);

  readonly navOpen = signal(false);
  readonly pageTitle = signal('Tableau de bord');
  readonly notifOpen = signal(false);
  readonly userMenuOpen = signal(false);
  readonly notifLoading = signal(false);
  readonly notifItems = signal<NotificationItem[]>([]);
  readonly notifUnreadCount = signal(0);

  readonly shellConfig: DashboardShellConfig = this.resolveShell();

  /** Style nav. médecin (items type « fiche wireframe ») sans retirer le thème MediChat. */
  readonly isMedecinShell = this.shellConfig.userRoleLabel === 'Médecin';

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

  readonly userMenuTitle = computed(() => {
    const name = this.userDisplayName();
    if (this.isMedecinShell && name && !name.startsWith('Dr.')) {
      return `Dr. ${name}`;
    }
    return name;
  });

  readonly hasNotifications = computed(() => this.notifUnreadCount() > 0);

  readonly notificationsLink = computed(() => {
    const role = (this.user()?.role ?? '').toString().trim().toUpperCase();
    if (role === 'ADMIN') {
      return '/admin/notifications';
    }
    if (role === 'MEDECIN') {
      return '/medecin-dashboard/notifications';
    }
    if (role === 'PATIENT') {
      return '/patient-dashboard/notifications';
    }
    return '/login';
  });

  constructor() {
    this.userSession.profileUpdated$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.user.set(this.readUser());
    });
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe(() => {
      this.pageTitle.set(this.computePageTitle(this.router.url));
      this.navOpen.set(false);
      this.notifOpen.set(false);
      this.userMenuOpen.set(false);
      this.user.set(this.readUser());
      this.reloadNotifications();
    });
    this.pageTitle.set(this.computePageTitle(this.router.url));
    this.reloadNotifications();
  }

  toggleNotifications(): void {
    this.userMenuOpen.set(false);
    this.notifOpen.update((v) => !v);
    if (this.notifOpen()) {
      this.reloadNotifications();
    }
  }

  toggleUserMenu(): void {
    this.notifOpen.set(false);
    this.userMenuOpen.update((v) => !v);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  markAllNotificationsRead(): void {
    this.notificationService.markAllRead().subscribe({
      next: () => {
        this.notifItems.set(this.notifItems().map((n) => ({ ...n, isRead: true })));
        this.notifUnreadCount.set(0);
      }
    });
  }

  markNotificationRead(item: NotificationItem): void {
    if (item.isRead) {
      return;
    }
    this.notificationService.markRead(item.id).subscribe({
      next: () => {
        this.notifItems.set(this.notifItems().map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
        this.notifUnreadCount.set(Math.max(0, this.notifUnreadCount() - 1));
      }
    });
  }

  notificationIcon(type: NotificationItem['type']): string {
    switch (type) {
      case 'NOUVEAU_RENDEZ_VOUS':
        return '📅';
      case 'RENDEZ_VOUS_ANNULE':
        return '❌';
      case 'NOUVEAU_PATIENT':
        return '🧑‍⚕️';
      case 'CONSULTATION_TERMINEE':
        return '✅';
      case 'ORDONNANCE_CREEE':
        return '💊';
      case 'PROFIL_MODIFIE':
        return '👤';
      case 'RAPPEL_TRAITEMENT':
        return '💊';
      default:
        return '⚠️';
    }
  }

  readonly isPatientShell = this.shellConfig.userRoleLabel === 'Patient';

  isSpecialPatientNotification(n: NotificationItem): boolean {
    return this.isPatientShell && isPatientSpecialNotification(n.type);
  }

  formatNotifDate(value: string): string {
    if (!value) {
      return '';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    const d = parsed.toLocaleDateString('fr-FR');
    const t = parsed.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${d} ${t}`;
  }

  private reloadNotifications(): void {
    const raw = localStorage.getItem('user');
    if (!raw) {
      this.clearNotificationsState();
      return;
    }
    try {
      const u = JSON.parse(raw) as { token?: string | null };
      if (!u?.token) {
        this.clearNotificationsState();
        return;
      }
    } catch {
      this.clearNotificationsState();
      return;
    }

    this.notifLoading.set(true);
    forkJoin({
      recent: this.notificationService.recent(6),
      count: this.notificationService.unreadCount()
    }).subscribe({
      next: ({ recent, count }) => {
        this.notifItems.set(recent ?? []);
        this.notifUnreadCount.set(count?.count ?? 0);
        this.notifLoading.set(false);
      },
      error: () => {
        this.notifItems.set([]);
        this.notifUnreadCount.set(0);
        this.notifLoading.set(false);
      }
    });
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
      return 'Liste des médecins';
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
    
    if (url.includes('/admin/mon-profil') || url.includes('/medecin-dashboard/mon-profil')) {
      return 'Mon profil';
    }
    if (url.includes('/admin/dashboard')) {
      return 'Tableau de bord';
    }
    if (url.includes('/medecin-dashboard/ordonnance-pdf')) {
      return 'Ordonnance';
    }
    if (url.includes('/medecin-dashboard/consultation')) {
      return 'Consultation';
    }
    if (url.includes('/medecin-dashboard/dossier-medical')) {
      return 'Dossier médical';
    }
    if (url.includes('/medecin-dashboard/rendez-vous')) {
      return 'Rendez-vous';
    }
    if (url.includes('/medecin-dashboard/patients')) {
      return 'Liste des patients';
    }
    if (url.includes('/medecin-dashboard/accueil')) {
      return 'Accueil';
    }
    if (url.includes('/medecin-dashboard')) {
      return 'Espace médecin';
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
    this.clearNotificationsState();
    localStorage.removeItem('user');
    void this.router.navigate(['/login']);
  }

  private clearNotificationsState(): void {
    this.notifOpen.set(false);
    this.notifItems.set([]);
    this.notifUnreadCount.set(0);
    this.notifLoading.set(false);
    this.userMenuOpen.set(false);
  }
}
