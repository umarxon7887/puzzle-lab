import { generateSecretCode, generateClues, getClueText } from './logic.js';
import { t, getLang } from '../../core/i18n.js';
import { makePdf, downloadPdf } from '../../core/pdf.js';

let state = {
  codeLength: 3,
  secretCode: [],
  clues: [],
  userAnswer: [],
  showSettings: false,
  showPdfDropdown: false,
  includeAnswerInPdf: false
};

const FONT = '"Nunito","Trebuchet MS",Arial,sans-serif';

export function init(container) {
  startNewGame();
  render(container);
}

function startNewGame() {
  state.secretCode = generateSecretCode(state.codeLength);
  state.clues = generateClues(state.secretCode, 5);
  state.userAnswer = new Array(state.codeLength).fill('');
  state.showSettings = false;
  state.showPdfDropdown = false;
}

function render(container) {
  const lang = getLang();
  
  if (state.showSettings) {
    renderSettingsModal(container);
    return;
  }

  const inputsHtml = Array.from({length: state.codeLength}, (_, i) => 
    `<input type="number" id="ans${i}" min="0" max="9" placeholder="?" maxlength="1" value="${state.userAnswer[i] || ''}">`
  ).join('');

  container.innerHTML = `
    <div class="card">
      <div class="game-header">
        <h2>${t('codeGameTitle')}</h2>
        <p>${t('codeGameDesc')}</p>
      </div>

      <div class="clues-container">
        ${state.clues.map((clue, idx) => `
          <div class="clue-item">
            <div class="clue-guess">${clue.guess.join(' ')}</div>
            <div class="clue-text">${getClueText(clue, lang)}</div>
          </div>
        `).join('')}
      </div>

      <div style="text-align:center; font-weight:800; font-size:16px; color:var(--text); margin-bottom:12px;">
        ${t('yourAnswer')}
      </div>
      <div class="answer-input" id="answerInput">
        ${inputsHtml}
      </div>
      
      <div class="action-bar">
        <button id="checkAnswerBtn" class="primary">✓ ${t('checkAnswer')}</button>
        <button id="newGameBtn">🔄 Yangi</button>
        
        <div class="dropdown-container">
          <button id="pdfDropdownBtn">📄 ${t('pdfBtn')} ▼</button>
          <div class="dropdown-menu ${state.showPdfDropdown ? 'show' : ''}" id="pdfDropdown">
            <button id="pdfTaskBtn">📋 ${t('pdfTask')}</button>
            <button id="pdfAnswerBtn">✅ ${t('pdfAnswer')}</button>
          </div>
        </div>
        
        <button id="settingsBtn">⚙️</button>
      </div>
    </div>
  `;

  attachEvents(container);
}

