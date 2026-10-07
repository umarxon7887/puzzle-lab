cat > src/generators/pack/ui.js << 'JSEOF'
import { t, getLang } from '../../core/i18n.js';
import { makePdf, downloadPdf } from '../../core/pdf.js';
import { drawMazeForPack } from '../maze/ui.js';
import { drawCodeForPack } from '../code/ui.js';
import { drawSudokuForPack } from '../sudoku/ui.js';
import { drawWordsForPack } from '../wordsearch/ui.js';
import { drawCrossForPack } from '../crossword/ui.js';

let state = {
  config: {
    maze: { enabled: true, count: 2, level: 0, shape: 'rect' },
    code: { enabled: true, count: 2, level: 1, codeLength: 3 },
    sudoku: { enabled: true, count: 2, level: 1, type: '9' },
    words: { enabled: true, count: 2, level: 1, cat: 'school' },
    cross: { enabled: true, count: 2, level: 1 }
  },
  items: [],
  showPreview: false,
  generating: false,
  progress: 0,
  total: 0
};

const FONT = '"Nunito","Trebuchet MS",Arial,sans-serif';
const SHAPES = { rect: '▭', circle: '●', star: '★', heart: '♥', triangle: '▲', diamond: '◆', house: '', hexagon: '⬡' };
const SUDOKU_TYPES = { '4': '4×4', '5': '5×5', '6': '6×6', '7': '7×7', '8': '8×8', '9': '9×9', '9x': '9×9 X' };
const WORD_CATS = { school: '🏫', autumn: '', animals: '🐾', food: '🍽️', sport: '⚽', space: '🚀', mixed: '' };

export function init(container) {
  render(container);
}

export async function exportPack(withAnswer) {
  state.generating = true;
  state.total = state.items.length;
  state.progress = 0;
  const container = document.querySelector('.card')?.parentElement || document.getElementById('app-container');
  renderProgress(container);
  
  const pages = [];
  const canvas = document.createElement('canvas');
  const k = 300 / 25.4;
  
  for (let i = 0; i < state.items.length; i++) {
    state.progress = i + 1;
    renderProgress(container);
    await new Promise(r => setTimeout(r, 50));
    
    const item = state.items[i];
    try {
      if (item.type === 'maze') drawMazeForPack(canvas, k, item.seed, item.config, withAnswer);
      else if (item.type === 'code') drawCodeForPack(canvas, k, item.seed, item.config, withAnswer);
      else if (item.type === 'sudoku') drawSudokuForPack(canvas, k, item.seed, item.config, withAnswer);
      else if (item.type === 'words') drawWordsForPack(canvas, k, item.seed, item.config, withAnswer);
      else if (item.type === 'cross') drawCrossForPack(canvas, k, item.seed, item.config, withAnswer);
      
      const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
      const jpeg = new Uint8Array(await blob.arrayBuffer());
      pages.push({ buf: jpeg, w: canvas.width, h: canvas.height });
    } catch (err) {
      console.error('Error:', err);
    }
  }
  
  if (pages.length === 0) {
    alert('Xatolik yuz berdi');
    state.generating = false;
    render(container);
    return;
  }
  
  const pdf = buildMultiPagePdf(pages);
  const lang = getLang();
  const fileName = lang === 'uz' 
    ? (withAnswer ? `Toplam (Javoblar).pdf` : `Toplam.pdf`)
    : (lang === 'ru' ? (withAnswer ? `Набор (Ответы).pdf` : `Набор.pdf`)
    : (withAnswer ? `Pack (Answers).pdf` : `Pack.pdf`));
  
  downloadPdf(pdf, fileName);
  state.generating = false;
  render(container);
}

