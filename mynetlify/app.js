function normalizeBase64Url(value) {
  if (!value) {
    return '';
  }
  var b64 = value.replace(/-/g, '+').replace(/_/g, '/');
  var pad = b64.length % 4;
  if (pad) {
    b64 += '='.repeat(4 - pad);
  }
  return b64;
}

/** Binaire base64url → Uint8Array */
function base64UrlToBytes(value) {
  var b64 = normalizeBase64Url(value);
  var binary = atob(b64);
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Jeton base64url (texte UTF-8) → string */
function decodeBase64UrlToUtf8(value) {
  if (!value) {
    return '';
  }
  try {
    var bytes = base64UrlToBytes(value);
    return new TextDecoder('utf-8').decode(bytes);
  } catch (err) {
    return '';
  }
}

function formatDate(value) {
  if (!value) {
    return '—';
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    var parts = value.split('-');
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }
  return value;
}

function setText(id, value) {
  var el = document.getElementById(id);
  if (!el) {
    return;
  }
  el.textContent = value || '—';
}

function setTraitementBloc(id, raw) {
  var el = document.getElementById(id);
  if (!el) {
    return;
  }
  var t = (raw != null ? String(raw) : '').trim();
  if (!t) {
    el.textContent = '—';
    el.classList.add('is-empty');
    return;
  }
  el.textContent = t;
  el.classList.remove('is-empty');
}

function showError(show) {
  var el = document.getElementById('ord-error');
  if (!el) {
    return;
  }
  el.hidden = !show;
}

/**
 * Même logique que l’app Angular : ?data= ou #data=, jeton v2 compact, z:gzip, ou ancien v1.
 */
function extractDataToken() {
  var params = new URLSearchParams(window.location.search);
  var q = params.get('data');
  if (q && q.trim()) {
    return q.trim();
  }
  var h = window.location.hash || '';
  if (h.startsWith('#')) {
    h = h.slice(1);
  }
  h = h.trim();
  if (h.startsWith('/')) {
    h = h.slice(1).trim();
  }
  if (h.startsWith('data=')) {
    var v = h.slice(5);
    var amp = v.indexOf('&');
    if (amp >= 0) {
      v = v.slice(0, amp);
    }
    try {
      v = decodeURIComponent(v);
    } catch (e) {
      /* brut */
    }
    return v.trim();
  }
  if (h.startsWith('z:')) {
    var ztok = h;
    var zAmp = ztok.indexOf('&');
    if (zAmp >= 0) {
      ztok = ztok.slice(0, zAmp);
    }
    return ztok.trim();
  }
  if (/^[A-Za-z0-9_-]+$/.test(h)) {
    return h.trim();
  }
  return '';
}

function gunzipBytes(bytes) {
  if (typeof DecompressionStream === 'undefined') {
    return Promise.reject(new Error('no-gzip'));
  }
  var ds = new DecompressionStream('gzip');
  var stream = new Blob([bytes]).stream().pipeThrough(ds);
  return new Response(stream).text();
}

function parseJsonPayload(jsonStr) {
  var s = String(jsonStr).replace(/^\uFEFF/, '');
  var o = JSON.parse(s);
  var ver = o.v;
  var compact =
    ver === 2 ||
    ver === '2' ||
    ver === 'v2' ||
    (Object.prototype.hasOwnProperty.call(o, 'p') &&
      Object.prototype.hasOwnProperty.call(o, 't') &&
      !Object.prototype.hasOwnProperty.call(o, 'patient'));
  if (compact) {
    return {
      patient: o.p != null ? String(o.p) : '',
      date: o.d != null ? String(o.d) : '',
      medecin: o.g != null ? String(o.g) : '',
      medecinAddr: '',
      medecinTel: '',
      medecinEmail: '',
      meds: o.t != null ? String(o.t) : '',
      note: o.note != null ? String(o.note) : ''
    };
  }
  return {
    patient: o.patient != null ? String(o.patient) : '',
    date: o.date != null ? String(o.date) : '',
    medecin: o.medecin != null ? String(o.medecin) : '',
    medecinAddr: o.medecinAddr != null ? String(o.medecinAddr) : '',
    medecinTel: o.medecinTel != null ? String(o.medecinTel) : '',
    medecinEmail: o.medecinEmail != null ? String(o.medecinEmail) : '',
    meds: o.meds != null ? String(o.meds) : '',
    note: o.note != null ? String(o.note) : ''
  };
}

async function decodeToken(token) {
  if (!token) {
    return null;
  }
  try {
    var jsonStr;
    if (token.startsWith('z:')) {
      var rawB64 = token.slice(2);
      var bytes = base64UrlToBytes(rawB64);
      jsonStr = await gunzipBytes(bytes);
    } else {
      jsonStr = decodeBase64UrlToUtf8(token);
    }
    if (!jsonStr) {
      return null;
    }
    return parseJsonPayload(jsonStr);
  } catch (err) {
    return null;
  }
}

async function init() {
  var token = extractDataToken();
  var raw = await decodeToken(token);
  var payload = raw || {};
  var params = new URLSearchParams(window.location.search);

  var patient = payload.patient || params.get('patient');
  var date = payload.date || params.get('date');
  var medecin = payload.medecin || params.get('medecin');
  var medecinAddr = payload.medecinAddr || params.get('medecinAddr');
  var medecinTel = payload.medecinTel || params.get('medecinTel');
  var medecinEmail = payload.medecinEmail || params.get('medecinEmail');
  var meds = payload.meds || params.get('meds');
  var note = payload.note || params.get('note');

  setText('ord-patient', patient);
  setText('ord-date', formatDate(date));
  setText('ord-medecin', medecin);
  setText('ord-medecin-addr', medecinAddr);
  setText('ord-medecin-tel', medecinTel);
  setText('ord-medecin-email', medecinEmail);

  var medsRaw = '';
  if (typeof meds === 'string') {
    medsRaw = meds.trim();
  } else if (Array.isArray(meds)) {
    medsRaw = meds
      .map(function (line) {
        return String(line).trim();
      })
      .filter(Boolean)
      .join('\n');
  }
  setTraitementBloc('ord-traitement', medsRaw || '');

  var noteWrap = document.getElementById('ord-note-wrap');
  var noteEl = document.getElementById('ord-note');
  if (noteWrap && noteEl) {
    var nt = note != null ? String(note).trim() : '';
    if (nt) {
      noteEl.textContent = nt;
      noteWrap.hidden = false;
    } else {
      noteEl.textContent = '';
      noteWrap.hidden = true;
    }
  }

  var isMissing = !patient && !medsRaw && !medecin;
  showError(isMissing);
}

window.addEventListener('DOMContentLoaded', function () {
  void init();
});
window.addEventListener('hashchange', function () {
  void init();
});
