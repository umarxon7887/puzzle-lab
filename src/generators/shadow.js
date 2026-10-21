// shadow.js — «Soyasini top» (Найди тень) generatori.
// Turlari:
//   choose  — har qatorda rasm va bir nechta soya; rasmning soyasini topib, aylana bilan belgilash;
//   connect — chapda rasmlar, o'ngda soyalar (aralash): har bir rasmni o'z soyasi bilan tutashtirish.
// Soya — rasmning siluet ko'rinishi (pictures.js avtomatik yasaydi).
// Qiyin darajalarda "tuzoq" soyalar: shakli o'xshash boshqa rasmlar va rasmning ko'zgudagi aksi.
// Kafolat (check()): har qatorda rasmga mos soya aynan bitta (o'xshash guruhdagi rasmlar soya bo'lmaydi,
// ko'zgu aksi faqat aniq nosimmetrik rasmlar uchun).

import { makeRng, shuffle, pickOne } from '../core/rng.js';
import { INK, MUTE, PT, font } from '../core/draw.js';
import { SOLID } from '../core/figures.js';
import { PIC_KEYS, picGroup, drawPic, picMap, isAsymmetric, silhouetteDistance } from '../core/pictures.js';
import { scaleOf, measureRule, drawRule, cellBox, ring, line, dot, ruPlural, COLORS } from '../core/parts.js';

// rows — qatorlar (choose); opts — variantlar; near — tuzoqlar o'xshashligi (0 — har xil, 1 — eng o'xshashlari);
// mirror — ko'zgu aksi tuzoq sifatida; pairs — connect turidagi juftlar
const LEVELS = [
  { rows: 5, opts: 3, near: 0, mirror: false, pairs: 4 },
  { rows: 5, opts: 3, near: 0.5, mirror: false, pairs: 5 },
  { rows: 6, opts: 4, near: 1, mirror: true, pairs: 6 },
  { rows: 6, opts: 4, near: 1, mirror: true, pairs: 7 }
];
const SMALL = 4;

const okPair = (a, b) => a !== b && (!picGroup(a) || picGroup(a) !== picGroup(b)) && silhouetteDistance(a, b) >= 0.06;

function distractors(pic, count, near, rand, used) {
  const pool = PIC_KEYS.filter(k => okPair(pic, k) && !used.has(k));
  let list;
  if (near === 0) list = shuffle(pool.filter(k => silhouetteDistance(pic, k) > 0.35), rand);
  else if (near < 1) list = shuffle(pool.filter(k => silhouetteDistance(pic, k) > 0.12), rand);
  else list = pool.map(k => [k, silhouetteDistance(pic, k) + rand() * 0.08]).sort((a, b) => a[1] - b[1]).map(x => x[0]).slice(0, 12);
  const out = [];
  for (const k of (near === 1 ? shuffle(list, rand) : list)) {
    if (out.some(o => !okPair(o, k))) continue;
    out.push(k);
    if (out.length === count) break;
  }
  return out;
}

const RULES = {
  choose: { uz: "Har bir rasmning soyasini top va uni aylana bilan belgila.", ru: 'Найди тень каждой картинки и обведи её.', en: 'Find the shadow of each picture and circle it.' },
  connect: { uz: "Har bir rasmni o'z soyasi bilan chiziq orqali tutashtir.", ru: 'Соедини каждую картинку с её тенью.', en: 'Join each picture to its shadow.' }
};
const MODES = {
  choose: { big: '👆', label: { uz: 'Tanlash', ru: 'Выбрать', en: 'Choose' } },
  connect: { big: '〰️', label: { uz: 'Tutashtirish', ru: 'Соединить', en: 'Connect' } }
};

