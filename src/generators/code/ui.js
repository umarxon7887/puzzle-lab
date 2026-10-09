import { generateSecretCode, generateClues, getClueText } from './logic.js';

// PDF nomiga timestamp qo'shish uchun yordamchi funksiya
function addTimestampToFileName(fileName) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return `${fileName}_${timestamp}`;
  return `${fileName.slice(0, lastDot)}_${timestamp}${fileName.slice(lastDot)}`;
}
import { t, getLang } from '../../core/i18n.js';
import { makePdf, downloadPdf } from '../../core/pdf.js';
import { renderActionBar } from '../../components/ActionBar.js';

let state = {
  codeLength: 3, secretCode: '', clues: [], userAnswer: [],
  showSettings: false, includeAnswerInPdf: false
};

const FONT = '"Nunito","Trebuchet MS",Arial,sans-serif';

export function init(container) { startNewGame(); render(container); }

function startNewGame() {
  state.secretCode = generateSecretCode(state.codeLength);
  state.clues = generateClues(state.secretCode, 5);
  state.userAnswer = new Array(state.codeLength).fill('');
  state.showSettings = false;
}

function render(container) {
  if (state.showSettings) { renderSettingsModal(container); return; }
  const lang = getLang();
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
            <div class="clue-guess">${clue.guess.split('').join(' ')}</div>
            <div class="clue-text">${getClueText(clue, lang)}</div>
          </div>
        `).join('')}
      </div>
      <div style="text-align:center; font-weight:800; font-size:16px; color:var(--text); margin-bottom:12px;">${t('yourAnswer')}</div>
      <div class="answer-input" id="answerInput">${inputsHtml}</div>
    </div>
  `;

  renderActionBar(container, {
    primaryText: `✓ ${t('checkAnswer')}`,
    primaryAction: () => checkAnswer(container),
    showNew: true, showPdf: true, showSettings: true,
    onNew: () => { startNewGame(); render(container); },
    onPdfTask: () => exportPdf(false),
    onPdfAnswer: () => exportPdf(true),
    onSettings: () => { state.showSettings = true; render(container); },
    i18n: { new: t('newGame'), pdf: 'PDF', pdfTask: t('pdfTask'), pdfAnswer: t('pdfAnswer'), settings: t('settingsTitle'), showAnswer: t('showAnswer'), hideAnswer: t('hideAnswer') }
  });

  attachInputEvents(container);
}

function checkAnswer(container) {
  const answer = [];
  for (let i = 0; i < state.codeLength; i++) {
    const val = container.querySelector(`#ans${i}`).value;
    if (val === '') { alert(t('enterAllDigits')); return; }
    answer.push(parseInt(val));
  }
  const isCorrect = answer.every((val, idx) => val === parseInt(state.secretCode[idx]));
  if (isCorrect) { alert(t('correctAnswer')); revealAnswer(container); }
  else { alert(t('wrongAnswer')); }
}

function revealAnswer(container) {
  for (let i = 0; i < state.codeLength; i++) {
    const input = container.querySelector(`#ans${i}`);
    input.value = state.secretCode[i];
    input.classList.add('correct');
    input.disabled = true;
  }
}

function attachInputEvents(container) {
  for (let i = 0; i < state.codeLength; i++) {
    const input = container.querySelector(`#ans${i}`);
    input.addEventListener('input', (e) => {
      state.userAnswer[i] = e.target.value;
      if (e.target.value.length === 1 && i < state.codeLength - 1) container.querySelector(`#ans${i+1}`).focus();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (i < state.codeLength - 1) container.querySelector(`#ans${i+1}`).focus();
        else checkAnswer(container);
      }
    });
  }
}

function renderSettingsModal(container) {
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
  container.querySelector('#modalOverlay').addEventListener('click', (e) => { if (e.target.id === 'modalOverlay') { state.showSettings = false; render(container); }});
  container.querySelector('#cancelSettingsBtn').addEventListener('click', () => { state.showSettings = false; render(container); });
  container.querySelector('#saveSettingsBtn').addEventListener('click', () => {
    state.codeLength = parseInt(container.querySelector('#settingsLength').value);
    state.includeAnswerInPdf = container.querySelector('#settingsIncludeAnswer').checked;
    state.showSettings = false;
    startNewGame();
    render(container);
  });
}

