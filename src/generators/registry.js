// registry.js — barcha generatorlar ro'yxati.
// Yangi generator qo'shish: src/generators/ ichida yangi fayl yarating (maze.js namuna),
// shu yerga import qiling va GENERATORS ro'yxatiga qo'shing. Bosh sahifa, alohida sahifa,
// "To'plam" va testlar uni avtomatik ko'radi.

import maze from './maze.js';
import sudoku from './sudoku.js';
import words from './wordsearch.js';
import cross from './crossword.js';
import code from './code.js';
import odd from './oddone.js';

export const GENERATORS = [maze, sudoku, words, cross, code, odd];

export const getGenerator = id => GENERATORS.find(g => g.id === id) || null;
