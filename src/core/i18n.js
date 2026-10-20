// i18n.js — interfeys tillari: o'zbekcha, ruscha, inglizcha.
// t('kalit') — joriy tildagi matn. Matn funksiya bo'lsa, t('kalit', a, b) uni chaqiradi.
// pick({uz, ru, en}) — generatorlar ichidagi uch tilli matnlardan joriysini oladi.
// Til almashtirilganda sahifa qayta yuklanmaydi: 'langchange' hodisasi yuboriladi.

import { store } from './storage.js';
import { levelName } from './levels.js';

export const LANGS = [
  { code: 'uz', short: 'UZ', name: "O'zbekcha" },
  { code: 'ru', short: 'RU', name: 'Русский' },
  { code: 'en', short: 'EN', name: 'English' }
];

const DICT = {
  uz: {
    appName: 'Topshiriqlar Lab',
    tagline: 'Bolalar uchun mantiqiy topshiriqlar',
    langLabel: 'Til',
    homeTitle: 'Topshiriq generatorlari',
    homeLead: 'Bolalar uchun mantiqiy topshiriqlar: bir zumda yarating va A4 PDF qilib chop eting.',
    packCardTitle: "To'plam yaratish",
    packCardDesc: "Turli topshiriqlardan aralash to'plam — bitta PDF va javoblar",
    sectionGenerators: 'Generatorlar',
    homeFoot: 'Bepul · Internetsiz ham ishlaydi · Chop etish uchun A4 PDF',
    back: 'Orqaga',
    home: 'Bosh sahifa',
    level: 'Daraja',
    titleLabel: 'Topshiriq matni (varaq tepasida)',
    titleReset: 'Asl matn',
    fontSize: "Matn o'lchami",
    newPuzzle: 'Yangi topshiriq',
    showAnswer: "Javobni ko'rsatish",
    hideAnswer: 'Javobni yashirish',
    pdf: 'PDF yuklab olish',
    pdfTask: 'Topshiriq',
    pdfAnswer: "Javob varag'i",
    pdfBoth: 'Ikkalasi (bitta faylda)',
    settings: 'Sozlamalar',
    perPage: 'Bir varaqda nechta topshiriq',
    nameLine: "Ism va sana uchun qator",
    seed: 'Topshiriq raqami',
    seedHelp: "Bir xil raqam va sozlamalar — har doim aynan bir xil topshiriq. Raqamni yozib qo'ysangiz, keyin javobini ham topasiz.",
    random: 'Tasodifiy raqam',
    advanced: "Qo'shimcha",
    close: 'Yopish',
    done: 'Tayyor',
    busy: 'Yaratilmoqda…',
    pdfBusy: (i, n) => `PDF tayyorlanmoqda… ${i} / ${n}`,
    pdfReady: 'PDF tayyor — yuklab olindi',
    pdfError: "PDF yaratib bo'lmadi. Qaytadan urinib ko'ring.",
    genError: "Topshiriqni yaratib bo'lmadi. «Yangi topshiriq» tugmasini bosib ko'ring.",
    previewAlt: 'A4 varaq ko\'rinishi',
    previewNote: "PDF'da ham aynan shunday chiqadi.",
    footer: (name, seed, info, level) => `${name} raqami: ${seed} (${info}, ${level})`,
    footerShort: (name, seed) => `${name} raqami: ${seed}`,
    fileTask: (base, seed) => `${seed} raqamli ${base}.pdf`,
    fileAnswer: (base, seed) => `${seed} raqamli ${base} javobi.pdf`,
    fileBoth: (base, seed) => `${seed} raqamli ${base} (topshiriq va javob).pdf`,
    packTitle: "To'plam yaratish",
    packLead: "Har turdan nechtadan kerakligini tanlang, ko'rib chiqing va bitta PDF qilib oling.",
    packCount: 'Soni',
    packMixed: 'Aralash',
    packOrder: 'Tartib',
    packOrderGrouped: "Turlar bo'yicha",
    packOrderShuffled: 'Aralash',
    packAnswersPerPage: 'Javoblar: bir varaqda nechta',
    packBuild: "To'plamni yaratish",
    packRebuild: 'Qaytadan yaratish',
    packReview: "Ko'rib chiqish",
    packTotal: (n, pages) => `Jami: ${n} ta topshiriq · ${pages} varaq`,
    packEmpty: "Hali to'plam yo'q. Yuqorida turlarni tanlab, «To'plamni yaratish» tugmasini bosing.",
    packNothing: 'Kamida bitta turni tanlang.',
    packRegen: 'Boshqasi',
    packRemove: 'Olib tashlash',
    packOpen: "Kattaroq ko'rish",
    prev: 'Oldingisi',
    next: 'Keyingisi',
    packFile: n => `To'plam - ${n} ta topshiriq.pdf`,
    packFileAnswer: n => `To'plam - ${n} ta topshiriq - javoblar.pdf`,
    packFileBoth: n => `To'plam - ${n} ta topshiriq (topshiriqlar va javoblar).pdf`,
    packPdfTasks: 'Topshiriqlar',
    packPdfAnswers: 'Javoblar',
    packConfirmRebuild: "Joriy to'plam yangisi bilan almashtiriladi. Davom etasizmi?",
    pageLabel: (i, n) => `${i} / ${n}`,
    notFound: 'Bunday sahifa topilmadi.',
    offline: "Internet yo'q — sayt baribir ishlaydi.",
    updateReady: 'Yangi versiya tayyor. Sahifani yangilang.',
    noscript: "Bu sayt ishlashi uchun brauzerda JavaScript yoqilgan bo'lishi kerak."
  },
  ru: {
    appName: 'Лаборатория заданий',
    tagline: 'Логические задания для детей',
    langLabel: 'Язык',
    homeTitle: 'Генераторы заданий',
    homeLead: 'Логические задания для детей: создайте за секунду и распечатайте в PDF A4.',
    packCardTitle: 'Собрать набор',
    packCardDesc: 'Задания разных видов — один PDF и ответы',
    sectionGenerators: 'Генераторы',
    homeFoot: 'Бесплатно · Работает без интернета · PDF A4 для печати',
    back: 'Назад',
    home: 'Главная',
    level: 'Сложность',
    titleLabel: 'Текст задания (вверху листа)',
    titleReset: 'Исходный текст',
    fontSize: 'Размер текста',
    newPuzzle: 'Новое задание',
    showAnswer: 'Показать ответ',
    hideAnswer: 'Скрыть ответ',
    pdf: 'Скачать PDF',
    pdfTask: 'Задание',
    pdfAnswer: 'Лист с ответом',
    pdfBoth: 'Оба (в одном файле)',
    settings: 'Настройки',
    perPage: 'Сколько заданий на листе',
    nameLine: 'Строка для имени и даты',
    seed: 'Номер задания',
    seedHelp: 'Тот же номер и настройки — всегда то же самое задание. Запишите номер, чтобы потом найти ответ.',
    random: 'Случайный номер',
    advanced: 'Дополнительно',
    close: 'Закрыть',
    done: 'Готово',
    busy: 'Создаётся…',
    pdfBusy: (i, n) => `Готовится PDF… ${i} / ${n}`,
    pdfReady: 'PDF готов — файл скачан',
    pdfError: 'Не удалось создать PDF. Попробуйте ещё раз.',
    genError: 'Не удалось создать задание. Нажмите «Новое задание».',
    previewAlt: 'Вид листа A4',
    previewNote: 'Именно так это будет выглядеть в PDF.',
    footer: (name, seed, info, level) => `${name} № ${seed} (${info}, ${level})`,
    footerShort: (name, seed) => `${name} № ${seed}`,
    fileTask: (base, seed) => `${base} № ${seed}.pdf`,
    fileAnswer: (base, seed) => `${base} № ${seed} - ответ.pdf`,
    fileBoth: (base, seed) => `${base} № ${seed} (задание и ответ).pdf`,
    packTitle: 'Собрать набор',
    packLead: 'Выберите, сколько заданий каждого вида нужно, просмотрите и скачайте одним PDF.',
    packCount: 'Кол-во',
    packMixed: 'Смешанно',
    packOrder: 'Порядок',
    packOrderGrouped: 'По видам',
    packOrderShuffled: 'Вперемешку',
    packAnswersPerPage: 'Ответы: сколько на листе',
    packBuild: 'Собрать набор',
    packRebuild: 'Собрать заново',
    packReview: 'Просмотр',
    packTotal: (n, pages) => `Всего: ${n} заданий · листов: ${pages}`,
    packEmpty: 'Набора пока нет. Выберите виды выше и нажмите «Собрать набор».',
    packNothing: 'Выберите хотя бы один вид.',
    packRegen: 'Другое',
    packRemove: 'Убрать',
    packOpen: 'Открыть крупнее',
    prev: 'Предыдущее',
    next: 'Следующее',
    packFile: n => `Набор - ${n} заданий.pdf`,
    packFileAnswer: n => `Набор - ${n} заданий - ответы.pdf`,
    packFileBoth: n => `Набор - ${n} заданий (задания и ответы).pdf`,
    packPdfTasks: 'Задания',
    packPdfAnswers: 'Ответы',
    packConfirmRebuild: 'Текущий набор будет заменён новым. Продолжить?',
    pageLabel: (i, n) => `${i} / ${n}`,
    notFound: 'Такая страница не найдена.',
    offline: 'Нет интернета — сайт всё равно работает.',
    updateReady: 'Готова новая версия. Обновите страницу.',
    noscript: 'Для работы сайта в браузере должен быть включён JavaScript.'
  },
  en: {
    appName: 'Puzzle Lab',
    tagline: 'Logic puzzles for kids',
    langLabel: 'Language',
    homeTitle: 'Puzzle generators',
    homeLead: 'Logic puzzles for kids: create one in a second and print it as an A4 PDF.',
    packCardTitle: 'Build a pack',
    packCardDesc: 'Mix different puzzles — one PDF plus answers',
    sectionGenerators: 'Generators',
    homeFoot: 'Free · Works offline · Print-ready A4 PDF',
    back: 'Back',
    home: 'Home',
    level: 'Level',
    titleLabel: 'Task text (top of the page)',
    titleReset: 'Reset text',
    fontSize: 'Text size',
    newPuzzle: 'New puzzle',
    showAnswer: 'Show answer',
    hideAnswer: 'Hide answer',
    pdf: 'Download PDF',
    pdfTask: 'Puzzle',
    pdfAnswer: 'Answer sheet',
    pdfBoth: 'Both (one file)',
    settings: 'Settings',
    perPage: 'Puzzles per page',
    nameLine: 'Name and date line',
    seed: 'Puzzle number',
    seedHelp: 'The same number and settings always give the same puzzle. Note the number to find its answer later.',
    random: 'Random number',
    advanced: 'More',
    close: 'Close',
    done: 'Done',
    busy: 'Generating…',
    pdfBusy: (i, n) => `Preparing PDF… ${i} / ${n}`,
    pdfReady: 'PDF ready — downloaded',
    pdfError: 'Could not create the PDF. Please try again.',
    genError: 'Could not create the puzzle. Press “New puzzle” to try again.',
    previewAlt: 'A4 page preview',
    previewNote: 'The PDF will look exactly like this.',
    footer: (name, seed, info, level) => `${name} #${seed} (${info}, ${level})`,
    footerShort: (name, seed) => `${name} #${seed}`,
    fileTask: (base, seed) => `${base} ${seed}.pdf`,
    fileAnswer: (base, seed) => `${base} ${seed} - answer.pdf`,
    fileBoth: (base, seed) => `${base} ${seed} (puzzle and answer).pdf`,
    packTitle: 'Build a pack',
    packLead: 'Choose how many of each kind you need, review them and download one PDF.',
    packCount: 'Count',
    packMixed: 'Mixed',
    packOrder: 'Order',
    packOrderGrouped: 'By type',
    packOrderShuffled: 'Shuffled',
    packAnswersPerPage: 'Answers per page',
    packBuild: 'Build the pack',
    packRebuild: 'Build again',
    packReview: 'Review',
    packTotal: (n, pages) => `Total: ${n} puzzles · ${pages} pages`,
    packEmpty: 'No pack yet. Choose the kinds above and press “Build the pack”.',
    packNothing: 'Choose at least one kind.',
    packRegen: 'Another',
    packRemove: 'Remove',
    packOpen: 'Open larger',
    prev: 'Previous',
    next: 'Next',
    packFile: n => `Pack - ${n} puzzles.pdf`,
    packFileAnswer: n => `Pack - ${n} puzzles - answers.pdf`,
    packFileBoth: n => `Pack - ${n} puzzles (puzzles and answers).pdf`,
    packPdfTasks: 'Puzzles',
    packPdfAnswers: 'Answers',
    packConfirmRebuild: 'The current pack will be replaced. Continue?',
    pageLabel: (i, n) => `${i} / ${n}`,
    notFound: 'Page not found.',
    offline: 'No internet — the site still works.',
    updateReady: 'A new version is ready. Reload the page.',
    noscript: 'JavaScript must be enabled for this site to work.'
  }
};

function detect() {
  const saved = store.get('lang');
  if (DICT[saved]) return saved;
  return 'uz';
}

let lang = detect();

export const getLang = () => lang;

export function setLang(l) {
  if (!DICT[l] || l === lang) return;
  lang = l;
  store.set('lang', l);
  applyDocumentLang();
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('langchange', { detail: l }));
}

export function applyDocumentLang() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang;
}

export function t(key, ...args) {
  const v = DICT[lang][key] ?? DICT.uz[key];
  if (v === undefined) return key;
  return typeof v === 'function' ? v(...args) : v;
}

// Uch tilli obyektdan joriy tildagisini oladi: pick({uz:'Labirint', ru:'Лабиринт', en:'Maze'})
export function pick(obj, l = lang) {
  if (obj == null) return '';
  if (typeof obj !== 'object') return String(obj);
  return obj[l] ?? obj.uz ?? '';
}

export const lvl = (i, l = lang) => levelName(i, l);

// Testlar uchun: barcha tillarda kalitlar to'liqmi
export const _dict = DICT;