function renderSettingsModal(container) {
  const lang = getLang();
  container.innerHTML = `
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal">
        <h3>${t('settingsTitle')}</h3>
        
        <label style="display:block; margin-bottom:16px;">
          <span style="font-size:13px; font-weight:700; display:block; margin-bottom:6px;">${t('codeLengthLabel')}</span>
          <select id="settingsLength" style="width:100%; padding:10px; border-radius:8px; border:2px solid var(--border); font-family:inherit;">
            <option value="3" ${state.codeLength === 3 ? 'selected' : ''}>3 ${t('digits')}</option>
            <option value="4" ${state.codeLength === 4 ? 'selected' : ''}>4 ${t('digits')}</option>
            <option value="5" ${state.codeLength === 5 ? 'selected' : ''}>5 ${t('digits')}</option>
          </select>
        </label>

        <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
          <input type="checkbox" id="settingsIncludeAnswer" ${state.includeAnswerInPdf ? 'checked' : ''} style="width:18px; height:18px;">
          <span style="font-weight:600;">${t('includeAnswer')}</span>
        </label>

        <div class="modal-actions">
          <button id="cancelSettingsBtn">${t('cancel')}</button>
          <button id="saveSettingsBtn" class="primary">${t('save')}</button>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#modalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay') {
      state.showSettings = false;
      render(container);
    }
  });

  container.querySelector('#cancelSettingsBtn').addEventListener('click', () => {
    state.showSettings = false;
    render(container);
  });

  container.querySelector('#saveSettingsBtn').addEventListener('click', () => {
    state.codeLength = parseInt(container.querySelector('#settingsLength').value);
    state.includeAnswerInPdf = container.querySelector('#settingsIncludeAnswer').checked;
    state.showSettings = false;
    startNewGame();
    render(container);
  });
}

function attachEvents(container) {
  container.querySelector('#checkAnswerBtn').addEventListener('click', () => {
    const answer = [];
    for (let i = 0; i < state.codeLength; i++) {
      const val = container.querySelector(`#ans${i}`).value;
      if (val === '') {
        alert(t('enterAllDigits'));
        return;
      }
      answer.push(parseInt(val));
    }

    const isCorrect = answer.every((val, idx) => val === state.secretCode[idx]);
    if (isCorrect) {
      alert(t('correctAnswer'));
      revealAnswer(container);
    } else {
      alert(t('wrongAnswer'));
    }
  });

  container.querySelector('#newGameBtn').addEventListener('click', () => {
    startNewGame();
    render(container);
  });

  container.querySelector('#settingsBtn').addEventListener('click', () => {
    state.showSettings = true;
    render(container);
  });

  container.querySelector('#pdfDropdownBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    state.showPdfDropdown = !state.showPdfDropdown;
    const dropdown = container.querySelector('#pdfDropdown');
    dropdown.classList.toggle('show', state.showPdfDropdown);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown-container')) {
      state.showPdfDropdown = false;
      const dropdown = container.querySelector('#pdfDropdown');
      if (dropdown) dropdown.classList.remove('show');
    }
  });

  container.querySelector('#pdfTaskBtn').addEventListener('click', () => {
    state.showPdfDropdown = false;
    exportPdf(false);
  });

  container.querySelector('#pdfAnswerBtn').addEventListener('click', () => {
    state.showPdfDropdown = false;
    exportPdf(true);
  });

  for (let i = 0; i < state.codeLength; i++) {
    const input = container.querySelector(`#ans${i}`);
    input.addEventListener('input', (e) => {
      state.userAnswer[i] = e.target.value;
      if (e.target.value.length === 1 && i < state.codeLength - 1) {
        container.querySelector(`#ans${i+1}`).focus();
      }
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (i < state.codeLength - 1) container.querySelector(`#ans${i+1}`).focus();
        else container.querySelector('#checkAnswerBtn').click();
      }
    });
  }
}

function revealAnswer(container) {
  for (let i = 0; i < state.codeLength; i++) {
    const input = container.querySelector(`#ans${i}`);
    input.value = state.secretCode[i];
    input.classList.add('correct');
    input.disabled = true;
  }
}

