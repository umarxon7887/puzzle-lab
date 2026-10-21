// count.js — «Ko'rib top va sana» (Найди и посчитай) generatori.
// Maydonda aralash rasmlar (yoki shakllar); pastdagi jadvalda so'ralgan har bir rasm uchun katakcha —
// bola nechta ekanini sanab yozadi. Ba'zi rasmlar so'ralmaydi (chalg'itish uchun).
// Kafolat (check()): so'ralgan rasmlar soni jadvaldagiga teng, sonlar har xil, rasmlar bir-birini bosmaydi.

import { makeRng, shuffle, pickOne } from '../core/rng.js';
import { INK, MUTE, LINE } from '../core/draw.js';
import { drawFigure } from '../core/figures.js';
import { PIC_KEYS, picGroup, drawPic, picMap, isAsymmetric, silhouetteDistance } from '../core/pictures.js';
import { scaleOf, measureRule, drawRule, cellBox, answerBox, scatter, ruPlural, COLORS } from '../core/parts.js';

// ask — so'raladigan turlar soni; extra — so'ralmaydigan turlar; min/max — har turdan nechta;
// rot — burilish (gradus); vary — o'lcham farqi; flip — ko'zgu aksi ham uchraydi
const LEVELS = [
  { ask: 2, extra: 0, min: 2, max: 5, rot: 0, vary: 0, flip: false },
  { ask: 3, extra: 1, min: 2, max: 7, rot: 15, vary: 0.1, flip: false },
  { ask: 4, extra: 1, min: 3, max: 9, rot: 40, vary: 0.2, flip: true },
  { ask: 4, extra: 2, min: 4, max: 11, rot: 180, vary: 0.3, flip: true }
];
const SMALL = { ask: 3, max: 6 };
const SHAPES = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond', 'hexagon', 'pentagon', 'plus'];

function kindsFor(mode, level, n, rand) {
  if (mode === 'shapes') {
    // Qiyin darajalarda bir xil shakl ikki xil bo'yalgan bo'lishi mumkin (doira va bo'yalgan doira)
    const out = [], seen = new Set();
    for (const shape of shuffle(SHAPES.slice(), rand)) {
      for (const fill of shuffle(['empty', 'solid', 'stripes'], rand)) {
        if (out.length === n) break;
        const k = shape + '|' + fill;
        if (seen.has(k)) continue;
        if (level < 2 && out.some(o => o.shape === shape)) continue;
        if (level >= 2 && out.filter(o => o.shape === shape).length >= (level === 3 ? 2 : 1)) continue;
        seen.add(k); out.push({ t: 'fig', shape, fill });
        if (level < 3) break;
      }
      if (out.length === n) break;
    }
    return out;
  }
  const out = [], groups = new Set();
  for (const k of shuffle(PIC_KEYS.slice(), rand)) {
    const g = picGroup(k);
    if (g && groups.has(g)) continue;
    if (out.some(o => silhouetteDistance(o.pic, k) < 0.1)) continue;
    out.push({ t: 'pic', pic: k }); if (g) groups.add(g);
    if (out.length === n) break;
  }
  return out;
}

const kindKey = k => (k.t === 'pic' ? k.pic : k.shape + '|' + k.fill);

