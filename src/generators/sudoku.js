// sudoku.js — Sudoku generatori: 4×4 dan 9×9 gacha, diagonal (X) va shaklli bloklar (jigsaw).
// Kafolat: har bir topshiriqning yechimi YAGONA. "Oson" va "O'rta" darajalar faqat mantiq bilan
// (taxminsiz) yechiladi: Oson — "yagona nomzod", O'rta — + "yashirin yagona".

import { makeRng, shuffle } from '../core/rng.js';
import { INK, MUTE, ANSWER, ANSWER_BG, PT, font, wrapLines } from '../core/draw.js';

// br × bc — blok o'lchami (qator × ustun). 5 va 7 tub son, ular uchun to'g'ri burchakli blok yo'q:
// ularda tasodifiy shaklli bloklar (jigsaw) ishlatiladi.
const TYPES = {
  '4': { N: 4, br: 2, bc: 2 },
  '5': { N: 5, jig: true },
  '6': { N: 6, br: 2, bc: 3 },
  '7': { N: 7, jig: true },
  '8': { N: 8, br: 2, bc: 4 },
  '9': { N: 9, br: 3, bc: 3 },
  '9x': { N: 9, br: 3, bc: 3, diag: true }
};
// Har bir daraja uchun berilgan katakchalar soni (maqsad) va yechish usuli talabi
const LEVEL_CLUES = { '4': [11, 9, 7, 6], '5': [16, 13, 11, 9], '6': [24, 20, 17, 14], '7': [32, 27, 23, 19], '8': [40, 33, 28, 24], '9': [42, 34, 29, 25], '9x': [40, 32, 27, 23] };
const LEVEL_MODE = ['naked', 'singles', 'none', 'none'];

const TYPE_LABELS = {
  '4': { big: '4×4', sub: { uz: 'bloklar 2×2', ru: 'блоки 2×2', en: '2×2 boxes' } },
  '5': { big: '5×5', sub: { uz: 'shaklli bloklar', ru: 'фигурные блоки', en: 'jigsaw' } },
  '6': { big: '6×6', sub: { uz: 'bloklar 2×3', ru: 'блоки 2×3', en: '2×3 boxes' } },
  '7': { big: '7×7', sub: { uz: 'shaklli bloklar', ru: 'фигурные блоки', en: 'jigsaw' } },
  '8': { big: '8×8', sub: { uz: 'bloklar 2×4', ru: 'блоки 2×4', en: '2×4 boxes' } },
  '9': { big: '9×9', sub: { uz: 'klassik', ru: 'классика', en: 'classic' } },
  '9x': { big: '9×9', sub: { uz: 'diagonal (X)', ru: 'диагональ (X)', en: 'diagonal (X)' } }
};

// "Birlik"lar — qator, ustun, blok/shakl, diagonal. Har bir birlikda raqamlar takrorlanmaydi.
function assemble(t, region) {
  const N = t.N, units = [];
  for (let r = 0; r < N; r++) units.push(Array.from({ length: N }, (_, c) => r * N + c));
  for (let c = 0; c < N; c++) units.push(Array.from({ length: N }, (_, r) => r * N + c));
  for (let id = 0; id < N; id++) units.push(region.map((v, i) => (v === id ? i : -1)).filter(i => i >= 0));
  if (t.diag) {
    units.push(Array.from({ length: N }, (_, i) => i * N + i));
    units.push(Array.from({ length: N }, (_, i) => i * N + (N - 1 - i)));
  }
  const peerSets = Array.from({ length: N * N }, () => new Set());
  units.forEach(u => u.forEach(a => u.forEach(b => { if (a !== b) peerSets[a].add(b); })));
  return { ...t, region, units, peers: peerSets.map(s => [...s]) };
}

