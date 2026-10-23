// picsudoku.js — «Rasmli sudoku» (Судоку с картинками / Picture sudoku) generatori.
// 4×4 (bloklar 2×2) va 6×6 (bloklar 2×3) sudoku, raqamlar o'rnida rasmlar yoki shakllar (4–6 yosh).
// Varaq tepasida rasmlar va ularning raqami: kichkintoy rasmni chizadi yoki raqamini yozadi.
// Kafolat (check()): yechim yagona; Oson va Qiyin — faqat «yagona nomzod» bilan,
// O'rta va Juda qiyin — «yashirin yagona» bilan ham (taxminsiz) yechiladi.

import { makeRng, shuffle } from '../core/rng.js';
import { INK, MUTE, ANSWER, font } from '../core/draw.js';
import { scaleOf, measureRule, drawRule } from '../core/parts.js';
import { picPolys, picMap, picGroup } from '../core/pictures.js';
import { GEOM, transform, pathOf } from '../core/figures.js';
import { buildSpec, countSolutions, solvableBySingles } from './sudoku.js';

// key — sudoku turi; clues — berilgan rasmlar (maqsad); hidden — «yashirin yagona» ruxsat; count — [1, 2, 4 tadan]
const LEVELS = [
  { key: '4', N: 4, clues: 10, hidden: false, count: [4, 2, 1] },
  { key: '4', N: 4, clues: 7, hidden: true, count: [4, 2, 1] },
  { key: '6', N: 6, clues: 22, hidden: false, count: [2, 1, 1] },
  { key: '6', N: 6, clues: 16, hidden: true, count: [2, 1, 1] }
];

// Mavzular: rasmlar kutubxonasidan bir-biriga o'xshamaydigan buyumlar yoki geometrik shakllar
const THEMES = {
  fruits: { big: '🍎', label: { uz: 'Mevalar', ru: 'Фрукты', en: 'Fruit' }, pics: ['apple', 'pear', 'banana', 'cherry', 'grapes', 'strawberry', 'lemon', 'watermelon', 'carrot', 'mushroom'] },
  animals: { big: '🐱', label: { uz: 'Hayvonlar', ru: 'Животные', en: 'Animals' }, pics: ['cat', 'dog', 'rabbit', 'fish', 'duck', 'turtle', 'snail', 'butterfly', 'elephant', 'giraffe', 'hedgehog'] },
  transport: { big: '🚗', label: { uz: 'Transport', ru: 'Транспорт', en: 'Transport' }, pics: ['car', 'bus', 'train', 'airplane', 'boat', 'bicycle', 'truck', 'helicopter', 'rocket', 'tractor'] },
  shapes: { big: '★', label: { uz: 'Shakllar', ru: 'Фигуры', en: 'Shapes' }, shapes: ['circle', 'square', 'triangle', 'star', 'heart', 'diamond', 'plus', 'moon'] }
};

function pickSet(theme, N, rand) {
  const T = THEMES[theme];
  if (T.shapes) return shuffle(T.shapes.slice(), rand).slice(0, N).map(s => ({ shape: s }));
  const out = [], groups = new Set();
  for (const k of shuffle(T.pics.slice(), rand)) {
    const g = picGroup(k);
    if (g && groups.has(g)) continue;
    if (g) groups.add(g);
    out.push({ pic: k });
    if (out.length === N) break;
  }
  return out;
}

// Bitta sudoku: to'liq yechim, so'ng 180° simmetrik juftlarni olib tashlash (mantiq bilan yechilishi saqlanadi)
function makeGrid(L, seed) {
  const spec = buildSpec(L.key, seed), total = L.N * L.N;
  const sol = [];
  countSolutions(spec, new Array(total).fill(0), 1, makeRng(seed), sol, 200000);
  const rand = makeRng(seed * 31 + 7);
  let best = null;
  for (let a = 0; a < 4; a++) {
    const g = sol.slice();
    let clues = total;
    for (const i of shuffle(Array.from({ length: total }, (_, k) => k), rand)) {
      if (clues <= L.clues) break;
      if (!g[i]) continue;
      const j = total - 1 - i;
      const cells = (i === j || !g[j]) ? [i] : [i, j];
      if (clues - cells.length < L.clues - 1) continue;
      const back = cells.map(c => g[c]);
      cells.forEach(c => { g[c] = 0; });
      if (solvableBySingles(spec, g, L.hidden) && countSolutions(spec, g, 2, null, null, 30000) === 1) clues -= cells.length;
      else cells.forEach((c, k) => { g[c] = back[k]; });
    }
    if (!best || Math.abs(clues - L.clues) < Math.abs(best.clues - L.clues)) best = { g, clues };
    if (clues <= L.clues) break;
  }
  return { sol, puzzle: best.g, clues: best.clues };
}

