import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ServiceMedical, ServiceMedicalService } from '../../../services/service-medical.service';
import { ToastService } from '../../../core/toast.service';

@Component({
  selector: 'app-services-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './services-list.html',
  styleUrl: './services-list.css'
})
export class ServicesList implements OnInit {
  private readonly serviceMedicalService = inject(ServiceMedicalService);
  private readonly toast = inject(ToastService);

  services = signal<ServiceMedical[]>([]);
  loading = signal(true);
  searchTerm = signal('');

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.serviceMedicalService.getAll().subscribe({
      next: (data) => {
        this.services.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.loading.set(false);
        this.toast.show('Impossible de charger les services.', 'error');
      }
    });
  }

  onSearch(value: string): void {
    this.searchTerm.set(value.toLowerCase().trim());
  }

  filteredServices = computed(() => {
    const term = this.searchTerm();
    if (!term) {
      return this.services();
    }
    return this.services().filter(
      (s) =>
        s.nom.toLowerCase().includes(term) ||
        (s.departement ?? '').toLowerCase().includes(term) ||
        (s.prix ?? '').toLowerCase().includes(term)
    );
  });

  deleteOne(s: ServiceMedical, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Supprimer le service « ${s.nom} » ?`)) {
      return;
    }
    this.serviceMedicalService.delete(s.id).subscribe({
      next: () => {
        this.toast.show('Service supprimé.', 'success');
        this.reload();
      },
      error: (err) => {
        console.error(err);
        this.toast.show('Suppression impossible.', 'error');
      }
    });
  }
}
