import { buildMaze, SHAPES, HEROES, GOALS, LEVELS, DIRS } from './logic.js';
import { t, getLang } from '../../core/i18n.js';
import { makePdf, downloadPdf } from '../../core/pdf.js';

let state = {
  W: 10, H: 14, seed: Math.floor(Math.random()*1e9)+1,
  shape: 'rect', hero: HEROES[0], goal: GOALS[0],
  title: '', fontPt: 28, showSolution: false,
  level: 1, // 0-Oson, 1-O'rta, 2-Qiyin, 3-Juda qiyin
  showSettings: false,
  showPdfDropdown: false,
  // Swipe uchun
  playerPos: null,
  maze: null
};

const FONT = '"Nunito","Trebuchet MS","DejaVu Sans",Arial,sans-serif';
const SHAPE_SVG = {
  rect: '▭', circle: '●', star: '★', heart: '♥', 
  triangle: '▲', diamond: '◆', house: '⌂', hexagon: '⬡'
};

export function init(container) {
  state.seed = Math.floor(Math.random()*1e9)+1;
  state.title = t('mazeDefTitle');
  resetPlayer();
  render(container);
}

function resetPlayer() {
  // Labirint qurilganda playerPos ni yangilaymiz
  state.playerPos = null;
}

function render(container) {
  if (state.showSettings) {
    renderSettingsModal(container);
    return;
  }

  const lang = getLang();
  const levelNames = lang === 'uz' ? ["Oson", "O'rta", "Qiyin", "Juda qiyin"] 
                 : (lang === 'ru' ? ["Легко", "Средне", "Сложно", "Очень сложно"] 
                 : ["Easy", "Medium", "Hard", "Expert"]);

  container.innerHTML = `
    <div class="card">
      <div class="game-header">
        <h2> ${t('tabMaze')}</h2>
        <p>${t('mazeDefTitle')}</p>
        <div style="margin-top:8px; font-size:13px; color:var(--text-muted);">
          📊 Daraja: <strong style="color:var(--primary);">${levelNames[state.level]}</strong> | 
           ${state.W}×${state.H} | 🔢 #${state.seed}
        </div>
      </div>

      <canvas id="mCanvas" style="width:100%; max-width:500px; margin:0 auto; display:block; border-radius:12px; border:2px solid var(--border); touch-action:none;"></canvas>
      
      <div style="text-align:center; margin-top:12px; font-size:13px; color:var(--text-muted);">
        📱 Ekranni swipe qilib qahramonni harakatlantiring!
      </div>

      <div class="action-bar" style="margin-top:16px;">
        <button id="mNew" class="primary">🔄 ${t('newMaze')}</button>
        
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

  buildAndDraw(container);
  attachEvents(container);
  setupSwipe(container);
}

function renderSettingsModal(container) {
  const lang = getLang();
  const levelNames = lang === 'uz' ? ["Oson", "O'rta", "Qiyin", "Juda qiyin"] 
                 : (lang === 'ru' ? ["Легко", "Средне", "Сложно", "Очень сложно"] 
                 : ["Easy", "Medium", "Hard", "Expert"]);

  const shapeOptions = Object.keys(SHAPES).map(key => 
    `<option value="${key}" ${state.shape === key ? 'selected' : ''}>${SHAPE_SVG[key]} ${key}</option>`
  ).join('');

  container.innerHTML = `
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal">
        <h3>⚙️ ${t('settingsTitle')}</h3>
        
        <label style="display:block; margin-bottom:12px;">
          <span style="font-size:13px; font-weight:700; display:block; margin-bottom:4px;">📊 ${lang === 'uz' ? 'Daraja' : (lang === 'ru' ? 'Сложность' : 'Difficulty')}</span>
          <select id="setLevel" style="width:100%; padding:10px; border-radius:8px; border:2px solid var(--border); font-family:inherit;">
            ${levelNames.map((name, i) => `<option value="${i}" ${state.level === i ? 'selected' : ''}>${name}</option>`).join('')}
          </select>
        </label>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
          <label>
            <span style="font-size:13px; font-weight:700; display:block; margin-bottom:4px;">📐 Eni (W)</span>
            <input type="number" id="setW" min="5" max="50" value="${state.W}" style="width:100%; padding:8px; border-radius:8px; border:2px solid var(--border); font-family:inherit;">
          </label>
          <label>
            <span style="font-size:13px; font-weight:700; display:block; margin-bottom:4px;">📐 Bo'yi (H)</span>
            <input type="number" id="setH" min="5" max="70" value="${state.H}" style="width:100%; padding:8px; border-radius:8px; border:2px solid var(--border); font-family:inherit;">
          </label>
        </div>

        <label style="display:block; margin-bottom:12px;">
          <span style="font-size:13px; font-weight:700; display:block; margin-bottom:4px;">🔷 ${t('shape')}</span>
          <select id="setShape" style="width:100%; padding:10px; border-radius:8px; border:2px solid var(--border); font-family:inherit;">
            ${shapeOptions}
          </select>
        </label>

        <label style="display:block; margin-bottom:12px;">
          <span style="font-size:13px; font-weight:700; display:block; margin-bottom:4px;">🦸 ${t('hero')}</span>
          <select id="setHero" style="width:100%; padding:10px; border-radius:8px; border:2px solid var(--border); font-family:inherit; font-size:20px;">
            ${HEROES.map(h => `<option value="${h}" ${state.hero === h ? 'selected' : ''}>${h}</option>`).join('')}
          </select>
        </label>

        <label style="display:block; margin-bottom:12px;">
          <span style="font-size:13px; font-weight:700; display:block; margin-bottom:4px;">🎯 ${t('goal')}</span>
          <select id="setGoal" style="width:100%; padding:10px; border-radius:8px; border:2px solid var(--border); font-family:inherit; font-size:20px;">
            ${GOALS.map(g => `<option value="${g}" ${state.goal === g ? 'selected' : ''}>${g}</option>`).join('')}
          </select>
        </label>

        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; margin-top:12px;">
          <input type="checkbox" id="setSolution" ${state.showSolution ? 'checked' : ''} style="width:18px; height:18px;">
          <span style="font-weight:600;">${t('showSolution')}</span>
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
    state.level = parseInt(container.querySelector('#setLevel').value);
    const newW = parseInt(container.querySelector('#setW').value);
    const newH = parseInt(container.querySelector('#setH').value);
    if (newW >= 5 && newW <= 50) state.W = newW;
    if (newH >= 5 && newH <= 70) state.H = newH;
    state.shape = container.querySelector('#setShape').value;
    state.hero = container.querySelector('#setHero').value;
    state.goal = container.querySelector('#setGoal').value;
    state.showSolution = container.querySelector('#setSolution').checked;
    state.showSettings = false;
    resetPlayer();
    render(container);
  });
}

