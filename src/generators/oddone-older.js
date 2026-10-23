// oddone-older.js — «Ortiqchasini top» generatorining «Katta bolalar» darajasi (v2.8) uchun qatorlar:
//   word — so'zlar: to'rttasi bir toifadan (hayvonlar, kasblar …), bittasi boshqa toifadan;
//   num  — sonlar: to'rttasi bitta qoidaga bo'ysunadi (juft, 3 ga bo'linadi, raqamlar yig'indisi …), bittasi yo'q;
//   mpic — bitta rasm turli burchakka burilgan, bittasi esa ko'zgudagi aksi.
// Qolip: rus IQ kitobi S2, S6 (so'z), M1 (son), V20–V21 (ko'zgu aksi).
// Kafolat (checkOlder()): ortiqcha faqat bitta; son qatorlarida boshqa birorta xususiyat (juftlik, bo'linish,
// raqamlar yig'indisi, oxirgi raqam …) boshqa sonni «yolg'iz» qilib qo'ymaydi.

import { shuffle, pickOne } from '../core/rng.js';
import { PIC_KEYS, isAsymmetric } from '../core/pictures.js';
import { bankOf } from './wordkit.js';

// ---------- So'z toifalari ----------
// Faqat aniq toifaga kiradigan so'zlar (mavzu banklaridagi «bekat», «medal» kabi yondosh so'zlar olinmaydi)
const CATS = {
  animals: { one: { uz: 'hayvon', ru: 'животное', en: 'an animal' }, many: { uz: 'hayvonlar', ru: 'животные', en: 'animals' }, bank: 'animals' },
  food: { one: { uz: 'oziq-ovqat', ru: 'еда', en: 'food' }, many: { uz: 'oziq-ovqat', ru: 'еда', en: 'food' }, bank: 'food' },
  jobs: { one: { uz: 'kasb', ru: 'профессия', en: 'a job' }, many: { uz: 'kasblar', ru: 'профессии', en: 'jobs' }, bank: 'jobs' },
  transport: {
    one: { uz: 'transport vositasi', ru: 'транспорт', en: 'a vehicle' }, many: { uz: 'transport vositalari', ru: 'транспорт', en: 'vehicles' },
    words: {
      uz: 'MASHINA AVTOBUS POYEZD SAMOLYOT VERTOLYOT KEMA QAYIQ MOTOTSIKL TRAMVAY TROLLEYBUS METRO TAKSI TRAKTOR EKSKAVATOR SKUTER SAMOKAT ARAVA FURGON',
      ru: 'МАШИНА АВТОБУС ПОЕЗД САМОЛЁТ ВЕРТОЛЁТ КОРАБЛЬ ЛОДКА МОТОЦИКЛ ТРАМВАЙ ТРОЛЛЕЙБУС МЕТРО ТАКСИ ГРУЗОВИК ТРАКТОР ЭКСКАВАТОР СКУТЕР САМОКАТ ТЕЛЕГА ФУРГОН',
      en: 'CAR BUS TRAIN AIRPLANE HELICOPTER SHIP BOAT MOTORCYCLE TRAM TROLLEYBUS SUBWAY TAXI TRUCK TRACTOR EXCAVATOR SCOOTER CART VAN SUBMARINE'
    }
  },
  sport: {
    one: { uz: 'sport turi', ru: 'вид спорта', en: 'a sport' }, many: { uz: 'sport turlari', ru: 'виды спорта', en: 'sports' },
    words: {
      uz: 'FUTBOL BASKETBOL VOLEYBOL SUZISH YUGURISH SHAXMAT SHASHKA TENNIS BOKS KURASH GIMNASTIKA DZYUDO',
      ru: 'ФУТБОЛ БАСКЕТБОЛ ВОЛЕЙБОЛ ПЛАВАНИЕ БЕГ ШАХМАТЫ ШАШКИ ТЕННИС БОКС БОРЬБА ГИМНАСТИКА ДЗЮДО',
      en: 'FOOTBALL BASKETBALL VOLLEYBALL SWIMMING RUNNING CHESS CHECKERS TENNIS BOXING WRESTLING GYMNASTICS JUDO SKIING'
    }
  },
  devices: {
    one: { uz: 'qurilma', ru: 'устройство', en: 'a device' }, many: { uz: 'qurilmalar', ru: 'устройства', en: 'devices' },
    words: {
      uz: 'KOMPYUTER NOUTBUK PLANSHET TELEFON KLAVIATURA MONITOR PRINTER KAMERA MIKROFON NAUSHNIK',
      ru: 'КОМПЬЮТЕР НОУТБУК ПЛАНШЕТ ТЕЛЕФОН КЛАВИАТУРА МОНИТОР ПРИНТЕР КАМЕРА МИКРОФОН НАУШНИКИ',
      en: 'COMPUTER LAPTOP TABLET PHONE KEYBOARD MONITOR PRINTER CAMERA MICROPHONE HEADPHONES'
    }
  },
  space: {
    one: { uz: 'osmon jismi', ru: 'небесное тело', en: 'a space object' }, many: { uz: 'osmon jismlari', ru: 'небесные тела', en: 'space objects' },
    words: {
      uz: 'QUYOSH OY YULDUZ SAYYORA YER MARS KOMETA VENERA YUPITER SATURN URAN NEPTUN MERKURIY METEOR ASTEROID',
      ru: 'ЛУНА СОЛНЦЕ ЗВЕЗДА ПЛАНЕТА ЗЕМЛЯ МАРС КОМЕТА ВЕНЕРА ЮПИТЕР САТУРН УРАН НЕПТУН МЕРКУРИЙ МЕТЕОР АСТЕРОИД',
      en: 'MOON SUN STAR PLANET EARTH MARS COMET VENUS JUPITER SATURN URANUS NEPTUNE MERCURY METEOR ASTEROID'
    }
  }
};
const NO_PAIR = new Set(['animals|food', 'food|animals']);   // baliq, tovuq — ikkala toifaga ham kiradi
const cache = {};
export function catWords(cat, lang) {
  const k = cat + '|' + lang;
  if (!cache[k]) {
    const c = CATS[cat];
    const list = c.words ? (c.words[lang] || c.words.uz).split(' ') : bankOf(lang, c.bank).map(w => w.text);
    cache[k] = list.filter(w => w.length <= 10);
  }
  return cache[k];
}
const inCat = (w, cat, lang) => catWords(cat, lang).includes(w);

