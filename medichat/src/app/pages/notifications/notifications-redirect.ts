import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notifications-redirect',
  standalone: true,
  template: ''
})
export class NotificationsRedirect implements OnInit {
  private readonly router = inject(Router);

  ngOnInit(): void {
    const raw = localStorage.getItem('user');
    let role = '';
    if (raw) {
      try {
        role = (JSON.parse(raw) as { role?: string }).role ?? '';
      } catch {
        role = '';
      }
    }
    const r = role.toString().trim().toUpperCase();
    if (r === 'ADMIN') {
      void this.router.navigate(['/admin/notifications']);
      return;
    }
    if (r === 'MEDECIN') {
      void this.router.navigate(['/medecin-dashboard/notifications']);
      return;
    }
    if (r === 'PATIENT') {
      void this.router.navigate(['/patient-dashboard/notifications']);
      return;
    }
    void this.router.navigate(['/login']);
  }
}
