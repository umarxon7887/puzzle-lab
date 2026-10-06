export const BANKS = {
  uz: {
    school:  ['DARS','MAKTAB','DEFTAR','QALAM','KITOB','SINF','DOSKA','PARTA','RYUKZAK','LINEYKA','PENAL','KOMPYUTER','TEST','BAHO','RANG','JADVAL','XARITA','GLOBUS','MIKROSKOP','LOYIHA','REFERAT','DIREKTOR','TANAFFUS','DARSLIK','JURNAL','MARKER'],
    autumn:  ['KUZ','YAPROQ','SHAMOL','YOMGIR','BULUT','TUMAN','HOSIL','OLMA','NOK','UZUM','QOVUN','TARVUZ','DALA','DEHQON','SOVUQ','PAXTA','BEDA','JAVDAR','BUGDOY','OLXORI','ANJIR','NOYABR','OKTABR','SENTABR','SHABNAM','DARAXT'],
    animals: ['MUSHUK','KUCHUK','QUYON','TULKI','AYIQ','BURI','SHER','YOLBARS','FIL','ZEBRA','MAYMUN','TOVUS','LAYLAK','TOSHBAQA','SICHQON','ILON','QARGA','ORDAK','TUYA','ARSLON','QOPLON','TIMSOH','TOVUQ','XOROZ','QIRGOVUL','KALAMUSH'],
    food:    ['NON','SHOLI','OSH','SOMSA','MANTI','LAGMON','SALAT','SUT','PISHLOQ','TUXUM','GOSHT','BALIQ','MEVA','SABZAVOT','QOVURDOQ','SHURVA','NORIN','KABOB','HOLVA','ASAL','QAYMOQ','QATIQ','PIYOZ','SABZI','KARTOSHKA','POMIDOR'],
    sport:   ['FUTBOL','BASKETBOL','VOLEYBOL','SUZISH','YUGURISH','SHAXMAT','VELOSIPED','TENNIS','BOKS','KURASH','CHANGI','STADION','TOP','MEDAL','MASHQ','SPORTZAL','MURABBIY','CHEMPION','GANTEL','TRENAJOR','MARAFON','GIMNASTIKA','DARVOZA','HAKAM','YUTUQ','MUSOBAQA'],
    space:   ['QUYOSH','YULDUZ','SAYYORA','RAKETA','KOSMOS','YER','MARS','KOMETA','GALAKTIKA','TELESKOP','ASTRONAVT','ORBITA','SUNIY','VENERA','YUPITER','SATURN','NEPTUN','MERKURIY','PLUTON','METEOR','SPUTNIK','ASTEROID','STANSIYA','GRAVITATSIYA','ATMOSFERA','MODUL']
  },
  ru: {
    school:  ['ШКОЛА','УРОК','ТЕТРАДЬ','РУЧКА','КНИГА','КЛАСС','ДОСКА','ПАРТА','РЮКЗАК','ЛИНЕЙКА','ПЕНАЛ','КОМПЬЮТЕР','ТЕСТ','ОЦЕНКА','ДИРЕКТОР','ЖУРНАЛ','КАРТА','ГЛОБУС','МИКРОСКОП','ПРОЕКТ','ДОКЛАД','ПЕРЕМЕНА','УЧЕБНИК','МАРКЕР','ШКАФ','СТОЛ'],
    autumn:  ['ОСЕНЬ','ЛИСТЬЯ','ВЕТЕР','ДОЖДЬ','ТУЧА','ТУМАН','УРОЖАЙ','ЯБЛОКО','ГРУША','ВИНОГРАД','ТЫКВА','АРБУЗ','ПОЛЕ','ФЕРМЕР','ХОЛОД','ПШЕНИЦА','СЛИВА','ИНЖИР','НОЯБРЬ','ОКТЯБРЬ','СЕНТЯБРЬ','РОСА','ДЕРЕВО','ЗОНТ','ЛУЖА','ГРИБ'],
    animals: ['КОШКА','СОБАКА','ЗАЯЦ','ЛИСА','МЕДВЕДЬ','ВОЛК','ЛЕВ','ТИГР','СЛОН','ЗЕБРА','ОБЕЗЬЯНА','ПАВЛИН','АИСТ','ЧЕРЕПАХА','МЫШЬ','ЗМЕЯ','ВОРОНА','УТКА','ВЕРБЛЮД','ЛЕОПАРД','КРОКОДИЛ','ПЕТУХ','КУРИЦА','ФАЗАН','КРЫСА','ЛОШАДЬ'],
    food:    ['ХЛЕБ','РИС','ПЛОВ','САМСА','МАНТЫ','ЛАГМАН','САЛАТ','МОЛОКО','СЫР','ЯЙЦО','МЯСО','РЫБА','ФРУКТ','ОВОЩ','ЖАРКОЕ','СУП','НОРИН','КЕБАБ','ХАЛВА','МЁД','СМЕТАНА','ЙОГУРТ','ЛУК','МОРКОВЬ','КАРТОФЕЛЬ','ПОМИДОР'],
    sport:   ['ФУТБОЛ','БАСКЕТБОЛ','ВОЛЕЙБОЛ','ПЛАВАНИЕ','БЕГ','ШАХМАТЫ','ВЕЛОСИПЕД','ТЕННИС','БОКС','БОРЬБА','ЛЫЖИ','СТАДИОН','МЯЧ','МЕДАЛЬ','ТРЕНЕР','ЧЕМПИОН','ГАНТЕЛЬ','ТРЕНАЖЁР','МАРАФОН','ГИМНАСТИКА','ВОРОТА','СУДЬЯ','ПОБЕДА','СОРЕВНОВАНИЕ','ЗАРЯДКА','ЗАЛ'],
    space:   ['ЛУНА','СОЛНЦЕ','ЗВЕЗДА','ПЛАНЕТА','РАКЕТА','КОСМОС','ЗЕМЛЯ','МАРС','КОМЕТА','ГАЛАКТИКА','ТЕЛЕСКОП','КОСМОНАВТ','СПУТНИК','ОРБИТА','ЮПИТЕР','САТУРН','НЕПТУН','МЕРКУРИЙ','ПЛУТОН','МЕТЕОР','АСТЕРОИД','СТАНЦИЯ','ГРАВИТАЦИЯ','АТМОСФЕРА','МОДУЛЬ','ВСЕЛЕННАЯ']
  }
};

