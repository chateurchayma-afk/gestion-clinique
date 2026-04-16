import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface ServiceMedical {
  id: number;
  nom: string;
  departement: string;
  prix: string;
  statut: 'Actif' | 'Inactif';
}

@Component({
  selector: 'app-services-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './services-list.html',
  styleUrl: './services-list.css'
})
export class ServicesList {
  services = signal<ServiceMedical[]>([
    {
      id: 1,
      nom: 'Consultation générale',
      departement: 'Médecine générale',
      prix: '200 $',
      statut: 'Actif'
    },
    {
      id: 2,
      nom: 'Nettoyage dentaire',
      departement: 'Dentisterie',
      prix: '180 $',
      statut: 'Inactif'
    },
    {
      id: 3,
      nom: 'Examen de la vue',
      departement: 'Ophtalmologie',
      prix: '150 $',
      statut: 'Actif'
    },
    {
      id: 4,
      nom: 'Radiographie',
      departement: 'Radiologie',
      prix: '80 $',
      statut: 'Actif'
    },
    {
      id: 5,
      nom: 'Séance de kinésithérapie',
      departement: 'Physiothérapie',
      prix: '130 $',
      statut: 'Actif'
    }
  ]);
}