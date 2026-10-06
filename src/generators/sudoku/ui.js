import { TYPES, LEVEL_CLUES, generateSudoku } from './logic.js';
import { t, getLang } from '../../core/i18n.js';
import { makePdf, downloadPdf } from '../../core/pdf.js';

let state = {
  type: '9',
  level: 1,
  seed: Math.floor(Math.random()*1e9)+1,
  showSettings: false,
  showPdfDropdown: false,
  puzzle: null
};

const FONT = '"Nunito","Trebuchet MS",Arial,sans-serif';

export function init(container) {
  state.seed = Math.floor(Math.random()*1e9)+1;
  generateAndRender(container);
}

function generateAndRender(container) {
  state.puzzle = generateSudoku(state.type, state.level, state.seed);
  render(container);
}

function render(container) {
  if (state.showSettings) {
    renderSettingsModal(container);
    return;
  }

  const lang = getLang();
  const typeKeys = Object.keys(TYPES);
  
  container.innerHTML = `
    <div class="card">
      <div class="game-header">
        <h2>🔢 ${t('tabSudoku')}</h2>
        <p>${t('sudokuDefTitle')}</p>
        <div style="margin-top:8px; font-size:13px; color:var(--text-muted);">
          📊 ${t('typeNames')[state.type]} | ${t('levelNames')[state.level]} | 🔢 #${state.seed}
        </div>
      </div>

      <canvas id="sCanvas" style="width:100%; max-width:500px; margin:0 auto; display:block; border-radius:12px; border:2px solid var(--border);"></canvas>

      <div class="action-bar" style="margin-top:16px;">
        <button id="sNew" class="primary">🔄 Yangi</button>
        
        <div class="dropdown-container">
          <button id="pdfDropdownBtn">📄 ${t('pdfBtn')} ▼</button>
          <div class="dropdown-menu ${state.showPdfDropdown ? 'show' : ''}" id="pdfDropdown">
            <button id="pdfTaskBtn">📋 ${t('pdfTask')}</button>
            <button id="pdfAnswerBtn">✅ ${t('pdfAnswer')}</button>
          </div>
        </div>
        
        <button id="settingsBtn">⚙️</button>
      </div>
    </div>
  `;

  draw(container);
  attachEvents(container);
}

