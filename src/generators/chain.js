// chain.js — «Misollar zanjiri» (Цепочки примеров / Number chains) generatori.
// Boshlang'ich sondan amallar ketma-ket bajariladi: har bir natija keyingi katakka yoziladi va keyingi misolning
// boshlanishi bo'ladi. Oxirgi son oldindan yozilgan — bola o'zini o'zi tekshiradi.
// Qiyin darajalarda bitta amalning soni yoki boshlang'ich son yashirin: uni oxiridan orqaga hisoblab topiladi.
// Kafolat (check()): hamma sonlar butun va oraliqda, bo'linish qoldiqsiz, yashirin son yagona topiladi.

import { makeRng, randInt, pickOne } from '../core/rng.js';
import { INK, MUTE, ANSWER, font, roundRect } from '../core/draw.js';
import { scaleOf, measureRule, drawRule, ruPlural } from '../core/parts.js';

const MUL = '×', DIV = '÷', MINUS = '−';
// steps — [1 tadan, 2 tadan, 4 tadan] joylashgandagi amallar soni; rows — zanjirlar soni (xuddi shunday);
// ops — amallar; max — eng katta son; add — qo'shish/ayirish sonlari oralig'i; mul — ko'paytuvchi oralig'i;
// hide — yashirin narsa: null | 'op' (amal soni) | 'any' (amal soni yoki boshlang'ich son)
const LEVELS = [
  { steps: [4, 4, 3], rows: [7, 3, 4], ops: ['+', '-'], max: 20, add: [1, 9], mul: null, hide: null },
  { steps: [5, 5, 4], rows: [7, 3, 4], ops: ['+', '-', MUL], max: 100, add: [2, 30], mul: [2, 5], hide: null },
  { steps: [6, 6, 4], rows: [6, 3, 3], ops: ['+', '-', MUL, DIV], max: 100, add: [2, 40], mul: [2, 9], hide: 'op' },
  { steps: [7, 7, 5], rows: [6, 3, 3], ops: ['+', '-', MUL, DIV], max: 200, add: [5, 90], mul: [2, 9], hide: 'any' }
];

const apply = (a, op, v) => (op === '+' ? a + v : op === '-' ? a - v : op === MUL ? a * v : (a % v === 0 ? a / v : NaN));
const unapply = (b, op, v) => (op === '+' ? b - v : op === '-' ? b + v : op === MUL ? (b % v === 0 ? b / v : NaN) : b * v);
// Ikki qo'shni son orasidagi amal sonini topish
function operandOf(a, op, b) {
  if (op === '+') return b - a;
  if (op === '-') return a - b;
  if (op === MUL) return a !== 0 && b % a === 0 ? b / a : NaN;
  return b !== 0 && a % b === 0 ? a / b : NaN;
}

