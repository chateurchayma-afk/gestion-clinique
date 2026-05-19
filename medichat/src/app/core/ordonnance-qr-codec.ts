/**
 * Encodage / décodage du contenu du QR ordonnance (compact v2 + gzip si disponible).
 * Clés v2 : p patient, d date, g médecin, t traitement, a adresse, l ville, n téléphone, e email.
 */

export interface OrdonnanceQrDecoded {
  patient?: string;
  date?: string;
  medecin?: string;
  /** Adresse (rue) */
  medecinAdresse?: string;
  /** Ville */
  medecinVille?: string;
  /** Adresse affichée (rue + ville) */
  medecinAddr?: string;
  medecinTel?: string;
  medecinEmail?: string;
  meds?: string;
}

function toBase64UrlUtf8(input: string): string {
  const utf8 = encodeURIComponent(input).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  );
  return btoa(utf8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function fromBase64UrlToBytes(s: string): Uint8Array {
  let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) {
    b64 += '=';
  }
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function fromBase64UrlToUtf8String(s: string): string {
  const bytes = fromBase64UrlToBytes(s);
  return new TextDecoder('utf-8').decode(bytes);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]!);
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function gzipUtf8(json: string): Promise<Uint8Array> {
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzipToText(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes);
  const stream = new Blob([copy]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(stream).text();
}

function joinAddr(adresse: string, ville: string, legacyAddr: string): string {
  const parts = [adresse.trim(), ville.trim()].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(', ');
  }
  return legacyAddr.trim();
}

function mapCompactV2(o: Record<string, unknown>): OrdonnanceQrDecoded {
  const adresse = o['a'] != null ? String(o['a']) : '';
  const ville = o['l'] != null ? String(o['l']) : '';
  return {
    patient: o['p'] != null ? String(o['p']) : '',
    date: o['d'] != null ? String(o['d']) : '',
    medecin: o['g'] != null ? String(o['g']) : '',
    medecinAdresse: adresse,
    medecinVille: ville,
    medecinAddr: joinAddr(adresse, ville, ''),
    medecinTel: o['n'] != null ? String(o['n']) : '',
    medecinEmail: o['e'] != null ? String(o['e']) : '',
    meds: o['t'] != null ? String(o['t']) : ''
  };
}

/** Construit l’URL complète à encoder dans le QR (#data=… sur la page Netlify). */
export async function encodeOrdonnanceQrUrl(args: {
  baseUrl: string;
  patient: string;
  date: string;
  medecin: string;
  meds: string;
  medecinAdresse?: string;
  medecinVille?: string;
  medecinTel?: string;
  medecinEmail?: string;
}): Promise<string> {
  const base = args.baseUrl.trim().replace(/\/+$/g, '');
  if (!base) {
    return '';
  }
  const obj: Record<string, string | number> = {
    v: 2,
    p: args.patient,
    d: args.date,
    g: args.medecin,
    t: args.meds
  };
  const a = (args.medecinAdresse ?? '').trim();
  const l = (args.medecinVille ?? '').trim();
  const n = (args.medecinTel ?? '').trim();
  const e = (args.medecinEmail ?? '').trim();
  if (a) {
    obj['a'] = a;
  }
  if (l) {
    obj['l'] = l;
  }
  if (n && n !== '—') {
    obj['n'] = n;
  }
  if (e) {
    obj['e'] = e;
  }
  const json = JSON.stringify(obj);
  let token: string;
  const plain = toBase64UrlUtf8(json);
  try {
    if (typeof CompressionStream !== 'undefined' && plain.length > 720) {
      const gz = await gzipUtf8(json);
      const zTok = 'z:' + bytesToBase64Url(gz);
      token = zTok.length < plain.length ? zTok : plain;
    } else {
      token = plain;
    }
  } catch {
    token = plain;
  }
  return `${base}/#data=${encodeURIComponent(token)}`;
}

/** Indique si le contenu décodé ne contient rien d’affichable. */
export function isOrdonnancePayloadEmpty(o: OrdonnanceQrDecoded | null | undefined): boolean {
  if (!o) {
    return true;
  }
  const patient = (o.patient ?? '').trim();
  const meds = (o.meds ?? '').trim();
  const medecin = (o.medecin ?? '').trim();
  const medecinPlaceholder =
    !medecin || medecin === '—' || medecin === 'Médecin' || medecin === 'Dr. Médecin';
  return !patient && !meds && medecinPlaceholder;
}

/** Décode le jeton après lecture du hash / query (data=…). */
export async function decodeOrdonnanceQrData(raw: string): Promise<OrdonnanceQrDecoded | null> {
  const s = raw.trim();
  if (!s) {
    return null;
  }
  try {
    let jsonStr: string;
    if (s.startsWith('z:')) {
      if (typeof DecompressionStream === 'undefined') {
        return null;
      }
      const b = fromBase64UrlToBytes(s.slice(2));
      jsonStr = await gunzipToText(b);
    } else {
      jsonStr = fromBase64UrlToUtf8String(s);
    }
    const o = JSON.parse(jsonStr) as Record<string, unknown>;
    const ver = o['v'];
    const compact =
      ver === 2 ||
      ver === '2' ||
      ver === 'v2' ||
      (Object.prototype.hasOwnProperty.call(o, 'p') &&
        Object.prototype.hasOwnProperty.call(o, 't') &&
        !Object.prototype.hasOwnProperty.call(o, 'patient'));
    if (compact) {
      return mapCompactV2(o);
    }
    const legacyAddr = o['medecinAddr'] != null ? String(o['medecinAddr']) : '';
    const adresse = o['medecinAdresse'] != null ? String(o['medecinAdresse']) : '';
    const ville = o['medecinVille'] != null ? String(o['medecinVille']) : '';
    return {
      patient: o['patient'] != null ? String(o['patient']) : '',
      date: o['date'] != null ? String(o['date']) : '',
      medecin: o['medecin'] != null ? String(o['medecin']) : '',
      medecinAdresse: adresse,
      medecinVille: ville,
      medecinAddr: joinAddr(adresse, ville, legacyAddr),
      medecinTel: o['medecinTel'] != null ? String(o['medecinTel']) : '',
      medecinEmail: o['medecinEmail'] != null ? String(o['medecinEmail']) : '',
      meds: o['meds'] != null ? String(o['meds']) : ''
    };
  } catch {
    return null;
  }
}
