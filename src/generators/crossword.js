// crossword.js — Sonli krossvord: "A amal B = C" ko'rinishidagi tengliklar kesishib turadi.
// Kafolat: har bir bo'sh katakcha mantiq bilan topiladi — biror tenglikda uchta sondan ikkitasi
// ma'lum bo'lsa, uchinchisi hisoblanadi. Shu yo'l bilan butun krossvord taxminsiz to'ldiriladi
// (demak yechim ham yagona).

import { makeRng, randInt as ri } from '../core/rng.js';
import { INK, MUTE, ANSWER, PT, font, wrapLines } from '../core/draw.js';

const MUL = '×', DIV = '÷';
// ops — ruxsat etilgan amallar; span — qo'shish/ayirishda sonlar oralig'i;
// mulMax — ko'paytirish/bo'lishda ko'paytuvchi (2..mulMax); targetEq — tengliklar soni;
// hideFrac — sonlarning qancha qismi bo'sh qoldiriladi
const LEVELS = [
  { ops: ['+', '-'], span: 30, mulMax: 10, targetEq: 14, hideFrac: 0.40 },
  { ops: ['+', '-', MUL], span: 40, mulMax: 10, targetEq: 19, hideFrac: 0.52 },
  { ops: ['+', '-', MUL, DIV], span: 60, mulMax: 12, targetEq: 24, hideFrac: 0.62 },
  { ops: ['+', '-', MUL, DIV], span: 90, mulMax: 12, targetEq: 29, hideFrac: 0.70 }
];
const MAXV = 999;
const ok3 = (A, B, C) => [A, B, C].every(v => Number.isInteger(v) && v >= 1 && v <= MAXV);

function applyOp(a, op, b) {
  if (op === '+') return a + b;
  if (op === '-') return a - b >= 1 ? a - b : null;
  if (op === MUL) return a * b;
  return (b !== 0 && a % b === 0) ? a / b : null;
}
// Hech narsa ma'lum emas: A va B tanlanadi
function genFree(op, span, mulMax, rand) {
  if (op === '+') { const A = ri(rand, 1, span), B = ri(rand, 1, span); return { A, B, C: A + B }; }
  if (op === '-') { const A = ri(rand, 10, 10 + span), maxB = Math.min(A - 1, span); if (maxB < 1) return null; const B = ri(rand, 1, maxB); return { A, B, C: A - B }; }
  if (op === MUL) { const A = ri(rand, 2, mulMax), B = ri(rand, 2, mulMax); return { A, B, C: A * B }; }
  const B = ri(rand, 2, mulMax), C = ri(rand, 2, mulMax); return { A: B * C, B, C };
}
function genGivenA(A, op, span, mulMax, rand) {
  if (op === '+') { const B = ri(rand, 1, span); return { A, B, C: A + B }; }
  if (op === '-') { if (A < 2) return null; const B = ri(rand, 1, A - 1); return { A, B, C: A - B }; }
  if (op === MUL) { const B = ri(rand, 2, mulMax); return { A, B, C: A * B }; }
  const divs = []; for (let d = 2; d <= mulMax; d++) if (A % d === 0 && A / d >= 2) divs.push(d);
  if (!divs.length) return null; const B = divs[Math.floor(rand() * divs.length)]; return { A, B, C: A / B };
}
function genGivenB(B, op, span, mulMax, rand) {
  if (op === '+') { const A = ri(rand, 1, span); return { A, B, C: A + B }; }
  if (op === '-') { const C = ri(rand, 1, span); return { A: B + C, B, C }; }
  if (op === MUL) { const A = ri(rand, 2, mulMax); return { A, B, C: A * B }; }
  const C = ri(rand, 2, mulMax); return { A: B * C, B, C };
}
function genGivenC(C, op, span, mulMax, rand) {
  if (op === '+') { if (C < 2) return null; const A = ri(rand, 1, C - 1); return { A, B: C - A, C }; }
  if (op === '-') { const A = C + ri(rand, 1, span); return { A, B: A - C, C }; }
  if (op === MUL) {
    const divs = []; for (let d = 2; d <= mulMax; d++) if (C % d === 0 && C / d >= 2 && C / d <= mulMax) divs.push(d);
    if (!divs.length) return null; const A = divs[Math.floor(rand() * divs.length)]; return { A, B: C / A, C };
  }
  const B = ri(rand, 2, mulMax); return { A: B * C, B, C };
}
// Ikkitasi ma'lum: uchinchisi hisoblanadi
function solveThird(known, op) {
  if (known.C === undefined) { const c = applyOp(known.A, op, known.B); return c === null ? null : { ...known, C: c }; }
  if (known.B === undefined) {
    let b;
    if (op === '+') b = known.C - known.A;
    else if (op === '-') b = known.A - known.C;
    else if (op === MUL) b = (known.A !== 0 && known.C % known.A === 0) ? known.C / known.A : NaN;
    else b = (known.C !== 0 && known.A % known.C === 0) ? known.A / known.C : NaN;
    return (Number.isInteger(b) && b >= 1) ? { ...known, B: b } : null;
  }
  let a;
  if (op === '+') a = known.C - known.B;
  else if (op === '-') a = known.C + known.B;
  else if (op === MUL) a = (known.B !== 0 && known.C % known.B === 0) ? known.C / known.B : NaN;
  else a = known.B * known.C;
  return (Number.isInteger(a) && a >= 1) ? { ...known, A: a } : null;
}

