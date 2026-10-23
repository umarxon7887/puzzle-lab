// missing.js — «Tushib qolgan harf» (Пропущенные буквы / Missing letters) generatori.
// Har so'zdan bitta harf tushib qolgan; to'ldirilgan harflar yuqoridan pastga o'qilganda yashirin so'z chiqadi.
// Juda qiyin (qolip: rus IQ kitobi S10/S11 — so'zlarning umumiy boshi yoki oxiri): uchta so'zdan bir xil
// ikki harfli bo'lak tushib qolgan.
// Kafolat (check()): har bo'sh katakka tilning so'z bankidan faqat bitta harf mos keladi (yoki uchala so'zga
// faqat bitta bo'lak mos keladi); yashirin so'z bankda bor.

import { makeRng, shuffle, pickOne, randInt } from '../core/rng.js';
import { INK, MUTE, ANSWER, font } from '../core/draw.js';
import { scaleOf, measureRule, drawRule } from '../core/parts.js';
import { TOPIC_OPTION, topicOf, langOf, bankOf, allOf, keySet, topicName, letterBox, ALPHA } from './wordkit.js';

// hid — yashirin so'z uzunligi [min, max]; len — so'zlar uzunligi; mixed — boshqa mavzulardan ham;
// frag — umumiy bo'lak rejimi; count — [1, 2, 4 tadan] (yashirin so'zlar yoki guruhlar soni)
const LEVELS = [
  { hid: [3, 4], len: [3, 6], count: [2, 1, 1] },
  { hid: [5, 5], len: [4, 7], count: [2, 1, 1] },
  { hid: [6, 7], len: [5, 9], mixed: true, count: [1, 1, 1] },
  { frag: 2, count: [6, 3, 2] }
];

// p-o'rindagi harfni olib tashlasak, yana qaysi harflar bankdagi so'zni beradi
function fillers(cells, p, lang) {
  const keys = keySet(lang), out = [];
  for (const ch of ALPHA[lang]) { const c = cells.slice(); c[p] = ch; if (keys.has(c.join('|'))) out.push(ch); }
  return out;
}

function buildHidden(L, lang, topic, rand, avoid) {
  const topicPool = bankOf(lang, topic), all = allOf(lang);
  for (let t = 0; t < 200; t++) {
    const hidPool = all.filter(w => w.cells.length >= L.hid[0] && w.cells.length <= L.hid[1] && !avoid.has(w.key));
    const hid = pickOne(rand, hidPool);
    const used = new Set([hid.key, ...avoid]), rows = [];
    for (const ch of hid.cells) {
      let found = null;
      for (const pool of L.mixed ? [all] : [topicPool, all]) {
        const cand = shuffle(pool.filter(w => w.cells.length >= L.len[0] && w.cells.length <= L.len[1] && !used.has(w.key) && w.cells.includes(ch)), rand);
        for (const w of cand) {
          const pos = shuffle(w.cells.map((c, i) => (c === ch ? i : -1)).filter(i => i >= 0), rand);
          const p = pos.find(i => fillers(w.cells, i, lang).length === 1);
          if (p !== undefined) { found = { cells: w.cells, key: w.key, pos: p }; break; }
        }
        if (found) break;
      }
      if (!found) { rows.length = 0; break; }
      used.add(found.key); rows.push(found);
    }
    if (rows.length === hid.cells.length) return { hidden: hid.cells, hiddenKey: hid.key, rows };
  }
  throw new Error('missing: no puzzle');
}

// Umumiy bo'lak: so'z boshidan ('start') yoki oxiridan ('end') fl ta harf
function fragCandidates(cells, side, fl, lang) {
  const keys = keySet(lang), rest = side === 'start' ? cells.slice(fl) : cells.slice(0, -fl), out = new Set();
  for (const w of allOf(lang)) {
    if (w.cells.length !== cells.length) continue;
    const r = side === 'start' ? w.cells.slice(fl) : w.cells.slice(0, -fl);
    if (r.join('|') === rest.join('|')) out.add((side === 'start' ? w.cells.slice(0, fl) : w.cells.slice(-fl)).join('|'));
  }
  void keys;
  return out;
}

