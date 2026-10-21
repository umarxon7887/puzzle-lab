// oddone.js — "Ortiqchasini top" (Odd one out) generatori.
// Har qatorda K ta rasm yoki shakl; bittasi qolganlaridan farq qiladi.
//
// Ikki turdagi qator:
//   • rasmli (emoji): ko'pchilik bir toifadan (mevalar), bittasi boshqasidan (sabzavot);
//   • shaklli: bitta xususiyat bo'yicha farq — shakl, bo'yalishi, o'lchami, yo'nalishi,
//     nuqtalar soni, ichki shakl, ko'zgu aksi.
// Kafolat (check() tekshiradi): ortiqcha element FAQAT BITTA. Asosiy xususiyatdan boshqa
// xususiyatlar qatorda yo hammasida bir xil, yo hammasida har xil, yo har bir qiymat kamida
// ikki marta uchraydi — shunda ikkinchi "ortiqcha" paydo bo'lmaydi.

import { makeRng, shuffle, pickOne } from '../core/rng.js';
import { INK, MUTE, ANSWER, PT, EMOJI_FONT, font, wrapLines, roundRect } from '../core/draw.js';
import { TAU, POLYS, polyCells, drawFigure } from '../core/figures.js';

export { POLYS, polyCells };
import { GROUPS, CATS, ITEMS, PAIRS_MEDIUM, PAIRS_HARD, eligible, inCat, nearCat } from './oddone-items.js';

const LEVELS = [{ K: 4, N: 6 }, { K: 5, N: 7 }, { K: 5, N: 8 }, { K: 6, N: 8 }];   // K — qatordagi soni, N — qatorlar
const SMALL_ROWS = 4;                                  // varaqda 2 yoki 4 ta bo'lsa qatorlar soni (rasmlar kichrayib ketmasin)

// ---------- Rasmlar (emoji) ----------
const TAGS = new Map(ITEMS.map(([e, ...t]) => [e, t]));
const groupOf = cat => Object.keys(GROUPS).find(g => GROUPS[g].includes(cat));
const canPair = ([a, b], K) => eligible(a, b).length >= K - 1 && eligible(b, a).length >= 1;

// Har bir daraja uchun mumkin bo'lgan [ko'pchilik, ortiqcha] juftliklari
function pairsFor(level) {
  const K = LEVELS[level].K;
  if (level === 0) {
    const cats = Object.keys(CATS), out = [];
    for (const a of cats) for (const b of cats) if (groupOf(a) !== groupOf(b)) out.push([a, b]);
    return [out.filter(p => canPair(p, K))];
  }
  if (level === 1) return [PAIRS_MEDIUM.filter(p => canPair(p, K))];
  return [PAIRS_HARD.filter(p => canPair(p, K)), PAIRS_MEDIUM.filter(p => canPair(p, K))];   // avval qiyinlari
}
const PAIRS = [0, 1, 2, 3].map(pairsFor);

// Juftliklarni ko'rib chiqish tartibi (Qiyin darajada qiyin va o'rta juftliklar navbatma-navbat)
function pairOrder(level, rand) {
  const pools = PAIRS[level].map(list => shuffle(list.slice(), rand));
  if (level !== 2) return pools.flat();
  const [hard, mid] = pools, order = [];
  for (let i = 0; i < Math.max(hard.length, mid.length); i++) order.push(...(hard[i] ? [hard[i]] : []), ...(mid[i] ? [mid[i]] : []));
  return order;
}
const pairKey = ([a, b]) => [a, b].sort().join('|');

// Varaq uchun juftliklar: iloji boricha har bir toifa bir marta (bir necha urinishda), bo'lmasa —
// ko'pchilik toifasi va juftlik takrorlanmaydi, eng oxirida — zaxira.
function choosePairs(level, count, rand) {
  let best = [];
  for (let attempt = 0; attempt < 40 && best.length < count; attempt++) {
    const used = new Set(), picked = [];
    for (const p of pairOrder(level, rand)) {
      if (picked.length >= count) break;
      if (used.has(p[0]) || used.has(p[1])) continue;
      used.add(p[0]); used.add(p[1]); picked.push(p);
    }
    if (picked.length > best.length) best = picked;
  }
  const order = pairOrder(level, rand);
  for (const strict of [true, false]) {
    for (const p of order) {
      if (best.length >= count) break;
      if (strict && best.some(q => q[0] === p[0] || pairKey(q) === pairKey(p))) continue;
      best.push(p);
    }
  }
  return best;
}

