import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { ToastService } from '../../../core/toast.service';
import { OrdonnancePatient, OrdonnanceService } from '../../../services/ordonnance.service';

function formatFr(iso: string | null | undefined): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso ?? '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

@Component({
  selector: 'app-patient-ordonnances',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-ordonnances.html',
  styleUrls: ['./patient-ordonnances.css', '../patient-pro.css']
})
export class PatientOrdonnances implements OnInit {
  private readonly svc = inject(OrdonnanceService);
  private readonly toast = inject(ToastService);

  readonly ordonnances = signal<OrdonnancePatient[]>([]);
  readonly loading = signal(true);
  readonly detail = signal<OrdonnancePatient | null>(null);
  readonly qrDataUrl = signal('');
  readonly qrOrdonnance = signal<OrdonnancePatient | null>(null);
  readonly qrLoading = signal(false);
  readonly pdfBusy = signal(false);

  ngOnInit(): void {
    this.svc.getMesOrdonnances().subscribe({
      next: (list) => { this.ordonnances.set(list ?? []); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast.show('Impossible de charger les ordonnances.', 'error'); }
    });
  }

  ouvrirDetail(o: OrdonnancePatient): void {
    this.detail.set(o);
    document.body.style.overflow = 'hidden';
  }

  fermerDetail(): void {
    this.detail.set(null);
    document.body.style.overflow = '';
  }

  async ouvrirQr(o: OrdonnancePatient): Promise<void> {
    this.qrOrdonnance.set(o);
    this.qrDataUrl.set('');
    this.qrLoading.set(true);
    document.body.style.overflow = 'hidden';
    const payload = o.qrUrl?.trim();
    if (!payload) {
      this.qrLoading.set(false);
      return;
    }
    try {
      const url = await QRCode.toDataURL(payload, {
        width: 280, margin: 3,
        errorCorrectionLevel: 'M',
        color: { dark: '#0f172a', light: '#ffffff' }
      });
      this.qrDataUrl.set(url);
    } catch {
      this.toast.show('Impossible de générer le QR code.', 'error');
    } finally {
      this.qrLoading.set(false);
    }
  }

  fermerQr(): void {
    this.qrOrdonnance.set(null);
    this.qrDataUrl.set('');
    document.body.style.overflow = '';
  }

  telechargerPdf(o: OrdonnancePatient, event: Event): void {
    event.stopPropagation();
    this.pdfBusy.set(true);
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const W = 210;
      const PG = 14;    // page margin
      const CI = 10;    // card inner padding

      /* ── Fond de page gris clair (comme le site) ──────────────────── */
      doc.setFillColor(241, 245, 249);
      doc.rect(0, 0, W, 297, 'F');

      /* ── Mini-header MediChat ─────────────────────────────────────── */
      let y = 14;
      doc.setTextColor(30, 58, 95);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('MediChat', PG, y);
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Gestion clinique intelligente', PG, y + 6);
      y += 18;

      /* ── Pré-calcul hauteur carte ─────────────────────────────────── */
      const cardX  = PG;
      const cardW  = W - PG * 2;
      const cL     = cardX + CI;       // left edge of content
      const cW     = cardW - CI * 2;   // width of content

      const lignes = this.lignes(o.medicamentsText);
      const allWrapped: string[][] = lignes.length
        ? lignes.map(l => doc.splitTextToSize(l, cW - 8) as string[])
        : [['Aucun traitement renseigne.']];
      const medsH = allWrapped.reduce((s, w) => s + w.length * 6.5 + 3, 10);

      const contactRows: [string, string][] = (
        [['Specialite', o.medecinSpecialite],
         ['Telephone',  o.medecinTelephone],
         ['E-mail',     o.medecinEmail]]
      ).filter(([, v]) => !!v) as [string, string][];

      // header block + sep + traitement + date + sep + prescripteur + sep + disclaimer + padding
      const cardH = 12 + 7 + 9 + 12 + 10  // header
                  + 8                       // sep
                  + 7 + medsH + 8 + 7 + 10 // traitement + date
                  + 8                       // sep
                  + 7 + 9 + contactRows.length * 7 + 4 // prescripteur
                  + 8                       // sep
                  + 12 + 10;               // disclaimer + bottom padding

      /* ── Ombre + carte blanche ────────────────────────────────────── */
      doc.setFillColor(210, 220, 234);
      doc.roundedRect(cardX + 1.5, y + 1.5, cardW, cardH, 5, 5, 'F');
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(cardX, y, cardW, cardH, 5, 5, 'FD');

      y += 12;

      /* helpers locaux ──────────────────────────────────────────────── */
      const sep = () => {
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.35);
        doc.line(cL, y, cL + cW, y);
        y += 8;
      };
      const blueLabel = (txt: string) => {
        doc.setTextColor(30, 58, 95);
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.text(txt, cL, y);
        y += 7;
      };

