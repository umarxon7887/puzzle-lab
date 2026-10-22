// numpath.js — «Sonlar yo'li» (Числовая змейка / Number path, «Numbrix») generatori.
// To'rga 1 dan N gacha sonlar shunday yoziladiki, har bir keyingi son oldingisining yonidagi (chap, o'ng,
// yuqori yoki pastki) katakda turadi — butun to'r bitta uzluksiz yo'l bilan to'ladi. Sonlarning bir qismi berilgan.
// Kafolat (check()): yechuvchi barcha yechimlarni sanaydi — yechim aynan bitta; 1 va N doim berilgan.

import { makeRng, randInt, shuffle } from '../core/rng.js';
import { INK, MUTE, ANSWER, font } from '../core/draw.js';
import { scaleOf, measureRule, drawRule, ruPlural } from '../core/parts.js';

// R×C — to'r; keep — berilgan sonlar soni (taxminan); count — [1 tadan, 2 tadan, 4 tadan] joylashganda nechta to'r
const LEVELS = [
  { R: 4, C: 4, keep: 8, count: [4, 2, 1] },
  { R: 5, C: 5, keep: 10, count: [4, 2, 1] },
  { R: 6, C: 6, keep: 12, count: [2, 1, 1] },
  { R: 7, C: 7, keep: 14, count: [2, 1, 1] }
];
const NB = [[0, 1], [1, 0], [0, -1], [-1, 0]];

// Butun to'rni bir marta aylanib chiqadigan tasodifiy yo'l (Varnsdorf qoidasi bilan chuqur qidiruv)
function hamiltonPath(R, C, rand) {
  const N = R * C;
  for (let attempt = 0; attempt < 200; attempt++) {
    const order = new Int16Array(N).fill(-1);
    const start = randInt(rand, 0, N - 1);
    const path = [start];
    order[start] = 0;
    let budget = 20000;
    const free = k => order[k] < 0;
    const nbs = k => { const r = Math.floor(k / C), c = k % C, out = []; for (const [dr, dc] of NB) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < R && cc >= 0 && cc < C) out.push(rr * C + cc); } return out; };
    const deg = k => nbs(k).filter(free).length;
    const dfs = () => {
      if (path.length === N) return true;
      if (--budget < 0) return false;
      const k = path[path.length - 1];
      const cand = shuffle(nbs(k).filter(free), rand).sort((a, b) => deg(a) - deg(b));
      for (const nk of cand) {
        order[nk] = path.length; path.push(nk);
        if (dfs()) return true;
        path.pop(); order[nk] = -1;
      }
      return false;
    };
    if (dfs()) return path;
  }
  return null;
}

// Yechimlar soni (limit gacha). given: Map(son -> katak), 1 doim berilgan
export function countSolutions(R, C, given, limit = 2) {
  const N = R * C;
  const cellOf = new Int16Array(N + 1).fill(-1);
  const used = new Uint8Array(N);
  for (const [v, k] of given) { cellOf[v] = k; }
  const fixedCells = new Set(given.values());
  // Keyingi berilgan son (masofani tekshirish uchun)
  const nextGiven = new Int16Array(N + 2).fill(0);
  let ng = 0;
  for (let v = N; v >= 1; v--) { nextGiven[v] = ng; if (cellOf[v] >= 0) ng = v; }
  let count = 0, nodes = 0;
  const dist = (a, b) => Math.abs(Math.floor(a / C) - Math.floor(b / C)) + Math.abs((a % C) - (b % C));
  const place = (v, k) => {
    if (count >= limit || ++nodes > 400000) return;
    used[k] = 1;
    if (v === N) { count++; used[k] = 0; return; }
    const g = nextGiven[v];
    const r = Math.floor(k / C), c = k % C;
    if (cellOf[v + 1] >= 0) {
      const nk = cellOf[v + 1];
      if (dist(k, nk) === 1 && !used[nk]) place(v + 1, nk);
    } else {
      for (const [dr, dc] of NB) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || rr >= R || cc < 0 || cc >= C) continue;
        const nk = rr * C + cc;
        if (used[nk] || fixedCells.has(nk)) continue;
        if (g) { const d = dist(nk, cellOf[g]); if (d > g - v - 1 || (g - v - 1 - d) % 2) continue; }
        place(v + 1, nk);
        if (count >= limit) break;
      }
    }
    used[k] = 0;
  };
  place(1, cellOf[1]);
  return nodes > 400000 ? limit : count;          // juda uzoq qidirsa — ishonchsiz deb hisoblaymiz
}

