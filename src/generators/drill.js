// drill.js — «Misollar varag'i» (Лист примеров / Arithmetic drill) generatori.
// Daraja bo'yicha misollar to'plami:
//  • «Og'zaki» — qatorma-qator misollar (7 + 6 = □), bola javobni katakka yozadi;
//  • «Ustun bo'lib» — katakli qog'ozda ustun bo'lib qo'shish, ayirish va ko'paytirish.
// Kafolat (check()): javoblar to'g'ri, takrorlanuvchi misol yo'q, darajaning shartlari bajarilgan
// (masalan, 1-darajada o'nlikdan o'tish yo'q, 2-darajada — albatta bor).

import { makeRng, randInt, shuffle, pickOne } from '../core/rng.js';
import { INK, MUTE, ANSWER, font, roundRect } from '../core/draw.js';
import { scaleOf, measureRule, drawRule, ruPlural } from '../core/parts.js';

const MUL = '×', DIV = '÷', MINUS = '−';
const COUNT = {
  mental: [[24, 12, 8], [30, 15, 10], [36, 15, 10], [30, 12, 8]],
  column: [[16, 8, 4], [16, 8, 4], [16, 8, 4], [9, 4, 2]]
};

// ---------- Og'zaki misollar ----------
function mentalOne(level, rand) {
  if (level === 0) {
    if (rand() < 0.5) { const a = randInt(rand, 1, 9), b = randInt(rand, 1, 10 - a); return { s: `${a} + ${b}`, v: a + b }; }
    const a = randInt(rand, 2, 10), b = randInt(rand, 1, a - 1); return { s: `${a} ${MINUS} ${b}`, v: a - b };
  }
  if (level === 1) {
    // 20 gacha, o'nlikdan o'tib: 8 + 5, 14 − 6
    if (rand() < 0.5) { const a = randInt(rand, 2, 9), b = randInt(rand, 11 - a, 9); return { s: `${a} + ${b}`, v: a + b }; }
    const a = randInt(rand, 11, 18), b = randInt(rand, a - 9, 9); if (b <= a % 10) return null; return { s: `${a} ${MINUS} ${b}`, v: a - b };
  }
  if (level === 2) {
    const a = randInt(rand, 2, 10), b = randInt(rand, 2, 10);
    return rand() < 0.55 ? { s: `${a} ${MUL} ${b}`, v: a * b } : { s: `${a * b} ${DIV} ${a}`, v: b };
  }
  const f = randInt(rand, 0, 5);
  const a = randInt(rand, 2, 9), b = randInt(rand, 2, 9);
  if (f === 0) { const x = randInt(rand, 21, 79), y = randInt(rand, 11, 99 - x); return { s: `${x} + ${y}`, v: x + y }; }
  if (f === 1) { const x = randInt(rand, 41, 99), y = randInt(rand, 12, x - 10); return { s: `${x} ${MINUS} ${y}`, v: x - y }; }
  if (f === 2) { const x = randInt(rand, Math.max(1, a * b - 40), a * b - 1); return { s: `(${x} + ${a * b - x}) ${DIV} ${b}`, v: a }; }
  if (f === 3) { const c = randInt(rand, 1, 9), d = c + randInt(rand, 2, 9); return { s: `${a} ${MUL} (${d} ${MINUS} ${c})`, v: a * (d - c) }; }
  if (f === 4) { const c = randInt(rand, a * b + 1, a * b + 40); return { s: `${c} ${MINUS} ${a} ${MUL} ${b}`, v: c - a * b }; }
  const c = randInt(rand, 2, 30); return { s: `${a * b} ${DIV} ${a} + ${c}`, v: b + c };
}

