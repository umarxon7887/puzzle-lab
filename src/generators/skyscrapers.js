// skyscrapers.js — «Nechta uy ko'rinadi?» (Skyscrapers / Небоскрёбы turi) generatori. v2.8
// N×N to'rning har katagida 1 dan N gacha qavatli uy; har qator va ustunda qavatlar soni takrorlanmaydi.
// Chetdagi son shu tomondan qaraganda nechta uy ko'rinishini aytadi (baland uy orqasidagi pastroqlari ko'rinmaydi).
// Varaqda qoida ostida kichik namuna chiziladi (bitta qator yon tomondan).
// Kafolat (check()): yechuvchi (qator va ustun o'rin almashtirishlari kesishmasi) yechimlarni sanaydi — aynan bitta.

import { makeRng, shuffle } from '../core/rng.js';
import { INK, MUTE, ANSWER, PT, font, wrapLines } from '../core/draw.js';
import { scaleOf, measureRule, drawRule, ruPlural } from '../core/parts.js';
import { randomLatin } from './futoshiki.js';

// n — o'lcham; clues — chetdagi sonlar (maqsad); count — [1 tadan, 2 tadan, 4 tadan]
const LEVELS = [
  { n: 4, clues: 16, count: [4, 2, 1] },
  { n: 4, clues: 9, count: [4, 2, 1] },
  { n: 5, clues: 12, count: [2, 1, 1] },
  { n: 6, clues: 14, count: [2, 1, 1] }
];

const permCache = new Map();
function perms(n) {
  if (permCache.has(n)) return permCache.get(n);
  const out = [];
  const rec = (arr, used) => {
    if (arr.length === n) { out.push(arr.slice()); return; }
    for (let v = 1; v <= n; v++) if (!(used >> v & 1)) { arr.push(v); rec(arr, used | 1 << v); arr.pop(); }
  };
  rec([], 0);
  permCache.set(n, out);
  return out;
}
export const visible = arr => { let m = 0, c = 0; for (const v of arr) if (v > m) { m = v; c++; } return c; };

// Chetdagi sonlar: top[c], bottom[c], left[r], right[r] (0 — yozilmagan)
function cluesOf(n, sol) {
  const row = r => sol.slice(r * n, r * n + n), col = c => Array.from({ length: n }, (_, r) => sol[r * n + c]);
  return {
    top: Array.from({ length: n }, (_, c) => visible(col(c))),
    bottom: Array.from({ length: n }, (_, c) => visible(col(c).reverse())),
    left: Array.from({ length: n }, (_, r) => visible(row(r))),
    right: Array.from({ length: n }, (_, r) => visible(row(r).reverse()))
  };
}

// Yechimlar soni (limit gacha). firstOut — ikkinchi yechimni ham yozib olish uchun (farqli katakni topish)
export function countSky(n, cl, given, limit = 2, sols = null) {
  const P = perms(n);
  const fit = (p, a, b, fixed) => (!a || visible(p) === a) && (!b || visible(p.slice().reverse()) === b) && fixed.every((v, i) => !v || p[i] === v);
  const rowC = Array.from({ length: n }, (_, r) => P.filter(p => fit(p, cl.left[r], cl.right[r], given.slice(r * n, r * n + n))));
  const colC0 = Array.from({ length: n }, (_, c) => P.filter(p => fit(p, cl.top[c], cl.bottom[c], Array.from({ length: n }, (_, r) => given[r * n + c]))));
  let count = 0, nodes = 0;
  const grid = new Array(n * n).fill(0);
  const rec = (colC, done) => {
    if (count >= limit || ++nodes > 100000) return;
    if (done === (1 << n) - 1) { count++; if (sols) sols.push(grid.slice()); return; }
    // eng kam variantli qator
    let bestR = -1, bestList = null;
    for (let r = 0; r < n; r++) {
      if (done >> r & 1) continue;
      const allowed = colC.map(list => { let m = 0; for (const q of list) m |= 1 << q[r]; return m; });
      const list = rowC[r].filter(p => p.every((v, c) => allowed[c] >> v & 1));
      if (!list.length) return;
      if (!bestList || list.length < bestList.length) { bestR = r; bestList = list; }
    }
    for (const p of bestList) {
      const next = colC.map((list, c) => list.filter(q => q[bestR] === p[c]));
      if (next.some(l => !l.length)) continue;
      p.forEach((v, c) => { grid[bestR * n + c] = v; });
      rec(next, done | 1 << bestR);
      if (count >= limit) return;
    }
  };
  rec(colC0, 0);
  return nodes > 100000 ? limit : count;
}

