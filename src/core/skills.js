// skills.js — topshiriqlar rivojlantiradigan ko'nikmalar ro'yxati.
// Har bir generatorda `skills: ['attention', 'visual']` kabi maydon bor (birinchisi — asosiysi).
// Hozircha saytda ko'rinmaydi: kelajakdagi «yosh bo'yicha» va «haftalik/oylik reja» funksiyalari
// topshiriqlarni shu belgilar bo'yicha aralashtirib beradi (har hafta bir xil ko'nikma emas, hammasi).

export const SKILLS = {
  attention: { uz: 'Diqqat', ru: 'Внимание', en: 'Attention' },
  memory: { uz: 'Xotira', ru: 'Память', en: 'Memory' },
  speed: { uz: 'Tez ishlash', ru: 'Скорость', en: 'Processing speed' },
  visual: { uz: 'Ko\'rib farqlash', ru: 'Зрительное восприятие', en: 'Visual perception' },
  spatial: { uz: 'Fazoviy tasavvur', ru: 'Пространственное мышление', en: 'Spatial reasoning' },
  logic: { uz: 'Mantiqiy fikrlash', ru: 'Логическое мышление', en: 'Logical reasoning' },
  patterns: { uz: 'Qonuniyatni topish', ru: 'Поиск закономерностей', en: 'Pattern finding' },
  counting: { uz: 'Sanash va hisob', ru: 'Счёт', en: 'Counting and arithmetic' },
  language: { uz: 'So\'z boyligi va alifbo', ru: 'Речь и алфавит', en: 'Vocabulary and alphabet' },
  motor: { uz: 'Qo\'l motorikasi va chizish', ru: 'Мелкая моторика и рисование', en: 'Fine motor skills and drawing' }
};

export const SKILL_KEYS = Object.keys(SKILLS);

