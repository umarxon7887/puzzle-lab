// assistant-kb.js — yordamchining tayyor javoblari (AI'siz, 0 token) va AI uchun qisqa kontekst.
// Brauzerga bog'liq emas: Node testlarida ham ishlaydi.
//
// Tartib: 1) tayyor javob (FAQ) 2) generator nomi 3) ko'nikma bo'yicha tavsiya 4) faqat shundan keyin AI.
// AI javoblarida generatorga havola [[id]] ko'rinishida yoziladi — oyna uni tugmaga aylantiradi.

import { GENERATORS, getGenerator } from '../generators/registry.js';
import { SKILLS } from './skills.js';
import { levelsOf, levelName } from './levels.js';

const P = (o, l) => o?.[l] ?? o?.uz ?? '';

// Matnni solishtirish uchun: kichik harf, apostroflar bitta, tinish belgilari olib tashlanadi
export function norm(s) {
  return String(s || '').toLowerCase()
    .replace(/[‘’ʻʼ`´]/g, "'").replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ').trim();
}

// ---------- Oyna matnlari ----------
export const UI = {
  uz: {
    name: 'Yordamchi', full: 'Katta ekranda ochish', small: 'Kichik oynaga qaytish', tagline: 'Sayt va topshiriqlar bo\'yicha yordam', me: 'Siz', copy: 'Nusxa olish', retry: 'Qayta javob', tagErr: 'xato', tagLocal: 'tayyor javob', sub: 'Sayt va topshiriqlar bo\'yicha savollar', open: 'Yordamchini ochish',
    hello: "Salom! Men Topshiriqlar Lab yordamchisiman. Qaysi topshiriqni tanlash, PDF va savat bilan ishlash yoki topshiriqni qanday yechish haqida so'rang.",
    placeholder: 'Savolingizni yozing…', send: 'Yuborish', thinking: 'O\'ylayapman…',
    openGen: 'Ochish', close: 'Yopish', clear: 'Suhbatni tozalash', settings: 'AI sozlamalari',
    noAi: "Bu savolga tayyor javobim yo'q, AI esa hali ulanmagan. Savolni boshqacha yozib ko'ring yoki tugmalardan birini tanlang.",
    aiErr: "AI hozir javob bera olmadi. Birozdan keyin qayta urinib ko'ring.",
    aiLimit: "Bugungi AI savollari limiti tugadi. Ertaga yana urinib ko'ring — tayyor javoblar esa ishlayveradi.",
    offline: "Internet yo'q. Tayyor javoblar ishlaydi, AI uchun internet kerak.",
    keyLabel: 'Gemini API kaliti (ixtiyoriy)', keyNote: "Kalit faqat shu brauzerda saqlanadi va to'g'ridan-to'g'ri Google'ga yuboriladi. Bo'sh qoldirsangiz, sayt AI'si ishlatiladi (agar ulangan bo'lsa).",
    keySave: 'Saqlash', keySaved: 'Saqlandi', fromCache: 'avval berilgan javob',
    skillsLead: "Qaysi ko'nikmani rivojlantirmoqchisiz?", skillGens: s => `«${s}» uchun topshiriqlar:`,
    levels: 'Darajalar', olderLead: '«Katta bolalar» (4–7-sinf) darajasi bor topshiriqlar:',
    genLead: (name) => `«${name}» — `
  },
  ru: {
    name: 'Помощник', full: 'Открыть на весь экран', small: 'Свернуть в окно', tagline: 'Помощь по сайту и заданиям', me: 'Вы', copy: 'Копировать', retry: 'Ответить заново', tagErr: 'ошибка', tagLocal: 'готовый ответ', sub: 'Вопросы о сайте и заданиях', open: 'Открыть помощника',
    hello: 'Здравствуйте! Я помощник Topshiriqlar Lab. Спросите, какое задание выбрать, как работать с PDF и корзиной или как решать задание.',
    placeholder: 'Напишите вопрос…', send: 'Отправить', thinking: 'Думаю…',
    openGen: 'Открыть', close: 'Закрыть', clear: 'Очистить чат', settings: 'Настройки ИИ',
    noAi: 'Готового ответа нет, а ИИ пока не подключён. Попробуйте сформулировать иначе или выберите кнопку.',
    aiErr: 'ИИ сейчас не ответил. Попробуйте чуть позже.',
    aiLimit: 'Лимит вопросов к ИИ на сегодня исчерпан. Готовые ответы продолжают работать.',
    offline: 'Нет интернета. Готовые ответы работают, для ИИ нужен интернет.',
    keyLabel: 'Ключ Gemini API (необязательно)', keyNote: 'Ключ хранится только в этом браузере и отправляется напрямую в Google. Если оставить пустым, используется ИИ сайта (если подключён).',
    keySave: 'Сохранить', keySaved: 'Сохранено', fromCache: 'ответ из памяти',
    skillsLead: 'Какой навык хотите развивать?', skillGens: s => `Задания для навыка «${s}»:`,
    levels: 'Уровни', olderLead: 'Задания с уровнем «Для старших» (4–7 класс):',
    genLead: (name) => `«${name}» — `
  },
  en: {
    name: 'Helper', full: 'Open full screen', small: 'Back to small window', tagline: 'Help with the site and puzzles', me: 'You', copy: 'Copy', retry: 'Answer again', tagErr: 'error', tagLocal: 'ready answer', sub: 'Questions about the site and puzzles', open: 'Open helper',
    hello: 'Hi! I am the Topshiriqlar Lab helper. Ask which puzzle to pick, how PDFs and the basket work, or how to solve a puzzle.',
    placeholder: 'Type your question…', send: 'Send', thinking: 'Thinking…',
    openGen: 'Open', close: 'Close', clear: 'Clear chat', settings: 'AI settings',
    noAi: "I don't have a ready answer and AI isn't connected yet. Try rephrasing or pick a button.",
    aiErr: "AI couldn't answer right now. Please try again a bit later.",
    aiLimit: "Today's AI question limit is reached. Ready answers still work.",
    offline: 'No internet. Ready answers work; AI needs internet.',
    keyLabel: 'Gemini API key (optional)', keyNote: "The key stays in this browser only and is sent straight to Google. Leave empty to use the site's AI (if connected).",
    keySave: 'Save', keySaved: 'Saved', fromCache: 'saved answer',
    skillsLead: 'Which skill do you want to train?', skillGens: s => `Puzzles for “${s}”:`,
    levels: 'Levels', olderLead: 'Puzzles with the “Older kids” level (grades 4–7):',
    genLead: (name) => `“${name}” — `
  }
};
export const ui = (lang, key, ...a) => { const v = P(UI, lang)?.[key] ?? UI.uz[key]; return typeof v === 'function' ? v(...a) : v; };

// ---------- Tayyor javoblar ----------
// k — kalit so'zlar (o'zak, kichik harf). Savolda nechta kalit bo'lsa, shuncha ball.
const FAQ = [
  { id: 'pdf', chip: { uz: 'PDF qanday olinadi?', ru: 'Как скачать PDF?', en: 'How do I get a PDF?' },
    k: ['pdf', 'yuklab', 'yukla', 'chop', 'print', 'печат', 'скача', 'download', 'распечат'],
    a: { uz: "Pastki paneldagi hujjat belgisini (⬇) bosing va tanlang: «Topshiriq», «Javob varag'i» yoki «Ikkalasi (bitta faylda)». Fayl A4 o'lchamida, to'g'ridan-to'g'ri chop etsa bo'ladi.",
      ru: 'Нажмите значок документа (⬇) на нижней панели и выберите: «Задание», «Лист ответов» или «Оба (в одном файле)». Файл формата A4, можно сразу печатать.',
      en: 'Tap the document icon (⬇) on the bottom bar and pick “Puzzle”, “Answer sheet” or “Both (one file)”. The file is A4 and ready to print.' } },
  { id: 'answer', chip: { uz: "Javobni qanday ko'raman?", ru: 'Как увидеть ответ?', en: 'How do I see the answer?' },
    k: ['javob', 'yechim', 'ответ', 'решени', 'answer', 'solution', "ko'z"],
    a: { uz: "Pastki paneldagi ko'z belgisini bosing — varaqda javob qizil rangda chiqadi. Qayta bossangiz, yashiriladi. Javob varag'ini PDF qilib ham olsa bo'ladi (⬇ → «Javob varag'i»).",
      ru: 'Нажмите значок глаза на нижней панели — ответ появится на листе красным. Повторное нажатие скрывает его. Лист ответов можно скачать и в PDF (⬇ → «Лист ответов»).',
      en: 'Tap the eye icon on the bottom bar — the answer appears in red on the sheet. Tap again to hide it. You can also download the answer sheet as PDF (⬇ → “Answer sheet”).' } },
  { id: 'seed', k: ['raqam', 'seed', 'номер', 'number', 'shu topshiriq', 'takror', 'qayta', 'тот же', 'same'],
    a: { uz: "Har topshiriqning raqami bor (varaq pastida yoziladi). Bir xil raqam va sozlamalar — har doim aynan bir xil topshiriq. Raqamni yozib qo'ysangiz, keyin ⚙ Sozlamalar → «Topshiriq raqami» ga kiritib, o'sha topshiriqni va javobini qayta topasiz.",
      ru: 'У каждого задания есть номер (внизу листа). Тот же номер и настройки — всегда то же задание. Запишите номер, потом введите его в ⚙ Настройки → «Номер задания», и задание с ответом вернётся.',
      en: 'Every puzzle has a number (printed at the bottom). Same number + same settings = the exact same puzzle. Note it down and enter it later in ⚙ Settings → “Puzzle number” to get the puzzle and its answer back.' } },
  { id: 'perpage', k: ['nechta', 'bir varaq', '2 ta', '4 ta', 'несколько', 'на листе', 'per page', 'several'],
    a: { uz: "⚙ Sozlamalar → «Bir varaqda nechta topshiriq»: 1, 2 yoki 4. Joy kichrayganda topshiriq o'zi moslashadi. U yerda ism va sana qatorini ham yoqsa bo'ladi.",
      ru: '⚙ Настройки → «Сколько заданий на листе»: 1, 2 или 4. Задание само подстраивается под место. Там же можно включить строку для имени и даты.',
      en: '⚙ Settings → “Puzzles per page”: 1, 2 or 4. Puzzles adapt to the smaller space. You can also turn on a name and date line there.' } },
  { id: 'cart', chip: { uz: 'Savat nima?', ru: 'Что такое корзина?', en: 'What is the basket?' },
    k: ['savat', 'корзин', 'basket', 'cart', 'variant', 'вариант', 'shablon', 'шаблон', 'template'],
    a: { uz: "Savat — turli topshiriqlardan bitta ish varag'i yig'ish uchun. Generator sahifasida 🛒+ tugmasini bosing, topshiriq savatga tushadi. Savatda (yuqoridagi 🛒) varaqdagi soni, variantlar soni (har o'quvchiga boshqacha masalalar) va javoblar bilan bitta PDF olasiz. Yoqqan to'plamni «Shablon» qilib saqlasangiz, keyin bir bosishda yangi raqamlar bilan qaytadan yig'iladi.",
      ru: 'Корзина собирает разные задания в один лист. На странице генератора нажмите 🛒+, задание попадёт в корзину. В корзине (🛒 вверху) выберите количество на листе, число вариантов (у каждого ученика свои задачи) и скачайте один PDF с ответами. Удачный набор сохраните как «Шаблон» — потом он соберётся заново с новыми номерами.',
      en: 'The basket collects different puzzles into one worksheet. On a puzzle page tap 🛒+ to add it. In the basket (🛒 at the top) choose puzzles per page, number of variants (each student gets different tasks) and download one PDF with answers. Save a good set as a “Template” to rebuild it later with new numbers.' } },
  { id: 'pack', k: ["to'plam", 'toplam', 'набор', 'pack', 'aralash', 'смеш', 'mixed'],
    a: { uz: "«To'plam yaratish» (bosh sahifadagi birinchi karta) — bir nechta turdagi topshiriqlardan tezda aralash to'plam: turlarini va darajasini tanlaysiz, bitta PDF va javoblar chiqadi. Har bir topshiriqni aniq tanlab yig'moqchi bo'lsangiz, Savat qulayroq.",
      ru: '«Создать набор» (первая карточка на главной) — быстрый смешанный набор из разных типов: выбираете типы и уровень, получаете один PDF с ответами. Если нужно подобрать каждое задание вручную, удобнее Корзина.',
      en: '“Make a pack” (first card on the home page) quickly mixes several puzzle types: pick types and level, get one PDF with answers. To hand-pick each puzzle, the Basket is better.' } },
  { id: 'favs', k: ['saqla', 'yulduz', 'избран', 'звезд', 'favorite', 'favourite', 'star'],
    a: { uz: "Generator kartasidagi ★ ni bossangiz, u bosh sahifaning tepasida «Saqlanganlar» bo'limida turadi. Ular shu brauzerda saqlanadi: boshqa telefon yoki kompyuterda alohida belgilanadi.",
      ru: 'Нажмите ★ на карточке генератора — он появится вверху главной в разделе «Избранное». Хранится в этом браузере: на другом устройстве нужно отметить заново.',
      en: 'Tap ★ on a puzzle card and it appears at the top of the home page under “Saved”. It is stored in this browser only, so other devices need their own stars.' } },
  { id: 'levels', chip: { uz: 'Darajalar farqi', ru: 'Чем отличаются уровни?', en: 'How do levels differ?' },
    k: ['daraja', 'oson', 'qiyin', 'уровн', 'легк', 'сложн', 'level', 'easy', 'hard', 'yosh', 'возраст', 'age', 'sinf', 'класс', 'grade'],
    a: { uz: "Ko'p topshiriqlarda 4 daraja bor: Oson, O'rta, Qiyin, Juda qiyin. Ba'zilarida qo'shimcha «Juda oson» (kichkintoylar uchun) va «Katta bolalar» (4–7-sinf) darajalari ham bor. Har daraja ostida nima o'zgarishi qisqa yozilgan.",
      ru: 'В большинстве заданий 4 уровня: Легко, Средне, Сложно, Очень сложно. В некоторых есть ещё «Очень легко» (для малышей) и «Для старших» (4–7 класс). Под каждым уровнем коротко написано, что меняется.',
      en: 'Most puzzles have 4 levels: Easy, Medium, Hard, Expert. Some also have “Very easy” (little ones) and “Older kids” (grades 4–7). A short note under each level says what changes.' } },
  { id: 'title', k: ['sarlavha', 'matn', 'shrift', 'заголов', 'текст', 'шрифт', 'title', 'font', 'heading'],
    a: { uz: "Varaq tepasidagi topshiriq matnini sozlamalar panelidagi «Topshiriq matni» maydonida o'zgartirsa bo'ladi, o'lchamini esa «Matn o'lchami» bilan. «Asl matn» — standartga qaytaradi.",
      ru: 'Текст задания вверху листа меняется в поле «Текст задания», размер — ползунком «Размер текста». «Исходный текст» возвращает стандартный.',
      en: 'Change the instruction at the top of the sheet in the “Puzzle text” field and its size with “Text size”. “Original text” restores the default.' } },
  { id: 'new', k: ['yangi', 'boshqa topshiriq', 'новое', 'другое', 'new puzzle', 'another'],
    a: { uz: "«Yangi topshiriq» tugmasi (pastki panelda) shu sozlamalar bilan boshqa topshiriq yaratadi. Har biri tekshirilgan: javobi bitta va to'g'ri.",
      ru: 'Кнопка «Новое задание» (внизу) создаёт другое задание с теми же настройками. Каждое проверено: ответ один и верный.',
      en: '“New puzzle” (bottom bar) makes another puzzle with the same settings. Each one is checked to have a single correct answer.' } },
  { id: 'offline', k: ['internet', 'oflayn', 'offline', 'интернет', "o'rnat", 'установ', 'install', 'bosh ekran', 'home screen'],
    a: { uz: "Sayt bir marta ochilgandan keyin internetsiz ham ishlaydi. Telefonga ilova qilib qo'yish: brauzer menyusidan «Bosh ekranga qo'shish» (Add to Home screen).",
      ru: 'После первого открытия сайт работает и без интернета. Чтобы поставить как приложение: меню браузера → «Добавить на главный экран».',
      en: 'After the first visit the site works offline. To install it as an app: browser menu → “Add to Home screen”.' } },
  { id: 'lang', k: ['til', 'язык', 'language', 'rus', 'ingliz', 'kirill', 'русск', 'english'],
    a: { uz: "Tilni yuqori o'ng burchakdagi UZ / RU / EN tugmalari bilan almashtiring. So'z o'yinlari (so'z qidiruv, anagramma va boshqalar) ham tanlangan tilda tuziladi.",
      ru: 'Язык меняется кнопками UZ / RU / EN в правом верхнем углу. Словесные игры (поиск слов, анаграммы и др.) тоже строятся на выбранном языке.',
      en: 'Switch language with the UZ / RU / EN buttons at the top right. Word games (word search, anagrams, etc.) are built in the chosen language too.' } },
  { id: 'about', k: ['bepul', 'pul', 'narx', 'бесплат', 'цена', 'free', 'price', 'nima bu', 'что это', 'what is this', 'sayt haqida'],
    a: { uz: "Topshiriqlar Lab — bolalar uchun 58 xil mantiqiy topshiriq generatori. Bepul, ro'yxatdan o'tish shart emas. Har topshiriq bir zumda yaratiladi va javobi bilan A4 PDF qilib chop etiladi.",
      ru: 'Topshiriqlar Lab — генератор 58 видов логических заданий для детей. Бесплатно, без регистрации. Задание создаётся мгновенно и печатается в A4 PDF вместе с ответом.',
      en: 'Topshiriqlar Lab makes 58 kinds of logic puzzles for kids. Free, no sign-up. Each puzzle is generated instantly and prints as an A4 PDF with its answer.' } }
];

// Ko'nikmalar bo'yicha qidirish (savolda shu so'z bo'lsa — tegishli generatorlar ro'yxati)
const SKILL_K = {
  attention: ['diqqat', 'внимани', 'attention', 'focus'],
  memory: ['xotira', 'памят', 'memory'],
  speed: ['tezlik', 'tez ish', 'скорост', 'speed'],
  visual: ["ko'rib", 'farqla', 'зритель', 'visual'],
  spatial: ['fazo', 'простран', 'spatial', 'geometr'],
  logic: ['mantiq', 'logika', 'логик', 'logic'],
  patterns: ['qonuniyat', 'закономер', 'pattern'],
  counting: ['matemat', 'hisob', 'sanash', 'son ', 'математ', 'счет', 'счёт', 'math', 'count', 'arithmet'],
  language: ["so'z", 'harf', 'alifbo', 'слов', 'букв', 'алфавит', 'word', 'letter', 'alphabet', 'reading', "o'qish"],
  motor: ['chizish', 'motor', 'qalam', 'рисова', 'моторик', 'drawing', 'draw']
};
const RECOMMEND_K = ['qaysi', 'tavsiya', 'tanlay', 'kerak', 'uchun', 'какое', 'какие', 'посовет', 'для ', 'which', 'recommend', 'suggest', 'for '];
const OLDER_K = ['katta bola', '4-sinf', '5-sinf', '6-sinf', '7-sinf', '4 7', 'старш', '4 класс', '5 класс', '6 класс', '7 класс', 'older', 'grade 4', 'grade 5', 'grade 6', 'grade 7'];
const DEEP_K = ['batafsil', 'haqida', 'tushunmad', 'nega', 'nima uchun', 'farqi nima', 'misol', 'подробн', 'не понял', 'почему', 'пример', 'detail', 'explain', "don't understand", 'why', 'example', 'more about'];
const HELLO_K = [' salom ', ' assalomu', ' привет ', ' здравств', ' hello ', ' hi ', ' hey '];
const SOLVE_K = ['qanday yechi', 'yechish', 'qanday ishla', 'qoida', 'tushuntir', 'как решать', 'как реша', 'правил', 'объясн', 'how to solve', 'how do i solve', 'rules', 'explain', 'strategy', 'yordam ber', 'помог', 'help me'];

// Kalit so'z ham savol kabi normallashtiriladi (chetidagi bo'shliq saqlanadi: 'son ' — «sonlar» emas, «son»)
const nk = w => (w.startsWith(' ') ? ' ' : '') + norm(w) + (w.endsWith(' ') ? ' ' : '');
const has = (q, list) => { const s = ' ' + q + ' '; return list.reduce((n, w) => { const k = nk(w); return n + (k.trim() && s.includes(k) ? 1 : 0); }, 0); };

// Generator nomlari (uch tilda), uzunlari birinchi — «Killer sudoku» «Sudoku» dan oldin topilsin
const NAMES = GENERATORS.flatMap(g => ['uz', 'ru', 'en'].map(l => [norm(g.name[l]), g.id]))
  .filter(([n]) => n.length >= 4).sort((a, b) => b[0].length - a[0].length);
export function findGenerator(q) {
  const s = ' ' + norm(q) + ' ';
  for (const [n, id] of NAMES) if (s.includes(' ' + n + ' ') || (n.length >= 6 && s.includes(n))) return getGenerator(id);
  return null;
}

export const levelLines = (gen, lang) => {
  const ls = levelsOf(gen), hints = P(gen.levelHint, lang) || [];
  return ls.map((l, i) => `• ${levelName(l, lang)}: ${hints[i] ?? ''}`).join('\n');
};
const gensBy = pred => GENERATORS.filter(pred).map(g => g.id);

// Tayyor javob. Natija: { text, gens?: [id], chips?: [{label, q}] } yoki null (→ AI).
// ctx: { route, genId } — qaysi sahifa ochiq.
export function localAnswer(question, lang, ctx = {}) {
  const q = norm(question);
  if (!q) return null;
  const T = (k, ...a) => ui(lang, k, ...a);
  // «Qanday yechiladi?», uzun yoki «batafsil/tushunmadim» kabi savollar — AI (to'liq bilim bilan)
  if (has(q, SOLVE_K) || has(q, DEEP_K) || q.split(' ').length > 8) return null;
  // Salomlashish — AI'siz
  if (has(q, HELLO_K) && q.split(' ').length <= 3) return { text: ui(lang, 'hello'), chips: chipsFor(ctx, lang) };

  let f = null, fN = 0;
  for (const it of FAQ) { const n = has(q, it.k); if (n > fN) { f = it; fN = n; } }
  const named = findGenerator(q);
  const here = ctx.genId && has(q, [' bu ', ' shu ', ' этот ', ' это ', ' this ']) ? getGenerator(ctx.genId) : null;
  const gen = named || (!f || f.id === 'levels' ? here : null);

  // Generator haqida: nomi + tavsifi + darajalar + «Ochish»
  if (gen && (!f || f.id === 'levels')) {
    return { text: T('genLead', P(gen.name, lang)) + P(gen.desc, lang) + '.\n\n' + T('levels') + ':\n' + levelLines(gen, lang), gens: [gen.id] };
  }

  // Katta bolalar (4–7-sinf)
  if (has(q, OLDER_K)) {
    return { text: T('olderLead'), gens: gensBy(g => levelsOf(g).includes(4)) };
  }

  // Ko'nikma bo'yicha tavsiya
  let best = null, bestN = 0;
  for (const [s, ks] of Object.entries(SKILL_K)) { const n = has(q, ks); if (n > bestN) { best = s; bestN = n; } }
  if (best && (has(q, RECOMMEND_K) || q.split(' ').length <= 3)) {
    return { text: T('skillGens', P(SKILLS[best], lang)), gens: gensBy(g => g.skills?.[0] === best).concat(gensBy(g => g.skills?.[0] !== best && g.skills?.includes(best))).slice(0, 12) };
  }

  // FAQ
  if (f) {
    // «Darajalar» generator sahifasida — aynan shu generatorning darajalari
    if (f.id === 'levels' && ctx.genId) {
      const g = getGenerator(ctx.genId);
      if (g) return { text: T('levels') + ` — ${P(g.name, lang)}:\n` + levelLines(g, lang) };
    }
    return { text: P(f.a, lang) };
  }

  // Umumiy tavsiya so'rovi: ko'nikmalar tugmalari
  if (has(q, RECOMMEND_K) && has(q, ['topshiriq', 'mashq', 'задан', 'упражн', 'puzzle', 'task', 'activity'])) return skillsMenu(lang);
  return null;
}

export function skillsMenu(lang) {
  return { text: ui(lang, 'skillsLead'), chips: Object.keys(SKILLS).map(s => ({ label: P(SKILLS[s], lang), q: P(SKILLS[s], lang) })) };
}

// Sahifaga mos tayyor tugmalar
export function chipsFor(ctx, lang) {
  const c = id => FAQ.find(f => f.id === id).chip[lang] || FAQ.find(f => f.id === id).chip.uz;
  const solve = { uz: 'Bu topshiriq qanday yechiladi?', ru: 'Как решать это задание?', en: 'How do I solve this puzzle?' };
  const choose = { uz: 'Qaysi topshiriqni tanlay?', ru: 'Какое задание выбрать?', en: 'Which puzzle should I pick?' };
  if (ctx.genId) return [P(solve, lang), c('levels'), c('answer'), c('pdf')].map(q => ({ label: q, q }));
  if (ctx.route === 'cart') return [c('cart'), c('pdf')].map(q => ({ label: q, q }));
  return [{ label: P(choose, lang), q: P(choose, lang), menu: 'skills' }, c('pdf'), c('cart'), c('levels')].map(x => typeof x === 'string' ? { label: x, q: x } : x);
}

// ---------- AI uchun loyiha bilimi ----------
// Tizim ko'rsatmasi har til uchun O'ZGARMAS (sahifa ma'lumoti savol bilan birga boradi) — shunda Gemini
// takrorlanayotgan boshini keshlaydi (implicit caching) va har savol arzonroq tushadi.
// Generatorlar ro'yxati registry'dan olinadi: yangi generator qo'shilsa, AI ham avtomatik biladi.
const LANG_NAME = { uz: 'Uzbek (Latin script)', ru: 'Russian', en: 'English' };
const GUIDE = `ABOUT THE SITE
"Topshiriqlar Lab" (umarxon7887.github.io/puzzle-lab) is a free website that generates printable logic puzzles and worksheets for children (about 4 to 13 years old, up to grade 7). No sign-up, no ads. Made by an Uzbek teacher; used mostly by teachers, tutors and parents who print tasks for lessons and homework. Languages: Uzbek, Russian, English (UZ/RU/EN switch at top right; word games are built in the chosen language). Works offline after the first visit and can be installed on a phone (browser menu > Add to Home screen).

HOW IT WORKS
- Home page: "To'plam yaratish" (Make a pack) card, "Saqlanganlar" (Saved, ★) section, then all puzzle generators as cards. Tap a card to open it.
- Puzzle page: left = settings (Level buttons with a short note under them, other options of this generator, "Topshiriq matni" = the instruction printed on top of the sheet, "Matn o'lchami" = its font size). Right = live A4 preview, exactly as it will print.
- Bottom bar: "Yangi topshiriq" (New puzzle: same settings, new puzzle), eye button (shows/hides the answer in red), document button (PDF: "Topshiriq" puzzle sheet, "Javob varag'i" answer sheet, or "Ikkalasi" both in one file), basket+ (add this sheet to the Basket), gear (Settings: puzzles per page 1/2/4, name and date line, puzzle number).
- Puzzle number (seed): printed at the bottom of each sheet. Same number + same settings = exactly the same puzzle, so a teacher can note the number and regenerate the answer later.
- Levels: most generators have Easy / Medium / Hard / Expert; some also have "Juda oson" (Very easy, little kids) and "Katta bolalar" (Older kids, grades 4-7).
- Every puzzle is checked by the program: exactly one correct answer.
- Basket (🛒 at the top): collect different puzzles into one worksheet; choose puzzles per page, how many variants (each student gets different numbers so they cannot copy), name line, then download one PDF with answers. A set can be saved as a Template and rebuilt later with fresh puzzles.
- Pack ("To'plam yaratish"): quick mixed set from several types at one level, one PDF + answers.
- Saved (★): star a card to keep it at the top of the home page (stored in this browser only).
- Data stays in the browser (no account).

TEACHER TIPS
- For a class: use Basket with variants = number of students, 2 puzzles per page, name line on.
- Start one level lower than the child's age suggests; move up when the child solves 2-3 sheets without help.
- Mix skills during a week (attention, logic, counting, spatial, words) rather than one type.
- Print the answer sheet separately for checking.

YOUR JOB
You are "Yordamchi", the friendly helper inside this site. Help users find the right puzzle, use the site, and understand how to solve a puzzle type (explain the rule, a step-by-step method and a hint; do not invent the answer of the user's specific sheet: the eye button shows it).
Rules:
- Use the knowledge above and the catalog below. Never invent features, buttons or puzzles that are not listed. If something is not supported, say so and suggest the closest option.
- When you mention a puzzle type, write its id in double brackets like [[kenken]] (the site turns it into a button). Recommend at most 5.
- If the user's message is unclear or just says they did not understand (e.g. "tushunmadim"), look at the previous messages, explain the last answer more simply with an example, or ask one short clarifying question.
- Formatting: short paragraphs, "- " bullets, **bold** for button names. No headings, no tables. Keep it under about 150 words unless the user asks for details.
- Messages may start with [Page: ...] describing what the user has open; use it as context.`;

const catCache = {};
export function systemPrompt(lang) {
  if (catCache[lang]) return catCache[lang];
  const skillName = k => P(SKILLS[k], 'en') || k;
  const lines = GENERATORS.map(g => {
    const hints = P(g.levelHint, lang) || [];
    const ls = levelsOf(g);
    // darajalar izohi bo'lmasa, faqat qo'shimcha darajalar aytiladi (4 ta odatiy daraja hammada bor)
    const lv = hints.length ? ls.map((l, i) => `${levelName(l, lang)}: ${hints[i] ?? ''}`).join('; ')
      : [ls.includes(-1) && levelName(-1, lang), ls.includes(4) && levelName(4, lang)].filter(Boolean).join(', ');
    return `[[${g.id}]] ${P(g.name, lang)} — ${P(g.desc, lang)}. Skills: ${(g.skills || []).map(skillName).join(', ')}.` + (lv ? ` Levels: ${lv}` : '');
  });
  catCache[lang] = `${GUIDE}\n- Always reply in ${LANG_NAME[lang] || LANG_NAME.uz}.\n\nCATALOG (${GENERATORS.length} puzzle generators; id, name, description, skills, levels)\n${lines.join('\n')}`;
  return catCache[lang];
}

// Savol oldiga qo'shiladigan qisqa sahifa ma'lumoti
export function pageNote(lang, ctx = {}) {
  const gen = ctx.genId ? getGenerator(ctx.genId) : null;
  if (gen) {
    const lv = levelsOf(gen).includes(ctx.level) ? `, level ${levelName(ctx.level, lang)}` : '';
    return `[Page: puzzle [[${gen.id}]] ${P(gen.name, lang)}${lv}${ctx.info ? ', current sheet: ' + ctx.info : ''}]`;
  }
  return `[Page: ${ctx.route === 'cart' ? 'Basket' : ctx.route === 'pack' ? 'Make a pack' : 'Home page'}]`;
}
