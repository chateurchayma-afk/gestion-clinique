import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-role-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './role-home.html',
  styleUrl: './role-home.css'
})
export class RoleHome {
  private readonly route = inject(ActivatedRoute);

  readonly title = this.route.snapshot.data['title'] as string;
  readonly subtitle = this.route.snapshot.data['subtitle'] as string;
}
