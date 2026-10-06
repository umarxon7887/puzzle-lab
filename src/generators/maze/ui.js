import { buildMaze, SHAPES, HEROES, GOALS, LEVELS } from './logic.js';
import { makeRng } from '../../core/utils.js';
import { t, getLang } from '../../core/i18n.js';
import { makePdf, downloadPdf } from '../../core/pdf.js';

let state = {
  W: 10, H: 14, seed: Math.floor(Math.random()*1e9)+1,
  shape: 'rect', hero: HEROES[0], goal: GOALS[0],
  title: '', fontPt: 28, showSolution: false
};

const FONT = '"Nunito","Trebuchet MS","DejaVu Sans",Arial,sans-serif';

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
      <label><span>${t('mazeTitleLabel')}</span><textarea id="mTitle">${state.title}</textarea></label>
      <label><span>${t('fsLabel')} <span id="fsVal">${state.fontPt}</span> pt</span>
        <input id="mFs" type="range" min="14" max="48" value="${state.fontPt}">
      </label>
      <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px;">
        <label><span>${t('width')}</span><input id="mW" type="number" min="5" max="100" value="${state.W}"></label>
        <label><span>${t('height')}</span><input id="mH" type="number" min="5" max="100" value="${state.H}"></label>
        <label><span>${t('seed')}</span><input id="mSeed" type="number" min="1" value="${state.seed}"></label>
      </div>
      
      <div style="margin-top:12px;">
        <div style="font-size:12px; font-weight:700; color:#6B7280; margin-bottom:6px;">${t('difficulty')}</div>
        <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px;" id="mLevels"></div>
      </div>

      <div style="margin-top:12px;">
        <div style="font-size:12px; font-weight:700; color:#6B7280; margin-bottom:6px;">${t('shape')}</div>
        <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px;" id="mShapes"></div>
      </div>

      <div style="margin-top:12px;">
        <div style="font-size:12px; font-weight:700; color:#6B7280; margin-bottom:6px;">${t('hero')}</div>
        <div style="display:grid; grid-template-columns:repeat(6,1fr); gap:8px;" id="mHeroes"></div>
      </div>

      <div style="margin-top:12px;">
        <div style="font-size:12px; font-weight:700; color:#6B7280; margin-bottom:6px;">${t('goal')}</div>
        <div style="display:grid; grid-template-columns:repeat(6,1fr); gap:8px;" id="mGoals"></div>
      </div>

      <label style="display:flex; align-items:center; gap:8px; margin-top:12px; font-weight:600;">
        <input id="mSol" type="checkbox" ${state.showSolution ? 'checked' : ''}> ${t('showSolution')}
      </label>

      <div class="buttons" style="margin-top:16px;">
        <button id="mNew" class="primary">${t('newMaze')}</button>
        <button id="mPdf">${t('downloadPdf')}</button>
        <button id="mAns">${t('downloadAns')}</button>
      </div>
    </div>
    <canvas id="mCanvas" style="width:100%; max-width:800px; margin:20px auto; display:block; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.1);"></canvas>
  `;

  // Level buttons
  const lvlBox = container.querySelector('#mLevels');
  const lvlNames = lang === 'uz' ? ["Oson","O'rta","Qiyin","Juda qiyin"] : (lang === 'ru' ? ["Легко","Средне","Сложно","Очень сложно"] : ["Easy","Medium","Hard","Expert"]);
  LEVELS.forEach(([w, h], i) => {
    const b = document.createElement('button');
    b.textContent = lvlNames[i]; b.style.fontSize = '12px'; b.style.padding = '8px 4px';
    b.addEventListener('click', () => { 
      state.W = w; state.H = h; 
      container.querySelector('#mW').value = w; container.querySelector('#mH').value = h; 
      draw(container); 
    });
    lvlBox.appendChild(b);
  });

  // Shape buttons
  const shpBox = container.querySelector('#mShapes');
  const shpNames = lang === 'uz' ? {rect:"To'rtburchak", circle:"Doira", star:"Yulduz", heart:"Yurak", triangle:"Uchburchak", diamond:"Romb", house:"Uy", hexagon:"Oltiburchak"} 
                 : (lang === 'ru' ? {rect:"Прямоуг.", circle:"Круг", star:"Звезда", heart:"Сердце", triangle:"Треуг.", diamond:"Ромб", house:"Дом", hexagon:"Шестиуг."}
                 : {rect:"Rect", circle:"Circle", star:"Star", heart:"Heart", triangle:"Triangle", diamond:"Diamond", house:"House", hexagon:"Hexagon"});
  shapeKeys.forEach(key => {
    const b = document.createElement('button');
    b.innerHTML = `<div style="font-size:20px;">■</div><div style="font-size:10px;">${shpNames[key]}</div>`;
    if (key === 'circle') b.innerHTML = `<div style="font-size:20px;">●</div><div style="font-size:10px;">${shpNames[key]}</div>`;
    if (key === state.shape) b.style.background = 'var(--primary)'; b.style.color = 'white'; b.style.borderColor = 'var(--primary)';
    b.addEventListener('click', () => {
      state.shape = key;
      shpBox.querySelectorAll('button').forEach(x => { x.style.background = 'white'; x.style.color = 'var(--text)'; x.style.borderColor = 'var(--border)'; });
      b.style.background = 'var(--primary)'; b.style.color = 'white'; b.style.borderColor = 'var(--primary)';
      draw(container);
    });
    shpBox.appendChild(b);
  });

  // Hero & Goal pickers
  const createPicker = (id, list, stateKey) => {
    const box = container.querySelector(id);
    list.forEach(em => {
      const b = document.createElement('button');
      b.textContent = em; b.style.fontSize = '24px'; b.style.padding = '4px';
      if (em === state[stateKey]) { b.style.background = 'var(--primary-light)'; b.style.borderColor = 'var(--primary)'; }
      b.addEventListener('click', () => {
        state[stateKey] = em;
        box.querySelectorAll('button').forEach(x => { x.style.background = 'white'; x.style.borderColor = 'var(--border)'; });
        b.style.background = 'var(--primary-light)'; b.style.borderColor = 'var(--primary)';
        draw(container);
      });
      box.appendChild(b);
    });
  };
  createPicker('#mHeroes', HEROES, 'hero');
  createPicker('#mGoals', GOALS, 'goal');

  // Event listeners
  container.querySelector('#mTitle').addEventListener('input', e => { state.title = e.target.value; draw(container); });
  container.querySelector('#mFs').addEventListener('input', e => { state.fontPt = +e.target.value; container.querySelector('#fsVal').textContent = state.fontPt; draw(container); });
  container.querySelector('#mW').addEventListener('change', e => { state.W = Math.max(5, Math.min(100, +e.target.value)); draw(container); });
  container.querySelector('#mH').addEventListener('change', e => { state.H = Math.max(5, Math.min(100, +e.target.value)); draw(container); });
  container.querySelector('#mSeed').addEventListener('change', e => { state.seed = Math.max(1, +e.target.value); draw(container); });
  container.querySelector('#mSol').addEventListener('change', e => { state.showSolution = e.target.checked; draw(container); });
  
  container.querySelector('#mNew').addEventListener('click', () => {
    state.seed = Math.floor(Math.random()*1e9)+1;
    container.querySelector('#mSeed').value = state.seed;
    draw(container);
  });
  container.querySelector('#mPdf').addEventListener('click', () => exportPdf(container, false));
  container.querySelector('#mAns').addEventListener('click', () => exportPdf(container, true));

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
  ctx.font = `${size*0.85*k}px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
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
  ctx.fillStyle = '#1f2a44'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const lines = wrapLines(ctx, state.title, areaW*k);
  const lh = fpx * 1.25;
  lines.forEach((ln, i) => ctx.fillText(ln, 105*k, M*k + i*lh));
  const titleBottom = M + (lines.length * lh) / k;

  const footH = 7;
  ctx.font = `${8*0.3528*k}px ${FONT}`;
  ctx.fillStyle = '#7b869c'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
  const lang = getLang();
  const footText = lang === 'uz' ? `Labirint raqami: ${state.seed} (${state.W}×${state.H})` 
               : (lang === 'ru' ? `Лабиринт № ${state.seed} (${state.W}×${state.H})` : `Maze # ${state.seed} (${state.W}×${state.H})`);
  ctx.fillText(footText, (210-M)*k, (297-M)*k);

  const top = titleBottom + (lines.length ? 8 : 0);
  const areaH = (297 - M - footH) - top;
  const bb = m.bbox, gw = bb.maxX - bb.minX + 1, gh = bb.maxY - bb.minY + 1;
  const cell0 = Math.min(areaW / gw, areaH / gh);
  const S = Math.min(14, Math.max(9, cell0 * 0.95));
  const pad = [0, 0, 0, 0];
  pad[m.sDir] = S + 1; pad[m.eDir] = Math.max(pad[m.eDir], S + 1);
  const cell = Math.min((areaW - pad[1] - pad[3]) / gw, (areaH - pad[0] - pad[2]) / gh);
  const contentW = gw*cell + pad[1] + pad[3], contentH = gh*cell + pad[0] + pad[2];
  const ox = 105 - contentW/2 + pad[3] - bb.minX*cell;
  const oy = top + (areaH - contentH)/2 + pad[0] - bb.minY*cell;

  const gate = (x, y, d) => (x === m.start[0] && y === m.start[1] && d === m.sDir) || (x === m.end[0] && y === m.end[1] && d === m.eDir);
  ctx.strokeStyle = '#1f2a44';
  ctx.lineWidth = Math.min(0.9, Math.max(0.3, cell*0.09)) * k;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
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

  if (showSolution) {
    ctx.strokeStyle = 'rgba(229,72,77,.85)';
    ctx.lineWidth = Math.min(2, Math.max(0.5, cell * 0.22)) * k;
    ctx.beginPath();
    [sp, ...m.path.map(ctr), ep].forEach(([px, py], i) => { i ? ctx.lineTo(px*k, py*k) : ctx.moveTo(px*k, py*k); });
    ctx.stroke();
  }

  drawMarker(ctx, state.hero, sp[0], sp[1], S, k);
  drawMarker(ctx, state.goal, ep[0], ep[1], S, k);
  return { cell, S };
}

function draw(container) {
  const canvas = container.querySelector('#mCanvas');
  drawSheet(canvas, 1240/210, state.showSolution);
}

export function exportPdf(container, withSolution) {
  const c = document.createElement('canvas');
  drawSheet(c, 300/25.4, withSolution); // 300 DPI
  c.toBlob(async blob => {
    const jpeg = new Uint8Array(await blob.arrayBuffer());
    const lang = getLang();
    const fileName = lang === 'uz' ? (withSolution ? `${state.seed} raqamli labirint javobi.pdf` : `${state.seed} raqamli labirint.pdf`)
                   : (lang === 'ru' ? (withSolution ? `Лабиринт № ${state.seed} - ответ.pdf` : `Лабиринт № ${state.seed}.pdf`)
                   : (withSolution ? `Maze # ${state.seed} - answer.pdf` : `Maze # ${state.seed}.pdf`));
    const pdf = makePdf(jpeg, c.width, c.height);
    downloadPdf(pdf, fileName);
  }, 'image/jpeg', 0.93);
}
