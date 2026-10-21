// code.js — "Kodni top" (Crack the code) generatori.
// Topshiriq: L xonali maxfiy kod (raqamlar takrorlanmaydi) va bir nechta ishora.
// Har bir ishora — taxmin (masalan 2 9 1) va javob:
//   A — nechta raqam to'g'ri va o'z joyida, B — nechta raqam kodda bor, lekin boshqa joyda.
// Kafolat: barcha mumkin bo'lgan kodlar ichida ishoralarga faqat BITTA kod mos keladi.
// Darajalar: Oson va O'rta — taxminsiz, faqat mantiq bilan yechiladi (solveLogic tekshiradi).

import { makeRng, shuffle } from '../core/rng.js';
import { INK, MUTE, ANSWER, PT, font, wrapLines, roundRect } from '../core/draw.js';

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

// ---------- Barcha mumkin bo'lgan kodlar (3 xonali: 720, 4: 5040, 5: 30240 ta) ----------
const CAND = {};
export function candidates(L) {
  if (CAND[L]) return CAND[L];
  const list = [], cur = [];
  (function rec(used) {
    if (cur.length === L) { list.push(cur.slice()); return; }
    for (let d = 0; d < 10; d++) if (!(used & (1 << d))) { cur.push(d); rec(used | (1 << d)); cur.pop(); }
  })(0);
  const n = list.length;
  const codes = new Int8Array(n * L), pos = new Int8Array(n * 10).fill(-1);
  for (let i = 0; i < n; i++) for (let p = 0; p < L; p++) { codes[i * L + p] = list[i][p]; pos[i * 10 + list[i][p]] = p; }
  return (CAND[L] = { L, n, codes, pos });
}

// Maxfiy kod va taxmin solishtiriladi: A (o'z joyida) va B (boshqa joyda)
export function score(code, guess) {
  let A = 0, T = 0;
  for (let i = 0; i < guess.length; i++) {
    if (code[i] === guess[i]) A++;
    if (code.indexOf(guess[i]) >= 0) T++;
  }
  return { A, B: T - A };
}
function fbOf(C, idx, g) {                        // nomzod kod (raqami idx) uchun javob: A*8 + B
  const L = C.L, base = idx * L, pbase = idx * 10;
  let A = 0, T = 0;
  for (let i = 0; i < L; i++) {
    if (C.codes[base + i] === g[i]) A++;
    if (C.pos[pbase + g[i]] >= 0) T++;
  }
  return A * 8 + (T - A);
}
function filterAlive(C, alive, g, fb) {
  const out = [];
  for (let k = 0; k < alive.length; k++) if (fbOf(C, alive[k], g) === fb) out.push(alive[k]);
  return out;
}
function countAlive(C, alive, g, fb) {
  let n = 0;
  for (let k = 0; k < alive.length; k++) if (fbOf(C, alive[k], g) === fb) n++;
  return n;
}
// Ishoralarga mos keladigan kodlar soni (limitga yetsa to'xtaydi)
export function countSolutions(L, clues, limit) {
  const C = candidates(L);
  let cnt = 0;
  outer:
  for (let i = 0; i < C.n; i++) {
    for (let c = 0; c < clues.length; c++) if (fbOf(C, i, clues[c].g) !== clues[c].A * 8 + clues[c].B) continue outer;
    if (++cnt >= limit) break;
  }
  return cnt;
}

