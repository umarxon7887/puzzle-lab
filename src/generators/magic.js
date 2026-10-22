// magic.js — «Sehrli kvadrat» (Магический квадрат / Magic square) generatori.
// Har bir qator, ustun va ikkala diagonal yig'indisi bir xil (sehrli son). Ba'zi kataklar bo'sh.
// Kafolat (check()): bo'sh kataklar ketma-ket topiladi — har qadamda bitta bo'sh katagi qolgan chiziq bor
// (sehrli sondan qolganlarini ayirish). Demak yechim yagona. Eng qiyin darajada sehrli son berilmaydi:
// uni to'liq berilgan chiziqdan topish kerak.

import { makeRng, randInt, shuffle, pickOne } from '../core/rng.js';
import { INK, MUTE, ANSWER, font } from '../core/draw.js';
import { scaleOf, measureRule, drawRule, ruPlural } from '../core/parts.js';

// n — o'lcham; affine — 3×3 da sonlarni a·x + b ga almashtirish; hide — bo'sh kataklar soni;
// showSum — sehrli son yoziladimi; count — [1 tadan, 2 tadan, 4 tadan] joylashganda nechta kvadrat
const LEVELS = [
  { n: 3, affine: false, hide: 4, showSum: true, count: [4, 2, 1] },
  { n: 3, affine: true, hide: 6, showSum: true, count: [4, 2, 1] },
  { n: 4, affine: false, hide: 8, showSum: true, count: [2, 1, 1] },
  { n: 5, affine: false, hide: 10, showSum: false, count: [2, 1, 1] }
];

const LO_SHU = [2, 7, 6, 9, 5, 1, 4, 3, 8];

// Kvadratning 8 ta simmetriyasi (burish va ko'zgu aksi)
function symmetry(sq, n, k) {
  const out = new Array(n * n);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    let rr = r, cc = c;
    if (k & 4) cc = n - 1 - cc;                     // ko'zgu
    for (let t = 0; t < (k & 3); t++) { const tmp = rr; rr = cc; cc = n - 1 - tmp; } // 90° burish
    out[rr * n + cc] = sq[r * n + c];
  }
  return out;
}

// 4×4: qatorma-qator to'ldirib qidirish (har chiziqning oxirgi katagi majburiy hisoblanadi)
function magic4(rand) {
  const S = 34, g = new Array(16).fill(0), used = new Array(17).fill(false);
  const order = shuffle(Array.from({ length: 16 }, (_, i) => i + 1), rand);
  let nodes = 0;
  const rowSum = r => g[r * 4] + g[r * 4 + 1] + g[r * 4 + 2] + g[r * 4 + 3];
  function ok(i) {
    const r = Math.floor(i / 4), c = i % 4;
    if (c === 3 && rowSum(r) !== S) return false;
    if (r === 3) {
      if (g[c] + g[4 + c] + g[8 + c] + g[12 + c] !== S) return false;
      if (c === 0 && g[3] + g[6] + g[9] + g[12] !== S) return false;
      if (c === 3 && g[0] + g[5] + g[10] + g[15] !== S) return false;
    }
    return true;
  }
  function forced(i) {
    const r = Math.floor(i / 4), c = i % 4;
    if (c === 3) return S - (g[r * 4] + g[r * 4 + 1] + g[r * 4 + 2]);
    if (r === 3) return S - (g[c] + g[4 + c] + g[8 + c]);
    return 0;
  }
  function rec(i) {
    if (i === 16) return true;
    if (++nodes > 200000) return false;
    const f = forced(i);
    const cand = f ? [f] : order;
    for (const v of cand) {
      if (v < 1 || v > 16 || used[v]) continue;
      // Qisman yig'indilar sehrli sondan oshib ketmasin
      g[i] = v; used[v] = true;
      const r = Math.floor(i / 4), c = i % 4;
      let fine = ok(i);
      if (fine && c < 3) { let s = 0; for (let k = 0; k <= c; k++) s += g[r * 4 + k]; fine = s < S; }
      if (fine && r < 3) { let s = 0; for (let k = 0; k <= r; k++) s += g[k * 4 + c]; fine = s < S; }
      if (fine && rec(i + 1)) return true;
      used[v] = false; g[i] = 0;
    }
    return false;
  }
  return rec(0) ? g.slice() : null;
}

