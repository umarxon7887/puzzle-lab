// levels.js — barcha generatorlar uchun umumiy daraja nomlari.
// Alohida faylda turibdi, chunki generatorlar uni Node testlarida ham ishlatadi
// (i18n.js esa brauzerga bog'liq: localStorage, document).

export const LEVEL_NAMES = {
  uz: ['Oson', "O'rta", 'Qiyin', 'Juda qiyin'],
  ru: ['Легко', 'Средне', 'Сложно', 'Очень сложно'],
  en: ['Easy', 'Medium', 'Hard', 'Expert']
};

export const levelName = (level, lang) => (LEVEL_NAMES[lang] || LEVEL_NAMES.uz)[level] ?? '';
