// pattern.js — «Qonuniyatni davom ettir» (Продолжи закономерность) generatori.
// Har qatorda ketma-ketlik va bitta "?" katak; o'ngda javob variantlari — to'g'risini aylana bilan belgilash kerak.
//
// Qator turlari:
//   cycle  — takrorlanuvchi bo'lak (AB, AAB, ABC, AABB, ABCD …); "?" ga qadar bo'lak kamida 2 marta ko'rinadi;
//   rotate — shakl har qadamda bir xil burchakka buriladi (90° yoki 45°);
//   grow   — nuqtalar (yoki rasmlar) soni har qadamda bittaga ko'payadi;
//   flip   — rasm navbatma-navbat chapga va o'ngga qaraydi (rasmlar turida).
// Kafolat (check()): "?" o'rniga to'g'ri keladigan variant faqat bitta.

import { makeRng, shuffle, pickOne } from '../core/rng.js';
import { INK, MUTE, PT, font } from '../core/draw.js';
import { drawFigure } from '../core/figures.js';
import { PIC_KEYS, picGroup, drawPic, picMap, isAsymmetric, silhouetteDistance } from '../core/pictures.js';
import { scaleOf, measureRule, drawRule, ring, cellBox, questionCell, ruPlural } from '../core/parts.js';

const EASY_SHAPES = ['circle', 'square', 'triangle', 'star', 'heart'];
const SHAPES = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond', 'hexagon', 'pentagon', 'plus'];
const DIR_SHAPES = ['arrow', 'pointer', 'flag', 'moon', 'halfcircle'];
const FILLS = ['empty', 'solid', 'stripes', 'dotted'];
const DICE = {
  1: [[0, 0]], 2: [[-0.4, -0.4], [0.4, 0.4]], 3: [[-0.42, -0.42], [0, 0], [0.42, 0.42]],
  4: [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]], 5: [[-0.42, -0.42], [0.42, -0.42], [0, 0], [-0.42, 0.42], [0.42, 0.42]],
  6: [[-0.4, -0.46], [0.4, -0.46], [-0.4, 0], [0.4, 0], [-0.4, 0.46], [0.4, 0.46]],
  7: [[-0.42, -0.46], [0.42, -0.46], [-0.42, 0], [0, 0], [0.42, 0], [-0.42, 0.46], [0.42, 0.46]]
};

// rows — qatorlar soni; units — takrorlanuvchi bo'laklar; opts — variantlar soni; mid — "?" o'rtada bo'lishi mumkinmi;
// extra — qo'shimcha qator turlari (shakllar / rasmlar uchun)
const LEVELS = [
  { rows: 5, units: ['AB', 'AAB', 'ABB'], opts: 3, mid: false, extra: { shapes: [], pictures: [] } },
  { rows: 5, units: ['ABC', 'AABB', 'ABAC', 'AAB', 'ABB'], opts: 3, mid: false, extra: { shapes: ['grow'], pictures: ['flip'] } },
  { rows: 6, units: ['ABCD', 'AABC', 'ABCB', 'ABAC', 'ABC'], opts: 4, mid: true, extra: { shapes: ['rotate', 'grow'], pictures: ['flip', 'grow'] } },
  { rows: 6, units: ['ABCD', 'AABC', 'ABCB', 'AABB', 'ABBC'], opts: 4, mid: true, extra: { shapes: ['rotate', 'rotate45', 'grow'], pictures: ['flip', 'grow'] } }
];
const SMALL_ROWS = 4;

const key = el => JSON.stringify(el);
const same = (a, b) => key(a) === key(b);