// ---------- Ustun bo'lib ----------
const digits = n => String(n).split('').map(Number);
function carries(a, b) { let c = 0, k = 0; while (a || b) { if ((a % 10) + (b % 10) + c >= 10) { k++; c = 1; } else c = 0; a = Math.floor(a / 10); b = Math.floor(b / 10); } return k; }
function borrows(a, b) { let c = 0, k = 0; while (a || b) { if ((a % 10) - (b % 10) - c < 0) { k++; c = 1; } else c = 0; a = Math.floor(a / 10); b = Math.floor(b / 10); } return k; }
function columnOne(level, rand) {
  if (level === 0) {
    if (rand() < 0.5) { const a = randInt(rand, 10, 88), b = randInt(rand, 10, 99 - a); if (carries(a, b)) return null; return { a, op: '+', b, v: a + b }; }
    const a = randInt(rand, 21, 99), b = randInt(rand, 10, a - 1); if (borrows(a, b)) return null; return { a, op: '-', b, v: a - b };
  }
  if (level === 1) {
    if (rand() < 0.5) { const a = randInt(rand, 120, 879), b = randInt(rand, 110, 999 - a); if (!carries(a, b)) return null; return { a, op: '+', b, v: a + b }; }
    const a = randInt(rand, 300, 999), b = randInt(rand, 102, a - 50); if (!borrows(a, b)) return null; return { a, op: '-', b, v: a - b };
  }
  if (level === 2) { const a = rand() < 0.4 ? randInt(rand, 12, 98) : randInt(rand, 102, 989), b = randInt(rand, 3, 9); return { a, op: MUL, b, v: a * b }; }
  if (rand() < 0.6) { const a = randInt(rand, 23, 98), b = randInt(rand, 12, 98); if (b % 10 === 0 || b % 10 === 1) return null; return { a, op: MUL, b, v: a * b }; }
  // 4 xonali ayirish, nol orqali qarz olish (1003 − 457)
  const a = pickOne(rand, [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000]) + randInt(rand, 0, 9) + (rand() < 0.5 ? 0 : randInt(rand, 1, 9) * 100);
  const b = randInt(rand, 123, Math.min(a - 100, 4999)); if (borrows(a, b) < 2) return null; return { a, op: '-', b, v: a - b };
}

// Misol matnini hisoblash (tekshirish uchun): sonlar, + − × ÷ va qavslar; amallar tartibi bilan
export function evalExpr(str) {
  const tk = str.replace(/\s+/g, '').match(/\d+|[+−×÷()]/g) || [];
  let i = 0;
  const atom = () => { const t = tk[i++]; if (t === '(') { const v = sum(); i++; return v; } return Number(t); };
  const prod = () => { let v = atom(); while (tk[i] === '×' || tk[i] === '÷') { const op = tk[i++], b = atom(); v = op === '×' ? v * b : v / b; } return v; };
  const sum = () => { let v = prod(); while (tk[i] === '+' || tk[i] === '−') { const op = tk[i++], b = prod(); v = op === '+' ? v + b : v - b; } return v; };
  return sum();
}

function makeList(mode, level, n, rand) {
  const seen = new Set(), out = [];
  for (let t = 0; out.length < n && t < n * 400; t++) {
    const e = mode === 'mental' ? mentalOne(level, rand) : columnOne(level, rand);
    if (!e) continue;
    const key = mode === 'mental' ? e.s : `${e.a}${e.op}${e.b}`;
    if (seen.has(key) || (mode === 'mental' && (e.v < 0 || !Number.isInteger(e.v)))) continue;
    seen.add(key); out.push(e);
  }
  return out;
}

const MODES = {
  mental: { big: '7+6=', label: { uz: "Og'zaki", ru: 'Устно', en: 'Mental' } },
  column: { big: '₊⁴⁷₂₅', label: { uz: "Ustun bo'lib", ru: 'В столбик', en: 'Column' } }
};
const RULE = {
  mental: { uz: "Misollarni yech va javobni katakka yoz.", ru: 'Реши примеры и запиши ответы в клетки.', en: 'Solve the sums and write the answers in the boxes.' },
  column: { uz: "Ustun bo'lib hisobla: raqamlarni xonasiga qarab yoz, javobni chiziq ostiga yoz.", ru: 'Посчитай в столбик: пиши цифры по разрядам, ответ — под чертой.', en: 'Work in columns: line the digits up by place value and write the answer under the line.' },
  order: { uz: ' Avval qavs ichidagi amal, keyin ko\'paytirish va bo\'lish, so\'ng qo\'shish va ayirish bajariladi.', ru: ' Сначала действие в скобках, потом умножение и деление, затем сложение и вычитание.', en: ' Do brackets first, then multiply and divide, then add and subtract.' }
};

