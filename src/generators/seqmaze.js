// seqmaze.js — «Harfli va sonli labirint» (Лабиринт по порядку) generatori.
// To'rda sonlar (yoki harflar) yozilgan. Chap tomondagi kirishdan o'ng tomondagi chiqishgacha yo'l
// faqat tartib bo'yicha keladigan kataklar orqali o'tadi: 1 → 2 → 3 → … (yoki A → B → D → …).
// Bola qo'shni (yonma-yon yoki ustma-ust) kataklar bo'ylab yuradi va yo'lni chizadi/bo'yaydi.
// Kafolat (check()): yo'l yagona — har bir qadamda keyingi qiymat faqat bitta qo'shni katakda bor;
// boshlang'ich qiymat to'rda faqat bir marta uchraydi; yo'l kirishdan boshlanib, chiqishda tugaydi.

import { makeRng, shuffle } from '../core/rng.js';
import { INK, MUTE, ANSWER, font } from '../core/draw.js';
import { scaleOf, measureRule, drawRule } from '../core/parts.js';

// R×C — to'r; len — yo'l uzunligi (null — butun alifbo); step — sanoq qadami (sonlarda)
const LEVELS = {
  numbers: [
    { R: 5, C: 5, len: 12, step: 1 },
    { R: 6, C: 6, len: 20, step: 1 },
    { R: 7, C: 7, len: 24, step: 1 },
    { R: 8, C: 8, len: 30, step: 2 }
  ],
  letters: [
    { R: 5, C: 5, len: 10 },
    { R: 6, C: 6, len: 16 },
    { R: 7, C: 7, len: null },
    { R: 8, C: 8, len: null, mixCase: true }
  ]
};
const ALPHABET = {
  uz: ['A', 'B', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'X', 'Y', 'Z', 'Oʻ', 'Gʻ', 'Sh', 'Ch', 'Ng'],
  ru: 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'.split(''),
  en: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
};
const lowerOf = s => (s === 'Oʻ' ? 'oʻ' : s === 'Gʻ' ? 'gʻ' : s.toLowerCase());
const NO_LOWER = new Set(['I', 'L']);

const MODES = {
  numbers: { big: '1→2→3', label: { uz: 'Sonlar', ru: 'Числа', en: 'Numbers' } },
  letters: { big: { uz: 'A→B→D', ru: 'А→Б→В', en: 'A→B→C' }, label: { uz: 'Harflar', ru: 'Буквы', en: 'Letters' } }
};
const RULE = {
  numbers: {
    uz: (a, b, st) => `Kirishdan chiqishgacha yo'l top: ${a} dan boshlab ${st > 1 ? st + ' tadan sanab' : 'tartib bilan'} (${a}, ${a + st}, ${a + 2 * st}, …) ${b} gacha yur. Faqat yonidagi yoki ustidagi/ostidagi katakka o'tish mumkin, qiyshiq yurilmaydi.`,
    ru: (a, b, st) => `Найди путь от входа до выхода: начни с ${a} и иди ${st > 1 ? 'через ' + st : 'по порядку'} (${a}, ${a + st}, ${a + 2 * st}, …) до ${b}. Переходить можно только в соседнюю клетку слева, справа, сверху или снизу, не по диагонали.`,
    en: (a, b, st) => `Find the way from the entrance to the exit: start at ${a} and go ${st > 1 ? 'counting by ' + st + 's' : 'in order'} (${a}, ${a + st}, ${a + 2 * st}, …) up to ${b}. Move only to a cell beside, above or below — not diagonally.`
  },
  letters: {
    uz: (a, b) => `Kirishdan chiqishgacha yo'l top: harflar alifbo tartibida keladi (${a} dan ${b} gacha). Faqat yonidagi yoki ustidagi/ostidagi katakka o'tish mumkin, qiyshiq yurilmaydi.`,
    ru: (a, b) => `Найди путь от входа до выхода: буквы идут по алфавиту (от ${a} до ${b}). Переходить можно только в соседнюю клетку слева, справа, сверху или снизу, не по диагонали.`,
    en: (a, b) => `Find the way from the entrance to the exit: the letters go in alphabetical order (from ${a} to ${b}). Move only to a cell beside, above or below — not diagonally.`
  },
  mixCase: {
    uz: ' Katta va kichik harf bir xil hisoblanadi.',
    ru: ' Заглавная и строчная буква считаются одной и той же.',
    en: ' Capital and small letters count as the same letter.'
  }
};

