// numshapes.js — «Sonli shakllar» (Числа в фигурах / Number shapes) generatori. v2.8
// Shakllardagi sonlar bitta qoidaga bo'ysunadi; qoidani topib «?» ni to'ldirish kerak. Ikki xil qator:
//   qator-namuna — bir xil shakllar ketma-ket (namunalar + savol): uchburchak, xoch, bo'lingan doira, daraxt,
//                  gul, juft shakllar (o'xshatish: 5 → 25, 7 → 49), bir-biriga ulangan xochlar;
//                  ikki uchburchakdan kvadrat (△a, △b → □);
//   bitta shakl  — o'zining ichida namuna bor: 3×3 son jadvali (qatorlar qoidasi), kartalar halqasi va
//                  sakkizburchak (qarama-qarshi sonlar juftligi), kesmalar (chap uchdan o'ng uch: x va y ni topish),
//                  X/Y/T jadvali (T = f(X, Y)), uchburchak uchlarida a, b, c — tomonlarida ularning yig'indisi
//                  yoki ko'paytmasi (namuna uchburchak bilan; a, b, c ni topish).
// Qiyin darajalarda «?» chetdagi sonda ham bo'ladi.
// Kafolat (check()): shu turdagi kutubxonadagi namunalarga mos keladigan BARCHA qoidalar «?» uchun bitta son beradi.
// Qolip: rus IQ kitobi M2, M4, M9, M12, M13, M16, M18, M19, M20, M26, M27; Az «Fiqur-ədəd əlaqələri»;
// IQ 2026 №4, 6, 10, 11, 18; Litsey IQ №3, 4, 6, 7.

import { makeRng, randInt, shuffle, pickOne } from '../core/rng.js';
import { INK, MUTE, ANSWER, PT, font, roundRect } from '../core/draw.js';
import { scaleOf, measureRule, drawRule, ruPlural } from '../core/parts.js';

// ---------- Qoidalar kutubxonasi ----------
const U = {                                       // bir o'zgaruvchili: y = g(x)  (o'xshatish, kartalar halqasi)
  add3: { f: x => x + 3, t: 'x + 3' }, add5: { f: x => x + 5, t: 'x + 5' }, add7: { f: x => x + 7, t: 'x + 7' },
  mul2: { f: x => 2 * x, t: '2 · x' }, mul3: { f: x => 3 * x, t: '3 · x' }, mul4: { f: x => 4 * x, t: '4 · x' },
  lin1: { f: x => 2 * x + 1, t: '2 · x + 1' }, lin2: { f: x => 3 * x - 1, t: '3 · x − 1' }, lin3: { f: x => 2 * x - 3, t: '2 · x − 3' },
  sq: { f: x => x * x, t: 'x · x' }, sq1: { f: x => x * x + 1, t: 'x · x + 1' }, xx1: { f: x => x * (x + 1), t: 'x · (x + 1)' },
  sqm: { f: x => x * x - x, t: 'x · x − x' }
};
const RULES = {
  tri: {
    sum: { f: ([a, b, c]) => a + b + c, t: 'a + b + c' },
    abmc: { f: ([a, b, c]) => a + b - c, t: 'a + b − c' },
    bcma: { f: ([a, b, c]) => b + c - a, t: 'b + c − a' },
    abc: { f: ([a, b, c]) => a * b - c, t: 'a · b − c' },
    abpc: { f: ([a, b, c]) => a * b + c, t: 'a · b + c' },
    apbc: { f: ([a, b, c]) => (a + b) * c, t: '(a + b) · c' },
    bpca: { f: ([a, b, c]) => (b + c) * a, t: '(b + c) · a' },
    sum2: { f: ([a, b, c]) => (a + b + c) * 2, t: '(a + b + c) · 2' },
    prod: { f: ([a, b, c]) => a * b * c, t: 'a · b · c' }
  },
  cross: {
    sum4: { f: ([t, r, b, l]) => t + r + b + l, t: '$T + $R + $B + $L' },
    vh: { f: ([t, r, b, l]) => t + b - (l + r), t: '($T + $B) − ($L + $R)' },
    pp: { f: ([t, r, b, l]) => t * b - l * r, t: '$T · $B − $L · $R' },
    ps: { f: ([t, r, b, l]) => t * b + l * r, t: '$T · $B + $L · $R' },
    pd: { f: ([t, r, b, l]) => (t + b) * (r - l), t: '($T + $B) · ($R − $L)' }
  },
  circle: {
    add: { f: ([a, b]) => a + b, t: 'a + b' },
    mul: { f: ([a, b]) => a * b, t: 'a · b' },
    mul1: { f: ([a, b]) => a * b + 1, t: 'a · b + 1' },
    mulb: { f: ([a, b]) => a * b - b, t: 'a · b − b' },
    sum2: { f: ([a, b]) => (a + b) * 2, t: '(a + b) · 2' },
    sq: { f: ([a, b]) => a * a + b, t: 'a · a + b' },
    sub: { f: ([a, b]) => a - b, t: 'a − b' }
  },
  // daraxt: tepada u1, u2, pastda d1, d2, o'rtada natija
  tree: {
    all: { f: ([a, b, c, d]) => a + b + c + d, t: '(u1 + u2) + (d1 + d2)' },
    diff: { f: ([a, b, c, d]) => a + b - (c + d), t: '(u1 + u2) − (d1 + d2)' },
    pp: { f: ([a, b, c, d]) => a * b - c * d, t: 'u1 · u2 − d1 · d2' },
    pps: { f: ([a, b, c, d]) => a * b + c + d, t: 'u1 · u2 + d1 + d2' },
    sp: { f: ([a, b, c, d]) => (a + b) * (c - d), t: '(u1 + u2) · (d1 − d2)' }
  },
  // gul: 5 ta gulbarg, o'rtada natija
  flower: {
    sum: { f: p => p.reduce((s, v) => s + v, 0), t: 'Σ' },
    summ: { f: p => p.reduce((s, v) => s + v, 0) - 10, t: 'Σ − 10' },
    sum2: { f: p => p.reduce((s, v) => s + v, 0) * 2, t: 'Σ · 2' },
    half: { f: p => p.reduce((s, v) => s + v, 0) / 2, t: 'Σ : 2' }
  },
  analog: Object.fromEntries(Object.entries(U).map(([k, r]) => [k, { f: ([x]) => r.f(x), t: r.t }]))
};
RULES.linked = RULES.cross;
// ikki kirishli qoidalar (X/Y/T jadvali va «ikki uchburchak → kvadrat»)
const R2 = {
  ...RULES.circle,
  a2b: { f: ([a, b]) => a + 2 * b, t: 'a + 2 · b' },
  ab2: { f: ([a, b]) => 2 * a + b, t: '2 · a + b' },
  abma: { f: ([a, b]) => a * b - a, t: 'a · b − a' },
  sqs: { f: ([a, b]) => a * a + b * b, t: 'a · a + b · b' }
};
RULES.tripair = R2;
const NIN = { tri: 3, cross: 4, circle: 2, tree: 4, flower: 5, analog: 1, linked: 4, tripair: 2 };
const SINGLE = new Set(['grid3', 'ring', 'octagon', 'segs', 'xyt', 'abc']);
const CROSS_WORDS = { uz: ['yuqori', 'o‘ng', 'past', 'chap'], ru: ['верх', 'право', 'низ', 'лево'], en: ['top', 'right', 'bottom', 'left'] };
const SUM_WORD = { uz: 'gulbarglar yig‘indisi', ru: 'сумма лепестков', en: 'sum of the petals' };