function picRows(level, count, rand) {
  const { K } = LEVELS[level];
  const usedPics = new Set(), fresh = list => list.filter(e => !usedPics.has(e));
  return choosePairs(level, count, rand).map(([a, b]) => {
    let majors = fresh(eligible(a, b)), odds = fresh(eligible(b, a));   // bir varaqda bir xil rasm takrorlanmasin
    if (majors.length < K - 1) majors = eligible(a, b);
    if (!odds.length) odds = eligible(b, a);
    const items = shuffle(majors, rand).slice(0, K - 1);
    const at = Math.floor(rand() * K);
    items.splice(at, 0, pickOne(rand, odds));
    items.forEach(e => usedPics.add(e));
    return { t: 'pic', items, odd: at, a, b };
  });
}


const EASY_SHAPES = ['circle', 'square', 'triangle', 'star', 'heart'];
const SHAPES = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond', 'hexagon', 'pentagon', 'plus'];
const INNER_SHAPES = ['circle', 'square', 'triangle', 'diamond', 'hexagon', 'star', 'heart', 'pentagon'];
const DIR_SHAPES = ['arrow', 'pointer', 'moon', 'flag', 'halfcircle', 'halfsquare'];
const FILLS = ['empty', 'solid', 'stripes', 'dotted'];
const ROTS = [0, 90, 180, 270];

// Ikkinchi "ortiqcha" paydo bo'lmasligi uchun shovqin: har qiymat kamida 2 marta yoki hammasi har xil
function balanced(K, pool, rand, allowDistinct = true) {
  if (allowDistinct && pool.length >= K && rand() < 0.5) return shuffle(pool.slice(), rand).slice(0, K);
  const parts = { 4: [[2, 2]], 5: [[3, 2], [2, 3]], 6: [[2, 2, 2], [3, 3], [4, 2]] }[K] || [[K]];
  let split = pickOne(rand, parts);
  if (split.length > pool.length) split = [K];
  const vals = shuffle(pool.slice(), rand);
  const out = [];
  split.forEach((n, i) => { for (let j = 0; j < n; j++) out.push(vals[i]); });
  return shuffle(out, rand);
}
const two = (pool, rand) => { const s = shuffle(pool.slice(), rand); return [s[0], s[1]]; };
const DICE = {
  1: [[0, 0]], 2: [[-0.4, -0.4], [0.4, 0.4]], 3: [[-0.42, -0.42], [0, 0], [0.42, 0.42]],
  4: [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]], 5: [[-0.42, -0.42], [0.42, -0.42], [0, 0], [-0.42, 0.42], [0.42, 0.42]],
  6: [[-0.4, -0.46], [0.4, -0.46], [-0.4, 0], [0.4, 0], [-0.4, 0.46], [0.4, 0.46]]
};
function randomDots(n, shape, rand) {                  // ustma-ust tushmaydigan tasodifiy nuqtalar
  const g = [-0.51, -0.17, 0.17, 0.51];
  let slots = [];
  for (const y of g) for (const x of g) slots.push([x, y]);
  if (shape === 'circle') slots = slots.filter(([x, y]) => Math.hypot(x, y) < 0.62);
  return shuffle(slots, rand).slice(0, n).map(([x, y]) => [+(x + (rand() - 0.5) * 0.1).toFixed(3), +(y + (rand() - 0.5) * 0.1).toFixed(3)]);
}

