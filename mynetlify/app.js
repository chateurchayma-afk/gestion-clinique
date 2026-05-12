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

function decodeBase64UrlJson(value) {
  if (!value) {
    return null;
  }
  try {
    var b64 = normalizeBase64Url(value);
    var binary = atob(b64);
    var utf8 = '';
    for (var i = 0; i < binary.length; i += 1) {
      var code = binary.charCodeAt(i).toString(16).padStart(2, '0');
      utf8 += '%' + code;
    }
    var json = decodeURIComponent(utf8);
    return JSON.parse(json);
  } catch (err) {
    return null;
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

function setList(id, items) {
  var el = document.getElementById(id);
  if (!el) {
    return;
  }
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
  if (!items || !items.length) {
    var li = document.createElement('li');
    li.textContent = '—';
    el.appendChild(li);
    return;
  }
  items.forEach(function (item) {
    var li = document.createElement('li');
    li.textContent = item;
    el.appendChild(li);
  });
}

function showError(show) {
  var el = document.getElementById('ord-error');
  if (!el) {
    return;
  }
  el.hidden = !show;
}

function init() {
  var params = new URLSearchParams(window.location.search);
  var dataParam = params.get('data');
  var raw = decodeBase64UrlJson(dataParam);
  var payload = raw || {};

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

  var medsList = [];
  if (Array.isArray(meds)) {
    medsList = meds;
  } else if (typeof meds === 'string') {
    medsList = meds
      .split(/\n+/)
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean);
  }
  setList('ord-meds', medsList);

  var noteEl = document.getElementById('ord-note');
  if (noteEl) {
    noteEl.textContent = note ? note : 'Aucune note supplementaire.';
  }

  var isMissing = !patient && !medsList.length && !medecin;
  showError(isMissing);
}

window.addEventListener('DOMContentLoaded', init);
