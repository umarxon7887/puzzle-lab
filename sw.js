// sw.js — oflayn ishlash (Service Worker).
// Strategiya: avval internetdan (eng yangi versiya), internet bo'lmasa — saqlangan nusxadan.
// Shriftlar (Google Fonts) — avval saqlangan nusxadan.
// Yangi fayl qo'shsangiz, uni CORE ro'yxatiga yozing va VERSION ni oshiring
// (npm test buni tekshiradi).

const VERSION = '2.8.0';
const CACHE = 'puzzle-lab-' + VERSION;
const CORE = [
  './',
  'index.html',
  'style.css',
  'manifest.json',
  'favicon.ico',
  'favicon-32.png',
  'icon.svg',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'apple-touch-icon.png',
  'src/app.js',
  'src/core/draw.js',
  'src/core/figures.js',
  'src/core/files.js',
  'src/core/i18n.js',
  'src/core/levels.js',
  'src/core/pdf.js',
  'src/core/picture-data.js',
  'src/core/pictures.js',
  'src/core/rng.js',
  'src/core/sheet.js',
  'src/core/storage.js',
  'src/core/parts.js',
  'src/core/gridpics.js',
  'src/core/skills.js',
  'src/core/cart.js',
  'src/generators/code.js',
  'src/generators/count.js',
  'src/generators/crossword.js',
  'src/generators/cubes.js',
  'src/generators/diff.js',
  'src/generators/schulte.js',
  'src/generators/proofread.js',
  'src/generators/coding.js',
  'src/generators/seqmaze.js',
  'src/generators/symmetry.js',
  'src/generators/copy.js',
  'src/generators/nonogram.js',
  'src/generators/dictation.js',
  'src/generators/paintnum.js',
  'src/generators/coords.js',
  'src/generators/dots.js',
  'src/generators/pyramid.js',
  'src/generators/magic.js',
  'src/generators/numseq.js',
  'src/generators/chain.js',
  'src/generators/mathmaze.js',
  'src/generators/numpath.js',
  'src/generators/drill.js',
  'src/generators/scales.js',
  'src/generators/domino.js',
  'src/generators/kakuro.js',
  'src/generators/kenken.js',
  'src/generators/picsudoku.js',
  'src/generators/futoshiki.js',
  'src/generators/binary.js',
  'src/generators/killer.js',
  'src/generators/wordkit.js',
  'src/generators/anagram.js',
  'src/generators/cipher.js',
  'src/generators/missing.js',
  'src/generators/wordchain.js',
  'src/generators/xword-clues.js',
  'src/generators/xword.js',
  'src/generators/syllables.js',
  'src/generators/matrix.js',
  'src/generators/countshapes.js',
  'src/generators/cryptarith.js',
  'src/generators/hiddenop.js',
  'src/generators/letterseq-figs.js',
  'src/generators/letterseq.js',
  'src/generators/matches.js',
  'src/generators/matrix-older.js',
  'src/generators/newop.js',
  'src/generators/numkit.js',
  'src/generators/numshapes.js',
  'src/generators/oddone-older.js',
  'src/generators/opsigns.js',
  'src/generators/skyscrapers.js',
  'src/generators/symvalues.js',
  'src/generators/tangram-figs.js',
  'src/generators/tangram.js',
  'src/generators/twins-lines.js',
  'src/generators/maze.js',
  'src/generators/oddone-items.js',
  'src/generators/oddone.js',
  'src/generators/overlap.js',
  'src/generators/pairs.js',
  'src/generators/pattern.js',
  'src/generators/registry.js',
  'src/generators/shadow.js',
  'src/generators/sudoku.js',
  'src/generators/twins.js',
  'src/generators/wordsearch-words.js',
  'src/generators/wordsearch.js',
  'src/ui/dom.js',
  'src/ui/fonts.js',
  'src/ui/generator-page.js',
  'src/ui/home.js',
  'src/ui/icons.js',
  'src/ui/modal.js',
  'src/ui/options.js',
  'src/ui/pack-page.js',
  'src/ui/cart-page.js',
  'src/ui/preview.js',
  'src/ui/puzzles.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('puzzle-lab-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !isFont) return;

  if (isFont) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }))
    );
    return;
  }

  event.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      if (req.mode === 'navigate') return caches.match('index.html');
      return Response.error();
    }))
  );
});
