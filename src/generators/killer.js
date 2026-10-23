// killer.js — «Killer sudoku» (Киллер-судоку / Killer sudoku) generatori.
// Sudoku qoidasi + shtrix chiziqli guruhlar (qafaslar): burchakdagi son — guruhdagi raqamlar yig'indisi,
// guruh ichida raqamlar takrorlanmaydi. Raqamlar deyarli berilmaydi.
// Kafolat (check()): yechuvchi (nomzodlar + guruh kombinatsiyalari + qidiruv) yechimlarni sanaydi — aynan bitta.

import { makeRng, randInt, shuffle, pickOne } from '../core/rng.js';
import { INK, MUTE, ANSWER, font } from '../core/draw.js';
import { scaleOf, measureRule, drawRule } from '../core/parts.js';
import { buildSpec, countSolutions } from './sudoku.js';

// key — sudoku turi; size — guruh o'lchami [min, max]; singles — bitta katakli guruhlar (eng ko'pi);
// maxGivens — yagonalik uchun berilishi mumkin bo'lgan raqamlar; count — [1 tadan, 2 tadan, 4 tadan]
const LEVELS = [
  { key: '4', N: 4, size: [1, 3], singles: 2, maxGivens: 1, count: [4, 2, 1] },
  { key: '6', N: 6, size: [2, 3], singles: 2, maxGivens: 2, count: [2, 1, 1] },
  { key: '9', N: 9, size: [2, 3], singles: 2, maxGivens: 4, count: [1, 1, 1] },
  { key: '9', N: 9, size: [2, 4], singles: 0, maxGivens: 1, count: [1, 1, 1] }
];

const POP = new Uint8Array(2048).map((_, m) => { let c = 0; while (m) { m &= m - 1; c++; } return c; });
const bitCount = m => POP[m];

// k ta har xil raqam (1..N) yig'indisi s bo'ladigan barcha to'plamlar (bit maskalar)
const comboCache = new Map();
function combos(N, k, s) {
  const key = N + ':' + k + ':' + s;
  if (comboCache.has(key)) return comboCache.get(key);
  const out = [];
  const rec = (start, left, sum, mask) => {
    if (left === 0) { if (sum === s) out.push(mask); return; }
    for (let d = start; d <= N; d++) { if (sum + d > s) break; rec(d + 1, left - 1, sum + d, mask | 1 << d); }
  };
  rec(1, k, 0, 0);
  comboCache.set(key, out);
  return out;
}

