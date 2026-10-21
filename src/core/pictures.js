// pictures.js — konturli rasmlar (picture-data.js) bilan ishlash: chizish, siluet (soya), ko'zgu simmetriyasi.
//
// Rasm 0–100 o'lchovda, markazda. Kontur — chiziqning ikki cheti: tashqi chegaralar bir yo'nalishda,
// ichki teshiklar teskari yo'nalishda aylanadi. Shuning uchun:
//   • oddiy rasm — barcha konturlar "evenodd" bilan bo'yaladi (chiziqning o'zi qoladi);
//   • siluet — faqat tashqi yo'nalishdagi konturlar "nonzero" bilan bo'yaladi (ichi to'liq to'ladi).

import { ICONS } from './picture-data.js';

export { ICONS };
export const PIC_KEYS = Object.keys(ICONS);

const cache = new Map();
const signedArea = p => { let a = 0; for (let i = 0; i < p.length; i += 2) { const j = (i + 2) % p.length; a += p[i] * p[j + 1] - p[j] * p[i + 1]; } return a / 2; };

// Konturlar: { all: [[x,y,x,y…]…], outer: [...] } — outer: tashqi yo'nalishdagilar (siluet uchun)
export function picPolys(key) {
  let c = cache.get(key);
  if (c) return c;
  const all = ICONS[key].d.split('M').map(s => s.replace('Z', '').trim()).filter(Boolean).map(s => s.split(/\s+/).map(Number));
  const areas = all.map(signedArea);
  let big = 0;
  areas.forEach((a, i) => { if (Math.abs(a) > Math.abs(areas[big])) big = i; });
  const sign = Math.sign(areas[big]);
  const outer = all.filter((_, i) => Math.sign(areas[i]) === sign);
  // Siluet bo'yicha o'lchamlar: bo'yi/eni nisbati va to'ldirish darajasi (o'xshash siluetlarni topish uchun)
  let x0 = 100, y0 = 100, x1 = 0, y1 = 0;
  for (const p of all) for (let i = 0; i < p.length; i += 2) { x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]); y0 = Math.min(y0, p[i + 1]); y1 = Math.max(y1, p[i + 1]); }
  const fillArea = Math.abs(signedArea(all[big]));
  c = { all, outer, box: [x0, y0, x1, y1], aspect: (x1 - x0) / (y1 - y0), fill: fillArea / ((x1 - x0) * (y1 - y0)) };
  cache.set(key, c);
  return c;
}

export const picName = (key, lang) => ICONS[key][lang] || ICONS[key].uz;
export const picGroup = key => ICONS[key].group || '';

// Rasm nuqtasini (0–100) varaqqa o'tkazuvchi funksiya: markaz (cx, cy), o'lcham size (mm), burchak, ko'zgu
export function picMap(cx, cy, size, rot = 0, flip = false) {
  const a = rot * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), f = flip ? -1 : 1, k = size / 100;
  return (u, v) => {
    const x = (u - 50) * k * f, y = (v - 50) * k;
    return [cx + x * c - y * s, cy + x * s + y * c];
  };
}

// Rasmni chizish. map — picMap(...) yoki o'zingizning funksiyangiz; silhouette — soya (to'liq bo'yalgan)
export function drawPic(ctx, key, map, color, silhouette = false) {
  const P = picPolys(key);
  ctx.beginPath();
  for (const poly of silhouette ? P.outer : P.all) {
    for (let i = 0; i < poly.length; i += 2) {
      const [x, y] = map(poly[i], poly[i + 1]);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
  ctx.fillStyle = color;
  ctx.fill(silhouette ? 'nonzero' : 'evenodd');
}

// Ko'zgu aksi asl rasmdan qanchalik farq qiladi (0 — to'liq simmetrik). Tashqi chegara nuqtalari bo'yicha
// o'rtacha masofa (0–100 o'lchovda). ~4.5 dan katta bo'lsa — ko'zgu aksini bolalar aniq farqlay oladi.
const mirrorCache = new Map();
export function mirrorDiff(key) {
  if (typeof ICONS[key].m === 'number') return ICONS[key].m;     // oldindan hisoblangan (picture-data.js)
  return computeMirrorDiff(key);
}
export function computeMirrorDiff(key) {
  if (mirrorCache.has(key)) return mirrorCache.get(key);
  const P = picPolys(key);
  const cx = (P.box[0] + P.box[2]) / 2;
  const pts = [];
  for (const poly of P.outer) {
    for (let i = 0; i < poly.length; i += 2) {
      const j = (i + 2) % poly.length;
      const dx = poly[j] - poly[i], dy = poly[j + 1] - poly[i + 1], n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 1.5));
      for (let t = 0; t < n; t++) pts.push([poly[i] + dx * t / n, poly[i + 1] + dy * t / n]);
    }
  }
  const step = Math.max(1, Math.floor(pts.length / 400));
  const sample = pts.filter((_, i) => i % step === 0);
  let sum = 0;
  for (const [x, y] of sample) {
    const mx = 2 * cx - x;
    let best = Infinity;
    for (const [u, v] of pts) { const d = (u - mx) * (u - mx) + (v - y) * (v - y); if (d < best) best = d; }
    sum += Math.sqrt(best);
  }
  const r = sum / sample.length;
  mirrorCache.set(key, r);
  return r;
}
export const isAsymmetric = key => mirrorDiff(key) > 4.5;

// Siluetlari bir-biriga o'xshashlik darajasi (kichik — o'xshash): bo'yi/eni nisbati va to'ldirish darajasi
export function silhouetteDistance(a, b) {
  const A = picPolys(a), B = picPolys(b);
  return Math.abs(Math.log(A.aspect / B.aspect)) + Math.abs(A.fill - B.fill) * 1.5;
}
