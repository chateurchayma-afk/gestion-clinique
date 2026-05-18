import { jsPDF } from 'jspdf';
import type { RendezVousPatient, StatutRendezVous } from '../../services/rendez-vous-patient.service';

export interface RdvRecuData {
  id: number;
  patientLabel: string;
  medecinPrenom: string;
  medecinNom: string;
  specialite: string;
  dateLong: string;
  horaire: string;
  mode: string;
  statut: string;
  statutCode: StatutRendezVous;
  motif: string;
  generatedAt: string;
}

const PAGE_W = 100;
const PAGE_H = 155;
const MARGIN = 8;
const INNER_W = PAGE_W - MARGIN * 2;
const FOOTER_RESERVE = 10;
const MAX_Y = PAGE_H - MARGIN - FOOTER_RESERVE;
const LABEL_W = 26;
const VALUE_X = MARGIN + LABEL_W + 3;
const VALUE_W = INNER_W - LABEL_W - 5;

const C = {
  brand: [79, 111, 168] as [number, number, number],
  brandLight: [111, 143, 203] as [number, number, number],
  ink: [15, 23, 42] as [number, number, number],
  label: [30, 41, 59] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  line: [226, 232, 240] as [number, number, number],
  panel: [241, 245, 249] as [number, number, number],
  zebra: [248, 250, 252] as [number, number, number],
  white: [255, 255, 255] as [number, number, number]
};

export function formatHeureRecu(t: string): string {
  if (!t) {
    return '';
  }
  return t.length >= 5 ? t.slice(0, 5) : t;
}

export function labelStatutRecu(s: StatutRendezVous): string {
  switch (s) {
    case 'EN_ATTENTE':
      return 'En attente';
    case 'CONFIRME':
      return 'Confirmé';
    case 'ANNULE':
      return 'Annulé';
    case 'TERMINE':
      return 'Terminé';
    default:
      return s;
  }
}

export function labelModeRecu(m: string): string {
  const u = (m ?? '').trim().toUpperCase();
  if (u === 'ONLINE') {
    return 'En ligne';
  }
  if (u === 'PRESENTIEL') {
    return 'Présentiel';
  }
  return m || '—';
}

export function formatDateLongRecu(iso: string): string {
  const d = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return iso;
  }
  const [y, m, day] = d.split('-').map(Number);
  const dt = new Date(y, m - 1, day);
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(dt);
}

export function motifRecu(m: string | null | undefined): string {
  const s = (m ?? '').trim();
  return s.length > 0 ? s : 'Aucun motif renseigné';
}

export function buildRecuFilename(rdv: RendezVousPatient): string {
  const d = rdv.dateRendezVous?.slice(0, 10) ?? 'date';
  return `recu-rdv-${rdv.id}-${d}.pdf`;
}

export function buildRecuData(
  rdv: RendezVousPatient,
  patientLabel: string,
  generatedAt: string
): RdvRecuData {
  return {
    id: rdv.id,
    patientLabel,
    medecinPrenom: rdv.medecinPrenom,
    medecinNom: rdv.medecinNom,
    specialite: rdv.specialiteNom ?? 'Consultation',
    dateLong: formatDateLongRecu(rdv.dateRendezVous),
    horaire: `${formatHeureRecu(rdv.heureDebut)} – ${formatHeureRecu(rdv.heureFin)}`,
    mode: labelModeRecu(rdv.modeConsultation),
    statut: labelStatutRecu(rdv.statut),
    statutCode: rdv.statut,
    motif: motifRecu(rdv.motif),
    generatedAt
  };
}

function statutColors(code: StatutRendezVous): { bg: [number, number, number]; fg: [number, number, number] } {
  switch (code) {
    case 'CONFIRME':
      return { bg: [209, 250, 229], fg: [6, 95, 70] };
    case 'EN_ATTENTE':
      return { bg: [254, 243, 199], fg: [146, 64, 14] };
    case 'ANNULE':
      return { bg: [241, 245, 249], fg: [71, 85, 105] };
    case 'TERMINE':
      return { bg: [224, 231, 255], fg: [55, 88, 134] };
    default:
      return { bg: C.panel, fg: C.muted };
  }
}

class RdvRecuPdfBuilder {
  private y = MARGIN;
  private readonly doc: jsPDF;