// pool — [tur, qoidalar]; ex — namunalar soni; hideIn — «?» kirish sonida ham; inp — sonlar oralig'i
const LEVELS = [
  { pool: [['circle', ['add', 'mul']], ['tri', ['sum']], ['analog', ['add3', 'add5', 'mul2', 'mul3']], ['ring', ['add5', 'mul2', 'add7']], ['tripair', ['add', 'mul']]], ex: 2, hideIn: false, inp: [1, 9], count: [5, 3, 2] },
  { pool: [['circle', ['mul1', 'sum2', 'mulb']], ['tri', ['abmc', 'abc', 'bcma']], ['cross', ['sum4']], ['grid3', ['add', 'mul', 'sub']], ['analog', ['lin1', 'lin2', 'sq']], ['octagon', ['sum']], ['segs', ['add5', 'mul2', 'mul3', 'lin1']], ['xyt', ['add', 'mul', 'a2b']], ['tripair', ['mul1', 'sum2', 'ab2']]], ex: 2, hideIn: false, inp: [1, 9], count: [5, 3, 2] },
  { pool: [['circle', ['sq', 'mulb', 'sum2']], ['tri', ['abpc', 'apbc', 'abc']], ['cross', ['vh', 'pp']], ['tree', ['all', 'diff', 'pps']], ['flower', ['sum', 'summ', 'half']], ['ring', ['lin1', 'sq', 'mul3']], ['segs', ['lin1', 'lin2', 'sq', 'lin3']], ['abc', ['sum']], ['tripair', ['abma', 'mulb', 'a2b']]], ex: 3, hideIn: true, inp: [2, 9], count: [4, 2, 2] },
  { pool: [['tri', ['bpca', 'sum2', 'prod', 'apbc']], ['linked', ['pp', 'ps', 'vh']], ['grid3', ['mul1', 'sq', 'sum2']], ['octagon', ['sum', 'prod']], ['tree', ['pp', 'sp']], ['analog', ['sq1', 'xx1', 'sqm', 'lin3']], ['xyt', ['mul1', 'sq', 'abma', 'sqs']], ['abc', ['sum', 'prod']], ['segs', ['sq1', 'xx1', 'sqm']]], ex: 3, hideIn: true, inp: [2, 9], count: [4, 2, 2] }
];
const okv = v => Number.isInteger(v) && v >= 0 && v <= 200;
const hidOf = it => (Array.isArray(it.h) ? it.h : [it.h]);
const ansKey = a => JSON.stringify(Array.isArray(a) ? a : [a]);
// bashoratlar to'plami (son yoki ansKey) aynan bitta va u javobmi
const predOK = (pr, ans) => pr.size === 1 && (pr.has(ans) || pr.has(ansKey(ans)));

// ---------- Qator-namuna: bashorat ----------
export function predictions(type, examples, q) {
  const out = new Set();
  for (const R of Object.values(RULES[type])) {
    if (!examples.every(e => R.f(e.ins) === e.out)) continue;
    if (q.hide === 'out') { const v = R.f(q.ins); if (okv(v)) out.add(v); }
    else for (let x = 0; x <= 99; x++) { const ins = q.ins.slice(); ins[q.hide] = x; if (R.f(ins) === q.out) out.add(x); }
  }
  return out;
}

