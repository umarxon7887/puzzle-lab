// overlap.js — «Ustma-ust rasmlar» (Наложенные картинки) generatori.
// Bir nechta buyumning faqat konturi bir-birining ustiga chiziladi; bola qaysi buyumlar borligini topadi.
//
// Topshiriq — oddiy ma'lumot: qaysi rasmlar, ularning o'rni (rasm o'lchami birligida), burchagi,
// kattaligi va ko'zgu aksi. Chizishda butun guruh berilgan joyga sig'diriladi.
// Kafolat (check() tekshiradi): rasmlar takrorlanmaydi, o'xshash siluetlar (group) bir varaqda bittadan,
// ikki rasm markazi bir-biriga juda yaqin emas (biri ikkinchisini "yutib" yubormaydi) va har bir rasm
// kamida bitta boshqasi bilan ustma-ust tushadi.

import { makeRng, shuffle } from '../core/rng.js';
import { INK, MUTE, LINE, PT, font, wrapLines, roundRect } from '../core/draw.js';
import { ICONS, PIC_KEYS, picPolys, drawPic } from '../core/pictures.js';

// n — rasmlar soni; minD/maxD — markazlar orasidagi eng kichik / qo'shni uchun eng katta masofa
// (rasm o'lchami ulushida); rot — eng katta burilish burchagi; flip — ko'zgu aksi ham bo'lishi mumkinmi
const LEVELS = [
  { n: 3, minD: 0.62, maxD: 0.86, rot: 0, flip: false },
  { n: 4, minD: 0.55, maxD: 0.8, rot: 12, flip: false },
  { n: 5, minD: 0.47, maxD: 0.74, rot: 22, flip: true },
  { n: 7, minD: 0.4, maxD: 0.68, rot: 35, flip: true }
];

// Javob varag'ida har bir rasm o'z rangida
const COLORS = ['#2563EB', '#DC2626', '#16A34A', '#9333EA', '#EA580C', '#0891B2', '#DB2777', '#65A30D'];

// Konturlar: [[x, y, x, y, ...], ...] (0–100)
export const ICON_KEYS = PIC_KEYS;

const MODES = {
  list: { big: '🖍️', label: { uz: "Ro'yxat bilan", ru: 'Со списком', en: 'With a list' } },
  name: { big: '🗣️', label: { uz: "Ro'yxatsiz", ru: 'Без списка', en: 'No list' } }
};
const RULE_TEXT = {
  list: {
    uz: "Pastdagi buyumlarni rasmdan top va har birini boshqa rangga bo'ya.",
    ru: 'Найди на картинке предметы, нарисованные внизу, и раскрась каждый своим цветом.',
    en: 'Find the objects shown below in the picture and colour each one a different colour.'
  },
  name: {
    uz: "Rasmdagi har bir buyumni top: chizig'ini barmog'ing bilan yurgizib chiq va nomini ayt.",
    ru: 'Найди каждый предмет: обведи его контур пальцем и назови.',
    en: 'Find each object: trace its outline with your finger and say its name.'
  }
};
const ruPlural = (n, one, few, many) => { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? one : (a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many); };

// Rasmlarni tanlash: o'xshash siluetlardan (group) bittadan
function pickIcons(n, rand) {
  const out = [], groups = new Set();
  for (const k of shuffle(ICON_KEYS.slice(), rand)) {
    const g = ICONS[k].group;
    if (g && groups.has(g)) continue;
    out.push(k);
    if (g) groups.add(g);
    if (out.length === n) break;
  }
  return out;
}

