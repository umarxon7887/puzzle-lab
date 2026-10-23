// matches.js — «Gugurt cho'plari» (Спички / Matchsticks) generatori. v2.8
// Gugurt cho'plaridan terilgan noto'g'ri tenglik. Topshiriq turlari: bitta cho'pni ko'chirish (move), bitta cho'pni
// olib tashlash (remove), ikkita cho'pni ko'chirish (move2). Har bir tenglik ustida nima qilish kerakligi yoziladi.
// Raqamlar 7 bo'lakli (soatdagidek), amallar: «+» (2 cho'p), «−» (1), «=» (2).
// Kafolat (check()): shu amal bilan hosil bo'ladigan BARCHA to'g'ri tengliklar sanaladi — aynan bitta bo'lishi
// shart; ikki cho'pli topshiriqni bitta cho'p bilan yechib bo'lmaydi. «05» va «=» siz yozuvlar tenglik emas.
// Qolip: «Mantiqiy masalalar» guruhi (ro'yxatdagi reja), klassik gugurt jumboqlari.

import { makeRng, randInt, pickOne, shuffle } from '../core/rng.js';
import { INK, MUTE, ANSWER, PT, font, roundRect } from '../core/draw.js';
import { scaleOf, measureRule, drawRule, ruPlural } from '../core/parts.js';

// terms — qo'shiluvchilar soni; big — ikki xonali sonlar; digitsOnly — javobda faqat raqam cho'plari ko'chadi;
// formB — «c = a + b» ko'rinishi ham bo'ladi; count — [1 tadan, 2 tadan, 4 tadan]
// kinds — topshiriq turlari navbati
const LEVELS = [
  { terms: 2, big: false, digitsOnly: true, formB: false, kinds: ['move'], count: [6, 3, 2] },
  { terms: 2, big: false, digitsOnly: false, formB: false, kinds: ['move', 'remove', 'move'], count: [6, 3, 2] },
  { terms: 2, big: true, digitsOnly: false, formB: true, kinds: ['move', 'remove'], count: [6, 3, 2] },
  { terms: 3, big: true, digitsOnly: false, formB: true, kinds: ['move', 'move2'], count: [5, 3, 2] }
];
const SMALL = { terms: 2, big: false, digitsOnly: false, formB: false };

// 7 bo'lak: a (tepa), b (o'ng-tepa), c (o'ng-past), d (past), e (chap-past), f (chap-tepa), g (o'rta)
const SEG = 'abcdefg';
const DIG = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg']
  .map(s => [...s].reduce((m, ch) => m | 1 << SEG.indexOf(ch), 0));
const M2D = new Map(DIG.map((m, d) => [m, d]));
const OP_POS = { '+': ['m', 'v'], '-': ['m'], '=': ['u', 'l'] };

const digitSlot = d => ({ t: 'd', m: DIG[d] });
const opSlot = s => ({ t: 'o', s });
const slotText = s => (s.t === 'd' ? String(M2D.get(s.m)) : s.s === '-' ? '−' : s.s);
export const eqText = slots => slots.map(slotText).join('').replace(/([+−=])/g, ' $1 ');

// Tenglik: null — yozuv noto'g'ri tuzilgan; true/false — to'g'ri yoki noto'g'ri
export function evaluate(slots) {
  const groups = [], ops = [];
  let cur = [];
  for (const s of slots) {
    if (s.t === 'd') { const d = M2D.get(s.m); if (d === undefined) return null; cur.push(d); }
    else { if (!cur.length) return null; groups.push(cur); cur = []; ops.push(s.s); }
  }
  if (!cur.length) return null;
  groups.push(cur);
  if (ops.filter(o => o === '=').length !== 1) return null;
  if (groups.some(g => g.length > 1 && g[0] === 0)) return null;
  const nums = groups.map(g => g.reduce((v, d) => v * 10 + d, 0));
  const eq = ops.indexOf('=');
  const side = (from, to) => { let v = nums[from]; for (let k = from; k < to; k++) v = ops[k] === '+' ? v + nums[k + 1] : v - nums[k + 1]; return v; };
  return side(0, eq) === side(eq + 1, ops.length);
}