function buildMultiPagePdf(pages) {
  const enc = new TextEncoder();
  const parts = [];
  const offsets = {};
  let len = 0;
  const push = d => { const b = typeof d === 'string' ? enc.encode(d) : d; parts.push(b); len += b.length; };
  const PW = 595.28, PH = 841.89;
  const N = pages.length;
  push('%PDF-1.4\n');
  offsets[1] = len; push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  const kids = Array.from({length:N}, (_, i) => `${3+3*i} 0 R`).join(' ');
  offsets[2] = len; push(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${N} >>\nendobj\n`);
  pages.forEach((p, i) => {
    const pageNum = 3+3*i, imgNum = 4+3*i, contentNum = 5+3*i;
    const content = `q ${PW} 0 0 ${PH} 0 0 cm /Im0 Do Q`;
    offsets[pageNum] = len; push(`${pageNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 ${imgNum} 0 R >> >> /Contents ${contentNum} 0 R >>\nendobj\n`);
    offsets[imgNum] = len; push(`${imgNum} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.buf.length} >>\nstream\n`);
    push(p.buf); push('\nendstream\nendobj\n');
    offsets[contentNum] = len; push(`${contentNum} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);
  });
  const xrefStart = len;
  const maxObj = 2 + 3*N;
  let xref = `xref\n0 ${maxObj+1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= maxObj; i++) xref += String(offsets[i] || 0).padStart(10, '0') + ' 00000 n \n';
  push(xref + `trailer\n<< /Size ${maxObj+1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);
  return new Blob(parts, { type: 'application/pdf' });
}

function render(container) {
  if (state.generating) {
    renderProgress(container);
    return;
  }
  if (state.showPreview && state.items.length > 0) {
    renderPreview(container);
    return;
  }
  renderConfig(container);
}

function renderConfig(container) {
  const c = state.config;
  const lang = getLang();
  const levelNames = t('levelNames');
  
  container.innerHTML = `
    <div class="card">
      <div class="game-header">
        <h2>📦 ${t('packTitle')}</h2>
        <p>${t('packSubtitle')}</p>
      </div>
      <div class="pack-types">
        ${renderMazeConfig(c.maze, levelNames)}
        ${renderCodeConfig(c.code, levelNames)}
        ${renderSudokuConfig(c.sudoku, levelNames)}
        ${renderWordsConfig(c.words, levelNames)}
        ${renderCrossConfig(c.cross, levelNames)}
      </div>
      <button class="primary-action" id="buildBtn" style="margin-top:16px;">${t('packBuildBtn')}</button>
    </div>
  `;
  attachConfigEvents(container);
}

function renderMazeConfig(config, levelNames) {
  return `
    <div class="pack-type-card" id="pack_maze">
      <div class="pack-type-header">
        <label style="display:flex; align-items:center; gap:8px; flex:1;">
          <input type="checkbox" id="cfg_maze_enabled" ${config.enabled ? 'checked' : ''} style="width:18px; height:18px;">
          <span style="font-size:24px;">🌀</span>
          <span style="font-weight:700;">${t('tabMaze')}</span>
        </label>
      </div>
      <div class="pack-type-body" ${!config.enabled ? 'style="opacity:0.5; pointer-events:none;"' : ''}>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <label>
            <span style="font-size:11px; font-weight:700;">${t('packCount')}</span>
            <input type="number" id="cfg_maze_count" min="0" max="20" value="${config.count}" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;">
          </label>
          <label>
            <span style="font-size:11px; font-weight:700;">${t('packLevel')}</span>
            <select id="cfg_maze_level" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;">
              ${levelNames.map((n, i) => `<option value="${i}" ${config.level === i ? 'selected' : ''}>${n}</option>`).join('')}
            </select>
          </label>
        </div>
        <label style="margin-top:8px;">
          <span style="font-size:11px; font-weight:700;">Shakl</span>
          <select id="cfg_maze_shape" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;">
            ${Object.keys(SHAPES).map(k => `<option value="${k}" ${config.shape === k ? 'selected' : ''}>${SHAPES[k]} ${k}</option>`).join('')}
          </select>
        </label>
      </div>
    </div>
  `;
}

