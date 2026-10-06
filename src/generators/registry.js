import * as Code from './code/ui.js';
import * as Maze from './maze/ui.js';
import * as Sudoku from './sudoku/ui.js';
import * as Words from './wordsearch/ui.js';

export const GENERATORS = [
  {
    id: 'maze',
    nameKey: 'tabMaze',
    descriptionKey: 'mazeDesc',
    cover: '🌀',
    coverGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    init: Maze.init,
    exportPDF: Maze.exportPDF
  },
  {
    id: 'code',
    nameKey: 'tabCode',
    descriptionKey: 'codeDesc',
    cover: '🔐',
    coverGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    init: Code.init,
    exportPDF: Code.exportPDF
  },
  {
    id: 'sudoku',
    nameKey: 'tabSudoku',
    descriptionKey: 'sudokuDesc',
    cover: '',
    coverGradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    init: Sudoku.init,
    exportPDF: Sudoku.exportPDF
  },
  {
    id: 'words',
    nameKey: 'tabWords',
    descriptionKey: 'wordsDesc',
    cover: '🔍',
    coverGradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    init: Words.init,
    exportPDF: Words.exportPDF
  }
];

export function getGenerator(id) {
  return GENERATORS.find(g => g.id === id);
}
