// scales.js — «Tarozi masalalari» (Весы / Balance puzzles) generatori.
// Bir nechta tarozi muvozanatda turibdi: pallalarda turli shakllar. Oxirgi tarozining o'ng pallasida «? ×» — bola
// muvozanat uchun nechta shakl kerakligini topadi (almashtirib hisoblash).
// Kafolat (check()): shakllarning og'irliklari nisbati berilgan tarozilardan yagona topiladi (tenglamalar rangi K−1),
// javob butun son va hamma tarozilar haqiqatan muvozanatda.
// Qolip: rus IQ kitobi M25, 1.17, 3.23, 4.11; ozarbayjon test banki «Tərəzilər»; IQ 2026 №13.

import { makeRng, randInt, shuffle, pickOne } from '../core/rng.js';
import { INK, MUTE, ANSWER, font, roundRect } from '../core/draw.js';
import { drawFigure } from '../core/figures.js';
import { scaleOf, measureRule, drawRule, ruPlural } from '../core/parts.js';

// K — shakllar turi; given — berilgan tarozilar; pan — pallada eng ko'p shakl; mixed — chap pallada har xil shakllar;
// count — [1 tadan, 2 tadan, 4 tadan] joylashganda masalalar soni
const LEVELS = [
  { K: 2, given: 1, pan: 4, mixed: false, count: [6, 2, 1] },
  { K: 3, given: 2, pan: 4, mixed: false, count: [4, 2, 1] },
  { K: 3, given: 2, pan: 5, mixed: true, count: [4, 2, 1] },
  { K: 4, given: 3, pan: 5, mixed: true, count: [4, 2, 1] }
];
// Oq-qora printerda ham ajraladigan shakllar
const OBJ = [
  { shape: 'circle', fill: 'solid' }, { shape: 'triangle', fill: 'empty' }, { shape: 'square', fill: 'stripes' },
  { shape: 'star', fill: 'empty' }, { shape: 'heart', fill: 'solid' }, { shape: 'diamond', fill: 'dotted' }, { shape: 'hexagon', fill: 'empty' }
];

const weightOf = (ms, w) => ms.reduce((s, [k, n]) => s + w[k] * n, 0);

// Matritsa rangi (kasrlar bilan Gauss usuli)
export function rank(rows) {
  const m = rows.map(r => r.slice());
  let rk = 0;
  const cols = m[0] ? m[0].length : 0;
  for (let c = 0; c < cols && rk < m.length; c++) {
    let piv = -1;
    for (let r = rk; r < m.length; r++) if (Math.abs(m[r][c]) > 1e-9) { piv = r; break; }
    if (piv < 0) continue;
    [m[rk], m[piv]] = [m[piv], m[rk]];
    for (let r = 0; r < m.length; r++) if (r !== rk) { const f = m[r][c] / m[rk][c]; for (let k = c; k < cols; k++) m[r][k] -= f * m[rk][k]; }
    rk++;
  }
  return rk;
}
const vec = (sc, K) => { const v = new Array(K).fill(0); for (const [k, n] of sc.L) v[k] += n; for (const [k, n] of sc.R) v[k] -= n; return v; };

// Savol tenglamasi (chap palla − javob × nishon shakl) berilgan tarozilar orqali ifodalanadimi
const qVec = (q, K) => { const v = new Array(K).fill(0); for (const [k, n] of q.L) v[k] += n; v[q.target] -= q.ans; return v; };
export function allNeeded(scalesG, q, K) {
  const qv = qVec(q, K);
  for (let i = 0; i < scalesG.length; i++) {
    const rest = scalesG.filter((_, j) => j !== i).map(s => vec(s, K));
    if (!rest.length) continue;
    if (rank([...rest, qv]) === rank(rest)) return false;     // bu tarozisiz ham javob topiladi
  }
  return true;
}

