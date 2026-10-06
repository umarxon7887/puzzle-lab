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

  // FIX: Array.from ishlatildi, chunki codeLength son
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
          <button id="pdfDropdownBtn">${t('pdfBtn')} ▼</button>
          <div class="dropdown-menu ${state.showPdfDropdown ? 'show' : ''}" id="pdfDropdown">
            <button id="pdfTaskBtn"> ${t('pdfTask')}</button>
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

function drawPdfSheet(canvas, k, withAnswer) {
  const lang = getLang();
  const ctx = canvas.getContext('2d');
  const W = 210 * k, H = 297 * k;
  canvas.width = W;
  canvas.height = H;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  const M = 20 * k;
  let y = M;

  const headerH = 44 * k;
  const grad = ctx.createLinearGradient(0, y, W, y + headerH);
  grad.addColorStop(0, '#4F46E5');
  grad.addColorStop(1, '#7C3AED');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(M, y, W - 2*M, headerH, 12);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 ${28 * 0.3528 * k}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const title = lang === 'uz' ? ' KODNI TOPING!' : (lang === 'ru' ? '🔐 УГАДАЙТЕ КОД!' : '🔐 CRACK THE CODE!');
  ctx.fillText(title, M + 10*k, y + headerH * 0.35);

  ctx.font = `700 ${14 * 0.3528 * k}px ${FONT}`;
  ctx.fillStyle = '#FDE68A';
  const subtitle = lang === 'uz' ? 'Ipuclardan foydalanib, maxfiy kodni toping' : (lang === 'ru' ? 'Используйте подсказки ниже' : 'Use the clues below');
  ctx.fillText(subtitle, M + 10*k, y + headerH * 0.75);

  y += headerH + 15 * k;

  const instH = 35 * k;
  ctx.fillStyle = '#E0EDFF';
  ctx.strokeStyle = '#B6D2FF';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(M, y, W - 2*M, instH, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1E3A8A';
  ctx.font = `700 ${12 * 0.3528 * k}px ${FONT}`;
  ctx.textAlign = 'left';
  const instText = lang === 'uz' ? 'Har bir qatorda raqamlar bor. Yonidagi yozuv shu raqamlarning qanchasi to\'g\'ri ekanligini aytadi.' : (lang === 'ru' ? 'В каждой строке есть цифры. Текст рядом говорит, сколько из них верно.' : 'Each row has digits. The text tells how many are correct.');
  ctx.fillText(instText, M + 10*k, y + 15 * k);

  y += instH + 15 * k;

  const clueH = 24 * k;
  const clueGap = 4 * k;
  
  state.clues.forEach((clue, idx) => {
    const isOdd = idx % 2 === 0;
    ctx.fillStyle = isOdd ? '#F5F3FF' : '#FFFFFF';
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(M, y, W - 2*M, clueH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#4F46E5';
    ctx.beginPath();
    ctx.arc(M + 15*k, y + clueH/2, 8*k, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 ${11 * 0.3528 * k}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((idx + 1).toString(), M + 15*k, y + clueH/2 + 1*k);

    ctx.font = `900 ${20 * 0.3528 * k}px ${FONT}`;
    ctx.fillStyle = '#4F46E5';
    ctx.textAlign = 'center';
    clue.guess.forEach((digit, dIdx) => {
      const dx = M + 35*k + dIdx * 18*k;
      const dy = y + clueH/2;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(dx - 8*k, dy - 9*k, 16*k, 18*k, 4);
      ctx.fill();
      ctx.strokeStyle = '#4F46E5';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#4F46E5';
      ctx.fillText(digit.toString(), dx, dy + 1*k);
    });

    ctx.textAlign = 'left';
    ctx.font = `700 ${12 * 0.3528 * k}px ${FONT}`;
    ctx.fillStyle = '#4B5563';
    const hintX = M + 100*k;
    ctx.fillText(getClueText(clue, lang), hintX + 12*k, y + clueH/2 + 1*k);

    const dotX = hintX;
    const dotY = y + clueH/2;
    if (clue.correctPlace > 0 && clue.wrongPlace === 0) {
      ctx.fillStyle = '#10B981';
      ctx.beginPath(); ctx.arc(dotX, dotY, 6*k, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.font = `900 ${10 * 0.3528 * k}px ${FONT}`; ctx.fillText('✓', dotX, dotY + 1*k);
    } else if (clue.correctPlace === 0 && clue.wrongPlace > 0) {
      ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(dotX, dotY, 6*k, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#F59E0B'; ctx.font = `900 ${10 * 0.3528 * k}px ${FONT}`; ctx.fillText('↻', dotX, dotY + 1*k);
    } else if (clue.correctPlace === 0 && clue.wrongPlace === 0) {
      ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(dotX, dotY, 6*k, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#EF4444'; ctx.font = `900 ${10 * 0.3528 * k}px ${FONT}`; ctx.fillText('✕', dotX, dotY + 1*k);
    } else {
      ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(dotX, dotY, 6*k, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#F59E0B'; ctx.font = `900 ${10 * 0.3528 * k}px ${FONT}`; ctx.fillText('↻', dotX, dotY + 1*k);
    }

    y += clueH + clueGap;
  });

  y += 15 * k;

  ctx.fillStyle = '#7C3AED';
  ctx.font = `900 ${18 * 0.3528 * k}px ${FONT}`;
  ctx.textAlign = 'center';
  const ansTitle = lang === 'uz' ? 'JAVOB:' : (lang === 'ru' ? 'ОТВЕТ:' : 'ANSWER:');
  ctx.fillText(ansTitle, W/2, y);
  y += 10 * k;

  const boxSize = 40 * k;
  const boxGap = 12 * k;
  const totalW = state.codeLength * boxSize + (state.codeLength - 1) * boxGap;
  const startX = (W - totalW) / 2;

  for (let i = 0; i < state.codeLength; i++) {
    const bx = startX + i * (boxSize + boxGap);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#4F46E5';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(bx, y, boxSize, boxSize, 12);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#A5B4FC';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(bx + 10*k, y + 12*k); ctx.lineTo(bx + boxSize - 10*k, y + 12*k); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + 10*k, y + boxSize - 12*k); ctx.lineTo(bx + boxSize - 10*k, y + boxSize - 12*k); ctx.stroke();
    ctx.setLineDash([]);

    if (withAnswer) {
      ctx.fillStyle = '#10B981';
      ctx.font = `900 ${28 * 0.3528 * k}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(state.secretCode[i].toString(), bx + boxSize/2, y + boxSize/2 + 2*k);
    }

    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(bx + boxSize/2, y + boxSize + 10*k, 8*k, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 ${12 * 0.3528 * k}px ${FONT}`;
    ctx.fillText((i + 1).toString(), bx + boxSize/2, y + boxSize + 11*k);
  }

  y = H - 20 * k;
  ctx.fillStyle = '#6B7280';
  ctx.font = `700 ${10 * 0.3528 * k}px ${FONT}`;
  ctx.textAlign = 'right';
  const footer = lang === 'uz' ? 'Topshiriqlar Lab' : (lang === 'ru' ? 'Лаборатория головоломок' : 'Puzzle Lab');
  ctx.fillText(footer, W - M, y);
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
