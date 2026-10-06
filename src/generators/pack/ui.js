import { t, getLang } from '../../core/i18n.js';
import { makePdf, downloadPdf } from '../../core/pdf.js';
import { renderActionBar } from '../../components/ActionBar.js';
import * as Maze from '../maze/ui.js';
import * as Code from '../code/ui.js';
import * as Sudoku from '../sudoku/ui.js';
import * as Words from '../wordsearch/ui.js';
import * as Cross from '../crossword/ui.js';

let state = {
  config: {
    maze: { enabled: true, count: 2, level: 0 },
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

export function init(container) {
  render(container);
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
  const lang = getLang();
  const c = state.config;
  
  container.innerHTML = `
    <div class="card">
      <div class="game-header">
        <h2>📦 ${t('packTitle')}</h2>
        <p>${t('packSubtitle')}</p>
      </div>
      
      <div class="pack-types">
        ${renderTypeConfig('maze', '🌀', t('tabMaze'), c.maze)}
        ${renderTypeConfig('code', '🔐', t('tabCode'), c.code)}
        ${renderTypeConfig('sudoku', '🔢', t('tabSudoku'), c.sudoku)}
        ${renderTypeConfig('words', '🔍', t('tabWords'), c.words)}
        ${renderTypeConfig('cross', '➗', t('tabCross'), c.cross)}
      </div>
      
      <button class="primary-action" id="buildBtn" style="margin-top:16px;">
        ${t('packBuildBtn')}
      </button>
    </div>
  `;
  
  attachConfigEvents(container);
}

function renderTypeConfig(type, icon, name, config) {
  const lang = getLang();
  let extraFields = '';
  
  if (type === 'code') {
    extraFields = `
      <label style="margin-top:8px;">
        <span style="font-size:11px; font-weight:700;">${t('packCodeLength')}</span>
        <select id="cfg_${type}_codeLength" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;">
          <option value="3" ${config.codeLength === 3 ? 'selected' : ''}>3</option>
          <option value="4" ${config.codeLength === 4 ? 'selected' : ''}>4</option>
          <option value="5" ${config.codeLength === 5 ? 'selected' : ''}>5</option>
        </select>
      </label>
    `;
  } else if (type === 'sudoku') {
    extraFields = `
      <label style="margin-top:8px;">
        <span style="font-size:11px; font-weight:700;">${t('packSudokuType')}</span>
        <select id="cfg_${type}_type" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;">
          <option value="9" ${config.type === '9' ? 'selected' : ''}>9×9</option>
          <option value="6" ${config.type === '6' ? 'selected' : ''}>6×6</option>
          <option value="4" ${config.type === '4' ? 'selected' : ''}>4×4</option>
        </select>
      </label>
    `;
  } else if (type === 'words') {
    extraFields = `
      <label style="margin-top:8px;">
        <span style="font-size:11px; font-weight:700;">${t('packWordsCat')}</span>
        <select id="cfg_${type}_cat" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;">
          <option value="school" ${config.cat === 'school' ? 'selected' : ''}>${t('catNames').school}</option>
          <option value="animals" ${config.cat === 'animals' ? 'selected' : ''}>${t('catNames').animals}</option>
          <option value="food" ${config.cat === 'food' ? 'selected' : ''}>${t('catNames').food}</option>
        </select>
      </label>
    `;
  }
  
  return `
    <div class="pack-type-card" id="pack_${type}">
      <div class="pack-type-header">
        <label style="display:flex; align-items:center; gap:8px; flex:1;">
          <input type="checkbox" id="cfg_${type}_enabled" ${config.enabled ? 'checked' : ''} style="width:18px; height:18px;">
          <span style="font-size:20px;">${icon}</span>
          <span style="font-weight:700;">${name}</span>
        </label>
      </div>
      <div class="pack-type-body" ${!config.enabled ? 'style="opacity:0.5; pointer-events:none;"' : ''}>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <label>
            <span style="font-size:11px; font-weight:700;">${t('packCount')}</span>
            <input type="number" id="cfg_${type}_count" min="0" max="20" value="${config.count}" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;">
          </label>
          <label>
            <span style="font-size:11px; font-weight:700;">${t('packLevel')}</span>
            <select id="cfg_${type}_level" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;">
              ${t('levelNames').map((n, i) => `<option value="${i}" ${config.level === i ? 'selected' : ''}>${n}</option>`).join('')}
            </select>
          </label>
        </div>
        ${extraFields}
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
    
    if (type === 'code') {
      const cl = container.querySelector(`#cfg_${type}_codeLength`);
      cl.addEventListener('change', (e) => {
        state.config[type].codeLength = parseInt(e.target.value);
      });
    } else if (type === 'sudoku') {
      const st = container.querySelector(`#cfg_${type}_type`);
      st.addEventListener('change', (e) => {
        state.config[type].type = e.target.value;
      });
    } else if (type === 'words') {
      const cat = container.querySelector(`#cfg_${type}_cat`);
      cat.addEventListener('change', (e) => {
        state.config[type].cat = e.target.value;
      });
    }
  });
  
  container.querySelector('#buildBtn').addEventListener('click', () => buildPack(container));
}

