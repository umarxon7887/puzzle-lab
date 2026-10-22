// kakuro.js — «Kakuro» (Какуро / Kakuro) generatori: yig'indili krossvord.
// Oq kataklarga raqamlar yoziladi. Kulrang katakdagi son — o'ngdagi (yuqori o'ng burchakda) yoki pastdagi
// (pastki chap burchakda) oq kataklar raqamlarining yig'indisi. Bitta yig'indida raqamlar takrorlanmaydi.
// Kafolat (check()): yechuvchi barcha yechimlarni sanaydi — yechim aynan bitta (kerak bo'lsa, ba'zi raqamlar
// oldindan yozib qo'yiladi).

import { makeRng, randInt, shuffle } from '../core/rng.js';
import { INK, MUTE, ANSWER, font } from '../core/draw.js';
import { scaleOf, measureRule, drawRule, ruPlural } from '../core/parts.js';

// R×C — to'r (birinchi qator va ustun — yig'indilar); D — eng katta raqam; blacks — ichkaridagi qo'shimcha qora kataklar;
// maxRun — eng uzun qator; count — [1 tadan, 2 tadan, 4 tadan] joylashganda nechta to'r
const LEVELS = [
  { R: 4, C: 4, D: 6, blacks: 0, maxRun: 3, count: [4, 2, 1] },
  { R: 5, C: 5, D: 9, blacks: 2, maxRun: 4, count: [4, 2, 1] },
  { R: 6, C: 6, D: 9, blacks: 2, maxRun: 4, count: [2, 1, 1] },
  { R: 7, C: 7, D: 9, blacks: 4, maxRun: 5, count: [1, 1, 1] }
];

// Oq/qora naqsh: har oq katak gorizontal va vertikal 2+ uzunlikdagi qatorlarda, qatorlar maxRun dan oshmaydi
function makePattern(L, rand) {
  const { R, C } = L;
  for (let attempt = 0; attempt < 400; attempt++) {
    const white = Array.from({ length: R }, (_, r) => Array.from({ length: C }, (_, c) => r > 0 && c > 0));
    const setBlack = (r, c) => { white[r][c] = false; const r2 = R - r, c2 = C - c; if (r2 >= 1 && c2 >= 1) white[r2][c2] = false; };
    // Bir nechta tasodifiy qora katak (xilma-xillik uchun)
    for (let t = 0; t < L.blacks; t++) setBlack(randInt(rand, 1, R - 1), randInt(rand, 1, C - 1));
    // Tuzatish: juda uzun qatorlarni bo'lish, 1 katakli qatorlarni yopish
    for (let pass = 0; pass < 60; pass++) {
      let changed = false;
      for (const run of runsOf(white)) {
        const n = run.cells.length;
        if (n > L.maxRun) {
          // ikkala bo'lak ham 2+ bo'ladigan joydan bo'lamiz
          const opts = []; for (let i = 2; i <= n - 3; i++) opts.push(i);
          const i = opts.length ? opts[Math.floor(rand() * opts.length)] : Math.floor(n / 2);
          setBlack(...run.cells[i]); changed = true; break;
        }
        if (n === 1) { setBlack(...run.cells[0]); changed = true; break; }
      }
      if (!changed) break;
    }
    const whites = white.flat().filter(Boolean).length;
    if (whites < (R - 1) * (C - 1) * 0.6) continue;
    if (!validPattern(white, L)) continue;
    return white;
  }
  return null;
}
function runsOf(white) {
  const R = white.length, C = white[0].length, runs = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    if (white[r][c]) continue;
    // gorizontal: (r, c) dan o'ngga
    const h = []; for (let k = c + 1; k < C && white[r][k]; k++) h.push([r, k]);
    if (h.length) runs.push({ dir: 'h', clue: [r, c], cells: h });
    const v = []; for (let k = r + 1; k < R && white[k][c]; k++) v.push([k, c]);
    if (v.length) runs.push({ dir: 'v', clue: [r, c], cells: v });
  }
  return runs;
}
function validPattern(white, L) {
  const runs = runsOf(white);
  if (runs.some(run => run.cells.length < 2 || run.cells.length > L.maxRun)) return false;
  // har oq katak ikkala yo'nalishda ham qatorda
  const R = white.length, C = white[0].length;
  const inH = new Set(), inV = new Set();
  for (const run of runs) for (const [r, c] of run.cells) (run.dir === 'h' ? inH : inV).add(r * C + c);
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (white[r][c] && (!inH.has(r * C + c) || !inV.has(r * C + c))) return false;
  // oq kataklar bog'langan bo'lsin
  const cells = []; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (white[r][c]) cells.push(r * C + c);
  const seen = new Set([cells[0]]), q = [cells[0]];
  while (q.length) { const k = q.pop(), r = Math.floor(k / C), c = k % C; for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < R && cc >= 0 && cc < C && white[rr][cc] && !seen.has(rr * C + cc)) { seen.add(rr * C + cc); q.push(rr * C + cc); } } }
  return seen.size === cells.length;
}

