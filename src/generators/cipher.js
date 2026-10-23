// cipher.js — «Shifrlangan so'z» (Шифровки / Secret code) generatori.
// Oson — belgilar kaliti (har belgi bitta harf); O'rta — sonli kod (harfning alifbodagi o'rni);
// Qiyin — siljitish shifri (har harf alifboda k ta keyingisi bilan almashtirilgan);
// Juda qiyin (qolip: ozarbayjon test banki «Şifrələr», Litsey IQ «NON» topshirig'i) — so'zlar va ularning
// raqamli kodlari aralash berilgan: mosligini topib, yangi so'zning kodini yozish.
// Kafolat (check()): kodlar kalitga mos; Juda qiyinda so'z↔kod mosligi yagona va yangi so'zning hamma harfi
// namunalarda bor.

import { makeRng, shuffle, pickOne } from '../core/rng.js';
import { INK, MUTE, ANSWER, font } from '../core/draw.js';
import { scaleOf, measureRule, drawRule } from '../core/parts.js';
import { drawFigure } from '../core/figures.js';
import { TOPIC_OPTION, topicOf, langOf, bankOf, allOf, topicName, letterBox, ALPHA } from './wordkit.js';

// count — [1, 2, 4 tadan]
const LEVELS = [
  { mode: 'sym', min: 3, max: 5, maxLetters: 12, count: [4, 3, 2] },
  { mode: 'num', min: 4, max: 7, count: [5, 4, 2] },
  { mode: 'shift', min: 4, max: 8, count: [5, 4, 2] },
  { mode: 'match', min: 3, max: 5, count: [3, 2, 1] }
];

// Belgilar: shakl + bo'yalishi (har xil ko'rinadigan 20 ta)
const SYMBOLS = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond', 'hexagon', 'plus', 'moon', 'pentagon']
  .flatMap(shape => [{ shape, fill: 'empty' }, { shape, fill: 'solid' }]);

function drawSym(ctx, i, x, y, s, color = INK) {
  ctx.save();
  drawFigure(ctx, { ...SYMBOLS[i], lw: Math.max(0.3, s * 0.06) }, x + s / 2, y + s / 2, s * 1.05);
  if (color !== INK) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = color; ctx.fillRect(x, y, s, s); }
  ctx.restore();
}

const lettersOf = words => [...new Set(words.flatMap(w => w.cells))];

function pickSet(pool, n, min, max, rand, ok) {
  const cand = pool.filter(w => w.cells.length >= min && w.cells.length <= max);
  for (let t = 0; t < 400; t++) {
    const ws = shuffle(cand.slice(), rand).slice(0, n);
    if (ws.length === n && ok(ws)) return ws;
  }
  return null;
}

// So'zlar va kodlar mosligi necha xil bo'lishi mumkin (har harf — bitta raqam, har raqam — bitta harf)
export function matchCount(words, codes) {
  let count = 0;
  const perm = (arr, k) => {
    if (k === arr.length) {
      const l2d = new Map(), d2l = new Map();
      for (let i = 0; i < words.length; i++) {
        const w = words[i], c = codes[arr[i]];
        if (w.length !== c.length) return;
        for (let j = 0; j < w.length; j++) {
          if (l2d.has(w[j]) && l2d.get(w[j]) !== c[j]) return;
          if (d2l.has(c[j]) && d2l.get(c[j]) !== w[j]) return;
          l2d.set(w[j], c[j]); d2l.set(c[j], w[j]);
        }
      }
      count++;
      return;
    }
    for (let i = k; i < arr.length; i++) { [arr[k], arr[i]] = [arr[i], arr[k]]; perm(arr, k + 1); [arr[k], arr[i]] = [arr[i], arr[k]]; }
  };
  perm(codes.map((_, i) => i), 0);
  return count;
}

