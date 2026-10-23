// matrix-older.js — «Yetishmayotgan qism» generatorining «Katta bolalar» darajasi (v2.8). To'rt xil jadval:
//   overlay — 3×3, har qatorda 3-katak = 1- va 2-katak ustma-ust qo'yilgani (yoki: bir xil chiziqlar yo'qoladi);
//   rotate  — 3×3, har qatorda shakl har qadamda bir xil burchakka buriladi; qatorlarda shakl va bo'yalishi boshqa;
//   sides   — 3×3, tomonlar soni qator bo'ylab bittadan ko'payadi, bo'yalishi esa har qator/ustunda bittadan;
//   pair    — 2×2 o'xshatish: A → B qanday o'zgargan bo'lsa, C → ? ham shunday (burilish, ko'zgu, bo'yalish, o'lcham, soni);
//   shift   — 3×3, ramka chetidagi qora va oq nuqta har qadamda o'z qadami bilan siljiydi (qatorlar boshqa joydan boshlanadi);
//   letters — 3×3 harflar: alifbo bo'yicha qatorda va ustunda bir xil qadam (V6) yoki harf juftlari — har qator va
//             ustunda birinchi harf ham, ikkinchi harf ham bittadan (V13).
// Qolip: rus IQ kitobi V1–V13; «Fazoviy tasavvur» 2-varaq; Az «Fiqur cədvəlləri».
// Kafolat (checkOlder()): qatorlardagi (va ustunlardagi) mumkin bo'lgan barcha qoidalar «?» uchun bitta javob beradi,
// variantlardan faqat bittasi shu javob.

import { shuffle, pickOne, randInt } from '../core/rng.js';
import { INK, font } from '../core/draw.js';
import { GEOM, transform, paint } from '../core/figures.js';
import { alphaOf } from './letterseq.js';

const key = el => JSON.stringify(el);
const N_LINES = 12;                         // 8 ta «nur» markazdan + ichki kvadratning 4 tomoni
const bits = m => { let c = 0; for (let i = 0; i < N_LINES; i++) if (m >> i & 1) c++; return c; };
const OPS = {
  or: (a, b) => a | b, xor: (a, b) => a ^ b, and: (a, b) => a & b, ab: (a, b) => a & ~b, ba: (a, b) => b & ~a
};

// ---------- overlay ----------
function overlay(rand) {
  const op = pickOne(rand, ['or', 'xor']);
  for (let guard = 0; guard < 500; guard++) {
    const rows = [];
    for (let r = 0; r < 3; r++) {
      const pick = n => shuffle([...Array(N_LINES).keys()], rand).slice(0, n).reduce((m, i) => m | 1 << i, 0);
      const a = pick(2 + Math.floor(rand() * 3)), b = pick(2 + Math.floor(rand() * 3));
      rows.push([a, b, OPS[op](a, b)]);
    }
    const grid = rows.flat().map(m => ({ k: 'lines', m }));
    if (grid.some(c => bits(c.m) < 1) || new Set(grid.map(key)).size < 8) continue;
    const pz = { type: 'overlay', g: 3, grid, q: 8, op };
    if (predictions(pz).size !== 1) continue;
    const ans = grid[8].m;
    const [a, b] = rows[2];
    const cands = [OPS[op === 'or' ? 'xor' : 'or'](a, b), a & b, ans ^ 1 << Math.floor(rand() * N_LINES), ans ^ 1 << Math.floor(rand() * N_LINES), a, b]
      .filter(m => m && m !== ans);
    return finish(pz, cands.map(m => ({ k: 'lines', m })), 5, rand);
  }
  throw new Error('matrix: no overlay');
}

// ---------- rotate ----------
const DIR = ['arrow', 'pointer', 'flag', 'moon'];
const FILL2 = ['empty', 'solid', 'stripes'];
function rotate(rand) {
  const step = pickOne(rand, [45, 90, 135, -90]);
  for (let guard = 0; guard < 200; guard++) {
    const shapes = shuffle(DIR.slice(), rand).slice(0, 3), fills = shuffle(FILL2.slice(), rand);
    const grid = [];
    for (let r = 0; r < 3; r++) {
      const a0 = pickOne(rand, [0, 45, 90, 135, 180, 225, 270, 315]);
      for (let c = 0; c < 3; c++) grid.push({ k: 'shape', shape: shapes[r], fill: fills[r], rot: (((a0 + step * c) % 360) + 360) % 360 });
    }
    const pz = { type: 'rotate', g: 3, grid, q: Math.floor(rand() * 9), step };
    if (predictions(pz).size !== 1) continue;
    const ans = grid[pz.q];
    const cands = [45, 90, 180, 270, 315].map(d => ({ ...ans, rot: (ans.rot + d) % 360 }));
    cands.push({ ...ans, mirror: true }, { ...ans, fill: fills.find(f => f !== ans.fill) });
    return finish(pz, cands.filter(c => !(c.mirror && SYM.includes(c.shape))), 5, rand);
  }
  throw new Error('matrix: no rotate');
}