const NB = [[0, 1], [1, 0], [0, -1], [-1, 0]];

// Chap ustundan o'ng ustungacha aynan n katakli o'zini kesmaydigan yo'l (orqaga qaytib qidirish)
function findPath(R, C, n, rand) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const r0 = Math.floor(rand() * R);
    const seen = new Uint8Array(R * C);
    const path = [[r0, 0]];
    seen[r0 * C] = 1;
    let budget = 4000;
    const dfs = () => {
      if (--budget < 0) return false;
      const [r, c] = path[path.length - 1];
      if (path.length === n) return c === C - 1;
      const left = n - path.length;
      if (C - 1 - c > left) return false;
      for (const [dr, dc] of shuffle(NB.slice(), rand)) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || rr >= R || cc < 0 || cc >= C || seen[rr * C + cc]) continue;
        // yo'l o'ziga yopishmasin: yangi katak yo'lning oldingi qismiga (oxirgisidan tashqari) tegmasin
        let touch = 0;
        for (const [er, ec] of NB) { const qr = rr + er, qc = cc + ec; if (qr >= 0 && qr < R && qc >= 0 && qc < C && seen[qr * C + qc]) touch++; }
        if (touch > 1) continue;
        seen[rr * C + cc] = 1; path.push([rr, cc]);
        if (dfs()) return true;
        seen[rr * C + cc] = 0; path.pop();
      }
      return false;
    };
    if (dfs()) return path;
  }
  return null;
}

