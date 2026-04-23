/** Clé localStorage partagée consultation → ordonnance. */
export const LS_CONSULTATION_BROUILLON = 'medichat_consultation_brouillon';
export const LS_ORDONNANCE_TEXTE = 'medichat_ordonnance_texte';
export const LS_ORDONNANCE_META = 'medichat_ordonnance_meta';

export interface LigneMedicament {
  medicament: string;
  posologie: string;
  dureeJours: string;
}

/** Texte « Médicaments prescrits » à partir des lignes + notes (même format que l’ordonnance). */
export function formatLignesPourOrdonnance(lignes: LigneMedicament[], notes?: string): string {
  const lines = (lignes ?? [])
    .map((l) => {
      const m = (l.medicament ?? '').trim();
      if (!m) {
        return '';
      }
      const p = (l.posologie ?? '').trim() || '';
      const d = (l.dureeJours ?? '').trim() || '—';
      return `${m} : ${p} — ${d} jours`;
    })
    .filter((x) => x.length > 0);
  let out = lines.join('\n');
  const n = (notes ?? '').trim();
  if (n && out) {
    out += `\n\nNotes : ${n}`;
  } else if (n) {
    out = `Notes : ${n}`;
  }
  return out;
}

export function parseConsultationBrouillon(raw: string | null): {
  patientId?: number;
  lignes?: LigneMedicament[];
  notes?: string;
} | null {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as {
      patientId?: number;
      lignes?: LigneMedicament[];
      notes?: string;
    };
  } catch {
    return null;
  }
}
