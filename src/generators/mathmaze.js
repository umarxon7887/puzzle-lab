// mathmaze.js — «Arifmetik labirint» (Математический лабиринт / Math maze) generatori.
// To'rning har bir katagida misol yoki tenglik yozilgan. Kirishdan chiqishgacha faqat to'g'ri kataklar orqali yuriladi:
//  • «To'g'ri tengliklar» — faqat to'g'ri yozilgan tengliklar (7 + 5 = 12 — ha, 7 + 5 = 13 — yo'q);
//  • «Javobi N» — faqat javobi berilgan songa teng misollar.
// Kafolat (check()): kirishdan to'g'ri kataklar orqali boriladigan yo'l yagona — to'g'ri kataklar yo'lning o'zi
// (yo'l o'ziga tegmaydi) va yo'lga tegmaydigan alohida «aldamchi» to'g'ri kataklar.

import { makeRng, randInt, shuffle, pickOne } from '../core/rng.js';
import { INK, MUTE, ANSWER, font } from '../core/draw.js';
import { scaleOf, measureRule, drawRule } from '../core/parts.js';

const MUL = '×', DIV = '÷', MINUS = '−';
// R×C — to'r; len — yo'l uzunligi; kind — misollar turi; decoy — aldamchi to'g'ri kataklar ulushi
const LEVELS = [
  { R: 5, C: 5, len: [9, 11], kind: 'add10', decoy: 0.12 },
  { R: 6, C: 6, len: [13, 16], kind: 'add20', decoy: 0.14 },
  { R: 6, C: 6, len: [14, 18], kind: 'mul', decoy: 0.15 },
  { R: 7, C: 7, len: [18, 23], kind: 'mix', decoy: 0.15 }
];
const NB = [[0, 1], [1, 0], [0, -1], [-1, 0]];

