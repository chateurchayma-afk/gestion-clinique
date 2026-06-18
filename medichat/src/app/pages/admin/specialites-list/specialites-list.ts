import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Specialite, SpecialiteService } from '../../../services/specialite.service';
import { ToastService } from '../../../core/toast.service';

@Component({
  selector: 'app-specialites-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './specialites-list.html',
  styleUrl: './specialites-list.css'
})
export class SpecialitesList implements OnInit {
  private readonly specialiteService = inject(SpecialiteService);
  private readonly toast = inject(ToastService);

  specialites = signal<Specialite[]>([]);
  loading = signal(true);
  searchTerm = signal('');

  editingSpecialite = signal<Specialite | null>(null);
  editForm = { nom: '', description: '' };
  isSaving = signal(false);

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

  openEdit(s: Specialite, event: Event): void {
    event.stopPropagation();
    this.editForm = { nom: s.nom, description: s.description ?? '' };
    this.editingSpecialite.set(s);
  }

  cancelEdit(): void {
    this.editingSpecialite.set(null);
  }

  saveEdit(): void {
    const s = this.editingSpecialite();
    if (!s) return;
    const nom = this.editForm.nom.trim();
    if (!nom) return;

    this.isSaving.set(true);
    this.specialiteService.update(s.id, { nom, description: this.editForm.description.trim() || null }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.editingSpecialite.set(null);
        this.toast.show('Spécialité modifiée avec succès.', 'success');
        this.reload();
      },
      error: (err) => {
        this.isSaving.set(false);
        console.error(err);
        this.toast.show('Impossible de modifier la spécialité.', 'error');
      }
    });
  }

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
