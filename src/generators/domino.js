// domino.js — «Domino jumboqlari» (Домино / Domino puzzles) generatori.
// Domino toshlari qatori (yoki 3×3 jadvali): tepadagi va pastdagi yarimlardagi nuqtalar o'z qoidasi bilan o'zgaradi.
// Bo'sh toshga bola kerakli nuqtalarni chizadi.
// Kafolat (check()): qoidalar kutubxonasidagi (doimiy, +k, −k, navbatma-navbat; qiyin darajalarda 6 dan keyin 0)
// ko'rinib turgan toshlarga mos keladigan har bir qoida bo'sh toshga bir xil qiymat beradi.
// Qolip: rus IQ kitobi M22, M30, 1.4, 4.4.

import { makeRng, randInt, shuffle, pickOne } from '../core/rng.js';
import { INK, MUTE, ANSWER, font, roundRect } from '../core/draw.js';
import { scaleOf, measureRule, drawRule, ruPlural } from '../core/parts.js';

// len — qatordagi toshlar (bo'sh tosh bilan); wrap — 6 dan keyin 0 keladimi; steps — ruxsat etilgan qadamlar;
// pairs — navbatma-navbat qadamlar juftlari (0–6 oralig'idan chiqmaydi); alt — navbatma-navbat qadam;
// grid — 3×3 jadval; rows — [1 tadan, 2 tadan, 4 tadan]
// Eslatma: 6 ta toshli qatorga ±2 doimiy qadam sig'maydi (0–6 oralig'i yetmaydi), shuning uchun O'rta darajada
// murakkablik navbatma-navbat qadamlardan keladi: 0, 2, 1, 3, 2, 4 (+2 −1) yoki 1, 4, 1, 4 (+3 −3).
const LEVELS = [
  { len: 5, wrap: false, steps: [1, -1], constOne: true, alt: false, grid: false, rows: [8, 4, 3] },
  { len: 6, wrap: false, steps: [1, -1], pairs: [[2, -1], [-1, 2], [-2, 1], [1, -2], [3, -3], [-3, 3], [1, -1], [-1, 1], [2, -2], [-2, 2]], constOne: false, alt: true, grid: false, rows: [8, 4, 3] },
  { len: 6, wrap: true, steps: [1, -1, 2, -2, 3, -3], constOne: false, alt: true, grid: false, rows: [8, 4, 3] },
  { len: 3, wrap: true, steps: [1, -1, 2, -2, 3, -3], constOne: false, alt: false, grid: true, rows: [2, 1, 1] }
];

const mod7 = v => ((v % 7) + 7) % 7;
// Bir yarim uchun qoida: { a (boshlanish), p, q } — qadamlar navbat bilan p, q (oddiy qatorda p = q)
function halfSeq(r, len, wrap) {
  const out = [r.a];
  for (let i = 1; i < len; i++) {
    let v = out[i - 1] + (i % 2 ? r.p : r.q);
    if (wrap) v = mod7(v);
    out.push(v);
  }
  return out;
}
// Ko'rinib turgan qiymatlarga mos keladigan barcha qoidalar bo'yicha yashirin o'rindagi qiymatlar to'plami
export function hiddenValues(shown, hidden, wrap, allowAlt) {
  const vals = new Set();
  const len = shown.length;
  const first = shown.findIndex((v, i) => i !== hidden);
  for (let a = 0; a <= 6; a++) for (let p = -6; p <= 6; p++) for (let q = -6; q <= 6; q++) {
    if (!allowAlt && p !== q) continue;
    const s = halfSeq({ a, p, q }, len, wrap);
    if (s.some(v => v < 0 || v > 6)) continue;
    if (s.every((v, i) => i === hidden || v === shown[i])) vals.add(s[hidden]);
  }
  void first;
  return vals;
}