function buildAndDraw(container) {
  // Darajaga ko'ra o'lchamni avtomatik sozlash (agar user o'zgartirmagan bo'lsa)
  if (!state.manualSize) {
    const sizes = [[10,14], [20,28], [35,49], [60,85]];
    [state.W, state.H] = sizes[state.level];
  }
  
  state.maze = buildMaze(state.W, state.H, state.seed, state.shape);
  resetPlayer();
  draw(container);
}

function setupSwipe(container) {
  const canvas = container.querySelector('#mCanvas');
  if (!canvas) return;

  let startX, startY;
  const threshold = 30; // Swipe threshold

  canvas.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    e.preventDefault();
  }, {passive: false});

  canvas.addEventListener('touchend', (e) => {
    if (!startX || !startY || !state.playerPos) return;
    
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    
    const dx = endX - startX;
    const dy = endY - startY;
    
    let moveDir = -1;
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal
      if (dx > threshold) moveDir = 1; // Right
      else if (dx < -threshold) moveDir = 3; // Left
    } else {
      // Vertical
      if (dy > threshold) moveDir = 2; // Down
      else if (dy < -threshold) moveDir = 0; // Up
    }
    
    if (moveDir !== -1 && state.playerPos) {
      movePlayer(moveDir);
      draw(container);
    }
    
    startX = null;
    startY = null;
    e.preventDefault();
  }, {passive: false});

  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    if (!state.maze || !state.playerPos) return;
    
    let dir = -1;
    if (e.key === 'ArrowUp') dir = 0;
    else if (e.key === 'ArrowRight') dir = 1;
    else if (e.key === 'ArrowDown') dir = 2;
    else if (e.key === 'ArrowLeft') dir = 3;
    
    if (dir !== -1) {
      movePlayer(dir);
      draw(container);
    }
  });
}

