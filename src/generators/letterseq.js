// letterseq.js — «Harf qatorlari» (Буквенные ряды / Letter sequences) generatori. v2.8
// Harflar alifbodagi o'rni bo'yicha qonuniyat bilan yozilgan: A C E G ? (+2). Qiyinroqda qadamlar navbatlashadi,
// ikki qator aralashgan, qadam o'sib boradi; eng qiyinida harf va uning o'rni (A1 C3 E5 …) yoki harf juftlari.
// Varaq pastida sahifa tilining alifbosi chiziladi (oson darajalarda o'rin raqamlari bilan).
// Kafolat (check()): ko'rinib turgan hadlarga mos keladigan barcha qoidalar oilasi (arifmetik, navbatlashgan,
// ikki qator, o'suvchi qadam) «?» uchun bitta harf beradi.
// Qolip: rus IQ kitobi M17, M21, M23, 3.2, 3.27; IQ 2026 №5, 14.

import { makeRng, randInt, pickOne, shuffle } from '../core/rng.js';
import { INK, MUTE, ANSWER, PT, font } from '../core/draw.js';
import { scaleOf, measureRule, drawRule, cellBox, questionCell, ruPlural } from '../core/parts.js';
import { ALPHA } from './wordkit.js';
import { buildFig, figPredict, figAnswerKey, figValid, figSize, drawFig, figRuleText } from './letterseq-figs.js';

// O'zbek alifbosida qatorlar faqat A…Z (24 ta) ichida — O‘ G‘ SH CH NG o'rinlarida adashish bo'lmasin
export const alphaOf = lang => (lang === 'uz' ? ALPHA.uz.slice(0, 24) : ALPHA[lang] || ALPHA.en);

// kinds — qator turlari; T — hadlar soni; nums — alifbo ostida o'rin raqamlari; count — [1, 2, 4 tadan]
// Shaklli turlar (letterseq-figs.js): matrix — 3×3 jadval, star — yulduz, blocks — 2×2 bloklar, shift4 — guruh o'xshatishi
const FIG_KINDS = new Set(['matrix', 'star', 'blocks', 'shift4']);
const LEVELS = [
  { kinds: ['ar1', 'ar2', 'ar1', 'ar2', 'matrix'], T: 6, nums: true, count: [7, 4, 3] },
  { kinds: ['ar2', 'ar3', 'back', 'matrix', 'star'], T: 6, nums: true, count: [7, 4, 3] },
  { kinds: ['alt', 'inter', 'grow', 'ar3', 'blocks', 'star'], T: 7, nums: false, count: [7, 4, 3] },
  { kinds: ['num', 'pair', 'alt', 'inter', 'grow', 'shift4', 'matrix', 'blocks'], T: 6, nums: false, count: [7, 4, 3] }
];

// Pozitsiyalar ketma-ketligi (1 dan boshlab)
function positions(kind, T, N, rand) {
  for (let guard = 0; guard < 200; guard++) {
    let ps;
    if (kind === 'ar1' || kind === 'ar2' || kind === 'ar3') {
      const d = kind === 'ar1' ? 1 : kind === 'ar2' ? 2 : pickOne(rand, [3, 4]);
      const a = randInt(rand, 1, N - d * (T - 1)); ps = Array.from({ length: T }, (_, i) => a + d * i);
    } else if (kind === 'back') {
      const d = pickOne(rand, [1, 2, 3]), a = randInt(rand, 1 + d * (T - 1), N); ps = Array.from({ length: T }, (_, i) => a - d * i);
    } else if (kind === 'alt') {
      const [d1, d2] = pickOne(rand, [[1, 2], [2, 1], [1, 3], [3, -1], [2, -1], [3, 1]]);
      ps = [randInt(rand, 1, N)]; for (let i = 1; i < T; i++) ps.push(ps[i - 1] + (i % 2 ? d1 : d2));
    } else if (kind === 'inter') {
      const d1 = pickOne(rand, [1, 2]), d2 = pickOne(rand, [-1, -2, 1, 3].filter(v => v !== d1));
      const a = randInt(rand, 1, N), b = randInt(rand, 1, N);
      ps = Array.from({ length: T }, (_, i) => (i % 2 ? b + d2 * (i >> 1) : a + d1 * (i >> 1)));
    } else if (kind === 'grow') {
      const a = randInt(rand, 1, 6); ps = [a]; for (let i = 1; i < T; i++) ps.push(ps[i - 1] + i);
    } else {                                       // num / pair: oddiy arifmetik +2/+3
      const d = pickOne(rand, [2, 3]), a = randInt(rand, 1, N - d * (T - 1) - (kind === 'pair' ? 1 : 0));
      ps = Array.from({ length: T }, (_, i) => a + d * i);
    }
    if (ps.every(p => p >= 1 && p <= N - (kind === 'pair' ? 1 : 0)) && new Set(ps).size >= 3) return ps;
  }
  return null;
}