// Yechuvchi: given — Map(katak -> raqam). Natija: { count, sols } (limit gacha)
export function solveKakuro(white, runs, sums, D, given, limit = 2) {
  const R = white.length, C = white[0].length;
  const cells = []; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (white[r][c]) cells.push(r * C + c);
  const runOf = new Map();
  runs.forEach((run, i) => run.cells.forEach(([r, c]) => { const k = r * C + c; if (!runOf.has(k)) runOf.set(k, []); runOf.get(k).push(i); }));
  const val = new Map(given);
  const used = runs.map(() => 0), sum = runs.map(() => 0), filled = runs.map(() => 0);
  for (const [k, v] of given) for (const i of runOf.get(k)) { used[i] |= 1 << v; sum[i] += v; filled[i]++; }
  const order = cells.filter(k => !given.has(k));
  const sols = [];
  let nodes = 0;
  // qolgan n ta turli raqamning eng kichik/katta yig'indisi
  const fits = (i, extra) => {
    const left = runs[i].cells.length - filled[i], need = sums[i] - sum[i];
    if (left === 0) return need === 0;
    let lo = 0, hi = 0, cnt = 0;
    for (let d = 1; d <= D && cnt < left; d++) if (!(used[i] >> d & 1)) { lo += d; cnt++; }
    if (cnt < left) return false;
    cnt = 0; for (let d = D; d >= 1 && cnt < left; d--) if (!(used[i] >> d & 1)) { hi += d; cnt++; }
    void extra;
    return need >= lo && need <= hi;
  };
  const rec = idx => {
    if (sols.length >= limit || ++nodes > 300000) return;
    if (idx === order.length) { sols.push(new Map(val)); return; }
    const k = order[idx], rs = runOf.get(k);
    for (let d = 1; d <= D; d++) {
      if (rs.some(i => used[i] >> d & 1)) continue;
      for (const i of rs) { used[i] |= 1 << d; sum[i] += d; filled[i]++; }
      if (rs.every(i => fits(i))) { val.set(k, d); rec(idx + 1); val.delete(k); }
      for (const i of rs) { used[i] &= ~(1 << d); sum[i] -= d; filled[i]--; }
      if (sols.length >= limit) break;
    }
  };
  rec(0);
  return { count: nodes > 300000 ? limit : sols.length, sols };
}

function build(L, rand) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const white = makePattern(L, rand);
    if (!white) continue;
    const runs = runsOf(white), C = L.C;
    // Raqamlar bilan to'ldirish (takrorsiz)
    const fill = solveKakuroFill(white, runs, L.D, rand);
    if (!fill) continue;
    const sums = runs.map(run => run.cells.reduce((s, [r, c]) => s + fill.get(r * C + c), 0));
    const given = new Map();
    let ok = false;
    for (let g = 0; g < 20; g++) {
      const res = solveKakuro(white, runs, sums, L.D, given, 2);
      if (res.count === 1) { ok = true; break; }
      if (res.sols.length < 2) break;                         // qidiruv juda uzoq — boshqa to'r
      // Ikki yechim farq qiladigan katakni oldindan yozib qo'yamiz
      const diff = [...res.sols[0].keys()].filter(k => res.sols[0].get(k) !== res.sols[1].get(k));
      const k = diff[Math.floor(rand() * diff.length)];
      given.set(k, fill.get(k));
    }
    if (!ok) continue;
    if (given.size > Math.max(2, Math.floor(fill.size * 0.3))) continue;
    return { white, runs: runs.map(r => ({ dir: r.dir, clue: r.clue, cells: r.cells })), sums, fill: [...fill.entries()], given: [...given.keys()] };
  }
  throw new Error('kakuro: no puzzle');
}
// Tasodifiy to'ldirish: har qatorda raqamlar takrorlanmaydi
function solveKakuroFill(white, runs, D, rand) {
  const R = white.length, C = white[0].length;
  const cells = []; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (white[r][c]) cells.push(r * C + c);
  const runOf = new Map();
  runs.forEach((run, i) => run.cells.forEach(([r, c]) => { const k = r * C + c; if (!runOf.has(k)) runOf.set(k, []); runOf.get(k).push(i); }));
  const used = runs.map(() => 0), val = new Map();
  let nodes = 0;
  const rec = idx => {
    if (idx === cells.length) return true;
    if (++nodes > 50000) return false;
    const k = cells[idx], rs = runOf.get(k);
    for (const d of shuffle(Array.from({ length: D }, (_, i) => i + 1), rand)) {
      if (rs.some(i => used[i] >> d & 1)) continue;
      rs.forEach(i => { used[i] |= 1 << d; }); val.set(k, d);
      if (rec(idx + 1)) return true;
      rs.forEach(i => { used[i] &= ~(1 << d); }); val.delete(k);
    }
    return false;
  };
  return rec(0) ? val : null;
}