// ---------- Taxminsiz mantiqiy yechuvchi ----------
// O'zgaruvchi x(d,p) = "d raqami p-o'rinda" (v = d*L + p). Har bir qoida va ishora
// "shu o'zgaruvchilardan aynan t tasi rost" degan tenglamaga aylanadi. Yechuvchi faqat
// hisob orqali xulosa chiqaradi (tanlab ko'rish, ya'ni taxmin qilish yo'q).
//   advanced = false: oddiy hisob; advanced = true: + ikki ishorani solishtirish
export function solveLogic(L, clues, advanced) {
  const NV = 10 * L;
  const val = new Int8Array(NV).fill(-1);
  const E = [], seen = new Set();
  let changed = false, bad = false;

  function addE(vars, t) {
    if (!vars.length) { if (t !== 0) bad = true; return; }
    if (E.length > 700) return;
    const vs = vars.slice().sort((a, b) => a - b);
    const key = t + ':' + vs.join(',');
    if (seen.has(key)) return;
    seen.add(key); E.push({ vars: vs, t }); changed = true;
  }
  function setv(v, x) {
    if (val[v] === -1) { val[v] = x; changed = true; }
    else if (val[v] !== x) bad = true;
  }
  const rowVars = d => { const r = []; for (let p = 0; p < L; p++) r.push(d * L + p); return r; };
  const colVars = p => { const r = []; for (let d = 0; d < 10; d++) r.push(d * L + p); return r; };

  for (let p = 0; p < L; p++) addE(colVars(p), 1);                 // har bir o'rinda bitta raqam
  { const all = []; for (let v = 0; v < NV; v++) all.push(v); addE(all, L); }
  for (const c of clues) {
    const a = [], b = [];
    for (let i = 0; i < L; i++) for (let p = 0; p < L; p++) (p === i ? a : b).push(c.g[i] * L + p);
    addE(a, c.A);
    addE(b, c.B);
  }

  // Har bir raqam ko'pi bilan bitta joyda, har bir joyda bitta raqam: kerakli son guruhlar
  // soniga teng bo'lsa — har bir guruhdan aynan bittasi rost
  function tight(unk, need, groupOf, fullGroup) {
    const groups = new Map();
    for (const v of unk) { const g = groupOf(v); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(v); }
    if (groups.size < need) { bad = true; return; }
    if (groups.size !== need) return;
    for (const [g, part] of groups) {
      if (part.length === 1) setv(part[0], 1); else addE(part, 1);
      const inPart = new Set(part);
      for (const v of fullGroup(g)) if (!inPart.has(v) && val[v] === -1) setv(v, 0);
    }
  }
  function maskOf(list) {
    let lo = 0, hi = 0;
    for (const v of list) { if (v < 32) lo |= (1 << v); else hi |= (1 << (v - 32)); }
    return [lo, hi];
  }
  function advancedPass() {
    const red = [];
    for (const c of E) {
      let ones = 0; const unk = [];
      for (const v of c.vars) { if (val[v] === 1) ones++; else if (val[v] === -1) unk.push(v); }
      if (unk.length) { const m = maskOf(unk); red.push({ unk, need: c.t - ones, lo: m[0], hi: m[1] }); }
    }
    for (let i = 0; i < red.length && !bad; i++) {
      const a = red[i];
      for (let j = 0; j < red.length; j++) {
        const b = red[j];
        if (i === j || a.unk.length >= b.unk.length) continue;
        if ((a.lo & ~b.lo) !== 0 || (a.hi & ~b.hi) !== 0) continue;   // a — b ning qismi emas
        const inA = new Set(a.unk);
        addE(b.unk.filter(v => !inA.has(v)), b.need - a.need);
        if (bad) return;
      }
    }
    for (const r of red) {                                            // bitta raqam ichida "aynan 1"
      if (r.need !== 1) continue;
      const d = (r.unk[0] / L) | 0;
      if (!r.unk.every(v => ((v / L) | 0) === d)) continue;
      const inR = new Set(r.unk);
      for (const v of rowVars(d)) if (!inR.has(v) && val[v] === -1) setv(v, 0);
    }
  }

  let guard = 0;
  while (!bad && guard++ < 300) {
    changed = false;
    for (let ci = 0; ci < E.length && !bad; ci++) {
      const c = E[ci];
      let ones = 0; const unk = [];
      for (const v of c.vars) { if (val[v] === 1) ones++; else if (val[v] === -1) unk.push(v); }
      const need = c.t - ones;
      if (need < 0 || need > unk.length) { bad = true; break; }
      if (!unk.length) continue;
      if (need === 0) { for (const v of unk) setv(v, 0); continue; }
      if (need === unk.length) { for (const v of unk) setv(v, 1); continue; }
      tight(unk, need, v => (v / L) | 0, rowVars);
      if (!bad) tight(unk, need, v => v % L, colVars);
    }
    for (let d = 0; d < 10 && !bad; d++) {                           // raqam takrorlanmaydi
      const r = rowVars(d); let ones = 0;
      for (const v of r) if (val[v] === 1) ones++;
      if (ones > 1) bad = true;
      else if (ones === 1) for (const v of r) if (val[v] === -1) setv(v, 0);
    }
    if (bad) break;
    if (!changed && advanced) advancedPass();
    if (!changed) break;
  }
  let solved = !bad;
  if (solved) for (let p = 0; p < L; p++) {
    let one = false;
    for (let d = 0; d < 10; d++) if (val[d * L + p] === 1) one = true;
    if (!one) { solved = false; break; }
  }
  return { solved, bad, val };
}