// Ko'rinib turgan hadlardan «?» ni bashorat qilish (barcha oilalar bo'yicha)
export function predictPos(ps, q) {
  const T = ps.length, idx = [...Array(T).keys()].filter(i => i !== q), out = new Set();
  const fits = f => idx.every(i => f(i) === ps[i]);
  const first = idx[0], second = idx[1];
  // arifmetik
  { const d = (ps[second] - ps[first]) / (second - first); if (Number.isInteger(d)) { const f = i => ps[first] + d * (i - first); if (fits(f)) out.add(f(q)); } }
  // navbatlashgan ikki qadam: p[i+1] − p[i] = (i juft? d1 : d2)
  for (let d1 = -5; d1 <= 5; d1++) for (let d2 = -5; d2 <= 5; d2++) {
    const f = i => { let p = ps[first]; if (i >= first) for (let k = first; k < i; k++) p += k % 2 === 0 ? d1 : d2; else for (let k = first - 1; k >= i; k--) p -= k % 2 === 0 ? d1 : d2; return p; };
    if (fits(f)) out.add(f(q));
  }
  // ikki qator aralashgan (juft va toq o'rinlar alohida arifmetik)
  {
    const ev = idx.filter(i => i % 2 === 0), od = idx.filter(i => i % 2 === 1);
    if (ev.length >= 2 && od.length >= 2) {
      const lin = arr => { const d = (ps[arr[1]] - ps[arr[0]]) / (arr[1] - arr[0]); return i => ps[arr[0]] + d * (i - arr[0]); };
      const fe = lin(ev), fo = lin(od), f = i => (i % 2 ? fo(i) : fe(i));
      if (fits(f) && Number.isInteger(f(q))) out.add(f(q));
    }
  }
  // o'suvchi qadam (ikkinchi ayirma o'zgarmas)
  for (let d0 = -5; d0 <= 8; d0++) for (let e = 1; e <= 3; e++) {
    const f = i => ps[first] + (i - first) * d0 + e * ((i - first) * (i - first - 1)) / 2;
    if (fits(f)) out.add(f(q));
  }
  return out;
}

function build(L, kind, alpha, rand, used, level) {
  const N = alpha.length;
  if (FIG_KINDS.has(kind)) return buildFig(kind, N, level, rand);
  for (let guard = 0; guard < 300; guard++) {
    const ps = positions(kind, L.T, N, rand);
    if (!ps) continue;
    const q = kind === 'ar1' || kind === 'ar2' ? L.T - 1 : randInt(rand, 2, L.T - 1);
    const pr = predictPos(ps, q);
    if (pr.size !== 1 || !pr.has(ps[q])) continue;
    const k = kind + ps.join(',');
    if (used.has(k)) continue;
    used.add(k);
    return { kind, ps, q };
  }
  throw new Error('letterseq: no row');
}