function seriesRow(L, rand, type, ruleId) {
  const R = RULES[type][ruleId], N = NIN[type];
  const lo = type === 'analog' ? 2 : L.inp[0], hi = type === 'analog' ? 12 : type === 'flower' ? 9 : L.inp[1];
  const mk = (fixed = {}) => {
    for (let t = 0; t < 200; t++) {
      const ins = Array.from({ length: N }, (_, i) => (i in fixed ? fixed[i] : randInt(rand, lo, hi)));
      const o = R.f(ins);
      if (okv(o) && o > 0) return { ins, out: o };
    }
    return null;
  };
  for (let guard = 0; guard < 400; guard++) {
    const ex = [];
    // ulangan xochlar: keyingi xochning chap qanoti = oldingisining o'ng qanoti
    const nextFixed = () => (type === 'linked' && ex.length ? { 3: ex[ex.length - 1].ins[1] } : {});
    const nEx = type === 'tripair' ? Math.min(L.ex, 2) : L.ex;      // keng shakl — namuna kamroq
    for (let i = 0; i < nEx; i++) { const e = mk(nextFixed()); if (e) ex.push(e); }
    const qq = mk(nextFixed());
    if (ex.length < nEx || !qq) continue;
    let hide = L.hideIn && rand() < 0.5 ? randInt(rand, 0, N - 1) : 'out';
    if (type === 'linked' && hide === 3) hide = 'out';           // umumiy katak yashirilmaydi
    const q = { ...qq, hide };
    if (new Set([...ex, qq].map(e => e.ins.join(','))).size !== ex.length + 1) continue;
    let pr = predictions(type, ex, q);
    if (type !== 'linked') while (pr.size > 1 && ex.length < (type === 'tripair' ? 3 : 4)) { const e = mk(); if (!e) break; ex.push(e); pr = predictions(type, ex, q); }
    const ans = hide === 'out' ? q.out : q.ins[hide];
    if (pr.size !== 1 || !pr.has(ans)) continue;
    return { type, rule: ruleId, ex, q, ans };
  }
  throw new Error('numshapes: no row ' + type);
}

// ---------- Bitta shakl: 3×3 jadval, kartalar halqasi, sakkizburchak ----------
// grid3: har qatorda c = f(a, b); h — yashirilgan katak (2-qatorda)
function gridPred(g, h) {
  const out = new Set();
  for (const R of Object.values(RULES.circle)) {
    if (![0, 1].every(r => R.f([g[r * 3], g[r * 3 + 1]]) === g[r * 3 + 2])) continue;
    if (h === 8) { const v = R.f([g[6], g[7]]); if (okv(v)) out.add(v); }
    else for (let x = 0; x <= 99; x++) { const a = h === 6 ? x : g[6], b = h === 7 ? x : g[7]; if (R.f([a, b]) === g[8]) out.add(x); }
  }
  return out;
}
// ring: 6 ta karta, qarama-qarshilar juftligi y = g(x) (x — 0, 1, 2-o'rinlarda, y — 3, 4, 5-o'rinlarda)
function ringPred(v, h) {
  const out = new Set();
  for (const R of Object.values(U)) {
    if (![0, 1, 2].filter(i => i !== h && i + 3 !== h).every(i => R.f(v[i]) === v[i + 3])) continue;
    if (h >= 3) { const y = R.f(v[h - 3]); if (okv(y)) out.add(y); }
    else for (let x = 0; x <= 99; x++) if (R.f(x) === v[h + 3]) out.add(x);
  }
  return out;
}
// octagon: 8 ta sektor, qarama-qarshilar yig'indisi (yoki ko'paytmasi) bir xil
function octPred(v, h) {
  const out = new Set(), pairs = [0, 1, 2, 3].filter(i => i !== h % 4);
  const sums = new Set(pairs.map(i => v[i] + v[i + 4])), prods = new Set(pairs.map(i => v[i] * v[i + 4]));
  const other = v[(h + 4) % 8];
  if (sums.size === 1) { const x = [...sums][0] - other; if (okv(x)) out.add(x); }
  if (prods.size === 1 && other && [...prods][0] % other === 0) out.add([...prods][0] / other);
  return out;
}
// segs: 4 kesma «a → b», b = g(a); 3-kesmada o'ng uch (x), 4-kesmada chap uch (y) yashirin. Javob [x, y]
function segsPred(v) {
  const out = new Set();
  for (const R of Object.values(U)) {
    if (R.f(v[0]) !== v[1] || R.f(v[2]) !== v[3]) continue;
    const x = R.f(v[4]);
    if (!okv(x)) continue;
    for (let y = 0; y <= 99; y++) if (R.f(y) === v[7]) out.add(ansKey([x, y]));
  }
  return out;
}
// xyt: 3 qator (X, Y, T) × 4 ustun, T = f(X, Y); yashirin katak — oxirgi ustunda (3, 7 yoki 11)
function xytPred(v, h) {
  const out = new Set();
  for (const R of Object.values(R2)) {
    if (![0, 1, 2].every(c => R.f([v[c], v[4 + c]]) === v[8 + c])) continue;
    if (h === 11) { const t = R.f([v[3], v[7]]); if (okv(t)) out.add(ansKey(t)); }
    else for (let x = 0; x <= 99; x++) { const a = h === 3 ? x : v[3], b = h === 7 ? x : v[7]; if (R.f([a, b]) === v[11]) out.add(ansKey(x)); }
  }
  return out;
}
// abc: namuna uchburchak v[0..5] (uchlar a, b, c; tomonlar ab, bc, ca) va savol v[6..11] (uchlari yashirin)
const ABC_RULES = { sum: (a, b) => a + b, prod: (a, b) => a * b };
function abcPred(v) {
  const out = new Set();
  for (const f of Object.values(ABC_RULES)) {
    const [a, b, c, ab, bc, ca] = v;
    if (f(a, b) !== ab || f(b, c) !== bc || f(c, a) !== ca) continue;
    const [, , , qab, qbc, qca] = v.slice(6);
    for (let x = 1; x <= 30; x++) for (let y = 1; y <= 30; y++) {
      if (f(x, y) !== qab) continue;
      for (let z = 1; z <= 30; z++) if (f(y, z) === qbc && f(z, x) === qca) out.add(ansKey([x, y, z]));
    }
  }
  return out;
}
const SINGLE_PRED = {
  grid3: (it) => gridPred(it.v, it.h), ring: (it) => ringPred(it.v, it.h), octagon: (it) => octPred(it.v, it.h),
  segs: (it) => segsPred(it.v), xyt: (it) => xytPred(it.v, it.h), abc: (it) => abcPred(it.v)
};

