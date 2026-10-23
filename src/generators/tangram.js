// tangram.js — «Tangram» (Танграм) generatori. v2.8
// Yetti bo'lakdan (2 katta, 1 o'rta, 2 kichik uchburchak, kvadrat, parallelogramm) berilgan siluetni yig'ish.
// Varaq pastida xuddi shu masshtabdagi tangram kvadrati chiziladi — uni qirqib olib, siluet ustiga qo'yib yig'sa bo'ladi.
// Darajalar: hamma bo'lak chizilgan → faqat katta uchburchaklar → faqat siluet → geometrik shakllar va murakkab figuralar.
// Figuralar: buyumlar, hayvonlar, odamchalar (klassik tangram odamchalari) va geometrik shakllar.
// Kafolat (check()): to'plamdagi har bir figura aynan 7 ta to'g'ri o'lchamli bo'lakdan, bo'laklar ustma-ust tushmaydi.
// Qolip: «Mantiqiy masalalar» guruhi; figuralar — tangram-figs.js.

import { makeRng, shuffle } from '../core/rng.js';
import { INK, MUTE, PT, font } from '../core/draw.js';
import { scaleOf, measureRule, drawRule, ruPlural } from '../core/parts.js';
import { FIGS, NAMES } from './tangram-figs.js';

const R2 = Math.SQRT2, H = Math.SQRT1_2;
// Bo'laklarning asl ko'rinishi (tomon uzunliklari tekshiruv uchun)
const BASE = {
  L: [[0, 0], [2, 0], [0, 2]], M: [[0, 0], [R2, 0], [0, R2]], S: [[0, 0], [1, 0], [0, 1]],
  Q: [[0, 0], [1, 0], [1, 1], [0, 1]], P: [[0, 0], [R2, 0], [R2 + H, H], [H, H]]
};
// Qirqib olinadigan kvadrat (standart joylashuv)
const SQUARE = [
  ['L', [[0, 0], [0, 4], [2, 2]]], ['L', [[0, 4], [4, 4], [2, 2]]], ['M', [[2, 0], [4, 0], [4, 2]]],
  ['Q', [[2, 2], [3, 1], [4, 2], [3, 3]]], ['S', [[3, 3], [4, 2], [4, 4]]], ['S', [[1, 1], [3, 1], [2, 2]]],
  ['P', [[0, 0], [2, 0], [3, 1], [1, 1]]]
].map(([t, pts]) => [t, pts.map(([x, y]) => [x * H, y * H])]);
const SQ_SIDE = 4 * H;
// Bo'lak ranglari (javobda va qirqiladigan kvadratda bir xil): L, L, M, S, S, Q, P tartibida
const COL = { L: ['#BFDBFE', '#FECACA'], M: ['#FDE68A'], S: ['#DDD6FE', '#FBCFE8'], Q: ['#BBF7D0'], P: ['#FED7AA'] };
const SIL = '#374151';

// lines — siluet ichida qaysi bo'laklar chegarasi chiziladi; pool — figuralar turi; count — [1 tadan, 2 tadan, 4 tadan]
// (varaqda bitta katta siluet: bo'laklar qirqib olishga qulay kattalikda bo'lsin)
const LEVELS = [
  { lines: 'all', pool: ['easy', 'hard', 'people'], count: [1, 1, 1] },
  { lines: 'big', pool: ['easy', 'hard', 'people'], count: [1, 1, 1] },
  { lines: 'none', pool: ['easy', 'hard', 'people'], count: [1, 1, 1] },
  { lines: 'none', pool: ['geo', 'hard', 'people'], count: [1, 1, 1] }
];

