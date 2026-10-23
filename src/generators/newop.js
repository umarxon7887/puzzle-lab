// newop.js — «Yangi amal» (Новая операция / New operation) generatori. v2.8
// Yangi amal ta'riflangan: a ★ b = 2·a + b. Shu ta'rif bo'yicha misollarni hisoblash, ichma-ich ifodalar
// ((2 ★ 1) ★ 3), ikki natijani solishtirish (8 ★ 2 ○ 2 ★ 8: >, < yoki =) va eng qiyin darajada noma'lumni
// topish (x ★ 3 = 17).
// Kafolat (check()): javoblar butun, oraliqda; «x» li savolda x yagona (0..60 oralig'ida bitta qiymat);
// solishtirish belgisi hisob bilan mos.
// Qolip: Az «Aşkar operatorlar».

import { makeRng, randInt, shuffle, pickOne } from '../core/rng.js';
import { INK, MUTE, PT, font, roundRect } from '../core/draw.js';
import { scaleOf, measureRule, drawRule, ruPlural } from '../core/parts.js';
import { measureTokens, drawTokens } from './numkit.js';

// Amallar: f — hisoblash, text — ta'rif (a va b harflari bilan)
const RULES = {
  a2b: { f: (a, b) => a + 2 * b, text: 'a + 2·b' },
  ab2: { f: (a, b) => 2 * a + b, text: '2·a + b' },
  ab3: { f: (a, b) => 3 * a + b, text: '3·a + b' },
  apb5: { f: (a, b) => a + b + 5, text: 'a + b + 5' },
  mulA: { f: (a, b) => a * b - a, text: 'a·b − a' },
  mulB: { f: (a, b) => a * b + b, text: 'a·b + b' },
  sum2: { f: (a, b) => (a + b) * 2, text: '(a + b)·2' },
  mulAB: { f: (a, b) => a * b - a - b, text: 'a·b − a − b' },
  diff: { f: (a, b) => 2 * a - b, text: '2·a − b' },
  sq: { f: (a, b) => a * a + b, text: 'a·a + b' },
  mix: { f: (a, b) => a * b + a + b, text: 'a·b + a + b' }
};
// rules — amallar; hi — sonlar; nested — ichma-ich savollar soni; cmp — solishtirish savoli; solve — «x» li savol;
// count — [1, 2, 4 tadan]
const LEVELS = [
  { rules: ['a2b', 'ab2', 'apb5', 'ab3'], hi: 9, q: 3, nested: 0, cmp: 0, solve: false, count: [6, 3, 2] },
  { rules: ['mulA', 'mulB', 'sum2', 'diff'], hi: 9, q: 3, nested: 1, cmp: 0, solve: false, count: [6, 3, 2] },
  { rules: ['mulA', 'mulB', 'sum2', 'mulAB', 'diff', 'ab3'], hi: 8, q: 4, nested: 1, cmp: 1, solve: false, count: [6, 3, 2] },
  { rules: ['mulAB', 'sq', 'mix', 'diff', 'mulB', 'ab3'], hi: 9, q: 5, nested: 2, cmp: 1, solve: true, count: [6, 3, 2] }
];
const sign = (u, v) => (u > v ? '>' : u < v ? '<' : '=');
const SYMS = ['star', 'diamond', 'triangle', 'circle', 'heart', 'square'];
const ok = v => Number.isInteger(v) && v >= 0 && v <= 300;

