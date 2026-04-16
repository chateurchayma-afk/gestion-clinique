import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MedecinService, Medecin } from '../../../services/medecin.service';

@Component({
  selector: 'app-medecins-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './medecins-list.html',
  styleUrl: './medecins-list.css',
})
export class MedecinsList implements OnInit {
  medecins = signal<Medecin[]>([]);
  loading = signal(true);
  searchTerm = signal('');

  constructor(private medecinService: MedecinService) {}

  ngOnInit(): void {
    this.medecinService.getAllMedecins().subscribe({
      next: (data) => {
        this.medecins.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erreur API médecins :', err);
        this.loading.set(false);
      }
    });
  }

  onSearch(value: string): void {
    this.searchTerm.set(value.toLowerCase().trim());
  }

  filteredMedecins = computed(() => {
    const term = this.searchTerm();

    if (!term) {
      return this.medecins();
    }

    return this.medecins().filter((m) => {
      const fullName =
        `${m.utilisateur.prenom} ${m.utilisateur.nom}`.toLowerCase();

      const specialite = m.specialite?.nom?.toLowerCase() || '';
      const service = m.serviceMedical?.nom?.toLowerCase() || '';
      const email = m.utilisateur.email.toLowerCase();

      return (
        fullName.includes(term) ||
        specialite.includes(term) ||
        service.includes(term) ||
        email.includes(term)
      );
    });
  });
}