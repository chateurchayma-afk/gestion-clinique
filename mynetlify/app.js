function normalizeBase64Url(value) {
  if (!value) return '';
  var b64 = value.replace(/-/g, '+').replace(/_/g, '/');
  var pad = b64.length % 4;
  if (pad) b64 += '='.repeat(4 - pad);
  return b64;
}

function base64UrlToBytes(value) {
  var binary = atob(normalizeBase64Url(value));
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeBase64UrlToUtf8(value) {
  if (!value) return '';
  try {
    return new TextDecoder('utf-8').decode(base64UrlToBytes(value));
  } catch (err) {
    return '';
  }
}

function formatDate(value) {
  if (!value) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    var parts = value.split('-');
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }
  return value;
}

function formatHeure(value) {
  if (!value) return '';
  value = String(value);
  return value.length >= 5 ? value.slice(0, 5) : value;
}

function labelStatut(value) {
  switch (value) {
    case 'EN_ATTENTE':
      return 'En attente';
    case 'CONFIRME':
      return 'Confirmé';
    case 'ANNULE':
      return 'Annulé';
    case 'TERMINE':
      return 'Terminé';
    default:
      return value || '—';
  }
}

function setText(id, value) {
  var el = document.getElementById(id);
  if (el) el.textContent = value || '—';
}

function setOptionalLine(wrapId, textId, value) {
  var wrap = document.getElementById(wrapId);
  var el = document.getElementById(textId);
  if (!el) return;
  var t = value != null ? String(value).trim() : '';
  if (!t || t === '—') {
    el.textContent = '';
    if (wrap) wrap.hidden = true;
    return;
  }
  el.textContent = t;
  if (wrap) wrap.hidden = false;
}

function setBloc(id, raw) {
  var el = document.getElementById(id);
  if (!el) return;
  var t = raw != null ? String(raw).trim() : '';
  if (!t) {
    el.textContent = '—';
    el.classList.add('is-empty');
    return;
  }
  el.textContent = t;
  el.classList.remove('is-empty');
}

function show(id, visible) {
  var el = document.getElementById(id);
  if (el) el.hidden = !visible;
}

function extractDataToken() {
  var params = new URLSearchParams(window.location.search);
  var q = params.get('data');
  if (q && q.trim()) return q.trim();

  var h = window.location.hash || '';
  if (h.startsWith('#')) h = h.slice(1);
  h = h.trim();
  if (h.startsWith('/')) h = h.slice(1).trim();

  if (h.startsWith('data=')) {
    var v = h.slice(5);
    var amp = v.indexOf('&');
    if (amp >= 0) v = v.slice(0, amp);
    try {
      v = decodeURIComponent(v);
    } catch (e) {
      /* brut */
    }
    return v.trim();
  }
  if (h.startsWith('z:')) return h.trim();
  if (h.startsWith('{')) return h.trim();
  if (/^[A-Za-z0-9_-]+$/.test(h)) return h.trim();
  return '';
}

