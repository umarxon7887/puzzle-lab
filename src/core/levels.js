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

export const levelName = (level, lang) => (level === -1 ? (VERY_EASY[lang] || VERY_EASY.uz) : (LEVEL_NAMES[lang] || LEVEL_NAMES.uz)[level] ?? '');

// Generator qaysi darajalarni beradi: odatda [0, 1, 2, 3], «Juda oson» bo'lsa [-1, 0, 1, 2, 3]
export const levelsOf = gen => (gen.options.some(o => o.type === 'level' && o.veryEasy) ? [-1, 0, 1, 2, 3] : [0, 1, 2, 3]);
