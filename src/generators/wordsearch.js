// wordsearch.js — "So'z qidiruv" (filvord) generatori.
// Kafolatlar:
//   • har bir so'z jadvalda AYNAN BIR MARTA uchraydi (istalgan 8 yo'nalishda tekshiriladi);
//   • ro'yxatdagi so'z boshqa so'zning ichida bo'lmaydi (aks holda u ikki marta "topilardi");
//   • o'zbekcha O' va G' — bitta harf, bitta katakka yoziladi.

import { makeRng, shuffle } from '../core/rng.js';
import { INK, MUTE, PT, font, wrapLines } from '../core/draw.js';
import { TOPICS, BANKS } from './wordsearch-words.js';

// 8 yo'nalish: sharq, janub, janubi-sharq, shimoli-sharq, g'arb, shimol, shimoli-g'arb, janubi-g'arb
const DIR_VEC = [[1, 0], [0, 1], [1, 1], [1, -1], [-1, 0], [0, -1], [-1, -1], [-1, 1]];
const LEVEL_DIRS = [[0, 1], [0, 1, 2], [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5, 6, 7]];
const LEVEL_K = [2.7, 2.3, 1.95, 1.65];        // jadval zichligi: kichik son — zichroq jadval
const LEVEL_WORDS = [8, 10, 12, 14];           // har darajada nechta so'z tanlanadi

