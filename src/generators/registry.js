import * as Code from './code/ui.js';
// import * as Maze from './maze/ui.js'; // Kelajakda shu yerda ochiladi

export const GENERATORS = [
  {
    id: 'code',
    nameKey: 'tabCode',
    init: Code.init,
    exportPDF: Code.exportPDF
  }
  // {
  //   id: 'maze',
  //   nameKey: 'tabMaze',
  //   init: Maze.init,
  //   exportPDF: Maze.exportPDF
  // }
];

export function getGenerator(id) {
  return GENERATORS.find(g => g.id === id);
}