// Har bir qoida: K ta element va ortiqchaning o'rni. lv — daraja (0–3)
const RULES = {
  shape(K, lv, rand) {
    const [a, b] = two(lv === 0 ? EASY_SHAPES : SHAPES, rand);
    const fills = lv <= 1 ? Array(K).fill(pickOne(rand, lv === 0 ? ['empty', 'solid'] : FILLS)) : balanced(K, FILLS, rand);
    const sizes = lv >= 2 ? balanced(K, [1, 0.72], rand, false) : Array(K).fill(1);
    return (odd) => fills.map((fill, i) => ({ shape: i === odd ? b : a, fill, size: sizes[i], rot: 0 }));
  },
  fill(K, lv, rand) {
    const [f, g] = two(lv === 0 ? ['empty', 'solid'] : FILLS, rand);
    const shapes = lv >= 2 ? shuffle(SHAPES.slice(), rand).slice(0, K) : Array(K).fill(pickOne(rand, lv === 0 ? EASY_SHAPES : SHAPES));
    return (odd) => shapes.map((shape, i) => ({ shape, fill: i === odd ? g : f, size: 1, rot: 0 }));
  },
  size(K, lv, rand) {
    const shape = pickOne(rand, lv === 0 ? EASY_SHAPES : SHAPES);
    const fills = lv <= 1 ? Array(K).fill(pickOne(rand, lv === 0 ? ['empty', 'solid'] : FILLS)) : balanced(K, FILLS, rand);
    const [big, small] = rand() < 0.5 ? [1, 0.6] : [0.62, 1];
    return (odd) => fills.map((fill, i) => ({ shape, fill, size: i === odd ? small : big, rot: 0 }));
  },
  rot(K, lv, rand) {
    const shape = pickOne(rand, DIR_SHAPES);
    const r = pickOne(rand, ROTS);
    const r2 = lv <= 1 ? (r + 180) % 360 : (r + pickOne(rand, [90, 180, 270])) % 360;
    const half = shape.startsWith('half');
    const fills = half ? Array(K).fill('empty') : (lv >= 3 ? balanced(K, ['empty', 'solid', 'stripes'], rand) : Array(K).fill(pickOne(rand, ['empty', 'solid'])));
    const sizes = lv >= 2 ? balanced(K, [1, 0.72], rand, false) : Array(K).fill(1);
    return (odd) => fills.map((fill, i) => ({ shape, fill, size: sizes[i], rot: i === odd ? r2 : r }));
  },
  dots(K, lv, rand) {
    const shapes = lv >= 3 ? balanced(K, ['circle', 'square'], rand, false) : Array(K).fill(pickOne(rand, ['circle', 'square']));
    const range = [[2, 5], [2, 5], [3, 6], [4, 7]][lv];
    const n = range[0] + Math.floor(rand() * (range[1] - range[0] + 1));
    const m = n + (rand() < 0.5 ? -1 : 1);
    const lay = (k, shape) => (lv <= 1 ? DICE[k].map(p => p.slice()) : randomDots(k, shape, rand));
    return (odd) => shapes.map((shape, i) => ({ shape, dots: lay(i === odd ? m : n, shape) }));
  },
  inner(K, lv, rand) {
    const outers = shuffle(INNER_SHAPES.slice(), rand).slice(0, K);
    return (odd) => outers.map((shape, i) => ({ shape, inner: i === odd ? pickOne(rand, INNER_SHAPES.filter(s => s !== shape)) : shape }));
  },
  mirror(K, lv, rand) {
    const poly = pickOne(rand, Object.keys(POLYS));
    const rots = balanced(K, ROTS, rand, false);
    return (odd) => rots.map((rot, i) => ({ poly, rot, mirror: i === odd }));
  }
};
const RULE_BAGS = [
  ['shape', 'fill', 'size'],
  ['shape', 'fill', 'size', 'rot', 'dots'],
  ['fill', 'rot', 'dots', 'inner', 'shape', 'size'],
  ['mirror', 'inner', 'dots', 'rot', 'mirror', 'fill', 'shape', 'size']
];

function figRows(level, count, rand) {
  const { K } = LEVELS[level];
  // Avval har xil qoidalar, keyin takrorlanadiganlari: qatorlar kam bo'lsa (aralash, yotiq joy) qoidalar takrorlanmaydi
  const all = RULE_BAGS[level], uniq = [...new Set(all)];
  const extra = all.slice();
  uniq.forEach(r => extra.splice(extra.indexOf(r), 1));
  let bag = [...shuffle(uniq, rand), ...shuffle(extra, rand)];
  while (bag.length < count) bag.push(...shuffle(all.slice(), rand));
  bag = shuffle(bag.slice(0, count), rand);
  return bag.map(rule => {
    const make = RULES[rule](K, level, rand);
    const odd = Math.floor(rand() * K);
    return { t: 'fig', rule, items: make(odd), odd };
  });
}