export function itemText(row, i, alpha) {
  const p = row.ps[i];
  if (row.kind === 'num') return alpha[p - 1] + p;
  if (row.kind === 'pair') return alpha[p - 1] + alpha[p];
  return alpha[p - 1];
}
const sgn = d => (d >= 0 ? '+' : '−') + Math.abs(d);
function ruleText(row, lang) {
  if (FIG_KINDS.has(row.kind)) return figRuleText(row, lang);
  const ds = row.ps.slice(1).map((p, i) => p - row.ps[i]);
  if (row.kind === 'inter') {
    const e = row.ps[2] - row.ps[0], o = row.ps[3] - row.ps[1];
    return { uz: `ikki qator: ${sgn(e)} va ${sgn(o)}`, ru: `два ряда: ${sgn(e)} и ${sgn(o)}`, en: `two rows: ${sgn(e)} and ${sgn(o)}` }[lang];
  }
  if (row.kind === 'grow') return { uz: 'qadam: +1, +2, +3, …', ru: 'шаг: +1, +2, +3, …', en: 'steps: +1, +2, +3, …' }[lang];
  if (row.kind === 'alt') return { uz: `qadamlar navbat bilan: ${sgn(ds[0])}, ${sgn(ds[1])}`, ru: `шаги по очереди: ${sgn(ds[0])}, ${sgn(ds[1])}`, en: `alternating steps: ${sgn(ds[0])}, ${sgn(ds[1])}` }[lang];
  const base = { uz: `qadam: ${sgn(ds[0])}`, ru: `шаг: ${sgn(ds[0])}`, en: `step: ${sgn(ds[0])}` }[lang];
  if (row.kind === 'num') return base + { uz: ", son — harfning o'rni", ru: ', число — номер буквы', en: ', the number is the letter position' }[lang];
  if (row.kind === 'pair') return base + { uz: ', juftlikda keyingi harf', ru: ', в паре следующая буква', en: ', each pair is two neighbours' }[lang];
  return base;
}

const RULE = {
  uz: "Harflar alifbodagi o'rni bo'yicha qonuniyat bilan yozilgan. «?» o'rniga qaysi harf (yoki son) keladi? Jadval va bloklarda qatorlarni chapdan o'ngga o'qi, yulduzni tepadan soat yo'nalishida. Pastdagi alifbodan foydalan.",
  ru: 'Буквы записаны по правилу — по их месту в алфавите. Какая буква (или число) на месте «?»? Таблицы и блоки читай по строкам слева направо, звезду — сверху по часовой стрелке. Пользуйся алфавитом внизу.',
  en: 'The letters follow a rule based on their place in the alphabet. Which letter (or number) goes in place of the “?”? Read tables and blocks row by row from left to right, and the star clockwise from the top. Use the alphabet below.'
};

