// oddone-items.js — "Ortiqchasini top" uchun rasmlar (emoji) va ularning toifalari.
//
// Har bir rasmning bir yoki bir nechta toifasi bor. Masalan, 🐔 — ham uy hayvoni, ham qush.
// Qator tuzishda ko'pchilik rasmlar A toifadan (va B toifaga kirmaydi), bittasi B toifadan
// (va A ga kirmaydi) olinadi. Shuning uchun 🐔 "uy hayvonlari va qushlar" qatorida ishlatilmaydi —
// aks holda javob ikki xil bo'lib qolardi.
// "~toifa" — rasm shu toifaga yaqin, lekin unga kirmaydi (🦆 suvda suzadi, lekin baliq emas):
// bunday rasm shu toifa ishtirok etgan qatorlarga umuman olinmaydi.
//
// Ataylab olib tashlanganlar: 🍉 (o'zbekchada poliz mahsuloti, meva emas), 🍅 (meva yoki sabzavot?),
// 🍳 ☕ 🥣 (idishmi yoki taommi?), 🐧 🐸 🐢 🐌 🕷 (toifasi bolalar uchun noaniq), 🐷 (madaniy sabab).

export const GROUPS = {
  food: ['fruit', 'vegetable', 'sweet'],
  animal: ['domestic', 'wild', 'bird', 'sea', 'insect'],
  transport: ['land', 'air', 'water'],
  wear: ['clothes', 'shoes'],
  object: ['school', 'ball', 'music', 'device'],
  place: ['building'],
  nature: ['flower', 'tree', 'weather']
};

// Toifa nomlari: [bittasi, ko'plik]. Javob varag'ida: "sabzavot, qolganlari — mevalar"
export const CATS = {
  fruit: { uz: ['meva', 'mevalar'], ru: ['фрукт', 'фрукты'], en: ['a fruit', 'fruits'] },
  vegetable: { uz: ['sabzavot', 'sabzavotlar'], ru: ['овощ', 'овощи'], en: ['a vegetable', 'vegetables'] },
  sweet: { uz: ['shirinlik', 'shirinliklar'], ru: ['сладость', 'сладости'], en: ['a sweet', 'sweets'] },
  domestic: { uz: ['uy hayvoni', 'uy hayvonlari'], ru: ['домашнее животное', 'домашние животные'], en: ['a farm or pet animal', 'farm and pet animals'] },
  wild: { uz: ['yovvoyi hayvon', 'yovvoyi hayvonlar'], ru: ['дикое животное', 'дикие животные'], en: ['a wild animal', 'wild animals'] },
  bird: { uz: ['qush', 'qushlar'], ru: ['птица', 'птицы'], en: ['a bird', 'birds'] },
  sea: { uz: ['suv jonivori', 'suv jonivorlari'], ru: ['морской житель', 'морские жители'], en: ['a sea creature', 'sea creatures'] },
  insect: { uz: ['hasharot', 'hasharotlar'], ru: ['насекомое', 'насекомые'], en: ['an insect', 'insects'] },
  land: { uz: ['quruqlik transporti', 'quruqlik transporti'], ru: ['наземный транспорт', 'наземный транспорт'], en: ['a land vehicle', 'land vehicles'] },
  air: { uz: ['havo transporti', 'havo transporti'], ru: ['воздушный транспорт', 'воздушный транспорт'], en: ['a flying vehicle', 'flying vehicles'] },
  water: { uz: ['suv transporti', 'suv transporti'], ru: ['водный транспорт', 'водный транспорт'], en: ['a boat or ship', 'boats and ships'] },
  clothes: { uz: ['kiyim', 'kiyimlar'], ru: ['одежда', 'одежда'], en: ['clothing', 'clothes'] },
  shoes: { uz: ['poyabzal', 'poyabzallar'], ru: ['обувь', 'обувь'], en: ['footwear', 'shoes'] },
  school: { uz: ["o'quv quroli", "o'quv qurollari"], ru: ['школьная принадлежность', 'школьные принадлежности'], en: ['a school supply', 'school supplies'] },
  ball: { uz: ["to'p", "to'plar"], ru: ['мяч', 'мячи'], en: ['a ball', 'balls'] },
  music: { uz: ["cholg'u asbobi", "cholg'u asboblari"], ru: ['музыкальный инструмент', 'музыкальные инструменты'], en: ['a musical instrument', 'musical instruments'] },
  device: { uz: ['texnika', 'texnika'], ru: ['техника', 'техника'], en: ['a gadget', 'gadgets'] },
  building: { uz: ['bino', 'binolar'], ru: ['здание', 'здания'], en: ['a building', 'buildings'] },
  flower: { uz: ['gul', 'gullar'], ru: ['цветок', 'цветы'], en: ['a flower', 'flowers'] },
  tree: { uz: ['daraxt', 'daraxtlar'], ru: ['дерево', 'деревья'], en: ['a tree', 'trees'] },
  weather: { uz: ['ob-havo', 'ob-havo hodisalari'], ru: ['погода', 'погодные явления'], en: ['weather', 'kinds of weather'] }
};

