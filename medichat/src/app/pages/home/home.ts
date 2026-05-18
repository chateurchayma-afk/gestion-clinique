import { AfterViewInit, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home implements OnInit, AfterViewInit {
  private readonly router = inject(Router);

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