// Rasm yoki shaklni chizish (javoblar qizil)
function drawItem(ctx, it, cx, cy, size, color) {
  if (it.pic) {
    // kichkintoylar uchun chiziqlar qalinroq: kontur ichi bo'yalib, ustidan yana chiziladi
    const map = picMap(cx, cy, size * 0.95);
    ctx.save(); ctx.beginPath();
    for (const poly of picPolys(it.pic).all) {
      for (let i = 0; i < poly.length; i += 2) { const [x, y] = map(poly[i], poly[i + 1]); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.closePath();
    }
    ctx.fillStyle = color; ctx.fill('evenodd');
    ctx.strokeStyle = color; ctx.lineWidth = size * 0.014; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.restore();
    return;
  }
  const polys = GEOM[it.shape].map(p => transform(p, cx, cy, size * 0.42, 0, false));
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = Math.max(0.35, size * 0.06); ctx.lineJoin = 'round';
  pathOf(ctx, polys); ctx.stroke(); ctx.restore();
}

const RULE = {
  uz: N => `Har bir qatorda, har bir ustunda va qalin chiziqli har bir blokda ${N} ta rasmning har biri bir martadan bo'lsin. Bo'sh katakka kerakli rasmni chiz yoki uning raqamini yoz.`,
  ru: N => `В каждой строке, каждом столбце и каждом блоке с жирной рамкой каждая из ${N} картинок встречается один раз. Нарисуй в пустой клетке нужную картинку или напиши её номер.`,
  en: N => `Each of the ${N} pictures appears once in every row, every column and every bold box. Draw the right picture in each empty square or write its number.`
};

export default {
  id: 'picsudoku',
  skills: ['logic', 'visual'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Rasmli sudoku', ru: 'Судоку с картинками', en: 'Picture sudoku' },
  desc: {
    uz: "4×4 va 6×6 sudoku: raqamlar o'rnida mevalar, hayvonlar, transport yoki shakllar",
    ru: 'Судоку 4×4 и 6×6: вместо цифр фрукты, животные, транспорт или фигуры',
    en: '4×4 and 6×6 sudoku with fruit, animals, vehicles or shapes instead of digits'
  },
  fileBase: { uz: 'Rasmli sudoku', ru: 'Судоку с картинками', en: 'Picture sudoku' },
  defaultTitle: { uz: 'Rasmlarni joylashtir!', ru: 'Расставь картинки!', en: 'Place the pictures!' },
  options: [
    { key: 'level', type: 'level', default: 0 },
    {
      key: 'theme', type: 'choice', style: 'cards', pack: 'random', default: 'fruits',
      label: { uz: 'Rasmlar', ru: 'Картинки', en: 'Pictures' },
      choices: Object.entries(THEMES).map(([value, t]) => ({ value, big: t.big, label: t.label }))
    }
  ],
  levelHint: {
    uz: ["4×4, ko'p rasm berilgan", '4×4, kamroq rasm berilgan', "6×6, ko'p rasm berilgan", '6×6, kamroq rasm berilgan'],
    ru: ['4×4, много подсказок', '4×4, меньше подсказок', '6×6, много подсказок', '6×6, меньше подсказок'],
    en: ['4×4, many pictures given', '4×4, fewer pictures given', '6×6, many pictures given', '6×6, fewer pictures given']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level];
    const theme = opts.theme in THEMES ? opts.theme : 'fruits';
    const rand = makeRng(seed);
    const set = pickSet(theme, L.N, rand);
    const count = L.count[opts.perPage === 4 ? 2 : opts.perPage === 2 ? 1 : 0];
    const items = [];
    for (let k = 0; k < count; k++) items.push(makeGrid(L, Math.floor(rand() * 899999999) + 1 + k));
    return { level, seed, theme, N: L.N, key: L.key, set, items };
  },

  info(p, lang) {
    const c = p.items.length;
    return { uz: `${c} ta sudoku, ${p.N}×${p.N}`, ru: `Судоку: ${c}, ${p.N}×${p.N}`, en: `${c} sudoku, ${p.N}×${p.N}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box), N = p.N, cnt = p.items.length;
    const rule = measureRule(ctx, (RULE[lang] || RULE.uz)(N), box.w, scale);
    const gap = 8 * scale;
    // Tepada: rasmlar va raqamlari
    const lc = Math.min(18 * scale, box.w / (N * 1.35));
    const legendH = lc * 1.5;
    const H = box.h - rule.h - gap - legendH - gap;
    let best = null;
    for (let cols = 1; cols <= Math.min(2, cnt); cols++) {
      const rows = Math.ceil(cnt / cols);
      const cs = Math.min((box.w - (cols - 1) * gap * 2) / (cols * N), (H - (rows - 1) * gap) / (rows * N), 24);
      const score = cs * (cols === 1 && cnt > 2 ? 0.85 : 1);
      if (!best || score > best.score + 0.01) best = { cols, rows, cs, score };
    }
    const { cols, rows, cs } = best, side = N * cs;
    const gridW = cols * side + (cols - 1) * gap * 2, gridH = rows * side + (rows - 1) * gap;
    const top = box.y + Math.max(0, (H - gridH) * 0.3);
    // legend
    const legW = N * lc * 1.35 - lc * 0.35;
    const lx = box.x + (box.w - legW) / 2;
    p.set.forEach((it, i) => {
      const x = lx + i * lc * 1.35;
      ctx.strokeStyle = '#C7CDD6'; ctx.lineWidth = Math.max(0.25, 0.3 * scale);
      ctx.strokeRect(x, top, lc, lc);
      drawItem(ctx, it, x + lc / 2, top + lc / 2, lc * 0.8, INK);
      font(ctx, lc * 0.34, 800); ctx.fillStyle = MUTE; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(String(i + 1), x + lc / 2, top + lc * 1.08);
    });
    const gx = box.x + (box.w - gridW) / 2, gy = top + legendH + gap;
    const spec = buildSpec(p.key, 1);
    p.items.forEach((it, idx) => {
      const ox = gx + (idx % cols) * (side + gap * 2), oy = gy + Math.floor(idx / cols) * (side + gap);
      ctx.strokeStyle = '#9CA3AF'; ctx.lineWidth = Math.max(0.2, cs * 0.012);
      ctx.beginPath();
      for (let j = 1; j < N; j++) { ctx.moveTo(ox + j * cs, oy); ctx.lineTo(ox + j * cs, oy + side); ctx.moveTo(ox, oy + j * cs); ctx.lineTo(ox + side, oy + j * cs); }
      ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.6, cs * 0.05); ctx.lineCap = 'round';
      ctx.beginPath();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const k = r * N + c;
        if (c < N - 1 && spec.region[k] !== spec.region[k + 1]) { ctx.moveTo(ox + (c + 1) * cs, oy + r * cs); ctx.lineTo(ox + (c + 1) * cs, oy + (r + 1) * cs); }
        if (r < N - 1 && spec.region[k] !== spec.region[k + N]) { ctx.moveTo(ox + c * cs, oy + (r + 1) * cs); ctx.lineTo(ox + (c + 1) * cs, oy + (r + 1) * cs); }
      }
      ctx.stroke();
      ctx.lineWidth = Math.max(0.8, cs * 0.06); ctx.strokeRect(ox, oy, side, side);
      it.sol.forEach((v, k) => {
        const given = it.puzzle[k] > 0;
        if (!given && !showSolution) return;
        drawItem(ctx, p.set[v - 1], ox + (k % N) * cs + cs / 2, oy + Math.floor(k / N) * cs + cs / 2, cs * 0.74, given ? INK : ANSWER);
      });
    });
    drawRule(ctx, rule, box.x + box.w / 2, gy + gridH + gap);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const n = p.items.reduce((s, it) => s + it.puzzle.filter(v => !v).length, 0);
    const T = { uz: `Bo'sh kataklar: ${n} ta`, ru: `Пустых клеток: ${n}`, en: `Empty squares: ${n}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const L = LEVELS[p.level], spec = buildSpec(p.key, 1);
    if (p.set.length !== p.N) problems.push('picture set size');
    p.items.forEach((it, i) => {
      for (const u of spec.units) if (new Set(u.map(k => it.sol[k])).size !== p.N) { problems.push(`#${i}: bad solution`); break; }
      if (it.puzzle.some((v, k) => v && v !== it.sol[k])) problems.push(`#${i}: given mismatch`);
      if (countSolutions(spec, it.puzzle.slice(), 2, null, null, 100000) !== 1) problems.push(`#${i}: not unique`);
      if (!solvableBySingles(spec, it.puzzle, L.hidden)) problems.push(`#${i}: needs guessing`);
      if (it.clues > L.clues + 2) problems.push(`#${i}: too many clues ${it.clues}`);
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-picsudoku" aria-hidden="true"><defs><linearGradient id="cg-picsudoku" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fddb92"/><stop offset="1" stop-color="#d1fdff"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-picsudoku)"/><rect x="36" y="36" width="128" height="128" fill="#fff"/><path d="M68 36v128M132 36v128M36 68h128M36 132h128" stroke="#9CA3AF" stroke-width="2"/><path d="M100 36v128M36 100h128" stroke="#111827" stroke-width="4"/><rect x="36" y="36" width="128" height="128" fill="none" stroke="#111827" stroke-width="5"/><g fill="none" stroke="#111827" stroke-width="3.5" stroke-linejoin="round"><circle cx="52" cy="52" r="10"/><path d="M84 42l10 18h-20z"/><rect x="108" y="44" width="16" height="16"/><path d="M148 42l3 7 7 .5-5.5 4.5 2 7-6.5-4-6.5 4 2-7-5.5-4.5 7-.5z"/><rect x="44" y="76" width="16" height="16"/><path d="M148 74l10 18h-20z"/><path d="M52 106l10 18h-20z"/><circle cx="84" cy="116" r="10"/><rect x="140" y="108" width="16" height="16"/><rect x="76" y="140" width="16" height="16"/><circle cx="148" cy="148" r="10"/></g><g fill="none" stroke="#DC2626" stroke-width="3.5" stroke-linejoin="round"><circle class="ps-a" cx="116" cy="84" r="10"/><path class="ps-b" d="M52 138l3 7 7 .5-5.5 4.5 2 7-6.5-4-6.5 4 2-7-5.5-4.5 7-.5z"/></g></svg>`
};