// Tasodifiy shaklli bloklar: N ta bog'langan qism, har biri N ta katakdan
function makeJigsaw(N, rand) {
  for (let attempt = 0; attempt < 300; attempt++) {
    const reg = new Array(N * N).fill(-1), size = new Array(N).fill(0);
    const perm = shuffle(Array.from({ length: N }, (_, i) => i), rand);
    for (let r = 0; r < N; r++) { reg[r * N + perm[r]] = r; size[r] = 1; }
    let assigned = N;
    while (assigned < N * N) {
      const options = [];
      for (let i = 0; i < N * N; i++) {
        const k = reg[i];
        if (k < 0 || size[k] >= N) continue;
        const r = Math.floor(i / N), c = i % N;
        if (r > 0 && reg[i - N] < 0) options.push([k, i - N]);
        if (r < N - 1 && reg[i + N] < 0) options.push([k, i + N]);
        if (c > 0 && reg[i - 1] < 0) options.push([k, i - 1]);
        if (c < N - 1 && reg[i + 1] < 0) options.push([k, i + 1]);
      }
      if (!options.length) break;                    // tiqilib qoldi — qaytadan
      const [k, j] = options[Math.floor(rand() * options.length)];
      reg[j] = k; size[k]++; assigned++;
    }
    if (assigned === N * N) return reg;
  }
  return null;
}

const specCache = new Map();
export function buildSpec(key, seed) {
  const t = TYPES[key], N = t.N;
  const ck = t.jig ? key + '|' + seed : key;
  if (specCache.has(ck)) return specCache.get(ck);
  let spec = null;
  if (t.jig) {
    const rand = makeRng(seed * 17 + 3);
    for (let a = 0; a < 200 && !spec; a++) {
      const reg = makeJigsaw(N, rand);
      if (!reg) continue;
      const cand = assemble(t, reg);
      // Yechimi bor shaklni tanlaymiz. Ba'zi shakllarda qidiruv juda cho'zilib ketadi —
      // qadamlar chegarasidan oshsa, shakl tashlab yuboriladi (sahifa qotib qolmasligi uchun).
      const first = [];
      if (countSolutions(cand, new Array(N * N).fill(0), 1, null, first, 20000) >= 1) { spec = cand; spec.firstSol = first; }
    }
    if (!spec) spec = assemble(t, Array.from({ length: N * N }, (_, i) => Math.floor(i / N)));
  } else {
    spec = assemble(t, Array.from({ length: N * N }, (_, i) => Math.floor(Math.floor(i / N) / t.br) * (N / t.bc) + Math.floor((i % N) / t.bc)));
  }
  if (specCache.size > 60) specCache.clear();
  specCache.set(ck, spec);
  return spec;
}

const popcount = m => { let c = 0; while (m) { m &= m - 1; c++; } return c; };

// Yechimlar sonini sanaydi (limitga yetganda to'xtaydi). Eng kam nomzodli katakdan boshlaydi.
// firstOut berilsa, birinchi topilgan yechim unga yoziladi. budget — qadamlar chegarasi:
// oshib ketsa -1 qaytadi ("aniqlab bo'lmadi").
export function countSolutions(spec, g, limit, rand, firstOut, budget = Infinity) {
  const full = (1 << spec.N) - 1;
  let count = 0, steps = 0, aborted = false;
  function rec() {
    if (++steps > budget) { aborted = true; return; }
    let best = -1, bestMask = 0, bestCnt = 99;
    for (let i = 0; i < g.length; i++) {
      if (g[i]) continue;
      let used = 0; const ps = spec.peers[i];
      for (let k = 0; k < ps.length; k++) { const v = g[ps[k]]; if (v) used |= 1 << (v - 1); }
      const m = full & ~used, c = popcount(m);
      if (c === 0) return;
      if (c < bestCnt) { bestCnt = c; best = i; bestMask = m; if (c === 1) break; }
    }
    if (best < 0) { count++; if (firstOut && count === 1) firstOut.push(...g); return; }
    const digits = [];
    for (let d = 1; d <= spec.N; d++) if (bestMask & (1 << (d - 1))) digits.push(d);
    if (rand) shuffle(digits, rand);
    for (const d of digits) { g[best] = d; rec(); g[best] = 0; if (count >= limit || aborted) return; }
  }
  rec();
  return aborted ? -1 : count;
}
const UNIQ_BUDGET = 30000;

// Faqat mantiq bilan yechiladimi? "yagona nomzod" va (hidden = true bo'lsa) "yashirin yagona"
export function solvableBySingles(spec, g0, hidden) {
  const g = g0.slice(), N = spec.N, full = (1 << N) - 1;
  const cand = i => { let used = 0; const ps = spec.peers[i]; for (let k = 0; k < ps.length; k++) { const v = g[ps[k]]; if (v) used |= 1 << (v - 1); } return full & ~used; };
  let progress = true;
  while (progress) {
    progress = false;
    for (let i = 0; i < g.length; i++) {
      if (g[i]) continue;
      const m = cand(i);
      if (m === 0) return false;
      if ((m & (m - 1)) === 0) { g[i] = Math.log2(m) + 1; progress = true; }
    }
    if (!progress && hidden) {
      outer:
      for (const u of spec.units) {
        for (let d = 1; d <= N; d++) {
          if (u.some(i => g[i] === d)) continue;
          const spots = u.filter(i => !g[i] && (cand(i) & (1 << (d - 1))));
          if (spots.length === 1) { g[spots[0]] = d; progress = true; break outer; }
        }
      }
    }
  }
  return g.every(v => v);
}