async function buildPack(container) {
  const c = state.config;
  const items = [];
  
  // Har bir tur uchun topshiriqlar yaratish
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
  const lang = getLang();
  
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
      if (state.items.length === 0) {
        state.showPreview = false;
      }
      render(container);
    });
  });
  
  container.querySelector('#downloadTaskBtn').addEventListener('click', () => exportPack(false));
  container.querySelector('#downloadAnswerBtn').addEventListener('click', () => exportPack(true));
  container.querySelector('#backToConfigBtn').addEventListener('click', () => {
    state.showPreview = false;
    render(container);
  });
}

function getTypeIcon(type) {
  return { maze: '🌀', code: '🔐', sudoku: '', words: '🔍', cross: '➗' }[type];
}

function getTypeName(type) {
  const lang = getLang();
  return { maze: t('tabMaze'), code: t('tabCode'), sudoku: t('tabSudoku'), words: t('tabWords'), cross: t('tabCross') }[type];
}

function getItemDetails(item) {
  const lang = getLang();
  const c = item.config;
  if (item.type === 'maze') return `${t('levelNames')[c.level]} | 10×14`;
  if (item.type === 'code') return `${c.codeLength} ${t('digits')}`;
  if (item.type === 'sudoku') return `${t('typeNames')[c.type] || c.type} | ${t('levelNames')[c.level]}`;
  if (item.type === 'words') return `${t('catNames')[c.cat] || c.cat} | ${t('wordsLevelNames')[c.level]}`;
  if (item.type === 'cross') return t('crossLevelNames')[c.level];
  return '';
}

function renderProgress(container) {
  container.innerHTML = `
    <div class="card" style="text-align:center; padding:40px 20px;">
      <div style="font-size:48px; margin-bottom:16px;">⏳</div>
      <h3 style="margin-bottom:8px;">${t('packGenerating')(state.progress, state.total)}</h3>
      <div style="background:#E5E7EB; border-radius:8px; height:8px; overflow:hidden; margin-top:16px;">
        <div style="background:#4F46E5; height:100%; width:${(state.progress / state.total * 100)}%; transition:width 0.3s;"></div>
      </div>
    </div>
  `;
}

