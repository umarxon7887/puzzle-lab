// cubes.js — «Kubiklarni sana» (Посчитай кубики) generatori.
// Izometrik ko'rinishdagi kubiklar uyumi; har bir rasmdagi kubiklar sonini topish kerak.
//
// Uyum — "balandliklar xaritasi": w × d katak, har birida h ta kubik ustma-ust.
// Oson va O'rta: hamma kubiklar ko'rinadi (rasm piksellari bo'yicha tekshiriladi).
// Qiyin va Juda qiyin: orqa ustunlar balandroq yoki teng (har bir ustunning tepasi ko'rinadi);
// pastdagi kubiklar ko'rinmasligi mumkin — "kubik havoda turmaydi" qoidasi bilan sanaladi.

import { makeRng, shuffle } from '../core/rng.js';
import { INK, PT, font } from '../core/draw.js';
import { scaleOf, measureRule, drawRule, answerBox, ruPlural } from '../core/parts.js';

const C30 = Math.cos(Math.PI / 6), S30 = 0.5;
// figs — varaqdagi rasmlar; w, d — o'lcham oralig'i; h — eng baland ustun; mono — orqasi baland (yashirin kubiklar mumkin)
const LEVELS = [
  { figs: 6, w: [3, 4], d: [1, 1], h: 2, mono: false, zero: false },
  { figs: 6, w: [2, 3], d: [2, 2], h: 2, mono: false, zero: false },
  { figs: 6, w: [2, 3], d: [2, 3], h: 3, mono: true, zero: false },
  { figs: 4, w: [3, 4], d: [3, 3], h: 4, mono: true, zero: true }
];

// Proyeksiya: (x, y, z) → ekran (birlik kub qirrasi = 1)
const P = (x, y, z) => [(x - y) * C30, (x + y) * S30 - z];
function cubeFaces(i, j, k) {
  return {
    top: [P(i, j, k + 1), P(i + 1, j, k + 1), P(i + 1, j + 1, k + 1), P(i, j + 1, k + 1)],
    right: [P(i + 1, j, k + 1), P(i + 1, j + 1, k + 1), P(i + 1, j + 1, k), P(i + 1, j, k)],
    left: [P(i, j + 1, k + 1), P(i + 1, j + 1, k + 1), P(i + 1, j + 1, k), P(i, j + 1, k)]
  };
}
function cubesOf(hm) {
  const out = [];
  hm.forEach((col, i) => col.forEach((h, j) => { for (let k = 0; k < h; k++) out.push([i, j, k]); }));
  return out.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]) || a[2] - b[2]);   // orqadan oldinga
}
function bounds(hm) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [i, j, k] of cubesOf(hm)) for (const f of Object.values(cubeFaces(i, j, k))) for (const [x, y] of f) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1 };
}

// Har bir kubikning ko'rinadigan qismi (piksel hisobida, bitta yon tomoni = 1)
const inPoly = (x, y, poly) => {
  let c = false;
  for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
    const [xa, ya] = poly[a], [xb, yb] = poly[b];
    if ((ya > y) !== (yb > y) && x < (xb - xa) * (y - ya) / (yb - ya) + xa) c = !c;
  }
  return c;
};
export function visibility(hm, res = 10) {
  const cubes = cubesOf(hm), b = bounds(hm);
  const W = Math.ceil((b.x1 - b.x0) * res) + 1, H = Math.ceil((b.y1 - b.y0) * res) + 1;
  const buf = new Int32Array(W * H).fill(-1);
  cubes.forEach(([i, j, k], id) => {
    for (const f of Object.values(cubeFaces(i, j, k))) {
      const px = f.map(([x, y]) => [(x - b.x0) * res, (y - b.y0) * res]);
      const xs = px.map(p => p[0]), ys = px.map(p => p[1]);
      for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)) && y < H; y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)) && x < W; x++) {
        if (inPoly(x + 0.5, y + 0.5, px)) buf[y * W + x] = id;
      }
    }
  });
  const faceArea = C30 * res * res;                      // bitta rombning maydoni (piksel)
  const vis = new Array(cubes.length).fill(0);
  for (const id of buf) if (id >= 0) vis[id]++;
  return { cubes, vis: vis.map(v => v / faceArea) };
}

