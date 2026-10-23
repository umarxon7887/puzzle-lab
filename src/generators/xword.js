// xword.js — «Savolli krossvord» (Кроссворд / Crossword) generatori.
// Oson va O'rta — savol o'rniga rasm (rasmlar kutubxonasi, nomlari uch tilda); Qiyin va Juda qiyin — matnli
// ta'riflar (xword-clues.js). So'zlar bir-birini kesib o'tadi, hamma so'z bitta to'rga bog'langan.
// Kafolat (check()): kesishmalarda harflar bir xil; to'rdagi har bir 2+ harfli qator/ustun — aynan bitta so'z
// (yonma-yon tegib turgan ortiqcha «so'z» yo'q); to'r bog'langan; ta'rifda javob so'zi yo'q.

import { makeRng, shuffle } from '../core/rng.js';
import { INK, MUTE, ANSWER, font, wrapLines } from '../core/draw.js';
import { scaleOf, measureRule, drawRule } from '../core/parts.js';
import { ICONS } from '../core/picture-data.js';
import { picPolys, picMap } from '../core/pictures.js';
import { tokens, langOf, letterBox, hasNG } from './wordkit.js';
import { CLUES } from './xword-clues.js';

// pics — rasmli savollar; n — so'zlar [1, 2, 4 tadan]; len — so'z uzunligi; first — birinchi harf yozilgan;
// max — to'r o'lchami chegarasi
const LEVELS = [
  { pics: true, n: [9, 7, 5], len: [3, 5], first: true, max: 11 },
  { pics: true, n: [11, 8, 6], len: [3, 7], max: 13 },
  { n: [12, 9, 6], len: [3, 8], max: 14 },
  { n: [15, 10, 7], len: [4, 11], max: 16 }
];

const single = s => !/[\s-]/.test(s);
const poolCache = {};
function poolOf(lang, pics) {
  const k = lang + pics;
  if (!poolCache[k]) {
    poolCache[k] = Object.keys(ICONS).filter(key => single(ICONS[key][lang] || '') && !hasNG(ICONS[key][lang], lang) && (pics || (CLUES[key] && CLUES[key][lang])))
      .map(key => ({ key, cells: tokens(ICONS[key][lang], lang) }));
  }
  return poolCache[k];
}

// So'zlarni to'rga joylash: har yangi so'z kamida bitta mavjud so'zni kesib o'tadi, yonma-yon tegmaydi
export function layout(cands, n, rand, max, attempts = 40) {
  let best = null;
  const K = (r, c) => r + ',' + c;
  for (let a = 0; a < attempts; a++) {
    const order = shuffle(cands.slice(), rand);
    const longest = order.reduce((m, w, i) => (w.cells.length > order[m].cells.length ? i : m), 0);
    [order[0], order[longest]] = [order[longest], order[0]];
    const grid = new Map(), placed = [];
    let r0 = 0, r1 = 0, c0 = 0, c1 = 0;
    const put = (w, r, c, dir) => {
      w.cells.forEach((ch, k) => {
        const rr = dir === 'd' ? r + k : r, cc = dir === 'a' ? c + k : c;
        const g = grid.get(K(rr, cc)) || { ch };
        g[dir] = true; grid.set(K(rr, cc), g);
        r0 = Math.min(r0, rr); r1 = Math.max(r1, rr); c0 = Math.min(c0, cc); c1 = Math.max(c1, cc);
      });
      placed.push({ w, r, c, dir });
    };
    const fits = (w, r, c, dir) => {
      const dr = dir === 'd' ? 1 : 0, dc = dir === 'a' ? 1 : 0, len = w.cells.length;
      if (grid.has(K(r - dr, c - dc)) || grid.has(K(r + dr * len, c + dc * len))) return -1;
      let cross = 0;
      for (let k = 0; k < len; k++) {
        const rr = r + dr * k, cc = c + dc * k, g = grid.get(K(rr, cc));
        if (g) { if (g.ch !== w.cells[k] || g[dir]) return -1; cross++; }
        else if (grid.has(K(rr + dc, cc + dr)) || grid.has(K(rr - dc, cc - dr))) return -1;
      }
      return cross;
    };
    put(order[0], 0, 0, rand() < 0.5 ? 'a' : 'd');
    for (const w of order.slice(1)) {
      if (placed.length >= n) break;
      if (placed.some(p => p.w.key === w.key)) continue;
      const opts = [];
      for (const [k, g] of grid) {
        const [r, c] = k.split(',').map(Number);
        w.cells.forEach((ch, i) => {
          if (ch !== g.ch) return;
          for (const dir of ['a', 'd']) {
            if (g[dir]) continue;
            const sr = dir === 'd' ? r - i : r, sc = dir === 'a' ? c - i : c;
            const er = dir === 'd' ? sr + w.cells.length - 1 : sr, ec = dir === 'a' ? sc + w.cells.length - 1 : sc;
            const h = Math.max(r1, er) - Math.min(r0, sr) + 1, wd = Math.max(c1, ec) - Math.min(c0, sc) + 1;
            if (h > max || wd > max) continue;
            const cross = fits(w, sr, sc, dir);
            if (cross >= 1) opts.push({ sr, sc, dir, cross, score: cross * 10 - h * wd / 8 - Math.abs(h - wd) + rand() * 2 });
          }
        });
      }
      if (!opts.length) continue;
      opts.sort((x, y) => y.score - x.score);
      const o = opts[0];
      put(w, o.sr, o.sc, o.dir);
    }
    const area = (r1 - r0 + 1) * (c1 - c0 + 1);
    const score = placed.length * 1000 - area;
    if (!best || score > best.score) {
      best = { score, rows: r1 - r0 + 1, cols: c1 - c0 + 1, words: placed.map(p => ({ key: p.w.key, cells: p.w.cells, r: p.r - r0, c: p.c - c0, dir: p.dir })) };
    }
    if (best.words.length >= n && a >= 10) break;
  }
  return best;
}