function movePlayer(direction) {
  if (!state.maze || !state.playerPos) return;
  
  const [px, py] = state.playerPos;
  const [dx, dy] = DIRS[direction];
  const nx = px + dx, ny = py + dy;
  
  // Check if move is valid
  if (state.maze.isIn(nx, ny) && state.maze.open[py][px][direction]) {
    state.playerPos = [nx, ny];
    
    // Check if reached goal
    if (nx === state.maze.end[0] && ny === state.maze.end[1]) {
      setTimeout(() => {
        alert('🎉 Tabriklaymiz! Siz labirintni yechdingiz!');
      }, 100);
    }
  }
}

function attachEvents(container) {
  container.querySelector('#mNew').addEventListener('click', () => {
    state.seed = Math.floor(Math.random()*1e9)+1;
    state.manualSize = false;
    resetPlayer();
    render(container);
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

function wrapLines(ctx, text, maxW) {
  if (!text.trim()) return [];
  const out = [];
  text.split('\n').forEach(par => {
    if (!par.trim()) { out.push(''); return; }
    let line = '';
    par.trim().split(/\s+/).forEach(word => {
      const t = line ? line + ' ' + word : word;
      if (!line || ctx.measureText(t).width <= maxW) line = t;
      else { out.push(line); line = word; }
    });
    out.push(line);
  });
  return out;
}

function drawMarker(ctx, emoji, cx, cy, size, k, isPlayer = false) {
  ctx.font = `${size*0.85*k}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = 'center'; 
  ctx.textBaseline = 'middle';
  
  // Player uchun aylana fon
  if (isPlayer) {
    ctx.fillStyle = 'rgba(79, 70, 229, 0.3)';
    ctx.beginPath();
    ctx.arc(cx*k, cy*k, size*0.6*k, 0, Math.PI*2);
    ctx.fill();
  }
  
  ctx.fillStyle = '#1f2a44';
  ctx.fillText(emoji, cx*k, cy*k);
}

function drawSheet(canvas, k, showSolution, interactive = false) {
  if (!state.maze) {
    state.maze = buildMaze(state.W, state.H, state.seed, state.shape);
  }
  
  const m = state.maze;
  const ctx = canvas.getContext('2d');
  canvas.width = Math.round(210*k);
  canvas.height = Math.round(297*k);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const M = 14, areaW = 210 - 2*M;
  const fpx = state.fontPt * 0.3528 * k;
  ctx.font = `700 ${fpx}px ${FONT}`;
  ctx.fillStyle = '#1f2a44'; 
  ctx.textAlign = 'center'; 
  ctx.textBaseline = 'top';
  const lines = wrapLines(ctx, state.title, areaW*k);
  const lh = fpx * 1.25;
  lines.forEach((ln, i) => ctx.fillText(ln, 105*k, M*k + i*lh));
  
  const footH = 7;
  ctx.font = `${8*0.3528*k}px ${FONT}`;
  ctx.fillStyle = '#7b869c'; 
  ctx.textAlign = 'right'; 
  ctx.textBaseline = 'alphabetic';
  const lang = getLang();
  const footText = lang === 'uz' ? `Labirint #${state.seed} (${state.W}×${state.H})` : (lang === 'ru' ? `Лабиринт №${state.seed}` : `Maze #${state.seed}`);
  ctx.fillText(footText, (210-M)*k, (297-M)*k);

  const top = M + (lines.length * lh) / k + (lines.length ? 8 : 0);
  const areaH = (297 - M - footH) - top;
  const bb = m.bbox, gw = bb.maxX - bb.minX + 1, gh = bb.maxY - bb.minY + 1;
  const cell0 = Math.min(areaW / gw, areaH / gh);
  const S = Math.min(14, Math.max(9, cell0 * 0.95));
  const pad = [0, 0, 0, 0];
  pad[m.sDir] = S + 1; 
  pad[m.eDir] = Math.max(pad[m.eDir], S + 1);
  const cell = Math.min((areaW - pad[1] - pad[3]) / gw, (areaH - pad[0] - pad[2]) / gh);
  const contentW = gw*cell + pad[1] + pad[3], contentH = gh*cell + pad[0] + pad[2];
  const ox = 105 - contentW/2 + pad[3] - bb.minX*cell;
  const oy = top + (areaH - contentH)/2 + pad[0] - bb.minY*cell;

  const gate = (x, y, d) => (x === m.start[0] && y === m.start[1] && d === m.sDir) || (x === m.end[0] && y === m.end[1] && d === m.eDir);
  ctx.strokeStyle = '#1f2a44';
  ctx.lineWidth = Math.min(0.9, Math.max(0.3, cell*0.09)) * k;
  ctx.lineCap = 'round'; 
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let y = bb.minY; y <= bb.maxY; y++) {
    for (let x = bb.minX; x <= bb.maxX; x++) {
      if (!m.isIn(x, y)) continue;
      const x0 = (ox + x*cell)*k, y0 = (oy + y*cell)*k, x1 = x0 + cell*k, y1 = y0 + cell*k;
      if ((!m.isIn(x, y-1) || !m.open[y][x][0]) && !gate(x, y, 0)) { ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); }
      if ((!m.isIn(x-1, y) || !m.open[y][x][3]) && !gate(x, y, 3)) { ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); }
      if (!m.isIn(x, y+1) && !gate(x, y, 2)) { ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); }
      if (!m.isIn(x+1, y) && !gate(x, y, 1)) { ctx.moveTo(x1, y0); ctx.lineTo(x1, y1); }
    }
  }
  ctx.stroke();

  const ctr = ([x, y]) => [ox + (x+.5)*cell, oy + (y+.5)*cell];
  const outside = (c, d) => { const [cx, cy] = ctr(c), off = cell/2 + S/2 + 0.5; return [cx + DIRS[d][0]*off, cy + DIRS[d][1]*off]; };
  const sp = outside(m.start, m.sDir), ep = outside(m.end, m.eDir);

  // Interactive mode - player position
  if (interactive && state.playerPos) {
    const playerCtr = ctr(state.playerPos);
    drawMarker(ctx, state.hero, playerCtr[0], playerCtr[1], S, k, true);
  } else {
    drawMarker(ctx, state.hero, sp[0], sp[1], S, k);
  }
  
  drawMarker(ctx, state.goal, ep[0], ep[1], S, k);

  if (showSolution) {
    ctx.strokeStyle = 'rgba(229,72,77,.85)';
    ctx.lineWidth = Math.min(2, Math.max(0.5, cell * 0.22)) * k;
    ctx.beginPath();
    [sp, ...m.path.map(ctr), ep].forEach(([px, py], i) => { i ? ctx.lineTo(px*k, py*k) : ctx.moveTo(px*k, py*k); });
    ctx.stroke();
  }
}

function draw(container) {
  const canvas = container.querySelector('#mCanvas');
  if (!canvas) return;
  drawSheet(canvas, 1240/210, state.showSolution, true);
}

export function exportPdf(withSolution) {
  const c = document.createElement('canvas');
  drawSheet(c, 300/25.4, withSolution, false);
  c.toBlob(async blob => {
    if (!blob) { alert('PDF xatosi'); return; }
    const jpeg = new Uint8Array(await blob.arrayBuffer());
    const lang = getLang();
    const fileName = lang === 'uz' 
      ? (withSolution ? `Labirint #${state.seed} (Javob).pdf` : `Labirint #${state.seed}.pdf`)
      : (lang === 'ru' ? (withSolution ? `Лабиринт №${state.seed} (Ответ).pdf` : `Лабиринт №${state.seed}.pdf`)
      : (withSolution ? `Maze #${state.seed} (Answer).pdf` : `Maze #${state.seed}.pdf`));
    downloadPdf(makePdf(jpeg, c.width, c.height), fileName);
  }, 'image/jpeg', 0.93);
}