// Bitta katakdan cho'p olish / qo'shish / katak ichida ko'chirish
function removals(s) {
  if (s.t === 'o') return s.s === '+' ? [{ st: opSlot('-'), pos: 'v' }] : s.s === '=' ? [{ st: opSlot('-'), pos: 'u' }] : [];
  const out = [];
  for (let i = 0; i < 7; i++) if (s.m >> i & 1) { const m = s.m & ~(1 << i); if (M2D.has(m)) out.push({ st: { t: 'd', m }, pos: i }); }
  return out;
}
function additions(s) {
  if (s.t === 'o') return s.s === '-' ? [{ st: opSlot('+'), pos: 'v' }, { st: opSlot('='), pos: 'u' }] : [];
  const out = [];
  for (let i = 0; i < 7; i++) if (!(s.m >> i & 1)) { const m = s.m | 1 << i; if (M2D.has(m)) out.push({ st: { t: 'd', m }, pos: i }); }
  return out;
}
function inside(s) {
  if (s.t === 'o') return s.s === '+' ? [{ st: opSlot('='), from: 'v', to: 'u' }] : s.s === '=' ? [{ st: opSlot('+'), from: 'u', to: 'v' }] : [];
  const out = [];
  for (let i = 0; i < 7; i++) if (s.m >> i & 1) for (let j = 0; j < 7; j++) if (!(s.m >> j & 1)) {
    const m = s.m ^ 1 << i ^ 1 << j;
    if (M2D.has(m)) out.push({ st: { t: 'd', m }, from: i, to: j });
  }
  return out;
}
export function moves(slots) {
  const out = [];
  slots.forEach((s, i) => {
    for (const r of removals(s)) slots.forEach((s2, j) => {
      if (j === i) return;
      for (const a of additions(s2)) { const ns = slots.slice(); ns[i] = r.st; ns[j] = a.st; out.push({ ns, from: i, fromPos: r.pos, to: j, toPos: a.pos }); }
    });
    for (const w of inside(s)) { const ns = slots.slice(); ns[i] = w.st; out.push({ ns, from: i, fromPos: w.from, to: i, toPos: w.to }); }
  });
  return out;
}
// Noto'g'ri tenglikdan bitta ko'chirish bilan hosil bo'ladigan barcha to'g'ri tengliklar (matn bo'yicha takrorsiz)
export function fixes(slots) {
  const seen = new Map();
  for (const mv of moves(slots)) if (evaluate(mv.ns) === true) { const k = eqText(mv.ns); if (!seen.has(k)) seen.set(k, mv); }
  return [...seen.values()];
}

// Bitta cho'pni olib tashlash bilan hosil bo'ladigan to'g'ri tengliklar
export function removeFixes(slots) {
  const seen = new Map();
  slots.forEach((s, i) => { for (const r of removals(s)) { const ns = slots.slice(); ns[i] = r.st; if (evaluate(ns) === true) seen.set(eqText(ns), ns); } });
  return [...seen.values()];
}
// Ikkita cho'pni ko'chirish bilan hosil bo'ladigan to'g'ri tengliklar
export function fixes2(slots) {
  const seen = new Map();
  for (const m1 of moves(slots)) for (const m2 of moves(m1.ns)) if (evaluate(m2.ns) === true) seen.set(eqText(m2.ns), m2.ns);
  return [...seen.values()];
}

function numberSlots(n) { return String(n).split('').map(ch => digitSlot(+ch)); }
function randomEquation(L, rand) {
  for (;;) {
    const ops = Array.from({ length: L.terms - 1 }, () => pickOne(rand, ['+', '-']));
    const hi = L.big ? 99 : 9;
    const nums = Array.from({ length: L.terms }, () => (L.big && rand() < 0.45 ? randInt(rand, 10, 40) : randInt(rand, L.big ? 1 : 0, 9)));
    let res = nums[0];
    ops.forEach((o, k) => { res = o === '+' ? res + nums[k + 1] : res - nums[k + 1]; });
    if (res < 0 || res > hi) continue;
    const all = [...nums, res];
    if (L.big && !all.some(v => v >= 10)) continue;
    if (all.filter(v => v >= 10).length > (L.terms === 3 ? 2 : 3)) continue;
    const left = [];
    nums.forEach((v, k) => { if (k) left.push(opSlot(ops[k - 1])); left.push(...numberSlots(v)); });
    const right = numberSlots(res);
    return L.formB && rand() < 0.35 ? [...right, opSlot('='), ...left] : [...left, opSlot('='), ...right];
  }
}

