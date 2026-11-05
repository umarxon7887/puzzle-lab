// explain.js — «Shu topshiriqni tushuntir»: varaqdagi AYNAN shu topshiriqni qadamma-qadam yechish.
// Qadamlarni dastur hisoblaydi (AI emas): har qadam to'g'ri va token sarflanmaydi.
// Qadam: { text, focus: [katak], why: [katak], put: [[katak, yozuv]], line?: [k0, k1], path?: [...], seg? }
// Katak raqami — generator draw() qaytargan geo jadvalidagi indeks (qator * ustunlar + ustun).
// Bir varaqda bir nechta to'r bo'lsa — birinchisi tushuntiriladi.

import { buildSpec } from '../generators/sudoku.js';
import { evalCage } from '../generators/kenken.js';
import { lines as magicLines } from '../generators/magic.js';
import { ALPHABET as SCHULTE_ABC } from '../generators/schulte.js';

export const EXPLAIN_IDS = ['sudoku', 'futoshiki', 'kenken', 'magic', 'cross', 'schulte', 'words', 'maze'];
const MAX_STEPS = 400;

const L = (lang, o) => o[lang] || o.uz;
const bits = m => { const a = []; for (let v = 1; m >> v; v++) if (m & (1 << v)) a.push(v); return a; };
const one = m => m && (m & (m - 1)) === 0;
const val = m => 31 - Math.clz32(m);
const rcOf = (i, cols) => [Math.floor(i / cols) + 1, (i % cols) + 1];
const where = (lang, i, cols) => {
  const [r, c] = rcOf(i, cols);
  return L(lang, { uz: `${r}-qator, ${c}-ustun`, ru: `строка ${r}, столбец ${c}`, en: `row ${r}, column ${c}` });
};
const uniq = a => [...new Set(a)];

const T = {
  start: { uz: '«Keyingi» tugmasini bosing — har bosishda bir qadam birga yuramiz.', ru: 'Нажимайте «Дальше» — на каждом шаге делаем один ход вместе.', en: 'Press «Next»: we take one step together each time.' },
  done: { uz: 'Tayyor! Hamma kataklar to\'ldi. Javobni ko\'z tugmasi bilan solishtiring.', ru: 'Готово! Все клетки заполнены. Сверьте с ответом (кнопка с глазом).', en: 'Done! Every cell is filled. Compare with the answer (eye button).' },
  guess: { uz: (w, v) => `Bu yerda oddiy usullar yetmaydi (bu qiyin daraja). ${w} katagidagi son — ${v}: buni sinab ko'rib topish mumkin.`, ru: (w, v) => `Здесь простых приёмов мало (сложный уровень). В клетке ${w} стоит ${v}: это находят перебором.`, en: (w, v) => `Simple tricks are not enough here (hard level). The cell at ${w} is ${v}: you find it by trying.` }
};

