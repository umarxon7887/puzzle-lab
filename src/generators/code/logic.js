// Mastermind uslubidagi Code Breaker

export function generateSecretCode(length = 3) {
  const code = [];
  for (let i = 0; i < length; i++) {
    code.push(Math.floor(Math.random() * 10));
  }
  return code;
}

export function checkGuess(secret, guess) {
  let correctPlace = 0;
  let wrongPlace = 0;
  const secCopy = [...secret];
  const guessCopy = [...guess];

  // 1-qadam: To'g'ri joydagi raqamlarni topish
  for (let i = 0; i < secret.length; i++) {
    if (guessCopy[i] === secCopy[i]) {
      correctPlace++;
      secCopy[i] = -1;
      guessCopy[i] = -2;
    }
  }

  // 2-qadam: Noto'g'ri joydagi raqamlarni topish
  for (let i = 0; i < secret.length; i++) {
    if (guessCopy[i] === -2) continue;
    const idx = secCopy.indexOf(guessCopy[i]);
    if (idx !== -1) {
      wrongPlace++;
      secCopy[idx] = -1;
    }
  }

  return { correctPlace, wrongPlace, total: correctPlace + wrongPlace };
}

// 5 ta ipucu (shart) generatsiya qilish
export function generateClues(secretCode, numClues = 5) {
  const clues = [];
  const usedGuesses = new Set();
  
  // Secret code'ni string ga aylantirish (unikal kalit uchun)
  const secretKey = secretCode.join(',');
  
  let attempts = 0;
  while (clues.length < numClues && attempts < 100) {
    attempts++;
    
    // Random taxmin generatsiya qilish
    const guess = [];
    for (let i = 0; i < secretCode.length; i++) {
      guess.push(Math.floor(Math.random() * 10));
    }
    
    const guessKey = guess.join(',');
    
    // Agar bu taxmin allaqachon ishlatilgan bo'lsa yoki to'g'ri javob bo'lsa, o'tkazib yubor
    if (usedGuesses.has(guessKey) || guessKey === secretKey) {
      continue;
    }
    
    usedGuesses.add(guessKey);
    
    // Ipucuni hisoblash
    const result = checkGuess(secretCode, guess);
    
    clues.push({
      guess: guess,
      correctPlace: result.correctPlace,
      wrongPlace: result.wrongPlace
    });
  }
  
  return clues;
}

// Ipucu matnini olish (3 tilda)
export function getClueText(clue, lang) {
  const { correctPlace, wrongPlace } = clue;
  
  if (lang === 'uz') {
    if (correctPlace === 0 && wrongPlace === 0) return "Hech narsa to'g'ri emas";
    if (correctPlace > 0 && wrongPlace === 0) {
      return `${correctPlace} ta raqam to'g'ri va to'g'ri joyda`;
    }
    if (correctPlace === 0 && wrongPlace > 0) {
      return `${wrongPlace} ta raqam to'g'ri, lekin noto'g'ri joyda`;
    }
    return `${correctPlace} ta to'g'ri joyda, ${wrongPlace} ta noto'g'ri joyda`;
  }
  
  if (lang === 'ru') {
    if (correctPlace === 0 && wrongPlace === 0) return "Ничего не верно";
    if (correctPlace > 0 && wrongPlace === 0) {
      return `${correctPlace} цифра верная и на своём месте`;
    }
    if (correctPlace === 0 && wrongPlace > 0) {
      return `${wrongPlace} цифра верная, но не на своём месте`;
    }
    return `${correctPlace} на своём месте, ${wrongPlace} не на своём месте`;
  }
  
  // English
  if (correctPlace === 0 && wrongPlace === 0) return "Nothing is correct";
  if (correctPlace > 0 && wrongPlace === 0) {
    return `${correctPlace} number${correctPlace > 1 ? 's' : ''} correct and well placed`;
  }
  if (correctPlace === 0 && wrongPlace > 0) {
    return `${wrongPlace} number${wrongPlace > 1 ? 's' : ''} correct but wrong place`;
  }
  return `${correctPlace} well placed, ${wrongPlace} wrong place`;
}
