// syllables.js — «Bo'g'inlardan so'z» (Слова из слогов / Syllable words) generatori.
// Bo'g'in kartochkalaridan so'z yig'ish. O'zbekcha va ruscha bo'g'inlar qoida bo'yicha ajratiladi (bahsli so'zlar
// olinmaydi), inglizcha — qo'lda ajratilgan ro'yxatdan.
// Kafolat (check()): bo'g'inlar so'zni to'liq beradi; aralash kartochkalardan (Qiyin, Juda qiyin) so'zlarni
// faqat bitta usulda yig'ish mumkin (so'z bankidagi barcha so'zlar bilan tekshiriladi).

import { makeRng, shuffle } from '../core/rng.js';
import { INK, MUTE, ANSWER, font, roundRect } from '../core/draw.js';
import { scaleOf, measureRule, drawRule } from '../core/parts.js';
import { TOPICS, TOPIC_OPTION, topicOf, langOf, bankOf, allOf, topicName } from './wordkit.js';

// O'zbekcha: har bo'g'inda bitta unli; unlilar orasidagi undoshlardan oxirgisi keyingi bo'g'inga o'tadi
// (ki-tob, mak-tab, do'st-lik, sa-at). Ruscha o'zlashmalar (kompyuter, aktyor — undosh + y + unli) va «ts» li
// so'zlar olinmaydi: ularning bo'g'inga bo'linishi boshqacha.
const UZV = new Set(['A', 'E', 'I', 'O', 'U', 'O‘']);
const UZC = new Set(['B', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'V', 'X', 'Z', 'G‘', 'SH', 'CH']);
function sylUz(cells) {
  for (let i = 1; i + 1 < cells.length; i++) if (cells[i] === 'Y' && UZC.has(cells[i - 1]) && UZV.has(cells[i + 1])) return null;
  if (cells.join('').includes('TS')) return null;
  return split(cells, UZV, C => (C.length ? C.length - 1 : 0));
}
// Ruscha (maktab qoidasi, ochiq bo'g'in): ма-ши-на, лам-па, кас-са, чай-ка, конь-ки. Unlilar orasida 2+ shovqinli
// undosh bo'lgan (ко-шка / кош-ка kabi bahsli) so'zlar olinmaydi.
const RUV = new Set([...'АЕЁИОУЫЭЮЯ']), SON = new Set([...'РЛМН']);
function sylRu(cells) {
  let ok = true;
  const out = split(cells, RUV, C => {
    if (C.length <= 1) return 0;
    const soft = Math.max(C.lastIndexOf('Ь'), C.lastIndexOf('Ъ'));
    if (soft >= 0) { if (C.length - soft - 1 > 1) ok = false; return soft + 1; }
    if (C[0] === 'Й') { if (C.length > 2) ok = false; return 1; }
    if (C.length === 2 && (C[0] === C[1] || SON.has(C[0]))) return 1;
    ok = false; return 0;
  });
  return ok ? out : null;
}
function split(cells, V, stay) {
  const vi = cells.map((c, i) => (V.has(c) ? i : -1)).filter(i => i >= 0);
  if (vi.length < 2) return null;
  const out = []; let s = 0;
  for (let j = 0; j + 1 < vi.length; j++) {
    const a = vi[j], b = vi[j + 1];
    const cut = a + 1 + stay(cells.slice(a + 1, b));
    out.push(cells.slice(s, cut).join('')); s = cut;
  }
  out.push(cells.slice(s).join(''));
  return out;
}
// Inglizcha: lug'atdagi bo'linish bo'yicha qo'lda ajratilgan
const EN = {
  school: 'LES-SON NOTE-BOOK PEN-CIL BACK-PACK RU-LER E-RAS-ER PROJ-ECT PRIN-CI-PAL TEXT-BOOK STU-DENT TEACH-ER PA-PER QUES-TION AN-SWER AL-PHA-BET EX-AM DIC-TA-TION LI-BRAR-Y HOME-WORK SCIS-SORS',
  autumn: 'AU-TUMN HAR-VEST AP-PLE MEL-ON PUMP-KIN FARM-ER COT-TON POME-GRAN-ATE WAL-NUT SEP-TEM-BER OC-TO-BER NO-VEM-BER UM-BREL-LA PUD-DLE MUSH-ROOM A-CORN',
  winter: 'WIN-TER SNOW-FLAKE SNOW-MAN MIT-TENS HOL-I-DAY DE-CEM-BER JAN-U-AR-Y FEB-RU-AR-Y BLIZ-ZARD I-CI-CLE FIRE-PLACE BLAN-KET CAN-DLE IG-LOO PEN-GUIN SWEAT-ER SNOW-BALL',
  animals: 'RAB-BIT LI-ON TI-GER EL-E-PHANT ZE-BRA MON-KEY PEA-COCK TUR-TLE CAM-EL LEOP-ARD CROC-O-DILE ROOST-ER PHEAS-ANT GI-RAFFE EA-GLE HEDGE-HOG BUT-TER-FLY SQUIR-REL',
  food: 'PI-LAF SAM-SA DUMP-LINGS NOO-DLES KE-BAB HON-EY YO-GURT SAL-AD ON-ION CAR-ROT PO-TA-TO TO-MA-TO CU-CUM-BER BUT-TER SUG-AR POR-RIDGE COOK-IE PAS-TA PIZ-ZA SAND-WICH PAN-CAKE',
  nature: 'NA-TURE FLOW-ER RIV-ER MOUN-TAIN DES-ERT FOR-EST WA-TER-FALL RAIN-BOW LIGHT-NING THUN-DER VAL-LEY IS-LAND MEAD-OW',
  sport: 'FOOT-BALL BAS-KET-BALL VOL-LEY-BALL SWIM-MING RUN-NING CHECK-ERS BI-CY-CLE TEN-NIS BOX-ING WRES-TLING SKI-ING STA-DI-UM MED-AL CHAM-PI-ON DUMB-BELL MAR-A-THON GYM-NAS-TICS REF-ER-EE VIC-TO-RY CON-TEST EX-ER-CISE O-LYM-PICS JU-DO WHIS-TLE FIN-ISH',
  space: 'PLAN-ET ROCK-ET COM-ET GAL-AX-Y TEL-E-SCOPE AS-TRO-NAUT SAT-EL-LITE OR-BIT VE-NUS JU-PI-TER SAT-URN U-RA-NUS NEP-TUNE MER-CU-RY ME-TE-OR AS-TER-OID STA-TION AT-MOS-PHERE SPACE-SUIT U-NI-VERSE CRA-TER GRAV-I-TY SPACE-SHIP A-LI-EN',
  jobs: 'DOC-TOR TEACH-ER DRIV-ER BUILD-ER FARM-ER EN-GI-NEER PI-LOT FIRE-FIGHT-ER BAR-BER CASH-IER ART-IST COM-POS-ER PO-ET WRIT-ER TAI-LOR CAR-PEN-TER GAR-DEN-ER SHEP-HERD FISH-ER ME-CHAN-IC AR-CHI-TECT BUTCH-ER BAK-ER COU-RI-ER AC-TOR SCI-EN-TIST LAW-YER MU-SI-CIAN LI-BRAR-I-AN DEN-TIST',
  transport: 'AIR-PLANE HEL-I-COP-TER BI-CY-CLE MO-TOR-CY-CLE TROL-LEY-BUS SUB-WAY TAX-I TRAC-TOR EX-CA-VA-TOR ROCK-ET SCOOT-ER AIR-PORT DRIV-ER TICK-ET TUN-NEL SUB-MA-RINE BAL-LOON STA-TION',
  computer: 'COM-PUT-ER LAP-TOP TAB-LET KEY-BOARD MON-I-TOR PRINT-ER IN-TER-NET WEB-SITE PASS-WORD FOLD-ER PRO-GRAM RO-BOT AL-GO-RITHM PRO-CES-SOR MEM-O-RY CAM-ER-A MI-CRO-PHONE HEAD-PHONES BROWS-ER AN-TI-VI-RUS PRO-GRAM-MER MES-SAGE E-MAIL NET-WORK SERV-ER ON-LINE PIX-EL CUR-SOR'
};

