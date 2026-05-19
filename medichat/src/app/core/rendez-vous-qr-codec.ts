export interface RendezVousQrDecoded {
  id?: number;
  patient?: string;
  medecin?: string;
  specialite?: string | null;
  date?: string;
  heureDebut?: string;
  heureFin?: string;
  mode?: string;
  motif?: string | null;
  statut?: string;
}

function toBase64UrlUtf8(input: string): string {
  const utf8 = encodeURIComponent(input).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  );
  return btoa(utf8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64UrlToUtf8String(s: string): string {
  let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) {
    b64 += '=';
  }
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

function mapCompact(o: Record<string, unknown>): RendezVousQrDecoded {
  return {
    id: o['i'] != null ? Number(o['i']) : undefined,
    patient: o['p'] != null ? String(o['p']) : '',
    medecin: o['g'] != null ? String(o['g']) : '',
    specialite: o['s'] != null ? String(o['s']) : '',
    date: o['d'] != null ? String(o['d']) : '',
    heureDebut: o['hd'] != null ? String(o['hd']) : '',
    heureFin: o['hf'] != null ? String(o['hf']) : '',
    mode: o['m'] != null ? String(o['m']) : '',
    motif: o['x'] != null ? String(o['x']) : '',
    statut: o['st'] != null ? String(o['st']) : ''
  };
}

export function encodeRendezVousQrToken(args: RendezVousQrDecoded): string {
  const obj: Record<string, string | number> = {
    v: 1
  };
  if (args.id != null) obj['i'] = args.id;
  if (args.patient) obj['p'] = args.patient;
  if (args.medecin) obj['g'] = args.medecin;
  if (args.specialite) obj['s'] = args.specialite;
  if (args.date) obj['d'] = args.date;
  if (args.heureDebut) obj['hd'] = args.heureDebut;
  if (args.heureFin) obj['hf'] = args.heureFin;
  if (args.mode) obj['m'] = args.mode;
  if (args.motif) obj['x'] = args.motif;
  if (args.statut) obj['st'] = args.statut;
  return toBase64UrlUtf8(JSON.stringify(obj));
}

export function encodeRendezVousQrUrl(args: RendezVousQrDecoded & { baseUrl: string }): string {
  const base = args.baseUrl.trim().replace(/\/+$/g, '');
  if (!base) {
    return '';
  }
  const token = encodeRendezVousQrToken(args);
  return `${base}/rendez-vous#data=${encodeURIComponent(token)}`;
}

export function decodeRendezVousQrData(raw: string): RendezVousQrDecoded | null {
  const s = raw.trim();
  if (!s) {
    return null;
  }
  try {
    const jsonStr = s.startsWith('{') ? s : fromBase64UrlToUtf8String(s);
    const o = JSON.parse(jsonStr) as Record<string, unknown>;
    const compact =
      o['v'] === 1 ||
      o['v'] === '1' ||
      Object.prototype.hasOwnProperty.call(o, 'hd') ||
      Object.prototype.hasOwnProperty.call(o, 'hf');
    if (compact) {
      return mapCompact(o);
    }
    return {
      id: o['id'] != null ? Number(o['id']) : undefined,
      patient: o['patient'] != null ? String(o['patient']) : '',
      medecin: o['medecin'] != null ? String(o['medecin']) : '',
      specialite: o['specialite'] != null ? String(o['specialite']) : '',
      date: o['date'] != null ? String(o['date']) : '',
      heureDebut: o['heureDebut'] != null ? String(o['heureDebut']) : '',
      heureFin: o['heureFin'] != null ? String(o['heureFin']) : '',
      mode: o['mode'] != null ? String(o['mode']) : '',
      motif: o['motif'] != null ? String(o['motif']) : '',
      statut: o['statut'] != null ? String(o['statut']) : ''
    };
  } catch {
    return null;
  }
}

export function isRendezVousPayloadEmpty(o: RendezVousQrDecoded | null | undefined): boolean {
  if (!o) {
    return true;
  }
  return ![o.patient, o.medecin, o.date, o.heureDebut].some((v) => (v ?? '').trim());
}
