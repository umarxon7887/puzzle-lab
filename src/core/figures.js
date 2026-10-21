// figures.js — geometrik shakllar: chizish uchun umumiy kod («Ortiqchasini top», «Qonuniyat», «Yetishmayotgan qism» …).
// Shakl birlik koordinatalarda ([-1, 1]) berilgan; R — radius (mm), rot — burchak (gradus).
// Element: { shape, fill: 'empty'|'solid'|'stripes'|'dotted', size, rot, dots: [[x,y]…], inner } yoki { poly, rot, mirror }.

import { INK } from './draw.js';

export const SOLID = '#374151';
// ---------- Shakllar (birlik koordinatalarda: [-1, 1]) ----------
export const TAU = Math.PI * 2;
const regular = (n, r, rot = 0) => Array.from({ length: n }, (_, i) => { const a = rot + i * TAU / n; return [r * Math.cos(a), r * Math.sin(a)]; });
function starPts() {
  return Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? 0.42 : 0.98, a = -Math.PI / 2 + i * Math.PI / 5; return [r * Math.cos(a), r * Math.sin(a)]; });
}
function heartPts() {
  const p = [];
  for (let i = 0; i < 60; i++) {
    const t = i * TAU / 60;
    p.push([16 * Math.pow(Math.sin(t), 3), -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]);
  }
  const xs = p.map(q => q[0]), ys = p.map(q => q[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const sc = 1.9 / Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  return p.map(([x, y]) => [(x - cx) * sc, (y - cy) * sc]);
}
function moonPts() {                                   // o'ngga ochilgan yarim oy
  const R1 = 0.92, R2 = 0.78, d = 0.42;
  const t0 = Math.acos((R1 * R1 + d * d - R2 * R2) / (2 * R1 * d));
  const px = R1 * Math.cos(t0), py = R1 * Math.sin(t0);
  const f0 = Math.atan2(py, px - d);
  const pts = [];
  for (let i = 0; i <= 28; i++) { const a = t0 + i * (TAU - 2 * t0) / 28; pts.push([R1 * Math.cos(a), R1 * Math.sin(a)]); }
  for (let i = 0; i <= 24; i++) { const a = (TAU - f0) - i * (TAU - 2 * f0) / 24; pts.push([d + R2 * Math.cos(a), R2 * Math.sin(a)]); }
  return pts;
}
const SQUARE = [[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8]];
export const GEOM = {
  circle: [regular(40, 0.92)],
  square: [SQUARE],
  triangle: [[[0, -0.9], [0.95, 0.75], [-0.95, 0.75]]],
  diamond: [[[0, -0.98], [0.78, 0], [0, 0.98], [-0.78, 0]]],
  star: [starPts()],
  heart: [heartPts()],
  hexagon: [regular(6, 0.94)],
  pentagon: [regular(5, 0.96, -Math.PI / 2)],
  plus: [[[-0.3, -0.92], [0.3, -0.92], [0.3, -0.3], [0.92, -0.3], [0.92, 0.3], [0.3, 0.3], [0.3, 0.92], [-0.3, 0.92], [-0.3, 0.3], [-0.92, 0.3], [-0.92, -0.3], [-0.3, -0.3]]],
  // yo'nalishli shakllar (standart holatda o'ngga qaragan)
  arrow: [[[-0.92, -0.28], [0.1, -0.28], [0.1, -0.68], [0.94, 0], [0.1, 0.68], [0.1, 0.28], [-0.92, 0.28]]],
  pointer: [[[-0.75, -0.88], [0.92, 0], [-0.75, 0.88]]],
  moon: [moonPts()],
  flag: [[[-0.74, -0.95], [-0.56, -0.95], [-0.56, 0.95], [-0.74, 0.95]], [[-0.56, -0.95], [0.86, -0.55], [-0.56, -0.12]]],
  halfcircle: [regular(40, 0.92)],
  halfsquare: [SQUARE]
};
export const HALF = {                                         // yarmi bo'yalgan shakllarning bo'yalgan qismi (o'ng yarmi)
  halfcircle: [Array.from({ length: 21 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 20; return [0.92 * Math.cos(a), 0.92 * Math.sin(a)]; })],
  halfsquare: [[[0, -0.8], [0.8, -0.8], [0.8, 0.8], [0, 0.8]]]
};
export const INNER_DY = { triangle: 0.14 };                   // ichki shaklni tashqi shaklning "ko'rinadigan" markaziga surish

export const SHAPE_NAMES = Object.keys(GEOM);
// Ko'zgu aksi uchun "chap-o'ng"li figuralar (kataklardan): ko'zgudagi aksini burib asl holiga keltirib bo'lmaydi
export const POLYS = {
  L4: [[0, 0], [0, 1], [0, 2], [1, 2]],
  S4: [[1, 0], [2, 0], [0, 1], [1, 1]],
  P5: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]],
  F5: [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]],
  Y5: [[1, 0], [0, 1], [1, 1], [1, 2], [1, 3]],
  N5: [[1, 0], [1, 1], [0, 2], [1, 2], [0, 3]],
  L5: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]]
};
export function polyCells(poly, rot, mirror) {
  let c = POLYS[poly].map(([x, y]) => [mirror ? -x : x, y]);
  for (let k = 0; k < ((rot / 90) | 0) % 4; k++) c = c.map(([x, y]) => [-y, x]);
  const mx = Math.min(...c.map(p => p[0])), my = Math.min(...c.map(p => p[1]));
  return c.map(([x, y]) => [x - mx, y - my]).sort((p, q) => p[1] - q[1] || p[0] - q[0]);
}