function build(L, rand) {
  const { R, C } = L, N = R * C;
  for (let attempt = 0; attempt < 60; attempt++) {
    const path = hamiltonPath(R, C, rand);
    if (!path) continue;
    const given = new Map(path.map((k, i) => [i + 1, k]));
    // Sonlarni birma-bir olib tashlaymiz, yechim yagona qolsa — olib tashlangan bo'lib qoladi
    for (const v of shuffle(Array.from({ length: N - 2 }, (_, i) => i + 2), rand)) {
      if (given.size <= L.keep) break;
      const k = given.get(v);
      given.delete(v);
      if (countSolutions(R, C, given, 2) !== 1) given.set(v, k);
    }
    if (given.size > L.keep + 2) continue;
    return { path, given: [...given.keys()].sort((a, b) => a - b) };
  }
  throw new Error('numpath: no puzzle');
}

const RULE = {
  uz: n => `Bo'sh kataklarga sonlarni shunday yozki, 1 dan ${n} gacha har bir keyingi son oldingisining yonidagi, ustidagi yoki ostidagi katakda bo'lsin (qiyshiq emas). Hamma kataklar to'ladi.`,
  ru: n => `Впиши числа в пустые клетки так, чтобы от 1 до ${n} каждое следующее число стояло рядом с предыдущим — слева, справа, сверху или снизу (не по диагонали). Заполнятся все клетки.`,
  en: n => `Fill the empty cells so that from 1 to ${n} each number sits next to the one before it — left, right, above or below (not diagonally). Every cell gets a number.`
};