export default {
  id: 'drill',
  skills: ['counting', 'speed'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: "Misollar varag'i", ru: 'Лист примеров', en: 'Arithmetic drill' },
  desc: {
    uz: "Daraja bo'yicha 24–36 ta og'zaki misol yoki ustun bo'lib qo'shish, ayirish, ko'paytirish",
    ru: '24–36 устных примеров или сложение, вычитание и умножение в столбик по уровням',
    en: '24–36 mental sums or column addition, subtraction and multiplication by level'
  },
  fileBase: { uz: "Misollar varag'i", ru: 'Лист примеров', en: 'Arithmetic drill' },
  defaultTitle: { uz: 'Misollarni yech!', ru: 'Реши примеры!', en: 'Solve the sums!' },
  options: [
    { key: 'level', type: 'level', default: 1 },
    {
      key: 'mode', type: 'choice', style: 'cards', pack: 'select', default: 'mental',
      label: { uz: 'Turi', ru: 'Вид', en: 'Kind' },
      choices: Object.entries(MODES).map(([value, m]) => ({ value, big: m.big, label: m.label }))
    }
  ],
  levelHint: {
    uz: ["Og'zaki: + va − 10 gacha. Ustun: ikki xonali, o'nlikdan o'tmasdan", "Og'zaki: 20 gacha, o'nlikdan o'tib. Ustun: uch xonali, o'tib", "Og'zaki: karra jadvali va bo'lish. Ustun: bir xonaliga ko'paytirish", "Og'zaki: 100 gacha va qavsli misollar. Ustun: ikki xonaliga ko'paytirish, noldan qarz olib ayirish"],
    ru: ['Устно: + и − до 10. Столбик: двузначные без перехода', 'Устно: до 20 с переходом через десяток. Столбик: трёхзначные с переходом', 'Устно: таблица умножения и деление. Столбик: умножение на однозначное', 'Устно: до 100 и примеры со скобками. Столбик: умножение на двузначное, вычитание с занимаем через ноль'],
    en: ['Mental: + and − to 10. Column: 2-digit, no carrying', 'Mental: to 20, crossing ten. Column: 3-digit with carrying', 'Mental: times tables and division. Column: × by one digit', 'Mental: to 100 and brackets. Column: × by two digits, borrowing across zeros']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const mode = opts.mode in MODES ? opts.mode : 'mental';
    const rand = makeRng(seed);
    const n = COUNT[mode][level][opts.perPage === 4 ? 2 : opts.perPage === 2 ? 1 : 0];
    const items = makeList(mode, level, n, rand);
    return { level, seed, mode, items };
  },

  info(p, lang) {
    const n = p.items.length;
    return { uz: `${n} ta misol`, ru: `${n} ${ruPlural(n, 'пример', 'примера', 'примеров')}`, en: `${n} sums` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box);
    const text = (RULE[p.mode][lang] || RULE[p.mode].uz) + (p.mode === 'mental' && p.level === 3 ? (RULE.order[lang] || RULE.order.uz) : '');
    const rule = measureRule(ctx, text, box.w, scale);
    const gap = 5 * scale;
    const H = box.h - rule.h - gap;
    let bottom;
    if (p.mode === 'mental') bottom = drawMental(ctx, p, box, H, scale, showSolution);
    else bottom = drawColumn(ctx, p, box, H, scale, showSolution);
    drawRule(ctx, rule, box.x + box.w / 2, bottom + gap);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const T = { uz: `Misollar: ${p.items.length} ta`, ru: `Примеров: ${p.items.length}`, en: `Sums: ${p.items.length}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    if (p.items.length < COUNT[p.mode][p.level][2]) problems.push('too few items');
    const keys = new Set();
    for (const e of p.items) {
      if (p.mode === 'mental') {
        const v = evalExpr(e.s);
        if (v !== e.v || !Number.isInteger(v) || v < 0) problems.push(`wrong answer: ${e.s}`);
        if (keys.has(e.s)) problems.push('repeated'); keys.add(e.s);
        if (p.level === 0 && v > 10) problems.push('over 10');
        if (p.level === 1 && v > 20) problems.push('over 20');
      } else {
        const v = e.op === '+' ? e.a + e.b : e.op === '-' ? e.a - e.b : e.a * e.b;
        if (v !== e.v || v < 0) problems.push(`wrong: ${e.a}${e.op}${e.b}`);
        if (p.level === 0 && (e.op === '+' ? carries(e.a, e.b) : borrows(e.a, e.b))) problems.push('carry at level 0');
        if (p.level === 1 && !(e.op === '+' ? carries(e.a, e.b) : borrows(e.a, e.b))) problems.push('no carry at level 1');
        const key = `${e.a}${e.op}${e.b}`; if (keys.has(key)) problems.push('repeated'); keys.add(key);
      }
    }
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-drill" aria-hidden="true"><defs><linearGradient id="cg-drill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e0c3fc"/><stop offset="1" stop-color="#8ec5fc"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-drill)"/><rect x="34" y="28" width="132" height="144" rx="10" fill="#fff"/><g stroke="#c7d2fe" stroke-width="1.5"><path d="M34 58h132M34 88h132M34 118h132M34 148h132M64 28v144M94 28v144M124 28v144"/></g><g font-family="Nunito, sans-serif" font-weight="900" font-size="24" text-anchor="middle" fill="#1e3a8a"><text x="109" y="52">4</text><text x="139" y="52">7</text><text x="109" y="82">2</text><text x="139" y="82">5</text><text x="54" y="70">+</text></g><path d="M64 94h90" stroke="#1e3a8a" stroke-width="4" stroke-linecap="round"/><g font-family="Nunito, sans-serif" font-weight="900" font-size="24" text-anchor="middle" fill="#DC2626"><text class="dr-a" x="139" y="116">2</text><text class="dr-b" x="109" y="116">7</text></g></svg>`
};

// Og'zaki misollar: ustunlarga terib chiqiladi, har biri «misol = [katak]»
function drawMental(ctx, p, box, H, scale, showSolution) {
  const n = p.items.length;
  font(ctx, 10, 700);
  const maxTxt = Math.max(...p.items.map(e => ctx.measureText(e.s + ' =').width)) / 10;   // 1 mm shrift uchun eni
  const cols = p.level === 3 ? 2 : n >= 24 ? 3 : 2;
  const rows = Math.ceil(n / cols);
  const colW = box.w / cols;
  const rowH = Math.min(H / rows, 22 * scale);
  // shrift: raqam + misol + javob katagi ustun eniga sig'sin
  let fs = Math.min(rowH * 0.4, 7.4 * scale);
  const need = fs * (1.7 + maxTxt + 0.5 + 2.6) + 4 * scale;
  if (need > colW) fs *= colW / need;
  const ansW = fs * 2.6, ansH = Math.min(rowH * 0.72, fs * 1.6);
  const blockH = rows * rowH;
  const top = box.y + Math.max(0, (H - blockH) * 0.25);
  p.items.forEach((e, i) => {
    const c = Math.floor(i / rows), r = i % rows;
    const x0 = box.x + c * colW + 2 * scale, y = top + r * rowH + rowH / 2;
    font(ctx, fs * 0.7, 700); ctx.fillStyle = MUTE; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(`${i + 1}.`, x0 + fs * 1.3, y);
    font(ctx, fs, 700); ctx.fillStyle = INK; ctx.textAlign = 'left';
    const t = e.s + ' =';
    ctx.fillText(t, x0 + fs * 1.7, y);
    const ax = x0 + fs * 1.7 + ctx.measureText(t).width + fs * 0.5;
    roundRect(ctx, ax, y - ansH / 2, ansW, ansH, ansH * 0.2);
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.3, 0.4 * scale); ctx.stroke();
    if (showSolution) { font(ctx, fs, 700); ctx.fillStyle = ANSWER; ctx.textAlign = 'center'; ctx.fillText(String(e.v), ax + ansW / 2, y + fs * 0.03); }
  });
  return top + blockH;
}

// Ustun bo'lib: har misol katakli qog'oz bo'lagida; raqamlar xonalariga mos kataklarda
function columnLayout(e) {
  const A = digits(e.a), B = digits(e.b), V = digits(e.v);
  if (e.op === MUL && e.b >= 10) {
    const p1 = e.a * (e.b % 10), p2 = e.a * Math.floor(e.b / 10);
    const P1 = digits(p1), P2 = digits(p2);
    const width = Math.max(A.length, B.length, P1.length, P2.length + 1, V.length) + 1;
    return { width, rows: [A, B, null, P1, [...P2, ' '], null, V], answerFrom: 3, partial: true };
  }
  const width = Math.max(A.length, B.length, V.length) + 1;
  return { width, rows: [A, B, null, V], answerFrom: 3 };
}
function drawColumn(ctx, p, box, H, scale, showSolution) {
  const n = p.items.length;
  const lays = p.items.map(columnLayout);
  const maxW = Math.max(...lays.map(l => l.width)), maxR = Math.max(...lays.map(l => l.rows.filter(Boolean).length)) + 1;
  const cols = n >= 9 ? (n === 9 ? 3 : 4) : n >= 4 ? 2 : 2;
  const rowsN = Math.ceil(n / cols);
  const cellW = box.w / cols;
  const cs = Math.min((cellW - 6 * scale) / (maxW + 1.2), (H - (rowsN - 1) * 6 * scale) / (rowsN * (maxR + 0.8)), 9);
  const blockW = (maxW + 1) * cs, blockH = (maxR + 0.6) * cs;
  const vgap = Math.min(8 * scale, (H - rowsN * blockH) / Math.max(1, rowsN - 1));
  const totalH = rowsN * blockH + (rowsN - 1) * vgap;
  const top = box.y + Math.max(0, (H - totalH) * 0.25);
  p.items.forEach((e, i) => {
    const lay = lays[i];
    const c = i % cols, r = Math.floor(i / cols);
    const ox = box.x + c * cellW + (cellW - blockW) / 2, oy = top + r * (blockH + vgap);
    // katakli fon
    ctx.strokeStyle = '#DCE3F0'; ctx.lineWidth = Math.max(0.15, 0.2 * scale);
    ctx.beginPath();
    for (let k = 0; k <= maxW + 1; k++) { ctx.moveTo(ox + k * cs, oy); ctx.lineTo(ox + k * cs, oy + maxR * cs); }
    for (let k = 0; k <= maxR; k++) { ctx.moveTo(ox, oy + k * cs); ctx.lineTo(ox + (maxW + 1) * cs, oy + k * cs); }
    ctx.stroke();
    font(ctx, 6.5 * 0.3528 * 1.4 * scale + cs * 0.15, 700);
    ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(`${i + 1}.`, ox + 0.15 * cs, oy + 0.1 * cs);
    const right = ox + (maxW + 1) * cs;              // eng o'ng katak chegarasi
    const putRow = (ds, row, color) => {
      ds.forEach((d, j) => {
        if (d === ' ') return;
        const x = right - (ds.length - j) * cs;
        font(ctx, cs * 0.7, 800); ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(d), x + cs / 2, oy + row * cs + cs / 2 + cs * 0.04);
      });
    };
    // null — chiziq (alohida qator emas: keyingi qatorning ustki chegarasi)
    let row = 0;
    lay.rows.forEach((ds, idx) => {
      if (ds === null) {
        const w = Math.max(...lay.rows.filter(Boolean).slice(0, row).map(x => x.length));
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.4, 0.6 * scale);
        ctx.beginPath(); ctx.moveTo(right - (w + 1) * cs + cs * 0.2, oy + row * cs); ctx.lineTo(right - cs * 0.1, oy + row * cs); ctx.stroke();
        return;
      }
      if (idx < 2) putRow(ds, row, INK);
      else if (showSolution) putRow(ds, row, ANSWER);
      row++;
    });
    // amal belgisi
    const sign = e.op === '-' ? MINUS : e.op;
    const signX = right - (Math.max(lay.rows[0].length, lay.rows[1].length) + 1) * cs;
    font(ctx, cs * 0.75, 800); ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(sign, signX + cs / 2, oy + cs);
    if (lay.partial && showSolution) {
      font(ctx, cs * 0.6, 800); ctx.fillStyle = ANSWER;
      ctx.fillText('+', right - (Math.max(lay.rows[3].length, lay.rows[4].length) + 1) * cs + cs / 2, oy + 3 * cs);
    }
  });
  return top + totalH;
}