  constructor(private readonly data: RdvRecuData) {
    this.doc = new jsPDF({ unit: 'mm', format: [PAGE_W, PAGE_H], orientation: 'portrait' });
  }

  build(): jsPDF {
    this.drawPageFrame();
    this.drawHeader();
    this.drawSummaryCard();
    this.drawSectionTitle('Informations patient & consultation');
    this.drawInfoCard([
      ['Patient', this.data.patientLabel],
      ['Médecin', `Dr. ${this.data.medecinPrenom} ${this.data.medecinNom}`],
      ['Spécialité', this.data.specialite],
      ['Mode', this.data.mode]
    ]);
    this.drawSectionTitle('Motif');
    this.drawMotifBlock();
    this.drawLegalNote();
    this.drawFooter();
    return this.doc;
  }

  private drawPageFrame(): void {
    this.doc.setDrawColor(...C.line);
    this.doc.setLineWidth(0.35);
    this.doc.roundedRect(MARGIN - 1, MARGIN - 1, INNER_W + 2, PAGE_H - (MARGIN - 1) * 2, 3, 3, 'S');
  }

  private drawHeader(): void {
    const h = 24;
    this.doc.setFillColor(...C.brand);
    this.doc.roundedRect(MARGIN, this.y, INNER_W, h, 2.5, 2.5, 'F');

    this.doc.setFillColor(...C.brandLight);
    this.doc.circle(MARGIN + 6, this.y + h / 2, 3.5, 'F');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8);
    this.doc.setTextColor(220, 230, 248);
    this.doc.text('MEDICHAT · E-SANTÉ', MARGIN + 12, this.y + 8);