export default {
  id: 'shadow',
  skills: ['visual', 'spatial'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Soyasini top', ru: 'Найди тень', en: 'Find the shadow' },
  desc: {
    uz: "Rasmga aynan mos keladigan soyani toping",
    ru: 'Найдите тень, которая точно подходит к картинке',
    en: 'Find the shadow that matches the picture exactly'
  },
  fileBase: { uz: 'soyasini top', ru: 'Найди тень', en: 'Find the shadow' },
  defaultTitle: { uz: 'Soyasini top!', ru: 'Найди тень!', en: 'Find the shadow!' },
  options: [
    { key: 'level', type: 'level', default: 0 },
    {
      key: 'mode', type: 'choice', style: 'cards', pack: 'select', default: 'choose',
      label: { uz: 'Turi', ru: 'Вид', en: 'Kind' },
      choices: Object.entries(MODES).map(([value, m]) => ({ value, big: m.big, label: m.label }))
    }
  ],
  levelHint: {
    uz: ["3 ta soya, shakllari har xil", "3 ta soya, biroz o'xshash", "4 ta soya, o'xshash shakllar va ko'zgu aksi", "4 ta soya, eng o'xshash shakllar va ko'zgu aksi"],
    ru: ['3 тени, разной формы', '3 тени, немного похожи', '4 тени: похожие формы и зеркальное отражение', '4 тени: самые похожие формы и отражение'],
    en: ['3 shadows of different shapes', '3 shadows, a bit alike', '4 shadows: similar shapes and a mirror image', '4 shadows: very similar shapes and a mirror image']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const mode = opts.mode in MODES ? opts.mode : 'choose';
    const L = LEVELS[level];
    const small = opts.perPage > 1 || opts.aspect === 'landscape';
    const rand = makeRng(seed);
    const used = new Set();
    if (mode === 'connect') {
      const n = small ? Math.min(L.pairs, SMALL) : L.pairs;
      // Qiyinroq: bir-biriga o'xshash siluetli rasmlar to'plami
      const first = pickOne(rand, PIC_KEYS);
      const picks = [first];
      const cand = L.near === 0 ? shuffle(PIC_KEYS.slice(), rand) : PIC_KEYS.map(k => [k, silhouetteDistance(first, k) + rand() * 0.15]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
      for (const k of cand) {
        if (picks.length === n) break;
        if (picks.every(p => okPair(p, k))) picks.push(k);
      }
      const order = shuffle(picks.map((_, i) => i), rand);
      return { level, seed, mode, left: picks, right: order };
    }
    const N = small ? SMALL : L.rows;
    const rows = [];
    for (const pic of shuffle(PIC_KEYS.slice(), rand)) {
      if (rows.length === N) break;
      if (used.has(pic) || rows.some(r => !okPair(r.pic, pic))) continue;
      const wantMirror = L.mirror && isAsymmetric(pic);
      const ds = distractors(pic, L.opts - 1 - (wantMirror ? 1 : 0), L.near, rand, used);
      if (ds.length < L.opts - 1 - (wantMirror ? 1 : 0)) continue;
      used.add(pic);
      const options = [{ pic, flip: false }, ...ds.map(k => ({ pic: k, flip: false }))];
      if (wantMirror) options.push({ pic, flip: true });
      shuffle(options, rand);
      rows.push({ pic, options, ans: options.findIndex(o => o.pic === pic && !o.flip) });
    }
    return { level, seed, mode, rows };
  },

  info(p, lang) {
    const n = p.mode === 'connect' ? p.left.length : p.rows.length, m = MODES[p.mode].label[lang] || MODES[p.mode].label.uz;
    return { uz: `${n} ta rasm, ${m.toLowerCase()}`, ru: `${n} ${ruPlural(n, 'картинка', 'картинки', 'картинок')}, ${m.toLowerCase()}`, en: `${n} pictures, ${m.toLowerCase()}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box);
    const rule = measureRule(ctx, RULES[p.mode][lang] || RULES[p.mode].uz, box.w, scale);
    const gap = 4 * scale;
    const availH = box.h - rule.h - gap;
    if (p.mode === 'connect') {
      const n = p.left.length;
      const rowH = Math.min(availH / n, 44 * scale), cell = rowH * 0.82;
      const top = box.y + Math.max(0, (availH - n * rowH) * 0.35);
      const lx = box.x + box.w * 0.1, rx = box.x + box.w * 0.9 - cell, dotR = Math.max(0.8, 1.2 * scale);
      const ldx = lx + cell + dotR * 3, rdx = rx - dotR * 3;
      p.left.forEach((pic, i) => {
        const cy = top + (i + 0.5) * rowH;
        cellBox(ctx, lx, cy - cell / 2, cell, cell, scale);
        drawPic(ctx, pic, picMap(lx + cell / 2, cy, cell * 0.82), INK);
        dot(ctx, ldx, cy, dotR);
      });
      p.right.forEach((li, j) => {
        const cy = top + (j + 0.5) * rowH;
        cellBox(ctx, rx, cy - cell / 2, cell, cell, scale);
        drawPic(ctx, p.left[li], picMap(rx + cell / 2, cy, cell * 0.82), SOLID, true);
        dot(ctx, rdx, cy, dotR);
        if (showSolution) line(ctx, ldx, top + (li + 0.5) * rowH, rdx, cy, COLORS[li % COLORS.length], Math.max(0.5, 0.8 * scale));
      });
      drawRule(ctx, rule, box.x + box.w / 2, top + n * rowH + gap);
      ctx.restore();
      return {};
    }
    const N = p.rows.length, K = Math.max(...p.rows.map(r => r.options.length));
    const numFs = 12 * PT * scale;
    font(ctx, numFs, 800);
    const numW = ctx.measureText(`${N}.`).width + 2.5 * scale;
    const GAP = 0.18, ARROW = 0.8, RING = 0.6;
    const cellW = (box.w - numW) / (1 + ARROW + K + GAP * (K - 1) + (RING - 0.5));
    const cellH = availH / (N * (1 + 2 * (RING - 0.5)) + (N - 1) * 0.3);
    const cell = Math.min(cellW, cellH, 40 * scale), g = cell * GAP, pad = cell * (RING - 0.5) + 0.3;
    const rowH = cell + 2 * pad, rowGap = cell * 0.3;
    const blockH = N * rowH + (N - 1) * rowGap;
    let y = box.y + Math.max(0, (availH - blockH) * 0.35) + pad;
    const x0 = box.x + numW;
    p.rows.forEach((row, ri) => {
      font(ctx, numFs, 800);
      ctx.fillStyle = INK; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(`${ri + 1}.`, x0 - 2.5 * scale, y + cell / 2);
      cellBox(ctx, x0, y, cell, cell, scale, { stroke: INK });
      drawPic(ctx, row.pic, picMap(x0 + cell / 2, y + cell / 2, cell * 0.84), INK);
      // strelka
      const ax = x0 + cell + cell * 0.18, aw = cell * (ARROW - 0.36), ay = y + cell / 2;
      ctx.save(); ctx.strokeStyle = MUTE; ctx.lineWidth = Math.max(0.4, cell * 0.03); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + aw, ay); ctx.moveTo(ax + aw - cell * 0.1, ay - cell * 0.1); ctx.lineTo(ax + aw, ay); ctx.lineTo(ax + aw - cell * 0.1, ay + cell * 0.1); ctx.stroke(); ctx.restore();
      const ox = x0 + cell * (1 + ARROW);
      row.options.forEach((o, i) => {
        const x = ox + i * (cell + g);
        cellBox(ctx, x, y, cell, cell, scale);
        drawPic(ctx, o.pic, picMap(x + cell / 2, y + cell / 2, cell * 0.84, 0, o.flip), SOLID, true);
        if (showSolution && i === row.ans) ring(ctx, x + cell / 2, y + cell / 2, cell * RING, scale);
      });
      y += rowH + rowGap;
    });
    drawRule(ctx, rule, box.x + box.w / 2, y - pad - rowGap + gap);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const n = p.mode === 'connect' ? p.left.length : p.rows.length;
    const T = { uz: `Rasmlar: ${n}`, ru: `Картинок: ${n}`, en: `Pictures: ${n}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    if (p.mode === 'connect') {
      if ([...p.right].sort((a, b) => a - b).join() !== p.left.map((_, i) => i).join()) problems.push('right is not a permutation');
      for (let i = 0; i < p.left.length; i++) for (let j = i + 1; j < p.left.length; j++) if (!okPair(p.left[i], p.left[j])) problems.push(`pictures ${i},${j} too alike`);
      return problems;
    }
    p.rows.forEach((row, ri) => {
      const good = row.options.filter(o => o.pic === row.pic && !o.flip).length;
      if (good !== 1) problems.push(`row ${ri}: ${good} correct shadows`);
      const a = row.options[row.ans];
      if (!a || a.pic !== row.pic || a.flip) problems.push(`row ${ri}: wrong answer index`);
      row.options.forEach((o, i) => {
        if (o.pic === row.pic && o.flip && !isAsymmetric(o.pic)) problems.push(`row ${ri}: mirror of a symmetric picture`);
        if (o.pic !== row.pic && !okPair(o.pic, row.pic)) problems.push(`row ${ri}: option ${i} looks the same`);
      });
      const keys = row.options.map(o => o.pic + (o.flip ? '~' : ''));
      if (new Set(keys).size !== keys.length) problems.push(`row ${ri}: repeated option`);
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-shadow" aria-hidden="true"><defs><linearGradient id="cg-shadow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffecd2"/><stop offset="1" stop-color="#fcb69f"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-shadow)"/><g class="sh-pic"><path d="M58 52 C44 40 22 46 24 72 C26 96 44 112 58 104 C72 112 90 96 92 72 C94 46 72 40 58 52 Z" fill="#fff" stroke="#374151" stroke-width="5" stroke-linejoin="round"/><path d="M58 52 C58 42 62 34 70 30" fill="none" stroke="#374151" stroke-width="5" stroke-linecap="round"/></g><path class="sh-shadow" d="M142 92 C128 80 106 86 108 112 C110 136 128 152 142 144 C156 152 174 136 176 112 C178 86 156 80 142 92 Z M142 92 C142 82 146 74 154 70 L158 74 C150 78 147 84 147 92 Z" fill="#374151"/><path d="M98 70 Q118 62 128 78" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-dasharray="6 7"/></svg>`
};
