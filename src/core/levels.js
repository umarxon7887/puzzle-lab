// levels.js — barcha generatorlar uchun umumiy daraja nomlari.
// Alohida faylda turibdi, chunki generatorlar uni Node testlarida ham ishlatadi
// (i18n.js esa brauzerga bog'liq: localStorage, document).

export const LEVEL_NAMES = {
  uz: ['Oson', "O'rta", 'Qiyin', 'Juda qiyin'],
  ru: ['Легко', 'Средне', 'Сложно', 'Очень сложно'],
  en: ['Easy', 'Medium', 'Hard', 'Expert']
};

// «Juda oson» (-1) — ixtiyoriy daraja: faqat level opsiyasida `veryEasy: true` bo'lgan generatorlarda (v2.7)
export const VERY_EASY = { uz: 'Juda oson', ru: 'Очень легко', en: 'Very easy' };

// «Katta bolalar» (4) — ixtiyoriy daraja: level opsiyasida `older: true` bo'lgan generatorlarda (v2.8).
// 4–7-sinf manbalaridagi murakkabroq qoidalar shu darajada.
export const OLDER = { uz: 'Katta bolalar', ru: 'Для старших', en: 'Older kids' };

export const levelName = (level, lang) => (level === -1 ? (VERY_EASY[lang] || VERY_EASY.uz)
  : level === 4 ? (OLDER[lang] || OLDER.uz) : (LEVEL_NAMES[lang] || LEVEL_NAMES.uz)[level] ?? '');

// Generator qaysi darajalarni beradi: odatda [0, 1, 2, 3]; «Juda oson» bo'lsa boshiga -1, «Katta bolalar» bo'lsa oxiriga 4
export const levelsOf = gen => {
  const o = gen.options.find(x => x.type === 'level') || {};
  return [...(o.veryEasy ? [-1] : []), 0, 1, 2, 3, ...(o.older ? [4] : [])];
};
// generate() uchun: daraja shu generator beradigan darajalardan biri bo'lsin (aks holda eng yaqini)
export const clampLevel = (gen, level) => { const ls = levelsOf(gen), v = level | 0; return ls.includes(v) ? v : Math.max(ls[0], Math.min(ls[ls.length - 1], v)); };
