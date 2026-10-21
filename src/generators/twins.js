// twins.js — «Aynan bir xil ikkitasi» (Найди две одинаковые) generatori.
// Bir-biriga juda o'xshash kartochkalar orasidan aynan bir xil bo'lgan ikkitasini topish.
// Turlari:
//   shapes   — kartochkada 2×2 shakl (shakli va bo'yalishi);
//   pictures — kartochkada 3 ta rasm qatori (tartibi, rasmi yoki yo'nalishi farq qiladi).
// Kafolat (check()): aynan bir xil juftlik faqat bitta; qolgan kartochkalar hammasi bir-biridan farq qiladi.

import { makeRng, shuffle, pickOne } from '../core/rng.js';
import { INK } from '../core/draw.js';
import { drawFigure } from '../core/figures.js';
import { PIC_KEYS, picGroup, drawPic, picMap, isAsymmetric, silhouetteDistance } from '../core/pictures.js';
import { scaleOf, measureRule, drawRule, cellBox, ring, ringEllipse, ruPlural } from '../core/parts.js';

// cards — kartochkalar soni; cols — ustunlar (rasmlar turida — pcols); diff — boshqa kartochkalar
// juftlikdan nechta joyda farq qiladi [eng kam, eng ko'p]
const LEVELS = [
  { cards: 6, cols: 3, pcols: 2, diff: [2, 3] },
  { cards: 9, cols: 3, pcols: 3, diff: [1, 2] },
  { cards: 12, cols: 4, pcols: 3, diff: [1, 2] },
  { cards: 16, cols: 4, pcols: 3, diff: [1, 1], pdiff: [1, 2] }
];
const SMALL = { cards: 6, cols: 3, pcols: 2 };
const SHAPES = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond'];

const key = c => JSON.stringify(c);
const dist = (a, b) => a.reduce((s, v, i) => s + (key(v) === key(b[i]) ? 0 : 1), 0);

function shapeAlphabet(level, rand) {
  const shapes = shuffle(SHAPES.slice(), rand).slice(0, level === 0 ? 3 : 4);
  const fills = level === 0 ? ['solid', 'empty'] : ['solid', 'empty', ...(level === 3 ? ['stripes'] : [])];
  const out = [];
  for (const shape of shapes) for (const fill of fills) out.push({ shape, fill });
  return out;
}
function picAlphabet(level, rand) {
  const out = [], groups = new Set();
  for (const k of shuffle(PIC_KEYS.slice(), rand)) {
    const g = picGroup(k);
    if (g && groups.has(g)) continue;
    if (level >= 2 && !isAsymmetric(k)) continue;            // qiyinroq: yo'nalishi ham farq qilishi mumkin
    if (out.some(o => silhouetteDistance(o, k) < 0.12)) continue;
    out.push(k); if (g) groups.add(g);
    if (out.length === (level >= 2 ? 5 : 4)) break;
  }
  return out;
}

// Bitta joyni o'zgartirish
function mutate(card, mode, alpha, level, rand) {
  const c = card.map(v => ({ ...v }));
  const i = Math.floor(rand() * c.length);
  if (mode === 'shapes') {
    let v;
    do v = pickOne(rand, alpha); while (key(v) === key(c[i]));
    c[i] = v;
    return c;
  }
  const r = rand();
  if (level >= 2 && r < 0.35) { c[i].flip = !c[i].flip; return c; }   // yo'nalishi
  if (r < 0.65) {                                                     // ikki rasm o'rin almashadi
    const j = (i + 1 + Math.floor(rand() * (c.length - 1))) % c.length;
    if (key(c[i]) !== key(c[j])) { const t = c[i]; c[i] = c[j]; c[j] = t; return c; }
  }
  const used = new Set(c.map(x => x.pic));
  const free = alpha.filter(k => !used.has(k));
  c[i] = { pic: pickOne(rand, free.length ? free : alpha), flip: false };
  return c;
}

const RULE = {
  uz: "Kartochkalar orasidan aynan bir xil ikkitasini top va ularni aylana bilan belgila.",
  ru: 'Найди среди карточек две совершенно одинаковые и обведи их.',
  en: 'Find the two cards that are exactly the same and circle them.'
};
const MODES = {
  shapes: { big: '🔶', label: { uz: 'Shakllar', ru: 'Фигуры', en: 'Shapes' } },
  pictures: { big: '🐤', label: { uz: 'Rasmlar', ru: 'Картинки', en: 'Pictures' } }
};

