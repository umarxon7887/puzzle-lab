import re

with open('src/generators/code/ui.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Eski drawPdfSheet ni topib o'chirish
pattern = r'function drawPdfSheet\(canvas, k, withAnswer\) \{[\s\S]*?^\}'
new_func = '''function drawPdfSheet(canvas, k, withAnswer) {
  const lang = getLang();
  const ctx = canvas.getContext('2d');
  const W = 210 * k;
  const H = 297 * k;
  canvas.width = W;
  canvas.height = H;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  const M = 15 * k;
  let y = M;

  // 1. Qoida
  ctx.fillStyle = '#000000';
  ctx.font = `700 ${12 * 0.3528 * k}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const instruction = lang === 'uz'
    ? "Har bir qatordagi belgi shu raqamlarning qanchasi to'g'ri ekanini aytadi. Kodda raqamlar takrorlanmaydi."
    : (lang === 'ru' ? "Каждый символ указывает, сколько цифр верны. Цифры в коде не повторяются." : "Each symbol indicates how many digits are correct. Digits do not repeat.");
  ctx.fillText(instruction, M, y);
  y += 20 * k;

  // 2. Belgilar izohi
  ctx.font = `600 ${10 * 0.3528 * k}px ${FONT}`;
  const legendItems = [
    { symbol: '✕', text: lang === 'uz' ? "Hech narsa to'g'ri emas" : (lang === 'ru' ? "Ничего не верно" : "None correct") },
    { symbol: '✓', text: lang === 'uz' ? "To'g'ri raqam, to'g'ri joy" : (lang === 'ru' ? "Верная цифра, верное место" : "Correct digit, correct place") },
    { symbol: '↻', text: lang === 'uz' ? "To'g'ri raqam, noto'g'ri joy" : (lang === 'ru' ? "Верная цифра, не то место" : "Correct digit, wrong place") }
  ];
  legendItems.forEach((item, i) => {
    const x = M + i * (70 * k);
    ctx.font = `900 ${12 * 0.3528 * k}px ${FONT}`;
    ctx.fillText(item.symbol, x, y);
    ctx.font = `600 ${9 * 0.3528 * k}px ${FONT}`;
    ctx.fillText(item.text, x + 15 * k, y + 2 * k);
  });
  y += 25 * k;

  // 3. Topshiriq sarlavhasi
  ctx.font = `700 ${13 * 0.3528 * k}px ${FONT}`;
  ctx.fillStyle = '#000000';
  ctx.fillText(`1-topshiriq (${state.codeLength} xonali kod)`, M, y);
  y += 20 * k;

  // 4. Ipuqlar
  const boxSize = 14 * k;
  const boxGap = 4 * k;
  state.clues.forEach((clue) => {
    const startX = M + 10 * k;
    
    // Taxmin qutilari
    clue.guess.split('').forEach((digit, dIdx) => {
      const bx = startX + dIdx * (boxSize + boxGap);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, y, boxSize, boxSize);
      ctx.font = `700 ${11 * 0.3528 * k}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000000';
      ctx.fillText(digit, bx + boxSize/2, y + boxSize/2 + 1);
    });

    // Strelka
    const arrowX = startX + state.codeLength * (boxSize + boxGap) + 5 * k;
    ctx.font = `700 ${12 * 0.3528 * k}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('→', arrowX, y + boxSize/2);

    // Ipuq matni
    ctx.font = `600 ${10 * 0.3528 * k}px ${FONT}`;
    ctx.fillText(getClueText(clue, lang), arrowX + 15 * k, y + boxSize/2 + 1);

    y += boxSize + 8 * k;
  });

  y += 15 * k;

  // 5. O'quvchi uchun JAVOB qismi (bo'sh)
  ctx.font = `700 ${12 * 0.3528 * k}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const ansLabel = lang === 'uz' ? "JAVOB:" : (lang === 'ru' ? "ОТВЕТ:" : "ANSWER:");
  ctx.fillText(ansLabel, M, y + 10 * k);

  const ansStartX = M + 40 * k;
  const ansBoxSize = 16 * k;
  for (let i = 0; i < state.codeLength; i++) {
    const bx = ansStartX + i * (ansBoxSize + 6 * k);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, y, ansBoxSize, ansBoxSize);
  }
  y += 35 * k;

  // 6. O'qituvchi uchun JAVOBLAR (faqat withAnswer true bo'lsa)
  if (withAnswer) {
    y += 10 * k;
    ctx.beginPath();
    ctx.moveTo(M, y);
    ctx.lineTo(W - M, y);
    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 1;
    ctx.stroke();
    y += 20 * k;

    ctx.fillStyle = '#EF4444';
    ctx.font = `800 ${13 * 0.3528 * k}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const teacherTitle = lang === 'uz' ? "JAVOBLAR (o'qituvchi uchun)" : (lang === 'ru' ? "ОТВЕТЫ (для учителя)" : "ANSWERS (for teacher)");
    ctx.fillText(teacherTitle, M, y);
    y += 22 * k;

    ctx.fillStyle = '#000000';
    ctx.font = `700 ${12 * 0.3528 * k}px ${FONT}`;
    const taskLabel = lang === 'uz' ? "1-topshiriq:" : (lang === 'ru' ? "1-задание:" : "Task 1:");
    ctx.fillText(taskLabel, M, y);

    const codeStr = state.secretCode.split('').join('  ');
    ctx.font = `900 ${14 * 0.3528 * k}px ${FONT}`;
    ctx.fillText(codeStr, M + 55 * k, y);
  }

  // Footer
  ctx.fillStyle = '#9CA3AF';
  ctx.font = `600 ${9 * 0.3528 * k}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const footer = lang === 'uz' ? "Topshiriqlar Lab" : (lang === 'ru' ? "Лаборатория головоломок" : "Puzzle Lab");
  ctx.fillText(footer, W / 2, H - 10 * k);
}'''

content = re.sub(pattern, new_func, content, flags=re.MULTILINE)

with open('src/generators/code/ui.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ drawPdfSheet yangi dizayn bilan muvaffaqiyatli yangilandi!")
