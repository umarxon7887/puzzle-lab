// kenken.js — «KenKen» (Кенкен / KenKen) generatori.
// N×N to'rda har bir qator va ustunda 1 dan N gacha sonlar bir martadan. Qalin chiziq bilan ajratilgan guruh
// (qafas) burchagida natija va amal yozilgan: guruhdagi sonlar shu amal bilan shu natijani beradi
// (ayirish va bo'lishda — kattasidan kichigi). Bitta katakli guruhda son o'zi yozilgan.
// Kafolat (check()): yechuvchi barcha yechimlarni sanaydi — yechim aynan bitta.

import { makeRng, randInt, shuffle, pickOne } from '../core/rng.js';
import { INK, MUTE, ANSWER, font } from '../core/draw.js';
import { scaleOf, measureRule, drawRule, ruPlural } from '../core/parts.js';

const MUL = '×', DIV = '÷', MINUS = '−';
// n — o'lcham; ops — amallar; maxCage — guruhdagi eng ko'p katak; singles — bitta katakli guruhlar soni (eng ko'pi);
// count — [1 tadan, 2 tadan, 4 tadan] joylashganda nechta to'r
const LEVELS = [
  { n: 3, ops: ['+'], maxCage: 3, singles: 2, count: [4, 2, 1] },
  { n: 4, ops: ['+', '-'], maxCage: 3, singles: 2, count: [4, 2, 1] },
  { n: 5, ops: ['+', '-', MUL], maxCage: 3, singles: 2, count: [2, 1, 1] },
  { n: 6, ops: ['+', '-', MUL, DIV], maxCage: 4, singles: 3, count: [2, 1, 1] }
];

function latin(n, rand) {
  const base = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => (r + c) % n));
  const rows = shuffle(base, rand);
  const cols = shuffle(Array.from({ length: n }, (_, i) => i), rand);
  const sym = shuffle(Array.from({ length: n }, (_, i) => i + 1), rand);
  return rows.map(row => cols.map(c => sym[row[c]]));
}

function cages(n, L, rand) {
  const id = new Int16Array(n * n).fill(-1);
  const list = [];
  for (const start of shuffle(Array.from({ length: n * n }, (_, i) => i), rand)) {
    if (id[start] >= 0) continue;
    const want = randInt(rand, 1, L.maxCage);
    const cells = [start]; id[start] = list.length;
    while (cells.length < want) {
      const nb = [];
      for (const k of cells) { const r = Math.floor(k / n), c = k % n; for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < n && cc >= 0 && cc < n && id[rr * n + cc] < 0) nb.push(rr * n + cc); } }
      if (!nb.length) break;
      const k = pickOne(rand, nb); id[k] = list.length; cells.push(k);
    }
    list.push(cells);
  }
  return list;
}

const evalCage = (op, vals) => {
  if (op === '=') return vals[0];
  if (op === '+') return vals.reduce((a, b) => a + b, 0);
  if (op === MUL) return vals.reduce((a, b) => a * b, 1);
  const [a, b] = vals; const hi = Math.max(a, b), lo = Math.min(a, b);
  if (op === '-') return hi - lo;
  return hi % lo === 0 ? hi / lo : null;
};

// Yechimlar soni (limit gacha)
export function countKenken(n, cg, limit = 2) {
  const cageOf = new Int16Array(n * n);
  cg.forEach((c, i) => c.cells.forEach(k => { cageOf[k] = i; }));
  const g = new Int8Array(n * n);
  const rowU = new Int16Array(n), colU = new Int16Array(n);
  let count = 0, nodes = 0;
  // Qafas hali to'lmagan bo'lsa, natijaga yetish mumkinmi (qisman tekshiruv)
  const ok = i => {
    const c = cg[i], vals = c.cells.map(k => g[k]).filter(v => v > 0);
    if (vals.length < c.cells.length) {
      if (c.op === '+') return vals.reduce((a, b) => a + b, 0) + (c.cells.length - vals.length) <= c.target;
      if (c.op === MUL) { const p = vals.reduce((a, b) => a * b, 1); return c.target % p === 0; }
      return true;
    }
    return evalCage(c.op, vals) === c.target;
  };
  const rec = k => {
    if (count >= limit || ++nodes > 400000) return;
    if (k === n * n) { count++; return; }
    const r = Math.floor(k / n), c = k % n;
    for (let v = 1; v <= n; v++) {
      if (rowU[r] >> v & 1 || colU[c] >> v & 1) continue;
      g[k] = v; rowU[r] |= 1 << v; colU[c] |= 1 << v;
      if (ok(cageOf[k])) rec(k + 1);
      g[k] = 0; rowU[r] &= ~(1 << v); colU[c] &= ~(1 << v);
      if (count >= limit) break;
    }
  };
  rec(0);
  return nodes > 400000 ? limit : count;
}