const cache = {};
// Mavzu bo'yicha bo'g'inli so'zlar: { word, syl: [...] }
function sylBank(lang, topic) {
  const k = lang + '|' + topic;
  if (!cache[k]) {
    if (lang === 'en') cache[k] = EN[topic].split(' ').map(s => ({ word: s.replace(/-/g, ''), syl: s.split('-') }));
    else cache[k] = bankOf(lang, topic).map(w => ({ word: w.text, syl: lang === 'uz' ? sylUz(w.cells) : sylRu(w.cells) })).filter(x => x.syl);
  }
  return cache[k];
}
function sylAll(lang) {
  const k = lang + '|*';
  if (!cache[k]) { const m = new Map(); for (const tp of TOPICS) for (const x of sylBank(lang, tp.key)) m.set(x.word, x); cache[k] = [...m.values()]; }
  return cache[k];
}
export const syllablesOf = (word, lang) => (sylAll(lang).find(x => x.word === word) || {}).syl || null;

// Kartochkalar to'plamidan n ta so'zni (extra ta kartochka ortiqcha) necha xil usulda yig'ish mumkin
export function countPartitions(cards, n, extra, lang, limit = 2) {
  const all = sylAll(lang);
  const cnt = new Map(); cards.forEach(c => cnt.set(c, (cnt.get(c) || 0) + 1));
  const cand = all.filter(x => { const m = new Map(); for (const s of x.syl) { m.set(s, (m.get(s) || 0) + 1); if (m.get(s) > (cnt.get(s) || 0)) return false; } return true; });
  const found = new Set();
  const rec = (start, left, words) => {
    if (found.size >= limit) return;
    if (words.length === n) {
      const rest = [...left.values()].reduce((a, b) => a + b, 0);
      if (rest === extra) found.add(words.slice().sort().join(' '));
      return;
    }
    for (let i = start; i < cand.length; i++) {
      const x = cand[i];
      if (!x.syl.every(s => (left.get(s) || 0) >= x.syl.filter(t => t === s).length)) continue;
      x.syl.forEach(s => left.set(s, left.get(s) - 1));
      words.push(x.word); rec(i + 1, left, words); words.pop();
      x.syl.forEach(s => left.set(s, left.get(s) + 1));
      if (found.size >= limit) return;
    }
  };
  rec(0, new Map(cnt), []);
  return found.size;
}