// ---------- sides ----------
function sides(rand) {
  const starts = shuffle([3, 4, 5], rand), fills = shuffle(['empty', 'solid', 'stripes'], rand), shift = pickOne(rand, [1, 2]);
  const grid = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) grid.push({ k: 'poly', n: starts[r] + c, fill: fills[(r * shift + c) % 3] });
  const pz = { type: 'sides', g: 3, grid, q: Math.floor(rand() * 9) };
  const ans = grid[pz.q];
  const cands = [-1, 1, 2].map(d => ({ ...ans, n: ans.n + d })).filter(c => c.n >= 3 && c.n <= 8);
  for (const f of fills) if (f !== ans.fill) cands.push({ ...ans, fill: f });
  return finish(pz, cands, 5, rand);
}

// ---------- pair (2×2 o'xshatish) ----------
const TRANSFORMS = {
  r90: e => ({ ...e, rot: (e.rot + 90) % 360 }),
  r180: e => ({ ...e, rot: (e.rot + 180) % 360 }),
  r270: e => ({ ...e, rot: (e.rot + 270) % 360 }),
  mirror: e => ({ ...e, mirror: !e.mirror, rot: (360 - e.rot) % 360 }),
  fill: e => ({ ...e, fill: e.fill === 'empty' ? 'solid' : 'empty' }),
  size: e => ({ ...e, size: e.size === 1 ? 0.6 : 1 }),
  count: e => ({ ...e, n: e.n === 1 ? 2 : 1 })
};
// Gorizontal o'qqa nisbatan simmetrik shakllar: ularning ko'zgudagi aksi 180° burilganiga teng
const SYM = ['arrow', 'pointer', 'moon'];
function norm(e) {
  const out = { ...e };
  if (out.mirror && SYM.includes(out.shape)) { out.mirror = false; out.rot = (out.rot + 180) % 360; }
  out.rot = ((out.rot % 360) + 360) % 360;
  if (!out.mirror) delete out.mirror;
  return out;
}
const applyAll = (e, ts) => norm(ts.reduce((x, t) => TRANSFORMS[t](x), { ...e, mirror: !!e.mirror }));
function pair(rand) {
  const combos = [['r90'], ['r180'], ['mirror'], ['fill'], ['size'], ['count'], ['r90', 'fill'], ['mirror', 'fill'], ['r180', 'size'], ['r90', 'count']];
  for (let guard = 0; guard < 300; guard++) {
    const ts = pickOne(rand, combos);
    const [s1, s2] = shuffle(['flag', 'moon', 'arrow', 'pointer'], rand);
    const mk = sh => norm({ k: 'shape', shape: sh, fill: pickOne(rand, ['empty', 'solid']), rot: pickOne(rand, [0, 90, 180, 270]), size: 1, n: 1 });
    const A = mk(s1), C = mk(s2);
    const B = applyAll(A, ts), D = applyAll(C, ts);
    const grid = [A, B, C, D];
    const pz = { type: 'pair', g: 2, grid, q: 3, ts };
    if (predictions(pz).size !== 1 || key(B) === key(A) || key(D) === key(C)) continue;
    const cands = [C, ...Object.keys(TRANSFORMS).map(t => applyAll(C, [t])), ...ts.map(t => applyAll(C, [t])), applyAll(D, ['r90'])];
    return finish(pz, cands, 4, rand);
  }
  throw new Error('matrix: no pair');
}

// ---------- shift (ramka bo'ylab siljiydigan ikki nuqta) ----------
// O'rinlar soat yo'nalishida: 0 chap-yuqori, 1 yuqori o'rta, 2 o'ng-yuqori, 3 o'ng o'rta, 4 o'ng-past, 5 past o'rta, 6 chap-past, 7 chap o'rta
const m8 = v => ((v % 8) + 8) % 8;
function shift(rand) {
  for (let guard = 0; guard < 400; guard++) {
    const sa = pickOne(rand, [1, 2, 3, -1]), sb = pickOne(rand, [1, -1, 2, -2, 3]);
    if (sa === sb) continue;
    const grid = [];
    for (let r = 0; r < 3; r++) {
      const a0 = randInt(rand, 0, 7), b0 = randInt(rand, 0, 7);
      for (let c = 0; c < 3; c++) grid.push({ k: 'dots', a: m8(a0 + sa * c), b: m8(b0 + sb * c) });
    }
    if (grid.some(e => e.a === e.b) || new Set(grid.map(key)).size < 9) continue;
    const pz = { type: 'shift', g: 3, grid, q: Math.floor(rand() * 9), sa, sb };
    if (predictions(pz).size !== 1) continue;
    const { a, b } = grid[pz.q];
    const cands = [[a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1], [b, a], [a + sa, b + sb], [a - sa, b - sb], [a + 4, b]]
      .map(([x, y]) => ({ k: 'dots', a: m8(x), b: m8(y) })).filter(e => e.a !== e.b);
    return finish(pz, cands, 5, rand);
  }
  throw new Error('matrix: no shift');
}

