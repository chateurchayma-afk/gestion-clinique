import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Specialite, SpecialiteService } from '../../../services/specialite.service';
import { ToastService } from '../../../core/toast.service';

@Component({
  selector: 'app-specialites-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './specialites-list.html',
  styleUrl: './specialites-list.css'
})
export class SpecialitesList implements OnInit {
  private readonly specialiteService = inject(SpecialiteService);
  private readonly toast = inject(ToastService);

  specialites = signal<Specialite[]>([]);
  loading = signal(true);
  searchTerm = signal('');

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.specialiteService.getAll().subscribe({
      next: (data) => {
        this.specialites.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.loading.set(false);
        this.toast.show('Impossible de charger les spécialités.', 'error');
      }
    });
  }

  onSearch(value: string): void {
    this.searchTerm.set(value.toLowerCase().trim());
  }

  filteredSpecialites = computed(() => {
    const term = this.searchTerm();
    if (!term) {
      return this.specialites();
    }
    return this.specialites().filter(
      (s) =>
        s.nom.toLowerCase().includes(term) ||
        (s.description ?? '').toLowerCase().includes(term)
    );
  });

  deleteOne(s: Specialite, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Supprimer la spécialité « ${s.nom} » ?`)) {
      return;
    }
    this.specialiteService.delete(s.id).subscribe({
      next: () => {
        this.toast.show('Spécialité supprimée.', 'success');
        this.reload();
      },
      error: (err) => {
        console.error(err);
        this.toast.show('Suppression impossible (la spécialité est peut-être utilisée).', 'error');
      }
    });
  }
}
