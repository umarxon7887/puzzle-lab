// schulte.js — «Shulte jadvali» (Таблица Шульте) generatori.
// Jadvalda 1 dan N gacha sonlar (yoki alifbo harflari) aralash turadi; bola ularni tartib bilan
// iloji boricha tez topib, barmog'i bilan ko'rsatadi. Pastda vaqtni yozish uchun joy.
// Juda qiyin darajada (sonlar) — Gorbov–Shulte jadvali: oq kataklarda 1–25, kulrang kataklarda 1–24;
// navbatma-navbat ko'rsatiladi: 1 oq, 24 kulrang, 2 oq, 23 kulrang...
// Kafolat (check()): har bir son/harf aynan bir marta uchraydi, hech biri tushib qolmagan.

import { makeRng, shuffle } from '../core/rng.js';
import { INK, ANSWER, font } from '../core/draw.js';
import { scaleOf, measureRule, drawRule, timeLine } from '../core/parts.js';

// n — jadval tomoni; vary — belgilar har xil kattalikda; rot — burilish (gradus); mixCase — katta-kichik harf aralash
const LEVELS = {
  numbers: [
    { n: 4 }, { n: 5 }, { n: 6, vary: true, rot: 30 }, { n: 7, gorbov: true }
  ],
  letters: [
    { n: 4 }, { n: 5 }, { n: 5, vary: true, rot: 30 }, { n: 5, vary: true, rot: 30, mixCase: true }
  ]
};
// Harfli jadval uchun 25 ta harf (alifbo tartibida). Rus tilida klassik to'plam: Ё, Й, Ъ, Ы, Ь, Э, Ю, Я kirmaydi.
const ALPHABET = {
  uz: ['A', 'B', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'X', 'Y', 'Z', 'Oʻ'],
  ru: ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'И', 'К', 'Л', 'М', 'Н', 'О', 'П', 'Р', 'С', 'Т', 'У', 'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Щ'],
  en: 'ABCDEFGHIJKLMNOPQRSTUVWXY'.split('')
};
const NO_LOWER = new Set(['I', 'L']);
const THIN = new Set(['I', 'J', '1', 'Г', 'Т']);
const lower = s => (s === 'Oʻ' ? 'oʻ' : s.toLowerCase());
const DARK = '#CDD2D9';               // Gorbov jadvalidagi och kulrang kataklar (oq-qora printerda ham ajraladi, siyoh kam ketadi)

const RULE = {
  numbers: {
    uz: n => `1 dan ${n} gacha sonlarni tartib bilan iloji boricha tez topib, barmog'ing bilan ko'rsat.`,
    ru: n => `Как можно быстрее найди и покажи пальцем числа от 1 до ${n} по порядку.`,
    en: n => `Find the numbers from 1 to ${n} in order as fast as you can and point at each one.`
  },
  letters: {
    uz: (n, a, b) => `Harflarni alifbo tartibida (${a} dan ${b} gacha) iloji boricha tez topib, barmog'ing bilan ko'rsat.`,
    ru: (n, a, b) => `Как можно быстрее найди и покажи пальцем буквы по алфавиту (от ${a} до ${b}).`,
    en: (n, a, b) => `Find the letters in alphabetical order (from ${a} to ${b}) as fast as you can and point at each one.`
  },
  mixCase: {
    uz: " Katta va kichik harf bir xil hisoblanadi.",
    ru: ' Заглавная и строчная буква считаются одной и той же.',
    en: ' Capital and small letters count as the same letter.'
  },
  gorbov: {
    uz: "Navbatma-navbat ko'rsat: oq katakdagi 1, kulrang katakdagi 24, oq katakdagi 2, kulrang katakdagi 23 va hokazo. Oq kataklarda sonlar o'sib, kulranglarida kamayib boradi.",
    ru: 'Показывай по очереди: 1 в белой клетке, 24 в серой, 2 в белой, 23 в серой и так далее. В белых клетках числа растут, в серых — убывают.',
    en: 'Take turns: 1 in a white cell, 24 in a grey cell, 2 in a white cell, 23 in a grey cell, and so on. White numbers go up, grey numbers go down.'
  }
};

const MODES = {
  numbers: { big: '123', label: { uz: 'Sonlar', ru: 'Числа', en: 'Numbers' } },
  letters: { big: { uz: 'ABD', ru: 'АБВ', en: 'ABC' }, label: { uz: 'Harflar', ru: 'Буквы', en: 'Letters' } }
};