function buildRemove(L, rand, used) {
  for (let attempt = 0; attempt < 400; attempt++) {
    const sol = randomEquation(L, rand);
    const adds = [];
    sol.forEach((s, i) => { for (const a of additions(s)) { const ns = sol.slice(); ns[i] = a.st; adds.push(ns); } });
    for (const ns of shuffle(adds, rand)) {
      if (evaluate(ns) !== false || used.has(eqText(ns))) continue;
      const fx = removeFixes(ns);
      if (fx.length !== 1 || eqText(fx[0]) !== eqText(sol)) continue;
      used.add(eqText(ns));
      return { kind: 'remove', puz: ns, sol };
    }
  }
  throw new Error('matches: no remove puzzle');
}
function buildMove2(rand, used) {
  for (let attempt = 0; attempt < 400; attempt++) {
    const sol = randomEquation(SMALL, rand);
    const m1 = pickOne(rand, moves(sol)), m2 = m1 && pickOne(rand, moves(m1.ns));
    if (!m2 || evaluate(m2.ns) !== false || used.has(eqText(m2.ns))) continue;
    if (fixes(m2.ns).length) continue;                       // bitta cho'p bilan yechilmasin
    const fx = fixes2(m2.ns);
    if (fx.length !== 1 || eqText(fx[0]) !== eqText(sol)) continue;
    used.add(eqText(m2.ns));
    return { kind: 'move2', puz: m2.ns, sol };
  }
  throw new Error('matches: no move2 puzzle');
}

function build(L, rand, used, kind = 'move') {
  if (kind === 'remove') return buildRemove(L, rand, used);
  if (kind === 'move2') return buildMove2(rand, used);
  for (let attempt = 0; attempt < 300; attempt++) {
    const sol = randomEquation(L, rand);
    let ms = shuffle(moves(sol).filter(m => !L.digitsOnly || (sol[m.from].t === 'd' && sol[m.to].t === 'd')), rand);
    // ko'pincha bir katakdan boshqasiga ko'chadigan cho'p (bir raqam ichida ko'chishi kamroq bo'lsin)
    if (rand() < 0.65) ms = [...ms.filter(m => m.from !== m.to), ...ms.filter(m => m.from === m.to)];
    for (const m of ms.slice(0, 40)) {
      if (evaluate(m.ns) !== false) continue;
      const k = eqText(m.ns);
      if (used.has(k)) continue;
      const fx = fixes(m.ns);
      if (fx.length !== 1 || eqText(fx[0].ns) !== eqText(sol)) continue;
      used.add(k);
      // javob: m.ns dan sol ga — m.to katakdagi cho'p m.from katakka qaytadi
      return { kind: 'move', puz: m.ns, sol };
    }
  }
  throw new Error('matches: no puzzle');
}

const RULE = {
  uz: "Har bir tenglik noto'g'ri. Faqat bitta cho'pni boshqa joyga ko'chirib, tenglikni to'g'ri qil. Cho'pni olib tashlash yoki yangisini qo'shish mumkin emas. To'g'ri tenglikni pastdagi chiziqqa yoz.",
  ru: 'Каждое равенство неверное. Переложи только одну спичку, чтобы равенство стало верным. Убирать спички или добавлять новые нельзя. Запиши верное равенство на линии под ним.',
  en: 'Each equation is wrong. Move just one matchstick to make it right. You may not take sticks away or add new ones. Write the correct equation on the line below.'
};
const RULE_MIX = {
  uz: "Har bir tenglik noto'g'ri. Uning ustida nima qilish kerakligi yozilgan: cho'pni ko'chirish yoki olib tashlash. Yangi cho'p qo'shish mumkin emas. To'g'ri tenglikni pastdagi chiziqqa yoz.",
  ru: 'Каждое равенство неверное. Над ним написано, что сделать: переложить или убрать спички. Добавлять новые спички нельзя. Запиши верное равенство на линии под ним.',
  en: 'Each equation is wrong. Above it you can see what to do: move or remove sticks. You may not add new sticks. Write the correct equation on the line below.'
};
const TAG = {
  move: { uz: "1 ta cho'pni ko'chir", ru: 'Переложи 1 спичку', en: 'Move 1 stick' },
  remove: { uz: "1 ta cho'pni olib tashla", ru: 'Убери 1 спичку', en: 'Remove 1 stick' },
  move2: { uz: "2 ta cho'pni ko'chir", ru: 'Переложи 2 спички', en: 'Move 2 sticks' }
};
const LEGEND = { uz: 'Raqamlar:', ru: 'Цифры:', en: 'Digits:' };

