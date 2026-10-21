// coding.js — «Belgilar kodi» (Шифровка / Кодирование) generatori.
// Tepada kalit: har bir shaklga (yoki belgiga) bitta raqam mos. Pastdagi kataklarda:
//  • «Raqamini yoz» — shakl berilgan, bola tagiga uning raqamini yozadi;
//  • «Belgisini chiz» — raqam berilgan, bola tagiga kalitdagi belgini chizadi.
// Birinchi qatordagi bir nechta katak namunaviy (to'ldirib qo'yilgan) — bola nima qilishni ko'radi.
// Kafolat (check()): kalitdagi belgilar har xil, har bir kalit juftligi topshiriqda kamida bir marta uchraydi,
// ketma-ket ikki katak bir xil emas.

import { makeRng, shuffle } from '../core/rng.js';
import { INK, MUTE, ANSWER, font } from '../core/draw.js';
import { drawFigure } from '../core/figures.js';
import { scaleOf, measureRule, drawRule, timeLine } from '../core/parts.js';

// pairs — kalitdagi juftliklar soni; rows×cols — to'liq varaq uchun; demo — namunaviy kataklar
const LEVELS = [
  { pairs: 4, rows: 3, cols: 8, demo: 3 },
  { pairs: 6, rows: 4, cols: 10, demo: 3 },
  { pairs: 8, rows: 5, cols: 12, demo: 2 },
  { pairs: 9, rows: 6, cols: 14, demo: 2 }
];

// Shakllar («Raqamini yoz»): oson darajalarda bir-biridan juda farqli, qiyinida — o'xshashlari ham bor
const SHAPES_EASY = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond', 'plus', 'moon', 'hexagon'];
const SHAPES_HARD = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond', 'plus', 'moon', 'hexagon', 'pentagon', 'halfcircle', 'halfsquare', 'arrow', 'flag'];

// Chizish oson bo'lgan belgilar («Belgisini chiz»): chiziqlar birlik koordinatalarda [-1, 1]
const circlePts = (r, n = 28) => Array.from({ length: n + 1 }, (_, i) => [r * Math.cos(i * 2 * Math.PI / n), r * Math.sin(i * 2 * Math.PI / n)]);
const STROKES = {
  dash: [[[-0.7, 0], [0.7, 0]]],
  bar: [[[0, -0.7], [0, 0.7]]],
  plus: [[[-0.7, 0], [0.7, 0]], [[0, -0.7], [0, 0.7]]],
  cross: [[[-0.6, -0.6], [0.6, 0.6]], [[0.6, -0.6], [-0.6, 0.6]]],
  ring: [circlePts(0.62)],
  tri: [[[0, -0.65], [0.7, 0.55], [-0.7, 0.55], [0, -0.65]]],
  caret: [[[-0.65, 0.5], [0, -0.55], [0.65, 0.5]]],
  vee: [[[-0.65, -0.5], [0, 0.55], [0.65, -0.5]]],
  lt: [[[0.55, -0.65], [-0.55, 0], [0.55, 0.65]]],
  gt: [[[-0.55, -0.65], [0.55, 0], [-0.55, 0.65]]],
  eq: [[[-0.65, -0.28], [0.65, -0.28]], [[-0.65, 0.28], [0.65, 0.28]]],
  cup: [[[-0.6, -0.6], [-0.6, 0.2], [-0.45, 0.5], [-0.2, 0.65], [0.2, 0.65], [0.45, 0.5], [0.6, 0.2], [0.6, -0.6]]],
  cap: [[[-0.6, 0.6], [-0.6, -0.2], [-0.45, -0.5], [-0.2, -0.65], [0.2, -0.65], [0.45, -0.5], [0.6, -0.2], [0.6, 0.6]]],
  ell: [[[-0.45, -0.7], [-0.45, 0.6], [0.55, 0.6]]],
  tee: [[[0, -0.65], [0, 0.6]], [[-0.65, 0.6], [0.65, 0.6]]],
  sq: [[[-0.55, -0.55], [0.55, -0.55], [0.55, 0.55], [-0.55, 0.55], [-0.55, -0.55]]],
  dot: 'dot'
};
const STROKES_EASY = ['dash', 'bar', 'plus', 'cross', 'ring', 'tri', 'eq', 'sq', 'dot'];
const STROKES_HARD = Object.keys(STROKES);

