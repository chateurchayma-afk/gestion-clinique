import { AfterViewInit, Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ContactService } from '../../services/contact.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home implements OnInit, AfterViewInit {
  private readonly router = inject(Router);
  private readonly contactService = inject(ContactService);

  contactNom = '';
  contactEmail = '';
  contactSujet = '';
  contactMessage = '';

  readonly sending = signal(false);
  readonly sent = signal(false);
  readonly sendError = signal('');

  onContactSubmit(): void {
    if (!this.contactNom || !this.contactEmail || !this.contactSujet || !this.contactMessage) return;
    this.sending.set(true);
    this.sendError.set('');
    this.contactService.send({
      nom: this.contactNom,
      email: this.contactEmail,
      sujet: this.contactSujet,
      message: this.contactMessage
    }).subscribe({
      next: () => {
        this.sending.set(false);
        this.sent.set(true);
        this.contactNom = '';
        this.contactEmail = '';
        this.contactSujet = '';
        this.contactMessage = '';
      },
      error: () => {
        this.sending.set(false);
        this.sendError.set('Erreur lors de l\'envoi. Veuillez réessayer.');
      }
    });
  }

  ngOnInit(): void {
    const data = this.extractOrdonnanceDataToken();
    if (data) {
      void this.router.navigate(['/ordonnance'], { queryParams: { data }, replaceUrl: true });
    }
  }

  /** Anciens QR : `/#data=…` — redirige vers `/ordonnance?data=…`. */
  private extractOrdonnanceDataToken(): string {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('data')?.trim() ?? '';
    if (fromQuery) {
      return fromQuery;
    }
    if (!window.location.hash) {
      return '';
    }
    let h = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
    h = h.trim();
    if (h.startsWith('/')) {
      h = h.slice(1).trim();
    }
    if (h.startsWith('data=')) {
      let v = h.slice(5);
      const amp = v.indexOf('&');
      if (amp >= 0) {
        v = v.slice(0, amp);
      }
      try {
        v = decodeURIComponent(v);
      } catch {
        /* jeton brut */
      }
      return v.trim();
    }
    if (h.startsWith('z:') || /^[A-Za-z0-9_-]+$/.test(h)) {
      return h.trim();
    }
    return '';
  }

  ngAfterViewInit(): void {
    const elements = document.querySelectorAll('.fade-in-up, .reveal-card');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('show');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.15
      }
    );

    elements.forEach((el) => observer.observe(el));
  }
}