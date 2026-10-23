// letterseq-figs.js — «Harf qatorlari» generatorining shaklli turlari (v2.8):
//   matrix — 3×3 harf jadvali: qatorda ham, ustunda ham bir xil qadam (rus kitobi M17);
//   star   — yulduz uchlarida harf va son navbatma-navbat, son — harfning alifbodagi o'rni (M21);
//   blocks — uchta 2×2 harf bloki: blok ichida va bloklar orasida bir xil qadam (M23);
//   shift4 — to'rt harfli guruh qanday o'zgargan bo'lsa, ikkinchisi ham shunday o'zgaradi (IQ 2026 №5).
// Har bir turning bashorat funksiyasi «?» uchun mumkin bo'lgan barcha javoblarni qaytaradi (bitta bo'lishi shart).

import { randInt, pickOne, shuffle } from '../core/rng.js';
import { INK, MUTE, ANSWER, font } from '../core/draw.js';
import { cellBox, questionCell } from '../core/parts.js';

// ---------- Yasash ----------
export function buildFig(kind, N, level, rand) {
  for (let guard = 0; guard < 300; guard++) {
    let row;
    if (kind === 'matrix') {
      const dc = randInt(rand, 1, level >= 3 ? 3 : 2), dr = randInt(rand, 1, 3) + (level >= 3 ? 1 : 0);
      const a = randInt(rand, 1, N - 2 * dr - 2 * dc);
      if (a < 1) continue;
      row = { kind, v: Array.from({ length: 9 }, (_, i) => a + Math.floor(i / 3) * dr + (i % 3) * dc), q: randInt(rand, 0, 8) };
    } else if (kind === 'star') {
      const d = randInt(rand, 1, level >= 3 ? 4 : 3), a = randInt(rand, 1, N - 5 * d);
      if (a < 1) continue;
      row = { kind, v: Array.from({ length: 6 }, (_, k) => a + k * d), q: randInt(rand, 2, 5) };
    } else if (kind === 'blocks') {
      const s = randInt(rand, 1, 2), d = randInt(rand, 1, 3), b0 = randInt(rand, 1, Math.max(1, N - 2 * d - 3 * s));
      row = { kind, v: Array.from({ length: 12 }, (_, i) => b0 + Math.floor(i / 4) * d + (i % 4) * s), q: randInt(rand, 8, 11) };
    } else {
      const k = pickOne(rand, [1, 2, -1, 3]), rev = level >= 3 && rand() < 0.5;
      const mk = () => shuffle(Array.from({ length: N - 6 }, (_, i) => i + 4), rand).slice(0, 4);
      const g1 = mk(), g3 = mk();
      const tf = g => { const h = rev ? g.slice().reverse() : g.slice(); return h.map(p => p + k); };
      row = { kind, g1, g2: tf(g1), g3, g4: tf(g3), k, rev };
    }
    if (!figValid(row, N)) continue;
    const pr = figPredict(row);
    if (pr.size !== 1 || !pr.has(figAnswerKey(row))) continue;
    return row;
  }
  throw new Error('letterseq: no ' + kind);
}

export function figValid(row, N) {
  const vals = row.kind === 'shift4' ? [...row.g1, ...row.g2, ...row.g3, ...row.g4] : row.v;
  return vals.every(p => Number.isInteger(p) && p >= 1 && p <= N) && new Set(vals).size >= 3;
}
export const figAnswerKey = row => (row.kind === 'shift4' ? row.g4.join(',') : String(row.v[row.q]));