function buildFrag(L, lang, rand, avoid) {
  const fl = L.frag, all = allOf(lang).filter(w => w.cells.length >= fl + 2 && !avoid.has(w.key));
  for (const side of shuffle(['end', 'start'], rand)) {
    const groups = new Map();
    for (const w of all) {
      const f = (side === 'start' ? w.cells.slice(0, fl) : w.cells.slice(-fl)).join('|');
      if (!groups.has(f)) groups.set(f, []);
      groups.get(f).push(w);
    }
    for (const [f, ws] of shuffle([...groups.entries()].filter(([, ws]) => ws.length >= 3), rand)) {
      for (let t = 0; t < 20; t++) {
        const pick = shuffle(ws.slice(), rand).slice(0, 3);
        let common = null;
        for (const w of pick) {
          const c = fragCandidates(w.cells, side, fl, lang);
          common = common ? new Set([...common].filter(x => c.has(x))) : c;
        }
        if (common.size === 1 && common.has(f)) return { side, frag: f.split('|'), words: pick.map(w => ({ cells: w.cells, key: w.key })) };
      }
    }
  }
  throw new Error('missing: no fragment group');
}

const RULE = {
  uz: (L, tn) => L.frag
    ? "Har bir guruhdagi uchta so'zdan bir xil bo'lak (ikki harf) tushib qolgan: so'z boshidan yoki oxiridan. Bo'lakni topib, kataklarga yoz."
    : `Har bir so'zdan bitta harf tushib qolgan. Harfni katakka yoz: kataklardagi harflar yuqoridan pastga o'qilsa, yashirin so'z chiqadi. ${L.mixed ? "So'zlar har xil mavzulardan." : `So'zlar asosan «${tn}» mavzusidan.`}`,
  ru: (L, tn) => L.frag
    ? 'В каждой группе у трёх слов пропущена одна и та же часть (две буквы) — в начале или в конце слова. Найди её и впиши в клетки.'
    : `В каждом слове пропущена одна буква. Впиши её в клетку: буквы в клетках, прочитанные сверху вниз, составят тайное слово. ${L.mixed ? 'Слова на разные темы.' : `Слова в основном на тему «${tn}».`}`,
  en: (L, tn) => L.frag
    ? 'In each group the same two letters are missing from three words, at the start or at the end. Find them and write them in the boxes.'
    : `One letter is missing from each word. Write it in the box: read the boxed letters from top to bottom to find the secret word. ${L.mixed ? 'The words come from different topics.' : `Most words are about “${tn}”.`}`
};
const SECRET = { uz: "Yashirin so'z:", ru: 'Тайное слово:', en: 'Secret word:' };