function makeHM(L, rand) {
  const w = L.w[0] + Math.floor(rand() * (L.w[1] - L.w[0] + 1)), d = L.d[0] + Math.floor(rand() * (L.d[1] - L.d[0] + 1));
  const hm = Array.from({ length: w }, () => Array(d).fill(0));
  if (!L.mono) {
    for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) hm[i][j] = 1 + Math.floor(rand() * L.h);
    return hm;
  }
  // Orqadan oldinga kamayib boradi: h[i][j] ≤ h[i-1][j] va h[i][j] ≤ h[i][j-1]
  for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) {
    const cap = Math.min(i ? hm[i - 1][j] : L.h, j ? hm[i][j - 1] : L.h);
    const lo = L.zero && (i + j) >= 2 ? 0 : 1;
    hm[i][j] = Math.min(cap, lo + Math.floor(rand() * (cap - lo + 1)));
  }
  if (!L.zero) for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) hm[i][j] = Math.max(1, hm[i][j]);
  return hm;
}
const total = hm => hm.flat().reduce((a, b) => a + b, 0);

const RULE = {
  uz: 'Har bir rasmda nechta kubik bor? Sanab, katakchaga yoz.',
  ru: 'Сколько кубиков на каждой картинке? Посчитай и запиши в клетку.',
  en: 'How many cubes are in each picture? Count them and write the number in the box.'
};
const HIDDEN = {
  uz: "Kubiklar havoda turmaydi: har birining ostida kubik bor (ba'zilari ko'rinmaydi).",
  ru: 'Кубики не висят в воздухе: под каждым есть кубик (некоторые не видны).',
  en: 'Cubes never float: there is a cube under each one (some are hidden).'
};