export default {
  id: 'numpath',
  skills: ['logic', 'counting', 'spatial'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: "Sonlar yo'li", ru: 'Числовая змейка', en: 'Number path' },
  desc: {
    uz: "1 dan N gacha sonlar qo'shni kataklar bo'ylab ilondek joylashadi; bir qismi berilgan, qolganini topish",
    ru: 'Числа от 1 до N идут змейкой по соседним клеткам; часть дана, остальные найти',
    en: 'Numbers 1 to N snake through neighbouring cells; some are given, find the rest'
  },
  fileBase: { uz: "Sonlar yo'li", ru: 'Числовая змейка', en: 'Number path' },
  defaultTitle: { uz: "Sonlar yo'lini tikla!", ru: 'Восстанови змейку!', en: 'Complete the number path!' },
  options: [{ key: 'level', type: 'level', default: 1 }],
  levelHint: {
    uz: ["4×4, 1–16, sonlarning yarmi berilgan", '5×5, 1–25', '6×6, 1–36', '7×7, 1–49, berilgan sonlar kam'],
    ru: ['4×4, 1–16, дана половина чисел', '5×5, 1–25', '6×6, 1–36', '7×7, 1–49, мало подсказок'],
    en: ['4×4, 1–16, half the numbers given', '5×5, 1–25', '6×6, 1–36', '7×7, 1–49, few numbers given']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level];
    const rand = makeRng(seed);
    const count = L.count[opts.perPage === 4 ? 2 : opts.perPage === 2 ? 1 : 0];
    const items = [];
    for (let k = 0; k < count; k++) items.push(build(L, rand));
    return { level, seed, R: L.R, C: L.C, items };
  },

  info(p, lang) {
    const c = p.items.length;
    return { uz: `${c} ta to'r, ${p.R}×${p.C}`, ru: `${c} ${ruPlural(c, 'сетка', 'сетки', 'сеток')} ${p.R}×${p.C}`, en: `${c} grid${c > 1 ? 's' : ''}, ${p.R}×${p.C}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box);
    const N = p.R * p.C;
    const rule = measureRule(ctx, (RULE[lang] || RULE.uz)(N), box.w, scale);
    const gap = 8 * scale, cnt = p.items.length;
    const H = box.h - rule.h - gap;
    let best = null;
    for (let cols = 1; cols <= Math.min(2, cnt); cols++) {
      const rows = Math.ceil(cnt / cols);
      const cs = Math.min((box.w - (cols - 1) * gap * 2) / (cols * p.C), (H - (rows - 1) * gap) / (rows * p.R), 20);
      const score = cs * (cols === 1 && cnt > 2 ? 0.85 : 1);
      if (!best || score > best.score + 0.01) best = { cols, rows, cs, score };
    }
    const { cols, rows, cs } = best, W = p.C * cs, Hh = p.R * cs;
    const gridW = cols * W + (cols - 1) * gap * 2, gridH = rows * Hh + (rows - 1) * gap;
    const gx = box.x + (box.w - gridW) / 2, gy = box.y + Math.max(0, (H - gridH) * 0.35);
    p.items.forEach((it, idx) => {
      const ox = gx + (idx % cols) * (W + gap * 2), oy = gy + Math.floor(idx / cols) * (Hh + gap);
      const givenSet = new Set(it.given);
      it.path.forEach((k, i) => {
        if (givenSet.has(i + 1)) { ctx.fillStyle = '#EEF2FF'; ctx.fillRect(ox + (k % p.C) * cs, oy + Math.floor(k / p.C) * cs, cs, cs); }
      });
      if (showSolution) {
        ctx.save(); ctx.strokeStyle = ANSWER; ctx.globalAlpha = 0.35; ctx.lineWidth = Math.max(0.5, cs * 0.06); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.beginPath();
        it.path.forEach((k, i) => { const x = ox + (k % p.C) * cs + cs / 2, y = oy + Math.floor(k / p.C) * cs + cs / 2; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
        ctx.stroke(); ctx.restore();
      }
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.25, Math.min(0.45, cs * 0.025));
      ctx.beginPath();
      for (let j = 1; j < p.C; j++) { ctx.moveTo(ox + j * cs, oy); ctx.lineTo(ox + j * cs, oy + Hh); }
      for (let j = 1; j < p.R; j++) { ctx.moveTo(ox, oy + j * cs); ctx.lineTo(ox + W, oy + j * cs); }
      ctx.stroke();
      ctx.lineWidth = Math.max(0.6, Math.min(0.9, cs * 0.045)); ctx.strokeRect(ox, oy, W, Hh);
      it.path.forEach((k, i) => {
        const v = i + 1, given = givenSet.has(v);
        if (!given && !showSolution) return;
        font(ctx, cs * (v > 9 ? 0.42 : 0.48), given ? 800 : 700);
        ctx.fillStyle = given ? INK : ANSWER; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(v), ox + (k % p.C) * cs + cs / 2, oy + Math.floor(k / p.C) * cs + cs / 2 + cs * 0.03);
      });
    });
    drawRule(ctx, rule, box.x + box.w / 2, gy + gridH + gap);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const n = p.items.reduce((s, it) => s + p.R * p.C - it.given.length, 0);
    const T = { uz: `Bo'sh kataklar: ${n} ta`, ru: `Пустых клеток: ${n}`, en: `Empty cells: ${n}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const { R, C } = p, N = R * C;
    p.items.forEach((it, k) => {
      if (it.path.length !== N || new Set(it.path).size !== N) problems.push(`#${k}: path does not cover the grid`);
      it.path.forEach((c, i) => { if (i) { const a = it.path[i - 1]; if (Math.abs(Math.floor(a / C) - Math.floor(c / C)) + Math.abs((a % C) - (c % C)) !== 1) problems.push(`#${k}: step ${i}`); } });
      if (!it.given.includes(1) || !it.given.includes(N)) problems.push(`#${k}: 1 and N must be given`);
      const given = new Map(it.given.map(v => [v, it.path[v - 1]]));
      if (countSolutions(R, C, given, 2) !== 1) problems.push(`#${k}: solution not unique`);
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-numpath" aria-hidden="true"><defs><linearGradient id="cg-numpath" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5ee7df"/><stop offset="1" stop-color="#b490ca"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-numpath)"/><rect x="40" y="40" width="120" height="120" rx="6" fill="#fff" stroke="#312e81" stroke-width="4"/><path d="M80 40v120M120 40v120M40 80h120M40 120h120" stroke="#312e81" stroke-width="2.5"/><path class="np-path" d="M60 60 H140 V100 H60 V140 H140" fill="none" stroke="#DC2626" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" pathLength="100" opacity=".35"/><g font-family="Nunito, sans-serif" font-weight="900" font-size="24" text-anchor="middle" fill="#312e81"><text x="60" y="69">1</text><text x="140" y="69">3</text><text x="100" y="109">5</text><text x="140" y="149">9</text></g><g font-family="Nunito, sans-serif" font-weight="900" font-size="24" text-anchor="middle" fill="#DC2626"><text class="np-a" x="100" y="69">2</text><text class="np-b" x="60" y="149">7</text></g></svg>`
};
