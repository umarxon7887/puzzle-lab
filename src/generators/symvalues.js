// symvalues.js — «Belgilar qiymati» (Значения фигур / Symbol sums) generatori. v2.8
// Jadvalning har katagida belgi (shakl); har bir belgi — bitta son. Qatorlar o'ngida va ustunlar ostida
// yig'indilar yozilgan, bittasi o'rnida «?». Belgilarning qiymatini topib, «?» ni hisoblash kerak.
// Kafolat (check()): berilgan yig'indilardan belgilar qiymati yagona topiladi (tenglamalar rangi = belgilar soni),
// «?» to'g'ri hisoblangan, qiyin darajalarda bir xil belgili qator/ustun yo'q.
// Qolip: rus IQ kitobi M5.

import { makeRng, randInt, shuffle, pickOne } from '../core/rng.js';
import { INK, MUTE, PT, font } from '../core/draw.js';
import { drawFigure } from '../core/figures.js';
import { scaleOf, measureRule, drawRule, cellBox, questionCell, answerBox, ruPlural } from '../core/parts.js';
import { rank } from './scales.js';

// n — jadval o'lchami; K — belgilar soni; v — qiymatlar oralig'i; mixed — har qator/ustunda kamida 2 xil belgi;
// count — [1, 2, 4 tadan]
const LEVELS = [
  { n: 3, K: 2, v: [1, 9], mixed: false, count: [2, 1, 1] },
  { n: 3, K: 3, v: [1, 10], mixed: false, count: [2, 1, 1] },
  { n: 4, K: 3, v: [2, 15], mixed: true, count: [2, 1, 1] },
  { n: 4, K: 4, v: [2, 20], mixed: true, count: [2, 1, 1] }
];
const SYMS = ['circle', 'triangle', 'square', 'star', 'heart', 'diamond'];

// Yig'indilar: rows[0..n-1], cols[0..n-1]; har biri — har belgining soni (vektor)
function sums(grid, n, K) {
  const eqs = [];
  for (let r = 0; r < n; r++) { const v = new Array(K).fill(0); for (let c = 0; c < n; c++) v[grid[r * n + c]]++; eqs.push(v); }
  for (let c = 0; c < n; c++) { const v = new Array(K).fill(0); for (let r = 0; r < n; r++) v[grid[r * n + c]]++; eqs.push(v); }
  return eqs;
}
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

function build(L, rand) {
  const { n, K } = L;
  for (let guard = 0; guard < 500; guard++) {
    const grid = Array.from({ length: n * n }, () => Math.floor(rand() * K));
    if (new Set(grid).size !== K) continue;
    const eqs = sums(grid, n, K);
    if (L.mixed && eqs.some(e => e.some(x => x === n))) continue;
    const q = Math.floor(rand() * 2 * n);
    const known = eqs.filter((_, i) => i !== q);
    if (rank(known) !== K) continue;
    const vals = Array.from({ length: K }, () => randInt(rand, L.v[0], L.v[1]));
    if (new Set(vals).size !== K) continue;
    const syms = shuffle(SYMS.slice(), rand).slice(0, K);
    return { grid, vals, syms, totals: eqs.map(e => dot(e, vals)), q };
  }
  throw new Error('symvalues: no puzzle');
}

const RULE = {
  uz: "Har bir belgi bitta sonni bildiradi. O'ngdagi va pastdagi sonlar — qator va ustundagi belgilar yig'indisi. Belgilarning qiymatini top va «?» o'rniga yig'indini yoz.",
  ru: 'Каждая фигура обозначает число. Числа справа и снизу — суммы фигур в строке и столбце. Найди значение каждой фигуры и запиши сумму вместо «?».',
  en: 'Each symbol stands for a number. The numbers on the right and below are the sums of each row and column. Find what each symbol is worth and write the missing sum instead of “?”.'
};

