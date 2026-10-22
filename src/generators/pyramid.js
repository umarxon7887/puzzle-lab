// pyramid.js — «Sonlar piramidasi» (Числовая пирамида / Number pyramid) generatori.
// Har bir g'ishtdagi son ostidagi ikki g'isht sonlarining yig'indisiga teng. Ba'zi g'ishtlar berilgan,
// qolganini bola to'ldiradi: pastdan yuqoriga qo'shib, yuqoridan pastga ayirib.
// Kafolat (check()): berilgan sonlardan butun piramida taxminsiz to'ldiriladi — har qadamda bitta g'isht
// «ikkitasi ma'lum bo'lgan uchlik»dan topiladi. Demak yechim yagona.

import { makeRng, randInt, shuffle } from '../core/rng.js';
import { INK, ANSWER, font, roundRect } from '../core/draw.js';
import { scaleOf, measureRule, drawRule, ruPlural } from '../core/parts.js';

// n — qavatlar soni (asosdagi g'ishtlar soni); lo..hi — asosdagi sonlar oralig'i;
// givens — berilgan g'ishtlar soni (null — asos to'liq); minSub — kamida nechta ayirish qadami kerak;
// count — bir varaqdagi piramidalar soni: [1 tadan, 2 tadan, 4 tadan] joylashganda
const LEVELS = [
  { n: 3, lo: 1, hi: 9, givens: null, minSub: 0, count: [6, 2, 1] },
  { n: 4, lo: 1, hi: 12, givens: 6, minSub: 1, count: [6, 2, 1] },
  { n: 5, lo: 1, hi: 15, givens: 5, minSub: 3, count: [4, 2, 1] },
  { n: 6, lo: 1, hi: 12, givens: 6, minSub: 6, hardest: true, count: [2, 1, 1] }
];

const id = (r, i) => r * (r + 1) / 2 + i;          // r — qavat (0 — tepa), i — qavatdagi o'rni

// Berilgan g'ishtlardan piramidani to'ldirish. Natija: { vals, steps, subs } (vals ichida null — topilmagan)
export function solvePyramid(n, given) {
  const vals = given.slice();
  let steps = 0, subs = 0, changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < n - 1; r++) for (let i = 0; i <= r; i++) {
      const P = id(r, i), A = id(r + 1, i), B = id(r + 1, i + 1);
      const p = vals[P], a = vals[A], b = vals[B];
      const known = (p !== null) + (a !== null) + (b !== null);
      if (known !== 2) continue;
      if (p === null) vals[P] = a + b;
      else if (a === null) { vals[A] = p - b; subs++; }
      else { vals[B] = p - a; subs++; }
      steps++; changed = true;
    }
  }
  return { vals, steps, subs };
}

function build(n, rand, L) {
  for (let attempt = 0; attempt < 400; attempt++) {
    const vals = new Array(n * (n + 1) / 2).fill(0);
    for (let i = 0; i < n; i++) vals[id(n - 1, i)] = randInt(rand, L.lo, L.hi);
    for (let r = n - 2; r >= 0; r--) for (let i = 0; i <= r; i++) vals[id(r, i)] = vals[id(r + 1, i)] + vals[id(r + 1, i + 1)];
    if (vals[0] > 999) continue;
    // Bir xil sonlar ko'p bo'lsa topshiriq zerikarli — asosda takrorlanmasin
    const base = vals.slice(id(n - 1, 0));
    if (new Set(base).size < base.length) continue;

    if (L.givens === null) {
      const given = vals.map((v, k) => (k >= id(n - 1, 0) ? v : null));
      return { vals, given: given.map(v => v !== null) };
    }
    // Berilgan g'ishtlar: tasodifiy to'plamlar orasidan to'liq yechiladigani; eng qiyin darajada — eng ko'p ayirishlisi
    const cells = vals.map((_, k) => k);
    let best = null;
    const tries = L.hardest ? 3000 : 1500;
    for (let t = 0; t < tries; t++) {
      const pick = new Set(shuffle(cells.slice(), rand).slice(0, L.givens));
      const given = vals.map((v, k) => (pick.has(k) ? v : null));
      const res = solvePyramid(n, given);
      if (res.vals.some(v => v === null) || res.subs < L.minSub) continue;
      if (!best || res.subs > best.subs) best = { pick, subs: res.subs };
      if (!L.hardest) break;
    }
    if (!best) continue;
    return { vals, given: vals.map((_, k) => best.pick.has(k)) };
  }
  throw new Error('pyramid: no puzzle');
}

