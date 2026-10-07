import * as Code from './code/ui.js';
import * as Maze from './maze/ui.js';
import * as Sudoku from './sudoku/ui.js';
import * as Words from './wordsearch/ui.js';
import * as Cross from './crossword/ui.js';

export const GENERATORS = [
  {
    id: 'maze',
    nameKey: 'tabMaze',
    descriptionKey: 'mazeDesc',
    cover: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mazeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="200" height="200" rx="20" fill="url(#mazeGrad)"/>
      <path d="M40 40 L40 160 L160 160" stroke="white" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M60 40 L60 80 L100 80 L100 120 L140 120 L140 60" stroke="white" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="50" cy="50" r="8" fill="#FFD700"/>
      <circle cx="150" cy="150" r="8" fill="#FF6B6B"/>
      <path d="M50 50 Q100 30 150 150" stroke="white" stroke-width="3" fill="none" stroke-dasharray="5,5" opacity="0.6"/>
    </svg>`,
    coverGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    init: Maze.init,
    exportPDF: Maze.exportPDF
  },
  {
    id: 'code',
    nameKey: 'tabCode',
    descriptionKey: 'codeDesc',
    cover: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="codeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f093fb;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#f5576c;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="200" height="200" rx="20" fill="url(#codeGrad)"/>
      <rect x="70" y="100" width="60" height="50" rx="8" fill="white"/>
      <path d="M85 100 L85 80 Q85 65 100 65 Q115 65 115 80 L115 100" stroke="white" stroke-width="8" fill="none" stroke-linecap="round"/>
      <circle cx="100" cy="120" r="8" fill="#f093fb"/>
      <rect x="96" y="125" width="8" height="15" rx="3" fill="#f093fb"/>
      <text x="100" y="145" font-size="20" font-weight="900" fill="#f5576c" text-anchor="middle">?</text>
    </svg>`,
    coverGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    init: Code.init,
    exportPDF: Code.exportPDF
  },
  {
    id: 'sudoku',
    nameKey: 'tabSudoku',
    descriptionKey: 'sudokuDesc',
    cover: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sudokuGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#4facfe;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#00f2fe;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="200" height="200" rx="20" fill="url(#sudokuGrad)"/>
      <rect x="40" y="40" width="120" height="120" fill="none" stroke="white" stroke-width="4" rx="4"/>
      <line x1="80" y1="40" x2="80" y2="160" stroke="white" stroke-width="3"/>
      <line x1="120" y1="40" x2="120" y2="160" stroke="white" stroke-width="3"/>
      <line x1="40" y1="80" x2="160" y2="80" stroke="white" stroke-width="3"/>
      <line x1="40" y1="120" x2="160" y2="120" stroke="white" stroke-width="3"/>
      <text x="60" y="70" font-size="24" font-weight="900" fill="white" text-anchor="middle">5</text>
      <text x="100" y="70" font-size="24" font-weight="900" fill="white" text-anchor="middle">3</text>
      <text x="140" y="110" font-size="24" font-weight="900" fill="white" text-anchor="middle">7</text>
      <text x="60" y="150" font-size="24" font-weight="900" fill="white" text-anchor="middle">2</text>
    </svg>`,
    coverGradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    init: Sudoku.init,
    exportPDF: Sudoku.exportPDF
  },
  {
    id: 'words',
    nameKey: 'tabWords',
    descriptionKey: 'wordsDesc',
    cover: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wordsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#fa709a;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#fee140;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="200" height="200" rx="20" fill="url(#wordsGrad)"/>
      <circle cx="90" cy="90" r="40" fill="none" stroke="white" stroke-width="8"/>
      <line x1="118" y1="118" x2="150" y2="150" stroke="white" stroke-width="10" stroke-linecap="round"/>
      <text x="90" y="100" font-size="32" font-weight="900" fill="white" text-anchor="middle">A</text>
      <circle cx="150" cy="150" r="6" fill="white" opacity="0.6"/>
    </svg>`,
    coverGradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    init: Words.init,
    exportPDF: Words.exportPDF
  },
  {
    id: 'cross',
    nameKey: 'tabCross',
    descriptionKey: 'crossDesc',
    cover: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="crossGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#a8edea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#fed6e3;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="200" height="200" rx="20" fill="url(#crossGrad)"/>
      <rect x="40" y="40" width="35" height="35" fill="white" stroke="#333" stroke-width="2" rx="4"/>
      <rect x="85" y="40" width="35" height="35" fill="white" stroke="#333" stroke-width="2" rx="4"/>
      <rect x="130" y="40" width="35" height="35" fill="white" stroke="#333" stroke-width="2" rx="4"/>
      <text x="57" y="65" font-size="20" font-weight="900" fill="#333" text-anchor="middle">3</text>
      <text x="102" y="65" font-size="20" font-weight="900" fill="#333" text-anchor="middle">+</text>
      <text x="147" y="65" font-size="20" font-weight="900" fill="#333" text-anchor="middle">5</text>
      <line x1="40" y1="90" x2="165" y2="90" stroke="#333" stroke-width="3"/>
      <rect x="85" y="105" width="35" height="35" fill="white" stroke="#333" stroke-width="2" rx="4"/>
      <text x="102" y="130" font-size="20" font-weight="900" fill="#333" text-anchor="middle">8</text>
      <text x="102" y="170" font-size="16" font-weight="700" fill="#333" text-anchor="middle">= ?</text>
    </svg>`,
    coverGradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    init: Cross.init,
    exportPDF: Cross.exportPDF
  }
];

export function getGenerator(id) {
  return GENERATORS.find(g => g.id === id);
}
