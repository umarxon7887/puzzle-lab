// hiddenop.js — «Yashirin amal» (Скрытое правило / Hidden rule) generatori. v2.8
// Ikki turdagi qator:
//   ex      — misollar (36 ◆ 16 = 10, 49 ◆ 25 = 12) dan ◆ qanday amal ekanini topib, yangi misolni hisoblash;
//   nest    — ichma-ich shakllar (IQ 2026 №8): har shakl ichidagi songa o'z amalini qiladi, avval ichkisi;
//   machine — har bir shakl sonni o'zgartiradigan «mashina» (4 → ▲ → 12); ikkita misoldan shakl amalini topib,
//             sonni bir nechta mashinadan o'tkazish.
// Kafolat (check()): kutubxonadagi misollarga mos keladigan BARCHA qoidalar savol uchun bitta javob beradi;
// mashinalar chiziqli (k·x + c yoki ÷k), ikki misol ularni bir qiymatli aniqlaydi.
// Qolip: Az «Qeyri-aşkar operatorlar»; IQ 2026 №8, 9, 12, 15–17, 19.

import { makeRng, randInt, shuffle, pickOne } from '../core/rng.js';
import { INK, MUTE, ANSWER, PT, font } from '../core/draw.js';
import { scaleOf, measureRule, drawRule, ruPlural } from '../core/parts.js';
import { measureTokens, drawTokens, numText, nestOuter } from './numkit.js';

const isSq = v => Number.isInteger(Math.sqrt(v));
// Yashirin qoidalar kutubxonasi: f — hisob; ok — kirish sonlari mosmi; text — javobda ko'rsatiladigan qoida
const RULES = {
  add: { f: (a, b) => a + b, text: 'a + b' },
  sub: { f: (a, b) => a - b, ok: (a, b) => a >= b, text: 'a − b' },
  add1: { f: (a, b) => a + b + 1, text: 'a + b + 1' },
  sub1: { f: (a, b) => a + b - 1, text: 'a + b − 1' },
  add2: { f: (a, b) => a + b + 2, text: 'a + b + 2' },
  mul: { f: (a, b) => a * b, text: 'a · b' },
  mul1: { f: (a, b) => a * b + 1, text: 'a · b + 1' },
  mulm1: { f: (a, b) => a * b - 1, text: 'a · b − 1' },
  a2b: { f: (a, b) => a + 2 * b, text: 'a + 2 · b' },
  b2a: { f: (a, b) => 2 * a + b, text: '2 · a + b' },
  sum2: { f: (a, b) => (a + b) * 2, text: '(a + b) · 2' },
  mulA: { f: (a, b) => a * b - a, text: 'a · b − a' },
  mulB: { f: (a, b) => a * b + b, text: 'a · b + b' },
  diff2: { f: (a, b) => (a - b) * 2, ok: (a, b) => a >= b, text: '(a − b) · 2' },
  mulAB: { f: (a, b) => a * b - a - b, text: 'a · b − a − b' },
  sqd: { f: (a, b) => a * a - b, text: 'a · a − b' },
  avg: { f: (a, b) => (a + b) / 2, ok: (a, b) => (a + b) % 2 === 0, text: '(a + b) : 2' },
  sqrt: { f: (a, b) => Math.sqrt(a) + Math.sqrt(b), ok: (a, b) => isSq(a) && isSq(b), text: '√a + √b' },
  sqrtm: { f: (a, b) => Math.sqrt(a) * Math.sqrt(b), ok: (a, b) => isSq(a) && isSq(b), text: '√a · √b' },
  sqrtd: { f: (a, b) => Math.sqrt(a) - Math.sqrt(b), ok: (a, b) => isSq(a) && isSq(b) && a >= b, text: '√a − √b' },
  half: { f: (a, b) => a * b / 2, ok: (a, b) => (a * b) % 2 === 0, text: 'a · b : 2' },
  dsq: { f: (a, b) => (a - b) * (a - b), text: '(a − b) · (a − b)' },
  sub0: { f: (a, b) => Math.abs(a - b), text: '|a − b|' }
};
const valid = (r, a, b) => !RULES[r].ok || RULES[r].ok(a, b);
const goodVal = v => Number.isInteger(v) && v >= 0 && v <= 999;