function makePuzzle(key, level, seed) {
  const spec = buildSpec(key, seed), total = spec.N * spec.N;
  // 1) to'liq to'g'ri yechim (tasodifiy tartibda qidiriladi)
  let sol = [];
  if (countSolutions(spec, new Array(total).fill(0), 1, makeRng(seed), sol, 200000) < 1) {
    // juda kam uchraydi: tayyor yechimdagi raqamlarni tasodifiy almashtiramiz (qoidalar buzilmaydi)
    let base = spec.firstSol;
    if (!base) { base = []; countSolutions(spec, new Array(total).fill(0), 1, null, base); }
    const perm = shuffle(Array.from({ length: spec.N }, (_, i) => i + 1), makeRng(seed ^ 0x5bd1e995));
    sol = base.map(v => perm[v - 1]);
  }
  // 2) juft-juft (180° simmetrik) olib tashlab, yechim yagonaligini saqlaymiz.
  //    "Juda qiyin"da bir necha tartibni sinab, eng kam berilganli variant tanlanadi.
  const rand = makeRng(seed * 31 + 7);
  const target = LEVEL_CLUES[key][level], mode = LEVEL_MODE[level];
  const attempts = level === 3 ? 6 : 1;
  let bestG = null, bestClues = total + 1;
  for (let a = 0; a < attempts && bestClues > target; a++) {
    const order = shuffle(Array.from({ length: total }, (_, i) => i), rand);
    const g = sol.slice();
    let clues = total;
    for (const i of order) {
      if (clues <= target) break;
      if (!g[i]) continue;
      const j = total - 1 - i;
      const cells = (i === j || !g[j]) ? [i] : [i, j];
      const backup = cells.map(c => g[c]);
      cells.forEach(c => { g[c] = 0; });
      const ok = mode === 'none' ? countSolutions(spec, g, 2, null, null, UNIQ_BUDGET) === 1 : solvableBySingles(spec, g, mode === 'singles');
      if (ok) clues -= cells.length; else cells.forEach((c, k) => { g[c] = backup[k]; });
    }
    if (clues < bestClues) { bestClues = clues; bestG = g; }
  }
  return { spec, sol, puzzle: bestG, clues: bestClues, total };
}

const RULE = {
  uz: (N, jig, diag) => `Har bir qator, ustun va ${jig ? 'qalin chiziq bilan chegaralangan shaklda' : 'qalin chiziqli blokda'} 1 dan ${N} gacha raqamlar takrorlanmasin.` + (diag ? ' Ikkala diagonalda ham.' : ''),
  ru: (N, jig, diag) => `В каждой строке, столбце и ${jig ? 'фигуре, обведённой жирной линией,' : 'блоке с жирной границей'} цифры от 1 до ${N} не должны повторяться.` + (diag ? ' То же — на обеих диагоналях.' : ''),
  en: (N, jig, diag) => `Fill in the digits 1 to ${N} so that no digit repeats in any row, column or ${jig ? 'shape outlined in bold' : 'bold box'}.` + (diag ? ' The same goes for both diagonals.' : '')
};