// ---------- Belgilarni tanlash ----------
function shapeSymbols(m, level, rand) {
  const pool = shuffle((level === 0 ? EASY_SHAPES : SHAPES).slice(), rand);
  if (level === 0) { const fill = pickOne(rand, ['empty', 'solid']); return pool.slice(0, m).map(shape => ({ t: 'fig', shape, fill })); }
  if (level === 1) return pool.slice(0, m).map(shape => ({ t: 'fig', shape, fill: pickOne(rand, ['empty', 'solid', 'stripes']) }));
  // Qiyinroq: ba'zi belgilar bir xil shaklda, faqat bo'yalishi bilan farq qiladi
  const out = [], used = new Set();
  while (out.length < m) {
    const shape = out.length && rand() < 0.4 ? out[Math.floor(rand() * out.length)].shape : pool[out.length % pool.length];
    const fill = pickOne(rand, FILLS);
    const el = { t: 'fig', shape, fill };
    if (!used.has(key(el))) { used.add(key(el)); out.push(el); }
  }
  return out;
}
function picSymbols(m, rand, avoid) {
  const out = [], groups = new Set();
  for (const k of shuffle(PIC_KEYS.slice(), rand)) {
    const g = picGroup(k);
    if (avoid.has(k) || (g && groups.has(g))) continue;
    if (out.some(o => silhouetteDistance(o.pic, k) < 0.12)) continue;      // siluetlari juda o'xshash bo'lmasin
    out.push({ t: 'pic', pic: k, flip: false });
    if (g) groups.add(g);
    if (out.length === m) break;
  }
  return out;
}

// ---------- Qatorlar ----------
function cycleRow(L, level, mode, rand, usedPics) {
  const unit = pickOne(rand, L.units), p = unit.length;
  const letters = [...new Set(unit)];
  const syms = mode === 'pictures' ? picSymbols(letters.length, rand, usedPics) : shapeSymbols(letters.length, level, rand);
  if (mode === 'pictures') syms.forEach(s => usedPics.add(s.pic));
  const map = Object.fromEntries(letters.map((l, i) => [l, syms[i]]));
  const T = 2 * p + 1 + (p <= 2 ? 1 : 0);
  const seq = Array.from({ length: T }, (_, i) => map[unit[i % p]]);
  const q = L.mid ? p + Math.floor(rand() * (T - p)) : T - 1;
  return { kind: 'cycle', seq, q, alphabet: syms };
}
function rotateRow(step, rand) {
  const shape = pickOne(rand, DIR_SHAPES), fill = shape.startsWith('half') ? 'empty' : pickOne(rand, ['empty', 'solid']);
  const r0 = pickOne(rand, [0, 90, 180, 270]), dir = rand() < 0.5 ? 1 : -1;
  const T = step === 90 ? 6 : 7;
  const seq = Array.from({ length: T }, (_, i) => ({ t: 'fig', shape, fill, rot: ((r0 + dir * step * i) % 360 + 360) % 360 }));
  const q = 2 + Math.floor(rand() * (T - 2));
  return { kind: 'rotate', seq, q, step: dir * step };
}
function growRow(mode, rand, usedPics) {
  const a = mode === 'pictures' ? 1 : 1 + Math.floor(rand() * 2), T = mode === 'pictures' ? 4 : 5;
  let seq;
  if (mode === 'pictures') {
    const pic = picSymbols(1, rand, usedPics)[0].pic; usedPics.add(pic);
    seq = Array.from({ length: T }, (_, i) => ({ t: 'many', pic, n: a + i }));
  } else {
    const shape = pickOne(rand, ['circle', 'square']);
    seq = Array.from({ length: T }, (_, i) => ({ t: 'dots', shape, n: a + i }));
  }
  const q = 2 + Math.floor(rand() * (T - 2));
  return { kind: 'grow', seq, q };
}
function flipRow(L, rand, usedPics) {
  const asym = shuffle(PIC_KEYS.filter(k => isAsymmetric(k) && !usedPics.has(k)), rand);
  const unit = L.mid ? pickOne(rand, ['AaBb', 'Aa', 'AAa']) : pickOne(rand, ['Aa', 'AAa', 'Aaa']);
  const letters = [...new Set(unit.toUpperCase())];
  const pics = asym.slice(0, letters.length);
  pics.forEach(k => usedPics.add(k));
  const el = ch => ({ t: 'pic', pic: pics[letters.indexOf(ch.toUpperCase())], flip: ch !== ch.toUpperCase() });
  const p = unit.length, T = 2 * p + 1 + (p <= 2 ? 1 : 0);
  const seq = Array.from({ length: T }, (_, i) => el(unit[i % p]));
  const q = L.mid ? p + Math.floor(rand() * (T - p)) : T - 1;
  return { kind: 'cycle', seq, q, alphabet: [...new Map(seq.map(s => [key(s), s])).values()] };
}