// rules — shu darajadagi qoidalar; inp — sonlar oralig'i; sq — kvadrat sonlar ham; machines — mashina qatorlari soni
// special — misol qatorlaridan tashqari qatorlar: machine (shakl-mashinalar), perm (o'rin almashtirish X, Y),
// sides (ko'pburchak tomonlari soni qoidada)
const LEVELS = [
  { rules: ['add', 'sub', 'add1', 'sub1', 'add2'], inp: [2, 20], ex: 2, chain: 0, special: [], perm: [], count: [6, 3, 2] },
  { rules: ['mul', 'mul1', 'mulm1', 'a2b', 'b2a', 'sum2'], inp: [2, 9], ex: 2, chain: 0, special: ['perm'], perm: ['X'], count: [6, 3, 2] },
  { rules: ['mulA', 'mulB', 'diff2', 'mulAB', 'sqd', 'avg'], inp: [2, 12], ex: 3, chain: 2, special: ['machine', 'perm', 'sides', 'nest'], perm: ['X', 'X'], count: [6, 3, 2] },
  { rules: ['sqrt', 'sqrtm', 'sqrtd', 'half', 'dsq', 'mulAB'], inp: [2, 15], ex: 3, chain: 3, special: ['machine', 'perm', 'sides', 'nest'], perm: ['X', 'Y'], count: [6, 3, 2] }
];
const SQUARES = [4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144];

// Misollarga mos keladigan barcha qoidalar bo'yicha savolning javoblari
export function predictions(examples, q) {
  const out = new Set();
  for (const [id, R] of Object.entries(RULES)) {
    if (![...examples, q].every(([a, b]) => valid(id, a, b))) continue;
    if (!examples.every(([a, b, c]) => R.f(a, b) === c)) continue;
    out.add(R.f(q[0], q[1]));
  }
  return out;
}

function exRow(L, rand, rule) {
  const R = RULES[rule], sq = ['sqrt', 'sqrtm', 'sqrtd'].includes(rule);
  const pickIn = () => (sq ? pickOne(rand, SQUARES) : randInt(rand, L.inp[0], L.inp[1]));
  for (let guard = 0; guard < 600; guard++) {
    const pair = () => { for (let t = 0; t < 50; t++) { const a = pickIn(), b = pickIn(); if (valid(rule, a, b) && goodVal(R.f(a, b)) && a !== b) return [a, b, R.f(a, b)]; } return null; };
    const q = pair();
    if (!q) continue;
    const ex = [];
    for (let i = 0; i < L.ex; i++) { const e = pair(); if (e) ex.push(e); }
    if (ex.length < L.ex || new Set([...ex, q].map(e => e.join(','))).size !== ex.length + 1) continue;
    let pr = predictions(ex, q);
    while (pr.size > 1 && ex.length < 4) { const e = pair(); if (!e) break; ex.push(e); pr = predictions(ex, q); }
    if (pr.size !== 1 || !pr.has(q[2])) continue;
    return { t: 'ex', rule, ex, q };
  }
  throw new Error('hiddenop: no row');
}

// Mashina: x → k·x + c yoki x → x : k
const MACH = ['triangle', 'circle', 'square', 'star', 'diamond'];
const runM = (m, x) => (m.div ? x / m.div : m.k * x + m.c);
function randMachine(rand) {
  const t = pickOne(rand, ['add', 'sub', 'mul', 'mul', 'div', 'lin']);
  if (t === 'add') return { k: 1, c: randInt(rand, 2, 9) };
  if (t === 'sub') return { k: 1, c: -randInt(rand, 1, 5) };
  if (t === 'mul') return { k: randInt(rand, 2, 4), c: 0 };
  if (t === 'div') return { div: 2, k: 0, c: 0 };
  return { k: 2, c: pickOne(rand, [1, -1, 3]) };
}
export const machText = m => (m.div ? `x : ${m.div}` : m.k === 1 ? `x ${m.c >= 0 ? '+' : '−'} ${Math.abs(m.c)}` : m.c === 0 ? `x · ${m.k}` : `${m.k} · x ${m.c >= 0 ? '+' : '−'} ${Math.abs(m.c)}`);
// nest: shakllar ichkidan tashqiga (shapes[0] — eng ichkisi, u doira yoki kvadrat: son sig'ishi uchun)
const NEST = ['circle', 'square', 'hexagon', 'diamond'];
function machineRow(L, rand, nest = false) {
  for (let guard = 0; guard < 600; guard++) {
    // ichkisi — doira, kvadrat yoki oltiburchak; romb faqat eng tashqida
    const shapes = nest ? [pickOne(rand, ['circle', 'square', 'hexagon']), ...shuffle(NEST.slice(0, 3), rand), 'diamond'].filter((v, i, a) => a.indexOf(v) === i).slice(0, L.chain)
      : shuffle(MACH.slice(), rand).slice(0, L.chain);
    const ms = shapes.map(() => randMachine(rand));
    if (new Set(ms.map(machText)).size !== ms.length) continue;
    const examples = ms.map(m => {
      const xs = shuffle(Array.from({ length: 10 }, (_, i) => i + 2).filter(x => goodVal(runM(m, x)) && runM(m, x) > 0), rand).slice(0, 2);
      return xs.map(x => [x, runM(m, x)]);
    });
    if (examples.some(e => e.length < 2 || e[0][0] === e[1][0])) continue;
    let x = randInt(rand, 2, 9), okc = true;
    const start = x;
    for (const m of ms) { x = runM(m, x); if (!goodVal(x) || x <= 0) okc = false; }
    if (!okc) continue;
    return { t: nest ? 'nest' : 'machine', shapes, ms, examples, start, ans: x };
  }
  throw new Error('hiddenop: no machine row');
}