// ---------- letters (alifbo qadamlari yoki harf juftlari) ----------
function letters(rand, lang) {
  const alpha = alphaOf(lang);
  if (rand() < 0.5) {
    for (let guard = 0; guard < 300; guard++) {
      const dc = pickOne(rand, [1, 2]), dr = pickOne(rand, [1, 2, 3, 4]);
      if (dr === dc) continue;
      const a0 = randInt(rand, 1, alpha.length - 2 * dc - 2 * dr);
      const grid = Array.from({ length: 9 }, (_, i) => { const p = a0 + Math.floor(i / 3) * dr + (i % 3) * dc; return { k: 'letter', p, ch: alpha[p - 1] }; });
      const pz = { type: 'letters', sub: 'step', g: 3, grid, q: Math.floor(rand() * 9), alpha };
      if (predictions(pz).size !== 1) continue;
      const P = grid[pz.q].p;
      const cands = [1, -1, 2, -2, dr + 1, dc + 1, -dr - dc].map(d => P + d).filter(v => v >= 1 && v <= alpha.length).map(v => ({ k: 'letter', p: v, ch: alpha[v - 1] }));
      return finish(pz, cands, 5, rand);
    }
    throw new Error('matrix: no letters');
  }
  // harf juftlari: grek-lotin kvadrat (birinchi harflar ham, ikkinchilari ham har qator/ustunda bittadan)
  for (let guard = 0; guard < 100; guard++) {
    const pool = shuffle(alpha.slice(0, Math.min(alpha.length, 20)).filter(ch => !'ЁЙ'.includes(ch)), rand);
    const S1 = pool.slice(0, 3), S2 = pool.slice(3, 6);
    const rp = shuffle([0, 1, 2], rand), cp = shuffle([0, 1, 2], rand);
    const grid = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const R = rp[r], C = cp[c];
      grid.push({ k: 'letter', ch: S1[(R + C) % 3] + S2[(2 * R + C) % 3] });
    }
    const pz = { type: 'letters', sub: 'pairs', g: 3, grid, q: Math.floor(rand() * 9), S1, S2 };
    if (predictions(pz).size !== 1) continue;
    const [x, y] = [...grid[pz.q].ch];
    const cands = [y + x, ...S1.filter(u => u !== x).map(u => u + y), ...S2.filter(u => u !== y).map(u => x + u), S1.find(u => u !== x) + S2.find(u => u !== y)]
      .map(ch => ({ k: 'letter', ch }));
    return finish(pz, cands, 5, rand);
  }
  throw new Error('matrix: no letter pairs');
}