// Variantlar: to'g'ri javob + qatordagi boshqa belgilar + juda o'xshash "tuzoqlar"
function addOptions(row, n, level, rand) {
  const ans = row.seq[row.q];
  const cands = [];
  if (row.kind === 'cycle') {
    cands.push(...row.alphabet);
    if (level >= 2) {
      if (ans.t === 'fig') FILLS.forEach(fill => cands.push({ ...ans, fill }));
      if (ans.t === 'pic' && isAsymmetric(ans.pic)) cands.push({ ...ans, flip: !ans.flip });
    }
  } else if (row.kind === 'rotate') {
    [0, 45, 90, 135, 180, 225, 270, 315].forEach(rot => cands.push({ ...ans, rot }));
  } else {
    [-2, -1, 1, 2].forEach(d => { if (ans.n + d >= 1 && ans.n + d <= 7) cands.push({ ...ans, n: ans.n + d }); });
  }
  const seen = new Set([key(ans)]), dist = [];
  for (const c of shuffle(cands, rand)) {
    if (seen.has(key(c))) continue;
    seen.add(key(c)); dist.push(c);
    if (dist.length === n - 1) break;
  }
  // Yetmasa — tasodifiy boshqa shakl yoki rasm (qatorda yo'q)
  for (let guard = 0; dist.length < n - 1 && guard < 200; guard++) {
    const c = ans.t === 'pic'
      ? { t: 'pic', pic: pickOne(rand, PIC_KEYS), flip: false }
      : { t: 'fig', shape: pickOne(rand, level === 0 ? EASY_SHAPES : SHAPES), fill: ans.fill || 'empty' };
    if (seen.has(key(c)) || (c.t === 'pic' && (picGroup(c.pic) && picGroup(c.pic) === picGroup(ans.pic)))) continue;
    seen.add(key(c)); dist.push(c);
  }
  const options = dist.slice();
  const at = Math.floor(rand() * (options.length + 1));
  options.splice(at, 0, ans);
  row.options = options; row.ans = at;
  delete row.alphabet;
  return row;
}

// ---------- Tekshiruv ----------
// cycle: "?" ni bilmagan holda mos keladigan barcha davrlar (≤ T/2) bir xil javobni bersin
function cyclePredictions(seq, q) {
  const T = seq.length, preds = new Set();
  for (let p = 1; p <= Math.floor(T / 2); p++) {
    let ok = true;
    for (let i = 0; i < T && ok; i++) for (let j = i + p; j < T; j += p) {
      if (i === q || j === q) continue;
      if (!same(seq[i], seq[j])) { ok = false; break; }
    }
    if (!ok) continue;
    for (let j = q % p; j < T; j += p) if (j !== q) { preds.add(key(seq[j])); break; }
  }
  return preds;
}
function predict(row) {
  const { seq, q } = row;
  if (row.kind === 'cycle') return cyclePredictions(seq, q);
  const known = seq.map((e, i) => (i === q ? null : e));
  const idx = known.map((e, i) => (e ? i : -1)).filter(i => i >= 0);
  if (row.kind === 'rotate') {
    const steps = new Set();
    for (let t = 1; t < idx.length; t++) if (idx[t] - idx[t - 1] === 1) steps.add((((known[idx[t]].rot - known[idx[t - 1]].rot) % 360) + 360) % 360);
    if (steps.size !== 1) return new Set();
    const st = [...steps][0], base = idx.find(i => i !== q);
    return new Set([key({ ...seq[base], rot: (((known[base].rot + st * (q - base)) % 360) + 360) % 360 })]);
  }
  const diffs = new Set();
  for (let t = 1; t < idx.length; t++) if (idx[t] - idx[t - 1] === 1) diffs.add(known[idx[t]].n - known[idx[t - 1]].n);
  if (diffs.size !== 1) return new Set();
  const d = [...diffs][0], base = idx[0];
  return new Set([key({ ...seq[base], n: known[base].n + d * (q - base) })]);
}

