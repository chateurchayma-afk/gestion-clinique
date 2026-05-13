import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NotificationItem, NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './notifications.html',
  styleUrls: ['./notifications.css', '../medecin/medecin-pro.css']
})
export class NotificationsPage implements OnInit {
  private readonly notificationService = inject(NotificationService);

  readonly loading = signal(true);
  readonly items = signal<NotificationItem[]>([]);
  readonly total = signal(0);
  readonly unreadCount = signal(0);

  readonly page = signal(0);
  readonly size = signal(10);
  readonly filter = signal<'all' | 'unread' | 'archived'>('all');
  readonly query = signal('');

  readonly totalPages = computed(() => Math.ceil(this.total() / this.size()));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.notificationService
      .list(this.filter(), this.query(), this.page(), this.size())
      .subscribe({
        next: (res) => {
          this.items.set(res.items ?? []);
          this.total.set(res.total ?? 0);
          this.unreadCount.set(res.unreadCount ?? 0);
          this.loading.set(false);
        },
        error: () => {
          this.items.set([]);
          this.total.set(0);
          this.unreadCount.set(0);
          this.loading.set(false);
        }
      });
  }

  setFilter(value: 'all' | 'unread' | 'archived'): void {
    this.filter.set(value);
    this.page.set(0);
    this.load();
  }

  onSearch(): void {
    this.page.set(0);
    this.load();
  }

  prevPage(): void {
    if (this.page() <= 0) {
      return;
    }
    this.page.set(this.page() - 1);
    this.load();
  }

  nextPage(): void {
    if (this.page() + 1 >= this.totalPages()) {
      return;
    }
    this.page.set(this.page() + 1);
    this.load();
  }

  markRead(item: NotificationItem): void {
    if (item.isRead) {
      return;
    }
    this.notificationService.markRead(item.id).subscribe({
      next: () => {
        this.items.set(this.items().map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
        this.unreadCount.set(Math.max(0, this.unreadCount() - 1));
      }
    });
  }

  markUnread(item: NotificationItem): void {
    if (!item.isRead) {
      return;
    }
    this.notificationService.markUnread(item.id).subscribe({
      next: () => {
        this.items.set(this.items().map((n) => (n.id === item.id ? { ...n, isRead: false } : n)));
        this.unreadCount.set(this.unreadCount() + 1);
      }
    });
  }

  markAllRead(): void {
    this.notificationService.markAllRead().subscribe({
      next: () => {
        this.items.set(this.items().map((n) => ({ ...n, isRead: true })));
        this.unreadCount.set(0);
      }
    });
  }

  delete(item: NotificationItem): void {
    if (!confirm('Supprimer cette notification ?')) {
      return;
    }
    this.notificationService.delete(item.id).subscribe({
      next: () => {
        this.items.set(this.items().filter((n) => n.id !== item.id));
        this.total.set(Math.max(0, this.total() - 1));
      }
    });
  }

  iconFor(type: NotificationItem['type']): string {
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
      default:
        return '⚠️';
    }
  }

  formatDate(value: string): string {
    if (!value) {
      return '—';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    const d = parsed.toLocaleDateString('fr-FR');
    const t = parsed.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${d} ${t}`;
  }
}