function buildMatch(L, lang, topic, rand, avoid) {
  const pool = bankOf(lang, topic).filter(w => !avoid.has(w.key));
  const all = allOf(lang);
  for (let t = 0; t < 300; t++) {
    // kamida ikkita so'z bir xil uzunlikda: moslikni faqat uzunlikka qarab topib bo'lmasin
    const ws = pickSet(pool, 3, L.min, L.max, rand, s => lettersOf(s).length <= 9 && new Set(s.map(w => w.cells.length)).size <= 2);
    if (!ws) break;
    const letters = lettersOf(ws), lset = new Set(letters);
    const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rand);
    const map = new Map(letters.map((l, i) => [l, digits[i]]));
    const codes = ws.map(w => w.cells.map(c => map.get(c)));
    if (matchCount(ws.map(w => w.cells), codes) !== 1) continue;
    const targets = all.filter(w => w.cells.length >= 3 && w.cells.every(c => lset.has(c)) && !ws.some(x => x.key === w.key) && !avoid.has(w.key));
    if (!targets.length) continue;
    const target = pickOne(rand, targets);
    const order = shuffle([0, 1, 2], rand);
    return { words: ws.map(w => ({ cells: w.cells, key: w.key })), codes: order.map(i => codes[i]), answer: ws.map((_, i) => order.indexOf(i)), target: { cells: target.cells, code: target.cells.map(c => map.get(c)), key: target.key } };
  }
  return null;
}

const RULE = {
  uz: (L, tn, k) => ({
    sym: `Har bir belgi bitta harfni bildiradi (kalit tepada). Belgilar ostiga harflarni yozib, so'zlarni o'qi. Hamma so'zlar «${tn}» mavzusidan.`,
    num: `Har bir son — harfning alifbodagi o'rni (jadvalga qara). Sonlar ostiga harflarni yozib, «${tn}» mavzusidagi so'zlarni o'qi.`,
    shift: `Har bir harf alifboda ${k} ta keyingi harf bilan almashtirilgan (oxiridan keyin yana boshidan). Har harf ostiga alifboda ${k} ta oldingi harfni yozib, «${tn}» mavzusidagi so'zlarni o'qi.`,
    match: "Har bir harf bitta raqam bilan almashtirilgan: bir xil harf — bir xil raqam, har xil harf — har xil raqam. So'zlar va ularning kodlari aralash berilgan: qaysi kod qaysi so'zniki ekanini chiziq bilan tutashtir. Keyin pastdagi so'zning kodini yoz."
  })[L.mode],
  ru: (L, tn, k) => ({
    sym: `Каждый значок обозначает одну букву (ключ вверху). Напиши под значками буквы и прочитай слова. Все слова на тему «${tn}».`,
    num: `Каждое число — номер буквы в алфавите (смотри таблицу). Напиши под числами буквы и прочитай слова на тему «${tn}».`,
    shift: `Каждая буква заменена буквой, которая стоит в алфавите на ${k} дальше (после конца — снова с начала). Напиши под каждой буквой ту, что стоит на ${k} раньше, и прочитай слова на тему «${tn}».`,
    match: 'Каждая буква заменена цифрой: одинаковые буквы — одинаковые цифры, разные — разные. Слова и их коды перемешаны: соедини линией каждое слово с его кодом. Потом напиши код слова внизу.'
  })[L.mode],
  en: (L, tn, k) => ({
    sym: `Each symbol stands for one letter (see the key at the top). Write the letters under the symbols and read the words. All the words are about “${tn}”.`,
    num: `Each number is the position of a letter in the alphabet (see the table). Write the letters under the numbers and read the words about “${tn}”.`,
    shift: `Each letter was replaced by the letter ${k} places later in the alphabet (after the end it starts again). Write the letter ${k} places earlier under each one and read the words about “${tn}”.`,
    match: 'Each letter was replaced by a digit: the same letter always gets the same digit, different letters get different digits. The words and their codes are mixed up: join each word to its code with a line. Then write the code of the word at the bottom.'
  })[L.mode]
};

