import { buildMaze, SHAPES, HEROES, GOALS, LEVELS, DIRS } from './logic.js';
import { t, getLang } from '../../core/i18n.js';
import { makePdf, downloadPdf } from '../../core/pdf.js';

let state = {
  W: 10, H: 14, seed: Math.floor(Math.random()*1e9)+1,
  shape: 'rect', hero: HEROES[0], goal: GOALS[0],
  title: '', fontPt: 28, showSolution: false
};

const FONT = '"Nunito","Trebuchet MS","DejaVu Sans",Arial,sans-serif';

// SVG shakl ikonkalari
const SHAPE_SVG = {
  rect: '<svg viewBox="0 0 40 40"><rect x="8" y="8" width="24" height="24" fill="currentColor" rx="2"/></svg>',
  circle: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" fill="currentColor"/></svg>',
  star: '<svg viewBox="0 0 40 40"><polygon points="20,4 25,15 37,15 27,22 31,34 20,27 9,34 13,22 3,15 15,15" fill="currentColor"/></svg>',
  heart: '<svg viewBox="0 0 40 40"><path d="M20 35 C10 25, 2 18, 2 11 C2 6, 6 2, 11 2 C15 2, 18 5, 20 8 C22 5, 25 2, 29 2 C34 2, 38 6, 38 11 C38 18, 30 25, 20 35 Z" fill="currentColor"/></svg>',
  triangle: '<svg viewBox="0 0 40 40"><polygon points="20,6 36,34 4,34" fill="currentColor"/></svg>',
  diamond: '<svg viewBox="0 0 40 40"><polygon points="20,4 36,20 20,36 4,20" fill="currentColor"/></svg>',
  house: '<svg viewBox="0 0 40 40"><polygon points="20,4 36,18 32,18 32,36 8,36 8,18 4,18" fill="currentColor"/></svg>',
  hexagon: '<svg viewBox="0 0 40 40"><polygon points="20,4 34,12 34,28 20,36 6,28 6,12" fill="currentColor"/></svg>'
};

export function init(container) {
  state.seed = Math.floor(Math.random()*1e9)+1;
  state.title = t('mazeDefTitle');
  render(container);
}

