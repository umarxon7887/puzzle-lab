// symmetry.js — «Simmetrik chiz» (Дорисуй симметрично) generatori.
// Katakli qog'ozda rasmning chap yarmi bo'yalgan kataklar bilan berilgan, o'rtada simmetriya o'qi.
// Bola o'ng tomondagi kataklarni ko'zgudagidek qilib bo'yaydi — rasm to'liq chiqadi.
// Rasmlar simmetrik konturli rasmlardan katakli to'rga avtomatik o'tkaziladi (gridpics.js → pixelArt).
// Kafolat (check()): rasm o'qqa nisbatan aniq simmetrik, chap yarmida yetarli katak bor.

import { makeRng, pickOne } from '../core/rng.js';
import { pixelArt, countBits } from '../core/gridpics.js';
import { scaleOf, measureRule, drawRule, drawGrid } from '../core/parts.js';
import { picName } from '../core/pictures.js';

// N — rasmning uzun tomoni (katak); keys — shu o'lchamda ham tanib olinadigan rasmlar
const EASY = ['umbrella', 'mushroom', 'star', 'tshirt', 'dress', 'glasses', 'bottle', 'lamp', 'balloon', 'tree', 'ice_cream', 'fir_tree', 'bow_tie', 'hat', 'cupcake'];
const MID = [...EASY, 'owl', 'dragonfly', 'gift', 'guitar', 'bell', 'hot_air_balloon', 'trousers', 'starfish', 'lollipop'];
const HARD = [...MID, 'butterfly', 'scissors', 'octopus', 'crab', 'bear', 'rainbow', 'tulip', 'teddy_bear', 'robot', 'snowflake', 'spinning_top', 'ladder'];
const LEVELS = [
  { N: 10, keys: EASY },
  { N: 12, keys: MID },
  { N: 16, keys: HARD },
  { N: 20, keys: HARD }
];
const RULE = {
  uz: "O'qning o'ng tomonidagi kataklarni chap tomondagidek, ko'zgudagidek qilib bo'ya. Kataklarni o'qdan boshlab sana.",
  ru: 'Закрась клетки справа от оси так же, как слева, — зеркально. Считай клетки от оси.',
  en: 'Shade the squares on the right of the line to mirror the left side. Count the squares from the line.'
};

export default {
  id: 'symmetry',
  skills: ['spatial', 'motor'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Simmetrik chiz', ru: 'Дорисуй симметрично', en: 'Symmetry drawing' },
  desc: {
    uz: "Katakli qog'ozda rasmning ikkinchi yarmini ko'zgudagidek bo'yab, rasmni tugatish",
    ru: 'Закрасить по клеткам вторую половину рисунка зеркально',
    en: 'Shade the mirror half of a picture on squared paper'
  },
  fileBase: { uz: 'Simmetrik chiz', ru: 'Дорисуй симметрично', en: 'Symmetry drawing' },
  defaultTitle: { uz: 'Ikkinchi yarmini bo\'ya!', ru: 'Дорисуй вторую половину!', en: 'Finish the other half!' },
  options: [
    { key: 'level', type: 'level', default: 1 }
  ],
  levelHint: {
    uz: ["Kichik rasm: 10 katak", '12 katak', "16 katak, detallari ko'proq", "20 katak, detallari ko'p"],
    ru: ['Маленький рисунок: 10 клеток', '12 клеток', '16 клеток, больше деталей', '20 клеток, много деталей'],
    en: ['Small picture: 10 squares', '12 squares', '16 squares, more detail', '20 squares, lots of detail']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level];
    const N = opts.perPage === 4 ? Math.min(L.N, 14) : L.N;
    const rand = makeRng(seed);
    let key, pic;
    for (let t = 0; t < 30; t++) {
      key = pickOne(rand, L.keys);
      pic = pixelArt(key, N, { symmetric: true });
      if (pic.w >= 4 && countBits(pic.bits) >= 10) break;
    }
    return { level, seed, key, N, w: pic.w, h: pic.h, bits: pic.bits };
  },

  info(p, lang) {
    return { uz: `${picName(p.key, 'uz')}, ${p.w}×${p.h} katak`, ru: `${picName(p.key, 'ru')}, ${p.w}×${p.h} клеток`, en: `${picName(p.key, 'en')}, ${p.w}×${p.h} squares` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box);
    const rule = measureRule(ctx, RULE[lang] || RULE.uz, box.w, scale);
    const gap = 4 * scale;
    const cols = p.w + 2, rows = p.h + 2;
    const cs = Math.min(box.w / cols, (box.h - rule.h - gap) / rows, 12);
    const W = cs * cols, H = cs * rows;
    const top = box.y + Math.max(0, (box.h - H - gap - rule.h) * 0.4);
    const left = box.x + (box.w - W) / 2;
    const ox = left + cs, oy = top + cs;                     // rasmning (0,0) nuqtasi
    const half = p.w / 2;
    p.bits.forEach((row, r) => row.forEach((v, c) => {
      if (!v) return;
      if (c < half) { ctx.fillStyle = '#374151'; ctx.fillRect(ox + c * cs, oy + r * cs, cs, cs); }
      else if (showSolution) { ctx.fillStyle = '#F08A8A'; ctx.fillRect(ox + c * cs, oy + r * cs, cs, cs); }
    }));
    drawGrid(ctx, left, top, cols, rows, cs, scale);
    // Simmetriya o'qi
    ctx.save();
    ctx.strokeStyle = '#2563EB'; ctx.lineWidth = Math.max(0.5, 0.75 * scale); ctx.setLineDash([cs * 0.35, cs * 0.2]);
    ctx.beginPath(); ctx.moveTo(ox + half * cs, top); ctx.lineTo(ox + half * cs, top + H); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
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
    if (p.w % 2) problems.push('odd width');
    p.bits.forEach((row, r) => row.forEach((v, c) => { if (v !== row[p.w - 1 - c]) problems.push(`cell ${r},${c} not symmetric`); }));
    const leftCount = p.bits.reduce((s, row) => s + row.slice(0, p.w / 2).reduce((a, b) => a + b, 0), 0);
    if (leftCount < 5) problems.push('too few cells on the left');
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-symmetry" aria-hidden="true"><defs><linearGradient id="cg-symmetry" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a18cd1"/><stop offset="1" stop-color="#fbc2eb"/></linearGradient><pattern id="sym-grid" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0H0V16" fill="none" stroke="#c4b5fd" stroke-width="1"/></pattern></defs><rect width="200" height="200" rx="28" fill="url(#cg-symmetry)"/><rect x="28" y="28" width="144" height="144" rx="6" fill="#fff"/><rect x="28" y="28" width="144" height="144" fill="url(#sym-grid)"/><path d="M100 44 L68 92 L84 92 L60 132 L100 132" fill="none" stroke="#3b0764" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path class="sym-half" pathLength="100" d="M100 44 L132 92 L116 92 L140 132 L100 132" fill="none" stroke="#DC2626" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="M100 30 V170" stroke="#2563EB" stroke-width="3" stroke-dasharray="8 6"/><rect x="94" y="132" width="12" height="18" fill="#3b0764"/></svg>`
};