function singleRow(L, rand, type, ruleId) {
  for (let guard = 0; guard < 600; guard++) {
    let v, h;
    if (type === 'grid3') {
      const R = RULES.circle[ruleId];
      v = [];
      for (let r = 0; r < 3; r++) { const a = randInt(rand, L.inp[0] + 1, 9), b = randInt(rand, 1, 9); v.push(a, b, R.f([a, b])); }
      if (v.some(x => !okv(x))) continue;
      h = L.hideIn && rand() < 0.4 ? pickOne(rand, [6, 7]) : 8;
    } else if (type === 'ring') {
      const R = U[ruleId], xs = shuffle([2, 3, 4, 5, 6, 7, 8, 9], rand).slice(0, 3);
      v = [...xs, ...xs.map(R.f)];
      if (v.some(x => !okv(x))) continue;
      h = L.hideIn && rand() < 0.4 ? randInt(rand, 0, 2) : randInt(rand, 3, 5);
    } else if (type === 'segs') {
      const R = U[ruleId], xs = shuffle([2, 3, 4, 5, 6, 7, 8, 9], rand).slice(0, 4);
      v = xs.flatMap(x => [x, R.f(x)]);
      if (v.some(x => !okv(x))) continue;
      h = [5, 6];
    } else if (type === 'xyt') {
      const R = R2[ruleId];
      const X = Array.from({ length: 4 }, () => randInt(rand, 2, 9)), Y = Array.from({ length: 4 }, () => randInt(rand, 1, 9));
      v = [...X, ...Y, ...X.map((x, i) => R.f([x, Y[i]]))];
      if (v.some(x => !okv(x)) || new Set(X.map((x, i) => x + ',' + Y[i])).size < 4) continue;
      h = L.hideIn && rand() < 0.5 ? pickOne(rand, [3, 7]) : 11;
    } else if (type === 'abc') {
      const f = ABC_RULES[ruleId], hi = ruleId === 'prod' ? 7 : 15, lo = ruleId === 'prod' ? 2 : 1;
      const tri = () => { const [a, b, c] = Array.from({ length: 3 }, () => randInt(rand, lo, hi)); return [a, b, c, f(a, b), f(b, c), f(c, a)]; };
      const e = tri(), q = tri();
      if (new Set(q.slice(0, 3)).size < 3 || new Set(e.slice(0, 3)).size < 3) continue;
      v = [...e, ...q];
      h = [6, 7, 8];
    } else {
      const S = ruleId === 'sum' ? randInt(rand, 10, 20) : pickOne(rand, [24, 36, 48, 60]);
      const firsts = ruleId === 'sum' ? shuffle(Array.from({ length: S - 1 }, (_, i) => i + 1), rand).slice(0, 4)
        : shuffle(Array.from({ length: S }, (_, i) => i + 1).filter(d => S % d === 0), rand).slice(0, 4);
      if (firsts.length < 4) continue;
      v = [...firsts, ...firsts.map(x => (ruleId === 'sum' ? S - x : S / x))];
      h = randInt(rand, 0, 7);
    }
    const ans = Array.isArray(h) ? h.map(i => v[i]) : v[h];
    if (!predOK(SINGLE_PRED[type]({ v, h }), ans)) continue;
    return { type, rule: ruleId, single: true, v, h, ans };
  }
  throw new Error('numshapes: no single ' + type);
}