// Har bir tenglik "A op B = C" 5 ta katakchani egallaydi
function tryPlace(G, op, orient, ar, ac, role, rand, span, mulMax, LIMIT) {
  let cells;
  if (orient === 'H') {
    const startC = role === 0 ? ac : role === 2 ? ac - 2 : ac - 4;
    if (startC < 1 || startC + 4 >= LIMIT - 1 || ar < 1 || ar >= LIMIT - 1) return null;
    cells = [0, 1, 2, 3, 4].map(i => ({ r: ar, c: startC + i }));
  } else {
    const startR = role === 0 ? ar : role === 2 ? ar - 2 : ar - 4;
    if (startR < 1 || startR + 4 >= LIMIT - 1 || ac < 1 || ac >= LIMIT - 1) return null;
    cells = [0, 1, 2, 3, 4].map(i => ({ r: startR + i, c: ac }));
  }
  const before = orient === 'H' ? { r: cells[0].r, c: cells[0].c - 1 } : { r: cells[0].r - 1, c: cells[0].c };
  const after = orient === 'H' ? { r: cells[4].r, c: cells[4].c + 1 } : { r: cells[4].r + 1, c: cells[4].c };
  if (G.type[before.r + ',' + before.c] || G.type[after.r + ',' + after.c]) return null;

  const roles = ['A', 'op', 'B', 'eq', 'C'];
  const known = {};
  for (let i = 0; i < 5; i++) {
    const k = cells[i].r + ',' + cells[i].c, rl = roles[i], t = G.type[k];
    if (rl === 'op' || rl === 'eq') { if (t) return null; }
    else if (t === 'num') known[rl] = G.val[k];
    else if (t) return null;
  }
  const kc = Object.keys(known).length;
  let vals;
  if (kc === 0) vals = genFree(op, span, mulMax, rand);
  else if (kc === 1) {
    if (known.A !== undefined) vals = genGivenA(known.A, op, span, mulMax, rand);
    else if (known.B !== undefined) vals = genGivenB(known.B, op, span, mulMax, rand);
    else vals = genGivenC(known.C, op, span, mulMax, rand);
  } else if (kc === 2) vals = solveThird(known, op);
  else vals = (applyOp(known.A, op, known.B) === known.C) ? known : null;   // uchalasi ham bor — faqat tekshiramiz
  if (!vals || !ok3(vals.A, vals.B, vals.C)) return null;

  for (let i = 0; i < 5; i++) {
    const k = cells[i].r + ',' + cells[i].c, rl = roles[i];
    if (rl === 'op') { G.type[k] = 'op'; G.op[k] = op; }
    else if (rl === 'eq') G.type[k] = 'eq';
    else { G.type[k] = 'num'; G.val[k] = vals[rl]; }
  }
  return { a: cells[0].r + ',' + cells[0].c, b: cells[2].r + ',' + cells[2].c, c: cells[4].r + ',' + cells[4].c, op };
}

// Berilgan ma'lum kataklardan boshlab mantiq bilan nechta katak topilishini hisoblaydi
function deduce(equations, knownSet) {
  const kn = new Set(knownSet);
  let progress = true;
  while (progress) {
    progress = false;
    for (const eq of equations) {
      const ha = kn.has(eq.a), hb = kn.has(eq.b), hc = kn.has(eq.c);
      if (ha + hb + hc === 2) { kn.add(!ha ? eq.a : !hb ? eq.b : eq.c); progress = true; }
    }
  }
  return kn;
}

