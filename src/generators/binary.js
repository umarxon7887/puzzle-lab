// binary.js — «Binar jumboq» (Бинарный пазл / Binary puzzle; takuzu, binairo) generatori.
// N×N to'rga 0 va 1: bir xil raqam ketma-ket uch marta kelmaydi, har qator va ustunda 0 va 1 soni teng;
// Qiyin darajalardan — ikkita bir xil qator yoki ustun bo'lmaydi.
// Kafolat (check()): yechim yagona; Oson va O'rta — faqat oddiy usullar bilan (juftlik yonida, ikki raqam
// orasida, qator/ustunda bir raqam yetarli bo'lsa) taxminsiz yechiladi.

import { makeRng, shuffle } from '../core/rng.js';
import { INK, ANSWER, font, roundRect } from '../core/draw.js';
import { scaleOf, measureRule, drawRule, ruPlural } from '../core/parts.js';

// n — o'lcham; distinct — «bir xil qator/ustun yo'q» qoidasi; logic — taxminsiz; minGivens — berilganlar (eng kami);
// count — [1 tadan, 2 tadan, 4 tadan]
const LEVELS = [
  { n: 6, distinct: false, logic: true, minGivens: 14, count: [4, 2, 1] },
  { n: 8, distinct: false, logic: true, minGivens: 22, count: [2, 1, 1] },
  { n: 8, distinct: true, logic: false, minGivens: 16, count: [2, 1, 1] },
  { n: 10, distinct: true, logic: false, minGivens: 26, count: [1, 1, 1] }
];

const lines = n => {
  const out = [];
  for (let r = 0; r < n; r++) out.push(Array.from({ length: n }, (_, c) => r * n + c));
  for (let c = 0; c < n; c++) out.push(Array.from({ length: n }, (_, r) => r * n + c));
  return out;
};

// To'liq to'g'ri to'r (tasodifiy)
function fullGrid(n, distinct, rand) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const g = new Int8Array(n * n).fill(-1);
    let steps = 0;
    const okAt = k => {
      const r = Math.floor(k / n), c = k % n, v = g[k];
      if (c >= 2 && g[k - 1] === v && g[k - 2] === v) return false;
      if (r >= 2 && g[k - n] === v && g[k - 2 * n] === v) return false;
      let rc = 0, cc = 0;
      for (let j = 0; j <= c; j++) if (g[r * n + j] === v) rc++;
      for (let j = 0; j <= r; j++) if (g[j * n + c] === v) cc++;
      if (rc > n / 2 || cc > n / 2) return false;
      if (distinct && c === n - 1) {
        for (let r2 = 0; r2 < r; r2++) { let same = true; for (let j = 0; j < n; j++) if (g[r2 * n + j] !== g[r * n + j]) { same = false; break; } if (same) return false; }
      }
      if (distinct && r === n - 1) {
        for (let c2 = 0; c2 < c; c2++) { let same = true; for (let j = 0; j < n; j++) if (g[j * n + c2] !== g[j * n + c]) { same = false; break; } if (same) return false; }
      }
      return true;
    };
    const rec = k => {
      if (k === n * n) return true;
      if (++steps > 50000) return false;
      for (const v of rand() < 0.5 ? [0, 1] : [1, 0]) { g[k] = v; if (okAt(k) && rec(k + 1)) return true; }
      g[k] = -1;
      return false;
    };
    if (rec(0)) return Array.from(g);
  }
  throw new Error('binary: no grid');
}

// Oddiy usullar bilan to'ldirish. false — qarama-qarshilik
function propagate(n, g, L, distinct) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const ln of L) {
      const vals = ln.map(k => g[k]);
      // juftlik yonida va ikki bir xil orasida — qarama-qarshi raqam
      for (let i = 0; i < n; i++) {
        if (vals[i] >= 0) continue;
        let force = -1;
        if (i >= 2 && vals[i - 1] >= 0 && vals[i - 1] === vals[i - 2]) force = 1 - vals[i - 1];
        if (i <= n - 3 && vals[i + 1] >= 0 && vals[i + 1] === vals[i + 2]) { if (force >= 0 && force !== 1 - vals[i + 1]) return false; force = 1 - vals[i + 1]; }
        if (i >= 1 && i <= n - 2 && vals[i - 1] >= 0 && vals[i - 1] === vals[i + 1]) { if (force >= 0 && force !== 1 - vals[i - 1]) return false; force = 1 - vals[i - 1]; }
        if (force >= 0) { g[ln[i]] = force; vals[i] = force; changed = true; }
      }
      // sanoq: bir raqam yetarli bo'lsa, qolganlari ikkinchisi
      const c0 = vals.filter(v => v === 0).length, c1 = vals.filter(v => v === 1).length;
      if (c0 > n / 2 || c1 > n / 2) return false;
      if ((c0 === n / 2 || c1 === n / 2) && c0 + c1 < n) {
        const fill = c0 === n / 2 ? 1 : 0;
        ln.forEach((k, i) => { if (vals[i] < 0) { g[k] = fill; changed = true; } });
      }
      for (let i = 2; i < n; i++) if (vals[i] >= 0 && vals[i] === vals[i - 1] && vals[i] === vals[i - 2]) return false;
    }
    if (distinct) {
      // to'liq qatorlar (ustunlar) bir xil bo'lmasin
      for (const group of [L.slice(0, n), L.slice(n)]) {
        const full = group.filter(ln => ln.every(k => g[k] >= 0)).map(ln => ln.map(k => g[k]).join(''));
        if (new Set(full).size !== full.length) return false;
      }
    }
  }
  return true;
}