const RULE = {
  uz: d => `Oq kataklarga 1 dan ${d} gacha raqamlar yoz. Kulrang katakdagi son — uning o'ng tomonidagi (yuqori son) yoki ostidagi (pastki son) oq kataklar raqamlarining yig'indisi. Bitta yig'indida raqamlar takrorlanmaydi.`,
  ru: d => `Впиши в белые клетки цифры от 1 до ${d}. Число в серой клетке — сумма цифр в белых клетках справа от неё (верхнее число) или под ней (нижнее число). В одной сумме цифры не повторяются.`,
  en: d => `Write digits 1 to ${d} in the white cells. A number in a grey cell is the sum of the white cells to its right (upper number) or below it (lower number). Digits do not repeat within one sum.`
};

export default {
  id: 'kakuro',
  skills: ['logic', 'counting'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Kakuro', ru: 'Какуро', en: 'Kakuro' },
  desc: {
    uz: "Yig'indili krossvord: bir yo'nalishdagi raqamlar takrorlanmaydi va berilgan yig'indini beradi",
    ru: 'Кроссворд с суммами: цифры в одной сумме не повторяются',
    en: 'A crossword of sums: digits in one sum never repeat'
  },
  fileBase: { uz: 'Kakuro', ru: 'Какуро', en: 'Kakuro' },
  defaultTitle: { uz: "Yig'indilarni to'ldir!", ru: 'Заполни суммы!', en: 'Fill in the sums!' },
  options: [{ key: 'level', type: 'level', default: 1 }],
  levelHint: {
    uz: ["3×3 oq kataklar, 1 dan 6 gacha raqamlar", "4×4, 1 dan 9 gacha", "5×5, kulrang kataklar bilan", "6×6, katta to'r"],
    ru: ['3×3 белых клетки, цифры от 1 до 6', '4×4, цифры от 1 до 9', '5×5, с серыми клетками', '6×6, большая сетка'],
    en: ['3×3 white cells, digits 1 to 6', '4×4, digits 1 to 9', '5×5 with grey cells', '6×6, big grid']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level];
    const rand = makeRng(seed);
    const count = L.count[opts.perPage === 4 ? 2 : opts.perPage === 2 ? 1 : 0];
    const items = [];
    for (let k = 0; k < count; k++) items.push(build(L, rand));
    return { level, seed, R: L.R, C: L.C, D: L.D, items };
  },

  info(p, lang) {
    const c = p.items.length;
    return { uz: `${c} ta kakuro, ${p.R - 1}×${p.C - 1}`, ru: `${c} ${ruPlural(c, 'какуро', 'какуро', 'какуро')}, ${p.R - 1}×${p.C - 1}`, en: `${c} kakuro, ${p.R - 1}×${p.C - 1}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box);
    const rule = measureRule(ctx, (RULE[lang] || RULE.uz)(p.D), box.w, scale);
    const gap = 8 * scale, cnt = p.items.length;
    const H = box.h - rule.h - gap;
    const cols = cnt >= 2 ? 2 : 1, rows = Math.ceil(cnt / cols);
    const cs = Math.min((box.w - (cols - 1) * gap * 2) / (cols * p.C), (H - (rows - 1) * gap) / (rows * p.R), 19);
    const W = p.C * cs, Hh = p.R * cs;
    const gridW = cols * W + (cols - 1) * gap * 2, gridH = rows * Hh + (rows - 1) * gap;
    const gx = box.x + (box.w - gridW) / 2, gy = box.y + Math.max(0, (H - gridH) * 0.35);
    p.items.forEach((it, idx) => {
      const ox = gx + (idx % cols) * (W + gap * 2), oy = gy + Math.floor(idx / cols) * (Hh + gap);
      const fill = new Map(it.fill), given = new Set(it.given);
      for (let r = 0; r < p.R; r++) for (let c = 0; c < p.C; c++) {
        const x = ox + c * cs, y = oy + r * cs;
        if (!it.white[r][c]) { ctx.fillStyle = '#D1D5DB'; ctx.fillRect(x, y, cs, cs); continue; }
        const k = r * p.C + c;
        if (given.has(k) || showSolution) {
          font(ctx, cs * 0.55, given.has(k) ? 800 : 700);
          ctx.fillStyle = given.has(k) ? INK : ANSWER; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(String(fill.get(k)), x + cs / 2, y + cs / 2 + cs * 0.03);
        }
      }
      // yig'indilar
      const clueAt = new Map();
      it.runs.forEach((run, i) => { const key = run.clue[0] * p.C + run.clue[1]; if (!clueAt.has(key)) clueAt.set(key, {}); clueAt.get(key)[run.dir] = it.sums[i]; });
      for (const [key, cl] of clueAt) {
        const r = Math.floor(key / p.C), c = key % p.C, x = ox + c * cs, y = oy + r * cs;
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.25, cs * 0.02);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + cs, y + cs); ctx.stroke();
        font(ctx, cs * 0.3, 800); ctx.fillStyle = INK; ctx.textBaseline = 'middle';
        if (cl.h !== undefined) { ctx.textAlign = 'right'; ctx.fillText(String(cl.h), x + cs * 0.92, y + cs * 0.3); }
        if (cl.v !== undefined) { ctx.textAlign = 'left'; ctx.fillText(String(cl.v), x + cs * 0.08, y + cs * 0.74); }
      }
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.3, Math.min(0.5, cs * 0.03));
      ctx.beginPath();
      for (let j = 1; j < p.C; j++) { ctx.moveTo(ox + j * cs, oy); ctx.lineTo(ox + j * cs, oy + Hh); }
      for (let j = 1; j < p.R; j++) { ctx.moveTo(ox, oy + j * cs); ctx.lineTo(ox + W, oy + j * cs); }
      ctx.stroke();
      ctx.lineWidth = Math.max(0.6, Math.min(0.9, cs * 0.05)); ctx.strokeRect(ox, oy, W, Hh);
    });
    drawRule(ctx, rule, box.x + box.w / 2, gy + gridH + gap);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const n = p.items.reduce((s, it) => s + it.fill.length - it.given.length, 0);
    const T = { uz: `Bo'sh kataklar: ${n} ta`, ru: `Пустых клеток: ${n}`, en: `Empty cells: ${n}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const L = LEVELS[p.level];
    p.items.forEach((it, k) => {
      if (!validPattern(it.white, L)) problems.push(`#${k}: bad pattern`);
      const fill = new Map(it.fill);
      it.runs.forEach((run, i) => {
        const ds = run.cells.map(([r, c]) => fill.get(r * p.C + c));
        if (new Set(ds).size !== ds.length) problems.push(`#${k}: repeat in a sum`);
        if (ds.reduce((a, b) => a + b, 0) !== it.sums[i]) problems.push(`#${k}: wrong sum`);
        if (ds.some(d => d < 1 || d > p.D)) problems.push(`#${k}: digit out of range`);
      });
      const given = new Map(it.given.map(g => [g, fill.get(g)]));
      const res = solveKakuro(it.white, it.runs, it.sums, p.D, given, 2);
      if (res.count !== 1) problems.push(`#${k}: not unique`);
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-kakuro" aria-hidden="true"><defs><linearGradient id="cg-kakuro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a1c4fd"/><stop offset="1" stop-color="#c2e9fb"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-kakuro)"/><rect x="34" y="34" width="132" height="132" fill="#fff" stroke="#111827" stroke-width="4"/><g fill="#D1D5DB"><rect x="34" y="34" width="44" height="44"/><rect x="78" y="34" width="44" height="44"/><rect x="122" y="34" width="44" height="44"/><rect x="34" y="78" width="44" height="44"/><rect x="34" y="122" width="44" height="44"/></g><path d="M34 34l44 44M78 34l44 44M122 34l44 44M34 78l44 44M34 122l44 44M78 34v132M122 34v132M34 78h132M34 122h132" stroke="#111827" stroke-width="2.5"/><g font-family="Nunito, sans-serif" font-weight="900" font-size="14" fill="#111827"><text x="86" y="72">4</text><text x="130" y="72">7</text><text x="66" y="92" text-anchor="end">3</text><text x="66" y="136" text-anchor="end">8</text></g><g font-family="Nunito, sans-serif" font-weight="900" font-size="24" text-anchor="middle" fill="#DC2626"><text class="kk-a" x="100" y="109">1</text><text x="144" y="109" class="kk-b">2</text><text x="100" y="153" class="kk-c">3</text><text x="144" y="153" class="kk-d">5</text></g></svg>`
};