function build(level, seed) {
  const { ops, span, mulMax, targetEq, hideFrac } = LEVELS[level];
  const rand = makeRng(seed);
  const LIMIT = 65, CENTER = 32;
  const G = { type: {}, op: {}, val: {} };
  const equations = [];

  let first = null;
  for (let t = 0; t < 40 && !first; t++) first = tryPlace(G, ops[Math.floor(rand() * ops.length)], 'H', CENTER, CENTER, 0, rand, span, mulMax, LIMIT);
  if (first) equations.push(first);

  let attempts = 0;
  while (equations.length < targetEq && attempts < 2500) {
    attempts++;
    const numKeys = Object.keys(G.type).filter(k => G.type[k] === 'num');
    if (!numKeys.length) break;
    const [ar, ac] = numKeys[Math.floor(rand() * numKeys.length)].split(',').map(Number);
    const role = [0, 2, 4][Math.floor(rand() * 3)];
    const orient = rand() < 0.5 ? 'H' : 'V';
    const op = ops[Math.floor(rand() * ops.length)];
    const res = tryPlace(G, op, orient, ar, ac, role, rand, span, mulMax, LIMIT);
    if (res) equations.push(res);
  }

  let minR = 1e9, maxR = -1e9, minC = 1e9, maxC = -1e9;
  Object.keys(G.type).forEach(k => { const [r, c] = k.split(',').map(Number); minR = Math.min(minR, r); maxR = Math.max(maxR, r); minC = Math.min(minC, c); maxC = Math.max(maxC, c); });

  // Yashiriladigan kataklarni tanlash: hamma ochiq holatdan boshlab, hali ham mantiq bilan
  // to'liq yechilsa — yashiraveramiz
  const nums = Object.keys(G.type).filter(k => G.type[k] === 'num');
  const known = new Set(nums);
  const target = Math.max(1, Math.round(nums.length * hideFrac));
  const order = nums.slice();
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  let hidden = 0;
  for (const k of order) {
    if (hidden >= target) break;
    known.delete(k);
    if (deduce(equations, known).size === nums.length) hidden++; else known.add(k);
  }
  const cells = Object.keys(G.type).map(k => {
    const [r, c] = k.split(',').map(Number), t = G.type[k];
    return t === 'num' ? { r, c, t, v: G.val[k], given: known.has(k) } : { r, c, t, op: t === 'op' ? G.op[k] : '=' };
  });
  return { cells, equations, bbox: { minR, maxR, minC, maxC }, hidden, totalNums: nums.length };
}

const RULE = {
  uz: "Tengliklar chapdan o'ngga va yuqoridan pastga o'qiladi. Bo'sh katakchalarga mos sonlarni yoz.",
  ru: 'Равенства читаются слева направо и сверху вниз. Впиши в пустые клетки нужные числа.',
  en: 'Equations read left to right and top to bottom. Fill the empty cells with the right numbers.'
};