// Yechimlar soni (limit gacha); budget oshsa -1. sols — topilgan yechimlar (ixtiyoriy)
export function countKiller(spec, cages, given, limit = 2, budget = 60000, sols = null) {
  const N = spec.N, T = N * N, full = ((1 << (N + 1)) - 1) & ~1;
  const cageOf = new Int16Array(T);
  cages.forEach((c, i) => c.cells.forEach(k => { cageOf[k] = i; }));
  const peers = spec.peers.map((ps, k) => [...new Set([...ps, ...cages[cageOf[k]].cells.filter(j => j !== k)])]);
  // «45 qoidasi»: qator/ustun/blok ichida to'liq yotgan guruhlar yig'indisini ayirib, qolgan 1–4 katak uchun
  // qo'shimcha (ko'rinmaydigan) guruh hosil qilamiz — yechuvchi ancha tez ishlaydi, javob o'zgarmaydi
  const total = N * (N + 1) / 2, all = cages.slice();
  for (const u of spec.units) {
    const inU = new Set(u);
    let S = 0; const covered = new Set();
    for (const c of cages) if (c.cells.every(k => inU.has(k))) { S += c.sum; c.cells.forEach(k => covered.add(k)); }
    const rest = u.filter(k => !covered.has(k));
    if (rest.length >= 1 && rest.length <= 4 && rest.length < u.length) all.push({ cells: rest, sum: total - S });
  }
  const cmb = all.map(c => combos(N, c.cells.length, c.sum));
  const unitsOf = Array.from({ length: T }, () => []);
  spec.units.forEach((u, i) => u.forEach(k => unitsOf[k].push(i)));
  const inCage = all.map(c => new Set(c.cells));
  let count = 0, nodes = 0, aborted = false;
  const propagate = dom => {
    let changed = true;
    while (changed) {
      changed = false;
      for (let k = 0; k < T; k++) {
        const m = dom[k];
        if (!m) return false;
        if ((m & (m - 1)) === 0) for (const j of peers[k]) if (dom[j] & m) { dom[j] &= ~m; if (!dom[j]) return false; changed = true; }
      }
      for (const u of spec.units) {
        for (let d = 1; d <= N; d++) {
          const bit = 1 << d; let cnt = 0, only = -1;
          for (const k of u) if (dom[k] & bit) { cnt++; only = k; if (cnt > 1) break; }
          if (cnt === 0) return false;
          if (cnt === 1 && dom[only] !== bit) { dom[only] = bit; changed = true; }
        }
      }
      for (let i = 0; i < all.length; i++) {
        const cells = all[i].cells, allow = new Array(cells.length).fill(0);
        let req = -1;
        for (const m of cmb[i]) {
          let uni = 0, ok = true;
          for (const k of cells) { const x = dom[k] & m; if (!x) { ok = false; break; } uni |= x; }
          if (!ok || bitCount(uni) < cells.length) continue;
          cells.forEach((k, j) => { allow[j] |= dom[k] & m; });
          req &= m;
        }
        for (let j = 0; j < cells.length; j++) {
          const k = cells[j];
          if (!allow[j]) return false;
          if (allow[j] !== dom[k]) { dom[k] = allow[j]; changed = true; }
        }
        // guruhda albatta bo'ladigan raqam: uni oladigan kataklar bitta qator/ustun/blokda bo'lsa,
        // shu qator/ustun/blokning boshqa kataklarida u raqam bo'lmaydi
        if (req > 0) for (let d = 1; d <= N; d++) {
          const bit = 1 << d;
          if (!(req & bit)) continue;
          const holders = cells.filter(k => dom[k] & bit);
          if (holders.length < 1) return false;
          let common = unitsOf[holders[0]];
          for (let h = 1; h < holders.length && common.length; h++) common = common.filter(u => unitsOf[holders[h]].includes(u));
          for (const u of common) for (const j of spec.units[u]) {
            if (!inCage[i].has(j) && dom[j] & bit) { dom[j] &= ~bit; if (!dom[j]) return false; changed = true; }
          }
        }
      }
      // ochiq juftliklar: birlikda ikki katakda bir xil ikki nomzod — boshqa kataklardan olib tashlanadi
      for (const u of spec.units) {
        for (let a = 0; a < u.length; a++) {
          const m = dom[u[a]];
          if (bitCount(m) !== 2) continue;
          for (let b = a + 1; b < u.length; b++) {
            if (dom[u[b]] !== m) continue;
            for (const j of u) if (j !== u[a] && j !== u[b] && dom[j] & m) { dom[j] &= ~m; if (!dom[j]) return false; changed = true; }
          }
        }
      }
    }
    return true;
  };
  const rec = dom => {
    if (count >= limit || aborted) return;
    if (++nodes > budget) { aborted = true; return; }
    if (!propagate(dom)) return;
    let best = -1, bc = 99;
    for (let k = 0; k < T; k++) { const c = bitCount(dom[k]); if (c > 1 && c < bc) { bc = c; best = k; if (c === 2) break; } }
    if (best < 0) { count++; if (sols) sols.push(dom.map(m => 31 - Math.clz32(m))); return; }
    for (let d = 1; d <= N; d++) if (dom[best] >> d & 1) { const nd = dom.slice(); nd[best] = 1 << d; rec(nd); if (count >= limit || aborted) return; }
  };
  rec(given.map(v => (v ? 1 << v : full)));
  return aborted ? -1 : count;
}