export default {
  id: 'cubes',
  skills: ['spatial', 'counting'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Kubiklarni sana', ru: 'Посчитай кубики', en: 'Count the cubes' },
  desc: {
    uz: "Uyilgan kubiklarni sanang — ko'rinmaydiganlarini ham",
    ru: 'Посчитайте кубики в постройках — даже те, что не видны',
    en: 'Count the cubes in each stack — even the hidden ones'
  },
  fileBase: { uz: 'kubiklarni sana', ru: 'Посчитай кубики', en: 'Count the cubes' },
  defaultTitle: { uz: 'Nechta kubik?', ru: 'Сколько кубиков?', en: 'How many cubes?' },
  options: [{ key: 'level', type: 'level', default: 0 }],
  levelHint: {
    uz: ["Bir qator, hamma kubiklar ko'rinadi", "Ikki qator, hamma kubiklar ko'rinadi", "Yashirin kubiklar ham bor (3 qavatgacha)", "Katta uyumlar, 4 qavatgacha, bo'sh joylar bilan"],
    ru: ['Один ряд, все кубики видны', 'Два ряда, все кубики видны', 'Есть скрытые кубики (до 3 этажей)', 'Большие постройки до 4 этажей, с пустотами'],
    en: ['One row, every cube is visible', 'Two rows, every cube is visible', 'Some cubes are hidden (up to 3 high)', 'Big stacks up to 4 high, with gaps']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level];
    const small = opts.perPage > 1 || opts.aspect === 'landscape';
    const n = small ? 2 : L.figs;
    const rand = makeRng(seed);
    const figs = [], seen = new Set();
    for (let guard = 0; figs.length < n && guard < 2000; guard++) {
      const hm = makeHM(L, rand);
      const t = total(hm);
      if (t < 3 || seen.has(t) && guard < 1500) continue;        // har bir rasmda boshqa son (iloji bo'lsa)
      if (!L.mono) {
        const { vis } = visibility(hm);
        if (vis.some(v => v < 0.3)) continue;                        // har bir kubikdan kamida 30% ko'rinsin
      }
      seen.add(t); figs.push(hm);
    }
    return { level, seed, figs };
  },

  info(p, lang) {
    const n = p.figs.length;
    return { uz: `${n} ta rasm`, ru: `${n} ${ruPlural(n, 'картинка', 'картинки', 'картинок')}`, en: `${n} pictures` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box);
    const mono = LEVELS[p.level].mono;
    const text = (RULE[lang] || RULE.uz) + (mono ? ' ' + (HIDDEN[lang] || HIDDEN.uz) : '');
    const rule = measureRule(ctx, text, box.w, scale);
    const gap = 4 * scale;
    const availH = box.h - rule.h - gap;
    const n = p.figs.length;
    const cols = n <= 2 ? (box.w / availH > 1.2 ? 2 : 1) : 2, rows = Math.ceil(n / cols);
    const cw = box.w / cols, ch = availH / rows;
    const numFs = 12 * PT * scale;
    // Bir xil masshtab: eng katta rasm katakka sig'sin
    const bs = p.figs.map(bounds);
    const maxW = Math.max(...bs.map(b => b.x1 - b.x0)), maxH = Math.max(...bs.map(b => b.y1 - b.y0));
    const ansH = Math.min(12 * scale, ch * 0.16), ansW = ansH * 1.6;
    const u = Math.min((cw * 0.82) / maxW, (ch - ansH - gap * 2) * 0.9 / maxH, 16 * scale);
    p.figs.forEach((hm, f) => {
      const cx = box.x + (f % cols + 0.5) * cw, cy0 = box.y + Math.floor(f / cols) * ch;
      const b = bs[f];
      const fw = (b.x1 - b.x0) * u, fh = (b.y1 - b.y0) * u;
      const ox = cx - fw / 2 - b.x0 * u, oy = cy0 + (ch - ansH - gap - fh) / 2 - b.y0 * u;
      if (n > 1) { font(ctx, numFs, 800); ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(`${f + 1}.`, box.x + (f % cols) * cw + 1, cy0 + 1); }
      ctx.save();
      ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.25, u * 0.04);
      for (const [i, j, k] of cubesOf(hm)) {
        const F = cubeFaces(i, j, k);
        for (const [name, fill] of [['left', '#FFFFFF'], ['right', '#CBD5E1'], ['top', '#F1F5F9']]) {
          ctx.beginPath();
          F[name].forEach(([x, y], t) => (t ? ctx.lineTo(ox + x * u, oy + y * u) : ctx.moveTo(ox + x * u, oy + y * u)));
          ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.stroke();
        }
      }
      ctx.restore();
      answerBox(ctx, cx - ansW / 2, cy0 + ch - ansH - gap * 0.6, ansW, ansH, scale, showSolution ? total(hm) : null);
    });
    drawRule(ctx, rule, box.x + box.w / 2, box.y + availH + gap);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const T = { uz: `Rasmlar: ${p.figs.length}`, ru: `Картинок: ${p.figs.length}`, en: `Pictures: ${p.figs.length}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const L = LEVELS[p.level];
    p.figs.forEach((hm, f) => {
      if (hm.flat().some(h => h < 0 || h > L.h)) problems.push(`fig ${f}: bad height`);
      if (total(hm) < 3) problems.push(`fig ${f}: too few cubes`);
      if (L.mono) {
        for (let i = 0; i < hm.length; i++) for (let j = 0; j < hm[0].length; j++) {
          if (i && hm[i][j] > hm[i - 1][j]) problems.push(`fig ${f}: front column taller (i)`);
          if (j && hm[i][j] > hm[i][j - 1]) problems.push(`fig ${f}: front column taller (j)`);
        }
        // har bir ustunning tepasi ko'rinadi
        const { cubes, vis } = visibility(hm);
        cubes.forEach(([i, j, k], id) => { if (k === hm[i][j] - 1 && vis[id] < 0.3) problems.push(`fig ${f}: top of column ${i},${j} hidden`); });
      } else {
        const { vis } = visibility(hm);
        if (vis.some(v => v < 0.3)) problems.push(`fig ${f}: a cube is hidden`);
      }
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-cubes" aria-hidden="true"><defs><linearGradient id="cg-cubes" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#667eea"/><stop offset="1" stop-color="#764ba2"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-cubes)"/><g stroke="#1e1b4b" stroke-width="3" stroke-linejoin="round"><g class="cb-1"><path d="M70 110 L100 95 L130 110 L100 125 Z" fill="#f1f5f9"/><path d="M70 110 L100 125 L100 160 L70 145 Z" fill="#fff"/><path d="M130 110 L100 125 L100 160 L130 145 Z" fill="#cbd5e1"/></g><g class="cb-2"><path d="M100 95 L130 80 L160 95 L130 110 Z" fill="#f1f5f9"/><path d="M130 110 L160 95 L160 130 L130 145 Z" fill="#cbd5e1"/></g><g class="cb-3"><path d="M70 75 L100 60 L130 75 L100 90 Z" fill="#f1f5f9"/><path d="M70 75 L100 90 L100 125 L70 110 Z" fill="#fff"/><path d="M130 75 L100 90 L100 125 L130 110 Z" fill="#cbd5e1"/></g></g><rect x="136" y="150" width="44" height="34" rx="9" fill="#fff"/><text x="158" y="177" text-anchor="middle" font-size="26" font-weight="900" fill="#DC2626" font-family="Nunito, sans-serif">3</text></svg>`
};