// ---------- Chizish ----------
function valText(ctx, v, x, y, fs, hidden, show, ans, label = '?') {
  font(ctx, fs, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (hidden) {
    ctx.fillStyle = show ? ANSWER : label === '?' ? MUTE : '#4338CA';
    ctx.fillText(show ? String(ans) : label, x, y + fs * 0.05);
    return;
  }
  ctx.fillStyle = INK; ctx.fillText(String(v), x, y + fs * 0.05);
}
function drawShape(ctx, type, item, cx, cy, s, { hide = null, show = false, ans = null } = {}) {
  ctx.save();
  const lw = Math.max(0.3, s * 0.02);
  ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.lineJoin = 'round';
  const val = (v, x, y, fs, isH) => valText(ctx, v, x, y, fs, isH, show, ans);
  if (type === 'tri') {
    const R = s * 0.5, pts = [[cx, cy - R], [cx + R * 0.95, cy + R * 0.68], [cx - R * 0.95, cy + R * 0.68]];
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
    const fs = s * 0.12;
    val(item.ins[0], cx, cy - R * 0.42, fs, hide === 0);
    val(item.ins[1], cx - R * 0.5, cy + R * 0.47, fs, hide === 1);
    val(item.ins[2], cx + R * 0.5, cy + R * 0.47, fs, hide === 2);
    val(item.out, cx, cy + R * 0.06, fs * 1.25, hide === 'out');
  } else if (type === 'cross' || type === 'linked') {
    const c = s * 0.3, offs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const box = (x, y, fill) => { ctx.beginPath(); ctx.rect(x - c / 2, y - c / 2, c, c); ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); };
    box(cx, cy, '#EEF2FF');
    offs.forEach(([dx, dy], i) => { if (!(item.skipLeft && i === 3)) box(cx + dx * c, cy + dy * c, '#fff'); });
    const fs = c * 0.45;
    offs.forEach(([dx, dy], i) => { if (!(item.skipLeft && i === 3)) val(item.ins[i], cx + dx * c, cy + dy * c, fs, hide === i); });
    val(item.out, cx, cy, fs, hide === 'out');
  } else if (type === 'circle') {
    const R = s * 0.42;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + R); ctx.stroke();
    const fs = R * 0.38;
    val(item.out, cx, cy - R * 0.45, fs * 1.1, hide === 'out');
    val(item.ins[0], cx - R * 0.45, cy + R * 0.45, fs, hide === 0);
    val(item.ins[1], cx + R * 0.45, cy + R * 0.45, fs, hide === 1);
  } else if (type === 'tree') {
    const r = s * 0.13, dx = s * 0.26, dy = s * 0.32;
    const nodes = [[cx - dx, cy - dy], [cx + dx, cy - dy], [cx - dx, cy + dy], [cx + dx, cy + dy]];
    ctx.beginPath(); nodes.forEach(([x, y]) => { ctx.moveTo(cx, cy); ctx.lineTo(x, y); }); ctx.stroke();
    const node = (x, y, fill) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); };
    nodes.forEach(([x, y], i) => { node(x, y, '#fff'); val(item.ins[i], x, y, r * 0.95, hide === i); });
    roundRect(ctx, cx - r * 1.25, cy - r * 0.85, r * 2.5, r * 1.7, r * 0.4); ctx.fillStyle = '#EEF2FF'; ctx.fill(); ctx.stroke();
    val(item.out, cx, cy, r * 1.0, hide === 'out');
  } else if (type === 'flower') {
    const R = s * 0.3, pr = s * 0.15;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * 2 * Math.PI / 5, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
      ctx.beginPath(); ctx.arc(x, y, pr, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
      val(item.ins[i], x, y, pr * 0.95, hide === i);
    }
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.16, 0, Math.PI * 2); ctx.fillStyle = '#FEF3C7'; ctx.fill(); ctx.stroke();
    val(item.out, cx, cy, s * 0.13, hide === 'out');
  } else if (type === 'tripair') {
    // △a  △b  →  □c
    const r = s * 0.22, tri = (x, v, isH) => {
      ctx.beginPath(); ctx.moveTo(x, cy - r * 1.05); ctx.lineTo(x + r * 1.15, cy + r * 0.8); ctx.lineTo(x - r * 1.15, cy + r * 0.8); ctx.closePath();
      ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
      val(v, x, cy + r * 0.2, r * 0.68, isH);
    };
    tri(cx - s * 0.7, item.ins[0], hide === 0); tri(cx - s * 0.16, item.ins[1], hide === 1);
    const qx = cx + s * 0.66, q = r * 1.7;
    ctx.beginPath(); ctx.rect(qx - q / 2, cy - q / 2, q, q); ctx.fillStyle = '#EEF2FF'; ctx.fill(); ctx.stroke();
    val(item.out, qx, cy, r * 0.72, hide === 'out');
    const ax1 = cx + s * 0.13, ax2 = qx - q / 2 - s * 0.05, hd = r * 0.3;
    ctx.beginPath(); ctx.moveTo(ax1, cy); ctx.lineTo(ax2, cy); ctx.moveTo(ax2 - hd, cy - hd); ctx.lineTo(ax2, cy); ctx.lineTo(ax2 - hd, cy + hd); ctx.stroke();
  } else if (type === 'analog') {
    // ▲x → ●y (juftlik bitta joyda)
    const r = s * 0.24, x1 = cx - s * 0.46, x2 = cx + s * 0.46;
    ctx.beginPath(); ctx.moveTo(x1, cy - r * 1.05); ctx.lineTo(x1 + r * 1.15, cy + r * 0.8); ctx.lineTo(x1 - r * 1.15, cy + r * 0.8); ctx.closePath();
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
    val(item.ins[0], x1, cy + r * 0.2, r * 0.7, hide === 0);
    ctx.beginPath(); ctx.arc(x2, cy, r, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
    val(item.out, x2, cy, r * 0.75, hide === 'out');
    const ax1 = x1 + r * 1.25, ax2 = x2 - r * 1.15, hd = r * 0.3;
    ctx.beginPath(); ctx.moveTo(ax1, cy); ctx.lineTo(ax2, cy); ctx.moveTo(ax2 - hd, cy - hd); ctx.lineTo(ax2, cy); ctx.lineTo(ax2 - hd, cy + hd); ctx.stroke();
  }
  ctx.restore();
}
function drawSingle(ctx, it, cx, cy, s, show) {
  ctx.save();
  const lw = Math.max(0.3, s * 0.015);
  ctx.strokeStyle = INK; ctx.lineWidth = lw;
  const hs = hidOf(it), labels = LABELS[it.type] || [];
  const val = (i, x, y, fs) => {
    const k = hs.indexOf(i);
    valText(ctx, it.v[i], x, y, fs, k >= 0, show, k >= 0 ? (Array.isArray(it.ans) ? it.ans[k] : it.ans) : null, labels[k] || '?');
  };
  if (it.type === 'segs') {
    // 2 × 2 kesma: chap uch → o'ng uch (s — balandlik, eni 1.6·s)
    const r = s * 0.11;
    for (let k = 0; k < 4; k++) {
      const x = cx + (k % 2 ? 0.4 : -0.4) * s, y = cy + (k < 2 ? -0.24 : 0.24) * s, xl = x - 0.25 * s, xr = x + 0.25 * s;
      ctx.beginPath(); ctx.moveTo(xl + r, y); ctx.lineTo(xr - r, y); ctx.stroke();
      const hd = r * 0.4, ax = xr - r - s * 0.01;
      ctx.beginPath(); ctx.moveTo(ax - hd, y - hd); ctx.lineTo(ax, y); ctx.lineTo(ax - hd, y + hd); ctx.stroke();
      for (const [px, i, fill] of [[xl, 2 * k, '#fff'], [xr, 2 * k + 1, '#EEF2FF']]) {
        ctx.beginPath(); ctx.arc(px, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); ctx.stroke();
        val(i, px, y, r * 0.95);
      }
    }
  } else if (it.type === 'xyt') {
    // 3 qator (X, Y, T) × 4 ustun, chapda sarlavha
    const c = Math.min(1.7 * s / 5.2, s / 3.3), x0 = cx - 2.5 * c, y0 = cy - 1.5 * c;
    ['X', 'Y', 'T'].forEach((hdr, r) => {
      ctx.beginPath(); ctx.rect(x0, y0 + r * c, c, c); ctx.fillStyle = r === 2 ? '#FEF3C7' : '#EEF2FF'; ctx.fill(); ctx.stroke();
      font(ctx, c * 0.45, 900); ctx.fillStyle = '#4338CA'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(hdr, x0 + c / 2, y0 + r * c + c / 2);
      for (let k = 0; k < 4; k++) {
        const x = x0 + (k + 1) * c, y = y0 + r * c;
        ctx.beginPath(); ctx.rect(x, y, c, c); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
        val(r * 4 + k, x + c / 2, y + c / 2, c * 0.4);
      }
    });
  } else if (it.type === 'abc') {
    // namuna uchburchak va savol uchburchak; uchlarda a, b, c, tomonlarda ab, bc, ca (eni 2.5·s)
    const one = (ox, off, sample) => {
      const P = [[ox, cy - 0.4 * s], [ox + 0.5 * s, cy + 0.38 * s], [ox - 0.5 * s, cy + 0.38 * s]];
      ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.stroke();
      [[0, 1], [1, 2], [2, 0]].forEach(([u, w], e) => {
        const mx = (P[u][0] + P[w][0]) / 2, my = (P[u][1] + P[w][1]) / 2, bw = 0.24 * s, bh = 0.16 * s;
        roundRect(ctx, mx - bw / 2, my - bh / 2, bw, bh, bh * 0.2); ctx.fillStyle = sample ? '#F9FAFB' : '#EEF2FF'; ctx.fill(); ctx.stroke();
        val(off + 3 + e, mx, my, bh * 0.62);
      });
      P.forEach(([x, y], i) => {
        ctx.beginPath(); ctx.arc(x, y, 0.11 * s, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
        val(off + i, x, y, 0.1 * s);
      });
    };
    one(cx - 0.66 * s, 0, true);
    one(cx + 0.66 * s, 6, false);
    ctx.save(); ctx.strokeStyle = '#D1D5DB'; ctx.setLineDash([s * 0.02, s * 0.02]);
    ctx.beginPath(); ctx.moveTo(cx, cy - 0.45 * s); ctx.lineTo(cx, cy + 0.45 * s); ctx.stroke(); ctx.restore();
  } else if (it.type === 'grid3') {
    const c = s * 0.31, x0 = cx - 1.5 * c, y0 = cy - 1.5 * c;
    for (let i = 0; i < 9; i++) {
      const x = x0 + (i % 3) * c, y = y0 + Math.floor(i / 3) * c;
      ctx.beginPath(); ctx.rect(x, y, c, c); ctx.fillStyle = i % 3 === 2 ? '#EEF2FF' : '#fff'; ctx.fill(); ctx.stroke();
      val(i, x + c / 2, y + c / 2, c * 0.4);
    }
  } else if (it.type === 'ring') {
    const R = s * 0.38, w = s * 0.3, hgt = s * 0.21;
    ctx.save(); ctx.strokeStyle = '#D1D5DB'; ctx.setLineDash([s * 0.02, s * 0.02]);
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.lineTo(cx - Math.cos(a) * R, cy - Math.sin(a) * R); }
    ctx.stroke(); ctx.restore();
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 3, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
      roundRect(ctx, x - w / 2, y - hgt / 2, w, hgt, hgt * 0.2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
      val(i, x, y, hgt * 0.55);
    }
  } else {
    const R = s * 0.45, pts = Array.from({ length: 8 }, (_, i) => { const a = -Math.PI / 2 - Math.PI / 8 + i * Math.PI / 4; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R]; });
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); pts.forEach(([x, y]) => { ctx.moveTo(cx, cy); ctx.lineTo(x, y); }); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 4;
      val(i, cx + Math.cos(a) * R * 0.62, cy + Math.sin(a) * R * 0.62, s * 0.085);
    }
  }
  ctx.restore();
}