function build(L, rand) {
  const n = L.n;
  for (let attempt = 0; attempt < 3000; attempt++) {
    const sq = latin(n, rand), flat = sq.flat();
    const parts = cages(n, L, rand);
    if (parts.filter(c => c.length === 1).length > L.singles) continue;
    const cg = [];
    let bad = false;
    for (const cells of parts) {
      const vals = cells.map(k => flat[k]);
      if (cells.length === 1) { cg.push({ cells, op: '=', target: vals[0] }); continue; }
      const can = L.ops.filter(op => (op === '-' || op === DIV) ? cells.length === 2 && evalCage(op, vals) !== null && evalCage(op, vals) > 0 : true);
      // bo'lish va ayirishni ko'proq ishlatamiz (ular qiziqroq), lekin hammasi bo'lsin
      const op = pickOne(rand, can.length ? can : ['+']);
      const target = evalCage(op, vals);
      if (target === null) { bad = true; break; }
      cg.push({ cells, op, target });
    }
    if (bad) continue;
    if (L.ops.length > 1 && new Set(cg.filter(c => c.op !== '=').map(c => c.op)).size < Math.min(2, L.ops.length)) continue;
    if (countKenken(n, cg, 2) !== 1) continue;
    return { sq: flat, cages: cg };
  }
  throw new Error('kenken: no puzzle');
}

const RULE = {
  uz: (n, ops) => `Har bir qator va har bir ustunda 1 dan ${n} gacha sonlar bir martadan uchraydi. Qalin chiziqli guruhdagi sonlar burchakda ko'rsatilgan amal bilan shu natijani beradi${ops ? " (ayirish va bo'lishda kattasidan kichigi)" : ''}. Bitta katakli guruhga son o'zi yoziladi.`,
  ru: (n, ops) => `В каждой строке и каждом столбце числа от 1 до ${n} встречаются по одному разу. Числа в группе с толстой рамкой дают указанный в углу результат с указанным действием${ops ? ' (при вычитании и делении — из большего меньшее)' : ''}. В группу из одной клетки пишется само число.`,
  en: (n, ops) => `Every row and every column has the numbers 1 to ${n} once each. The numbers in each thick-outlined group give the result in its corner using the shown operation${ops ? ' (subtract or divide the smaller from the bigger)' : ''}. A one-cell group just gets that number.`
};

