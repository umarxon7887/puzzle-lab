// matrix.js — «Yetishmayotgan qism» (Чего не хватает? 3×3) generatori.
// 3×3 jadvalda bitta katak bo'sh; qator va ustunlardagi qoidani topib, pastdagi variantlardan to'g'risini tanlash kerak.
//
// Har bir xususiyat (shakl, bo'yalishi, soni, uslubi) uchun qoida:
//   row   — qator bo'ylab bir xil (har qatorda o'zi);   col — ustun bo'ylab bir xil;
//   latin — har qator va har ustunda uchala qiymat bittadan; const — hamma kataklarda bir xil.
// Kafolat (check()): bo'sh katak uchun har bir qoida faqat bitta qiymatni beradi, va variantlardan
// faqat bittasi hamma qoidalarga mos keladi.

import { makeRng, shuffle, pickOne } from '../core/rng.js';
import { INK, MUTE, PT, font } from '../core/draw.js';
import { drawFigure, SOLID } from '../core/figures.js';
import { PIC_KEYS, picGroup, drawPic, picMap, silhouetteDistance } from '../core/pictures.js';
import { scaleOf, measureRule, drawRule, cellBox, ring, questionCell, ruPlural } from '../core/parts.js';

const SHAPES = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond', 'hexagon', 'plus'];
const FILLS = ['empty', 'solid', 'stripes', 'dotted'];

// rules — xususiyatlar va qoidalar to'plamlaridan biri tasodifiy tanlanadi; opts — variantlar soni; corner — "?" doim pastki o'ngda
const LEVELS = [
  { sets: [{ a: 'row', b: 'col' }, { a: 'col', b: 'row' }], opts: 3, corner: true, count: false },
  { sets: [{ a: 'latin', b: 'const' }, { a: 'row', b: 'col' }, { a: 'latin', b: 'row' }], opts: 4, corner: true, count: false },
  { sets: [{ a: 'latin', b: 'col' }, { a: 'row', b: 'latin' }, { a: 'row', b: 'col', c: 'col' }], opts: 4, corner: false, count: true },
  { sets: [{ a: 'latin', b: 'latin' }, { a: 'latin', b: 'row', c: 'latin' }, { a: 'latin', b: 'col', c: 'latin' }], opts: 5, corner: false, count: true }
];

// Qiymat qoidaga ko'ra: r, c — qator va ustun; perm — 3 ta qiymat; shift — lotin kvadrati yo'nalishi
function valueAt(rule, vals, r, c, shift) {
  if (rule === 'row') return vals[r];
  if (rule === 'col') return vals[c];
  if (rule === 'latin') return vals[(r * shift + c) % 3];
  return vals[0];
}

// Bo'sh katak uchun qoidaning bergan qiymati (boshqa kataklardan)
function forced(rule, grid, attr, q) {
  const [qr, qc] = [Math.floor(q / 3), q % 3];
  const at = (r, c) => grid[r * 3 + c][attr];
  if (rule === 'row') return at(qr, (qc + 1) % 3);
  if (rule === 'col') return at((qr + 1) % 3, qc);
  if (rule === 'const') return at(qr, (qc + 1) % 3);
  // latin: qatordagi qolgan ikki qiymatdan farqlisi — barcha qiymatlar to'plamidan
  const all = new Set(grid.filter((_, i) => i !== q).map(g => g[attr]));
  const inRow = [at(qr, (qc + 1) % 3), at(qr, (qc + 2) % 3)];
  const rest = [...all].filter(v => !inRow.includes(v));
  return rest.length === 1 ? rest[0] : undefined;
}

const key = el => JSON.stringify(el);
const ATTRS = { shapes: ['shape', 'fill', 'n'], pictures: ['pic', 'style', 'n'] };

function pickPics(rand) {
  const out = [], groups = new Set();
  for (const k of shuffle(PIC_KEYS.slice(), rand)) {
    const g = picGroup(k);
    if (g && groups.has(g)) continue;
    if (out.some(o => silhouetteDistance(o, k) < 0.15)) continue;
    out.push(k); if (g) groups.add(g);
    if (out.length === 3) return out;
  }
  return out;
}

function drawEl(ctx, el, cx, cy, s) {
  const n = el.n || 1;
  const sub = n === 1 ? s : s * 0.52;
  const offs = n === 1 ? [[0, 0]] : n === 2 ? [[-0.24, -0.24], [0.24, 0.24]] : [[-0.26, -0.26], [0.26, -0.26], [0, 0.26]];
  for (const [dx, dy] of offs) {
    const x = cx + dx * s, y = cy + dy * s;
    if (el.pic) drawPic(ctx, el.pic, picMap(x, y, sub * 0.78), el.style === 'shadow' ? SOLID : INK, el.style === 'shadow');
    else drawFigure(ctx, { shape: el.shape, fill: el.fill }, x, y, sub);
  }
}