export const CAT_KEYS = ['school','autumn','animals','food','sport','space'];
export const CAT_ICONS = { school:'🏫', autumn:'🍂', animals:'🐾', food:'🍽️', sport:'⚽', space:'🚀' };

export const DIR_VEC = [[1,0],[0,1],[1,1],[1,-1],[-1,0],[0,-1],[-1,-1],[-1,1]];
export const LEVEL_DIRS = [[0,1],[0,1,2],[0,1,2,3,4,5],[0,1,2,3,4,5,6,7]];
export const LEVEL_K = [2.7, 2.3, 1.95, 1.65];
export const LEVEL_WORDCOUNT = [8, 10, 12, 14];

export const ALPHA = { uz: 'ABCDEFGHIJKLMNOPQRSTUVXYZ', ru: 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ' };

function makeRng(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function pickWords(cat, level, seed, language) {
  const pool = BANKS[language][cat];
  const count = Math.min(LEVEL_WORDCOUNT[level], pool.length);
  return shuffle(pool.slice(), makeRng(seed * 7 + 3)).slice(0, count);
}

export function tryBuild(words, N, dirs, rand) {
  const grid = Array(N * N).fill('');
  const placed = [];
  const order = words.slice().sort((a, b) => b.length - a.length);
  for (const w of order) {
    let ok = false;
    const dirOrder = shuffle(dirs.slice(), rand);
    for (let t = 0; t < 250 && !ok; t++) {
      const d = dirOrder[t % dirOrder.length];
      const [dx, dy] = DIR_VEC[d];
      const r0 = Math.floor(rand() * N), c0 = Math.floor(rand() * N);
      const er = r0 + dy * (w.length - 1), ec = c0 + dx * (w.length - 1);
      if (er < 0 || er >= N || ec < 0 || ec >= N) continue;
      let fits = true;
      for (let i = 0; i < w.length; i++) {
        const ch = grid[(r0 + dy*i) * N + (c0 + dx*i)];
        if (ch && ch !== w[i]) { fits = false; break; }
      }
      if (!fits) continue;
      for (let i = 0; i < w.length; i++) grid[(r0 + dy*i) * N + (c0 + dx*i)] = w[i];
      placed.push({ word: w, cells: Array.from({length: w.length}, (_, i) => [r0 + dy*i, c0 + dx*i]) });
      ok = true;
    }
    if (!ok) return null;
  }
  return { grid, placed };
}

export function generateWordSearch(cat, level, seed, language) {
  const words = pickWords(cat, level, seed, language);
  const dirs = LEVEL_DIRS[level];
  const longest = Math.max(...words.map(w => w.length));
  const totalLetters = words.reduce((s, w) => s + w.length, 0);
  let N = Math.max(longest, Math.ceil(Math.sqrt(totalLetters * LEVEL_K[level])), 9);
  N = Math.min(N, 22);
  let result = null;
  for (let grow = 0; grow < 12 && !result; grow++) {
    result = tryBuild(words, N, dirs, makeRng(seed + grow * 977));
    if (!result) N = Math.min(N + 1, 24);
  }
  if (!result) result = { grid: Array(N*N).fill(''), placed: [] };
  const alpha = ALPHA[language];
  const rand = makeRng(seed * 131 + 11);
  const grid = result.grid.map(ch => ch || alpha[Math.floor(rand() * alpha.length)]);
  return { N, grid, words: result.placed, total: words.length };
}
