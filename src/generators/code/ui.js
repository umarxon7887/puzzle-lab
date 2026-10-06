import { generateSecretCode, checkGuess } from './logic.js';
import { t } from '../../core/i18n.js';

let secretCode = [];
let attempts = [];

export function init(container) {
  startNewGame();
  render(container);
}

function startNewGame() {
  secretCode = generateSecretCode();
  attempts = [];
  console.log("Debug - Secret Code:", secretCode); // O'chirib tashlash mumkin
}

function render(container) {
  container.innerHTML = `
    <div class="card">
      <h2>${t('gameTitle')}</h2>
      <p style="color:#6B7280; margin-bottom:16px;">${t('gameDesc')}</p>
      
      <div class="code-display" id="codeDisplay">
        <div class="code-box hidden">?</div>
        <div class="code-box hidden">?</div>
        <div class="code-box hidden">?</div>
      </div>

      <div class="guess-input">
        <input type="number" id="d1" min="0" max="9" placeholder="0">
        <input type="number" id="d2" min="0" max="9" placeholder="0">
        <input type="number" id="d3" min="0" max="9" placeholder="0">
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
  container.querySelector('#newGameBtn').addEventListener('click', () => {
    startNewGame();
    render(container);
  });

  container.querySelector('#revealBtn').addEventListener('click', () => {
    revealCode(container);
  });

  container.querySelector('#checkBtn').addEventListener('click', () => {
    const d1 = container.querySelector('#d1').value;
    const d2 = container.querySelector('#d2').value;
    const d3 = container.querySelector('#d3').value;
    
    if (d1 === '' || d2 === '' || d3 === '') {
      alert(t('enterAll'));
      return;
    }

    const guess = [parseInt(d1), parseInt(d2), parseInt(d3)];
    const result = checkGuess(secretCode, guess);
    attempts.push({ guess, result });
    
    renderAttempts(container);
    
    if (result.correctPlace === 3) {
      setTimeout(() => {
        alert(t('win'));
        revealCode(container);
      }, 100);
    }

    // Inputlarni tozalash va fokusni birinchisiga qaytarish
    container.querySelector('#d1').value = '';
    container.querySelector('#d2').value = '';
    container.querySelector('#d3').value = '';
    container.querySelector('#d1').focus();
  });

  // Inputlar orasida avtomatik o'tish
  ['d1', 'd2', 'd3'].forEach((id, idx) => {
    const input = container.querySelector(`#${id}`);
    input.addEventListener('input', (e) => {
      if (e.target.value.length === 1 && idx < 2) {
        container.querySelector(`#d${idx + 2}`).focus();
      }
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (idx < 2) container.querySelector(`#d${idx + 2}`).focus();
        else container.querySelector('#checkBtn').click();
      }
    });
  });
}

function renderAttempts(container) {
  const list = container.querySelector('#attemptsList');
  const card = container.querySelector('#attemptsCard');
  card.style.display = 'block';
  list.innerHTML = '';

  attempts.forEach((att, idx) => {
    const div = document.createElement('div');
    div.className = 'attempt-item';
    
    let clueText = '';
    let clueClass = '';
    
    if (att.result.correctPlace === 3) {
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
    box.textContent = secretCode[i];
    box.classList.remove('hidden');
    box.classList.add('correct');
  });
  
  const hintBox = document.createElement('div');
  hintBox.className = 'clue wrong';
  hintBox.style.marginTop = '16px';
  hintBox.innerHTML = `<strong>${t('gameOver')}</strong> ${secretCode.join(' - ')}`;
  container.querySelector('.card').appendChild(hintBox);
}

export function exportPDF() {
  console.log("PDF export for Code Breaker - Hali amalga oshirilmagan");
}