function gunzipBytes(bytes) {
  if (typeof DecompressionStream === 'undefined') {
    return Promise.reject(new Error('no-gzip'));
  }
  var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

function joinAddr(adresse, ville, legacy) {
  var parts = [adresse, ville].filter(function (x) {
    return x && String(x).trim();
  });
  return parts.length ? parts.join(', ') : legacy || '';
}

function parseOrdonnancePayload(jsonStr) {
  var o = JSON.parse(String(jsonStr).replace(/^\uFEFF/, ''));
  var compact =
    o.v === 2 ||
    o.v === '2' ||
    o.v === 'v2' ||
    (Object.prototype.hasOwnProperty.call(o, 'p') &&
      Object.prototype.hasOwnProperty.call(o, 't') &&
      !Object.prototype.hasOwnProperty.call(o, 'patient'));

  if (compact) {
    var adresse = o.a != null ? String(o.a) : '';
    var ville = o.l != null ? String(o.l) : '';
    return {
      patient: o.p != null ? String(o.p) : '',
      date: o.d != null ? String(o.d) : '',
      medecin: o.g != null ? String(o.g) : '',
      medecinAdresse: adresse,
      medecinVille: ville,
      medecinAddr: joinAddr(adresse, ville, ''),
      medecinTel: o.n != null ? String(o.n) : '',
      medecinEmail: o.e != null ? String(o.e) : '',
      meds: o.t != null ? String(o.t) : ''
    };
  }

  var legacyAddr = o.medecinAddr != null ? String(o.medecinAddr) : '';
  var adr = o.medecinAdresse != null ? String(o.medecinAdresse) : '';
  var vil = o.medecinVille != null ? String(o.medecinVille) : '';
  return {
    patient: o.patient != null ? String(o.patient) : '',
    date: o.date != null ? String(o.date) : '',
    medecin: o.medecin != null ? String(o.medecin) : '',
    medecinAdresse: adr,
    medecinVille: vil,
    medecinAddr: joinAddr(adr, vil, legacyAddr),
    medecinTel: o.medecinTel != null ? String(o.medecinTel) : '',
    medecinEmail: o.medecinEmail != null ? String(o.medecinEmail) : '',
    meds: o.meds != null ? String(o.meds) : ''
  };
}

function parseRendezVousPayload(jsonStr) {
  var o = JSON.parse(String(jsonStr).replace(/^\uFEFF/, ''));
  var compact =
    o.v === 1 ||
    o.v === '1' ||
    Object.prototype.hasOwnProperty.call(o, 'hd') ||
    Object.prototype.hasOwnProperty.call(o, 'hf');

  if (compact) {
    return {
      id: o.i != null ? Number(o.i) : undefined,
      patient: o.p != null ? String(o.p) : '',
      medecin: o.g != null ? String(o.g) : '',
      specialite: o.s != null ? String(o.s) : '',
      date: o.d != null ? String(o.d) : '',
      heureDebut: o.hd != null ? String(o.hd) : '',
      heureFin: o.hf != null ? String(o.hf) : '',
      mode: o.m != null ? String(o.m) : '',
      motif: o.x != null ? String(o.x) : '',
      statut: o.st != null ? String(o.st) : ''
    };
  }

  return {
    id: o.id != null ? Number(o.id) : undefined,
    patient: o.patient != null ? String(o.patient) : '',
    medecin: o.medecin != null ? String(o.medecin) : '',
    specialite: o.specialite != null ? String(o.specialite) : '',
    date: o.date != null ? String(o.date) : '',
    heureDebut: o.heureDebut != null ? String(o.heureDebut) : '',
    heureFin: o.heureFin != null ? String(o.heureFin) : '',
    mode: o.mode != null ? String(o.mode) : '',
    motif: o.motif != null ? String(o.motif) : '',
    statut: o.statut != null ? String(o.statut) : ''
  };
}

async function decodeToken(token, parser) {
  if (!token) return null;
  try {
    var jsonStr;
    if (token.startsWith('z:')) {
      jsonStr = await gunzipBytes(base64UrlToBytes(token.slice(2)));
    } else if (token.startsWith('{')) {
      jsonStr = token;
    } else {
      jsonStr = decodeBase64UrlToUtf8(token);
    }
    if (!jsonStr) return null;
    return parser(jsonStr);
  } catch (err) {
    return null;
  }
}

function isRendezVousPage() {
  return window.location.pathname.replace(/\/+$/g, '') === '/rendez-vous';
}

async function initOrdonnance() {
  show('ord-section', true);
  show('ord-side', true);
  show('rdv-section', false);
  show('rdv-side', false);

  var token = extractDataToken();
  var raw = await decodeToken(token, parseOrdonnancePayload);
  var payload = raw || {};
  var params = new URLSearchParams(window.location.search);

  var patient = payload.patient || params.get('patient');
  var date = payload.date || params.get('date');
  var medecin = payload.medecin || params.get('medecin');
  var medecinAdresse = payload.medecinAdresse || params.get('medecinAdresse') || params.get('adresse');
  var medecinVille = payload.medecinVille || params.get('medecinVille') || params.get('ville');
  var medecinTel = payload.medecinTel || params.get('medecinTel') || params.get('telephone');
  var medecinEmail = payload.medecinEmail || params.get('medecinEmail');
  var meds = payload.meds || params.get('meds');

  if (!medecinAdresse && !medecinVille && payload.medecinAddr) {
    medecinAdresse = payload.medecinAddr;
  }

  setText('ord-patient', patient);
  setText('ord-date', formatDate(date));
  setText('ord-medecin', medecin);
  setOptionalLine('ord-adresse-wrap', 'ord-medecin-adresse', medecinAdresse);
  setOptionalLine('ord-ville-wrap', 'ord-medecin-ville', medecinVille);
  setOptionalLine('ord-tel-wrap', 'ord-medecin-tel', medecinTel);
  setOptionalLine('ord-email-wrap', 'ord-medecin-email', medecinEmail);
  setBloc('ord-traitement', Array.isArray(meds) ? meds.join('\n') : meds);
  show('ord-error', !patient && !meds && !medecin);
}

async function initRendezVous() {
  show('ord-section', false);
  show('ord-side', false);
  show('rdv-section', true);
  show('rdv-side', true);

  var token = extractDataToken();
  var payload = (await decodeToken(token, parseRendezVousPayload)) || {};
  var params = new URLSearchParams(window.location.search);

  var patient = payload.patient || params.get('patient');
  var medecin = payload.medecin || params.get('medecin');
  var specialite = payload.specialite || params.get('specialite') || 'Consultation';
  var date = payload.date || params.get('date');
  var heureDebut = payload.heureDebut || params.get('heureDebut');
  var heureFin = payload.heureFin || params.get('heureFin');
  var statut = payload.statut || params.get('statut');

  setText('rdv-patient', patient);
  setText('rdv-medecin', medecin);
  setText('rdv-specialite', specialite);
  setText('rdv-date', formatDate(date));
  setText('rdv-heure', [formatHeure(heureDebut), formatHeure(heureFin)].filter(Boolean).join(' - '));
  setText('rdv-statut', labelStatut(statut));
  show('rdv-error', !patient && !medecin && !date && !heureDebut);
}

async function init() {
  if (isRendezVousPage()) {
    await initRendezVous();
  } else {
    await initOrdonnance();
  }
}

window.addEventListener('DOMContentLoaded', function () {
  void init();
});
window.addEventListener('hashchange', function () {
  void init();
});
