import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-add-service',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-service.html',
  styleUrl: './add-service.css'
})
export class AddService {
  form = {
    nom: '',
    departement: '',
    prix: '',
    description: ''
  };

  constructor(private router: Router) {}

  onSubmit(): void {
    console.log('Service ajouté :', this.form);
    alert('Service enregistré avec succès');
    this.router.navigate(['/admin/services']);
  }

  goBack(): void {
    this.router.navigate(['/admin/services']);
  }
}