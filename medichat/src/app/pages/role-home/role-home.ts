import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-role-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './role-home.html',
  styleUrl: './role-home.css'
})
export class RoleHome {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly title = this.route.snapshot.data['title'] as string;
  readonly subtitle = this.route.snapshot.data['subtitle'] as string;

  logout(): void {
    localStorage.removeItem('user');
    void this.router.navigate(['/login']);
  }
}
