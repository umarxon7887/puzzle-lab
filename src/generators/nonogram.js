// nonogram.js — «Yapon krossvordi» (Японский кроссворд / Nonogram) generatori.
// Qator chap tomonida va ustun tepasida raqamlar: shu qatorda/ustunda ketma-ket nechta katak bo'yalishi kerak
// (bloklar orasida kamida bitta bo'sh katak). To'g'ri bo'yalsa, rasm chiqadi.
// Rasmlar konturli rasmlar siluetidan avtomatik olinadi (gridpics.js).
// Kafolat (check()): jumboq faqat qator/ustun mantiqi bilan, taxminsiz, yagona yechimga keladi
// (buni shu yerdagi yechuvchi tekshiradi); raqamlar rasmga mos.

import { makeRng, pickOne, shuffle } from '../core/rng.js';
import { INK, MUTE, ANSWER, font } from '../core/draw.js';
import { detailSilhouette, countBits, PIX_BIG } from '../core/gridpics.js';
import { scaleOf, measureRule, drawRule } from '../core/parts.js';
import { picName } from '../core/pictures.js';

// Rasm: to'liq bo'yalgan siluet, ichidagi detallar oq chiziq (detailSilhouette). Katta to'r — aniqroq rasm.
const LEVELS = [
  { N: 15, keys: PIX_BIG },
  { N: 20, keys: PIX_BIG },
  { N: 25, keys: PIX_BIG },
  { N: 30, keys: PIX_BIG }
];

// Qator/ustun raqamlari (bloklar uzunligi)
const cluesOf = line => { const out = []; let n = 0; for (const v of line) { if (v) n++; else if (n) { out.push(n); n = 0; } } if (n) out.push(n); return out; };

// Bitta qatorni mantiqan yechish: cells — [-1 noma'lum, 0 bo'sh, 1 bo'yalgan]. Natija: yangi holat yoki null (ziddiyat)
function solveLine(cells, clue) {
  const n = cells.length, k = clue.length;
  const memo = new Map();
  const canFill = (a, b) => { for (let i = a; i < b; i++) if (cells[i] === 0) return false; return true; };
  const canEmpty = (a, b) => { for (let i = a; i < b; i++) if (cells[i] === 1) return false; return true; };
  const ok = (pos, j) => {
    const key = pos * 64 + j;
    if (memo.has(key)) return memo.get(key);
    let r;
    if (j === k) r = canEmpty(pos, n);
    else if (pos >= n) r = false;
    else {
      r = false;
      if (cells[pos] !== 1 && ok(pos + 1, j)) r = true;
      const L = clue[j];
      if (!r && pos + L <= n && canFill(pos, pos + L) && (pos + L === n || cells[pos + L] !== 1)) r = ok(Math.min(n, pos + L + 1), j + 1);
    }
    memo.set(key, r);
    return r;
  };
  if (!ok(0, 0)) return null;
  const can1 = new Array(n).fill(false), can0 = new Array(n).fill(false);
  const seen = new Set();
  const walk = (pos, j) => {
    const key = pos * 64 + j;
    if (seen.has(key)) return;
    seen.add(key);
    if (j === k) { for (let i = pos; i < n; i++) can0[i] = true; return; }
    if (pos >= n) return;
    if (cells[pos] !== 1 && ok(pos + 1, j)) { can0[pos] = true; walk(pos + 1, j); }
    const L = clue[j];
    if (pos + L <= n && canFill(pos, pos + L) && (pos + L === n || cells[pos + L] !== 1) && ok(Math.min(n, pos + L + 1), j + 1)) {
      for (let i = pos; i < pos + L; i++) can1[i] = true;
      if (pos + L < n) can0[pos + L] = true;
      walk(Math.min(n, pos + L + 1), j + 1);
    }
  };
  walk(0, 0);
  return cells.map((v, i) => (v !== -1 ? v : can1[i] && !can0[i] ? 1 : can0[i] && !can1[i] ? 0 : -1));
}

// Butun jumboqni qator/ustun mantiqi bilan yechish. Natija: to'liq yechim yoki null (taxminsiz yechilmaydi)
export function solveNonogram(rowClues, colClues) {
  const H = rowClues.length, W = colClues.length;
  const g = Array.from({ length: H }, () => new Array(W).fill(-1));
  for (let iter = 0; iter < 200; iter++) {
    let changed = false;
    for (let r = 0; r < H; r++) {
      const res = solveLine(g[r], rowClues[r]);
      if (!res) return null;
      for (let c = 0; c < W; c++) if (res[c] !== g[r][c]) { g[r][c] = res[c]; changed = true; }
    }
    for (let c = 0; c < W; c++) {
      const col = g.map(row => row[c]);
      const res = solveLine(col, colClues[c]);
      if (!res) return null;
      for (let r = 0; r < H; r++) if (res[r] !== g[r][c]) { g[r][c] = res[r]; changed = true; }
    }
    if (!changed) break;
  }
  return g.every(row => row.every(v => v !== -1)) ? g : null;
}