export default {
  id: 'cipher',
  skills: ['language', 'logic'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  usesLang: true,
  name: { uz: "Shifrlangan so'z", ru: 'Шифровки', en: 'Secret codes' },
  desc: {
    uz: "Kalit yordamida yashirin so'zlarni ochish: belgilar, sonlar, siljitish va kodni o'zing top",
    ru: 'Расшифровать слова по ключу: значки, числа, сдвиг и код, который надо найти самому',
    en: 'Crack hidden words with a key: symbols, numbers, shifted letters and a code to work out'
  },
  fileBase: { uz: "Shifrlangan so'z", ru: 'Шифровки', en: 'Secret codes' },
  defaultTitle: { uz: 'Shifrni och!', ru: 'Разгадай шифр!', en: 'Crack the code!' },
  options: [{ key: 'level', type: 'level', default: 1 }, TOPIC_OPTION],
  levelHint: {
    uz: ['Belgilar kaliti', 'Sonli kod: A = 1, B = 2 …', "Harflar alifboda siljitilgan", "So'z va kodlarni moslab, yangi so'zni shifrlash"],
    ru: ['Ключ из значков', 'Числовой код: А = 1, Б = 2 …', 'Буквы сдвинуты по алфавиту', 'Сопоставить слова и коды, зашифровать новое слово'],
    en: ['A key of symbols', 'Number code: A = 1, B = 2 …', 'Letters shifted along the alphabet', 'Match words to codes and encode a new word']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level], lang = langOf(opts), topic = topicOf(opts);
    const rand = makeRng(seed);
    const n = L.count[opts.perPage === 4 ? 2 : opts.perPage === 2 ? 1 : 0];
    const pool = bankOf(lang, topic), A = ALPHA[lang];
    const base = { level, seed, lang, topic, mode: L.mode };
    if (L.mode === 'sym') {
      const ws = pickSet(pool, n, L.min, L.max, rand, s => lettersOf(s).length <= L.maxLetters) || pickSet(pool, n, L.min, L.max + 2, rand, () => true);
      const letters = lettersOf(ws).sort((a, b) => A.indexOf(a) - A.indexOf(b));
      const syms = shuffle(SYMBOLS.map((_, i) => i), rand).slice(0, letters.length);
      const map = new Map(letters.map((l, i) => [l, syms[i]]));
      return { ...base, key: letters.map(l => ({ letter: l, sym: map.get(l) })), words: ws.map(w => ({ cells: w.cells, code: w.cells.map(c => map.get(c)) })) };
    }
    if (L.mode === 'num') {
      const ws = pickSet(pool, n, L.min, L.max, rand, () => true);
      return { ...base, words: ws.map(w => ({ cells: w.cells, code: w.cells.map(c => A.indexOf(c) + 1) })) };
    }
    if (L.mode === 'shift') {
      const k = 1 + Math.floor(rand() * 3);
      const ws = pickSet(pool, n, L.min, L.max, rand, () => true);
      return { ...base, k, words: ws.map(w => ({ cells: w.cells, code: w.cells.map(c => A[(A.indexOf(c) + k) % A.length]) })) };
    }
    const items = [], avoid = new Set();
    for (let i = 0; i < n; i++) {
      let it = buildMatch(L, lang, topic, rand, avoid);
      // mavzuda mos so'zlar topilmasa — boshqa mavzular (kamdan-kam)
      for (const tp of shuffle(['animals', 'food', 'school', 'nature', 'autumn', 'winter'], rand)) { if (it) break; it = buildMatch(L, lang, tp, rand, avoid); }
      it.words.forEach(w => avoid.add(w.key)); avoid.add(it.target.key);
      items.push(it);
    }
    return { ...base, items };
  },

  info(p, lang) {
    const n = p.items ? p.items.length : p.words.length;
    return { uz: `${n} ta topshiriq, «${topicName(p.topic, lang)}»`, ru: `Заданий: ${n}, «${topicName(p.topic, lang)}»`, en: `${n} tasks, “${topicName(p.topic, lang)}”` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box), L = LEVELS[p.level], A = ALPHA[p.lang];
    const rule = measureRule(ctx, (RULE[lang] || RULE.uz)(L, topicName(p.topic, p.lang), p.k), box.w, scale);
    const gap = 6 * scale;
    let y = box.y, bottom;
    const labelFs = 4.2 * scale;
    if (p.mode !== 'match') {
      // Kalit
      if (p.mode === 'sym') {
        const n = p.key.length, perRow = Math.min(n, 12), rows = Math.ceil(n / perRow);
        const s = Math.min(box.w / (perRow * 1.25), 11);
        p.key.forEach((kv, i) => {
          const r = Math.floor(i / perRow), c = i % perRow, cnt = Math.min(perRow, n - r * perRow);
          const x = box.x + (box.w - cnt * s * 1.25 + s * 0.25) / 2 + c * s * 1.25, yy = y + r * s * 2.3;
          letterBox(ctx, x, yy, s, '', { fill: '#fff', stroke: '#C7CDD6' });
          drawSym(ctx, kv.sym, x + s * 0.12, yy + s * 0.12, s * 0.76);
          letterBox(ctx, x, yy + s * 1.02, s, kv.letter, { fill: '#F3F4F6', stroke: '#C7CDD6' });
        });
        y += rows * s * 2.3 + gap;
      } else {
        const n = A.length, perRow = Math.ceil(n / 2), s = Math.min(box.w / (perRow * 1.08), 9.5);
        for (let i = 0; i < n; i++) {
          const r = Math.floor(i / perRow), c = i % perRow, cnt = Math.min(perRow, n - r * perRow);
          const x = box.x + (box.w - cnt * s * 1.08 + s * 0.08) / 2 + c * s * 1.08, yy = y + r * s * (p.mode === 'num' ? 2.15 : 1.25);
          letterBox(ctx, x, yy, s, A[i], { fill: '#F3F4F6', stroke: '#C7CDD6' });
          if (p.mode === 'num') { font(ctx, s * 0.5, 800); ctx.fillStyle = MUTE; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(String(i + 1), x + s / 2, yy + s * 1.08); }
        }
        y += (p.mode === 'num' ? 2 * s * 2.15 : 2 * s * 1.25) + gap;
      }
      // So'zlar: kod qatori va javob kataklari
      const H = box.y + box.h - rule.h - gap - y;
      const n = p.words.length, maxLen = Math.max(...p.words.map(w => w.cells.length)), numW = 7 * scale;
      let best = null;
      for (let cols = 1; cols <= 2; cols++) {
        const rows = Math.ceil(n / cols);
        const t = Math.min((box.w / cols - numW - gap) / (maxLen * 1.12), H / (rows * 2.7), 10);
        if (!best || t > best.t + 0.01) best = { cols, rows, t };
      }
      const { cols, rows, t } = best, colW = box.w / cols, itemW = numW + maxLen * t * 1.12, itemH = t * 2.7;
      const gy = y + Math.max(0, (H - rows * itemH) * 0.25);
      p.words.forEach((w, i) => {
        const c = Math.floor(i / rows), r = i % rows;
        const x0 = box.x + c * colW + (colW - itemW) / 2, y0 = gy + r * itemH;
        font(ctx, Math.min(4.6 * scale, t * 0.5), 800); ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(`${i + 1}.`, x0, y0 + t * 0.55);
        w.code.forEach((cv, k) => {
          const x = x0 + numW + k * t * 1.12;
          if (p.mode === 'sym') { letterBox(ctx, x, y0, t, '', { fill: '#fff', stroke: '#C7CDD6' }); drawSym(ctx, cv, x + t * 0.12, y0 + t * 0.12, t * 0.76); }
          else letterBox(ctx, x, y0, t, String(cv), { fill: '#EEF2FF', stroke: '#A5B4FC' });
          letterBox(ctx, x, y0 + t * 1.2, t, showSolution ? w.cells[k] : '', { color: ANSWER });
        });
      });
      bottom = gy + rows * itemH;
    } else {
      // So'z ↔ kod moslash
      const n = p.items.length, H = box.h - rule.h - gap;
      const itemH = H / n;
      const maxLen = Math.max(...p.items.flatMap(it => [...it.words.map(w => w.cells.length), it.target.cells.length]));
      const tLen = Math.max(...p.items.map(it => it.target.cells.length));
      const tOf = () => Math.min(box.w * 0.42 / (maxLen * 1.1), box.w * 0.9 / (2 * tLen * 1.1 + 1.8), itemH / 6.4, 8);
      const t = tOf();
      p.items.forEach((it, i) => {
        const y0 = box.y + i * itemH;
        const lx = box.x + box.w * 0.08, rx = box.x + box.w * 0.92 - maxLen * t * 1.1;
        font(ctx, Math.min(4.6 * scale, t * 0.6), 800); ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(`${i + 1}.`, box.x, y0 + t * 0.55);
        const rowY = j => y0 + j * t * 1.45;
        it.words.forEach((w, j) => {
          w.cells.forEach((ch, k) => letterBox(ctx, lx + k * t * 1.1, rowY(j), t, ch, { fill: '#F3F4F6', stroke: '#C7CDD6' }));
          ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(lx + w.cells.length * t * 1.1 + t * 0.35, rowY(j) + t / 2, t * 0.14, 0, Math.PI * 2); ctx.fill();
        });
        it.codes.forEach((code, j) => {
          const cx = rx + (maxLen - code.length) * t * 1.1;
          code.forEach((d, k) => letterBox(ctx, cx + k * t * 1.1, rowY(j), t, String(d), { fill: '#EEF2FF', stroke: '#A5B4FC' }));
          ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(cx - t * 0.35, rowY(j) + t / 2, t * 0.14, 0, Math.PI * 2); ctx.fill();
        });
        if (showSolution) {
          ctx.save(); ctx.strokeStyle = ANSWER; ctx.lineWidth = Math.max(0.35, t * 0.07);
          it.words.forEach((w, j) => {
            const ci = it.answer[j], code = it.codes[ci], cx = rx + (maxLen - code.length) * t * 1.1;
            ctx.beginPath(); ctx.moveTo(lx + w.cells.length * t * 1.1 + t * 0.35, rowY(j) + t / 2); ctx.lineTo(cx - t * 0.35, rowY(ci) + t / 2); ctx.stroke();
          });
          ctx.restore();
        }
        // yangi so'z va uning kodi
        const ty = rowY(3) + t * 0.35;
        it.target.cells.forEach((ch, k) => letterBox(ctx, lx + k * t * 1.1, ty, t, ch, { fill: '#FEF3C7', stroke: '#F59E0B' }));
        const ax = lx + it.target.cells.length * t * 1.1 + t * 0.6;
        font(ctx, t * 0.7, 900); ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText('→', ax, ty + t * 0.55);
        it.target.code.forEach((d, k) => letterBox(ctx, ax + t * 1.1 + k * t * 1.1, ty, t, showSolution ? String(d) : '', { color: ANSWER }));
      });
      bottom = box.y + n * itemH - itemH + (4 * 1.45 + 0.35) * t;
    }
    drawRule(ctx, rule, box.x + box.w / 2, bottom + gap * 0.3);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const n = p.items ? p.items.length : p.words.length;
    const T = { uz: `Topshiriqlar: ${n} ta`, ru: `Заданий: ${n}`, en: `Tasks: ${n}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const A = ALPHA[p.lang];
    if (p.mode === 'sym') {
      const map = new Map(p.key.map(kv => [kv.letter, kv.sym]));
      if (new Set(p.key.map(kv => kv.sym)).size !== p.key.length) problems.push('symbol reused');
      for (const w of p.words) if (w.cells.some((c, i) => map.get(c) !== w.code[i])) problems.push('sym code wrong');
    } else if (p.mode === 'num') {
      for (const w of p.words) if (w.cells.some((c, i) => A.indexOf(c) + 1 !== w.code[i] || A.indexOf(c) < 0)) problems.push('num code wrong');
    } else if (p.mode === 'shift') {
      for (const w of p.words) if (w.cells.some((c, i) => A[(A.indexOf(c) + p.k) % A.length] !== w.code[i] || A.indexOf(c) < 0)) problems.push('shift code wrong');
    } else {
      for (const it of p.items) {
        if (matchCount(it.words.map(w => w.cells), it.codes) !== 1) problems.push('matching not unique');
        const l2d = new Map();
        it.words.forEach((w, j) => w.cells.forEach((c, k) => l2d.set(c, it.codes[it.answer[j]][k])));
        if (it.target.cells.some((c, k) => l2d.get(c) !== it.target.code[k])) problems.push('target code not derivable');
        if (it.words.some(w => w.key === it.target.key)) problems.push('target repeats a word');
      }
    }
    if (p.words && new Set(p.words.map(w => w.cells.join('|'))).size !== p.words.length) problems.push('repeated word');
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-cipher" aria-hidden="true"><defs><linearGradient id="cg-cipher" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e0c3fc"/><stop offset="1" stop-color="#8ec5fc"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-cipher)"/><g fill="#fff" stroke="#4c1d95" stroke-width="3"><rect x="40" y="44" width="34" height="34" rx="6"/><rect x="83" y="44" width="34" height="34" rx="6"/><rect x="126" y="44" width="34" height="34" rx="6"/></g><g fill="#4c1d95"><path d="M57 50l4 9 9.5.7-7.3 6 2.3 9.3-8.5-5-8.5 5 2.3-9.3-7.3-6 9.5-.7z"/><circle cx="100" cy="61" r="11"/><path d="M143 50l12 21h-24z"/></g><path d="M100 88v14M93 96l7 7 7-7" fill="none" stroke="#4c1d95" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><g fill="#fff" stroke="#111827" stroke-width="3"><rect x="40" y="114" width="34" height="34" rx="6"/><rect x="83" y="114" width="34" height="34" rx="6"/><rect x="126" y="114" width="34" height="34" rx="6"/></g><g font-family="Nunito, sans-serif" font-weight="900" font-size="22" text-anchor="middle" fill="#DC2626"><text class="cp-a" x="57" y="139">S</text><text class="cp-b" x="100" y="139">U</text><text class="cp-c" x="143" y="139">T</text></g></svg>`
};