// O'rin almashtirish: X (va Y) — 4 ta joyning yangi tartibi; out[i] = in[p[i]] (IQ 2026 №9, 12)
const PSHAPES = ['circle', 'triangle', 'square', 'star', 'heart', 'diamond'];
const applyP = (p, arr) => p.map(i => arr[i]);
function permRow(L, rand) {
  for (let guard = 0; guard < 200; guard++) {
    const perms = {};
    for (const nm of new Set(L.perm)) {
      let p; do p = shuffle([0, 1, 2, 3], rand); while (p.every((v, i) => v === i) || p.filter((v, i) => v === i).length > 1);
      perms[nm] = p;
    }
    const pal = shuffle(PSHAPES.slice(), rand).slice(0, 4);
    const exs = Object.entries(perms).map(([nm, p]) => { const a = shuffle(pal.slice(), rand); return { nm, a, b: applyP(p, a) }; });
    const start = shuffle(pal.slice(), rand);
    let cur = start;
    for (const nm of L.perm) cur = applyP(perms[nm], cur);
    if (cur.join() === start.join()) continue;
    return { t: 'perm', perms, steps: L.perm.slice(), exs, start, ans: cur };
  }
  throw new Error('hiddenop: no perm row');
}
// Ko'pburchak qoidasi: ichidagi son x, tomonlar soni n → natija (IQ 2026 №15–17)
const SIDES = {
  mul: { f: (n, x) => n * x, text: 'n · x' }, add: { f: (n, x) => n + x, text: 'x + n' },
  mulm: { f: (n, x) => n * x - n, text: 'n · x − n' }, sub1: { f: (n, x) => (n - 1) * x, text: '(n − 1) · x' },
  sqn: { f: (n, x) => x * x - n, text: 'x · x − n' }
};
function sidesRow(L, rand) {
  const ids = Object.keys(SIDES);
  for (let guard = 0; guard < 400; guard++) {
    const id = pickOne(rand, ids), R = SIDES[id];
    const ns = shuffle([3, 4, 5, 6], rand), ex = ns.slice(0, 3).map(k => { const x = randInt(rand, 2, 9); return [k, x, R.f(k, x)]; });
    const q = [ns[3], randInt(rand, 2, 9)];
    if ([...ex.map(e => e[2]), R.f(q[0], q[1])].some(v => !goodVal(v))) continue;
    const pr = new Set(Object.values(SIDES).filter(S2 => ex.every(([k, x, y]) => S2.f(k, x) === y)).map(S2 => S2.f(q[0], q[1])));
    if (pr.size !== 1) continue;
    return { t: 'sides', rule: id, ex, q, ans: R.f(q[0], q[1]) };
  }
  throw new Error('hiddenop: no sides row');
}
export const sidesPred = r => new Set(Object.values(SIDES).filter(S2 => r.ex.every(([k, x, y]) => S2.f(k, x) === y)).map(S2 => S2.f(r.q[0], r.q[1])));