const LABELS = { segs: ['x', 'y'], abc: ['a', 'b', 'c'] };
function ruleText(row, lang) {
  const w = { uz: 'Qoida', ru: 'Правило', en: 'Rule' }[lang] || 'Qoida';
  if (row.single && row.type === 'segs') return `${w}: ${{ uz: "o'ng uch", ru: 'правый конец', en: 'right end' }[lang]} = ${U[row.rule].t} (x, y = ${row.ans.join(', ')})`;
  if (row.single && row.type === 'xyt') return `${w}: T = ${R2[row.rule].t.replace(/a/g, 'X').replace(/b/g, 'Y')}`;
  if (row.single && row.type === 'abc') {
    const what = row.rule === 'sum' ? { uz: "uchlar yig'indisi", ru: 'сумма концов', en: 'sum of the corners' } : { uz: "uchlar ko'paytmasi", ru: 'произведение концов', en: 'product of the corners' };
    return `${w}: ${{ uz: 'tomon', ru: 'сторона', en: 'side' }[lang]} = ${what[lang]}; a, b, c = ${row.ans.join(', ')}`;
  }
  if (row.single) {
    if (row.type === 'grid3') return `${w}: ${{ uz: 'har qatorda 3-son', ru: 'в каждой строке 3-е число', en: 'in each row, 3rd number' }[lang]} = ${RULES.circle[row.rule].t}`;
    if (row.type === 'ring') return `${w}: ${{ uz: 'qarama-qarshi karta', ru: 'противоположная карта', en: 'opposite card' }[lang]} = ${U[row.rule].t}`;
    const S = row.rule === 'sum' ? row.v[0] + row.v[4] : row.v[0] * row.v[4];
    return `${w}: ${{ uz: 'qarama-qarshi sonlar', ru: 'противоположные числа', en: 'opposite numbers' }[lang]} ${row.rule === 'sum' ? '+' : '·'} = ${S}`;
  }
  let t = RULES[row.type][row.rule].t;
  const cw = CROSS_WORDS[lang] || CROSS_WORDS.uz;
  t = t.replace('$T', cw[0]).replace('$B', cw[2]).replace('$L', cw[3]).replace('$R', cw[1]).replace('$T', cw[0]).replace('$B', cw[2]).replace('$L', cw[3]).replace('$R', cw[1]);
  if (row.type === 'flower') t = t.replace('Σ', SUM_WORD[lang] || SUM_WORD.uz);
  if (row.type === 'tripair') return `${w}: ${{ uz: 'kvadrat = ', ru: 'квадрат = ', en: 'square = ' }[lang]}${t}`;
  const pre = row.type === 'circle' ? { uz: 'tepa = ', ru: 'верх = ', en: 'top = ' }[lang]
    : row.type === 'analog' ? { uz: 'x → ', ru: 'x → ', en: 'x → ' }[lang] : { uz: 'markaz = ', ru: 'центр = ', en: 'centre = ' }[lang];
  return `${w}: ${pre}${t}`;
}

