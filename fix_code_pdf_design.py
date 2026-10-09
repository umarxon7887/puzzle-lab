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

  const M = 12 * k;
  let y = M;

  // 1. Qora banner
  const bannerH = 25 * k;
  ctx.fillStyle = '#000000';
  ctx.fillRect(M, y, W - 2*M, bannerH);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 ${18 * 0.3528 * k}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const title = lang === 'uz' ? 'KODNI TOPING!' : (lang === 'ru' ? 'УГАДАЙТЕ КОД!' : 'CRACK THE CODE!');
  ctx.fillText(title, W/2, y + bannerH/2);
  y += bannerH + 8 * k;

  // 2. Qoida matni
  ctx.fillStyle = '#000000';
  ctx.font = `600 ${9 * 0.3528 * k}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const instruction = lang === 'uz'
    ? "Har bir qatordagi belgi shu raqamlarning qanchasi to'g'ri ekanini aytadi. Kodda raqamlar takrorlanmaydi."
    : (lang === 'ru' ? "Каждый символ указывает, сколько цифр верны. Цифры в коде не повторяются." : "Each symbol indicates how many digits are correct. Digits do not repeat.");
  ctx.fillText(instruction, M, y);
  y += 15 * k;

  // 3. Belgilar izohi
  ctx.font = `700 ${10 * 0.3528 * k}px ${FONT}`;
  const legendY = y;
  const legendItems = [
    { symbol: '✕', text: lang === 'uz' ? "Hech biri emas" : (lang === 'ru' ? "Ничего не верно" : "None correct") },
    { symbol: '✓', text: lang === 'uz' ? "To'g'ri raqam, to'g'ri joy" : (lang === 'ru' ? "Верная цифра, верное место" : "Correct digit, correct place") },
    { symbol: '↔', text: lang === 'uz' ? "To'g'ri raqam, noto'g'ri joy" : (lang === 'ru' ? "Верная цифра, не то место" : "Correct digit, wrong place") }
  ];
  const legendSpacing = (W - 2*M) / 3;
  legendItems.forEach((item, i) => {
    const x = M + i * legendSpacing;
    ctx.font = `900 ${12 * 0.3528 * k}px ${FONT}`;
    ctx.fillText(item.symbol, x, legendY);
    ctx.font = `600 ${8 * 0.3528 * k}px ${FONT}`;
    ctx.fillText(item.text, x + 14 * k, legendY + 2 * k);
  });
  y += 18 * k;

  // 4. Topshiriq ramkasi (rounded rectangle)
  const taskStartY = y;
  const taskPadding = 8 * k;
  const taskWidth = W - 2*M;
  
  // Ramka chizish (rounded corners)
  const cornerRadius = 8 * k;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(M + cornerRadius, taskStartY);
  ctx.lineTo(M + taskWidth - cornerRadius, taskStartY);
  ctx.quadraticCurveTo(M + taskWidth, taskStartY, M + taskWidth, taskStartY + cornerRadius);
  ctx.lineTo(M + taskWidth, taskStartY + 200 * k); // Height will be adjusted
  ctx.quadraticCurveTo(M + taskWidth, taskStartY + 200 * k + cornerRadius, M + taskWidth - cornerRadius, taskStartY + 200 * k + cornerRadius);
  ctx.lineTo(M + cornerRadius, taskStartY + 200 * k + cornerRadius);
  ctx.quadraticCurveTo(M, taskStartY + 200 * k + cornerRadius, M, taskStartY + 200 * k);
  ctx.lineTo(M, taskStartY + cornerRadius);
  ctx.quadraticCurveTo(M, taskStartY, M + cornerRadius, taskStartY);
  ctx.stroke();
  
  y += taskPadding;

  // 5. Topshiriq raqami (qora doira)
  const circleX = M + 15 * k;
  const circleY = y + 8 * k;
  const circleR = 8 * k;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 ${10 * 0.3528 * k}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('1', circleX, circleY);

  // 6. Topshiriq sarlavhasi
  ctx.fillStyle = '#000000';
  ctx.font = `700 ${11 * 0.3528 * k}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const taskTitle = lang === 'uz' ? `1-topshiriq (${state.codeLength} xonali kod)` : (lang === 'ru' ? `1-задание (${state.codeLength}-значный код)` : `Task 1 (${state.codeLength}-digit code)`);
  ctx.fillText(taskTitle, circleX + circleR + 8 * k, circleY);
  y += 20 * k;

  // 7. Ipuqlar (raqamlar katakchalarda)
  const boxSize = 12 * k;
  const boxGap = 2 * k;
  const startX = M + 15 * k;
  
  state.clues.forEach((clue, clueIdx) => {
    const rowY = y + clueIdx * (boxSize + 6 * k);
    
    // Raqamlar katakchalari
    clue.guess.split('').forEach((digit, dIdx) => {
      const bx = startX + dIdx * (boxSize + boxGap);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, rowY, boxSize, boxSize);
      ctx.font = `700 ${10 * 0.3528 * k}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000000';
      ctx.fillText(digit, bx + boxSize/2, rowY + boxSize/2);
    });

    // Belgi (✕, ✓, ↔)
    const symbolX = startX + state.codeLength * (boxSize + boxGap) + 8 * k;
    ctx.font = `900 ${12 * 0.3528 * k}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000000';
    
    let symbol = '✕';
    if (clue.correctPlace > 0 && clue.wrongPlace === 0) symbol = '✓';
    else if (clue.correctPlace === 0 && clue.wrongPlace > 0) symbol = '↔';
    else if (clue.correctPlace > 0 && clue.wrongPlace > 0) symbol = '✓↔';
    
    ctx.fillText(symbol, symbolX, rowY + boxSize/2);

    // Izoh matni
    ctx.font = `600 ${9 * 0.3528 * k}px ${FONT}`;
    ctx.fillText(getClueText(clue, lang), symbolX + 18 * k, rowY + boxSize/2);
  });

  y += state.clues.length * (boxSize + 6 * k) + 10 * k;

  // 8. JAVOB: va bo'sh katakchalar
  ctx.font = `700 ${11 * 0.3528 * k}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const ansLabel = lang === 'uz' ? "JAVOB:" : (lang === 'ru' ? "ОТВЕТ:" : "ANSWER:");
  ctx.fillText(ansLabel, M + 15 * k, y);

  const ansStartX = M + 50 * k;
  const ansBoxSize = 14 * k;
  for (let i = 0; i < state.codeLength; i++) {
    const bx = ansStartX + i * (ansBoxSize + 4 * k);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, y - ansBoxSize/2, ansBoxSize, ansBoxSize);
  }

  // Footer
  ctx.fillStyle = '#6B7280';
  ctx.font = `600 ${8 * 0.3528 * k}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const footer = lang === 'uz' ? "Topshiriqlar Lab" : (lang === 'ru' ? "Лаборатория головоломок" : "Puzzle Lab");
  ctx.fillText(footer, W / 2, H - 8 * k);

  // 9. JAVOBLAR sahifasi (faqat withAnswer true bo'lsa)
  if (withAnswer) {
    // Yangi sahifa
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);
    
    const ansPageY = M;
    
    // Sarlavha
    ctx.fillStyle = '#000000';
    ctx.font = `900 ${16 * 0.3528 * k}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const teacherTitle = lang === 'uz' ? "JAVOBLAR (o'qituvchi uchun)" : (lang === 'ru' ? "ОТВЕТЫ (для учителя)" : "ANSWERS (for teacher)");
    ctx.fillText(teacherTitle, M, ansPageY);
    ansPageY += 25 * k;

    // Javoblar ro'yxati
    ctx.font = `700 ${11 * 0.3528 * k}px ${FONT}`;
    const taskLabel = lang === 'uz' ? "1-topshiriq:" : (lang === 'ru' ? "1-задание:" : "Task 1:");
    ctx.fillText(taskLabel, M, ansPageY);

    const codeStr = state.secretCode.split('').join('  ');
    ctx.font = `900 ${13 * 0.3528 * k}px ${FONT}`;
    ctx.fillText(codeStr, M + 50 * k, ansPageY);
  }
}'''

content = re.sub(pattern, new_func, content, flags=re.MULTILINE)

with open('src/generators/code/ui.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ PDF dizayni yangi formatga muvaffaqiyatli o'zgartirildi!")