// Chap ustundan o'ng ustungacha o'ziga tegmaydigan yo'l (seqmaze bilan bir xil usul)
function findPath(R, C, n, rand) {
  for (let attempt = 0; attempt < 300; attempt++) {
    const r0 = Math.floor(rand() * R);
    const seen = new Uint8Array(R * C);
    const path = [[r0, 0]];
    seen[r0 * C] = 1;
    let budget = 5000;
    const dfs = () => {
      if (--budget < 0) return false;
      const [r, c] = path[path.length - 1];
      if (path.length === n) return c === C - 1;
      if (C - 1 - c > n - path.length) return false;
      for (const [dr, dc] of shuffle(NB.slice(), rand)) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || rr >= R || cc < 0 || cc >= C || seen[rr * C + cc]) continue;
        if (cc === C - 1 && path.length + 1 < n) continue;          // o'ng chetga faqat oxirida chiqiladi
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

// Berilgan natijali barcha misollar (matn ro'yxati). mix turida — tasodifiy qidiruv.
const exprCache = new Map();
function allExprs(kind, v) {
  const key = kind + ':' + v;
  if (exprCache.has(key)) return exprCache.get(key);
  const out = [];
  if (kind === 'add10' || kind === 'add20') {
    const M = kind === 'add10' ? 10 : 20;
    for (let a = 1; a < v; a++) {
      const b = v - a;
      if (kind === 'add20' && (a % 10) + (b % 10) < 10 && v > 10) continue;     // 20 gacha: o'nlikdan o'tadiganlari
      out.push(`${a} + ${b}`);
    }
    for (let b = 1; v + b <= M; b++) {
      const a = v + b;
      if (kind === 'add20' && a > 10 && a % 10 >= b % 10 && v < 10) continue;
      out.push(`${a} ${MINUS} ${b}`);
    }
  } else if (kind === 'mul') {
    for (let a = 2; a <= 10; a++) if (v % a === 0 && v / a >= 2 && v / a <= 10) out.push(`${a} ${MUL} ${v / a}`);
    if (v >= 2 && v <= 10) for (let b = 2; b <= 10; b++) out.push(`${v * b} ${DIV} ${b}`);
  }
  exprCache.set(key, out);
  return out;
}
// Ikki amalli misollar (7×7 to'rda joy tor — bo'sh joysiz yoziladi)
function mixExpr(rand) {
  const f = randInt(rand, 0, 4);
  const a = randInt(rand, 2, 9), b = randInt(rand, 2, 9), c = randInt(rand, 2, 20);
  if (f === 0) return { s: `${a}${MUL}${b}+${c}`, v: a * b + c };
  if (f === 1) return a * b - c >= 0 ? { s: `${a}${MUL}${b}${MINUS}${c}`, v: a * b - c } : null;
  if (f === 2) return { s: `${c}+${a}${MUL}${b}`, v: c + a * b };
  if (f === 3) return { s: `${a * b}${DIV}${b}+${c}`, v: a + c };
  const x = randInt(rand, 11, 60), y = randInt(rand, 5, 39);
  if (rand() < 0.5) return { s: `${x}+${y}`, v: x + y };
  return x - y >= 0 ? { s: `${x}${MINUS}${y}`, v: x - y } : null;
}
const RANGE = { add10: [2, 10], add20: [11, 20], mul: [2, 60], mix: [12, 80] };
// Natijasi v bo'lgan bitta misol (bo'lmasa null). avoid — yaqinda ishlatilganlar (takrorlanmasin)
function exprFor(kind, rand, v, avoid) {
  if (kind === 'mix') {
    for (let t = 0; t < 3000; t++) { const e = mixExpr(rand); if (e && e.v === v && !avoid.has(e.s)) return e; }
    for (let t = 0; t < 3000; t++) { const e = mixExpr(rand); if (e && e.v === v) return e; }
    return null;
  }
  const list = allExprs(kind, v);
  if (!list.length) return null;
  const fresh = list.filter(x => !avoid.has(x));
  return { s: pickOne(rand, fresh.length ? fresh : list), v };
}
function randomExpr(kind, rand, avoid) {
  for (let t = 0; t < 200; t++) {
    if (kind === 'mix') { const e = mixExpr(rand); if (e && !avoid.has(e.s)) return e; continue; }
    const [lo, hi] = RANGE[kind];
    const e = exprFor(kind, rand, randInt(rand, lo, hi), avoid);
    if (e) return e;
  }
  return null;
}
// Yaqin, lekin noto'g'ri natija
function nearWrong(v, rand, kind) {
  const ds = kind === 'add10' ? [1, -1, 2, -2] : [1, -1, 2, -2, 10, -10];
  for (let t = 0; t < 20; t++) { const w = v + pickOne(rand, ds); if (w >= 0 && w !== v) return w; }
  return v + 1;
}

const MODES = {
  true: { big: '=✓', label: { uz: "To'g'ri tengliklar", ru: 'Верные равенства', en: 'True equations' } },
  target: { big: '= ?', label: { uz: 'Javobi berilgan son', ru: 'Ответ — заданное число', en: 'Answer is the number' } }
};
const RULE = {
  true: {
    uz: "Kirishdan chiqishgacha yo'l top: faqat to'g'ri yozilgan tengliklar orqali yur. Faqat yonidagi yoki ustidagi/ostidagi katakka o'tish mumkin.",
    ru: 'Найди путь от входа до выхода: иди только по верным равенствам. Переходить можно только в соседнюю клетку слева, справа, сверху или снизу.',
    en: 'Find the way from the entrance to the exit: step only on true equations. Move only to a cell beside, above or below.'
  },
  target: {
    uz: t => `Kirishdan chiqishgacha yo'l top: faqat javobi ${t} ga teng bo'lgan misollar orqali yur. Faqat yonidagi yoki ustidagi/ostidagi katakka o'tish mumkin.`,
    ru: t => `Найди путь от входа до выхода: иди только по примерам с ответом ${t}. Переходить можно только в соседнюю клетку слева, справа, сверху или снизу.`,
    en: t => `Find the way from the entrance to the exit: step only on sums whose answer is ${t}. Move only to a cell beside, above or below.`
  },
  order: {
    uz: " Avval ko'paytirish va bo'lish, keyin qo'shish va ayirish bajariladi.",
    ru: ' Сначала выполняется умножение и деление, потом сложение и вычитание.',
    en: ' Multiply and divide before you add and subtract.'
  }
};

export function validSet(p) {
  return p.cells.map(cl => (p.mode === 'true' ? cl.ok : cl.v === p.target));
}

export default {
  id: 'mathmaze',
  skills: ['counting', 'attention', 'logic'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Arifmetik labirint', ru: 'Математический лабиринт', en: 'Math maze' },
  desc: {
    uz: "Faqat to'g'ri tengliklar yoki javobi berilgan songa teng misollar orqali chiqish yo'lini topish",
    ru: 'Найти выход, проходя только по верным равенствам или примерам с заданным ответом',
    en: 'Find the way out stepping only on true equations or on sums with the given answer'
  },
  fileBase: { uz: 'Arifmetik labirint', ru: 'Математический лабиринт', en: 'Math maze' },
  defaultTitle: { uz: "Yo'lni hisoblab top!", ru: 'Найди путь счётом!', en: 'Count your way out!' },
  options: [
    { key: 'level', type: 'level', default: 1 },
    {
      key: 'mode', type: 'choice', style: 'cards', pack: 'select', default: 'true',
      label: { uz: 'Turi', ru: 'Вид', en: 'Kind' },
      choices: Object.entries(MODES).map(([value, m]) => ({ value, big: m.big, label: m.label }))
    }
  ],
  levelHint: {
    uz: ["5×5, qo'shish va ayirish 10 gacha", "6×6, qo'shish va ayirish 20 gacha (o'nlikdan o'tib)", "6×6, karra jadvali va bo'lish", "7×7, ikki amalli misollar va 100 gacha qo'shish-ayirish"],
    ru: ['5×5, сложение и вычитание до 10', '6×6, сложение и вычитание до 20 (с переходом через десяток)', '6×6, таблица умножения и деление', '7×7, примеры в два действия и сложение-вычитание до 100'],
    en: ['5×5, adding and subtracting to 10', '6×6, adding and subtracting to 20 (crossing ten)', '6×6, times tables and division', '7×7, two-step sums and adding/subtracting to 100']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const mode = opts.mode in MODES ? opts.mode : 'true';
    const L = LEVELS[level];
    const rand = makeRng(seed);
    for (let attempt = 0; attempt < 100; attempt++) {
      const n = randInt(rand, L.len[0], L.len[1]);
      const path = findPath(L.R, L.C, n, rand);
      if (!path) continue;
      const onPath = new Set(path.map(([r, c]) => r * L.C + c));
      const nearPath = new Set();
      for (const [r, c] of path) for (const [dr, dc] of NB) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < L.R && cc >= 0 && cc < L.C) nearPath.add(rr * L.C + cc); }
      // Aldamchi to'g'ri kataklar: yo'lga tegmaydiganlar orasidan
      const far = shuffle(Array.from({ length: L.R * L.C }, (_, k) => k).filter(k => !onPath.has(k) && !nearPath.has(k)), rand);
      const decoys = new Set(far.slice(0, Math.round(L.decoy * L.R * L.C)));
      let target = null;
      if (mode === 'target') {
        target = level === 0 ? randInt(rand, 6, 10) : level === 1 ? randInt(rand, 11, 17) : level === 2 ? pickOne(rand, [4, 6, 8, 9, 10]) : randInt(rand, 24, 50);
      }
      const cells = [], avoid = new Set();
      let fail = false;
      for (let k = 0; k < L.R * L.C && !fail; k++) {
        const good = onPath.has(k) || decoys.has(k);
        let e;
        if (mode === 'true') {
          e = randomExpr(L.kind, rand, avoid);
          if (!e) { fail = true; break; }
          avoid.add(e.s);
          const shown = good ? e.v : nearWrong(e.v, rand, L.kind);
          cells.push({ s: `${e.s} = ${shown}`, v: e.v, ok: good });
          continue;
        }
        if (good) e = exprFor(L.kind, rand, target, avoid);
        else {
          // Noto'g'ri kataklar: ko'pincha javobi maqsadga yaqin (±1…±3), ba'zan istalgan
          for (let t = 0; t < 40 && !e; t++) {
            const v = rand() < 0.7 ? target + pickOne(rand, [1, -1, 2, -2, 3, -3]) : randInt(rand, RANGE[L.kind][0], RANGE[L.kind][1]);
            if (v !== target && v >= 0) e = exprFor(L.kind, rand, v, avoid);
          }
        }
        if (!e || (good ? e.v !== target : e.v === target)) { fail = true; break; }
        avoid.add(e.s);
        cells.push({ s: e.s, v: e.v, ok: good });
      }
      if (fail) continue;
      return { level, seed, mode, R: L.R, C: L.C, path, cells, target };
    }
    throw new Error('mathmaze: no puzzle');
  },

  info(p, lang) {
    return { uz: `${p.R}×${p.C} to'r, yo'l ${p.path.length} katak`, ru: `Сетка ${p.R}×${p.C}, путь ${p.path.length} клеток`, en: `${p.R}×${p.C} grid, path of ${p.path.length} cells` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box);
    let text = p.mode === 'true' ? (RULE.true[lang] || RULE.true.uz) : (RULE.target[lang] || RULE.target.uz)(p.target);
    if (p.level === 3) text += RULE.order[lang] || RULE.order.uz;
    const rule = measureRule(ctx, text, box.w, scale);
    const gap = 4 * scale, arrowW = 8 * scale;
    const cs = Math.min((box.w - 2 * arrowW) / p.C, (box.h - rule.h - gap) / p.R, 30);
    const W = cs * p.C, H = cs * p.R;
    const top = box.y + Math.max(0, (box.h - H - gap - rule.h) * 0.4);
    const left = box.x + (box.w - W) / 2;
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
    // Matnlar: eng uzun matn katakka sig'adigan bir xil o'lcham; juda mayda bo'lsa «= …» ikkinchi qatorga
    const fit = lines => {
      let fs = cs * 0.3;
      font(ctx, fs, 700);
      const longest = Math.max(...p.cells.flatMap(cl => lines(cl).map(t => ctx.measureText(t).width)));
      if (longest > cs * 0.86) fs *= cs * 0.86 / longest;
      return fs;
    };
    const one = cl => [cl.s], two = cl => { const i = cl.s.lastIndexOf(' = '); return i > 0 ? [cl.s.slice(0, i), cl.s.slice(i + 1)] : [cl.s]; };
    let split = false, fs = fit(one);
    if (p.mode === 'true' && fs < 4.2 * scale) { const f2 = Math.min(fit(two), cs * 0.24); if (f2 > fs * 1.15) { fs = f2; split = true; } }
    p.cells.forEach((cl, k) => {
      const r = Math.floor(k / p.C), c = k % p.C;
      font(ctx, fs, 700);
      ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const parts = split ? two(cl) : one(cl);
      parts.forEach((t, j) => ctx.fillText(t, left + c * cs + cs / 2, top + r * cs + cs / 2 + (j - (parts.length - 1) / 2) * fs * 1.25));
    });
    if (showSolution) {
      ctx.save(); ctx.strokeStyle = ANSWER; ctx.lineWidth = Math.max(0.5, 0.9 * scale); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.globalAlpha = 0.55;
      ctx.beginPath();
      p.path.forEach(([r, c], i) => { const x = left + c * cs + cs / 2, y = top + r * cs + cs * 0.78; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.stroke(); ctx.restore();
    }
    const arrow = (x, y, color) => {
      ctx.save(); ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(x - arrowW * 0.8, y - cs * 0.16); ctx.lineTo(x - arrowW * 0.8, y + cs * 0.16); ctx.lineTo(x - arrowW * 0.1, y); ctx.closePath(); ctx.fill();
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
    const T = { uz: `Yo'l uzunligi: ${p.path.length} katak`, ru: `Длина пути: ${p.path.length} клеток`, en: `Path length: ${p.path.length} cells` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const ok = validSet(p), R = p.R, C = p.C;
    const onPath = new Set(p.path.map(([r, c]) => r * C + c));
    // Yo'l: chapdan o'ngga, qo'shni qadamlar, o'ziga tegmaydi
    if (p.path[0][1] !== 0 || p.path[p.path.length - 1][1] !== C - 1) problems.push('path must go left to right');
    p.path.forEach(([r, c], i) => {
      if (i && Math.abs(r - p.path[i - 1][0]) + Math.abs(c - p.path[i - 1][1]) !== 1) problems.push('path step');
      if (!ok[r * C + c]) problems.push('path cell not valid');
    });
    // Kirishdan boshlangan to'g'ri kataklar to'plami aynan yo'lning o'zi
    const start = p.path[0][0] * C, seen = new Set([start]), q = [start];
    while (q.length) {
      const k = q.pop(), r = Math.floor(k / C), c = k % C;
      for (const [dr, dc] of NB) { const rr = r + dr, cc = c + dc, kk = rr * C + cc; if (rr >= 0 && rr < R && cc >= 0 && cc < C && ok[kk] && !seen.has(kk)) { seen.add(kk); q.push(kk); } }
    }
    if (seen.size !== onPath.size || [...seen].some(k => !onPath.has(k))) problems.push('valid cells touch the path');
    for (const [r, c] of p.path) {
      let nb = 0;
      for (const [dr, dc] of NB) if (onPath.has((r + dr) * C + c + dc) && r + dr >= 0 && r + dr < R && c + dc >= 0 && c + dc < C) nb++;
      if (nb > 2) problems.push('path touches itself');
    }
    p.cells.forEach(cl => { if (cl.v < 0 || !Number.isInteger(cl.v)) problems.push('bad value'); });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-mathmaze" aria-hidden="true"><defs><linearGradient id="cg-mathmaze" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#96fbc4"/><stop offset="1" stop-color="#f9f586"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-mathmaze)"/><rect x="30" y="30" width="140" height="140" rx="6" fill="#fff" stroke="#14532d" stroke-width="4"/><path d="M76.7 30v140M123.3 30v140M30 76.7h140M30 123.3h140" stroke="#14532d" stroke-width="2.5"/><g fill="#FDECEC"><rect x="32" y="78.7" width="42.7" height="42.7"/><rect x="78.7" y="78.7" width="42.7" height="42.7"/><rect x="78.7" y="125.3" width="42.7" height="42.7"/><rect x="125.3" y="125.3" width="42.7" height="42.7"/></g><g font-family="Nunito, sans-serif" font-weight="800" font-size="13" text-anchor="middle" fill="#14532d"><text x="53" y="58">3+4=8</text><text x="100" y="58">9−2=6</text><text x="147" y="58">5+5=9</text><text x="53" y="104">2+6=8</text><text x="100" y="104">7−3=4</text><text x="147" y="104">8−1=6</text><text x="53" y="151">4+4=7</text><text x="100" y="151">1+8=9</text><text x="147" y="151">6+3=9</text></g><path class="mz-path" d="M40 100 H100 V147 H160" fill="none" stroke="#DC2626" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" pathLength="100" opacity=".7"/><path d="M14 92l12 8-12 8z" fill="#16A34A"/><path d="M174 139l12 8-12 8z" fill="#DC2626"/></svg>`
};