// Ko'rsatma: umumiy gap + sahifadagi shakllar uchun qisqa izoh
const RULE = {
  uz: "Shakllardagi sonlar bitta qoidaga bo'ysunadi: namunalardan qoidani top va «?» o'rniga sonni yoz.",
  ru: 'Числа в фигурах подчиняются одному правилу: найди его по образцам и впиши число вместо «?».',
  en: 'The numbers in the shapes follow one rule: find it from the examples and write the number instead of “?”.'
};
const HINTS = {
  tri: { uz: 'Uchburchakda tepada a, pastda b va c.', ru: 'В треугольнике вверху a, внизу b и c.', en: 'In a triangle a is at the top, b and c at the bottom.' },
  circle: { uz: 'Doirada pastda a va b.', ru: 'В круге внизу a и b.', en: 'In a circle a and b are at the bottom.' },
  grid3: { uz: 'Jadvalda qoida har qatorda bir xil.', ru: 'В таблице правило одинаково в каждой строке.', en: 'In a table every row has the same rule.' },
  ring: { uz: 'Halqa va sakkizburchakda qarama-qarshi sonlar juft bo\'ladi.', ru: 'В кольце и восьмиугольнике противоположные числа составляют пару.', en: 'In a ring or octagon opposite numbers form pairs.' },
  segs: { uz: 'Kesmada chap uchdagi sondan o\'ng uchdagisi hosil bo\'ladi: x va y ni top.', ru: 'На отрезке из левого числа получается правое: найди x и y.', en: 'On each segment the right number comes from the left one: find x and y.' },
  xyt: { uz: 'X, Y, T jadvalida T soni X va Y dan hosil bo\'ladi.', ru: 'В таблице X, Y, T число T получается из X и Y.', en: 'In the X, Y, T table, T is made from X and Y.' },
  abc: { uz: 'Uchburchak tomonidagi son ikki uchidagi sonlardan hosil bo\'ladi: namunadan qoidani topib, a, b, c ni top.', ru: 'Число на стороне треугольника получается из чисел на её концах: найди правило по образцу и найди a, b, c.', en: 'A side number is made from the two corner numbers: find the rule from the sample, then find a, b and c.' },
  tripair: { uz: 'Ikki uchburchakdagi sonlardan kvadratdagi son hosil bo\'ladi.', ru: 'Из чисел в двух треугольниках получается число в квадрате.', en: 'The square number is made from the two triangle numbers.' }
};
HINTS.octagon = HINTS.ring;
const ruleFor = (p, lang) => {
  const seen = [];
  for (const r of p.rows) { const h = HINTS[r.type]; if (h && !seen.includes(h)) seen.push(h); }
  return [RULE[lang] || RULE.uz, ...seen.map(h => h[lang] || h.uz)].join(' ');
};