// Ba'zi belgilar (✈ ✏ ☀ …) oddiy matn bo'lib chiqmasligi uchun oxiriga U+FE0F qo'shiladi
const TEXT_DEFAULT = new Set([0x2708, 0x270F, 0x2702, 0x2600, 0x2744, 0x2601, 0x260E, 0x1F54A, 0x1F336, 0x1F6E9,
  0x26F4, 0x1F6F3, 0x1F58D, 0x1F58A, 0x1F5A5, 0x1F5A8, 0x1F327, 0x1F32A]);
const em = s => (TEXT_DEFAULT.has(s.codePointAt(0)) && !s.includes('️') ? s + '️' : s);
const list = (str, ...tags) => str.trim().split(/\s+/).map(e => [em(e), ...tags]);

// [emoji, ...toifalar]
export const ITEMS = [
  ...list('🍎 🍐 🍊 🍋 🍌 🍇 🍓 🍒 🍑 🥝 🍍', 'fruit'),
  ...list('🥕 🌽 🥒 🥔 🍆 🥦 🥬 🌶', 'vegetable'),
  ...list('🍰 🎂 🍩 🍪 🍫 🍬 🍭 🍦 🧁', 'sweet'),
  ...list('🐶 🐱 🐮 🐴 🐑 🐐', 'domestic'),
  ...list('🐔 🦃', 'domestic', 'bird'),
  ...list('🦆', 'domestic', 'bird', '~sea'),
  ...list('🦢', 'bird', '~sea'),
  ...list('🦜', 'bird', '~domestic', '~wild'),
  ...list('🦁 🐯 🐻 🐺 🦊 🐘 🦒 🦓 🐒 🐼 🐨', 'wild'),
  ...list('🐦 🦅 🦉 🕊', 'bird'),
  ...list('🐟 🐠 🐡 🦈 🐙 🦀 🐬 🐳 🦑', 'sea'),
  ...list('🐝 🐞 🦋 🐜 🐛 🦗', 'insect'),
  ...list('🚗 🚕 🚌 🚎 🚓 🚑 🚒 🚜 🛵 🚲 🚂 🚚', 'land'),
  ...list('✈ 🚁 🚀 🛩', 'air'),
  ...list('🚢 ⛵ 🚤 🛶 ⛴ 🛳', 'water'),
  ...list('👕 👖 👗 🧥 🧣 🧢 👚 👔 🧤', 'clothes'),
  ...list('👟 👞 👠 👢 🥾 👡', 'shoes'),
  ...list('✏ 📏 📐 📚 📒 ✂ 🖍 🎒 🖊 📓', 'school'),
  ...list('⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉', 'ball'),
  ...list('🎸 🎹 🎺 🎻 🥁 🎷', 'music'),
  ...list('💻 📱 ⌚ 📷 📺 🖥 ☎ 🖨', 'device'),
  ...list('🏠 🏫 🏥 🏰 🏭 🏦 🏢 🏪', 'building'),
  ...list('🌸 🌷 🌹 🌻 🌼 🌺 💐', 'flower'),
  ...list('🌳 🌲 🌴', 'tree'),
  ...list('☀ 🌧 ❄ ⛅ 🌈 ⚡ 🌪 ☁', 'weather')
];

// Toifaga kiradimi (inCat) va toifaga kiradi yoki yaqinmi (nearCat)
export const inCat = (tags, c) => tags.includes(c);
export const nearCat = (tags, c) => tags.includes(c) || tags.includes('~' + c);
// A toifali, lekin B ga kirmaydigan va yaqin ham bo'lmagan rasmlar
export const eligible = (a, b) => ITEMS.filter(([, ...t]) => inCat(t, a) && !nearCat(t, b)).map(x => x[0]);

// O'rta daraja: bir guruh ichida, lekin farqi aniq: [ko'pchilik, ortiqcha]
export const PAIRS_MEDIUM = [
  ['fruit', 'vegetable'], ['vegetable', 'fruit'], ['fruit', 'sweet'], ['sweet', 'fruit'], ['vegetable', 'sweet'],
  ['domestic', 'wild'], ['wild', 'domestic'], ['domestic', 'sea'], ['sea', 'domestic'], ['bird', 'sea'],
  ['sea', 'bird'], ['insect', 'sea'], ['sea', 'insect'], ['domestic', 'bird'], ['bird', 'domestic'],
  ['land', 'air'], ['land', 'water'], ['water', 'land'], ['air', 'land'],
  ['school', 'ball'], ['ball', 'school'], ['music', 'ball'], ['ball', 'music'], ['device', 'school'], ['school', 'device'],
  ['flower', 'weather'], ['weather', 'flower']
];

// Qiyin daraja: o'xshash narsalar orasida farq (ikkalasi ham uchadi, ikkalasi ham kiyiladi…)
export const PAIRS_HARD = [
  ['bird', 'insect'], ['insect', 'bird'], ['clothes', 'shoes'], ['shoes', 'clothes'], ['water', 'air'],
  ['air', 'water'], ['device', 'music'], ['music', 'device'], ['flower', 'tree'], ['wild', 'domestic'],
  ['domestic', 'wild'], ['land', 'water']
];
