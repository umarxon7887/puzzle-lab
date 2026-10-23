// wordkit.js — so'z o'yinlari (Anagramma, Shifrlangan so'z, Tushib qolgan harf, …) uchun umumiy qismlar:
// alifbolar, so'zni harflarga ajratish, mavzuli so'z banklari (wordsearch-words.js dan), harf kataklari chizish.
// O'zbekcha: rasmiy alifbodagidek O‘, G‘, SH, CH — bitta harf (bitta katak); «ng» li so'zlar olinmaydi.

import { TOPICS, BANKS } from './wordsearch-words.js';
import { INK, font, roundRect } from '../core/draw.js';

export { TOPICS };
export const LANGS3 = ['uz', 'ru', 'en'];

// Alifbo tartibi (shifrlarda raqam = alifbodagi o'rni)
export const ALPHA = {
  uz: ['A', 'B', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'X', 'Y', 'Z', 'O‘', 'G‘', 'SH', 'CH', 'NG'],
  ru: [...'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'],
  en: [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']
};

// So'zni harflarga ajratish: "SHAMOL" → SH A M O L; "BO'RI" → B O‘ R I; "YONG'OQ" → Y O N G‘ O Q.
// NG bitta harf qilinmaydi: o'zlashma so'zlarda (PINGVIN) n va g alohida tovush, shuning uchun «ng» li so'zlar
// so'z o'yinlariga umuman olinmaydi (hasNG).
export const hasNG = (word, lang) => lang === 'uz' && /NG(?!['‘’ʻʼ`´])/.test(String(word).toUpperCase());
export function tokens(word, lang) {
  const s = String(word).toUpperCase().replace(/[‘’ʻʼ`´]/g, "'");
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i], n = s[i + 1];
    if (lang === 'uz') {
      if ((c === 'O' || c === 'G') && n === "'") { out.push(c + '‘'); i++; continue; }
      if ((c === 'S' || c === 'C') && n === 'H') { out.push(c + 'H'); i++; continue; }
    }
    if (/[A-ZА-ЯЁ]/.test(c)) out.push(c);
  }
  return out;
}

const cache = {};
// { text, cells, key } — mavzu bo'yicha so'zlar (takrorlanmasdan)
export function bankOf(lang, topic) {
  const k = lang + '|' + topic;
  if (!cache[k]) {
    const seen = new Set();
    cache[k] = (BANKS[lang] || BANKS.uz)[topic].filter(w => !hasNG(w, lang)).map(w => { const cells = tokens(w, lang); return { text: cells.join(''), cells, key: cells.join('|'), topic }; })
      .filter(w => w.cells.length >= 2 && !seen.has(w.key) && seen.add(w.key));
  }
  return cache[k];
}
// Tilning barcha so'zlari (mavzulardan qat'i nazar)
export function allOf(lang) {
  const k = lang + '|*';
  if (!cache[k]) {
    const seen = new Map();
    for (const tp of TOPICS) for (const w of bankOf(lang, tp.key)) if (!seen.has(w.key)) seen.set(w.key, w);
    cache[k] = [...seen.values()];
  }
  return cache[k];
}
export function keySet(lang) {
  const k = lang + '|keys';
  if (!cache[k]) cache[k] = new Set(allOf(lang).map(w => w.key));
  return cache[k];
}
// So'z qaysi mavzularda uchraydi
export function topicsOfWord(lang, key) {
  return TOPICS.filter(tp => bankOf(lang, tp.key).some(w => w.key === key)).map(tp => tp.key);
}

export const topicName = (topic, lang) => { const tp = TOPICS.find(x => x.key === topic); return tp ? (tp.name[lang] || tp.name.uz) : topic; };

// Mavzu tanlovi (barcha so'z o'yinlarida bir xil)
export const TOPIC_OPTION = {
  key: 'topic', type: 'choice', style: 'cards', pack: 'select', default: 'animals',
  label: { uz: 'Mavzu', ru: 'Тема', en: 'Topic' },
  choices: TOPICS.map(tp => ({ value: tp.key, big: tp.icon, label: tp.name }))
};
export const topicOf = opts => (TOPICS.some(tp => tp.key === opts.topic) ? opts.topic : 'animals');
export const langOf = opts => (BANKS[opts.lang] ? opts.lang : 'uz');

// Bitta harf katagi; text — harf (SH kabi ikki belgili harf kichikroq yoziladi)
export function letterBox(ctx, x, y, s, text, { color = INK, fill = '#fff', stroke = INK, lw, dashed = false, weight = 800 } = {}) {
  roundRect(ctx, x, y, s, s, s * 0.14);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) {
    if (dashed) ctx.setLineDash([s * 0.08, s * 0.06]);
    ctx.strokeStyle = stroke; ctx.lineWidth = lw || Math.max(0.25, s * 0.045); ctx.stroke();
    ctx.setLineDash([]);
  }
  if (text) {
    const k = text.length > 1 ? 0.46 : 0.62;
    font(ctx, s * k, weight); ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x + s / 2, y + s * 0.55);
  }
}