const RULE = {
  uz: "Raqamlar shu qatorda (yoki ustunda) ketma-ket nechta katak bo'yalishini ko'rsatadi, tartibi chapdan o'ngga (tepadan pastga). Guruhlar orasida kamida bitta bo'sh katak bo'ladi. Hammasini to'g'ri bo'yasang, rasm chiqadi.",
  ru: 'Числа показывают, сколько клеток подряд закрашено в строке (или столбце) — слева направо (сверху вниз). Между группами есть хотя бы одна пустая клетка. Закрасишь правильно — получится рисунок.',
  en: 'The numbers tell how many squares in a row are shaded in that row (or column), from left to right (top to bottom). There is at least one empty square between groups. Shade them all correctly to reveal a picture.'
};

export default {
  id: 'nonogram',
  skills: ['logic', 'counting'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Yapon krossvordi', ru: 'Японский кроссворд', en: 'Nonogram' },
  desc: {
    uz: "Qator va ustundagi raqamlarga qarab kataklarni bo'yab, yashirin rasmni topish",
    ru: 'Закрашивать клетки по числам в строках и столбцах и открыть скрытый рисунок',
    en: 'Shade squares by the row and column numbers to reveal a hidden picture'
  },
  fileBase: { uz: 'Yapon krossvordi', ru: 'Японский кроссворд', en: 'Nonogram' },
  defaultTitle: { uz: "Bo'yab, rasmni top!", ru: 'Закрась и узнай рисунок!', en: 'Shade and reveal!' },
  options: [{ key: 'level', type: 'level', default: 1 }],
  levelHint: {
    uz: ["15 katakli to'r", "20 katakli to'r", "25 katakli to'r", "30 katakli to'r"],
    ru: ['Сетка 15 клеток', 'Сетка 20 клеток', 'Сетка 25 клеток', 'Сетка 30 клеток'],
    en: ['15-square grid', '20-square grid', '25-square grid', '30-square grid']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level];
    let N = L.N;
    if (opts.perPage === 4) N = Math.min(N, 15); else if (opts.perPage === 2) N = Math.min(N, 20);
    const rand = makeRng(seed);
    const keys = shuffle(L.keys.slice(), rand);
    // Taxminsiz yechiladigan rasm topilmasa (juda kam uchraydi), biroz kichikroq to'r sinab ko'riladi
    for (const n of [N, N - 2, N - 4]) {
      for (const key of keys) {
        const { bits } = detailSilhouette(key, n);
        if (countBits(bits) < n * 2) continue;
        const rows = bits.map(cluesOf), cols = bits[0].map((_, c) => cluesOf(bits.map(r => r[c])));
        const sol = solveNonogram(rows, cols);
        if (sol && sol.every((row, r) => row.every((v, c) => v === bits[r][c]))) {
          return { level, seed, key, w: bits[0].length, h: bits.length, bits, rows, cols };
        }
      }
    }
    // Rasmlarning ~85% taxminsiz yechiladi, shuning uchun bu holat amalda uchramaydi
    throw new Error('nonogram: no line-solvable picture');
  },

  info(p, lang) {
    return { uz: `${p.w}×${p.h} to'r`, ru: `сетка ${p.w}×${p.h}`, en: `${p.w}×${p.h} grid` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box);
    const rule = measureRule(ctx, RULE[lang] || RULE.uz, box.w, scale);
    const gap = 4 * scale;
    const rc = Math.max(1, ...p.rows.map(r => r.length)), cc = Math.max(1, ...p.cols.map(c => c.length));
    // Ikki xonali raqamlar sig'ishi uchun qator raqamlari orasi kengroq
    const kx = p.rows.some(r => r.some(v => v > 9)) ? 1.05 : 0.75, ky = 0.72;
    const cs = Math.min(box.w / (p.w + rc * kx), (box.h - rule.h - gap) / (p.h + cc * ky), 11);
    const clueW = rc * cs * kx, clueH = cc * cs * ky;
    const W = clueW + p.w * cs, H = clueH + p.h * cs;
    const top = box.y + Math.max(0, (box.h - H - gap - rule.h) * 0.35);
    const left = box.x + (box.w - W) / 2;
    const gx = left + clueW, gy = top + clueH;

    // Raqamlar maydoni foni
    ctx.fillStyle = '#F3F4F6';
    ctx.fillRect(left, gy, clueW, p.h * cs);
    ctx.fillRect(gx, top, p.w * cs, clueH);
    // Javob
    if (showSolution) {
      ctx.fillStyle = '#374151';
      p.bits.forEach((row, r) => row.forEach((v, c) => { if (v) ctx.fillRect(gx + c * cs, gy + r * cs, cs, cs); }));
    }
    // Raqamlar
    const fs = Math.min(cs * 0.58, 4.2);
    font(ctx, fs, 700);
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    p.rows.forEach((cl, r) => {
      const list = cl.length ? cl : [0];
      list.forEach((v, i) => ctx.fillText(String(v), gx - (list.length - i - 0.5) * cs * kx, gy + r * cs + cs / 2 + fs * 0.04));
    });
    p.cols.forEach((cl, c) => {
      const list = cl.length ? cl : [0];
      list.forEach((v, i) => ctx.fillText(String(v), gx + c * cs + cs / 2, gy - (list.length - i - 0.5) * cs * ky + fs * 0.04));
    });
    // To'r: har 5 katakda qalinroq chiziq
    ctx.strokeStyle = '#9CA3AF'; ctx.lineWidth = Math.max(0.15, 0.2 * scale);
    ctx.beginPath();
    for (let c = 0; c <= p.w; c++) { if (c % 5) { ctx.moveTo(gx + c * cs, top); ctx.lineTo(gx + c * cs, gy + p.h * cs); } }
    for (let r = 0; r <= p.h; r++) { if (r % 5) { ctx.moveTo(left, gy + r * cs); ctx.lineTo(gx + p.w * cs, gy + r * cs); } }
    ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.35, 0.5 * scale);
    ctx.beginPath();
    for (let c = 0; c <= p.w; c += 5) { ctx.moveTo(gx + c * cs, top); ctx.lineTo(gx + c * cs, gy + p.h * cs); }
    for (let r = 0; r <= p.h; r += 5) { ctx.moveTo(left, gy + r * cs); ctx.lineTo(gx + p.w * cs, gy + r * cs); }
    ctx.moveTo(gx + p.w * cs, top); ctx.lineTo(gx + p.w * cs, gy + p.h * cs);
    ctx.moveTo(left, gy + p.h * cs); ctx.lineTo(gx + p.w * cs, gy + p.h * cs);
    ctx.moveTo(left, gy); ctx.lineTo(left, gy + p.h * cs);
    ctx.moveTo(gx, top); ctx.lineTo(gx + p.w * cs, top);
    ctx.stroke();
    if (showSolution) {                                     // rasm nomi — chap yuqori bo'sh burchakda
      font(ctx, Math.min(clueH * 0.45, clueW / Math.max(3, picName(p.key, lang).length) * 1.6, 4), 800);
      ctx.fillStyle = ANSWER; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(picName(p.key, lang), left + clueW / 2, top + clueH / 2);
    }
    drawRule(ctx, rule, box.x + box.w / 2, top + H + gap);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const T = { uz: `Rasm: ${picName(p.key, 'uz')}`, ru: `Рисунок: ${picName(p.key, 'ru')}`, en: `Picture: ${picName(p.key, 'en')}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    p.bits.forEach((row, r) => { if (JSON.stringify(cluesOf(row)) !== JSON.stringify(p.rows[r])) problems.push(`row ${r} clue mismatch`); });
    p.bits[0].forEach((_, c) => { if (JSON.stringify(cluesOf(p.bits.map(r => r[c]))) !== JSON.stringify(p.cols[c])) problems.push(`col ${c} clue mismatch`); });
    const sol = solveNonogram(p.rows, p.cols);
    if (!sol) problems.push('not solvable by line logic');
    else if (!sol.every((row, r) => row.every((v, c) => v === p.bits[r][c]))) problems.push('solution differs from the picture');
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-nonogram" aria-hidden="true"><defs><linearGradient id="cg-nonogram" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#30cfd0"/><stop offset="1" stop-color="#330867"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-nonogram)"/><rect x="62" y="62" width="110" height="110" fill="#fff"/><rect x="28" y="62" width="34" height="110" fill="#e0e7ff"/><rect x="62" y="28" width="110" height="34" fill="#e0e7ff"/><g fill="#1e1b4b"><rect class="ng-a" x="84" y="62" width="22" height="22"/><rect class="ng-a" x="106" y="62" width="22" height="22"/><rect class="ng-b" x="62" y="84" width="22" height="22"/><rect class="ng-b" x="84" y="84" width="22" height="22"/><rect class="ng-b" x="106" y="84" width="22" height="22"/><rect class="ng-b" x="128" y="84" width="22" height="22"/><rect class="ng-c" x="84" y="106" width="22" height="22"/><rect class="ng-c" x="106" y="106" width="22" height="22"/><rect class="ng-d" x="95" y="128" width="22" height="44"/></g><g stroke="#94a3b8" stroke-width="1.5"><path d="M84 28V172M106 28V172M128 28V172M150 28V172M28 84H172M28 106H172M28 128H172M28 150H172"/></g><g font-family="Nunito, sans-serif" font-weight="900" font-size="15" fill="#1e1b4b" text-anchor="middle"><text x="45" y="78">2</text><text x="45" y="100">4</text><text x="45" y="122">2</text><text x="73" y="52">1</text><text x="95" y="52">3</text><text x="117" y="52">3</text><text x="139" y="52">1</text></g></svg>`
};
