import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ToastService } from '../../../core/toast.service';
import { Medecin, MedecinService } from '../../../services/medecin.service';

@Component({
  selector: 'app-patient-medecin-profil',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './patient-medecin-profil.html',
  styleUrls: ['./patient-medecin-profil.css', '../patient-pro.css']
})
export class PatientMedecinProfil implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly medecinService = inject(MedecinService);
  private readonly toast = inject(ToastService);

  readonly medecin = signal<Medecin | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isNaN(id) || id < 1) {
      this.loading.set(false);
      return;
    }
    this.medecinService.getCatalogueMedecin(id).subscribe({
      next: (m) => {
        this.medecin.set(m);
        this.loading.set(false);
      },
      error: () => {
        this.medecin.set(null);
        this.loading.set(false);
        this.toast.show('Médecin introuvable.', 'error');
      }
    });
  }

  estDisponible(m: Medecin): boolean {
    return m.disponible !== false;
  }

  noteAffichee(m: Medecin): number {
    if (m.noteMoyenne != null && m.noteMoyenne >= 0 && m.noteMoyenne <= 5) {
      return Math.round(m.noteMoyenne * 2) / 2;
    }
    return 4 + (m.id % 6) * 0.1;
  }

  etoilesPleines(m: Medecin): number {
    return Math.floor(this.noteAffichee(m));
  }

  etoileDemi(m: Medecin): boolean {
    const n = this.noteAffichee(m);
    return n - Math.floor(n) >= 0.5;
  }

  aNoteReelle(m: Medecin): boolean {
    return m.noteMoyenne != null && m.noteMoyenne >= 0;
  }

  initiales(m: Medecin): string {
    const p = m.utilisateur.prenom?.charAt(0) ?? '';
    const n = m.utilisateur.nom?.charAt(0) ?? '';
    return (p + n).toUpperCase();
  }

  photoUrl(m: Medecin): string | null {
    const p = m.utilisateur.photo?.trim();
    return p ? p : null;
  }

  /** Affiche le bloc contact si au moins une information publique est disponible. */
  hasContactPublic(m: Medecin): boolean {
    const u = m.utilisateur;
    return !!(u.telephone?.trim() || u.email?.trim() || this.adresseLigne(m));
  }

  /** Adresse postale sur une ou deux lignes pour l’affichage patient. */
  adresseLigne(m: Medecin): string | null {
    const u = m.utilisateur;
    const lines: string[] = [];
    if (u.adresse?.trim()) {
      lines.push(u.adresse.trim());
    }
    const locality = [u.codePostal?.trim(), u.ville?.trim()].filter(Boolean).join(' ');
    if (locality && u.gouvernorat?.trim()) {
      lines.push(`${locality}, ${u.gouvernorat.trim()}`);
    } else if (locality) {
      lines.push(locality);
    } else if (u.gouvernorat?.trim()) {
      lines.push(u.gouvernorat.trim());
    }
    return lines.length ? lines.join('\n') : null;
  }
}
