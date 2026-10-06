import { generateSecretCode, generateClues, getClueText } from './logic.js';
import { t, getLang } from '../../core/i18n.js';
import { makePdf, downloadPdf } from '../../core/pdf.js';
import { renderActionBar } from '../../components/ActionBar.js';

let state = {
  codeLength: 3,
  secretCode: [],
  clues: [],
  userAnswer: [],
  showSettings: false,
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
            <div class="clue-guess">${clue.guess.join(' ')}</div>
            <div class="clue-text">${getClueText(clue, lang)}</div>
          </div>
        `).join('')}
      </div>
      <div style="text-align:center; font-weight:800; font-size:16px; color:var(--text); margin-bottom:12px;">
        ${t('yourAnswer')}
      </div>
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
    i18n: {
      new: t('newGameBtn'), pdf: 'PDF', pdfTask: t('pdfTask'),
      pdfAnswer: t('pdfAnswer'), settings: 'Sozlamalar'
    }
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
  const isCorrect = answer.every((val, idx) => val === state.secretCode[idx]);
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
      if (e.target.value.length === 1 && i < state.codeLength - 1) {
        container.querySelector(`#ans${i+1}`).focus();
      }
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
  container.querySelector('#modalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay') { state.showSettings = false; render(container); }
  });
  container.querySelector('#cancelSettingsBtn').addEventListener('click', () => { state.showSettings = false; render(container); });
  container.querySelector('#saveSettingsBtn').addEventListener('click', () => {
    state.codeLength = parseInt(container.querySelector('#settingsLength').value);
    state.includeAnswerInPdf = container.querySelector('#settingsIncludeAnswer').checked;
    state.showSettings = false;
    startNewGame();
    render(container);
  });
}

function drawPdfSheet(canvas, k, withAnswer) {
  const lang = getLang();
  const ctx = canvas.getContext('2d');
  const W = 210 * k, H = 297 * k;
  canvas.width = W; canvas.height = H;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);
  const M = 14 * k;
  let y = M;
  const headerH = 35 * k;
  ctx.fillStyle = '#000000';
  ctx.fillRect(M, y, W - 2*M, headerH);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 ${24 * 0.3528 * k}px ${FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const title = lang === 'uz' ? 'KODNI TOPING!' : (lang === 'ru' ? 'УГАДАЙТЕ КОД!' : 'CRACK THE CODE!');
  ctx.fillText(title, W/2, y + headerH/2);
  y += headerH + 15 * k;
  const instH = 30 * k;
  ctx.fillStyle = '#F3F4F6';
  ctx.fillRect(M, y, W - 2*M, instH);
  ctx.strokeStyle = '#9CA3AF';
  ctx.lineWidth = 2;
  ctx.strokeRect(M, y, W - 2*M, instH);
  ctx.fillStyle = '#111827';
  ctx.font = `700 ${11 * 0.3528 * k}px ${FONT}`;
  ctx.textAlign = 'center';
  const instText = lang === 'uz' ? 'Har bir qatorda raqamlar bor. Yonidagi yozuv shu raqamlarning qanchasi to\'g\'ri ekanligini aytadi.' : (lang === 'ru' ? 'В каждой строке есть цифры. Текст говорит, сколько из них верно.' : 'Each row has digits. The text tells how many are correct.');
  ctx.fillText(instText, W/2, y + instH/2);
  y += instH + 15 * k;
  const clueH = 22 * k;
  const clueGap = 4 * k;
  state.clues.forEach((clue, idx) => {
    ctx.fillStyle = idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
    ctx.fillRect(M, y, W - 2*M, clueH);
    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 1;
    ctx.strokeRect(M + 1*k, y + 1*k, W - 2*M - 2*k, clueH - 2*k);
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(M + 12*k, y + clueH/2, 7*k, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 ${10 * 0.3528 * k}px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText((idx + 1).toString(), M + 12*k, y + clueH/2 + 1*k);
    ctx.font = `900 ${18 * 0.3528 * k}px ${FONT}`;
    ctx.fillStyle = '#000000';
    clue.guess.forEach((digit, dIdx) => {
      const dx = M + 30*k + dIdx * 16*k;
      const dy = y + clueH/2;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(dx - 7*k, dy - 8*k, 14*k, 16*k);
      ctx.fillText(digit.toString(), dx, dy + 1*k);
    });
    ctx.textAlign = 'left';
    ctx.font = `700 ${11 * 0.3528 * k}px ${FONT}`;
    ctx.fillStyle = '#374151';
    const hintX = M + 85*k;
    ctx.fillText(getClueText(clue, lang), hintX + 10*k, y + clueH/2 + 1*k);
    const iconX = hintX;
    const iconY = y + clueH/2;
    ctx.font = `900 ${12 * 0.3528 * k}px ${FONT}`;
    if (clue.correctPlace > 0 && clue.wrongPlace === 0) { ctx.fillStyle = '#000000'; ctx.fillText('✓', iconX, iconY + 1*k); }
    else if (clue.correctPlace === 0 && clue.wrongPlace > 0) { ctx.fillStyle = '#000000'; ctx.fillText('↻', iconX, iconY + 1*k); }
    else if (clue.correctPlace === 0 && clue.wrongPlace === 0) { ctx.fillStyle = '#000000'; ctx.fillText('✕', iconX, iconY + 1*k); }
    else { ctx.fillStyle = '#000000'; ctx.fillText('', iconX, iconY + 1*k); }
    y += clueH + clueGap;
  });
  y += 20 * k;
  ctx.fillStyle = '#000000';
  ctx.font = `900 ${16 * 0.3528 * k}px ${FONT}`;
  ctx.textAlign = 'center';
  const ansTitle = lang === 'uz' ? 'JAVOB:' : (lang === 'ru' ? 'ОТВЕТ:' : 'ANSWER:');
  ctx.fillText(ansTitle, W/2, y);
  y += 12 * k;
  const boxSize = 60 * k;
  const boxGap = 20 * k;
  const totalW = state.codeLength * boxSize + (state.codeLength - 1) * boxGap;
  const startX = (W - totalW) / 2;
  for (let i = 0; i < state.codeLength; i++) {
    const bx = startX + i * (boxSize + boxGap);
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeRect(bx, y, boxSize, boxSize);
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    for (let line = 1; line <= 3; line++) {
      const lineY = y + (boxSize * line / 4);
      ctx.beginPath();
      ctx.moveTo(bx + 8*k, lineY);
      ctx.lineTo(bx + boxSize - 8*k, lineY);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    if (withAnswer) {
      ctx.fillStyle = '#000000';
      ctx.font = `900 ${36 * 0.3528 * k}px ${FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(state.secretCode[i].toString(), bx + boxSize/2, y + boxSize/2);
    }
    ctx.fillStyle = '#000000';
    ctx.font = `700 ${11 * 0.3528 * k}px ${FONT}`;
    ctx.fillText((i + 1).toString(), bx + boxSize/2, y + boxSize + 8*k);
  }
  y = H - 15 * k;
  ctx.fillStyle = '#6B7280';
  ctx.font = `700 ${9 * 0.3528 * k}px ${FONT}`;
  ctx.textAlign = 'center';
  const footer = lang === 'uz' ? 'Topshiriqlar Lab' : (lang === 'ru' ? 'Лаборатория головоломок' : 'Puzzle Lab');
  ctx.fillText(footer, W/2, y);
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
    downloadPdf(pdf, fileName);
  }, 'image/jpeg', 0.93);
}