// ---------- Chizish ----------
function drawEl(ctx, el, cx, cy, s) {
  if (el.t === 'fig') { drawFigure(ctx, el, cx, cy, s); return; }
  if (el.t === 'dots') { drawFigure(ctx, { shape: el.shape, dots: DICE[el.n] }, cx, cy, s); return; }
  if (el.t === 'pic') { drawPic(ctx, el.pic, picMap(cx, cy, s * 0.8, 0, el.flip), INK); return; }
  // many: n ta kichik rasm
  const cols = el.n <= 2 ? el.n : el.n <= 4 ? 2 : 3, rowsN = Math.ceil(el.n / cols);
  const g = s * 0.84 / Math.max(cols, rowsN);
  for (let i = 0; i < el.n; i++) {
    const r = Math.floor(i / cols), c = i % cols, inRow = Math.min(cols, el.n - r * cols);
    const x = cx + (c - (inRow - 1) / 2) * g, y = cy + (r - (rowsN - 1) / 2) * g;
    drawPic(ctx, el.pic, picMap(x, y, g * 0.9), INK);
  }
}

const RULE = {
  uz: "Qonuniyatni top: «?» o'rniga qaysi rasm keladi? To'g'ri javobni aylana bilan belgila.",
  ru: 'Найди закономерность: что должно быть на месте «?»? Обведи правильный ответ.',
  en: 'Find the pattern: what goes in place of the “?”? Circle the right answer.'
};
const MODES = {
  shapes: { big: '🔷', label: { uz: 'Shakllar', ru: 'Фигуры', en: 'Shapes' } },
  pictures: { big: '🐟', label: { uz: 'Rasmlar', ru: 'Картинки', en: 'Pictures' } }
};

