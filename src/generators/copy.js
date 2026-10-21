// copy.js — «Nusxa ko'chir» (Срисуй по клеточкам / по точкам) generatori.
// Namunadagi rasmni yonidagi (yoki pastdagi) bo'sh to'rga aynan o'sha joyga ko'chirish:
//  • «Chiziqlar» — nuqtali to'rda chiziqli rasm (nuqtadan nuqtaga);
//  • «Kataklar» — katakli to'rda bo'yalgan kataklardan iborat rasm.
// Rasmlar konturli rasmlardan avtomatik o'tkaziladi (gridpics.js).
// Kafolat (check()): rasm to'r ichida, chiziqlar to'r nuqtalarida, ko'chiradigan narsa yetarli.

import { makeRng, pickOne } from '../core/rng.js';
import { INK, ANSWER } from '../core/draw.js';
import { gridPicture, pixelArt, countBits, PIX_SMALL, PIX_BIG, LINE_SMALL, LINE_BIG } from '../core/gridpics.js';
import { scaleOf, measureRule, drawRule, drawGrid } from '../core/parts.js';
import { picName } from '../core/pictures.js';

const LEVELS = {
  lines: [{ N: 10, diag: false, keys: LINE_SMALL, start: true }, { N: 12, diag: true, keys: LINE_SMALL, start: true }, { N: 14, diag: true, keys: LINE_BIG, start: true }, { N: 16, diag: true, keys: LINE_BIG, start: false }],
  cells: [{ N: 10, keys: PIX_SMALL }, { N: 12, keys: PIX_SMALL }, { N: 15, keys: PIX_BIG }, { N: 18, keys: PIX_BIG }]
};
const MODES = {
  lines: { big: '⠿✎', label: { uz: 'Chiziqlar', ru: 'Линии', en: 'Lines' } },
  cells: { big: '▦', label: { uz: 'Kataklar', ru: 'Клетки', en: 'Cells' } }
};
const RULE = {
  lines: {
    uz: "Rasmni bo'sh to'rga aynan o'sha nuqtalardan o'tkazib ko'chir. Nuqtalarni sanab chiz.",
    ru: 'Перерисуй рисунок на пустую сетку точно по тем же точкам. Считай точки.',
    en: 'Copy the picture onto the empty grid using exactly the same dots. Count the dots.'
  },
  cells: {
    uz: "Bo'sh to'rda aynan o'sha kataklarni bo'yab, rasmni ko'chir.",
    ru: 'Закрась на пустой сетке точно такие же клетки — перенеси рисунок.',
    en: 'Shade exactly the same squares on the empty grid to copy the picture.'
  }
};
const START = { uz: 'shu yerdan boshla', ru: 'начни отсюда', en: 'start here' };

