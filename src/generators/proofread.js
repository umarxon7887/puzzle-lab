// proofread.js — «Korrektura sinovi» (Корректурная проба) generatori.
// Qatorlarda harflar (yoki belgilar) aralash turadi. Bola namunadagi belgini topib, ko'rsatilgandek belgilaydi:
// birinchisini ✗ bilan o'chiradi, ikkinchisining (qiyin darajalarda) tagiga chizadi.
// Belgilar turi: harflar (Burdon sinovi) yoki shakllar; qiyin darajalarda — Tuluz–Pyeron kvadratchalari
// (kvadratning qaysi tomonida «dumcha» borligi bilan farqlanadi).
// Kafolat (check()): har bir qatordagi nishonlar soni saqlangan sonlarga teng, har nishon kamida 1 marta bor,
// nishonlar bir-biridan va chalg'ituvchilardan farq qiladi.

import { makeRng, shuffle, pickOne } from '../core/rng.js';
import { INK, MUTE, ANSWER, font } from '../core/draw.js';
import { drawFigure, SOLID } from '../core/figures.js';
import { scaleOf, measureRule, drawRule, line, timeLine, ruPlural } from '../core/parts.js';

// rows×cols — to'liq varaq uchun; t2 — ikkinchi nishon; sim — o'xshash belgilar; kinds — chalg'ituvchi turlar soni
const LEVELS = [
  { rows: 6, cols: 10, t2: false, sim: 0, kinds: 5, p: 0.2 },
  { rows: 8, cols: 12, t2: false, sim: 1, kinds: 7, p: 0.17 },
  { rows: 10, cols: 14, t2: true, sim: 1, kinds: 7, p: 0.12 },
  { rows: 12, cols: 16, t2: true, sim: 2, kinds: 8, p: 0.11 }
];

// Kichik harflar (alifbo) va bir-biriga o'xshash harflar guruhlari
const ABC = {
  uz: 'abdefghijklmnopqrstuvxyz'.split(''),
  ru: 'абвгдежзиклмнопрстуфхцчшщыэюя'.split(''),
  en: 'abcdefghijklmnopqrstuvwxyz'.split('')
};
const SIMILAR = {
  uz: [['b', 'd', 'p', 'q'], ['m', 'n', 'h', 'u'], ['a', 'o', 'e'], ['i', 'j', 'l', 't'], ['v', 'y', 'x'], ['f', 't'], ['g', 'q']],
  ru: [['и', 'н', 'п', 'л'], ['ш', 'щ', 'ц'], ['в', 'з', 'э', 'е'], ['б', 'в', 'д'], ['р', 'ф'], ['о', 'с', 'е'], ['к', 'ж', 'х'], ['т', 'г', 'п']],
  en: [['b', 'd', 'p', 'q'], ['m', 'n', 'h', 'u'], ['a', 'o', 'e', 'c'], ['i', 'j', 'l', 't'], ['v', 'y', 'x', 'w'], ['f', 't'], ['g', 'q']]
};
const groupOf = (lang, ch) => SIMILAR[lang].find(g => g.includes(ch)) || [ch];

// Shakllar: oson darajalarda oddiy shakllar, qiyinlarida — Tuluz–Pyeron kvadratchalari.
// tp: 'tN' — dumcha (0–7: yuqori, yuqori-o'ng, o'ng, ...), 'hN' — yarmi bo'yalgan (0–3: yuqori, o'ng, past, chap)
const SIMPLE = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond', 'hexagon', 'plus'];
const TP_TICK = Array.from({ length: 8 }, (_, i) => 't' + i);
const TP_HALF = Array.from({ length: 4 }, (_, i) => 'h' + i);

