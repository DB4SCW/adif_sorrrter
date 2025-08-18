/* renderer.js */
const $ = (sel) => document.querySelector(sel);
const openBtn = $('#openBtn');
const saveBtn = $('#saveBtn');
const statusEl = $('#status');
const dropzone = $('#dropzone');
const meta = $('#meta');
const fpEl = $('#filePath');
const cntAll = $('#countAll');
const cntDE = $('#countDE');
const cntUS = $('#countUS');
const cntRest = $('#countRest');
const headerPreview = $('#headerPreview');
const themeBtn = $('#themeBtn');

let current = {
  filePath: null,
  raw: '',
  header: '',
  records: [], // array of raw record strings (each ends with <EOR>)
  tail: ''
};

// --- Theme (Dark/Light) ---
function setTheme(mode) {
  const root = document.documentElement;
  if (mode === 'light') {
    root.setAttribute('data-theme', 'light');
    themeBtn.textContent = '☀️ Light';
    themeBtn.setAttribute('aria-pressed', 'false');
  } else {
    root.setAttribute('data-theme', 'dark');
    themeBtn.textContent = '🌙 Dark';
    themeBtn.setAttribute('aria-pressed', 'true');
  }
  localStorage.setItem('adif-sorter-theme', mode);
}

(function initTheme() {
  const saved = localStorage.getItem('adif-sorter-theme');
  if (saved === 'light' || saved === 'dark') {
    setTheme(saved);
  } else {
    // Default dark, but respect OS if explicitly light
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    setTheme(prefersLight ? 'light' : 'dark');
  }
})();

themeBtn.addEventListener('click', () => {
  const now = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  setTheme(now);
});

// --- Utilities ---
function rstrip(str) {
  return str.replace(/\s+$/u, '');
}

function extractTagValue(record, tagName) {
  const re = new RegExp(`<\\s*${tagName}(?:\\s*:\\s*\\d+[^>]*)?\\s*>`, 'i');
  const m = re.exec(record);
  if (!m) return null;
  const start = m.index + m[0].length;
  const nextLT = record.indexOf('<', start);
  const raw = record.slice(start, nextLT === -1 ? record.length : nextLT);
  return rstrip(raw);
}

function normalizeCall(call) {
  if (!call) return '';
  const c = call.toUpperCase();
  const parts = c.split('/');
  const picked = parts.find(p => /\d/.test(p)) || parts[0];
  return picked.trim();
}

function firstDigitOfCall(call) {
  if (!call) return 99;
  const m = call.match(/\d/);
  return m ? Number(m[0]) : 99;
}

function dxccGroup(dxccVal) {
  if (!dxccVal) return null;
  const d = String(dxccVal).trim();
  if (d === '230') return 'de';
  if (d === '291') return 'us';
  return null;
}

function prefixGroup(call) {
  if (!call) return null;
  // Deutschland: D + A–R
  if (/^D[A-R]/.test(call)) return 'de';
  // USA: K, N, W, AA–AL
  if (/^(?:K|N|W|A[A-L])/.test(call)) return 'us';
  return null;
}

function sortKeyForRecord(rec, idx) {
  const rawCall = extractTagValue(rec, 'CALL');
  const call = normalizeCall(rawCall);
  const dxcc = extractTagValue(rec, 'DXCC');
  const grp = dxccGroup(dxcc) || prefixGroup(call) || 'rest';

  if (grp === 'de') {
    return [0, call, 0, idx];
  }
  if (grp === 'us') {
    return [1, firstDigitOfCall(call), call, idx];
  }
  return [2, call, 0, idx];
}

