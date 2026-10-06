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
    sudokuDesc: "Klassik, diagonal va shaklli (jigsaw) sudoku topshiriqlari",
    
    // Common UI
    settingsBtn: "⚙️ Sozlamalar",
    pdfBtn: "📄 PDF yuklash",
    pdfTask: "Topshiriq PDF",
    pdfAnswer: "Javob varag'i PDF",
    settingsTitle: "Sozlamalar",
    save: "Saqlash",
    cancel: "Bekor qilish",
    
    // Code Breaker
    codeGameTitle: "🔐 KODNI TOPING!",
    codeGameDesc: "Quyidagi ipuclardan foydalanib, maxfiy kodni toping.",
    codeLengthLabel: "Kod uzunligi",
    digits: "xonali",
    yourAnswer: "JAVOB:",
    checkAnswer: "Tekshirish",
    newGameBtn: "🔄 Yangi",
    revealAnswer: "Javobni ko'rsatish",
    enterAllDigits: "Barcha raqamlarni kiriting!",
    correctAnswer: "🎉 To'g'ri! Kodni topdingiz!",
    wrongAnswer: "❌ Noto'g'ri. Qaytadan urinib ko'ring.",
    includeAnswer: "Javobni PDF'ga qo'shish",
    
    // Maze
    mazeTitleLabel: "Topshiriq matni",
    fsLabel: "Matn o'lchami:",
    width: "Eni", height: "Bo'yi", seed: "Raqami",
    difficulty: "Qiyinlik", shape: "Shakl", hero: "Qahramon", goal: "Manzil",
    showSolution: "Ekranda to'g'ri yo'lni ko'rsatish",
    newMaze: "Yangi labirint",
    mazeDefTitle: "Qahramonga uyiga yo'l topishga yordam ber!",
    
    // Sudoku
    sudokuTypeLabel: "Sudoku turi",
    sudokuLevelLabel: "Daraja",
    sudokuSeedLabel: "Raqami (Seed)",
    sudokuDefTitle: "Sudoku'ni yech!",
    sudokuRule: (N, jig, diag) => `Har bir qator, ustun va ${jig ? 'qalin chiziq bilan chegaralangan shaklda' : 'qalin chiziqli katakchada'} 1 dan ${N} gacha raqamlar takrorlanmasin.` + (diag ? ' Ikkala diagonalda ham.' : ''),
    typeNames: {'4':'4×4 (2×2)', '5':'5×5 (Shaklli)', '6':'6×6 (2×3)', '7':'7×7 (Shaklli)', '8':'8×8 (2×4)', '9':'9×9 (Klassik)', '9x':'9×9 (Diagonal)'},
    levelNames: ["Oson", "O'rta", "Qiyin", "Juda qiyin"]
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
    sudokuDesc: "Классические, диагональные и фигурные судоку",
    
    settingsBtn: "⚙️ Настройки",
    pdfBtn: "📄 Скачать PDF",
    pdfTask: "Задание PDF",
    pdfAnswer: "Ответ PDF",
    settingsTitle: "Настройки",
    save: "Сохранить",
    cancel: "Отмена",
    
    codeGameTitle: "🔐 УГАДАЙТЕ КОД!",
    codeGameDesc: "Используйте подсказки ниже, чтобы найти секретный код.",
    codeLengthLabel: "Длина кода",
    digits: "значный",
    yourAnswer: "ОТВЕТ:",
    checkAnswer: "Проверить",
    newGameBtn: "🔄 Новый",
    revealAnswer: "Показать ответ",
    enterAllDigits: "Введите все цифры!",
    correctAnswer: "🎉 Правильно! Вы угадали код!",
    wrongAnswer: "❌ Неправильно. Попробуйте ещё раз.",
    includeAnswer: "Добавить ответ в PDF",
    
    mazeTitleLabel: "Текст задания",
    fsLabel: "Размер текста:",
    width: "Ширина", height: "Высота", seed: "Номер",
    difficulty: "Сложность", shape: "Форма", hero: "Герой", goal: "Цель",
    showSolution: "Показать правильный путь",
    newMaze: "Новый лабиринт",
    mazeDefTitle: "Помоги герою найти дорогу домой!",
    
    sudokuTypeLabel: "Тип судоку",
    sudokuLevelLabel: "Сложность",
    sudokuSeedLabel: "Номер (Seed)",
    sudokuDefTitle: "Реши судоку!",
    sudokuRule: (N, jig, diag) => `В каждой строке, столбце и ${jig ? 'фигуре с жирной границей' : 'блоке с жирной границей'} цифры от 1 до ${N} не должны повторяться.` + (diag ? ' То же правило для обеих диагоналей.' : ''),
    typeNames: {'4':'4×4 (2×2)', '5':'5×5 (Фигурное)', '6':'6×6 (2×3)', '7':'7×7 (Фигурное)', '8':'8×8 (2×4)', '9':'9×9 (Классика)', '9x':'9×9 (Диагональ)'},
    levelNames: ["Легко", "Средне", "Сложно", "Очень сложно"]
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
    sudokuDesc: "Classic, diagonal, and jigsaw sudoku puzzles",
    
    settingsBtn: "⚙️ Settings",
    pdfBtn: "📄 Download PDF",
    pdfTask: "Task PDF",
    pdfAnswer: "Answer PDF",
    settingsTitle: "Settings",
    save: "Save",
    cancel: "Cancel",
    
    codeGameTitle: "🔐 CRACK THE CODE!",
    codeGameDesc: "Use the clues below to find the secret code.",
    codeLengthLabel: "Code Length",
    digits: "digits",
    yourAnswer: "ANSWER:",
    checkAnswer: "Check",
    newGameBtn: "🔄 New",
    revealAnswer: "Reveal Answer",
    enterAllDigits: "Enter all digits!",
    correctAnswer: "🎉 Correct! You cracked the code!",
    wrongAnswer: "❌ Wrong. Try again.",
    includeAnswer: "Include answer in PDF",
    
    mazeTitleLabel: "Task Text",
    fsLabel: "Font Size:",
    width: "Width", height: "Height", seed: "Seed",
    difficulty: "Difficulty", shape: "Shape", hero: "Hero", goal: "Goal",
    showSolution: "Show solution on screen",
    newMaze: "New Maze",
    mazeDefTitle: "Help the hero find the way home!",
    
    sudokuTypeLabel: "Sudoku Type",
    sudokuLevelLabel: "Difficulty",
    sudokuSeedLabel: "Seed Number",
    sudokuDefTitle: "Solve the Sudoku!",
    sudokuRule: (N, jig, diag) => `In each row, column, and ${jig ? 'jigsaw region' : 'bold-bordered box'}, digits 1 to ${N} must not repeat.` + (diag ? ' Same rule for both diagonals.' : ''),
    typeNames: {'4':'4×4 (2×2)', '5':'5×5 (Jigsaw)', '6':'6×6 (2×3)', '7':'7×7 (Jigsaw)', '8':'8×8 (2×4)', '9':'9×9 (Classic)', '9x':'9×9 (Diagonal)'},
    levelNames: ["Easy", "Medium", "Hard", "Expert"]
  }
};

let currentLang = localStorage.getItem('puzzle_lang') || 'uz';
export function t(key, ...args) { 
  const val = translations[currentLang][key];
  return typeof val === 'function' ? val(...args) : (val || key); 
}
export function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('puzzle_lang', lang);
  document.documentElement.lang = lang;
  window.location.reload(); 
}
export function getLang() { return currentLang; }
