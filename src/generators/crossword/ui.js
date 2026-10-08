import { buildCrossword } from './logic.js';
import { t, getLang } from '../../core/i18n.js';
import { makePdf, downloadPdf } from '../../core/pdf.js';
import { renderActionBar } from '../../components/ActionBar.js';

let state = {
  showSolution: false,
  level: 1,
  seed: Math.floor(Math.random()*1e9)+1,
  showSettings: false,
  puzzle: null
};

const FONT = '"Nunito","Trebuchet MS",Arial,sans-serif';

export function init(container) {
  state.seed = Math.floor(Math.random()*1e9)+1;
  generateAndRender(container);
}

function generateAndRender(container) {
  state.puzzle = buildCrossword(state.level, state.seed);
  render(container);
}

function render(container) {
  if (state.showSettings) { renderSettingsModal(container); return; }
  const lang = getLang();
  const p = state.puzzle;
  
  container.innerHTML = `
    <div class="card">
      <div class="game-header">
        <h2> ${t('tabCross')}</h2>
        <p>${t('crossDefTitle')}</p>
        <div style="margin-top:8px; font-size:13px; color:var(--text-muted);">
          📊 ${t('crossLevelNames')[state.level]} | 🔢 #${state.seed}
          <br>📝 ${t('equationsCount', p.eqCount)} | ️ ${t('emptyCells', p.hiddenCount)}
        </div>
      </div>
      <canvas id="cCanvas" style="width:100%; max-width:500px; margin:0 auto; display:block; border-radius:12px; border:2px solid var(--border);"></canvas>
    </div>
  `;
  renderActionBar(container, {
    primaryText: '🔄 Yangi',
    primaryAction: () => { state.seed = Math.floor(Math.random()*1e9)+1; generateAndRender(container); },
    showPdf: true, showSettings: true, showAnswer: true,
    answerVisible: state.showSolution,
    onPdfTask: () => exportPdf(false),
    onPdfAnswer: () => exportPdf(true),
    onSettings: () => { state.showSettings = true; render(container); },
    onAnswer: () => { state.showSolution = !state.showSolution; draw(container); render(container); },
    i18n: { new: t('newGame'), pdf: 'PDF', pdfTask: t('pdfTask'), pdfAnswer: t('pdfAnswer'), settings: 'Sozlamalar', showAnswer: "Javobni ko'rish", hideAnswer: "Javobni yashirish" }
  });
  draw(container);
}

function renderSettingsModal(container) {
  container.innerHTML = `
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal">
        <h3>⚙️ ${t('settingsTitle')}</h3>
        <label style="display:block; margin-bottom:12px;">
          <span style="font-size:13px; font-weight:700; display:block; margin-bottom:4px;">📊 ${t('crossLevelLabel')}</span>
          <select id="setLevel" style="width:100%; padding:10px; border-radius:8px; border:2px solid var(--border); font-family:inherit;">
            ${t('crossLevelNames').map((name, i) => `<option value="${i}" ${state.level === i ? 'selected' : ''}>${name}</option>`).join('')}
          </select>
        </label>
        <label style="display:block; margin-bottom:12px;">
          <span style="font-size:13px; font-weight:700; display:block; margin-bottom:4px;"> ${t('crossSeedLabel')}</span>
          <input type="number" id="setSeed" min="1" value="${state.seed}" style="width:100%; padding:10px; border-radius:8px; border:2px solid var(--border); font-family:inherit;">
        </label>
        <div class="modal-actions">
          <button id="cancelSettingsBtn">${t('cancel')}</button>
          <button id="saveSettingsBtn" class="primary">${t('save')}</button>
        </div>
      </div>
    </div>
  `;
  container.querySelector('#modalOverlay').addEventListener('click', (e) => { if (e.target.id === 'modalOverlay') { state.showSettings = false; render(container); }});
  container.querySelector('#cancelSettingsBtn').addEventListener('click', () => { state.showSettings = false; render(container); });
  container.querySelector('#saveSettingsBtn').addEventListener('click', () => {
    state.level = parseInt(container.querySelector('#setLevel').value);
    state.seed = Math.max(1, parseInt(container.querySelector('#setSeed').value) || 1);
    state.showSettings = false;
    generateAndRender(container);
  });
}