// ==========================================
// YANGI OQ-QORA PDF DIZAYNI (Canvas)
// ==========================================
function drawPdfSheet(canvas, k, withAnswer) {
  const lang = getLang();
  const ctx = canvas.getContext('2d');
  const W = 210 * k, H = 297 * k;
  canvas.width = W;
  canvas.height = H;

  // 1. Background (White)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  const M = 14 * k; // Margin
  let y = 12 * k; // Top margin

  // 2. HEADER (Title + Lock)
  const headerY = y;
  
  // Title
  ctx.fillStyle = '#000000';
  ctx.font = `900 ${30 * 0.3528 * k}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const title = lang === 'uz' ? 'KODNI TOPING!' : (lang === 'ru' ? 'УГАДАЙТЕ КОД!' : 'CRACK THE CODE!');
  ctx.fillText(title, M, headerY);
  
  // Subtitle
  ctx.font = `700 ${14 * 0.3528 * k}px ${FONT}`;
  const subtitle = lang === 'uz' ? 'Ipuclardan foydalanib, maxfiy kodni toping' : (lang === 'ru' ? 'Используйте подсказки ниже' : 'Use the clues below');
  ctx.fillText(subtitle, M, headerY + 12 * k);
  
  // Lock icon (outline) - O'ng tomonda
  const lockSize = 28 * k;
  const lockX = W - M - lockSize;
  const lockY = headerY;
  
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2 * k;
  ctx.fillStyle = '#FFFFFF';
  
  // Shackle (qulf halqasi)
  ctx.beginPath();
  ctx.arc(lockX + lockSize/2, lockY + lockSize*0.4, lockSize*0.3, Math.PI, 0);
  ctx.stroke();
  
  // Body (qulf tanasi)
  ctx.fillRect(lockX + lockSize*0.15, lockY + lockSize*0.35, lockSize*0.7, lockSize*0.55);
  ctx.strokeRect(lockX + lockSize*0.15, lockY + lockSize*0.35, lockSize*0.7, lockSize*0.55);
  
  // Keyhole (teshik)
  ctx.beginPath();
  ctx.arc(lockX + lockSize/2, lockY + lockSize*0.55, lockSize*0.12, 0, Math.PI*2);
  ctx.fill();
  ctx.fillRect(lockX + lockSize*0.44, lockY + lockSize*0.55, lockSize*0.12, lockSize*0.2);

  y = headerY + 35 * k;

  // 3. Name and Date lines
  ctx.font = `700 ${11 * 0.3528 * k}px ${FONT}`;
  ctx.textBaseline = 'alphabetic';
  
  // Ism
  ctx.fillText(lang === 'uz' ? 'Ism:' : (lang === 'ru' ? 'Имя:' : 'Name:'), M, y + 10*k);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.4 * k;
  ctx.beginPath();
  ctx.moveTo(M + 12*k, y + 10*k);
  ctx.lineTo(W/2 - 10*k, y + 10*k);
  ctx.stroke();

  // Sana
  ctx.fillText(lang === 'uz' ? 'Sana:' : (lang === 'ru' ? 'Дата:' : 'Date:'), W/2 + 5*k, y + 10*k);
  ctx.beginPath();
  ctx.moveTo(W/2 + 20*k, y + 10*k);
  ctx.lineTo(W - M - 15*k, y + 10*k);
  ctx.stroke();

  y += 20 * k;

  // 4. Instructions Box
  const instTop = y;
  const instH = 32 * k;
  
  // Border
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.5 * k;
  ctx.strokeRect(M, y, W - 2*M, instH);
  
  // Text
  ctx.fillStyle = '#000000';
  ctx.font = `700 ${11 * 0.3528 * k}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const instLine1 = lang === 'uz' ? 'Har bir qatorda 3 ta raqam bor. Yonidagi yozuv shu raqamlarning qanchasi to\'g\'ri ekanligini aytadi.' : (lang === 'ru' ? 'В каждой строке 3 цифры. Текст рядом говорит, сколько из них верно.' : 'Each row has 3 digits. The text tells how many are correct.');
  
  // Wrap text
  const words = instLine1.split(' ');
  let line = '';
  let lineY = y + 4 * k;
  const maxWidth = W - 2*M - 10*k;
  
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, M + 5*k, lineY);
      line = words[n] + ' ';
      lineY += 12 * k;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, M + 5*k, lineY);
  
  // Legend (belgilar)
  const legendY = y + 22 * k;
  ctx.font = `700 ${9 * 0.3528 * k}px ${FONT}`;
  ctx.textBaseline = 'middle';
  
  // Symbol: fill (to'ldirilgan doira)
  const sym1X = M + 5*k;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(sym1X, legendY, 2.5*k, 0, Math.PI*2);
  ctx.fill();
  ctx.fillText(lang === 'uz' ? 'raqam to\'g\'ri va o\'z joyida' : (lang === 'ru' ? 'цифра верная и на своём месте' : 'correct digit, correct place'), sym1X + 6*k, legendY);
  
  // Symbol: ring (bo'sh doira)
  const sym2X = M + (W - 2*M)/2;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.5 * k;
  ctx.beginPath();
  ctx.arc(sym2X, legendY, 2.5*k, 0, Math.PI*2);
  ctx.stroke();
  ctx.fillText(lang === 'uz' ? 'raqam to\'g\'ri, lekin boshqa joyda' : (lang === 'ru' ? 'цифра верная, но в другом месте' : 'correct digit, wrong place'), sym2X + 6*k, legendY);
  
  // Symbol: none (X)
  const sym3X = W - M - 120*k;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.5 * k;
  ctx.beginPath();
  ctx.moveTo(sym3X - 2.5*k, legendY - 2.5*k);
  ctx.lineTo(sym3X + 2.5*k, legendY + 2.5*k);
  ctx.moveTo(sym3X + 2.5*k, legendY - 2.5*k);
  ctx.lineTo(sym3X - 2.5*k, legendY + 2.5*k);
  ctx.stroke();
  ctx.fillText(lang === 'uz' ? 'hech narsa to\'g\'ri emas' : (lang === 'ru' ? 'ничего не верно' : 'nothing is correct'), sym3X + 6*k, legendY);

  // Dashed line
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.3 * k;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(M, legendY + 6*k);
  ctx.lineTo(W - M, legendY + 6*k);
  ctx.stroke();
  ctx.setLineDash([]);

  y = instTop + instH + 10 * k;

  // 5. CLUES
  const clueH = 26 * k;
  
  state.clues.forEach((clue, idx) => {
    const clueY = y + idx * clueH;
    
    // Horizontal lines
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.3 * k;
    ctx.beginPath();
    ctx.moveTo(M, clueY);
    ctx.lineTo(W - M, clueY);
    ctx.stroke();
    
    if (idx === 0) {
      ctx.beginPath();
      ctx.moveTo(M, clueY + clueH);
      ctx.lineTo(W - M, clueY + clueH);
      ctx.stroke();
    }

    // Clue number (circle)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.5 * k;
    ctx.beginPath();
    ctx.arc(M + 9*k, clueY + clueH/2, 4.5*k, 0, Math.PI*2);
    ctx.stroke();
    
    ctx.fillStyle = '#000000';
    ctx.font = `900 ${11 * 0.3528 * k}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((idx + 1).toString(), M + 9*k, clueY + clueH/2 + 1*k);

    // Digits (3 boxes)
    const digitsStartX = M + 25*k;
    const digitSize = 16 * k;
    const digitGap = 4 * k;
    
    ctx.font = `900 ${20 * 0.3528 * k}px ${FONT}`;
    clue.guess.forEach((digit, dIdx) => {
      const dx = digitsStartX + dIdx * (digitSize + digitGap);
      const dy = clueY + clueH/2;
      
      // Box
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 0.8 * k;
      ctx.strokeRect(dx - digitSize/2, dy - digitSize/2, digitSize, digitSize);
      
      ctx.fillStyle = '#000000';
      ctx.fillText(digit.toString(), dx, dy + 1*k);
    });

    // Dashed vertical separator
    const sepX = digitsStartX + 3*(digitSize + digitGap) + 10*k;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.3 * k;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(sepX, clueY + 2*k);
    ctx.lineTo(sepX, clueY + clueH - 2*k);
    ctx.stroke();
    ctx.setLineDash([]);

    // Symbols based on clue
    const symsX = sepX + 10*k;
    const symsY = clueY + clueH/2;
    let symOffset = 0;
    
    if (clue.correctPlace > 0) {
      for (let s = 0; s < clue.correctPlace; s++) {
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(symsX + symOffset, symsY, 2.5*k, 0, Math.PI*2);
        ctx.fill();
        symOffset += 6*k;
      }
    }
    if (clue.wrongPlace > 0) {
      for (let s = 0; s < clue.wrongPlace; s++) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 0.5 * k;
        ctx.beginPath();
        ctx.arc(symsX + symOffset, symsY, 2.5*k, 0, Math.PI*2);
        ctx.stroke();
        symOffset += 6*k;
      }
    }
    if (clue.correctPlace === 0 && clue.wrongPlace === 0) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 0.5 * k;
      ctx.beginPath();
      ctx.moveTo(symsX - 2.5*k, symsY - 2.5*k);
      ctx.lineTo(symsX + 2.5*k, symsY + 2.5*k);
      ctx.moveTo(symsX + 2.5*k, symsY - 2.5*k);
      ctx.lineTo(symsX - 2.5*k, symsY + 2.5*k);
      ctx.stroke();
      symOffset += 6*k;
    }

    // Hint text
    ctx.font = `700 ${11 * 0.3528 * k}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#000000';
    ctx.fillText(getClueText(clue, lang), symsX + symOffset + 5*k, symsY);
  });

  y += 5 * clueH + 20 * k;

  // 6. Answer Section
  ctx.fillStyle = '#000000';
  ctx.font = `900 ${18 * 0.3528 * k}px ${FONT}`;
  ctx.textAlign = 'center';
  const ansTitle = lang === 'uz' ? 'JAVOB:' : (lang === 'ru' ? 'ОТВЕТ:' : 'ANSWER:');
  ctx.fillText(ansTitle, W/2, y);
  y += 12 * k;

  const boxSize = 40 * k;
  const boxGap = 12 * k;
  const totalW = state.codeLength * boxSize + (state.codeLength - 1) * boxGap;
  const startX = (W - totalW) / 2;

  for (let i = 0; i < state.codeLength; i++) {
    const bx = startX + i * (boxSize + boxGap);
    
    // Box
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.2 * k;
    ctx.strokeRect(bx, y, boxSize, boxSize);

    // Dashed lines inside
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.3 * k;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(bx + 6*k, y + 9*k);
    ctx.lineTo(bx + boxSize - 6*k, y + 9*k);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(bx + 6*k, y + boxSize - 9*k);
    ctx.lineTo(bx + boxSize - 6*k, y + boxSize - 9*k);
    ctx.stroke();
    ctx.setLineDash([]);

    // If answer is included
    if (withAnswer) {
      ctx.fillStyle = '#000000';
      ctx.font = `900 ${32 * 0.3528 * k}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(state.secretCode[i].toString(), bx + boxSize/2, y + boxSize/2);
    }

    // Label (1, 2, 3)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.5 * k;
    ctx.beginPath();
    ctx.arc(bx + boxSize/2, y + boxSize + 8*k, 4*k, 0, Math.PI*2);
    ctx.stroke();
    
    ctx.fillStyle = '#000000';
    ctx.font = `900 ${12 * 0.3528 * k}px ${FONT}`;
    ctx.fillText((i + 1).toString(), bx + boxSize/2, y + boxSize + 9*k);
  }

  // 7. Footer
  const footerY = H - 13 * k;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.5 * k;
  ctx.beginPath();
  ctx.moveTo(M, footerY);
  ctx.lineTo(W - M, footerY);
  ctx.stroke();

  ctx.fillStyle = '#000000';
  ctx.font = `900 ${13 * 0.3528 * k}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(lang === 'uz' ? 'Topshiriqlar Lab' : (lang === 'ru' ? 'Лаборатория головоломок' : 'Puzzle Lab'), M, footerY + 8*k);

  ctx.font = `700 ${9 * 0.3528 * k}px ${FONT}`;
  ctx.textAlign = 'right';
  const footerText = lang === 'uz' ? 'Kodni topdingmi? Javobingni tekshirib ko\'r!' : (lang === 'ru' ? 'Нашёл код? Проверь свой ответ!' : 'Found the code? Check your answer!');
  ctx.fillText(footerText, W - M, footerY + 8*k);
}

export function exportPdf(withAnswer) {
  const c = document.createElement('canvas');
  drawPdfSheet(c, 300 / 25.4, withAnswer);
  
  c.toBlob(async blob => {
    if (!blob) {
      alert('PDF yaratishda xatolik yuz berdi');
      return;
    }
    const jpeg = new Uint8Array(await blob.arrayBuffer());
    const lang = getLang();
    const fileName = lang === 'uz' 
      ? (withAnswer ? `Kodni topish (Javob).pdf` : `Kodni topish.pdf`)
      : (lang === 'ru' ? (withAnswer ? `Угадайте код (Ответ).pdf` : `Угадайте код.pdf`) 
      : (withAnswer ? `Code Breaker (Answer).pdf` : `Code Breaker.pdf`));
    const pdf = makePdf(jpeg, c.width, c.height);
    downloadPdf(pdf, fileName);
  }, 'image/jpeg', 0.93);
}
