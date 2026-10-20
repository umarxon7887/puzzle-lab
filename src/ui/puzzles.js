// puzzles.js — topshiriqlarni yaratish (kesh bilan) va varaq "joy"larini tayyorlash.
// Bir xil generator + sozlamalar + raqam qayta so'ralsa, qayta hisoblanmaydi.

import { getLang, pick, t, lvl } from '../core/i18n.js';

const cache = new Map();
const LIMIT = 120;

export function getPuzzle(gen, opts, seed) {
  const o = gen.usesLang ? { ...opts, lang: getLang() } : opts;
  const key = gen.id + '|' + JSON.stringify(o) + '|' + seed;
  if (cache.has(key)) {
    const p = cache.get(key);
    cache.delete(key); cache.set(key, p);            // eng oxirgi ishlatilgan — oxiriga
    return p;
  }
  const p = gen.generate(o, seed);
  cache.set(key, p);
  if (cache.size > LIMIT) cache.delete(cache.keys().next().value);
  return p;
}

export function isCached(gen, opts, seed) {
  const o = gen.usesLang ? { ...opts, lang: getLang() } : opts;
  return cache.has(gen.id + '|' + JSON.stringify(o) + '|' + seed);
}

// Varaq pastidagi yozuv: "Labirint raqami: 123 (10×14, O'rta)"
export function footerOf(gen, p) {
  const lang = getLang();
  return t('footer', pick(gen.name), p.seed, gen.info(p, lang), lvl(p.level));
}

export function makeSlot(gen, p, { title, fontPt, number = '' } = {}) {
  return { gen, puzzle: p, title: title ?? pick(gen.defaultTitle), fontPt, number, footer: footerOf(gen, p) };
}

// Generator sozlamalarining boshlang'ich qiymatlari
export function defaultOpts(gen) {
  const o = {};
  for (const op of gen.options) if (op.default !== undefined) o[op.key] = op.default;
  return o;
}