// ---------- Bashorat ----------
export function figPredict(row) {
  const out = new Set();
  if (row.kind === 'matrix') {
    const known = row.v.map((p, i) => (i === row.q ? null : p));
    for (let dr = -6; dr <= 6; dr++) for (let dc = -6; dc <= 6; dc++) {
      const i0 = known.findIndex(p => p !== null), a = known[i0] - Math.floor(i0 / 3) * dr - (i0 % 3) * dc;
      if (known.every((p, i) => p === null || p === a + Math.floor(i / 3) * dr + (i % 3) * dc)) out.add(String(a + Math.floor(row.q / 3) * dr + (row.q % 3) * dc));
    }
    // har qator alohida arifmetik (o'z qadami bilan)
    const r = Math.floor(row.q / 3), cells = [0, 1, 2].filter(c => c !== row.q % 3).map(c => [c, row.v[r * 3 + c]]);
    const d = (cells[1][1] - cells[0][1]) / (cells[1][0] - cells[0][0]);
    out.add(String(cells[0][1] + d * (row.q % 3 - cells[0][0])));
    return out;
  }
  if (row.kind === 'star') {
    const known = row.v.map((p, i) => (i === row.q ? null : p)), idx = known.map((p, i) => (p === null ? -1 : i)).filter(i => i >= 0);
    for (let d = -6; d <= 6; d++) { const a = known[idx[0]] - idx[0] * d; if (idx.every(i => known[i] === a + i * d)) out.add(String(a + row.q * d)); }
    // harflar va sonlar ikki alohida qator bo'lsa ham
    const same = idx.filter(i => i % 2 === row.q % 2);
    if (same.length >= 2) { const dd = (known[same[1]] - known[same[0]]) / (same[1] - same[0]); out.add(String(known[same[0]] + dd * (row.q - same[0]))); }
    return out;
  }
  if (row.kind === 'blocks') {
    const known = row.v.map((p, i) => (i === row.q ? null : p));
    for (let d = -6; d <= 6; d++) for (let s = -6; s <= 6; s++) {
      const a = known[0];
      if (known.every((p, i) => p === null || p === a + Math.floor(i / 4) * d + (i % 4) * s)) out.add(String(a + Math.floor(row.q / 4) * d + (row.q % 4) * s));
    }
    return out;
  }
  // shift4: siljitish (k) yoki teskari tartib + siljitish
  for (const rev of [false, true]) for (let k = -6; k <= 6; k++) {
    const tf = g => { const h = rev ? g.slice().reverse() : g.slice(); return h.map(p => p + k); };
    if (tf(row.g1).join(',') === row.g2.join(',')) out.add(tf(row.g3).join(','));
  }
  return out;
}

// ---------- O'lcham (katak birligida) ----------
export const figSize = row => ({ matrix: [3.2, 3.1], star: [3.6, 3.4], blocks: [7.4, 2.1], shift4: [9.6, 2.35] })[row.kind];

