// wordchain.js — «Harflar zanjiri» (Цепочка слов / Word chain) generatori.
// Ro'yxatdagi so'zlardan zanjir: har so'z oldingisining oxirgi harfi bilan boshlanadi. So'zlar zinapoya
// shaklidagi kataklarga yoziladi (burchakdagi katak ikki so'zga umumiy).
// Juda qiyin (qolip: rus IQ kitobi S7 «so'z ko'prigi»): MAK(_ _ _)IAT — uch harf birinchi so'zning oxiri va
// ikkinchi so'zning boshi bo'ladi (MAKTAB, TABIAT).
// Kafolat (check()): zanjir tartibi yagona (ortiqcha so'z zanjirga kirmaydi); ko'prikka banddan faqat bitta
// harflar uchligi mos keladi.

import { makeRng, shuffle, pickOne } from '../core/rng.js';
import { INK, MUTE, ANSWER, font, roundRect } from '../core/draw.js';
import { scaleOf, measureRule, drawRule } from '../core/parts.js';
import { TOPIC_OPTION, topicOf, langOf, bankOf, allOf, keySet, topicName, letterBox } from './wordkit.js';

// k — zanjirdagi so'zlar; given — birinchi so'z yozilgan; extra — ortiqcha so'z; bridge — ko'prik uzunligi;
// count — [1, 2, 4 tadan]
const LEVELS = [
  { k: 4, given: true, len: [3, 6], count: [1, 1, 1] },
  { k: 5, len: [3, 7], count: [1, 1, 1] },
  { k: 5, extra: 1, len: [3, 7], count: [1, 1, 1] },
  { bridge: 3, count: [6, 4, 3] }
];

const first = w => w.cells[0], last = w => w.cells[w.cells.length - 1];

// So'zlar to'plamidan k ta so'zli zanjirlar soni (start berilsa — shundan boshlanadiganlari)
export function countChains(words, k, start = -1, limit = 2) {
  let count = 0;
  const used = new Array(words.length).fill(false);
  const rec = (i, len) => {
    if (count >= limit) return;
    if (len === k) { count++; return; }
    for (let j = 0; j < words.length; j++) {
      if (used[j] || first(words[j]) !== last(words[i])) continue;
      used[j] = true; rec(j, len + 1); used[j] = false;
    }
  };
  for (let s = 0; s < words.length; s++) {
    if (start >= 0 && s !== start) continue;
    used[s] = true; rec(s, 1); used[s] = false;
  }
  return count;
}

function buildChain(L, lang, topic, rand) {
  const pools = [bankOf(lang, topic), allOf(lang)];
  for (const pool0 of pools) {
    const pool = pool0.filter(w => w.cells.length >= L.len[0] && w.cells.length <= L.len[1]);
    for (let t = 0; t < 300; t++) {
      // tasodifiy zanjir
      const path = [pickOne(rand, pool)];
      while (path.length < L.k) {
        const nx = shuffle(pool.filter(w => first(w) === last(path[path.length - 1]) && !path.includes(w)), rand);
        if (!nx.length) break;
        path.push(nx[0]);
      }
      if (path.length < L.k) continue;
      let set = path.slice(), extraWord = null;
      if (L.extra) {
        // ortiqcha so'z: zanjirdagi harflarga «yopishadigan», lekin zanjirni buzmaydigan
        const cand = shuffle(pool.filter(w => !path.includes(w) && path.some(p => first(w) === last(p) || last(w) === first(p))), rand);
        extraWord = cand.find(w => countChains([...path, w], L.k, -1, 2) === 1);
        if (!extraWord) continue;
        set = [...path, extraWord];
      }
      if (countChains(set, L.k, L.given ? set.indexOf(path[0]) : -1, 2) !== 1) continue;
      return { chain: path.map(w => ({ cells: w.cells, key: w.key })), extra: extraWord ? { cells: extraWord.cells, key: extraWord.key } : null, list: shuffle((L.given ? set.slice(1) : set).map(w => w.cells.join('')), rand) };
    }
  }
  throw new Error('wordchain: no chain');
}

