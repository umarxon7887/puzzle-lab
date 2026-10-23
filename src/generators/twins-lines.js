// twins-lines.js — «Aynan bir xil ikkitasi» generatorining «Katta bolalar» darajasi (v2.8).
// Namuna — 4×4 nuqtali to'rdagi murakkab siniq chiziqli rasm (+ ikkita kichik doiracha). Yonida 5 ta rasm:
// bittasi namunaning aynan o'zi, qolganlari bitta mayda joyda farq qiladi (bir chiziq boshqa joyda, diagonal
// teskari, doiracha siljigan yoki bo'yalishi boshqa, butun rasm ko'zgudagidek).
// Qolip: «Fazoviy tasavvur» 1-varaq (mayda farqli chiziqli rasmlar).
// Kafolat (checkLines()): variantlardan faqat bittasi namunaga teng, qolganlari namunadan ham, bir-biridan ham farqli.

import { shuffle, pickOne } from '../core/rng.js';
import { INK } from '../core/draw.js';

const G = 4;                                            // to'r: 0..3
const segKey = (a, b) => { const [p, q] = a[0] * 10 + a[1] <= b[0] * 10 + b[1] ? [a, b] : [b, a]; return `${p[0]},${p[1]}-${q[0]},${q[1]}`; };
const parseSeg = k => k.split('-').map(s => s.split(',').map(Number));
const inGrid = ([x, y]) => x >= 0 && y >= 0 && x < G && y < G;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
export const figKey = f => JSON.stringify([f.segs.slice().sort(), f.dots.map(d => `${d.x},${d.y},${d.fill}`).sort()]);

function baseFigure(rand) {
  for (let guard = 0; guard < 200; guard++) {
    const segs = new Set();
    let cur = [Math.floor(rand() * G), Math.floor(rand() * G)];
    const len = 9 + Math.floor(rand() * 3);
    for (let s = 0, tries = 0; s < len && tries < 200; tries++) {
      const d = pickOne(rand, DIRS), nx = [cur[0] + d[0], cur[1] + d[1]];
      if (!inGrid(nx)) continue;
      const k = segKey(cur, nx);
      if (segs.has(k)) continue;
      segs.add(k); cur = nx; s++;
    }
    const nodes = [...segs].flatMap(parseSeg);
    const xs = nodes.map(p => p[0]), ys = nodes.map(p => p[1]);
    if (Math.max(...xs) - Math.min(...xs) < 2 || Math.max(...ys) - Math.min(...ys) < 2 || segs.size < 9) continue;
    const free = shuffle(Array.from({ length: G * G }, (_, i) => [i % G, Math.floor(i / G)]), rand);
    const dots = [{ x: free[0][0], y: free[0][1], fill: 'solid' }, { x: free[1][0], y: free[1][1], fill: 'empty' }];
    return { segs: [...segs], dots };
  }
  throw new Error('twins: no line figure');
}

// Bitta mayda o'zgarish
function mutate(f, rand) {
  const kind = pickOne(rand, ['move', 'move', 'diag', 'dot', 'fill', 'mirror']);
  const g = { segs: f.segs.slice(), dots: f.dots.map(d => ({ ...d })) };
  if (kind === 'move') {
    const i = Math.floor(rand() * g.segs.length);
    const nodes = [...new Set(g.segs.flatMap(k => parseSeg(k).map(p => p.join(','))))].map(s => s.split(',').map(Number));
    const a = pickOne(rand, nodes), d = pickOne(rand, DIRS), b = [a[0] + d[0], a[1] + d[1]];
    const k = inGrid(b) ? segKey(a, b) : null;
    if (!k || g.segs.includes(k)) return null;
    g.segs.splice(i, 1, k);
    return g;
  }
  if (kind === 'diag') {
    const diags = g.segs.map((k, i) => [k, i]).filter(([k]) => { const [p, q] = parseSeg(k); return p[0] !== q[0] && p[1] !== q[1]; });
    if (!diags.length) return null;
    const [k, i] = pickOne(rand, diags), [p, q] = parseSeg(k);
    const other = segKey([p[0], q[1]], [q[0], p[1]]);
    if (g.segs.includes(other)) return null;
    g.segs[i] = other;
    return g;
  }
  if (kind === 'dot') {
    const d = pickOne(rand, g.dots), m = pickOne(rand, DIRS.slice(0, 4)), n = [d.x + m[0], d.y + m[1]];
    if (!inGrid(n) || g.dots.some(o => o.x === n[0] && o.y === n[1])) return null;
    d.x = n[0]; d.y = n[1];
    return g;
  }
  if (kind === 'fill') { const d = pickOne(rand, g.dots); d.fill = d.fill === 'solid' ? 'empty' : 'solid'; return g; }
  // ko'zgu aksi
  g.segs = g.segs.map(k => { const [p, q] = parseSeg(k); return segKey([G - 1 - p[0], p[1]], [G - 1 - q[0], q[1]]); });
  g.dots.forEach(d => { d.x = G - 1 - d.x; });
  return g;
}

export function linesPuzzle(rand) {
  const sample = baseFigure(rand);
  const keys = new Set([figKey(sample)]), opts = [{ ...sample }];
  for (let guard = 0; opts.length < 5 && guard < 500; guard++) {
    const m = mutate(sample, rand);
    if (!m || keys.has(figKey(m))) continue;
    keys.add(figKey(m)); opts.push(m);
  }
  const order = shuffle([0, 1, 2, 3, 4], rand);
  return { sample, options: order.map(i => opts[i]), ans: order.indexOf(0) };
}

export function drawLineFig(ctx, f, x, y, c) {
  const pad = c * 0.16, st = (c - 2 * pad) / (G - 1);
  const P = ([gx, gy]) => [x + pad + gx * st, y + pad + gy * st];
  ctx.save();
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.3, c * 0.028); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  for (const k of f.segs) { const [a, b] = parseSeg(k).map(P); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
  ctx.stroke();
  for (const d of f.dots) {
    const [cx, cy] = P([d.x, d.y]);
    ctx.beginPath(); ctx.arc(cx, cy, c * 0.055, 0, Math.PI * 2);
    ctx.fillStyle = d.fill === 'solid' ? INK : '#fff'; ctx.fill();
    ctx.lineWidth = Math.max(0.25, c * 0.02); ctx.stroke();
  }
  ctx.restore();
}

export function checkLines(pz) {
  const out = [];
  const s = figKey(pz.sample), keys = pz.options.map(figKey);
  if (keys.filter(k => k === s).length !== 1) out.push('sample match count');
  if (keys[pz.ans] !== s) out.push('wrong answer index');
  if (new Set(keys).size !== keys.length) out.push('repeated option');
  if (pz.options.length !== 5) out.push('option count');
  return out;
}