// Bitta cho'p: kind — 'n' oddiy, 'add' qo'yilgan (qizil), 'ghost' olingan joyi (qizil uzuq chiziq)
function stick(ctx, x1, y1, x2, y2, t, kind = 'n') {
  const len = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1);
  const inset = t * 0.42, L = len - 2 * inset;
  ctx.save(); ctx.translate(x1, y1); ctx.rotate(ang);
  ctx.beginPath(); roundRect(ctx, inset, -t / 2, L, t, t * 0.3);
  if (kind === 'ghost') {
    ctx.fillStyle = '#FEF2F2'; ctx.fill();
    ctx.setLineDash([t * 0.5, t * 0.35]); ctx.strokeStyle = ANSWER; ctx.lineWidth = Math.max(0.25, t * 0.22); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore(); return;
  }
  ctx.fillStyle = kind === 'add' ? '#FECACA' : '#F7DCA8'; ctx.fill();
  ctx.strokeStyle = kind === 'add' ? ANSWER : '#92400E'; ctx.lineWidth = Math.max(0.15, t * 0.13); ctx.stroke();
  ctx.save(); ctx.translate(inset + t * 0.78, 0); ctx.scale(1.4, 1);
  ctx.beginPath(); ctx.arc(0, 0, t * 0.6, 0, Math.PI * 2); ctx.restore();
  ctx.fillStyle = kind === 'add' ? ANSWER : '#7C2D12'; ctx.fill();
  ctx.restore();
}
const segLine = (i, x, y, W) => [
  [x, y, x + W, y], [x + W, y, x + W, y + W], [x + W, y + W, x + W, y + 2 * W], [x, y + 2 * W, x + W, y + 2 * W],
  [x, y + W, x, y + 2 * W], [x, y, x, y + W], [x, y + W, x + W, y + W]][i];
function opLine(pos, x, y, W) {
  const ow = W * 0.92, cx = x + ow / 2, cy = y + W;
  return { m: [x, cy, x + ow, cy], v: [cx, cy - ow / 2, cx, cy + ow / 2], u: [x, cy - W * 0.24, x + ow, cy - W * 0.24], l: [x, cy + W * 0.24, x + ow, cy + W * 0.24] }[pos];
}
const SLOT_W = { d: 1, o: 0.92 }, SLOT_GAP = 0.5;
const eqUnits = slots => slots.reduce((s, sl) => s + SLOT_W[sl.t], 0) + SLOT_GAP * (slots.length - 1);

// Javob uchun farq: har katakda olingan (ghost) va qo'yilgan (add) cho'plar o'rni
const OP_DIFF = {
  '+-': { ghost: ['v'], add: [] }, '-+': { ghost: [], add: ['v'] }, '=-': { ghost: ['u'], add: [] }, '-=': { ghost: [], add: ['u'] },
  '+=': { ghost: ['v'], add: ['u'] }, '=+': { ghost: ['u'], add: ['v'] }
};
export function diffSlots(puz, sol) {
  return sol.map((s, i) => {
    const p = puz[i];
    if (s.t === 'd') return { ghost: [0, 1, 2, 3, 4, 5, 6].filter(k => (p.m >> k & 1) && !(s.m >> k & 1)), add: [0, 1, 2, 3, 4, 5, 6].filter(k => !(p.m >> k & 1) && (s.m >> k & 1)) };
    return p.s === s.s ? { ghost: [], add: [] } : OP_DIFF[p.s + s.s];
  });
}
// Tenglikni chizish. diff — javob: diffSlots() natijasi
function drawEq(ctx, slots, x, y, W, diff) {
  const t = W * 0.15;
  let cx = x;
  slots.forEach((s, i) => {
    const d = diff ? diff[i] : { ghost: [], add: [] };
    if (s.t === 'd') {
      for (let k = 0; k < 7; k++) if (s.m >> k & 1) stick(ctx, ...segLine(k, cx, y, W), t, d.add.includes(k) ? 'add' : 'n');
      d.ghost.forEach(k => stick(ctx, ...segLine(k, cx, y, W), t, 'ghost'));
    } else {
      for (const pos of OP_POS[s.s]) stick(ctx, ...opLine(pos, cx, y, W), t, d.add.includes(pos) ? 'add' : 'n');
      d.ghost.forEach(pos => stick(ctx, ...opLine(pos, cx, y, W), t, 'ghost'));
    }
    cx += (SLOT_W[s.t] + SLOT_GAP) * W;
  });
}

