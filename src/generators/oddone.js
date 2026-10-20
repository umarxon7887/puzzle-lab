// oddone.js — "Ortiqchasini top" (Odd one out) generatori.
// Har qatorda K ta rasm yoki shakl; bittasi qolganlaridan farq qiladi.
//
// Ikki turdagi qator:
//   • rasmli (emoji): ko'pchilik bir toifadan (mevalar), bittasi boshqasidan (sabzavot);
//   • shaklli: bitta xususiyat bo'yicha farq — shakl, bo'yalishi, o'lchami, yo'nalishi,
//     nuqtalar soni, ichki shakl, ko'zgu aksi.
// Kafolat (check() tekshiradi): ortiqcha element FAQAT BITTA. Asosiy xususiyatdan boshqa
// xususiyatlar qatorda yo hammasida bir xil, yo hammasida har xil, yo har bir qiymat kamida
// ikki marta uchraydi — shunda ikkinchi "ortiqcha" paydo bo'lmaydi.

import { makeRng, shuffle, pickOne } from '../core/rng.js';
import { INK, MUTE, ANSWER, PT, EMOJI_FONT, font, wrapLines, roundRect } from '../core/draw.js';
import { GROUPS, CATS, ITEMS, PAIRS_MEDIUM, PAIRS_HARD, eligible, inCat, nearCat } from './oddone-items.js';

const LEVELS = [{ K: 4, N: 6 }, { K: 5, N: 7 }, { K: 5, N: 8 }, { K: 6, N: 8 }];   // K — qatordagi soni, N — qatorlar
const SMALL_ROWS = 4;                                  // varaqda 2 yoki 4 ta bo'lsa qatorlar soni (rasmlar kichrayib ketmasin)
const SOLID = '#374151';

// ---------- Rasmlar (emoji) ----------
const TAGS = new Map(ITEMS.map(([e, ...t]) => [e, t]));
const groupOf = cat => Object.keys(GROUPS).find(g => GROUPS[g].includes(cat));
const canPair = ([a, b], K) => eligible(a, b).length >= K - 1 && eligible(b, a).length >= 1;

// Har bir daraja uchun mumkin bo'lgan [ko'pchilik, ortiqcha] juftliklari
function pairsFor(level) {
  const K = LEVELS[level].K;
  if (level === 0) {
    const cats = Object.keys(CATS), out = [];
    for (const a of cats) for (const b of cats) if (groupOf(a) !== groupOf(b)) out.push([a, b]);
    return [out.filter(p => canPair(p, K))];
  }
  if (level === 1) return [PAIRS_MEDIUM.filter(p => canPair(p, K))];
  return [PAIRS_HARD.filter(p => canPair(p, K)), PAIRS_MEDIUM.filter(p => canPair(p, K))];   // avval qiyinlari
}
const PAIRS = [0, 1, 2, 3].map(pairsFor);

// Juftliklarni ko'rib chiqish tartibi (Qiyin darajada qiyin va o'rta juftliklar navbatma-navbat)
function pairOrder(level, rand) {
  const pools = PAIRS[level].map(list => shuffle(list.slice(), rand));
  if (level !== 2) return pools.flat();
  const [hard, mid] = pools, order = [];
  for (let i = 0; i < Math.max(hard.length, mid.length); i++) order.push(...(hard[i] ? [hard[i]] : []), ...(mid[i] ? [mid[i]] : []));
  return order;
}
const pairKey = ([a, b]) => [a, b].sort().join('|');

// Varaq uchun juftliklar: iloji boricha har bir toifa bir marta (bir necha urinishda), bo'lmasa —
// ko'pchilik toifasi va juftlik takrorlanmaydi, eng oxirida — zaxira.
function choosePairs(level, count, rand) {
  let best = [];
  for (let attempt = 0; attempt < 40 && best.length < count; attempt++) {
    const used = new Set(), picked = [];
    for (const p of pairOrder(level, rand)) {
      if (picked.length >= count) break;
      if (used.has(p[0]) || used.has(p[1])) continue;
      used.add(p[0]); used.add(p[1]); picked.push(p);
    }
    if (picked.length > best.length) best = picked;
  }
  const order = pairOrder(level, rand);
  for (const strict of [true, false]) {
    for (const p of order) {
      if (best.length >= count) break;
      if (strict && best.some(q => q[0] === p[0] || pairKey(q) === pairKey(p))) continue;
      best.push(p);
    }
  }
  return best;
}