export default {
  id: 'symvalues',
  skills: ['counting', 'logic'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Belgilar qiymati', ru: 'Значения фигур', en: 'Symbol sums' },
  desc: {
    uz: "Har belgi — bitta son: qator va ustun yig'indilaridan «?» ni toping",
    ru: 'Каждая фигура — число: найдите «?» по суммам строк и столбцов',
    en: 'Each symbol is a number: use the row and column sums to find “?”'
  },
  fileBase: { uz: 'Belgilar qiymati', ru: 'Значения фигур', en: 'Symbol sums' },
  defaultTitle: { uz: 'Belgilar nechaga teng?', ru: 'Чему равны фигуры?', en: 'What are the symbols worth?' },
  options: [{ key: 'level', type: 'level', default: 1 }],
  levelHint: {
    uz: ['3×3, ikki xil belgi', '3×3, uch xil belgi', '4×4, uch xil belgi, har qatorda aralash', "4×4, to'rt xil belgi, sonlar 20 gacha"],
    ru: ['3×3, две фигуры', '3×3, три фигуры', '4×4, три фигуры, в каждой строке разные', '4×4, четыре фигуры, числа до 20'],
    en: ['3×3, two symbols', '3×3, three symbols', '4×4, three symbols, mixed in every row', '4×4, four symbols, numbers up to 20']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level];
    const rand = makeRng(seed);
    const count = L.count[opts.perPage === 4 ? 2 : opts.perPage === 2 ? 1 : 0];
    return { level, seed, n: L.n, K: L.K, items: Array.from({ length: count }, () => build(L, rand)) };
  },

  info(p, lang) {
    const c = p.items.length;
    return { uz: `${c} ta jadval ${p.n}×${p.n}`, ru: `${c} ${ruPlural(c, 'таблица', 'таблицы', 'таблиц')} ${p.n}×${p.n}`, en: `${c} grid${c > 1 ? 's' : ''} ${p.n}×${p.n}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box), n = p.n, cnt = p.items.length;
    const rule = measureRule(ctx, RULE[lang] || RULE.uz, box.w, scale);
    const gap = 8 * scale;
    const H = box.h - rule.h - gap;
    // bitta jadval: n katak + yig'indi ustuni (1.3) ; balandlik: n + yig'indi qatori (1) + belgilar qatori (1.4)
    const unitW = n + 1.5, unitH = n + 1.2 + 1.5;
    let best = null;
    for (let cols = 1; cols <= Math.min(2, cnt); cols++) {
      const rows = Math.ceil(cnt / cols);
      const c = Math.min((box.w - (cols - 1) * gap) / cols / unitW, (H - (rows - 1) * gap) / rows / unitH, 26 * scale);
      if (!best || c > best.c + 0.01) best = { cols, rows, c };
    }
    const { cols, rows, c } = best;
    const bw = unitW * c, bh = unitH * c;
    const gx = box.x + (box.w - cols * bw - (cols - 1) * gap) / 2, gy = box.y + Math.max(0, (H - rows * bh - (rows - 1) * gap) * 0.3);
    p.items.forEach((it, k) => {
      const ox = gx + (k % cols) * (bw + gap) + 0.1 * c, oy = gy + Math.floor(k / cols) * (bh + gap);
      if (cnt > 1) { font(ctx, Math.min(c * 0.4, 4.6 * scale), 800); ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(`${k + 1}.`, ox - 0.1 * c, oy - c * 0.1); }
      const x0 = ox + 0.3 * c;
      for (let i = 0; i < n * n; i++) {
        const x = x0 + (i % n) * c, y = oy + Math.floor(i / n) * c;
        cellBox(ctx, x + c * 0.04, y + c * 0.04, c * 0.92, c * 0.92, scale, { fill: '#F9FAFB' });
        drawFigure(ctx, { shape: it.syms[it.grid[i]], fill: 'solid' }, x + c / 2, y + c / 2, c * 0.82);
      }
      // yig'indilar
      const totBox = (idx, x, y) => {
        const w = c * 0.92, h = c * 0.72;
        if (idx === it.q) {
          questionCell(ctx, x + (c - h) / 2, y + (c - h) / 2, h, scale, showSolution ? '#DC2626' : MUTE);
          if (showSolution) answerBox(ctx, x + (c - w) / 2, y + (c - h) / 2, w, h, scale, it.totals[idx]);
          return;
        }
        font(ctx, c * 0.42, 800); ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(it.totals[idx]), x + c / 2, y + c / 2 + c * 0.03);
      };
      for (let r = 0; r < n; r++) totBox(r, x0 + n * c + 0.15 * c, oy + r * c);
      for (let cc = 0; cc < n; cc++) totBox(n + cc, x0 + cc * c, oy + n * c + 0.1 * c);
      // belgilar qiymati: ● = [ ]
      const slot = (bw - 0.3 * c) / p.K, sw = Math.min(c * 0.62, slot / 2.9), ly = oy + (n + 1.3) * c;
      it.syms.forEach((sym, j) => {
        const sx = x0 + j * slot;
        drawFigure(ctx, { shape: sym, fill: 'solid' }, sx + sw * 0.5, ly + sw * 0.55, sw * 0.95);
        font(ctx, c * 0.36, 800); ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('=', sx + sw * 1.2, ly + sw * 0.57);
        answerBox(ctx, sx + sw * 1.55, ly + sw * 0.1, sw * 1.05, sw * 0.9, scale, showSolution ? it.vals[j] : undefined);
      });
    });
    drawRule(ctx, rule, box.x + box.w / 2, gy + rows * bh + (rows - 1) * gap + gap * 0.4);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const T = { uz: `Jadvallar: ${p.items.length} · belgilar: ${p.K} xil`, ru: `Таблиц: ${p.items.length} · фигур: ${p.K}`, en: `Grids: ${p.items.length} · symbols: ${p.K}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const L = LEVELS[p.level];
    p.items.forEach((it, i) => {
      const eqs = sums(it.grid, p.n, p.K);
      if (eqs.some((e, j) => dot(e, it.vals) !== it.totals[j])) problems.push(`#${i}: totals wrong`);
      if (rank(eqs.filter((_, j) => j !== it.q)) !== p.K) problems.push(`#${i}: values not unique`);
      if (L.mixed && eqs.some(e => e.some(x => x === p.n))) problems.push(`#${i}: uniform row`);
      if (new Set(it.vals).size !== p.K || new Set(it.grid).size !== p.K) problems.push(`#${i}: symbols`);
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-symvalues" aria-hidden="true"><defs><linearGradient id="cg-symvalues" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e0c3fc"/><stop offset="1" stop-color="#8ec5fc"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-symvalues)"/><rect x="22" y="36" width="156" height="128" rx="16" fill="#fff"/><circle cx="46" cy="64" r="11" fill="#2563EB"/><circle cx="76" cy="64" r="11" fill="#2563EB"/><circle cx="106" cy="64" r="11" fill="#2563EB"/><text x="128" y="71" font-family="Nunito, sans-serif" font-weight="900" font-size="22" text-anchor="middle" fill="#111827">=</text><text x="156" y="72" font-family="Nunito, sans-serif" font-weight="900" font-size="22" text-anchor="middle" fill="#111827">6</text><circle cx="46" cy="102" r="11" fill="#2563EB"/><polygon points="76,90 88,112 64,112" fill="#F59E0B"/><polygon points="106,90 118,112 94,112" fill="#F59E0B"/><text x="128" y="109" font-family="Nunito, sans-serif" font-weight="900" font-size="22" text-anchor="middle" fill="#111827">=</text><text x="156" y="110" font-family="Nunito, sans-serif" font-weight="900" font-size="22" text-anchor="middle" fill="#111827">12</text><polygon points="46,128 58,150 34,150" fill="#F59E0B"/><polygon points="76,128 88,150 64,150" fill="#F59E0B"/><polygon points="106,128 118,150 94,150" fill="#F59E0B"/><text x="128" y="147" font-family="Nunito, sans-serif" font-weight="900" font-size="22" text-anchor="middle" fill="#111827">=</text><text class="sv-a" x="156" y="148" font-family="Nunito, sans-serif" font-weight="900" font-size="22" text-anchor="middle" fill="#DC2626">15</text></svg>`
};
