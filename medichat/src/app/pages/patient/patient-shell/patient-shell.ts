import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-patient-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './patient-shell.html',
  styleUrl: './patient-shell.css'
})
export class PatientShell {
  private readonly router = inject(Router);

  logout(): void {
    localStorage.removeItem('user');
    void this.router.navigate(['/login']);
  }
}