export function wordRow(K, lang, rand, used) {
  const cats = Object.keys(CATS);
  for (let guard = 0; guard < 100; guard++) {
    const [a, b] = shuffle(cats.slice(), rand);
    if (NO_PAIR.has(a + '|' + b)) continue;
    if (used.cats.has(a) && guard < 50) continue;
    const majors = shuffle(catWords(a, lang).filter(w => !inCat(w, b, lang) && !used.words.has(w)), rand).slice(0, K - 1);
    const odds = catWords(b, lang).filter(w => !inCat(w, a, lang) && !used.words.has(w));
    if (majors.length < K - 1 || !odds.length) continue;
    const items = majors.slice(), at = Math.floor(rand() * K);
    items.splice(at, 0, pickOne(rand, odds));
    items.forEach(w => used.words.add(w));
    used.cats.add(a);
    return { t: 'word', items, odd: at, a, b };
  }
  throw new Error('odd: no word row');
}

// ---------- Sonlar ----------
const dsum = n => String(n).split('').reduce((s, d) => s + +d, 0);
const isPrime = n => { if (n < 2) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };
// Asosiy qoidalar (qatorni shu qoida bo'yicha tuzamiz)
const NUM_RULES = {
  even: { ok: n => n % 2 === 0 },
  odd: { ok: n => n % 2 === 1 },
  m3: { ok: n => n % 3 === 0 },
  m4: { ok: n => n % 4 === 0 },
  m5: { ok: n => n % 5 === 0 },
  sq: { ok: n => Number.isInteger(Math.sqrt(n)) },
  same: { ok: n => n % 11 === 0 },
  inc: { ok: n => Math.floor(n / 10) < n % 10 },
  dsum: { ok: (n, s) => dsum(n) === s }
};
// Tekshiruv uchun: «bittasi boshqacha» bo'lib qolishi mumkin bo'lgan barcha xususiyatlar
const NUM_CHECKS = [
  n => n % 2, n => n % 3 === 0, n => n % 4 === 0, n => n % 5 === 0, n => n % 9 === 0, n => n % 10 === 0,
  n => Number.isInteger(Math.sqrt(n)), n => n % 11 === 0, n => Math.sign(Math.floor(n / 10) - n % 10), isPrime,
  dsum, n => n % 10, n => Math.floor(n / 10), n => (n < 50 ? 0 : 1)
];
// Qaysi element yolg'iz (qolganlari bir xil qiymatda) — bo'lmasa -1
function loner(vals) {
  const keys = vals.map(String);
  for (let i = 0; i < keys.length; i++) {
    const rest = keys.filter((_, j) => j !== i);
    if (rest.every(v => v === rest[0]) && keys[i] !== rest[0]) return i;
  }
  return -1;
}
export function numOk(items, odd) {
  for (const f of NUM_CHECKS) { const l = loner(items.map(f)); if (l >= 0 && l !== odd) return false; }
  return new Set(items).size === items.length;
}
export function numRow(K, rand, usedRules) {
  const rules = Object.keys(NUM_RULES);
  for (let guard = 0; guard < 400; guard++) {
    const rule = guard < 200 ? pickOne(rand, rules.filter(r => !usedRules.has(r))) || pickOne(rand, rules) : pickOne(rand, rules);
    const s = rule === 'dsum' ? 7 + Math.floor(rand() * 5) : 0;
    const R = NUM_RULES[rule];
    const all = Array.from({ length: 90 }, (_, i) => i + 10);
    const yes = shuffle(all.filter(n => R.ok(n, s)), rand), no = shuffle(all.filter(n => !R.ok(n, s)), rand);
    if (yes.length < K - 1) continue;
    const items = yes.slice(0, K - 1), at = Math.floor(rand() * K);
    items.splice(at, 0, no[0]);
    if (!numOk(items, at)) continue;
    const lone = loner(items.map(n => R.ok(n, s)));
    if (lone !== at) continue;
    usedRules.add(rule);
    return { t: 'num', rule, s, items, odd: at };
  }
  throw new Error('odd: no number row');
}
export function numRuleOk(row) { const R = NUM_RULES[row.rule]; return R && loner(row.items.map(n => R.ok(n, row.s))) === row.odd; }