// ---------- Matnlar ----------
const RULE_TEXT = {
  uz: 'Har bir qatorda boshqalaridan farq qiladigan bittasini top va uni aylana bilan belgila.',
  ru: 'В каждом ряду найди одну картинку, которая отличается от остальных, и обведи её.',
  en: 'In each row, find the one that does not belong and circle it.'
};
const ruPlural = (n, one, few, many) => { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? one : (a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many); };
const WHY = {
  shape: { uz: 'boshqa shakl', ru: 'другая фигура', en: 'a different shape' },
  fill: { uz: "boshqacha bo'yalgan", ru: 'закрашена по-другому', en: 'a different fill' },
  size: { uz: "o'lchami boshqa", ru: 'другой размер', en: 'a different size' },
  rot: { uz: 'boshqa tomonga qaragan', ru: 'смотрит в другую сторону', en: 'points another way' },
  inner: { uz: 'ichidagi shakl tashqisiga mos emas', ru: 'внутренняя фигура не совпадает с внешней', en: "the inner shape doesn't match the outer one" },
  mirror: { uz: "ko'zgudagi aksi: burib ustiga tushirib bo'lmaydi", ru: 'зеркальное отражение: поворотом не совместить', en: 'a mirror image: no turn makes it match' }
};
function why(row, lang) {
  if (row.t === 'pic') {
    const one = (CATS[row.b][lang] || CATS[row.b].uz)[0], many = (CATS[row.a][lang] || CATS[row.a].uz)[1];
    return { uz: `${one}, qolganlari — ${many}`, ru: `${one}, остальные — ${many}`, en: `${one}; the others are ${many}` }[lang];
  }
  if (row.rule === 'dots') {
    const m = row.items[row.odd].dots.length, n = row.items[(row.odd + 1) % row.items.length].dots.length;
    return {
      uz: `${m} ta nuqta, qolganlarida ${n} tadan`,
      ru: `${m} ${ruPlural(m, 'точка', 'точки', 'точек')}, у остальных по ${n}`,
      en: `${m} dots; the others have ${n}`
    }[lang];
  }
  return (WHY[row.rule] || {})[lang] || '';
}
const MODES = {
  pictures: { big: '🍎', label: { uz: 'Rasmlar', ru: 'Картинки', en: 'Pictures' } },
  shapes: { big: '🔷', label: { uz: 'Shakllar', ru: 'Фигуры', en: 'Shapes' } },
  mixed: { big: '🔀', label: { uz: 'Aralash', ru: 'Смешанно', en: 'Mixed' } }
};

// ---------- Tekshiruv (testlar uchun) ----------
const PROPS = {
  shape: it => it.shape ?? it.poly,
  fill: it => it.fill ?? '-',
  size: it => it.size ?? 1,
  rot: it => it.rot ?? 0,
  dots: it => (it.dots ? it.dots.length : 0),
  inner: it => (it.inner === undefined ? '-' : it.inner === it.shape ? 'same' : 'diff'),
  mirror: it => !!it.mirror
};
function propOk(vals) {                                // hammasi bir xil / hammasi har xil / har qiymat ≥ 2 marta
  const cnt = new Map();
  vals.forEach(v => cnt.set(v, (cnt.get(v) || 0) + 1));
  return cnt.size === 1 || cnt.size === vals.length || [...cnt.values()].every(c => c >= 2);
}