function parseAdif(text) {
  const eohRe = /<\s*EOH\s*>/i;
  const m = eohRe.exec(text);
  if (!m) throw new Error('No <EOH> found in ADIF.');
  const headerEnd = m.index + m[0].length;
  const header = text.slice(0, headerEnd);
  const blob = text.slice(headerEnd);

  const records = [];
  const eorRe = /<\s*EOR\s*>/ig;
  let pos = 0, match;
  while ((match = eorRe.exec(blob)) !== null) {
    const end = match.index + match[0].length;
    const rec = blob.slice(pos, end);
    records.push(rec);
    pos = end;
  }
  const tail = blob.slice(pos);
  return { header, records, tail };
}

function sortRecords(records) {
  const keyed = records.map((r, i) => ({ r, key: sortKeyForRecord(r, i) }));
  keyed.sort((a, b) => {
    const ka = a.key, kb = b.key;
    for (let i = 0; i < ka.length; i++) {
      const va = ka[i], vb = kb[i];
      if (va < vb) return -1;
      if (va > vb) return 1;
    }
    return 0;
  });
  return keyed.map(k => k.r);
}

function recount(records) {
  let de = 0, us = 0, rest = 0;
  records.forEach(r => {
    const call = normalizeCall(extractTagValue(r, 'CALL'));
    const grp = dxccGroup(extractTagValue(r, 'DXCC')) || prefixGroup(call) || 'rest';
    if (grp === 'de') de++; else if (grp === 'us') us++; else rest++;
  });
  return { de, us, rest, all: records.length };
}

function status(msg) { statusEl.textContent = msg || ''; }

function loadContent(content, filePath = null) {
  current.raw = content;
  current.filePath = filePath;
  const { header, records, tail } = parseAdif(content);
  current.header = header; current.records = records; current.tail = tail;
  const c = recount(records);
  cntAll.textContent = String(c.all);
  cntDE.textContent = String(c.de);
  cntUS.textContent = String(c.us);
  cntRest.textContent = String(c.rest);
  fpEl.textContent = filePath || '(unknown)';
  headerPreview.textContent = header.slice(0, 2000);
  meta.hidden = false;
  saveBtn.disabled = false;
  status('File loaded.');
}

function buildOutputSorted() {
  const sorted = sortRecords(current.records);
  return current.header + sorted.join('') + current.tail;
}

// --- UI Events ---
openBtn.addEventListener('click', async () => {
  try {
    const res = await window.adifAPI.openFile();
    if (res?.canceled) return;
    if (res?.error) { status('Error: ' + res.error); return; }
    loadContent(res.content, res.filePath);
  } catch (e) {
    status('Error while opening: ' + e.message);
  }
});

saveBtn.addEventListener('click', async () => {
  try {
    const output = buildOutputSorted();
    const base = current.filePath ? current.filePath.replace(/\.(adi|adif|txt)$/i, '') : 'sorted';
    const def = base + '_sorted.adi';
    const res = await window.adifAPI.saveFile({ defaultPath: def, content: output });
    if (res?.canceled) return;
    if (res?.error) { status('Error: ' + res.error); return; }
    status('Saved to: ' + res.filePath);
  } catch (e) {
    status('Error while saving: ' + e.message);
  }
});

// Drag & Drop (mit direktem Read über IPC)
['dragenter','dragover'].forEach(evt => dropzone.addEventListener(evt, e => {
  e.preventDefault(); e.stopPropagation(); dropzone.classList.add('dragover');
}));
['dragleave','drop'].forEach(evt => dropzone.addEventListener(evt, e => {
  e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('dragover');
}));

dropzone.addEventListener('drop', async (e) => {
  const file = e.dataTransfer?.files?.[0];
  if (!file) return;
  const path = file.path;
  try {
    const res = await window.adifAPI.readPath(path);
    if (res?.error) { status('Fehler: ' + res.error); return; }
    loadContent(res.content, res.filePath);
  } catch (err) {
    status('Error while Drag&Drop: ' + err.message);
  }
});

// Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'o') { e.preventDefault(); openBtn.click(); }
  if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); if (!saveBtn.disabled) saveBtn.click(); }
});