// ---------- Burilgan rasmlar orasida ko'zgu aksi ----------
export function mirrorPicRow(K, rand, usedPics) {
  const pics = shuffle(PIC_KEYS.filter(k => isAsymmetric(k) && !usedPics.has(k)), rand);
  const pic = pics[0];
  usedPics.add(pic);
  const rots = shuffle([0, 45, 90, 135, 180, 225, 270, 315], rand).slice(0, K);
  const at = Math.floor(rand() * K);
  return { t: 'mpic', pic, items: rots.map((rot, i) => ({ rot, flip: i === at })), odd: at };
}

// ---------- Izohlar (javoblar varag'i) ----------
const NUM_WHY = {
  even: { uz: x => `${x} toq, qolganlari juft`, ru: x => `${x} — нечётное, остальные чётные`, en: x => `${x} is odd; the others are even` },
  odd: { uz: x => `${x} juft, qolganlari toq`, ru: x => `${x} — чётное, остальные нечётные`, en: x => `${x} is even; the others are odd` },
  m3: { uz: x => `${x} 3 ga bo'linmaydi, qolganlari bo'linadi`, ru: x => `${x} не делится на 3, остальные делятся`, en: x => `${x} is not divisible by 3; the others are` },
  m4: { uz: x => `${x} 4 ga bo'linmaydi, qolganlari bo'linadi`, ru: x => `${x} не делится на 4, остальные делятся`, en: x => `${x} is not divisible by 4; the others are` },
  m5: { uz: x => `${x} 5 ga bo'linmaydi, qolganlari bo'linadi`, ru: x => `${x} не делится на 5, остальные делятся`, en: x => `${x} is not divisible by 5; the others are` },
  sq: { uz: x => `${x} biror sonning kvadrati emas (16 = 4·4 kabi)`, ru: x => `${x} — не квадрат числа (как 16 = 4·4)`, en: x => `${x} is not a square number (like 16 = 4·4)` },
  same: { uz: x => `${x} raqamlari har xil, qolganlarida bir xil`, ru: x => `у ${x} цифры разные, у остальных одинаковые`, en: x => `${x} has different digits; the others repeat a digit` },
  inc: { uz: x => `${x} da birinchi raqam katta, qolganlarida kichik`, ru: x => `у ${x} первая цифра больше второй, у остальных меньше`, en: x => `in ${x} the first digit is bigger; in the others it is smaller` },
  dsum: {
    uz: (x, s, t) => `${x} raqamlari yig'indisi ${t}, qolganlarida ${s}`,
    ru: (x, s, t) => `сумма цифр ${x} равна ${t}, у остальных ${s}`,
    en: (x, s, t) => `the digits of ${x} add up to ${t}; the others add up to ${s}`
  }
};
export function whyOlder(row, lang) {
  if (row.t === 'word') {
    const A = CATS[row.a], B = CATS[row.b], w = row.items[row.odd];
    return { uz: `${w} — ${B.one.uz}; qolganlari — ${A.many.uz}`, ru: `${w} — ${B.one.ru}; остальные — ${A.many.ru}`, en: `${w} is ${B.one.en}; the others are ${A.many.en}` }[lang];
  }
  if (row.t === 'num') {
    const f = NUM_WHY[row.rule], x = row.items[row.odd];
    return (f[lang] || f.uz)(x, row.s, dsum(x));
  }
  return { uz: "ko'zgudagi aksi: burib ustiga tushirib bo'lmaydi", ru: 'зеркальное отражение: поворотом не совместить', en: 'a mirror image: no turn makes it match' }[lang];
}

export function checkOlder(row, lang) {
  const out = [];
  if (row.t === 'word') {
    if (new Set(row.items).size !== row.items.length) out.push('repeated word');
    row.items.forEach((w, i) => {
      const ok = i === row.odd ? inCat(w, row.b, lang) && !inCat(w, row.a, lang) : inCat(w, row.a, lang) && !inCat(w, row.b, lang);
      if (!ok) out.push(`${w} does not fit ${row.a}/${row.b}`);
    });
    if (NO_PAIR.has(row.a + '|' + row.b)) out.push('forbidden pair');
  } else if (row.t === 'num') {
    if (!numRuleOk(row)) out.push('number rule broken');
    if (!numOk(row.items, row.odd)) out.push('another number stands out');
  } else if (row.t === 'mpic') {
    if (!isAsymmetric(row.pic)) out.push('symmetric picture');
    if (new Set(row.items.map(x => x.rot)).size !== row.items.length) out.push('repeated rotation');
    if (row.items.filter(x => x.flip).length !== 1 || !row.items[row.odd].flip) out.push('flip count');
  }
  return out;
}