export default {
  id: 'kenken',
  skills: ['logic', 'counting'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'KenKen', ru: 'Кенкен', en: 'KenKen' },
  desc: {
    uz: "Lotin kvadrati va guruhlardagi amal natijasi: har qator va ustunda sonlar bir martadan",
    ru: 'Латинский квадрат с действиями в группах: в каждой строке и столбце числа по одному разу',
    en: 'A Latin square with sums and products in outlined groups'
  },
  fileBase: { uz: 'KenKen', ru: 'Кенкен', en: 'KenKen' },
  defaultTitle: { uz: 'Guruhlarni hisobla!', ru: 'Посчитай группы!', en: 'Solve the cages!' },
  options: [{ key: 'level', type: 'level', default: 1 }],
  levelHint: {
    uz: ["3×3, faqat qo'shish", "4×4, qo'shish va ayirish", "5×5, qo'shish, ayirish, ko'paytirish", "6×6, to'rt amal"],
    ru: ['3×3, только сложение', '4×4, сложение и вычитание', '5×5, сложение, вычитание, умножение', '6×6, все четыре действия'],
    en: ['3×3, addition only', '4×4, adding and subtracting', '5×5, add, subtract, multiply', '6×6, all four operations']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level];
    const rand = makeRng(seed);
    const count = L.count[opts.perPage === 4 ? 2 : opts.perPage === 2 ? 1 : 0];
    const items = [];
    for (let k = 0; k < count; k++) items.push(build(L, rand));
    return { level, seed, n: L.n, items };
  },

  info(p, lang) {
    const c = p.items.length;
    return { uz: `${c} ta to'r, ${p.n}×${p.n}`, ru: `${c} ${ruPlural(c, 'сетка', 'сетки', 'сеток')} ${p.n}×${p.n}`, en: `${c} grid${c > 1 ? 's' : ''}, ${p.n}×${p.n}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box), n = p.n;
    const hasSubDiv = p.level >= 1;
    const rule = measureRule(ctx, (RULE[lang] || RULE.uz)(n, hasSubDiv), box.w, scale);
    const gap = 8 * scale, cnt = p.items.length;
    const H = box.h - rule.h - gap;
    let best = null;
    for (let cols = 1; cols <= Math.min(2, cnt); cols++) {
      const rows = Math.ceil(cnt / cols);
      const cs = Math.min((box.w - (cols - 1) * gap * 2) / (cols * n), (H - (rows - 1) * gap) / (rows * n), 24);
      const score = cs * (cols === 1 && cnt > 2 ? 0.85 : 1);
      if (!best || score > best.score + 0.01) best = { cols, rows, cs, score };
    }
    const { cols, rows, cs } = best, side = n * cs;
    const gridW = cols * side + (cols - 1) * gap * 2, gridH = rows * side + (rows - 1) * gap;
    const gx = box.x + (box.w - gridW) / 2, gy = box.y + Math.max(0, (H - gridH) * 0.35);
    p.items.forEach((it, idx) => {
      const ox = gx + (idx % cols) * (side + gap * 2), oy = gy + Math.floor(idx / cols) * (side + gap);
      const cageOf = new Int16Array(n * n);
      it.cages.forEach((c, i) => c.cells.forEach(k => { cageOf[k] = i; }));
      // ingichka chiziqlar
      ctx.strokeStyle = '#9CA3AF'; ctx.lineWidth = Math.max(0.2, cs * 0.012);
      ctx.beginPath();
      for (let j = 1; j < n; j++) { ctx.moveTo(ox + j * cs, oy); ctx.lineTo(ox + j * cs, oy + side); ctx.moveTo(ox, oy + j * cs); ctx.lineTo(ox + side, oy + j * cs); }
      ctx.stroke();
      // qalin chegaralar (guruhlar orasida)
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.6, cs * 0.05); ctx.lineCap = 'round';
      ctx.beginPath();
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        const k = r * n + c;
        if (c < n - 1 && cageOf[k] !== cageOf[k + 1]) { ctx.moveTo(ox + (c + 1) * cs, oy + r * cs); ctx.lineTo(ox + (c + 1) * cs, oy + (r + 1) * cs); }
        if (r < n - 1 && cageOf[k] !== cageOf[k + n]) { ctx.moveTo(ox + c * cs, oy + (r + 1) * cs); ctx.lineTo(ox + (c + 1) * cs, oy + (r + 1) * cs); }
      }
      ctx.stroke();
      ctx.lineWidth = Math.max(0.8, cs * 0.06); ctx.strokeRect(ox, oy, side, side);
      // guruh yozuvi — eng yuqori-chap katakda
      it.cages.forEach(c => {
        const k = Math.min(...c.cells), r = Math.floor(k / n), cc = k % n;
        const txt = c.op === '=' ? String(c.target) : `${c.target}${c.op === '-' ? MINUS : c.op}`;
        font(ctx, cs * 0.24, 800); ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(txt, ox + cc * cs + cs * 0.07, oy + r * cs + cs * 0.06);
      });
      if (showSolution) it.sq.forEach((v, k) => {
        font(ctx, cs * 0.5, 700); ctx.fillStyle = ANSWER; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(v), ox + (k % n) * cs + cs / 2, oy + Math.floor(k / n) * cs + cs * 0.58);
      });
    });
    drawRule(ctx, rule, box.x + box.w / 2, gy + gridH + gap);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const n = p.items.length * p.n * p.n;
    const T = { uz: `To'ldiriladigan kataklar: ${n} ta`, ru: `Клеток заполнить: ${n}`, en: `Cells to fill: ${n}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const n = p.n, L = LEVELS[p.level];
    p.items.forEach((it, i) => {
      for (let r = 0; r < n; r++) { const row = it.sq.slice(r * n, r * n + n), col = it.sq.filter((_, k) => k % n === r); if (new Set(row).size !== n || new Set(col).size !== n) problems.push(`#${i}: not latin`); }
      const covered = new Set();
      for (const c of it.cages) {
        c.cells.forEach(k => covered.add(k));
        const v = evalCage(c.op, c.cells.map(k => it.sq[k]));
        if (v !== c.target) problems.push(`#${i}: cage result`);
        if (c.op !== '=' && !L.ops.includes(c.op)) problems.push(`#${i}: op not allowed`);
        if (c.cells.length > L.maxCage) problems.push(`#${i}: cage too big`);
      }
      if (covered.size !== n * n) problems.push(`#${i}: cages do not cover`);
      if (countKenken(n, it.cages, 2) !== 1) problems.push(`#${i}: not unique`);
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-kenken" aria-hidden="true"><defs><linearGradient id="cg-kenken" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbc2eb"/><stop offset="1" stop-color="#a6c1ee"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-kenken)"/><rect x="34" y="34" width="132" height="132" fill="#fff"/><path d="M78 34v132M122 34v132M34 78h132M34 122h132" stroke="#9CA3AF" stroke-width="2"/><path d="M34 34h132v132H34z M78 34v44 M34 78h44 M122 78v88 M78 122h44 M122 78h44" fill="none" stroke="#111827" stroke-width="5" stroke-linejoin="round"/><g font-family="Nunito, sans-serif" font-weight="900" font-size="15" fill="#111827"><text x="40" y="50">3</text><text x="84" y="50">5+</text><text x="40" y="94">4+</text><text x="128" y="94">2−</text></g><g font-family="Nunito, sans-serif" font-weight="900" font-size="24" text-anchor="middle" fill="#DC2626"><text class="kn-a" x="56" y="66">3</text><text class="kn-b" x="100" y="66">1</text><text class="kn-c" x="144" y="66">2</text></g></svg>`
};