function build(L, rand) {
  const n = L.n;
  for (let attempt = 0; attempt < 100; attempt++) {
    const sol = randomLatin(n, rand);
    const full = cluesOf(n, sol);
    const cl = { top: full.top.slice(), bottom: full.bottom.slice(), left: full.left.slice(), right: full.right.slice() };
    const given = new Array(n * n).fill(0);
    // hamma sonlar bilan ham yagona bo'lmasa — farq qiladigan katakka son beramiz
    for (let t = 0; t < 4; t++) {
      const sols = [];
      if (countSky(n, cl, given, 2, sols) === 1) break;
      const diff = sols.length > 1 ? sols[0].findIndex((v, k) => v !== sols[1][k]) : -1;
      if (diff < 0) break;
      given[diff] = sol[diff];
    }
    if (countSky(n, cl, given, 2) !== 1) continue;
    const slots = shuffle(['top', 'bottom', 'left', 'right'].flatMap(s => Array.from({ length: n }, (_, i) => [s, i])), rand);
    let have = 4 * n;
    for (const [s, i] of slots) {
      if (have <= L.clues) break;
      const keep = cl[s][i];
      cl[s][i] = 0;
      if (countSky(n, cl, given, 2) === 1) have--; else cl[s][i] = keep;
    }
    return { sol, clues: cl, given };
  }
  throw new Error('skyscrapers: no puzzle');
}

const RULE = {
  uz: n => `Har bir katakda bitta uy bor. Uylar 1 dan ${n} gacha qavatli: katakka uyning qavatlari sonini yoz. Har bir qator va ustunda uylarning balandligi har xil. Chetdagi son — o'sha joydan qatorga (yoki ustunga) qaragan bola nechta uyni ko'rishini bildiradi: baland uyning orqasidagi pastroq uylar ko'rinmaydi.`,
  ru: n => `В каждой клетке стоит один дом. В домах от 1 до ${n} этажей: напиши в клетке, сколько этажей у дома. В каждой строке и каждом столбце все дома разной высоты. Число с краю — сколько домов видит ребёнок, который смотрит с этого места вдоль строки (или столбца): дома пониже за высоким домом не видны.`,
  en: n => `Each cell has one house. Houses have 1 to ${n} floors: write the number of floors in each cell. In every row and column all houses have different heights. A number on the edge tells how many houses a child looking along that row (or column) can see: lower houses behind a taller one are hidden.`
};

// Namuna: bitta qator (2 1 3 4) — yon tomondan ko'rinish va chetdagi sonlar
const EX = [2, 1, 3, 4];
const EX_TEXT = {
  uz: "Namuna. Chapdan qaragan bola 3 ta uyni ko'radi: 1 qavatli uy 2 qavatlisining orqasida qoladi. O'ngdan esa faqat 1 ta uy ko'rinadi.",
  ru: 'Пример. Ребёнок слева видит 3 дома: одноэтажный дом спрятан за двухэтажным. Справа виден только 1 дом.',
  en: 'Example. A child on the left sees 3 houses: the 1-floor house hides behind the 2-floor one. From the right only 1 house is visible.'
};
function measureExample(ctx, lang, w, scale) {
  const c = 8.5 * scale, fl = c * 0.36, exW = (EX.length + 1.7) * c;
  const fs = 10.5 * PT * scale, lh = fs * 1.35;
  font(ctx, fs, 400);
  const lines = wrapLines(ctx, EX_TEXT[lang] || EX_TEXT.uz, Math.max(30 * scale, w - exW - 4 * scale));
  const pic = EX.length * fl + 0.15 * c + c;
  return { c, fl, exW, fs, lh, lines, h: Math.max(pic, lines.length * lh), pic };
}
function drawExample(ctx, ex, x, y, w) {
  const { c, fl, exW, lines, fs, lh } = ex;
  const textW = Math.max(...lines.map(l => { font(ctx, fs, 400); return ctx.measureText(l).width; }));
  const total = exW + 4 * c / 5.6 + textW;
  const x0 = x + Math.max(0, (w - total) / 2), ox = x0 + 0.85 * c, roofY = y + EX.length * fl, rowY = roofY + 0.15 * c;
  let m = 0;
  EX.forEach((h, i) => {
    const seen = h > m; if (seen) m = h;
    const bx = ox + i * c + c * 0.14, bw = c * 0.72, by = roofY - h * fl;
    ctx.fillStyle = seen ? '#BFDBFE' : '#F3F4F6'; ctx.fillRect(bx, by, bw, h * fl);
    ctx.strokeStyle = seen ? '#1D4ED8' : '#9CA3AF'; ctx.lineWidth = Math.max(0.25, c * 0.04);
    if (!seen) ctx.setLineDash([c * 0.08, c * 0.06]);
    ctx.strokeRect(bx, by, bw, h * fl); ctx.setLineDash([]);
    ctx.fillStyle = seen ? '#1D4ED8' : '#9CA3AF';
    for (let k = 0; k < h; k++) ctx.fillRect(bx + bw * 0.36, by + k * fl + fl * 0.28, bw * 0.28, fl * 0.42);
  });
  ctx.fillStyle = '#fff'; ctx.fillRect(ox, rowY, EX.length * c, c);
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.3, c * 0.05);
  ctx.strokeRect(ox, rowY, EX.length * c, c);
  ctx.beginPath(); for (let i = 1; i < EX.length; i++) { ctx.moveTo(ox + i * c, rowY); ctx.lineTo(ox + i * c, rowY + c); } ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  font(ctx, c * 0.55, 700); ctx.fillStyle = INK;
  EX.forEach((h, i) => ctx.fillText(String(h), ox + i * c + c / 2, rowY + c * 0.55));
  font(ctx, c * 0.55, 900);
  ctx.fillText(String(visible(EX)), ox - 0.45 * c, rowY + c * 0.55);
  ctx.fillText(String(visible(EX.slice().reverse())), ox + EX.length * c + 0.45 * c, rowY + c * 0.55);
  font(ctx, fs, 400); ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const tx = x0 + exW + 4 * c / 5.6, ty = y + Math.max(0, (ex.pic - lines.length * lh) / 2);
  lines.forEach((ln, i) => ctx.fillText(ln, tx, ty + i * lh));
}

