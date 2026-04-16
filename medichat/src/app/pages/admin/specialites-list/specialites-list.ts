import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Specialite {
  id: number;
  nom: string;
  description: string;
}

@Component({
  selector: 'app-specialites-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './specialites-list.html',
  styleUrl: './specialites-list.css'
})
export class SpecialitesList {
  specialites = signal<Specialite[]>([
    { id: 1, nom: 'Cardiologie', description: 'Maladies du cœur' },
    { id: 2, nom: 'Dermatologie', description: 'Maladies de la peau' },
    { id: 3, nom: 'Pédiatrie', description: 'Enfants et nourrissons' }
  ]);
}