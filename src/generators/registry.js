import * as Code from './code/ui.js';
import * as Maze from './maze/ui.js';
import * as Sudoku from './sudoku/ui.js';
import * as Words from './wordsearch/ui.js';
import * as Cross from './crossword/ui.js';
import * as Pack from './pack/ui.js';

export const GENERATORS = [
  {
    id: 'maze',
    nameKey: 'tabMaze',
    descriptionKey: 'mazeDesc',
    coverGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    init: Maze.init,
    exportPDF: Maze.exportPDF
  },
  {
    id: 'code',
    nameKey: 'tabCode',
    descriptionKey: 'codeDesc',
    cover: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="icon-code"><defs><linearGradient id="codeGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#f093fb;stop-opacity:1" /><stop offset="100%" style="stop-color:#f5576c;stop-opacity:1" /></linearGradient></defs><rect width="200" height="200" rx="20" fill="url(#codeGrad)"/><rect class="code-lock" x="70" y="95" width="60" height="55" rx="8" fill="white"/><path class="code-shackle" d="M85 95 L85 75 Q85 60 100 60 Q115 60 115 75 L115 95" stroke="white" stroke-width="10" fill="none" stroke-linecap="round"/><circle class="code-key" cx="100" cy="120" r="10" fill="#4CAF50"/><rect x="96" y="125" width="8" height="18" rx="3" fill="#4CAF50"/><text class="code-num" x="100" y="145" font-size="22" font-weight="900" fill="#f5576c" text-anchor="middle">?</text></svg>`,
    coverGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    init: Code.init,
    exportPDF: Code.exportPDF
  },
  {
    id: 'sudoku',
    nameKey: 'tabSudoku',
    descriptionKey: 'sudokuDesc',
    cover: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="icon-sudoku"><defs><linearGradient id="sudokuGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#4facfe;stop-opacity:1" /><stop offset="100%" style="stop-color:#00f2fe;stop-opacity:1" /></linearGradient></defs><rect width="200" height="200" rx="20" fill="url(#sudokuGrad)"/><rect x="40" y="40" width="120" height="120" fill="none" stroke="white" stroke-width="4" rx="4"/><line x1="80" y1="40" x2="80" y2="160" stroke="white" stroke-width="3"/><line x1="120" y1="40" x2="120" y2="160" stroke="white" stroke-width="3"/><line x1="40" y1="80" x2="160" y2="80" stroke="white" stroke-width="3"/><line x1="40" y1="120" x2="160" y2="120" stroke="white" stroke-width="3"/><text class="sudoku-num" x="60" y="70" font-size="24" font-weight="900" fill="white" text-anchor="middle">5</text><text class="sudoku-num" x="100" y="70" font-size="24" font-weight="900" fill="white" text-anchor="middle">3</text><text class="sudoku-num" x="140" y="110" font-size="24" font-weight="900" fill="white" text-anchor="middle">7</text><text class="sudoku-num" x="60" y="150" font-size="24" font-weight="900" fill="white" text-anchor="middle">2</text></svg>`,
    coverGradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    init: Sudoku.init,
    exportPDF: Sudoku.exportPDF
  },
  {
    id: 'words',
    nameKey: 'tabWords',
    descriptionKey: 'wordsDesc',
    cover: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="icon-words"><defs><linearGradient id="wordsGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#fa709a;stop-opacity:1" /><stop offset="100%" style="stop-color:#fee140;stop-opacity:1" /></linearGradient></defs><rect width="200" height="200" rx="20" fill="url(#wordsGrad)"/><rect class="word-cell" x="30" y="50" width="25" height="25" fill="white" opacity="0.3" rx="3"/><rect class="word-cell" x="60" y="50" width="25" height="25" fill="white" opacity="0.3" rx="3"/><rect class="word-cell" x="90" y="50" width="25" height="25" fill="white" opacity="0.3" rx="3"/><rect class="word-cell" x="120" y="50" width="25" height="25" fill="white" opacity="0.3" rx="3"/><rect class="word-cell found" x="60" y="50" width="25" height="25" fill="#4CAF50" rx="3"/><text x="72" y="68" font-size="16" font-weight="900" fill="white" text-anchor="middle">A</text><circle class="words-lupa" cx="100" cy="100" r="35" fill="none" stroke="white" stroke-width="8"/><line class="words-lupa-handle" x1="125" y1="125" x2="155" y2="155" stroke="white" stroke-width="10" stroke-linecap="round"/><text x="100" y="108" font-size="28" font-weight="900" fill="white" text-anchor="middle">A</text></svg>`,
    coverGradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    init: Words.init,
    exportPDF: Words.exportPDF
  },
  {
    id: 'cross',
    nameKey: 'tabCross',
    descriptionKey: 'crossDesc',
    cover: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="icon-cross"><defs><linearGradient id="crossGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#a8edea;stop-opacity:1" /><stop offset="100%" style="stop-color:#fed6e3;stop-opacity:1" /></linearGradient></defs><rect width="200" height="200" rx="20" fill="url(#crossGrad)"/><rect class="cross-cell" x="40" y="40" width="35" height="35" fill="white" stroke="#333" stroke-width="2" rx="4" opacity="0.3"/><rect class="cross-cell" x="85" y="40" width="35" height="35" fill="white" stroke="#333" stroke-width="2" rx="4" opacity="0.3"/><rect class="cross-cell open" x="130" y="40" width="35" height="35" fill="white" stroke="#333" stroke-width="2" rx="4"/><text class="cross-num" x="147" y="65" font-size="20" font-weight="900" fill="#333" text-anchor="middle">5</text><text class="cross-op" x="102" y="65" font-size="20" font-weight="900" fill="#333" text-anchor="middle">+</text><text class="cross-num" x="57" y="65" font-size="20" font-weight="900" fill="#333" text-anchor="middle">3</text><line x1="40" y1="90" x2="165" y2="90" stroke="#333" stroke-width="3"/><rect class="cross-cell open" x="85" y="105" width="35" height="35" fill="white" stroke="#333" stroke-width="2" rx="4"/><text class="cross-num" x="102" y="130" font-size="20" font-weight="900" fill="#333" text-anchor="middle">8</text><text class="cross-q" x="102" y="170" font-size="24" font-weight="900" fill="#333" text-anchor="middle">?</text></svg>`,
    coverGradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    init: Cross.init,
    exportPDF: Cross.exportPDF
  },
  {
    id: 'pack',
    nameKey: 'packTitle',
    descriptionKey: 'packSubtitle',
    cover: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="packGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#11998e;stop-opacity:1" /><stop offset="100%" style="stop-color:#38ef7d;stop-opacity:1" /></linearGradient></defs><rect width="200" height="200" rx="20" fill="url(#packGrad)"/><path d="M60 80 L100 60 L140 80 L140 140 L100 160 L60 140 Z" fill="white" opacity="0.9"/><path d="M100 60 L100 160" stroke="#11998e" stroke-width="4"/><path d="M60 80 L140 80" stroke="#11998e" stroke-width="4"/><text x="100" y="125" font-size="30" font-weight="900" fill="#11998e" text-anchor="middle">PDF</text></svg>`,
    coverGradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    init: Pack.init,
    exportPDF: Pack.exportPDF
  }
];

export function getGenerator(id) {
  return GENERATORS.find(g => g.id === id);
}