// Raqamlash: so'z boshlanadigan kataklar o'qish tartibida (gorizontal va vertikal bir katakdan boshlansa — bitta raqam)
function numberWords(words) {
  const starts = [...new Set(words.map(w => w.r * 1000 + w.c))].sort((a, b) => a - b);
  words.forEach(w => { w.num = starts.indexOf(w.r * 1000 + w.c) + 1; });
  return words;
}

function cellsOf(w) { return w.cells.map((ch, k) => [w.dir === 'd' ? w.r + k : w.r, w.dir === 'a' ? w.c + k : w.c, ch]); }

const RULE = {
  uz: L => (L.pics
    ? "Rasmlarning nomini krossvordga yoz. Raqam so'z boshlanadigan katakni, strelka yo'nalishni ko'rsatadi: → eniga, ↓ bo'yiga."
    : "Savollarning javobini krossvordga yoz. Raqam so'z boshlanadigan katakni ko'rsatadi.") + (L.first ? " Har so'zning birinchi harfi yozib qo'yilgan." : ''),
  ru: L => (L.pics
    ? 'Впиши в кроссворд названия картинок. Номер показывает клетку, где начинается слово, стрелка — направление: → по горизонтали, ↓ по вертикали.'
    : 'Впиши в кроссворд ответы на вопросы. Номер показывает клетку, где начинается слово.') + (L.first ? ' Первая буква каждого слова уже вписана.' : ''),
  en: L => (L.pics
    ? 'Write the name of each picture in the crossword. The number shows where the word starts, the arrow shows the direction: → across, ↓ down.'
    : 'Write the answers in the crossword. The number shows where each word starts.') + (L.first ? ' The first letter of each word is already there.' : '')
};
const HEAD = { uz: ['Eniga:', "Bo'yiga:"], ru: ['По горизонтали:', 'По вертикали:'], en: ['Across:', 'Down:'] };