function renderCodeConfig(config, levelNames) {
  return `
    <div class="pack-type-card" id="pack_code">
      <div class="pack-type-header">
        <label style="display:flex; align-items:center; gap:8px; flex:1;">
          <input type="checkbox" id="cfg_code_enabled" ${config.enabled ? 'checked' : ''} style="width:18px; height:18px;">
          <span style="font-size:24px;">🔐</span>
          <span style="font-weight:700;">${t('tabCode')}</span>
        </label>
      </div>
      <div class="pack-type-body" ${!config.enabled ? 'style="opacity:0.5; pointer-events:none;"' : ''}>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <label>
            <span style="font-size:11px; font-weight:700;">${t('packCount')}</span>
            <input type="number" id="cfg_code_count" min="0" max="20" value="${config.count}" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;">
          </label>
          <label>
            <span style="font-size:11px; font-weight:700;">${t('packLevel')}</span>
            <select id="cfg_code_level" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;">
              ${levelNames.map((n, i) => `<option value="${i}" ${config.level === i ? 'selected' : ''}>${n}</option>`).join('')}
            </select>
          </label>
        </div>
        <label style="margin-top:8px;">
          <span style="font-size:11px; font-weight:700;">${t('packCodeLength')}</span>
          <select id="cfg_code_codeLength" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;">
            <option value="3" ${config.codeLength === 3 ? 'selected' : ''}>3</option>
            <option value="4" ${config.codeLength === 4 ? 'selected' : ''}>4</option>
            <option value="5" ${config.codeLength === 5 ? 'selected' : ''}>5</option>
          </select>
        </label>
      </div>
    </div>
  `;
}

function renderSudokuConfig(config, levelNames) {
  return `
    <div class="pack-type-card" id="pack_sudoku">
      <div class="pack-type-header">
        <label style="display:flex; align-items:center; gap:8px; flex:1;">
          <input type="checkbox" id="cfg_sudoku_enabled" ${config.enabled ? 'checked' : ''} style="width:18px; height:18px;">
          <span style="font-size:24px;">🔢</span>
          <span style="font-weight:700;">${t('tabSudoku')}</span>
        </label>
      </div>
      <div class="pack-type-body" ${!config.enabled ? 'style="opacity:0.5; pointer-events:none;"' : ''}>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <label>
            <span style="font-size:11px; font-weight:700;">${t('packCount')}</span>
            <input type="number" id="cfg_sudoku_count" min="0" max="20" value="${config.count}" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;">
          </label>
          <label>
            <span style="font-size:11px; font-weight:700;">${t('packLevel')}</span>
            <select id="cfg_sudoku_level" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;">
              ${levelNames.map((n, i) => `<option value="${i}" ${config.level === i ? 'selected' : ''}>${n}</option>`).join('')}
            </select>
          </label>
        </div>
        <label style="margin-top:8px;">
          <span style="font-size:11px; font-weight:700;">${t('packSudokuType')}</span>
          <select id="cfg_sudoku_type" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;">
            ${Object.keys(SUDOKU_TYPES).map(k => `<option value="${k}" ${config.type === k ? 'selected' : ''}>${SUDOKU_TYPES[k]}</option>`).join('')}
          </select>
        </label>
      </div>
    </div>
  `;
}

function renderWordsConfig(config, levelNames) {
  const lang = getLang();
  const catNames = t('catNames');
  return `
    <div class="pack-type-card" id="pack_words">
      <div class="pack-type-header">
        <label style="display:flex; align-items:center; gap:8px; flex:1;">
          <input type="checkbox" id="cfg_words_enabled" ${config.enabled ? 'checked' : ''} style="width:18px; height:18px;">
          <span style="font-size:24px;">🔍</span>
          <span style="font-weight:700;">${t('tabWords')}</span>
        </label>
      </div>
      <div class="pack-type-body" ${!config.enabled ? 'style="opacity:0.5; pointer-events:none;"' : ''}>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <label>
            <span style="font-size:11px; font-weight:700;">${t('packCount')}</span>
            <input type="number" id="cfg_words_count" min="0" max="20" value="${config.count}" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;">
          </label>
          <label>
            <span style="font-size:11px; font-weight:700;">${t('packLevel')}</span>
            <select id="cfg_words_level" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;">
              ${t('wordsLevelNames').map((n, i) => `<option value="${i}" ${config.level === i ? 'selected' : ''}>${n}</option>`).join('')}
            </select>
          </label>
        </div>
        <label style="margin-top:8px;">
          <span style="font-size:11px; font-weight:700;">${t('packWordsCat')}</span>
          <select id="cfg_words_cat" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;">
            <option value="mixed" ${config.cat === 'mixed' ? 'selected' : ''}>🎲 ${lang === 'uz' ? 'Aralash' : (lang === 'ru' ? 'Смешано' : 'Mixed')}</option>
            ${Object.keys(catNames).map(k => `<option value="${k}" ${config.cat === k ? 'selected' : ''}>${WORD_CATS[k] || ''} ${catNames[k]}</option>`).join('')}
          </select>
        </label>
      </div>
    </div>
  `;
}