function picRows(level, count, rand) {
  const { K } = LEVELS[level];
  const usedPics = new Set(), fresh = list => list.filter(e => !usedPics.has(e));
  return choosePairs(level, count, rand).map(([a, b]) => {
    let majors = fresh(eligible(a, b)), odds = fresh(eligible(b, a));   // bir varaqda bir xil rasm takrorlanmasin
    if (majors.length < K - 1) majors = eligible(a, b);
    if (!odds.length) odds = eligible(b, a);
    const items = shuffle(majors, rand).slice(0, K - 1);
    const at = Math.floor(rand() * K);
    items.splice(at, 0, pickOne(rand, odds));
    items.forEach(e => usedPics.add(e));
    return { t: 'pic', items, odd: at, a, b };
  });
}

// ---------- Shakllar (birlik koordinatalarda: [-1, 1]) ----------
const TAU = Math.PI * 2;
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
const GEOM = {
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
const HALF = {                                         // yarmi bo'yalgan shakllarning bo'yalgan qismi (o'ng yarmi)
  halfcircle: [Array.from({ length: 21 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 20; return [0.92 * Math.cos(a), 0.92 * Math.sin(a)]; })],
  halfsquare: [[[0, -0.8], [0.8, -0.8], [0.8, 0.8], [0, 0.8]]]
};
const INNER_DY = { triangle: 0.14 };                   // ichki shaklni tashqi shaklning "ko'rinadigan" markaziga surish

const EASY_SHAPES = ['circle', 'square', 'triangle', 'star', 'heart'];
const SHAPES = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond', 'hexagon', 'pentagon', 'plus'];
const INNER_SHAPES = ['circle', 'square', 'triangle', 'diamond', 'hexagon', 'star', 'heart', 'pentagon'];
const DIR_SHAPES = ['arrow', 'pointer', 'moon', 'flag', 'halfcircle', 'halfsquare'];
const FILLS = ['empty', 'solid', 'stripes', 'dotted'];
const ROTS = [0, 90, 180, 270];

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

// Ikkinchi "ortiqcha" paydo bo'lmasligi uchun shovqin: har qiymat kamida 2 marta yoki hammasi har xil
function balanced(K, pool, rand, allowDistinct = true) {
  if (allowDistinct && pool.length >= K && rand() < 0.5) return shuffle(pool.slice(), rand).slice(0, K);
  const parts = { 4: [[2, 2]], 5: [[3, 2], [2, 3]], 6: [[2, 2, 2], [3, 3], [4, 2]] }[K] || [[K]];
  let split = pickOne(rand, parts);
  if (split.length > pool.length) split = [K];
  const vals = shuffle(pool.slice(), rand);
  const out = [];
  split.forEach((n, i) => { for (let j = 0; j < n; j++) out.push(vals[i]); });
  return shuffle(out, rand);
}
const two = (pool, rand) => { const s = shuffle(pool.slice(), rand); return [s[0], s[1]]; };
const DICE = {
  1: [[0, 0]], 2: [[-0.4, -0.4], [0.4, 0.4]], 3: [[-0.42, -0.42], [0, 0], [0.42, 0.42]],
  4: [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]], 5: [[-0.42, -0.42], [0.42, -0.42], [0, 0], [-0.42, 0.42], [0.42, 0.42]],
  6: [[-0.4, -0.46], [0.4, -0.46], [-0.4, 0], [0.4, 0], [-0.4, 0.46], [0.4, 0.46]]
};
function randomDots(n, shape, rand) {                  // ustma-ust tushmaydigan tasodifiy nuqtalar
  const g = [-0.51, -0.17, 0.17, 0.51];
  let slots = [];
  for (const y of g) for (const x of g) slots.push([x, y]);
  if (shape === 'circle') slots = slots.filter(([x, y]) => Math.hypot(x, y) < 0.62);
  return shuffle(slots, rand).slice(0, n).map(([x, y]) => [+(x + (rand() - 0.5) * 0.1).toFixed(3), +(y + (rand() - 0.5) * 0.1).toFixed(3)]);
}

