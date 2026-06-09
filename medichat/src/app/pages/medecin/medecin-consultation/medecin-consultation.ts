import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService } from '../../../core/toast.service';
import {
  DossierMedicalResponse,
  DossierMedicalService
} from '../../../services/dossier-medical.service';
import { MedecinPortalService } from '../../../services/medecin-portal.service';
import { Patient } from '../../../services/patient.service';
import {
  formatLignesPourOrdonnance,
  LS_CONSULTATION_BROUILLON,
  LS_ORDONNANCE_META,
  LS_ORDONNANCE_TEXTE
} from '../medecin-ordonnance-sync';

export interface LigneOrdonnance {
  medicament: string;
  posologie: string;
  dureeJours: string;
}

@Component({
  selector: 'app-medecin-consultation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './medecin-consultation.html',
  styleUrls: ['./medecin-consultation.css', '../medecin-pro.css']
})
export class MedecinConsultation implements OnInit {
  private readonly medecinPortal = inject(MedecinPortalService);
  private readonly dossierMedical = inject(DossierMedicalService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly patients = signal<Patient[]>([]);
  readonly dossierData = signal<DossierMedicalResponse | null>(null);
  readonly dossierLoading = signal(false);

  patientId: number | null = null;
  symptomes = '';
  diagnostic = '';
  notes = '';
  lignes: LigneOrdonnance[] = [
    { medicament: '', posologie: '', dureeJours: '' },
    { medicament: '', posologie: '', dureeJours: '' }
  ];

  ngOnInit(): void {
    this.medecinPortal.getMesPatients().subscribe({
      next: (list) => {
        const L = list ?? [];
        this.patients.set(L);
        const raw = localStorage.getItem(LS_CONSULTATION_BROUILLON);
        if (raw) {
          try {
            const o = JSON.parse(raw) as {
              patientId?: number;
              symptomes?: string;
              diagnostic?: string;
              notes?: string;
              lignes?: LigneOrdonnance[];
            };
            this.patientId = o.patientId ?? null;
            this.symptomes = o.symptomes ?? '';
            this.diagnostic = o.diagnostic ?? '';
            this.notes = this.sanitizeNotesFromDraft(o.notes ?? '');
            if (o.lignes?.length) {
              this.lignes = o.lignes;
            }
          } catch {
            this.patientId = null;
          }
        } else {
          this.patientId = null;
        }
        if (this.patientId != null && !L.some((p) => p.id === this.patientId)) {
          this.patientId = null;
        }

        // Si query param patientId → sélection automatique depuis un lien externe
        const qp = this.route.snapshot.queryParamMap.get('patientId');
        if (qp) {
          const id = Number(qp);
          if (Number.isFinite(id) && L.some((p) => p.id === id)) {
            this.patientId = id;
            this.loadDossier(id, true);
            return;
          }
        }

        // Aucun patient sélectionné → formulaire complètement vide + efface le brouillon stale
        if (this.patientId == null) {
          this.symptomes = '';
          this.diagnostic = '';
          this.notes = '';
          this.lignes = [
            { medicament: '', posologie: '', dureeJours: '' },
            { medicament: '', posologie: '', dureeJours: '' }
          ];
          this.persist();
          return;
        }

        this.loadDossier(this.patientId, false);
      },
      error: () => this.toast.show('Chargement patients impossible.', 'error')
    });
  }

  onPatientChange(patientId: number | null): void {
    this.patientId = patientId;
    if (patientId == null) {
      this.dossierData.set(null);
      this.persist();
      return;
    }
    this.loadDossier(patientId, true);
  }

  /** Ignore les anciennes notes générées automatiquement depuis le dossier. */
  private sanitizeNotesFromDraft(notes: string): string {
    const t = notes.trim();
    if (/^Alimentation\s*:/i.test(t) || /^Traitement en cours\s*:/i.test(t)) {
      return '';
    }
    return notes;
  }

  private loadDossier(patientId: number, resetTraitement: boolean): void {
    this.dossierLoading.set(true);
    this.dossierData.set(null);
    this.dossierMedical.getByPatientId(patientId).subscribe({
      next: (d) => {
        this.dossierData.set(d);
        this.dossierLoading.set(false);
        if (resetTraitement) {
          this.notes = '';
          this.lignes = [
            { medicament: '', posologie: '', dureeJours: '' },
            { medicament: '', posologie: '', dureeJours: '' }
          ];
        }
        this.persist();
      },
      error: () => {
        this.dossierData.set(null);
        this.dossierLoading.set(false);
        this.persist();
      }
    });
  }

  displayDossierVal(value: string | null | undefined): string {
    const t = (value ?? '').trim();
    return t || '—';
  }

  antecedentsFamiliaux(d: DossierMedicalResponse): { label: string; actif: boolean }[] {
    return [
      { label: 'Diabète', actif: !!d.famDiabete },
      { label: 'Hypertension', actif: !!d.famHypertension },
      { label: 'Asthme', actif: !!d.famAsthme },
      { label: 'Maladies cardiaques', actif: !!d.famCardiaque },
      { label: 'Troubles de santé mentale', actif: !!d.famMentaux },
      { label: 'Cancer', actif: !!d.famCancer }
    ];
  }

  addLigne(): void {
    this.lignes = [...this.lignes, { medicament: '', posologie: '', dureeJours: '' }];
    this.persist();
  }

  removeLigne(i: number): void {
    if (this.lignes.length <= 1) {
      this.lignes[0] = { medicament: '', posologie: '', dureeJours: '' };
      this.persist();
      return;
    }
    this.lignes = this.lignes.filter((_, j) => j !== i);
    this.persist();
  }

  persist(): void {
    try {
      localStorage.setItem(
        LS_CONSULTATION_BROUILLON,
        JSON.stringify({
          patientId: this.patientId,
          symptomes: this.symptomes,
          diagnostic: this.diagnostic,
          notes: this.notes,
          lignes: this.lignes
        })
      );
      const ordText = formatLignesPourOrdonnance(this.lignes, this.notes);
      localStorage.setItem(LS_ORDONNANCE_TEXTE, ordText);
      let dateOrdonnance: string | undefined;
      try {
        const metaRaw = localStorage.getItem(LS_ORDONNANCE_META);
        if (metaRaw) {
          const o = JSON.parse(metaRaw) as { dateOrdonnance?: string };
          dateOrdonnance = o.dateOrdonnance;
        }
      } catch {
        /* */
      }
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem(
        LS_ORDONNANCE_META,
        JSON.stringify({ dateOrdonnance: dateOrdonnance ?? today, patientId: this.patientId })
      );
    } catch {
      /* */
    }
  }

  save(): void {
    this.persist();
    this.toast.show('Consultation enregistrée (brouillon sur cet appareil).', 'success');
    this.patientId = null;
    this.symptomes = '';
    this.diagnostic = '';
    this.notes = '';
    this.lignes = [
      { medicament: '', posologie: '', dureeJours: '' },
      { medicament: '', posologie: '', dureeJours: '' }
    ];
    this.dossierData.set(null);
    this.persist();
  }

  genererOrdonnance(): void {
    this.persist();
    void this.router.navigate(['/medecin-dashboard/ordonnance-pdf']);
  }
}