// ---------- Sudoku ----------
const SD_LET = { uz: [...'ABCDEF'], ru: [...'АБВГДЕ'], en: [...'ABCDEF'] };
function sudoku(p, lang) {
  const spec = buildSpec(p.type, p.seed), N = p.N, g = p.puzzle.slice();
  const lab = v => (p.letters ? (SD_LET[lang] || SD_LET.uz)[v - 1] : String(v));
  const full = ((1 << (N + 1)) - 1) & ~1;
  const cand = i => { let m = full; for (const j of spec.peers[i]) if (g[j]) m &= ~(1 << g[j]); return m; };
  const unitName = ui => ui < N ? L(lang, { uz: 'qatorda', ru: 'в строке', en: 'row' }) : ui < 2 * N ? L(lang, { uz: 'ustunda', ru: 'в столбце', en: 'column' })
    : ui < 3 * N ? L(lang, { uz: p.jig ? 'shaklda' : 'blokda', ru: p.jig ? 'в фигуре' : 'в блоке', en: p.jig ? 'shape' : 'box' }) : L(lang, { uz: 'diagonalda', ru: 'на диагонали', en: 'diagonal' });
  const steps = [{ text: L(lang, {
    uz: `Qoida: har qator, ustun va ${p.jig ? 'shaklda' : 'blokda'} har bir ${p.letters ? 'harf' : 'son'} bir martadan. `,
    ru: `Правило: в каждой строке, столбце и ${p.jig ? 'фигуре' : 'блоке'} каждый ${p.letters ? 'символ' : 'знак'} по одному разу. `,
    en: `Rule: each ${p.letters ? 'letter' : 'digit'} once in every row, column and ${p.jig ? 'shape' : 'box'}. ` }) + L(lang, T.start) }];
  while (g.some(v => !v) && steps.length < MAX_STEPS) {
    let st = null;
    for (let i = 0; i < g.length && !st; i++) {
      if (g[i]) continue;
      const m = cand(i);
      if (one(m)) {
        const v = val(m), others = bits(full & ~m).map(lab).join(', ');
        st = { i, v, why: spec.peers[i].filter(j => g[j]), text: L(lang, {
          uz: `${where(lang, i, N)}: ko'k kataklarda ${others} bor. Bu katakka faqat ${lab(v)} qoladi.`,
          ru: `${where(lang, i, N)}: в синих клетках уже есть ${others}. Остаётся только ${lab(v)}.`,
          en: `${where(lang, i, N)}: the blue cells already hold ${others}. Only ${lab(v)} is left.` }) };
      }
    }
    for (let ui = 0; ui < spec.units.length && !st; ui++) {
      const u = spec.units[ui];
      for (let d = 1; d <= N && !st; d++) {
        if (u.some(i => g[i] === d)) continue;
        const spots = u.filter(i => !g[i] && (cand(i) & (1 << d)));
        if (spots.length !== 1) continue;
        const i = spots[0];
        const blockers = uniq(u.filter(k => !g[k] && k !== i).flatMap(k => spec.peers[k].filter(j => g[j] === d)));
        st = { i, v: d, why: u.filter(k => k !== i).concat(blockers), text: L(lang, {
          uz: `${lab(d)} qayerga tushadi? Bu ${unitName(ui)} boshqa bo'sh kataklarga ${lab(d)} sig'maydi (ko'k kataklardagi ${lab(d)} xalaqit beradi). Demak ${lab(d)} shu katakda.`,
          ru: `Куда поставить ${lab(d)}? ${unitName(ui)[0].toUpperCase() + unitName(ui).slice(1)} другие пустые клетки не подходят (мешают ${lab(d)} в синих клетках). Значит, ${lab(d)} здесь.`,
          en: `Where does ${lab(d)} go in this ${unitName(ui)}? The other empty cells are blocked by the blue ${lab(d)}s, so ${lab(d)} goes here.` }) };
      }
    }
    if (!st) {
      let i = -1, best = 99;
      g.forEach((v, k) => { if (!v) { const c = bits(cand(k)).length; if (c < best) { best = c; i = k; } } });
      st = { i, v: p.sol[i], why: [], text: L(lang, T.guess)(where(lang, i, N), lab(p.sol[i])) };
    }
    g[st.i] = st.v;
    steps.push({ text: st.text, focus: [st.i], why: st.why, put: [[st.i, lab(st.v)]] });
  }
  steps.push({ text: L(lang, T.done) });
  return steps;
}