const MODES = {
  digit: { big: '★→3', label: { uz: 'Raqamini yoz', ru: 'Напиши цифру', en: 'Write the digit' } },
  symbol: { big: '3→＋', label: { uz: 'Belgisini chiz', ru: 'Нарисуй значок', en: 'Draw the sign' } }
};
const RULE = {
  digit: {
    uz: "Kalitga qara: har bir shaklning o'z raqami bor. Har bir shakl tagidagi katakka uning raqamini yoz. Chapdan o'ngga, qatorma-qator ishla.",
    ru: 'Посмотри на ключ: у каждой фигуры своя цифра. Под каждой фигурой напиши её цифру. Работай слева направо, строка за строкой.',
    en: 'Look at the key: each shape has its own digit. Write the digit under each shape. Work from left to right, row by row.'
  },
  symbol: {
    uz: "Kalitga qara: har bir raqamning o'z belgisi bor. Har bir raqam tagidagi katakka uning belgisini chiz. Chapdan o'ngga, qatorma-qator ishla.",
    ru: 'Посмотри на ключ: у каждой цифры свой значок. Под каждой цифрой нарисуй её значок. Работай слева направо, строка за строкой.',
    en: 'Look at the key: each digit has its own sign. Draw the sign under each digit. Work from left to right, row by row.'
  }
};
const KEY = { uz: 'Kalit', ru: 'Ключ', en: 'Key' };

function drawSign(ctx, mode, sign, cx, cy, s, color = INK) {
  if (mode === 'digit') {
    if (color !== INK) { ctx.save(); ctx.globalAlpha = 0.5; }
    drawFigure(ctx, { shape: sign, fill: 'empty', lw: Math.max(0.3, s * 0.045) }, cx, cy, s * 1.1);
    if (color !== INK) ctx.restore();
    return;
  }
  const st = STROKES[sign], R = s * 0.42;
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = Math.max(0.3, s * 0.07); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (st === 'dot') { ctx.beginPath(); ctx.arc(cx, cy, R * 0.28, 0, Math.PI * 2); ctx.fill(); }
  else {
    ctx.beginPath();
    for (const ln of st) ln.forEach(([x, y], i) => (i ? ctx.lineTo(cx + x * R, cy + y * R) : ctx.moveTo(cx + x * R, cy + y * R)));
    ctx.stroke();
  }
  ctx.restore();
}
function drawDigit(ctx, d, cx, cy, s, color = INK) {
  font(ctx, s * 0.62, 800);
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(d), cx, cy + s * 0.03);
}

