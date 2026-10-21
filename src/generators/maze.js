// maze.js — Labirint generatori.
// Algoritm: "Recursive Backtracker" (DFS) — har qanday ikki katak orasida aynan bitta yo'l bor
// (mukammal labirint). Kirish va chiqish shaklning bir-biridan eng uzoq chetlarida.
// To'g'ri yo'l BFS bilan topiladi va javob varag'ida qizil chiziq bilan chiziladi.

import { makeRng } from '../core/rng.js';
import { INK, EMOJI_FONT } from '../core/draw.js';

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];        // shimol, sharq, janub, g'arb
export const HEROES = ['🦸', '🧒', '👧', '🐱', '🐶', '🐰', '🦊', '🐻', '🐼', '🐸', '🤖', '🚀'];
export const GOALS = ['🏁', '🏠', '🏰', '🍎', '🍯', '🥕', '🎁', '⭐', '🌳', '🦴', '🧀', '🍦'];
const LEVEL_SIZES = [[10, 14], [20, 28], [35, 49], [60, 85]];   // eni × bo'yi (kataklar)

// ---------- Shakllar: [-1, 1] oralig'idagi ko'pburchaklar (y pastga qarab o'sadi) ----------
function regular(n, rot) {
  return Array.from({ length: n }, (_, i) => { const t = rot + i * 2 * Math.PI / n; return [Math.cos(t), Math.sin(t)]; });
}
function starPts() {
  const p = [];
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.42 : 1, t = -Math.PI / 2 + i * Math.PI / 5; p.push([r * Math.cos(t), r * Math.sin(t)]); }
  return p;
}
function heartPts() {
  const p = [];
  for (let i = 0; i < 72; i++) {
    const t = i * 2 * Math.PI / 72;
    p.push([16 * Math.pow(Math.sin(t), 3), -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]);
  }
  const xs = p.map(q => q[0]), ys = p.map(q => q[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const sc = 2 / Math.max(maxX - minX, maxY - minY), cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  return p.map(([x, y]) => [(x - cx) * sc, (y - cy) * sc]);
}
const SHAPES = {
  rect: null,
  circle: regular(48, 0),
  star: starPts(),
  heart: heartPts(),
  triangle: [[0, -1], [1, 0.75], [-1, 0.75]],
  diamond: [[0, -1], [1, 0], [0, 1], [-1, 0]],
  house: [[0, -1], [1, -0.15], [0.72, -0.15], [0.72, 0.9], [-0.72, 0.9], [-0.72, -0.15], [-1, -0.15]],
  hexagon: regular(6, Math.PI / 6)
};
const SHAPE_NAMES = {
  rect: { uz: "To'rtburchak", ru: 'Прямоугольник', en: 'Rectangle' },
  circle: { uz: 'Doira', ru: 'Круг', en: 'Circle' },
  star: { uz: 'Yulduz', ru: 'Звезда', en: 'Star' },
  heart: { uz: 'Yurak', ru: 'Сердце', en: 'Heart' },
  triangle: { uz: 'Uchburchak', ru: 'Треугольник', en: 'Triangle' },
  diamond: { uz: 'Romb', ru: 'Ромб', en: 'Diamond' },
  house: { uz: 'Uy', ru: 'Домик', en: 'House' },
  hexagon: { uz: 'Oltiburchak', ru: 'Шестиугольник', en: 'Hexagon' }
};

function shapeIcon(key) {
  const pts = SHAPES[key] || [[-0.75, -0.95], [0.75, -0.95], [0.75, 0.95], [-0.75, 0.95]];
  const p = pts.map(([x, y]) => `${(15 + x * 13).toFixed(1)},${(15 + y * 13).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 30 30" aria-hidden="true"><polygon points="${p}" fill="currentColor"/></svg>`;
}

function inPoly(x, y, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
  }
  return c;
}

// Qaysi kataklar shakl ichida ekanini aniqlaydi (eng katta bog'langan qism qoldiriladi).
// Natija: W*H uzunlikdagi 0/1 massiv.
function makeMask(W, H, shape) {
  const all = new Array(W * H).fill(1);
  const poly = SHAPES[shape];
  if (!poly) return all;
  const m = Math.min(W, H) / 2;
  const inn = new Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) inn[y * W + x] = inPoly((x + 0.5 - W / 2) / m, (y + 0.5 - H / 2) / m, poly);
  const comp = new Array(W * H).fill(-1);
  let best = -1, bestSize = 0, id = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inn[y * W + x] || comp[y * W + x] >= 0) continue;
    let size = 0; const q = [[x, y]]; comp[y * W + x] = id;
    for (let i = 0; i < q.length; i++) {
      const [cx, cy] = q[i]; size++;
      for (const [dx, dy] of DIRS) {
        const nx = cx + dx, ny = cy + dy;
        if (nx >= 0 && ny >= 0 && nx < W && ny < H && inn[ny * W + nx] && comp[ny * W + nx] < 0) { comp[ny * W + nx] = id; q.push([nx, ny]); }
      }
    }
    if (size > bestSize) { bestSize = size; best = id; }
    id++;
  }
  if (bestSize < 12) return all;                     // shakl juda kichik bo'lsa — oddiy to'rtburchak
  return comp.map(c => (c === best ? 1 : 0));
}