export default {
  id: 'seqmaze',
  skills: ['attention', 'counting', 'language'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  usesLang: true,                 // harflar tilga bog'liq (alifbo)
  name: { uz: 'Harfli va sonli labirint', ru: 'Лабиринт по порядку', en: 'Sequence maze' },
  desc: {
    uz: "Yo'l faqat tartib bilan keladigan son yoki harflar orqali o'tadi — sanoq va alifboni mustahkamlash",
    ru: 'Путь идёт только по числам или буквам по порядку — счёт и алфавит',
    en: 'The path follows numbers or letters in order — counting and the alphabet'
  },
  fileBase: { uz: 'Harfli va sonli labirint', ru: 'Лабиринт по порядку', en: 'Sequence maze' },
  defaultTitle: { uz: "Tartib bilan yur!", ru: 'Иди по порядку!', en: 'Follow the order!' },
  options: [
    { key: 'level', type: 'level', default: 1 },
    {
      key: 'mode', type: 'choice', style: 'cards', pack: 'select', default: 'numbers',
      label: { uz: 'Turi', ru: 'Вид', en: 'Kind' },
      choices: Object.entries(MODES).map(([value, m]) => ({ value, big: m.big, label: m.label }))
    }
  ],
  levelHint: {
    uz: ['5×5 to\'r, 1–12 yoki 10 ta harf', "6×6 to'r, 1–20 yoki 16 ta harf", "7×7 to'r, 1–24 yoki butun alifbo", "8×8 to'r, 2 tadan sanash (2–60) yoki butun alifbo katta-kichik harf aralash"],
    ru: ['Сетка 5×5, 1–12 или 10 букв', 'Сетка 6×6, 1–20 или 16 букв', 'Сетка 7×7, 1–24 или весь алфавит', 'Сетка 8×8, счёт через 2 (2–60) или весь алфавит вперемешку заглавные и строчные'],
    en: ['5×5 grid, 1–12 or 10 letters', '6×6 grid, 1–20 or 16 letters', '7×7 grid, 1–24 or the whole alphabet', '8×8 grid, counting by 2s (2–60) or the whole alphabet with mixed case']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const mode = opts.mode in MODES ? opts.mode : 'numbers';
    const lang = ALPHABET[opts.lang] ? opts.lang : 'uz';
    const L = LEVELS[mode][level];
    const rand = makeRng(seed);
    const abc = ALPHABET[lang];
    const n = mode === 'letters' ? Math.min(L.len || abc.length, abc.length) : L.len;
    let R = L.R, C = L.C;
    // Butun alifbo sig'ishi uchun to'r yetarli bo'lsin (rus alifbosida 33 harf)
    while (n > R * C * 0.5) { R++; C++; }
    const path = findPath(R, C, n, rand);
    if (!path) throw new Error('seqmaze: no path');
    // Qiymatlar: 0..n-1 (indeks) — chizishda son yoki harfga aylanadi
    const grid = new Array(R * C).fill(-1);
    path.forEach(([r, c], i) => { grid[r * C + c] = i; });
    // Qolgan kataklar: chalg'ituvchi qiymatlar. Yo'l katagi i ga qo'shni katakka (i+1) qo'yilmaydi;
    // boshlang'ich (0) va oxirgi qiymat boshqa joyda uchramaydi.
    const nextOf = new Map();                       // katak → taqiqlangan qiymatlar
    path.forEach(([r, c], i) => {
      for (const [dr, dc] of NB) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || rr >= R || cc < 0 || cc >= C) continue;
        const k = rr * C + cc;
        if (grid[k] >= 0) continue;
        if (!nextOf.has(k)) nextOf.set(k, new Set());
        nextOf.get(k).add(i + 1);
        nextOf.get(k).add(i);                      // yo'l yonida o'zining qiymati ham bo'lmasin (chalkashlik kamroq)
      }
    });
    for (let k = 0; k < R * C; k++) {
      if (grid[k] >= 0) continue;
      const ban = nextOf.get(k) || new Set();
      // Ko'pincha yaqin qiymat (yo'ldagi qo'shnisining qiymatiga yaqin) — chalg'itish uchun
      let v, tries = 0;
      do { v = 1 + Math.floor(rand() * (n - 2)); tries++; } while ((ban.has(v) || v === 0 || v === n - 1) && tries < 200);
      if (ban.has(v)) { for (v = 1; v < n - 1 && ban.has(v); v++); }
      grid[k] = v;
    }
    const lc = mode === 'letters' && L.mixCase ? grid.map(v => !NO_LOWER.has(abc[v]) && rand() < 0.45) : null;
    return { level, seed, mode, lang, R, C, n, step: L.step || 1, grid, path, lc };
  },

  info(p, lang) {
    return { uz: `${p.R}×${p.C} to'r, yo'l ${p.n} katak`, ru: `сетка ${p.R}×${p.C}, путь ${p.n} клеток`, en: `${p.R}×${p.C} grid, path of ${p.n} cells` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box);
    const abc = ALPHABET[p.lang] || ALPHABET.uz;
    const label = (v, k) => (p.mode === 'letters' ? (p.lc && p.lc[k] ? lowerOf(abc[v]) : abc[v]) : String(p.step * (v + 1)));
    let text = p.mode === 'letters'
      ? (RULE.letters[lang] || RULE.letters.uz)(abc[0], abc[p.n - 1])
      : (RULE.numbers[lang] || RULE.numbers.uz)(p.step, p.step * p.n, p.step);
    if (p.lc) text += RULE.mixCase[lang] || RULE.mixCase.uz;
    const rule = measureRule(ctx, text, box.w, scale);
    const gap = 4 * scale;
    const arrowW = 9 * scale;
    const cs = Math.min((box.w - 2 * arrowW) / p.C, (box.h - rule.h - gap) / p.R, 22);
    const W = cs * p.C, H = cs * p.R;
    const top = box.y + Math.max(0, (box.h - H - gap - rule.h) * 0.4);
    const left = box.x + (box.w - W) / 2;

    // Javob: yo'l kataklari och qizil, markazlari chiziq bilan tutashtiriladi
    if (showSolution) {
      ctx.save(); ctx.fillStyle = '#FDECEC';
      p.path.forEach(([r, c]) => ctx.fillRect(left + c * cs, top + r * cs, cs, cs));
      ctx.restore();
    }
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.25, 0.35 * scale);
    ctx.beginPath();
    for (let i = 0; i <= p.C; i++) { ctx.moveTo(left + i * cs, top); ctx.lineTo(left + i * cs, top + H); }
    for (let j = 0; j <= p.R; j++) { ctx.moveTo(left, top + j * cs); ctx.lineTo(left + W, top + j * cs); }
    ctx.stroke();
    ctx.lineWidth = Math.max(0.5, 0.8 * scale); ctx.strokeRect(left, top, W, H);
    if (showSolution) {
      ctx.save(); ctx.strokeStyle = ANSWER; ctx.lineWidth = Math.max(0.5, 0.9 * scale); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.globalAlpha = 0.7;
      ctx.beginPath();
      p.path.forEach(([r, c], i) => { const x = left + c * cs + cs / 2, y = top + r * cs + cs / 2; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.stroke(); ctx.restore();
    }
    // Belgilar
    const longest = Math.max(...p.grid.map((v, k) => label(v, k).length));
    p.grid.forEach((v, k) => {
      const r = Math.floor(k / p.C), c = k % p.C;
      const s = label(v, k);
      const fs = cs * (longest > 2 ? 0.36 : longest > 1 ? 0.42 : 0.5);
      font(ctx, fs, 800);
      ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(s, left + c * cs + cs / 2, top + r * cs + cs / 2 + fs * 0.04);
    });
    // Kirish va chiqish o'qlari
    const arrow = (x, y, color) => {
      ctx.save(); ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(x - arrowW * 0.75, y - cs * 0.22); ctx.lineTo(x - arrowW * 0.75, y + cs * 0.22); ctx.lineTo(x - arrowW * 0.1, y); ctx.closePath(); ctx.fill();
      ctx.restore();
    };
    const [sr] = p.path[0], [er] = p.path[p.path.length - 1];
    arrow(left, top + sr * cs + cs / 2, '#16A34A');
    arrow(left + W + arrowW, top + er * cs + cs / 2, '#DC2626');

    drawRule(ctx, rule, box.x + box.w / 2, top + H + gap);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const T = { uz: `Yo'l: ${p.n} katak`, ru: `Путь: ${p.n} клеток`, en: `Path: ${p.n} cells` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const { R, C, grid, path, n } = p;
    if (path.length !== n) problems.push('path length');
    if (path[0][1] !== 0) problems.push('path does not start at the left edge');
    if (path[n - 1][1] !== C - 1) problems.push('path does not end at the right edge');
    path.forEach(([r, c], i) => {
      if (grid[r * C + c] !== i) problems.push(`path cell ${i} has wrong value`);
      if (i && Math.abs(r - path[i - 1][0]) + Math.abs(c - path[i - 1][1]) !== 1) problems.push(`path step ${i} not adjacent`);
      if (i < n - 1) {
        // keyingi qiymat faqat bitta qo'shnida
        let cnt = 0;
        for (const [dr, dc] of NB) {
          const rr = r + dr, cc = c + dc;
          if (rr >= 0 && rr < R && cc >= 0 && cc < C && grid[rr * C + cc] === i + 1) cnt++;
        }
        if (cnt !== 1) problems.push(`step ${i}: next value in ${cnt} neighbours`);
      }
    });
    if (grid.filter(v => v === 0).length !== 1) problems.push('start value appears more than once');
    if (grid.filter(v => v === n - 1).length !== 1) problems.push('end value appears more than once');
    // Kirish chap chetdagi yagona joy: yo'l kirish katagi
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-seqmaze" aria-hidden="true"><defs><linearGradient id="cg-seqmaze" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6d365"/><stop offset="1" stop-color="#fda085"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-seqmaze)"/><rect x="40" y="40" width="120" height="120" rx="8" fill="#fff"/><g stroke="#9a3412" stroke-width="2" opacity=".3"><path d="M80 40v120M120 40v120M40 80h120M40 120h120"/></g><path class="sq-path" pathLength="100" d="M60 60 V100 H100 V140 H140" fill="none" stroke="#DC2626" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity=".35"/><g font-family="Nunito, sans-serif" font-weight="900" font-size="24" fill="#7c2d12" text-anchor="middle"><text x="60" y="69">1</text><text x="100" y="69">4</text><text x="140" y="69">3</text><text x="60" y="109">2</text><text x="100" y="109">3</text><text x="140" y="109">2</text><text x="60" y="149">5</text><text x="100" y="149">4</text><text x="140" y="149">5</text></g><path d="M18 50 l14 10 -14 10 Z" fill="#16A34A"/><path d="M168 130 l14 10 -14 10 Z" fill="#DC2626"/></svg>`
};
