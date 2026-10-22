// numseq.js — «Sonli ketma-ketliklar» (Числовые ряды / Number sequences) generatori.
// Har qatorda bitta qoida bo'yicha tuzilgan sonlar qatori, ba'zi o'rinlar bo'sh. Bola qoidani topib, bo'shliqlarni to'ldiradi.
// Kafolat (check()): qoidalar kutubxonasidagi (barcha darajalar) birorta boshqa qoida ko'rinib turgan sonlarga mos kelib,
// bo'shliqlarga boshqa son bermaydi. Birinchi ikki son har doim ko'rinadi.
// Qolip: rus IQ kitobi M6, M8, M10, M11; ozarbayjon test banki «Ardıcıllıqlar»; Litsey 2024 IQ №1.

import { makeRng, randInt, shuffle, pickOne } from '../core/rng.js';
import { INK, MUTE, ANSWER, font, roundRect } from '../core/draw.js';
import { scaleOf, measureRule, drawRule, ruPlural } from '../core/parts.js';

// len — qatordagi sonlar; blanks — bo'sh o'rinlar; endOnly — bo'shliqlar faqat oxirida; max — eng katta son;
// kinds — qoidalar (vazni bilan); rows — [1 tadan, 2 tadan, 4 tadan] joylashganda qatorlar soni
const LEVELS = [
  { len: 6, blanks: [1, 2], endOnly: true, min: 0, max: 60, kinds: { add: 3, sub: 2 }, rows: [9, 4, 4] },
  { len: 7, blanks: [2, 2], endOnly: false, min: 0, max: 120, kinds: { add: 2, sub: 1, alt: 2, grow: 2, mul: 1 }, rows: [8, 4, 4] },
  { len: 7, blanks: [2, 2], endOnly: false, min: 0, max: 500, kinds: { alt: 1, grow: 2, mul: 2, div: 1, inter: 2, fib: 1, sq: 1 }, rows: [8, 4, 3] },
  { len: 8, blanks: [2, 3], endOnly: false, min: 0, max: 999, kinds: { mulAdd: 3, lin: 2, grow: 1, inter: 1, sq: 1, cube: 1, fib: 1 }, rows: [8, 4, 3] }
];

// Qoidani boshlang'ich ikki son va parametrlardan yoyish
export function simulate(kind, pr, t0, t1, len) {
  const t = [t0, t1];
  for (let i = 2; i < len; i++) {
    const a = t[i - 1], b = t[i - 2];
    let v;
    switch (kind) {
      case 'add': v = a + pr.d; break;
      case 'mul': v = a * pr.r; break;
      case 'div': v = a / pr.r; break;
      case 'alt': v = a + ((i - 1) % 2 === 0 ? pr.p : pr.q); break;          // 1-qadam p, 2-qadam q, …
      case 'grow': v = a + pr.d0 + pr.e * (i - 1); break;
      case 'inter': v = b + (i % 2 === 0 ? pr.d1 : pr.d2); break;
      case 'fib': v = a + b; break;
      case 'mulAdd': v = ((i - 1) % 2 === 0) === (pr.first === 'mul') ? a * pr.p : a + pr.q; break;
      case 'lin': v = a * pr.p + pr.q; break;
      case 'sq': v = (i + pr.s) ** 2 + pr.c; break;
      case 'cube': v = (i + pr.s) ** 3 + pr.c; break;
      default: v = NaN;
    }
    if (!Number.isFinite(v) || !Number.isInteger(v) || Math.abs(v) > 100000) return null;
    t.push(v);
  }
  return t;
}

