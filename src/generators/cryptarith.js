// cryptarith.js — «Harfli misollar» (Шифрованные примеры / Letter sums) generatori. v2.8
// Ustun bo'lib qo'shish (qiyinroqda — ko'paytirish va ayirish ham), ayrim raqamlar harflar bilan almashtirilgan:
// bir xil harf — bir xil raqam, har xil harf — har xil raqam, son 0 bilan boshlanmaydi. Harflarning qiymatini
// topish kerak; eng qiyin darajada ba'zi misollarda faqat harflar yig'indisi so'raladi (A + B + D = ?).
// Kafolat (check()): barcha mumkin bo'lgan almashtirishlar sinab ko'riladi — yechim aynan bitta.
// Qolip: Az «Şifrəli əməllər».

import { makeRng, randInt, shuffle, pickOne } from '../core/rng.js';
import { INK, MUTE, ANSWER, PT, font } from '../core/draw.js';
import { scaleOf, measureRule, drawRule, answerBox, ruPlural } from '../core/parts.js';

// d — qo'shiluvchilar xonasi; L — harflar soni; ops — sahifadagi amallar navbati (ko'paytirish: ikki yoki uch
// xonali × bir xonali); askSum — ba'zi misollarda harflar yig'indisi so'raladi; count — [1, 2, 4 tadan]
const LEVELS = [
  { d: [2, 2], L: 2, ops: ['+'], askSum: false, count: [6, 3, 2] },
  { d: [2, 2], L: 3, ops: ['+'], askSum: false, count: [6, 3, 2] },
  { d: [3, 3], L: 4, ops: ['+', '*', '+'], askSum: false, count: [4, 2, 2] },
  { d: [3, 3], L: 5, ops: ['+', '*', '-', '*'], askSum: true, count: [4, 2, 2] }
];
const calc = (op, a, b) => (op === '+' ? a + b : op === '-' ? a - b : a * b);
const OP_SIGN = { '+': '+', '-': '−', '*': '×' };
const LETTERS = { uz: [...'ABDEKLMNRST'], ru: [...'АБВГДКЛМНРС'], en: [...'ABCDEKLMNRS'] };

// Satrlar: belgilar ro'yxati (raqam — son, harf — 'L0'...'L5' indeks)
function encode(str, map) { return [...str].map(ch => (map.has(ch) ? 'L' + map.get(ch) : +ch)); }
const lead = row => row[0];

// Yechimlar soni (limit gacha): harflarga har xil raqamlar, bosh raqam 0 emas, a op b = c.
// Harflar o'ng ustundan chapga qarab qo'yiladi; har k ustun to'lganda «oxirgi k raqam» (mod 10^k) tekshiriladi —
// qo'shish, ayirish va ko'paytirishda ham to'g'ri, shuning uchun qidiruv tez kesiladi.
export function countSolutions(pz, limit = 2) {
  const nL = pz.nL, digits = new Array(nL).fill(-1), used = new Array(10).fill(false);
  const leads = new Set([pz.a, pz.b, pz.c].map(r => (typeof r[0] === 'string' ? +r[0].slice(1) : -1)).filter(i => i >= 0));
  const rows = [pz.a, pz.b, pz.c].map(r => r.slice().reverse());
  const maxK = Math.max(...rows.map(r => r.length));
  const order = [];
  for (let k = 0; k < maxK; k++) for (const r of rows) {
    const v = r[k];
    if (typeof v === 'string' && !order.includes(+v.slice(1))) order.push(+v.slice(1));
  }
  for (let i = 0; i < nL; i++) if (!order.includes(i)) order.push(i);
  const pos = new Array(nL); order.forEach((li, d) => { pos[li] = d; });
  const checksAt = Array.from({ length: nL }, () => []);
  for (let k = 1; k <= maxK; k++) {
    let need = -1;
    for (const r of rows) for (let j = 0; j < Math.min(k, r.length); j++) if (typeof r[j] === 'string') need = Math.max(need, pos[+r[j].slice(1)]);
    if (need >= 0) checksAt[need].push(k);
  }
  const dig = x => (typeof x === 'string' ? digits[+x.slice(1)] : x);
  const low = (r, k) => { let v = 0, p = 1; for (let j = 0; j < Math.min(k, r.length); j++) { v += dig(r[j]) * p; p *= 10; } return v; };
  const okLow = k => {
    const m = 10 ** k, A = low(rows[0], k), B = low(rows[1], k), C = low(rows[2], k);
    return ((calc(pz.op, A, B) % m) + m) % m === C;
  };
  const val = row => row.reduce((s, x) => s * 10 + dig(x), 0);
  let count = 0;
  const rec = d => {
    if (count >= limit) return;
    if (d === nL) {
      if (calc(pz.op, val(pz.a), val(pz.b)) === val(pz.c)) count++;
      return;
    }
    const li = order[d];
    for (let v = 0; v <= 9; v++) {
      if (used[v] || (v === 0 && leads.has(li))) continue;
      used[v] = true; digits[li] = v;
      if (checksAt[d].every(okLow)) rec(d + 1);
      used[v] = false; digits[li] = -1;
      if (count >= limit) return;
    }
  };
  rec(0);
  return count;
}

