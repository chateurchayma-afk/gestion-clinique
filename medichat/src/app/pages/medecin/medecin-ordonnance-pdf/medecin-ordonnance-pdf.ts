import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/toast.service';
import { Patient, PatientService } from '../../../services/patient.service';
import { RouterLink } from '@angular/router';

const LS_CONS = 'medichat_consultation_brouillon';
const LS_ORD = 'medichat_ordonnance_meta';
const LS_ORD_TEXT = 'medichat_ordonnance_texte';

function isoToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatFr(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return iso;
  }
  const [a, b, c] = iso.split('-');
  return `${c}/${b}/${a}`;
}

@Component({
  selector: 'app-medecin-ordonnance-pdf',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './medecin-ordonnance-pdf.html',
  styleUrls: ['./medecin-ordonnance-pdf.css', '../medecin-pro.css']
})
export class MedecinOrdonnancePdf implements OnInit {
  private readonly patientsApi = inject(PatientService);
  private readonly toast = inject(ToastService);
  readonly patients = signal<Patient[]>([]);
  patientId: number | null = null;
  medicamentsText = '';
  dateOrdonnance = isoToday();
  medecinLabel = 'Médecin';
  medecinAddr = 'Cabinet — adresse, ville';
  medecinTel = '—';
  medecinEmail = '—';

  readonly selectedPatient = computed(() => {
    const id = this.patientId;
    if (id == null) {
      return null;
    }
    return this.patients().find((p) => p.id === id) ?? null;
  });

  readonly patientName = computed(() => {
    const p = this.selectedPatient();
    if (!p) {
      return '—';
    }
    return `${p.utilisateur.prenom} ${p.utilisateur.nom}`.trim();
  });

  readonly bodyLines = computed(() => {
    const t = (this.medicamentsText ?? '').trim();
    if (t) {
      return t.split('\n').filter((l) => l.trim().length > 0);
    }
    return [] as string[];
  });

  ngOnInit(): void {
    this.hydrateUser();
    const rawMeta = localStorage.getItem(LS_ORD);
    if (rawMeta) {
      try {
        const o = JSON.parse(rawMeta) as { dateOrdonnance?: string; patientId?: number };
        if (o.dateOrdonnance) {
          this.dateOrdonnance = o.dateOrdonnance;
        }
        if (o.patientId) {
          this.patientId = o.patientId;
        }
      } catch {
        /* */
      }
    }
    const rawTxt = localStorage.getItem(LS_ORD_TEXT);
    if (rawTxt) {
      this.medicamentsText = rawTxt;
    }

    this.patientsApi.getAllPatients().subscribe({
      next: (list) => {
        this.patients.set(list ?? []);
        this.importFromConsultation(list ?? []);
      },
      error: () => this.toast.show('Patients indisponibles.', 'error')
    });
  }

  private hydrateUser(): void {
    const raw = localStorage.getItem('user');
    if (raw) {
      try {
        const u = JSON.parse(raw) as { prenom?: string; nom?: string; email?: string; telephone?: string };
        const n = [u.prenom, u.nom].filter(Boolean).join(' ').trim();
        if (n) {
          this.medecinLabel = `Dr. ${n}`;
        }
        if (u.email) {
          this.medecinEmail = u.email;
        }
        if (u.telephone) {
          this.medecinTel = u.telephone;
        }
      } catch {
        /* */
      }
    }
  }

  private importFromConsultation(list: Patient[]): void {
    if (this.medicamentsText.trim().length > 0) {
      this.patientId = this.patientId ?? list[0]?.id ?? null;
      return;
    }
    const raw = localStorage.getItem(LS_CONS);
    if (!raw) {
      this.patientId = this.patientId ?? list[0]?.id ?? null;
      return;
    }
    try {
      const o = JSON.parse(raw) as {
        patientId?: number;
        lignes?: { medicament: string; posologie: string; dureeJours: string }[];
        notes?: string;
      };
      this.patientId = o.patientId ?? this.patientId ?? list[0]?.id ?? null;
      if (o.lignes?.length) {
        this.medicamentsText = o.lignes
          .map((l) => {
            const m = l.medicament?.trim();
            if (!m) {
              return '';
            }
            const p = l.posologie?.trim() || '';
            const d = l.dureeJours?.trim() || '—';
            return `${m} : ${p} — ${d} jours`;
          })
          .filter((x) => x.length > 0)
          .join('\n');
        if (o.notes?.trim()) {
          this.medicamentsText += `\n\nNotes : ${o.notes.trim()}`;
        }
      }
    } catch {
      this.patientId = this.patientId ?? list[0]?.id ?? null;
    }
  }

  persist(): void {
    try {
      localStorage.setItem(
        LS_ORD,
        JSON.stringify({ dateOrdonnance: this.dateOrdonnance, patientId: this.patientId })
      );
      localStorage.setItem(LS_ORD_TEXT, this.medicamentsText);
    } catch {
      /* */
    }
  }

  downloadOrPrint(): void {
    this.persist();
    setTimeout(() => {
      globalThis.print();
    }, 150);
  }

  onlyPrint(): void {
    this.downloadOrPrint();
  }

  formatFrDisplay(iso: string): string {
    return formatFr(iso);
  }
}