// ---------- Futoshiki ----------
function futoshiki(p, lang) {
  const it = p.items[0], n = p.n, g = it.given.slice();
  const full = ((1 << (n + 1)) - 1) & ~1;
  const rowcol = i => { const r = Math.floor(i / n), c = i % n, a = []; for (let k = 0; k < n; k++) { a.push(r * n + k, k * n + c); } return uniq(a).filter(k => k !== i); };
  const basic = i => { let m = full; for (const j of rowcol(i)) if (g[j]) m &= ~(1 << g[j]); return m; };
  const steps = [{ text: L(lang, {
    uz: `Qoida: har qator va ustunda 1 dan ${n} gacha sonlar bir martadan. Belgining o'tkir uchi kichik son tomonga qaraydi. `,
    ru: `Правило: в каждой строке и столбце числа от 1 до ${n} по одному разу. Острый конец знака смотрит на меньшее число. `,
    en: `Rule: numbers 1 to ${n} once in every row and column. The point of a sign faces the smaller number. ` }) + L(lang, T.start) }];
  while (g.some(v => !v) && steps.length < MAX_STEPS) {
    const dom = g.map((v, i) => (v ? 1 << v : basic(i)));
    let ch = true;
    while (ch) {
      ch = false;
      for (const { a, b } of it.signs) {                  // sol[a] < sol[b]
        const hb = val(dom[b]), la = 31 - Math.clz32(dom[a] & -dom[a]);
        const na = dom[a] & ((1 << hb) - 1), nb = dom[b] & ~((1 << (la + 1)) - 1);
        if (na && na !== dom[a]) { dom[a] = na; ch = true; }
        if (nb && nb !== dom[b]) { dom[b] = nb; ch = true; }
      }
    }
    let st = null;
    for (let i = 0; i < g.length && !st; i++) {
      if (g[i] || !one(dom[i])) continue;
      const v = val(dom[i]);
      if (one(basic(i))) st = { i, v, why: rowcol(i).filter(j => g[j]), text: L(lang, {
        uz: `${where(lang, i, n)}: qator va ustunda boshqa sonlar bor (ko'k), faqat ${v} qoladi.`,
        ru: `${where(lang, i, n)}: в строке и столбце остальные числа уже есть (синие), остаётся ${v}.`,
        en: `${where(lang, i, n)}: the row and column already have the other numbers (blue), so it is ${v}.` }) };
      else {
        const nb = it.signs.filter(s => s.a === i || s.b === i).map(s => (s.a === i ? s.b : s.a));
        st = { i, v, why: nb.concat(rowcol(i).filter(j => g[j])), text: L(lang, {
          uz: `${where(lang, i, n)}: belgilarga qarang. Qo'shni kataklar bilan «<» va «>» shartini, qator va ustundagi sonlarni hisobga olsak, bu yerga faqat ${v} to'g'ri keladi.`,
          ru: `${where(lang, i, n)}: смотрим на знаки. С учётом «<» и «>» соседей и чисел в строке и столбце подходит только ${v}.`,
          en: `${where(lang, i, n)}: look at the signs. With the < and > next to it and the numbers in its row and column, only ${v} fits.` }) };
      }
    }
    for (let line = 0; line < 2 * n && !st; line++) {
      const u = Array.from({ length: n }, (_, k) => (line < n ? line * n + k : k * n + (line - n)));
      for (let v = 1; v <= n && !st; v++) {
        if (u.some(i => g[i] === v)) continue;
        const spots = u.filter(i => !g[i] && (dom[i] & (1 << v)));
        if (spots.length === 1) st = { i: spots[0], v, why: u.filter(k => k !== spots[0]), text: L(lang, {
          uz: `${v} soni bu ${line < n ? 'qatorda' : 'ustunda'} faqat bitta katakka sig'adi — boshqa kataklarga belgilar yoki sonlar to'sqinlik qiladi.`,
          ru: `Число ${v} в ${line < n ? 'этой строке' : 'этом столбце'} помещается только в одну клетку: другим мешают знаки или числа.`,
          en: `The number ${v} fits only one cell in this ${line < n ? 'row' : 'column'}: signs or numbers block the others.` }) };
      }
    }
    if (!st) { const i = g.findIndex(v => !v); st = { i, v: it.sol[i], why: [], text: L(lang, T.guess)(where(lang, i, n), it.sol[i]) }; }
    g[st.i] = st.v;
    steps.push({ text: st.text, focus: [st.i], why: st.why, put: [[st.i, String(st.v)]] });
  }
  steps.push({ text: L(lang, T.done) });
  return steps;
}