function pickKinds(mode, lang, level, rand) {
  const L = LEVELS[level];
  if (mode === 'shapes') {
    if (level < 2) {
      const pool = shuffle(SIMPLE.slice(0, level === 0 ? 5 : 8), rand);
      return { targets: pool.slice(0, 1), others: pool.slice(1, 1 + (level === 0 ? 4 : 6)) };
    }
    const pool = shuffle(level === 3 ? [...TP_TICK, ...TP_HALF] : TP_TICK.slice(), rand);
    return { targets: pool.slice(0, 2), others: pool.slice(2) };
  }
  const abc = ABC[lang];
  const groups = SIMILAR[lang].map(g => g.filter(c => abc.includes(c))).filter(g => g.length >= 2);
  let targets;
  if (L.sim === 0) targets = [pickOne(rand, abc.filter(c => !'iljt'.includes(c)))];
  else if (L.sim === 2) { const g = shuffle(pickOne(rand, groups).slice(), rand); targets = g.slice(0, 2); }
  else {
    const g1 = pickOne(rand, groups);
    targets = [pickOne(rand, g1)];
    if (L.t2) {
      const g2 = pickOne(rand, groups.filter(g => !g.some(c => g1.includes(c))));
      targets.push(pickOne(rand, g2));
    }
  }
  // Chalg'ituvchilar: o'xshashlari (sim > 0 bo'lsa) + boshqa harflar
  const mates = L.sim ? [...new Set(targets.flatMap(t => groupOf(lang, t)))].filter(c => !targets.includes(c) && abc.includes(c)) : [];
  const banned = new Set([...targets, ...(L.sim ? [] : targets.flatMap(t => groupOf(lang, t)))]);
  const rest = shuffle(abc.filter(c => !banned.has(c) && !mates.includes(c)), rand);
  const others = [...mates.slice(0, L.kinds - 2), ...rest].slice(0, L.kinds);
  return { targets, others };
}

const RULE = {
  uz: (one) => `Qatorlarni chapdan o'ngga birma-bir ko'rib chiq. ${one ? "Namunadagi belgini topib, ✗ bilan o'chir." : "Birinchi namunani ✗ bilan o'chir, ikkinchisining tagiga chiz."} Tez, lekin xato qilmasdan ishla.`,
  ru: (one) => `Просматривай строки по очереди слева направо. ${one ? 'Найди знак из образца и зачеркни его ✗.' : 'Первый знак из образца зачёркивай ✗, второй — подчёркивай.'} Работай быстро, но без ошибок.`,
  en: (one) => `Look through the rows one by one, from left to right. ${one ? 'Find the sign shown in the sample and cross it out ✗.' : 'Cross out the first sample sign ✗ and underline the second one.'} Work fast but carefully.`
};
const SAMPLE = { uz: 'Namuna:', ru: 'Образец:', en: 'Sample:' };
const FOUND = { uz: ['Topildi:', 'ta'], ru: ['Найдено:', ''], en: ['Found:', ''] };

const MODES = {
  letters: { big: { uz: 'abd', ru: 'абв', en: 'abc' }, label: { uz: 'Harflar', ru: 'Буквы', en: 'Letters' } },
  shapes: { big: '◻︎', label: { uz: 'Belgilar', ru: 'Значки', en: 'Signs' } }
};

// Bitta belgini chizish (harf yoki shakl). cell — katak o'lchami (mm)
function drawToken(ctx, mode, tok, cx, cy, cell) {
  if (mode === 'letters') {
    font(ctx, cell * 0.72, 600);
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(tok, cx, cy - cell * 0.04);
    return;
  }
  if (/^[th]\d$/.test(tok)) {                             // Tuluz–Pyeron kvadratchasi
    const s = cell * 0.46, x = cx - s / 2, y = cy - s / 2, lw = Math.max(0.22, cell * 0.06);
    ctx.save();
    ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineCap = 'round';
    if (tok[0] === 'h') {
      const k = +tok[1];
      ctx.fillStyle = SOLID;
      if (k === 0) ctx.fillRect(x, y, s, s / 2);
      if (k === 1) ctx.fillRect(x + s / 2, y, s / 2, s);
      if (k === 2) ctx.fillRect(x, y + s / 2, s, s / 2);
      if (k === 3) ctx.fillRect(x, y, s / 2, s);
    }
    ctx.strokeRect(x, y, s, s);
    if (tok[0] === 't') {
      const a = -Math.PI / 2 + (+tok[1]) * Math.PI / 4;
      const corner = (+tok[1]) % 2 === 1;
      const r0 = corner ? s / 2 * Math.SQRT2 : s / 2, len = cell * 0.2;
      const dx = Math.cos(a), dy = Math.sin(a);
      ctx.beginPath(); ctx.moveTo(cx + dx * r0, cy + dy * r0); ctx.lineTo(cx + dx * (r0 + len), cy + dy * (r0 + len)); ctx.stroke();
    }
    ctx.restore();
    return;
  }
  drawFigure(ctx, { shape: tok, fill: 'empty' }, cx, cy, cell * 0.92);
}