const sideSig = pts => pts.map((p, i) => { const q = pts[(i + 1) % pts.length]; return Math.hypot(q[0] - p[0], q[1] - p[1]); }).sort((a, b) => a - b);
const polyArea = P => Math.abs(P.reduce((s, [x, y], i) => { const [x2, y2] = P[(i + 1) % P.length]; return s + x * y2 - x2 * y; }, 0)) / 2;
// Ikki qavariq ko'pburchak kesishmasi yuzasi (Sutherland–Hodgman)
function interArea(A, B) {
  const signed = P => P.reduce((s, [x, y], i) => { const [x2, y2] = P[(i + 1) % P.length]; return s + x * y2 - x2 * y; }, 0) / 2;
  const C = signed(B) > 0 ? B : B.slice().reverse();
  let out = A.slice();
  for (let i = 0; i < C.length && out.length; i++) {
    const a = C[i], b = C[(i + 1) % C.length];
    const inside = p => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= -1e-12;
    const cross = (p, q) => {
      const den = (p[0] - q[0]) * (a[1] - b[1]) - (p[1] - q[1]) * (a[0] - b[0]);
      if (Math.abs(den) < 1e-15) return q;
      const t = ((p[0] - a[0]) * (a[1] - b[1]) - (p[1] - a[1]) * (a[0] - b[0])) / den;
      return [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])];
    };
    const inp = out; out = [];
    let s = inp[inp.length - 1];
    for (const e of inp) {
      if (inside(e)) { if (!inside(s)) out.push(cross(s, e)); out.push(e); } else if (inside(s)) out.push(cross(s, e));
      s = e;
    }
  }
  return out.length >= 3 ? polyArea(out) : 0;
}
export function figProblems(f) {
  const out = [];
  const types = f.pcs.map(p => p[0]).sort().join('');
  if (types !== 'LLMPQSS') out.push(`${f.id}: pieces ${types}`);
  for (const [t, pts] of f.pcs) {
    const a = sideSig(pts), b = sideSig(BASE[t] || []);
    if (a.length !== b.length || a.some((v, i) => Math.abs(v - b[i]) > 2e-3)) out.push(`${f.id}: bad ${t}`);
  }
  for (let i = 0; i < f.pcs.length; i++) for (let j = i + 1; j < f.pcs.length; j++) {
    const ov = interArea(f.pcs[i][1], f.pcs[j][1]);
    if (ov > 2e-3) out.push(`${f.id}: overlap ${f.pcs[i][0]}/${f.pcs[j][0]} ${ov.toFixed(4)}`);
  }
  return out;
}

const RULE = {
  all: {
    uz: "Shakl 7 ta tangram bo'lagidan yig'ilgan, bo'laklar chizib ko'rsatilgan. Pastdagi kvadratni chiziqlari bo'yicha qirqib ol va bo'laklarni shakl ustiga joylashtir.",
    ru: 'Фигура сложена из 7 частей танграма, части показаны линиями. Вырежи квадрат внизу по линиям и разложи части на фигуре.',
    en: 'The figure is made of the 7 tangram pieces, and the pieces are outlined. Cut out the square below along the lines and lay the pieces on the figure.'
  },
  big: {
    uz: "Pastdagi kvadratni chiziqlari bo'yicha qirqib ol va 7 ta bo'lakdan shaklni yig'. Ikkita katta uchburchakning joyi ko'rsatilgan. Hamma bo'lak ishlatilsin, ustma-ust qo'yilmasin.",
    ru: 'Вырежи квадрат внизу по линиям и сложи фигуру из 7 частей. Места двух больших треугольников показаны. Используй все части, не накладывай их друг на друга.',
    en: 'Cut out the square below along the lines and build the figure from the 7 pieces. The two big triangles are shown. Use every piece and do not overlap them.'
  },
  none: {
    uz: "Pastdagi kvadratni chiziqlari bo'yicha qirqib ol va 7 ta bo'lakdan shaklni yig'. Hamma bo'lak ishlatilsin, ustma-ust qo'yilmasin. Bo'laklar qayerda turishini shakl ichiga chizib ko'rsat.",
    ru: 'Вырежи квадрат внизу по линиям и сложи фигуру из 7 частей. Используй все части, не накладывай их друг на друга. Начерти внутри фигуры, где лежит каждая часть.',
    en: 'Cut out the square below along the lines and build the figure from the 7 pieces. Use every piece and do not overlap them. Draw inside the figure where each piece goes.'
  }
};
const CUT = { uz: 'Qirqib ol', ru: 'Вырежи', en: 'Cut out' };