// Ko'rinib turgan sonlarga mos keladigan barcha qoidalar (birinchi ikki son ma'lum)
export function candidates(shown) {
  const len = shown.length, t0 = shown[0], t1 = shown[1], out = [];
  const tryOne = (kind, pr) => {
    const s = simulate(kind, pr, t0, t1, len);
    if (s && s.every((v, i) => shown[i] === null || shown[i] === v)) out.push({ kind, pr, seq: s });
  };
  tryOne('add', { d: t1 - t0 });
  for (let r = 2; r <= 10; r++) { if (t0 * r === t1) tryOne('mul', { r }); if (t1 * r === t0) tryOne('div', { r }); }
  for (let q = -60; q <= 60; q++) if (q !== t1 - t0) tryOne('alt', { p: t1 - t0, q });
  for (let e = -25; e <= 25; e++) if (e) tryOne('grow', { d0: t1 - t0, e });
  for (let d1 = -60; d1 <= 60; d1++) {
    // juft o'rinlar: t0, t0+d1, …; toq o'rinlar: t1, t1+d2, … — d2 ni ko'rinib turgan toq sondan topamiz
    let d2 = null;
    for (let i = 3; i < len; i += 2) if (shown[i] !== null) { const k = (i - 1) / 2; if ((shown[i] - t1) % k === 0) d2 = (shown[i] - t1) / k; break; }
    if (d2 === null) { for (let x = -60; x <= 60; x++) tryOne('inter', { d1, d2: x }); } else tryOne('inter', { d1, d2 });
  }
  tryOne('fib', {});
  for (let p = 2; p <= 5; p++) {
    if (t0 * p === t1) for (let q = -30; q <= 30; q++) if (q) tryOne('mulAdd', { first: 'mul', p, q });
    if (t1 - t0) tryOne('mulAdd', { first: 'add', p, q: t1 - t0 });
    const q = t1 - p * t0; if (Math.abs(q) <= 30) tryOne('lin', { p, q });
  }
  for (let s = 0; s <= 15; s++) { const c = t0 - s * s; if (Math.abs(c) <= 50 && t1 === (s + 1) ** 2 + c) tryOne('sq', { s, c }); }
  for (let s = 0; s <= 8; s++) { const c = t0 - s ** 3; if (Math.abs(c) <= 50 && t1 === (s + 1) ** 3 + c) tryOne('cube', { s, c }); }
  return out;
}

// Bitta qoida uchun parametr va boshlang'ich sonlar
function makeRule(kind, rand, L) {
  const lvl = LEVELS.indexOf(L);
  switch (kind) {
    case 'add': { const d = lvl === 0 ? pickOne(rand, [1, 2, 2, 3, 4, 5, 10]) : randInt(rand, 3, 15); const t0 = randInt(rand, 0, lvl === 0 ? 15 : 30); return { kind, pr: { d }, t0, t1: t0 + d }; }
    case 'sub': { const d = lvl === 0 ? pickOne(rand, [1, 2, 2, 3, 4, 5, 10]) : randInt(rand, 3, 12); const t0 = randInt(rand, d * (L.len - 1), Math.min(L.max, d * (L.len - 1) + 30)); return { kind: 'add', pr: { d: -d }, t0, t1: t0 - d }; }
    case 'mul': { const r = lvl <= 1 ? 2 : pickOne(rand, [2, 2, 3]); const t0 = randInt(rand, 1, lvl <= 1 ? 3 : 5); return { kind, pr: { r }, t0, t1: t0 * r }; }
    case 'div': { const r = 2; const t1x = randInt(rand, 1, 7); const t0 = t1x * r ** (L.len - 1); return { kind, pr: { r }, t0, t1: t0 / r }; }
    case 'alt': {
      const big = lvl >= 2 ? 15 : 9;
      let p = randInt(rand, 2, big), q = -randInt(rand, 1, big - 1);
      if (rand() < 0.35) q = randInt(rand, 1, big);
      if (p === q) q++;
      if (rand() < 0.5) [p, q] = [q, p];
      const t0 = randInt(rand, 10, 40); return { kind, pr: { p, q }, t0, t1: t0 + p };
    }
    case 'grow': { const d0 = randInt(rand, 1, lvl >= 2 ? 6 : 3), e = lvl >= 3 && rand() < 0.4 ? -randInt(rand, 1, 2) : randInt(rand, 1, lvl >= 2 ? 3 : 2); const t0 = randInt(rand, e < 0 ? 40 : 1, e < 0 ? 80 : 20); return { kind, pr: { d0: e < 0 ? d0 + 12 : d0, e }, t0, t1: t0 + (e < 0 ? d0 + 12 : d0) }; }
    case 'inter': { const d1 = randInt(rand, 2, 9), d2 = -randInt(rand, 1, 6) * (rand() < 0.5 ? 1 : -1); const t0 = randInt(rand, 1, 20), t1 = randInt(rand, 30, 60); return { kind, pr: { d1, d2: d2 === d1 ? d2 + 1 : d2 }, t0, t1 }; }
    case 'fib': { const t0 = randInt(rand, 1, 6), t1 = randInt(rand, 1, 8); return { kind, pr: {}, t0, t1 }; }
    case 'mulAdd': {
      const p = pickOne(rand, [2, 2, 3]), q = pickOne(rand, [1, 2, 3, 4, 5, -1, -2, -3]);
      const first = rand() < 0.5 ? 'mul' : 'add', t0 = randInt(rand, 1, 6);
      return { kind, pr: { first, p, q }, t0, t1: first === 'mul' ? t0 * p : t0 + q };
    }
    case 'lin': { const p = 2, q = pickOne(rand, [1, -1, 2, 3, -2]); const t0 = randInt(rand, q < 0 ? 3 : 1, 5); return { kind, pr: { p, q }, t0, t1: t0 * p + q }; }
    case 'sq': { const s = randInt(rand, 1, lvl >= 3 ? 6 : 4), c = lvl >= 3 ? pickOne(rand, [1, -1, 2, 3, 0]) : 0; return { kind, pr: { s, c }, t0: s * s + c, t1: (s + 1) ** 2 + c }; }
    case 'cube': { const s = randInt(rand, 1, 2), c = pickOne(rand, [0, 1, -1]); return { kind, pr: { s, c }, t0: s ** 3 + c, t1: (s + 1) ** 3 + c }; }
  }
  return null;
}

