// anagram.js — «Anagramma» (Анаграммы / Anagrams) generatori.
// So'zning harflari aralashtirilgan; bola harflardan mavzuga oid so'zni tuzib, kataklarga yozadi.
// Juda qiyin daraja (qolip: rus IQ kitobi S6, ozarbayjon test banki «Anagramlar»): har qatorda 4 ta aralash so'z,
// uchtasi bir mavzudan, bittasi ortiqcha — uni topish kerak.
// Kafolat (check()): harflar to'plami tilning so'z bankidagi boshqa so'zga to'g'ri kelmaydi (javob yagona),
// aralashgan ko'rinish o'zi so'z emas va asl so'zdan yetarlicha farq qiladi.

import { makeRng, shuffle, pickOne } from '../core/rng.js';
import { INK, MUTE, ANSWER, font } from '../core/draw.js';
import { scaleOf, measureRule, drawRule, ringEllipse } from '../core/parts.js';
import { TOPIC_OPTION, topicOf, langOf, bankOf, allOf, keySet, topicsOfWord, topicName, letterBox } from './wordkit.js';

// min/max — so'z uzunligi (harf); count — [1, 2, 4 tadan]; first — birinchi harf yozib qo'yiladi;
// odd — har qatorda 4 so'z, bittasi ortiqcha (rows — qatorlar soni)
const LEVELS = [
  { min: 3, max: 5, first: true, count: [6, 4, 3] },
  { min: 4, max: 6, count: [8, 5, 4] },
  { min: 6, max: 9, count: [8, 5, 3] },
  { odd: true, min: 4, max: 7, count: [4, 2, 2] }
];

// Ortiqcha so'z olinadigan, ma'nosi uzoq mavzular (aralashib ketmasligi uchun)
const FAR = {
  school: ['animals', 'food', 'space', 'transport', 'nature'],
  autumn: ['space', 'computer', 'sport'],
  winter: ['animals', 'space', 'computer', 'jobs', 'school'],
  animals: ['school', 'computer', 'transport', 'space', 'sport'],
  food: ['school', 'computer', 'transport', 'space', 'sport'],
  nature: ['school', 'computer', 'transport', 'jobs', 'sport'],
  sport: ['food', 'animals', 'space', 'computer', 'autumn'],
  space: ['food', 'animals', 'school', 'sport', 'jobs'],
  jobs: ['food', 'animals', 'nature', 'space', 'winter'],
  transport: ['food', 'animals', 'nature', 'school', 'autumn'],
  computer: ['food', 'animals', 'nature', 'autumn', 'winter']
};

const sigOf = cells => cells.slice().sort().join('|');
const sigCache = {};
function sigCount(lang) {
  if (!sigCache[lang]) { const m = new Map(); for (const w of allOf(lang)) { const s = sigOf(w.cells); m.set(s, (m.get(s) || 0) + 1); } sigCache[lang] = m; }
  return sigCache[lang];
}
const uniqueAnagram = (w, lang) => sigCount(lang).get(sigOf(w.cells)) === 1 && new Set(w.cells).size > 1;

// Harflarni aralashtirish: kamida yarmi o'z joyidan siljiydi, natija so'z bo'lmaydi
function scramble(w, lang, rand) {
  const n = w.cells.length, need = Math.ceil(n / 2), keys = keySet(lang);
  for (let t = 0; t < 200; t++) {
    const s = shuffle(w.cells.slice(), rand);
    const moved = s.filter((c, i) => c !== w.cells[i]).length;
    if (moved < need || keys.has(s.join('|'))) continue;
    // boshidagi 2 harf so'z boshiga o'xshab qolmasin
    if (n > 3 && s[0] === w.cells[0] && s[1] === w.cells[1]) continue;
    return s;
  }
  return w.cells.slice().reverse();
}