// «?» uchun mumkin bo'lgan javoblar (bola topishi mumkin bo'lgan barcha qoidalar bo'yicha)
export function predictions(pz) {
  const g = pz.grid, q = pz.q, out = new Set();
  if (pz.type === 'overlay') {
    for (const dir of ['row', 'col']) {               // qatorlar bo'yicha ham, ustunlar bo'yicha ham
      const at = (i, j) => (dir === 'row' ? g[i * 3 + j] : g[j * 3 + i]).m;
      for (const f of Object.values(OPS)) {
        if ([0, 1].every(i => f(at(i, 0), at(i, 1)) === at(i, 2))) out.add(key({ k: 'lines', m: f(at(2, 0), at(2, 1)) }));
      }
    }
    return out;
  }
  if (pz.type === 'rotate') {
    const qr = Math.floor(q / 3), qc = q % 3;
    const steps = new Set();
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
      if (r * 3 + c === q || r * 3 + c + 1 === q) continue;
      const a = g[r * 3 + c], b = g[r * 3 + c + 1];
      if (a.shape !== b.shape || a.fill !== b.fill) return new Set();
      steps.add((((b.rot - a.rot) % 360) + 360) % 360);
    }
    if (steps.size !== 1) return new Set();
    const st = [...steps][0];
    const kc = [0, 1, 2].find(c => c !== qc), k = g[qr * 3 + kc];
    out.add(key({ ...k, rot: (((k.rot + st * (qc - kc)) % 360) + 360) % 360 }));
    return out;
  }
  if (pz.type === 'sides') {
    const qr = Math.floor(q / 3), qc = q % 3;
    const kc = [0, 1, 2].find(c => c !== qc), k = g[qr * 3 + kc];
    const n = k.n + (qc - kc);
    // bo'yalish: qatordagi qolgan ikkitasidan farqli (har qator va ustunda bittadan)
    const rowFills = [0, 1, 2].filter(c => c !== qc).map(c => g[qr * 3 + c].fill);
    const fills = ['empty', 'solid', 'stripes'].filter(f => !rowFills.includes(f));
    for (const f of fills) out.add(key({ k: 'poly', n, fill: f }));
    return out;
  }
  if (pz.type === 'shift') {
    // qatorlar bo'yicha ham, ustunlar bo'yicha ham: har nuqtaning qadami barcha ma'lum juftliklarda bir xil bo'lsa
    for (const dir of ['row', 'col']) {
      const idx = (i, j) => (dir === 'row' ? i * 3 + j : j * 3 + i);
      const res = {};
      for (const m of ['a', 'b']) {
        const st = new Set();
        for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
          const u = idx(i, j), v = idx(i, j + 1);
          if (u !== q && v !== q) st.add(m8(g[v][m] - g[u][m]));
        }
        if (st.size !== 1) { res[m] = null; continue; }
        const step = [...st][0];
        const qi = dir === 'row' ? Math.floor(q / 3) : q % 3, qj = dir === 'row' ? q % 3 : Math.floor(q / 3);
        const kj = [0, 1, 2].find(j => j !== qj);
        res[m] = m8(g[idx(qi, kj)][m] + step * (qj - kj));
      }
      if (res.a !== null && res.b !== null) out.add(key({ k: 'dots', a: res.a, b: res.b }));
    }
    return out;
  }
  if (pz.type === 'letters' && pz.sub === 'step') {
    const known = g.map((e, i) => (i === q ? null : e.p)), res = new Set();
    // butun jadval: a + r·dr + c·dc
    for (let dr = -6; dr <= 6; dr++) for (let dc = -6; dc <= 6; dc++) {
      const i0 = known.findIndex(p => p !== null), a = known[i0] - Math.floor(i0 / 3) * dr - (i0 % 3) * dc;
      if (known.every((p, i) => p === null || p === a + Math.floor(i / 3) * dr + (i % 3) * dc)) res.add(a + Math.floor(q / 3) * dr + (q % 3) * dc);
    }
    // faqat «?» qatori yoki ustuni (o'z qadami bilan)
    for (const dir of ['row', 'col']) {
      const pos = i => (dir === 'row' ? i % 3 : Math.floor(i / 3));
      const cells = [0, 1, 2].map(j => (dir === 'row' ? Math.floor(q / 3) * 3 + j : j * 3 + (q % 3))).filter(i => i !== q);
      const d = (known[cells[1]] - known[cells[0]]) / (pos(cells[1]) - pos(cells[0]));
      res.add(known[cells[0]] + d * (pos(q) - pos(cells[0])));
    }
    for (const p of res) out.add(key({ k: 'letter', p, ch: pz.alpha[p - 1] }));
    return out;
  }
  if (pz.type === 'letters') {
    // harf juftlari: qator va ustundagi yetishmagan birinchi va ikkinchi harf
    const row = [0, 1, 2].map(j => Math.floor(q / 3) * 3 + j).filter(i => i !== q), col = [0, 1, 2].map(j => j * 3 + (q % 3)).filter(i => i !== q);
    for (const cells of [row, col]) {
      const f = pz.S1.filter(u => !cells.some(i => g[i].ch[0] === u)), s2 = pz.S2.filter(u => !cells.some(i => g[i].ch[1] === u));
      for (const x of f) for (const y of s2) out.add(key({ k: 'letter', ch: x + y }));
    }
    return out;
  }
  // pair: A→B ga mos keladigan barcha o'zgarishlar (1 yoki 2 ta) C ga qo'llanadi
  const names = Object.keys(TRANSFORMS), A = g[0], B = g[1], C = g[2];
  const tries = [...names.map(t => [t]), ...names.flatMap((t, i) => names.slice(i + 1).map(u => [t, u]))];
  for (const ts of tries) if (key(applyAll(A, ts)) === key(B)) out.add(key(applyAll(C, ts)));
  return out;
}

