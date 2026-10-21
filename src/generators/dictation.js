// dictation.js — «Grafik diktant» (Графический диктант) generatori.
// Tepada ko'rsatmalar: «3 →, 1 ↑, 2 → …» — nechta katak va qaysi tomonga chiziq tortish kerak.
// Bola katakli to'rdagi yashil nuqtadan boshlab, ko'rsatmalar bo'yicha chizadi — rasm chiqadi.
// Juda qiyin darajada qiyshiq yurishlar ham bor (↗ — bitta katakni burchakdan-burchakka kesib o'tish).
// Rasmlar konturli rasmlardan avtomatik olinadi (gridpics.js).
// Kafolat (check()): ko'rsatmalar bo'yicha yurilsa, yo'l boshlanish nuqtasiga qaytib keladi va to'rdan chiqmaydi.

import { makeRng, pickOne } from '../core/rng.js';
import { INK, MUTE, ANSWER, font, roundRect } from '../core/draw.js';
import { gridPicture, LINE_SMALL, LINE_BIG } from '../core/gridpics.js';
import { scaleOf, measureRule, drawRule, drawGrid } from '../core/parts.js';
import { picName } from '../core/pictures.js';

const LEVELS = [
  { N: 14, diag: false, keys: LINE_SMALL },
  { N: 18, diag: false, keys: LINE_BIG },
  { N: 22, diag: false, keys: LINE_BIG },
  { N: 26, diag: true, keys: LINE_BIG }
];
const ARROW = { '1,0': '→', '-1,0': '←', '0,-1': '↑', '0,1': '↓', '1,-1': '↗', '1,1': '↘', '-1,1': '↙', '-1,-1': '↖' };
const RULE = {
  uz: "Yashil nuqtadan boshla. Ko'rsatmalarni tartib bilan bajar: son — nechta katak, o'q — qaysi tomonga chiziq tortish kerak. Oxirida yana yashil nuqtaga qaytasan. Qanday rasm chiqdi?",
  ru: 'Начни с зелёной точки. Выполняй указания по порядку: число — сколько клеток, стрелка — в какую сторону провести линию. В конце вернёшься к зелёной точке. Что получилось?',
  en: 'Start at the green dot. Follow the steps in order: the number is how many squares, the arrow is which way to draw. You will end up back at the green dot. What did you draw?'
};
const DIAG_NOTE = {
  uz: ' Qiyshiq o\'q (↗) — katakni burchakdan burchakka kesib o\'tish.',
  ru: ' Косая стрелка (↗) — линия через клетку из угла в угол.',
  en: ' A slanted arrow (↗) means a line across a square from corner to corner.'
};

