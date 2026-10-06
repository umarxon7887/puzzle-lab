export const Icons = {
  refresh: '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>',
  fileDown: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
  check: '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>'
};

export function renderActionBar(container, options) {
  const {
    primaryText, primaryAction,
    showNew = false, showPdf = false,
    showSettings = false, showAnswer = false,
    answerVisible = false,
    onNew, onPdfTask, onPdfAnswer, onSettings, onAnswer,
    i18n
  } = options;

  const bar = document.createElement('div');
  bar.className = 'action-bar-container';
  bar.innerHTML = `
    <button class="primary-action" id="primaryBtn">${primaryText}</button>
    <div class="icon-bar" id="iconBar">
      ${showNew ? `<button class="icon-btn" id="newBtn" data-tooltip="${i18n.new}" title="${i18n.new}" aria-label="${i18n.new}">${Icons.refresh}</button>` : ''}
      ${showPdf ? `
        <div style="position:relative;">
          <button class="icon-btn" id="pdfBtn" data-tooltip="${i18n.pdf}" title="${i18n.pdf}" aria-label="${i18n.pdf}">${Icons.fileDown}</button>
          <div class="pdf-popover" id="pdfPopover">
            <button id="pdfTaskBtn">${Icons.fileDown} ${i18n.pdfTask}</button>
            <button id="pdfAnswerBtn">${Icons.check} ${i18n.pdfAnswer}</button>
          </div>
        </div>
      ` : ''}
      ${showAnswer ? `<button class="icon-btn" id="answerBtn" data-tooltip="${answerVisible ? i18n.hideAnswer : i18n.showAnswer}" title="${answerVisible ? i18n.hideAnswer : i18n.showAnswer}" aria-label="${answerVisible ? i18n.hideAnswer : i18n.showAnswer}">${answerVisible ? Icons.eyeOff : Icons.eye}</button>` : ''}
      ${showSettings ? `<button class="icon-btn" id="settingsBtn" data-tooltip="${i18n.settings}" title="${i18n.settings}" aria-label="${i18n.settings}">${Icons.settings}</button>` : ''}
    </div>
  `;
  container.appendChild(bar);

  document.getElementById('primaryBtn').addEventListener('click', primaryAction);
  if (showNew && onNew) document.getElementById('newBtn').addEventListener('click', onNew);
  
  if (showPdf) {
    const pdfBtn = document.getElementById('pdfBtn');
    const pdfPopover = document.getElementById('pdfPopover');
    pdfBtn.addEventListener('click', (e) => { e.stopPropagation(); pdfPopover.classList.toggle('show'); });
    document.getElementById('pdfTaskBtn').addEventListener('click', (e) => { e.stopPropagation(); pdfPopover.classList.remove('show'); onPdfTask(); });
    document.getElementById('pdfAnswerBtn').addEventListener('click', (e) => { e.stopPropagation(); pdfPopover.classList.remove('show'); onPdfAnswer(); });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#pdfBtn') && !e.target.closest('#pdfPopover')) pdfPopover.classList.remove('show');
    });
  }
  
  if (showAnswer && onAnswer) document.getElementById('answerBtn').addEventListener('click', onAnswer);
  if (showSettings && onSettings) document.getElementById('settingsBtn').addEventListener('click', onSettings);
}