const OQ = '‘';                           // ‘ — O‘ va G‘ dagi belgi
const ALPHABETS = {
  uz: [...'ABDEFGHIJKLMNOPQRSTUVXYZ', 'O' + OQ, 'G' + OQ],
  ru: [...'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'],
  en: [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'],
  uzc: [...'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЪЭЮЯЎҚҒҲ']   // o'zbek kirill yozuvi
};
const APOS = /['‘’ʻʼ`´]/;
const CYR = /[А-ЯЁЎҚҒҲ]/;

// So'zni katakchalarga ajratadi: "BO'RI" → ["B","O‘","R","I"]. Harf bo'lmagan belgilar tashlab yuboriladi.
export function toCells(text) {
  const s = String(text).toUpperCase();
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if ((ch === 'O' || ch === 'G') && APOS.test(s[i + 1] || '')) { out.push(ch + OQ); i++; continue; }
    if (/[A-ZА-ЯЁЎҚҒҲ]/.test(ch)) out.push(ch);
  }
  return out;
}
// Ro'yxatda ko'rsatiladigan yozuv: "qor odam" → "QOR ODAM", "bo'ri" → "BO‘RI"
function displayOf(text) {
  return String(text).toUpperCase().replace(/([OG])['‘’ʻʼ`´]/g, '$1' + OQ).replace(/['’ʻʼ`´]/g, '’').replace(/\s+/g, ' ').trim();
}
const keyOf = cells => '|' + cells.join('|') + '|';

function makeWord(text) {
  const cells = toCells(text);
  return { text: displayOf(text), cells, key: keyOf(cells), rkey: keyOf(cells.slice().reverse()) };
}
// a so'zi b ning ichidami (to'g'ri yoki teskari)?
const inside = (a, b) => b.key.includes(a.key) || b.key.includes(a.rkey);

// O'qituvchi yozgan so'zlar: vergul, nuqtali vergul yoki yangi qator bilan ajratiladi.
// Bular bo'lmasa — bo'sh joy bilan. Bir xil yozuv (kirill/lotin) dagi so'zlar olinadi.
export function parseCustom(text, lang) {
  const raw = String(text || '');
  const parts = /[,;\n]/.test(raw) ? raw.split(/[,;\n]+/) : raw.split(/\s+/);
  const items = [];
  const seen = new Set();
  for (const part of parts) {
    if (!part.trim()) continue;
    const wd = makeWord(part);
    if (wd.cells.length < 2 || wd.cells.length > 15 || seen.has(wd.key)) continue;
    seen.add(wd.key);
    wd.cyr = wd.cells.some(c => CYR.test(c));
    items.push(wd);
  }
  const cyr = items.filter(x => x.cyr).length;
  const script = cyr > items.length - cyr ? 'cyr' : 'lat';
  let words = items.filter(x => (script === 'cyr') === x.cyr);
  let alphabet = 'ru';
  if (script === 'lat') {
    // Lotin yozuvidagi so'zlar ichida kirill harfi aralashgan bo'lsa (masalan, "MАШИНА"), olib tashlaymiz
    words = words.filter(x => !x.cells.some(c => CYR.test(c)));
    alphabet = lang === 'uz' || words.some(x => x.cells.some(c => c.length > 1)) ? 'uz' : 'en';
  } else {
    words = words.filter(x => x.cells.every(c => CYR.test(c)));
    if (words.some(x => x.cells.some(c => /[ЎҚҒҲ]/.test(c)))) alphabet = 'uzc';
  }
  // Boshqa so'z ichida bor so'zlarni olib tashlaymiz
  const kept = [];
  for (const wd of words.slice().sort((a, b) => b.cells.length - a.cells.length)) {
    if (!kept.some(k => inside(wd, k))) kept.push(wd);
  }
  const order = new Map(words.map((x, i) => [x, i]));
  kept.sort((a, b) => order.get(a) - order.get(b));
  return { words: kept.slice(0, 25), alphabet, skipped: items.length - Math.min(kept.length, 25) };
}

// Bankdan so'z tanlash: bir-birining ichida bo'lgan so'zlar birga tanlanmaydi
function pickWords(pool, count, rand) {
  const chosen = [];
  for (const wd of shuffle(pool.slice(), rand)) {
    if (chosen.length >= count) break;
    if (chosen.some(c => c.key === wd.key || inside(c, wd) || inside(wd, c))) continue;
    chosen.push(wd);
  }
  return chosen;
}

// So'zlarni setkaga joylash (ruxsat etilgan yo'nalishlarda); joylashmasa null
function tryBuild(words, N, dirs, rand) {
  const grid = new Array(N * N).fill('');
  const placed = [];
  const order = words.slice().sort((a, b) => b.cells.length - a.cells.length);
  for (const wd of order) {
    const w = wd.cells, L = w.length;
    let ok = false;
    const dirOrder = shuffle(dirs.slice(), rand);
    for (let t = 0; t < 300 && !ok; t++) {
      const d = dirOrder[t % dirOrder.length];
      const [dx, dy] = DIR_VEC[d];
      const r0 = Math.floor(rand() * N), c0 = Math.floor(rand() * N);
      const er = r0 + dy * (L - 1), ec = c0 + dx * (L - 1);
      if (er < 0 || er >= N || ec < 0 || ec >= N) continue;
      let fits = true;
      for (let i = 0; i < L; i++) {
        const ch = grid[(r0 + dy * i) * N + (c0 + dx * i)];
        if (ch && ch !== w[i]) { fits = false; break; }
      }
      if (!fits) continue;
      // Bir so'zni boshqasining ustiga butunlay qo'ymaymiz (masalan, bir xil yo'nalishda ustma-ust)
      const cells = Array.from({ length: L }, (_, i) => (r0 + dy * i) * N + (c0 + dx * i));
      if (placed.some(p => cells.filter(c => p.idx.includes(c)).length > 1)) continue;
      for (let i = 0; i < L; i++) grid[cells[i]] = w[i];
      placed.push({ word: wd, idx: cells, cells: cells.map(c => [Math.floor(c / N), c % N]) });
      ok = true;
    }
    if (!ok) return null;
  }
  return { grid, placed };
}

// So'z jadvalda necha marta uchraydi (har bir uchrash — boshlanish va tugash katagi juftligi)
function occurrences(grid, N, cells) {
  const L = cells.length, found = [];
  const seen = new Set();
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (grid[r * N + c] !== cells[0]) continue;
    for (const [dx, dy] of DIR_VEC) {
      const er = r + dy * (L - 1), ec = c + dx * (L - 1);
      if (er < 0 || er >= N || ec < 0 || ec >= N) continue;
      let ok = true;
      for (let i = 1; i < L && ok; i++) if (grid[(r + dy * i) * N + (c + dx * i)] !== cells[i]) ok = false;
      if (!ok) continue;
      const a = r * N + c, b = er * N + ec;
      const key = Math.min(a, b) + '-' + Math.max(a, b);
      if (seen.has(key)) continue;                 // palindrom: o'sha kataklar teskari o'qilgan
      seen.add(key);
      found.push(Array.from({ length: L }, (_, i) => (r + dy * i) * N + (c + dx * i)));
    }
  }
  return found;
}

// Bo'sh kataklarni tasodifiy harflar bilan to'ldiradi va tasodifan paydo bo'lgan
// ikkinchi nusxalarni (masalan, "OT" yana bir joyda) tuzatadi. Tuzatib bo'lmasa — null.
function fillAndRepair(base, placed, N, alphabet, rand) {
  const grid = base.slice();
  const fixed = new Uint8Array(N * N);
  placed.forEach(p => p.idx.forEach(i => { fixed[i] = 1; }));
  for (let i = 0; i < grid.length; i++) if (!grid[i]) grid[i] = alphabet[Math.floor(rand() * alphabet.length)];
  for (let round = 0; round < 400; round++) {
    let clean = true;
    for (const p of placed) {
      const occ = occurrences(grid, N, p.word.cells);
      if (occ.length === 1) continue;
      clean = false;
      const own = p.idx[0] + '-' + p.idx[p.idx.length - 1];
      for (const o of occ) {
        const k1 = o[0] + '-' + o[o.length - 1], k2 = o[o.length - 1] + '-' + o[0];
        if (k1 === own || k2 === own) continue;
        const free = o.filter(i => !fixed[i]);
        if (!free.length) return null;             // ortiqcha nusxa faqat so'zlardan iborat
        const i = free[Math.floor(rand() * free.length)];
        let ch = grid[i];
        while (ch === grid[i]) ch = alphabet[Math.floor(rand() * alphabet.length)];
        grid[i] = ch;
      }
    }
    if (clean) return grid;
  }
  return null;
}

const INSTRUCTIONS = {
  uz: ["So'zlar chapdan o'ngga va yuqoridan pastga yozilgan.",
    "So'zlar chapdan o'ngga, yuqoridan pastga va qiya (pastga) yozilgan.",
    "So'zlar gorizontal, vertikal va qiya yozilgan; ba'zilari teskari.",
    "So'zlar istalgan yo'nalishda, teskari ham yozilgan bo'lishi mumkin."],
  ru: ['Слова записаны слева направо и сверху вниз.',
    'Слова записаны слева направо, сверху вниз и по диагонали вниз.',
    'Слова записаны по горизонтали, вертикали и диагонали; некоторые — задом наперёд.',
    'Слова могут идти в любом направлении, в том числе задом наперёд.'],
  en: ['Words go left to right and top to bottom.',
    'Words go left to right, top to bottom and diagonally down.',
    'Words go across, down and diagonally; some are backwards.',
    'Words can go in any direction, even backwards.']
};
const PALETTE = ['#F9A8A8', '#FCD08A', '#F4E27A', '#A7E3B0', '#9FD3F2', '#C4B5F4', '#F5B3D6', '#B8E0D2'];
const BANK_CACHE = {};
function bank(lang, topic) {
  const k = lang + '|' + topic;
  if (!BANK_CACHE[k]) BANK_CACHE[k] = (BANKS[lang] || BANKS.uz)[topic].map(makeWord);
  return BANK_CACHE[k];
}

export default {
  id: 'words',
  skills: ['attention', 'language'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: "So'z qidiruv", ru: 'Найди слова', en: 'Word search' },
  desc: {
    uz: "Jadvalga yashiringan so'zlarni toping — 11 ta mavzu yoki o'z so'zlaringiz",
    ru: 'Найдите спрятанные слова — 11 тем или свои слова',
    en: 'Find the hidden words — 11 topics or your own words'
  },
  fileBase: { uz: "so'z qidiruv", ru: 'Найди слова', en: 'Word search' },
  defaultTitle: { uz: "Jadvaldan so'zlarni top!", ru: 'Найди все слова в таблице!', en: 'Find all the words!' },
  usesLang: true,
  options: [
    { key: 'level', type: 'level', default: 1 },
    {
      key: 'topic', type: 'choice', style: 'cards', pack: 'select', default: 'school',
      label: { uz: 'Mavzu', ru: 'Тема', en: 'Topic' },
      choices: [
        ...TOPICS.map(tp => ({ value: tp.key, big: tp.icon, label: tp.name })),
        { value: 'custom', big: '✏️', label: { uz: "O'zim yozaman", ru: 'Свои слова', en: 'My words' }, noPack: true }
      ]
    },
    {
      key: 'words', type: 'text', when: o => o.topic === 'custom', default: '',
      label: { uz: "So'zlaringiz (vergul bilan yoki har birini yangi qatordan)", ru: 'Ваши слова (через запятую или с новой строки)', en: 'Your words (comma-separated or one per line)' },
      placeholder: { uz: "olma, nok, o'rik, gilos", ru: 'яблоко, груша, слива', en: 'apple, pear, plum' }
    }
  ],

  // opts: { level, topic, words, lang }
  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const lang = BANKS[opts.lang] ? opts.lang : 'uz';
    let topic = TOPICS.some(tp => tp.key === opts.topic) || opts.topic === 'custom' ? opts.topic : 'school';
    let words, alphabet = lang, skipped = 0, fallback = false;
    if (topic === 'custom') {
      const parsed = parseCustom(opts.words, lang);
      skipped = parsed.skipped;
      if (parsed.words.length >= 3) { words = parsed.words; alphabet = parsed.alphabet; }
      else { fallback = true; topic = 'school'; }
    }
    if (!words) words = pickWords(bank(lang, topic), LEVEL_WORDS[level], makeRng(seed * 7 + 3));

    const dirs = LEVEL_DIRS[level];
    const longest = Math.max(...words.map(x => x.cells.length));
    const letters = words.reduce((s, x) => s + x.cells.length, 0);
    let N = Math.min(22, Math.max(longest, Math.ceil(Math.sqrt(letters * LEVEL_K[level])), 9));
    let grid = null, placed = null;
    for (let attempt = 0; attempt < 40 && !grid; attempt++) {
      const rand = makeRng(seed + attempt * 977);
      const res = tryBuild(words, N, dirs, rand);
      if (res) grid = fillAndRepair(res.grid, res.placed, N, ALPHABETS[alphabet], makeRng(seed * 131 + 11 + attempt));
      if (grid) placed = res.placed;
      else if (attempt % 3 === 2) N = Math.min(N + 1, 24);
    }
    if (!grid) {                                   // amalda yuz bermaydi: so'zlarsiz bo'sh jadval
      grid = new Array(N * N).fill('·'); placed = [];
    }
    const list = placed.map(p => ({ text: p.word.text, cells: p.cells })).sort((a, b) => a.text.localeCompare(b.text, lang));
    return { level, seed, topic, custom: opts.topic === 'custom' && !fallback, fallback, skipped, N, grid, words: list, lang };
  },

  info(p, lang) {
    const tp = TOPICS.find(x => x.key === p.topic);
    const nm = p.custom ? { uz: "o'z so'zlari", ru: 'свои слова', en: 'own words' }[lang] : (tp ? tp.name[lang] || tp.name.uz : p.topic);
    return `${nm}, ${p.N}×${p.N}`;
  },

  draw(ctx, p, box, { showSolution, lang }) {
    const N = p.N, total = p.words.length;
    ctx.save();
    const scale = Math.max(0.68, Math.min(1, box.w / 186));
    const listFs = 12 * PT * scale;
    const rowH = listFs * 1.75;
    const cols = total <= 6 ? 2 : (total <= 12 ? 3 : 4);
    const rows = Math.ceil(total / cols);
    const ruleFs = 10 * PT * scale;
    font(ctx, ruleFs, 400);
    const ruleLines = wrapLines(ctx, (INSTRUCTIONS[lang] || INSTRUCTIONS.uz)[p.level], box.w);
    const gap1 = 6 * scale, gap2 = 3 * scale;
    const listH = rows * rowH, ruleH = ruleLines.length * ruleFs * 1.35;
    const cell = Math.min(box.w / N, 13, (box.h - gap1 - listH - gap2 - ruleH) / N);
    const size = cell * N;
    const blockH = size + gap1 + listH + gap2 + ruleH;
    const gx = box.x + (box.w - size) / 2;
    const gy = box.y + Math.max(0, (box.h - blockH) * 0.4);

    if (showSolution) {                            // javob: har bir so'z rangli "kapsula" ichida
      ctx.lineCap = 'round';
      p.words.forEach((wd, i) => {
        const [r0, c0] = wd.cells[0], [r1, c1] = wd.cells[wd.cells.length - 1];
        ctx.strokeStyle = PALETTE[i % PALETTE.length];
        ctx.globalAlpha = 0.75;
        ctx.lineWidth = cell * 0.78;
        ctx.beginPath();
        ctx.moveTo(gx + (c0 + 0.5) * cell, gy + (r0 + 0.5) * cell);
        ctx.lineTo(gx + (c1 + 0.5) * cell + 0.001, gy + (r1 + 0.5) * cell);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }

    // Harflar (O‘ va G‘ katakka sig'ishi uchun kerak bo'lsa kichraytiriladi)
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const fs = cell * 0.6;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const ch = p.grid[r * N + c];
      font(ctx, fs, 700);
      const wdt = ctx.measureText(ch).width;
      if (wdt > cell * 0.86) font(ctx, fs * cell * 0.86 / wdt, 700);
      ctx.fillText(ch, gx + (c + 0.5) * cell, gy + (r + 0.5) * cell + cell * 0.03);
    }

    // Katakcha chiziqlari va ramka
    ctx.strokeStyle = '#C9D3E3'; ctx.lineWidth = 0.22;
    ctx.beginPath();
    for (let i = 1; i < N; i++) {
      ctx.moveTo(gx + i * cell, gy); ctx.lineTo(gx + i * cell, gy + size);
      ctx.moveTo(gx, gy + i * cell); ctx.lineTo(gx + size, gy + i * cell);
    }
    ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 0.8;
    ctx.strokeRect(gx, gy, size, size);

    // So'zlar ro'yxati: belgilash katakchasi + so'z
    const listTop = gy + size + gap1;
    const listW = Math.min(box.w, Math.max(size, box.w * 0.9));
    const lx0 = box.x + (box.w - listW) / 2, colW = listW / cols;
    const bx = 3.2 * scale;
    p.words.forEach((wd, i) => {
      const col = Math.floor(i / rows), row = i % rows;       // ustun bo'yicha alifbo tartibida
      const x = lx0 + col * colW, y = listTop + row * rowH + rowH / 2;
      ctx.strokeStyle = INK; ctx.lineWidth = 0.3;
      ctx.strokeRect(x, y - bx / 2, bx, bx);
      if (showSolution) {
        ctx.strokeStyle = '#15803D'; ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(x + 0.5, y); ctx.lineTo(x + 1.4, y + 1.1); ctx.lineTo(x + 2.9, y - 1.3); ctx.stroke();
      }
      font(ctx, listFs, 700);
      let t = wd.text;
      const maxW = colW - bx - 3;
      if (ctx.measureText(t).width > maxW) font(ctx, listFs * maxW / ctx.measureText(t).width, 700);
      ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(t, x + bx + 1.6, y + 0.2);
    });

    font(ctx, ruleFs, 400);
    ctx.fillStyle = MUTE; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ruleLines.forEach((ln, i) => ctx.fillText(ln, box.x + box.w / 2, listTop + listH + gap2 + i * ruleFs * 1.35));
    ctx.restore();
    return { cell };
  },

  hint(p, info, lang) {
    const n = p.words.length;
    const base = { uz: `So'zlar: ${n} · jadval ${p.N}×${p.N}`, ru: `Слов: ${n} · таблица ${p.N}×${p.N}`, en: `Words: ${n} · grid ${p.N}×${p.N}` }[lang];
    if (p.fallback) return { text: { uz: "Kamida 3 ta so'z yozing (hozircha «Maktab» so'zlari ko'rsatilmoqda)", ru: 'Впишите хотя бы 3 слова (пока показаны слова темы «Школа»)', en: 'Enter at least 3 words (showing «School» words for now)' }[lang], warn: true };
    if (p.skipped) return { text: base + { uz: ` · ${p.skipped} ta so'z olinmadi (takror, juda uzun yoki boshqa so'z ichida)`, ru: ` · пропущено слов: ${p.skipped} (повтор, слишком длинное или внутри другого)`, en: ` · ${p.skipped} word(s) skipped (duplicate, too long or inside another)` }[lang], warn: true };
    return { text: base, warn: false };
  },

  // Testlar uchun: har bir so'z aynan bir marta, to'g'ri joyda
  check(p) {
    const problems = [];
    for (const wd of p.words) {
      const cells = wd.cells.map(([r, c]) => p.grid[r * p.N + c]);
      if (cells.join('') !== toCells(wd.text).join('')) problems.push('word cells mismatch: ' + wd.text);
      const occ = occurrences(p.grid, p.N, cells);
      if (occ.length !== 1) problems.push(`"${wd.text}" occurs ${occ.length} times`);
    }
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-words" aria-hidden="true"><defs><linearGradient id="cg-words" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fa709a"/><stop offset="1" stop-color="#fee140"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-words)"/><g fill="#fff" opacity=".35"><rect x="30" y="50" width="26" height="26" rx="4"/><rect x="62" y="50" width="26" height="26" rx="4"/><rect x="94" y="50" width="26" height="26" rx="4"/><rect x="126" y="50" width="26" height="26" rx="4"/></g><rect class="w-found" x="62" y="50" width="26" height="26" rx="4" fill="#22C55E"/><text x="75" y="69" font-family="Nunito,Arial,sans-serif" font-size="17" font-weight="900" fill="#fff" text-anchor="middle">A</text><g class="w-lupa"><circle cx="100" cy="104" r="33" fill="none" stroke="#fff" stroke-width="9"/><line x1="124" y1="128" x2="154" y2="158" stroke="#fff" stroke-width="11" stroke-linecap="round"/><text x="100" y="114" font-family="Nunito,Arial,sans-serif" font-size="30" font-weight="900" fill="#fff" text-anchor="middle">A</text></g></svg>`
};
