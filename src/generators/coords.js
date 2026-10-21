// coords.js — «Koordinatalar bo'yicha chiz» (Рисуем по координатам) generatori.
// Tepada nuqtalar ro'yxati: (B; 3), (C; 5) … yoki (2; 3), (4; 5) …. Bola ularni to'rda topib, tartib bilan
// tutashtiradi; oxirgi nuqta birinchisiga ulanadi — rasm chiqadi.
//  • «Harf va son» — gorizontal o'qda harflar (A, B, C …), vertikalda sonlar (1, 2, 3 …), shaxmat kabi;
//  • «Sonlar (x; y)» — koordinata tekisligi: ikkala o'qda ham sonlar, boshlanishi (0; 0).
// Rasmlar konturli rasmlardan avtomatik olinadi (gridpics.js).
// Kafolat (check()): barcha nuqtalar to'r ichida va butun sonli; ketma-ket ikki nuqta bir xil emas.

import { makeRng, pickOne } from '../core/rng.js';
import { INK, MUTE, ANSWER, font } from '../core/draw.js';
import { gridPicture, LINE_SMALL, LINE_BIG } from '../core/gridpics.js';
import { scaleOf, measureRule, drawRule } from '../core/parts.js';
import { picName } from '../core/pictures.js';

const LEVELS = [
  { N: 10, diag: false, keys: LINE_SMALL },
  { N: 14, diag: true, keys: LINE_SMALL },
  { N: 18, diag: true, keys: LINE_BIG },
  { N: 22, diag: true, keys: LINE_BIG }
];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const MODES = {
  chess: { big: 'B3', label: { uz: 'Harf va son', ru: 'Буква и число', en: 'Letter and number' } },
  xy: { big: '(2;3)', label: { uz: 'Sonlar (x; y)', ru: 'Числа (x; y)', en: 'Numbers (x; y)' } }
};
const RULE = {
  chess: {
    uz: "Har bir nuqtani to'rda top: avval harf (pastda), keyin son (chapda). Nuqtalarni tartib bilan to'g'ri chiziq bilan tutashtir, oxirgisini birinchisiga ula. Qanday rasm chiqdi?",
    ru: 'Найди каждую точку: сначала буква (внизу), потом число (слева). Соедини точки по порядку прямыми линиями, последнюю — с первой. Что получилось?',
    en: 'Find each point: first the letter (along the bottom), then the number (up the side). Join the points in order with straight lines, and the last one to the first. What did you draw?'
  },
  xy: {
    uz: "Har bir nuqtani koordinatasi bo'yicha top: birinchi son — o'ngga (x), ikkinchisi — yuqoriga (y). Nuqtalarni tartib bilan tutashtir, oxirgisini birinchisiga ula. Qanday rasm chiqdi?",
    ru: 'Найди каждую точку по координатам: первое число — вправо (x), второе — вверх (y). Соедини точки по порядку, последнюю — с первой. Что получилось?',
    en: 'Find each point by its coordinates: the first number goes right (x), the second goes up (y). Join the points in order, and the last one to the first. What did you draw?'
  }
};