function buildRow(L, rand, usedKinds) {
  const kinds = Object.entries(L.kinds);
  for (let attempt = 0; attempt < 500; attempt++) {
    // Takrorlanmaslik uchun: bir varaqda bir xil qoida turi ketma-ket kelmasin
    const total = kinds.reduce((s, [, w]) => s + w, 0);
    let x = rand() * total, kind = kinds[0][0];
    for (const [k, w] of kinds) { if ((x -= w) < 0) { kind = k; break; } }
    if (usedKinds.length && usedKinds[usedKinds.length - 1] === kind && kinds.length > 1) continue;
    const R = makeRule(kind, rand, L);
    if (!R) continue;
    const seq = simulate(R.kind, R.pr, R.t0, R.t1, L.len);
    if (!seq || seq.some(v => v < L.min || v > L.max)) continue;
    if (new Set(seq).size < seq.length - (R.kind === 'alt' || R.kind === 'inter' ? 2 : 0)) continue;
    const nb = randInt(rand, L.blanks[0], L.blanks[1]);
    let pos;
    if (L.endOnly) pos = Array.from({ length: nb }, (_, i) => L.len - 1 - i);
    else pos = shuffle(Array.from({ length: L.len - 2 }, (_, i) => i + 2), rand).slice(0, nb);
    // Juft-toq aralash qatorda oxirgi ikki son birga yashirilmasin (qoida ko'rinmay qoladi)
    const shown = seq.map((v, i) => (pos.includes(i) ? null : v));
    const cands = candidates(shown);
    const same = cands.every(c => pos.every(i => c.seq[i] === seq[i]));
    if (!cands.length || !same) continue;
    usedKinds.push(kind);
    return { seq, blanks: pos.sort((a, b) => a - b), kind: R.kind, pr: R.pr };
  }
  throw new Error('numseq: no row');
}

// Javob varag'idagi qoida yozuvi
const sg = v => (v < 0 ? '−' + -v : '+' + v);
export function ruleText(row, lang) {
  const { kind, pr } = row;
  const T = {
    inter: { uz: 'Ikki qator: ', ru: 'Два ряда: ', en: 'Two series: ' },
    and: { uz: ' va ', ru: ' и ', en: ' and ' },
    fib: { uz: "Oldingi ikkitasining yig'indisi", ru: 'Сумма двух предыдущих', en: 'Sum of the two before' },
    alt: { uz: 'navbat bilan', ru: 'по очереди', en: 'in turn' }
  };
  const pickL = o => o[lang] || o.uz;
  switch (kind) {
    case 'add': return sg(pr.d);
    case 'mul': return '×' + pr.r;
    case 'div': return '÷' + pr.r;
    case 'alt': return `${sg(pr.p)}, ${sg(pr.q)} ${pickL(T.alt)}`;
    case 'grow': return `${sg(pr.d0)}, ${sg(pr.d0 + pr.e)}, ${sg(pr.d0 + 2 * pr.e)} …`;
    case 'inter': return pickL(T.inter) + sg(pr.d1) + pickL(T.and) + sg(pr.d2);
    case 'fib': return pickL(T.fib);
    case 'mulAdd': return pr.first === 'mul' ? `×${pr.p}, ${sg(pr.q)} ${pickL(T.alt)}` : `${sg(pr.q)}, ×${pr.p} ${pickL(T.alt)}`;
    case 'lin': return `×${pr.p} ${sg(pr.q)}`;
    case 'sq': return `${pr.s}², ${pr.s + 1}², ${pr.s + 2}² …${pr.c ? ' ' + sg(pr.c) : ''}`;
    case 'cube': return `${pr.s}³, ${pr.s + 1}³, ${pr.s + 2}³ …${pr.c ? ' ' + sg(pr.c) : ''}`;
  }
  return '';
}