// Ko'prik: A = P + M, B = M + S (M — bridge ta harf)
function bridgeOptions(P, S, m, lang) {
  const keys = keySet(lang), out = [];
  for (const w of allOf(lang)) {
    if (w.cells.length !== P.length + m) continue;
    if (w.cells.slice(0, P.length).join('|') !== P.join('|')) continue;
    const M = w.cells.slice(P.length);
    if (keys.has([...M, ...S].join('|'))) out.push(M.join('|'));
  }
  return [...new Set(out)];
}

function buildBridges(L, lang, n, rand) {
  const all = allOf(lang), out = [], used = new Set();
  for (const m of [L.bridge, L.bridge - 1]) {
    const byStart = new Map();
    for (const w of all) if (w.cells.length >= m + 2) { const k = w.cells.slice(0, m).join('|'); if (!byStart.has(k)) byStart.set(k, []); byStart.get(k).push(w); }
    for (const A of shuffle(all.slice(), rand)) {
      if (out.length >= n) break;
      if (A.cells.length < m + 2 || used.has(A.key)) continue;
      const M = A.cells.slice(-m), Bs = (byStart.get(M.join('|')) || []).filter(B => B.key !== A.key && !used.has(B.key));
      for (const B of shuffle(Bs, rand)) {
        const P = A.cells.slice(0, -m), S = B.cells.slice(m);
        const opts = bridgeOptions(P, S, m, lang);
        if (opts.length === 1 && opts[0] === M.join('|')) { out.push({ P, M, S, a: A.key, b: B.key }); used.add(A.key); used.add(B.key); break; }
      }
    }
    if (out.length >= n) break;
  }
  return out;
}

// Zinapoya: juft so'zlar gorizontal, toqlari vertikal (yoki aksincha); burchakdagi katak umumiy
function stairs(chain, startVertical) {
  let r = 0, c = 0;
  return chain.map((w, i) => {
    const vertical = (i % 2 === 1) !== startVertical;
    const cells = w.cells.map((_, k) => (vertical ? [r + k, c] : [r, c + k]));
    [r, c] = cells[cells.length - 1];
    return { vertical, cells };
  });
}

const RULE = {
  uz: (L, tn) => L.bridge
    ? "Har qatorda ikkita so'z yashiringan. Bo'sh kataklarga harflar yoz: ular birinchi so'zning oxiri va ikkinchi so'zning boshi bo'ladi (MAK + TAB = MAKTAB, TAB + IAT = TABIAT)."
    : `Ro'yxatdagi so'zlardan zanjir tuz: har bir so'z oldingi so'zning oxirgi harfi bilan boshlanadi. So'zlarni raqam tartibida kataklarga yoz: burchakdagi katak ikkala so'zga umumiy.${L.given ? " Birinchi so'z yozib qo'yilgan." : ''}${L.extra ? " Ro'yxatdagi bitta so'z zanjirga kirmaydi." : ''} Mavzu: «${tn}».`,
  ru: (L, tn) => L.bridge
    ? 'В каждой строке спрятаны два слова. Впиши в пустые клетки буквы: они будут концом первого слова и началом второго.'
    : `Составь цепочку из слов списка: каждое слово начинается с последней буквы предыдущего. Впиши слова в клетки по порядку номеров: угловая клетка общая для двух слов.${L.given ? ' Первое слово уже вписано.' : ''}${L.extra ? ' Одно слово из списка в цепочку не входит.' : ''} Тема: «${tn}».`,
  en: (L, tn) => L.bridge
    ? 'Each row hides two words. Fill the empty boxes: the letters end the first word and start the second one.'
    : `Make a chain from the words in the list: each word begins with the last letter of the word before it. Write the words in the boxes in number order: the corner box belongs to both words.${L.given ? ' The first word is already filled in.' : ''}${L.extra ? ' One word in the list does not fit into the chain.' : ''} Topic: “${tn}”.`
};
const LIST = { uz: "So'zlar:", ru: 'Слова:', en: 'Words:' };

