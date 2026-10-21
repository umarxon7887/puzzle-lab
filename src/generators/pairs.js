// pairs.js — «Juftini top» (Найди пару) generatori: ikki ustundagi mos narsalarni chiziq bilan tutashtirish.
// Turlari:
//   same    — bir xil rasmlar (qiyin darajalarda o'ngdagisi burilgan yoki ko'zgudagi aksi);
//   words   — rasm va uning nomi (o'qishni o'rganayotganlar uchun; nom tanlangan tilda);
//   numbers — rasmlar guruhi va son (nechta bo'lsa, o'sha son bilan).
// Juda qiyin darajada o'ng ustunda bitta ortiqcha narsa bor (jufti yo'q).
// Kafolat (check()): har bir chap narsaning o'ngda aynan bitta jufti bor.

import { makeRng, shuffle } from '../core/rng.js';
import { INK, MUTE, PT, font } from '../core/draw.js';
import { PIC_KEYS, picGroup, picName, drawPic, picMap, isAsymmetric, silhouetteDistance } from '../core/pictures.js';
import { scaleOf, measureRule, drawRule, cellBox, line, dot, ruPlural, COLORS } from '../core/parts.js';

// n — juftlar soni; turn — o'ngdagi rasm buriladi/aks etadi; extra — o'ngda ortiqcha narsa; nums — sonlar oralig'i
const LEVELS = [
  { n: 4, turn: false, extra: false, nums: [1, 5] },
  { n: 5, turn: false, extra: false, nums: [1, 6] },
  { n: 6, turn: true, extra: false, nums: [2, 9] },
  { n: 7, turn: true, extra: true, nums: [3, 10] }
];
const SMALL_N = 4;

function pickPics(n, rand) {
  const out = [], groups = new Set();
  for (const k of shuffle(PIC_KEYS.slice(), rand)) {
    const g = picGroup(k);
    if (g && groups.has(g)) continue;
    if (out.some(o => silhouetteDistance(o, k) < 0.1)) continue;
    out.push(k); if (g) groups.add(g);
    if (out.length === n) break;
  }
  return out;
}

const RULES = {
  same: { uz: 'Bir xil rasmlarni chiziq bilan tutashtir.', ru: 'Соедини одинаковые картинки линией.', en: 'Draw a line to join the matching pictures.' },
  words: { uz: "Har bir rasmni uning nomi bilan chiziq orqali tutashtir.", ru: 'Соедини каждую картинку с её названием.', en: 'Join each picture to its name.' },
  numbers: { uz: "Har bir guruhdagi rasmlarni sanab, to'g'ri son bilan tutashtir.", ru: 'Посчитай картинки в каждой группе и соедини с нужным числом.', en: 'Count the pictures in each group and join them to the right number.' }
};
const EXTRA = { uz: "O'ngda bittasi ortiqcha!", ru: 'Справа одно лишнее!', en: 'One on the right has no pair!' };
const MODES = {
  same: { big: '🧦', label: { uz: 'Bir xil', ru: 'Одинаковые', en: 'Same' } },
  words: { big: '🔤', label: { uz: "So'zlar", ru: 'Слова', en: 'Words' } },
  numbers: { big: '🔢', label: { uz: 'Sonlar', ru: 'Числа', en: 'Numbers' } }
};

// Guruhdagi n ta kichik rasm (sonlar turi uchun): eni w, bo'yi h bo'lgan joyga teng taqsimlab
function drawGroup(ctx, pic, n, cx, cy, w, h, color) {
  let best = null;
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols), s = Math.min(w / cols, h / rows);
    if (!best || s > best.s) best = { cols, rows, s };
  }
  const { cols, rows, s } = best;
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols), c = i % cols, inRow = Math.min(cols, n - r * cols);
    drawPic(ctx, pic, picMap(cx + (c - (inRow - 1) / 2) * s, cy + (r - (rows - 1) / 2) * s, s * 0.82), color);
  }
}