export default {
  id: 'skyscrapers',
  skills: ['logic', 'spatial'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: "Nechta uy ko'rinadi?", ru: 'Сколько домов видно?', en: 'How many can you see?' },
  desc: {
    uz: "Chetdagi son shu tomondan nechta uy ko'rinishini aytadi: har bir uy necha qavatli ekanini top",
    ru: 'Число с краю говорит, сколько домов видно с этой стороны: найди, сколько этажей в каждом доме',
    en: 'Edge numbers tell how many houses you can see: find how many floors each house has'
  },
  fileBase: { uz: "Nechta uy ko'rinadi", ru: 'Сколько домов видно', en: 'How many can you see' },
  defaultTitle: { uz: 'Uylarni joylashtir!', ru: 'Расставь дома!', en: 'Place the houses!' },
  options: [{ key: 'level', type: 'level', default: 1 }],
  levelHint: {
    uz: ['4×4, hamma tomonda son bor', '4×4, sonlar kamroq', '5×5', '6×6'],
    ru: ['4×4, числа со всех сторон', '4×4, чисел меньше', '5×5', '6×6'],
    en: ['4×4, numbers on every side', '4×4, fewer numbers', '5×5', '6×6']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level];
    const rand = makeRng(seed);
    const count = L.count[opts.perPage === 4 ? 2 : opts.perPage === 2 ? 1 : 0];
    const items = [];
    for (let k = 0; k < count; k++) items.push(build(L, rand));
    return { level, seed, n: L.n, items };
  },

  info(p, lang) {
    const c = p.items.length;
    return { uz: `${c} ta to'r, ${p.n}×${p.n}`, ru: `${c} ${ruPlural(c, 'сетка', 'сетки', 'сеток')} ${p.n}×${p.n}`, en: `${c} grid${c > 1 ? 's' : ''}, ${p.n}×${p.n}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box), n = p.n, cnt = p.items.length;
    const rule = measureRule(ctx, (RULE[lang] || RULE.uz)(n), box.w, scale);
    const ex = measureExample(ctx, lang, box.w, scale);
    const gap = 8 * scale, M = 0.85;                    // M — chetdagi son uchun joy (katak ulushi)
    const H = box.h - rule.h - gap - ex.h - 4 * scale;
    const unit = n + 2 * M;
    let best = null;
    for (let cols = 1; cols <= Math.min(2, cnt); cols++) {
      const rows = Math.ceil(cnt / cols);
      const cs = Math.min((box.w - (cols - 1) * gap) / (cols * unit), (H - (rows - 1) * gap) / (rows * unit), 20);
      const score = cs * (cols === 1 && cnt > 2 ? 0.85 : 1);
      if (!best || score > best.score + 0.01) best = { cols, rows, cs, score };
    }
    const { cols, rows, cs } = best, side = unit * cs;
    const gridW = cols * side + (cols - 1) * gap, gridH = rows * side + (rows - 1) * gap;
    const gx = box.x + (box.w - gridW) / 2, gy = box.y + Math.max(0, (H - gridH) * 0.35);
    p.items.forEach((it, idx) => {
      const ox = gx + (idx % cols) * (side + gap) + M * cs, oy = gy + Math.floor(idx / cols) * (side + gap) + M * cs;
      const S = n * cs;
      ctx.fillStyle = '#fff'; ctx.fillRect(ox, oy, S, S);
      ctx.strokeStyle = '#9CA3AF'; ctx.lineWidth = Math.max(0.25, cs * 0.02);
      ctx.beginPath();
      for (let j = 1; j < n; j++) { ctx.moveTo(ox + j * cs, oy); ctx.lineTo(ox + j * cs, oy + S); ctx.moveTo(ox, oy + j * cs); ctx.lineTo(ox + S, oy + j * cs); }
      ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.7, cs * 0.06); ctx.strokeRect(ox, oy, S, S);
      // chetdagi sonlar
      font(ctx, cs * 0.5, 900); ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const mid = M * cs / 2;
      for (let i = 0; i < n; i++) {
        const c = ox + i * cs + cs / 2, r = oy + i * cs + cs * 0.53;
        if (it.clues.top[i]) ctx.fillText(String(it.clues.top[i]), c, oy - mid + cs * 0.03);
        if (it.clues.bottom[i]) ctx.fillText(String(it.clues.bottom[i]), c, oy + S + mid + cs * 0.03);
        if (it.clues.left[i]) ctx.fillText(String(it.clues.left[i]), ox - mid, r);
        if (it.clues.right[i]) ctx.fillText(String(it.clues.right[i]), ox + S + mid, r);
      }
      // berilgan va javob sonlari
      for (let k = 0; k < n * n; k++) {
        const v = it.given[k] || (showSolution ? it.sol[k] : 0);
        if (!v) continue;
        font(ctx, cs * 0.55, it.given[k] ? 900 : 700); ctx.fillStyle = it.given[k] ? INK : ANSWER;
        ctx.fillText(String(v), ox + (k % n) * cs + cs / 2, oy + Math.floor(k / n) * cs + cs * 0.55);
      }
    });
    drawRule(ctx, rule, box.x + box.w / 2, gy + gridH + gap);
    drawExample(ctx, ex, box.x, gy + gridH + gap + rule.h + 4 * scale, box.w);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const n = p.items.reduce((s, it) => s + it.given.filter(v => !v).length, 0);
    const T = { uz: `To'ldiriladigan kataklar: ${n} ta`, ru: `Клеток заполнить: ${n}`, en: `Cells to fill: ${n}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const n = p.n;
    p.items.forEach((it, i) => {
      const full = cluesOf(n, it.sol);
      for (const s of ['top', 'bottom', 'left', 'right']) if (it.clues[s].some((v, j) => v && v !== full[s][j])) problems.push(`#${i}: clue wrong`);
      for (let r = 0; r < n; r++) {
        if (new Set(it.sol.slice(r * n, r * n + n)).size !== n || new Set(it.sol.filter((_, k) => k % n === r)).size !== n) problems.push(`#${i}: not latin`);
      }
      if (it.given.some((v, k) => v && v !== it.sol[k])) problems.push(`#${i}: given mismatch`);
      if (countSky(n, it.clues, it.given, 2) !== 1) problems.push(`#${i}: not unique`);
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-skyscrapers" aria-hidden="true"><defs><linearGradient id="cg-skyscrapers" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#89f7fe"/><stop offset="1" stop-color="#66a6ff"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-skyscrapers)"/><g fill="#1e3a8a" opacity=".85"><rect x="44" y="34" width="22" height="20"/><rect x="72" y="22" width="22" height="32"/><rect x="100" y="10" width="22" height="44"/><rect x="128" y="0" width="22" height="54" rx="0"/></g><rect x="44" y="58" width="112" height="112" fill="#fff"/><path d="M72 58v112M100 58v112M128 58v112M44 86h112M44 114h112M44 142h112" stroke="#9CA3AF" stroke-width="2"/><rect x="44" y="58" width="112" height="112" fill="none" stroke="#111827" stroke-width="5"/><g font-family="Nunito, sans-serif" font-weight="900" font-size="20" text-anchor="middle" fill="#111827"><text x="28" y="79">4</text><text x="28" y="107">3</text><text x="28" y="135">2</text><text x="28" y="163">1</text></g><g font-family="Nunito, sans-serif" font-weight="900" font-size="20" text-anchor="middle" fill="#DC2626"><text class="sk-a" x="58" y="79">1</text><text class="sk-b" x="86" y="79">2</text><text class="sk-c" x="114" y="79">3</text><text class="sk-d" x="142" y="79">4</text></g></svg>`
};