// ---------- KenKen ----------
const OPS = { '+': { uz: "qo'shilsa", ru: 'сумма', en: 'sum' }, '-': { uz: 'ayirmasi', ru: 'разность', en: 'difference' }, '×': { uz: "ko'paytmasi", ru: 'произведение', en: 'product' }, '÷': { uz: "bo'linmasi", ru: 'частное', en: 'quotient' } };
function kenken(p, lang) {
  const it = p.items[0], n = p.n, g = new Array(n * n).fill(0);
  const full = ((1 << (n + 1)) - 1) & ~1;
  const rowcol = i => { const r = Math.floor(i / n), c = i % n, a = []; for (let k = 0; k < n; k++) a.push(r * n + k, k * n + c); return uniq(a).filter(k => k !== i); };
  const cageTxt = c => (c.op === '=' ? String(c.target) : `${c.target}${c.op === '-' ? '−' : c.op}`);
  const steps = [{ text: L(lang, {
    uz: `Qoida: har qator va ustunda 1 dan ${n} gacha sonlar bir martadan; qalin chiziqli guruhdagi sonlardan burchakdagi natija chiqadi. `,
    ru: `Правило: в каждой строке и столбце числа от 1 до ${n} по разу; числа в группе дают результат в её углу. `,
    en: `Rule: numbers 1 to ${n} once per row and column; the numbers in each bold group make the result in its corner. ` }) + L(lang, T.start) }];
  for (const c of it.cages) if (c.op === '=') {
    const i = c.cells[0]; g[i] = c.target;
    steps.push({ focus: [i], why: [], put: [[i, String(c.target)]], text: L(lang, {
      uz: `Bu guruhda bitta katak va «${c.target}» yozilgan — demak katakda ${c.target}.`, ru: `В этой группе одна клетка с «${c.target}» — значит, там ${c.target}.`, en: `This group has one cell marked «${c.target}», so it holds ${c.target}.` }) });
  }
  const cageOf = new Array(n * n);
  it.cages.forEach(c => c.cells.forEach(k => { cageOf[k] = c; }));
  while (g.some(v => !v) && steps.length < MAX_STEPS) {
    const dom = g.map((v, i) => { if (v) return 1 << v; let m = full; for (const j of rowcol(i)) if (g[j]) m &= ~(1 << g[j]); return m; });
    let ch = true, guard = 0;
    while (ch && guard++ < 20) {
      ch = false;
      for (const c of it.cages) {
        if (c.op === '=') continue;
        const seen = c.cells.map(() => 0), cur = [];
        const rec = k => {
          if (k === c.cells.length) { if (evalCage(c.op, cur) === c.target) cur.forEach((v, j) => { seen[j] |= 1 << v; }); return; }
          for (const v of bits(dom[c.cells[k]])) {
            const ok = c.cells.slice(0, k).every((q, j) => cur[j] !== v || (Math.floor(q / n) !== Math.floor(c.cells[k] / n) && q % n !== c.cells[k] % n));
            if (ok) { cur.push(v); rec(k + 1); cur.pop(); }
          }
        };
        rec(0);
        c.cells.forEach((q, j) => { if (seen[j] && seen[j] !== dom[q]) { dom[q] = seen[j]; ch = true; } });
      }
    }
    let st = null;
    for (let i = 0; i < g.length && !st; i++) {
      if (g[i] || !one(dom[i])) continue;
      const v = val(dom[i]), c = cageOf[i];
      st = { i, v, why: c.cells.filter(k => k !== i).concat(rowcol(i).filter(j => g[j])), text: L(lang, {
        uz: `${where(lang, i, n)}: guruh «${cageTxt(c)}» — sonlari ${OPS[c.op] ? OPS[c.op].uz : ''} ${c.target} bo'lishi kerak. Qator va ustundagi sonlarni ham hisobga olsak, bu yerga faqat ${v} to'g'ri keladi.`,
        ru: `${where(lang, i, n)}: группа «${cageTxt(c)}» — ${OPS[c.op] ? OPS[c.op].ru : ''} её чисел равна ${c.target}. С учётом чисел в строке и столбце здесь может быть только ${v}.`,
        en: `${where(lang, i, n)}: group «${cageTxt(c)}», the ${OPS[c.op] ? OPS[c.op].en : ''} of its numbers is ${c.target}. With the numbers in its row and column, only ${v} fits here.` }) };
    }
    for (let line = 0; line < 2 * n && !st; line++) {
      const u = Array.from({ length: n }, (_, k) => (line < n ? line * n + k : k * n + (line - n)));
      for (let v = 1; v <= n && !st; v++) {
        if (u.some(i => g[i] === v)) continue;
        const spots = u.filter(i => !g[i] && (dom[i] & (1 << v)));
        if (spots.length === 1) st = { i: spots[0], v, why: u.filter(k => k !== spots[0]), text: L(lang, {
          uz: `${v} soni bu ${line < n ? 'qatorda' : 'ustunda'} faqat shu katakka sig'adi: boshqa kataklarda guruh natijasi chiqmaydi.`,
          ru: `Число ${v} в ${line < n ? 'этой строке' : 'этом столбце'} подходит только сюда: в других клетках не сходится результат группы.`,
          en: `${v} fits only this cell in the ${line < n ? 'row' : 'column'}: elsewhere the group results do not work.` }) };
      }
    }
    if (!st) { const i = g.findIndex(v => !v); st = { i, v: it.sq[i], why: cageOf[i].cells.filter(k => k !== i), text: L(lang, T.guess)(where(lang, i, n), it.sq[i]) }; }
    g[st.i] = st.v;
    steps.push({ text: st.text, focus: [st.i], why: st.why, put: [[st.i, String(st.v)]] });
  }
  steps.push({ text: L(lang, T.done) });
  return steps;
}