// ---------- Darajalar ----------
// maxA: ishorada ko'pi bilan nechta "o'z joyida"; tl: to'g'ri raqamlar soni L - tl dan oshmaydi;
// zeroMin/zeroMax: "hech biri yo'q" ishoralar soni; need: 1 — oddiy hisob bilan yechilishi shart,
// 2 — ikki ishorani solishtirish bilan, 0 — shart yo'q (lekin yechim baribir yagona).
const LEVEL_CFG = [
  { maxA: 2, tl: 0, zeroMin: 1, zeroMax: 1, minimize: false, need: 1 },   // Oson
  { maxA: 1, tl: 1, zeroMin: 0, zeroMax: 1, minimize: true, need: 2 },    // O'rta
  { maxA: 1, tl: 1, zeroMin: 0, zeroMax: 1, minimize: true, need: 0 },    // Qiyin
  { maxA: 1, tl: 1, zeroMin: 0, zeroMax: 0, minimize: true, need: 0, preferHard: true }   // Juda qiyin
];
const DESIRED = { 3: [6, 5, 5, 4], 4: [7, 6, 6, 6], 5: [8, 7, 7, 7] };   // taxminiy ishoralar soni
const MAXC = { 3: 8, 4: 10, 5: 12 };                                      // varaqqa sig'adigan eng ko'p ishora

function levelRules(L, level) {
  const cfg = LEVEL_CFG[level];
  // 5 xonali kodda "hech biri yo'q" ishorasi kodning raqamlarini to'liq ochib qo'yadi — faqat Osonda
  const zeroMax = (L >= 5 && level >= 1) ? 0 : cfg.zeroMax;
  return { cfg, maxA: Math.min(cfg.maxA, L - 1), maxT: L - cfg.tl, zeroMax };
}
function allowedClue(f, L, rules, zeros) {
  if (f.A >= L || f.A > rules.maxA || f.A + f.B > rules.maxT) return false;
  if (f.A + f.B === 0 && zeros >= rules.zeroMax) return false;
  return true;
}
const zeroCount = cl => cl.filter(c => c.A + c.B === 0).length;
const meetsNeed = (L, cl, need) => need === 0 || solveLogic(L, cl, need === 2).solved;

function buildAttempt(secret, L, level, rand) {
  const rules = levelRules(L, level), cfg = rules.cfg;
  const C = candidates(L);
  let alive = Array.from({ length: C.n }, (_, i) => i);
  const clues = [], used = new Set([secret.join('')]);
  let zeros = 0;
  const N = DESIRED[L][level];

  function add(g) {
    const f = score(secret, g);
    clues.push({ g, A: f.A, B: f.B });
    used.add(g.join(''));
    if (f.A + f.B === 0) zeros++;
    alive = filterAlive(C, alive, g, f.A * 8 + f.B);
  }
  // Oson: albatta bitta "hech biri yo'q" ishorasi
  if (cfg.zeroMin && rules.zeroMax > 0) add(shuffle(DIGITS.filter(d => secret.indexOf(d) < 0), rand).slice(0, L));

  // Har bir ishora nomzodlarni taxminan bir xil nisbatda kamaytiradi (bittasi hammasini ochib qo'ymasin)
  while (alive.length > 1 && clues.length < MAXC[L]) {
    const stepsLeft = Math.max(1, N - clues.length);
    const logTarget = Math.log(alive.length) * (1 - 1 / stepsLeft);
    let best = null;
    for (let s = 0; s < 40; s++) {
      const g = shuffle(DIGITS.slice(), rand).slice(0, L);
      if (used.has(g.join(''))) continue;
      const f = score(secret, g);
      if (!allowedClue(f, L, rules, zeros)) continue;
      const rem = countAlive(C, alive, g, f.A * 8 + f.B);
      if (rem >= alive.length) continue;
      const diff = Math.abs(Math.log(rem) - logTarget) + rand() * 0.05;
      if (!best || diff < best.diff) best = { g, diff };
    }
    if (!best) break;
    add(best.g);
  }
  if (alive.length !== 1) return null;

  // Talab qilingan usul bilan yechilmasa — yana foydali ishora qo'shamiz
  let tries = 0;
  while (!meetsNeed(L, clues, cfg.need)) {
    if (clues.length >= MAXC[L] || tries++ > 6) return null;
    let added = false;
    for (let s = 0; s < 60 && !added; s++) {
      const g = shuffle(DIGITS.slice(), rand).slice(0, L);
      if (used.has(g.join(''))) continue;
      const f = score(secret, g);
      if (!allowedClue(f, L, rules, zeros)) continue;
      add(g); added = true;
    }
    if (!added) return null;
  }

  // Ortiqcha ishoralarni olib tashlaymiz (yechim yagona va daraja sharti saqlansa)
  let out = clues;
  if (cfg.minimize) {
    const keep = clues.map(() => true);
    for (const idx of shuffle(clues.map((_, i) => i), rand)) {
      keep[idx] = false;
      const cur = clues.filter((_, i) => keep[i]);
      const ok = zeroCount(cur) >= cfg.zeroMin && countSolutions(L, cur, 2) === 1 && meetsNeed(L, cur, cfg.need);
      if (!ok) keep[idx] = true;
    }
    out = clues.filter((_, i) => keep[i]);
  }
  if (out.length > MAXC[L] || out.length < 2) return null;
  return out;
}