function pickWords(pool, n, min, max, lang, rand, avoid = new Set()) {
  for (let extra = 0; extra <= 3; extra++) {
    const ok = pool.filter(w => w.cells.length >= min && w.cells.length <= max + extra && uniqueAnagram(w, lang) && !avoid.has(w.key));
    if (ok.length >= n) return shuffle(ok, rand).slice(0, n);
  }
  return shuffle(pool.filter(w => uniqueAnagram(w, lang) && !avoid.has(w.key)), rand).slice(0, n);
}

const RULE = {
  uz: (tn, L) => L.odd
    ? `Har qatordagi to'rtta so'zning harflari aralashib ketgan. So'zlarni tiklab, kataklarga yoz. Uchtasi «${tn}» mavzusidan, bittasi ortiqcha — uni aylana bilan belgila.`
    : `So'zlarning harflari aralashib ketgan. Harflardan «${tn}» mavzusiga oid so'zni tuzib, kataklarga yoz.${L.first ? ' Birinchi harf yozib qo\'yilgan.' : ''}`,
  ru: (tn, L) => L.odd
    ? `В каждом ряду у четырёх слов перепутаны буквы. Восстанови слова и запиши их в клетки. Три слова — на тему «${tn}», одно лишнее: обведи его.`
    : `У слов перепутаны буквы. Составь из букв слово на тему «${tn}» и запиши его в клетки.${L.first ? ' Первая буква уже написана.' : ''}`,
  en: (tn, L) => L.odd
    ? `In each row the letters of four words are mixed up. Write the words in the boxes. Three are about “${tn}”, one is the odd one out: circle it.`
    : `The letters of each word are mixed up. Make a word about “${tn}” and write it in the boxes.${L.first ? ' The first letter is already there.' : ''}`
};