function drawItem(ctx, kind, it, cx, cy, size, color) {
  if (kind.t === 'pic') { drawPic(ctx, kind.pic, picMap(cx, cy, size, it.rot || 0, !!it.flip), color); return; }
  if (color !== INK) {                                   // javobda shakl rangli chiziq bilan o'raladi
    ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  drawFigure(ctx, { shape: kind.shape, fill: kind.fill, rot: it.rot || 0 }, cx, cy, size * 1.15);
}

const RULE = {
  uz: "Rasmda har bir buyumdan nechta bor? Sanab, katakchaga yoz.",
  ru: 'Сколько каждого предмета на картинке? Посчитай и запиши в клетку.',
  en: 'How many of each object are in the picture? Count them and write the number in the box.'
};
const MODES = {
  pictures: { big: '🍎', label: { uz: 'Rasmlar', ru: 'Картинки', en: 'Pictures' } },
  shapes: { big: '🔺', label: { uz: 'Shakllar', ru: 'Фигуры', en: 'Shapes' } }
};

export default {
  id: 'count',
  name: { uz: "Ko'rib top va sana", ru: 'Найди и посчитай', en: 'Find and count' },
  desc: {
    uz: "Aralash rasmlar orasidan berilganlarini topib, nechta ekanini sanang",
    ru: 'Найдите среди картинок нужные и посчитайте, сколько их',
    en: 'Find the given objects among the others and count them'
  },
  fileBase: { uz: "ko'rib top va sana", ru: 'Найди и посчитай', en: 'Find and count' },
  defaultTitle: { uz: 'Sanab chiq!', ru: 'Посчитай!', en: 'Count them!' },
  options: [
    { key: 'level', type: 'level', default: 0 },
    {
      key: 'mode', type: 'choice', style: 'cards', pack: 'select', default: 'pictures',
      label: { uz: 'Turi', ru: 'Вид', en: 'Kind' },
      choices: Object.entries(MODES).map(([value, m]) => ({ value, big: m.big, label: m.label }))
    }
  ],
  levelHint: {
    uz: ['2 xil buyum, 5 tagacha', "3 xil buyum, 7 tagacha, bittasi so'ralmaydi", '4 xil, 9 tagacha, burilgan', "4 xil, 11 tagacha, har tomonga burilgan, o'xshashlari bor"],
    ru: ['2 вида, до 5', '3 вида, до 7, один не спрашивается', '4 вида, до 9, повёрнуты', '4 вида, до 11, повёрнуты как угодно, есть похожие'],
    en: ['2 kinds, up to 5', '3 kinds, up to 7, one is not asked', '4 kinds, up to 9, turned', '4 kinds, up to 11, any angle, look-alikes']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const mode = opts.mode in MODES ? opts.mode : 'pictures';
    const L = LEVELS[level];
    const small = opts.perPage > 1 || opts.aspect === 'landscape';
    const ask = small ? Math.min(L.ask, SMALL.ask) : L.ask;
    const max = small ? Math.min(L.max, SMALL.max) : L.max;
    const extra = small ? Math.min(L.extra, 1) : L.extra;
    const A = opts.aspect === 'landscape' ? 1.55 : opts.perPage > 1 ? 1.25 : 0.95;   // maydonning eni/bo'yi
    const rand = makeRng(seed);
    const kinds = kindsFor(mode, level, ask + extra, rand);
    // Har xil sonlar (so'ralganlar uchun), so'ralmaganlar — 2–4 tadan
    const pool = shuffle(Array.from({ length: max - L.min + 1 }, (_, i) => L.min + i), rand);
    const counts = kinds.map((_, i) => (i < ask ? pool[i] : 2 + Math.floor(rand() * 3)));
    const list = [];
    kinds.forEach((_, ki) => { for (let j = 0; j < counts[ki]; j++) list.push(ki); });
    shuffle(list, rand);
    const { r, pts } = scatter(list.length, A, rand, 0.5, 1.12);
    const items = list.map((ki, i) => {
      const it = { k: ki, x: pts[i].x, y: pts[i].y };
      if (L.rot) it.rot = Math.round((rand() * 2 - 1) * L.rot);
      if (L.vary) it.s = +(1 - L.vary + rand() * L.vary).toFixed(3);
      if (L.flip && kinds[ki].t === 'pic' && isAsymmetric(kinds[ki].pic) && rand() < 0.4) it.flip = true;
      return it;
    });
    return { level, seed, mode, A, r, ask, kinds, counts, items };
  },

  info(p, lang) {
    const n = p.items.length, m = MODES[p.mode].label[lang] || MODES[p.mode].label.uz;
    return { uz: `${n} ta rasm, ${m.toLowerCase()}`, ru: `${n} ${ruPlural(n, 'картинка', 'картинки', 'картинок')}, ${m.toLowerCase()}`, en: `${n} pictures, ${m.toLowerCase()}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box);
    const rule = measureRule(ctx, RULE[lang] || RULE.uz, box.w, scale);
    const gap = 4 * scale;
    const side = p.A > 1.4;                                 // yotiq joy: jadval o'ngda
    // Jadval: [rasm][katak] juftlari
    const cs = Math.min(18 * scale, side ? (box.h - rule.h - gap) / (p.ask * 1.25) : box.w / (p.ask * 2.8 - 0.5));
    const tableW = side ? cs * 2.3 : p.ask * cs * 2.3 + (p.ask - 1) * cs * 0.5, tableH = side ? p.ask * cs * 1.25 - cs * 0.25 : cs;
    let fw, fh;
    if (side) { fh = Math.min(box.h - rule.h - gap, (box.w - tableW - gap * 2) / p.A); fw = fh * p.A; }
    else { fw = Math.min(box.w, (box.h - rule.h - tableH - 2 * gap) * p.A); fh = fw / p.A; }
    const blockH = side ? fh + gap + rule.h : fh + gap + tableH + gap + rule.h;
    const top = box.y + Math.max(0, (box.h - blockH) * 0.35);
    const fx = side ? box.x + (box.w - fw - gap * 2 - tableW) / 2 : box.x + (box.w - fw) / 2;
    cellBox(ctx, fx, top, fw, fh, scale, { r: 4 * scale });
    const k = fh;                                            // 1 birlik = maydon bo'yi
    p.items.forEach(it => {
      const kind = p.kinds[it.k];
      const color = showSolution && it.k < p.ask ? COLORS[it.k] : (showSolution ? '#9CA3AF' : INK);
      drawItem(ctx, kind, it, fx + it.x * k, top + it.y * k, 2 * p.r * k * 0.86 * (it.s || 1), color);
    });
    // Jadval
    const tx = side ? fx + fw + gap * 2 : box.x + (box.w - tableW) / 2, ty = side ? top + (fh - tableH) / 2 : top + fh + gap;
    for (let i = 0; i < p.ask; i++) {
      const x = side ? tx : tx + i * cs * 2.8, y = side ? ty + i * cs * 1.25 : ty;
      cellBox(ctx, x, y, cs, cs, scale);
      drawItem(ctx, p.kinds[i], {}, x + cs / 2, y + cs / 2, cs * 0.78, showSolution ? COLORS[i] : INK);
      answerBox(ctx, x + cs * 1.2, y + cs * 0.1, cs * 1.1, cs * 0.8, scale, showSolution ? p.counts[i] : null);
    }
    drawRule(ctx, rule, box.x + box.w / 2, side ? top + fh + gap : ty + tableH + gap);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const T = { uz: `Sanaladigan: ${p.ask} xil · jami ${p.items.length} ta rasm`, ru: `Считать: ${p.ask} вида · всего ${p.items.length} картинок`, en: `Count: ${p.ask} kinds · ${p.items.length} pictures in all` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const real = p.kinds.map((_, i) => p.items.filter(it => it.k === i).length);
    real.forEach((c, i) => { if (c !== p.counts[i]) problems.push(`kind ${i}: ${c} drawn, ${p.counts[i]} expected`); if (c < 1) problems.push(`kind ${i} missing`); });
    const asked = p.counts.slice(0, p.ask);
    if (new Set(asked).size !== asked.length) problems.push('two asked kinds have the same count');
    const keys = p.kinds.map(kindKey);
    if (new Set(keys).size !== keys.length) problems.push('repeated kind');
    const groups = p.kinds.filter(k => k.t === 'pic').map(k => picGroup(k.pic)).filter(Boolean);
    if (new Set(groups).size !== groups.length) problems.push('two similar pictures');
    const minD = 2 * p.r * 1.1 * 0.999;
    p.items.forEach((a, i) => {
      if (a.x < p.r * 0.99 || a.x > p.A - p.r * 0.99 || a.y < p.r * 0.99 || a.y > 1 - p.r * 0.99) problems.push(`item ${i} outside`);
      for (let j = i + 1; j < p.items.length; j++) { const b = p.items[j]; if (Math.hypot(a.x - b.x, a.y - b.y) < minD) problems.push(`items ${i},${j} overlap`); }
      if (a.flip && p.kinds[a.k].t === 'pic' && !isAsymmetric(p.kinds[a.k].pic)) problems.push('flipped symmetric picture');
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-count" aria-hidden="true"><defs><linearGradient id="cg-count" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f093fb"/><stop offset="1" stop-color="#f5576c"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-count)"/><g fill="#fff"><circle class="ct-a" cx="50" cy="52" r="15"/><circle class="ct-b" cx="104" cy="40" r="15"/><circle class="ct-c" cx="78" cy="96" r="15"/><path d="M140 70 l13 24 h-26 Z"/><path d="M42 118 l13 24 h-26 Z"/><path d="M150 26 l13 24 h-26 Z"/></g><rect x="40" y="152" width="120" height="34" rx="10" fill="#fff" opacity=".95"/><circle cx="66" cy="169" r="10" fill="#f5576c"/><text class="ct-num" x="118" y="180" text-anchor="middle" font-size="30" font-weight="900" fill="#DC2626" font-family="Nunito, sans-serif">3</text></svg>`
};