function makeCode(L, level, seed) {
  const rand = makeRng((Math.imul(seed | 0, 0x9E3779B1) ^ (L * 1000003 + level * 7919)) >>> 0);
  const secret = shuffle(DIGITS.slice(), rand).slice(0, L);
  const cfg = LEVEL_CFG[level];
  let chosen = null, fallback = null;
  for (let attempt = 0; attempt < 40 && !chosen; attempt++) {
    const cl = buildAttempt(secret, L, level, rand);
    if (!cl) continue;
    if (!fallback) fallback = cl;
    // Juda qiyin: imkon qadar oddiy hisob bilan yechilmaydigan (fikrlashni talab qiladigan) variant
    if (cfg.preferHard && attempt < 15 && solveLogic(L, cl, true).solved) continue;
    chosen = cl;
  }
  if (!chosen) chosen = fallback;
  if (!chosen) return level > 0 ? makeCode(L, level - 1, seed) : null;   // amalda yuz bermaydi
  return { secret, clues: shuffle(chosen.slice(), rand), level };
}

// ---------- Matnlar ----------
const NUMS = {
  uz: ['', 'bitta', 'ikkita', 'uchta', "to'rtta", 'beshta'],
  ru: ['', 'одна', 'две', 'три', 'четыре', 'пять'],
  en: ['', 'one', 'two', 'three', 'four', 'five']
};
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const ruDigit = n => (n === 1 ? 'цифра' : (n < 5 ? 'цифры' : 'цифр'));

export function clueText(A, B, lang) {
  if (lang === 'ru') {
    if (A + B === 0) return 'Ни одной из этих цифр нет в коде';
    const a = A === 1 ? 'верна и стоит на своём месте' : 'верны и стоят на своих местах';
    const b = B === 1 ? 'верна, но стоит не на своём месте' : 'верны, но стоят не на своих местах';
    if (B === 0) return `${cap(NUMS.ru[A])} ${ruDigit(A)} ${a}`;
    if (A === 0) return `${cap(NUMS.ru[B])} ${ruDigit(B)} ${b}`;
    return `${cap(NUMS.ru[A])} ${ruDigit(A)} ${a}, ещё ${NUMS.ru[B]} ${b}`;
  }
  if (lang === 'en') {
    if (A + B === 0) return 'None of these digits are in the code';
    const a = A === 1 ? 'digit is correct and in the right place' : 'digits are correct and in the right places';
    const b = B === 1 ? 'digit is correct but in the wrong place' : 'digits are correct but in the wrong places';
    const b2 = B === 1 ? 'more is correct but in the wrong place' : 'more are correct but in the wrong places';
    if (B === 0) return `${cap(NUMS.en[A])} ${a}`;
    if (A === 0) return `${cap(NUMS.en[B])} ${b}`;
    return `${cap(NUMS.en[A])} ${a}, ${NUMS.en[B]} ${b2}`;
  }
  if (A + B === 0) return "Bu raqamlarning hech biri kodda yo'q";
  const a = A === 1 ? "to'g'ri va o'z joyida" : "to'g'ri va o'z joylarida";
  const b = B === 1 ? "to'g'ri, lekin joyi noto'g'ri" : "to'g'ri, lekin joylari noto'g'ri";
  if (B === 0) return `${cap(NUMS.uz[A])} raqam ${a}`;
  if (A === 0) return `${cap(NUMS.uz[B])} raqam ${b}`;
  return `${cap(NUMS.uz[A])} raqam ${a}, yana ${NUMS.uz[B]}si ${b}`;
}

