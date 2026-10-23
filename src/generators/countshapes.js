// countshapes.js — «Shakllarni sana» (Сосчитай фигуры / Count the shapes) generatori. v2.8
// Rasmda nechta kvadrat (barcha o'lchamdagi) yoki nechta uchburchak borligini topish.
// Kvadratlar — katakli to'r (ayrim ichki chiziqlari olib tashlangan); uchburchaklar — uchidan asosga chiziqlar va
// ko'ndalang chiziqlar o'tkazilgan katta uchburchak, diagonalli kvadrat va to'rtburchaklar.
// Kafolat: javob kompyuter tomonidan to'liq sanab chiqiladi (check() qayta sanaydi).
// Qolip: IQ 2026 №20.

import { makeRng, randInt, shuffle, pickOne } from '../core/rng.js';
import { INK, MUTE, ANSWER, PT, font } from '../core/draw.js';
import { scaleOf, measureRule, drawRule, answerBox, cellBox, ruPlural } from '../core/parts.js';

const EPS = 1e-7;
// ---------- Kvadratlar: katakli to'r ----------
// segs: Set 'h,x,y' (x..x+1 da gorizontal) va 'v,x,y' (y..y+1 da vertikal)
function gridFig(w, h, remove, rand) {
  const segs = new Set();
  for (let y = 0; y <= h; y++) for (let x = 0; x < w; x++) segs.add(`h,${x},${y}`);
  for (let x = 0; x <= w; x++) for (let y = 0; y < h; y++) segs.add(`v,${x},${y}`);
  const inner = shuffle([...segs].filter(s => { const [t, x, y] = s.split(','); return t === 'h' ? +y > 0 && +y < h : +x > 0 && +x < w; }), rand);
  for (let i = 0; i < remove; i++) segs.delete(inner[i]);
  return { k: 'sq', w, h, segs: [...segs] };
}
export function countSquares(f) {
  const S = new Set(f.segs);
  let n = 0;
  for (let s = 1; s <= Math.min(f.w, f.h); s++) for (let y = 0; y + s <= f.h; y++) for (let x = 0; x + s <= f.w; x++) {
    let ok = true;
    for (let i = 0; i < s && ok; i++) ok = S.has(`h,${x + i},${y}`) && S.has(`h,${x + i},${y + s}`) && S.has(`v,${x},${y + i}`) && S.has(`v,${x + s},${y + i}`);
    if (ok) n++;
  }
  return n;
}

// ---------- Uchburchaklar: kesmalar to'plami ----------
function cevianFig(k, hs) {                                // uchidan asosga k ta chiziq, hs — ko'ndalang chiziqlar balandligi (0..1)
  const A = [0.5, 0], B = [0, 1], C = [1, 1], segs = [[A, B], [A, C], [B, C]];
  for (let i = 1; i <= k; i++) segs.push([A, [i / (k + 1), 1]]);
  for (const t of hs) segs.push([[0.5 - 0.5 * t, t], [0.5 + 0.5 * t, t]]);
  return { k: 'tri', segs };
}
function squareDiagFig(mid) {
  const P = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = [];
  for (let i = 0; i < 4; i++) segs.push([P[i], P[(i + 1) % 4]]);
  segs.push([P[0], P[2]], [P[1], P[3]]);
  if (mid) segs.push([[0.5, 0], [0.5, 1]], [[0, 0.5], [1, 0.5]]);
  return { k: 'tri', segs };
}
function rectDiagFig(cells) {                             // cells ta kvadratdan iborat to'rtburchak, har birida bitta diagonal
  const segs = [[[0, 0], [cells, 0]], [[0, 1], [cells, 1]]];
  for (let i = 0; i <= cells; i++) segs.push([[i, 0], [i, 1]]);
  for (let i = 0; i < cells; i++) segs.push(i % 2 ? [[i, 0], [i + 1, 1]] : [[i, 1], [i + 1, 0]]);
  return { k: 'tri', segs };
}
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
function onSeg(p, [a, b]) {
  if (Math.abs(cross(sub(b, a), sub(p, a))) > 1e-6) return false;
  const t = ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2);
  return t >= -EPS && t <= 1 + EPS;
}
function inter([a, b], [c, d]) {
  const r = sub(b, a), s = sub(d, c), den = cross(r, s);
  if (Math.abs(den) < 1e-12) return null;
  const t = cross(sub(c, a), s) / den, u = cross(sub(c, a), r) / den;
  if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return null;
  return [a[0] + t * r[0], a[1] + t * r[1]];
}
export function countTriangles(f) {
  const pts = [];
  const addP = p => { if (!pts.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-6)) pts.push(p); };
  f.segs.forEach(s => { addP(s[0]); addP(s[1]); });
  for (let i = 0; i < f.segs.length; i++) for (let j = i + 1; j < f.segs.length; j++) { const p = inter(f.segs[i], f.segs[j]); if (p) addP(p); }
  const conn = (p, q) => f.segs.some(s => onSeg(p, s) && onSeg(q, s));
  let n = 0;
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    if (!conn(pts[i], pts[j])) continue;
    for (let k = j + 1; k < pts.length; k++) {
      if (Math.abs(cross(sub(pts[j], pts[i]), sub(pts[k], pts[i]))) < 1e-6) continue;
      if (conn(pts[i], pts[k]) && conn(pts[j], pts[k])) n++;
    }
  }
  return n;
}
export const countFig = f => (f.k === 'sq' ? countSquares(f) : countTriangles(f));