export default {
  id: 'pattern',
  name: { uz: 'Qonuniyatni davom ettir', ru: 'Продолжи закономерность', en: 'Continue the pattern' },
  desc: {
    uz: "Ketma-ketlikdagi qonuniyatni topib, «?» o'rniga keladigan rasmni tanlang",
    ru: 'Найдите закономерность и выберите, что стоит на месте «?»',
    en: 'Spot the pattern and choose what goes in place of the “?”'
  },
  fileBase: { uz: 'qonuniyat', ru: 'Закономерность', en: 'Pattern' },
  defaultTitle: { uz: 'Qonuniyatni davom ettir!', ru: 'Продолжи закономерность!', en: 'Continue the pattern!' },
  options: [
    { key: 'level', type: 'level', default: 0 },
    {
      key: 'mode', type: 'choice', style: 'cards', pack: 'select', default: 'shapes',
      label: { uz: 'Turi', ru: 'Вид', en: 'Kind' },
      choices: Object.entries(MODES).map(([value, m]) => ({ value, big: m.big, label: m.label }))
    }
  ],
  levelHint: {
    uz: ['AB, AAB: 3 ta variant', "ABC, AABB, nuqtalar ko'payadi", "4 ta variant, «?» o'rtada, burilish", "Murakkab bo'laklar, 45° burilish, o'xshash variantlar"],
    ru: ['AB, AAB: 3 варианта', 'ABC, AABB, точек становится больше', '4 варианта, «?» в середине, поворот', 'Сложные звенья, поворот на 45°, похожие варианты'],
    en: ['AB, AAB: 3 options', 'ABC, AABB, growing dots', '4 options, “?” in the middle, turning', 'Tricky units, 45° turns, look-alike options']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const mode = opts.mode in MODES ? opts.mode : 'shapes';
    const L = LEVELS[level];
    const small = opts.aspect === 'landscape' || opts.perPage > 1;
    const N = small ? SMALL_ROWS : L.rows;
    const rand = makeRng(seed);
    const extras = L.extra[mode];
    // Qo'shimcha turlar: har biri bittadan (qatorlar soni yetsa), qolgani — takrorlanuvchi bo'laklar
    const kinds = extras.slice(0, Math.max(0, N - 2));
    while (kinds.length < N) kinds.push('cycle');
    const rows = [], usedPics = new Set();
    for (const kind of shuffle(kinds, rand)) {
      let row;
      for (let attempt = 0; attempt < 30; attempt++) {
        row = kind === 'rotate' ? rotateRow(90, rand) : kind === 'rotate45' ? rotateRow(45, rand)
          : kind === 'grow' ? growRow(mode, rand, usedPics) : kind === 'flip' ? flipRow(L, rand, usedPics)
            : cycleRow(L, level, mode, rand, usedPics);
        const pr = predict(row);
        if (pr.size === 1 && pr.has(key(row.seq[row.q]))) break;
      }
      rows.push(addOptions(row, L.opts, level, rand));
    }
    return { level, seed, mode, rows };
  },

  info(p, lang) {
    const n = p.rows.length, m = MODES[p.mode].label[lang] || MODES[p.mode].label.uz;
    return { uz: `${n} qator, ${m.toLowerCase()}`, ru: `${n} ${ruPlural(n, 'ряд', 'ряда', 'рядов')}, ${m.toLowerCase()}`, en: `${n} rows, ${m.toLowerCase()}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box);
    const rule = measureRule(ctx, RULE[lang] || RULE.uz, box.w, scale);
    const gapRule = 4 * scale;
    const N = p.rows.length;
    const numFs = 12 * PT * scale;
    font(ctx, numFs, 800);
    const numW = ctx.measureText(`${N}.`).width + 2.5 * scale;
    const maxT = Math.max(...p.rows.map(r => r.seq.length)), maxO = Math.max(...p.rows.map(r => r.options.length));
    const GAP = 0.12, SEP = 0.9, RING = 0.62;
    // Bir qatorda (ketma-ketlik | variantlar) yoki ikki qatorda (variantlar pastda)
    const oneW = (box.w - numW) / (maxT + maxO + GAP * (maxT + maxO - 2) + SEP + (RING - 0.5));
    const availH = box.h - rule.h - gapRule;
    const oneH = availH / (N * (1 + 2 * (RING - 0.5)) + (N - 1) * 0.35);
    const one = Math.min(oneW, oneH, 24);
    const twoW = (box.w - numW) / (Math.max(maxT, maxO) + GAP * (Math.max(maxT, maxO) - 1) + (RING - 0.5));
    const twoH = availH / (N * (2 + 0.3 + 2 * (RING - 0.5)) + (N - 1) * 0.35);
    const two = Math.min(twoW, twoH, 24);
    const twoLines = two > one * 1.12;
    const cell = twoLines ? two : one, gap = cell * GAP, pad = cell * (RING - 0.5) + 0.3;
    const rowH = (twoLines ? cell * 2.3 : cell) + 2 * pad, rowGap = cell * 0.35;
    const blockH = N * rowH + (N - 1) * rowGap + gapRule + rule.h;
    let y = box.y + Math.max(0, (box.h - blockH) * 0.35) + pad;
    const x0 = box.x + numW;

    p.rows.forEach((row, ri) => {
      font(ctx, numFs, 800);
      ctx.fillStyle = INK; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(`${ri + 1}.`, x0 - 2.5 * scale, y + cell / 2);
      row.seq.forEach((el, i) => {
        const x = x0 + i * (cell + gap);
        if (i === row.q) {
          questionCell(ctx, x, y, cell, scale, showSolution ? '#DC2626' : MUTE);
          if (showSolution) { ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = '#fff'; ctx.fillRect(x + cell * 0.1, y + cell * 0.1, cell * 0.8, cell * 0.8); ctx.restore(); drawEl(ctx, el, x + cell / 2, y + cell / 2, cell); }
          return;
        }
        cellBox(ctx, x, y, cell, cell, scale);
        drawEl(ctx, el, x + cell / 2, y + cell / 2, cell);
      });
      // Variantlar: bir qatorda — o'ng tomonda (oralig'ida ajratuvchi chiziq), ikki qatorda — pastda o'ngda
      const oy = twoLines ? y + cell * 1.3 : y;
      const ow = row.options.length * cell + (row.options.length - 1) * gap;
      const ox = twoLines ? box.x + box.w - ow - cell * (RING - 0.5) : x0 + maxT * (cell + gap) - gap + cell * SEP;
      if (twoLines) {                                   // variantlar och kulrang fonda
        const bp = cell * 0.12;
        cellBox(ctx, ox - bp, oy - bp, ow + 2 * bp, cell + 2 * bp, scale, { fill: '#F3F4F6', stroke: '#E5E7EB', r: cell * 0.2 });
      } else {
        ctx.save(); ctx.strokeStyle = MUTE; ctx.lineWidth = Math.max(0.25, 0.35 * scale); ctx.setLineDash([cell * 0.06, cell * 0.06]);
        ctx.beginPath(); ctx.moveTo(ox - cell * SEP / 2, y - pad * 0.3); ctx.lineTo(ox - cell * SEP / 2, y + cell + pad * 0.3); ctx.stroke(); ctx.restore();
      }
      row.options.forEach((el, i) => {
        const x = ox + i * (cell + gap);
        cellBox(ctx, x, oy, cell, cell, scale, { fill: '#F9FAFB' });
        drawEl(ctx, el, x + cell / 2, oy + cell / 2, cell);
        if (showSolution && i === row.ans) ring(ctx, x + cell / 2, oy + cell / 2, cell * RING, scale);
      });
      y += rowH + rowGap;
    });
    drawRule(ctx, rule, box.x + box.w / 2, y - pad - rowGap + gapRule);
    ctx.restore();
    return { cell };
  },

  hint(p, info, lang) {
    const n = p.rows.length, o = p.rows[0].options.length;
    const T = { uz: `Qatorlar: ${n} · ${o} tadan variant`, ru: `Рядов: ${n} · по ${o} варианта`, en: `Rows: ${n} · ${o} options each` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    p.rows.forEach((row, ri) => {
      const ans = row.seq[row.q];
      if (!same(row.options[row.ans], ans)) problems.push(`row ${ri}: answer index points to a wrong option`);
      const keys = row.options.map(key);
      if (new Set(keys).size !== keys.length) problems.push(`row ${ri}: repeated option`);
      const pr = predict(row);
      if (pr.size !== 1 || !pr.has(key(ans))) problems.push(`row ${ri}: ${row.kind} answer is not unique (${pr.size})`);
      row.options.forEach((o, i) => { if (i !== row.ans && pr.has(key(o))) problems.push(`row ${ri}: option ${i} also fits`); });
      if (row.kind === 'cycle') {
        const known = row.seq.filter((_, i) => i !== row.q).map(key);
        if (new Set(known).size < 2) problems.push(`row ${ri}: trivial row`);
      }
      row.seq.concat(row.options).forEach(el => { if (el.t === 'pic' && el.flip && !isAsymmetric(el.pic)) problems.push(`row ${ri}: flipped symmetric picture ${el.pic}`); });
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-pattern" aria-hidden="true"><defs><linearGradient id="cg-pattern" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a18cd1"/><stop offset="1" stop-color="#fbc2eb"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-pattern)"/><g fill="#fff" stroke="none"><circle cx="38" cy="72" r="17"/><rect x="66" y="55" width="34" height="34" rx="6"/><circle cx="128" cy="72" r="17"/><rect x="146" y="55" width="34" height="34" rx="6" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="7 6"/></g><text x="163" y="82" text-anchor="middle" font-size="26" font-weight="900" fill="#fff" font-family="Nunito, sans-serif">?</text><g class="pt-opts"><circle cx="62" cy="146" r="15" fill="#fff" opacity=".85"/><rect x="88" y="131" width="30" height="30" rx="6" fill="#7C3AED"/><path d="M152 131 L168 161 L136 161 Z" fill="#fff" opacity=".85"/></g><circle class="pt-ring" cx="103" cy="146" r="25" fill="none" stroke="#DC2626" stroke-width="6" stroke-linecap="round" pathLength="100"/></svg>`
};