function renderSettingsModal(container) {
  const lang = getLang();
  const typeKeys = Object.keys(TYPES);
  
  container.innerHTML = `
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal">
        <h3>⚙️ ${t('settingsTitle')}</h3>
        
        <label style="display:block; margin-bottom:12px;">
          <span style="font-size:13px; font-weight:700; display:block; margin-bottom:4px;">📊 ${t('sudokuTypeLabel')}</span>
          <select id="setType" style="width:100%; padding:10px; border-radius:8px; border:2px solid var(--border); font-family:inherit;">
            ${typeKeys.map(k => `<option value="${k}" ${state.type === k ? 'selected' : ''}>${t('typeNames')[k]}</option>`).join('')}
          </select>
        </label>

        <label style="display:block; margin-bottom:12px;">
          <span style="font-size:13px; font-weight:700; display:block; margin-bottom:4px;">📈 ${t('sudokuLevelLabel')}</span>
          <select id="setLevel" style="width:100%; padding:10px; border-radius:8px; border:2px solid var(--border); font-family:inherit;">
            ${t('levelNames').map((name, i) => `<option value="${i}" ${state.level === i ? 'selected' : ''}>${name}</option>`).join('')}
          </select>
        </label>

        <label style="display:block; margin-bottom:12px;">
          <span style="font-size:13px; font-weight:700; display:block; margin-bottom:4px;">🔢 ${t('sudokuSeedLabel')}</span>
          <input type="number" id="setSeed" min="1" value="${state.seed}" style="width:100%; padding:10px; border-radius:8px; border:2px solid var(--border); font-family:inherit;">
        </label>

        <div class="modal-actions">
          <button id="cancelSettingsBtn">${t('cancel')}</button>
          <button id="saveSettingsBtn" class="primary">${t('save')}</button>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#modalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay') { state.showSettings = false; render(container); }
  });
  container.querySelector('#cancelSettingsBtn').addEventListener('click', () => { state.showSettings = false; render(container); });
  container.querySelector('#saveSettingsBtn').addEventListener('click', () => {
    state.type = container.querySelector('#setType').value;
    state.level = parseInt(container.querySelector('#setLevel').value);
    state.seed = Math.max(1, parseInt(container.querySelector('#setSeed').value) || 1);
    state.showSettings = false;
    generateAndRender(container);
  });
}

function attachEvents(container) {
  container.querySelector('#sNew').addEventListener('click', () => {
    state.seed = Math.floor(Math.random()*1e9)+1;
    generateAndRender(container);
  });

  container.querySelector('#settingsBtn').addEventListener('click', () => {
    state.showSettings = true;
    render(container);
  });

  container.querySelector('#pdfDropdownBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    state.showPdfDropdown = !state.showPdfDropdown;
    container.querySelector('#pdfDropdown').classList.toggle('show', state.showPdfDropdown);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown-container')) {
      state.showPdfDropdown = false;
      const dd = container.querySelector('#pdfDropdown');
      if (dd) dd.classList.remove('show');
    }
  });

  container.querySelector('#pdfTaskBtn').addEventListener('click', () => {
    state.showPdfDropdown = false;
    exportPdf(false);
  });

  container.querySelector('#pdfAnswerBtn').addEventListener('click', () => {
    state.showPdfDropdown = false;
    exportPdf(true);
  });
}

function drawSheet(canvas, k, showSolution) {
  if (!state.puzzle) state.puzzle = generateSudoku(state.type, state.level, state.seed);
  const p = state.puzzle;
  const spec = p.spec, N = spec.N;
  const ctx = canvas.getContext('2d');
  canvas.width = Math.round(210*k);
  canvas.height = Math.round(297*k);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const M = 14 * k, areaW = 210 * k - 2*M;
  const fpx = 24 * 0.3528 * k;
  ctx.font = `700 ${fpx}px ${FONT}`;
  ctx.fillStyle = '#000000'; 
  ctx.textAlign = 'center'; 
  ctx.textBaseline = 'top';
  
  const lang = getLang();
  const title = lang === 'uz' ? 'SUDOKU' : (lang === 'ru' ? 'СУДОКУ' : 'SUDOKU');
  ctx.fillText(title, 105*k, M);
  
  const footH = 7 * k;
  ctx.font = `${8*0.3528*k}px ${FONT}`;
  ctx.fillStyle = '#6B7280'; 
  ctx.textAlign = 'right'; 
  ctx.textBaseline = 'alphabetic';
  const footText = lang === 'uz' ? `Sudoku #${state.seed} (${t('typeNames')[state.type]}, ${t('levelNames')[state.level]})` 
               : (lang === 'ru' ? `Судоку №${state.seed}` : `Sudoku #${state.seed}`);
  ctx.fillText(footText, 210*k - M, 297*k - M);

  const ruleFont = 11 * 0.3528 * k;
  ctx.font = `${ruleFont}px ${FONT}`;
  ctx.textAlign = 'center';
  const ruleText = t('sudokuRule', N, spec.jig, spec.diag);
  
  // Simple text wrapping for rule
  const words = ruleText.split(' ');
  let lines = [], currentLine = words[0];
  for (let i = 1; i < words.length; i++) {
    if (ctx.measureText(currentLine + ' ' + words[i]).width < areaW - 20*k) {
      currentLine += ' ' + words[i];
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }
  lines.push(currentLine);
  
  const top = M + 15*k;
  const ruleH = lines.length * ruleFont * 1.3;
  lines.forEach((ln, i) => ctx.fillText(ln, 105*k, top + i * ruleFont * 1.3));

  const areaH = (297 * k - M - footH) - (top + ruleH + 8*k);
  const cellMm = Math.min(areaW / N, 30*k, (areaH) / N);
  const size = cellMm * N;
  const gx = 105*k - size/2;
  const gy = top + ruleH + 12*k;
  const cx = c => gx + c*cellMm, cy = r => gy + r*cellMm;

  // Diagonal highlight (light gray for B&W print)
  if (spec.diag) {
    ctx.fillStyle = '#F3F4F6';
    for (let i = 0; i < N; i++) {
      ctx.fillRect(cx(i), cy(i), cellMm, cellMm);
      if (i !== N-1-i) ctx.fillRect(cx(N-1-i), cy(i), cellMm, cellMm);
    }
  }

  // Jigsaw regions (alternating very light gray/white for B&W distinction)
  if (spec.jig) {
    const adj = Array.from({length:N}, () => new Set());
    for (let i = 0; i < N*N; i++) {
      const r = Math.floor(i / N), c = i % N;
      if (c < N-1 && spec.region[i] !== spec.region[i+1]) { adj[spec.region[i]].add(spec.region[i+1]); adj[spec.region[i+1]].add(spec.region[i]); }
      if (r < N-1 && spec.region[i] !== spec.region[i+N]) { adj[spec.region[i]].add(spec.region[i+N]); adj[spec.region[i+N]].add(spec.region[i]); }
    }
    const col = Array(N).fill(-1);
    for (let id = 0; id < N; id++) {
      const used = new Set([...adj[id]].map(x => col[x]));
      let c = 0; while (used.has(c)) c++;
      col[id] = c;
    }
    for (let i = 0; i < N*N; i++) {
      if (col[spec.region[i]] % 2 === 1) {
        ctx.fillStyle = '#F9FAFB';
        ctx.fillRect(cx(i % N), cy(Math.floor(i / N)), cellMm, cellMm);
      }
    }
  }

  // Numbers
  ctx.textAlign = 'center'; 
  ctx.textBaseline = 'middle';
  for (let i = 0; i < N*N; i++) {
    const given = p.puzzle[i], v = given || (showSolution ? p.sol[i] : 0);
    if (!v) continue;
    const x = cx(i % N) + cellMm/2, y = cy(Math.floor(i / N)) + cellMm/2;
    ctx.font = `700 ${cellMm*0.55}px ${FONT}`;
    ctx.fillStyle = given ? '#000000' : '#EF4444'; // Red for solution in preview, black in PDF
    if (!showSolution || given) ctx.fillStyle = '#000000'; // Force black for PDF
    ctx.fillText(String(v), x, y + cellMm*0.04);
  }

  // Grid lines (thin)
  ctx.strokeStyle = '#9CA3AF'; 
  ctx.lineWidth = 0.3 * k;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    ctx.moveTo(cx(i), cy(0)); ctx.lineTo(cx(i), cy(N));
    ctx.moveTo(cx(0), cy(i)); ctx.lineTo(cx(N), cy(i));
  }
  ctx.stroke();

  // Region borders (thick)
  ctx.strokeStyle = '#000000'; 
  ctx.lineWidth = 1.2 * k;
  ctx.beginPath();
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const i = r*N + c;
      if (c === 0 || spec.region[i-1] !== spec.region[i]) { ctx.moveTo(cx(c), cy(r)); ctx.lineTo(cx(c), cy(r+1)); }
      if (c === N-1) { ctx.moveTo(cx(N), cy(r)); ctx.lineTo(cx(N), cy(r+1)); }
      if (r === 0 || spec.region[i-N] !== spec.region[i]) { ctx.moveTo(cx(c), cy(r)); ctx.lineTo(cx(c+1), cy(r)); }
      if (r === N-1) { ctx.moveTo(cx(c), cy(N)); ctx.lineTo(cx(c+1), cy(N)); }
    }
  }
  ctx.stroke();
  
  // Outer border
  ctx.strokeRect(gx, gy, size, size);
}

function draw(container) {
  const canvas = container.querySelector('#sCanvas');
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
      ? (withSolution ? `Sudoku #${state.seed} (Javob).pdf` : `Sudoku #${state.seed}.pdf`)
      : (lang === 'ru' ? (withSolution ? `Судоку №${state.seed} (Ответ).pdf` : `Судоку №${state.seed}.pdf`)
      : (withSolution ? `Sudoku #${state.seed} (Answer).pdf` : `Sudoku #${state.seed}.pdf`));
    downloadPdf(makePdf(jpeg, c.width, c.height), fileName);
  }, 'image/jpeg', 0.93);
}