// Har bir qoida: K ta element va ortiqchaning o'rni. lv — daraja (0–3)
const RULES = {
  shape(K, lv, rand) {
    const [a, b] = two(lv === 0 ? EASY_SHAPES : SHAPES, rand);
    const fills = lv <= 1 ? Array(K).fill(pickOne(rand, lv === 0 ? ['empty', 'solid'] : FILLS)) : balanced(K, FILLS, rand);
    const sizes = lv >= 2 ? balanced(K, [1, 0.72], rand, false) : Array(K).fill(1);
    return (odd) => fills.map((fill, i) => ({ shape: i === odd ? b : a, fill, size: sizes[i], rot: 0 }));
  },
  fill(K, lv, rand) {
    const [f, g] = two(lv === 0 ? ['empty', 'solid'] : FILLS, rand);
    const shapes = lv >= 2 ? shuffle(SHAPES.slice(), rand).slice(0, K) : Array(K).fill(pickOne(rand, lv === 0 ? EASY_SHAPES : SHAPES));
    return (odd) => shapes.map((shape, i) => ({ shape, fill: i === odd ? g : f, size: 1, rot: 0 }));
  },
  size(K, lv, rand) {
    const shape = pickOne(rand, lv === 0 ? EASY_SHAPES : SHAPES);
    const fills = lv <= 1 ? Array(K).fill(pickOne(rand, lv === 0 ? ['empty', 'solid'] : FILLS)) : balanced(K, FILLS, rand);
    const [big, small] = rand() < 0.5 ? [1, 0.6] : [0.62, 1];
    return (odd) => fills.map((fill, i) => ({ shape, fill, size: i === odd ? small : big, rot: 0 }));
  },
  rot(K, lv, rand) {
    const shape = pickOne(rand, DIR_SHAPES);
    const r = pickOne(rand, ROTS);
    const r2 = lv <= 1 ? (r + 180) % 360 : (r + pickOne(rand, [90, 180, 270])) % 360;
    const half = shape.startsWith('half');
    const fills = half ? Array(K).fill('empty') : (lv >= 3 ? balanced(K, ['empty', 'solid', 'stripes'], rand) : Array(K).fill(pickOne(rand, ['empty', 'solid'])));
    const sizes = lv >= 2 ? balanced(K, [1, 0.72], rand, false) : Array(K).fill(1);
    return (odd) => fills.map((fill, i) => ({ shape, fill, size: sizes[i], rot: i === odd ? r2 : r }));
  },
  dots(K, lv, rand) {
    const shapes = lv >= 3 ? balanced(K, ['circle', 'square'], rand, false) : Array(K).fill(pickOne(rand, ['circle', 'square']));
    const range = [[2, 5], [2, 5], [3, 6], [4, 7]][lv];
    const n = range[0] + Math.floor(rand() * (range[1] - range[0] + 1));
    const m = n + (rand() < 0.5 ? -1 : 1);
    const lay = (k, shape) => (lv <= 1 ? DICE[k].map(p => p.slice()) : randomDots(k, shape, rand));
    return (odd) => shapes.map((shape, i) => ({ shape, dots: lay(i === odd ? m : n, shape) }));
  },
  inner(K, lv, rand) {
    const outers = shuffle(INNER_SHAPES.slice(), rand).slice(0, K);
    return (odd) => outers.map((shape, i) => ({ shape, inner: i === odd ? pickOne(rand, INNER_SHAPES.filter(s => s !== shape)) : shape }));
  },
  mirror(K, lv, rand) {
    const poly = pickOne(rand, Object.keys(POLYS));
    const rots = balanced(K, ROTS, rand, false);
    return (odd) => rots.map((rot, i) => ({ poly, rot, mirror: i === odd }));
  }
};
const RULE_BAGS = [
  ['shape', 'fill', 'size'],
  ['shape', 'fill', 'size', 'rot', 'dots'],
  ['fill', 'rot', 'dots', 'inner', 'shape', 'size'],
  ['mirror', 'inner', 'dots', 'rot', 'mirror', 'fill', 'shape', 'size']
];

function figRows(level, count, rand) {
  const { K } = LEVELS[level];
  // Avval har xil qoidalar, keyin takrorlanadiganlari: qatorlar kam bo'lsa (aralash, yotiq joy) qoidalar takrorlanmaydi
  const all = RULE_BAGS[level], uniq = [...new Set(all)];
  const extra = all.slice();
  uniq.forEach(r => extra.splice(extra.indexOf(r), 1));
  let bag = [...shuffle(uniq, rand), ...shuffle(extra, rand)];
  while (bag.length < count) bag.push(...shuffle(all.slice(), rand));
  bag = shuffle(bag.slice(0, count), rand);
  return bag.map(rule => {
    const make = RULES[rule](K, level, rand);
    const odd = Math.floor(rand() * K);
    return { t: 'fig', rule, items: make(odd), odd };
  });
}

