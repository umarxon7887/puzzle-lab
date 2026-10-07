import { t, getLang } from '../../core/i18n.js';
import { downloadPdf } from '../../core/pdf.js';
import { drawMazeForPack } from '../maze/ui.js';
import { drawCodeForPack } from '../code/ui.js';
import { drawSudokuForPack } from '../sudoku/ui.js';
import { drawWordsForPack } from '../wordsearch/ui.js';
import { drawCrossForPack } from '../crossword/ui.js';

let state = {
  config: {
    maze: { enabled: true, count: 1, level: 0, shape: 'rect' },
    code: { enabled: true, count: 1, level: 1, codeLength: 3 },
    sudoku: { enabled: true, count: 1, level: 1, type: '9' },
    words: { enabled: true, count: 1, level: 1, category: 'school' },
    cross: { enabled: true, count: 1, level: 1 }
  },
  items: [],
  showPreview: false,
  generating: false,
  activeSettings: null
};

const SHAPES = { rect: '▭', circle: '○', star: '★', heart: '♥', triangle: '△' };
const SUDOKU_TYPES = { '4': '4×4', '6': '6×6', '9': '9×9' };
const WORD_CATS = { school: '', animals: '🦁', food: '🍎', sport: '⚽', space: '' };

export function init(container) { render(container); }

export async function exportPDF(withAnswer) {
  state.generating = true;
  render(document.querySelector('.card').parentElement);
  
  const pages = [];
  const canvas = document.createElement('canvas');
  const k = 300 / 25.4;
  
  for (let i = 0; i < state.items.length; i++) {
    const item = state.items[i];
    try {
      if (item.type === 'maze') drawMazeForPack(canvas, k, item.seed, item.config, withAnswer);
      else if (item.type === 'code') drawCodeForPack(canvas, k, item.seed, item.config, withAnswer);
      else if (item.type === 'sudoku') drawSudokuForPack(canvas, k, item.seed, item.config, withAnswer);
      else if (item.type === 'words') drawWordsForPack(canvas, k, item.seed, item.config, withAnswer);
      else if (item.type === 'cross') drawCrossForPack(canvas, k, item.seed, item.config, withAnswer);
      
      const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
      if (blob) {
        const jpeg = new Uint8Array(await blob.arrayBuffer());
        pages.push({ buf: jpeg, w: canvas.width, h: canvas.height });
      }
    } catch (err) { console.error(err); }
  }
  
  if (pages.length > 0) {
    const pdf = buildPdf(pages);
    const lang = getLang();
    const name = lang === 'uz' ? (withAnswer ? 'Toplam (Javoblar).pdf' : 'Toplam.pdf') : 'Pack.pdf';
    downloadPdf(pdf, name);
  }
  
  state.generating = false;
  render(document.querySelector('.card').parentElement);
}

function buildPdf(pages) {
  const enc = new TextEncoder();
  const parts = [];
  const offsets = {};
  let len = 0;
  const push = d => { const b = typeof d === 'string' ? enc.encode(d) : d; parts.push(b); len += b.length; };
  const PW = 595.28, PH = 841.89, N = pages.length;
  
  push('%PDF-1.4\n');
  offsets[1] = len; push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  const kids = Array.from({length:N}, (_, i) => (3+3*i) + ' 0 R').join(' ');
  offsets[2] = len; push('2 0 obj\n<< /Type /Pages /Kids [' + kids + '] /Count ' + N + ' >>\nendobj\n');
  
  for (let i = 0; i < N; i++) {
    const p = pages[i], pn = 3+3*i, in_ = 4+3*i, cn = 5+3*i;
    const content = 'q ' + PW + ' 0 0 ' + PH + ' 0 0 cm /Im0 Do Q';
    offsets[pn] = len; push(pn + ' 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /XObject << /Im0 ' + in_ + ' 0 R >> >> /Contents ' + cn + ' 0 R >>\nendobj\n');
    offsets[in_] = len; push(in_ + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + p.w + ' /Height ' + p.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.buf.length + ' >>\nstream\n');
    push(p.buf); push('\nendstream\nendobj\n');
    offsets[cn] = len; push(cn + ' 0 obj\n<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream\nendobj\n');
  }
  
  const xs = len, mx = 2 + 3*N;
  let xr = 'xref\n0 ' + (mx+1) + '\n0000000000 65535 f \n';
  for (let i = 1; i <= mx; i++) xr += String(offsets[i]||0).padStart(10,'0') + ' 00000 n \n';
  push(xr + 'trailer\n<< /Size ' + (mx+1) + ' /Root 1 0 R >>\nstartxref\n' + xs + '\n%%EOF');
  return new Blob(parts, { type: 'application/pdf' });
}