export default {
  id: 'odd',
  skills: ['logic', 'visual'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Ortiqchasini top', ru: 'Найди лишнее', en: 'Odd one out' },
  desc: {
    uz: "Har qatorda bitta rasm yoki shakl boshqalaridan farq qiladi — uni toping",
    ru: 'В каждом ряду одна картинка не такая, как все — найдите её',
    en: "In every row one picture doesn't belong — find it"
  },
  fileBase: { uz: 'ortiqchasini top', ru: 'Найди лишнее', en: 'Odd one out' },
  defaultTitle: { uz: 'Ortiqchasini top!', ru: 'Найди лишнее!', en: 'Find the odd one out!' },
  options: [
    { key: 'level', type: 'level', default: 0 },
    {
      key: 'mode', type: 'choice', style: 'cards', pack: 'select', default: 'pictures',
      label: { uz: 'Turi', ru: 'Вид', en: 'Kind' },
      choices: Object.entries(MODES).map(([value, m]) => ({ value, big: m.big, label: m.label }))
    }
  ],
  levelHint: {
    uz: ['4 tadan, farqi yaqqol', "5 tadan: shakl, rang, o'lcham, yo'nalish", '5 tadan, farqi nozikroq', "6 tadan: ko'zgu aksi va murakkab qoidalar"],
    ru: ['по 4, отличие заметно сразу', 'по 5: форма, заливка, размер, направление', 'по 5, отличия тоньше', 'по 6: зеркальное отражение и сложные правила'],
    en: ['4 per row, an obvious difference', '5 per row: shape, fill, size, direction', '5 per row, subtler differences', '6 per row: mirror images and tricky rules']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const mode = opts.mode in MODES ? opts.mode : 'pictures';
    const { K } = LEVELS[level];
    const small = opts.aspect === 'landscape' || opts.perPage > 1;          // varaqda 2 yoki 4 ta — joy kichik
    const N = small ? SMALL_ROWS : LEVELS[level].N;
    const rand = makeRng(seed);
    let rows;
    if (mode === 'pictures') rows = picRows(level, N, rand);
    else if (mode === 'shapes') rows = figRows(level, N, rand);
    else {
      const nPic = Math.floor(N / 2);
      const pics = picRows(level, nPic, rand), figs = figRows(level, N - nPic, rand);
      rows = shuffle([...pics, ...figs], rand);
    }
    return { level, seed, mode, K, rows };
  },

  info(p, lang) {
    const n = p.rows.length, m = MODES[p.mode].label[lang] || MODES[p.mode].label.uz;
    return { uz: `${n} qator, ${m.toLowerCase()}`, ru: `${n} ${ruPlural(n, 'ряд', 'ряда', 'рядов')}, ${m.toLowerCase()}`, en: `${n} rows, ${m.toLowerCase()}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    const N = p.rows.length, K = p.K;
    ctx.save();
    const scale = Math.max(0.6, Math.min(1, box.w / 186));
    const ruleFs = 10.5 * PT * scale;
    font(ctx, ruleFs, 400);
    const ruleLines = wrapLines(ctx, RULE_TEXT[lang] || RULE_TEXT.uz, box.w);
    const ruleLH = ruleFs * 1.35, ruleH = ruleLines.length * ruleLH, ruleGap = 4 * scale;
    const numFs = 12 * PT * scale;
    font(ctx, numFs, 800);
    const numTW = ctx.measureText(`${N}.`).width, numW = numTW + 2.5 * scale;   // raqamlar ustuni
    const explFs = 8.5 * PT * scale, explH = explFs * 1.9;   // javobdagi izoh uchun qator (aylanalar orasida)
    // Katak ulushida: katakchalar oralig'i, javob aylanasining radiusi va katakdan chiqib turishi (chiziq qalinligi bilan)
    const GAP = 0.14, RING = 0.57, OVER = RING - 0.5 + 0.025;
    const cellW = (box.w - numW) / (K + GAP * (K - 1) + 2 * OVER);
    const cellH = (box.h - N * explH - ruleGap - ruleH) / (N * (1 + 2 * OVER));
    const cell = Math.max(3, Math.min(cellW, cellH, 34));
    const gap = cell * GAP, over = cell * OVER;
    const pitch = cell + 2 * over + explH;              // bir qator: aylana zaxirasi + katak + aylana zaxirasi + izoh
    const rowW = numW + 2 * over + K * cell + (K - 1) * gap;
    const blockH = N * pitch + ruleGap + ruleH;
    const x0 = box.x + (box.w - rowW) / 2, tx = x0 + numW + over;   // tx — birinchi katakning chap qirrasi
    let y = box.y + Math.max(0, (box.h - blockH) * 0.4) + over;      // y — qator kataklarining yuqori qirrasi

    p.rows.forEach((row, ri) => {
      font(ctx, numFs, 800);
      ctx.fillStyle = INK; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(`${ri + 1}.`, x0 + numTW, y + cell / 2);
      for (let j = 0; j < row.items.length; j++) {
        const cx = tx + j * (cell + gap) + cell / 2, cy = y + cell / 2;
        roundRect(ctx, cx - cell / 2, y, cell, cell, cell * 0.14);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.strokeStyle = '#D1D5DB'; ctx.lineWidth = Math.max(0.2, cell * 0.012); ctx.stroke();
        if (row.t === 'pic') {
          ctx.font = `${cell * 0.6}px ${EMOJI_FONT}`;
          ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(row.items[j], cx, cy + cell * 0.03);
        } else drawFigure(ctx, row.items[j], cx, cy, cell);
      }
      if (showSolution) {
        const cx = tx + row.odd * (cell + gap) + cell / 2;
        ctx.strokeStyle = ANSWER; ctx.lineWidth = Math.max(0.5, cell * 0.04);
        ctx.beginPath(); ctx.arc(cx, y + cell / 2, cell * RING, 0, TAU); ctx.stroke();
        let fs = explFs;
        font(ctx, fs, 700);
        const text = why(row, lang), maxW = K * cell + (K - 1) * gap;
        if (ctx.measureText(text).width > maxW) { fs *= maxW / ctx.measureText(text).width; font(ctx, fs, 700); }
        ctx.fillStyle = ANSWER; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(text, tx, y + cell + over + explH * 0.42);   // o'z qatoriga yaqinroq
      }
      y += pitch;
    });

    font(ctx, ruleFs, 400);
    ctx.fillStyle = MUTE; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const ruleY = y - over + ruleGap;                   // oxirgi qatorning izoh joyidan keyin
    ruleLines.forEach((ln, i) => ctx.fillText(ln, box.x + box.w / 2, ruleY + i * ruleLH));
    ctx.restore();
    return { cell };
  },

  hint(p, info, lang) {
    const n = p.rows.length;
    const T = { uz: `Qatorlar: ${n} · har birida ${p.K} tadan`, ru: `Рядов: ${n} · в каждом по ${p.K}`, en: `Rows: ${n} · ${p.K} in each` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    p.rows.forEach((row, ri) => {
      if (row.items.length !== p.K) problems.push(`row ${ri}: ${row.items.length} items`);
      if (!(row.odd >= 0 && row.odd < row.items.length)) problems.push(`row ${ri}: bad odd index`);
      if (row.t === 'pic') {
        if (new Set(row.items).size !== row.items.length) problems.push(`row ${ri}: repeated picture`);
        row.items.forEach((e, i) => {
          const t = TAGS.get(e) || [];
          const ok = i === row.odd ? inCat(t, row.b) && !nearCat(t, row.a) : inCat(t, row.a) && !nearCat(t, row.b);
          if (!ok) problems.push(`row ${ri}: ${e} does not fit ${row.a}/${row.b}`);
        });
        return;
      }
      for (const [prop, get] of Object.entries(PROPS)) {
        const vals = row.items.map(get);
        if (prop === row.rule) {
          const others = vals.filter((_, i) => i !== row.odd);
          if (new Set(others.map(String)).size !== 1 || String(vals[row.odd]) === String(others[0])) problems.push(`row ${ri}: key ${prop} not unique`);
        } else if (!propOk(vals.map(String))) problems.push(`row ${ri}: ${prop} creates another odd one (${vals.join(',')})`);
      }
      if (row.rule === 'mirror') {
        const base = row.items.find((_, i) => i !== row.odd);
        const rotations = ROTS.map(r => JSON.stringify(polyCells(base.poly, r, false)));
        const m = row.items[row.odd];
        if (rotations.includes(JSON.stringify(polyCells(m.poly, m.rot, true)))) problems.push(`row ${ri}: mirrored figure equals a rotation`);
      }
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-odd" aria-hidden="true"><defs><linearGradient id="cg-odd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6d365"/><stop offset="1" stop-color="#fda085"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-odd)"/><g fill="#fff"><rect x="30" y="30" width="64" height="64" rx="13"/><rect x="106" y="30" width="64" height="64" rx="13"/><rect x="30" y="106" width="64" height="64" rx="13"/><rect x="106" y="106" width="64" height="64" rx="13"/></g><g fill="#4F46E5"><circle cx="62" cy="62" r="19"/><circle cx="138" cy="62" r="19"/><circle cx="62" cy="138" r="19"/></g><path class="oo-odd" d="M138 117 L159 155 L117 155 Z" fill="#F97316" stroke="#C2410C" stroke-width="3" stroke-linejoin="round"/><circle class="oo-ring" cx="138" cy="138" r="40" fill="none" stroke="#DC2626" stroke-width="7" stroke-linecap="round"/></svg>`
};
