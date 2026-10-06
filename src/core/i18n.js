export const translations = {
  uz: {
    title: "Topshiriqlar Lab",
    homeTitle: "Topshiriq Generatorlari",
    homeSubtitle: "O'qituvchilar uchun interaktiv va PDF topshiriqlar",
    backBtn: "← Orqaga",
    tabCode: "Kodni top",
    tabMaze: "Labirint",
    tabSudoku: "Sudoku",
    codeDesc: "3 raqamli maxfiy kodni mantiqiy ipuclar yordamida toping",
    mazeDesc: "Qahramonga uyiga yo'l topishga yordam beradigan labirint yarating",
    sudokuDesc: "Klassik va jigsaw sudoku topshiriqlari",
    mazeTitleLabel: "Topshiriq matni",
    fsLabel: "Matn o'lchami:",
    width: "Eni", height: "Bo'yi", seed: "Raqami",
    difficulty: "Qiyinlik", shape: "Shakl", hero: "Qahramon", goal: "Manzil",
    showSolution: "Ekranda to'g'ri yo'lni ko'rsatish",
    newMaze: "Yangi labirint", downloadPdf: "PDF yuklab olish", downloadAns: "Javobni yuklab olish",
    mazeDefTitle: "Qahramonga uyiga yo'l topishga yordam ber!",
    gameTitle: "Maxfiy kodni toping!", gameDesc: "3 ta raqamli maxfiy kodni toping.",
    yourGuess: "Sizning taxminingiz", checkBtn: "Tekshirish", newGameBtn: "Yangi kod",
    revealBtn: "Kodni ko'rsatish", attempts: "Urinishlar", enterAll: "Barcha raqamlarni kiriting!",
    win: "🎉 Tabriklaymiz! Kodni topdingiz!", gameOver: "O'yin tugadi. To'g'ri kod: ",
    clueCorrect: "✅ To'g'ri raqam, to'g'ri joyda", clueWrongPlace: "⚠️ To'g'ri raqam, noto'g'ri joyda", clueWrong: "❌ Noto'g'ri raqam"
  },
  ru: {
    title: "Лаборатория головоломок",
    homeTitle: "Генераторы заданий",
    homeSubtitle: "Интерактивные и PDF задания для учителей",
    backBtn: "← Назад",
    tabCode: "Угадай код",
    tabMaze: "Лабиринт",
    tabSudoku: "Судоку",
    codeDesc: "Найдите секретный 3-значный код с помощью логических подсказок",
    mazeDesc: "Создайте лабиринт, чтобы помочь герою найти дорогу домой",
    sudokuDesc: "Классические и фигурные судоку",
    mazeTitleLabel: "Текст задания",
    fsLabel: "Размер текста:",
    width: "Ширина", height: "Высота", seed: "Номер",
    difficulty: "Сложность", shape: "Форма", hero: "Герой", goal: "Цель",
    showSolution: "Показать правильный путь",
    newMaze: "Новый лабиринт", downloadPdf: "Скачать PDF", downloadAns: "Скачать ответ",
    mazeDefTitle: "Помоги герою найти дорогу домой!",
    gameTitle: "Угадайте секретный код!", gameDesc: "Найдите секретный код из 3 цифр.",
    yourGuess: "Ваша догадка", checkBtn: "Проверить", newGameBtn: "Новый код",
    revealBtn: "Показать код", attempts: "Попытки", enterAll: "Введите все цифры!",
    win: "🎉 Поздравляем! Вы угадали код!", gameOver: "Игра окончена. Правильный код: ",
    clueCorrect: "✅ Правильная цифра, на своём месте", clueWrongPlace: "⚠️ Правильная цифра, но не на своём месте", clueWrong: "❌ Неправильная цифра"
  },
  en: {
    title: "Puzzle Lab",
    homeTitle: "Puzzle Generators",
    homeSubtitle: "Interactive and PDF puzzles for teachers",
    backBtn: "← Back",
    tabCode: "Code Breaker",
    tabMaze: "Maze",
    tabSudoku: "Sudoku",
    codeDesc: "Find the secret 3-digit code using logical clues",
    mazeDesc: "Create a maze to help the hero find the way home",
    sudokuDesc: "Classic and jigsaw sudoku puzzles",
    mazeTitleLabel: "Task Text",
    fsLabel: "Font Size:",
    width: "Width", height: "Height", seed: "Seed",
    difficulty: "Difficulty", shape: "Shape", hero: "Hero", goal: "Goal",
    showSolution: "Show solution on screen",
    newMaze: "New Maze", downloadPdf: "Download PDF", downloadAns: "Download Answer",
    mazeDefTitle: "Help the hero find the way home!",
    gameTitle: "Crack the Secret Code!", gameDesc: "Find the secret 3-digit code.",
    yourGuess: "Your Guess", checkBtn: "Check", newGameBtn: "New Code",
    revealBtn: "Reveal Code", attempts: "Attempts", enterAll: "Enter all digits!",
    win: "🎉 Congratulations! You cracked the code!", gameOver: "Game over. The correct code was: ",
    clueCorrect: "✅ Correct number, correct place", clueWrongPlace: "⚠️ Correct number, wrong place", clueWrong: "❌ Incorrect number"
  }
};

let currentLang = localStorage.getItem('puzzle_lang') || 'uz';
export function t(key) { return translations[currentLang][key] || key; }
export function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('puzzle_lang', lang);
  document.documentElement.lang = lang;
  window.location.reload(); 
}
export function getLang() { return currentLang; }
