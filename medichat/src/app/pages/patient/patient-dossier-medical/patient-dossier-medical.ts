import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatientDossierService, PatientDossierResponse, RendezVousHistoriqueItem } from '../../../services/patient-dossier.service';
import { ToastService } from '../../../core/toast.service';

function formatDateFr(iso: string | null | undefined): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso ?? '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function formatDateTimeFr(iso: string | null | undefined): string {
  if (!iso) return '—';
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString('fr-FR') + ' à ' + dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

@Component({
  selector: 'app-patient-dossier-medical',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-dossier-medical.html',
  styleUrl: './patient-dossier-medical.css'
})
export class PatientDossierMedical implements OnInit {
  private readonly svc   = inject(PatientDossierService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly dossier = signal<PatientDossierResponse | null>(null);
  readonly expandedRdv = signal<number | null>(null);

  readonly hasDossier = computed(() => !!this.dossier()?.dossierId);

  readonly antecedentsFamiliaux = computed(() => {
    const d = this.dossier();
    if (!d) return [];
    return [
      { label: 'Diabète',       actif: d.famDiabete,       icon: '🩸' },
      { label: 'Hypertension',  actif: d.famHypertension,  icon: '❤️' },
      { label: 'Asthme',        actif: d.famAsthme,        icon: '🫁' },
      { label: 'Cardiaque',     actif: d.famCardiaque,     icon: '💓' },
      { label: 'Troubles mentaux', actif: d.famMentaux,    icon: '🧠' },
      { label: 'Cancer',        actif: d.famCancer,        icon: '🔬' },
    ];
  });

  readonly infosMedicales = computed(() => {
    const d = this.dossier();
    if (!d) return [];
    return [
      { label: 'Allergies',           valeur: d.allergies,        icon: '⚠️', color: 'orange' },
      { label: 'Maladies chroniques', valeur: d.maladiesChroniques, icon: '🏥', color: 'red'    },
      { label: 'Médicaments actuels', valeur: d.medicaments,       icon: '💊', color: 'blue'   },
      { label: 'Interventions',       valeur: d.interventions,     icon: '🔧', color: 'purple'  },
      { label: 'Hospitalisations',    valeur: d.hospitalisations,  icon: '🛏️', color: 'navy'   },
    ];
  });

  readonly infosVie = computed(() => {
    const d = this.dossier();
    if (!d) return [];
    return [
      { label: 'Tabac',        valeur: d.tabac,        icon: '🚬' },
      { label: 'Alcool',       valeur: d.alcool,        icon: '🍷' },
      { label: 'Activité',     valeur: d.activite,      icon: '🏃' },
      { label: 'Alimentation', valeur: d.alimentation,  icon: '🥗' },
    ].filter(i => i.valeur);
  });

  ngOnInit(): void {
    this.svc.getMonDossier().subscribe({
      next: d  => { this.dossier.set(d); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast.show('Impossible de charger le dossier.', 'error'); }
    });
  }

  toggleRdv(id: number): void {
    this.expandedRdv.update(cur => cur === id ? null : id);
  }

  formatDate(iso: string | null | undefined)     { return formatDateFr(iso); }
  formatDateTime(iso: string | null | undefined) { return formatDateTimeFr(iso); }

  statutLabel(s: string | null): string {
    const map: Record<string, string> = {
      EN_ATTENTE: 'En attente', CONFIRME: 'Confirmé',
      ANNULE: 'Annulé', TERMINE: 'Terminé'
    };
    return s ? (map[s] ?? s) : '—';
  }

  statutClass(s: string | null): string {
    const map: Record<string, string> = {
      EN_ATTENTE: 'badge-warning', CONFIRME: 'badge-info',
      ANNULE: 'badge-danger', TERMINE: 'badge-success'
    };
    return s ? (map[s] ?? 'badge-muted') : 'badge-muted';
  }

  modeLabel(m: string | null): string {
    const map: Record<string, string> = {
      PRESENTIEL: 'Présentiel', TELECONSULTATION: 'Téléconsultation', DOMICILE: 'À domicile'
    };
    return m ? (map[m] ?? m) : '—';
  }

  medecinLabel(rdv: RendezVousHistoriqueItem): string {
    return `Dr. ${rdv.medecinPrenom ?? ''} ${rdv.medecinNom ?? ''}`.trim();
  }

  sexeLabel(s: string | null): string {
    return s === 'HOMME' ? 'Homme' : s === 'FEMME' ? 'Femme' : s ?? '—';
  }
}