function buildRow(L, steps, rand, prevOps) {
  for (let attempt = 0; attempt < 2000; attempt++) {
    const vals = [randInt(rand, L.mul ? 2 : 1, Math.min(L.max, L.mul ? 30 : 12))];
    const ops = [];
    let ok = true;
    for (let i = 0; i < steps && ok; i++) {
      const a = vals[i];
      // Mumkin bo'lgan amallar (ketma-ket ikki marta bir xil amal kelmasin)
      const cand = [];
      for (const op of L.ops) {
        if (ops.length && ops[ops.length - 1].op === op && rand() < 0.7) continue;
        if (op === '+' && a + L.add[0] <= L.max) cand.push(op);
        if (op === '-' && a - L.add[0] >= 0) cand.push(op);
        if (op === MUL && L.mul && a >= 2 && a * L.mul[0] <= L.max) cand.push(op);
        if (op === DIV && L.mul && a >= 4) for (let d = L.mul[0]; d <= L.mul[1]; d++) if (a % d === 0 && a / d >= 1) { cand.push(op); break; }
      }
      if (!cand.length) { ok = false; break; }
      const op = pickOne(rand, cand);
      let v;
      if (op === '+') v = randInt(rand, L.add[0], Math.min(L.add[1], L.max - a));
      else if (op === '-') v = randInt(rand, L.add[0], Math.min(L.add[1], a));
      else if (op === MUL) v = randInt(rand, L.mul[0], Math.min(L.mul[1], Math.floor(L.max / a)));
      else { const ds = []; for (let d = L.mul[0]; d <= L.mul[1]; d++) if (a % d === 0) ds.push(d); v = pickOne(rand, ds); }
      const b = apply(a, op, v);
      if (!Number.isInteger(b) || b < 0 || b > L.max || v < 1) { ok = false; break; }
      ops.push({ op, v }); vals.push(b);
    }
    if (!ok) continue;
    if (new Set(vals).size < vals.length - 1) continue;              // bir xil sonlar ko'p bo'lmasin
    if (L.ops.length > 2 && new Set(ops.map(o => o.op)).size < Math.min(3, L.ops.length)) continue;
    let hide = null;
    if (L.hide === 'op' || (L.hide === 'any' && rand() < 0.5)) {
      // Yashirin amal soni: zanjirning o'rtasidan (boshida bo'lsa juda oson)
      const i = randInt(rand, 1, steps - 2);
      if (ops[i].op === MUL || ops[i].op === DIV ? ops[i].v < 2 : ops[i].v < 1) continue;
      hide = { type: 'op', i };
    } else if (L.hide === 'any') {
      if (vals[0] < 2) continue;
      hide = { type: 'start' };
    }
    const sig = ops.map(o => o.op + o.v).join('');
    if (prevOps.includes(sig)) continue;
    prevOps.push(sig);
    return { vals, ops, hide };
  }
  throw new Error('chain: no row');
}

// Yashirin narsani orqadan hisoblab topish (javob yagonaligini tekshirish uchun)
export function solveRow(row) {
  const { vals, ops, hide } = row, n = ops.length;
  const v = new Array(n + 1).fill(null);
  v[n] = vals[n];
  if (!hide || hide.type === 'op') v[0] = vals[0];
  const opv = ops.map((o, i) => (hide && hide.type === 'op' && hide.i === i ? null : o.v));
  // oldinga
  for (let i = 0; i < n && v[i] !== null && opv[i] !== null; i++) v[i + 1] = apply(v[i], ops[i].op, opv[i]);
  // orqaga
  for (let i = n - 1; i >= 0 && v[i + 1] !== null && opv[i] !== null; i--) if (v[i] === null) v[i] = unapply(v[i + 1], ops[i].op, opv[i]);
  if (hide && hide.type === 'op') { const i = hide.i; if (v[i] !== null && v[i + 1] !== null) opv[i] = operandOf(v[i], ops[i].op, v[i + 1]); }
  return { v, opv };
}

const RULE = {
  uz: "Zanjir bo'ylab chapdan o'ngga hisobla: har bir amalning natijasini keyingi katakka yoz. Oxiridagi son to'g'ri hisoblaganingni tekshiradi.",
  ru: 'Считай по цепочке слева направо: результат каждого действия пиши в следующую клетку. Последнее число проверяет, верно ли ты считал.',
  en: 'Work along the chain from left to right: write each result in the next box. The last number checks your work.'
};
const RULE_HIDE = {
  uz: " Kichik bo'sh kvadratdagi sonni ham top — buning uchun oxiridan orqaga hisobla.",
  ru: ' Найди и число в маленьком пустом квадратике — для этого считай от конца назад.',
  en: ' Also find the number in the small empty square — work backwards from the end.'
};

