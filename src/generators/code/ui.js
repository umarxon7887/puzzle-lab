import { generateSecretCode, generateClues, getClueText } from './logic.js';
import { t, getLang } from '../../core/i18n.js';
import { makePdf, downloadPdf } from '../../core/pdf.js';

let state = {
  codeLength: 3,
  secretCode: [],
  clues: [],
  userAnswer: []
};

const FONT = '"Nunito","Trebuchet MS","DejaVu Sans",Arial,sans-serif';

export function init(container) {
  startNewGame();
  render(container);
}

function startNewGame() {
  state.secretCode = generateSecretCode(state.codeLength);
  state.clues = generateClues(state.secretCode, 5);
  state.userAnswer = new Array(state.codeLength).fill('');
  console.log("Debug - Secret Code:", state.secretCode);
  console.log("Debug - Clues:", state.clues);
}

function render(container) {
  const lang = getLang();
  
  container.innerHTML = `
    <div class="card">
      <h2>🔐 ${t('codeGameTitle')}</h2>
      <p style="color:#6B7280; margin-bottom:16px;">${t('codeGameDesc')}</p>
      
      <div style="margin-bottom:16px;">
        <span class="section-label">${t('codeLengthLabel')}</span>
        <div class="level-grid" id="codeLengthPicker">
          <button data-length="3" class="${state.codeLength === 3 ? 'selected' : ''}">3 ${t('digits')}</button>
          <button data-length="4" class="${state.codeLength === 4 ? 'selected' : ''}">4 ${t('digits')}</button>
          <button data-length="5" class="${state.codeLength === 5 ? 'selected' : ''}">5 ${t('digits')}</button>
        </div>
      </div>

      <div class="clues-container" id="cluesContainer">
        <h3 style="margin:0 0 12px; font-size:16px;">${t('cluesTitle')}</h3>
        ${state.clues.map((clue, idx) => `
          <div class="clue-item">
            <div class="clue-guess">${clue.guess.join(' ')}</div>
            <div class="clue-text">${getClueText(clue, lang)}</div>
          </div>
        `).join('')}
      </div>

      <div style="margin-top:20px;">
        <span class="section-label">${t('yourAnswer')}</span>
        <div class="answer-input" id="answerInput">
          ${state.codeLength.map((_, i) => 
            `<input type="number" id="ans${i}" min="0" max="9" placeholder="?" maxlength="1" value="${state.userAnswer[i] || ''}">`
          ).join('')}
        </div>
      </div>
      
      <div class="buttons" style="margin-top:20px;">
        <button id="checkAnswerBtn" class="primary">${t('checkAnswer')}</button>
        <button id="newGameBtn">${t('newGameBtn')}</button>
        <button id="revealAnswerBtn">${t('revealAnswer')}</button>
        <button id="downloadPdfBtn">${t('downloadPdf')}</button>
      </div>
    </div>
  `;

  attachEvents(container);
}

function attachEvents(container) {
  // Kod uzunligini tanlash
  container.querySelectorAll('#codeLengthPicker button').forEach(btn => {
    btn.addEventListener('click', () => {
      state.codeLength = parseInt(btn.dataset.length);
      container.querySelectorAll('#codeLengthPicker button').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      startNewGame();
      render(container);
    });
  });

  // Javobni tekshirish
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

    // Javobni tekshirish
    const isCorrect = answer.every((val, idx) => val === state.secretCode[idx]);
    
    if (isCorrect) {
      alert(t('correctAnswer'));
      revealAnswer(container);
    } else {
      alert(t('wrongAnswer'));
    }
  });

  // Yangi o'yin
  container.querySelector('#newGameBtn').addEventListener('click', () => {
    startNewGame();
    render(container);
  });

  // Javobni ko'rsatish
  container.querySelector('#revealAnswerBtn').addEventListener('click', () => {
    revealAnswer(container);
  });

  // PDF yuklab olish
  container.querySelector('#downloadPdfBtn').addEventListener('click', () => {
    try { exportPdf(); } catch(e) { alert('PDF xatosi: ' + e.message); }
  });

  // Inputlar orasida avtomatik o'tish
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
        if (i < state.codeLength - 1) {
          container.querySelector(`#ans${i+1}`).focus();
        } else {
          container.querySelector('#checkAnswerBtn').click();
        }
      }
    });
  }
}