// Joylashtirish: har yangi rasm mavjud rasmlardan biriga yaqin (ustma-ust), lekin hammasidan minD dan uzoq
function place(n, L, rand) {
  for (let relax = 1; relax > 0.6; relax -= 0.05) {
    const minD = L.minD * relax, pts = [{ x: 0, y: 0 }];
    let ok = true;
    while (pts.length < n && ok) {
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length, cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      let best = null, bestScore = Infinity, found = 0;
      for (let t = 0; t < 400 && found < 24; t++) {
        const a = pts[Math.floor(rand() * pts.length)];
        const ang = rand() * Math.PI * 2, dist = minD + rand() * (L.maxD - minD);
        const x = a.x + Math.cos(ang) * dist, y = a.y + Math.sin(ang) * dist;
        if (pts.some(p => Math.hypot(p.x - x, p.y - y) < minD)) continue;
        found++;
        const score = Math.hypot(x - cx, y - cy) + rand() * 0.15;   // ixcham guruh, ozgina tasodif bilan
        if (score < bestScore) { bestScore = score; best = { x, y }; }
      }
      if (best) pts.push(best); else ok = false;
    }
    if (ok) return { pts, minD };
  }
  throw new Error('overlap: could not place pictures');
}

// Rasm nuqtasini (0–100) guruh koordinatasiga o'tkazish
function transformer(it) {
  const a = it.rot * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), f = it.flip ? -1 : 1;
  return (u, v) => {
    const x = (u - 50) / 100 * it.s * f, y = (v - 50) / 100 * it.s;
    return [it.x + x * c - y * s, it.y + x * s + y * c];
  };
}

const drawIcon = (ctx, key, map, color) => drawPic(ctx, key, map, color);

const nameOf = (k, lang) => ICONS[k][lang] || ICONS[k].uz;

