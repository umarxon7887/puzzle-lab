// rng.js — seed (raqam) bilan ishlaydigan tasodifiy sonlar.
// Asosiy qoida: bir xil seed → har doim bir xil natija. Shuning uchun topshiriq
// va uning javob varag'i bir-biriga albatta mos keladi. Generatorlar ichida
// Math.random() ishlatilmaydi — faqat shu yerdagi makeRng().

// Mulberry32: tez va sifatli 32-bitli generator. Natija: [0, 1) oralig'idagi son.
export function makeRng(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Massivni joyida aralashtiradi (Fisher–Yates) va o'zini qaytaradi.
export function shuffle(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

// [lo, hi] oralig'idagi butun son (ikkala chegara ham kiradi).
export const randInt = (rand, lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

// Ro'yxatdan bitta element.
export const pickOne = (rand, list) => list[Math.floor(rand() * list.length)];

// Interfeys uchun yangi tasodifiy raqam (1 … 999 999 999). Generatorlar ichida ishlatilmaydi.
export const newSeed = () => Math.floor(Math.random() * 999999999) + 1;

// Bitta varaqdagi 2-, 3-, 4-topshiriq uchun asosiy raqamdan yangi raqam hosil qiladi.
// i = 0 bo'lsa raqamning o'zi qaytadi.
export function deriveSeed(seed, i) {
  if (!i) return seed;
  const x = Math.imul((seed ^ Math.imul(i, 0x9E3779B1)) >>> 0, 0x85EBCA6B) >>> 0;
  return (x % 999999999) + 1;
}