// ---------- Matnlar ----------
const RULE_TEXT = {
  uz: 'Har bir qatorda boshqalaridan farq qiladigan bittasini top va uni aylana bilan belgila.',
  ru: 'В каждом ряду найди одну картинку, которая отличается от остальных, и обведи её.',
  en: 'In each row, find the one that does not belong and circle it.'
};
const ruPlural = (n, one, few, many) => { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? one : (a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many); };
const WHY = {
  shape: { uz: 'boshqa shakl', ru: 'другая фигура', en: 'a different shape' },
  fill: { uz: "boshqacha bo'yalgan", ru: 'закрашена по-другому', en: 'a different fill' },
  size: { uz: "o'lchami boshqa", ru: 'другой размер', en: 'a different size' },
  rot: { uz: 'boshqa tomonga qaragan', ru: 'смотрит в другую сторону', en: 'points another way' },
  inner: { uz: 'ichidagi shakl tashqisiga mos emas', ru: 'внутренняя фигура не совпадает с внешней', en: "the inner shape doesn't match the outer one" },
  mirror: { uz: "ko'zgudagi aksi: burib ustiga tushirib bo'lmaydi", ru: 'зеркальное отражение: поворотом не совместить', en: 'a mirror image: no turn makes it match' }
};
function why(row, lang) {
  if (row.t === 'pic') {
    const one = (CATS[row.b][lang] || CATS[row.b].uz)[0], many = (CATS[row.a][lang] || CATS[row.a].uz)[1];
    return { uz: `${one}, qolganlari — ${many}`, ru: `${one}, остальные — ${many}`, en: `${one}; the others are ${many}` }[lang];
  }
  if (row.rule === 'dots') {
    const m = row.items[row.odd].dots.length, n = row.items[(row.odd + 1) % row.items.length].dots.length;
    return {
      uz: `${m} ta nuqta, qolganlarida ${n} tadan`,
      ru: `${m} ${ruPlural(m, 'точка', 'точки', 'точек')}, у остальных по ${n}`,
      en: `${m} dots; the others have ${n}`
    }[lang];
  }
  return (WHY[row.rule] || {})[lang] || '';
}
const MODES = {
  pictures: { big: '🍎', label: { uz: 'Rasmlar', ru: 'Картинки', en: 'Pictures' } },
  shapes: { big: '🔷', label: { uz: 'Shakllar', ru: 'Фигуры', en: 'Shapes' } },
  mixed: { big: '🔀', label: { uz: 'Aralash', ru: 'Смешанно', en: 'Mixed' } }
};