// ---------- Chizish ----------
function letterCell(ctx, x, y, c, txt, { q = false, show = false, scale = 1, round = true } = {}) {
  if (q && !show) { questionCell(ctx, x, y, c, scale); return; }
  cellBox(ctx, x, y, c, c, scale, { fill: q ? '#FEF2F2' : '#fff', stroke: q ? ANSWER : '#9CA3AF', r: round ? c * 0.14 : 0 });
  let fs = c * (txt.length > 1 ? 0.44 : 0.58);
  font(ctx, fs, 800);
  const tw = ctx.measureText(txt).width; if (tw > c * 0.86) { fs *= c * 0.86 / tw; font(ctx, fs, 800); }
  ctx.fillStyle = q ? ANSWER : INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(txt, x + c / 2, y + c / 2 + c * 0.03);
}
export function drawFig(ctx, row, x, y, c, alpha, show, scale) {
  const L = p => alpha[p - 1] || '?';
  ctx.save();
  if (row.kind === 'matrix') {
    const ox = x + 0.1 * c;
    row.v.forEach((p, i) => letterCell(ctx, ox + (i % 3) * c * 1.02, y + Math.floor(i / 3) * c * 1.02, c, L(p), { q: i === row.q, show, scale, round: false }));
  } else if (row.kind === 'star') {
    const cx = x + 1.8 * c, cy = y + 1.7 * c, R = 1.25 * c;
    const pts = Array.from({ length: 6 }, (_, k) => { const a = -Math.PI / 2 + k * Math.PI / 3; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R]; });
    ctx.strokeStyle = '#C7D2FE'; ctx.lineWidth = Math.max(0.3, c * 0.04);
    ctx.beginPath();
    for (const off of [0, 1]) { [0, 2, 4].forEach((k, j) => { const [px, py] = pts[(k + off) % 6]; if (j) ctx.lineTo(px, py); else ctx.moveTo(px, py); }); ctx.closePath(); }
    ctx.stroke();
    pts.forEach(([px, py], k) => {
      const txt = k % 2 === 0 ? L(row.v[k]) : String(row.v[k]);
      const cc = c * 0.82;
      letterCell(ctx, px - cc / 2, py - cc / 2, cc, txt, { q: k === row.q, show, scale });
    });
  } else if (row.kind === 'blocks') {
    const cc = c * 0.98;
    for (let b = 0; b < 3; b++) {
      const bx = x + b * (2 * cc + 0.7 * c);
      for (let k = 0; k < 4; k++) {
        const i = b * 4 + k;
        letterCell(ctx, bx + (k % 2) * cc, y + Math.floor(k / 2) * cc, cc, L(row.v[i]), { q: i === row.q, show, scale, round: false });
      }
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.4, c * 0.05); ctx.strokeRect(bx, y, 2 * cc, 2 * cc);
    }
  } else {
    const cc = c * 0.98, lineH = cc * 1.25;
    const group = (g, gx, gy, hidden) => g.forEach((p, k) => letterCell(ctx, gx + k * cc * 1.04, gy, cc, L(p), { q: hidden, show, scale }));
    const arrow = (ax, ay) => {
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.3, c * 0.06); ctx.lineCap = 'round';
      const x1 = ax + c * 0.3, x2 = ax + c * 1.15, hd = c * 0.2, my = ay + cc / 2;
      ctx.beginPath(); ctx.moveTo(x1, my); ctx.lineTo(x2, my); ctx.moveTo(x2 - hd, my - hd); ctx.lineTo(x2, my); ctx.lineTo(x2 - hd, my + hd); ctx.stroke();
    };
    const gw = 4 * cc * 1.04;
    group(row.g1, x, y, false); arrow(x + gw, y); group(row.g2, x + gw + 1.45 * c, y, false);
    group(row.g3, x, y + lineH, false); arrow(x + gw, y + lineH); group(row.g4, x + gw + 1.45 * c, y + lineH, true);
  }
  ctx.restore();
}

const sgn = d => (d >= 0 ? '+' : '−') + Math.abs(d);
export function figRuleText(row, lang) {
  if (row.kind === 'matrix') {
    const dc = row.v[1] - row.v[0], dr = row.v[3] - row.v[0];
    return { uz: `qatorda ${sgn(dc)}, ustunda ${sgn(dr)}`, ru: `в строке ${sgn(dc)}, в столбце ${sgn(dr)}`, en: `${sgn(dc)} along a row, ${sgn(dr)} down a column` }[lang];
  }
  if (row.kind === 'star') {
    const d = row.v[1] - row.v[0];
    return { uz: `soat yo'nalishida ${sgn(d)}; son — harfning o'rni`, ru: `по часовой стрелке ${sgn(d)}; число — номер буквы`, en: `clockwise ${sgn(d)}; a number is a letter position` }[lang];
  }
  if (row.kind === 'blocks') {
    const s = row.v[1] - row.v[0], d = row.v[4] - row.v[0];
    return { uz: `blok ichida ${sgn(s)}, keyingi blok ${sgn(d)}`, ru: `внутри блока ${sgn(s)}, следующий блок ${sgn(d)}`, en: `${sgn(s)} inside a block, next block ${sgn(d)}` }[lang];
  }
  return row.rev
    ? { uz: `tartib teskari, har harf ${sgn(row.k)}`, ru: `порядок обратный, каждая буква ${sgn(row.k)}`, en: `order reversed, each letter ${sgn(row.k)}` }[lang]
    : { uz: `har harf ${sgn(row.k)}`, ru: `каждая буква ${sgn(row.k)}`, en: `each letter ${sgn(row.k)}` }[lang];
}