function drawPieces(ctx, pcs, x0, y0, u, mode, lines) {
  const path = pts => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x0 + x * u, y0 + y * u) : ctx.moveTo(x0 + x * u, y0 + y * u))); ctx.closePath(); };
  const used = { L: 0, M: 0, S: 0, Q: 0, P: 0 };
  ctx.lineJoin = 'round';
  for (const [t, pts] of pcs) {
    path(pts);
    if (mode === 'sil') { ctx.fillStyle = SIL; ctx.fill(); ctx.strokeStyle = SIL; ctx.lineWidth = Math.max(0.2, u * 0.03); ctx.stroke(); }
    else { ctx.fillStyle = COL[t][used[t]++ % COL[t].length]; ctx.fill(); }
  }
  if (mode === 'sil') {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(0.35, u * 0.045);
    for (const [t, pts] of pcs) if (lines === 'all' || (lines === 'big' && t === 'L')) { path(pts); ctx.stroke(); }
  } else {
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.3, u * 0.035);
    for (const [, pts] of pcs) { path(pts); ctx.stroke(); }
  }
}

export default {
  id: 'tangram',
  skills: ['spatial', 'logic', 'motor'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Tangram', ru: 'Танграм', en: 'Tangram' },
  desc: {
    uz: "Yetti bo'lakdan siluetni yig'ing: hayvonlar, buyumlar, odamchalar, geometrik shakllar. Kvadratni qirqib olsa bo'ladi",
    ru: 'Сложите силуэт из семи частей: животные, предметы, человечки, фигуры. Квадрат можно вырезать',
    en: 'Build the silhouette from seven pieces: animals, objects, people, shapes. The square can be cut out'
  },
  fileBase: { uz: 'Tangram', ru: 'Танграм', en: 'Tangram' },
  defaultTitle: { uz: "Tangramdan yig'!", ru: 'Сложи из танграма!', en: 'Build it with a tangram!' },
  options: [{ key: 'level', type: 'level', default: 0 }],
  levelHint: {
    uz: ["Bo'laklar chizib ko'rsatilgan", "Faqat ikkita katta uchburchak ko'rsatilgan", 'Faqat siluet: hayvonlar, buyumlar, odamchalar', 'Faqat siluet: geometrik shakllar, hayvonlar, odamchalar'],
    ru: ['Части показаны линиями', 'Показаны только два больших треугольника', 'Только силуэт: животные, предметы, человечки', 'Только силуэт: геометрические фигуры, животные, человечки'],
    en: ['The pieces are outlined', 'Only the two big triangles are shown', 'Silhouette only: animals, objects, people', 'Silhouette only: geometric shapes, animals, people']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level];
    const rand = makeRng(seed);
    const count = L.count[opts.perPage === 4 ? 2 : opts.perPage === 2 ? 1 : 0];
    const pool = shuffle(FIGS.filter(f => L.pool.includes(f.cls)), rand);
    const items = [], names = new Set();
    for (const f of pool) {
      if (items.length >= count) break;
      if (names.has(f.name)) continue;
      names.add(f.name); items.push(f.id);
    }
    return { level, seed, lines: L.lines, items };
  },

  info(p, lang) {
    const c = p.items.length;
    const nm = p.items.map(id => { const f = FIGS.find(x => x.id === id); return (NAMES[f.name][lang] || NAMES[f.name].uz).toLowerCase(); }).join(', ');
    return { uz: `${c} ta siluet: ${nm}`, ru: `${c} ${ruPlural(c, 'силуэт', 'силуэта', 'силуэтов')}: ${nm}`, en: `${c} silhouette${c > 1 ? 's' : ''}: ${nm}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box);
    const figs = p.items.map(id => FIGS.find(f => f.id === id));
    const rule = measureRule(ctx, (RULE[p.lines][lang] || RULE[p.lines].uz), box.w, scale);
    const gap = 6 * scale, nameH = 6 * scale, cutH = 5 * scale;
    const n = figs.length, fw = Math.max(...figs.map(f => f.w)), fh = Math.max(...figs.map(f => f.h));
    // A — kvadrat pastda; B — kvadrat o'ngda (yotiq joyda)
    const uA = Math.min((box.w - (n - 1) * gap) / (n * fw), (box.h - rule.h - nameH - cutH - 3 * gap) / (fh + SQ_SIDE), 30 * scale);
    const uB = Math.min((box.w - n * gap) / (n * fw + SQ_SIDE), (box.h - rule.h - nameH - 2 * gap) / Math.max(fh, SQ_SIDE + cutH / 10), 30 * scale);
    const side = uB > uA * 1.08;
    const u = side ? uB : uA;
    const figsW = n * fw * u + (n - 1) * gap;
    const totalW = side ? figsW + gap + SQ_SIDE * u : figsW;
    const blockH = side ? Math.max(fh * u + nameH, SQ_SIDE * u + cutH) : fh * u + nameH + gap + cutH + SQ_SIDE * u;
    const x0 = box.x + (box.w - totalW) / 2;
    const y0 = box.y + Math.max(0, (box.h - blockH - rule.h - gap) * 0.3);
    figs.forEach((f, i) => {
      const cx = x0 + i * (fw * u + gap) + (fw - f.w) * u / 2, cy = y0 + (fh - f.h) * u;
      drawPieces(ctx, f.pcs, cx, cy, u, showSolution ? 'col' : 'sil', p.lines);
      font(ctx, Math.min(nameH * 0.7, 4.2 * scale), 800); ctx.fillStyle = MUTE; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(NAMES[f.name][lang] || NAMES[f.name].uz, x0 + i * (fw * u + gap) + fw * u / 2, y0 + fh * u + nameH * 0.6);
    });
    // qirqib olinadigan kvadrat
    const sx = side ? x0 + figsW + gap : box.x + (box.w - SQ_SIDE * u) / 2;
    const sy = side ? y0 + cutH : y0 + fh * u + nameH + gap + cutH;
    font(ctx, Math.min(cutH * 0.7, 3.6 * scale), 700); ctx.fillStyle = MUTE; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(CUT[lang] || CUT.uz, sx + SQ_SIDE * u / 2, sy - 1 * scale);
    drawPieces(ctx, SQUARE, sx, sy, u, 'col', 'all');
    drawRule(ctx, rule, box.x + box.w / 2, y0 + blockH + gap);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const n = p.items.length;
    const T = { uz: `Siluetlar: ${n} ta`, ru: `Силуэтов: ${n}`, en: `Silhouettes: ${n}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    p.items.forEach(id => {
      const f = FIGS.find(x => x.id === id);
      if (!f) { problems.push(`unknown figure ${id}`); return; }
      problems.push(...figProblems(f));
      if (!LEVELS[p.level].pool.includes(f.cls)) problems.push(`${id}: wrong class for level`);
    });
    if (new Set(p.items.map(id => FIGS.find(x => x.id === id)?.name)).size !== p.items.length) problems.push('repeated figure');
    problems.push(...figProblems({ id: 'square', pcs: SQUARE }));
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-tangram" aria-hidden="true"><defs><linearGradient id="cg-tangram" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a1c4fd"/><stop offset="1" stop-color="#c2e9fb"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-tangram)"/><polygon points="40,40 40,160 100,100" fill="#93C5FD" stroke="#1F2937" stroke-width="2.5" stroke-linejoin="round"/><polygon points="40,160 160,160 100,100" fill="#FCA5A5" stroke="#1F2937" stroke-width="2.5" stroke-linejoin="round"/><polygon points="100,40 160,40 160,100" fill="#FCD34D" stroke="#1F2937" stroke-width="2.5" stroke-linejoin="round"/><polygon points="130,130 160,100 160,160" fill="#C4B5FD" stroke="#1F2937" stroke-width="2.5" stroke-linejoin="round"/><polygon points="70,70 130,70 100,100" fill="#F9A8D4" stroke="#1F2937" stroke-width="2.5" stroke-linejoin="round"/><polygon points="40,40 100,40 130,70 70,70" fill="#FDBA74" stroke="#1F2937" stroke-width="2.5" stroke-linejoin="round"/><polygon class="tg-a" points="100,100 130,70 160,100 130,130" fill="#86EFAC" stroke="#1F2937" stroke-width="2.5" stroke-linejoin="round"/></svg>`
};
