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
    cover: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M10 10 L10 90 L90 90" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M20 10 L20 30 L40 30 L40 50 L60 50 L60 70 L80 70 L80 10" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="15" cy="15" r="4" fill="#fff"/><circle cx="85" cy="85" r="4" fill="#fff"/></svg>',
    coverGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    init: Maze.init,
    exportPDF: Maze.exportPDF
  },
  {
    id: 'code',
    nameKey: 'tabCode',
    descriptionKey: 'codeDesc',
    cover: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="25" y="45" width="50" height="40" rx="5" fill="#fff"/><path d="M35 45 V35 a15 15 0 0 1 30 0 V45" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="50" cy="60" r="5" fill="#667eea"/><rect x="47" y="62" width="6" height="10" rx="2" fill="#667eea"/></svg>',
    coverGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    init: Code.init,
    exportPDF: Code.exportPDF
  },
  {
    id: 'sudoku',
    nameKey: 'tabSudoku',
    descriptionKey: 'sudokuDesc',
    cover: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="15" width="70" height="70" fill="none" stroke="#fff" stroke-width="3"/><line x1="38" y1="15" x2="38" y2="85" stroke="#fff" stroke-width="2"/><line x1="62" y1="15" x2="62" y2="85" stroke="#fff" stroke-width="2"/><line x1="15" y1="38" x2="85" y2="38" stroke="#fff" stroke-width="2"/><line x1="15" y1="62" x2="85" y2="62" stroke="#fff" stroke-width="2"/><text x="26" y="32" font-size="14" font-weight="900" fill="#fff" text-anchor="middle">1</text><text x="50" y="32" font-size="14" font-weight="900" fill="#fff" text-anchor="middle">2</text><text x="74" y="56" font-size="14" font-weight="900" fill="#fff" text-anchor="middle">3</text><text x="26" y="80" font-size="14" font-weight="900" fill="#fff" text-anchor="middle">4</text></svg>',
    coverGradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    init: Sudoku.init,
    exportPDF: Sudoku.exportPDF
  },
  {
    id: 'words',
    nameKey: 'tabWords',
    descriptionKey: 'wordsDesc',
    cover: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="45" cy="45" r="25" fill="none" stroke="#fff" stroke-width="6"/><line x1="63" y1="63" x2="85" y2="85" stroke="#fff" stroke-width="8" stroke-linecap="round"/><text x="45" y="52" font-size="20" font-weight="900" fill="#fff" text-anchor="middle">A</text></svg>',
    coverGradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    init: Words.init,
    exportPDF: Words.exportPDF
  },
  {
    id: 'cross',
    nameKey: 'tabCross',
    descriptionKey: 'crossDesc',
    cover: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="15" width="20" height="20" fill="none" stroke="#fff" stroke-width="2"/><rect x="40" y="15" width="20" height="20" fill="none" stroke="#fff" stroke-width="2"/><rect x="65" y="15" width="20" height="20" fill="none" stroke="#fff" stroke-width="2"/><text x="25" y="30" font-size="12" font-weight="900" fill="#fff" text-anchor="middle">3</text><text x="50" y="30" font-size="12" font-weight="900" fill="#fff" text-anchor="middle">+</text><text x="75" y="30" font-size="12" font-weight="900" fill="#fff" text-anchor="middle">5</text><line x1="15" y1="45" x2="85" y2="45" stroke="#fff" stroke-width="2"/><rect x="40" y="55" width="20" height="20" fill="none" stroke="#fff" stroke-width="2"/><text x="50" y="70" font-size="12" font-weight="900" fill="#fff" text-anchor="middle">8</text></svg>',
    coverGradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    init: Cross.init,
    exportPDF: Cross.exportPDF
  },
  {
    id: 'pack',
    nameKey: 'tabPack',
    descriptionKey: 'packDesc',
    cover: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="30" width="70" height="50" rx="4" fill="none" stroke="#fff" stroke-width="4"/><path d="M30 30 V20 a20 20 0 0 1 40 0 V30" stroke="#fff" stroke-width="4" fill="none"/><circle cx="50" cy="55" r="8" fill="#fff"/><path d="M50 50 L50 60 M45 55 L55 55" stroke="#667eea" stroke-width="2" stroke-linecap="round"/></svg>',
    coverGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    init: Pack.init,
    exportPDF: Pack.exportPack
  }
];

export function getGenerator(id) {
  return GENERATORS.find(g => g.id === id);
}