export default {
  id: 'proof',
  skills: ['attention', 'speed'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  usesLang: true,                 // harflar tilga bog'liq (alifbo)
  name: { uz: 'Korrektura sinovi', ru: 'Корректурная проба', en: 'Proofreading test' },
  desc: {
    uz: "Qatorlardagi berilgan harf yoki belgilarni topib o'chirish — diqqatni jamlash mashqi",
    ru: 'Найти и зачеркнуть в строках заданные буквы или значки — тренировка концентрации',
    en: 'Find and cross out the given letters or signs in the rows — a concentration drill'
  },
  fileBase: { uz: 'Korrektura sinovi', ru: 'Корректурная проба', en: 'Proofreading test' },
  defaultTitle: { uz: "Diqqat bilan o'chir!", ru: 'Зачеркни внимательно!', en: 'Cross out carefully!' },
  options: [
    { key: 'level', type: 'level', default: 1 },
    {
      key: 'mode', type: 'choice', style: 'cards', pack: 'select', default: 'letters',
      label: { uz: 'Turi', ru: 'Вид', en: 'Kind' },
      choices: Object.entries(MODES).map(([value, m]) => ({ value, big: m.big, label: m.label }))
    }
  ],
  levelHint: {
    uz: ['1 ta belgi, 6 qator, bir-biriga o\'xshamaydigan belgilar', "1 ta belgi, 8 qator, o'xshash belgilar bor", "2 ta belgi (o'chir va tagiga chiz), 10 qator", "2 ta bir-biriga o'xshash belgi (b va d kabi), 12 qator"],
    ru: ['1 знак, 6 строк, непохожие знаки', '1 знак, 8 строк, есть похожие', '2 знака (зачеркнуть и подчеркнуть), 10 строк', '2 похожих знака (как б и д), 12 строк'],
    en: ['1 sign, 6 rows, no look-alikes', '1 sign, 8 rows, look-alikes', '2 signs (cross out and underline), 10 rows', '2 similar signs (like b and d), 12 rows']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const mode = opts.mode in MODES ? opts.mode : 'letters';
    const lang = ABC[opts.lang] ? opts.lang : 'uz';
    const L = LEVELS[level];
    const rand = makeRng(seed);
    // Kichik joylar uchun qatorlar kamroq (har biri o'qiladigan kattalikda qolsin)
    let rows = L.rows, cols = L.cols;
    if (opts.perPage === 4) { rows = Math.min(rows, 6); cols = Math.min(cols, 9); }
    else if (opts.perPage === 2) { rows = Math.min(rows, 5); cols = Math.min(cols + 4, 20); }
    const { targets, others } = pickKinds(mode, lang, level, rand);
    // Har qatorda nishonlar soni o'rtacha cols·p atrofida (±50%); birinchi nishon har qatorda kamida 1 marta
    const nT = targets.length;
    const around = (min) => Math.max(min, Math.round(cols * L.p * (0.5 + rand())));
    const grid = [];
    for (let r = 0; r < rows; r++) {
      const row = new Array(cols).fill(-1);
      const pos = shuffle(Array.from({ length: cols }, (_, i) => i), rand);
      let k = 0;
      for (let j = 0, n = around(1); j < n; j++) row[pos[k++]] = 0;
      if (nT > 1) for (let j = 0, n = around(0); j < n; j++) row[pos[k++]] = 1;
      for (let c = 0; c < cols; c++) {
        if (row[c] >= 0) continue;
        let tok;
        do tok = nT + Math.floor(rand() * others.length);
        while (c >= 2 && row[c - 1] === tok && row[c - 2] === tok);
        row[c] = tok;
      }
      grid.push(row);
    }
    const counts = grid.map(row => [0, 1].map(t => (t < nT ? row.filter(v => v === t).length : 0)));
    return { level, seed, mode, lang, rows, cols, two: nT > 1, kinds: [...targets, ...others], grid, counts };
  },

  info(p, lang) {
    const n = p.rows * p.cols;
    return { uz: `${p.rows} qator, ${n} ta belgi`, ru: `${p.rows} строк, ${n} ${ruPlural(n, 'знак', 'знака', 'знаков')}`, en: `${p.rows} rows, ${n} signs` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box);
    const rule = measureRule(ctx, (RULE[lang] || RULE.uz)(!p.two), box.w, scale);
    const gap = 3.5 * scale;
    const sampleH = 12 * scale, timeH = 8 * scale;
    // Katak o'lchami: eni bo'yicha va bo'yi bo'yicha sig'ishi kerak (qatorlar orasi — 1.35 katak)
    const numW = 6 * scale;                                   // chapda qator raqami, o'ngda (javobda) qatordagi nishonlar soni
    const cell = Math.min((box.w - 2 * numW) / p.cols, (box.h - sampleH - timeH - rule.h - 3 * gap) / (p.rows * 1.35), 16);
    const rowH = cell * 1.35;
    const gridW = p.cols * cell, gridH = p.rows * rowH;
    const blockH = sampleH + gap + gridH + gap + timeH + gap + rule.h;
    const top = box.y + Math.max(0, (box.h - blockH) * 0.3);
    const left = box.x + (box.w - gridW) / 2;

    // Namuna: [belgi] → ✗  ,  [belgi] → ___
    const sc = Math.min(cell * 1.15, sampleH * 0.8);
    font(ctx, 11 * 0.3528 * scale * 1.15, 700);
    const sl = SAMPLE[lang] || SAMPLE.uz;
    const slw = ctx.measureText(sl).width;
    const unit = sc * 3.1;
    const sw = slw + 3 + unit * (p.two ? 2 : 1) + (p.two ? sc : 0);
    let sx = box.x + (box.w - sw) / 2;
    const sy = top + sampleH / 2;
    ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(sl, sx, sy);
    sx += slw + 3;
    const marks = p.two ? [0, 1] : [0];
    for (const t of marks) {
      ctx.save();
      ctx.strokeStyle = '#9CA3AF'; ctx.lineWidth = 0.3;
      ctx.strokeRect(sx, sy - sc * 0.66, unit - sc * 0.2, sc * 1.32);
      ctx.restore();
      const cx = sx + sc * 0.6;
      drawToken(ctx, p.mode, p.kinds[t], cx, sy, sc);
      // o'ng tomonda: belgining o'zi belgilangan holda
      const cx2 = sx + sc * 2.3;
      drawToken(ctx, p.mode, p.kinds[t], cx2, sy, sc);
      if (t === 0) { line(ctx, cx2 - sc * 0.38, sy - sc * 0.38, cx2 + sc * 0.38, sy + sc * 0.38, INK, Math.max(0.3, sc * 0.07)); line(ctx, cx2 + sc * 0.38, sy - sc * 0.38, cx2 - sc * 0.38, sy + sc * 0.38, INK, Math.max(0.3, sc * 0.07)); }
      else line(ctx, cx2 - sc * 0.42, sy + sc * 0.5, cx2 + sc * 0.42, sy + sc * 0.5, INK, Math.max(0.3, sc * 0.07));
      // o'q
      ctx.save(); ctx.fillStyle = MUTE; font(ctx, sc * 0.5, 700); ctx.textAlign = 'center'; ctx.fillText('→', sx + sc * 1.45, sy); ctx.restore();
      sx += unit + sc * 0.4;
    }

    // Qatorlar
    const gy = top + sampleH + gap;
    p.grid.forEach((row, r) => {
      const cy = gy + r * rowH + rowH / 2;
      font(ctx, Math.min(cell * 0.42, 3.4), 600);
      ctx.fillStyle = '#9CA3AF'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(String(r + 1), left - 1.5 * scale, cy);
      row.forEach((tok, c) => {
        const cx = left + c * cell + cell / 2;
        drawToken(ctx, p.mode, p.kinds[tok], cx, cy, cell);
        if (showSolution && tok < (p.two ? 2 : 1)) {
          if (tok === 0) {
            ctx.save(); ctx.strokeStyle = ANSWER; ctx.lineWidth = Math.max(0.3, 0.45 * scale);
            ctx.beginPath(); ctx.arc(cx, cy, cell * 0.48, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
          } else line(ctx, cx - cell * 0.42, cy + cell * 0.5, cx + cell * 0.42, cy + cell * 0.5, '#2563EB', Math.max(0.35, 0.5 * scale));
        }
      });
      // Javobda: qatordagi nishonlar soni (o'ng chetda)
      if (showSolution) {
        font(ctx, Math.min(cell * 0.4, 3.2), 700);
        ctx.textAlign = 'left'; ctx.fillStyle = ANSWER;
        const txt = p.two ? `${p.counts[r][0]} · ${p.counts[r][1]}` : String(p.counts[r][0]);
        ctx.fillText(txt, left + gridW + 1.2 * scale, cy);
      }
    });

    // Vaqt va topilganlar soni
    const tot = [0, 1].map(t => p.counts.reduce((s, c) => s + c[t], 0));
    const F = FOUND[lang] || FOUND.uz;
    timeLine(ctx, box.x + box.w / 2, gy + gridH + gap + timeH * 0.7, scale, lang, [{ label: F[0], unit: F[1] }]);
    if (showSolution) {
      font(ctx, 11 * 0.3528 * scale * 1.1, 800);
      ctx.fillStyle = ANSWER; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(p.two ? `${tot[0]} + ${tot[1]}` : String(tot[0]), box.x + box.w, gy + gridH + gap + timeH * 0.7);
    }
    drawRule(ctx, rule, box.x + box.w / 2, gy + gridH + gap + timeH + gap);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const tot = [0, 1].map(t => p.counts.reduce((s, c) => s + c[t], 0));
    const T = {
      uz: p.two ? `Nishonlar: ${tot[0]} ta (✗) va ${tot[1]} ta (tagiga chiziladi)` : `Nishonlar: ${tot[0]} ta`,
      ru: p.two ? `Целей: ${tot[0]} (✗) и ${tot[1]} (подчеркнуть)` : `Целей: ${tot[0]}`,
      en: p.two ? `Targets: ${tot[0]} (✗) and ${tot[1]} (underline)` : `Targets: ${tot[0]}`
    };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    if (p.grid.length !== p.rows) problems.push('row count');
    p.grid.forEach((row, r) => {
      if (row.length !== p.cols) problems.push(`row ${r} length`);
      [0, 1].forEach(t => { if ((t < (p.two ? 2 : 1) ? row.filter(v => v === t).length : 0) !== p.counts[r][t]) problems.push(`row ${r} target ${t} count`); });
      row.forEach(v => { if (v < 0 || v >= p.kinds.length) problems.push(`row ${r} bad token`); });
    });
    const tot = [0, 1].map(t => p.counts.reduce((s, c) => s + c[t], 0));
    if (tot[0] < 1) problems.push('first target never appears');
    if (p.two && tot[1] < 1) problems.push('second target never appears');
    if (!p.two && tot[1] > 0) problems.push('second target used in one-target level');
    if (new Set(p.kinds).size !== p.kinds.length) problems.push('repeated kind');
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-proof" aria-hidden="true"><defs><linearGradient id="cg-proof" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fa709a"/><stop offset="1" stop-color="#fee140"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-proof)"/><rect x="26" y="40" width="148" height="120" rx="12" fill="#fff"/><g font-family="Nunito, sans-serif" font-weight="800" font-size="24" fill="#374151" text-anchor="middle"><text x="48" y="80">k</text><text x="76" y="80">a</text><text x="104" y="80">m</text><text x="132" y="80">a</text><text x="158" y="80">s</text><text x="48" y="124">a</text><text x="76" y="124">e</text><text x="104" y="124">o</text><text x="132" y="124">r</text><text x="158" y="124">a</text></g><g stroke="#DC2626" stroke-width="4" stroke-linecap="round" fill="none"><path class="pf-x1" pathLength="100" d="M68 64 L84 84 M84 64 L68 84"/><path class="pf-x2" pathLength="100" d="M124 64 L140 84 M140 64 L124 84"/><path class="pf-x3" pathLength="100" d="M40 108 L56 128 M56 108 L40 128"/><path class="pf-x4" pathLength="100" d="M150 108 L166 128 M166 108 L150 128"/></g></svg>`
};