function renderCrossConfig(config, levelNames) {
  return `
    <div class="pack-type-card" id="pack_cross">
      <div class="pack-type-header">
        <label style="display:flex; align-items:center; gap:8px; flex:1;">
          <input type="checkbox" id="cfg_cross_enabled" ${config.enabled ? 'checked' : ''} style="width:18px; height:18px;">
          <span style="font-size:24px;">➗</span>
          <span style="font-weight:700;">${t('tabCross')}</span>
        </label>
      </div>
      <div class="pack-type-body" ${!config.enabled ? 'style="opacity:0.5; pointer-events:none;"' : ''}>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <label>
            <span style="font-size:11px; font-weight:700;">${t('packCount')}</span>
            <input type="number" id="cfg_cross_count" min="0" max="20" value="${config.count}" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;">
          </label>
          <label>
            <span style="font-size:11px; font-weight:700;">${t('packLevel')}</span>
            <select id="cfg_cross_level" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;">
              ${t('crossLevelNames').map((n, i) => `<option value="${i}" ${config.level === i ? 'selected' : ''}>${n}</option>`).join('')}
            </select>
          </label>
        </div>
      </div>
    </div>
  `;
}

function attachConfigEvents(container) {
  ['maze', 'code', 'sudoku', 'words', 'cross'].forEach(type => {
    const enabledCb = container.querySelector(`#cfg_${type}_enabled`);
    const body = container.querySelector(`#pack_${type} .pack-type-body`);
    enabledCb.addEventListener('change', (e) => {
      state.config[type].enabled = e.target.checked;
      body.style.opacity = e.target.checked ? '1' : '0.5';
      body.style.pointerEvents = e.target.checked ? 'auto' : 'none';
    });
    const countInput = container.querySelector(`#cfg_${type}_count`);
    countInput.addEventListener('change', (e) => {
      state.config[type].count = Math.max(0, Math.min(20, parseInt(e.target.value) || 0));
    });
    const levelSelect = container.querySelector(`#cfg_${type}_level`);
    levelSelect.addEventListener('change', (e) => {
      state.config[type].level = parseInt(e.target.value);
    });
    const shape = container.querySelector(`#cfg_${type}_shape`);
    if (shape) shape.addEventListener('change', (e) => { state.config[type].shape = e.target.value; });
    const codeLength = container.querySelector(`#cfg_${type}_codeLength`);
    if (codeLength) codeLength.addEventListener('change', (e) => { state.config[type].codeLength = parseInt(e.target.value); });
    const type = container.querySelector(`#cfg_${type}_type`);
    if (type) type.addEventListener('change', (e) => { state.config[type].type = e.target.value; });
    const cat = container.querySelector(`#cfg_${type}_cat`);
    if (cat) cat.addEventListener('change', (e) => { state.config[type].cat = e.target.value; });
  });
  container.querySelector('#buildBtn').addEventListener('click', () => buildPack(container));
}

function buildPack(container) {
  const c = state.config;
  const items = [];
  for (const type of ['maze', 'code', 'sudoku', 'words', 'cross']) {
    if (!c[type].enabled || c[type].count <= 0) continue;
    for (let i = 0; i < c[type].count; i++) {
      const seed = Math.floor(Math.random() * 1e9) + 1;
      items.push({ type, seed, config: {...c[type]}, index: i + 1 });
    }
  }
  if (items.length === 0) {
    alert(t('packEmpty'));
    return;
  }
  state.items = items;
  state.showPreview = true;
  render(container);
}

