import { generateSecretCode, checkGuess } from './logic.js';
import { t, getLang } from '../../core/i18n.js';

let state = {
  codeLength: 3,
  secretCode: [],
  attempts: []
};

export function init(container) {
  state.secretCode = generateSecretCode(state.codeLength);
  state.attempts = [];
  render(container);
}

function render(container) {
  container.innerHTML = `
    <div class="card">
      <h2>${t('gameTitle')}</h2>
      <p style="color:#6B7280; margin-bottom:16px;">${t('gameDesc')}</p>
      
      <div style="margin-bottom:16px;">
        <span class="section-label">Kod uzunligi</span>
        <div class="level-grid" id="codeLengthPicker">
          <button data-length="3" class="${state.codeLength === 3 ? 'selected' : ''}">3 xonali</button>
          <button data-length="4" class="${state.codeLength === 4 ? 'selected' : ''}">4 xonali</button>
          <button data-length="5" class="${state.codeLength === 5 ? 'selected' : ''}">5 xonali</button>
        </div>
      </div>
      
      <div class="code-display" id="codeDisplay">
        ${Array(state.codeLength).fill('<div class="code-box hidden">?</div>').join('')}
      </div>

      <div class="guess-input" id="guessInput">
        ${Array(state.codeLength).fill('').map((_, i) => 
          `<input type="number" id="d${i+1}" min="0" max="9" placeholder="0" maxlength="1">`
        ).join('')}
      </div>
      
      <div class="buttons" style="margin-top:16px;">
        <button id="checkBtn" class="primary">${t('checkBtn')}</button>
        <button id="newGameBtn">${t('newGameBtn')}</button>
        <button id="revealBtn">${t('revealBtn')}</button>
      </div>
    </div>

    <div class="card" id="attemptsCard" style="display:none;">
      <h2>${t('attempts')}</h2>
      <div id="attemptsList"></div>
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

  container.querySelector('#newGameBtn').addEventListener('click', () => {
    startNewGame();
    render(container);
  });

  container.querySelector('#revealBtn').addEventListener('click', () => {
    revealCode(container);
  });

  container.querySelector('#checkBtn').addEventListener('click', () => {
    const guess = [];
    for (let i = 1; i <= state.codeLength; i++) {
      const val = container.querySelector(`#d${i}`).value;
      if (val === '') {
        alert(t('enterAll'));
        return;
      }
      guess.push(parseInt(val));
    }

    const result = checkGuess(state.secretCode, guess);
    state.attempts.push({ guess, result });
    
    renderAttempts(container);
    
    if (result.correctPlace === state.codeLength) {
      setTimeout(() => {
        alert(t('win'));
        revealCode(container);
      }, 100);
    }

    // Inputlarni tozalash
    for (let i = 1; i <= state.codeLength; i++) {
      container.querySelector(`#d${i}`).value = '';
    }
    container.querySelector('#d1').focus();
  });

  // Inputlar orasida avtomatik o'tish
  for (let i = 1; i <= state.codeLength; i++) {
    const input = container.querySelector(`#d${i}`);
    input.addEventListener('input', (e) => {
      if (e.target.value.length === 1 && i < state.codeLength) {
        container.querySelector(`#d${i+1}`).focus();
      }
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (i < state.codeLength) {
          container.querySelector(`#d${i+1}`).focus();
        } else {
          container.querySelector('#checkBtn').click();
        }
      }
    });
  }
}

function startNewGame() {
  state.secretCode = generateSecretCode(state.codeLength);
  state.attempts = [];
  console.log("Debug - Secret Code:", state.secretCode);
}

function renderAttempts(container) {
  const list = container.querySelector('#attemptsList');
  const card = container.querySelector('#attemptsCard');
  card.style.display = 'block';
  list.innerHTML = '';

  state.attempts.forEach((att, idx) => {
    const div = document.createElement('div');
    div.className = 'attempt-item';
    
    let clueText = '';
    let clueClass = '';
    
    if (att.result.correctPlace === state.codeLength) {
      clueText = t('win');
      clueClass = 'correct';
    } else if (att.result.total === 0) {
      clueText = t('clueWrong');
      clueClass = 'wrong';
    } else if (att.result.correctPlace > 0 && att.result.wrongPlace > 0) {
      clueText = `${att.result.correctPlace} ${t('clueCorrect')}, ${att.result.wrongPlace} ${t('clueWrongPlace')}`;
      clueClass = 'wrong-place';
    } else if (att.result.correctPlace > 0) {
      clueText = `${att.result.correctPlace} ${t('clueCorrect')}`;
      clueClass = 'correct';
    } else {
      clueText = `${att.result.wrongPlace} ${t('clueWrongPlace')}`;
      clueClass = 'wrong-place';
    }

    div.innerHTML = `
      <div class="attempt-guess">#${idx + 1}: <strong>${att.guess.join(' - ')}</strong></div>
      <div class="clue ${clueClass}">${clueText}</div>
    `;
    list.prepend(div);
  });
}

function revealCode(container) {
  const boxes = container.querySelectorAll('.code-box');
  boxes.forEach((box, i) => {
    if (i < state.secretCode.length) {
      box.textContent = state.secretCode[i];
      box.classList.remove('hidden');
      box.classList.add('correct');
    }
  });
  
  const hintBox = document.createElement('div');
  hintBox.className = 'clue wrong';
  hintBox.style.marginTop = '16px';
  hintBox.innerHTML = `<strong>${t('gameOver')}</strong> ${state.secretCode.join(' - ')}`;
  container.querySelector('.card').appendChild(hintBox);
}

export function exportPDF() {
  console.log("PDF export for Code Breaker - Hali amalga oshirilmagan");
}