export default {
  id: 'sudoku',
  skills: ['logic', 'attention'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Sudoku', ru: 'Судоку', en: 'Sudoku' },
  desc: {
    uz: '4×4 dan 9×9 gacha: klassik, diagonal va shaklli bloklar',
    ru: 'От 4×4 до 9×9: классика, диагональ и фигурные блоки',
    en: 'From 4×4 to 9×9: classic, diagonal and jigsaw'
  },
  fileBase: { uz: 'sudoku', ru: 'Судоку', en: 'Sudoku' },
  defaultTitle: { uz: 'Sudokuni yech!', ru: 'Реши судоку!', en: 'Solve the sudoku!' },
  options: [
    { key: 'level', type: 'level', default: 1 },
    {
      key: 'type', type: 'choice', style: 'cards', pack: 'select', default: '9',
      label: { uz: 'Sudoku turi', ru: 'Тип судоку', en: 'Sudoku type' },
      choices: Object.keys(TYPES).map(k => ({ value: k, big: TYPE_LABELS[k].big, label: TYPE_LABELS[k].sub }))
    }
  ],

  generate(opts, seed) {
    const key = opts.type in TYPES ? opts.type : '9';
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const { spec, sol, puzzle, clues, total } = makePuzzle(key, level, seed);
    return { type: key, level, seed, N: spec.N, region: spec.region, diag: !!spec.diag, jig: !!spec.jig, sol, puzzle, clues, total };
  },

  info(p) {
    return TYPE_LABELS[p.type].big + (p.jig ? ' jigsaw' : '') + (p.diag ? ' X' : '');
  },

  draw(ctx, p, box, { showSolution, lang }) {
    const N = p.N;
    ctx.save();
    // Qoida matni (jadval tagida); kichik joyda shrift ham kichrayadi
    const rulePt = Math.max(8, Math.min(11, box.w / 186 * 11.5));
    const ruleFs = rulePt * PT;
    font(ctx, ruleFs, 400);
    const ruleLines = wrapLines(ctx, (RULE[lang] || RULE.uz)(N, p.jig, p.diag), box.w);
    const ruleH = ruleLines.length * ruleFs * 1.35;
    const gap = Math.min(7, box.h * 0.03);

    const cellMm = Math.min(box.w / N, 30, (box.h - ruleH - gap) / N);
    const size = cellMm * N;
    const blockH = size + gap + ruleH;
    const gx = box.x + (box.w - size) / 2;
    const gy = box.y + Math.max(0, (box.h - blockH) * 0.4);        // bo'sh joy ko'proq pastda qoladi
    const cx = c => gx + c * cellMm, cy = r => gy + r * cellMm;

    if (p.diag) {                                        // diagonal kataklar och rangda
      ctx.fillStyle = '#E6ECF8';
      for (let i = 0; i < N; i++) {
        ctx.fillRect(cx(i), cy(i), cellMm, cellMm);
        if (i !== N - 1 - i) ctx.fillRect(cx(N - 1 - i), cy(i), cellMm, cellMm);
      }
    }
    if (p.jig) {                                         // qo'shni shakllar turli och rangda
      const PAL = ['#E8F0FC', '#FDF0DC', '#E6F5E9', '#F4E8F4', '#F0F0F0'];
      const adj = Array.from({ length: N }, () => new Set());
      for (let i = 0; i < N * N; i++) {
        const r = Math.floor(i / N), c = i % N, a = p.region[i];
        if (c < N - 1 && a !== p.region[i + 1]) { adj[a].add(p.region[i + 1]); adj[p.region[i + 1]].add(a); }
        if (r < N - 1 && a !== p.region[i + N]) { adj[a].add(p.region[i + N]); adj[p.region[i + N]].add(a); }
      }
      const col = new Array(N).fill(-1);
      for (let id = 0; id < N; id++) {
        const used = new Set([...adj[id]].map(x => col[x]));
        let c = 0; while (used.has(c)) c++;
        col[id] = c;
      }
      for (let i = 0; i < N * N; i++) {
        ctx.fillStyle = PAL[col[p.region[i]] % PAL.length];
        ctx.fillRect(cx(i % N), cy(Math.floor(i / N)), cellMm, cellMm);
      }
    }
    if (showSolution && !p.jig) {                        // javob katakchalariga yengil fon
      ctx.fillStyle = ANSWER_BG;
      for (let i = 0; i < N * N; i++) if (!p.puzzle[i]) ctx.fillRect(cx(i % N), cy(Math.floor(i / N)), cellMm, cellMm);
    }

    // Raqamlar
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < N * N; i++) {
      const given = p.puzzle[i], v = given || (showSolution ? p.sol[i] : 0);
      if (!v) continue;
      font(ctx, cellMm * 0.62, given ? 700 : 600);
      ctx.fillStyle = given ? INK : ANSWER;
      ctx.fillText(String(v), cx(i % N) + cellMm / 2, cy(Math.floor(i / N)) + cellMm / 2 + cellMm * 0.04);
    }

    // Chiziqlar: yupqa (katakchalar) va qalin (bloklar)
    ctx.strokeStyle = INK; ctx.lineCap = 'square';
    ctx.lineWidth = Math.max(0.2, Math.min(0.3, cellMm * 0.03));
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      ctx.moveTo(cx(i), cy(0)); ctx.lineTo(cx(i), cy(N));
      ctx.moveTo(cx(0), cy(i)); ctx.lineTo(cx(N), cy(i));
    }
    ctx.stroke();
    ctx.lineWidth = Math.max(0.6, Math.min(1, cellMm * 0.09));
    ctx.beginPath();
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const i = r * N + c;
        if (c === 0 || p.region[i - 1] !== p.region[i]) { ctx.moveTo(cx(c), cy(r)); ctx.lineTo(cx(c), cy(r + 1)); }
        if (c === N - 1) { ctx.moveTo(cx(N), cy(r)); ctx.lineTo(cx(N), cy(r + 1)); }
        if (r === 0 || p.region[i - N] !== p.region[i]) { ctx.moveTo(cx(c), cy(r)); ctx.lineTo(cx(c + 1), cy(r)); }
        if (r === N - 1) { ctx.moveTo(cx(c), cy(N)); ctx.lineTo(cx(c + 1), cy(N)); }
      }
    }
    ctx.stroke();

    font(ctx, ruleFs, 400);
    ctx.fillStyle = MUTE; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ruleLines.forEach((ln, i) => ctx.fillText(ln, box.x + box.w / 2, gy + size + gap + i * ruleFs * 1.35));
    ctx.restore();
    return { cell: cellMm };
  },

  hint(p, info, lang) {
    const T = { uz: `Berilgan raqamlar: ${p.clues} / ${p.total}`, ru: `Заполнено клеток: ${p.clues} из ${p.total}`, en: `Given digits: ${p.clues} / ${p.total}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  // Testlar uchun: yechim to'g'ri, topshiriq unga mos va yechim yagona
  check(p) {
    const problems = [];
    const spec = buildSpec(p.type, p.seed), N = p.N;
    for (const u of spec.units) {
      const s = new Set(u.map(i => p.sol[i]));
      if (s.size !== N || [...s].some(v => v < 1 || v > N)) { problems.push('bad solution unit'); break; }
    }
    for (let i = 0; i < N * N; i++) if (p.puzzle[i] && p.puzzle[i] !== p.sol[i]) { problems.push('puzzle != solution'); break; }
    if (countSolutions(spec, p.puzzle.slice(), 2) !== 1) problems.push('not unique');
    if (p.level === 0 && !solvableBySingles(spec, p.puzzle, false)) problems.push('easy not solvable by naked singles');
    if (p.level === 1 && !solvableBySingles(spec, p.puzzle, true)) problems.push('medium not solvable by singles');
    if (p.jig) {
      for (let id = 0; id < N; id++) {
        const cells = p.region.map((v, i) => (v === id ? i : -1)).filter(i => i >= 0);
        if (cells.length !== N) { problems.push('jigsaw region size'); break; }
        const seen = new Set([cells[0]]), q = [cells[0]];
        while (q.length) {
          const i = q.pop(), r = Math.floor(i / N), c = i % N;
          for (const j of [r > 0 ? i - N : -1, r < N - 1 ? i + N : -1, c > 0 ? i - 1 : -1, c < N - 1 ? i + 1 : -1]) {
            if (j >= 0 && p.region[j] === id && !seen.has(j)) { seen.add(j); q.push(j); }
          }
        }
        if (seen.size !== N) { problems.push('jigsaw region not connected'); break; }
      }
    }
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-sudoku" aria-hidden="true"><defs><linearGradient id="cg-sudoku" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4facfe"/><stop offset="1" stop-color="#00c6fb"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-sudoku)"/><rect x="40" y="40" width="120" height="120" fill="none" stroke="#fff" stroke-width="5" rx="6"/><path d="M80 40V160M120 40V160M40 80H160M40 120H160" stroke="#fff" stroke-width="3"/><g font-family="Nunito,Arial,sans-serif" font-size="26" font-weight="900" fill="#fff" text-anchor="middle"><text class="sd-num" x="60" y="70">5</text><text class="sd-num" x="100" y="70">3</text><text class="sd-num" x="140" y="110">7</text><text class="sd-num" x="60" y="150">2</text></g></svg>`
};