export default {
  id: 'numshapes',
  skills: ['patterns', 'counting', 'logic'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Sonli shakllar', ru: 'Числа в фигурах', en: 'Number shapes' },
  desc: {
    uz: "Uchburchak, xoch, doira, gul, jadval, kesma va halqadagi sonlar bitta qoidaga bo'ysunadi: qoidani topib «?» ni to'ldiring",
    ru: 'Числа в треугольниках, крестах, кругах, цветках, таблицах и кольцах подчиняются правилу: найдите его и заполните «?»',
    en: 'Numbers in triangles, crosses, circles, flowers, tables and rings follow a rule: find it and fill in the “?”'
  },
  fileBase: { uz: 'Sonli shakllar', ru: 'Числа в фигурах', en: 'Number shapes' },
  defaultTitle: { uz: "Qoidani top va to'ldir!", ru: 'Найди правило и дополни!', en: 'Find the rule and fill in!' },
  options: [{ key: 'level', type: 'level', default: 1 }],
  levelHint: {
    uz: ["Qo'shish va ko'paytirish, juft shakllar, kartalar halqasi", "Ayirish ham, xoch, 3×3 va X/Y/T jadval, kesmalar (x, y)", "Daraxt, gul, a, b, c li uchburchak, «?» chetda ham", "Ulangan xochlar, ko'paytmalar, kvadratlar"],
    ru: ['Сложение и умножение, пары фигур, кольцо карт', 'Вычитание, крест, таблицы 3×3 и X/Y/T, отрезки (x, y)', 'Дерево, цветок, треугольник a, b, c, «?» и с краю', 'Сцепленные кресты, произведения, квадраты'],
    en: ['Adding and multiplying, shape pairs, a ring of cards', 'Subtraction, crosses, 3×3 and X/Y/T tables, segments (x, y)', 'Trees, flowers, an a, b, c triangle, “?” on the edge', 'Linked crosses, products, squares']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level];
    const rand = makeRng(seed);
    const count = L.count[opts.perPage === 4 ? 2 : opts.perPage === 2 ? 1 : 0];
    const rows = [];
    const pools = shuffle(L.pool.slice(), rand);
    for (let i = 0; i < count; i++) {
      const [type, rules] = pools[i % pools.length];
      const rule = rules[(i + Math.floor(rand() * rules.length)) % rules.length];
      rows.push(SINGLE.has(type) ? singleRow(L, rand, type, rule) : seriesRow(L, rand, type, rule));
    }
    return { level, seed, rows };
  },

  info(p, lang) {
    const c = p.rows.length;
    return { uz: `${c} ta qator`, ru: `${c} ${ruPlural(c, 'ряд', 'ряда', 'рядов')}`, en: `${c} row${c > 1 ? 's' : ''}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box), n = p.rows.length;
    const rule = measureRule(ctx, ruleFor(p, lang), box.w, scale);
    const gap = 5 * scale, numW = 7 * scale, H = box.h - rule.h - gap;
    // qator eni (s birligida)
    const SW = { segs: 1.6, xyt: 1.7, abc: 2.5 };
    const HF = r => (r.single ? (r.type in SW ? 1.1 : 1.3) : 1);   // bitta shakl kattaroq chiziladi
    const widthOf = r => (r.single ? (SW[r.type] || 1) * HF(r) : r.type === 'analog' ? (r.ex.length + 1) * 1.6 : r.type === 'tripair' ? (r.ex.length + 1) * 2.05 : r.type === 'linked' ? (r.ex.length + 1) * 0.6 + 0.4 : (r.ex.length + 1) * 1.12);
    const ansH = showSolution ? 4 * scale : 0, avail = box.w - numW;
    // har qatorning o'z o'lchami: umumiy s, lekin keng qator eniga sig'adigan darajada kichrayadi
    const sOf = (S, r) => Math.min(S, avail / widthOf(r));
    const heightAt = S => p.rows.reduce((a, r) => a + sOf(S, r) * HF(r), 0) + n * (gap + ansH);
    let lo = 0, hi = 42 * scale;
    for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (heightAt(mid) <= H) lo = mid; else hi = mid; }
    const S = lo, totalH = heightAt(S);
    let y = box.y + Math.max(0, (H - totalH) * 0.3);
    p.rows.forEach((r, i) => {
      const s = sOf(S, r), sh = s * HF(r);
      font(ctx, Math.min(s * 0.12, 4.4 * scale), 800); ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(`${i + 1}.`, box.x, y + sh / 2);
      const wR = widthOf(r) * s, x0 = box.x + numW + (box.w - numW - wR) / 2;
      if (r.single) drawSingle(ctx, r, x0 + wR / 2, y + sh / 2, sh, showSolution);
      else {
        const items = [...r.ex, r.q];
        items.forEach((it, j) => {
          const isQ = j === items.length - 1;
          const o = isQ ? { hide: r.q.hide, show: showSolution, ans: r.ans } : {};
          if (r.type === 'linked') drawShape(ctx, 'linked', { ...it, skipLeft: j > 0 }, x0 + 0.5 * s * 0.6 + 0.2 * s + j * s * 0.6, y + s / 2, s, o);
          else if (r.type === 'analog') drawShape(ctx, 'analog', it, x0 + j * s * 1.6 + s * 0.8, y + s / 2, s, o);
          else if (r.type === 'tripair') drawShape(ctx, 'tripair', it, x0 + j * s * 2.05 + s * 1.02, y + s / 2, s, o);
          else drawShape(ctx, r.type, it, x0 + j * s * 1.12 + s * 0.56, y + s / 2, s, o);
        });
      }
      if (showSolution) {
        const txt = ruleText(r, lang), ax = Math.min(x0, box.x + numW);
        let fs = Math.min(3.4 * scale, ansH * 0.85); font(ctx, fs, 700);
        const tw = ctx.measureText(txt).width, room = box.x + box.w - ax;
        if (tw > room) { fs *= room / tw; font(ctx, fs, 700); }
        ctx.fillStyle = ANSWER; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(txt, Math.max(ax, Math.min(x0, box.x + box.w - ctx.measureText(txt).width)), y + sh + 0.5 * scale);
      }
      y += sh + ansH + gap;
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
      if (r.single) {
        const pr = SINGLE_PRED[r.type](r);
        if (!predOK(pr, r.ans) || ansKey(hidOf(r).map(k => r.v[k])) !== ansKey(r.ans)) problems.push(`#${i}: ${r.type} ${pr.size} answers`);
        return;
      }
      const R = RULES[r.type][r.rule];
      if ([...r.ex, r.q].some(e => R.f(e.ins) !== e.out)) problems.push(`#${i}: rule broken`);
      if (r.type === 'linked') {
        const all = [...r.ex, r.q];
        for (let k = 1; k < all.length; k++) if (all[k].ins[3] !== all[k - 1].ins[1]) problems.push(`#${i}: linked cell mismatch`);
      }
      const pr = predictions(r.type, r.ex, r.q);
      if (pr.size !== 1 || !pr.has(r.ans)) problems.push(`#${i}: ${pr.size} answers`);
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-numshapes" aria-hidden="true"><defs><linearGradient id="cg-numshapes" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#84fab0"/><stop offset="1" stop-color="#8fd3f4"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-numshapes)"/><polygon points="55,60 96.8,133.9 13.2,133.9" fill="#fff" stroke="#111827" stroke-width="4" stroke-linejoin="round"/><g font-family="Nunito, sans-serif" font-weight="900" font-size="17" text-anchor="middle" fill="#111827"><text x="55" y="87.3">2</text><text x="33.0" y="128.2">3</text><text x="77.0" y="128.2">4</text></g><text x="55" y="112.8" font-family="Nunito, sans-serif" font-weight="900" font-size="21" text-anchor="middle" fill="#4338CA">9</text><polygon points="145,60 186.8,133.9 103.2,133.9" fill="#fff" stroke="#111827" stroke-width="4" stroke-linejoin="round"/><g font-family="Nunito, sans-serif" font-weight="900" font-size="17" text-anchor="middle" fill="#111827"><text x="145" y="87.3">5</text><text x="123.0" y="128.2">1</text><text x="167.0" y="128.2">6</text></g><text class="nf-a" x="145" y="112.8" font-family="Nunito, sans-serif" font-weight="900" font-size="21" text-anchor="middle" fill="#DC2626">12</text></svg>`
};