export function logicSolvable(n, given, distinct) {
  const g = given.slice();
  return propagate(n, g, lines(n), distinct) && g.every(v => v >= 0);
}

// Yechimlar soni (limit gacha)
export function countBinary(n, given, distinct, limit = 2) {
  const L = lines(n);
  let count = 0, nodes = 0;
  const rec = g => {
    if (count >= limit || ++nodes > 200000) return;
    if (!propagate(n, g, L, distinct)) return;
    const k = g.indexOf(-1);
    if (k < 0) { count++; return; }
    for (const v of [0, 1]) { const h = g.slice(); h[k] = v; rec(h); if (count >= limit) return; }
  };
  rec(given.slice());
  return nodes > 200000 ? limit : count;
}

function build(L, rand) {
  const n = L.n;
  for (let attempt = 0; attempt < 50; attempt++) {
    const sol = fullGrid(n, L.distinct, rand);
    const g = sol.slice();
    let givens = n * n;
    const ok = h => (L.logic ? logicSolvable(n, h, L.distinct) : countBinary(n, h, L.distinct, 2) === 1);
    for (const k of shuffle(Array.from({ length: n * n }, (_, i) => i), rand)) {
      if (givens <= L.minGivens) break;
      const v = g[k]; g[k] = -1;
      if (ok(g)) givens--; else g[k] = v;
    }
    if (givens > L.minGivens + n * 1.5) continue;
    return { sol, given: g };
  }
  throw new Error('binary: no puzzle');
}

const RULE = {
  uz: d => "Har bir katakka 0 yoki 1 yoz. Qatorda ham, ustunda ham bir xil raqam ketma-ket uch marta kelmaydi. Har bir qator va har bir ustunda 0 va 1 soni teng." + (d ? " Ikkita bir xil qator yoki ikkita bir xil ustun bo'lmaydi." : ''),
  ru: d => 'Впиши в каждую клетку 0 или 1. Ни в строке, ни в столбце одна и та же цифра не встречается три раза подряд. В каждой строке и каждом столбце нулей и единиц поровну.' + (d ? ' Одинаковых строк и одинаковых столбцов нет.' : ''),
  en: d => 'Write 0 or 1 in each cell. No digit appears three times in a row, across or down. Every row and every column has as many 0s as 1s.' + (d ? ' No two rows and no two columns are the same.' : '')
};

