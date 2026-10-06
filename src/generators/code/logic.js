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