export default {
  id: 'letterseq',
  skills: ['patterns', 'language', 'logic'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  usesLang: true,
  name: { uz: 'Harf qatorlari', ru: 'Буквенные ряды', en: 'Letter sequences' },
  desc: {
    uz: "Harflar alifbodagi o'rni bo'yicha qonuniyat bilan yozilgan: «?» o'rniga keladigan harfni toping",
    ru: 'Буквы идут по правилу их места в алфавите: найдите букву на месте «?»',
    en: 'Letters follow a rule by their place in the alphabet: find the missing one'
  },
  fileBase: { uz: 'Harf qatorlari', ru: 'Буквенные ряды', en: 'Letter sequences' },
  defaultTitle: { uz: 'Qaysi harf keladi?', ru: 'Какая буква дальше?', en: 'Which letter comes next?' },
  options: [{ key: 'level', type: 'level', default: 1 }],
  levelHint: {
    uz: ["+1 yoki +2 qadam, 3×3 harf jadvali", "+2, +3, orqaga sanash, harf-son yulduzi", "Navbatlashgan qadamlar, ikki qator, 2×2 bloklar", "Harf va o'rni (A1, C3), juftlar, to'rt harfli guruhlar"],
    ru: ['Шаг +1 или +2, таблица букв 3×3', '+2, +3, обратный счёт, звезда из букв и чисел', 'Чередующиеся шаги, два ряда, блоки 2×2', 'Буква и номер (А1, В3), пары, группы из четырёх букв'],
    en: ['Steps of +1 or +2, a 3×3 letter table', '+2, +3, counting back, a letter-number star', 'Alternating steps, two rows, 2×2 blocks', 'Letter and position (A1, C3), pairs, four-letter groups']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const lang = ['uz', 'ru', 'en'].includes(opts.lang) ? opts.lang : 'uz';
    const L = LEVELS[level];
    const rand = makeRng(seed);
    const count = L.count[opts.perPage === 4 ? 2 : opts.perPage === 2 ? 1 : 0];
    const alpha = alphaOf(lang), used = new Set();
    const bag = []; while (bag.length < count) bag.push(...shuffle(L.kinds.slice(), rand));
    // shaklli turlar varaqda bittadan ortiq bo'lmasin (joy ko'p oladi)
    const kinds = []; let figs = 0;
    for (const k of bag) { if (kinds.length >= count) break; if (FIG_KINDS.has(k)) { if (figs >= (count >= 7 ? 2 : 1)) continue; figs++; } kinds.push(k); }
    while (kinds.length < count) kinds.push(L.kinds.find(k => !FIG_KINDS.has(k)));
    return { level, seed, lang, nums: L.nums, rows: kinds.map(k => build(L, k, alpha, rand, used, level)) };
  },

  info(p, lang) {
    const c = p.rows.length;
    return { uz: `${c} ta qator`, ru: `${c} ${ruPlural(c, 'ряд', 'ряда', 'рядов')}`, en: `${c} row${c > 1 ? 's' : ''}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box), n = p.rows.length;
    const alpha = alphaOf(p.lang || lang);
    const rule = measureRule(ctx, RULE[lang] || RULE.uz, box.w, scale);
    // alifbo qatori
    const N = alpha.length, ac = Math.min(box.w / N, 9 * scale), alH = ac * (p.nums ? 1.75 : 1.15);
    const gap = 5 * scale, numW = 8 * scale;
    const H = box.h - rule.h - alH - gap * 2;
    const ansH = showSolution ? 3.6 * scale : 0;
    // har qatorning eni va bo'yi katak birligida
    const sizeOf = r => (FIG_KINDS.has(r.kind) ? figSize(r) : [r.ps.length * 1.18, 1.0]);
    const maxW = Math.max(...p.rows.map(r => sizeOf(r)[0])), sumH = p.rows.reduce((a, r) => a + sizeOf(r)[1] + 0.32, 0);
    const cell = Math.min((box.w - numW) / maxW, (H - n * ansH) / sumH, 16 * scale);
    const blockH = sumH * cell + n * ansH;
    let y = box.y + Math.max(0, (H - blockH) * 0.3);
    p.rows.forEach((r, i) => {
      const [wU, hU] = sizeOf(r);
      const left = box.x + (box.w - numW - maxW * cell) / 2, x0 = left + (maxW - wU) * cell / 2;
      font(ctx, Math.min(cell * 0.4, 4.4 * scale), 800); ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(`${i + 1}.`, left, y + cell / 2);
      if (FIG_KINDS.has(r.kind)) drawFig(ctx, r, x0 + numW, y, cell, alpha, showSolution, scale);
      else r.ps.forEach((_, j) => {
        const x = x0 + numW + j * cell * 1.18;
        if (j === r.q && !showSolution) { questionCell(ctx, x, y, cell, scale); return; }
        cellBox(ctx, x, y, cell, cell, scale, { fill: j === r.q ? '#FEF2F2' : '#fff', stroke: j === r.q ? ANSWER : '#9CA3AF' });
        const txt = itemText(r, j, alpha);
        let fs = cell * (txt.length > 2 ? 0.36 : txt.length > 1 ? 0.44 : 0.58);
        font(ctx, fs, 800);
        const tw = ctx.measureText(txt).width; if (tw > cell * 0.86) { fs *= cell * 0.86 / tw; font(ctx, fs, 800); }
        ctx.fillStyle = j === r.q ? ANSWER : INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(txt, x + cell / 2, y + cell / 2 + cell * 0.03);
      });
      if (showSolution) {
        font(ctx, Math.min(3.2 * scale, ansH * 0.9), 700); ctx.fillStyle = ANSWER; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(ruleText(r, lang), x0 + numW, y + hU * cell + cell * 0.08);
      }
      y += (hU + 0.32) * cell + ansH;
    });
    // alifbo
    const ax = box.x + (box.w - N * ac) / 2, ay = y + gap * 0.5;
    alpha.forEach((ch, k) => {
      ctx.strokeStyle = '#D1D5DB'; ctx.lineWidth = Math.max(0.2, 0.25 * scale); ctx.strokeRect(ax + k * ac, ay, ac, ac);
      font(ctx, ac * (ch.length > 1 ? 0.42 : 0.55), 800); ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(ch, ax + k * ac + ac / 2, ay + ac / 2 + ac * 0.03);
      if (p.nums) { font(ctx, ac * 0.36, 600); ctx.fillStyle = MUTE; ctx.fillText(String(k + 1), ax + k * ac + ac / 2, ay + ac * 1.38); }
    });
    drawRule(ctx, rule, box.x + box.w / 2, ay + alH + gap * 0.6);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const T = { uz: `Qatorlar: ${p.rows.length}`, ru: `Рядов: ${p.rows.length}`, en: `Rows: ${p.rows.length}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const N = alphaOf(p.lang || 'uz').length;
    p.rows.forEach((r, i) => {
      if (FIG_KINDS.has(r.kind)) {
        const pr = figPredict(r);
        if (pr.size !== 1 || !pr.has(figAnswerKey(r))) problems.push(`#${i}: ${r.kind} not unique (${[...pr].join(' / ')})`);
        if (!figValid(r, N)) problems.push(`#${i}: ${r.kind} out of alphabet`);
        return;
      }
      const pr = predictPos(r.ps, r.q);
      if (pr.size !== 1 || !pr.has(r.ps[r.q])) problems.push(`#${i}: ${r.kind} not unique (${[...pr].join(',')})`);
      if (r.ps.some(v => v < 1 || v > N - (r.kind === 'pair' ? 1 : 0))) problems.push(`#${i}: out of alphabet`);
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-letterseq" aria-hidden="true"><defs><linearGradient id="cg-letterseq" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a8edea"/><stop offset="1" stop-color="#fed6e3"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-letterseq)"/><rect x="18" y="80" width="28" height="40" rx="7" fill="#fff" stroke="#9CA3AF" stroke-width="2.5"/><text x="32" y="108" font-family="Nunito, sans-serif" font-weight="900" font-size="22" text-anchor="middle" fill="#111827">A</text><rect x="52" y="80" width="28" height="40" rx="7" fill="#fff" stroke="#9CA3AF" stroke-width="2.5"/><text x="66" y="108" font-family="Nunito, sans-serif" font-weight="900" font-size="22" text-anchor="middle" fill="#111827">C</text><rect x="86" y="80" width="28" height="40" rx="7" fill="#fff" stroke="#9CA3AF" stroke-width="2.5"/><text x="100" y="108" font-family="Nunito, sans-serif" font-weight="900" font-size="22" text-anchor="middle" fill="#111827">E</text><rect x="120" y="80" width="28" height="40" rx="7" fill="#fff" stroke="#9CA3AF" stroke-width="2.5"/><text x="134" y="108" font-family="Nunito, sans-serif" font-weight="900" font-size="22" text-anchor="middle" fill="#111827">G</text><rect x="154" y="80" width="28" height="40" rx="7" fill="#fff" stroke="#DC2626" stroke-width="2.5"/><text class="ls-a" x="168" y="108" font-family="Nunito, sans-serif" font-weight="900" font-size="22" text-anchor="middle" fill="#DC2626">I</text><g font-family="Nunito, sans-serif" font-weight="900" font-size="13" text-anchor="middle" fill="#6D28D9"><text x="49" y="70">+2</text><text x="83" y="70">+2</text><text x="117" y="70">+2</text><text x="151" y="70">+2</text></g></svg>`
};