// O'ng palla: chapdagilardan boshqa shakllar, umumiy og'irlik W, eng ko'p maxN dona
function rightFor(W, w, exclude, maxN, rand) {
  const kinds = shuffle(w.map((_, k) => k).filter(k => !exclude.includes(k)), rand);
  const res = [];
  const rec = (i, left, n, acc) => {
    if (res.length > 30) return;
    if (left === 0 && acc.length) { res.push(acc.slice()); return; }
    if (i >= kinds.length || n >= maxN) return;
    const k = kinds[i];
    for (let c = Math.min(maxN - n, Math.floor(left / w[k])); c >= 0; c--) {
      if (c) acc.push([k, c]);
      rec(i + 1, left - c * w[k], n + c, acc);
      if (c) acc.pop();
    }
  };
  rec(0, W, 0, []);
  return res.length ? pickOne(rand, res) : null;
}

function build(L, rand) {
  for (let attempt = 0; attempt < 3000; attempt++) {
    // Og'irliklar: kichik butun sonlar, eng yengili 1
    let w;
    if (L.K === 2) w = [randInt(rand, 2, 4), 1];
    else if (!L.mixed) { const a = randInt(rand, 2, 3), b = randInt(rand, 2, 3); w = [a * b, b, 1]; }
    else w = Array.from({ length: L.K }, (_, k) => (k === L.K - 1 ? 1 : randInt(rand, 2, 6)));
    if (new Set(w).size < w.length) continue;
    const scalesG = [];
    let bad = false;
    for (let g = 0; g < L.given && !bad; g++) {
      let L1;
      if (!L.mixed) L1 = [[randInt(rand, 0, L.K - 2), 1]];
      else {
        const n = randInt(rand, 1, 2);
        const ks = shuffle(w.map((_, k) => k), rand).slice(0, n);
        L1 = ks.map(k => [k, randInt(rand, 1, 2)]);
      }
      const W = weightOf(L1, w);
      const R1 = rightFor(W, w, L1.map(x => x[0]), L.pan, rand);
      if (!R1 || R1.reduce((s, x) => s + x[1], 0) > L.pan || L1.reduce((s, x) => s + x[1], 0) > 3) { bad = true; break; }
      scalesG.push({ L: L1, R: R1 });
    }
    if (bad) continue;
    if (rank(scalesG.map(s => vec(s, L.K))) !== L.K - 1) continue;
    // Savol: chap pallada 1–3 shakl, o'ngda «? ×» nishon shakl
    const target = pickOne(rand, w.map((_, k) => k));
    const pool = w.map((_, k) => k).filter(k => k !== target);
    const qn = L.K === 2 ? 1 : randInt(rand, 1, Math.min(2, pool.length));
    const qL = shuffle(pool, rand).slice(0, qn).map(k => [k, randInt(rand, 1, L.K === 2 ? 3 : 2)]);
    const Wq = weightOf(qL, w);
    if (Wq % w[target]) continue;
    const ans = Wq / w[target];
    if (ans < 2 || ans > 9) continue;
    // Savol berilgan taroziga aynan teng bo'lmasin (o'ylash kerak bo'lsin) — 1-darajadan tashqari
    const key = ms => ms.map(([k, n]) => k + 'x' + n).sort().join(',');
    if (L.K > 2 && scalesG.some(s => key(s.L) === key(qL) && s.R.length === 1 && s.R[0][0] === target)) continue;
    // Har bir berilgan tarozi kerak: birortasini olib tashlasak, javobni topib bo'lmaydi
    if (!allNeeded(scalesG, { L: qL, target, ans }, L.K)) continue;
    return { w, scales: scalesG, q: { L: qL, target, ans }, objs: null };
  }
  throw new Error('scales: no puzzle');
}

