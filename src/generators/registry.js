import * as Code from './code/ui.js';
import * as Maze from './maze/ui.js';

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
    cover: '',
    coverGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    init: Code.init,
    exportPDF: Code.exportPDF
  }
  // Kelajakda qo'shiladi:
  // {
  //   id: 'sudoku',
  //   nameKey: 'tabSudoku',
  //   descriptionKey: 'sudokuDesc',
  //   cover: '🔢',
  //   coverGradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  //   init: Sudoku.init,
  //   exportPDF: Sudoku.exportPDF
  // }
];

export function getGenerator(id) {
  return GENERATORS.find(g => g.id === id);
}