export default {
  id: 'binary',
  skills: ['logic', 'attention'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Binar jumboq', ru: 'Бинарный пазл', en: 'Binary puzzle' },
  desc: {
    uz: "Faqat 0 va 1: uchta bir xil raqam ketma-ket kelmaydi, har qator va ustunda teng sonda",
    ru: 'Только 0 и 1: три одинаковые цифры подряд нельзя, в каждой строке и столбце поровну',
    en: 'Only 0s and 1s: never three in a row, equal numbers in every row and column'
  },
  fileBase: { uz: 'Binar jumboq', ru: 'Бинарный пазл', en: 'Binary puzzle' },
  defaultTitle: { uz: '0 va 1 ni joylashtir!', ru: 'Расставь 0 и 1!', en: 'Place the 0s and 1s!' },
  options: [{ key: 'level', type: 'level', default: 1 }],
  levelHint: {
    uz: ['6×6, ikki qoida', '8×8, ikki qoida', "8×8, uchinchi qoida: qatorlar har xil", '10×10, uch qoida'],
    ru: ['6×6, два правила', '8×8, два правила', '8×8, третье правило: строки разные', '10×10, три правила'],
    en: ['6×6, two rules', '8×8, two rules', '8×8, third rule: all rows differ', '10×10, three rules']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level];
    const rand = makeRng(seed);
    const count = L.count[opts.perPage === 4 ? 2 : opts.perPage === 2 ? 1 : 0];
    const items = [];
    for (let k = 0; k < count; k++) items.push(build(L, rand));
    return { level, seed, n: L.n, distinct: L.distinct, items };
  },

  info(p, lang) {
    const c = p.items.length;
    return { uz: `${c} ta to'r, ${p.n}×${p.n}`, ru: `${c} ${ruPlural(c, 'сетка', 'сетки', 'сеток')} ${p.n}×${p.n}`, en: `${c} grid${c > 1 ? 's' : ''}, ${p.n}×${p.n}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box), n = p.n, cnt = p.items.length;
    const rule = measureRule(ctx, (RULE[lang] || RULE.uz)(p.distinct), box.w, scale);
    const gap = 10 * scale;
    const H = box.h - rule.h - gap;
    let best = null;
    for (let cols = 1; cols <= Math.min(2, cnt); cols++) {
      const rows = Math.ceil(cnt / cols);
      const cs = Math.min((box.w - (cols - 1) * gap) / (cols * n), (H - (rows - 1) * gap) / (rows * n), 15);
      const score = cs * (cols === 1 && cnt > 2 ? 0.85 : 1);
      if (!best || score > best.score + 0.01) best = { cols, rows, cs, score };
    }
    const { cols, rows, cs } = best, side = n * cs;
    const gridW = cols * side + (cols - 1) * gap, gridH = rows * side + (rows - 1) * gap;
    const gx = box.x + (box.w - gridW) / 2, gy = box.y + Math.max(0, (H - gridH) * 0.35);
    p.items.forEach((it, idx) => {
      const ox = gx + (idx % cols) * (side + gap), oy = gy + Math.floor(idx / cols) * (side + gap);
      // berilgan kataklar och kulrang fonda
      it.given.forEach((v, k) => { if (v >= 0) { ctx.fillStyle = '#EEF0F3'; ctx.fillRect(ox + (k % n) * cs, oy + Math.floor(k / n) * cs, cs, cs); } });
      ctx.strokeStyle = '#9CA3AF'; ctx.lineWidth = Math.max(0.25, cs * 0.02);
      ctx.beginPath();
      for (let j = 1; j < n; j++) { ctx.moveTo(ox + j * cs, oy); ctx.lineTo(ox + j * cs, oy + side); ctx.moveTo(ox, oy + j * cs); ctx.lineTo(ox + side, oy + j * cs); }
      ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.7, cs * 0.06);
      roundRect(ctx, ox, oy, side, side, cs * 0.08); ctx.stroke();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let k = 0; k < n * n; k++) {
        const v = it.given[k] >= 0 ? it.given[k] : (showSolution ? it.sol[k] : -1);
        if (v < 0) continue;
        font(ctx, cs * 0.58, it.given[k] >= 0 ? 900 : 700); ctx.fillStyle = it.given[k] >= 0 ? INK : ANSWER;
        ctx.fillText(String(v), ox + (k % n) * cs + cs / 2, oy + Math.floor(k / n) * cs + cs * 0.55);
      }
    });
    drawRule(ctx, rule, box.x + box.w / 2, gy + gridH + gap);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const n = p.items.reduce((s, it) => s + it.given.filter(v => v < 0).length, 0);
    const T = { uz: `To'ldiriladigan kataklar: ${n} ta`, ru: `Клеток заполнить: ${n}`, en: `Cells to fill: ${n}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const n = p.n, L = LEVELS[p.level];
    p.items.forEach((it, i) => {
      for (const ln of lines(n)) {
        const v = ln.map(k => it.sol[k]);
        if (v.filter(x => x === 1).length !== n / 2) problems.push(`#${i}: counts`);
        for (let j = 2; j < n; j++) if (v[j] === v[j - 1] && v[j] === v[j - 2]) problems.push(`#${i}: triple`);
      }
      if (p.distinct) {
        const rowsS = Array.from({ length: n }, (_, r) => it.sol.slice(r * n, r * n + n).join(''));
        const colsS = Array.from({ length: n }, (_, c) => it.sol.filter((_, k) => k % n === c).join(''));
        if (new Set(rowsS).size !== n || new Set(colsS).size !== n) problems.push(`#${i}: duplicate line`);
      }
      if (it.given.some((v, k) => v >= 0 && v !== it.sol[k])) problems.push(`#${i}: given mismatch`);
      if (countBinary(n, it.given, p.distinct, 2) !== 1) problems.push(`#${i}: not unique`);
      if (L.logic && !logicSolvable(n, it.given, p.distinct)) problems.push(`#${i}: needs guessing`);
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-binary" aria-hidden="true"><defs><linearGradient id="cg-binary" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d4fc79"/><stop offset="1" stop-color="#96e6a1"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-binary)"/><rect x="40" y="40" width="120" height="120" rx="8" fill="#fff"/><g fill="#EEF0F3"><rect x="40" y="40" width="30" height="30"/><rect x="100" y="40" width="30" height="30"/><rect x="70" y="70" width="30" height="30"/><rect x="130" y="100" width="30" height="30"/><rect x="40" y="130" width="30" height="30"/><rect x="100" y="130" width="30" height="30"/></g><path d="M70 40v120M100 40v120M130 40v120M40 70h120M40 100h120M40 130h120" stroke="#9CA3AF" stroke-width="2"/><rect x="40" y="40" width="120" height="120" rx="8" fill="none" stroke="#111827" stroke-width="5"/><g font-family="Nunito, sans-serif" font-weight="900" font-size="22" text-anchor="middle" fill="#111827"><text x="55" y="63">1</text><text x="115" y="63">0</text><text x="85" y="93">1</text><text x="145" y="123">1</text><text x="55" y="153">0</text><text x="115" y="153">1</text></g><g font-family="Nunito, sans-serif" font-weight="900" font-size="22" text-anchor="middle" fill="#DC2626"><text class="bn-a" x="85" y="63">1</text><text class="bn-b" x="145" y="63">0</text><text class="bn-c" x="55" y="93">0</text></g></svg>`
};