function render(container) {
  if (state.generating) { container.innerHTML = '<div class="card" style="text-align:center;padding:40px;"><h3>Yaratilmoqda...</h3></div>'; return; }
  if (state.showPreview) { renderPreview(container); return; }
  if (state.activeSettings) { renderSettingsModal(container); return; }
  renderConfig(container);
}

function renderConfig(container) {
  const levelNames = t('levelNames');
  let html = '<div class="card"><div class="game-header"><h2>To\'plam yaratish</h2><p>Kerakli turlarni tanlang</p></div><div style="display:flex;flex-direction:column;gap:10px;">';
  
  const types = [
    { id: 'maze', name: 'Labirint', icon: '🌀' },
    { id: 'code', name: 'Kodni top', icon: '🔐' },
    { id: 'sudoku', name: 'Sudoku', icon: '🔢' },
    { id: 'words', name: 'So\'z qidiruv', icon: '' },
    { id: 'cross', name: 'Krossvord', icon: '' }
  ];
  
  types.forEach(type => {
    const c = state.config[type.id];
    html += '<div style="display:flex;align-items:center;gap:10px;padding:12px;background:#f9f9f9;border-radius:8px;">';
    html += '<input type="checkbox" id="cfg_' + type.id + '" ' + (c.enabled ? 'checked' : '') + ' style="width:20px;height:20px;">';
    html += '<span style="font-size:20px;">' + type.icon + '</span>';
    html += '<label for="cfg_' + type.id + '" style="flex:1;font-weight:600;">' + type.name + '</label>';
    html += '<button class="settings-btn" data-type="' + type.id + '" style="padding:5px 10px;background:#667eea;color:white;border:none;border-radius:5px;cursor:pointer;font-size:16px;" title="Sozlamalar">⚙️</button>';
    html += '<input type="number" id="cnt_' + type.id + '" min="0" max="10" value="' + c.count + '" style="width:60px;padding:5px;border-radius:4px;border:1px solid #ccc;">';
    html += '</div>';
  });
  
  html += '</div><button class="primary-action" id="buildBtn" style="margin-top:20px;width:100%;">To\'plamni yaratish</button></div>';
  container.innerHTML = html;
  
  types.forEach(type => {
    document.getElementById('cfg_' + type.id).addEventListener('change', e => { state.config[type.id].enabled = e.target.checked; });
    document.getElementById('cnt_' + type.id).addEventListener('change', e => { state.config[type.id].count = parseInt(e.target.value) || 0; });
    document.querySelector('.settings-btn[data-type="' + type.id + '"]').addEventListener('click', () => {
      state.activeSettings = type.id;
      render(container);
    });
  });
  document.getElementById('buildBtn').addEventListener('click', buildPack);
}