function drawPicture(ctx, key, cx, cy, size) {
  const map = picMap(cx, cy, size);
  ctx.beginPath();
  for (const poly of picPolys(key).all) {
    for (let i = 0; i < poly.length; i += 2) { const [x, y] = map(poly[i], poly[i + 1]); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.closePath();
  }
  ctx.fillStyle = INK; ctx.fill('evenodd');
  ctx.strokeStyle = INK; ctx.lineWidth = size * 0.012; ctx.lineJoin = 'round'; ctx.stroke();
}

export default {
  id: 'xword',
  skills: ['language', 'attention'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  usesLang: true,
  name: { uz: 'Savolli krossvord', ru: 'Кроссворд', en: 'Crossword' },
  desc: {
    uz: "Rasmli va savolli krossvord: so'zlar kesishadi, javoblar uch tilda",
    ru: 'Кроссворд с картинками и вопросами: слова пересекаются',
    en: 'A crossword with picture or word clues: the words cross each other'
  },
  fileBase: { uz: 'Savolli krossvord', ru: 'Кроссворд', en: 'Crossword' },
  defaultTitle: { uz: 'Krossvordni yech!', ru: 'Разгадай кроссворд!', en: 'Solve the crossword!' },
  options: [{ key: 'level', type: 'level', default: 1 }],
  levelHint: {
    uz: ["Rasmli, 9 ta so'z, birinchi harflar yozilgan", "Rasmli, 11 ta so'z", "Savolli, 12 ta so'z", "Savolli, 15 ta so'z"],
    ru: ['С картинками, 9 слов, первые буквы даны', 'С картинками, 11 слов', 'С вопросами, 12 слов', 'С вопросами, 15 слов'],
    en: ['Picture clues, 9 words, first letters given', 'Picture clues, 11 words', 'Word clues, 12 words', 'Word clues, 15 words']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level], lang = langOf(opts);
    const rand = makeRng(seed);
    const n = L.n[opts.perPage === 4 ? 2 : opts.perPage === 2 ? 1 : 0];
    const pool = poolOf(lang, L.pics).filter(w => w.cells.length >= L.len[0] && w.cells.length <= L.len[1]);
    let lay = null;
    for (let t = 0; t < 6; t++) {
      const cands = shuffle(pool.slice(), rand).slice(0, n * 4);
      const l = layout(cands, n, rand, L.max);
      if (!lay || l.words.length > lay.words.length) lay = l;
      if (lay.words.length >= n) break;
    }
    return { level, seed, lang, rows: lay.rows, cols: lay.cols, words: numberWords(lay.words) };
  },

  info(p, lang) {
    const c = p.words.length;
    return { uz: `${c} ta so'z, to'r ${p.cols}×${p.rows}`, ru: `Слов: ${c}, сетка ${p.cols}×${p.rows}`, en: `${c} words, grid ${p.cols}×${p.rows}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box), L = LEVELS[p.level];
    const rule = measureRule(ctx, (RULE[lang] || RULE.uz)(L), box.w, scale);
    const gap = 6 * scale;
    const avail = box.h - rule.h - gap;
    const across = p.words.filter(w => w.dir === 'a').sort((a, b) => a.num - b.num);
    const down = p.words.filter(w => w.dir === 'd').sort((a, b) => a.num - b.num);
    // savollar qismi balandligi
    let clueH, drawClues;
    if (L.pics) {
      const all = [...across, ...down];
      const perRow = Math.max(3, Math.min(all.length, Math.floor(box.w / (24 * scale))));
      const tile = Math.min(box.w / perRow - 2 * scale, 26 * scale);
      const rowsN = Math.ceil(all.length / perRow);
      clueH = rowsN * (tile + 5 * scale) + gap;
      drawClues = y => {
        all.forEach((w, i) => {
          const r = Math.floor(i / perRow), c = i % perRow, cnt = Math.min(perRow, all.length - r * perRow);
          const x = box.x + (box.w - cnt * (tile + 2 * scale)) / 2 + c * (tile + 2 * scale) + scale, yy = y + r * (tile + 5 * scale);
          ctx.strokeStyle = '#C7CDD6'; ctx.lineWidth = Math.max(0.25, 0.3 * scale); ctx.strokeRect(x, yy + 4 * scale, tile, tile);
          drawPicture(ctx, w.key, x + tile / 2, yy + 4 * scale + tile / 2, tile * 0.82);
          font(ctx, 4.4 * scale, 900); ctx.fillStyle = '#4F46E5'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
          ctx.fillText(`${w.num} ${w.dir === 'a' ? '→' : '↓'}`, x, yy);
        });
      };
    } else {
      const fs = 4.1 * scale, lh = fs * 1.3, colW = (box.w - gap) / 2;
      const head = HEAD[lang] || HEAD.uz;
      font(ctx, fs, 400);
      const wrapCol = list => list.flatMap(w => wrapLines(ctx, `${w.num}. ${CLUES[w.key][p.lang]}`, colW).map((ln, i) => ({ ln, first: i === 0 })));
      const A = wrapCol(across), D = wrapCol(down);
      clueH = (Math.max(A.length, D.length) + 1.6) * lh + gap;
      drawClues = y => {
        [[head[0], A], [head[1], D]].forEach(([h, lines], ci) => {
          const x = box.x + ci * (colW + gap);
          font(ctx, fs * 1.05, 900); ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
          ctx.fillText(h, x, y);
          font(ctx, fs, 400);
          lines.forEach((l, i) => ctx.fillText(l.ln, x + (l.first ? 0 : fs * 1.2), y + (i + 1.4) * lh));
        });
      };
    }
    const Hg = avail - clueH;
    const t = Math.min(box.w / p.cols, Hg / p.rows, 11);
    const ox = box.x + (box.w - p.cols * t) / 2, oy = box.y + Math.max(0, (Hg - p.rows * t) * 0.4);
    const seen = new Map();
    for (const w of p.words) for (const [r, c, ch] of cellsOf(w)) {
      const k = r + ',' + c;
      const given = L.first && r === w.r && c === w.c;
      if (!seen.has(k) || given) seen.set(k, { r, c, ch, given: given || (seen.get(k) || {}).given });
    }
    for (const { r, c, ch, given } of seen.values()) {
      letterBox(ctx, ox + c * t, oy + r * t, t, given || showSolution ? ch : '', { color: given ? MUTE : ANSWER, lw: Math.max(0.3, t * 0.05), weight: 800 });
    }
    // raqamlar
    const nums = new Map();
    for (const w of p.words) nums.set(w.r + ',' + w.c, w.num);
    font(ctx, t * 0.31, 800); ctx.fillStyle = '#4F46E5'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    for (const [k, num] of nums) { const [r, c] = k.split(',').map(Number); ctx.fillText(String(num), ox + c * t + t * 0.08, oy + r * t + t * 0.06); }
    const cy = oy + p.rows * t + gap;
    drawClues(cy);
    drawRule(ctx, rule, box.x + box.w / 2, cy + clueH - gap * 0.5);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const T = { uz: `So'zlar: ${p.words.length} ta`, ru: `Слов: ${p.words.length}`, en: `Words: ${p.words.length}` };
    return { text: T[lang] || T.uz, warn: p.words.length < LEVELS[p.level].n[2] };
  },

  check(p) {
    const problems = [];
    const L = LEVELS[p.level];
    const grid = new Map();
    for (const w of p.words) for (const [r, c, ch] of cellsOf(w)) {
      const k = r + ',' + c;
      if (grid.has(k) && grid.get(k) !== ch) problems.push('crossing mismatch');
      grid.set(k, ch);
      if (r < 0 || c < 0 || r >= p.rows || c >= p.cols) problems.push('outside grid');
    }
    // har bir 2+ harfli gorizontal/vertikal qator — aynan bitta so'z
    const runs = [];
    for (const [dr, dc, dir] of [[0, 1, 'a'], [1, 0, 'd']]) {
      for (const k of grid.keys()) {
        const [r, c] = k.split(',').map(Number);
        if (grid.has((r - dr) + ',' + (c - dc))) continue;
        let len = 0;
        while (grid.has((r + dr * len) + ',' + (c + dc * len))) len++;
        if (len >= 2) runs.push(dir + r + ',' + c + ':' + len);
      }
    }
    const wordRuns = p.words.map(w => w.dir + w.r + ',' + w.c + ':' + w.cells.length);
    if (runs.length !== wordRuns.length || runs.some(x => !wordRuns.includes(x))) problems.push('stray letters form extra words');
    // bog'langanlik
    const keys = [...grid.keys()], seen = new Set([keys[0]]), st = [keys[0]];
    while (st.length) { const [r, c] = st.pop().split(',').map(Number); for (const [a, b] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) { const k = (r + a) + ',' + (c + b); if (grid.has(k) && !seen.has(k)) { seen.add(k); st.push(k); } } }
    if (seen.size !== keys.length) problems.push('not connected');
    if (new Set(p.words.map(w => w.key)).size !== p.words.length) problems.push('repeated word');
    if (p.words.length < L.n[2]) problems.push('too few words');
    if (!L.pics) for (const w of p.words) {
      const clue = CLUES[w.key] && CLUES[w.key][p.lang];
      if (!clue) problems.push('no clue ' + w.key);
      else if (clue.toUpperCase().replace(/[‘’']/g, '').includes(w.cells.join('').replace(/‘/g, ''))) problems.push('clue gives answer ' + w.key);
    }
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-xword" aria-hidden="true"><defs><linearGradient id="cg-xword" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbc2eb"/><stop offset="1" stop-color="#a18cd1"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-xword)"/><g fill="#fff" stroke="#111827" stroke-width="3"><rect x="40" y="30" width="30" height="30"/><rect x="40" y="60" width="30" height="30"/><rect x="40" y="90" width="30" height="30"/><rect x="70" y="90" width="30" height="30"/><rect x="100" y="90" width="30" height="30"/><rect x="130" y="90" width="30" height="30"/><rect x="100" y="120" width="30" height="30"/><rect x="100" y="150" width="30" height="30"/></g><g font-family="Nunito, sans-serif" font-weight="900" font-size="11" fill="#4F46E5"><text x="43" y="41">1</text><text x="43" y="101">2</text><text x="103" y="101">3</text></g><g font-family="Nunito, sans-serif" font-weight="900" font-size="20" text-anchor="middle" fill="#111827"><text x="55" y="52">C</text><text x="55" y="82">A</text></g><g font-family="Nunito, sans-serif" font-weight="900" font-size="20" text-anchor="middle" fill="#DC2626"><text class="xw-a" x="55" y="112">T</text><text class="xw-b" x="85" y="112">E</text><text class="xw-c" x="115" y="112">A</text><text class="xw-d" x="145" y="112">M</text><text class="xw-e" x="115" y="142">N</text><text class="xw-f" x="115" y="172">T</text></g></svg>`
};