export default {
  id: 'dictation',
  skills: ['spatial', 'attention', 'motor'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Grafik diktant', ru: 'Графический диктант', en: 'Graphic dictation' },
  desc: {
    uz: "«2 →, 1 ↑» kabi ko'rsatmalar bo'yicha katakli qog'ozda chizib, rasm hosil qilish",
    ru: 'Рисовать по клеточкам по указаниям «2 →, 1 ↑» и получить рисунок',
    en: 'Draw on squared paper following steps like “2 →, 1 ↑” to reveal a picture'
  },
  fileBase: { uz: 'Grafik diktant', ru: 'Графический диктант', en: 'Graphic dictation' },
  defaultTitle: { uz: "Ko'rsatma bo'yicha chiz!", ru: 'Рисуй по клеточкам!', en: 'Draw by the steps!' },
  options: [{ key: 'level', type: 'level', default: 1 }],
  levelHint: {
    uz: ["14 katak, ~30 ta ko'rsatma", "18 katak, ~40 ta ko'rsatma", "22 katak, ~55 ta ko'rsatma", "26 katak, qiyshiq yurishlar ham bor"],
    ru: ['14 клеток, ~30 шагов', '18 клеток, ~40 шагов', '22 клетки, ~55 шагов', '26 клеток, есть косые шаги'],
    en: ['14 squares, ~30 steps', '18 squares, ~40 steps', '22 squares, ~55 steps', '26 squares, slanted steps too']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level];
    const N = opts.perPage === 4 ? Math.min(L.N, 12) : opts.perPage === 2 ? Math.min(L.N, 16) : L.N;
    const rand = makeRng(seed);
    let key, pic;
    for (let t = 0; t < 30; t++) {
      key = pickOne(rand, L.keys);
      pic = gridPicture(key, N, { diag: L.diag });
      if (pic.poly.length >= 6) break;
    }
    // Ko'rsatmalar: har bir tomon → [uzunlik, dx, dy]
    const steps = pic.poly.map((a, i) => {
      const b = pic.poly[(i + 1) % pic.poly.length];
      const dx = Math.sign(b[0] - a[0]), dy = Math.sign(b[1] - a[1]);
      return [Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])), dx, dy];
    });
    return { level, seed, key, w: pic.w, h: pic.h, start: pic.poly[0], steps, diag: L.diag };
  },

  info(p, lang) {
    return { uz: `${p.steps.length} ta ko'rsatma`, ru: `${p.steps.length} шагов`, en: `${p.steps.length} steps` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box);
    const rule = measureRule(ctx, (RULE[lang] || RULE.uz) + (p.diag ? (DIAG_NOTE[lang] || DIAG_NOTE.uz) : ''), box.w, scale);
    const gap = 3.5 * scale;
    // Ko'rsatmalar: «3 →» bo'laklari qatorma-qator
    const fs = 5.2 * scale;
    font(ctx, fs, 800);
    const tokW = Math.max(...p.steps.map(([n]) => ctx.measureText(String(n)).width)) + fs * 1.5;
    const tokH = fs * 1.55, tgap = fs * 0.35;
    const perRow = Math.max(1, Math.floor((box.w + tgap) / (tokW + tgap)));
    const nRows = Math.ceil(p.steps.length / perRow);
    const listH = nRows * (tokH + tgap) - tgap;
    // To'r: rasm atrofida 2 katak bo'sh joy
    const cols = p.w + 4, rows = p.h + 4;
    const cs = Math.min(box.w / cols, (box.h - listH - rule.h - 3 * gap) / rows, 8);
    const W = cols * cs, H = rows * cs;
    const blockH = listH + gap + H + gap + rule.h;
    const top = box.y + Math.max(0, (box.h - blockH) * 0.25);
    const rowW = Math.min(p.steps.length, perRow) * (tokW + tgap) - tgap;
    const lx = box.x + (box.w - rowW) / 2;
    p.steps.forEach(([n, dx, dy], i) => {
      const x = lx + (i % perRow) * (tokW + tgap), y = top + Math.floor(i / perRow) * (tokH + tgap);
      roundRect(ctx, x, y, tokW, tokH, tokH * 0.3);
      ctx.fillStyle = i % 2 ? '#F3F4F6' : '#E5E7EB'; ctx.fill();
      font(ctx, fs, 800);
      ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(String(n), x + fs * 0.3, y + tokH / 2 + fs * 0.04);
      ctx.textAlign = 'right';
      ctx.fillText(ARROW[dx + ',' + dy], x + tokW - fs * 0.2, y + tokH / 2 + fs * 0.04);
    });
    const gy = top + listH + gap, gx = box.x + (box.w - W) / 2;
    drawGrid(ctx, gx, gy, cols, rows, cs, scale);
    const ox = gx + 2 * cs, oy = gy + 2 * cs;
    if (showSolution) {
      ctx.save(); ctx.strokeStyle = ANSWER; ctx.lineWidth = Math.max(0.5, cs * 0.1); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      let [x, y] = p.start;
      ctx.moveTo(ox + x * cs, oy + y * cs);
      for (const [n, dx, dy] of p.steps) { x += dx * n; y += dy * n; ctx.lineTo(ox + x * cs, oy + y * cs); }
      ctx.stroke(); ctx.restore();
      font(ctx, Math.max(2.6, 9 * 0.3528 * scale * 1.2), 800);
      ctx.fillStyle = ANSWER; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(picName(p.key, lang), gx + cs * 0.3, gy + cs * 0.3);
    }
    ctx.save(); ctx.fillStyle = '#16A34A';
    ctx.beginPath(); ctx.arc(ox + p.start[0] * cs, oy + p.start[1] * cs, Math.max(0.9, cs * 0.2), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    drawRule(ctx, rule, box.x + box.w / 2, gy + H + gap);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const T = { uz: `Rasm: ${picName(p.key, 'uz')} · ${p.steps.length} ta ko'rsatma`, ru: `Рисунок: ${picName(p.key, 'ru')} · ${p.steps.length} шагов`, en: `Picture: ${picName(p.key, 'en')} · ${p.steps.length} steps` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    let [x, y] = p.start;
    for (const [n, dx, dy] of p.steps) {
      if (!(n >= 1) || !Number.isInteger(n)) problems.push('bad step length');
      if (!p.diag && dx && dy) problems.push('diagonal step on a straight-only level');
      x += dx * n; y += dy * n;
      if (x < 0 || x > p.w || y < 0 || y > p.h) problems.push('path leaves the picture area');
    }
    if (x !== p.start[0] || y !== p.start[1]) problems.push('path does not return to the start');
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-dictation" aria-hidden="true"><defs><linearGradient id="cg-dictation" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffecd2"/><stop offset="1" stop-color="#fcb69f"/></linearGradient><pattern id="dict-grid" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M14 0H0V14" fill="none" stroke="#fdba74" stroke-width="1"/></pattern></defs><rect width="200" height="200" rx="28" fill="url(#cg-dictation)"/><rect x="24" y="22" width="152" height="30" rx="8" fill="#fff"/><g font-family="Nunito, sans-serif" font-weight="900" font-size="17" fill="#7c2d12"><text x="34" y="43">3→</text><text x="74" y="43">2↑</text><text x="112" y="43">1→</text><text x="146" y="43">4↓</text></g><rect x="24" y="62" width="152" height="116" rx="6" fill="#fff"/><rect x="24" y="62" width="152" height="116" fill="url(#dict-grid)"/><path class="dc-path" pathLength="100" d="M52 160 V118 H66 V90 H94 V118 H122 V104 H136 V160 Z" fill="none" stroke="#c2410c" stroke-width="5" stroke-linejoin="round"/><circle cx="52" cy="160" r="6" fill="#16A34A"/></svg>`
};
