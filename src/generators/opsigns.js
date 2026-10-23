// opsigns.js — «Amal belgilarini qo'y» (Расставь знаки / Put in the signs) generatori. v2.8
// 6 □ 3 □ 2 □ 4 = 10 kabi tenglikda kataklarga + − × ÷ belgilaridan mosini qo'yish kerak.
// Hisoblash odatdagi tartibda: avval ko'paytirish va bo'lish, keyin qo'shish va ayirish.
// Kafolat (check()): barcha belgilar kombinatsiyasi sinab ko'riladi — tenglikni faqat bittasi to'g'ri qiladi.
// Qolip: rus IQ kitobi M14, 2.31-savol.

import { makeRng, randInt, pickOne } from '../core/rng.js';
import { INK, MUTE, PT, font } from '../core/draw.js';
import { scaleOf, measureRule, drawRule, ruPlural } from '../core/parts.js';
import { evalOps, measureTokens, drawTokens } from './numkit.js';

// n — sonlar soni; ops — ishlatiladigan belgilar; hi — sonlar oralig'i; max — natija chegarasi; count — [1, 2, 4 tadan]
const LEVELS = [
  { n: 3, ops: ['+', '-'], hi: 10, max: 30, count: [10, 5, 3] },
  { n: 4, ops: ['+', '-'], hi: 15, max: 50, count: [10, 5, 3] },
  { n: 4, ops: ['+', '-', '*'], hi: 9, max: 100, count: [9, 5, 3] },
  { n: 5, ops: ['+', '-', '*', '/'], hi: 9, max: 100, count: [8, 4, 2] }
];

function combos(k, ops) {
  let out = [[]];
  for (let i = 0; i < k; i++) out = out.flatMap(c => ops.map(o => [...c, o]));
  return out;
}
export function solutions(nums, target, ops) {
  return combos(nums.length - 1, ops).filter(c => evalOps(nums, c) === target);
}

function build(L, rand, used) {
  for (let guard = 0; guard < 2000; guard++) {
    const nums = Array.from({ length: L.n }, () => randInt(rand, 1, L.hi));
    const ops = Array.from({ length: L.n - 1 }, () => pickOne(rand, L.ops));
    // qiyinroq darajalarda kamida bitta × yoki ÷
    if (L.ops.length > 2 && !ops.some(o => o === '*' || o === '/')) continue;
    if (L.ops.includes('/') && !ops.includes('/')) { if (rand() < 0.6) continue; }
    const target = evalOps(nums, ops);
    if (!Number.isInteger(target) || target < 0 || target > L.max) continue;
    const k = nums.join(',') + '=' + target;
    if (used.has(k)) continue;
    if (solutions(nums, target, L.ops).length !== 1) continue;
    used.add(k);
    return { nums, ops, target };
  }
  throw new Error('opsigns: no puzzle');
}

const RULE = {
  uz: (all) => `Kataklarga ${all ? '+, −, × yoki ÷' : '+ yoki −'} belgisini qo'y: tenglik to'g'ri bo'lsin.` + (all ? " Avval ko'paytirish va bo'lish, keyin qo'shish va ayirish bajariladi." : ''),
  ru: (all) => `Поставь в клетки знаки ${all ? '+, −, × или ÷' : '+ или −'}, чтобы равенство стало верным.` + (all ? ' Сначала выполняются умножение и деление, потом сложение и вычитание.' : ''),
  en: (all) => `Put ${all ? '+, −, × or ÷' : '+ or −'} in the boxes to make each equation true.` + (all ? ' Multiplication and division are done before addition and subtraction.' : '')
};