// 5×5: chiziqli usul M = 5·((a1·r + b1·c + c1) mod 5) + ((a2·r + b2·c + c2) mod 5) + 1
function magic5(rand) {
  const good = [];
  for (let a1 = 1; a1 < 5; a1++) for (let b1 = 1; b1 < 5; b1++) for (let a2 = 1; a2 < 5; a2++) for (let b2 = 1; b2 < 5; b2++) {
    if ((a1 + b1) % 5 === 0 || (a1 - b1 + 5) % 5 === 0 || (a2 + b2) % 5 === 0 || (a2 - b2 + 5) % 5 === 0) continue;
    if (((a1 * b2 - a2 * b1) % 5 + 5) % 5 === 0) continue;
    good.push([a1, b1, a2, b2]);
  }
  const [a1, b1, a2, b2] = pickOne(rand, good), c1 = randInt(rand, 0, 4), c2 = randInt(rand, 0, 4);
  const g = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) g.push(5 * ((a1 * r + b1 * c + c1) % 5) + ((a2 * r + b2 * c + c2) % 5) + 1);
  return g;
}

export function lines(n) {
  const L = [];
  for (let r = 0; r < n; r++) L.push(Array.from({ length: n }, (_, c) => r * n + c));
  for (let c = 0; c < n; c++) L.push(Array.from({ length: n }, (_, r) => r * n + c));
  L.push(Array.from({ length: n }, (_, i) => i * n + i));
  L.push(Array.from({ length: n }, (_, i) => i * n + (n - 1 - i)));
  return L;
}

// Berilganlardan yechish (sum null bo'lsa — avval to'liq chiziqdan topiladi). Natija: to'ldirilgan massiv yoki null
export function solveMagic(n, given, sum) {
  const v = given.slice(), LS = lines(n);
  let S = sum;
  if (S == null) {
    const full = LS.find(l => l.every(i => v[i] !== null));
    if (!full) return null;
    S = full.reduce((s, i) => s + v[i], 0);
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const l of LS) {
      const empty = l.filter(i => v[i] === null);
      if (empty.length !== 1) continue;
      v[empty[0]] = S - l.reduce((s, i) => s + (v[i] ?? 0), 0);
      changed = true;
    }
  }
  return v.some(x => x === null) ? null : v;
}

function build(L, rand) {
  const n = L.n;
  for (let attempt = 0; attempt < 200; attempt++) {
    let sq;
    if (n === 3) {
      sq = symmetry(LO_SHU, 3, randInt(rand, 0, 7));
      if (L.affine) { const a = randInt(rand, 2, 5), b = randInt(rand, 0, 12); sq = sq.map(x => a * x + b); }
    } else if (n === 4) { sq = magic4(rand); if (!sq) continue; sq = symmetry(sq, 4, randInt(rand, 0, 7)); }
    else sq = symmetry(magic5(rand), 5, randInt(rand, 0, 7));
    const S = sq.slice(0, n).reduce((a, b) => a + b, 0);
    // Bo'sh kataklar: tasodifiy tartibda birma-bir yashiramiz, yechilishi saqlansa — qoldiramiz
    const hidden = new Set();
    for (const i of shuffle(sq.map((_, k) => k), rand)) {
      if (hidden.size >= L.hide) break;
      hidden.add(i);
      const given = sq.map((x, k) => (hidden.has(k) ? null : x));
      if (!solveMagic(n, given, L.showSum ? S : null)) hidden.delete(i);
    }
    if (hidden.size < L.hide) continue;
    return { sq, S, given: sq.map((_, k) => !hidden.has(k)) };
  }
  throw new Error('magic: no puzzle');
}

const RULE = {
  uz: "Har bir qator, har bir ustun va ikkala diagonaldagi sonlar yig'indisi bir xil — sehrli songa teng. Bo'sh kataklarni to'ldir.",
  ru: 'В каждой строке, каждом столбце и на обеих диагоналях сумма чисел одинакова — она равна магическому числу. Заполни пустые клетки.',
  en: 'Every row, every column and both diagonals add up to the same magic number. Fill in the empty cells.'
};
const RULE_FIND = {
  uz: " Sehrli sonni to'liq to'ldirilgan qator, ustun yoki diagonaldan top.",
  ru: ' Магическое число найди по полностью заполненной строке, столбцу или диагонали.',
  en: ' Find the magic number from a line that is already complete.'
};
const SUM_LABEL = { uz: 'Sehrli son', ru: 'Магическое число', en: 'Magic number' };