// Guruhlarga bo'lish: bog'langan, ichida raqamlar har xil
function makeCages(spec, sol, L, rand) {
  const N = spec.N, T = N * N, id = new Int16Array(T).fill(-1), list = [];
  for (const start of shuffle(Array.from({ length: T }, (_, i) => i), rand)) {
    if (id[start] >= 0) continue;
    const want = randInt(rand, L.size[0], L.size[1]);
    const cells = [start]; id[start] = list.length;
    while (cells.length < want) {
      const used = new Set(cells.map(k => sol[k])), nb = [];
      for (const k of cells) {
        const r = Math.floor(k / N), c = k % N;
        for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
          const rr = r + dr, cc = c + dc, j = rr * N + cc;
          if (rr >= 0 && rr < N && cc >= 0 && cc < N && id[j] < 0 && !used.has(sol[j])) nb.push(j);
        }
      }
      if (!nb.length) break;
      const j = pickOne(rand, nb); id[j] = list.length; cells.push(j);
    }
    list.push(cells);
  }
  // yolg'iz qolgan kataklarni qo'shni guruhga qo'shamiz (raqam takrorlanmasa, guruh max+1 dan oshmasa)
  for (let i = 0; i < list.length; i++) {
    if (list[i].length !== 1 || L.size[0] === 1) continue;
    const k = list[i][0], r = Math.floor(k / N), c = k % N;
    const opts = [];
    for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || rr >= N || cc < 0 || cc >= N) continue;
      const t = id[rr * N + cc];
      if (t !== i && list[t].length && list[t].length < L.size[1] && !list[t].some(j => sol[j] === sol[k])) opts.push(t);
    }
    if (!opts.length) continue;
    const t = opts.reduce((a, b) => (list[a].length <= list[b].length ? a : b));
    list[t].push(k); id[k] = t; list[i] = [];
  }
  return toCages(list.filter(c => c.length), sol);
}
const toCages = (list, sol) => list.map(cells => ({ cells: cells.slice().sort((a, b) => a - b), sum: cells.reduce((s, k) => s + sol[k], 0) }));

// Guruh bog'langanmi
function connected(cells, N) {
  if (cells.length <= 1) return true;
  const set = new Set(cells), seen = new Set([cells[0]]), st = [cells[0]];
  while (st.length) {
    const k = st.pop(), r = Math.floor(k / N), c = k % N;
    for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const rr = r + dr, cc = c + dc, j = rr * N + cc;
      if (rr >= 0 && rr < N && cc >= 0 && cc < N && set.has(j) && !seen.has(j)) { seen.add(j); st.push(j); }
    }
  }
  return seen.size === cells.length;
}

// Ikki yechim farq qiladigan katakni qo'shni guruhga o'tkazib ko'ramiz (yig'indilar o'zgaradi, almashinuv buziladi)
function repair(cg, sols, sol, L, N, rand) {
  const diff = shuffle(sols[0].map((v, k) => (v !== sols[1][k] ? k : -1)).filter(k => k >= 0), rand);
  const cageOf = new Int16Array(N * N);
  cg.forEach((c, i) => c.cells.forEach(k => { cageOf[k] = i; }));
  for (const k of diff) {
    const r = Math.floor(k / N), c = k % N, from = cageOf[k];
    for (const [dr, dc] of shuffle([[0, 1], [1, 0], [0, -1], [-1, 0]], rand)) {
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || rr >= N || cc < 0 || cc >= N) continue;
      const to = cageOf[rr * N + cc];
      if (to === from) continue;
      const a = cg[from].cells.filter(j => j !== k), b = [...cg[to].cells, k];
      if (b.length > L.size[1] || b.some(j => j !== k && sol[j] === sol[k])) continue;
      if (a.length < Math.max(1, L.size[0]) || !connected(a, N)) continue;
      const lists = cg.map(x => x.cells);
      lists[from] = a; lists[to] = b;
      return toCages(lists, sol);
    }
  }
  return null;
}

function build(L, rand) {
  const spec = buildSpec(L.key, 1), T = L.N * L.N;
  for (let attempt = 0; attempt < 60; attempt++) {
    const sol = [];
    countSolutions(spec, new Array(T).fill(0), 1, makeRng(Math.floor(rand() * 1e9) + 1), sol, 200000);
    if (sol.length !== T) continue;
    const cg = makeCages(spec, sol, L, rand);
    if (cg.filter(c => c.cells.length === 1).length > L.singles) continue;
    if (L.size[0] > 1 && cg.some(c => c.cells.length === 1) && L.singles === 0) continue;
    const given = new Array(T).fill(0);
    let ok = false, cur = cg;
    // avval guruhlarni o'zgartirib, keyin (kerak bo'lsa) bir nechta raqam berib yagonalikka erishamiz
    for (let t = 0; t < 12 + L.maxGivens; t++) {
      const sols = [];
      const c = countKiller(spec, cur, given, 2, 15000, sols);
      if (c === 1) { ok = true; break; }
      if (c < 0 || sols.length < 2) break;
      const fixed = t < 12 ? repair(cur, sols, sol, L, L.N, rand) : null;
      if (fixed) { cur = fixed; continue; }
      if (given.filter(Boolean).length >= L.maxGivens) break;
      const diff = shuffle(Array.from({ length: T }, (_, k) => k), rand).find(k => sols[0][k] !== sols[1][k]);
      given[diff] = sol[diff];
    }
    if (ok && cur.filter(c => c.cells.length === 1).length <= L.singles) return { sol, cages: cur, given };
  }
  throw new Error('killer: no puzzle');
}