export default {
  id: 'chain',
  skills: ['counting', 'logic'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Misollar zanjiri', ru: 'Цепочки примеров', en: 'Number chains' },
  desc: {
    uz: "Har bir misolning javobi keyingisining boshlanishi; oxirgi son o'zini tekshiradi",
    ru: 'Ответ каждого примера — начало следующего; последнее число — самопроверка',
    en: 'Each answer starts the next sum; the last number lets you check yourself'
  },
  fileBase: { uz: 'Misollar zanjiri', ru: 'Цепочки примеров', en: 'Number chains' },
  defaultTitle: { uz: 'Zanjir bo\'ylab hisobla!', ru: 'Считай по цепочке!', en: 'Follow the chain!' },
  options: [{ key: 'level', type: 'level', default: 1 }],
  levelHint: {
    uz: ["+ va −, 20 gacha, 4 ta amal", "+, − va ×, 100 gacha, 5 ta amal", "To'rt amal, 100 gacha, 6 ta amal; bitta amalning soni yashirin", "To'rt amal, 200 gacha, 7 ta amal; yashirin son yoki boshlang'ich son"],
    ru: ['+ и −, до 20, 4 действия', '+, − и ×, до 100, 5 действий', 'Четыре действия, до 100, 6 действий; одно число действия скрыто', 'Четыре действия, до 200, 7 действий; скрыто число действия или начальное число'],
    en: ['+ and −, up to 20, 4 steps', '+, − and ×, up to 100, 5 steps', 'All four operations, up to 100, 6 steps; one operand hidden', 'All four operations, up to 200, 7 steps; hidden operand or starting number']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level];
    const rand = makeRng(seed);
    const k = opts.perPage === 4 ? 2 : opts.perPage === 2 ? 1 : 0;
    const steps = L.steps[k], n = L.rows[k];
    const prev = [], rows = [];
    for (let i = 0; i < n; i++) rows.push(buildRow(L, steps, rand, prev));
    return { level, seed, steps, rows };
  },

  info(p, lang) {
    const n = p.rows.length;
    return { uz: `${n} ta zanjir, ${p.steps} ta amal`, ru: `${n} ${ruPlural(n, 'цепочка', 'цепочки', 'цепочек')} по ${p.steps} ${ruPlural(p.steps, 'действию', 'действия', 'действий')}`, en: `${n} chains, ${p.steps} steps` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box);
    const hasHide = p.rows.some(r => r.hide);
    const rule = measureRule(ctx, (RULE[lang] || RULE.uz) + (hasHide ? (RULE_HIDE[lang] || RULE_HIDE.uz) : ''), box.w, scale);
    const gap = 5 * scale, n = p.rows.length, steps = p.steps;
    const numW = 6.5 * scale;
    const bw = Math.min((box.w - numW) / (steps + 1 + steps * 0.78), 15);
    const aw = bw * 0.78;
    const labH = bw * 0.62;
    const rowH = Math.min(bw + labH + gap * 1.8, (box.h - rule.h - gap) / n);
    const bh = Math.min(bw, rowH - labH - gap);
    const gridW = numW + (steps + 1) * bw + steps * aw;
    const gx = box.x + (box.w - gridW) / 2;
    const blockH = n * rowH;
    const gy = box.y + Math.max(0, (box.h - rule.h - gap - blockH) * 0.3);
    const lw = Math.max(0.3, 0.45 * scale);

    const num = (txt, cx, cy, size, color, weight = 800, maxW = Infinity) => {
      txt = String(txt).replace('-', MINUS);
      font(ctx, size, weight);
      const w = ctx.measureText(txt).width;
      if (w > maxW) font(ctx, size * maxW / w, weight);
      ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(txt, cx, cy);
    };

    p.rows.forEach((row, k) => {
      const y = gy + k * rowH + labH;
      font(ctx, Math.min(bh * 0.42, 4.6 * scale), 800);
      ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(`${k + 1}.`, gx, y + bh / 2);
      for (let i = 0; i <= steps; i++) {
        const x = gx + numW + i * (bw + aw);
        const isStart = i === 0, isEnd = i === steps;
        const given = (isStart && !(row.hide && row.hide.type === 'start')) || isEnd;
        roundRect(ctx, x, y, bw, bh, Math.min(bw, bh) * (isStart || isEnd ? 0.5 : 0.18));
        ctx.fillStyle = isEnd ? '#FEF3C7' : given ? '#EEF2FF' : '#fff'; ctx.fill();
        ctx.strokeStyle = given ? (isEnd ? '#F59E0B' : '#A5B4FC') : INK; ctx.lineWidth = lw; ctx.stroke();
        if (given) num(row.vals[i], x + bw / 2, y + bh / 2 + bh * 0.03, bh * 0.46, INK, 800, bw * 0.84);
        else if (showSolution) num(row.vals[i], x + bw / 2, y + bh / 2 + bh * 0.03, bh * 0.46, ANSWER, 700, bw * 0.84);
        if (i === steps) break;
        // Strelka va amal
        const ax = x + bw + aw * 0.12, bx = x + bw + aw * 0.88, ay = y + bh / 2;
        ctx.strokeStyle = MUTE; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, ay); ctx.stroke();
        ctx.fillStyle = MUTE; ctx.beginPath(); ctx.moveTo(bx + aw * 0.06, ay); ctx.lineTo(bx - aw * 0.14, ay - aw * 0.1); ctx.lineTo(bx - aw * 0.14, ay + aw * 0.1); ctx.closePath(); ctx.fill();
        const o = row.ops[i], lx = x + bw + aw / 2, ly = y - labH * 0.45;
        const sign = o.op === '-' ? MINUS : o.op;
        if (row.hide && row.hide.type === 'op' && row.hide.i === i) {
          const s = labH * 0.82;
          font(ctx, labH * 0.62, 800);
          const sw = ctx.measureText(sign).width;
          const tot = sw + 0.8 * scale + s, x0 = lx - tot / 2;
          ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(sign, x0, ly);
          roundRect(ctx, x0 + sw + 0.8 * scale, ly - s / 2, s, s, s * 0.18);
          ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.stroke();
          if (showSolution) num(o.v, x0 + sw + 0.8 * scale + s / 2, ly + s * 0.04, s * 0.6, ANSWER, 800, s * 0.9);
        } else num(sign + o.v, lx, ly, labH * 0.62, INK, 800, aw + bw * 0.4);
      }
    });
    drawRule(ctx, rule, box.x + box.w / 2, gy + blockH + gap * 0.3);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const n = p.rows.reduce((s, r) => s + r.ops.length - 1 + (r.hide ? 1 : 0), 0);
    const T = { uz: `Bo'sh kataklar: ${n} ta`, ru: `Пустых клеток: ${n}`, en: `Empty boxes: ${n}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const L = LEVELS[p.level];
    p.rows.forEach((row, k) => {
      if (row.ops.length !== p.steps) problems.push(`#${k}: steps`);
      row.ops.forEach((o, i) => { if (apply(row.vals[i], o.op, o.v) !== row.vals[i + 1]) problems.push(`#${k}: step ${i} wrong`); });
      if (row.vals.some(v => !Number.isInteger(v) || v < 0 || v > L.max)) problems.push(`#${k}: out of range`);
      if (!L.hide && row.hide) problems.push(`#${k}: unexpected hidden`);
      if (L.hide === 'op' && (!row.hide || row.hide.type !== 'op')) problems.push(`#${k}: operand must be hidden`);
      const s = solveRow(row);
      if (s.v.some((v, i) => v !== row.vals[i]) || s.opv.some((v, i) => v !== row.ops[i].v)) problems.push(`#${k}: not solvable`);
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-chain" aria-hidden="true"><defs><linearGradient id="cg-chain" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffecd2"/><stop offset="1" stop-color="#fcb69f"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-chain)"/><g stroke="#9a3412" stroke-width="3"><rect x="14" y="86" width="34" height="34" rx="17" fill="#EEF2FF"/><rect x="83" y="86" width="34" height="34" rx="6" fill="#fff"/><rect x="152" y="86" width="34" height="34" rx="17" fill="#FEF3C7"/></g><g stroke="#9a3412" stroke-width="3" fill="none" stroke-linecap="round"><path d="M52 103h26M70 96l8 7-8 7M121 103h26M139 96l8 7-8 7"/></g><g font-family="Nunito, sans-serif" font-weight="900" text-anchor="middle" fill="#9a3412"><text x="31" y="111" font-size="20">6</text><text x="169" y="111" font-size="20">15</text><text x="65" y="80" font-size="16">×2</text><text x="134" y="80" font-size="16">+3</text></g><text class="ch-a" x="100" y="111" font-family="Nunito, sans-serif" font-weight="900" font-size="20" text-anchor="middle" fill="#DC2626">12</text></svg>`
};