export default {
  id: 'opsigns',
  skills: ['counting', 'logic'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: "Amal belgilarini qo'y", ru: 'Расставь знаки', en: 'Put in the signs' },
  desc: {
    uz: "Sonlar orasiga + − × ÷ belgilarini qo'yib, tenglikni to'g'ri qiling",
    ru: 'Расставьте между числами знаки + − × ÷, чтобы равенство стало верным',
    en: 'Put + − × ÷ between the numbers to make the equation true'
  },
  fileBase: { uz: "Amal belgilarini qo'y", ru: 'Расставь знаки', en: 'Put in the signs' },
  defaultTitle: { uz: "Belgilarni qo'y!", ru: 'Расставь знаки!', en: 'Fill in the signs!' },
  options: [{ key: 'level', type: 'level', default: 1 }],
  levelHint: {
    uz: ['3 ta son, + va −', '4 ta son, + va −', '4 ta son, + − ×', '5 ta son, + − × ÷'],
    ru: ['3 числа, + и −', '4 числа, + и −', '4 числа, + − ×', '5 чисел, + − × ÷'],
    en: ['3 numbers, + and −', '4 numbers, + and −', '4 numbers, + − ×', '5 numbers, + − × ÷']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level];
    const rand = makeRng(seed);
    const count = L.count[opts.perPage === 4 ? 2 : opts.perPage === 2 ? 1 : 0];
    const used = new Set(), rows = [];
    for (let i = 0; i < count; i++) rows.push(build(L, rand, used));
    return { level, seed, all: L.ops.length > 2, rows };
  },

  info(p, lang) {
    const c = p.rows.length;
    return { uz: `${c} ta tenglik`, ru: `${c} ${ruPlural(c, 'равенство', 'равенства', 'равенств')}`, en: `${c} equation${c > 1 ? 's' : ''}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box), n = p.rows.length;
    const rule = measureRule(ctx, (RULE[lang] || RULE.uz)(p.all), box.w, scale);
    const gap = 4 * scale, numW = 10 * scale;
    const toks = r => {
      const out = [];
      r.nums.forEach((v, i) => { if (i) out.push({ t: 'box', v: r.ops[i - 1], op: true, w: 1.2 }); out.push({ t: 'n', v }); });
      out.push({ t: 'op', v: '=' }, { t: 'n', v: r.target });
      return out;
    };
    const H = box.h - rule.h - gap;
    const maxU = Math.max(...p.rows.map(r => measureTokens(ctx, toks(r), 1)));
    const fs = Math.min((box.w - numW) / maxU, H / n / 2.1, 8 * scale);
    const rowH = Math.min(H / n, fs * 2.6);
    const blockH = n * rowH;
    const x0 = box.x + (box.w - numW - maxU * fs) / 2;
    const y0 = box.y + Math.max(0, (H - blockH) * 0.3);
    p.rows.forEach((r, i) => {
      const cy = y0 + i * rowH + rowH / 2;
      if (n > 1) { font(ctx, Math.min(fs * 0.7, 4.4 * scale), 800); ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(`${i + 1}.`, x0, cy); }
      drawTokens(ctx, toks(r), x0 + numW, cy, fs, { show: showSolution, scale });
    });
    drawRule(ctx, rule, box.x + box.w / 2, y0 + blockH + gap * 0.5);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const n = p.rows.length;
    const T = { uz: `Tengliklar: ${n} ta`, ru: `Равенств: ${n}`, en: `Equations: ${n}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const L = LEVELS[p.level];
    p.rows.forEach((r, i) => {
      if (evalOps(r.nums, r.ops) !== r.target) problems.push(`#${i}: wrong target`);
      const s = solutions(r.nums, r.target, L.ops);
      if (s.length !== 1) problems.push(`#${i}: ${s.length} solutions`);
      if (r.nums.some(v => v < 1 || v > L.hi)) problems.push(`#${i}: number out of range`);
    });
    if (new Set(p.rows.map(r => r.nums.join(',') + '=' + r.target)).size !== p.rows.length) problems.push('duplicate');
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-opsigns" aria-hidden="true"><defs><linearGradient id="cg-opsigns" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbc2eb"/><stop offset="1" stop-color="#a6c1ee"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-opsigns)"/><rect x="12" y="70" width="176" height="60" rx="16" fill="#fff"/><g font-family="Nunito, sans-serif" font-weight="900" font-size="26" text-anchor="middle" fill="#111827"><text x="30" y="110">6</text><text x="80" y="110">3</text><text x="130" y="110">2</text><text x="152" y="110">=</text><text x="174" y="110">20</text></g><g fill="#fff" stroke="#111827" stroke-width="2.5"><rect x="42" y="86" width="26" height="28" rx="6"/><rect x="92" y="86" width="26" height="28" rx="6"/></g><g font-family="Nunito, sans-serif" font-weight="900" font-size="24" text-anchor="middle" fill="#DC2626"><text class="os-a" x="55" y="109">×</text><text class="os-b" x="105" y="109">+</text></g></svg>`
};
