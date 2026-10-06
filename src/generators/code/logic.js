export function generateSecretCode() {
  return [
    Math.floor(Math.random() * 10),
    Math.floor(Math.random() * 10),
    Math.floor(Math.random() * 10)
  ];
}

export function checkGuess(secret, guess) {
  let correctPlace = 0;
  let wrongPlace = 0;
  const secCopy = [...secret];
  const guessCopy = [...guess];

  // 1-qadam: To'g'ri joydagi raqamlarni topish
  for (let i = 0; i < 3; i++) {
    if (guessCopy[i] === secCopy[i]) {
      correctPlace++;
      secCopy[i] = -1;
      guessCopy[i] = -2;
    }
  }

  // 2-qadam: Noto'g'ri joydagi raqamlarni topish
  for (let i = 0; i < 3; i++) {
    if (guessCopy[i] === -2) continue;
    const idx = secCopy.indexOf(guessCopy[i]);
    if (idx !== -1) {
      wrongPlace++;
      secCopy[idx] = -1;
    }
  }

  return { correctPlace, wrongPlace, total: correctPlace + wrongPlace };
}