// ---------- Chizish ----------
export function transform(pts, cx, cy, R, rot, mirror) {
  const a = rot * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return pts.map(([x, y]) => { if (mirror) x = -x; return [cx + R * (x * c - y * s), cy + R * (x * s + y * c)]; });
}
export function pathOf(ctx, polys) {
  ctx.beginPath();
  for (const poly of polys) {
    poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  }
}
export function paint(ctx, polys, fill, cx, cy, R, lw) {
  ctx.save();
  if (fill === 'solid') { ctx.fillStyle = SOLID; pathOf(ctx, polys); ctx.fill(); }
  else {
    ctx.fillStyle = '#fff'; pathOf(ctx, polys); ctx.fill();
    if (fill === 'stripes' || fill === 'dotted') {
      ctx.save(); pathOf(ctx, polys); ctx.clip();
      ctx.fillStyle = INK; ctx.strokeStyle = INK;
      if (fill === 'stripes') {                      // 45° chiziqlar, faqat shakl atrofidagi kvadrat ichida
        ctx.lineWidth = R * 0.08; ctx.beginPath();
        for (let o = -1.95; o <= 1.95; o += 0.3) {
          const v1 = Math.max(-1, -1 - o), v2 = Math.min(1, 1 - o);
          if (v2 - v1 < 0.05) continue;
          ctx.moveTo(cx + (v1 + o) * R, cy + v1 * R); ctx.lineTo(cx + (v2 + o) * R, cy + v2 * R);
        }
        ctx.stroke();
      } else {
        // shaxmat tartibidagi zich nuqtalar — yulduz kabi ingichka shakllarda ham "nuqtali" ekani ko'rinsin
        const s = 0.27, dy = s * Math.sqrt(3) / 2;
        for (let j = -4; j <= 4; j++) for (let k = -4; k <= 4; k++) {
          const x = k * s + (j % 2 ? s / 2 : 0), y = j * dy;
          if (Math.abs(x) > 0.95 || Math.abs(y) > 0.95) continue;
          ctx.beginPath(); ctx.arc(cx + x * R, cy + y * R, R * 0.062, 0, TAU); ctx.fill();
        }
      }
      ctx.restore();
    }
  }
  ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.lineJoin = 'round';
  pathOf(ctx, polys); ctx.stroke();
  ctx.restore();
}
export function drawFigure(ctx, it, cx, cy, cell) {
  const lw = Math.max(0.22, cell * 0.026);
  if (it.poly) {                                       // kataklardan figura
    const cells = polyCells(it.poly, it.rot, it.mirror);
    const w = Math.max(...cells.map(c => c[0])) + 1, hgt = Math.max(...cells.map(c => c[1])) + 1;
    const u = cell * 0.76 / 4;
    const x0 = cx - w * u / 2, y0 = cy - hgt * u / 2;
    ctx.save();
    ctx.fillStyle = SOLID;
    cells.forEach(([x, y]) => ctx.fillRect(x0 + x * u, y0 + y * u, u, u));
    ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(0.2, u * 0.1);
    cells.forEach(([x, y]) => ctx.strokeRect(x0 + x * u, y0 + y * u, u, u));
    ctx.restore();
    return;
  }
  const R = cell * 0.38 * (it.size || 1);
  const polys = GEOM[it.shape].map(p => transform(p, cx, cy, R, it.rot || 0, false));
  if (it.dots) {                                       // nuqtalar soni
    paint(ctx, polys, 'empty', cx, cy, R, lw);
    ctx.save(); ctx.fillStyle = INK;
    for (const [x, y] of it.dots) { ctx.beginPath(); ctx.arc(cx + x * R, cy + y * R, R * 0.13, 0, TAU); ctx.fill(); }
    ctx.restore();
    return;
  }
  if (it.inner) {                                      // ichki shakl
    paint(ctx, polys, 'empty', cx, cy, R, lw);
    const iy = cy + (INNER_DY[it.shape] || 0) * R;
    const ip = GEOM[it.inner].map(p => transform(p, cx, iy, R * 0.4, 0, false));
    paint(ctx, ip, 'solid', cx, iy, R * 0.4, lw * 0.8);
    return;
  }
  paint(ctx, polys, it.fill || 'empty', cx, cy, R, lw);
  if (HALF[it.shape]) {                                // yarmi bo'yalgan
    const hp = HALF[it.shape].map(p => transform(p, cx, cy, R, it.rot || 0, false));
    ctx.save(); ctx.fillStyle = SOLID; pathOf(ctx, hp); ctx.fill(); ctx.restore();
    ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = lw; pathOf(ctx, polys); ctx.stroke(); ctx.restore();
  }
}

