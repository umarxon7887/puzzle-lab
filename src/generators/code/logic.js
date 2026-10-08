/**
 * logic.js — "Kodni top" (Mastermind uslubidagi) o'yin mantig'i
 * Topshiriqlar Lab
 *
 * Kodlar har doim STRING sifatida saqlanadi ("007"), shunda boshidagi
 * nollar yo'qolmaydi. Raqamlar takrorlanishi mumkin.
 *
 * Ipuq obyekti: { guess: "123", correctPlace: 1, wrongPlace: 1 }
 */

// ---------------------------------------------------------------
// 0. Konstantalar
// ---------------------------------------------------------------
const MIN_LENGTH = 3;
const MAX_LENGTH = 5;
const MAX_ATTEMPTS = 30; // ipuqlarni qayta yaratish urinishlari soni
const SAMPLE_SIZE = 30; // har bir qadamda sinab ko'riladigan taxminlar soni
const MAX_EXTRA_CLUES = 20; // zaxira rejada qo'shiladigan ipuqlar chegarasi

// ---------------------------------------------------------------
// 1. Yordamchi funksiyalar
// ---------------------------------------------------------------

/** Kod uzunligi 3, 4 yoki 5 ekanini tekshiradi. */
function assertLength(length) {
  if (!Number.isInteger(length) || length < MIN_LENGTH || length > MAX_LENGTH) {
    throw new RangeError(`Kod uzunligi ${MIN_LENGTH}–${MAX_LENGTH} oralig'ida bo'lishi kerak.`);
  }
}

/** Qator berilgan uzunlikdagi to'g'ri raqamli kod ekanini tekshiradi. */
function isValidCode(code, length) {
  return typeof code === 'string' && code.length === length && /^[0-9]+$/.test(code);
}

/** Tasodifiy butun son: [0, max). */
function randInt(max) {
  return Math.floor(Math.random() * max);
}

/** Tasodifiy kod (hech qanday cheklovsiz, raqamlar takrorlanishi mumkin). */
function randomCode(length) {
  let code = '';
  for (let i = 0; i < length; i++) code += randInt(10);
  return code;
}

// Baholash uchun qayta ishlatiladigan buferlar (tezlik uchun).
const secretCounts = new Int8Array(10);
const guessCounts = new Int8Array(10);

/**
 * Taxminni maxfiy kod bilan solishtiradi (Mastermind qoidasi, takroriy
 * raqamlar bilan to'g'ri ishlaydi).
 */
export function scoreGuess(secret, guess) {
  secretCounts.fill(0);
  guessCounts.fill(0);
  let correctPlace = 0;

  for (let i = 0; i < secret.length; i++) {
    const s = secret.charCodeAt(i) - 48;
    const g = guess.charCodeAt(i) - 48;
    if (s === g) {
      correctPlace++;
    } else {
      secretCounts[s]++;
      guessCounts[g]++;
    }
  }

  let wrongPlace = 0;
  for (let d = 0; d < 10; d++) {
    wrongPlace += Math.min(secretCounts[d], guessCounts[d]);
  }
  return { correctPlace, wrongPlace };
}

/** Berilgan kod ushbu ipuqqa mos keladimi? */
function matchesClue(code, clue) {
  const r = scoreGuess(code, clue.guess);
  return r.correctPlace === clue.correctPlace && r.wrongPlace === clue.wrongPlace;
}

/** Barcha mumkin kodlar: 000…999, 0000…9999 yoki 00000…99999. */
export function getAllCodes(length) {
  assertLength(length);
  const total = 10 ** length;
  const codes = new Array(total);
  for (let i = 0; i < total; i++) codes[i] = String(i).padStart(length, '0');
  return codes;
}

// ---------------------------------------------------------------
// 2. Maxfiy kod yaratish
// ---------------------------------------------------------------

export function generateSecretCode(length) {
  assertLength(length);
  const minDistinct = Math.ceil(length / 2);
  while (true) {
    const code = randomCode(length);
    if (new Set(code).size >= minDistinct) return code;
  }
}

// ---------------------------------------------------------------
// 3. Tekshiruv (eng muhim qism)
// ---------------------------------------------------------------

export function validatePuzzle(clues, secretCode, length) {
  assertLength(length);

  const fail = (reason) => ({
    valid: false,
    solutionCount: 0,
    solutions: [],
    secretConsistent: false,
    reason,
  });

  if (!isValidCode(secretCode, length)) return fail('secretCode noto\'g\'ri formatda');
  if (!Array.isArray(clues) || clues.length === 0) return fail('ipuqlar bo\'sh');
  for (const c of clues) {
    if (!c || !isValidCode(c.guess, length)) return fail('ipuqdagi taxmin noto\'g\'ri');
  }

  const secretConsistent = clues.every((c) => matchesClue(secretCode, c));

  const total = 10 ** length;
  const solutions = [];
  let solutionCount = 0;
  for (let i = 0; i < total; i++) {
    const code = String(i).padStart(length, '0');
    if (clues.every((c) => matchesClue(code, c))) {
      solutionCount++;
      if (solutions.length < 10) solutions.push(code);
    }
  }

  let reason = null;
  if (!secretConsistent) reason = 'ipuqlar maxfiy kodga zid';
  else if (solutionCount === 0) reason = 'yechim yo\'q';
  else if (solutionCount > 1) reason = `yagona yechim emas (${solutionCount} ta yechim)`;

  return {
    valid: secretConsistent && solutionCount === 1 && solutions[0] === secretCode,
    solutionCount,
    solutions,
    secretConsistent,
    reason,
  };
}