export default {
  id: 'schulte',
  skills: ['attention', 'speed'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  usesLang: true,                 // harflar tilga bog'liq (alifbo)
  name: { uz: 'Shulte jadvali', ru: 'Таблица Шульте', en: 'Schulte table' },
  desc: {
    uz: "Jadvaldagi sonlar yoki harflarni tartib bilan tez topish — diqqat mashqi",
    ru: 'Быстро находить числа или буквы по порядку — тренировка внимания',
    en: 'Find numbers or letters in order as fast as possible — an attention drill'
  },
  fileBase: { uz: 'Shulte jadvali', ru: 'Таблица Шульте', en: 'Schulte table' },
  defaultTitle: { uz: 'Tez top!', ru: 'Найди быстро!', en: 'Find them fast!' },
  options: [
    { key: 'level', type: 'level', default: 1 },
    {
      key: 'mode', type: 'choice', style: 'cards', pack: 'select', default: 'numbers',
      label: { uz: 'Turi', ru: 'Вид', en: 'Kind' },
      choices: Object.entries(MODES).map(([value, m]) => ({ value, big: m.big, label: m.label }))
    }
  ],
  levelHint: {
    uz: ['4×4 jadval', '5×5 jadval', "6×6, belgilar har xil kattalikda va qiyshiq", 'Gorbov jadvali: ikki qator navbatma-navbat (harflarda — katta-kichik harf aralash)'],
    ru: ['Таблица 4×4', 'Таблица 5×5', '6×6, знаки разного размера и наклона', 'Таблица Горбова: два ряда по очереди (в буквах — строчные и заглавные вперемешку)'],
    en: ['4×4 table', '5×5 table', '6×6, signs of different sizes and tilts', 'Gorbov table: two series in turn (letters: mixed capital and small)']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const mode = opts.mode in MODES ? opts.mode : 'numbers';
    const lang = ALPHABET[opts.lang] ? opts.lang : 'uz';
    const L = LEVELS[mode][level];
    const rand = makeRng(seed);
    const N = L.n * L.n;
    let cells;
    if (L.gorbov) {
      // 25 ta oq (1–25) va 24 ta kulrang (1–24)
      cells = [];
      for (let i = 1; i <= 25; i++) cells.push({ v: i, dark: false });
      for (let i = 1; i <= 24; i++) cells.push({ v: i, dark: true });
    } else {
      cells = Array.from({ length: N }, (_, i) => ({ v: i + 1 }));
    }
    shuffle(cells, rand);
    cells.forEach(c => {
      if (L.vary) c.s = +(0.62 + rand() * 0.5).toFixed(2);              // 0.62–1.12 baravar
      // Tayoqchaga o'xshash belgilar (I, 1) ko'p qiyshaysa «/» bo'lib qoladi — ular kamroq buriladi
      if (L.rot) c.r = Math.round((rand() * 2 - 1) * (THIN.has(mode === 'letters' ? ALPHABET[lang][c.v - 1] : String(c.v)) ? 10 : L.rot));
      // I va L kichik yozilsa bir-biriga o'xshab qoladi (l va I) — ular doim katta harf
      if (L.mixCase && rand() < 0.5 && !NO_LOWER.has(ALPHABET[lang][c.v - 1])) c.lc = true;
    });
    return { level, seed, mode, lang, n: L.n, gorbov: !!L.gorbov, cells };
  },

  // Daraja izohida o'lcham bor — bu yerda jadval ichida nima borligi yoziladi
  info(p, lang) {
    const N = p.n * p.n;
    if (p.gorbov) return { uz: "1–25 oq kataklarda, 24–1 kulranglarda", ru: '1–25 в белых клетках, 24–1 в серых', en: 'white cells 1–25, grey cells 24–1' }[lang] || '';
    if (p.mode === 'letters') {
      const abc = ALPHABET[p.lang] || ALPHABET.uz, a = abc[0], b = abc[N - 1];
      return { uz: `${N} ta harf: ${a} dan ${b} gacha`, ru: `${N} букв: от ${a} до ${b}`, en: `${N} letters: ${a} to ${b}` }[lang] || '';
    }
    return { uz: `1 dan ${N} gacha sonlar`, ru: `числа от 1 до ${N}`, en: `numbers 1 to ${N}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box);
    const N = p.n * p.n;
    const letters = p.mode === 'letters';
    const abc = ALPHABET[p.lang] || ALPHABET.uz;
    const R = letters ? RULE.letters : RULE.numbers;
    let text = (R[lang] || R.uz)(N, abc[0], abc[N - 1]);
    if (p.gorbov) text = (RULE.gorbov[lang] || RULE.gorbov.uz);
    if (p.cells.some(c => c.lc)) text += (RULE.mixCase[lang] || RULE.mixCase.uz);
    const rule = measureRule(ctx, text, box.w, scale);
    const gap = 4 * scale;
    const timeH = 9 * scale;
    // Jadval kvadrat; butun varaqda eni 165 mm gacha (bola barmog'i bilan ko'rsatishi qulay bo'lsin)
    const side = Math.min(box.w, box.h - rule.h - timeH - 2 * gap, 165);
    const cs = side / p.n;
    const blockH = side + gap + timeH + gap + rule.h;
    const top = box.y + Math.max(0, (box.h - blockH) * 0.4);
    const left = box.x + (box.w - side) / 2;
    const at = i => ({ x: left + (i % p.n) * cs, y: top + Math.floor(i / p.n) * cs });

    // Kataklar
    p.cells.forEach((c, i) => {
      const { x, y } = at(i);
      ctx.fillStyle = c.dark ? DARK : '#fff';
      ctx.fillRect(x, y, cs, cs);
    });
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.3, 0.45 * scale);
    ctx.beginPath();
    for (let i = 0; i <= p.n; i++) {
      ctx.moveTo(left + i * cs, top); ctx.lineTo(left + i * cs, top + side);
      ctx.moveTo(left, top + i * cs); ctx.lineTo(left + side, top + i * cs);
    }
    ctx.stroke();
    ctx.lineWidth = Math.max(0.5, 0.8 * scale);
    ctx.strokeRect(left, top, side, side);

    // Belgilar
    p.cells.forEach((c, i) => {
      const { x, y } = at(i);
      const label = letters ? (c.lc ? lower(abc[c.v - 1]) : abc[c.v - 1]) : String(c.v);
      const fs = cs * (letters ? 0.5 : (String(c.v).length > 1 ? 0.44 : 0.5)) * (c.s || 1);
      ctx.save();
      ctx.translate(x + cs / 2, y + cs / 2);
      if (c.r) ctx.rotate(c.r * Math.PI / 180);
      font(ctx, fs, 800);
      ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, fs * 0.04);
      // 6 va 9 qiyshaygan bo'lsa adashmaslik uchun tagiga chiziqcha
      if (c.r && !letters && (c.v === 6 || c.v === 9)) {
        const w = ctx.measureText(label).width;
        ctx.fillRect(-w / 2, fs * 0.42, w, Math.max(0.25, fs * 0.06));
      }
      ctx.restore();
    });

    // Javob: oddiy jadvalda tekshiradigan narsa yo'q (jadvalning o'zi); Gorbov jadvalida — har katak burchagida
    // nechanchi bo'lib ko'rsatilishi (1 oq → 1, 24 kulrang → 2, 2 oq → 3, ...)
    if (showSolution && p.gorbov) {
      p.cells.forEach((c, i) => {
        const { x, y } = at(i);
        const step = c.dark ? 2 * (25 - c.v) : 2 * c.v - 1;
        font(ctx, cs * 0.2, 800);
        ctx.fillStyle = ANSWER; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(String(step), x + cs * 0.06, y + cs * 0.05);
      });
    }

    // Vaqt qatori
    timeLine(ctx, box.x + box.w / 2, top + side + gap + timeH * 0.7, scale, lang);

    drawRule(ctx, rule, box.x + box.w / 2, top + side + gap + timeH + gap);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const T = {
      uz: p.gorbov ? 'Gorbov jadvali: 25 oq + 24 kulrang' : `${p.n}×${p.n} jadval`,
      ru: p.gorbov ? 'Таблица Горбова: 25 белых + 24 серых' : `Таблица ${p.n}×${p.n}`,
      en: p.gorbov ? 'Gorbov table: 25 white + 24 grey' : `${p.n}×${p.n} table`
    };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const N = p.n * p.n;
    if (p.cells.length !== N) problems.push(`${p.cells.length} cells, expected ${N}`);
    const series = p.gorbov ? [[false, 25], [true, 24]] : [[undefined, N]];
    for (const [dark, count] of series) {
      const vals = p.cells.filter(c => (dark === undefined ? true : !!c.dark === dark)).map(c => c.v).sort((a, b) => a - b);
      if (vals.length !== count) problems.push(`series has ${vals.length} values, expected ${count}`);
      vals.forEach((v, i) => { if (v !== i + 1) problems.push(`value ${i + 1} missing or repeated`); });
    }
    if (p.mode === 'letters' && N > (ALPHABET[p.lang] || ALPHABET.uz).length) problems.push('not enough letters');
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-schulte" aria-hidden="true"><defs><linearGradient id="cg-schulte" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#43e97b"/><stop offset="1" stop-color="#38b2ac"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-schulte)"/><rect x="34" y="34" width="132" height="132" rx="10" fill="#fff"/><g stroke="#0f766e" stroke-width="3" opacity=".35"><path d="M78 36v128M122 36v128M36 78h128M36 122h128"/></g><g class="sh-hl" fill="#FDE047"><rect class="sh-h1" x="81" y="125" width="38" height="38" rx="6"/><rect class="sh-h2" x="125" y="37" width="38" height="38" rx="6"/><rect class="sh-h3" x="37" y="81" width="38" height="38" rx="6"/></g><g font-family="Nunito, sans-serif" font-weight="900" font-size="26" fill="#134e4a" text-anchor="middle"><text x="56" y="66">7</text><text x="100" y="66">4</text><text x="144" y="66">2</text><text x="56" y="110">3</text><text x="100" y="110">9</text><text x="144" y="110">6</text><text x="56" y="154">5</text><text x="100" y="154">1</text><text x="144" y="154">8</text></g></svg>`
};