export default {
  id: 'pairs',
  name: { uz: 'Juftini top', ru: 'Найди пару', en: 'Match the pairs' },
  desc: {
    uz: "Ikki ustundagi mos rasmlarni, so'zlarni yoki sonlarni chiziq bilan tutashtiring",
    ru: 'Соедините линией подходящие картинки, слова или числа',
    en: 'Join matching pictures, words or numbers with a line'
  },
  fileBase: { uz: 'juftini top', ru: 'Найди пару', en: 'Match the pairs' },
  defaultTitle: { uz: 'Juftini top!', ru: 'Найди пару!', en: 'Match the pairs!' },
  options: [
    { key: 'level', type: 'level', default: 0 },
    {
      key: 'mode', type: 'choice', style: 'cards', pack: 'select', default: 'same',
      label: { uz: 'Turi', ru: 'Вид', en: 'Kind' },
      choices: Object.entries(MODES).map(([value, m]) => ({ value, big: m.big, label: m.label }))
    }
  ],
  levelHint: {
    uz: ['4 juft', '5 juft', "6 juft, rasmlar burilgan, sonlar 9 gacha", "7 juft, bittasi ortiqcha, sonlar 10 gacha"],
    ru: ['4 пары', '5 пар', '6 пар, картинки повёрнуты, числа до 9', '7 пар, одно лишнее, числа до 10'],
    en: ['4 pairs', '5 pairs', '6 pairs, turned pictures, numbers up to 9', '7 pairs, one extra, numbers up to 10']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const mode = opts.mode in MODES ? opts.mode : 'same';
    const L = LEVELS[level];
    const small = opts.perPage > 1 || opts.aspect === 'landscape';
    const n = small ? Math.min(L.n, SMALL_N) : L.n;
    const extra = L.extra && !small;
    const rand = makeRng(seed);
    const pics = pickPics(n + (extra ? 1 : 0), rand);
    const left = pics.slice(0, n).map(pic => ({ pic }));
    if (mode === 'numbers') {
      const lo = L.nums[0], hi = small ? Math.max(lo + n + 1, Math.min(L.nums[1], 6)) : L.nums[1];
      const vals = shuffle(Array.from({ length: hi - lo + 1 }, (_, i) => lo + i), rand).slice(0, n + (extra ? 1 : 0));
      left.forEach((it, i) => { it.n = vals[i]; });
      if (extra) left.extraN = vals[n];
    }
    // O'ng ustun: chapdagilarning juftlari (aralash tartibda) + ortiqchasi
    const right = left.map((it, i) => {
      const r = { of: i };
      if (mode === 'same' && L.turn) {
        r.rot = Math.round((rand() * 2 - 1) * (level === 3 ? 70 : 40));
        if (isAsymmetric(it.pic) && rand() < 0.5) r.flip = true;
      }
      return r;
    });
    if (extra) right.push(mode === 'numbers' ? { of: -1, n: left.extraN } : { of: -1, pic: pics[n] });
    delete left.extraN;
    shuffle(right, rand);
    return { level, seed, mode, left, right };
  },

  info(p, lang) {
    const n = p.left.length, m = MODES[p.mode].label[lang] || MODES[p.mode].label.uz;
    return { uz: `${n} juft, ${m.toLowerCase()}`, ru: `${n} ${ruPlural(n, 'пара', 'пары', 'пар')}, ${m.toLowerCase()}`, en: `${n} pairs, ${m.toLowerCase()}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box);
    const extra = p.right.length > p.left.length;
    const text = (RULES[p.mode][lang] || RULES[p.mode].uz) + (extra ? ' ' + (EXTRA[lang] || EXTRA.uz) : '');
    const rule = measureRule(ctx, text, box.w, scale);
    const gap = 4 * scale;
    const rows = Math.max(p.left.length, p.right.length);
    const availH = box.h - rule.h - gap;
    const rowH = Math.min(availH / rows, 44 * scale);
    const cell = rowH * 0.82;
    const leftW = p.mode === 'numbers' ? Math.min(cell * 2.2, box.w * 0.36) : cell;
    const rightW = p.mode === 'words' ? Math.min(box.w * 0.36, cell * 2.6) : cell;
    const top = box.y + Math.max(0, (box.h - (rows * rowH + gap + rule.h)) * 0.35);
    const lx = box.x + box.w * 0.08, rx = box.x + box.w * 0.92 - rightW;
    const dotR = Math.max(0.8, 1.2 * scale);
    const lyOf = i => top + (i + 0.5) * rowH * rows / p.left.length;
    const ryOf = j => top + (j + 0.5) * rowH;
    const ldx = lx + leftW + dotR * 3, rdx = rx - dotR * 3;

    p.left.forEach((it, i) => {
      const cy = lyOf(i);
      cellBox(ctx, lx, cy - cell / 2, leftW, cell, scale);
      if (p.mode === 'numbers') drawGroup(ctx, it.pic, it.n, lx + leftW / 2, cy, leftW * 0.9, cell * 0.86, INK);
      else drawPic(ctx, it.pic, picMap(lx + leftW / 2, cy, cell * 0.8), INK);
      dot(ctx, ldx, cy, dotR);
    });
    p.right.forEach((r, j) => {
      const cy = ryOf(j), src = r.of >= 0 ? p.left[r.of] : r;
      cellBox(ctx, rx, cy - cell / 2, rightW, cell, scale);
      if (p.mode === 'same') drawPic(ctx, src.pic, picMap(rx + rightW / 2, cy, cell * 0.8, r.rot || 0, !!r.flip), INK);
      else if (p.mode === 'words') {
        const t = picName(src.pic, lang);
        let fs = Math.min(cell * 0.3, 14 * PT * scale);
        font(ctx, fs, 800);
        const w = ctx.measureText(t).width;
        if (w > rightW * 0.88) { fs *= rightW * 0.88 / w; font(ctx, fs, 800); }
        ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(t, rx + rightW / 2, cy + fs * 0.05);
      } else {
        font(ctx, cell * 0.55, 800);
        ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(r.of >= 0 ? src.n : r.n), rx + rightW / 2, cy + cell * 0.03);
      }
      dot(ctx, rdx, cy, dotR);
      if (showSolution && r.of >= 0) line(ctx, ldx, lyOf(r.of), rdx, cy, COLORS[r.of % COLORS.length], Math.max(0.5, 0.8 * scale));
      if (showSolution && r.of < 0) {                      // ortiqchasi — qizil chiziq bilan o'chirilgan
        line(ctx, rx + rightW * 0.1, cy - cell * 0.4, rx + rightW * 0.9, cy + cell * 0.4, '#DC2626', Math.max(0.5, 0.8 * scale));
      }
    });
    drawRule(ctx, rule, box.x + box.w / 2, top + rows * rowH + gap);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const n = p.left.length;
    const T = { uz: `Juftlar: ${n}`, ru: `Пар: ${n}`, en: `Pairs: ${n}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const of = p.right.map(r => r.of).filter(i => i >= 0).sort((a, b) => a - b);
    if (of.join() !== p.left.map((_, i) => i).join()) problems.push('right column is not a permutation of the left');
    const pics = p.left.map(l => l.pic).concat(p.right.filter(r => r.of < 0 && r.pic).map(r => r.pic));
    if (new Set(pics).size !== pics.length) problems.push('repeated picture');
    const groups = pics.map(picGroup).filter(Boolean);
    if (new Set(groups).size !== groups.length) problems.push('two similar pictures');
    if (p.mode === 'numbers') {
      const ns = p.left.map(l => l.n).concat(p.right.filter(r => r.of < 0).map(r => r.n));
      if (new Set(ns).size !== ns.length) problems.push('repeated number');
      if (ns.some(n => !(n >= 1 && n <= 10))) problems.push('number out of range');
    }
    if (p.mode === 'words') {
      for (const l of ['uz', 'ru', 'en']) {
        const names = pics.map(k => picName(k, l));
        if (new Set(names).size !== names.length) problems.push(`repeated ${l} name`);
      }
    }
    p.right.forEach(r => { if (r.flip && !isAsymmetric(p.left[r.of].pic)) problems.push('flipped symmetric picture'); });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-pairs" aria-hidden="true"><defs><linearGradient id="cg-pairs" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#84fab0"/><stop offset="1" stop-color="#3b82f6"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-pairs)"/><g fill="#fff"><rect x="26" y="34" width="44" height="44" rx="10"/><rect x="26" y="112" width="44" height="44" rx="10"/><rect x="130" y="34" width="44" height="44" rx="10"/><rect x="130" y="112" width="44" height="44" rx="10"/></g><circle cx="48" cy="56" r="13" fill="#3b82f6"/><path d="M48 121 l14 26 h-28 Z" fill="#10b981"/><path d="M152 43 l14 26 h-28 Z" fill="#10b981"/><circle cx="152" cy="134" r="13" fill="#3b82f6"/><g fill="none" stroke="#DC2626" stroke-width="6" stroke-linecap="round"><path class="pr-l1" d="M78 56 L122 134" pathLength="100"/><path class="pr-l2" d="M78 134 L122 56" pathLength="100"/></g></svg>`
};