// n — so'zlar [1, 2, 4 tadan]; syl — bo'g'inlar soni; mixed — hamma kartochka aralash; extra — ortiqcha kartochka
const LEVELS = [
  { n: [6, 4, 3], syl: [2, 2] },
  { n: [7, 5, 4], syl: [2, 3] },
  { n: [5, 4, 3], syl: [2, 3], mixed: true },
  { n: [6, 4, 3], syl: [2, 4], mixed: true, extra: 2 }
];

function pick(pool, n, L, rand, used = new Set()) {
  const ok = pool.filter(x => x.syl.length >= L.syl[0] && x.syl.length <= L.syl[1] && !used.has(x.word) && new Set(x.syl).size > 1);
  return shuffle(ok, rand).slice(0, n);
}

const RULE = {
  uz: (L, n, tn) => (L.mixed
    ? `Kartochkalardagi bo'g'inlardan ${n} ta so'z tuz va chiziqlarga yoz. Har bir kartochka bir marta ishlatiladi.${L.extra ? ` ${L.extra} ta kartochka ortiqcha.` : ''}`
    : "Har qatordagi bo'g'inlarni to'g'ri tartibda qo'shib, so'zni tuz va chiziqqa yoz.") + ` So'zlar asosan «${tn}» mavzusidan.`,
  ru: (L, n, tn) => (L.mixed
    ? `Составь из слогов на карточках ${n} слов и запиши их на строчках. Каждая карточка используется один раз.${L.extra ? ` ${L.extra} карточки лишние.` : ''}`
    : 'Сложи слоги в каждой строке в правильном порядке и запиши слово.') + ` Слова в основном на тему «${tn}».`,
  en: (L, n, tn) => (L.mixed
    ? `Make ${n} words from the syllable cards and write them on the lines. Use each card once.${L.extra ? ` ${L.extra} cards are left over.` : ''}`
    : 'Put the syllables in each row in the right order to make a word and write it on the line.') + ` Most words are about “${tn}”.`
};