function build(L, rand, used, op0) {
  for (let guard = 0; guard < 900; guard++) {
    const op = guard < 600 ? op0 : '*';            // juda kam hollarda boshqa amal bilan topiladi
    const lo = d => 10 ** (d - 1), hi = d => 10 ** d - 1;
    let x = randInt(rand, lo(L.d[0]), hi(L.d[0])), y = randInt(rand, lo(L.d[1]), hi(L.d[1]));
    // ko'paytirish: ikki (eng qiyinida uch) xonali son × bir xonali son
    if (op === '*') { x = L.L >= 5 ? randInt(rand, 102, 499) : randInt(rand, 12, 49); y = randInt(rand, 2, 9); }
    // ayirish: bir xona ko'p sondan (1000–1999 − 3 xonali): kamayuvchidagi «1» harflarni bog'laydi
    if (op === '-') { x = randInt(rand, 10 ** L.d[0], 2 * 10 ** L.d[0] - 1); y = randInt(rand, lo(L.d[1]), hi(L.d[1])); }
    const z = calc(op, x, y);
    if (op === '-' && z < lo(L.d[0])) continue;
    const all = `${x}${y}${z}`;
    // ko'p takrorlanadigan raqamlar harfga aylanadi (yechim tezroq yagona bo'ladi), tasodif bilan aralash
    const freq = d => [...all].filter(ch => ch === d).length;
    const ds = [...new Set(all)].map(d => [d, freq(d) + rand() * 1.5]).sort((u, v) => v[1] - u[1]).map(u => u[0]);
    if (ds.length < L.L) continue;
    const hide = shuffle(ds.slice(0, L.L), rand);
    const map = new Map(hide.map((d, i) => [d, i]));
    const pz = { op, a: encode(String(x), map), b: encode(String(y), map), c: encode(String(z), map), nL: L.L };
    // har bir qatorda kamida bitta harf bo'lsin (ko'paytirishda bir xonali ko'paytuvchi ochiq qolishi mumkin)
    if (![pz.a, pz.b, pz.c].every((row, i) => (op === '*' && i === 1) || row.some(v => typeof v === 'string'))) continue;
    const k = JSON.stringify(pz);
    if (used.has(k)) continue;
    if (countSolutions(pz, 2) !== 1) continue;
    used.add(k);
    return { ...pz, vals: hide.map(Number), x, y, z };
  }
  throw new Error('cryptarith: no puzzle');
}

const RULE = {
  uz: "Har bir harf bitta raqamni bildiradi: bir xil harf — bir xil raqam, har xil harf — har xil raqam. Sonlar 0 bilan boshlanmaydi. Harflar o'rniga qaysi raqamlar turibdi?",
  ru: 'Каждая буква — цифра: одинаковые буквы — одинаковые цифры, разные буквы — разные цифры. Числа не начинаются с 0. Какие цифры спрятаны за буквами?',
  en: 'Each letter stands for a digit: the same letter is the same digit, different letters are different digits. Numbers never start with 0. Which digits are hidden behind the letters?'
};
const RULE_SUM = {
  uz: " «A + B + … = ?» bo'lgan misolda harflar qiymatlarining yig'indisini yoz.",
  ru: ' Где написано «А + Б + … = ?», запиши сумму значений букв.',
  en: ' Where it says “A + B + … = ?”, write the sum of the letters.'
};