function renderPreview(container) {
  container.innerHTML = `
    <div class="card">
      <div class="game-header">
        <h2>📦 ${t('packTitle')}</h2>
        <p>${t('packTotal')(state.items.length)}</p>
      </div>
      <div class="pack-preview-list" id="previewList">
        ${state.items.map((item, idx) => `
          <div class="pack-item" data-idx="${idx}">
            <div class="pack-item-info">
              <span class="pack-item-icon">${getTypeIcon(item.type)}</span>
              <div>
                <div style="font-weight:700; font-size:14px;">${getTypeName(item.type)} #${item.index}</div>
                <div style="font-size:12px; color:var(--text-muted);">${getItemDetails(item)}</div>
              </div>
            </div>
            <div class="pack-item-actions">
              <button class="icon-btn-small" data-action="refresh" data-idx="${idx}" title="${t('packNew')}">🔄</button>
              <button class="icon-btn-small" data-action="remove" data-idx="${idx}" title="${t('packRemove')}">✕</button>
            </div>
          </div>
        `).join('')}
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:16px;">
        <button class="primary-action" id="downloadTaskBtn">📥 ${t('packTask')}</button>
        <button class="primary-action" id="downloadAnswerBtn" style="background:#10B981;">📥 ${t('packAnswer')}</button>
      </div>
      <button id="backToConfigBtn" style="margin-top:10px; width:100%; padding:10px; background:#F3F4F6; border:1px solid var(--border); border-radius:8px; cursor:pointer;">← ${t('backBtn')}</button>
    </div>
  `;
  attachPreviewEvents(container);
}

function attachPreviewEvents(container) {
  container.querySelectorAll('[data-action="refresh"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.idx);
      state.items[idx].seed = Math.floor(Math.random() * 1e9) + 1;
      render(container);
    });
  });
  container.querySelectorAll('[data-action="remove"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.idx);
      state.items.splice(idx, 1);
      if (state.items.length === 0) state.showPreview = false;
      render(container);
    });
  });
  container.querySelector('#downloadTaskBtn').addEventListener('click', () => exportPack(false));
  container.querySelector('#downloadAnswerBtn').addEventListener('click', () => exportPack(true));
  container.querySelector('#backToConfigBtn').addEventListener('click', () => { state.showPreview = false; render(container); });
}

function getTypeIcon(type) {
  return { maze: '🌀', code: '🔐', sudoku: '🔢', words: '🔍', cross: '' }[type];
}

function getTypeName(type) {
  return { maze: t('tabMaze'), code: t('tabCode'), sudoku: t('tabSudoku'), words: t('tabWords'), cross: t('tabCross') }[type];
}

function getItemDetails(item) {
  const c = item.config;
  if (item.type === 'maze') return `${t('levelNames')[c.level]} | ${SHAPES[c.shape] || c.shape}`;
  if (item.type === 'code') return `${c.codeLength} ${t('digits')} | ${t('levelNames')[c.level]}`;
  if (item.type === 'sudoku') return `${SUDOKU_TYPES[c.type] || c.type} | ${t('levelNames')[c.level]}`;
  if (item.type === 'words') return `${t('catNames')[c.cat] || c.cat} | ${t('wordsLevelNames')[c.level]}`;
  if (item.type === 'cross') return t('crossLevelNames')[c.level];
  return '';
}

function renderProgress(container) {
  const pct = state.total > 0 ? Math.round(state.progress / state.total * 100) : 0;
  container.innerHTML = `
    <div class="card" style="text-align:center; padding:40px 20px;">
      <div style="font-size:48px; margin-bottom:16px;">⏳</div>
      <h3 style="margin-bottom:8px;">${t('packGenerating')(state.progress, state.total)}</h3>
      <div style="background:#E5E7EB; border-radius:8px; height:8px; overflow:hidden; margin-top:16px;">
        <div style="background:#4F46E5; height:100%; width:${pct}%; transition:width 0.3s;"></div>
      </div>
    </div>
  `;
}
JSEOF