// Darajalar: har biri — figura yasovchilar ro'yxati
const LEVELS = [
  { makers: [r => gridFig(2, 2, 0, r), r => gridFig(3, 2, 0, r), r => gridFig(3, 3, 0, r), r => cevianFig(1, []), r => squareDiagFig(false)], count: [4, 2, 1] },
  { makers: [r => gridFig(3, 3, 2, r), r => gridFig(4, 3, 2, r), r => cevianFig(2, []), r => cevianFig(1, [0.5]), r => rectDiagFig(2)], count: [4, 2, 1] },
  { makers: [r => gridFig(4, 4, 3, r), r => gridFig(5, 3, 3, r), r => cevianFig(2, [0.5]), r => cevianFig(3, []), r => squareDiagFig(true), r => rectDiagFig(3)], count: [4, 2, 1] },
  { makers: [r => gridFig(5, 4, 5, r), r => gridFig(5, 5, 6, r), r => cevianFig(3, [0.45]), r => cevianFig(2, [0.35, 0.7]), r => rectDiagFig(4)], count: [4, 2, 1] }
];

const Q = {
  sq: { uz: 'Nechta kvadrat?', ru: 'Сколько квадратов?', en: 'How many squares?' },
  tri: { uz: 'Nechta uchburchak?', ru: 'Сколько треугольников?', en: 'How many triangles?' }
};
const RULE = {
  uz: "Rasmdagi barcha kvadratlarni (yoki uchburchaklarni) sana: kichiklarini ham, bir nechta bo'lakdan tuzilgan kattalarini ham.",
  ru: 'Сосчитай все квадраты (или треугольники) на рисунке: и маленькие, и большие, составленные из нескольких частей.',
  en: 'Count all the squares (or triangles) in the picture: the small ones and the bigger ones made of several parts.'
};