function makeRule(L, rand, constant) {
  if (constant) return { a: randInt(rand, 0, 6), p: 0, q: 0 };
  if (L.pairs) {
    if (rand() < 0.55) { const [p, q] = pickOne(rand, L.pairs); return { a: randInt(rand, 0, 6), p, q }; }
    const p = pickOne(rand, L.steps); return { a: randInt(rand, 0, 6), p, q: p };
  }
  let p = pickOne(rand, L.steps), q = p;
  if (L.alt && rand() < 0.4) { q = pickOne(rand, L.steps.filter(x => x !== p)); }
  return { a: randInt(rand, 0, 6), p, q };
}

function buildRow(L, rand, len) {
  for (let t = 0; t < 3000; t++) {
    const constTop = L.constOne && rand() < 0.5;
    const rTop = makeRule(L, rand, constTop), rBot = makeRule(L, rand, L.constOne && !constTop);
    const top = halfSeq(rTop, len, L.wrap), bot = halfSeq(rBot, len, L.wrap);
    if ([...top, ...bot].some(v => v < 0 || v > 6)) continue;
    if (L.wrap && !L.grid && ![...top, ...bot].some((v, i, arr) => i % len && Math.abs(v - arr[i - 1]) > 3)) { if (rand() < 0.6) continue; }  // 6→0 o'tishi ko'proq uchrasin
    const hidden = L.grid ? len - 1 : (rand() < 0.75 ? len - 1 : randInt(rand, 2, len - 2));
    const ht = hiddenValues(top, hidden, L.wrap, L.alt), hb = hiddenValues(bot, hidden, L.wrap, L.alt);
    if (ht.size !== 1 || hb.size !== 1) continue;
    return { top, bot, hidden, rTop, rBot };
  }
  throw new Error('domino: no row');
}

// 3×3: har qatorda qadamlar bir xil (1→2 va 2→3 qadamlari har xil bo'lishi mumkin), boshlanishlar har xil.
// Pastki qatorda faqat birinchi tosh ko'rinadi: qoida faqat yuqoridagi ikki qatordan topiladi.
// ±1, ±2, ±3 qadamlar 7 ga bo'lgandagi qoldiqlari bo'yicha har xil — shuning uchun javob yagona.
export const GRID_BLANKS = [[2, 1], [2, 2]];
function buildGrid(L, rand) {
  const stepPair = () => { const p = pickOne(rand, L.steps); return [p, rand() < 0.5 ? pickOne(rand, L.steps.filter(x => x !== p)) : p]; };
  for (let t = 0; t < 3000; t++) {
    const sT = stepPair(), sB = stepPair();
    if (sT[0] === sB[0] && sT[1] === sB[1]) continue;  // tepa va past yarimlarning qoidasi har xil
    const rows = [0, 1, 2].map(() => ({
      top: halfSeq({ a: randInt(rand, 0, 6), p: sT[0], q: sT[1] }, 3, true),
      bot: halfSeq({ a: randInt(rand, 0, 6), p: sB[0], q: sB[1] }, 3, true)
    }));
    const sig = rows.map(r => r.top.join('') + r.bot.join(''));
    if (new Set(sig).size < 3 || new Set(rows.map(r => r.top[0] * 7 + r.bot[0])).size < 3) continue;
    return { grid: rows, sT, sB };
  }
  throw new Error('domino: no grid');
}

const RULE = {
  uz: (wrap, grid) => `Har bir qatorda domino toshlarining ikkala yarmi o'z qoidasi bilan o'zgaradi. Qoidani topib, bo'sh ${grid ? 'toshlarga' : 'toshga'} nuqtalarni chiz.${wrap ? " 6 dan keyin 0 keladi, 0 dan oldin — 6." : ''}`,
  ru: (wrap, grid) => `В каждом ряду обе половинки доминошек меняются по своему правилу. Найди правило и нарисуй точки на ${grid ? 'пустых доминошках' : 'пустой доминошке'}.${wrap ? ' После 6 идёт 0, а перед 0 — 6.' : ''}`,
  en: (wrap, grid) => `In each row both halves of the dominoes change by their own rule. Find the rule and draw the dots on the empty ${grid ? 'dominoes' : 'domino'}.${wrap ? ' After 6 comes 0, and before 0 comes 6.' : ''}`
};
const RULE_GRID = {
  uz: " Jadvalda qoida hamma qatorlarda bir xil: uni yuqoridagi qatorlardan top va pastki qatorni davom ettir.",
  ru: ' В таблице правило во всех рядах одинаковое: найди его по верхним рядам и продолжи нижний ряд.',
  en: ' In the grid every row follows the same rule: find it in the top rows and continue the bottom row.'
};