const RULE = {
  uz: "Qator va ustunlardagi qonuniyatni top. Bo'sh katakka qaysi rasm keladi? Uni aylana bilan belgila.",
  ru: 'Найди закономерность в рядах и столбцах. Что должно быть в пустой клетке? Обведи ответ.',
  en: 'Find the rule in the rows and columns. What goes in the empty cell? Circle the answer.'
};
const MODES = {
  shapes: { big: '🔷', label: { uz: 'Shakllar', ru: 'Фигуры', en: 'Shapes' } },
  pictures: { big: '🐞', label: { uz: 'Rasmlar', ru: 'Картинки', en: 'Pictures' } }
};

export default {
  id: 'matrix',
  skills: ['patterns', 'logic'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Yetishmayotgan qism', ru: 'Чего не хватает?', en: 'What is missing?' },
  desc: {
    uz: "3×3 jadvaldagi qonuniyatni topib, bo'sh katakka mos rasmni tanlang",
    ru: 'Найдите закономерность в таблице 3×3 и выберите, что стоит в пустой клетке',
    en: 'Find the rule in a 3×3 grid and pick what goes in the empty cell'
  },
  fileBase: { uz: 'yetishmayotgan qism', ru: 'Чего не хватает', en: 'What is missing' },
  defaultTitle: { uz: 'Nima yetishmayapti?', ru: 'Чего не хватает?', en: 'What is missing?' },
  options: [
    { key: 'level', type: 'level', default: 0 },
    {
      key: 'mode', type: 'choice', style: 'cards', pack: 'select', default: 'shapes',
      label: { uz: 'Turi', ru: 'Вид', en: 'Kind' },
      choices: Object.entries(MODES).map(([value, m]) => ({ value, big: m.big, label: m.label }))
    }
  ],
  levelHint: {
    uz: ["Qatorda — shakl, ustunda — rang; 3 ta variant", "Har qatorda uchala shakl bittadan; 4 ta variant", "Soni ham o'zgaradi, bo'sh katak istalgan joyda", "Ikki-uch qoida birga, 5 ta variant"],
    ru: ['В ряду — форма, в столбце — цвет; 3 варианта', 'В каждом ряду все три формы; 4 варианта', 'Меняется и количество, пустая клетка где угодно', 'Два-три правила сразу, 5 вариантов'],
    en: ['Rows set the shape, columns the fill; 3 options', 'Each row has all three shapes; 4 options', 'The number changes too; the gap can be anywhere', 'Two or three rules at once, 5 options']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const mode = opts.mode in MODES ? opts.mode : 'shapes';
    const L = LEVELS[level];
    const small = opts.perPage > 1 || opts.aspect === 'landscape';
    const count = opts.aspect === 'landscape' ? 2 : small ? 1 : 2;  // varaqda nechta jadval
    const rand = makeRng(seed);
    const puzzles = [];
    for (let t = 0; t < count; t++) {
      const set = pickOne(rand, L.sets);
      const [A, B, C] = ATTRS[mode];
      const vals = {
        [A]: mode === 'pictures' ? pickPics(rand) : shuffle(SHAPES.slice(), rand).slice(0, 3),
        [B]: mode === 'pictures' ? shuffle(['line', 'shadow', 'line'], rand) : shuffle(FILLS.slice(), rand).slice(0, 3),
        [C]: shuffle([1, 2, 3], rand)
      };
      const rules = { [A]: set.a, [B]: set.b, [C]: set.c || 'const' };
      if (mode === 'pictures' && rules[B] === 'latin') rules[B] = 'row';   // ikki uslub — lotin kvadrati bo'lmaydi
      if (mode === 'pictures') vals[B] = rand() < 0.5 ? ['line', 'shadow', 'line'] : ['shadow', 'line', 'shadow'];
      if (!L.count) rules[C] = 'const', vals[C] = [1, 1, 1];
      else if (rules[C] === 'const') vals[C] = [1, 1, 1];
      const shift = { [A]: pickOne(rand, [1, 2]), [B]: pickOne(rand, [1, 2]), [C]: pickOne(rand, [1, 2]) };
      if (rules[A] === 'latin' && rules[B] === 'latin') shift[B] = 3 - shift[A];          // ikki lotin kvadrati har xil yo'nalishda
      if (rules[A] === 'latin' && rules[C] === 'latin' && shift[C] === shift[A]) vals[C] = vals[C].slice().reverse();
      const grid = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        const el = {};
        for (const at of [A, B, C]) el[at] = valueAt(rules[at], vals[at], r, c, shift[at]);
        grid.push(el);
      }
      const q = L.corner ? 8 : Math.floor(rand() * 9);
      const ans = grid[q];
      // Variantlar: bitta xususiyati o'zgartirilgan (qiyinroqda — ikkita)
      const cands = [];
      for (const at of [A, B, C]) {
        const pool = at === C ? [1, 2, 3] : [...new Set([...vals[at], ...(mode === 'shapes' && at === A ? SHAPES.slice(0, 5) : []), ...(mode === 'shapes' && at === B ? FILLS : [])])];
        if (at === C && rules[C] === 'const') continue;      // soni o'zgarmasa — soni bo'yicha tuzoq ham kerak emas
        for (const v of pool) if (v !== ans[at]) cands.push({ ...ans, [at]: v });
      }
      const seen = new Set([key(ans)]), options = [];
      for (const c of shuffle(cands, rand)) {
        if (seen.has(key(c))) continue;
        seen.add(key(c)); options.push(c);
        if (options.length === L.opts - 1) break;
      }
      // Yetmasa — ikki xususiyati o'zgartirilgan variantlar
      for (const c1 of shuffle(cands.slice(), rand)) {
        if (options.length >= L.opts - 1) break;
        for (const c2 of cands) {
          const mix = { ...c1 };
          for (const k of Object.keys(c2)) if (c2[k] !== ans[k]) mix[k] = c2[k];
          if (seen.has(key(mix))) continue;
          seen.add(key(mix)); options.push(mix);
          break;
        }
      }
      const at = Math.floor(rand() * (options.length + 1));
      options.splice(at, 0, ans);
      puzzles.push({ rules, grid, q, options, ans: at });
    }
    return { level, seed, mode, puzzles };
  },

  info(p, lang) {
    const n = p.puzzles.length, m = MODES[p.mode].label[lang] || MODES[p.mode].label.uz;
    return { uz: `${n} ta jadval, ${m.toLowerCase()}`, ru: `${n} ${ruPlural(n, 'таблица', 'таблицы', 'таблиц')}, ${m.toLowerCase()}`, en: `${n} grids, ${m.toLowerCase()}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box);
    const rule = measureRule(ctx, RULE[lang] || RULE.uz, box.w, scale);
    const gap = 4 * scale;
    const n = p.puzzles.length;
    const side = box.w / box.h > 1.3 && n === 2;                 // yotiq joyda — yonma-yon
    const availH = box.h - rule.h - gap;
    const pw = side ? (box.w - gap * 3) / 2 : box.w, ph = side ? availH : (availH - (n - 1) * gap * 2) / n;
    const numFs = 12 * PT * scale;
    p.puzzles.forEach((pz, t) => {
      const px = box.x + (side ? t * (pw + gap * 3) : 0), py = box.y + (side ? 0 : t * (ph + gap * 2));
      const K = pz.options.length;
      // jadval (3 katak) + variantlar qatori (K katak, kichikroq)
      const og = 0.16, opt = 0.7;                              // variant katagi = jadval katagining 0.7 qismi
      const cH = ph / (3 + 2 * 0.06 + 0.5 + opt * 1.24);
      const cW = Math.min(pw / 3.3, pw / (K * opt * (1 + og) + 0.2));
      const c = Math.min(cH, cW, 34 * scale), oc = c * opt;
      const gridW = 3 * c, x0 = px + (pw - gridW) / 2;
      const blockH = 3 * c + c * 0.5 + oc * 1.24;
      const y0 = py + Math.max(0, (ph - blockH) * 0.4);
      if (n > 1) { font(ctx, numFs, 800); ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(`${t + 1}.`, px, y0); }
      // jadval: qalin tashqi ramka, ichki chiziqlar
      for (let i = 0; i < 9; i++) {
        const x = x0 + (i % 3) * c, y = y0 + Math.floor(i / 3) * c;
        if (i === pz.q) {
          questionCell(ctx, x + c * 0.08, y + c * 0.08, c * 0.84, scale, showSolution ? '#DC2626' : MUTE);
          if (showSolution) { ctx.save(); ctx.fillStyle = '#fff'; ctx.fillRect(x + c * 0.16, y + c * 0.16, c * 0.68, c * 0.68); ctx.restore(); drawEl(ctx, pz.grid[i], x + c / 2, y + c / 2, c * 0.8); }
        } else drawEl(ctx, pz.grid[i], x + c / 2, y + c / 2, c * 0.8);
      }
      ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.3, 0.45 * scale);
      ctx.strokeRect(x0, y0, gridW, gridW);
      ctx.lineWidth = Math.max(0.2, 0.25 * scale); ctx.strokeStyle = '#9CA3AF';
      ctx.beginPath();
      for (let k = 1; k < 3; k++) { ctx.moveTo(x0 + k * c, y0); ctx.lineTo(x0 + k * c, y0 + gridW); ctx.moveTo(x0, y0 + k * c); ctx.lineTo(x0 + gridW, y0 + k * c); }
      ctx.stroke(); ctx.restore();
      // variantlar
      const ow = K * oc + (K - 1) * oc * og, ox = px + (pw - ow) / 2, oy = y0 + gridW + c * 0.5 + oc * 0.12;
      pz.options.forEach((el, i) => {
        const x = ox + i * oc * (1 + og);
        cellBox(ctx, x, oy, oc, oc, scale, { fill: '#F9FAFB' });
        drawEl(ctx, el, x + oc / 2, oy + oc / 2, oc * 0.84);
        if (showSolution && i === pz.ans) ring(ctx, x + oc / 2, oy + oc / 2, oc * 0.6, scale);
      });
    });
    drawRule(ctx, rule, box.x + box.w / 2, box.y + availH + gap);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const k = p.puzzles[0].options.length;
    const T = { uz: `Jadvallar: ${p.puzzles.length} · ${k} tadan variant`, ru: `Таблиц: ${p.puzzles.length} · по ${k} варианта`, en: `Grids: ${p.puzzles.length} · ${k} options each` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const attrs = ATTRS[p.mode];
    p.puzzles.forEach((pz, t) => {
      const ans = pz.grid[pz.q];
      if (key(pz.options[pz.ans]) !== key(ans)) problems.push(`grid ${t}: wrong answer index`);
      if (pz.options.length !== LEVELS[p.level].opts) problems.push(`grid ${t}: ${pz.options.length} options`);
      const keys = pz.options.map(key);
      if (new Set(keys).size !== keys.length) problems.push(`grid ${t}: repeated option`);
      // Har bir qoida o'z qiymatini beradi va u javobga teng
      for (const at of attrs) {
        const rule = pz.rules[at];
        const f = forced(rule, pz.grid, at, pz.q);
        if (f === undefined || f !== ans[at]) problems.push(`grid ${t}: ${at} (${rule}) does not force the answer`);
        // qoida haqiqatan bajarilgan (butun jadval bo'yicha)
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
          const v = pz.grid[r * 3 + c][at];
          if (rule === 'row' && v !== pz.grid[r * 3][at]) problems.push(`grid ${t}: row rule broken`);
          if (rule === 'col' && v !== pz.grid[c][at]) problems.push(`grid ${t}: col rule broken`);
          if (rule === 'const' && v !== pz.grid[0][at]) problems.push(`grid ${t}: const rule broken`);
        }
        if (rule === 'latin') for (let r = 0; r < 3; r++) {
          if (new Set([0, 1, 2].map(c => pz.grid[r * 3 + c][at])).size !== 3) problems.push(`grid ${t}: latin row broken`);
          if (new Set([0, 1, 2].map(c => pz.grid[c * 3 + r][at])).size !== 3) problems.push(`grid ${t}: latin col broken`);
        }
      }
      // Faqat to'g'ri variant hamma qoidalarga mos
      const fits = pz.options.filter(o => attrs.every(at => o[at] === forced(pz.rules[at], pz.grid, at, pz.q))).length;
      if (fits !== 1) problems.push(`grid ${t}: ${fits} options fit`);
      // Jadvalda ikkita bir xil katak bo'lmasin (qoida aniq ko'rinsin) — faqat lotin bo'lmagan juda oddiy holatlardan tashqari
      const cells = pz.grid.map(key);
      if (new Set(cells).size < 3) problems.push(`grid ${t}: too few different cells`);
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-matrix" aria-hidden="true"><defs><linearGradient id="cg-matrix" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5ee7df"/><stop offset="1" stop-color="#b490ca"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-matrix)"/><rect x="34" y="34" width="132" height="132" rx="10" fill="#fff"/><g stroke="#cbd5e1" stroke-width="3"><path d="M78 34 V166 M122 34 V166 M34 78 H166 M34 122 H166"/></g><g fill="#6366F1"><circle cx="56" cy="56" r="12"/><circle cx="100" cy="56" r="12" fill="none" stroke="#6366F1" stroke-width="5"/><circle cx="144" cy="56" r="12" fill="#c7d2fe"/><rect x="44" y="88" width="24" height="24" rx="4"/><rect x="88" y="88" width="24" height="24" rx="4" fill="none" stroke="#6366F1" stroke-width="5"/><rect x="132" y="88" width="24" height="24" rx="4" fill="#c7d2fe"/><path d="M56 132 l13 22 h-26 Z"/><path d="M100 132 l13 22 h-26 Z" fill="none" stroke="#6366F1" stroke-width="5" stroke-linejoin="round"/></g><text class="mx-q" x="144" y="155" text-anchor="middle" font-size="34" font-weight="900" fill="#DC2626" font-family="Nunito, sans-serif">?</text></svg>`
};