    this.doc.setFontSize(11.5);
    this.doc.setTextColor(...C.white);
    this.doc.text('Justificatif de rendez-vous', MARGIN + 12, this.y + 15);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7);
    this.doc.setTextColor(220, 230, 248);
    this.doc.text(`N° RDV-${this.data.id}`, PAGE_W - MARGIN - 4, this.y + 19, { align: 'right' });

    this.y += h + 6;
  }

  private drawSummaryCard(): void {
    const h = 30;
    this.doc.setFillColor(...C.white);
    this.doc.setDrawColor(...C.line);
    this.doc.setLineWidth(0.2);
    this.doc.roundedRect(MARGIN, this.y, INNER_W, h, 2.5, 2.5, 'FD');

    this.doc.setFillColor(...C.brand);
    this.doc.roundedRect(MARGIN, this.y, 2.2, h, 2.5, 0, 'F');

    const leftX = MARGIN + 6;
    const rightX = PAGE_W - MARGIN - 4;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7);
    this.doc.setTextColor(...C.muted);
    this.doc.text('DATE & HEURE', leftX, this.y + 7);

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9.5);
    this.doc.setTextColor(...C.ink);
    const dateOne = this.capitalize(this.data.dateLong);
    this.doc.text(dateOne, leftX, this.y + 12.5);

    this.doc.setFontSize(14);
    this.doc.text(this.data.horaire, leftX, this.y + 19);

    const colors = statutColors(this.data.statutCode);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7);
    const badgeW = this.doc.getTextWidth(this.data.statut) + 7;
    const badgeX = rightX - badgeW;
    const badgeY = this.y + 14;
    this.doc.setFillColor(...colors.bg);
    this.doc.roundedRect(badgeX, badgeY, badgeW, 7, 3, 3, 'F');
    this.doc.setTextColor(...colors.fg);
    this.doc.text(this.data.statut, badgeX + 3.5, badgeY + 4.8);

    this.y += h + 6;
  }

  private drawSectionTitle(title: string): void {
    const barH = 5;
    this.doc.setFillColor(...C.brand);
    this.doc.roundedRect(MARGIN, this.y + 0.5, 1.2, barH, 0.4, 0.4, 'F');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7.5);
    this.doc.setTextColor(...C.ink);
    this.doc.text(title.toUpperCase(), MARGIN + 4, this.y + 4.5);

    this.y += barH + 4;
  }

  private drawInfoCard(rows: [string, string][]): void {
    const heights = rows.map(([, v]) => {
      const lines = this.doc.splitTextToSize(v, VALUE_W) as string[];
      return Math.max(9, lines.length * 4 + 4);
    });
    const totalH = heights.reduce((a, b) => a + b, 0);

    if (this.y + totalH > MAX_Y) {
      return;
    }

    this.doc.setDrawColor(...C.line);
    this.doc.setLineWidth(0.2);
    this.doc.roundedRect(MARGIN, this.y, INNER_W, totalH, 2, 2, 'S');

    let ry = this.y;
    rows.forEach(([label, value], i) => {
      const rowH = heights[i];
      const bg = i % 2 === 0 ? C.zebra : C.white;
      this.doc.setFillColor(...bg);
      if (i === 0) {
        this.doc.roundedRect(MARGIN, ry, INNER_W, rowH, 2, 0, 'F');
      } else if (i === rows.length - 1) {
        this.doc.rect(MARGIN, ry, INNER_W, rowH, 'F');
        this.doc.roundedRect(MARGIN, ry, INNER_W, rowH, 0, 2, 'F');
      } else {
        this.doc.rect(MARGIN, ry, INNER_W, rowH, 'F');
      }

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7);
      this.doc.setTextColor(...C.label);
      this.doc.text(label, MARGIN + 3, ry + 5.5);

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(8.5);
      this.doc.setTextColor(...C.ink);
      const lines = this.doc.splitTextToSize(value, VALUE_W) as string[];
      let vy = ry + 5;
      for (const line of lines) {
        this.doc.text(line, VALUE_X, vy);
        vy += 4;
      }

      if (i < rows.length - 1) {
        this.doc.setDrawColor(...C.line);
        this.doc.setLineWidth(0.1);
        this.doc.line(MARGIN + 2, ry + rowH, PAGE_W - MARGIN - 2, ry + rowH);
      }

      ry += rowH;
    });

    this.y = ry + 5;
  }

  private drawMotifBlock(): void {
    if (this.y > MAX_Y - 18) {
      return;
    }

    const lines = this.doc.splitTextToSize(this.data.motif, INNER_W - 10) as string[];
    const h = Math.max(14, lines.length * 4 + 8);

    this.doc.setFillColor(...C.panel);
    this.doc.setDrawColor(...C.line);
    this.doc.setLineWidth(0.2);
    this.doc.roundedRect(MARGIN, this.y, INNER_W, h, 2, 2, 'FD');

    this.doc.setFillColor(...C.brandLight);
    this.doc.roundedRect(MARGIN + 3, this.y + 3, 1, h - 6, 0.5, 0.5, 'F');

    this.doc.setFont('helvetica', 'italic');
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(...C.ink);
    let my = this.y + 7;
    for (const line of lines) {
      this.doc.text(line, MARGIN + 7, my);
      my += 4;
    }

    this.y += h + 5;
  }

  private drawLegalNote(): void {
    const text =
      "Ce document atteste l'enregistrement de votre demande sur MediChat. " +
      "Il constitue une preuve de réservation et ne remplace pas la confirmation officielle de la clinique.";
    const lines = this.doc.splitTextToSize(text, INNER_W - 6) as string[];
    const h = lines.length * 3.4 + 7;

    if (this.y + h + 8 > MAX_Y) {
      return;
    }

    this.doc.setFillColor(252, 253, 255);
    this.doc.setDrawColor(230, 235, 242);
    this.doc.setLineWidth(0.15);
    this.doc.roundedRect(MARGIN, this.y, INNER_W, h, 1.5, 1.5, 'FD');

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6.8);
    this.doc.setTextColor(...C.muted);
    let ny = this.y + 5;
    for (const line of lines) {
      this.doc.text(line, MARGIN + 3, ny);
      ny += 3.4;
    }

    this.y += h + 4;
  }

  private drawFooter(): void {
    this.y += 2;
    this.doc.setDrawColor(...C.line);
    this.doc.setLineWidth(0.2);
    this.doc.line(MARGIN + 4, this.y, PAGE_W - MARGIN - 4, this.y);
    this.y += 4;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6.5);
    this.doc.setTextColor(...C.muted);
    this.doc.text(`Document généré le ${this.data.generatedAt}`, PAGE_W / 2, this.y, { align: 'center' });
  }

  private capitalize(s: string): string {
    if (!s) {
      return s;
    }
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}

export async function downloadRdvRecuFromData(data: RdvRecuData, filename: string): Promise<void> {
  const doc = new RdvRecuPdfBuilder(data).build();
  doc.save(filename);
  await Promise.resolve();
}