      /* ── ORDONNANCE chip ──────────────────────────────────────────── */
      doc.setTextColor(30, 58, 95);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('ORDONNANCE', cL, y);
      y += 9;

      /* ── Titre ────────────────────────────────────────────────────── */
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Ordonnance medicale', cL, y);
      y += 9;

      /* ── Sous-titre ───────────────────────────────────────────────── */
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const sub = doc.splitTextToSize(
        'Recapitulatif lu depuis le QR code ou le lien securise.',
        cW
      ) as string[];
      doc.text(sub, cL, y);
      y += sub.length * 5.5 + 8;

      sep();

      /* ── Traitement prescrit ──────────────────────────────────────── */
      blueLabel('Traitement prescrit');

      const bH = allWrapped.reduce((s, w) => s + w.length * 6.5 + 3, 10);
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.25);
      doc.roundedRect(cL, y, cW, bH, 4, 4, 'FD');
      y += 7;
      for (const wrapped of allWrapped) {
        if (lignes.length === 0) {
          doc.setTextColor(148, 163, 184);
          doc.setFont('helvetica', 'italic');
        } else {
          doc.setTextColor(15, 23, 42);
          doc.setFont('helvetica', 'normal');
        }
        doc.setFontSize(10.5);
        doc.text(wrapped, cL + 5, y);
        y += wrapped.length * 6.5 + 3;
      }
      y += 7;

      /* ── Date de l'ordonnance ─────────────────────────────────────── */
      blueLabel("Date de l'ordonnance");
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(this.formatDate(o.dateOrdonnance), cL, y);
      y += 10;

      sep();

      /* ── Prescripteur ─────────────────────────────────────────────── */
      blueLabel('Prescripteur');

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(this.medecinLabel(o), cL, y);
      y += 9;

      doc.setFontSize(10);
      for (const [lbl, val] of contactRows) {
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'bold');
        doc.text(lbl, cL, y);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'normal');
        doc.text(val, cL + 32, y);
        y += 7;
      }
      y += 6;

      sep();

      /* ── Disclaimer ───────────────────────────────────────────────── */
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      const disc = doc.splitTextToSize(
        'Document confidentiel. Verifiez les informations avant toute utilisation.',
        cW
      ) as string[];
      doc.text(disc, cL, y);

      doc.save(`${o.numeroOrdonnance}-${o.dateOrdonnance ?? 'date'}.pdf`);
      this.toast.show('PDF telecharge.', 'success');
    } catch (err) {
      console.error('PDF error:', err);
      this.toast.show('Export PDF impossible.', 'error');
    } finally {
      this.pdfBusy.set(false);
    }
  }

  medecinLabel(o: OrdonnancePatient): string {
    return `Dr. ${o.medecinPrenom ?? ''} ${o.medecinNom ?? ''}`.trim();
  }

  formatDate(iso: string | null | undefined): string {
    return formatFr(iso);
  }

  lignes(text: string | null | undefined): string[] {
    return (text ?? '').split('\n').filter(l => l.trim().length > 0);
  }
}