// ---------- Sehrli kvadrat ----------
function magic(p, lang) {
  const it = p.items[0], n = p.n, LS = magicLines(n);
  const v = it.sq.map((x, i) => (it.given[i] ? x : null));
  const lineName = k => k < n ? L(lang, { uz: `${k + 1}-qator`, ru: `строка ${k + 1}`, en: `row ${k + 1}` }) : k < 2 * n ? L(lang, { uz: `${k - n + 1}-ustun`, ru: `столбец ${k - n + 1}`, en: `column ${k - n + 1}` }) : L(lang, { uz: 'diagonal', ru: 'диагональ', en: 'diagonal' });
  const steps = [{ text: L(lang, {
    uz: `Qoida: har qator, ustun va ikkala diagonaldagi sonlar yig'indisi bir xil — bu «sehrli son». `,
    ru: 'Правило: сумма чисел в каждой строке, столбце и на обеих диагоналях одинакова — это «магическое число». ',
    en: 'Rule: every row, column and both diagonals add up to the same «magic number». ' }) + L(lang, T.start) }];
  let S = p.showSum ? it.S : null;
  if (S == null) {
    const k = LS.findIndex(l => l.every(i => v[i] !== null));
    if (k >= 0) {
      S = LS[k].reduce((s, i) => s + v[i], 0);
      steps.push({ why: LS[k], sum: String(S), text: L(lang, {
        uz: `Avval sehrli sonni topamiz: ${lineName(k)} to'liq. ${LS[k].map(i => v[i]).join(' + ')} = ${S}.`,
        ru: `Сначала найдём магическое число: ${lineName(k)} заполнена. ${LS[k].map(i => v[i]).join(' + ')} = ${S}.`,
        en: `First find the magic number: ${lineName(k)} is full. ${LS[k].map(i => v[i]).join(' + ')} = ${S}.` }) });
    } else S = it.S;
  }
  while (v.some(x => x === null) && steps.length < MAX_STEPS) {
    const k = LS.findIndex(l => l.filter(i => v[i] === null).length === 1);
    let i, x, text, why = [];
    if (k >= 0) {
      i = LS[k].find(q => v[q] === null); const known = LS[k].filter(q => q !== i);
      const sum = known.reduce((s, q) => s + v[q], 0); x = S - sum; why = known;
      text = L(lang, {
        uz: `${lineName(k)}da bitta bo'sh katak qoldi. ${known.map(q => v[q]).join(' + ')} = ${sum}, ${S} − ${sum} = ${x}.`,
        ru: `В ${lineName(k)} осталась одна пустая клетка. ${known.map(q => v[q]).join(' + ')} = ${sum}, ${S} − ${sum} = ${x}.`,
        en: `${lineName(k)} has one empty cell left. ${known.map(q => v[q]).join(' + ')} = ${sum}, ${S} − ${sum} = ${x}.` });
    } else { i = v.findIndex(q => q === null); x = it.sq[i]; text = L(lang, T.guess)(where(lang, i, n), x); }
    v[i] = x;
    steps.push({ text, focus: [i], why, put: [[i, String(x)]] });
  }
  steps.push({ text: L(lang, T.done) });
  return steps;
}