function card(L, rand, rk, sym) {
  const R = RULES[rk], f = R.f;
  for (let guard = 0; guard < 400; guard++) {
    const qs = [];
    const direct = L.q - L.nested - L.cmp - (L.solve ? 1 : 0);
    for (let i = 0; i < direct; i++) { const a = randInt(rand, 1, L.hi), b = randInt(rand, 1, L.hi); qs.push({ k: 'd', a, b, ans: f(a, b) }); }
    for (let i = 0; i < L.nested; i++) {
      const a = randInt(rand, 1, 6), b = randInt(rand, 1, 5), c = randInt(rand, 1, 6);
      if (i % 2 === 0) qs.push({ k: 'l', a, b, c, ans: f(f(a, b), c) });          // (a ★ b) ★ c
      else qs.push({ k: 'r', a, b, c, ans: f(a, f(b, c)) });                        // a ★ (b ★ c)
    }
    for (let i = 0; i < L.cmp; i++) {
      // ko'pincha o'rni almashgan sonlar (8 ★ 2 va 2 ★ 8), ba'zan boshqa juftlik
      const a = randInt(rand, 1, L.hi), b = randInt(rand, 1, L.hi);
      const swap = rand() < 0.65 && a !== b;
      const c = swap ? b : randInt(rand, 1, L.hi), d = swap ? a : randInt(rand, 1, L.hi);
      if (!swap && a === c && b === d) continue;
      qs.push({ k: 'c', a, b, c, d, ans: sign(f(a, b), f(c, d)) });
    }
    if (L.solve) {
      const x = randInt(rand, 2, 9), b = randInt(rand, 1, 6), t = f(x, b);
      const xs = Array.from({ length: 61 }, (_, i) => i).filter(v => f(v, b) === t);
      if (xs.length !== 1) continue;
      qs.push({ k: 'x', b, t, ans: x });
    }
    if (qs.length !== L.q) continue;
    if (!qs.every(q => (q.k === 'c' ? ok(f(q.a, q.b)) && ok(f(q.c, q.d)) : ok(q.ans)) && (q.k !== 'l' || ok(f(q.a, q.b))) && (q.k !== 'r' || ok(f(q.b, q.c))))) continue;
    if (new Set(qs.map(q => JSON.stringify(q))).size !== qs.length) continue;
    return { rule: rk, sym, qs };
  }
  throw new Error('newop: no card');
}

const n = v => ({ t: 'n', v }), S = sym => ({ t: 'sym', shape: sym });
export function qTokens(q, sym) {
  const eq = { t: 'op', v: '=' };
  if (q.k === 'd') return [n(q.a), S(sym), n(q.b), eq, { t: 'box', v: q.ans, w: 1.9 }];
  if (q.k === 'l') return [n('('), n(q.a), S(sym), n(q.b), n(')'), S(sym), n(q.c), eq, { t: 'box', v: q.ans, w: 1.9 }];
  if (q.k === 'r') return [n(q.a), S(sym), n('('), n(q.b), S(sym), n(q.c), n(')'), eq, { t: 'box', v: q.ans, w: 1.9 }];
  if (q.k === 'c') return [n(q.a), S(sym), n(q.b), { t: 'box', v: q.ans, op: true, w: 1.3 }, n(q.c), S(sym), n(q.d)];
  return [n('x'), S(sym), n(q.b), eq, n(q.t), { t: 'gap', w: 0.8 }, n('x'), eq, { t: 'box', v: q.ans, w: 1.9 }];
}
const defTokens = c => [n('a'), S(c.sym), n('b'), { t: 'op', v: '=' }, n(RULES[c.rule].text)];

const RULE = {
  uz: "Yangi amal ta'rifi har kartochka tepasida berilgan: a va b o'rniga sonlarni qo'yib hisobla. Avval qavs ichidagi amal bajariladi.",
  ru: 'Определение новой операции дано вверху каждой карточки: подставь числа вместо a и b. Сначала выполняется действие в скобках.',
  en: 'The new operation is defined at the top of each card: put the numbers in place of a and b. Work out the brackets first.'
};
const RULE_X = { uz: ' «x» li misolda x ni top.', ru: ' В примере с «x» найди x.', en: ' In the example with “x”, find x.' };
const RULE_C = { uz: ' Ikki tomoni bor misolda katakka >, < yoki = belgisini qo\'y.', ru: ' Там, где две части, поставь в окошко знак >, < или =.', en: ' Where there are two sides, write >, < or = in the box.' };