export default {
  id: 'cryptarith',
  skills: ['counting', 'logic'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  usesLang: true,
  name: { uz: 'Harfli misollar', ru: 'Шифрованные примеры', en: 'Letter sums' },
  desc: {
    uz: "Ustun bo'lib qo'shishda raqamlar harflar bilan almashtirilgan: har bir harf qaysi raqam ekanini toping",
    ru: 'В примерах столбиком цифры заменены буквами: найдите, какая цифра за каждой буквой',
    en: 'In column sums some digits are replaced by letters: find the digit behind each letter'
  },
  fileBase: { uz: 'Harfli misollar', ru: 'Шифрованные примеры', en: 'Letter sums' },
  defaultTitle: { uz: 'Harflarni raqamga aylantir!', ru: 'Расшифруй пример!', en: 'Crack the code!' },
  options: [{ key: 'level', type: 'level', default: 1 }],
  levelHint: {
    uz: ['Ikki xonali sonlar, 2 ta harf', 'Ikki xonali sonlar, 3 ta harf', "Uch xonali sonlar, 4 ta harf, ko'paytirish ham", "5 ta harf, ayirish va ko'paytirish, harflar yig'indisi"],
    ru: ['Двузначные числа, 2 буквы', 'Двузначные числа, 3 буквы', 'Трёхзначные числа, 4 буквы, есть умножение', '5 букв, вычитание и умножение, сумма букв'],
    en: ['Two-digit numbers, 2 letters', 'Two-digit numbers, 3 letters', 'Three-digit numbers, 4 letters, multiplying too', '5 letters, subtracting and multiplying, sum of letters']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const lang = ['uz', 'ru', 'en'].includes(opts.lang) ? opts.lang : 'uz';
    const L = LEVELS[level];
    const rand = makeRng(seed);
    const count = L.count[opts.perPage === 4 ? 2 : opts.perPage === 2 ? 1 : 0];
    const used = new Set(), items = [];
    const plan = shuffle(Array.from({ length: count }, (_, k) => L.ops[k % L.ops.length]), rand);
    for (const op of plan) items.push(build(L, rand, used, op));
    // har topshiriqqa o'z harflari (alifbodan tasodifiy, takrorlanmaydi)
    items.forEach((it, k) => {
      it.letters = shuffle((LETTERS[lang] || LETTERS.uz).slice(), rand).slice(0, it.nL);
      if (L.askSum && k % 2 === 1) it.askSum = true;      // har ikkinchi misolda — harflar yig'indisi
    });
    return { level, seed, lang, items };
  },

  info(p, lang) {
    const c = p.items.length;
    return { uz: `${c} ta misol`, ru: `${c} ${ruPlural(c, 'пример', 'примера', 'примеров')}`, en: `${c} sum${c > 1 ? 's' : ''}` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box), n = p.items.length;
    const anySum = p.items.some(it => it.askSum);
    const rule = measureRule(ctx, (RULE[lang] || RULE.uz) + (anySum ? (RULE_SUM[lang] || RULE_SUM.uz) : ''), box.w, scale);
    const gap = 8 * scale, H = box.h - rule.h - gap;
    const W = Math.max(...p.items.map(it => Math.max(it.a.length, it.b.length, it.c.length))) + 1;   // + belgi uchun
    const unitW = W + 0.6, unitH = 3 + 0.5 + 1.6;      // 3 satr + chiziq + harflar qatori
    let best = null;
    for (let cols = 1; cols <= Math.min(3, n); cols++) {
      const rows = Math.ceil(n / cols);
      const nl = Math.max(...p.items.map(it => it.nL));
      const cw = (box.w - (cols - 1) * gap) / cols;
      const c = Math.min(cw / Math.max(unitW, nl * 2.4), (H - (rows - 1) * gap) / rows / unitH, 14 * scale);
      if (!best || c > best.c + 0.01) best = { cols, rows, cw, c };
    }
    const { cols, rows, cw, c } = best;
    const bh = unitH * c;
    const gy = box.y + Math.max(0, (H - rows * bh - (rows - 1) * gap) * 0.3);
    p.items.forEach((it, k) => {
      const bx = box.x + (k % cols) * (cw + gap), by = gy + Math.floor(k / cols) * (bh + gap);
      if (n > 1) { font(ctx, Math.min(c * 0.45, 4.4 * scale), 800); ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(`${k + 1}.`, bx, by); }
      const xr = bx + cw / 2 + (W * c) / 2;          // o'ng chet (birliklar xonasi)
      const cellTxt = (v, i, j, y) => {
        const x = xr - (j + 0.5) * c;
        const isL = typeof v === 'string';
        // javobda harf o'rniga topilgan raqam (qizil)
        const t = isL ? (showSolution ? String(it.vals[+v.slice(1)]) : it.letters[+v.slice(1)]) : String(v);
        font(ctx, c * 0.78, 800); ctx.fillStyle = isL ? (showSolution ? ANSWER : '#4338CA') : INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(t, x, y);
      };
      const rowsT = [it.a, it.b, it.c];
      rowsT.forEach((r, i) => {
        const y = by + c * (i === 2 ? 2.7 : i + 0.6);
        r.slice().reverse().forEach((v, j) => cellTxt(v, i, j, y));
      });
      // amal belgisi va chiziq
      font(ctx, c * 0.7, 800); ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(OP_SIGN[it.op], xr - (W - 0.4) * c, by + c * 1.1);
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.3, c * 0.05);
      ctx.beginPath(); ctx.moveTo(xr - (W - 0.6) * c, by + c * 2.15); ctx.lineTo(xr + c * 0.1, by + c * 2.15); ctx.stroke();
      // harflar: A = [ ]  yoki  A + B + D = [ ]
      const ly = by + c * 3.55;
      if (it.askSum) {
        const txt = it.letters.join(' + ') + ' =';
        let fs = c * 0.55; font(ctx, fs, 800);
        const bw = c * 1.3, tw = ctx.measureText(txt).width;
        if (tw + bw + c * 0.3 > cw) { fs *= (cw - bw - c * 0.3) / tw; font(ctx, fs, 800); }
        const tot = ctx.measureText(txt).width + c * 0.3 + bw, lx = bx + (cw - tot) / 2;
        ctx.fillStyle = '#4338CA'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(txt, lx, ly + c * 0.4);
        answerBox(ctx, lx + tot - bw, ly, bw, c * 0.8, scale, showSolution ? it.vals.reduce((s, v) => s + v, 0) : undefined);
        return;
      }
      const sw = Math.min(c * 2.3, cw / it.nL);
      const lx0 = bx + (cw - sw * it.nL) / 2;
      it.letters.forEach((ch, j) => {
        const x = lx0 + j * sw;
        font(ctx, c * 0.55, 800); ctx.fillStyle = '#4338CA'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(ch + ' =', x + sw * 0.5, ly + c * 0.4);
        answerBox(ctx, x + sw * 0.55, ly, sw * 0.38, c * 0.8, scale, showSolution ? it.vals[j] : undefined);
      });
    });
    drawRule(ctx, rule, box.x + box.w / 2, gy + rows * bh + (rows - 1) * gap + gap * 0.4);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const T = { uz: `Misollar: ${p.items.length}`, ru: `Примеров: ${p.items.length}`, en: `Sums: ${p.items.length}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    p.items.forEach((it, i) => {
      if (countSolutions(it, 2) !== 1) problems.push(`#${i}: not unique`);
      if (calc(it.op, it.x, it.y) !== it.z) problems.push(`#${i}: arithmetic`);
      if (new Set(it.vals).size !== it.vals.length) problems.push(`#${i}: repeated digit`);
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-cryptarith" aria-hidden="true"><defs><linearGradient id="cg-cryptarith" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f093fb"/><stop offset="1" stop-color="#f5576c"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-cryptarith)"/><rect x="34" y="28" width="132" height="146" rx="16" fill="#fff"/><g font-family="Nunito, sans-serif" font-weight="900" font-size="30" text-anchor="middle"><text x="104" y="68" fill="#4338CA">A</text><text x="130" y="68" fill="#111827">5</text><text x="60" y="88" fill="#111827">+</text><text x="104" y="100" fill="#111827">2</text><text x="130" y="100" fill="#4338CA">A</text><text x="104" y="140" fill="#111827">5</text><text x="130" y="140" fill="#111827">8</text></g><path d="M60 110H146" stroke="#111827" stroke-width="3.5"/><text x="86" y="166" font-family="Nunito, sans-serif" font-weight="900" font-size="20" text-anchor="middle" fill="#4338CA">A =</text><rect x="104" y="146" width="30" height="26" rx="6" fill="#fff" stroke="#111827" stroke-width="2.5"/><text class="ca-a" x="119" y="166" font-family="Nunito, sans-serif" font-weight="900" font-size="20" text-anchor="middle" fill="#DC2626">3</text></svg>`
};