// ---------- Labirintni qurish ----------
// Natija oddiy ma'lumot (JSON'ga aylantirsa bo'ladi):
//   mask[y*W+x] = 1 — katak labirint ichida; open[y*W+x] — ochiq tomonlar (bit d = DIRS[d] tomonga yo'l bor)
function build(W, H, seed, shape) {
  const rand = makeRng(seed);
  const mask = makeMask(W, H, shape);
  const isIn = (x, y) => x >= 0 && y >= 0 && x < W && y < H && mask[y * W + x] === 1;
  const cells = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (mask[y * W + x]) cells.push([x, y]);
  const open = new Array(W * H).fill(0);
  const seen = new Uint8Array(W * H);

  // Recursive Backtracker (stek bilan), faqat shakl ichidagi kataklarda
  const s0 = cells[Math.floor(rand() * cells.length)];
  const stack = [s0];
  seen[s0[1] * W + s0[0]] = 1;
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const nb = [];
    DIRS.forEach(([dx, dy], d) => { if (isIn(x + dx, y + dy) && !seen[(y + dy) * W + x + dx]) nb.push(d); });
    if (!nb.length) { stack.pop(); continue; }
    const d = nb[Math.floor(rand() * nb.length)];
    const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
    open[y * W + x] |= 1 << d;
    open[ny * W + nx] |= 1 << ((d + 2) % 4);
    seen[ny * W + nx] = 1;
    stack.push([nx, ny]);
  }

  // BFS: berilgan katakdan barcha kataklargacha eng qisqa yo'llar
  function bfs(fx, fy) {
    const dist = new Int32Array(W * H).fill(-1);
    const prev = new Int32Array(W * H).fill(-1);
    dist[fy * W + fx] = 0;
    const q = [[fx, fy]];
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      for (let d = 0; d < 4; d++) {
        if (!(open[y * W + x] & (1 << d))) continue;
        const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
        if (dist[ny * W + nx] < 0) { dist[ny * W + nx] = dist[y * W + x] + 1; prev[ny * W + nx] = y * W + x; q.push([nx, ny]); }
      }
    }
    return prev;
  }

  // Kirish va chiqish — labirint chetida, shaklning eng uzoq uchlarida
  const isEdge = (x, y) => DIRS.some(([dx, dy]) => !isIn(x + dx, y + dy));
  const mx = cells.reduce((t, c) => t + c[0], 0) / cells.length;
  const my = cells.reduce((t, c) => t + c[1], 0) / cells.length;
  const dc = c => Math.hypot(c[0] - mx, c[1] - my);
  const edge = cells.filter(c => isEdge(c[0], c[1]));
  const maxD = Math.max(...edge.map(dc));
  const far = edge.filter(c => dc(c) >= 0.8 * maxD);
  const a = far[Math.floor(rand() * far.length)];
  let e = null, bestD = -1;
  far.forEach(c => { const d = Math.hypot(c[0] - a[0], c[1] - a[1]); if (c !== a && d > bestD) { bestD = d; e = c; } });
  if (!e) e = edge.find(c => c !== a) || cells.find(c => c !== a);
  const prev = bfs(a[0], a[1]);
  // Chiqish yo'nalishi: markazdan eng uzoqqa qaragan tashqi tomon
  const outDir = c => {
    let best = 0, bs = -Infinity;
    for (let d = 0; d < 4; d++) {
      if (isIn(c[0] + DIRS[d][0], c[1] + DIRS[d][1])) continue;
      const sc = DIRS[d][0] * (c[0] - mx) + DIRS[d][1] * (c[1] - my);
      if (sc > bs) { bs = sc; best = d; }
    }
    return best;
  };

  const path = [];
  for (let i = e[1] * W + e[0]; i >= 0; i = prev[i]) path.push([i % W, (i / W) | 0]);
  path.reverse();                                    // boshidan oxirigacha

  let minX = W, maxX = 0, minY = H, maxY = 0;
  cells.forEach(([x, y]) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); });
  return { W, H, mask, open, start: a, end: e, sDir: outDir(a), eDir: outDir(e), path, bbox: { minX, maxX, minY, maxY }, count: cells.length };
}