function drawSheet(canvas, k, showSolution) {
  if (!state.puzzle) state.puzzle = buildCrossword(state.level, state.seed);
  const p = state.puzzle;
  const ctx = canvas.getContext('2d');
  canvas.width = Math.round(210*k);
  canvas.height = Math.round(297*k);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const lang = getLang();
  const M = 14 * k;
  
  ctx.font = `700 ${20 * 0.3528 * k}px ${FONT}`;
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const title = lang === 'uz' ? "SONLI KROSSVORD" : (lang === 'ru' ? 'ЧИСЛОВОЙ КРОССВОРД' : 'MATH CROSSWORD');
  ctx.fillText(title, 105*k, M);
  
  ctx.font = `${12 * 0.3528 * k}px ${FONT}`;
  ctx.fillStyle = '#6B7280';
  ctx.fillText(`${t('crossLevelNames')[state.level]} | #${state.seed}`, 105*k, M + 10*k);
  
  ctx.font = `${10 * 0.3528 * k}px ${FONT}`;
  ctx.fillStyle = '#374151';
  ctx.textAlign = 'center';
  ctx.fillText(t('crossInstruction'), 105*k, M + 18*k);

  const bb = p.bbox;
  const gw = bb.maxC - bb.minC + 1;
  const gh = bb.maxR - bb.minR + 1;
  const top = M + 28*k;
  const availW = 210*k - 2*M;
  const availH = 297*k - top - 20*k;
  const cellMm = Math.min(availW / gw, availH / gh, 17*k);
  const gx = 105*k - (gw * cellMm) / 2;
  const gy = top;

  const cx = c => gx + (c - bb.minC) * cellMm;
  const cy = r => gy + (r - bb.minR) * cellMm;

  Object.keys(p.gridType).forEach(key => {
    const [r, c] = key.split(',').map(Number);
    const t = p.gridType[key];
    const x = cx(c), y = cy(r), w = cellMm;
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.6 * k;
    ctx.strokeRect(x, y, w, w);
    
    if (t === 'num') {
      const isGiven = p.given.has(key);
      ctx.font = `700 ${cellMm * 0.5}px ${FONT}`;
      if (isGiven) {
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(p.gridVal[key]), x + w/2, y + w/2);
      } else if (showSolution) {
        ctx.fillStyle = '#EF4444';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(p.gridVal[key]), x + w/2, y + w/2);
      }
    } else if (t === 'op') {
      ctx.font = `700 ${cellMm * 0.55}px ${FONT}`;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.gridOp[key], x + w/2, y + w/2);
    } else if (t === 'eq') {
      ctx.font = `700 ${cellMm * 0.55}px ${FONT}`;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('=', x + w/2, y + w/2);
    }
  });

  ctx.font = `${8 * 0.3528 * k}px ${FONT}`;
  ctx.fillStyle = '#9CA3AF';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  const footer = lang === 'uz' ? 'Topshiriqlar Lab' : (lang === 'ru' ? 'Лаборатория головоломок' : 'Puzzle Lab');
  ctx.fillText(footer, 210*k - M, 297*k - M);
}

function draw(container) {
  const canvas = container.querySelector('#cCanvas');
  if (!canvas) return;
  drawSheet(canvas, 1240/210, false);
}

export function exportPdf(withSolution) {
  const c = document.createElement('canvas');
  drawSheet(c, 300/25.4, withSolution);
  c.toBlob(async blob => {
    if (!blob) { alert('PDF xatosi'); return; }
    const jpeg = new Uint8Array(await blob.arrayBuffer());
    const lang = getLang();
    const fileName = lang === 'uz' 
      ? (withSolution ? `Krossvord #${state.seed} (Javob).pdf` : `Krossvord #${state.seed}.pdf`)
      : (lang === 'ru' ? (withSolution ? `Кроссворд №${state.seed} (Ответ).pdf` : `Кроссворд №${state.seed}.pdf`)
      : (withSolution ? `Crossword #${state.seed} (Answer).pdf` : `Crossword #${state.seed}.pdf`));
    downloadPdf(makePdf(jpeg, c.width, c.height), fileName);
  }, 'image/jpeg', 0.93);
}

// Pack uchun export qilinadigan funksiya



export function drawCrossForPack(canvas, k, seed, config, showSolution) {
  const savedState = { ...state };
  state.seed = seed;
  state.level = config.level || 1;
  state.puzzle = buildCrossword(state.level, state.seed);
  drawSheet(canvas, k, showSolution);
  Object.assign(state, savedState);
}

export function toggleSolution() {
  state.showSolution = !state.showSolution;
}