// ---------- Chizish ----------
function transform(pts, cx, cy, R, rot, mirror) {
  const a = rot * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return pts.map(([x, y]) => { if (mirror) x = -x; return [cx + R * (x * c - y * s), cy + R * (x * s + y * c)]; });
}
function pathOf(ctx, polys) {
  ctx.beginPath();
  for (const poly of polys) {
    poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  }
}
function paint(ctx, polys, fill, cx, cy, R, lw) {
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
function drawFigure(ctx, it, cx, cy, cell) {
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

// ---------- Tekshiruv (testlar uchun) ----------
const PROPS = {
  shape: it => it.shape ?? it.poly,
  fill: it => it.fill ?? '-',
  size: it => it.size ?? 1,
  rot: it => it.rot ?? 0,
  dots: it => (it.dots ? it.dots.length : 0),
  inner: it => (it.inner === undefined ? '-' : it.inner === it.shape ? 'same' : 'diff'),
  mirror: it => !!it.mirror
};
function propOk(vals) {                                // hammasi bir xil / hammasi har xil / har qiymat ≥ 2 marta
  const cnt = new Map();
  vals.forEach(v => cnt.set(v, (cnt.get(v) || 0) + 1));
  return cnt.size === 1 || cnt.size === vals.length || [...cnt.values()].every(c => c >= 2);
}

export default {
  id: 'odd',
  name: { uz: 'Ortiqchasini top', ru: 'Найди лишнее', en: 'Odd one out' },
  desc: {
    uz: "Har qatorda bitta rasm yoki shakl boshqalaridan farq qiladi — uni toping",
    ru: 'В каждом ряду одна картинка не такая, как все — найдите её',
    en: "In every row one picture doesn't belong — find it"
  },
  fileBase: { uz: 'ortiqchasini top', ru: 'Найди лишнее', en: 'Odd one out' },
  defaultTitle: { uz: 'Ortiqchasini top!', ru: 'Найди лишнее!', en: 'Find the odd one out!' },
  options: [
    { key: 'level', type: 'level', default: 0 },
    {
      key: 'mode', type: 'choice', style: 'cards', pack: 'select', default: 'pictures',
      label: { uz: 'Turi', ru: 'Вид', en: 'Kind' },
      choices: Object.entries(MODES).map(([value, m]) => ({ value, big: m.big, label: m.label }))
    }
  ],
  levelHint: {
    uz: ['4 tadan, farqi yaqqol', "5 tadan: shakl, rang, o'lcham, yo'nalish", '5 tadan, farqi nozikroq', "6 tadan: ko'zgu aksi va murakkab qoidalar"],
    ru: ['по 4, отличие заметно сразу', 'по 5: форма, заливка, размер, направление', 'по 5, отличия тоньше', 'по 6: зеркальное отражение и сложные правила'],
    en: ['4 per row, an obvious difference', '5 per row: shape, fill, size, direction', '5 per row, subtler differences', '6 per row: mirror images and tricky rules']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const mode = opts.mode in MODES ? opts.mode : 'pictures';
    const { K } = LEVELS[level];
    const small = opts.aspect === 'landscape' || opts.perPage > 1;          // varaqda 2 yoki 4 ta — joy kichik
    const N = small ? SMALL_ROWS : LEVELS[level].N;
    const rand = makeRng(seed);
    let rows;
    if (mode === 'pictures') rows = picRows(level, N, rand);
    else if (mode === 'shapes') rows = figRows(level, N, rand);
    else {
      const nPic = Math.floor(N / 2);
      const pics = picRows(level, nPic, rand), figs = figRows(level, N - nPic, rand);
      rows = shuffle([...pics, ...figs], rand);
    }
    return { level, seed, mode, K, rows };
  },

  info(p, lang) {
    const n = p.rows.length, m = MODES[p.mode].label[lang] || MODES[p.mode].label.uz;
    return { uz: `${n} qator, ${m.toLowerCase()}`, ru: `${n} ${ruPlural(n, 'ряд', 'ряда', 'рядов')}, ${m.toLowerCase()}`, en: `${n} rows, ${m.toLowerCase()}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    const N = p.rows.length, K = p.K;
    ctx.save();
    const scale = Math.max(0.6, Math.min(1, box.w / 186));
    const ruleFs = 10.5 * PT * scale;
    font(ctx, ruleFs, 400);
    const ruleLines = wrapLines(ctx, RULE_TEXT[lang] || RULE_TEXT.uz, box.w);
    const ruleLH = ruleFs * 1.35, ruleH = ruleLines.length * ruleLH, ruleGap = 4 * scale;
    const numFs = 12 * PT * scale;
    font(ctx, numFs, 800);
    const numTW = ctx.measureText(`${N}.`).width, numW = numTW + 2.5 * scale;   // raqamlar ustuni
    const explFs = 8.5 * PT * scale, explH = explFs * 1.9;   // javobdagi izoh uchun qator (aylanalar orasida)
    // Katak ulushida: katakchalar oralig'i, javob aylanasining radiusi va katakdan chiqib turishi (chiziq qalinligi bilan)
    const GAP = 0.14, RING = 0.57, OVER = RING - 0.5 + 0.025;
    const cellW = (box.w - numW) / (K + GAP * (K - 1) + 2 * OVER);
    const cellH = (box.h - N * explH - ruleGap - ruleH) / (N * (1 + 2 * OVER));
    const cell = Math.max(3, Math.min(cellW, cellH, 34));
    const gap = cell * GAP, over = cell * OVER;
    const pitch = cell + 2 * over + explH;              // bir qator: aylana zaxirasi + katak + aylana zaxirasi + izoh
    const rowW = numW + 2 * over + K * cell + (K - 1) * gap;
    const blockH = N * pitch + ruleGap + ruleH;
    const x0 = box.x + (box.w - rowW) / 2, tx = x0 + numW + over;   // tx — birinchi katakning chap qirrasi
    let y = box.y + Math.max(0, (box.h - blockH) * 0.4) + over;      // y — qator kataklarining yuqori qirrasi

    p.rows.forEach((row, ri) => {
      font(ctx, numFs, 800);
      ctx.fillStyle = INK; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(`${ri + 1}.`, x0 + numTW, y + cell / 2);
      for (let j = 0; j < row.items.length; j++) {
        const cx = tx + j * (cell + gap) + cell / 2, cy = y + cell / 2;
        roundRect(ctx, cx - cell / 2, y, cell, cell, cell * 0.14);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.strokeStyle = '#D1D5DB'; ctx.lineWidth = Math.max(0.2, cell * 0.012); ctx.stroke();
        if (row.t === 'pic') {
          ctx.font = `${cell * 0.6}px ${EMOJI_FONT}`;
          ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(row.items[j], cx, cy + cell * 0.03);
        } else drawFigure(ctx, row.items[j], cx, cy, cell);
      }
      if (showSolution) {
        const cx = tx + row.odd * (cell + gap) + cell / 2;
        ctx.strokeStyle = ANSWER; ctx.lineWidth = Math.max(0.5, cell * 0.04);
        ctx.beginPath(); ctx.arc(cx, y + cell / 2, cell * RING, 0, TAU); ctx.stroke();
        let fs = explFs;
        font(ctx, fs, 700);
        const text = why(row, lang), maxW = K * cell + (K - 1) * gap;
        if (ctx.measureText(text).width > maxW) { fs *= maxW / ctx.measureText(text).width; font(ctx, fs, 700); }
        ctx.fillStyle = ANSWER; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(text, tx, y + cell + over + explH * 0.42);   // o'z qatoriga yaqinroq
      }
      y += pitch;
    });

    font(ctx, ruleFs, 400);
    ctx.fillStyle = MUTE; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const ruleY = y - over + ruleGap;                   // oxirgi qatorning izoh joyidan keyin
    ruleLines.forEach((ln, i) => ctx.fillText(ln, box.x + box.w / 2, ruleY + i * ruleLH));
    ctx.restore();
    return { cell };
  },

  hint(p, info, lang) {
    const n = p.rows.length;
    const T = { uz: `Qatorlar: ${n} · har birida ${p.K} tadan`, ru: `Рядов: ${n} · в каждом по ${p.K}`, en: `Rows: ${n} · ${p.K} in each` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    p.rows.forEach((row, ri) => {
      if (row.items.length !== p.K) problems.push(`row ${ri}: ${row.items.length} items`);
      if (!(row.odd >= 0 && row.odd < row.items.length)) problems.push(`row ${ri}: bad odd index`);
      if (row.t === 'pic') {
        if (new Set(row.items).size !== row.items.length) problems.push(`row ${ri}: repeated picture`);
        row.items.forEach((e, i) => {
          const t = TAGS.get(e) || [];
          const ok = i === row.odd ? inCat(t, row.b) && !nearCat(t, row.a) : inCat(t, row.a) && !nearCat(t, row.b);
          if (!ok) problems.push(`row ${ri}: ${e} does not fit ${row.a}/${row.b}`);
        });
        return;
      }
      for (const [prop, get] of Object.entries(PROPS)) {
        const vals = row.items.map(get);
        if (prop === row.rule) {
          const others = vals.filter((_, i) => i !== row.odd);
          if (new Set(others.map(String)).size !== 1 || String(vals[row.odd]) === String(others[0])) problems.push(`row ${ri}: key ${prop} not unique`);
        } else if (!propOk(vals.map(String))) problems.push(`row ${ri}: ${prop} creates another odd one (${vals.join(',')})`);
      }
      if (row.rule === 'mirror') {
        const base = row.items.find((_, i) => i !== row.odd);
        const rotations = ROTS.map(r => JSON.stringify(polyCells(base.poly, r, false)));
        const m = row.items[row.odd];
        if (rotations.includes(JSON.stringify(polyCells(m.poly, m.rot, true)))) problems.push(`row ${ri}: mirrored figure equals a rotation`);
      }
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-odd" aria-hidden="true"><defs><linearGradient id="cg-odd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6d365"/><stop offset="1" stop-color="#fda085"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-odd)"/><g fill="#fff"><rect x="30" y="30" width="64" height="64" rx="13"/><rect x="106" y="30" width="64" height="64" rx="13"/><rect x="30" y="106" width="64" height="64" rx="13"/><rect x="106" y="106" width="64" height="64" rx="13"/></g><g fill="#4F46E5"><circle cx="62" cy="62" r="19"/><circle cx="138" cy="62" r="19"/><circle cx="62" cy="138" r="19"/></g><path class="oo-odd" d="M138 117 L159 155 L117 155 Z" fill="#F97316" stroke="#C2410C" stroke-width="3" stroke-linejoin="round"/><circle class="oo-ring" cx="138" cy="138" r="40" fill="none" stroke="#DC2626" stroke-width="7" stroke-linecap="round"/></svg>`
};
