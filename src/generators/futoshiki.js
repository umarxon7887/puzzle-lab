// futoshiki.js — «Futoshiki» (Футошики / Futoshiki) generatori.
// N×N to'r: har qator va ustunda 1 dan N gacha sonlar bir martadan (lotin kvadrati). Kataklar orasidagi
// «<», «>» (tikda «∧», «∨») belgilari qaysi son katta ekanini ko'rsatadi. Bir nechta son berilgan.
// Kafolat (check()): yechim yagona; Oson va O'rta darajalar taxminsiz — faqat mantiq bilan yechiladi
// (yagona nomzod, yashirin yagona, belgilar bo'yicha chegaralar).

import { makeRng, shuffle } from '../core/rng.js';
import { INK, ANSWER, font, roundRect } from '../core/draw.js';
import { scaleOf, measureRule, drawRule, ruPlural } from '../core/parts.js';

// n — o'lcham; givens — berilgan sonlar; signs — belgilar soni (maqsad, kamida); logic — taxminsiz yechilsin;
// count — [1 tadan, 2 tadan, 4 tadan]. LEVELS[0] — «Juda oson» (daraja −1): belgilar ko'proq, lekin hammasi emas.
const LEVELS = [
  { n: 4, givens: 4, signs: 14, logic: true, count: [4, 2, 1] },
  { n: 4, givens: 3, signs: 8, logic: true, count: [4, 2, 1] },
  { n: 5, givens: 3, signs: 12, logic: true, count: [4, 2, 1] },
  { n: 6, givens: 2, signs: 16, logic: false, count: [2, 1, 1] },
  { n: 7, givens: 2, signs: 20, logic: false, count: [2, 1, 1] }
];

export function randomLatin(n, rand) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const g = new Array(n * n).fill(0), row = new Int32Array(n), col = new Int32Array(n);
    let steps = 0;
    const rec = k => {
      if (k === n * n) return true;
      if (++steps > 20000) return false;
      const r = Math.floor(k / n), c = k % n;
      for (const v of shuffle(Array.from({ length: n }, (_, i) => i + 1), rand)) {
        if (row[r] >> v & 1 || col[c] >> v & 1) continue;
        g[k] = v; row[r] |= 1 << v; col[c] |= 1 << v;
        if (rec(k + 1)) return true;
        g[k] = 0; row[r] &= ~(1 << v); col[c] &= ~(1 << v);
      }
      return false;
    };
    if (rec(0)) return g;
  }
  throw new Error('latin: failed');
}

// Belgilar ro'yxati: { a, b } — a katakdagi son b katakdagidan kichik
export function allSigns(n, sol) {
  const out = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const k = r * n + c;
    if (c < n - 1) out.push(sol[k] < sol[k + 1] ? { a: k, b: k + 1 } : { a: k + 1, b: k });
    if (r < n - 1) out.push(sol[k] < sol[k + n] ? { a: k, b: k + n } : { a: k + n, b: k });
  }
  return out;
}

const bitCount = m => { let c = 0; while (m) { m &= m - 1; c++; } return c; };
const lowBit = m => 31 - Math.clz32(m & -m);
const highBit = m => 31 - Math.clz32(m);