function revealAnswer(container) {
  for (let i = 0; i < state.codeLength; i++) {
    const input = container.querySelector(`#ans${i}`);
    input.value = state.secretCode[i];
    input.style.background = '#D1FAE5';
    input.style.borderColor = '#10B981';
  }
}

function drawPdfSheet(canvas, k) {
  const lang = getLang();
  const ctx = canvas.getContext('2d');
  canvas.width = Math.round(210 * k);
  canvas.height = Math.round(297 * k);
  
  // Oq fon
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const M = 20; // Margin
  const titleY = M;
  
  // Sarlavha
  ctx.font = `bold ${24 * 0.3528 * k}px ${FONT}`;
  ctx.fillStyle = '#1f2a44';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const title = lang === 'uz' ? 'Kodni toping!' : (lang === 'ru' ? 'Угадайте код!' : 'Crack the Code!');
  ctx.fillText(title, 105 * k, titleY * k);

  // Tavsif
  ctx.font = `${14 * 0.3528 * k}px ${FONT}`;
  ctx.fillStyle = '#6B7280';
  const desc = lang === 'uz' 
    ? 'Quyidagi ipuclardan foydalanib, maxfiy kodni toping.'
    : (lang === 'ru' ? 'Используйте подсказки ниже, чтобы найти секретный код.' : 'Use the clues below to find the secret code.');
  ctx.fillText(desc, 105 * k, (titleY + 10) * k);

  // Ipuclar
  const clueStartY = titleY + 25;
  const clueHeight = 15;
  
  state.clues.forEach((clue, idx) => {
    const y = clueStartY + idx * clueHeight;
    
    // Taxmin raqamlari
    ctx.font = `bold ${16 * 0.3528 * k}px ${FONT}`;
    ctx.fillStyle = '#1f2a44';
    ctx.textAlign = 'left';
    const guessText = clue.guess.join('  ');
    ctx.fillText(guessText, M * k, y * k);
    
    // Ipucu matni
    ctx.font = `${12 * 0.3528 * k}px ${FONT}`;
    ctx.fillStyle = '#4B5563';
    ctx.textAlign = 'right';
    const clueText = getClueText(clue, lang);
    ctx.fillText(clueText, (210 - M) * k, y * k);
  });

  // Javob kataklari
  const answerY = clueStartY + state.clues.length * clueHeight + 15;
  ctx.font = `bold ${14 * 0.3528 * k}px ${FONT}`;
  ctx.fillStyle = '#1f2a44';
  ctx.textAlign = 'center';
  const answerLabel = lang === 'uz' ? 'Javob:' : (lang === 'ru' ? 'Ответ:' : 'Answer:');
  ctx.fillText(answerLabel, 105 * k, answerY * k);

  const boxSize = 12;
  const boxGap = 5;
  const totalWidth = state.codeLength * boxSize + (state.codeLength - 1) * boxGap;
  const startX = 105 - totalWidth / 2;

  for (let i = 0; i < state.codeLength; i++) {
    const x = startX + i * (boxSize + boxGap);
    ctx.strokeStyle = '#1f2a44';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x * k, (answerY + 5) * k, boxSize * k, boxSize * k);
  }

  // Pastki qism (raqam)
  ctx.font = `${10 * 0.3528 * k}px ${FONT}`;
  ctx.fillStyle = '#9CA3AF';
  ctx.textAlign = 'right';
  const footer = lang === 'uz' ? 'Topshiriqlar Lab' : (lang === 'ru' ? 'Лаборатория головоломок' : 'Puzzle Lab');
  ctx.fillText(footer, (210 - M) * k, (297 - M) * k);
}

export function exportPdf() {
  const c = document.createElement('canvas');
  drawPdfSheet(c, 300 / 25.4); // 300 DPI
  
  c.toBlob(async blob => {
    if (!blob) {
      alert('PDF yaratishda xatolik yuz berdi');
      return;
    }
    const jpeg = new Uint8Array(await blob.arrayBuffer());
    const lang = getLang();
    const fileName = lang === 'uz' 
      ? `Kodni topish topshirig'i.pdf`
      : (lang === 'ru' ? 'Угадайте код.pdf' : 'Code Breaker.pdf');
    const pdf = makePdf(jpeg, c.width, c.height);
    downloadPdf(pdf, fileName);
  }, 'image/jpeg', 0.93);
}
