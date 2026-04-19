import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-patient-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './patient-home.html',
  styleUrl: './patient-home.css'
})
export class PatientHome {}