const TXT = {
  uz: {
    codeLbl: 'KOD', rule: 'Kodda raqamlar takrorlanmaydi.',
    legend: ["to'g'ri va o'z joyida", 'kodda bor, lekin boshqa joyda', "hech biri yo'q"],
    colors: ["o'z joyida", 'boshqa joyda', "kodda yo'q"]
  },
  ru: {
    codeLbl: 'КОД', rule: 'Цифры в коде не повторяются.',
    legend: ['верна и на своём месте', 'есть в коде, но на другом месте', 'ни одной нет'],
    colors: ['на своём месте', 'на другом месте', 'нет в коде']
  },
  en: {
    codeLbl: 'CODE', rule: 'Digits in the code do not repeat.',
    legend: ['correct and in the right place', 'in the code but in the wrong place', 'none of these'],
    colors: ['right place', 'wrong place', 'not in the code']
  }
};

// Belgilar: ● to'g'ri joyda, ○ boshqa joyda, ✕ hech biri yo'q
function drawIcon(ctx, kind, cx, cy, r) {
  ctx.save();
  ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = Math.max(0.35, r * 0.32); ctx.lineCap = 'round';
  if (kind === 'A') { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); }
  else if (kind === 'B') { ctx.beginPath(); ctx.arc(cx, cy, r * 0.86, 0, Math.PI * 2); ctx.stroke(); }
  else {
    const s = r * 0.8;
    ctx.beginPath();
    ctx.moveTo(cx - s, cy - s); ctx.lineTo(cx + s, cy + s);
    ctx.moveTo(cx + s, cy - s); ctx.lineTo(cx - s, cy + s);
    ctx.stroke();
  }
  ctx.restore();
}
function drawLock(ctx, cx, top, w) {
  const shH = w * 0.42, bodyH = w * 0.82, bodyY = top + shH;
  const shW = w * 0.62, lw = w * 0.13;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK; ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(cx - shW / 2, bodyY + w * 0.06);
  ctx.lineTo(cx - shW / 2, top + shW / 2 + lw / 2);
  ctx.arc(cx, top + shW / 2 + lw / 2, shW / 2, Math.PI, 0);
  ctx.lineTo(cx + shW / 2, bodyY + w * 0.06);
  ctx.stroke();
  roundRect(ctx, cx - w / 2, bodyY, w, bodyH, w * 0.12);
  ctx.fillStyle = '#E0E7FF'; ctx.fill();
  ctx.lineWidth = Math.max(0.6, w * 0.035); ctx.stroke();
  const kyY = bodyY + bodyH * 0.42, kr = w * 0.1;
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(cx, kyY, kr, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - kr * 0.45, kyY); ctx.lineTo(cx + kr * 0.45, kyY);
  ctx.lineTo(cx + kr * 0.75, kyY + kr * 2.6); ctx.lineTo(cx - kr * 0.75, kyY + kr * 2.6);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

const UI = {
  uz: { check: 'Tekshirish', label: 'Javobingiz:', ok: "🎉 To'g'ri! Kodni topdingiz!", bad: "Noto'g'ri. Yana urinib ko'ring!", fill: "Barcha raqamlarni kiriting", repeat: 'Raqamlar takrorlanmasligi kerak' },
  ru: { check: 'Проверить', label: 'Ваш ответ:', ok: '🎉 Верно! Код взломан!', bad: 'Неверно. Попробуйте ещё раз!', fill: 'Введите все цифры', repeat: 'Цифры не должны повторяться' },
  en: { check: 'Check', label: 'Your answer:', ok: '🎉 Correct! You cracked the code!', bad: 'Not quite. Try again!', fill: 'Enter all digits', repeat: 'Digits must not repeat' }
};

export default {
  id: 'code',
  skills: ['logic', 'counting'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Kodni top', ru: 'Взломай код', en: 'Crack the code' },
  desc: {
    uz: 'Ishoralar yordamida qulfning maxfiy kodini toping',
    ru: 'Найдите секретный код замка по подсказкам',
    en: 'Use the clues to find the secret code of the lock'
  },
  fileBase: { uz: 'kodni top', ru: 'Взломай код', en: 'Crack the code' },
  defaultTitle: { uz: 'Kodni topa olasanmi?', ru: 'Сможешь взломать код?', en: 'Can you crack the code?' },
  options: [
    { key: 'level', type: 'level', default: 1 },
    {
      key: 'length', type: 'choice', style: 'cards', pack: 'select', default: '3',
      label: { uz: 'Kod uzunligi', ru: 'Длина кода', en: 'Code length' },
      choices: [
        { value: '3', big: '3', label: { uz: 'xonali', ru: 'цифры', en: 'digits' } },
        { value: '4', big: '4', label: { uz: 'xonali', ru: 'цифры', en: 'digits' } },
        { value: '5', big: '5', label: { uz: 'xonali', ru: 'цифр', en: 'digits' } }
      ]
    }
  ],

  generate(opts, seed) {
    const L = [3, 4, 5].includes(+opts.length) ? +opts.length : 3;
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const r = makeCode(L, level, seed);
    return { L, level: r.level, seed, secret: r.secret, clues: r.clues };
  },

  info(p, lang) {
    return { uz: `${p.L} xonali`, ru: `${p.L} ${p.L === 5 ? 'цифр' : 'цифры'}`, en: `${p.L} digits` }[lang] || String(p.L);
  },

  draw(ctx, p, box, { showSolution, lang }) {
    const T = TXT[lang] || TXT.uz;
    const L = p.L, N = p.clues.length, show = !!showSolution;
    const W = box.w, H = box.h;
    ctx.save();
    const maxIcons = Math.max(1, ...p.clues.map(c => c.A + c.B));
    const COLORS = ['#BBF7D0', '#FDE68A', '#F1F5F9'];

    // Bir qatorga sig'magan elementlarni keyingi qatorga o'tkazish (izohlar uchun)
    function flow(widths) {
      const pos = []; let row = 0, x = 0;
      widths.forEach(w => { if (x > 0 && x + w > W) { row++; x = 0; } pos.push({ x, row }); x += w; });
      return { pos, rows: row + 1 };
    }
    function legendLayout(ls) {
      const r = 1.5 * ls, sq = 3.2 * ls;
      font(ctx, 9.5 * ls * PT, 400);
      const leg = flow(T.legend.map(txt => 2 * r + 1.5 + ctx.measureText('— ' + txt).width + 5));
      const col = flow(T.colors.map(txt => sq + 1.5 + ctx.measureText('— ' + txt).width + 5));
      return { r, sq, leg, col, h: 8 * ls + leg.rows * 6 * ls + (show ? col.rows * 6.5 * ls : 0) };
    }
    // Joylashtirish rejasi. mode: lock — qulf rasmi; text — ishora matni; cols — ustunlar soni
    function plan(s, mode) {
      const lockW = mode.lock ? 30 * s : 0, lockH = lockW * 1.24;
      const ans = 13.5 * s, ansGap = 2.6 * s;
      const ansW = L * ans + (L - 1) * ansGap;
      if (ansW > W) return null;
      const head = (mode.lock ? lockH + 4.5 * s : 0) + ans + 2 * s + 6 * s;
      const bx = 12 * s, gap = 1.8 * s;
      const iconR = 1.75 * s, iconStep = 4.6 * s;
      const boxesW = L * bx + (L - 1) * gap;
      const rowW = boxesW + 5 * s + maxIcons * iconStep;
      const cols = mode.cols || 1, colGap = 7 * s;
      const fs = 12.5 * s * PT;
      let textX = 0, rows;
      if (mode.text) {
        textX = rowW + 4 * s;
        const textW = W - textX;
        if (textW < Math.max(24, 34 * s)) return null;
        font(ctx, fs, 600);
        rows = p.clues.map(c => {
          const lines = wrapLines(ctx, clueText(c.A, c.B, lang), textW);
          return { lines, h: Math.max(bx, lines.length * fs * 1.28) };
        });
      } else {
        if (cols * rowW + (cols - 1) * colGap > W) return null;
        rows = p.clues.map(() => ({ lines: [], h: bx }));
      }
      const rowGap = (mode.text ? 4.2 : 3) * s;
      const perCol = Math.ceil(N / cols);
      let rowsH = 0;
      for (let c = 0; c < cols; c++) {
        const part = rows.slice(c * perCol, (c + 1) * perCol);
        rowsH = Math.max(rowsH, part.reduce((t, r) => t + r.h, 0) + rowGap * Math.max(0, part.length - 1));
      }
      const ls = Math.min(1, Math.max(0.6, s));
      const LG = legendLayout(ls);
      const total = head + 7 * s + rowsH + 8 * s + LG.h;
      return { s, mode, lockW, lockH, ans, ansGap, ansW, head, bx, gap, iconR, iconStep, boxesW, rowW, cols, colGap, perCol, textX, fs, rows, rowGap, ls, LG, total };
    }
    // Avval to'liq ko'rinish (qulf + matn); sig'masa — qulfsiz, keyin faqat belgilar, keyin 2 ustun
    const MODES = [
      { lock: true, text: true, min: 0.62 },
      { lock: false, text: true, min: 0.6 },
      { lock: false, text: false, cols: 1, min: 0.42 },
      { lock: false, text: false, cols: 2, min: 0.2 }
    ];
    let P = null;
    search:
    for (const mode of MODES) {
      for (let s = 1.6; s >= mode.min - 1e-9; s -= 0.02) {
        const q = plan(s, mode);
        if (q && q.total <= H) { P = q; break search; }
      }
    }
    if (!P) P = plan(0.2, MODES[3]) || plan(0.2, MODES[2]);

    const cxm = box.x + W / 2;
    const y0 = box.y + Math.max(0, (H - P.total) * 0.4);
    let y = y0;

    // Qulf va javob katakchalari
    if (P.mode.lock) { drawLock(ctx, cxm, y, P.lockW); y += P.lockH + 4.5 * P.s; }
    const ansX = cxm - P.ansW / 2;
    for (let i = 0; i < L; i++) {
      const bx = ansX + i * (P.ans + P.ansGap);
      roundRect(ctx, bx, y, P.ans, P.ans, 1.2 * P.s);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.4, 0.7 * Math.min(1, P.s)); ctx.stroke();
      if (show) {
        font(ctx, P.ans * 0.66, 800);
        ctx.fillStyle = ANSWER; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(p.secret[i]), bx + P.ans / 2, y + P.ans / 2 + P.ans * 0.03);
      }
    }
    font(ctx, 5.2 * P.s, 800);
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(T.codeLbl, cxm, y + P.ans + 2 * P.s);

    // Ishoralar (matnli rejimda chapdan, faqat belgilar rejimida o'rtada)
    const top = y0 + P.head + 7 * P.s;
    const blockW = P.mode.text ? W : P.cols * P.rowW + (P.cols - 1) * P.colGap;
    const bx0 = box.x + (W - blockW) / 2;
    let colBottom = top;
    for (let c = 0; c < P.cols; c++) {
      let ry = top;
      const x0 = bx0 + c * (P.rowW + P.colGap);
      for (let ci = c * P.perCol; ci < Math.min(N, (c + 1) * P.perCol); ci++) {
        const cl = p.clues[ci], row = P.rows[ci];
        const by = ry + (row.h - P.bx) / 2;
        for (let i = 0; i < L; i++) {
          const bx = x0 + i * (P.bx + P.gap), d = cl.g[i];
          let fill = '#fff', ink = INK;
          if (show) {
            if (p.secret[i] === d) fill = COLORS[0];
            else if (p.secret.indexOf(d) >= 0) fill = COLORS[1];
            else { fill = COLORS[2]; ink = '#94A3B8'; }
          }
          ctx.fillStyle = fill; ctx.fillRect(bx, by, P.bx, P.bx);
          ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.3, 0.5 * Math.min(1, P.s)); ctx.strokeRect(bx, by, P.bx, P.bx);
          font(ctx, P.bx * 0.62, 700);
          ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(String(d), bx + P.bx / 2, by + P.bx / 2 + P.bx * 0.03);
        }
        const iy = ry + row.h / 2;
        let ix = x0 + P.boxesW + 5 * P.s + P.iconR;
        if (cl.A + cl.B === 0) drawIcon(ctx, 'X', ix, iy, P.iconR);
        for (let i = 0; i < cl.A; i++) { drawIcon(ctx, 'A', ix, iy, P.iconR); ix += P.iconStep; }
        for (let i = 0; i < cl.B; i++) { drawIcon(ctx, 'B', ix, iy, P.iconR); ix += P.iconStep; }
        if (P.mode.text) {
          font(ctx, P.fs, 600);
          ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          const lineH = P.fs * 1.28, ty = ry + row.h / 2 - ((row.lines.length - 1) * lineH) / 2;
          row.lines.forEach((ln, li) => ctx.fillText(ln, x0 + P.textX, ty + li * lineH));
        }
        ry += row.h + P.rowGap;
      }
      colBottom = Math.max(colBottom, ry - P.rowGap);
    }

    // Qoida va belgilar izohi
    const ls = P.ls, LG = P.LG;
    y = colBottom + 8 * P.s;
    ctx.strokeStyle = '#CBD5E1'; ctx.lineWidth = 0.3;
    ctx.beginPath(); ctx.moveTo(box.x, y - 3 * P.s); ctx.lineTo(box.x + W, y - 3 * P.s); ctx.stroke();
    font(ctx, 10.5 * ls * PT, 700);
    ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(T.rule, box.x, y + 2 * ls);
    const legY = y + 8 * ls;
    font(ctx, 9.5 * ls * PT, 400);
    ['A', 'B', 'X'].forEach((kind, i) => {
      const { x, row } = LG.leg.pos[i];
      const yy = legY + row * 6 * ls;
      drawIcon(ctx, kind, box.x + x + LG.r, yy, LG.r);
      ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText('— ' + T.legend[i], box.x + x + 2 * LG.r + 1.5, yy);
    });
    if (show) {                                        // javob varag'i: ranglar ma'nosi
      const cy0 = legY + LG.leg.rows * 6 * ls + 0.5 * ls;
      COLORS.forEach((c, i) => {
        const { x, row } = LG.col.pos[i];
        const cy = cy0 + row * 6.5 * ls, sq = LG.sq;
        ctx.fillStyle = c; ctx.fillRect(box.x + x, cy - sq / 2, sq, sq);
        ctx.strokeStyle = INK; ctx.lineWidth = 0.3; ctx.strokeRect(box.x + x, cy - sq / 2, sq, sq);
        ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText('— ' + T.colors[i], box.x + x + sq + 1.5, cy);
      });
    }
    ctx.restore();
    return { scale: P.s, compact: !P.mode.text };
  },

  hint(p, info, lang) {
    const T = { uz: `Ishoralar: ${p.clues.length}`, ru: `Подсказок: ${p.clues.length}`, en: `Clues: ${p.clues.length}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  // Ekranda bolalar o'zi tekshirib ko'radigan kichik o'yin (faqat bitta topshiriq ko'rsatilganda)
  interactive(container, p, lang) {
    const T = UI[lang] || UI.uz;
    container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'code-check';
    const lbl = document.createElement('span');
    lbl.className = 'code-check-label';
    lbl.textContent = T.label;
    const row = document.createElement('div');
    row.className = 'code-inputs';
    const inputs = [];
    for (let i = 0; i < p.L; i++) {
      const inp = document.createElement('input');
      inp.type = 'text'; inp.inputMode = 'numeric'; inp.maxLength = 1; inp.autocomplete = 'off';
      inp.setAttribute('aria-label', `${i + 1}`);
      inp.addEventListener('input', () => {
        inp.value = inp.value.replace(/\D/g, '').slice(-1);
        msg.textContent = ''; wrap.classList.remove('ok', 'bad');
        if (inp.value && inputs[i + 1]) inputs[i + 1].focus();
      });
      inp.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && !inp.value && inputs[i - 1]) inputs[i - 1].focus();
        if (e.key === 'Enter') btn.click();
      });
      inputs.push(inp); row.appendChild(inp);
    }
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'btn btn-primary'; btn.textContent = T.check;
    const msg = document.createElement('p');
    msg.className = 'code-check-msg'; msg.setAttribute('role', 'status');
    btn.addEventListener('click', () => {
      const v = inputs.map(x => x.value);
      wrap.classList.remove('ok', 'bad');
      if (v.some(x => x === '')) { msg.textContent = T.fill; return; }
      if (new Set(v).size !== v.length) { msg.textContent = T.repeat; return; }
      const ok = v.every((x, i) => +x === p.secret[i]);
      msg.textContent = ok ? T.ok : T.bad;
      wrap.classList.add(ok ? 'ok' : 'bad');
    });
    wrap.append(lbl, row, btn, msg);
    container.appendChild(wrap);
  },

  check(p) {
    const problems = [];
    if (countSolutions(p.L, p.clues, 2) !== 1) problems.push('not unique');
    if (new Set(p.secret).size !== p.L) problems.push('secret repeats');
    for (const c of p.clues) {
      const f = score(p.secret, c.g);
      if (f.A !== c.A || f.B !== c.B) problems.push('clue feedback wrong');
    }
    if (p.clues.length > MAXC[p.L]) problems.push('too many clues');
    const need = LEVEL_CFG[p.level].need;
    if (need && !solveLogic(p.L, p.clues, need === 2).solved) problems.push('not solvable by logic for level');
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-code" aria-hidden="true"><defs><linearGradient id="cg-code" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f093fb"/><stop offset="1" stop-color="#f5576c"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-code)"/><path class="code-shackle" d="M82 98 V76 Q82 56 100 56 Q118 56 118 76 V98" stroke="#fff" stroke-width="11" fill="none" stroke-linecap="round"/><rect x="66" y="94" width="68" height="60" rx="10" fill="#fff"/><circle class="code-key" cx="100" cy="118" r="9" fill="#22C55E"/><rect x="96" y="122" width="8" height="18" rx="3" fill="#22C55E"/><text class="code-q" x="160" y="70" font-family="Nunito,Arial,sans-serif" font-size="34" font-weight="900" fill="#fff" text-anchor="middle">?</text></svg>`
};