export default {
  id: 'matches',
  skills: ['logic', 'counting', 'spatial'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: "Gugurt cho'plari", ru: 'Спички', en: 'Matchsticks' },
  desc: {
    uz: "Cho'pni ko'chirib yoki olib tashlab, noto'g'ri tenglikni to'g'rila",
    ru: 'Переложи или убери спичку и исправь неверное равенство',
    en: 'Move or remove matchsticks to fix the wrong equation'
  },
  fileBase: { uz: "Gugurt cho'plari", ru: 'Спички', en: 'Matchsticks' },
  defaultTitle: { uz: "Tenglikni to'g'rila!", ru: 'Исправь равенство!', en: 'Fix the equation!' },
  options: [{ key: 'level', type: 'level', default: 1 }],
  levelHint: {
    uz: ["Bir xonali sonlar, faqat raqamlar o'zgaradi", "Amal belgisi ham o'zgaradi, bitta cho'pni olib tashlash ham bor", "Ikki xonali sonlar, «=» ham ko'chishi mumkin", "Uchta son, ikkita cho'pni ko'chirish"],
    ru: ['Однозначные числа, меняются только цифры', 'Может меняться знак, есть «убери спичку»', 'Двузначные числа, может сдвинуться и «=»', 'Три числа, «переложи две спички»'],
    en: ['One-digit numbers, only digits change', 'Signs may change, some ask to remove a stick', 'Two-digit numbers, «=» may move too', 'Three numbers, move two sticks']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level];
    const rand = makeRng(seed);
    const count = L.count[opts.perPage === 4 ? 2 : opts.perPage === 2 ? 1 : 0];
    const used = new Set(), items = [];
    const kinds = shuffle(Array.from({ length: count }, (_, k) => L.kinds[k % L.kinds.length]), rand);
    for (const kind of kinds) items.push(build(L, rand, used, kind));
    return { level, seed, items };
  },

  info(p, lang) {
    const c = p.items.length;
    return { uz: `${c} ta tenglik`, ru: `${c} ${ruPlural(c, 'равенство', 'равенства', 'равенств')}`, en: `${c} equation${c > 1 ? 's' : ''}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box), n = p.items.length;
    const mixed = p.items.some(it => it.kind && it.kind !== 'move');
    const RT = mixed ? RULE_MIX : RULE;
    const rule = measureRule(ctx, RT[lang] || RT.uz, box.w, scale);
    const tagH = mixed ? 5.6 * scale : 0;
    // raqamlar namunasi (0–9)
    const lw = 3.4 * scale, lgFs = 10 * PT * scale;
    font(ctx, lgFs, 700);
    const lgLabel = LEGEND[lang] || LEGEND.uz, lgLabelW = ctx.measureText(lgLabel).width + 2.5 * scale;
    const lgW = lgLabelW + 10 * lw + 9 * lw * 0.75, lgH = 2 * lw;
    const gap = 6 * scale, numW = 7.5 * scale, lineH = 7.5 * scale;
    const H = box.h - rule.h - lgH - gap * 1.6;
    const units = Math.max(...p.items.map(it => eqUnits(it.puz)));
    let best = null;
    for (let cols = 1; cols <= Math.min(2, n); cols++) {
      const rows = Math.ceil(n / cols);
      const colW = (box.w - (cols - 1) * gap * 1.5) / cols;
      const W = Math.min((colW - numW) / units, (H / rows - lineH - tagH - gap * 1.2) / 2.3, 11 * scale);
      if (!best || W > best.W + 0.05) best = { cols, rows, colW, W };
    }
    const { cols, rows, colW, W } = best;
    const rowH = Math.max(2.3 * W + lineH + tagH + gap * 1.2, Math.min(H / rows, (2.3 * W + lineH + tagH + gap * 1.2) * 1.35));
    const eqW = units * W + numW;
    const blockH = rows * rowH;
    const gy = box.y + Math.max(0, (H - blockH) * 0.35);
    p.items.forEach((it, k) => {
      const col = k % cols, row = Math.floor(k / cols);
      const x0 = box.x + col * (colW + gap * 1.5) + (colW - eqW) / 2, y = gy + row * rowH + 0.15 * W + tagH;
      if (mixed) {
        font(ctx, Math.min(tagH * 0.55, 3.2 * scale), 800); ctx.fillStyle = '#4338CA'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.fillText((TAG[it.kind || 'move'][lang] || TAG.move.uz), x0 + numW, y - 0.2 * W - 1.2 * scale);
      }
      if (n > 1) {
        font(ctx, Math.min(W * 0.55, 4.6 * scale), 800); ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(`${k + 1}.`, x0, y + W);
      }
      const ex = x0 + numW + (units - eqUnits(it.puz)) * W / 2;
      if (showSolution) drawEq(ctx, it.sol, ex, y, W, diffSlots(it.puz, it.sol));
      else drawEq(ctx, it.puz, ex, y, W, null);
      // javob chizig'i
      const ly = y + 2 * W + 0.2 * W + lineH;
      ctx.strokeStyle = '#9CA3AF'; ctx.lineWidth = Math.max(0.2, 0.3 * scale);
      ctx.beginPath(); ctx.moveTo(x0 + numW, ly); ctx.lineTo(x0 + eqW, ly); ctx.stroke();
      if (showSolution) {
        font(ctx, Math.min(lineH * 0.7, 5 * scale), 800); ctx.fillStyle = ANSWER; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(eqText(it.sol), x0 + numW + units * W / 2, ly - 1 * scale);
      }
    });
    const ry = gy + blockH + gap * 0.3;
    drawRule(ctx, rule, box.x + box.w / 2, ry);
    // raqamlar namunasi
    const lx = box.x + (box.w - lgW) / 2, ly = ry + rule.h + gap * 0.8;
    font(ctx, lgFs, 700); ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(lgLabel, lx, ly + lw);
    for (let d = 0; d < 10; d++) drawEq(ctx, [digitSlot(d)], lx + lgLabelW + d * lw * 1.75, ly, lw, null);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const n = p.items.length;
    const T = { uz: `Tengliklar: ${n} ta, har birida bitta cho'p ko'chadi`, ru: `Равенств: ${n}, в каждом перекладывается одна спичка`, en: `Equations: ${n}, one stick moves in each` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const L = LEVELS[p.level];
    const sticks = sl => sl.reduce((s, x) => s + (x.t === 'd' ? [...Array(7).keys()].filter(k => x.m >> k & 1).length : OP_POS[x.s].length), 0);
    p.items.forEach((it, i) => {
      const kind = it.kind || 'move';
      if (evaluate(it.puz) !== false) problems.push(`#${i}: puzzle is not a wrong equation`);
      if (evaluate(it.sol) !== true) problems.push(`#${i}: solution is not true`);
      let fx;
      if (kind === 'remove') fx = removeFixes(it.puz);
      else if (kind === 'move2') {
        if (fixes(it.puz).length) problems.push(`#${i}: move2 solvable with one stick`);
        fx = fixes2(it.puz);
      } else fx = fixes(it.puz).map(m => m.ns);
      if (fx.length !== 1 || eqText(fx[0]) !== eqText(it.sol)) problems.push(`#${i}: ${fx.length} fixes`);
      const dS = sticks(it.puz) - sticks(it.sol);
      if (dS !== (kind === 'remove' ? 1 : 0)) problems.push(`#${i}: stick count differs`);
      const d = diffSlots(it.puz, it.sol);
      if (L.digitsOnly && it.sol.some((s, j) => s.t === 'o' && (d[j].ghost.length || d[j].add.length))) problems.push(`#${i}: operator moved`);
      if (!L.kinds.includes(kind)) problems.push(`#${i}: kind ${kind} not in level`);
    });
    if (new Set(p.items.map(it => eqText(it.puz))).size !== p.items.length) problems.push('duplicate');
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-matches" aria-hidden="true"><defs><linearGradient id="cg-matches" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6d365"/><stop offset="1" stop-color="#fda085"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-matches)"/><rect x="16" y="58" width="168" height="84" rx="16" fill="#fff"/><g><path d="M30 80L50 80" stroke="#C2884B" stroke-width="6" stroke-linecap="round"/><circle cx="30" cy="80" r="3.6" fill="#7F1D1D"/></g><g><path d="M50 80L50 100.0" stroke="#C2884B" stroke-width="6" stroke-linecap="round"/><circle cx="50" cy="80" r="3.6" fill="#7F1D1D"/></g><g><path d="M30 100.0L50 100.0" stroke="#C2884B" stroke-width="6" stroke-linecap="round"/><circle cx="30" cy="100.0" r="3.6" fill="#7F1D1D"/></g><g><path d="M30 100.0L30 120" stroke="#C2884B" stroke-width="6" stroke-linecap="round"/><circle cx="30" cy="100.0" r="3.6" fill="#7F1D1D"/></g><g><path d="M30 120L50 120" stroke="#C2884B" stroke-width="6" stroke-linecap="round"/><circle cx="30" cy="120" r="3.6" fill="#7F1D1D"/></g><g><path d="M62 100L82 100" stroke="#C2884B" stroke-width="6" stroke-linecap="round"/><circle cx="62" cy="100" r="3.6" fill="#7F1D1D"/></g><g class="mt-b"><path d="M72 90L72 110" stroke="#DC2626" stroke-width="6" stroke-linecap="round"/><circle cx="72" cy="90" r="3.6" fill="#7F1D1D"/></g><g><path d="M104 80L104 100.0" stroke="#C2884B" stroke-width="6" stroke-linecap="round"/><circle cx="104" cy="80" r="3.6" fill="#7F1D1D"/></g><g><path d="M104 100.0L104 120" stroke="#C2884B" stroke-width="6" stroke-linecap="round"/><circle cx="104" cy="100.0" r="3.6" fill="#7F1D1D"/></g><g><path d="M118 94L136 94" stroke="#C2884B" stroke-width="6" stroke-linecap="round"/><circle cx="118" cy="94" r="3.6" fill="#7F1D1D"/></g><g><path d="M118 106L136 106" stroke="#C2884B" stroke-width="6" stroke-linecap="round"/><circle cx="118" cy="106" r="3.6" fill="#7F1D1D"/></g><g><path d="M150 80L170 80" stroke="#C2884B" stroke-width="6" stroke-linecap="round"/><circle cx="150" cy="80" r="3.6" fill="#7F1D1D"/></g><g><path d="M170 80L170 100.0" stroke="#C2884B" stroke-width="6" stroke-linecap="round"/><circle cx="170" cy="80" r="3.6" fill="#7F1D1D"/></g><g><path d="M170 100.0L170 120" stroke="#C2884B" stroke-width="6" stroke-linecap="round"/><circle cx="170" cy="100.0" r="3.6" fill="#7F1D1D"/></g><g><path d="M150 120L170 120" stroke="#C2884B" stroke-width="6" stroke-linecap="round"/><circle cx="150" cy="120" r="3.6" fill="#7F1D1D"/></g><g class="mt-a"><path d="M150 80L150 100.0" stroke="#C2884B" stroke-width="6" stroke-linecap="round"/><circle cx="150" cy="80" r="3.6" fill="#7F1D1D"/></g><g><path d="M150 100.0L170 100.0" stroke="#C2884B" stroke-width="6" stroke-linecap="round"/><circle cx="150" cy="100.0" r="3.6" fill="#7F1D1D"/></g></svg>`
};