export default {
  id: 'wordchain',
  skills: ['language', 'logic'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  usesLang: true,
  name: { uz: 'Harflar zanjiri', ru: 'Цепочка слов', en: 'Word chain' },
  desc: {
    uz: "Har so'z oldingisining oxirgi harfi bilan boshlanadi: so'zlardan zanjir tuzish",
    ru: 'Каждое слово начинается с последней буквы предыдущего: составить цепочку',
    en: 'Each word starts with the last letter of the one before: build the chain'
  },
  fileBase: { uz: 'Harflar zanjiri', ru: 'Цепочка слов', en: 'Word chain' },
  defaultTitle: { uz: "So'zlardan zanjir tuz!", ru: 'Составь цепочку слов!', en: 'Build the word chain!' },
  options: [{ key: 'level', type: 'level', default: 1 }, TOPIC_OPTION],
  levelHint: {
    uz: ["4 so'z, birinchisi yozilgan", "5 so'z", "5 so'z va bitta ortiqcha so'z", "So'z ko'prigi: uch harf ikki so'zni bog'laydi"],
    ru: ['4 слова, первое вписано', '5 слов', '5 слов и одно лишнее', 'Мостик: три буквы связывают два слова'],
    en: ['4 words, the first one is filled in', '5 words', '5 words and one extra word', 'Word bridge: three letters join two words']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level], lang = langOf(opts), topic = topicOf(opts);
    const rand = makeRng(seed);
    const n = L.count[opts.perPage === 4 ? 2 : opts.perPage === 2 ? 1 : 0];
    if (L.bridge) return { level, seed, lang, topic, bridges: buildBridges(L, lang, n, rand) };
    return { level, seed, lang, topic, ...buildChain(L, lang, topic, rand) };
  },

  info(p, lang) {
    if (p.bridges) return { uz: `${p.bridges.length} ta ko'prik`, ru: `Мостиков: ${p.bridges.length}`, en: `${p.bridges.length} bridges` }[lang] || '';
    return { uz: `${p.chain.length} ta so'z, «${topicName(p.topic, lang)}»`, ru: `Слов: ${p.chain.length}, «${topicName(p.topic, lang)}»`, en: `${p.chain.length} words, “${topicName(p.topic, lang)}”` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box), L = LEVELS[p.level];
    const rule = measureRule(ctx, (RULE[lang] || RULE.uz)(L, topicName(p.topic, p.lang)), box.w, scale);
    const gap = 6 * scale;
    let bottom;
    if (!p.bridges) {
      // So'zlar ro'yxati
      const fs = 4.6 * scale;
      font(ctx, fs, 800);
      const lbl = LIST[lang] || LIST.uz;
      const chips = p.list.map(s => ({ s, w: ctx.measureText(s).width + fs * 1.4 }));
      const lines = [[]]; let lw = ctx.measureText(lbl).width + fs;
      for (const ch of chips) { if (lw + ch.w > box.w && lines[lines.length - 1].length) { lines.push([]); lw = 0; } lines[lines.length - 1].push(ch); lw += ch.w + fs * 0.5; }
      let y = box.y;
      lines.forEach((ln, li) => {
        let x = box.x + (li === 0 ? ctx.measureText(lbl).width + fs : 0);
        if (li === 0) { ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(lbl, box.x, y + fs * 0.9); }
        for (const ch of ln) {
          roundRect(ctx, x, y, ch.w, fs * 1.8, fs * 0.5); ctx.fillStyle = '#EEF2FF'; ctx.fill(); ctx.strokeStyle = '#A5B4FC'; ctx.lineWidth = Math.max(0.25, 0.3 * scale); ctx.stroke();
          ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.fillText(ch.s, x + ch.w / 2, y + fs * 0.95);
          x += ch.w + fs * 0.5;
        }
        y += fs * 2.3;
      });
      y += gap;
      // zinapoya — qaysi yo'nalishda katta chiqsa
      const H = box.y + box.h - rule.h - gap - y;
      let best = null;
      for (const sv of [false, true]) {
        const st = stairs(p.chain, sv), cells = st.flatMap(s => s.cells);
        const rows = Math.max(...cells.map(c => c[0])) + 1, cols = Math.max(...cells.map(c => c[1])) + 1;
        const t = Math.min(box.w / (cols + 0.8), H / (rows + 0.8), 14);
        if (!best || t > best.t) best = { st, rows, cols, t };
      }
      const { st, rows, cols, t } = best;
      const ox = box.x + (box.w - cols * t) / 2 + t * 0.4, oy = y + Math.max(0, (H - rows * t) * 0.3) + t * 0.4;
      const drawn = new Map();
      st.forEach((s, i) => s.cells.forEach(([r, c], k) => {
        const key = r + ',' + c, corner = (k === 0 && i > 0) || (k === s.cells.length - 1 && i < st.length - 1);
        const ch = p.chain[i].cells[k], given = L.given && i === 0;
        if (drawn.has(key)) return;
        drawn.set(key, true);
        letterBox(ctx, ox + c * t, oy + r * t, t * 0.92, given || showSolution ? ch : '', { color: given ? INK : ANSWER, fill: corner ? '#FEF3C7' : '#fff', stroke: corner ? '#F59E0B' : INK });
      }));
      // so'z raqamlari
      st.forEach((s, i) => {
        const [r, c] = s.cells[0];
        // gorizontal so'z — birinchi katakning chap tomonida, vertikal — tepasida (u yerlar doim bo'sh)
        const R = t * 0.2;
        const cx = s.vertical ? ox + c * t + t * 0.46 : ox + c * t - R * 1.25, cy = s.vertical ? oy + r * t - R * 1.25 : oy + r * t + t * 0.46;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = '#4F46E5'; ctx.fill();
        font(ctx, R * 1.3, 900); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), cx, cy + R * 0.06);
      });
      bottom = oy + rows * t;
      if (showSolution && p.extra) {
        font(ctx, 4.2 * scale, 700); ctx.fillStyle = ANSWER; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText({ uz: 'Ortiqcha: ', ru: 'Лишнее: ', en: 'Extra: ' }[lang] + p.extra.cells.join(''), box.x + box.w / 2, bottom + gap * 0.3);
        bottom += 4.2 * scale * 1.6;
      }
    } else {
      const n = p.bridges.length, H = box.h - rule.h - gap;
      const left = Math.max(...p.bridges.map(b => b.P.length)), mid = Math.max(...p.bridges.map(b => b.M.length)), right = Math.max(...p.bridges.map(b => b.S.length));
      const numW = 7 * scale;
      const t = Math.min((box.w - numW) / ((left + mid + right) * 1.08), H / (n * 2.1), 10);
      const rowH = Math.min(H / n, t * 2.3);
      const bx = box.x + (box.w - numW - (left + mid + right) * t * 1.08) / 2;
      const midX = bx + numW + left * t * 1.08;
      const gy = box.y + Math.max(0, (H - n * rowH) * 0.3) + t * 0.45;
      p.bridges.forEach((b, i) => {
        const y = gy + i * rowH;
        font(ctx, Math.min(4.6 * scale, t * 0.5), 800); ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(`${i + 1}.`, bx, y + t * 0.5);
        const x0 = midX - b.P.length * t * 1.08;
        const all = [...b.P, ...b.M, ...b.S];
        all.forEach((ch, k) => {
          const inMid = k >= b.P.length && k < b.P.length + b.M.length;
          letterBox(ctx, x0 + k * t * 1.08, y, t, inMid ? (showSolution ? ch : '') : ch, inMid ? { color: ANSWER, fill: '#FEF3C7', stroke: '#F59E0B' } : { fill: '#fff', stroke: '#C7CDD6' });
        });
        // qavslar: tepada 1-so'z, pastda 2-so'z
        ctx.save(); ctx.strokeStyle = '#6366F1'; ctx.lineWidth = Math.max(0.3, t * 0.05);
        const aEnd = x0 + (b.P.length + b.M.length) * t * 1.08 - t * 0.08, bStart = x0 + b.P.length * t * 1.08, bEnd = x0 + all.length * t * 1.08 - t * 0.08;
        ctx.beginPath(); ctx.moveTo(x0, y - t * 0.12); ctx.lineTo(x0, y - t * 0.3); ctx.lineTo(aEnd, y - t * 0.3); ctx.lineTo(aEnd, y - t * 0.12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bStart, y + t * 1.12); ctx.lineTo(bStart, y + t * 1.3); ctx.lineTo(bEnd, y + t * 1.3); ctx.lineTo(bEnd, y + t * 1.12); ctx.stroke();
        ctx.restore();
      });
      bottom = gy + (n - 1) * rowH + t * 1.4;
    }
    drawRule(ctx, rule, box.x + box.w / 2, bottom + gap * 0.3);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const n = p.bridges ? p.bridges.length : p.chain.length;
    const T = p.bridges ? { uz: `Ko'priklar: ${n} ta`, ru: `Мостиков: ${n}`, en: `Bridges: ${n}` } : { uz: `Zanjirda ${n} ta so'z`, ru: `В цепочке слов: ${n}`, en: `Words in the chain: ${n}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const L = LEVELS[p.level], keys = keySet(p.lang);
    if (p.bridges) {
      if (!p.bridges.length) problems.push('no bridges');
      for (const b of p.bridges) {
        if (!keys.has([...b.P, ...b.M].join('|')) || !keys.has([...b.M, ...b.S].join('|'))) problems.push('bridge words missing');
        const o = bridgeOptions(b.P, b.S, b.M.length, p.lang);
        if (o.length !== 1) problems.push('bridge not unique ' + b.P.join('') + '_' + b.S.join(''));
      }
      return problems;
    }
    const words = p.chain.map(w => ({ cells: w.cells }));
    for (let i = 1; i < words.length; i++) if (first(words[i]) !== last(words[i - 1])) problems.push('chain broken');
    const set = p.extra ? [...words, { cells: p.extra.cells }] : words;
    if (countChains(set, L.k, L.given ? 0 : -1, 2) !== 1) problems.push('chain not unique');
    if (p.chain.some(w => !keys.has(w.cells.join('|')))) problems.push('word not in bank');
    if (p.list.length !== (L.given ? L.k - 1 : L.k) + (L.extra || 0)) problems.push('list size');
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-wordchain" aria-hidden="true"><defs><linearGradient id="cg-wordchain" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a8edea"/><stop offset="1" stop-color="#fed6e3"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-wordchain)"/><g fill="#fff" stroke="#111827" stroke-width="3"><rect x="24" y="30" width="28" height="28" rx="5"/><rect x="56" y="30" width="28" height="28" rx="5"/><rect x="88" y="62" width="28" height="28" rx="5"/><rect x="88" y="94" width="28" height="28" rx="5"/><rect x="120" y="126" width="28" height="28" rx="5"/><rect x="152" y="126" width="28" height="28" rx="5"/></g><g fill="#FEF3C7" stroke="#F59E0B" stroke-width="3"><rect x="88" y="30" width="28" height="28" rx="5"/><rect x="88" y="126" width="28" height="28" rx="5"/></g><g font-family="Nunito, sans-serif" font-weight="900" font-size="18" text-anchor="middle" fill="#111827"><text x="38" y="51">C</text><text x="70" y="51">A</text><text x="102" y="51">T</text><text x="102" y="83">O</text><text x="102" y="115">Y</text></g><g font-family="Nunito, sans-serif" font-weight="900" font-size="18" text-anchor="middle" fill="#DC2626"><text class="wc-a" x="102" y="147">S</text><text class="wc-b" x="134" y="147">U</text><text class="wc-c" x="166" y="147">N</text></g></svg>`
};