const n = v => ({ t: 'n', v }), S = sym => ({ t: 'sym', shape: sym }), A = { t: 'arrow' }, EQ = { t: 'op', v: '=' }, G = w => ({ t: 'gap', w });
const EX_SYM = 'diamond';
// satr balandligi (oddiy satr ulushida): ichma-ich shakl kattaroq joy oladi
const lineH = shapes => Math.max(1, (2 * nestOuter(shapes) + 0.3) / 1.75);
// Qator — bir nechta satr (har biri tokenlar ro'yxati)
export function rowLines(row) {
  if (row.t === 'perm') {
    const ln = row.exs.map(e => [...e.a.map(S), { t: 'arrow', label: e.nm }, ...e.b.map(S)]);
    ln.push([...row.start.map(S), ...row.steps.map(nm => ({ t: 'arrow', label: nm })), ...row.ans.map(sh => ({ t: 'sbox', shape: sh }))]);
    return ln;
  }
  if (row.t === 'sides') {
    const ex = [];
    row.ex.forEach(([k, x, y], i) => { if (i) ex.push(G(1.2)); ex.push({ t: 'poly', n: k, v: x }, EQ, n(y)); });
    return [ex, [{ t: 'poly', n: row.q[0], v: row.q[1] }, EQ, { t: 'box', v: row.ans, w: 2 }]];
  }
  if (row.t === 'ex') {
    const exs = [];
    row.ex.forEach((e, i) => { if (i) exs.push(G(1.4)); exs.push(n(e[0]), S(EX_SYM), n(e[1]), EQ, n(e[2])); });
    return [exs, [n(row.q[0]), S(EX_SYM), n(row.q[1]), EQ, { t: 'box', v: row.q[2], w: 2 }]];
  }
  if (row.t === 'nest') {
    const ln = row.shapes.map((sh, k) => {
      const l = [];
      row.examples[k].forEach(([x, y], j) => { if (j) l.push(G(1.4)); l.push({ t: 'nest', shapes: [sh], v: x }, EQ, n(y)); });
      l.h = lineH([sh]);
      return l;
    });
    const q = [{ t: 'nest', shapes: row.shapes.slice().reverse(), v: row.start }, EQ, { t: 'box', v: row.ans, w: 2 }];
    q.h = lineH(row.shapes);
    ln.push(q);
    return ln;
  }
  const lines = row.shapes.map((sh, k) => {
    const ln = [];
    row.examples[k].forEach(([x, y], j) => { if (j) ln.push(G(1.4)); ln.push(n(x), A, S(sh), A, n(y)); });
    return ln;
  });
  const q = [n(row.start)];
  row.shapes.forEach(s => q.push(A, S(s)));
  q.push(A, { t: 'box', v: row.ans, w: 2 });
  lines.push(q);
  return lines;
}
const RULE_WORD = { uz: 'Qoida', ru: 'Правило', en: 'Rule' };
const POS_WORD = { uz: "o'rinlar", ru: 'места', en: 'places' };
function ruleOf(row, lang) {
  const w = RULE_WORD[lang] || RULE_WORD.uz;
  if (row.t === 'ex') return `${w}: ${RULES[row.rule].text}`;
  if (row.t === 'perm') return `${w}: ` + Object.entries(row.perms).map(([nm, p]) => `${nm} — ${POS_WORD[lang] || POS_WORD.uz} ${p.map(i => i + 1).join('')}`).join(';  ');
  if (row.t === 'sides') return `${w}: ${SIDES[row.rule].text} (n — ${{ uz: 'tomonlar soni', ru: 'число сторон', en: 'number of sides' }[lang]})`;
  return `${w}: ${row.ms.map(machText).join(';  ')}`;
}

const RULE = {
  uz: "Har qatorda yashirin qoida bor. Misollardan qoidani top va bo'sh katakka javobni yoz. Har bir shakl sonni doim bir xil usulda o'zgartiradi; ichma-ich shakllarda avval ichkisi, keyin tashqisi ishlaydi. X va Y strelkalari shakllarning o'rnini doim bir xil almashtiradi; ko'pburchakdagi natija tomonlari soniga bog'liq.",
  ru: 'В каждом ряду спрятано правило. Найди его по примерам и впиши ответ в пустую клетку. Каждая фигура всегда одинаково меняет число; во вложенных фигурах сначала действует внутренняя, потом внешняя. Стрелки X и Y всегда одинаково переставляют фигуры; в многоугольнике ответ зависит от числа сторон.',
  en: 'Each row hides a rule. Find it from the examples and write the answer in the empty box. A shape always changes a number the same way; in shapes inside shapes the inner one works first, then the outer one. Arrows X and Y always rearrange the shapes the same way; in a polygon the answer depends on the number of sides.'
};