export default {
  id: 'coding',
  skills: ['attention', 'memory', 'speed'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Belgilar kodi', ru: 'Шифровка', en: 'Symbol coding' },
  desc: {
    uz: "Kalit bo'yicha har bir shaklga raqamini yoki raqamga belgisini yozish — diqqat va tezlik",
    ru: 'По ключу подписать под фигурами цифры или под цифрами значки — внимание и скорость',
    en: 'Use the key to write digits under shapes or signs under digits — attention and speed'
  },
  fileBase: { uz: 'Belgilar kodi', ru: 'Шифровка', en: 'Symbol coding' },
  defaultTitle: { uz: "Kalit bo'yicha to'ldir!", ru: 'Заполни по ключу!', en: 'Fill in with the key!' },
  options: [
    { key: 'level', type: 'level', default: 1 },
    {
      key: 'mode', type: 'choice', style: 'cards', pack: 'select', default: 'digit',
      label: { uz: 'Turi', ru: 'Вид', en: 'Kind' },
      choices: Object.entries(MODES).map(([value, m]) => ({ value, big: m.big, label: m.label }))
    }
  ],
  levelHint: {
    uz: ['Kalitda 4 ta juftlik, 24 ta katak', 'Kalitda 6 ta juftlik, 40 ta katak', "Kalitda 8 ta juftlik, 60 ta katak, o'xshash belgilar bor", "Kalitda 9 ta juftlik, 84 ta katak, o'xshash belgilar ko'p"],
    ru: ['В ключе 4 пары, 24 клетки', 'В ключе 6 пар, 40 клеток', 'В ключе 8 пар, 60 клеток, есть похожие знаки', 'В ключе 9 пар, 84 клетки, много похожих знаков'],
    en: ['4 pairs in the key, 24 cells', '6 pairs in the key, 40 cells', '8 pairs, 60 cells, some look-alike signs', '9 pairs, 84 cells, many look-alike signs']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const mode = opts.mode in MODES ? opts.mode : 'digit';
    const L = LEVELS[level];
    const rand = makeRng(seed);
    let rows = L.rows, cols = L.cols;
    if (opts.perPage === 4) { rows = Math.min(rows, 3); cols = Math.min(cols, 8); }
    else if (opts.perPage === 2) { rows = Math.min(rows, 3); cols = Math.min(cols + 2, 14); }
    const pool = mode === 'digit' ? (level >= 2 ? SHAPES_HARD : SHAPES_EASY) : (level >= 2 ? STROKES_HARD : STROKES_EASY);
    const signs = shuffle(pool.slice(), rand).slice(0, L.pairs);
    // Topshiriq: har bir juftlik kamida bir marta, ketma-ket bir xili yo'q
    const n = rows * cols;
    const seq = [];
    const base = shuffle(Array.from({ length: L.pairs }, (_, i) => i), rand);
    for (let i = 0; i < n; i++) {
      let v;
      if (i < base.length && i >= L.demo) v = base[i];
      else do v = Math.floor(rand() * L.pairs); while (i > 0 && v === seq[i - 1]);
      if (i > 0 && v === seq[i - 1]) v = (v + 1) % L.pairs;
      seq.push(v);
    }
    // Kalitning hammasi albatta uchrasin (namunadan keyingi qismda)
    for (let k = 0; k < L.pairs; k++) {
      if (seq.slice(L.demo).includes(k)) continue;
      for (let i = n - 1; i >= L.demo; i--) {
        if (seq[i - 1] !== k && seq[i + 1] !== k && seq.slice(L.demo).filter(v => v === seq[i]).length > 1) { seq[i] = k; break; }
      }
    }
    return { level, seed, mode, rows, cols, demo: L.demo, signs, seq };
  },

  info(p, lang) {
    const n = p.rows * p.cols;
    return { uz: `${p.signs.length} ta belgi, ${n} ta katak`, ru: `${p.signs.length} знаков, ${n} клеток`, en: `${p.signs.length} signs, ${n} cells` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box);
    const rule = measureRule(ctx, (RULE[p.mode][lang] || RULE[p.mode].uz), box.w, scale);
    const gap = 4 * scale, timeH = 8 * scale;
    const K = p.signs.length;
    // Katak: yuqori yarmi — berilgan, pastki yarmi — javob uchun. Kalit kataklari biroz kattaroq.
    const kc = Math.min(box.w / (K + 1.2), 17 * scale);
    const keyH = kc * 2 + 5 * scale;
    const c = Math.min(box.w / p.cols, (box.h - keyH - timeH - rule.h - 4 * gap) / (p.rows * 2.25), 19);
    const gridW = c * p.cols, rowH = c * 2.25;
    const blockH = keyH + gap + p.rows * rowH + gap + timeH + gap + rule.h;
    const top = box.y + Math.max(0, (box.h - blockH) * 0.3);

    // Kalit
    font(ctx, 10 * 0.3528 * scale * 1.15, 800);
    ctx.fillStyle = MUTE; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(KEY[lang] || KEY.uz, box.x + box.w / 2, top);
    const ky = top + 5 * scale, kx = box.x + (box.w - kc * K) / 2;
    ctx.save();
    ctx.fillStyle = '#F3F4F6'; ctx.fillRect(kx, ky, kc * K, kc * 2);
    ctx.restore();
    p.signs.forEach((sg, i) => {
      const x = kx + i * kc;
      if (p.mode === 'digit') { drawSign(ctx, 'digit', sg, x + kc / 2, ky + kc / 2, kc * 0.8); drawDigit(ctx, i + 1, x + kc / 2, ky + kc * 1.5, kc); }
      else { drawDigit(ctx, i + 1, x + kc / 2, ky + kc / 2, kc); drawSign(ctx, 'symbol', sg, x + kc / 2, ky + kc * 1.5, kc); }
    });
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.3, 0.45 * scale);
    ctx.beginPath();
    for (let i = 0; i <= K; i++) { ctx.moveTo(kx + i * kc, ky); ctx.lineTo(kx + i * kc, ky + kc * 2); }
    ctx.moveTo(kx, ky + kc); ctx.lineTo(kx + kc * K, ky + kc);
    ctx.stroke();
    ctx.lineWidth = Math.max(0.5, 0.8 * scale); ctx.strokeRect(kx, ky, kc * K, kc * 2);

    // Topshiriq kataklari
    const gx = box.x + (box.w - gridW) / 2, gy = top + keyH + gap;
    p.seq.forEach((v, i) => {
      const r = Math.floor(i / p.cols), cI = i % p.cols;
      const x = gx + cI * c, y = gy + r * rowH;
      const demo = i < p.demo;
      // berilgan qism
      if (p.mode === 'digit') drawSign(ctx, 'digit', p.signs[v], x + c / 2, y + c / 2, c * 0.8);
      else drawDigit(ctx, v + 1, x + c / 2, y + c / 2, c);
      // javob katagi
      ctx.save();
      ctx.fillStyle = demo ? '#F3F4F6' : '#fff'; ctx.fillRect(x + c * 0.08, y + c, c * 0.84, c * 0.95);
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.25, 0.35 * scale); ctx.strokeRect(x + c * 0.08, y + c, c * 0.84, c * 0.95);
      ctx.restore();
      if (demo || showSolution) {
        const color = demo ? '#6B7280' : ANSWER;
        if (p.mode === 'digit') drawDigit(ctx, v + 1, x + c / 2, y + c * 1.475, c * 0.9, color);
        else drawSign(ctx, 'symbol', p.signs[v], x + c / 2, y + c * 1.475, c * 0.85, color);
      }
    });

    timeLine(ctx, box.x + box.w / 2, gy + p.rows * rowH + gap + timeH * 0.7, scale, lang);
    drawRule(ctx, rule, box.x + box.w / 2, gy + p.rows * rowH + gap + timeH + gap);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const n = p.rows * p.cols - p.demo;
    const T = { uz: `To'ldiriladigan kataklar: ${n} ta`, ru: `Заполнить клеток: ${n}`, en: `Cells to fill: ${n}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    if (new Set(p.signs).size !== p.signs.length) problems.push('repeated sign in the key');
    if (p.seq.length !== p.rows * p.cols) problems.push('cell count');
    const work = p.seq.slice(p.demo);
    for (let k = 0; k < p.signs.length; k++) if (!work.includes(k)) problems.push(`key ${k + 1} never asked`);
    p.seq.forEach((v, i) => { if (i && v === p.seq[i - 1]) problems.push(`cells ${i - 1},${i} repeat`); if (v < 0 || v >= p.signs.length) problems.push('bad value'); });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-coding" aria-hidden="true"><defs><linearGradient id="cg-coding" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4facfe"/><stop offset="1" stop-color="#00c6fb"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-coding)"/><rect x="30" y="34" width="140" height="56" rx="8" fill="#fff"/><g stroke="#1e3a8a" stroke-width="2" opacity=".3"><path d="M65 34v56M100 34v56M135 34v56M30 62h140"/></g><g fill="none" stroke="#1e3a8a" stroke-width="4"><circle cx="47.5" cy="48" r="8"/><path d="M82.5 40 l9 15 h-18 Z"/><rect x="110" y="41" width="15" height="15"/><path d="M152.5 40 v16 M144.5 48 h16"/></g><g font-family="Nunito, sans-serif" font-weight="900" font-size="20" fill="#1e3a8a" text-anchor="middle"><text x="47.5" y="84">1</text><text x="82.5" y="84">2</text><text x="117.5" y="84">3</text><text x="152.5" y="84">4</text></g><rect x="30" y="106" width="140" height="64" rx="8" fill="#fff"/><g fill="none" stroke="#1e3a8a" stroke-width="4"><rect x="40" y="114" width="15" height="15"/><path d="M82.5 113 l9 15 h-18 Z"/><circle cx="117.5" cy="121" r="8"/><path d="M152.5 113 v16 M144.5 121 h16"/></g><g fill="#fff" stroke="#93c5fd" stroke-width="2"><rect x="36" y="136" width="23" height="26" rx="3"/><rect x="71" y="136" width="23" height="26" rx="3"/><rect x="106" y="136" width="23" height="26" rx="3"/><rect x="141" y="136" width="23" height="26" rx="3"/></g><g font-family="Nunito, sans-serif" font-weight="900" font-size="20" fill="#DC2626" text-anchor="middle"><text class="cd-a" x="47.5" y="156">3</text><text class="cd-b" x="82.5" y="156">2</text><text class="cd-c" x="117.5" y="156">1</text></g></svg>`
};