export default {
  id: 'magic',
  skills: ['counting', 'logic'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Sehrli kvadrat', ru: 'Магический квадрат', en: 'Magic square' },
  desc: {
    uz: "Har bir qator, ustun va diagonal yig'indisi teng bo'lishi uchun bo'sh kataklarni to'ldirish",
    ru: 'Заполнить пустые клетки так, чтобы суммы в строках, столбцах и диагоналях были равны',
    en: 'Fill the gaps so that every row, column and diagonal has the same sum'
  },
  fileBase: { uz: 'Sehrli kvadrat', ru: 'Магический квадрат', en: 'Magic square' },
  defaultTitle: { uz: "Sehrli kvadratni to'ldir!", ru: 'Заполни магический квадрат!', en: 'Complete the magic square!' },
  options: [{ key: 'level', type: 'level', default: 1 }],
  levelHint: {
    uz: ["3×3, 1 dan 9 gacha sonlar, 4 ta katak bo'sh", "3×3, kattaroq sonlar, 6 ta katak bo'sh", "4×4, 1 dan 16 gacha, 8 ta katak bo'sh", "5×5, 10 ta katak bo'sh, sehrli sonni o'zing top"],
    ru: ['3×3, числа от 1 до 9, 4 пустые клетки', '3×3, числа побольше, 6 пустых клеток', '4×4, от 1 до 16, 8 пустых клеток', '5×5, 10 пустых клеток, магическое число найди сам'],
    en: ['3×3, numbers 1 to 9, 4 empty cells', '3×3, bigger numbers, 6 empty cells', '4×4, 1 to 16, 8 empty cells', '5×5, 10 empty cells, find the magic number yourself']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level];
    const rand = makeRng(seed);
    const count = L.count[opts.perPage === 4 ? 2 : opts.perPage === 2 ? 1 : 0];
    const items = [];
    for (let k = 0; k < count; k++) items.push(build(L, rand));
    return { level, seed, n: L.n, showSum: L.showSum, items };
  },

  info(p, lang) {
    const c = p.items.length;
    return { uz: `${c} ta kvadrat, ${p.n}×${p.n}`, ru: `${c} ${ruPlural(c, 'квадрат', 'квадрата', 'квадратов')} ${p.n}×${p.n}`, en: `${c} square${c > 1 ? 's' : ''}, ${p.n}×${p.n}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box);
    const rule = measureRule(ctx, (RULE[lang] || RULE.uz) + (p.showSum ? '' : (RULE_FIND[lang] || RULE_FIND.uz)), box.w, scale);
    const gap = 8 * scale, n = p.n, cnt = p.items.length;
    const labH = 7 * scale;
    const H = box.h - rule.h - gap;
    let best = null;
    for (let cols = 1; cols <= Math.min(2, cnt); cols++) {
      const rows = Math.ceil(cnt / cols);
      const cs = Math.min((box.w - (cols - 1) * gap * 2) / (cols * n), (H - rows * labH - (rows - 1) * gap) / (rows * n), n === 3 ? 26 : 22);
      const score = cs * (cols === 1 && cnt > 2 ? 0.85 : 1);
      if (!best || score > best.score + 0.01) best = { cols, rows, cs, score };
    }
    const { cols, rows, cs } = best, side = n * cs;
    const gridW = cols * side + (cols - 1) * gap * 2, gridH = rows * (side + labH) + (rows - 1) * gap;
    const gx = box.x + (box.w - gridW) / 2, gy = box.y + Math.max(0, (H - gridH) * 0.35);
    p.items.forEach((it, k) => {
      const ox = gx + (k % cols) * (side + gap * 2), oy = gy + Math.floor(k / cols) * (side + labH + gap);
      // Sehrli son
      font(ctx, Math.min(cs * 0.36, 4.6 * scale), 700);
      ctx.fillStyle = MUTE; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      const lbl = `${SUM_LABEL[lang] || SUM_LABEL.uz}: `;
      const val = p.showSum || showSolution ? String(it.S) : '?';
      const wl = ctx.measureText(lbl).width;
      font(ctx, Math.min(cs * 0.36, 4.6 * scale), 900);
      const wv = ctx.measureText(val).width;
      const lx = ox + side / 2 - (wl + wv) / 2, ly = oy + labH - 2 * scale;
      font(ctx, Math.min(cs * 0.36, 4.6 * scale), 700); ctx.textAlign = 'left';
      ctx.fillText(lbl, lx, ly);
      font(ctx, Math.min(cs * 0.36, 4.6 * scale), 900);
      ctx.fillStyle = p.showSum ? INK : ANSWER; ctx.fillText(val, lx + wl, ly);
      // Kataklar
      const ty = oy + labH;
      for (let i = 0; i < n * n; i++) {
        const x = ox + (i % n) * cs, y = ty + Math.floor(i / n) * cs;
        ctx.fillStyle = it.given[i] ? '#EEF2FF' : '#fff'; ctx.fillRect(x, y, cs, cs);
        if (!it.given[i] && !showSolution) continue;
        const txt = String(it.sq[i]);
        let fs = cs * 0.46;
        font(ctx, fs, it.given[i] ? 800 : 700);
        const w = ctx.measureText(txt).width;
        if (w > cs * 0.82) { fs *= cs * 0.82 / w; font(ctx, fs, it.given[i] ? 800 : 700); }
        ctx.fillStyle = it.given[i] ? INK : ANSWER; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(txt, x + cs / 2, y + cs / 2 + cs * 0.03);
      }
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.3, Math.min(0.5, cs * 0.025));
      ctx.beginPath();
      for (let j = 1; j < n; j++) { ctx.moveTo(ox + j * cs, ty); ctx.lineTo(ox + j * cs, ty + side); ctx.moveTo(ox, ty + j * cs); ctx.lineTo(ox + side, ty + j * cs); }
      ctx.stroke();
      ctx.lineWidth = Math.max(0.6, Math.min(0.9, cs * 0.045)); ctx.strokeRect(ox, ty, side, side);
    });
    drawRule(ctx, rule, box.x + box.w / 2, gy + gridH + gap);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const n = p.items.reduce((s, it) => s + it.given.filter(g => !g).length, 0);
    const T = { uz: `Bo'sh kataklar: ${n} ta`, ru: `Пустых клеток: ${n}`, en: `Empty cells: ${n}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const L = LEVELS[p.level], n = p.n;
    p.items.forEach((it, k) => {
      const sums = lines(n).map(l => l.reduce((s, i) => s + it.sq[i], 0));
      if (sums.some(s => s !== it.S)) problems.push(`#${k}: not magic`);
      if (!L.affine && new Set(it.sq).size !== n * n) problems.push(`#${k}: repeated numbers`);
      const sol = solveMagic(n, it.sq.map((x, i) => (it.given[i] ? x : null)), L.showSum ? it.S : null);
      if (!sol || sol.some((x, i) => x !== it.sq[i])) problems.push(`#${k}: not solvable step by step`);
      const h = it.given.filter(g => !g).length;
      if (h !== L.hide) problems.push(`#${k}: ${h} empty cells`);
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-magic" aria-hidden="true"><defs><linearGradient id="cg-magic" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a18cd1"/><stop offset="1" stop-color="#fbc2eb"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-magic)"/><rect x="40" y="40" width="120" height="120" rx="6" fill="#fff" stroke="#4c1d95" stroke-width="4"/><path d="M80 40v120M120 40v120M40 80h120M40 120h120" stroke="#4c1d95" stroke-width="3"/><g font-family="Nunito, sans-serif" font-weight="900" font-size="24" text-anchor="middle" fill="#4c1d95"><text x="60" y="69">2</text><text x="100" y="69">7</text><text x="140" y="69">6</text><text x="60" y="109">9</text><text x="140" y="109">1</text><text x="60" y="149">4</text><text x="100" y="149">3</text><text x="140" y="149">8</text></g><text class="mg-c" x="100" y="109" font-family="Nunito, sans-serif" font-weight="900" font-size="24" text-anchor="middle" fill="#DC2626">5</text><path class="mg-d" d="M46 46 L154 154" stroke="#DC2626" stroke-width="4" stroke-linecap="round" fill="none" pathLength="100" opacity=".55"/></svg>`
};
