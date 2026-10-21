// diff.js — «Farqlarni top» (Найди отличия) generatori.
// Ikki rasm: ikkinchisida K ta farq bor. Rasm — maydonga sochilgan rasmlar (yoki shakllar).
// Farq turlari: yo'q bo'lgan, qo'shilgan, boshqasiga almashgan, kichraygan, ko'zgudagi aksi (yo'nalishi),
// burilgan; shakllarda — boshqa shakl, boshqacha bo'yalgan.
// Kafolat (check()): ikki rasm aynan K ta joyda farq qiladi, har bir farq ko'zga ko'rinadi
// (ko'zgu aksi faqat nosimmetrik rasmlarda, almashgan rasm boshqa siluetda), rasmlar bir-birini bosmaydi.

import { makeRng, shuffle, pickOne } from '../core/rng.js';
import { INK } from '../core/draw.js';
import { drawFigure } from '../core/figures.js';
import { PIC_KEYS, picGroup, drawPic, picMap, isAsymmetric, silhouetteDistance } from '../core/pictures.js';
import { scaleOf, measureRule, drawRule, cellBox, ring, scatter, ruPlural } from '../core/parts.js';

// n — rasmlar soni; k — farqlar; types — farq turlari
const LEVELS = [
  { n: 7, k: 3, types: ['remove', 'add', 'swap'] },
  { n: 9, k: 5, types: ['remove', 'add', 'swap', 'size'] },
  { n: 12, k: 7, types: ['remove', 'add', 'swap', 'size', 'flip', 'fill'] },
  { n: 14, k: 9, types: ['remove', 'add', 'swap', 'size', 'flip', 'fill', 'rotate'] }
];
const SMALL = { n: 7, k: 4 };
const SHAPES = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond', 'hexagon', 'plus'];
const FILLS = ['empty', 'solid', 'stripes', 'dotted'];

const sameItem = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function pickPics(n, rand) {
  const out = [], groups = new Set();
  for (const k of shuffle(PIC_KEYS.slice(), rand)) {
    const g = picGroup(k);
    if (g && groups.has(g)) continue;
    out.push(k); if (g) groups.add(g);
    if (out.length === n) break;
  }
  return out;
}

function drawItem(ctx, it, cx, cy, size) {
  if (it.pic) drawPic(ctx, it.pic, picMap(cx, cy, size, it.rot || 0, !!it.flip), INK);
  else drawFigure(ctx, { shape: it.shape, fill: it.fill, rot: it.rot || 0 }, cx, cy, size * 1.15);
}

const RULE = {
  uz: k => `Ikki rasm orasida ${k} ta farq bor. Ularni top va ikkinchi rasmda aylana bilan belgila.`,
  ru: k => `Между картинками ${k} ${ruPlural(k, 'отличие', 'отличия', 'отличий')}. Найди их и обведи на второй картинке.`,
  en: k => `There are ${k} differences between the pictures. Find them and circle them in the second picture.`
};
const MODES = {
  pictures: { big: '🖼️', label: { uz: 'Rasmlar', ru: 'Картинки', en: 'Pictures' } },
  shapes: { big: '🔷', label: { uz: 'Shakllar', ru: 'Фигуры', en: 'Shapes' } }
};