function card(ctx, x, y, w, h, text, scale) {
  roundRect(ctx, x, y, w, h, h * 0.28);
  ctx.fillStyle = '#FEF3C7'; ctx.fill();
  ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = Math.max(0.3, 0.45 * scale); ctx.stroke();
  font(ctx, h * 0.5, 800); ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h * 0.54);
}

export default {
  id: 'syllables',
  skills: ['language', 'attention'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  usesLang: true,
  name: { uz: "Bo'g'inlardan so'z", ru: 'Слова из слогов', en: 'Syllable words' },
  desc: {
    uz: "Bo'g'in kartochkalarini qo'shib so'z yasash: ki-tob, mak-tab",
    ru: 'Сложить слова из карточек со слогами: ма-ши-на, лам-па',
    en: 'Put syllable cards together to make words: pen-cil, rab-bit'
  },
  fileBase: { uz: "Bo'g'inlardan so'z", ru: 'Слова из слогов', en: 'Syllable words' },
  defaultTitle: { uz: "Bo'g'inlardan so'z tuz!", ru: 'Составь слова из слогов!', en: 'Build words from syllables!' },
  options: [{ key: 'level', type: 'level', default: 0 }, TOPIC_OPTION],
  levelHint: {
    uz: ["Ikki bo'g'inli so'zlar, har qatorda bitta so'z", "2–3 bo'g'inli so'zlar", "Hamma bo'g'inlar aralash: 5 ta so'z", "Aralash bo'g'inlar, 6 ta so'z va 2 ta ortiqcha kartochka"],
    ru: ['Слова из двух слогов, по одному в строке', 'Слова из 2–3 слогов', 'Все слоги вперемешку: 5 слов', 'Слоги вперемешку, 6 слов и 2 лишние карточки'],
    en: ['Two-syllable words, one per row', 'Words of 2–3 syllables', 'All the syllables mixed: 5 words', 'Mixed syllables, 6 words and 2 extra cards']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level], lang = langOf(opts), topic = topicOf(opts);
    const rand = makeRng(seed);
    const n = L.n[opts.perPage === 4 ? 2 : opts.perPage === 2 ? 1 : 0];
    const pool = sylBank(lang, topic);
    if (!L.mixed) {
      let words = pick(pool, n, L, rand);
      if (words.length < n) words = [...words, ...pick(sylAll(lang), n - words.length, L, rand, new Set(words.map(w => w.word)))];
      return { level, seed, lang, topic, rows: words.map(w => {
        // kartochkalar albatta aralashgan bo'lsin (TO-MA-TO kabi takroriy bo'g'inlarda ham)
        let cards = w.syl.slice();
        for (let t = 0; t < 30 && cards.join() === w.syl.join(); t++) cards = shuffle(w.syl.slice(), rand);
        if (cards.join() === w.syl.join()) cards = [...w.syl.slice(1), w.syl[0]];
        return { word: w.word, syl: w.syl, cards };
      }) };
    }
    for (let t = 0; t < 200; t++) {
      let words = pick(t < 120 ? pool : sylAll(lang), n, L, rand);
      if (words.length < n) continue;
      let extras = [];
      if (L.extra) {
        const used = new Set(words.map(w => w.word));
        extras = shuffle(sylAll(lang).filter(x => !used.has(x.word)).flatMap(x => x.syl), rand).slice(0, L.extra);
      }
      const cards = shuffle([...words.flatMap(w => w.syl), ...extras], rand);
      if (countPartitions(cards, n, extras.length, lang, 2) !== 1) continue;
      return { level, seed, lang, topic, words: words.map(w => ({ word: w.word, syl: w.syl })), cards, extras };
    }
    throw new Error('syllables: no puzzle');
  },

  info(p, lang) {
    const c = p.rows ? p.rows.length : p.words.length;
    return { uz: `${c} ta so'z, «${topicName(p.topic, lang)}»`, ru: `Слов: ${c}, «${topicName(p.topic, lang)}»`, en: `${c} words, “${topicName(p.topic, lang)}”` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box), L = LEVELS[p.level];
    const n = p.rows ? p.rows.length : p.words.length;
    const rule = measureRule(ctx, (RULE[lang] || RULE.uz)(L, n, topicName(p.topic, p.lang)), box.w, scale);
    const gap = 6 * scale, H = box.h - rule.h - gap;
    let ch = Math.min(11 * scale, 12);                   // kartochka balandligi
    const cw = s => { font(ctx, ch * 0.5, 800); return ctx.measureText(s).width + ch * 0.9; };
    if (p.rows) for (let it = 0; it < 4; it++) {         // qator sig'masa, kartochkalarni kichraytiramiz
      const cardsW = Math.max(...p.rows.map(r => r.cards.reduce((s, c) => s + cw(c) + ch * 0.35, 0)));
      const rowW = 7 * scale + cardsW + ch * 1.2 + Math.max(cardsW * 1.1, 36 * scale);
      if (rowW <= box.w) break;
      ch *= box.w / rowW * 0.97;
    }
    const numW = 7 * scale;
    let bottom;
    const answerLine = (x, y, w, text) => {
      ctx.strokeStyle = MUTE; ctx.lineWidth = Math.max(0.25, 0.3 * scale);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke();
      if (text) { font(ctx, ch * 0.55, 800); ctx.fillStyle = ANSWER; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(text, x + ch * 0.2, y - ch * 0.15); }
    };
    if (p.rows) {
      const widths = p.rows.map(r => r.cards.reduce((s, c) => s + cw(c) + ch * 0.35, 0));
      const cardsW = Math.max(...widths), lineW = Math.min(Math.max(cardsW * 1.1, 36 * scale), box.w - numW - cardsW - ch * 1.2);
      const rowW = numW + cardsW + ch * 1.2 + lineW;
      const cols = rowW * 2 + gap * 2 <= box.w ? 2 : 1, perCol = Math.ceil(n / cols);
      const rowH = Math.min(ch * 2.3, H / perCol);
      const colW = box.w / cols;
      const gy = box.y + Math.max(0, (H - perCol * rowH) * 0.3);
      p.rows.forEach((r, i) => {
        const c = Math.floor(i / perCol), k = i % perCol;
        const x0 = box.x + c * colW + (colW - rowW) / 2, y0 = gy + k * rowH;
        font(ctx, Math.min(4.6 * scale, ch * 0.45), 800); ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(`${i + 1}.`, x0, y0 + ch / 2);
        let x = x0 + numW;
        r.cards.forEach(s => { const w = cw(s); card(ctx, x, y0, w, ch, s, scale); x += w + ch * 0.35; });
        x = x0 + numW + cardsW + ch * 0.3;
        font(ctx, ch * 0.6, 800); ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.fillText('→', x, y0 + ch * 0.55);
        answerLine(x0 + numW + cardsW + ch * 1.2, y0 + ch * 0.95, lineW, showSolution ? r.syl.join('-') : '');
      });
      bottom = gy + perCol * rowH;
    } else {
      // aralash kartochkalar — ramka ichida
      const items = p.cards.map(s => ({ s, w: cw(s) }));
      const lines = [[]]; let lw = 0;
      const inner = box.w - gap * 2;
      for (const it of items) { if (lw + it.w > inner && lines[lines.length - 1].length) { lines.push([]); lw = 0; } lines[lines.length - 1].push(it); lw += it.w + ch * 0.45; }
      const poolH = lines.length * ch * 1.45 + gap;
      roundRect(ctx, box.x, box.y, box.w, poolH, 3 * scale); ctx.strokeStyle = '#C7D2FE'; ctx.lineWidth = Math.max(0.3, 0.4 * scale); ctx.stroke();
      lines.forEach((ln, li) => {
        const tw = ln.reduce((s, it) => s + it.w + ch * 0.45, -ch * 0.45);
        let x = box.x + (box.w - tw) / 2;
        for (const it of ln) {
          card(ctx, x, box.y + gap / 2 + li * ch * 1.45, it.w, ch, it.s, scale);
          if (showSolution && p.extras.includes(it.s) && !it.marked && p.extras.filter(e => e === it.s).length > items.filter(o => o.marked && o.s === it.s).length) {
            it.marked = true;
            ctx.save(); ctx.strokeStyle = ANSWER; ctx.lineWidth = Math.max(0.4, 0.6 * scale);
            ctx.beginPath(); ctx.moveTo(x, box.y + gap / 2 + li * ch * 1.45); ctx.lineTo(x + it.w, box.y + gap / 2 + li * ch * 1.45 + ch); ctx.stroke(); ctx.restore();
          }
          x += it.w + ch * 0.45;
        }
      });
      // javob chiziqlari
      const cols = n > 3 && box.w > 120 ? 2 : 1, perCol = Math.ceil(n / cols), colW = box.w / cols;
      const top = box.y + poolH + gap * 1.5, rowH = Math.min(ch * 2, (H - poolH - gap * 1.5) / perCol);
      for (let i = 0; i < n; i++) {
        const c = Math.floor(i / perCol), k = i % perCol, x0 = box.x + c * colW + gap, y0 = top + k * rowH;
        font(ctx, Math.min(4.6 * scale, ch * 0.45), 800); ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(`${i + 1}.`, x0, y0 + ch * 0.6);
        answerLine(x0 + numW, y0 + ch, colW - numW - gap * 2, showSolution ? p.words[i].syl.join('-') : '');
      }
      bottom = top + perCol * rowH;
    }
    drawRule(ctx, rule, box.x + box.w / 2, bottom + gap * 0.3);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const n = p.rows ? p.rows.length : p.words.length;
    const T = { uz: `So'zlar: ${n} ta`, ru: `Слов: ${n}`, en: `Words: ${n}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const L = LEVELS[p.level];
    const list = p.rows || p.words;
    for (const w of list) {
      if (w.syl.join('') !== w.word) problems.push('syllables do not make the word ' + w.word);
      if (w.syl.length < L.syl[0] || w.syl.length > L.syl[1]) problems.push('syllable count ' + w.word);
      const ref = syllablesOf(w.word, p.lang);
      if (!ref || ref.join('-') !== w.syl.join('-')) problems.push('not from syllable bank ' + w.word);
    }
    if (new Set(list.map(w => w.word)).size !== list.length) problems.push('repeated word');
    if (p.rows) for (const r of p.rows) { if (r.cards.join() === r.syl.join()) problems.push('cards not mixed'); if (r.cards.slice().sort().join() !== r.syl.slice().sort().join()) problems.push('cards differ'); }
    if (p.words) {
      const want = [...p.words.flatMap(w => w.syl), ...p.extras].sort().join('|');
      if (p.cards.slice().sort().join('|') !== want) problems.push('card set wrong');
      if (countPartitions(p.cards, p.words.length, p.extras.length, p.lang, 2) !== 1) problems.push('not unique');
    }
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-syllables" aria-hidden="true"><defs><linearGradient id="cg-syllables" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffecd2"/><stop offset="1" stop-color="#fcb69f"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-syllables)"/><g font-family="Nunito, sans-serif" font-weight="900" font-size="22" text-anchor="middle"><g class="sy-a"><rect x="28" y="50" width="60" height="38" rx="11" fill="#FEF3C7" stroke="#F59E0B" stroke-width="3.5"/><text x="58" y="76" fill="#111827">TOB</text></g><g class="sy-b"><rect x="112" y="50" width="60" height="38" rx="11" fill="#FEF3C7" stroke="#F59E0B" stroke-width="3.5"/><text x="142" y="76" fill="#111827">KI</text></g></g><path d="M100 98v16M93 107l7 7 7-7" fill="none" stroke="#7c2d12" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M40 160h120" stroke="#6B7280" stroke-width="3"/><text class="sy-w" x="100" y="150" font-family="Nunito, sans-serif" font-weight="900" font-size="26" text-anchor="middle" fill="#DC2626">KI-TOB</text></svg>`
};