const clampInt = (v, lo, hi, def) => { v = Math.round(+v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def; };

// ---------- Generator ----------
export default {
  id: 'maze',
  skills: ['spatial', 'attention', 'motor'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Labirint', ru: 'Лабиринт', en: 'Maze' },
  desc: {
    uz: "Qahramonga manzilga yo'l topishga yordam beradigan labirint",
    ru: 'Лабиринт: помоги герою найти дорогу к цели',
    en: 'Help the hero find the way to the goal'
  },
  fileBase: { uz: 'labirint', ru: 'Лабиринт', en: 'Maze' },
  defaultTitle: {
    uz: "Qahramonga manzilga yo'l topishga yordam ber!",
    ru: 'Помоги герою найти дорогу!',
    en: 'Help the hero find the way!'
  },
  options: [
    { key: 'level', type: 'level', default: 1 },
    {
      key: 'shape', type: 'choice', style: 'icons', pack: 'random', default: 'rect',
      label: { uz: 'Labirint shakli', ru: 'Форма лабиринта', en: 'Maze shape' },
      choices: Object.keys(SHAPES).map(k => ({ value: k, label: SHAPE_NAMES[k], icon: shapeIcon(k) }))
    },
    {
      key: 'hero', type: 'emoji', pack: 'random', default: HEROES[0],
      label: { uz: 'Qahramon', ru: 'Герой', en: 'Hero' }, choices: HEROES
    },
    {
      key: 'goal', type: 'emoji', pack: 'random', default: GOALS[0],
      label: { uz: 'Manzil', ru: 'Цель', en: 'Goal' }, choices: GOALS
    },
    // Qo'shimcha sozlamalar oynasida: o'lcham darajaga qarab qo'yiladi, xohlasa o'zgartiradi
    {
      key: 'w', type: 'number', advanced: true, min: 5, max: 100, fromLevel: lv => LEVEL_SIZES[lv][0],
      label: { uz: 'Eni (katak)', ru: 'Ширина (клеток)', en: 'Width (cells)' }
    },
    {
      key: 'h', type: 'number', advanced: true, min: 5, max: 100, fromLevel: lv => LEVEL_SIZES[lv][1],
      label: { uz: "Bo'yi (katak)", ru: 'Высота (клеток)', en: 'Height (cells)' }
    }
  ],

  // opts: { level, shape, hero, goal, w, h, aspect: 'portrait' | 'landscape' }
  generate(opts, seed) {
    const level = clampInt(opts.level, 0, 3, 1);
    let W = clampInt(opts.w ?? LEVEL_SIZES[level][0], 5, 100, LEVEL_SIZES[level][0]);
    let H = clampInt(opts.h ?? LEVEL_SIZES[level][1], 5, 100, LEVEL_SIZES[level][1]);
    if (opts.aspect === 'landscape' && W < H) [W, H] = [H, W];     // yotiq joy uchun labirint ham yotiq
    const shape = opts.shape in SHAPES ? opts.shape : 'rect';
    const m = build(W, H, seed, shape);
    return {
      ...m, seed, level, shape,
      hero: HEROES.includes(opts.hero) ? opts.hero : HEROES[0],
      goal: GOALS.includes(opts.goal) ? opts.goal : GOALS[0]
    };
  },

  // Varaq pastidagi qisqa ma'lumot: "10×14, Yulduz"
  info(p, lang) {
    return `${p.W}×${p.H}` + (p.shape === 'rect' ? '' : ', ' + (SHAPE_NAMES[p.shape][lang] || SHAPE_NAMES[p.shape].uz));
  },

  // box — millimetrda {x, y, w, h}. Kontekst millimetrga moslangan.
  draw(ctx, m, box, { showSolution }) {
    const bb = m.bbox, gw = bb.maxX - bb.minX + 1, gh = bb.maxY - bb.minY + 1;
    const W = m.W;
    const isIn = (x, y) => x >= 0 && y >= 0 && x < m.W && y < m.H && m.mask[y * W + x] === 1;
    const isOpen = (x, y, d) => (m.open[y * W + x] & (1 << d)) !== 0;
    const cell0 = Math.min(box.w / gw, box.h / gh);
    const S = Math.min(14, Math.max(7, cell0 * 0.95));          // stiker o'lchami, mm
    const pad = [0, 0, 0, 0];                                    // shimol, sharq, janub, g'arb
    pad[m.sDir] = S + 1; pad[m.eDir] = Math.max(pad[m.eDir], S + 1);
    const cell = Math.min((box.w - pad[1] - pad[3]) / gw, (box.h - pad[0] - pad[2]) / gh);
    const contentW = gw * cell + pad[1] + pad[3], contentH = gh * cell + pad[0] + pad[2];
    const ox = box.x + (box.w - contentW) / 2 + pad[3] - bb.minX * cell;
    const oy = box.y + (box.h - contentH) / 2 + pad[0] - bb.minY * cell;

    ctx.save();
    // Devorlar (kirish va chiqishda devor ochiq)
    const gate = (x, y, d) => (x === m.start[0] && y === m.start[1] && d === m.sDir) || (x === m.end[0] && y === m.end[1] && d === m.eDir);
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.min(0.9, Math.max(0.25, cell * 0.09));
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let y = bb.minY; y <= bb.maxY; y++) {
      for (let x = bb.minX; x <= bb.maxX; x++) {
        if (!isIn(x, y)) continue;
        const x0 = ox + x * cell, y0 = oy + y * cell, x1 = x0 + cell, y1 = y0 + cell;
        if ((!isIn(x, y - 1) || !isOpen(x, y, 0)) && !gate(x, y, 0)) { ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); }
        if ((!isIn(x - 1, y) || !isOpen(x, y, 3)) && !gate(x, y, 3)) { ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); }
        if (!isIn(x, y + 1) && !gate(x, y, 2)) { ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); }
        if (!isIn(x + 1, y) && !gate(x, y, 1)) { ctx.moveTo(x1, y0); ctx.lineTo(x1, y1); }
      }
    }
    ctx.stroke();

    // Stikerlar labirintdan tashqarida, kirish va chiqish oldida
    const ctr = ([x, y]) => [ox + (x + 0.5) * cell, oy + (y + 0.5) * cell];
    const outside = (c, d) => { const [cx, cy] = ctr(c), off = cell / 2 + S / 2 + 0.5; return [cx + DIRS[d][0] * off, cy + DIRS[d][1] * off]; };
    const sp = outside(m.start, m.sDir), ep = outside(m.end, m.eDir);

    if (showSolution) {                                          // to'g'ri yo'l (javob varag'i)
      ctx.strokeStyle = 'rgba(220,38,38,.85)';
      ctx.lineWidth = Math.min(2, Math.max(0.45, cell * 0.22));
      ctx.beginPath();
      [sp, ...m.path.map(ctr), ep].forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.stroke();
    }

    ctx.font = `${S * 0.85}px ${EMOJI_FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = INK;
    ctx.fillText(m.hero, sp[0], sp[1]);
    ctx.fillText(m.goal, ep[0], ep[1]);
    ctx.restore();
    return { cell };
  },

  // Ekrandagi qisqa izoh (katak juda kichik bo'lsa ogohlantiradi)
  hint(m, info, lang) {
    const mm = info && info.cell ? info.cell.toFixed(1) : '?';
    const small = info && info.cell < 3;
    const T = {
      uz: [`Katak o'lchami: ${mm} mm`, " · juda mayda, bosmada qiyin ko'rinadi"],
      ru: [`Размер клетки: ${mm} мм`, ' · очень мелко, при печати трудно разглядеть'],
      en: [`Cell size: ${mm} mm`, ' · very small, may be hard to see when printed']
    }[lang] || [];
    return { text: T[0] + (small ? T[1] : ''), warn: small };
  },

  // Testlar uchun: labirint to'g'ri qurilganini tekshiradi
  check(m) {
    const W = m.W, problems = [];
    const isIn = (x, y) => x >= 0 && y >= 0 && x < m.W && y < m.H && m.mask[y * W + x] === 1;
    let edges = 0;
    for (let y = 0; y < m.H; y++) for (let x = 0; x < W; x++) {
      if (!isIn(x, y)) { if (m.open[y * W + x]) problems.push('open outside'); continue; }
      for (let d = 0; d < 4; d++) if (m.open[y * W + x] & (1 << d)) {
        const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
        if (!isIn(nx, ny)) problems.push('open to outside');
        else if (!(m.open[ny * W + nx] & (1 << ((d + 2) % 4)))) problems.push('one-way wall');
        if (d === 1 || d === 2) edges++;
      }
    }
    if (edges !== m.count - 1) problems.push(`edges ${edges} != cells-1 ${m.count - 1}`);
    const p = m.path;
    if (p[0][0] !== m.start[0] || p[0][1] !== m.start[1]) problems.push('path start');
    if (p[p.length - 1][0] !== m.end[0] || p[p.length - 1][1] !== m.end[1]) problems.push('path end');
    for (let i = 1; i < p.length; i++) {
      const dx = p[i][0] - p[i - 1][0], dy = p[i][1] - p[i - 1][1];
      const d = DIRS.findIndex(v => v[0] === dx && v[1] === dy);
      if (d < 0 || !(m.open[p[i - 1][1] * W + p[i - 1][0]] & (1 << d))) { problems.push('path broken'); break; }
    }
    for (const [c, d] of [[m.start, m.sDir], [m.end, m.eDir]]) if (isIn(c[0] + DIRS[d][0], c[1] + DIRS[d][1])) problems.push('gate not on edge');
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-maze" aria-hidden="true"><defs><linearGradient id="cg-maze" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#667eea"/><stop offset="1" stop-color="#764ba2"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-maze)"/><path d="M40 40 L40 160 L160 160" stroke="rgba(255,255,255,.3)" stroke-width="8" fill="none" stroke-linecap="round"/><path class="maze-path" d="M60 40 L60 80 L100 80 L100 120 L140 120 L140 60 L80 60 L80 140 L160 140" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle class="maze-hero" r="11" fill="#FFD700"/></svg>`
};
