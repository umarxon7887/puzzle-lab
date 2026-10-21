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
import overlap from './overlap.js';
import pattern from './pattern.js';
import count from './count.js';
import pairs from './pairs.js';
import shadow from './shadow.js';
import matrix from './matrix.js';
import twins from './twins.js';
import cubes from './cubes.js';
import diff from './diff.js';
import schulte from './schulte.js';
import proof from './proofread.js';
import coding from './coding.js';
import seqmaze from './seqmaze.js';
import symmetry from './symmetry.js';
import copy from './copy.js';
import nonogram from './nonogram.js';
import dictation from './dictation.js';
import paintnum from './paintnum.js';
import coords from './coords.js';
import dots from './dots.js';

export const GENERATORS = [maze, sudoku, words, cross, code, odd, overlap, pattern, count, pairs, shadow, matrix, twins, cubes, diff, schulte, proof, coding, seqmaze, symmetry, copy, nonogram, dictation, paintnum, coords, dots];

export const getGenerator = id => GENERATORS.find(g => g.id === id) || null;