async function exportPack(withAnswer) {
  state.generating = true;
  state.total = state.items.length;
  state.progress = 0;
  
  // Render progress
  const container = document.querySelector('.card')?.parentElement || document.getElementById('app-container');
  renderProgress(container);
  
  const pages = [];
  const canvas = document.createElement('canvas');
  const k = 300 / 25.4; // 300 DPI
  
  for (let i = 0; i < state.items.length; i++) {
    state.progress = i + 1;
    renderProgress(container);
    
    // Kichik kechikish - UI yangilanishi uchun
    await new Promise(r => setTimeout(r, 50));
    
    const item = state.items[i];
    
    try {
      // Har bir tur uchun alohida chizish
      if (item.type === 'maze') {
        await drawMazeToCanvas(canvas, k, item, withAnswer);
      } else if (item.type === 'code') {
        await drawCodeToCanvas(canvas, k, item, withAnswer);
      } else if (item.type === 'sudoku') {
        await drawSudokuToCanvas(canvas, k, item, withAnswer);
      } else if (item.type === 'words') {
        await drawWordsToCanvas(canvas, k, item, withAnswer);
      } else if (item.type === 'cross') {
        await drawCrossToCanvas(canvas, k, item, withAnswer);
      }
      
      const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
      const jpeg = new Uint8Array(await blob.arrayBuffer());
      pages.push({ buf: jpeg, w: canvas.width, h: canvas.height });
    } catch (err) {
      console.error('Error generating page:', err);
    }
  }
  
  if (pages.length === 0) {
    alert('Xatolik yuz berdi');
    state.generating = false;
    render(container);
    return;
  }
  
  // Ko'p sahifali PDF yaratish
  const pdf = buildMultiPagePdf(pages);
  const lang = getLang();
  const fileName = lang === 'uz' 
    ? (withAnswer ? `To'plam (Javoblar).pdf` : `To'plam.pdf`)
    : (lang === 'ru' ? (withAnswer ? `Набор (Ответы).pdf` : `Набор.pdf`)
    : (withAnswer ? `Pack (Answers).pdf` : `Pack.pdf`));
  
  downloadPdf(pdf, fileName);
  
  state.generating = false;
  render(container);
}

// Har bir tur uchun Canvas'ga chizish
async function drawMazeToCanvas(canvas, k, item, showSolution) {
  const { drawSheet } = await import('../maze/ui.js');
  // Maze'ning drawSheet funksiyasini chaqirish
  // Lekin u state'ga bog'liq, shuning uchun alohida funksiya kerak
  // Hozircha oddiy yechim: maze'ni alohida chizamiz
  drawMazeSheet(canvas, k, item.seed, showSolution);
}

function drawMazeSheet(canvas, k, seed, showSolution) {
  const { buildMaze, SHAPES, HEROES, GOALS, DIRS } = require('../maze/logic.js');
  // Bu yerda maze logikasi takrorlanadi - modular yechim kerak
  // Hozircha placeholder
  const ctx = canvas.getContext('2d');
  canvas.width = Math.round(210*k);
  canvas.height = Math.round(297*k);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = `700 ${20 * 0.3528 * k}px ${FONT}`;
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.fillText('Labirint #' + seed, canvas.width/2, canvas.height/2);
}

async function drawCodeToCanvas(canvas, k, item, withAnswer) {
  canvas.width = Math.round(210*k);
  canvas.height = Math.round(297*k);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = `700 ${20 * 0.3528 * k}px ${FONT}`;
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.fillText('Code #' + item.seed, canvas.width/2, canvas.height/2);
}

async function drawSudokuToCanvas(canvas, k, item, withAnswer) {
  canvas.width = Math.round(210*k);
  canvas.height = Math.round(297*k);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = `700 ${20 * 0.3528 * k}px ${FONT}`;
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.fillText('Sudoku #' + item.seed, canvas.width/2, canvas.height/2);
}

async function drawWordsToCanvas(canvas, k, item, withAnswer) {
  canvas.width = Math.round(210*k);
  canvas.height = Math.round(297*k);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = `700 ${20 * 0.3528 * k}px ${FONT}`;
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.fillText('Words #' + item.seed, canvas.width/2, canvas.height/2);
}

async function drawCrossToCanvas(canvas, k, item, withAnswer) {
  canvas.width = Math.round(210*k);
  canvas.height = Math.round(297*k);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = `700 ${20 * 0.3528 * k}px ${FONT}`;
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.fillText('Cross #' + item.seed, canvas.width/2, canvas.height/2);
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
