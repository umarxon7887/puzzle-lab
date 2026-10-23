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
import pyramid from './pyramid.js';
import magic from './magic.js';
import numseq from './numseq.js';
import chain from './chain.js';
import mathmaze from './mathmaze.js';
import numpath from './numpath.js';
import drill from './drill.js';
import scales from './scales.js';
import domino from './domino.js';
import kakuro from './kakuro.js';
import kenken from './kenken.js';
import picsudoku from './picsudoku.js';
import futoshiki from './futoshiki.js';
import binary from './binary.js';
import killer from './killer.js';
import anagram from './anagram.js';
import cipher from './cipher.js';
import missing from './missing.js';
import wordchain from './wordchain.js';
import xword from './xword.js';
import syllables from './syllables.js';

export const GENERATORS = [maze, sudoku, words, cross, code, odd, overlap, pattern, count, pairs, shadow, matrix, twins, cubes, diff, schulte, proof, coding, seqmaze, symmetry, copy, nonogram, dictation, paintnum, coords, dots, pyramid, magic, numseq, chain, mathmaze, numpath, drill, scales, domino, kakuro, kenken, picsudoku, futoshiki, binary, killer, anagram, cipher, missing, wordchain, xword, syllables];

export const getGenerator = id => GENERATORS.find(g => g.id === id) || null;