const RULE = {
  uz: "Har bir g'ishtdagi son uning ostidagi ikki g'isht sonlarining yig'indisiga teng. Bo'sh g'ishtlarni to'ldir.",
  ru: 'Число на каждом кирпичике равно сумме чисел на двух кирпичиках под ним. Заполни пустые кирпичики.',
  en: 'Each brick shows the sum of the two bricks below it. Fill in the empty bricks.'
};

export default {
  id: 'pyramid',
  skills: ['counting', 'logic'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Sonlar piramidasi', ru: 'Числовая пирамида', en: 'Number pyramid' },
  desc: {
    uz: "Har bir g'isht — ostidagi ikkitasining yig'indisi; bo'sh g'ishtlarni qo'shib va ayirib to'ldirish",
    ru: 'Каждый кирпичик — сумма двух нижних; заполнить пустые сложением и вычитанием',
    en: 'Each brick is the sum of the two below; fill the gaps by adding and subtracting'
  },
  fileBase: { uz: 'Sonlar piramidasi', ru: 'Числовая пирамида', en: 'Number pyramid' },
  defaultTitle: { uz: "Piramidani to'ldir!", ru: 'Заполни пирамиду!', en: 'Complete the pyramid!' },
  options: [{ key: 'level', type: 'level', default: 1 }],
  levelHint: {
    uz: ["3 qavat, pastki qator to'liq berilgan — faqat qo'shish", "4 qavat, ayirish ham kerak", '5 qavat, atigi 5 ta son berilgan', "6 qavat, pastki qatorning ko'pi yashirin"],
    ru: ['3 ряда, нижний ряд дан полностью — только сложение', '4 ряда, нужно и вычитание', '5 рядов, дано всего 5 чисел', '6 рядов, нижний ряд почти весь скрыт'],
    en: ['3 rows, bottom row given — addition only', '4 rows, subtraction needed too', '5 rows, only 5 numbers given', '6 rows, most of the bottom row hidden']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level];
    const rand = makeRng(seed);
    const count = L.count[opts.perPage === 4 ? 2 : opts.perPage === 2 ? 1 : 0];
    const items = [];
    for (let k = 0; k < count; k++) items.push(build(L.n, rand, L));
    return { level, seed, n: L.n, items };
  },

  info(p, lang) {
    const c = p.items.length;
    return { uz: `${c} ta piramida, ${p.n} qavat`, ru: `${c} ${ruPlural(c, 'пирамида', 'пирамиды', 'пирамид')}, ${p.n} ${ruPlural(p.n, 'ряд', 'ряда', 'рядов')}`, en: `${c} pyramid${c > 1 ? 's' : ''}, ${p.n} rows` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box);
    const rule = measureRule(ctx, RULE[lang] || RULE.uz, box.w, scale);
    const gap = 6 * scale, n = p.n, cnt = p.items.length;
    const H = box.h - rule.h - gap, ratio = 1.75;          // g'isht eni : bo'yi
    // Eng katta g'isht chiqadigan ustunlar sonini tanlaymiz
    let best = null;
    for (let cols = 1; cols <= Math.min(3, cnt); cols++) {
      const rows = Math.ceil(cnt / cols);
      const bw = Math.min((box.w - (cols - 1) * gap * 2) / (cols * n), ((H - (rows - 1) * gap * 1.6) / (rows * n)) * ratio, n <= 3 ? 30 : 24);
      // Bir ustunga uchtadan ko'p piramida tizilsa varaq bir tomonga og'adi — ozgina kichikroq bo'lsa ham ikki ustun afzal
      const score = bw * (cols === 1 && cnt > 2 ? 0.9 : 1);
      if (!best || score > best.score + 0.01) best = { cols, rows, bw, score };
    }
    const { cols, rows, bw } = best, bh = bw / ratio;
    const pw = n * bw, ph = n * bh;
    const gridW = cols * pw + (cols - 1) * gap * 2, gridH = rows * ph + (rows - 1) * gap * 1.6;
    const gx = box.x + (box.w - gridW) / 2, gy = box.y + Math.max(0, (H - gridH) * 0.35);
    const lw = Math.max(0.3, Math.min(0.55, bw * 0.03));

    p.items.forEach((it, k) => {
      const ox = gx + (k % cols) * (pw + gap * 2), oy = gy + Math.floor(k / cols) * (ph + gap * 1.6);
      for (let r = 0; r < n; r++) for (let i = 0; i <= r; i++) {
        const x = ox + (n - 1 - r) * bw / 2 + i * bw, y = oy + r * bh;
        const kk = id(r, i), given = it.given[kk];
        roundRect(ctx, x + bw * 0.03, y + bh * 0.05, bw * 0.94, bh * 0.9, bh * 0.12);
        ctx.fillStyle = given ? '#EEF2FF' : '#fff'; ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.stroke();
        if (!given && !showSolution) continue;
        const txt = String(it.vals[kk]);
        let fs = bh * 0.56;
        font(ctx, fs, given ? 800 : 700);
        const w = ctx.measureText(txt).width;
        if (w > bw * 0.8) { fs *= bw * 0.8 / w; font(ctx, fs, given ? 800 : 700); }
        ctx.fillStyle = given ? INK : ANSWER; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(txt, x + bw / 2, y + bh / 2 + bh * 0.03);
      }
    });
    drawRule(ctx, rule, box.x + box.w / 2, gy + gridH + gap);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const n = p.items.reduce((s, it) => s + it.given.filter(g => !g).length, 0);
    const T = { uz: `To'ldiriladigan g'ishtlar: ${n} ta`, ru: `Пустых кирпичиков: ${n}`, en: `Empty bricks: ${n}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const L = LEVELS[p.level], n = p.n;
    p.items.forEach((it, k) => {
      for (let r = 0; r < n - 1; r++) for (let i = 0; i <= r; i++) {
        if (it.vals[id(r, i)] !== it.vals[id(r + 1, i)] + it.vals[id(r + 1, i + 1)]) problems.push(`#${k}: sum broken at ${r},${i}`);
      }
      if (it.vals.some(v => !Number.isInteger(v) || v < 1 || v > 999)) problems.push(`#${k}: value out of range`);
      const res = solvePyramid(n, it.vals.map((v, j) => (it.given[j] ? v : null)));
      if (res.vals.some((v, j) => v !== it.vals[j])) problems.push(`#${k}: not solvable step by step`);
      const g = it.given.filter(Boolean).length;
      if (L.givens !== null && g !== L.givens) problems.push(`#${k}: ${g} givens`);
      if (res.subs < L.minSub) problems.push(`#${k}: too easy`);
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-pyramid" aria-hidden="true"><defs><linearGradient id="cg-pyramid" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6d365"/><stop offset="1" stop-color="#fda085"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-pyramid)"/><g stroke="#7c2d12" stroke-width="3" fill="#fff"><rect x="76" y="40" width="48" height="32" rx="5"/><rect x="52" y="76" width="48" height="32" rx="5" fill="#FFF7ED"/><rect x="100" y="76" width="48" height="32" rx="5"/><rect x="28" y="112" width="48" height="32" rx="5" fill="#FFF7ED"/><rect x="76" y="112" width="48" height="32" rx="5" fill="#FFF7ED"/><rect x="124" y="112" width="48" height="32" rx="5" fill="#FFF7ED"/></g><g font-family="Nunito, sans-serif" font-weight="900" font-size="20" text-anchor="middle" fill="#7c2d12"><text x="76" y="99">8</text><text x="52" y="135">5</text><text x="100" y="135">3</text><text x="148" y="135">4</text></g><g font-family="Nunito, sans-serif" font-weight="900" font-size="20" text-anchor="middle" fill="#DC2626"><text class="pyr-a" x="124" y="99">7</text><text class="pyr-b" x="100" y="63">15</text></g><path d="M44 160h112" stroke="#7c2d12" stroke-width="4" stroke-linecap="round" opacity=".35"/></svg>`
};
