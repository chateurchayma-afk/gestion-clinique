import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-add-specialite',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-specialite.html',
  styleUrl: './add-specialite.css'
})
export class AddSpecialite {

  form = {
    nom: '',
    description: ''
  };

  constructor(private router: Router) {}

  onSubmit() {
    console.log(this.form);
    alert('Spécialité ajoutée');

    this.router.navigate(['/admin/specialites']);
  }

  goBack() {
    this.router.navigate(['/admin/specialites']);
  }
}