function render(container) {
  const lang = getLang();
  const shapeKeys = Object.keys(SHAPES);
  
  container.innerHTML = `
    <div class="card">
      <label>
        <span>${t('mazeTitleLabel')}</span>
        <textarea id="mTitle">${state.title}</textarea>
      </label>
      
      <label>
        <span>${t('fsLabel')} <span id="fsVal">${state.fontPt}</span> pt</span>
        <input id="mFs" type="range" min="14" max="48" value="${state.fontPt}">
      </label>
      
      <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px;">
        <label><span>${t('width')}</span><input id="mW" type="number" min="5" max="100" value="${state.W}"></label>
        <label><span>${t('height')}</span><input id="mH" type="number" min="5" max="100" value="${state.H}"></label>
        <label><span>${t('seed')}</span><input id="mSeed" type="number" min="1" value="${state.seed}"></label>
      </div>
      
      <div style="margin-top:16px;">
        <span class="section-label">${t('difficulty')}</span>
        <div class="level-grid" id="mLevels"></div>
      </div>

      <div style="margin-top:16px;">
        <span class="section-label">${t('shape')}</span>
        <div class="shape-grid" id="mShapes"></div>
      </div>

      <div style="margin-top:16px;">
        <span class="section-label">${t('hero')}</span>
        <div class="sticker-grid" id="mHeroes"></div>
      </div>

      <div style="margin-top:16px;">
        <span class="section-label">${t('goal')}</span>
        <div class="sticker-grid" id="mGoals"></div>
      </div>

      <label style="display:flex; align-items:center; gap:8px; margin-top:16px; font-weight:600; cursor:pointer;">
        <input id="mSol" type="checkbox" ${state.showSolution ? 'checked' : ''} style="width:18px; height:18px;">
        <span>${t('showSolution')}</span>
      </label>

      <div class="buttons" style="margin-top:20px;">
        <button id="mNew" class="primary">${t('newMaze')}</button>
        <button id="mPdf">${t('downloadPdf')}</button>
        <button id="mAns">${t('downloadAns')}</button>
      </div>
    </div>
    <canvas id="mCanvas"></canvas>
  `;

  // Level buttons
  const lvlBox = container.querySelector('#mLevels');
  const lvlNames = lang === 'uz' ? ["Oson","O'rta","Qiyin","Juda qiyin"] 
                 : (lang === 'ru' ? ["Легко","Средне","Сложно","Очень сложно"] 
                 : ["Easy","Medium","Hard","Expert"]);
  LEVELS.forEach(([w, h], i) => {
    const b = document.createElement('button');
    b.textContent = lvlNames[i];
    b.addEventListener('click', () => { 
      state.W = w; state.H = h; 
      container.querySelector('#mW').value = w; 
      container.querySelector('#mH').value = h; 
      draw(container); 
    });
    lvlBox.appendChild(b);
  });

  // Shape buttons with SVG icons
  const shpBox = container.querySelector('#mShapes');
  const shpNames = lang === 'uz' 
    ? {rect:"To'rtburchak", circle:"Doira", star:"Yulduz", heart:"Yurak", triangle:"Uchburchak", diamond:"Romb", house:"Uy", hexagon:"Oltiburchak"} 
    : (lang === 'ru' 
    ? {rect:"Прямоуг.", circle:"Круг", star:"Звезда", heart:"Сердце", triangle:"Треуг.", diamond:"Ромб", house:"Дом", hexagon:"Шестиуг."}
    : {rect:"Rect", circle:"Circle", star:"Star", heart:"Heart", triangle:"Triangle", diamond:"Diamond", house:"House", hexagon:"Hexagon"});
  
  shapeKeys.forEach(key => {
    const b = document.createElement('button');
    b.innerHTML = `<div class="shape-svg">${SHAPE_SVG[key]}</div><span>${shpNames[key]}</span>`;
    if (key === state.shape) {
      b.classList.add('selected');
    }
    b.addEventListener('click', () => {
      state.shape = key;
      shpBox.querySelectorAll('button').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      draw(container);
    });
    shpBox.appendChild(b);
  });

  // Hero & Goal pickers
  const createPicker = (id, list, stateKey) => {
    const box = container.querySelector(id);
    list.forEach(em => {
      const b = document.createElement('button');
      b.textContent = em;
      if (em === state[stateKey]) {
        b.classList.add('selected');
      }
      b.addEventListener('click', () => {
        state[stateKey] = em;
        box.querySelectorAll('button').forEach(x => x.classList.remove('selected'));
        b.classList.add('selected');
        draw(container);
      });
      box.appendChild(b);
    });
  };
  createPicker('#mHeroes', HEROES, 'hero');
  createPicker('#mGoals', GOALS, 'goal');

  // Event listeners
  container.querySelector('#mTitle').addEventListener('input', e => { 
    state.title = e.target.value; 
    draw(container); 
  });
  container.querySelector('#mFs').addEventListener('input', e => { 
    state.fontPt = +e.target.value; 
    container.querySelector('#fsVal').textContent = state.fontPt; 
    draw(container); 
  });
  container.querySelector('#mW').addEventListener('change', e => { 
    state.W = Math.max(5, Math.min(100, +e.target.value)); 
    draw(container); 
  });
  container.querySelector('#mH').addEventListener('change', e => { 
    state.H = Math.max(5, Math.min(100, +e.target.value)); 
    draw(container); 
  });
  container.querySelector('#mSeed').addEventListener('change', e => { 
    state.seed = Math.max(1, +e.target.value); 
    draw(container); 
  });
  container.querySelector('#mSol').addEventListener('change', e => { 
    state.showSolution = e.target.checked; 
    draw(container); 
  });
  
  container.querySelector('#mNew').addEventListener('click', () => {
    state.seed = Math.floor(Math.random()*1e9)+1;
    container.querySelector('#mSeed').value = state.seed;
    draw(container);
  });
  container.querySelector('#mPdf').addEventListener('click', () => {
    try { exportPdf(false); } catch(e) { alert('PDF xatosi: ' + e.message); }
  });
  container.querySelector('#mAns').addEventListener('click', () => {
    try { exportPdf(true); } catch(e) { alert('PDF xatosi: ' + e.message); }
  });

  draw(container);
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

function drawMarker(ctx, emoji, cx, cy, size, k) {
  // Emoji'ni bir necha font bilan urinib ko'ramiz
  const fonts = [
    `${size*0.85*k}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`,
    `${size*0.85*k}px "Segoe UI Emoji","Noto Color Emoji",sans-serif`,
    `${size*0.85*k}px sans-serif`
  ];
  
  ctx.textAlign = 'center'; 
  ctx.textBaseline = 'middle';
  
  // Har bir fontni sinab ko'ramiz
  for (const font of fonts) {
    ctx.font = font;
    const metrics = ctx.measureText(emoji);
    if (metrics.width > 0) {
      ctx.fillStyle = '#1f2a44';
      ctx.fillText(emoji, cx*k, cy*k);
      return;
    }
  }
  
  // Agar hech biri ishlamasa, oxirgisini ishlatamiz
  ctx.font = fonts[0];
  ctx.fillStyle = '#1f2a44';
  ctx.fillText(emoji, cx*k, cy*k);
}

function drawSheet(canvas, k, showSolution) {
  const m = buildMaze(state.W, state.H, state.seed, state.shape);
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
  const titleBottom = M + (lines.length * lh) / k;

  const footH = 7;
  ctx.font = `${8*0.3528*k}px ${FONT}`;
  ctx.fillStyle = '#7b869c'; 
  ctx.textAlign = 'right'; 
  ctx.textBaseline = 'alphabetic';
  const lang = getLang();
  const footText = lang === 'uz' ? `Labirint raqami: ${state.seed} (${state.W}×${state.H})` 
               : (lang === 'ru' ? `Лабиринт № ${state.seed} (${state.W}×${state.H})` 
               : `Maze # ${state.seed} (${state.W}×${state.H})`);
  ctx.fillText(footText, (210-M)*k, (297-M)*k);

  const top = titleBottom + (lines.length ? 8 : 0);
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

  // To'g'ri yo'lni chizish (showSolution parametri bilan)
  if (showSolution) {
    ctx.strokeStyle = 'rgba(229,72,77,.85)';
    ctx.lineWidth = Math.min(2, Math.max(0.5, cell * 0.22)) * k;
    ctx.beginPath();
    [sp, ...m.path.map(ctr), ep].forEach(([px, py], i) => { 
      i ? ctx.lineTo(px*k, py*k) : ctx.moveTo(px*k, py*k); 
    });
    ctx.stroke();
  }

  drawMarker(ctx, state.hero, sp[0], sp[1], S, k);
  drawMarker(ctx, state.goal, ep[0], ep[1], S, k);
  return { cell, S };
}

function draw(container) {
  const canvas = container.querySelector('#mCanvas');
  if (!canvas) return;
  drawSheet(canvas, 1240/210, state.showSolution);
}

export function exportPdf(withSolution) {
  const c = document.createElement('canvas');
  drawSheet(c, 300/25.4, withSolution);
  c.toBlob(async blob => {
    if (!blob) {
      alert('PDF yaratishda xatolik yuz berdi');
      return;
    }
    const jpeg = new Uint8Array(await blob.arrayBuffer());
    const lang = getLang();
    const fileName = lang === 'uz' 
      ? (withSolution ? `${state.seed} raqamli labirint javobi.pdf` : `${state.seed} raqamli labirint.pdf`)
      : (lang === 'ru' 
      ? (withSolution ? `Лабиринт № ${state.seed} - ответ.pdf` : `Лабиринт № ${state.seed}.pdf`)
      : (withSolution ? `Maze # ${state.seed} - answer.pdf` : `Maze # ${state.seed}.pdf`));
    const pdf = makePdf(jpeg, c.width, c.height);
    downloadPdf(pdf, fileName);
  }, 'image/jpeg', 0.93);
}