// Nuqtalar joylashuvi (yarimning ichida, [-1, 1])
const PIPS = {
  0: [], 1: [[0, 0]], 2: [[-0.5, -0.5], [0.5, 0.5]], 3: [[-0.5, -0.5], [0, 0], [0.5, 0.5]],
  4: [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]], 5: [[-0.5, -0.5], [0.5, -0.5], [0, 0], [-0.5, 0.5], [0.5, 0.5]],
  6: [[-0.5, -0.55], [0.5, -0.55], [-0.5, 0], [0.5, 0], [-0.5, 0.55], [0.5, 0.55]]
};
// Domino toshi: u — yarimning tomoni; horizontal — chap/o'ng yarimlar, aks holda tepa/past
function drawDomino(ctx, x, y, u, a, b, { blank = false, color = INK, horizontal = false } = {}) {
  const w = horizontal ? u * 2 : u, h = horizontal ? u : u * 2;
  ctx.save();
  roundRect(ctx, x, y, w, h, u * 0.16);
  ctx.fillStyle = '#fff'; ctx.fill();
  if (blank) ctx.setLineDash([u * 0.08, u * 0.06]);
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.35, u * 0.04); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  if (horizontal) { ctx.moveTo(x + u, y + u * 0.12); ctx.lineTo(x + u, y + u * 0.88); }
  else { ctx.moveTo(x + u * 0.12, y + u); ctx.lineTo(x + u * 0.88, y + u); }
  ctx.lineWidth = Math.max(0.3, u * 0.03); ctx.stroke();
  if (a !== null) for (const [half, v] of [[0, a], [1, b]]) {
    ctx.fillStyle = color;
    const hx = x + (horizontal ? half * u : 0), hy = y + (horizontal ? 0 : half * u);
    for (const [px, py] of PIPS[v]) { ctx.beginPath(); ctx.arc(hx + u / 2 + px * u * 0.36, hy + u / 2 + py * u * 0.36, u * 0.085, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}

export default {
  id: 'domino',
  skills: ['patterns', 'counting'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Domino jumboqlari', ru: 'Домино', en: 'Domino puzzles' },
  desc: {
    uz: "Domino toshlaridagi nuqtalar qoidasini topib, bo'sh toshni chizish",
    ru: 'Найти правило точек на доминошках и дорисовать пустую',
    en: 'Find the rule of the dots on the dominoes and draw the missing one'
  },
  fileBase: { uz: 'Domino jumboqlari', ru: 'Домино', en: 'Domino puzzles' },
  defaultTitle: { uz: 'Dominoni davom ettir!', ru: 'Продолжи домино!', en: 'Continue the dominoes!' },
  options: [{ key: 'level', type: 'level', default: 1 }],
  levelHint: {
    uz: ["Bir yarim o'zgarmaydi, ikkinchisi +1 yoki −1", "Ikkala yarim ham o'zgaradi; navbatma-navbat qadamlar (+2, −1 …)", "6 dan keyin 0 keladi; ±3 gacha qadamlar", "3×3 jadval: qoidani yuqori qatorlardan topib, 2 ta toshni chizish"],
    ru: ['Одна половинка не меняется, другая +1 или −1', 'Меняются обе половинки; шаги по очереди (+2, −1 …)', 'После 6 идёт 0; шаги до ±3', 'Таблица 3×3: найти правило по верхним рядам и дорисовать 2 доминошки'],
    en: ['One half stays the same, the other goes +1 or −1', 'Both halves change; alternating steps (+2, −1 …)', 'After 6 comes 0; steps up to ±3', '3×3 grid: find the rule in the top rows and draw 2 dominoes']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level];
    const rand = makeRng(seed);
    const n = L.rows[opts.perPage === 4 ? 2 : opts.perPage === 2 ? 1 : 0];
    const items = [], seen = new Set();
    let prevShape = '';
    for (let i = 0; i < n; i++) {
      if (L.grid) { items.push(buildGrid(L, rand)); continue; }
      // Bitta varaqda qatorlar takrorlanmaydi; ketma-ket ikki qatorda qoidalar ko'rinishi ham bir xil bo'lmasin
      let it, sig, shape;
      for (let t = 0; t < 400; t++) {
        it = buildRow(L, rand, L.len);
        sig = it.top.join('') + '|' + it.bot.join('');
        shape = [it.rTop.p, it.rTop.q, it.rBot.p, it.rBot.q].join(',');
        if (!seen.has(sig) && (shape !== prevShape || t > 200)) break;
      }
      seen.add(sig); prevShape = shape; items.push(it);
    }
    return { level, seed, grid: L.grid, wrap: L.wrap, items };
  },

  info(p, lang) {
    const c = p.items.length;
    if (p.grid) return { uz: `${c} ta jadval`, ru: `${c} ${ruPlural(c, 'таблица', 'таблицы', 'таблиц')}`, en: `${c} grids` }[lang] || '';
    return { uz: `${c} ta qator`, ru: `${c} ${ruPlural(c, 'ряд', 'ряда', 'рядов')}`, en: `${c} rows` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box);
    const rule = measureRule(ctx, (RULE[lang] || RULE.uz)(p.wrap, p.grid) + (p.grid ? (RULE_GRID[lang] || RULE_GRID.uz) : ''), box.w, scale);
    const gap = 6 * scale;
    const H = box.h - rule.h - gap;
    let bottom;
    if (!p.grid) {
      const n = p.items.length, len = p.items[0].top.length;
      const numW = 7 * scale;
      const u = Math.min((box.w - numW) / (len * 2.35), (H / n) / 1.5, 16);
      const rowH = Math.min(u * 1.5, H / n);
      const gridW = numW + len * u * 2.35 - u * 0.35;
      const gx = box.x + (box.w - gridW) / 2, gy = box.y + Math.max(0, (H - n * rowH) * 0.3);
      p.items.forEach((row, k) => {
        const y = gy + k * rowH;
        font(ctx, Math.min(4.6 * scale, u * 0.45), 800); ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(`${k + 1}.`, gx, y + u / 2);
        row.top.forEach((t, i) => {
          const x = gx + numW + i * u * 2.35;
          const blank = i === row.hidden;
          drawDomino(ctx, x, y, u, blank && !showSolution ? null : t, row.bot[i], { blank, color: blank ? ANSWER : INK, horizontal: true });
        });
      });
      bottom = gy + n * rowH;
    } else {
      const n = p.items.length;
      const cols = n > 1 ? 2 : 1;
      const cellW = (box.w - (cols - 1) * gap * 2) / cols;
      const dw = Math.min(cellW / (3 * 1.6 + 0.3), (H - gap) / (3 * 2.3) / Math.ceil(n / cols), 15);
      const gH = 3 * dw * 2.3, gW = 3 * dw * 1.6;
      const gy = box.y + Math.max(0, (H - gH * Math.ceil(n / cols)) * 0.3);
      p.items.forEach((g, idx) => {
        const ox = box.x + (idx % cols) * (cellW + gap * 2) + (cellW - gW + dw * 0.1) / 2, oy = gy + dw * 0.15 + Math.floor(idx / cols) * (gH + gap);
        ctx.save(); ctx.strokeStyle = '#C7D2FE'; ctx.lineWidth = Math.max(0.3, 0.4 * scale);
        roundRect(ctx, ox - dw * 0.2, oy - dw * 0.15, gW + dw * 0.1, gH, dw * 0.2); ctx.stroke(); ctx.restore();
        g.grid.forEach((row, r) => row.top.forEach((t, c) => {
          const blank = GRID_BLANKS.some(([br, bc]) => br === r && bc === c);
          drawDomino(ctx, ox + c * dw * 1.6, oy + r * dw * 2.3, dw, blank && !showSolution ? null : t, row.bot[c], { blank, color: blank ? ANSWER : INK });
        }));
      });
      bottom = gy + gH * Math.ceil(n / cols) + gap * 0.2;
    }
    drawRule(ctx, rule, box.x + box.w / 2, bottom);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const c = p.items.length * (p.grid ? GRID_BLANKS.length : 1);
    const T = { uz: `Bo'sh toshlar: ${c} ta`, ru: `Пустых доминошек: ${c}`, en: `Empty dominoes: ${c}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const L = LEVELS[p.level];
    p.items.forEach((it, k) => {
      if (p.grid) {
        for (const row of it.grid) {
          for (const [arr, st] of [[row.top, it.sT], [row.bot, it.sB]]) arr.forEach((v, i) => { if (i && mod7(arr[i - 1] + st[i - 1]) !== v) problems.push(`#${k}: grid rule`); });
        }
        if (it.sT.join() === it.sB.join()) problems.push(`#${k}: same rule top/bottom`);
        // Qoida yuqoridagi ikki qatordan yagona topiladi: har bir qadam (mod 7) ikkala qatorda bir xil va ±3 dan oshmaydi
        for (const key of ['top', 'bot']) for (const i of [1, 2]) {
          const d = new Set(it.grid.slice(0, 2).map(r => mod7(r[key][i] - r[key][i - 1])));
          if (d.size !== 1 || d.has(0)) problems.push(`#${k}: grid step ${key}${i}`);
        }
        return;
      }
      if (k && p.items.slice(0, k).some(o => o.top.join() === it.top.join() && o.bot.join() === it.bot.join())) problems.push(`#${k}: duplicate row`);
      const all = [...it.top, ...it.bot];
      if (all.some(v => v < 0 || v > 6 || !Number.isInteger(v))) problems.push(`#${k}: bad pips`);
      const ht = hiddenValues(it.top, it.hidden, L.wrap, L.alt), hb = hiddenValues(it.bot, it.hidden, L.wrap, L.alt);
      if (ht.size !== 1 || !ht.has(it.top[it.hidden])) problems.push(`#${k}: top ambiguous`);
      if (hb.size !== 1 || !hb.has(it.bot[it.hidden])) problems.push(`#${k}: bottom ambiguous`);
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-domino" aria-hidden="true"><defs><linearGradient id="cg-domino" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cfd9df"/><stop offset="1" stop-color="#e2ebf0"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-domino)"/><g stroke="#111827" stroke-width="4" fill="#fff"><rect x="24" y="44" width="40" height="80" rx="7"/><rect x="80" y="44" width="40" height="80" rx="7"/><rect x="136" y="44" width="40" height="80" rx="7" stroke-dasharray="7 5"/></g><path d="M30 84h28M86 84h28M142 84h28" stroke="#111827" stroke-width="3"/><g fill="#111827"><circle cx="44" cy="64" r="5"/><circle cx="35" cy="95" r="5"/><circle cx="53" cy="113" r="5"/><circle cx="91" cy="55" r="5"/><circle cx="109" cy="73" r="5"/><circle cx="100" cy="104" r="5"/></g><g fill="#DC2626" class="dm-a"><circle cx="146" cy="55" r="5"/><circle cx="156" cy="64" r="5"/><circle cx="166" cy="73" r="5"/></g><text x="100" y="166" font-family="Nunito, sans-serif" font-weight="900" font-size="22" text-anchor="middle" fill="#111827" opacity=".6">+1  −1</text></svg>`
};
