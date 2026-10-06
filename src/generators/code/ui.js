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
            <div class="clue-guess">${clue.guess.join('')}</div>
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

// ==========================================================
// OQ-QORA PDF DIZAYNI (Canvas) — TUZATILGAN VERSIYA
// Faylingizdagi "YANGI OQ-QORA PDF DIZAYNI" bo'limidan pastdagi
// hamma narsani (drawPdfSheet + exportPdf) shu kod bilan almashtiring.
// state, getLang, getClueText, makePdf, downloadPdf — o'zingizdagi bilan bir xil.
// ==========================================================

const MM_PT = 0.3528; // 1 pt = 0.3528 mm

// Matnni berilgan kenglikka sig'dirib qatorlarga bo'ladi
function wrapLines(ctx, text, maxW) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (line && ctx.measureText(test).width > maxW) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Yumaloq burchakli to'rtburchak yo'li (eski brauzerlarda ham ishlaydi)
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Belgi: 'fill' = ●, 'ring' = ○, 'none' = ✕
function drawSymbol(ctx, kind, cx, cy, r, k) {
  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#000';
  ctx.lineWidth = 0.5 * k;
  ctx.setLineDash([]);
  ctx.beginPath();
  if (kind === 'fill') {
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'ring') {
    ctx.arc(cx, cy, r - 0.25 * k, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    const d = r * 0.85;
    ctx.moveTo(cx - d, cy - d); ctx.lineTo(cx + d, cy + d);
    ctx.moveTo(cx + d, cy - d); ctx.lineTo(cx - d, cy + d);
    ctx.stroke();
  }
}

function drawPdfSheet(canvas, k, withAnswer) {
  const lang = getLang();
  const n = state.codeLength;
  const rows = state.clues.length;
  const ctx = canvas.getContext('2d');
  const W = Math.round(210 * k), H = Math.round(297 * k);
  canvas.width = W;
  canvas.height = H;

  const tr = (uz, ru, en) => (lang === 'uz' ? uz : (lang === 'ru' ? ru : en));
  const setFont = (pt, weight) => { ctx.font = `${weight} ${pt * MM_PT * k}px ${FONT}`; };
  const text = (str, x, y, pt, weight, align, base) => {
    setFont(pt, weight);
    ctx.textAlign = align || 'left';
    ctx.textBaseline = base || 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(str, x, y);
  };
  const hline = (x1, x2, y, lw, dashed) => {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = lw * k;
    ctx.setLineDash(dashed ? [1.2 * k, 1 * k] : []);   // mm da, piksel emas!
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const M = 14 * k;                 // yon chetlar
  const usableW = W - 2 * M;
  const footerY = H - 13 * k;       // pastki chiziq

  // 1. Fon
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  // 2. SARLAVHA + QULF
  const y0 = 12 * k;
  text(tr('KODNI TOPING!', 'УГАДАЙТЕ КОД!', 'CRACK THE CODE!'), M, y0, 30, 900, 'left', 'top');
  text(tr('Ipuclardan foydalanib, maxfiy kodni toping',
          'Используйте подсказки ниже',
          'Use the clues below'), M, y0 + 14 * k, 14, 700, 'left', 'top');

  const L = 24 * k;                       // qulf o'lchami
  const lx = W - M - L, ly = y0;
  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#FFF';
  ctx.lineWidth = 1.6 * k;
  ctx.setLineDash([]);
  ctx.beginPath();                        // halqa
  ctx.arc(lx + L / 2, ly + L * 0.40, L * 0.28, Math.PI, 0);
  ctx.stroke();
  ctx.fillRect(lx + L * 0.12, ly + L * 0.38, L * 0.76, L * 0.58);   // tana
  ctx.strokeRect(lx + L * 0.12, ly + L * 0.38, L * 0.76, L * 0.58);
  ctx.fillStyle = '#000';                 // kalit teshigi
  ctx.beginPath();
  ctx.arc(lx + L / 2, ly + L * 0.60, L * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(lx + L * 0.46, ly + L * 0.62, L * 0.08, L * 0.15);

  const ruleY = y0 + 27 * k;
  hline(M, W - M, ruleY, 1.2, false);

  // 3. ISM / SANA
  const nameY = ruleY + 9 * k;
  const ismLbl = tr('Ism:', 'Имя:', 'Name:');
  const sanaLbl = tr('Sana:', 'Дата:', 'Date:');
  text(ismLbl, M, nameY, 11, 700, 'left', 'alphabetic');
  const ismW = ctx.measureText(ismLbl).width;
  hline(M + ismW + 2 * k, W * 0.62 - 6 * k, nameY, 0.4, false);
  const sanaX = W * 0.62;
  text(sanaLbl, sanaX, nameY, 11, 700, 'left', 'alphabetic');
  const sanaW = ctx.measureText(sanaLbl).width;
  hline(sanaX + sanaW + 2 * k, W - M, nameY, 0.4, false);

  // 4. KO'RSATMA QUTISI (balandligi matnga qarab o'zi hisoblanadi)
  const instTop = nameY + 5 * k;
  const digitWord = lang === 'ru' ? (n >= 5 ? 'цифр' : 'цифры') : 'digits';
  const instText = tr(
    `Har bir qatorda ${n} ta raqam bor. Yonidagi yozuv shu raqamlarning qanchasi to'g'ri ekanligini aytadi.`,
    `В каждой строке ${n} ${digitWord}. Текст рядом говорит, сколько из них верно.`,
    `Each row has ${n} digits. The text next to it tells how many are correct.`
  );
  setFont(11, 700);
  const instLines = wrapLines(ctx, instText, usableW - 10 * k);
  const instLineH = 5.6 * k;
  const textTop = instTop + 4 * k;
  instLines.forEach((ln, i) => {
    text(ln, M + 5 * k, textTop + instLineH * i + instLineH / 2, 11, 700, 'left', 'middle');
  });
  const textBottom = textTop + instLineH * instLines.length;
  const dashY = textBottom + 2.5 * k;
  hline(M + 5 * k, W - M - 5 * k, dashY, 0.3, true);

  // Legenda: shrift o'zi kichrayadi, to'rtta/uchta element teng taqsimlanadi
  const legendY = dashY + 5 * k;
  const legend = [
    { kind: 'fill', label: tr("raqam to'g'ri va o'z joyida", 'цифра верная и на своём месте', 'correct digit, correct place') },
    { kind: 'ring', label: tr("raqam to'g'ri, lekin boshqa joyda", 'цифра верная, но в другом месте', 'correct digit, wrong place') },
    { kind: 'none', label: tr("hech narsa to'g'ri emas", 'ничего не верно', 'nothing is correct') }
  ];
  const legAvail = usableW - 10 * k;
  const symW = 6 * k;
  let legPt = 9, widths = [];
  for (; legPt >= 6; legPt -= 0.5) {
    setFont(legPt, 700);
    widths = legend.map(it => ctx.measureText(it.label).width);
    const total = widths.reduce((a, b) => a + b, 0) + symW * legend.length;
    if (total + 4 * k * (legend.length - 1) <= legAvail) break;
  }
  const legTotal = widths.reduce((a, b) => a + b, 0) + symW * legend.length;
  const legGap = (legAvail - legTotal) / (legend.length - 1);
  let lgx = M + 5 * k;
  legend.forEach((it, i) => {
    drawSymbol(ctx, it.kind, lgx + 2.5 * k, legendY, 2.5 * k, k);
    text(it.label, lgx + symW, legendY, legPt, 700, 'left', 'middle');
    lgx += symW + widths[i] + legGap;
  });

  const instBottom = legendY + 5.5 * k;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 0.5 * k;
  ctx.setLineDash([]);
  roundRectPath(ctx, M, instTop, usableW, instBottom - instTop, 3 * k);
  ctx.stroke();

  // 5. JAVOB BLOKINING O'LCHAMI (clues balandligini hisoblash uchun avval kerak)
  const gapMM = n <= 3 ? 12 : 8;
  const boxMM = Math.min(40, (180 - (n - 1) * gapMM) / n);   // 5 ta bo'lsa ham sig'adi
  const answerH = (10 + boxMM + 2 + 8) * k;                  // sarlavha + quti + yorliq
  const answerTop = footerY - 4 * k - answerH;

  // 6. IPUCHLAR — qator balandligi qolgan joyga moslanadi (18..26 mm)
  const cluesTop = instBottom + 6 * k;
  const clueH = Math.max(18 * k, Math.min(26 * k, (answerTop - 7 * k - cluesTop) / rows));

  const ds = (n <= 3 ? 16 : (n === 4 ? 14 : 12)) * k;        // raqam kvadrati
  const dg = (n <= 3 ? 4 : 3) * k;                           // oraliq
  const digitPt = n <= 4 ? 20 : 17;
  const digitsX = M + 14 * k;
  const digitsEnd = digitsX + n * ds + (n - 1) * dg;
  const sepX = digitsEnd + 5 * k;
  const symsX0 = sepX + 5 * k + 2.5 * k;                     // birinchi belgi markazi
  const textX = sepX + 5 * k + n * 6 * k + 2 * k;            // hamma qatorda bir xil joydan boshlanadi
  const textW = W - M - textX;

  state.clues.forEach((clue, idx) => {
    const top = cluesTop + idx * clueH;
    const cy = top + clueH / 2;
    hline(M, W - M, top, 0.3, false);

    // raqam doirasi
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 0.5 * k;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(M + 5.5 * k, cy, 4.5 * k, 0, Math.PI * 2);
    ctx.stroke();
    text(String(idx + 1), M + 5.5 * k, cy, 11, 900, 'center', 'middle');

    // raqamlar (n ta quti)
    clue.guess.forEach((digit, i) => {
      const dx = digitsX + i * (ds + dg);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.8 * k;
      roundRectPath(ctx, dx, cy - ds / 2, ds, ds, 2.5 * k);
      ctx.stroke();
      text(String(digit), dx + ds / 2, cy + 0.3 * k, digitPt, 900, 'center', 'middle');
    });

    // vertikal punktir chiziq
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 0.3 * k;
    ctx.setLineDash([1.2 * k, 1 * k]);
    ctx.beginPath();
    ctx.moveTo(sepX, top + 3 * k);
    ctx.lineTo(sepX, top + clueH - 3 * k);
    ctx.stroke();
    ctx.setLineDash([]);

    // belgilar
    const kinds = [];
    for (let s = 0; s < clue.correctPlace; s++) kinds.push('fill');
    for (let s = 0; s < clue.wrongPlace; s++) kinds.push('ring');
    if (kinds.length === 0) kinds.push('none');
    kinds.forEach((kind, i) => drawSymbol(ctx, kind, symsX0 + i * 6 * k, cy, 2.5 * k, k));

    // izoh matni: sig'masa shrift kichrayadi va qatorlarga bo'linadi
    const hint = getClueText(clue, lang);
    let pt = 11, lines = [], lh = 0;
    for (; pt >= 8; pt -= 0.5) {
      setFont(pt, 700);
      lines = wrapLines(ctx, hint, textW);
      lh = pt * MM_PT * 1.3 * k;
      if (lines.length * lh <= clueH - 4 * k) break;
    }
    const startY = cy - ((lines.length - 1) * lh) / 2;
    lines.forEach((ln, i) => text(ln, textX, startY + i * lh, pt, 700, 'left', 'middle'));
  });
  hline(M, W - M, cluesTop + rows * clueH, 0.3, false);        // oxirgi qatordan keyingi chiziq

  // 7. JAVOB BLOKI
  text(tr('JAVOB:', 'ОТВЕТ:', 'ANSWER:'), W / 2, answerTop, 18, 900, 'center', 'top');

  const boxSize = boxMM * k;
  const boxGap = gapMM * k;
  const totalW = n * boxSize + (n - 1) * boxGap;
  const startX = (W - totalW) / 2;
  const boxTop = answerTop + 10 * k;
  const inset = boxSize * 0.15;
  const guideOff = boxSize * 0.225;

  for (let i = 0; i < n; i++) {
    const bx = startX + i * (boxSize + boxGap);
    ctx.fillStyle = '#FFF';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.2 * k;
    ctx.setLineDash([]);
    roundRectPath(ctx, bx, boxTop, boxSize, boxSize, 4 * k);
    ctx.fill();
    ctx.stroke();

    hline(bx + inset, bx + boxSize - inset, boxTop + guideOff, 0.3, true);
    hline(bx + inset, bx + boxSize - inset, boxTop + boxSize - guideOff, 0.3, true);

    if (withAnswer) {
      text(String(state.secretCode[i]), bx + boxSize / 2, boxTop + boxSize / 2 + 0.5 * k,
           32 * (boxMM / 40), 900, 'center', 'middle');
    }

    // yorliq 1, 2, 3...
    const ly2 = boxTop + boxSize + 2 * k + 4 * k;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 0.5 * k;
    ctx.beginPath();
    ctx.arc(bx + boxSize / 2, ly2, 4 * k, 0, Math.PI * 2);
    ctx.stroke();
    text(String(i + 1), bx + boxSize / 2, ly2 + 0.2 * k, 12, 900, 'center', 'middle');
  }

  // 8. PASTKI QISM
  hline(M, W - M, footerY, 0.5, false);
  text(tr('Topshiriqlar Lab', 'Лаборатория головоломок', 'Puzzle Lab'),
       M, footerY + 6.5 * k, 13, 900, 'left', 'middle');
  text(tr("Kodni topdingmi? Javobingni tekshirib ko'r!",
          'Нашёл код? Проверь свой ответ!',
          'Found the code? Check your answer!'),
       W - M, footerY + 6.5 * k, 9, 700, 'right', 'middle');
}

export async function exportPdf(withAnswer) {
  // Nunito canvas'da chizishdan OLDIN yuklangan bo'lishi shart,
  // aks holda brauzer boshqa shriftga o'tadi va hamma o'lcham siljiydi.
  try {
    await Promise.all([
      document.fonts.load('900 20px "Nunito"'),
      document.fonts.load('700 20px "Nunito"')
    ]);
  } catch (e) { /* shrift yuklanmasa ham davom etamiz */ }

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
      ? (withAnswer ? 'Kodni topish (Javob).pdf' : 'Kodni topish.pdf')
      : (lang === 'ru'
        ? (withAnswer ? 'Угадайте код (Ответ).pdf' : 'Угадайте код.pdf')
        : (withAnswer ? 'Code Breaker (Answer).pdf' : 'Code Breaker.pdf'));
    const pdf = makePdf(jpeg, c.width, c.height);
    downloadPdf(pdf, fileName);
  }, 'image/jpeg', 0.95);
}