// Mantiq bilan qisqartirish. dom — nomzodlar (bit v = son v). false — qarama-qarshilik.
function propagate(n, dom, signs) {
  const units = [];
  for (let r = 0; r < n; r++) units.push(Array.from({ length: n }, (_, c) => r * n + c));
  for (let c = 0; c < n; c++) units.push(Array.from({ length: n }, (_, r) => r * n + c));
  let changed = true;
  while (changed) {
    changed = false;
    for (const u of units) {
      for (const k of u) {
        const m = dom[k];
        if (!m) return false;
        if ((m & (m - 1)) === 0) for (const j of u) if (j !== k && dom[j] & m) { dom[j] &= ~m; changed = true; if (!dom[j]) return false; }
      }
      for (let v = 1; v <= n; v++) {
        const bit = 1 << v; let only = -1, cnt = 0;
        for (const k of u) if (dom[k] & bit) { cnt++; only = k; }
        if (cnt === 0) return false;
        if (cnt === 1 && dom[only] !== bit) { dom[only] = bit; changed = true; }
      }
    }
    for (const { a, b } of signs) {
      // a < b: a < max(b), b > min(a)
      const hb = highBit(dom[b]), la = lowBit(dom[a]);
      const na = dom[a] & ((1 << hb) - 1), nb = dom[b] & ~((1 << (la + 1)) - 1);
      if (na !== dom[a]) { dom[a] = na; changed = true; if (!na) return false; }
      if (nb !== dom[b]) { dom[b] = nb; changed = true; if (!nb) return false; }
    }
  }
  return true;
}

function initDom(n, given) {
  const full = ((1 << (n + 1)) - 1) & ~1;
  return given.map(v => (v ? 1 << v : full));
}

// Faqat mantiq bilan to'liq yechiladimi
export function logicSolvable(n, given, signs) {
  const dom = initDom(n, given);
  return propagate(n, dom, signs) && dom.every(m => (m & (m - 1)) === 0);
}

// Yechimlar soni (limit gacha)
export function countFutoshiki(n, given, signs, limit = 2) {
  let count = 0, nodes = 0;
  const rec = dom => {
    if (count >= limit || ++nodes > 200000) return;
    if (!propagate(n, dom, signs)) return;
    let best = -1, bc = 99;
    for (let k = 0; k < dom.length; k++) { const c = bitCount(dom[k]); if (c > 1 && c < bc) { bc = c; best = k; } }
    if (best < 0) { count++; return; }
    for (let v = 1; v <= n; v++) if (dom[best] >> v & 1) { const d = dom.slice(); d[best] = 1 << v; rec(d); if (count >= limit) return; }
  };
  rec(initDom(n, given));
  return nodes > 200000 ? limit : count;
}

function build(L, rand) {
  const n = L.n;
  for (let attempt = 0; attempt < 200; attempt++) {
    const sol = randomLatin(n, rand);
    const all = allSigns(n, sol);
    const given = new Array(n * n).fill(0);
    for (const k of shuffle(Array.from({ length: n * n }, (_, i) => i), rand).slice(0, L.givens)) given[k] = sol[k];
    const ok = (g, s) => (L.logic ? logicSolvable(n, g, s) : countFutoshiki(n, g, s, 2) === 1);
    let signs = all.slice();
    if (!ok(given, signs)) continue;
    // belgilarni olib tashlaymiz: maqsadgacha, yechim yagona (yoki mantiq bilan yechiladigan) bo'lib qolsin
    for (const s of shuffle(all.slice(), rand)) {
      if (signs.length <= L.signs) break;
      const next = signs.filter(x => x !== s);
      if (ok(given, next)) signs = next;
    }
    if (signs.length > L.signs * 1.6) continue;
    return { sol, given, signs };
  }
  throw new Error('futoshiki: no puzzle');
}

const RULE = {
  uz: n => `Har bir qator va har bir ustunda 1 dan ${n} gacha sonlar bir martadan uchraydi. Kataklar orasidagi belgi qaysi son katta ekanini ko'rsatadi: belgining ochiq tomoni katta songa qaragan.`,
  ru: n => `В каждой строке и каждом столбце числа от 1 до ${n} встречаются по одному разу. Знак между клетками показывает, какое число больше: открытая сторона знака смотрит на большее число.`,
  en: n => `Every row and every column has the numbers 1 to ${n} once each. The sign between two cells shows which number is bigger: its open side faces the bigger number.`
};