export default {
  id: 'coords',
  skills: ['spatial', 'counting'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: "Koordinatalar bo'yicha chiz", ru: 'Рисуем по координатам', en: 'Draw by coordinates' },
  desc: {
    uz: "(B; 3), (C; 5) kabi nuqtalarni to'rda topib, tartib bilan tutashtirib rasm hosil qilish",
    ru: 'Найти на сетке точки вида (B; 3), (C; 5) и соединить по порядку — получится рисунок',
    en: 'Plot points like (B; 3), (C; 5) on a grid and join them in order to make a picture'
  },
  fileBase: { uz: "Koordinatalar bo'yicha chiz", ru: 'Рисуем по координатам', en: 'Draw by coordinates' },
  defaultTitle: { uz: 'Nuqtalarni tutashtir!', ru: 'Соедини точки!', en: 'Join the points!' },
  options: [
    { key: 'level', type: 'level', default: 1 },
    {
      key: 'mode', type: 'choice', style: 'cards', pack: 'select', default: 'chess',
      label: { uz: 'Turi', ru: 'Вид', en: 'Kind' },
      choices: Object.entries(MODES).map(([value, m]) => ({ value, big: m.big, label: m.label }))
    }
  ],
  levelHint: {
    uz: ["10 katak, faqat to'g'ri chiziqlar", '14 katak, qiyshiq chiziqlar ham bor', "18 katak, nuqtalar ko'proq", "22 katak, nuqtalar ko'p"],
    ru: ['10 клеток, только прямые линии', '14 клеток, есть наклонные линии', '18 клеток, больше точек', '22 клетки, много точек'],
    en: ['10 squares, straight lines only', '14 squares, slanted lines too', '18 squares, more points', '22 squares, many points']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const mode = opts.mode in MODES ? opts.mode : 'chess';
    const L = LEVELS[level];
    const N = opts.perPage === 4 ? Math.min(L.N, 10) : opts.perPage === 2 ? Math.min(L.N, 14) : L.N;
    const rand = makeRng(seed);
    let key, pic;
    for (let t = 0; t < 30; t++) {
      key = pickOne(rand, L.keys);
      pic = gridPicture(key, N, { diag: L.diag });
      if (pic.poly.length >= 5 && pic.w + 2 < LETTERS.length) break;
    }
    // To'r: rasm atrofida 1 katak bo'sh joy; y o'qi pastdan yuqoriga
    const gw = pic.w + 2, gh = pic.h + 2;
    const pts = pic.poly.map(([x, y]) => [x + 1, gh - (y + 1)]);
    return { level, seed, mode, key, gw, gh, pts };
  },

  info(p, lang) {
    return { uz: `${p.pts.length} ta nuqta`, ru: `${p.pts.length} точек`, en: `${p.pts.length} points` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box);
    const rule = measureRule(ctx, RULE[p.mode][lang] || RULE[p.mode].uz, box.w, scale);
    const gap = 3.5 * scale;
    const label = ([x, y]) => (p.mode === 'chess' ? `${LETTERS[x]}; ${y + 1}` : `${x}; ${y}`);
    // Nuqtalar ro'yxati: «1) (B; 3)» bo'laklari
    const fs = (p.pts.length > 40 ? 3.2 : 3.8) * scale;
    font(ctx, fs, 700);
    const items = p.pts.map((pt, i) => `${i + 1}) (${label(pt)})`);
    const itemW = Math.max(...items.map(t => ctx.measureText(t).width)) + fs * 1.2;
    const perRow = Math.max(1, Math.floor(box.w / itemW));
    const nRows = Math.ceil(items.length / perRow);
    const listH = nRows * fs * 1.5;
    // To'r (chiziqlar kesishgan joylar — nuqtalar); chap va pastda o'q belgilari
    const axisW = fs * 1.6;
    const cs = Math.min((box.w - axisW) / p.gw, (box.h - listH - rule.h - 3 * gap - axisW) / p.gh, 9);
    const W = p.gw * cs, H = p.gh * cs;
    const blockH = listH + gap + H + axisW + gap + rule.h;
    const top = box.y + Math.max(0, (box.h - blockH) * 0.3);
    const lx = box.x + (box.w - Math.min(items.length, perRow) * itemW) / 2;
    items.forEach((t, i) => {
      font(ctx, fs, 700);
      ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(t, lx + (i % perRow) * itemW, top + Math.floor(i / perRow) * fs * 1.5);
    });
    const gx = box.x + (box.w - W - axisW) / 2 + axisW, gy = top + listH + gap;
    ctx.strokeStyle = '#C7CDD6'; ctx.lineWidth = Math.max(0.15, 0.22 * scale);
    ctx.beginPath();
    for (let i = 0; i <= p.gw; i++) { ctx.moveTo(gx + i * cs, gy); ctx.lineTo(gx + i * cs, gy + H); }
    for (let j = 0; j <= p.gh; j++) { ctx.moveTo(gx, gy + j * cs); ctx.lineTo(gx + W, gy + j * cs); }
    ctx.stroke();
    // O'qlar
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.35, 0.5 * scale);
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + H); ctx.lineTo(gx + W, gy + H); ctx.stroke();
    const afs = Math.min(cs * 0.55, 3.4 * scale);
    font(ctx, afs, 700);
    ctx.fillStyle = MUTE; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
    for (let i = 0; i <= p.gw; i++) ctx.fillText(p.mode === 'chess' ? LETTERS[i] : String(i), gx + i * cs, gy + H + afs * 0.35);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let j = 0; j <= p.gh; j++) {
      if (p.mode === 'xy' && j === 0) continue;                // 0 pastda bitta yoziladi
      ctx.fillText(p.mode === 'chess' ? String(j + 1) : String(j), gx - afs * 0.4, gy + H - j * cs);
    }
    const at = ([x, y]) => [gx + x * cs, gy + H - y * cs];
    if (showSolution) {
      ctx.save(); ctx.strokeStyle = ANSWER; ctx.lineWidth = Math.max(0.5, cs * 0.09); ctx.lineJoin = 'round';
      ctx.beginPath();
      p.pts.forEach((pt, i) => { const [x, y] = at(pt); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.closePath(); ctx.stroke();
      ctx.fillStyle = ANSWER;
      p.pts.forEach(pt => { const [x, y] = at(pt); ctx.beginPath(); ctx.arc(x, y, Math.max(0.45, cs * 0.09), 0, Math.PI * 2); ctx.fill(); });
      font(ctx, Math.max(2.6, 9 * 0.3528 * scale * 1.2), 800);
      ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillText(picName(p.key, lang), gx + W - cs * 0.2, gy + cs * 0.2);
      ctx.restore();
    }
    drawRule(ctx, rule, box.x + box.w / 2, gy + H + axisW + gap);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const T = { uz: `Rasm: ${picName(p.key, 'uz')} · ${p.pts.length} ta nuqta`, ru: `Рисунок: ${picName(p.key, 'ru')} · ${p.pts.length} точек`, en: `Picture: ${picName(p.key, 'en')} · ${p.pts.length} points` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    if (p.pts.length < 4) problems.push('too few points');
    if (p.gw >= LETTERS.length) problems.push('grid too wide for letters');
    p.pts.forEach(([x, y], i) => {
      if (!Number.isInteger(x) || !Number.isInteger(y)) problems.push('non-integer point');
      if (x < 0 || x > p.gw || y < 0 || y > p.gh) problems.push('point outside');
      const [px, py] = p.pts[(i + 1) % p.pts.length];
      if (px === x && py === y) problems.push('repeated point');
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-coords" aria-hidden="true"><defs><linearGradient id="cg-coords" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5ee7df"/><stop offset="1" stop-color="#b490ca"/></linearGradient><pattern id="crd-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#c4b5fd" stroke-width="1"/></pattern></defs><rect width="200" height="200" rx="28" fill="url(#cg-coords)"/><rect x="40" y="26" width="140" height="140" fill="#fff"/><rect x="40" y="26" width="140" height="140" fill="url(#crd-grid)"/><path d="M40 26 V166 H180" fill="none" stroke="#312e81" stroke-width="3"/><g font-family="Nunito, sans-serif" font-weight="800" font-size="13" fill="#312e81" text-anchor="middle"><text x="60" y="184">A</text><text x="80" y="184">B</text><text x="100" y="184">C</text><text x="120" y="184">D</text><text x="140" y="184">E</text><text x="30" y="150">1</text><text x="30" y="130">2</text><text x="30" y="110">3</text><text x="30" y="90">4</text></g><path class="cr-path" pathLength="100" d="M80 146 L80 106 L100 86 L120 106 L120 146 Z" fill="none" stroke="#DC2626" stroke-width="4" stroke-linejoin="round"/><g fill="#DC2626"><circle cx="80" cy="146" r="4"/><circle cx="80" cy="106" r="4"/><circle cx="100" cy="86" r="4"/><circle cx="120" cy="106" r="4"/><circle cx="120" cy="146" r="4"/></g></svg>`
};