export default {
  id: 'diff',
  skills: ['attention', 'visual'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Farqlarni top', ru: 'Найди отличия', en: 'Spot the difference' },
  desc: {
    uz: "Ikki rasm orasidagi farqlarni toping — 3 tadan 9 tagacha",
    ru: 'Найдите отличия между двумя картинками — от 3 до 9',
    en: 'Find the differences between two pictures — from 3 to 9'
  },
  fileBase: { uz: 'farqlarni top', ru: 'Найди отличия', en: 'Spot the difference' },
  defaultTitle: { uz: 'Farqlarni top!', ru: 'Найди отличия!', en: 'Spot the difference!' },
  options: [
    { key: 'level', type: 'level', default: 0 },
    {
      key: 'mode', type: 'choice', style: 'cards', pack: 'select', default: 'pictures',
      label: { uz: 'Turi', ru: 'Вид', en: 'Kind' },
      choices: Object.entries(MODES).map(([value, m]) => ({ value, big: m.big, label: m.label }))
    }
  ],
  levelHint: {
    uz: ["3 ta farq: yo'q, qo'shilgan, almashgan", "5 ta farq, o'lchami ham o'zgaradi", "7 ta farq, yo'nalishi va bo'yalishi ham", "9 ta farq, burilganlari ham bor"],
    ru: ['3 отличия: нет, лишнее, заменено', '5 отличий, меняется и размер', '7 отличий, ещё направление и заливка', '9 отличий, есть и повороты'],
    en: ['3 differences: missing, extra, swapped', '5 differences, sizes change too', '7 differences, direction and fill too', '9 differences, including turns']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const mode = opts.mode in MODES ? opts.mode : 'pictures';
    const L = LEVELS[level];
    const small = opts.perPage > 1 || opts.aspect === 'landscape';
    const n = small ? Math.min(L.n, SMALL.n) : L.n, K = small ? Math.min(L.k, SMALL.k) : L.k;
    const side = opts.aspect === 'landscape';                 // yotiq joy: rasmlar yonma-yon
    const A = side ? 1.0 : 1.75;
    const rand = makeRng(seed);
    for (let attempt = 0; attempt < 50; attempt++) {
      // Farq turlari: har turdan kamida bittadan (iloji bo'lsa), qolgani tasodifiy
      const usable = L.types.filter(t => (mode === 'pictures' ? t !== 'fill' : t !== 'flip' && t !== 'rotate'));
      const types = shuffle(usable.slice(), rand).slice(0, K);
      while (types.length < K) types.push(pickOne(rand, usable.filter(t => t !== 'add' || types.filter(x => x === 'add').length < 2)));
      const adds = types.filter(t => t === 'add').length;
      let placed;
      try { placed = scatter(n + adds, A, rand, 0.5, 1.12); } catch { continue; }
      const { r, pts } = placed;
      const pics = mode === 'pictures' ? pickPics(n + adds + K, rand) : null;
      const base = (i, j) => ({
        ...(mode === 'pictures' ? { pic: pics[j] } : { shape: pickOne(rand, SHAPES), fill: pickOne(rand, FILLS) }),
        x: pts[i].x, y: pts[i].y, s: +(0.88 + rand() * 0.2).toFixed(3), rot: Math.round((rand() * 2 - 1) * 12)
      });
      const left = Array.from({ length: n }, (_, i) => base(i, i));
      const right = left.map(it => ({ ...it }));
      const diffs = [];
      const free = shuffle(left.map((_, i) => i), rand);
      let spare = n + adds, addAt = n, ok = true;
      for (const t of types) {
        if (t === 'add') {
          const it = base(addAt++, spare++); it.add = true;
          right.push(it); diffs.push({ t, x: it.x, y: it.y });
          continue;
        }
        // shu turga mos rasmni topish
        const idx = free.findIndex(i => {
          const it = left[i];
          if (t === 'flip') return it.pic && isAsymmetric(it.pic);
          if (t === 'rotate') return it.pic && isAsymmetric(it.pic);
          if (t === 'size') return it.s >= 0.9;
          return true;
        });
        if (idx < 0) { ok = false; break; }
        const i = free.splice(idx, 1)[0], it = right[i];
        if (t === 'remove') right[i] = null;
        else if (t === 'swap') {
          if (mode === 'pictures') {
            const cand = shuffle(PIC_KEYS.slice(), rand).find(k => !pics.includes(k) && (!picGroup(k) || picGroup(k) !== picGroup(it.pic)) && silhouetteDistance(k, it.pic) > 0.15 && !right.some(o => o && o.pic === k));
            if (!cand) { ok = false; break; }
            it.pic = cand;
          } else it.shape = pickOne(rand, SHAPES.filter(s => s !== it.shape));
        } else if (t === 'size') it.s = +(it.s * 0.58).toFixed(3);
        else if (t === 'flip') it.flip = true;
        else if (t === 'rotate') it.rot = it.rot + (rand() < 0.5 ? 90 : -90);
        else if (t === 'fill') it.fill = pickOne(rand, FILLS.filter(f => f !== it.fill));
        diffs.push({ t, i, x: left[i].x, y: left[i].y });
      }
      if (!ok) continue;
      return { level, seed, mode, A, r, side, left, right, diffs };
    }
    throw new Error('diff: could not build');
  },

  info(p, lang) {
    const k = p.diffs.length, m = MODES[p.mode].label[lang] || MODES[p.mode].label.uz;
    return { uz: `${k} ta farq, ${m.toLowerCase()}`, ru: `${k} ${ruPlural(k, 'отличие', 'отличия', 'отличий')}, ${m.toLowerCase()}`, en: `${k} differences, ${m.toLowerCase()}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box);
    const K = p.diffs.length;
    const rule = measureRule(ctx, (RULE[lang] || RULE.uz)(K), box.w, scale);
    const gap = 4 * scale, between = 5 * scale;
    const availH = box.h - rule.h - gap;
    let fw, fh;
    if (p.side) { fw = Math.min((box.w - between) / 2, availH * p.A); fh = fw / p.A; }
    else { fh = Math.min((availH - between) / 2, box.w / p.A); fw = fh * p.A; }
    const totalW = p.side ? 2 * fw + between : fw, totalH = p.side ? fh : 2 * fh + between;
    const x0 = box.x + (box.w - totalW) / 2, y0 = box.y + Math.max(0, (availH - totalH) * 0.4);
    const frames = p.side ? [[x0, y0], [x0 + fw + between, y0]] : [[x0, y0], [x0, y0 + fh + between]];
    [p.left, p.right].forEach((items, f) => {
      const [fx, fy] = frames[f];
      cellBox(ctx, fx, fy, fw, fh, scale, { stroke: '#9CA3AF', r: 3 * scale });
      for (const it of items) if (it) drawItem(ctx, it, fx + it.x * fh, fy + it.y * fh, 2 * p.r * fh * 0.86 * it.s);
      if (showSolution) for (const d of p.diffs) ring(ctx, fx + d.x * fh, fy + d.y * fh, p.r * fh * 1.08, scale);
    });
    drawRule(ctx, rule, box.x + box.w / 2, y0 + totalH + gap);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const T = { uz: `Farqlar: ${p.diffs.length}`, ru: `Отличий: ${p.diffs.length}`, en: `Differences: ${p.diffs.length}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    let count = 0;
    p.left.forEach((a, i) => {
      const b = p.right[i];
      if (!b) { count++; return; }
      if (!sameItem(a, b)) {
        count++;
        if (b.flip && !isAsymmetric(b.pic)) problems.push(`item ${i}: mirror of a symmetric picture`);
        if (a.pic && b.pic !== a.pic && (silhouetteDistance(a.pic, b.pic) <= 0.15 || (picGroup(a.pic) && picGroup(a.pic) === picGroup(b.pic)))) problems.push(`item ${i}: swapped picture looks alike`);
        if (b.s !== a.s && b.s > a.s * 0.7) problems.push(`item ${i}: size change too small`);
        if (b.x !== a.x || b.y !== a.y) problems.push(`item ${i}: moved`);
      }
    });
    count += p.right.length - p.left.length;
    if (count !== p.diffs.length) problems.push(`${count} real differences, ${p.diffs.length} listed`);
    const all = p.right.filter(Boolean).concat(p.left);
    const minD = 2 * p.r * 1.1 * 0.999;
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j];
      if (a === b || (a.x === b.x && a.y === b.y)) continue;
      if (Math.hypot(a.x - b.x, a.y - b.y) < minD) problems.push('two pictures overlap');
    }
    const keys = p.left.filter(it => it.pic).map(it => it.pic);
    if (new Set(keys).size !== keys.length) problems.push('repeated picture');
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-diff" aria-hidden="true"><defs><linearGradient id="cg-diff" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9a9e"/><stop offset="1" stop-color="#fecfef"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-diff)"/><g fill="#fff"><rect x="18" y="40" width="78" height="120" rx="12"/><rect x="104" y="40" width="78" height="120" rx="12"/></g><g fill="#F59E0B"><circle cx="40" cy="66" r="11"/><circle cx="126" cy="66" r="11"/></g><g fill="#10B981"><path d="M57 140 l14 -30 l14 30 Z"/><path d="M143 140 l14 -30 l14 30 Z"/></g><rect x="36" y="104" width="16" height="16" rx="3" fill="#6366F1"/><circle class="df-ring" cx="132" cy="112" r="17" fill="none" stroke="#DC2626" stroke-width="5" pathLength="100"/></svg>`
};