const RULE = {
  uz: "Oq tarozilar muvozanatda: ular qaysi shakl qaysi shakllarga teng ekanini ko'rsatadi. Shu bo'yicha sariq tarozining o'ng pallasiga savoldagi shakldan nechta qo'yish kerakligini top va sonni kvadratchaga yoz.",
  ru: 'Белые весы в равновесии: они показывают, какая фигура равна каким фигурам. По ним найди, сколько фигур из вопроса нужно положить на правую чашу жёлтых весов, и запиши число в квадратик.',
  en: 'The white scales balance: they show which shape equals which shapes. Use them to find how many of the shape in the question go on the right pan of the yellow scale, and write the number in the box.'
};
// Savol: «Nechta [shakl] kerak?» — shakl rasm bilan chiziladi
const ASK = { uz: ['Nechta', 'kerak?'], ru: ['Сколько', 'нужно?'], en: ['How many', 'are needed?'] };

export default {
  id: 'scales',
  skills: ['logic', 'counting'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Tarozi masalalari', ru: 'Весы', en: 'Balance puzzles' },
  desc: {
    uz: "Muvozanatdagi tarozilardan shakllarni almashtirib, oxirgi tarozi uchun nechta shakl kerakligini topish",
    ru: 'По весам в равновесии найти, сколько фигурок уравновесят последние весы',
    en: 'Use the balanced scales to work out how many shapes balance the last one'
  },
  fileBase: { uz: 'Tarozi masalalari', ru: 'Весы', en: 'Balance puzzles' },
  defaultTitle: { uz: 'Tarozini muvozanatla!', ru: 'Уравновесь весы!', en: 'Balance the scales!' },
  options: [{ key: 'level', type: 'level', default: 1 }],
  levelHint: {
    uz: ['2 xil shakl, 1 ta tarozi berilgan', "3 xil shakl, 2 ta tarozi — zanjir bo'yicha almashtirish", "3 xil shakl, pallalarda aralash shakllar", "4 xil shakl, 3 ta tarozi, aralash"],
    ru: ['2 вида фигур, дано 1 весов', '3 вида фигур, 2 весов — замена по цепочке', '3 вида фигур, на чашах смешанные фигуры', '4 вида фигур, 3 весов, смешанные'],
    en: ['2 kinds of shapes, 1 scale given', '3 kinds, 2 scales — swap along a chain', '3 kinds, mixed shapes on the pans', '4 kinds, 3 scales, mixed']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level];
    const rand = makeRng(seed);
    const count = L.count[opts.perPage === 4 ? 2 : opts.perPage === 2 ? 1 : 0];
    const items = [];
    for (let i = 0; i < count; i++) {
      const it = build(L, rand);
      it.objs = shuffle(OBJ.map((_, k) => k), rand).slice(0, L.K);       // har masalada boshqa shakllar
      items.push(it);
    }
    return { level, seed, items };
  },

  info(p, lang) {
    const c = p.items.length;
    return { uz: `${c} ta masala`, ru: `${c} ${ruPlural(c, 'задача', 'задачи', 'задач')}`, en: `${c} puzzles` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box);
    const rule = measureRule(ctx, RULE[lang] || RULE.uz, box.w, scale);
    const gap = 6 * scale, cnt = p.items.length;
    const nS = p.items[0].scales.length + 1;
    const H = box.h - rule.h - gap;
    const cols = cnt >= 2 ? 2 : 1, rows = Math.ceil(cnt / cols);
    const pw = (box.w - (cols - 1) * gap * 1.5) / cols;
    const askK = 0.32;                                    // savol yozuvi balandligi (tarozi balandligiga nisbatan)
    const sh = Math.min((H - (rows - 1) * gap) / (rows * (nS + askK + 0.15)), pw * 0.36, 34);
    const ph = sh * (nS + askK + 0.15);
    const gridH = rows * ph + (rows - 1) * gap;
    const gy = box.y + Math.max(0, (H - gridH) * 0.3);
    const lw = Math.max(0.35, 0.5 * scale);
    p.items.forEach((it, idx) => {
      const ox = box.x + (idx % cols) * (pw + gap * 1.5), oy = gy + Math.floor(idx / cols) * (ph + gap);
      if (cnt > 1) {
        font(ctx, Math.min(4.2 * scale, sh * 0.18), 800); ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`${idx + 1}.`, ox, oy);
      }
      it.scales.forEach((sc, j) => drawScale(ctx, ox + pw * 0.06, oy + j * sh, pw * 0.94, sh, it, sc, showSolution, lw, scale));
      // Savol tarozisi: sariq fon, tepasida «Nechta [shakl] kerak?»
      const qy = oy + it.scales.length * sh + sh * 0.15;
      roundRect(ctx, ox + pw * 0.04, qy, pw * 0.96, sh * (1 + askK) + sh * 0.02, sh * 0.08);
      ctx.fillStyle = '#FEF9C3'; ctx.fill(); ctx.strokeStyle = '#FACC15'; ctx.lineWidth = lw; ctx.stroke();
      const A = ASK[lang] || ASK.uz, fs = Math.min(sh * 0.17, 4.6 * scale), iconS = fs * 1.5;
      font(ctx, fs, 800);
      const w1 = ctx.measureText(A[0]).width, w2 = ctx.measureText(A[1]).width;
      const tot = w1 + iconS * 1.25 + w2 + fs * 0.6, tx = ox + pw * 0.52 - tot / 2, ty = qy + sh * askK * 0.6;
      ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(A[0], tx, ty);
      drawFigure(ctx, { ...OBJ[it.objs[it.q.target]], lw: Math.max(0.3, iconS * 0.05) }, tx + w1 + fs * 0.3 + iconS * 0.6, ty, iconS * 1.2);
      font(ctx, fs, 800); ctx.fillStyle = INK; ctx.textAlign = 'left';
      ctx.fillText(A[1], tx + w1 + fs * 0.6 + iconS * 1.25, ty);
      drawScale(ctx, ox + pw * 0.06, qy + sh * askK, pw * 0.94, sh, it, null, showSolution, lw, scale);
    });
    drawRule(ctx, rule, box.x + box.w / 2, gy + gridH + gap * 0.6);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const T = { uz: `Masalalar: ${p.items.length} ta`, ru: `Задач: ${p.items.length}`, en: `Puzzles: ${p.items.length}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const L = LEVELS[p.level];
    p.items.forEach((it, i) => {
      for (const sc of it.scales) if (weightOf(sc.L, it.w) !== weightOf(sc.R, it.w)) problems.push(`#${i}: not balanced`);
      if (rank(it.scales.map(s => vec(s, L.K))) !== L.K - 1) problems.push(`#${i}: weights not determined`);
      if (weightOf(it.q.L, it.w) !== it.q.ans * it.w[it.q.target]) problems.push(`#${i}: wrong answer`);
      for (const sc of it.scales) {
        if (sc.R.reduce((s, x) => s + x[1], 0) > L.pan) problems.push(`#${i}: pan too full`);
        if (sc.L.some(([k]) => sc.R.some(([q]) => q === k))) problems.push(`#${i}: same shape on both pans`);
      }
      if (new Set(it.objs).size !== L.K) problems.push(`#${i}: shapes repeat`);
      if (!allNeeded(it.scales, it.q, L.K)) problems.push(`#${i}: a scale is not needed`);
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-scales" aria-hidden="true"><defs><linearGradient id="cg-scales" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fddb92"/><stop offset="1" stop-color="#d1fdff"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-scales)"/><g stroke="#1f2937" stroke-width="4" stroke-linecap="round" fill="none"><path d="M100 52v104M70 160h60M36 58h128"/><path d="M36 58l-18 52M36 58l18 52M164 58l-18 52M164 58l18 52"/><path d="M14 110q22 14 44 0M142 110q22 14 44 0"/></g><path d="M92 58l8-12 8 12z" fill="#1f2937"/><circle cx="36" cy="98" r="10" fill="#374151"/><g class="sc-r"><path d="M152 106l8-14 8 14z" fill="#fff" stroke="#1f2937" stroke-width="3"/><path d="M166 106l8-14 8 14z" fill="#fff" stroke="#1f2937" stroke-width="3"/></g><text x="100" y="146" font-family="Nunito, sans-serif" font-weight="900" font-size="22" text-anchor="middle" fill="#DC2626" class="sc-q">?</text></svg>`
};