export default {
  id: 'hiddenop',
  skills: ['patterns', 'counting', 'logic'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Yashirin amal', ru: 'Скрытое правило', en: 'Hidden rule' },
  desc: {
    uz: "Misollardan (36 ◆ 16 = 10) yoki shakl-mashinalardan yashirin amalni topib, yangi misolni hisoblang",
    ru: 'По примерам (36 ◆ 16 = 10) или фигурам-машинам найдите скрытое правило и решите новый пример',
    en: 'Find the hidden rule from examples (36 ◆ 16 = 10) or shape machines and solve a new one'
  },
  fileBase: { uz: 'Yashirin amal', ru: 'Скрытое правило', en: 'Hidden rule' },
  defaultTitle: { uz: 'Yashirin qoidani top!', ru: 'Найди скрытое правило!', en: 'Find the hidden rule!' },
  options: [{ key: 'level', type: 'level', default: 1 }],
  levelHint: {
    uz: ["Qo'shish va ayirish, 2 ta misol", "Ko'paytirishli qoidalar, shakllar o'rnini almashtirish", "Murakkab qoidalar, shakl-mashinalar, ichma-ich shakllar, ko'pburchaklar", "Kvadrat ildiz, uchta mashina yoki uchta ichma-ich shakl, X va Y"],
    ru: ['Сложение и вычитание, 2 примера', 'Правила с умножением, перестановка фигур', 'Сложные правила, фигуры-машины, вложенные фигуры, многоугольники', 'Квадратный корень, три машины или три вложенные фигуры, X и Y'],
    en: ['Adding and subtracting, 2 examples', 'Multiplying rules, rearranging shapes', 'Harder rules, shape machines, nested shapes, polygons', 'Square roots, three machines or three nested shapes, X and Y']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level];
    const rand = makeRng(seed);
    const count = L.count[opts.perPage === 4 ? 2 : opts.perPage === 2 ? 1 : 0];
    const special = shuffle(L.special.slice(), rand).slice(0, Math.max(L.special.length ? 1 : 0, Math.floor(count * 2 / 3)));
    const rules = shuffle(L.rules.slice(), rand);
    const rows = [];
    for (let i = 0; i < count - special.length; i++) rows.push(exRow(L, rand, rules[i % rules.length]));
    for (const k of special) rows.push(k === 'machine' ? machineRow(L, rand) : k === 'nest' ? machineRow(L, rand, true) : k === 'perm' ? permRow(L, rand) : sidesRow(L, rand));
    return { level, seed, rows };
  },

  info(p, lang) {
    const c = p.rows.length;
    return { uz: `${c} ta qator`, ru: `${c} ${ruPlural(c, 'ряд', 'ряда', 'рядов')}`, en: `${c} row${c > 1 ? 's' : ''}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box), n = p.rows.length;
    const rule = measureRule(ctx, RULE[lang] || RULE.uz, box.w, scale);
    const gap = 5 * scale, numW = 8 * scale, H = box.h - rule.h - gap;
    const all = p.rows.map(rowLines);
    const units = Math.max(...all.flat().map(t => measureTokens(ctx, t, 1)));
    const hOf = l => l.h || 1;
    const nLines = all.reduce((s, ls) => s + ls.reduce((a, l) => a + hOf(l), 0), 0) + (showSolution ? n * 0.6 : 0);
    const fs = Math.min((box.w - numW) / units, (H - n * gap) / (nLines * 1.75), 8 * scale);
    const lh = fs * 1.75;
    const blockH = nLines * lh + n * gap;
    let y = box.y + Math.max(0, (H - blockH) * 0.3);
    const x0 = box.x + (box.w - numW - units * fs) / 2;
    all.forEach((lines, i) => {
      font(ctx, Math.min(fs * 0.75, 4.4 * scale), 800); ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(`${i + 1}.`, x0, y + lh / 2);
      let ly = y;
      lines.forEach(tk => { drawTokens(ctx, tk, x0 + numW, ly + hOf(tk) * lh / 2, fs, { show: showSolution, scale }); ly += hOf(tk) * lh; });
      y = ly;
      if (showSolution) {
        font(ctx, fs * 0.7, 700); ctx.fillStyle = ANSWER; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(ruleOf(p.rows[i], lang), x0 + numW, y + lh * 0.25);
        y += lh * 0.6;
      }
      y += gap;
    });
    drawRule(ctx, rule, box.x + box.w / 2, y);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const T = { uz: `Qatorlar: ${p.rows.length}`, ru: `Рядов: ${p.rows.length}`, en: `Rows: ${p.rows.length}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    p.rows.forEach((r, i) => {
      if (r.t === 'ex') {
        const pr = predictions(r.ex, r.q);
        if (pr.size !== 1 || !pr.has(r.q[2])) problems.push(`#${i}: ${pr.size} answers`);
        if (RULES[r.rule].f(r.q[0], r.q[1]) !== r.q[2]) problems.push(`#${i}: wrong answer`);
      } else if (r.t === 'perm') {
        // misoldan almashtirish qayta tiklanadi (shakllar har xil — yagona) va savolga qo'llanadi
        let cur = r.start;
        for (const nm of r.steps) {
          const e = r.exs.find(x => x.nm === nm);
          if (new Set(e.a).size !== 4) problems.push(`#${i}: example shapes repeat`);
          const p = e.b.map(sh => e.a.indexOf(sh));
          cur = applyP(p, cur);
        }
        if (cur.join() !== r.ans.join()) problems.push(`#${i}: perm answer`);
      } else if (r.t === 'sides') {
        const pr = sidesPred(r);
        if (pr.size !== 1 || !pr.has(r.ans)) problems.push(`#${i}: sides ${pr.size} answers`);
      } else {
        let x = r.start;
        r.ms.forEach((m, k) => {
          const e = r.examples[k];
          // ikki misoldan chiziqli qoida: k = (y2 − y1)/(x2 − x1), c = y1 − k·x1
          const kk = (e[1][1] - e[0][1]) / (e[1][0] - e[0][0]), cc = e[0][1] - kk * e[0][0];
          if (e.some(([a, b]) => runM(m, a) !== b)) problems.push(`#${i}: machine example wrong`);
          if (Math.abs(kk * x + cc - runM(m, x)) > 1e-9) problems.push(`#${i}: machine not determined`);
          x = runM(m, x);
          if (!goodVal(x)) problems.push(`#${i}: bad value`);
        });
        if (x !== r.ans) problems.push(`#${i}: chain answer`);
      }
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-hiddenop" aria-hidden="true"><defs><linearGradient id="cg-hiddenop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c1dfc4"/><stop offset="1" stop-color="#deecdd"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-hiddenop)"/><rect x="18" y="34" width="164" height="132" rx="16" fill="#fff"/><g font-family="Nunito, sans-serif" font-weight="900" font-size="20" text-anchor="middle" fill="#111827"><text x="44" y="77">36</text><text x="92" y="77">16</text><text x="124" y="77">=</text></g><polygon points="68,60 75,70 68,80 61,70" fill="#111827"/><text x="152" y="77" font-family="Nunito, sans-serif" font-weight="900" font-size="20" text-anchor="middle" fill="#111827">10</text><g font-family="Nunito, sans-serif" font-weight="900" font-size="20" text-anchor="middle" fill="#111827"><text x="44" y="115">49</text><text x="92" y="115">25</text><text x="124" y="115">=</text></g><polygon points="68,98 75,108 68,118 61,108" fill="#111827"/><text x="152" y="115" font-family="Nunito, sans-serif" font-weight="900" font-size="20" text-anchor="middle" fill="#111827">12</text><g font-family="Nunito, sans-serif" font-weight="900" font-size="20" text-anchor="middle" fill="#111827"><text x="44" y="153">64</text><text x="92" y="153">9</text><text x="124" y="153">=</text></g><polygon points="68,136 75,146 68,156 61,146" fill="#111827"/><rect x="136" y="132" width="34" height="28" rx="6" fill="#fff" stroke="#111827" stroke-width="2.5"/><text class="ho-a" x="153" y="153" font-family="Nunito, sans-serif" font-weight="900" font-size="19" text-anchor="middle" fill="#DC2626">11</text></svg>`
};