const RULE = {
  uz: "Har bir qatordagi sonlar bitta qoida bo'yicha yozilgan. Qoidani topib, bo'sh kataklarga kerakli sonlarni yoz.",
  ru: 'Числа в каждом ряду записаны по одному правилу. Найди правило и впиши нужные числа в пустые клетки.',
  en: 'The numbers in each row follow one rule. Find the rule and write the missing numbers in the empty cells.'
};

export default {
  id: 'numseq',
  skills: ['patterns', 'counting', 'logic'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Sonli ketma-ketliklar', ru: 'Числовые ряды', en: 'Number sequences' },
  desc: {
    uz: "Sonlar qatorining qoidasini topib, tushib qolgan sonlarni yozish: +3, ×2, navbatma-navbat qadamlar …",
    ru: 'Найти правило числового ряда и вписать пропущенные числа: +3, ×2, шаги по очереди …',
    en: 'Find the rule of a number row and fill in the missing numbers: +3, ×2, alternating steps …'
  },
  fileBase: { uz: 'Sonli ketma-ketliklar', ru: 'Числовые ряды', en: 'Number sequences' },
  defaultTitle: { uz: 'Qoidani top!', ru: 'Найди правило!', en: 'Find the rule!' },
  options: [{ key: 'level', type: 'level', default: 1 }],
  levelHint: {
    uz: ["Bir xil qadam (+2, −5, +10), 60 gacha; bo'sh joy oxirida", "Navbatma-navbat qadamlar, o'sib boruvchi qadam, ×2; 120 gacha", "×2, ×3, ÷2, ikki qator aralash, kvadratlar, yig'indi qatori; 500 gacha", "×2+1, «×2 va +3 navbat bilan», kublar va boshqalar; 999 gacha"],
    ru: ['Одинаковый шаг (+2, −5, +10), до 60; пропуски в конце', 'Шаги по очереди, растущий шаг, ×2; до 120', '×2, ×3, ÷2, два ряда вперемешку, квадраты, суммы; до 500', '×2+1, «×2 и +3 по очереди», кубы и другие; до 999'],
    en: ['Same step (+2, −5, +10), up to 60; gaps at the end', 'Alternating steps, growing step, ×2; up to 120', '×2, ×3, ÷2, two mixed series, squares, sums; up to 500', '×2+1, “×2 and +3 in turn”, cubes and more; up to 999']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level];
    const rand = makeRng(seed);
    const n = L.rows[opts.perPage === 4 ? 2 : opts.perPage === 2 ? 1 : 0];
    const used = [], rows = [];
    for (let k = 0; k < n; k++) rows.push(buildRow(L, rand, used));
    return { level, seed, len: L.len, rows };
  },

  info(p, lang) {
    const n = p.rows.length;
    return { uz: `${n} ta qator`, ru: `${n} ${ruPlural(n, 'ряд', 'ряда', 'рядов')}`, en: `${n} rows` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box);
    const rule = measureRule(ctx, RULE[lang] || RULE.uz, box.w, scale);
    const gap = 5 * scale, n = p.rows.length, len = p.len;
    const numW = 7 * scale;
    const cell = Math.min((box.w - numW) / (len + (len - 1) * 0.22), 17);
    const step = cell * 1.22;
    const ansH = 4.2 * scale;
    const rowH = Math.min(cell + ansH + gap * 1.6, (box.h - rule.h - gap) / n);
    const ch = Math.min(cell, rowH - ansH - gap * 0.8);
    const gridW = numW + (len - 1) * step + cell;
    const gx = box.x + (box.w - gridW) / 2;
    const blockH = n * rowH;
    const gy = box.y + Math.max(0, (box.h - rule.h - gap - blockH) * 0.3);
    p.rows.forEach((row, k) => {
      const y = gy + k * rowH;
      font(ctx, Math.min(ch * 0.42, 4.6 * scale), 800);
      ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(`${k + 1}.`, gx, y + ch / 2);
      row.seq.forEach((v, i) => {
        const x = gx + numW + i * step;
        const blank = row.blanks.includes(i);
        roundRect(ctx, x, y, cell, ch, Math.min(cell, ch) * 0.2);
        ctx.fillStyle = blank ? '#fff' : '#EEF2FF'; ctx.fill();
        ctx.strokeStyle = blank ? INK : '#C7D2FE'; ctx.lineWidth = Math.max(0.3, (blank ? 0.45 : 0.35) * scale); ctx.stroke();
        if (blank && !showSolution) return;
        const txt = String(v).replace('-', '−');
        let fs = ch * 0.5;
        font(ctx, fs, blank ? 700 : 800);
        const w = ctx.measureText(txt).width;
        if (w > cell * 0.84) { fs *= cell * 0.84 / w; font(ctx, fs, blank ? 700 : 800); }
        ctx.fillStyle = blank ? ANSWER : INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(txt, x + cell / 2, y + ch / 2 + ch * 0.03);
      });
      if (showSolution) {
        font(ctx, Math.min(3.4 * scale, ansH * 0.85), 700);
        ctx.fillStyle = ANSWER; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(ruleText(row, lang), gx + numW, y + ch + 0.8 * scale);
      }
    });
    drawRule(ctx, rule, box.x + box.w / 2, gy + blockH + gap * 0.4);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const n = p.rows.reduce((s, r) => s + r.blanks.length, 0);
    const T = { uz: `Bo'sh kataklar: ${n} ta`, ru: `Пустых клеток: ${n}`, en: `Empty cells: ${n}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const L = LEVELS[p.level];
    p.rows.forEach((row, k) => {
      const s = simulate(row.kind, row.pr, row.seq[0], row.seq[1], row.seq.length);
      if (!s || s.some((v, i) => v !== row.seq[i])) problems.push(`#${k}: rule does not match`);
      if (row.seq.some(v => v < L.min || v > L.max)) problems.push(`#${k}: out of range`);
      if (row.blanks.some(i => i < 2)) problems.push(`#${k}: first two must be shown`);
      if (L.endOnly && row.blanks.some(i => i < L.len - row.blanks.length)) problems.push(`#${k}: blanks not at the end`);
      const shown = row.seq.map((v, i) => (row.blanks.includes(i) ? null : v));
      const cands = candidates(shown);
      if (!cands.every(c => row.blanks.every(i => c.seq[i] === row.seq[i]))) problems.push(`#${k}: ambiguous`);
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-numseq" aria-hidden="true"><defs><linearGradient id="cg-numseq" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#84fab0"/><stop offset="1" stop-color="#8fd3f4"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-numseq)"/><g stroke="#0f4c5c" stroke-width="3"><rect x="18" y="80" width="36" height="40" rx="7" fill="#EEF2FF"/><rect x="62" y="80" width="36" height="40" rx="7" fill="#EEF2FF"/><rect x="106" y="80" width="36" height="40" rx="7" fill="#EEF2FF"/><rect x="150" y="80" width="36" height="40" rx="7" fill="#fff"/></g><g font-family="Nunito, sans-serif" font-weight="900" font-size="22" text-anchor="middle" fill="#0f4c5c"><text x="36" y="108">2</text><text x="80" y="108">4</text><text x="124" y="108">8</text></g><text class="ns-q" x="168" y="108" font-family="Nunito, sans-serif" font-weight="900" font-size="22" text-anchor="middle" fill="#DC2626">16</text><g font-family="Nunito, sans-serif" font-weight="900" font-size="15" text-anchor="middle" fill="#0f4c5c" opacity=".75"><text x="58" y="66">×2</text><text x="102" y="66">×2</text><text class="ns-r" x="146" y="66" fill="#DC2626">×2</text></g><path d="M40 72 q18 -14 36 0 M84 72 q18 -14 36 0 M128 72 q18 -14 36 0" fill="none" stroke="#0f4c5c" stroke-width="2.5" opacity=".5"/></svg>`
};