export default {
  id: 'anagram',
  skills: ['language', 'attention'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  usesLang: true,
  name: { uz: 'Anagramma', ru: 'Анаграммы', en: 'Anagrams' },
  desc: {
    uz: "Aralashgan harflardan mavzuga oid so'zni tuzish; qiyin darajada ortiqcha so'zni topish",
    ru: 'Составить слово из перепутанных букв; на сложном уровне найти лишнее слово',
    en: 'Unscramble the letters to make a word; on the hardest level find the odd one out'
  },
  fileBase: { uz: 'Anagramma', ru: 'Анаграммы', en: 'Anagrams' },
  defaultTitle: { uz: "Harflardan so'z tuz!", ru: 'Составь слово из букв!', en: 'Unscramble the words!' },
  options: [{ key: 'level', type: 'level', default: 1 }, TOPIC_OPTION],
  levelHint: {
    uz: ["3–5 harfli so'zlar, birinchi harf berilgan", "4–6 harfli so'zlar", "6–9 harfli so'zlar", "Qatorda 4 so'z, bittasi ortiqcha"],
    ru: ['Слова из 3–5 букв, первая буква дана', 'Слова из 4–6 букв', 'Слова из 6–9 букв', 'В ряду 4 слова, одно лишнее'],
    en: ['3–5 letter words, first letter given', '4–6 letter words', '6–9 letter words', 'Four words in a row, one is the odd one out']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level], lang = langOf(opts), topic = topicOf(opts);
    const rand = makeRng(seed);
    const n = L.count[opts.perPage === 4 ? 2 : opts.perPage === 2 ? 1 : 0];
    const pool = bankOf(lang, topic);
    if (!L.odd) {
      const words = pickWords(pool, n, L.min, L.max, lang, rand);
      return { level, seed, lang, topic, items: words.map(w => ({ word: w.text, cells: w.cells, mixed: scramble(w, lang, rand) })) };
    }
    // ortiqcha so'zli qatorlar
    const used = new Set(), rows = [];
    const far = shuffle(FAR[topic].slice(), rand);
    for (let r = 0; r < n; r++) {
      const main = pickWords(pool, 3, L.min, L.max, lang, rand, used);
      main.forEach(w => used.add(w.key));
      let odd = null;
      for (let t = 0; t < far.length && !odd; t++) {
        const cand = pickWords(bankOf(lang, far[(r + t) % far.length]), 1, L.min, L.max, lang, rand, used)
          .filter(w => !topicsOfWord(lang, w.key).includes(topic));
        odd = cand[0] || null;
      }
      if (!odd) odd = pickWords(allOf(lang).filter(w => !topicsOfWord(lang, w.key).includes(topic)), 1, L.min, L.max, lang, rand, used)[0];
      used.add(odd.key);
      const words = shuffle([...main.map(w => ({ w, odd: false })), { w: odd, odd: true }], rand);
      rows.push({ words: words.map(({ w, odd: o }) => ({ word: w.text, cells: w.cells, mixed: scramble(w, lang, rand), odd: o, topic: w.topic })) });
    }
    return { level, seed, lang, topic, rows };
  },

  info(p, lang) {
    const tn = topicName(p.topic, lang);
    if (p.rows) return { uz: `${p.rows.length} qator, «${tn}»`, ru: `Рядов: ${p.rows.length}, «${tn}»`, en: `${p.rows.length} rows, “${tn}”` }[lang] || '';
    return { uz: `${p.items.length} ta so'z, «${tn}»`, ru: `Слов: ${p.items.length}, «${tn}»`, en: `${p.items.length} words, “${tn}”` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box), L = LEVELS[p.level];
    const rule = measureRule(ctx, (RULE[lang] || RULE.uz)(topicName(p.topic, p.lang), L), box.w, scale);
    const gap = 6 * scale, H = box.h - rule.h - gap;
    let bottom;
    if (!p.rows) {
      const n = p.items.length, maxLen = Math.max(...p.items.map(it => it.cells.length));
      const numW = 7 * scale;
      // ustunlar soni va katak o'lchami
      let best = null;
      for (let cols = 1; cols <= 2; cols++) {
        const rows = Math.ceil(n / cols);
        const t = Math.min((box.w / cols - numW - gap) / (maxLen * 1.12), H / (rows * 2.75), 12);
        if (!best || t > best.t + 0.01) best = { cols, rows, t };
      }
      const { cols, rows, t } = best;
      const itemW = numW + maxLen * t * 1.12, itemH = t * 2.75;
      const colW = box.w / cols;
      const gy = box.y + Math.max(0, (H - rows * itemH) * 0.3);
      p.items.forEach((it, i) => {
        const c = Math.floor(i / rows), r = i % rows;
        const x0 = box.x + c * colW + (colW - itemW) / 2, y0 = gy + r * itemH;
        font(ctx, Math.min(4.6 * scale, t * 0.5), 800); ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(`${i + 1}.`, x0, y0 + t * 0.55);
        it.mixed.forEach((ch, k) => letterBox(ctx, x0 + numW + k * t * 1.12, y0, t, ch, { fill: '#EEF2FF', stroke: '#A5B4FC' }));
        it.cells.forEach((ch, k) => {
          const given = L.first && k === 0;
          letterBox(ctx, x0 + numW + k * t * 1.12, y0 + t * 1.25, t, given || showSolution ? ch : '', { color: given ? MUTE : ANSWER });
        });
      });
      bottom = gy + rows * itemH;
    } else {
      // har qator: 2×2 so'z guruhi
      const nR = p.rows.length, maxLen = Math.max(...p.rows.flatMap(r => r.words.map(w => w.cells.length)));
      const numW = 7 * scale;
      const t = Math.min((box.w - numW - gap * 2) / (2 * maxLen * 1.12 + 1.4), H / (nR * 5.9 + 0.3), 9);
      const groupW = maxLen * t * 1.12, blockH = t * 5.9;
      const bx = box.x + (box.w - (numW + 2 * groupW + gap * 2)) / 2 + t * 0.35;
      const gy = box.y + Math.max(t * 0.3, (H - nR * blockH) * 0.3);
      p.rows.forEach((row, i) => {
        const y0 = gy + i * blockH;
        font(ctx, Math.min(4.6 * scale, t * 0.55), 800); ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(`${i + 1}.`, bx, y0 + t * 0.55);
        row.words.forEach((w, j) => {
          const gx0 = bx + numW + (j % 2) * (groupW + gap * 2), gy0 = y0 + Math.floor(j / 2) * t * 2.75;
          w.mixed.forEach((ch, k) => letterBox(ctx, gx0 + k * t * 1.12, gy0, t, ch, { fill: '#EEF2FF', stroke: '#A5B4FC' }));
          w.cells.forEach((ch, k) => letterBox(ctx, gx0 + k * t * 1.12, gy0 + t * 1.2, t, showSolution ? ch : '', { color: ANSWER }));
          if (showSolution && w.odd) {
            const wW = w.cells.length * t * 1.12 - t * 0.12;
            ringEllipse(ctx, gx0 + wW / 2, gy0 + t * 1.1, wW / 2 + t * 0.3, t * 1.32, scale);
          }
        });
      });
      bottom = gy + nR * blockH;
    }
    drawRule(ctx, rule, box.x + box.w / 2, bottom + gap * 0.3);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const n = p.rows ? p.rows.length * 4 : p.items.length;
    const T = { uz: `So'zlar: ${n} ta`, ru: `Слов: ${n}`, en: `Words: ${n}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const L = LEVELS[p.level], keys = keySet(p.lang);
    const list = p.rows ? p.rows.flatMap(r => r.words) : p.items;
    const seen = new Set();
    for (const it of list) {
      const key = it.cells.join('|');
      if (seen.has(key)) problems.push('repeated word ' + it.word);
      seen.add(key);
      if (!keys.has(key)) problems.push('not in bank ' + it.word);
      if (!uniqueAnagram({ cells: it.cells }, p.lang)) problems.push('ambiguous ' + it.word);
      if (sigOf(it.mixed) !== sigOf(it.cells)) problems.push('letters differ ' + it.word);
      if (keys.has(it.mixed.join('|'))) problems.push('scramble is a word ' + it.word);
      if (it.mixed.join('|') === key) problems.push('not scrambled ' + it.word);
    }
    if (p.rows) for (const r of p.rows) {
      const odd = r.words.filter(w => w.odd);
      if (r.words.length !== 4 || odd.length !== 1) problems.push('row shape');
      else {
        if (topicsOfWord(p.lang, odd[0].cells.join('|')).includes(p.topic)) problems.push('odd word is in topic');
        if (r.words.some(w => !w.odd && !topicsOfWord(p.lang, w.cells.join('|')).includes(p.topic))) problems.push('main word not in topic');
      }
    }
    if (!p.rows && L.min && list.some(it => it.cells.length < L.min - 1)) problems.push('word too short');
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-anagram" aria-hidden="true"><defs><linearGradient id="cg-anagram" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6d365"/><stop offset="1" stop-color="#fda085"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-anagram)"/><g fill="#EEF2FF" stroke="#6366F1" stroke-width="3"><rect x="45" y="48" width="32" height="32" rx="6"/><rect x="84" y="48" width="32" height="32" rx="6"/><rect x="123" y="48" width="32" height="32" rx="6"/></g><g font-family="Nunito, sans-serif" font-weight="900" font-size="22" text-anchor="middle" fill="#312e81"><text x="61" y="72">L</text><text x="100" y="72">I</text><text x="139" y="72">F</text></g><path d="M100 90v18M92 101l8 8 8-8" fill="none" stroke="#7c2d12" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><g fill="#fff" stroke="#111827" stroke-width="3"><rect x="45" y="120" width="32" height="32" rx="6"/><rect x="84" y="120" width="32" height="32" rx="6"/><rect x="123" y="120" width="32" height="32" rx="6"/></g><g font-family="Nunito, sans-serif" font-weight="900" font-size="22" text-anchor="middle" fill="#DC2626"><text class="an-w" x="61" y="144">F</text><text class="an-x" x="100" y="144">I</text><text class="an-y" x="139" y="144">L</text></g></svg>`
};
