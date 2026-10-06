export const translations = {
  uz: {
    title: "Topshiriqlar Lab",
    homeTitle: "Topshiriq Generatorlari",
    homeSubtitle: "O'qituvchilar uchun interaktiv va PDF topshiriqlar",
    backBtn: "← Orqaga",
    tabCode: "Kodni top",
    tabMaze: "Labirint",
    tabSudoku: "Sudoku",
    codeDesc: "Ipuclardan foydalanib, mantiqiy kodni toping",
    mazeDesc: "Qahramonga uyiga yo'l topishga yordam beradigan labirint yarating",
    sudokuDesc: "Klassik va jigsaw sudoku topshiriqlari",
    
    // Code Breaker UI
    codeGameTitle: "🔐 KODNI TOPING!",
    codeGameDesc: "Quyidagi ipuclardan foydalanib, maxfiy kodni toping.",
    codeLengthLabel: "Kod uzunligi",
    digits: "xonali",
    cluesTitle: "Ipuclar:",
    yourAnswer: "JAVOB:",
    checkAnswer: "Tekshirish",
    newGameBtn: "🔄 Yangi kod",
    revealAnswer: "Javobni ko'rsatish",
    enterAllDigits: "Barcha raqamlarni kiriting!",
    correctAnswer: "🎉 To'g'ri! Kodni topdingiz!",
    wrongAnswer: "❌ Noto'g'ri. Qaytadan urinib ko'ring.",
    
    // New UX Elements
    settingsBtn: "⚙️ Sozlamalar",
    pdfBtn: "📄 PDF yuklash",
    pdfTask: "Topshiriq PDF",
    pdfAnswer: "Javob varag'i PDF",
    settingsTitle: "O'yin sozlamalari",
    save: "Saqlash",
    cancel: "Bekor qilish",
    includeAnswer: "Javobni PDF'ga qo'shish",
    
    // Maze
    mazeTitleLabel: "Topshiriq matni",
    fsLabel: "Matn o'lchami:",
    width: "Eni", height: "Bo'yi", seed: "Raqami",
    difficulty: "Qiyinlik", shape: "Shakl", hero: "Qahramon", goal: "Manzil",
    showSolution: "Ekranda to'g'ri yo'lni ko'rsatish",
    newMaze: "Yangi labirint", downloadMazePdf: "PDF yuklab olish", downloadMazeAns: "Javobni yuklab olish",
    mazeDefTitle: "Qahramonga uyiga yo'l topishga yordam ber!"
  },
  ru: {
    title: "Лаборатория головоломок",
    homeTitle: "Генераторы заданий",
    homeSubtitle: "Интерактивные и PDF задания для учителей",
    backBtn: "← Назад",
    tabCode: "Угадай код",
    tabMaze: "Лабиринт",
    tabSudoku: "Судоку",
    codeDesc: "Найдите код с помощью логических подсказок",
    mazeDesc: "Создайте лабиринт, чтобы помочь герою найти дорогу домой",
    sudokuDesc: "Классические и фигурные судоку",
    
    codeGameTitle: "🔐 УГАДАЙТЕ КОД!",
    codeGameDesc: "Используйте подсказки ниже, чтобы найти секретный код.",
    codeLengthLabel: "Длина кода",
    digits: "значный",
    cluesTitle: "Подсказки:",
    yourAnswer: "ОТВЕТ:",
    checkAnswer: "Проверить",
    newGameBtn: "🔄 Новый код",
    revealAnswer: "Показать ответ",
    enterAllDigits: "Введите все цифры!",
    correctAnswer: "🎉 Правильно! Вы угадали код!",
    wrongAnswer: "❌ Неправильно. Попробуйте ещё раз.",
    
    settingsBtn: "⚙️ Настройки",
    pdfBtn: "📄 Скачать PDF",
    pdfTask: "Задание PDF",
    pdfAnswer: "Ответ PDF",
    settingsTitle: "Настройки игры",
    save: "Сохранить",
    cancel: "Отмена",
    includeAnswer: "Добавить ответ в PDF",
    
    mazeTitleLabel: "Текст задания",
    fsLabel: "Размер текста:",
    width: "Ширина", height: "Высота", seed: "Номер",
    difficulty: "Сложность", shape: "Форма", hero: "Герой", goal: "Цель",
    showSolution: "Показать правильный путь",
    newMaze: "Новый лабиринт", downloadMazePdf: "Скачать PDF", downloadMazeAns: "Скачать ответ",
    mazeDefTitle: "Помоги герою найти дорогу домой!"
  },
  en: {
    title: "Puzzle Lab",
    homeTitle: "Puzzle Generators",
    homeSubtitle: "Interactive and PDF puzzles for teachers",
    backBtn: "← Back",
    tabCode: "Code Breaker",
    tabMaze: "Maze",
    tabSudoku: "Sudoku",
    codeDesc: "Find the code using logical clues",
    mazeDesc: "Create a maze to help the hero find the way home",
    sudokuDesc: "Classic and jigsaw sudoku puzzles",
    
    codeGameTitle: "🔐 CRACK THE CODE!",
    codeGameDesc: "Use the clues below to find the secret code.",
    codeLengthLabel: "Code Length",
    digits: "digits",
    cluesTitle: "Clues:",
    yourAnswer: "ANSWER:",
    checkAnswer: "Check",
    newGameBtn: "🔄 New Code",
    revealAnswer: "Reveal Answer",
    enterAllDigits: "Enter all digits!",
    correctAnswer: "🎉 Correct! You cracked the code!",
    wrongAnswer: "❌ Wrong. Try again.",
    
    settingsBtn: "⚙️ Settings",
    pdfBtn: "📄 Download PDF",
    pdfTask: "Task PDF",
    pdfAnswer: "Answer PDF",
    settingsTitle: "Game Settings",
    save: "Save",
    cancel: "Cancel",
    includeAnswer: "Include answer in PDF",
    
    mazeTitleLabel: "Task Text",
    fsLabel: "Font Size:",
    width: "Width", height: "Height", seed: "Seed",
    difficulty: "Difficulty", shape: "Shape", hero: "Hero", goal: "Goal",
    showSolution: "Show solution on screen",
    newMaze: "New Maze", downloadMazePdf: "Download PDF", downloadMazeAns: "Download Answer",
    mazeDefTitle: "Help the hero find the way home!"
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