// ---------- Sonli krossvord ----------
function crossword(p, lang) {
  const bb = p.bbox, cols = bb.maxC - bb.minC + 1;
  const idx = key => { const [r, c] = key.split(',').map(Number); return (r - bb.minR) * cols + (c - bb.minC); };
  const byKey = new Map(p.cells.map(c => [c.r + ',' + c.c, c]));
  const known = new Set(p.cells.filter(c => c.t === 'num' && c.given).map(c => c.r + ',' + c.c));
  const vOf = k => byKey.get(k).v;
  const steps = [{ text: L(lang, {
    uz: "Qoida: har bir qator va ustundagi misol to'g'ri bo'lishi kerak. Ikkita son ma'lum bo'lgan misoldan boshlaymiz. ",
    ru: 'Правило: каждый пример по строке и столбцу должен быть верным. Начинаем с примера, где известны два числа. ',
    en: 'Rule: every row and column equation must be true. Start with an equation where two numbers are known. ' }) + L(lang, T.start) }];
  const total = p.cells.filter(c => c.t === 'num').length;
  while (known.size < total && steps.length < MAX_STEPS) {
    const eq = p.equations.find(e => [e.a, e.b, e.c].filter(k => known.has(k)).length === 2);
    if (!eq) break;
    const [ar, ac] = eq.a.split(',').map(Number), [cr, cc] = eq.c.split(',').map(Number);
    const dr = Math.sign(cr - ar), dc = Math.sign(cc - ac);
    const five = [0, 1, 2, 3, 4].map(s => idx(`${ar + dr * s},${ac + dc * s}`));
    const miss = [eq.a, eq.b, eq.c].find(k => !known.has(k));
    const A = known.has(eq.a) ? vOf(eq.a) : '?', B = known.has(eq.b) ? vOf(eq.b) : '?', C = known.has(eq.c) ? vOf(eq.c) : '?';
    const op = eq.op === '-' ? '−' : eq.op, x = vOf(miss);
    const how = miss === eq.c ? `${A} ${op} ${B} = ${x}`
      : eq.op === '+' ? (miss === eq.a ? `${C} − ${B} = ${x}` : `${C} − ${A} = ${x}`)
      : eq.op === '-' ? (miss === eq.a ? `${C} + ${B} = ${x}` : `${A} − ${C} = ${x}`)
      : eq.op === '×' ? (miss === eq.a ? `${C} ÷ ${B} = ${x}` : `${C} ÷ ${A} = ${x}`)
      : (miss === eq.a ? `${C} × ${B} = ${x}` : `${A} ÷ ${C} = ${x}`);
    known.add(miss);
    const i = idx(miss);
    steps.push({ focus: [i], why: five.filter(k => k !== i), put: [[i, String(x)]], text: L(lang, {
      uz: `Misol: ${A} ${op} ${B} = ${C}. Noma'lum sonni topamiz: ${how}.`,
      ru: `Пример: ${A} ${op} ${B} = ${C}. Находим неизвестное: ${how}.`,
      en: `Equation: ${A} ${op} ${B} = ${C}. Find the missing number: ${how}.` }) });
  }
  steps.push({ text: L(lang, T.done) });
  return steps;
}