export default {
  id: 'copy',
  skills: ['spatial', 'motor', 'attention'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: "Nusxa ko'chir", ru: 'Срисуй по клеточкам', en: 'Copy the picture' },
  desc: {
    uz: "Nuqtali yoki katakli to'rdagi rasmni yonidagi bo'sh to'rga ko'chirish",
    ru: 'Перерисовать рисунок по точкам или клеткам на соседнюю пустую сетку',
    en: 'Copy a picture onto an empty dot or square grid next to it'
  },
  fileBase: { uz: "Nusxa ko'chir", ru: 'Срисуй по клеточкам', en: 'Copy the picture' },
  defaultTitle: { uz: "Rasmni ko'chir!", ru: 'Срисуй!', en: 'Copy it!' },
  options: [
    { key: 'level', type: 'level', default: 1 },
    {
      key: 'mode', type: 'choice', style: 'cards', pack: 'select', default: 'lines',
      label: { uz: 'Turi', ru: 'Вид', en: 'Kind' },
      choices: Object.entries(MODES).map(([value, m]) => ({ value, big: m.big, label: m.label }))
    }
  ],
  levelHint: {
    uz: ["Rasm 10 nuqta, faqat to'g'ri chiziqlar (kataklarda — 10 katak)", "12 nuqta, qiyshiq chiziqlar ham bor (12 katak)", '14 nuqta, murakkabroq rasmlar (15 katak)', "16 nuqta, boshlanish nuqtasi ko'rsatilmaydi (18 katak)"],
    ru: ['Рисунок 10 точек, только прямые линии (в клетках — 10 клеток)', '12 точек, есть наклонные линии (12 клеток)', '14 точек, рисунки сложнее (15 клеток)', '16 точек, начальная точка не указана (18 клеток)'],
    en: ['10-dot picture, straight lines only (cells: 10 squares)', '12 dots, slanted lines too (12 squares)', '14 dots, harder pictures (15 squares)', '16 dots, no start point (18 squares)']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const mode = opts.mode in MODES ? opts.mode : 'lines';
    const L = LEVELS[mode][level];
    const N = opts.perPage === 4 ? Math.min(L.N, 12) : L.N;
    const rand = makeRng(seed);
    let key, pic;
    for (let t = 0; t < 30; t++) {
      key = pickOne(rand, L.keys);
      pic = mode === 'lines' ? gridPicture(key, N, { diag: L.diag }) : pixelArt(key, N);
      if (mode === 'lines' ? pic.poly.length >= 4 : countBits(pic.bits) >= 10) break;
    }
    const out = { level, seed, mode, key, N, w: pic.w, h: pic.h, start: !!L.start };
    if (mode === 'lines') out.poly = pic.poly; else out.bits = pic.bits;
    return out;
  },

  info(p, lang) {
    return { uz: `${picName(p.key, 'uz')}, ${p.w}×${p.h}`, ru: `${picName(p.key, 'ru')}, ${p.w}×${p.h}`, en: `${picName(p.key, 'en')}, ${p.w}×${p.h}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box);
    const rule = measureRule(ctx, RULE[p.mode][lang] || RULE[p.mode].uz, box.w, scale);
    const gap = 4 * scale, mid = 7 * scale;
    const cols = p.w + 2, rows = p.h + 2;
    // Yonma-yon yoki ustma-ust: qaysi biri kattaroq katak bersa
    const avail = box.h - rule.h - gap;
    const csSide = Math.min((box.w - mid) / (2 * cols), avail / rows, 12);
    const csStack = Math.min(box.w / cols, (avail - mid) / (2 * rows), 12);
    const side = csSide >= csStack;
    const cs = side ? csSide : csStack;
    const W = cols * cs, H = rows * cs;
    const blockW = side ? 2 * W + mid : W, blockH = side ? H : 2 * H + mid;
    const top = box.y + Math.max(0, (avail - blockH) * 0.35);
    const left = box.x + (box.w - blockW) / 2;
    const grids = side ? [[left, top], [left + W + mid, top]] : [[left, top], [left, top + H + mid]];

    grids.forEach(([gx, gy], gi) => {
      const ox = gx + cs, oy = gy + cs;
      const show = gi === 0 || showSolution;
      const color = gi === 0 ? INK : ANSWER;
      if (p.mode === 'cells') {
        if (show) {
          ctx.fillStyle = gi === 0 ? '#374151' : '#F08A8A';
          p.bits.forEach((row, r) => row.forEach((v, c) => { if (v) ctx.fillRect(ox + c * cs, oy + r * cs, cs, cs); }));
        }
        drawGrid(ctx, gx, gy, cols, rows, cs, scale);
      } else {
        drawGrid(ctx, gx, gy, cols, rows, cs, scale, { dots: true });
        if (show) {
          ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = Math.max(0.45, cs * 0.09); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
          ctx.beginPath();
          p.poly.forEach(([x, y], i) => (i ? ctx.lineTo(ox + x * cs, oy + y * cs) : ctx.moveTo(ox + x * cs, oy + y * cs)));
          ctx.closePath(); ctx.stroke(); ctx.restore();
        }
        if (p.start) {                                     // boshlanish nuqtasi ikkala to'rda ham
          const [sx, sy] = p.poly[0];
          ctx.save(); ctx.fillStyle = '#16A34A';
          ctx.beginPath(); ctx.arc(ox + sx * cs, oy + sy * cs, Math.max(0.8, cs * 0.18), 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      }
    });
    drawRule(ctx, rule, box.x + box.w / 2, top + blockH + gap);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const T = { uz: `Rasm: ${picName(p.key, 'uz')}`, ru: `Рисунок: ${picName(p.key, 'ru')}`, en: `Picture: ${picName(p.key, 'en')}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    if (p.mode === 'lines') {
      if (!p.poly || p.poly.length < 4) problems.push('outline too short');
      else for (const [x, y] of p.poly) {
        if (!Number.isInteger(x) || !Number.isInteger(y)) problems.push('vertex off the grid');
        if (x < 0 || x > p.w || y < 0 || y > p.h) problems.push('vertex outside');
      }
    } else if (countBits(p.bits) < 8) problems.push('too few cells');
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-copy" aria-hidden="true"><defs><linearGradient id="cg-copy" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#84fab0"/><stop offset="1" stop-color="#8fd3f4"/></linearGradient><pattern id="copy-dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r="1.8" fill="#64748b"/></pattern></defs><rect width="200" height="200" rx="28" fill="url(#cg-copy)"/><rect x="18" y="50" width="78" height="100" rx="6" fill="#fff"/><rect x="104" y="50" width="78" height="100" rx="6" fill="#fff"/><rect x="18" y="50" width="78" height="100" fill="url(#copy-dots)"/><rect x="104" y="50" width="78" height="100" fill="url(#copy-dots)"/><path d="M39 133 V91 L57 77 L75 91 V133 Z" fill="none" stroke="#0f172a" stroke-width="4" stroke-linejoin="round"/><path class="cp-draw" pathLength="100" d="M125 133 V91 L143 77 L161 91 V133 Z" fill="none" stroke="#DC2626" stroke-width="4" stroke-linejoin="round"/></svg>`
};