// Belgi (burchak): (x, y) markaz, dir — o'tkir uchi qaragan tomon: 'l', 'r', 'u', 'd'
function chevron(ctx, x, y, s, dir) {
  const a = s * 0.19, b = s * 0.12;
  ctx.beginPath();
  if (dir === 'l') { ctx.moveTo(x + b, y - a); ctx.lineTo(x - b, y); ctx.lineTo(x + b, y + a); }
  if (dir === 'r') { ctx.moveTo(x - b, y - a); ctx.lineTo(x + b, y); ctx.lineTo(x - b, y + a); }
  if (dir === 'u') { ctx.moveTo(x - a, y + b); ctx.lineTo(x, y - b); ctx.lineTo(x + a, y + b); }
  if (dir === 'd') { ctx.moveTo(x - a, y - b); ctx.lineTo(x, y + b); ctx.lineTo(x + a, y - b); }
  ctx.stroke();
}

export default {
  id: 'futoshiki',
  skills: ['logic', 'counting'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Futoshiki', ru: 'Футошики', en: 'Futoshiki' },
  desc: {
    uz: "Har qator va ustunda sonlar bir martadan; kataklar orasidagi «<» va «>» belgilari yordam beradi",
    ru: 'Числа в строках и столбцах не повторяются; помогают знаки «<» и «>» между клетками',
    en: 'No number repeats in a row or column; the < and > signs between cells help'
  },
  fileBase: { uz: 'Futoshiki', ru: 'Футошики', en: 'Futoshiki' },
  defaultTitle: { uz: "Belgilarga qarab to'ldir!", ru: 'Заполни по знакам!', en: 'Follow the signs!' },
  options: [{ key: 'level', type: 'level', default: 0, veryEasy: true }],
  levelHint: {
    uz: ["4×4, 4 ta son, belgilar ko'p", '4×4, 3 ta son berilgan', '5×5, 3 ta son berilgan', '6×6, 2 ta son berilgan', '7×7, 2 ta son, belgilar kam'],
    ru: ['4×4, 4 числа, много знаков', '4×4, даны 3 числа', '5×5, даны 3 числа', '6×6, даны 2 числа', '7×7, 2 числа, мало знаков'],
    en: ['4×4, 4 numbers, many signs', '4×4, 3 numbers given', '5×5, 3 numbers given', '6×6, 2 numbers given', '7×7, 2 numbers, few signs']
  },

  generate(opts, seed) {
    const level = Math.max(-1, Math.min(3, opts.level | 0));
    const L = LEVELS[level + 1];
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
    const gap = 12 * scale, G = 0.55;                    // G — kataklar orasidagi oraliq (katak ulushi)
    const H = box.h - rule.h - gap;
    const unit = n + (n - 1) * G;
    const pad = cnt > 1 ? gap * 0.4 : 0;                 // ramka uchun joy
    let best = null;
    for (let cols = 1; cols <= Math.min(2, cnt); cols++) {
      const rows = Math.ceil(cnt / cols);
      const cs = Math.min((box.w - (cols - 1) * gap * 2 - cols * 2 * pad) / (cols * unit), (H - (rows - 1) * gap - rows * 2 * pad) / (rows * unit), 17);
      const score = cs * (cols === 1 && cnt > 2 ? 0.85 : 1);
      if (!best || score > best.score + 0.01) best = { cols, rows, cs, score };
    }
    const { cols, rows, cs } = best, side = unit * cs, step = cs * (1 + G);
    const gridW = cols * (side + 2 * pad) + (cols - 1) * gap * 2, gridH = rows * (side + 2 * pad) + (rows - 1) * gap;
    const gx = box.x + (box.w - gridW) / 2, gy = box.y + Math.max(0, (H - gridH) * 0.35);
    p.items.forEach((it, idx) => {
      const ox = gx + pad + (idx % cols) * (side + 2 * pad + gap * 2), oy = gy + pad + Math.floor(idx / cols) * (side + 2 * pad + gap);
      const X = k => ox + (k % n) * step, Y = k => oy + Math.floor(k / n) * step;
      // har bir to'r alohida ramkada (yonma-yon to'rlar qo'shilib ketmasin)
      if (cnt > 1) {
        ctx.strokeStyle = '#C7D2FE'; ctx.lineWidth = Math.max(0.3, 0.4 * scale);
        roundRect(ctx, ox - pad, oy - pad, side + 2 * pad, side + 2 * pad, pad); ctx.stroke();
      }
      for (let k = 0; k < n * n; k++) {
        roundRect(ctx, X(k), Y(k), cs, cs, cs * 0.12);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.35, cs * 0.04); ctx.stroke();
        const v = it.given[k] || (showSolution ? it.sol[k] : 0);
        if (v) {
          font(ctx, cs * 0.56, it.given[k] ? 900 : 700); ctx.fillStyle = it.given[k] ? INK : ANSWER;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(String(v), X(k) + cs / 2, Y(k) + cs * 0.55);
        }
      }
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.35, cs * 0.05); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const { a, b } of it.signs) {
        const lo = Math.min(a, b), hi = Math.max(a, b);
        if (hi - lo === 1) {          // gorizontal: o'tkir uchi kichik son tomonga
          chevron(ctx, X(lo) + cs + cs * G / 2, Y(lo) + cs / 2, cs, a === lo ? 'l' : 'r');
        } else {
          chevron(ctx, X(lo) + cs / 2, Y(lo) + cs + cs * G / 2, cs, a === lo ? 'u' : 'd');
        }
      }
    });
    drawRule(ctx, rule, box.x + box.w / 2, gy + gridH + gap);
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
    const n = p.n, L = LEVELS[p.level + 1];
    p.items.forEach((it, i) => {
      for (let r = 0; r < n; r++) {
        if (new Set(it.sol.slice(r * n, r * n + n)).size !== n || new Set(it.sol.filter((_, k) => k % n === r)).size !== n) problems.push(`#${i}: not latin`);
      }
      if (it.given.some((v, k) => v && v !== it.sol[k])) problems.push(`#${i}: given mismatch`);
      if (it.signs.some(({ a, b }) => it.sol[a] >= it.sol[b])) problems.push(`#${i}: sign wrong`);
      if (countFutoshiki(n, it.given, it.signs, 2) !== 1) problems.push(`#${i}: not unique`);
      if (L.logic && !logicSolvable(n, it.given, it.signs)) problems.push(`#${i}: needs guessing`);
      if (it.given.filter(Boolean).length !== L.givens) problems.push(`#${i}: givens count`);
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-futoshiki" aria-hidden="true"><defs><linearGradient id="cg-futoshiki" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a1c4fd"/><stop offset="1" stop-color="#c2e9fb"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-futoshiki)"/><g fill="#fff" stroke="#111827" stroke-width="3.5"><rect x="30" y="30" width="38" height="38" rx="6"/><rect x="81" y="30" width="38" height="38" rx="6"/><rect x="132" y="30" width="38" height="38" rx="6"/><rect x="30" y="81" width="38" height="38" rx="6"/><rect x="81" y="81" width="38" height="38" rx="6"/><rect x="132" y="81" width="38" height="38" rx="6"/><rect x="30" y="132" width="38" height="38" rx="6"/><rect x="81" y="132" width="38" height="38" rx="6"/><rect x="132" y="132" width="38" height="38" rx="6"/></g><g fill="none" stroke="#111827" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M77 43l-6 6 6 6"/><path d="M122 94l6 6-6 6"/><path d="M43 127l6-6 6 6"/><path d="M145 72l6 6 6-6"/></g><g font-family="Nunito, sans-serif" font-weight="900" font-size="24" text-anchor="middle" fill="#111827"><text x="49" y="58">1</text><text x="151" y="109">1</text></g><g font-family="Nunito, sans-serif" font-weight="900" font-size="24" text-anchor="middle" fill="#DC2626"><text class="ft-a" x="100" y="58">2</text><text class="ft-b" x="100" y="109">3</text><text class="ft-c" x="49" y="160">3</text></g></svg>`
};