// ---------------------------------------------------------------
// 4. Ipuqlar yaratish
// ---------------------------------------------------------------

function countMatching(candidates, clue) {
  let n = 0;
  for (let i = 0; i < candidates.length; i++) {
    if (matchesClue(candidates[i], clue)) n++;
  }
  return n;
}

function pickClue(secret, length, candidates, used, target) {
  let best = null;
  const logTarget = Math.log(target);

  for (let s = 0; s < SAMPLE_SIZE; s++) {
    const guess = randomCode(length);
    if (used.has(guess)) continue;

    const { correctPlace, wrongPlace } = scoreGuess(secret, guess);
    const clue = { guess, correctPlace, wrongPlace };

    const remaining = countMatching(candidates, clue);
    if (remaining >= candidates.length) continue;

    const diff = Math.abs(Math.log(remaining) - logTarget);
    if (!best || diff < best.diff) best = { clue, remaining, diff };
  }
  return best ? best.clue : null;
}

function buildClues(secret, length, numClues, allCodes) {
  let candidates = allCodes;
  const clues = [];
  const used = new Set([secret]);
  const total = allCodes.length;

  for (let i = 0; i < numClues; i++) {
    const target = Math.pow(total, 1 - (i + 1) / numClues);
    const clue = pickClue(secret, length, candidates, used, target);
    if (!clue) break;

    clues.push(clue);
    used.add(clue.guess);
    candidates = candidates.filter((code) => matchesClue(code, clue));
  }
  return { clues, candidates };
}

export function generateClues(secretCode, numClues) {
  const length = secretCode.length;
  assertLength(length);
  if (!isValidCode(secretCode, length)) throw new TypeError('secretCode noto\'g\'ri formatda');
  if (!Number.isInteger(numClues) || numClues < 1) {
    throw new RangeError('numClues musbat butun son bo\'lishi kerak.');
  }

  const allCodes = getAllCodes(length);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { clues } = buildClues(secretCode, length, numClues, allCodes);
    if (clues.length === numClues && validatePuzzle(clues, secretCode, length).valid) {
      return clues;
    }
  }

  let { clues, candidates } = buildClues(secretCode, length, numClues, allCodes);
  const used = new Set([secretCode, ...clues.map((c) => c.guess)]);

  for (let extra = 0; candidates.length > 1 && extra < MAX_EXTRA_CLUES; extra++) {
    let clue = pickClue(secretCode, length, candidates, used, 1);
    if (!clue) clue = { guess: secretCode, correctPlace: length, wrongPlace: 0 };
    clues.push(clue);
    used.add(clue.guess);
    candidates = candidates.filter((code) => matchesClue(code, clue));
  }

  if (!validatePuzzle(clues, secretCode, length).valid) {
    throw new Error('Yagona yechimli topshiriq yaratib bo\'lmadi.');
  }
  return clues;
}

// ---------------------------------------------------------------
// 5. Matn (uz / ru / en)
// ---------------------------------------------------------------

function ruForm(n, one, few, many) {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

const TEXT = {
  uz: {
    none: () => 'Hech bir raqam kodda yo\'q',
    correct: (n) => `${n} raqam to'g'ri va joyida`,
    wrong: (n) => `${n} raqam bor, lekin joyi noto'g'ri`,
  },
  ru: {
    none: () => 'Ни одной из этих цифр нет в коде',
    correct: (n) =>
      n === 1
        ? '1 цифра верна и стоит на своём месте'
        : `${n} ${ruForm(n, 'цифра', 'цифры', 'цифр')} верны и стоят на своих местах`,
    wrong: (n) =>
      n === 1
        ? '1 цифра есть в коде, но стоит не на своём месте'
        : `${n} ${ruForm(n, 'цифра', 'цифры', 'цифр')} есть в коде, но стоят не на своих местах`,
  },
  en: {
    none: () => 'None of the digits are in the code',
    correct: (n) =>
      n === 1
        ? '1 digit is correct and in the right place'
        : `${n} digits are correct and in the right place`,
    wrong: (n) =>
      n === 1
        ? '1 digit is in the code but in the wrong place'
        : `${n} digits are in the code but in the wrong place`,
  },
};

export function getClueText(clue, lang = 'uz') {
  const t = TEXT[lang] || TEXT.en;
  const parts = [];

  if (clue.correctPlace > 0) parts.push(t.correct(clue.correctPlace));
  if (clue.wrongPlace > 0) parts.push(t.wrong(clue.wrongPlace));
  if (parts.length === 0) return t.none();

  return parts.join(', ');
}