function renderSettingsModal(container) {
  const type = state.activeSettings;
  const c = state.config[type];
  const levelNames = t('levelNames');
  
  let html = '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;">';
  html += '<div style="background:white;border-radius:12px;padding:25px;max-width:400px;width:90%;max-height:80vh;overflow-y:auto;">';
  html += '<h3 style="margin-bottom:20px;">';
  
  if (type === 'maze') html += '🌀 Labirint sozlamalari';
  else if (type === 'code') html += '🔐 Kodni top sozlamalari';
  else if (type === 'sudoku') html += '🔢 Sudoku sozlamalari';
  else if (type === 'words') html += '🔍 So\'z qidiruv sozlamalari';
  else if (type === 'cross') html += '➗ Krossvord sozlamalari';
  
  html += '</h3>';
  
  // Daraja
  html += '<div style="margin-bottom:15px;">';
  html += '<label style="display:block;margin-bottom:5px;font-weight:600;">Daraja:</label>';
  html += '<select id="setting_level" style="width:100%;padding:8px;border-radius:6px;border:1px solid #ccc;">';
  levelNames.forEach((name, i) => {
    html += '<option value="' + i + '"' + (c.level === i ? ' selected' : '') + '>' + name + '</option>';
  });
  html += '</select></div>';
  
  // Qo'shimcha sozlamalar
  if (type === 'maze') {
    html += '<div style="margin-bottom:15px;">';
    html += '<label style="display:block;margin-bottom:5px;font-weight:600;">Shakl:</label>';
    html += '<select id="setting_shape" style="width:100%;padding:8px;border-radius:6px;border:1px solid #ccc;">';
    Object.keys(SHAPES).forEach(key => {
      html += '<option value="' + key + '"' + (c.shape === key ? ' selected' : '') + '>' + SHAPES[key] + ' ' + key + '</option>';
    });
    html += '</select></div>';
  } else if (type === 'code') {
    html += '<div style="margin-bottom:15px;">';
    html += '<label style="display:block;margin-bottom:5px;font-weight:600;">Kod uzunligi:</label>';
    html += '<select id="setting_codeLength" style="width:100%;padding:8px;border-radius:6px;border:1px solid #ccc;">';
    [3, 4, 5].forEach(len => {
      html += '<option value="' + len + '"' + (c.codeLength === len ? ' selected' : '') + '>' + len + ' xonali</option>';
    });
    html += '</select></div>';
  } else if (type === 'sudoku') {
    html += '<div style="margin-bottom:15px;">';
    html += '<label style="display:block;margin-bottom:5px;font-weight:600;">Sudoku turi:</label>';
    html += '<select id="setting_type" style="width:100%;padding:8px;border-radius:6px;border:1px solid #ccc;">';
    Object.keys(SUDOKU_TYPES).forEach(key => {
      html += '<option value="' + key + '"' + (c.type === key ? ' selected' : '') + '>' + SUDOKU_TYPES[key] + '</option>';
    });
    html += '</select></div>';
  } else if (type === 'words') {
    html += '<div style="margin-bottom:15px;">';
    html += '<label style="display:block;margin-bottom:5px;font-weight:600;">Mavzu:</label>';
    html += '<select id="setting_category" style="width:100%;padding:8px;border-radius:6px;border:1px solid #ccc;">';
    Object.keys(WORD_CATS).forEach(key => {
      html += '<option value="' + key + '"' + (c.category === key ? ' selected' : '') + '>' + WORD_CATS[key] + ' ' + key + '</option>';
    });
    html += '</select></div>';
  }
  
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:20px;">';
  html += '<button id="saveSettings" style="padding:10px;background:#667eea;color:white;border:none;border-radius:6px;cursor:pointer;">Saqlash</button>';
  html += '<button id="cancelSettings" style="padding:10px;background:#e0e0e0;border:none;border-radius:6px;cursor:pointer;">Bekor qilish</button>';
  html += '</div></div></div>';
  
  container.innerHTML = html;
  
  document.getElementById('saveSettings').addEventListener('click', () => {
    state.config[type].level = parseInt(document.getElementById('setting_level').value);
    if (type === 'maze') state.config[type].shape = document.getElementById('setting_shape').value;
    else if (type === 'code') state.config[type].codeLength = parseInt(document.getElementById('setting_codeLength').value);
    else if (type === 'sudoku') state.config[type].type = document.getElementById('setting_type').value;
    else if (type === 'words') state.config[type].category = document.getElementById('setting_category').value;
    state.activeSettings = null;
    render(container);
  });
  
  document.getElementById('cancelSettings').addEventListener('click', () => {
    state.activeSettings = null;
    render(container);
  });
}

function buildPack() {
  state.items = [];
  const types = ['maze', 'code', 'sudoku', 'words', 'cross'];
  types.forEach(type => {
    const c = state.config[type];
    if (c.enabled && c.count > 0) {
      for (let i = 0; i < c.count; i++) {
        state.items.push({ type, seed: Math.floor(Math.random()*1e9)+1, config: {...c} });
      }
    }
  });
  if (state.items.length === 0) { alert('Kamida bitta tur tanlang!'); return; }
  state.showPreview = true;
  render(document.querySelector('.card').parentElement);
}

function renderPreview(container) {
  let html = '<div class="card"><div class="game-header"><h2>To\'plam tayyor</h2><p>Jami: ' + state.items.length + ' ta topshiriq</p></div>';
  html += '<div style="max-height:300px;overflow-y:auto;margin:15px 0;">';
  state.items.forEach((item, i) => {
    html += '<div style="padding:8px;border-bottom:1px solid #eee;font-size:14px;">' + (i+1) + '. ' + item.type + ' (Seed: ' + item.seed + ')</div>';
  });
  html += '</div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">';
  html += '<button class="primary-action" id="dlTask">Topshiriq PDF</button>';
  html += '<button class="primary-action" id="dlAns" style="background:#10B981;">Javoblar PDF</button>';
  html += '</div>';
  html += '<button id="backBtn" style="margin-top:10px;width:100%;padding:10px;background:#eee;border:none;border-radius:8px;">Orqaga</button></div>';
  container.innerHTML = html;
  
  document.getElementById('dlTask').addEventListener('click', () => exportPDF(false));
  document.getElementById('dlAns').addEventListener('click', () => exportPDF(true));
  document.getElementById('backBtn').addEventListener('click', () => { state.showPreview = false; render(container); });
}