export default {
  id: 'countshapes',
  skills: ['attention', 'spatial', 'counting'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Shakllarni sana', ru: 'Сосчитай фигуры', en: 'Count the shapes' },
  desc: {
    uz: "Rasmdagi barcha kvadratlar yoki uchburchaklar sonini toping — kattalarini ham",
    ru: 'Найдите, сколько всего квадратов или треугольников на рисунке — и больших тоже',
    en: 'Find how many squares or triangles are in the picture — big ones too'
  },
  fileBase: { uz: 'Shakllarni sana', ru: 'Сосчитай фигуры', en: 'Count the shapes' },
  defaultTitle: { uz: 'Nechta shakl bor?', ru: 'Сколько фигур?', en: 'How many shapes?' },
  options: [{ key: 'level', type: 'level', default: 1 }],
  levelHint: {
    uz: ["Kichik to'rlar, oddiy uchburchaklar", "Ayrim chiziqlari yo'q to'rlar, ikki chiziqli uchburchak", 'Katta to\'rlar, diagonallar va ko\'ndalang chiziqlar', 'Murakkab rasmlar'],
    ru: ['Маленькие сетки, простые треугольники', 'Сетки без некоторых линий, треугольник с двумя линиями', 'Большие сетки, диагонали и поперечные линии', 'Сложные рисунки'],
    en: ['Small grids, simple triangles', 'Grids with some lines missing, two-line triangles', 'Bigger grids, diagonals and cross lines', 'Tricky pictures']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level];
    const rand = makeRng(seed);
    const count = L.count[opts.perPage === 4 ? 2 : opts.perPage === 2 ? 1 : 0];
    const order = shuffle(L.makers.map((_, i) => i), rand);
    const items = [];
    for (let i = 0; i < count; i++) {
      const f = L.makers[order[i % order.length]](rand);
      items.push({ ...f, ans: countFig(f) });
    }
    return { level, seed, items };
  },

  info(p, lang) {
    const c = p.items.length;
    return { uz: `${c} ta rasm`, ru: `${c} ${ruPlural(c, 'рисунок', 'рисунка', 'рисунков')}`, en: `${c} picture${c > 1 ? 's' : ''}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box), n = p.items.length;
    const rule = measureRule(ctx, RULE[lang] || RULE.uz, box.w, scale);
    const gap = 8 * scale, H = box.h - rule.h - gap;
    const cols = n === 1 ? 1 : 2, rows = Math.ceil(n / cols);
    const cw = (box.w - (cols - 1) * gap) / cols, ch = (H - (rows - 1) * gap) / rows;
    const qH = 11 * scale;
    const side = Math.min(cw * 0.86, ch - qH - 4 * scale, 80 * scale);
    p.items.forEach((f, k) => {
      const bx = box.x + (k % cols) * (cw + gap), by = box.y + Math.floor(k / cols) * (ch + gap);
      if (n > 1) { font(ctx, 4.4 * scale, 800); ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(`${k + 1}.`, bx, by); }
      const fx = bx + (cw - side) / 2, fy = by + 3 * scale;
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.35, side * 0.008); ctx.lineCap = 'round';
      ctx.beginPath();
      if (f.k === 'sq') {
        const u = side / Math.max(f.w, f.h), ox = fx + (side - f.w * u) / 2, oy = fy + (side - f.h * u) / 2;
        for (const s of f.segs) {
          const [t, x, y] = s.split(','); const X = ox + +x * u, Y = oy + +y * u;
          if (t === 'h') { ctx.moveTo(X, Y); ctx.lineTo(X + u, Y); } else { ctx.moveTo(X, Y); ctx.lineTo(X, Y + u); }
        }
      } else {
        const xs = f.segs.flat().map(p2 => p2[0]), ys = f.segs.flat().map(p2 => p2[1]);
        const W = Math.max(...xs), Hh = Math.max(...ys), u = side / Math.max(W, Hh);
        const ox = fx + (side - W * u) / 2, oy = fy + (side - Hh * u) / 2;
        for (const [a, b] of f.segs) { ctx.moveTo(ox + a[0] * u, oy + a[1] * u); ctx.lineTo(ox + b[0] * u, oy + b[1] * u); }
      }
      ctx.stroke();
      // savol va javob katagi
      const qy = fy + side + 2 * scale;
      const q = Q[f.k][lang] || Q[f.k].uz;
      let qfs = 5 * scale, bw = 15 * scale;
      font(ctx, qfs, 800);
      let tw = ctx.measureText(q).width;
      if (tw + bw + 2 * scale > cw * 0.96) { const k = cw * 0.96 / (tw + bw + 2 * scale); qfs *= k; bw *= k; font(ctx, qfs, 800); tw = ctx.measureText(q).width; }
      const sx = bx + (cw - tw - bw - 2 * scale) / 2;
      ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(q, sx, qy + qH / 2);
      answerBox(ctx, sx + tw + 2 * scale, qy + 0.8 * scale, bw, qH - 1.6 * scale, scale, showSolution ? f.ans : undefined);
    });
    drawRule(ctx, rule, box.x + box.w / 2, box.y + H + gap * 0.5);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const T = { uz: `Rasmlar: ${p.items.length}`, ru: `Рисунков: ${p.items.length}`, en: `Pictures: ${p.items.length}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    p.items.forEach((f, i) => {
      if (countFig(f) !== f.ans) problems.push(`#${i}: count mismatch`);
      if (f.ans < 3) problems.push(`#${i}: too few shapes`);
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-countshapes" aria-hidden="true"><defs><linearGradient id="cg-countshapes" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d4fc79"/><stop offset="1" stop-color="#96e6a1"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-countshapes)"/><rect x="50" y="32" width="100" height="100" fill="#fff"/><path d="M100 32v100M50 82h100" stroke="#111827" stroke-width="4"/><rect x="50" y="32" width="100" height="100" fill="none" stroke="#111827" stroke-width="5"/><rect class="cs-a" x="46" y="28" width="108" height="108" fill="none" stroke="#DC2626" stroke-width="4" stroke-dasharray="10 6"/><text x="86" y="170" font-family="Nunito, sans-serif" font-weight="900" font-size="24" text-anchor="middle" fill="#111827">= </text><text class="cs-b" x="114" y="171" font-family="Nunito, sans-serif" font-weight="900" font-size="28" text-anchor="middle" fill="#DC2626">5</text></svg>`
};