export default {
  id: 'cross',
  name: { uz: 'Sonli krossvord', ru: 'Числовой кроссворд', en: 'Math crossword' },
  desc: {
    uz: "Kesishgan misollar: bo'sh katakchalarni hisoblab to'ldiring",
    ru: 'Пересекающиеся примеры: заполните пустые клетки',
    en: 'Crossing equations: fill in the missing numbers'
  },
  fileBase: { uz: 'sonli krossvord', ru: 'Числовой кроссворд', en: 'Math crossword' },
  defaultTitle: { uz: "Bo'sh katakchalarni to'ldir!", ru: 'Заполни пустые клетки!', en: 'Fill in the empty cells!' },
  options: [
    { key: 'level', type: 'level', default: 1 },
  ],
  levelHint: {
    uz: ['+ va −', '+, − va ×', '+, −, × va ÷', '+, −, × va ÷, katta sonlar'],
    ru: ['+ и −', '+, − и ×', '+, −, × и ÷', '+, −, × и ÷, большие числа'],
    en: ['+ and −', '+, − and ×', '+, −, × and ÷', '+, −, × and ÷, bigger numbers']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    return { level, seed, ...build(level, seed) };
  },

  info(p, lang) {
    const n = p.equations.length;
    return { uz: `${n} ta tenglik`, ru: `${n} равенств`, en: `${n} equations` }[lang] || `${n}`;
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = Math.max(0.7, Math.min(1, box.w / 186));
    const ruleFs = 10 * PT * scale;
    font(ctx, ruleFs, 400);
    const ruleLines = wrapLines(ctx, RULE[lang] || RULE.uz, box.w);
    const ruleH = ruleLines.length * ruleFs * 1.35, gap = 5 * scale;
    const bb = p.bbox, gw = bb.maxC - bb.minC + 1, gh = bb.maxR - bb.minR + 1;
    const cell = Math.min(box.w / gw, (box.h - ruleH - gap) / gh, 17);
    const blockH = gh * cell + gap + ruleH;
    const gx = box.x + (box.w - gw * cell) / 2;
    const gy = box.y + Math.max(0, (box.h - blockH) * 0.4);
    const X = c => gx + (c - bb.minC) * cell, Y = r => gy + (r - bb.minR) * cell;

    ctx.lineWidth = Math.max(0.3, Math.min(0.6, cell * 0.045));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const cl of p.cells) {
      const x = X(cl.c), y = Y(cl.r);
      if (cl.t !== 'num') { ctx.fillStyle = '#EEF2FF'; ctx.fillRect(x, y, cell, cell); }
      ctx.strokeStyle = INK; ctx.strokeRect(x, y, cell, cell);
      let text = null, color = INK;
      if (cl.t === 'num') {
        if (cl.given) text = String(cl.v);
        else if (showSolution) { text = String(cl.v); color = ANSWER; }
      } else text = cl.op;
      if (text === null) continue;
      const fs = cell * (cl.t === 'num' ? 0.5 : 0.55);
      font(ctx, fs, 700);
      const wdt = ctx.measureText(text).width;
      if (wdt > cell * 0.86) font(ctx, fs * cell * 0.86 / wdt, 700);
      ctx.fillStyle = cl.t === 'num' ? color : '#3D4A68';
      ctx.fillText(text, x + cell / 2, y + cell / 2 + cell * 0.03);
    }

    font(ctx, ruleFs, 400);
    ctx.fillStyle = MUTE; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ruleLines.forEach((ln, i) => ctx.fillText(ln, box.x + box.w / 2, gy + gh * cell + gap + i * ruleFs * 1.35));
    ctx.restore();
    return { cell };
  },

  hint(p, info, lang) {
    const n = p.equations.length;
    const T = { uz: `Tengliklar: ${n} · bo'sh katakcha: ${p.hidden} / ${p.totalNums}`, ru: `Равенств: ${n} · пустых клеток: ${p.hidden} из ${p.totalNums}`, en: `Equations: ${n} · empty cells: ${p.hidden} / ${p.totalNums}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const at = {};
    p.cells.forEach(c => { at[c.r + ',' + c.c] = c; });
    for (const eq of p.equations) {
      const A = at[eq.a].v, B = at[eq.b].v, C = at[eq.c].v;
      if (applyOp(A, eq.op, B) !== C) problems.push(`bad equation ${A}${eq.op}${B}=${C}`);
      if (![A, B, C].every(v => Number.isInteger(v) && v >= 1 && v <= MAXV)) problems.push('value out of range');
    }
    const nums = p.cells.filter(c => c.t === 'num');
    const given = nums.filter(c => c.given).map(c => c.r + ',' + c.c);
    if (deduce(p.equations, given).size !== nums.length) problems.push('not deducible');
    if (p.hidden !== nums.length - given.length) problems.push('hidden count mismatch');
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-cross" aria-hidden="true"><defs><linearGradient id="cg-cross" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#43e97b"/><stop offset="1" stop-color="#38b2ac"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-cross)"/><g stroke="#1f2a44" stroke-width="2.5"><rect x="16" y="20" width="32" height="32" rx="5" fill="#fff"/><rect x="50" y="20" width="32" height="32" rx="5" fill="#E0E7FF"/><rect x="84" y="20" width="32" height="32" rx="5" fill="#fff"/><rect x="118" y="20" width="32" height="32" rx="5" fill="#E0E7FF"/><rect class="x-open" x="152" y="20" width="32" height="32" rx="5" fill="#fff"/><rect x="84" y="54" width="32" height="32" rx="5" fill="#E0E7FF"/><rect x="84" y="88" width="32" height="32" rx="5" fill="#fff"/><rect x="84" y="122" width="32" height="32" rx="5" fill="#E0E7FF"/><rect class="x-open" x="84" y="156" width="32" height="32" rx="5" fill="#fff"/></g><g font-family="Nunito,Arial,sans-serif" font-size="21" font-weight="900" fill="#1f2a44" text-anchor="middle"><text class="x-t x-t1" x="32" y="44">3</text><text x="66" y="44">+</text><text class="x-t x-t2" x="100" y="44">5</text><text x="134" y="44">=</text><text class="x-q" x="168" y="44">?</text><text x="100" y="78">×</text><text class="x-t x-t3" x="100" y="112">2</text><text x="100" y="146">=</text><text class="x-q" x="100" y="180">?</text></g></svg>`
};