const RULE = {
  uz: N => `Sudoku qoidasi: har bir qator, ustun va qalin chiziqli blokda 1 dan ${N} gacha raqamlar bir martadan. Shtrix chiziqli guruh burchagidagi son — guruhdagi raqamlar yig'indisi; guruh ichida raqamlar takrorlanmaydi.`,
  ru: N => `Правила судоку: в каждой строке, столбце и блоке с жирной рамкой цифры от 1 до ${N} встречаются по одному разу. Число в углу пунктирной группы — сумма её цифр; внутри группы цифры не повторяются.`,
  en: N => `Sudoku rules: the digits 1 to ${N} appear once in every row, column and bold box. The number in the corner of each dotted cage is the sum of its digits; digits do not repeat inside a cage.`
};

export default {
  id: 'killer',
  skills: ['logic', 'counting'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Killer sudoku', ru: 'Киллер-судоку', en: 'Killer sudoku' },
  desc: {
    uz: "Raqamlar berilmaydi: shtrix chiziqli guruhlardagi yig'indilar bo'yicha sudokuni yechish",
    ru: 'Цифр почти нет: судоку решается по суммам в пунктирных группах',
    en: 'Hardly any digits given: solve the sudoku from the sums in the dotted cages'
  },
  fileBase: { uz: 'Killer sudoku', ru: 'Киллер-судоку', en: 'Killer sudoku' },
  defaultTitle: { uz: "Yig'indilar bo'yicha yech!", ru: 'Реши по суммам!', en: 'Solve by the sums!' },
  options: [{ key: 'level', type: 'level', default: 1 }],
  levelHint: {
    uz: ['4×4, bloklar 2×2', '6×6, bloklar 2×3', "9×9, guruhlar 2–3 katak, bir nechta raqam berilgan", "9×9, guruhlar 2–4 katak, raqam deyarli yo'q"],
    ru: ['4×4, блоки 2×2', '6×6, блоки 2×3', '9×9, группы по 2–3 клетки, есть несколько цифр', '9×9, группы по 2–4 клетки, цифр почти нет'],
    en: ['4×4, 2×2 boxes', '6×6, 2×3 boxes', '9×9, cages of 2–3 cells, a few digits given', '9×9, cages of 2–4 cells, almost no digits']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level];
    const rand = makeRng(seed);
    const count = L.count[opts.perPage === 4 ? 2 : opts.perPage === 2 ? 1 : 0];
    const items = [];
    for (let k = 0; k < count; k++) items.push(build(L, rand));
    return { level, seed, N: L.N, key: L.key, items };
  },

  info(p, lang) {
    const c = p.items.length;
    return { uz: `${c} ta sudoku, ${p.N}×${p.N}`, ru: `Судоку: ${c}, ${p.N}×${p.N}`, en: `${c} sudoku, ${p.N}×${p.N}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box), N = p.N, cnt = p.items.length;
    const rule = measureRule(ctx, (RULE[lang] || RULE.uz)(N), box.w, scale);
    const gap = 10 * scale;
    const H = box.h - rule.h - gap;
    let best = null;
    for (let cols = 1; cols <= Math.min(2, cnt); cols++) {
      const rows = Math.ceil(cnt / cols);
      const cs = Math.min((box.w - (cols - 1) * gap) / (cols * N), (H - (rows - 1) * gap) / (rows * N), 20);
      const score = cs * (cols === 1 && cnt > 2 ? 0.85 : 1);
      if (!best || score > best.score + 0.01) best = { cols, rows, cs, score };
    }
    const { cols, rows, cs } = best, side = N * cs;
    const gridW = cols * side + (cols - 1) * gap, gridH = rows * side + (rows - 1) * gap;
    const gx = box.x + (box.w - gridW) / 2, gy = box.y + Math.max(0, (H - gridH) * 0.35);
    const spec = buildSpec(p.key, 1);
    p.items.forEach((it, idx) => {
      const ox = gx + (idx % cols) * (side + gap), oy = gy + Math.floor(idx / cols) * (side + gap);
      const cageOf = new Int16Array(N * N);
      it.cages.forEach((c, i) => c.cells.forEach(k => { cageOf[k] = i; }));
      ctx.fillStyle = '#fff'; ctx.fillRect(ox, oy, side, side);
      ctx.strokeStyle = '#C3C8D0'; ctx.lineWidth = Math.max(0.2, cs * 0.012);
      ctx.beginPath();
      for (let j = 1; j < N; j++) { ctx.moveTo(ox + j * cs, oy); ctx.lineTo(ox + j * cs, oy + side); ctx.moveTo(ox, oy + j * cs); ctx.lineTo(ox + side, oy + j * cs); }
      ctx.stroke();
      // blok chegaralari
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.6, cs * 0.045); ctx.lineCap = 'square';
      ctx.beginPath();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const k = r * N + c;
        if (c < N - 1 && spec.region[k] !== spec.region[k + 1]) { ctx.moveTo(ox + (c + 1) * cs, oy + r * cs); ctx.lineTo(ox + (c + 1) * cs, oy + (r + 1) * cs); }
        if (r < N - 1 && spec.region[k] !== spec.region[k + N]) { ctx.moveTo(ox + c * cs, oy + (r + 1) * cs); ctx.lineTo(ox + (c + 1) * cs, oy + (r + 1) * cs); }
      }
      ctx.stroke();
      ctx.lineWidth = Math.max(0.8, cs * 0.06); ctx.strokeRect(ox, oy, side, side);
      // guruhlar: katak ichidan surilgan shtrix chiziq
      const ins = cs * 0.09;
      ctx.strokeStyle = '#374151'; ctx.lineWidth = Math.max(0.25, cs * 0.022); ctx.setLineDash([cs * 0.07, cs * 0.05]); ctx.lineCap = 'butt';
      ctx.beginPath();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const k = r * N + c, id = cageOf[k];
        const same = (rr, cc) => rr >= 0 && rr < N && cc >= 0 && cc < N && cageOf[rr * N + cc] === id;
        const x0 = ox + c * cs, y0 = oy + r * cs, x1 = x0 + cs, y1 = y0 + cs;
        const U = same(r - 1, c), D = same(r + 1, c), Lf = same(r, c - 1), R = same(r, c + 1);
        if (!U) { ctx.moveTo(Lf ? x0 : x0 + ins, y0 + ins); ctx.lineTo(R ? x1 : x1 - ins, y0 + ins); }
        if (!D) { ctx.moveTo(Lf ? x0 : x0 + ins, y1 - ins); ctx.lineTo(R ? x1 : x1 - ins, y1 - ins); }
        if (!Lf) { ctx.moveTo(x0 + ins, U ? y0 : y0 + ins); ctx.lineTo(x0 + ins, D ? y1 : y1 - ins); }
        if (!R) { ctx.moveTo(x1 - ins, U ? y0 : y0 + ins); ctx.lineTo(x1 - ins, D ? y1 : y1 - ins); }
        // ichki burchaklarda bo'shliq qolmasin
        if (U && Lf && !same(r - 1, c - 1)) { ctx.moveTo(x0, y0 + ins); ctx.lineTo(x0 + ins, y0 + ins); ctx.lineTo(x0 + ins, y0); }
        if (U && R && !same(r - 1, c + 1)) { ctx.moveTo(x1, y0 + ins); ctx.lineTo(x1 - ins, y0 + ins); ctx.lineTo(x1 - ins, y0); }
        if (D && Lf && !same(r + 1, c - 1)) { ctx.moveTo(x0, y1 - ins); ctx.lineTo(x0 + ins, y1 - ins); ctx.lineTo(x0 + ins, y1); }
        if (D && R && !same(r + 1, c + 1)) { ctx.moveTo(x1, y1 - ins); ctx.lineTo(x1 - ins, y1 - ins); ctx.lineTo(x1 - ins, y1); }
      }
      ctx.stroke(); ctx.setLineDash([]);
      // yig'indilar — guruhning eng yuqori-chap katagida, oq fon ustida
      it.cages.forEach(c => {
        const k = c.cells[0], x = ox + (k % N) * cs, y = oy + Math.floor(k / N) * cs;
        const fs = cs * 0.25; font(ctx, fs, 800);
        const w = ctx.measureText(String(c.sum)).width;
        ctx.fillStyle = '#fff'; ctx.fillRect(x + ins * 0.6, y + ins * 0.6, w + fs * 0.3, fs * 1.05);
        ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(String(c.sum), x + ins * 0.6 + fs * 0.15, y + ins * 0.6 + fs * 0.08);
      });
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let k = 0; k < N * N; k++) {
        const v = it.given[k] || (showSolution ? it.sol[k] : 0);
        if (!v) continue;
        font(ctx, cs * 0.5, it.given[k] ? 900 : 700); ctx.fillStyle = it.given[k] ? INK : ANSWER;
        ctx.fillText(String(v), ox + (k % N) * cs + cs * 0.54, oy + Math.floor(k / N) * cs + cs * 0.6);
      }
    });
    drawRule(ctx, rule, box.x + box.w / 2, gy + gridH + gap);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const n = p.items.reduce((s, it) => s + it.given.filter(v => !v).length, 0);
    const T = { uz: `To'ldiriladigan kataklar: ${n} ta`, ru: `Клеток заполнить: ${n}`, en: `Cells to fill: ${n}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const L = LEVELS[p.level], spec = buildSpec(p.key, 1), N = p.N;
    p.items.forEach((it, i) => {
      for (const u of spec.units) if (new Set(u.map(k => it.sol[k])).size !== N) { problems.push(`#${i}: bad solution`); break; }
      const covered = new Set();
      for (const c of it.cages) {
        c.cells.forEach(k => covered.add(k));
        if (c.cells.reduce((s, k) => s + it.sol[k], 0) !== c.sum) problems.push(`#${i}: cage sum`);
        if (new Set(c.cells.map(k => it.sol[k])).size !== c.cells.length) problems.push(`#${i}: cage repeat`);
        if (c.cells.length > L.size[1]) problems.push(`#${i}: cage too big`);
      }
      if (covered.size !== N * N) problems.push(`#${i}: cages do not cover`);
      if (it.given.some((v, k) => v && v !== it.sol[k])) problems.push(`#${i}: given mismatch`);
      if (it.given.filter(Boolean).length > L.maxGivens) problems.push(`#${i}: too many givens`);
      if (countKiller(spec, it.cages, it.given, 2, 200000) !== 1) problems.push(`#${i}: not unique`);
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-killer" aria-hidden="true"><defs><linearGradient id="cg-killer" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9a9e"/><stop offset="1" stop-color="#fecfef"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-killer)"/><rect x="36" y="36" width="128" height="128" fill="#fff"/><path d="M68 36v128M132 36v128M36 68h128M36 132h128" stroke="#C3C8D0" stroke-width="2"/><path d="M100 36v128M36 100h128" stroke="#111827" stroke-width="4"/><rect x="36" y="36" width="128" height="128" fill="none" stroke="#111827" stroke-width="5"/><g fill="none" stroke="#374151" stroke-width="2.2" stroke-dasharray="6 4"><path d="M41 41h86v22H73v32H41z"/><path d="M137 41h22v86h-22z"/><path d="M41 105h54v54H41z"/><path d="M73 73h54v22h-22v32h-32z" opacity="0"/></g><g font-family="Nunito, sans-serif" font-weight="900" font-size="14" fill="#111827"><text x="44" y="54">7</text><text x="140" y="54">8</text><text x="44" y="118">10</text></g><g font-family="Nunito, sans-serif" font-weight="900" font-size="24" text-anchor="middle" fill="#DC2626"><text class="kl-a" x="52" y="62">1</text><text class="kl-b" x="84" y="62">2</text><text class="kl-c" x="116" y="62">4</text></g></svg>`
};