export default {
  id: 'twins',
  skills: ['attention', 'visual'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Aynan bir xil ikkitasi', ru: 'Найди две одинаковые', en: 'Find the twins' },
  desc: {
    uz: "Bir-biriga o'xshash kartochkalar orasidan aynan bir xil ikkitasini toping",
    ru: 'Найдите среди похожих карточек две совершенно одинаковые',
    en: 'Among look-alike cards, find the two that are exactly the same'
  },
  fileBase: { uz: 'aynan bir xil ikkitasi', ru: 'Две одинаковые', en: 'Find the twins' },
  defaultTitle: { uz: 'Aynan bir xil ikkitasini top!', ru: 'Найди две одинаковые!', en: 'Find the twins!' },
  options: [
    { key: 'level', type: 'level', default: 0 },
    {
      key: 'mode', type: 'choice', style: 'cards', pack: 'select', default: 'shapes',
      label: { uz: 'Turi', ru: 'Вид', en: 'Kind' },
      choices: Object.entries(MODES).map(([value, m]) => ({ value, big: m.big, label: m.label }))
    }
  ],
  levelHint: {
    uz: ["6 ta kartochka, farqi 2–3 joyda", "9 ta, farqi 1–2 joyda", "12 ta, rasmlarning yo'nalishi ham farq qiladi", "16 ta, har biri faqat bitta joyda farq qiladi"],
    ru: ['6 карточек, отличия в 2–3 местах', '9 карточек, отличия в 1–2 местах', '12 карточек, отличается и направление', '16 карточек, каждая отличается лишь в одном месте'],
    en: ['6 cards, 2–3 differences each', '9 cards, 1–2 differences', '12 cards, direction can differ too', '16 cards, each differs in just one spot']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const mode = opts.mode in MODES ? opts.mode : 'shapes';
    const L = LEVELS[level];
    const small = opts.perPage > 1 || opts.aspect === 'landscape';
    const nCards = small ? Math.min(L.cards, SMALL.cards) : L.cards;
    const rand = makeRng(seed);
    const alpha = mode === 'shapes' ? shapeAlphabet(level, rand) : picAlphabet(level, rand);
    const base = mode === 'shapes'
      ? Array.from({ length: 4 }, () => pickOne(rand, alpha))
      : shuffle(alpha.slice(), rand).slice(0, 3).map(pic => ({ pic, flip: level >= 2 && rand() < 0.3 }));
    const cards = [base, base.map(v => ({ ...v }))];
    const D = mode === 'pictures' && L.pdiff ? L.pdiff : L.diff;
    for (let guard = 0; cards.length < nCards && guard < 5000; guard++) {
      const d = D[0] + Math.floor(rand() * (D[1] - D[0] + 1));
      let c = base;
      for (let t = 0; t < d; t++) c = mutate(c, mode, alpha, level, rand);
      const dd = dist(c, base);
      if (dd < D[0] || dd > D[1] + 1) continue;
      if (cards.some(o => dist(o, c) === 0)) continue;
      cards.push(c);
    }
    const order = shuffle(cards.map((_, i) => i), rand);
    const shuffled = order.map(i => cards[i]);
    const twins = [order.indexOf(0), order.indexOf(1)].sort((a, b) => a - b);
    return { level, seed, mode, need: nCards, cols: small ? (mode === 'shapes' ? SMALL.cols : SMALL.pcols) : (mode === 'shapes' ? L.cols : L.pcols), cards: shuffled, twins };
  },

  info(p, lang) {
    const n = p.cards.length, m = MODES[p.mode].label[lang] || MODES[p.mode].label.uz;
    return { uz: `${n} ta kartochka, ${m.toLowerCase()}`, ru: `${n} ${ruPlural(n, 'карточка', 'карточки', 'карточек')}, ${m.toLowerCase()}`, en: `${n} cards, ${m.toLowerCase()}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box);
    const rule = measureRule(ctx, RULE[lang] || RULE.uz, box.w, scale);
    const gap = 4 * scale;
    const availH = box.h - rule.h - gap;
    const asp = p.mode === 'shapes' ? 1 : 3.1;                  // kartochka eni / bo'yi
    const G = 0.22, RING = 0.62;
    // Ustunlar soni — kartochkalar eng katta chiqadigani (kartochka bo'yi h: eni = h*asp; oraliq = h*G)
    const sizeFor = c => {
      const r = Math.ceil(p.cards.length / c);
      return Math.min(box.w / (c * asp + (c - 1) * G + 0.3), availH / (r + (r - 1) * G + 0.3), 44 * scale);
    };
    let cols = p.cols;
    for (let c = 1; c <= 6; c++) if (sizeFor(c) > sizeFor(cols) * 1.04) cols = c;
    const rows = Math.ceil(p.cards.length / cols);
    const h = sizeFor(cols), w = h * asp, g = h * G;
    const gridW = cols * w + (cols - 1) * g, gridH = rows * h + (rows - 1) * g;
    const x0 = box.x + (box.w - gridW) / 2, y0 = box.y + Math.max(h * 0.15, (availH - gridH) * 0.4);
    p.cards.forEach((card, i) => {
      const x = x0 + (i % cols) * (w + g), y = y0 + Math.floor(i / cols) * (h + g);
      cellBox(ctx, x, y, w, h, scale, { stroke: '#9CA3AF', r: h * 0.12 });
      if (p.mode === 'shapes') {
        card.forEach((v, j) => drawFigure(ctx, v, x + w * (0.27 + 0.46 * (j % 2)), y + h * (0.27 + 0.46 * Math.floor(j / 2)), h * 0.46));
      } else {
        card.forEach((v, j) => drawPic(ctx, v.pic, picMap(x + w * (j + 0.5) / 3, y + h / 2, h * 0.78, 0, v.flip), INK));
      }
      if (showSolution && p.twins.includes(i)) {
        if (p.mode === 'shapes') ring(ctx, x + w / 2, y + h / 2, h * RING * 1.02, scale);
        else ringEllipse(ctx, x + w / 2, y + h / 2, w * 0.555, h * 0.66, scale);
      }
    });
    drawRule(ctx, rule, box.x + box.w / 2, y0 + gridH + Math.max(gap, h * 0.22));
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const T = { uz: `Kartochkalar: ${p.cards.length}`, ru: `Карточек: ${p.cards.length}`, en: `Cards: ${p.cards.length}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    let pairs = 0;
    for (let i = 0; i < p.cards.length; i++) for (let j = i + 1; j < p.cards.length; j++) {
      if (dist(p.cards[i], p.cards[j]) === 0) {
        pairs++;
        if (!(p.twins[0] === i && p.twins[1] === j)) problems.push(`cards ${i},${j} identical but not marked`);
      }
    }
    if (pairs !== 1) problems.push(`${pairs} identical pairs`);
    if (p.cards.length !== p.need) problems.push(`${p.cards.length} cards, expected ${p.need}`);
    p.cards.forEach((c, i) => {
      if (p.mode === 'pictures') {
        if (new Set(c.map(v => v.pic)).size !== c.length) problems.push(`card ${i}: repeated picture`);
        c.forEach(v => { if (v.flip && !isAsymmetric(v.pic)) problems.push(`card ${i}: flipped symmetric picture`); });
      }
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-twins" aria-hidden="true"><defs><linearGradient id="cg-twins" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fddb92"/><stop offset="1" stop-color="#d1fdff"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-twins)"/><g fill="#fff" stroke="#94a3b8" stroke-width="3"><rect x="22" y="30" width="70" height="62" rx="10"/><rect x="108" y="30" width="70" height="62" rx="10"/><rect x="22" y="108" width="70" height="62" rx="10"/><rect x="108" y="108" width="70" height="62" rx="10"/></g><g fill="#F59E0B"><circle cx="44" cy="61" r="11"/><path d="M70 50 l11 20 h-22 Z"/><circle cx="130" cy="61" r="11"/><path d="M156 50 l11 20 h-22 Z" fill="#0EA5E9"/><circle cx="44" cy="139" r="11" fill="#0EA5E9"/><path d="M70 128 l11 20 h-22 Z"/><circle cx="130" cy="139" r="11"/><path d="M156 128 l11 20 h-22 Z"/></g><g fill="none" stroke="#DC2626" stroke-width="6"><ellipse class="tw-r1" cx="57" cy="61" rx="46" ry="40" pathLength="100"/><ellipse class="tw-r2" cx="143" cy="139" rx="46" ry="40" pathLength="100"/></g></svg>`
};