export default {
  id: 'overlap',
  name: { uz: 'Ustma-ust rasmlar', ru: 'Наложенные картинки', en: 'Overlapping pictures' },
  desc: {
    uz: "Bir-birining ustiga chizilgan buyumlarni toping va nomini ayting",
    ru: 'Найдите предметы, нарисованные друг на друге, и назовите их',
    en: 'Find the objects drawn on top of each other and name them'
  },
  fileBase: { uz: 'ustma-ust rasmlar', ru: 'Наложенные картинки', en: 'Overlapping pictures' },
  defaultTitle: { uz: 'Rasmda nimalar yashiringan?', ru: 'Что спряталось на картинке?', en: 'What is hidden in the picture?' },
  options: [
    { key: 'level', type: 'level', default: 0 },
    {
      key: 'mode', type: 'choice', style: 'cards', pack: 'select', default: 'list',
      label: { uz: 'Turi', ru: 'Вид', en: 'Kind' },
      choices: Object.entries(MODES).map(([value, m]) => ({ value, big: m.big, label: m.label }))
    }
  ],
  levelHint: {
    uz: ['3 ta buyum, ozgina ustma-ust', '4 ta buyum', '5 ta buyum, zichroq va biroz burilgan', '7 ta buyum, zich va burilgan'],
    ru: ['3 предмета, немного накладываются', '4 предмета', '5 предметов, плотнее и чуть повёрнуты', '7 предметов, плотно и повёрнуты'],
    en: ['3 objects, slightly overlapping', '4 objects', '5 objects, denser and slightly turned', '7 objects, dense and turned']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const mode = opts.mode in MODES ? opts.mode : 'list';
    const L = LEVELS[level];
    const rand = makeRng(seed);
    const keys = pickIcons(L.n, rand);
    const { pts, minD } = place(L.n, L, rand);
    const items = keys.map((k, i) => ({
      k,
      x: +pts[i].x.toFixed(4), y: +pts[i].y.toFixed(4),
      rot: L.rot ? Math.round((rand() * 2 - 1) * L.rot) : 0,
      s: +(1 + (rand() - 0.5) * 0.16).toFixed(3),
      flip: L.flip && rand() < 0.3
    }));
    return { level, seed, mode, minD: +minD.toFixed(4), items };
  },

  info(p, lang) {
    const n = p.items.length, m = MODES[p.mode].label[lang] || MODES[p.mode].label.uz;
    return { uz: `${n} ta buyum, ${m.toLowerCase()}`, ru: `${n} ${ruPlural(n, 'предмет', 'предмета', 'предметов')}, ${m.toLowerCase()}`, en: `${n} objects, ${m.toLowerCase()}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    const n = p.items.length;
    ctx.save();
    const scale = Math.max(0.6, Math.min(1, box.w / 186));
    const gap = 4 * scale;

    // Pastdagi qoida matni
    const ruleFs = 10.5 * PT * scale, ruleLH = ruleFs * 1.35;
    font(ctx, ruleFs, 400);
    const ruleLines = wrapLines(ctx, (RULE_TEXT[p.mode] || RULE_TEXT.list)[lang] || RULE_TEXT.list.uz, box.w);
    const ruleH = ruleLines.length * ruleLH;

    // Ro'yxat (topshiriqda "ro'yxat bilan" turida, javobda doim)
    const showList = p.mode === 'list' || showSolution;
    const cellGap = 2.5 * scale;
    const cs = Math.min(22 * scale, (box.w - cellGap * (n - 1)) / n);
    const withNames = cs >= 13;
    const nameFs = Math.min(8.5 * PT * scale, cs * 0.17), nameLH = nameFs * 1.15;
    // Nomlar: sig'masa — ikki qatorga (so'zlar bo'yicha teng bo'lib), baribir sig'masa — shrift kichrayadi
    const nameW = cs + cellGap * 0.8;
    font(ctx, nameFs, 700);
    const labels = withNames && showList ? p.items.map(it => {
      const t = nameOf(it.k, lang), words = t.split(' ');
      let lines = [t];
      if (ctx.measureText(t).width > nameW && words.length > 1) {
        let best = null;
        for (let i = 1; i < words.length; i++) {
          const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
          const w = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
          if (!best || w < best.w) best = { w, lines: [a, b] };
        }
        lines = best.lines;
      }
      const w = Math.max(...lines.map(l => ctx.measureText(l).width));
      return { lines, fs: w > nameW ? nameFs * nameW / w : nameFs };
    }) : [];
    const nameRows = Math.max(1, ...labels.map(l => l.lines.length));
    const listH = showList ? cs + (withNames ? nameFs * 0.35 + nameRows * nameLH : 0) : 0;

    // Guruh chegaralari (rasm o'lchami birligida)
    const maps = p.items.map(transformer);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    p.items.forEach((it, i) => {
      for (const poly of picPolys(it.k).all) for (let j = 0; j < poly.length; j += 2) {
        const [u, v] = maps[i](poly[j], poly[j + 1]);
        if (u < x0) x0 = u; if (u > x1) x1 = u; if (v < y0) y0 = v; if (v > y1) y1 = v;
      }
    });
    const span = Math.max(x1 - x0, y1 - y0);

    // Rasm maydoni (kvadrat). Bitta rasm MAX_UNIT mm dan katta bo'lmaydi: chiziq qalinligi rasm
    // o'lchamining ~1.3% i, shuning uchun katta varaqda ham chiziq ~1 mm dan oshmaydi.
    const MAX_UNIT = 66, FILL = 0.88;
    const maxSide = Math.max(10, Math.min(box.w, box.h - ruleH - gap - (showList ? listH + gap : 0)));
    const k = Math.min(maxSide * FILL / span, MAX_UNIT);
    const side = Math.min(maxSide, span * k / FILL);
    const blockH = side + (showList ? gap + listH : 0) + gap + ruleH;
    let y = box.y + Math.max(0, (box.h - blockH) * 0.35);
    const fx = box.x + (box.w - side) / 2;
    roundRect(ctx, fx, y, side, side, side * 0.04);
    ctx.strokeStyle = LINE; ctx.lineWidth = Math.max(0.25, 0.35 * scale); ctx.stroke();

    const ox = fx + side / 2 - (x0 + x1) / 2 * k, oy = y + side / 2 - (y0 + y1) / 2 * k;
    p.items.forEach((it, i) => {
      const m = maps[i];
      drawIcon(ctx, it.k, (u, v) => { const [gx, gy] = m(u, v); return [ox + gx * k, oy + gy * k]; }, showSolution ? COLORS[i % COLORS.length] : INK);
    });
    y += side + gap;

    // Ro'yxat: har bir buyum alohida katakchada (javobda — o'z rangida)
    if (showList) {
      const rowW = n * cs + (n - 1) * cellGap;
      let lx = box.x + (box.w - rowW) / 2;
      p.items.forEach((it, i) => {
        roundRect(ctx, lx, y, cs, cs, cs * 0.16);
        ctx.strokeStyle = LINE; ctx.lineWidth = Math.max(0.2, 0.3 * scale); ctx.stroke();
        const pad = cs * 0.14, sz = cs - 2 * pad;
        drawIcon(ctx, it.k, (u, v) => [lx + pad + u / 100 * sz, y + pad + v / 100 * sz], showSolution ? COLORS[i % COLORS.length] : INK);
        if (withNames) {
          const { lines, fs } = labels[i];
          font(ctx, fs, 700);
          ctx.fillStyle = showSolution ? COLORS[i % COLORS.length] : MUTE; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          lines.forEach((ln, j) => ctx.fillText(ln, lx + cs / 2, y + cs + nameFs * 0.35 + j * nameLH));
        }
        lx += cs + cellGap;
      });
      y += listH + gap;
    }

    font(ctx, ruleFs, 400);
    ctx.fillStyle = MUTE; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ruleLines.forEach((ln, i) => ctx.fillText(ln, box.x + box.w / 2, y + i * ruleLH));
    ctx.restore();
    return { side };
  },

  hint(p, info, lang) {
    const n = p.items.length;
    const T = { uz: `Buyumlar soni: ${n}`, ru: `Предметов: ${n}`, en: `Objects: ${n}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [], L = LEVELS[p.level], it = p.items;
    if (it.length !== L.n) problems.push(`${it.length} pictures, expected ${L.n}`);
    const keys = it.map(x => x.k);
    if (new Set(keys).size !== keys.length) problems.push('repeated picture');
    keys.forEach(k => { if (!ICONS[k]) problems.push('unknown picture ' + k); });
    const groups = keys.map(k => ICONS[k] && ICONS[k].group).filter(Boolean);
    if (new Set(groups).size !== groups.length) problems.push('two similar silhouettes: ' + groups.join(','));
    for (let i = 0; i < it.length; i++) {
      let near = false;
      for (let j = 0; j < it.length; j++) {
        if (i === j) continue;
        const d = Math.hypot(it[i].x - it[j].x, it[i].y - it[j].y);
        if (d < p.minD * 0.999) problems.push(`pictures ${i} and ${j} too close (${d.toFixed(2)})`);
        if (d <= L.maxD * 1.001) near = true;
      }
      if (it.length > 1 && !near) problems.push(`picture ${i} overlaps nothing`);
    }
    if (p.minD < L.minD * 0.6) problems.push('placement relaxed too much');
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-ovl" aria-hidden="true"><defs><linearGradient id="cg-ovl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#43e97b"/><stop offset="1" stop-color="#38b2f8"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-ovl)"/><g fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"><path class="ovl-a" pathLength="100" d="M78 62 C62 48 34 56 36 86 C38 116 60 136 78 126 C96 136 118 116 120 86 C122 56 94 48 78 62 Z M78 62 C78 50 82 42 90 36"/><path class="ovl-b" pathLength="100" d="M70 112 C92 82 132 80 154 112 C132 144 92 142 70 112 Z M154 112 L176 92 L172 112 L176 132 Z"/><path class="ovl-c" pathLength="100" d="M118 40 a14 14 0 1 0 0.1 0 M118 68 L118 150 M118 128 L132 128 M118 142 L128 142"/></g></svg>`
};
