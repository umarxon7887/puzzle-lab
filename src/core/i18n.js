export const translations = {
  uz: {
    title: "Topshiriqlar Lab",
    tabCode: "🔐 Kodni top",
    tabMaze: "🌀 Labirint",
    tabSudoku: "🔢 Sudoku",
    gameTitle: "Maxfiy kodni toping!",
    gameDesc: "3 ta raqamli maxfiy kodni toping. Har bir urinishdan keyin maslahat olasiz.",
    yourGuess: "Sizning taxminingiz",
    checkBtn: "Tekshirish",
    newGameBtn: "Yangi kod",
    revealBtn: "Kodni ko'rsatish",
    attempts: "Urinishlar tarixi",
    enterAll: "Barcha raqamlarni kiriting!",
    win: "🎉 Tabriklaymiz! Kodni topdingiz!",
    gameOver: "O'yin tugadi. To'g'ri kod: ",
    clueCorrect: "✅ To'g'ri raqam, to'g'ri joyda",
    clueWrongPlace: "⚠️ To'g'ri raqam, noto'g'ri joyda",
    clueWrong: "❌ Noto'g'ri raqam"
  },
  ru: {
    title: "Лаборатория головоломок",
    tabCode: "🔐 Угадай код",
    tabMaze: "🌀 Лабиринт",
    tabSudoku: "🔢 Судоку",
    gameTitle: "Угадайте секретный код!",
    gameDesc: "Найдите секретный код из 3 цифр. После каждой попытки вы получите подсказку.",
    yourGuess: "Ваша догадка",
    checkBtn: "Проверить",
    newGameBtn: "Новый код",
    revealBtn: "Показать код",
    attempts: "История попыток",
    enterAll: "Введите все цифры!",
    win: "🎉 Поздравляем! Вы угадали код!",
    gameOver: "Игра окончена. Правильный код: ",
    clueCorrect: "✅ Правильная цифра, на своём месте",
    clueWrongPlace: "⚠️ Правильная цифра, но не на своём месте",
    clueWrong: "❌ Неправильная цифра"
  },
  en: {
    title: "Puzzle Lab",
    tabCode: "🔐 Code Breaker",
    tabMaze: "🌀 Maze",
    tabSudoku: "🔢 Sudoku",
    gameTitle: "Crack the Secret Code!",
    gameDesc: "Find the secret 3-digit code. You'll get clues after each guess.",
    yourGuess: "Your Guess",
    checkBtn: "Check",
    newGameBtn: "New Code",
    revealBtn: "Reveal Code",
    attempts: "Attempt History",
    enterAll: "Enter all digits!",
    win: "🎉 Congratulations! You cracked the code!",
    gameOver: "Game over. The correct code was: ",
    clueCorrect: "✅ Correct number, correct place",
    clueWrongPlace: "⚠️ Correct number, wrong place",
    clueWrong: "❌ Incorrect number"
  }
};

let currentLang = localStorage.getItem('puzzle_lang') || 'uz';

export function t(key) {
  return translations[currentLang][key] || key;
}

export function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('puzzle_lang', lang);
  document.documentElement.lang = lang;
  // Sahifani qayta yuklaymiz, til o'zgarganini ko'rsatish uchun
  window.location.reload(); 
}

export function getLang() {
  return currentLang;
}