// Bitta tarozi: sc — berilgan tarozi yoki null (savol)
function drawScale(ctx, x, y, w, h, it, sc, showSolution, lw, scale) {
  const cx = x + w / 2, beamY = y + h * 0.16, panY = y + h * 0.84;
  const armX = w * 0.31, panW = w * 0.36;
  ctx.save();
  ctx.strokeStyle = INK; ctx.lineWidth = lw * 1.3; ctx.lineCap = 'round';
  // tirgak va asos
  ctx.beginPath(); ctx.moveTo(cx, beamY); ctx.lineTo(cx, y + h * 0.95); ctx.moveTo(cx - w * 0.07, y + h * 0.95); ctx.lineTo(cx + w * 0.07, y + h * 0.95); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - armX, beamY); ctx.lineTo(cx + armX, beamY); ctx.stroke();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(cx - h * 0.06, beamY); ctx.lineTo(cx, beamY - h * 0.09); ctx.lineTo(cx + h * 0.06, beamY); ctx.closePath(); ctx.fill();
  // ip va pallalar
  ctx.lineWidth = lw * 0.8; ctx.strokeStyle = MUTE;
  for (const s of [-1, 1]) {
    const px = cx + s * armX;
    ctx.beginPath(); ctx.moveTo(px, beamY); ctx.lineTo(px - panW / 2, panY); ctx.moveTo(px, beamY); ctx.lineTo(px + panW / 2, panY); ctx.stroke();
  }
  ctx.strokeStyle = INK; ctx.lineWidth = lw * 1.3;
  for (const s of [-1, 1]) {
    const px = cx + s * armX;
    ctx.beginPath(); ctx.moveTo(px - panW / 2, panY); ctx.quadraticCurveTo(px, panY + h * 0.14, px + panW / 2, panY); ctx.stroke();
  }
  ctx.restore();
  // Shakllar pallada (bir qatorda; ko'p bo'lsa ikki qatorda)
  const place = (list, px) => {
    const flat = [];
    for (const [k, n] of list) for (let i = 0; i < n; i++) flat.push(k);
    const perRow = flat.length > 3 ? Math.ceil(flat.length / 2) : flat.length;
    const rowsN = Math.ceil(flat.length / perRow);
    const s = Math.min(panW * 0.92 / Math.max(perRow, 2), h * 0.3);
    flat.forEach((k, i) => {
      const r = Math.floor(i / perRow), c = i % perRow, inRow = Math.min(perRow, flat.length - r * perRow);
      const ix = px + (c - (inRow - 1) / 2) * s, iy = panY - s * 0.55 - (rowsN - 1 - r) * s * 0.95;
      drawFigure(ctx, { ...OBJ[it.objs[k]], lw: Math.max(0.3, s * 0.05) }, ix, iy, s * 1.25);
    });
  };
  if (sc) { place(sc.L, cx - armX); place(sc.R, cx + armX); return; }
  place(it.q.L, cx - armX);
  // Savol: [ ] va shakl (nechta shu shakl kerak)
  const s = Math.min(panW * 0.32, h * 0.32), px = cx + armX, iy = panY - s * 0.6;
  const bx = px - s * 0.75;
  roundRect(ctx, bx - s / 2, iy - s / 2, s, s, s * 0.18);
  ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.stroke();
  if (showSolution) { font(ctx, s * 0.7, 800); ctx.fillStyle = ANSWER; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(it.q.ans), bx, iy + s * 0.04); }
  drawFigure(ctx, { ...OBJ[it.objs[it.q.target]], lw: Math.max(0.3, s * 0.05) }, px + s * 0.6, iy, s * 1.25);
}