export default {
  id: 'newop',
  skills: ['counting', 'logic'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Yangi amal', ru: 'Новая операция', en: 'New operation' },
  desc: {
    uz: "a ★ b = 2·a + b kabi yangi amal berilgan: ta'rif bo'yicha misollarni hisoblang",
    ru: 'Дана новая операция, например a ★ b = 2·a + b: вычислите примеры по определению',
    en: 'A new operation such as a ★ b = 2·a + b is given: work out the examples'
  },
  fileBase: { uz: 'Yangi amal', ru: 'Новая операция', en: 'New operation' },
  defaultTitle: { uz: 'Yangi amalni hisobla!', ru: 'Вычисли новую операцию!', en: 'Use the new operation!' },
  options: [{ key: 'level', type: 'level', default: 1 }],
  levelHint: {
    uz: ["Qo'shish va ko'paytirish, 3 ta misol", "Ko'paytirishli amal, bitta ichma-ich misol", "Ichma-ich misol va solishtirish (>, <, =)", "Solishtirish va noma'lumni topish: x ★ 3 = 17"],
    ru: ['Сложение и умножение, 3 примера', 'Операция с умножением, один вложенный пример', 'Вложенный пример и сравнение (>, <, =)', 'Сравнение и неизвестное: x ★ 3 = 17'],
    en: ['Adding and multiplying, 3 examples', 'Multiplying operations, one nested example', 'A nested example and comparing (>, <, =)', 'Comparing and the unknown: x ★ 3 = 17']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level];
    const rand = makeRng(seed);
    const count = L.count[opts.perPage === 4 ? 2 : opts.perPage === 2 ? 1 : 0];
    const rules = shuffle(L.rules.slice(), rand), syms = shuffle(SYMS.slice(), rand);
    return { level, seed, solve: L.solve, cmp: L.cmp > 0, cards: Array.from({ length: count }, (_, i) => card(L, rand, rules[i % rules.length], syms[i % syms.length])) };
  },

  info(p, lang) {
    const c = p.cards.length;
    return { uz: `${c} ta kartochka`, ru: `${c} ${ruPlural(c, 'карточка', 'карточки', 'карточек')}`, en: `${c} card${c > 1 ? 's' : ''}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box), cnt = p.cards.length;
    const rule = measureRule(ctx, (RULE[lang] || RULE.uz) + (p.cmp ? (RULE_C[lang] || RULE_C.uz) : '') + (p.solve ? (RULE_X[lang] || RULE_X.uz) : ''), box.w, scale);
    const gap = 6 * scale, H = box.h - rule.h - gap;
    const lines = Math.max(...p.cards.map(c => c.qs.length)) + 1;
    const units = Math.max(...p.cards.flatMap(c => [defTokens(c), ...c.qs.map(q => qTokens(q, c.sym))]).map(t => measureTokens(ctx, t, 1))) + 2.2;
    let best = null;
    for (let cols = 1; cols <= Math.min(2, cnt); cols++) {
      const rows = Math.ceil(cnt / cols);
      const cw = (box.w - (cols - 1) * gap) / cols;
      const fs = Math.min(cw / units, (H - (rows - 1) * gap) / rows / (lines * 2.05 + 0.8), 9 * scale);
      if (!best || fs > best.fs + 0.01) best = { cols, rows, cw, fs };
    }
    const { cols, rows, cw, fs } = best;
    const lh = fs * 2.05, chH = lines * lh + fs * 0.8;
    const gy = box.y + Math.max(0, (H - rows * chH - (rows - 1) * gap) * 0.3);
    p.cards.forEach((c, i) => {
      const x = box.x + (i % cols) * (cw + gap), y = gy + Math.floor(i / cols) * (chH + gap);
      roundRect(ctx, x, y, cw, chH, fs * 0.6); ctx.strokeStyle = '#D1D5DB'; ctx.lineWidth = Math.max(0.2, 0.3 * scale); ctx.stroke();
      roundRect(ctx, x + fs * 0.3, y + fs * 0.3, cw - fs * 0.6, lh - fs * 0.1, fs * 0.45); ctx.fillStyle = '#EEF2FF'; ctx.fill();
      drawTokens(ctx, defTokens(c), x + fs * 1.0, y + fs * 0.3 + lh / 2 - fs * 0.05, fs, { scale });
      c.qs.forEach((q, j) => {
        const cy = y + fs * 0.4 + (j + 1) * lh + lh / 2;
        font(ctx, fs * 0.8, 700); ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(`${'abcdef'[j]})`, x + fs * 0.8, cy);
        drawTokens(ctx, qTokens(q, c.sym), x + fs * 2.4, cy, fs, { show: showSolution, scale });
      });
    });
    drawRule(ctx, rule, box.x + box.w / 2, gy + rows * chH + (rows - 1) * gap + gap * 0.6);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const T = { uz: `Kartochkalar: ${p.cards.length}`, ru: `Карточек: ${p.cards.length}`, en: `Cards: ${p.cards.length}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    p.cards.forEach((c, i) => {
      const f = RULES[c.rule].f;
      c.qs.forEach((q, j) => {
        const want = q.k === 'd' ? f(q.a, q.b) : q.k === 'l' ? f(f(q.a, q.b), q.c) : q.k === 'r' ? f(q.a, f(q.b, q.c)) : q.k === 'c' ? sign(f(q.a, q.b), f(q.c, q.d)) : null;
        if (q.k !== 'x' && want !== q.ans) problems.push(`card ${i}/${j}: wrong answer`);
        if (q.k === 'c') return;
        if (q.k === 'x') {
          const xs = Array.from({ length: 61 }, (_, v) => v).filter(v => f(v, q.b) === q.t);
          if (xs.length !== 1 || xs[0] !== q.ans) problems.push(`card ${i}/${j}: x not unique`);
        }
        if (!ok(q.ans)) problems.push(`card ${i}/${j}: out of range`);
      });
      if (c.qs.length !== LEVELS[p.level].q) problems.push(`card ${i}: question count`);
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-newop" aria-hidden="true"><defs><linearGradient id="cg-newop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fddb92"/><stop offset="1" stop-color="#d1fdff"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-newop)"/><rect x="18" y="46" width="164" height="40" rx="12" fill="#EEF2FF"/><g font-family="Nunito, sans-serif" font-weight="900" font-size="19" text-anchor="middle" fill="#3730A3"><text x="38" y="73">a</text><text x="72" y="73">b</text><text x="128" y="73">= 2·a + b</text></g><polygon points="55.0,57.0 57.4,62.7 63.6,63.2 58.9,67.3 60.3,73.3 55.0,70.0 49.7,73.3 51.1,67.3 46.4,63.2 52.6,62.7" fill="#3730A3"/><rect x="18" y="100" width="164" height="56" rx="14" fill="#fff"/><g font-family="Nunito, sans-serif" font-weight="900" font-size="24" text-anchor="middle" fill="#111827"><text x="40" y="137">3</text><text x="82" y="137">4</text><text x="110" y="137">=</text></g><polygon points="61.0,118.0 63.9,125.0 71.5,125.6 65.7,130.5 67.5,137.9 61.0,133.9 54.5,137.9 56.3,130.5 50.5,125.6 58.1,125.0" fill="#111827"/><rect x="124" y="110" width="44" height="36" rx="8" fill="#fff" stroke="#111827" stroke-width="2.5"/><text class="no-a" x="146" y="137" font-family="Nunito, sans-serif" font-weight="900" font-size="22" text-anchor="middle" fill="#DC2626">10</text></svg>`
};