function finish(pz, cands, nOpt, rand) {
  const ans = pz.grid[pz.q], seen = new Set([key(ans)]), opts = [];
  for (const c of shuffle(cands, rand)) {
    if (seen.has(key(c))) continue;
    seen.add(key(c)); opts.push(c);
    if (opts.length === nOpt - 1) break;
  }
  const at = Math.floor(rand() * (opts.length + 1));
  opts.splice(at, 0, ans);
  return { ...pz, options: opts, ans: at };
}

export function olderPuzzle(rand, kind, lang = 'uz') {
  return { overlay, rotate, sides, pair, shift, letters }[kind](rand, lang);
}
export const OLDER_KINDS = ['overlay', 'rotate', 'sides', 'pair', 'shift', 'letters'];

export function checkOlder(pz) {
  const out = [];
  const ans = pz.grid[pz.q];
  const pr = predictions(pz);
  if (pr.size !== 1 || !pr.has(key(ans))) out.push(`${pz.type}: answer not forced (${pr.size})`);
  if (key(pz.options[pz.ans]) !== key(ans)) out.push(`${pz.type}: wrong answer index`);
  if (new Set(pz.options.map(key)).size !== pz.options.length) out.push(`${pz.type}: repeated option`);
  if (pz.options.filter(o => pr.has(key(o))).length !== 1) out.push(`${pz.type}: several options fit`);
  return out;
}

// ---------- Chizish ----------
const SPOKES = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
export function drawEl4(ctx, el, cx, cy, s) {
  ctx.save();
  const lw = Math.max(0.25, s * 0.03);
  if (el.k === 'lines') {
    const R = s * 0.36, q = R * 0.62;
    ctx.strokeStyle = '#D1D5DB'; ctx.lineWidth = lw * 0.6; ctx.strokeRect(cx - R, cy - R, 2 * R, 2 * R);
    ctx.strokeStyle = INK; ctx.lineWidth = lw * 1.3; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) if (el.m >> i & 1) { const [dx, dy] = SPOKES[i]; ctx.moveTo(cx, cy); ctx.lineTo(cx + dx * R, cy + dy * R); }
    const sq = [[-q, -q, q, -q], [q, -q, q, q], [q, q, -q, q], [-q, q, -q, -q]];
    for (let i = 0; i < 4; i++) if (el.m >> (8 + i) & 1) { const [x1, y1, x2, y2] = sq[i]; ctx.moveTo(cx + x1, cy + y1); ctx.lineTo(cx + x2, cy + y2); }
    ctx.stroke();
  } else if (el.k === 'dots') {
    const R = s * 0.34, P = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
    ctx.strokeStyle = '#9CA3AF'; ctx.lineWidth = lw; ctx.strokeRect(cx - R, cy - R, 2 * R, 2 * R);
    ctx.fillStyle = '#9CA3AF';
    for (const [dx, dy] of P) { ctx.beginPath(); ctx.arc(cx + dx * R, cy + dy * R, s * 0.03, 0, 2 * Math.PI); ctx.fill(); }
    const dot = (i, solid) => {
      const [dx, dy] = P[i];
      ctx.beginPath(); ctx.arc(cx + dx * R, cy + dy * R, s * 0.085, 0, 2 * Math.PI);
      ctx.fillStyle = solid ? INK : '#fff'; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = lw * 1.2; ctx.stroke();
    };
    dot(el.b, false); dot(el.a, true);
  } else if (el.k === 'letter') {
    let fs = s * (el.ch.length > 1 ? 0.4 : 0.52);
    font(ctx, fs, 800);
    const tw = ctx.measureText(el.ch).width;
    if (tw > s * 0.78) { fs *= s * 0.78 / tw; font(ctx, fs, 800); }
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(el.ch, cx, cy + s * 0.02);
  } else if (el.k === 'poly') {
    const R = s * 0.36, pts = Array.from({ length: el.n }, (_, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / el.n; return [Math.cos(a), Math.sin(a)]; });
    paint(ctx, [transform(pts, cx, cy, R, 0, false)], el.fill, cx, cy, R, lw);
  } else {
    const n = el.n || 1, sub = n === 1 ? 1 : 0.55;
    const offs = n === 1 ? [[0, 0]] : [[-0.22, -0.22], [0.22, 0.22]];
    for (const [dx, dy] of offs) {
      const x = cx + dx * s, y = cy + dy * s, R = s * 0.36 * (el.size || 1) * sub;
      paint(ctx, GEOM[el.shape].map(p => transform(p, x, y, R, el.rot || 0, !!el.mirror)), el.fill, x, y, R, lw);
    }
  }
  ctx.restore();
}