export default {
  id: 'missing',
  skills: ['language', 'attention'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  usesLang: true,
  name: { uz: 'Tushib qolgan harf', ru: 'Пропущенные буквы', en: 'Missing letters' },
  desc: {
    uz: "So'zlardagi tushib qolgan harflarni topish — ulardan yashirin so'z chiqadi",
    ru: 'Найти пропущенные буквы — из них сложится тайное слово',
    en: 'Find the missing letters — together they spell a secret word'
  },
  fileBase: { uz: 'Tushib qolgan harf', ru: 'Пропущенные буквы', en: 'Missing letters' },
  defaultTitle: { uz: 'Tushib qolgan harfni top!', ru: 'Найди пропущенную букву!', en: 'Find the missing letter!' },
  options: [{ key: 'level', type: 'level', default: 1 }, TOPIC_OPTION],
  levelHint: {
    uz: ["Yashirin so'z 3–4 harfli", "Yashirin so'z 5 harfli", "Yashirin so'z 6–7 harfli, so'zlar har xil mavzudan", "Uch so'zda bir xil ikki harf tushib qolgan"],
    ru: ['Тайное слово из 3–4 букв', 'Тайное слово из 5 букв', 'Тайное слово из 6–7 букв, слова на разные темы', 'В трёх словах пропущены одни и те же две буквы'],
    en: ['3–4 letter secret word', '5 letter secret word', '6–7 letter secret word, words from any topic', 'The same two letters are missing from three words']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level], lang = langOf(opts), topic = topicOf(opts);
    const rand = makeRng(seed);
    const n = L.count[opts.perPage === 4 ? 2 : opts.perPage === 2 ? 1 : 0];
    const avoid = new Set(), items = [];
    for (let i = 0; i < n; i++) {
      const it = L.frag ? buildFrag(L, lang, rand, avoid) : buildHidden(L, lang, topic, rand, avoid);
      (it.rows || it.words).forEach(w => avoid.add(w.key));
      if (it.hiddenKey) avoid.add(it.hiddenKey);
      items.push(it);
    }
    return { level, seed, lang, topic, items };
  },

  info(p, lang) {
    const c = p.items.length;
    if (LEVELS[p.level].frag) return { uz: `${c} ta guruh`, ru: `Групп: ${c}`, en: `${c} groups` }[lang] || '';
    return { uz: `${c} ta yashirin so'z`, ru: `Тайных слов: ${c}`, en: `${c} secret word${c > 1 ? 's' : ''}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box), L = LEVELS[p.level];
    const rule = measureRule(ctx, (RULE[lang] || RULE.uz)(L, topicName(p.topic, p.lang)), box.w, scale);
    const gap = 6 * scale, H = box.h - rule.h - gap;
    const numW = 7 * scale;
    let bottom;
    if (!L.frag) {
      // har yashirin so'z — alohida blok: so'zlar (bo'sh katak bitta ustunda) + yashirin so'z qatori
      const left = Math.max(...p.items.flatMap(it => it.rows.map(r => r.pos)));
      const right = Math.max(...p.items.flatMap(it => it.rows.map(r => r.cells.length - 1 - r.pos)));
      const totalRows = p.items.reduce((s, it) => s + it.rows.length + 1.6, 0) + (p.items.length - 1) * 0.6;
      const lblTxt = SECRET[lang] || SECRET.uz, hidMax = Math.max(...p.items.map(it => it.hidden.length));
      font(ctx, 4.6 * scale, 800);
      const lblW = ctx.measureText(lblTxt).width;
      const t = Math.min((box.w - numW - gap) / ((left + right + 1) * 1.1), (box.w - lblW - gap) / (hidMax * 1.1 + 0.3), H / (totalRows * 1.25), 9.5);
      const blockW = numW + (left + right + 1) * t * 1.1;
      const bx = box.x + (box.w - blockW) / 2, colX = bx + numW + left * t * 1.1;
      let y = box.y + Math.max(0, (H - totalRows * t * 1.25) * 0.3);
      p.items.forEach(it => {
        it.rows.forEach((r, i) => {
          font(ctx, Math.min(4.6 * scale, t * 0.5), 800); ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText(`${i + 1}.`, bx, y + t * 0.55);
          r.cells.forEach((ch, k) => {
            const x = colX + (k - r.pos) * t * 1.1;
            if (k === r.pos) letterBox(ctx, x, y, t, showSolution ? ch : '', { color: ANSWER, fill: '#FEF3C7', stroke: '#F59E0B' });
            else letterBox(ctx, x, y, t, ch, { fill: '#fff', stroke: '#C7CDD6' });
          });
          y += t * 1.25;
        });
        // yashirin so'z
        y += t * 0.35;
        const lbl = SECRET[lang] || SECRET.uz;
        font(ctx, Math.min(4.6 * scale, t * 0.5), 800); ctx.fillStyle = INK; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        const lw = ctx.measureText(lbl).width, hw = it.hidden.length * t * 1.1;
        // yashirin so'z kataklari: ustun markaziga yaqin, lekin varaqdan chiqmasin
        const hx = Math.min(box.x + box.w - hw, Math.max(box.x + lw + t * 0.3, colX - (it.hidden.length / 2 - 0.5) * t * 1.1));
        ctx.fillText(lbl, hx - t * 0.3, y + t * 0.55);
        it.hidden.forEach((ch, k) => letterBox(ctx, hx + k * t * 1.1, y, t, showSolution ? ch : '', { color: ANSWER, fill: '#FEF3C7', stroke: '#F59E0B' }));
        y += t * 1.25 + t * 0.6 * 1.25;
      });
      bottom = y - t * 0.6 * 1.25;
    } else {
      const n = p.items.length;
      const maxLen = Math.max(...p.items.flatMap(it => it.words.map(w => w.cells.length)));
      // bir yoki ikki ustun — qaysi birida kataklar kattaroq bo'lsa
      let cols = 1, t = 0;
      for (const c of n > 2 ? [1, 2] : [1]) {
        const tt = Math.min((box.w / c - numW - gap) / ((maxLen + 1) * 1.1), H / (Math.ceil(n / c) * 4.2 * 1.2), 9);
        if (tt > t + 0.01) { t = tt; cols = c; }
      }
      const rowsN = Math.ceil(n / cols);
      const colW = box.w / cols, blockH = 4.2 * t * 1.2;
      const gy = box.y + Math.max(0, (H - rowsN * blockH) * 0.3);
      p.items.forEach((it, i) => {
        const c = Math.floor(i / rowsN), r = i % rowsN;
        const bx = box.x + c * colW + (colW - (numW + maxLen * t * 1.1)) / 2, y0 = gy + r * blockH;
        font(ctx, Math.min(4.6 * scale, t * 0.5), 800); ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(`${i + 1}.`, bx, y0 + t * 0.55);
        const fl = it.frag.length;
        it.words.forEach((w, j) => {
          const y = y0 + j * t * 1.2;
          // bo'lak boshida bo'lsa — so'zlar o'ngga tekislanadi, oxirida bo'lsa — chapga
          const x0 = it.side === 'start' ? bx + numW + (maxLen - w.cells.length) * t * 1.1 : bx + numW;
          w.cells.forEach((ch, k) => {
            const blank = it.side === 'start' ? k < fl : k >= w.cells.length - fl;
            letterBox(ctx, x0 + k * t * 1.1, y, t, blank ? (showSolution ? ch : '') : ch, blank ? { color: ANSWER, fill: '#FEF3C7', stroke: '#F59E0B' } : { fill: '#fff', stroke: '#C7CDD6' });
          });
        });
      });
      bottom = gy + rowsN * blockH - t * 1.2 * 1.2;
    }
    drawRule(ctx, rule, box.x + box.w / 2, bottom + gap * 0.3);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const n = LEVELS[p.level].frag ? p.items.length * 2 : p.items.reduce((s, it) => s + it.rows.length, 0);
    const T = { uz: `Yoziladigan harflar: ${n} ta`, ru: `Букв вписать: ${n}`, en: `Letters to write: ${n}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const L = LEVELS[p.level], keys = keySet(p.lang), seen = new Set();
    for (const it of p.items) {
      if (!L.frag) {
        if (!keys.has(it.hidden.join('|'))) problems.push('hidden not a word');
        if (it.rows.length !== it.hidden.length) problems.push('rows count');
        it.rows.forEach((r, i) => {
          if (r.cells[r.pos] !== it.hidden[i]) problems.push('letter mismatch');
          const f = fillers(r.cells, r.pos, p.lang);
          if (f.length !== 1 || f[0] !== r.cells[r.pos]) problems.push('ambiguous gap ' + r.cells.join(''));
          if (seen.has(r.key)) problems.push('repeated word'); seen.add(r.key);
        });
      } else {
        let common = null;
        for (const w of it.words) {
          const c = fragCandidates(w.cells, it.side, it.frag.length, p.lang);
          common = common ? new Set([...common].filter(x => c.has(x))) : c;
          const f = it.side === 'start' ? w.cells.slice(0, it.frag.length) : w.cells.slice(-it.frag.length);
          if (f.join('|') !== it.frag.join('|')) problems.push('fragment mismatch');
          if (seen.has(w.key)) problems.push('repeated word'); seen.add(w.key);
        }
        if (common.size !== 1) problems.push('fragment not unique');
      }
    }
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-missing" aria-hidden="true"><defs><linearGradient id="cg-missing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fccb90"/><stop offset="1" stop-color="#d57eeb"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-missing)"/><g fill="#fff" stroke="#9CA3AF" stroke-width="2.5"><rect x="30" y="30" width="30" height="30" rx="5"/><rect x="66" y="30" width="30" height="30" rx="5"/><rect x="138" y="30" width="30" height="30" rx="5"/><rect x="30" y="72" width="30" height="30" rx="5"/><rect x="66" y="72" width="30" height="30" rx="5"/><rect x="138" y="72" width="30" height="30" rx="5"/><rect x="30" y="114" width="30" height="30" rx="5"/><rect x="66" y="114" width="30" height="30" rx="5"/><rect x="138" y="114" width="30" height="30" rx="5"/></g><g fill="#FEF3C7" stroke="#F59E0B" stroke-width="3"><rect x="102" y="30" width="30" height="30" rx="5"/><rect x="102" y="72" width="30" height="30" rx="5"/><rect x="102" y="114" width="30" height="30" rx="5"/></g><g font-family="Nunito, sans-serif" font-weight="900" font-size="20" text-anchor="middle" fill="#111827"><text x="45" y="52">D</text><text x="81" y="52">U</text><text x="153" y="52">K</text><text x="45" y="94">B</text><text x="81" y="94">E</text><text x="153" y="94">R</text><text x="45" y="136">K</text><text x="81" y="136">I</text><text x="153" y="136">E</text></g><g font-family="Nunito, sans-serif" font-weight="900" font-size="20" text-anchor="middle" fill="#DC2626"><text class="ms-a" x="117" y="52">C</text><text class="ms-b" x="117" y="94">A</text><text class="ms-c" x="117" y="136">T</text></g><path d="M117 150v22M110 165l7 7 7-7" fill="none" stroke="#DC2626" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
};