// ==========================================
// PDF CHIZISH FUNKSIYASI (YANGI DIZAYN)
// ==========================================
function drawPdfSheet(canvas, k, withAnswer) {
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
  y += 14 * k;

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
  y += 20 * k;

  // 4. Topshiriq ramkasi (rounded rectangle)
  const boxSize = 12 * k;
  const boxGap = 2 * k;
  const clueHeight = boxSize + 6 * k;
  const totalClueHeight = state.clues.length * clueHeight;
  const taskHeight = totalClueHeight + 60 * k; // + sarlavha + javob
  
  const taskStartY = y;
  const taskWidth = W - 2*M;
  const cornerRadius = 8 * k;
  
  // Ramka chizish
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(M + cornerRadius, taskStartY);
  ctx.lineTo(M + taskWidth - cornerRadius, taskStartY);
  ctx.quadraticCurveTo(M + taskWidth, taskStartY, M + taskWidth, taskStartY + cornerRadius);
  ctx.lineTo(M + taskWidth, taskStartY + taskHeight - cornerRadius);
  ctx.quadraticCurveTo(M + taskWidth, taskStartY + taskHeight, M + taskWidth - cornerRadius, taskStartY + taskHeight);
  ctx.lineTo(M + cornerRadius, taskStartY + taskHeight);
  ctx.quadraticCurveTo(M, taskStartY + taskHeight, M, taskStartY + taskHeight - cornerRadius);
  ctx.lineTo(M, taskStartY + cornerRadius);
  ctx.quadraticCurveTo(M, taskStartY, M + cornerRadius, taskStartY);
  ctx.closePath();
  ctx.stroke();
  
  y += 10 * k;

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
  y += 22 * k;

  // 7. Ipuqlar
  const startX = M + 15 * k;
  
  state.clues.forEach((clue, clueIdx) => {
    const rowY = y + clueIdx * clueHeight;
    
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

    // Belgi
    const symbolX = startX + state.codeLength * (boxSize + boxGap) + 8 * k;
    ctx.font = `900 ${12 * 0.3528 * k}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000000';
    
    let symbol = '✕';
    if (clue.correctPlace > 0 && clue.wrongPlace === 0) symbol = '✓';
    else if (clue.correctPlace === 0 && clue.wrongPlace > 0) symbol = '↔';
    else if (clue.correctPlace > 0 && clue.wrongPlace > 0) symbol = '✓';
    
    ctx.fillText(symbol, symbolX, rowY + boxSize/2);

    // Izoh matni
    ctx.font = `600 ${9 * 0.3528 * k}px ${FONT}`;
    ctx.fillText(getClueText(clue, lang), symbolX + 18 * k, rowY + boxSize/2);
  });

  y += totalClueHeight + 12 * k;

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
    
    let ansY = M + 20 * k;
    
    // Sarlavha
    ctx.fillStyle = '#000000';
    ctx.font = `900 ${16 * 0.3528 * k}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const teacherTitle = lang === 'uz' ? "JAVOBLAR (o'qituvchi uchun)" : (lang === 'ru' ? "ОТВЕТЫ (для учителя)" : "ANSWERS (for teacher)");
    ctx.fillText(teacherTitle, M, ansY);
    ansY += 30 * k;

    // Javoblar ro'yxati
    ctx.font = `700 ${11 * 0.3528 * k}px ${FONT}`;
    const taskLabel = lang === 'uz' ? "1-topshiriq:" : (lang === 'ru' ? "1-задание:" : "Task 1:");
    ctx.fillText(taskLabel, M, ansY);

    const codeStr = state.secretCode.split('').join('  ');
    ctx.font = `900 ${13 * 0.3528 * k}px ${FONT}`;
    ctx.fillText(codeStr, M + 50 * k, ansY);
  }
}

export function exportPdf(withAnswer) {
  const c = document.createElement('canvas');
  drawPdfSheet(c, 300 / 25.4, withAnswer);
  c.toBlob(async blob => {
    if (!blob) { alert('PDF yaratishda xatolik yuz berdi'); return; }
    const jpeg = new Uint8Array(await blob.arrayBuffer());
    const lang = getLang();
    const fileName = lang === 'uz'
      ? (withAnswer ? `Kodni topish (Javob).pdf` : `Kodni topish.pdf`)
      : (lang === 'ru' ? (withAnswer ? `Угадайте код (Ответ).pdf` : `Угадайте код.pdf`)
      : (withAnswer ? `Code Breaker (Answer).pdf` : `Code Breaker.pdf`));
    const pdf = makePdf(jpeg, c.width, c.height);
    downloadPdf(pdf, addTimestampToFileName(fileName));
  }, 'image/jpeg', 0.93);
}

export function drawCodeForPack(canvas, k, seed, config, showSolution) {
  const savedState = { ...state };
  state.codeLength = config.codeLength || 3;
  state.secretCode = generateSecretCode(state.codeLength);
  state.clues = generateClues(state.secretCode, 5);
  drawPdfSheet(canvas, k, showSolution);
  Object.assign(state, savedState);
}