// ---------- Shulte jadvali ----------
function schulte(p, lang) {
  const n = p.n, abc = SCHULTE_ABC[p.lang] || SCHULTE_ABC.uz, letters = p.mode === 'letters';
  const label = c => (letters ? abc[c.v - 1] : String(c.v));
  let order;
  if (p.gorbov) {
    order = [];
    for (let k = 1; k <= 25; k++) {
      order.push(p.cells.findIndex(c => !c.dark && c.v === k));
      if (k <= 24) order.push(p.cells.findIndex(c => c.dark && c.v === 25 - k));
    }
  } else order = p.cells.map((c, i) => [c.v, i]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const steps = [{ text: L(lang, {
    uz: p.gorbov ? "Qoida: navbat bilan — oq 1, kulrang 24, oq 2, kulrang 23 ... Ko'z jadval markazida, barmoq bilan ko'rsating. " : `Qoida: ${letters ? 'harflarni alifbo tartibida' : 'sonlarni tartib bilan'} topib, barmoq bilan ko'rsating. Ko'zni jadval markazida ushlang. `,
    ru: p.gorbov ? 'Правило: по очереди — белое 1, серое 24, белое 2, серое 23 ... Взгляд в центре таблицы. ' : `Правило: находите ${letters ? 'буквы по алфавиту' : 'числа по порядку'} и показывайте пальцем. Взгляд держите в центре. `,
    en: p.gorbov ? 'Rule: take turns: white 1, grey 24, white 2, grey 23 ... Keep your eyes on the centre. ' : `Rule: find the ${letters ? 'letters in alphabet order' : 'numbers in order'} and point at each. Keep your eyes on the centre. ` }) + L(lang, T.start) }];
  order.forEach((i, k) => {
    const c = p.cells[i], [r, col] = rcOf(i, n);
    steps.push({ focus: [i], mark: true, text: L(lang, {
      uz: `${k + 1}. ${label(c)}${c.dark ? ' (kulrang)' : ''} — ${r}-qator, ${col}-ustunda.`,
      ru: `${k + 1}. ${label(c)}${c.dark ? ' (серое)' : ''} — строка ${r}, столбец ${col}.`,
      en: `${k + 1}. ${label(c)}${c.dark ? ' (grey)' : ''}: row ${r}, column ${col}.` }) });
  });
  steps.push({ text: L(lang, { uz: "Tayyor! Endi o'zingiz vaqtni o'lchab, tezroq topishga harakat qiling.", ru: 'Готово! Теперь засеките время и попробуйте быстрее.', en: 'Done! Now time yourself and try to go faster.' }) });
  return steps;
}

// ---------- So'z qidiruv ----------
const DIR_NAME = {
  uz: { '0,1': "o'ngga", '0,-1': 'chapga', '1,0': 'pastga', '-1,0': 'yuqoriga', '1,1': "pastga-o'ngga (qiya)", '1,-1': 'pastga-chapga (qiya)', '-1,1': "yuqoriga-o'ngga (qiya)", '-1,-1': 'yuqoriga-chapga (qiya)' },
  ru: { '0,1': 'вправо', '0,-1': 'влево', '1,0': 'вниз', '-1,0': 'вверх', '1,1': 'вниз-вправо (наискосок)', '1,-1': 'вниз-влево (наискосок)', '-1,1': 'вверх-вправо (наискосок)', '-1,-1': 'вверх-влево (наискосок)' },
  en: { '0,1': 'to the right', '0,-1': 'to the left', '1,0': 'down', '-1,0': 'up', '1,1': 'down-right (diagonal)', '1,-1': 'down-left (diagonal)', '-1,1': 'up-right (diagonal)', '-1,-1': 'up-left (diagonal)' }
};
function wordsearch(p, lang) {
  const N = p.N;
  const steps = [{ text: L(lang, {
    uz: "Qoida: ro'yxatdagi so'zlar jadvalda harflar qatori bo'lib yashiringan. Avval so'zning birinchi harfini qidiring, keyin yonidagi harflarni tekshiring. ",
    ru: 'Правило: слова из списка спрятаны в таблице рядом стоящими буквами. Ищите первую букву, потом проверяйте соседние. ',
    en: 'Rule: the list words hide in the grid as letters in a line. Look for the first letter, then check its neighbours. ' }) + L(lang, T.start) }];
  for (const w of p.words) {
    const [r0, c0] = w.cells[0], [r1, c1] = w.cells[1] || w.cells[0];
    const d = `${Math.sign(r1 - r0)},${Math.sign(c1 - c0)}`;
    const ids = w.cells.map(([r, c]) => r * N + c);
    steps.push({ focus: ids, line: [ids[0], ids[ids.length - 1]], text: L(lang, {
      uz: `«${w.text}»: birinchi harf ${r0 + 1}-qator, ${c0 + 1}-ustunda, so'z ${(DIR_NAME.uz)[d] || ''} ketadi.`,
      ru: `«${w.text}»: первая буква в строке ${r0 + 1}, столбце ${c0 + 1}, слово идёт ${(DIR_NAME.ru)[d] || ''}.`,
      en: `«${w.text}»: the first letter is in row ${r0 + 1}, column ${c0 + 1}; the word goes ${(DIR_NAME.en)[d] || ''}.` }) });
  }
  steps.push({ text: L(lang, T.done) });
  return steps;
}

// ---------- Labirint ----------
function maze(p, lang) {
  const W = p.W, path = p.path.map(([x, y]) => y * W + x);
  const parts = Math.max(3, Math.min(8, Math.round(path.length / 12)));
  const steps = [{ text: L(lang, {
    uz: "Qoida: qahramondan boshlab devorlarni kesib o'tmasdan manzilga yo'l toping. Boshi berk yo'lga kirsangiz — oxirgi chorrahaga qaytib, boshqa yo'lni tanlang. ",
    ru: 'Правило: от героя до цели, не пересекая стен. Попали в тупик — вернитесь к последней развилке и выберите другой путь. ',
    en: 'Rule: from the hero to the goal without crossing walls. Hit a dead end? Go back to the last fork and try another way. ' }) + L(lang, T.start) }];
  let from = 0;
  for (let k = 1; k <= parts; k++) {
    const to = k === parts ? path.length : Math.round(path.length * k / parts);
    let turns = 0;
    for (let s = Math.max(1, from) + 1; s < to; s++) {
      const a = path[s - 2] ?? path[s - 1], b = path[s - 1], c = path[s];
      if (a !== undefined && (b - a) !== (c - b)) turns++;
    }
    steps.push({ path: path.slice(0, to), seg: from, focus: [path[to - 1]], text: L(lang, {
      uz: k === parts ? `Oxirgi bo'lak: ${to - from} katak — va manzilga yetdik!` : `${k}-bo'lak: ${to - from} katak yuramiz, yo'lda ${turns} marta buriladi. Shu nuqtagacha boshqa yo'llar boshi berk.`,
      ru: k === parts ? `Последний отрезок: ${to - from} клеток — и мы у цели!` : `Отрезок ${k}: идём ${to - from} клеток, по пути ${turns} поворотов. Другие пути до этой точки — тупики.`,
      en: k === parts ? `Last part: ${to - from} cells and we reach the goal!` : `Part ${k}: walk ${to - from} cells with ${turns} turns. Other ways up to here are dead ends.` }) });
    from = to;
  }
  return steps;
}

const BUILDERS = { sudoku, futoshiki, kenken, magic, cross: crossword, schulte, words: wordsearch, maze };
export function buildSteps(genId, puzzle, lang) {
  const f = BUILDERS[genId];
  return f ? f(puzzle, lang) : null;
}

// ---------- Varaqqa chizish (faqat ekranda, PDF'ga tushmaydi) ----------
// ctx — millimetr koordinatalarida (varaq chizilgandan keyin). geo — generator draw() qaytargan to'r.
export function drawSteps(ctx, geo, steps, at) {
  if (!geo || !steps) return;
  const cols = geo.cols, cell = geo.cell, step = geo.step || cell;
  const X = i => geo.x + (i % cols) * step, Y = i => geo.y + Math.floor(i / cols) * step;
  const C = i => [X(i) + cell / 2, Y(i) + cell / 2];
  const cur = steps[at] || {};
  ctx.save();
  // Oldingi qadamlar: yozilgan sonlar (yashil), topilgan so'zlar va sonlar
  const puts = new Map();
  for (let k = 0; k <= at; k++) (steps[k].put || []).forEach(([i, s]) => puts.set(i, [s, k === at]));
  for (let k = 0; k < at; k++) {
    const s = steps[k];
    if (s.line) capsule(ctx, C(s.line[0]), C(s.line[1]), cell * 0.74, 'rgba(34,197,94,.32)');
    if (s.mark && s.focus) s.focus.forEach(i => { ctx.fillStyle = 'rgba(34,197,94,.16)'; ctx.fillRect(X(i), Y(i), cell, cell); });
  }
  // Hozirgi qadam: sabab kataklar (ko'k), asosiy katak (to'q sariq)
  (cur.why || []).forEach(i => { ctx.fillStyle = 'rgba(59,130,246,.2)'; ctx.fillRect(X(i), Y(i), cell, cell); });
  if (cur.line) capsule(ctx, C(cur.line[0]), C(cur.line[1]), cell * 0.8, 'rgba(245,158,11,.5)');
  else (cur.focus || []).forEach(i => {
    ctx.fillStyle = 'rgba(245,158,11,.3)'; ctx.fillRect(X(i), Y(i), cell, cell);
    ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = Math.max(0.5, cell * 0.08); ctx.strokeRect(X(i) + cell * 0.04, Y(i) + cell * 0.04, cell * 0.92, cell * 0.92);
  });
  // Labirint yo'li: o'tilgani yashil, yangi bo'lak to'q sariq
  if (cur.path) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = Math.min(2.2, Math.max(0.6, cell * 0.28));
    const line = (a, color) => { if (a.length < 2) return; ctx.strokeStyle = color; ctx.beginPath(); a.forEach((i, k) => { const [x, y] = C(i); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); };
    line(cur.path.slice(0, cur.seg + 1), 'rgba(22,163,74,.85)');
    line(cur.path.slice(Math.max(0, cur.seg)), 'rgba(234,88,12,.9)');
  }
  // Sonlar
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const [i, [s, now]] of puts) {
    const fs = cell * (s.length > 2 ? 0.4 : 0.52);
    ctx.font = `800 ${fs}px "Nunito","Trebuchet MS",Arial,sans-serif`;
    ctx.fillStyle = now ? '#C2410C' : '#15803D';
    ctx.fillText(s, X(i) + cell / 2, Y(i) + cell * (geo.valY || 0.53));
  }
  if (cur.sum && geo.sumAt) {
    const fs = cell * 0.3;
    ctx.font = `900 ${fs}px "Nunito",Arial,sans-serif`; ctx.fillStyle = 'rgba(245,158,11,.25)';
    ctx.fillRect(geo.sumAt.x - cell * 0.9, geo.sumAt.y - fs, cell * 1.8, fs * 1.3);
  }
  ctx.restore();
}
function capsule(ctx, [x0, y0], [x1, y1], w, color) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 + 0.001, y1); ctx.stroke(); ctx.restore();
}
