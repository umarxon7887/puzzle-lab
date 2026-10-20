# Topshiriqlar Lab · Лаборатория заданий · Puzzle Lab

![Topshiriqlar Lab](og.png)

Bolalar uchun mantiqiy topshiriqlar generatori: **labirint, sudoku, so'z qidiruv, sonli krossvord, «Kodni top»**.
Bir zumda yarating, javob varag'i bilan **A4 PDF** qilib chop eting. Bepul, ro'yxatdan o'tishsiz, internetsiz ham ishlaydi.

**Sayt:** https://umarxon7887.github.io/puzzle-lab/

[O'zbekcha](#ozbekcha) · [Русский](#русский) · [English](#english) · [Dasturchilar uchun](#dasturchilar-uchun)

---

## O'zbekcha

### Imkoniyatlar

- **5 ta generator**, har birida 4 ta daraja: Oson, O'rta, Qiyin, Juda qiyin.
  - **Labirint** — 8 xil shakl (to'rtburchak, doira, yulduz, yurak…), qahramon va manzil stikerlari, o'lchamni o'zingiz ham berishingiz mumkin.
  - **Sudoku** — 4×4 dan 9×9 gacha, diagonal (X) va shaklli bloklar (5×5, 7×7). Yechim har doim **yagona**; Oson va O'rta taxminsiz yechiladi.
  - **So'z qidiruv** — 11 ta mavzu (uch tilda) yoki o'zingiz yozgan so'zlar. Har bir so'z jadvalda **aynan bir marta** uchraydi. O'zbekcha **O‘** va **G‘** — bitta harf, bitta katakka yoziladi.
  - **Sonli krossvord** — kesishgan misollar (+, −, ×, ÷); har bir bo'sh katakcha mantiq bilan topiladi.
  - **Kodni top** — 3, 4 yoki 5 xonali kod va ishoralar; yechim yagona, ekranda javobni tekshirib ko'rish mumkin.
- **To'plam** — turli generatorlardan aralash topshiriqlar: har turdan nechtadan kerakligini tanlang, ko'rib chiqing, keragini almashtiring yoki olib tashlang, so'ng **bitta PDF** (topshiriqlar, javoblar yoki ikkalasi) qilib oling.
- Bir varaqda **1, 2 yoki 4 ta** topshiriq (qirqish chiziqlari bilan), **ism va sana** uchun qator.
- Varaq tepasidagi matnni o'zgartirish va o'lchamini tanlash mumkin.
- **Topshiriq raqami**: bir xil raqam va sozlamalar har doim aynan bir xil topshiriqni beradi — raqamni yozib qo'ysangiz, keyin javobini ham topasiz. Raqam varaq pastida va fayl nomida ko'rsatiladi.
- **Uch til**: o'zbekcha, ruscha, inglizcha (sahifa yangilanmasdan almashadi).
- Telefonga ilova kabi o'rnatiladi va **internetsiz** ishlaydi.

### Qanday ishlatiladi

1. Saytni oching va generatorni tanlang (yoki **To'plam yaratish**).
2. Darajani va turini tanlang. Pastdagi **Yangi topshiriq** tugmasi har safar yangisini yaratadi.
3. 👁 tugmasi javobni ekranda ko'rsatadi, ⚙ — qo'shimcha sozlamalar (bir varaqda nechta, ism qatori, raqam).
4. ⬇ tugmasi: **Topshiriq**, **Javob varag'i** yoki **Ikkalasi (bitta faylda)**.

Fayl nomlari: `123456 raqamli labirint.pdf`, `123456 raqamli labirint javobi.pdf`.

### Telefonga o'rnatish

Chrome'da saytni oching → menyu (⋮) → **Bosh ekranga qo'shish**. Safari'da: **Ulashish** → **Bosh ekranga**.

---

## Русский

Генератор логических заданий для детей: **лабиринт, судоку, «Найди слова», числовой кроссворд, «Взломай код»**. Каждое задание — за секунду, с листом ответов, в **PDF A4**. Бесплатно, без регистрации, работает без интернета.

- 4 уровня сложности; у судоку, кроссворда и «Взломай код» решение всегда **единственное**.
- **Набор**: задания разных видов в одном PDF (задания, ответы или оба), с просмотром, заменой и удалением.
- 1, 2 или 4 задания на листе, строка для имени и даты, свой текст заголовка.
- **Номер задания**: тот же номер и настройки всегда дают то же задание.
- Языки: узбекский, русский, английский.

## English

A logic puzzle generator for kids: **maze, sudoku, word search, math crossword, crack the code**. Every puzzle comes with an answer sheet as a print-ready **A4 PDF**. Free, no sign-up, works offline.

- 4 difficulty levels; sudoku, math crossword and crack-the-code puzzles always have a **unique** solution.
- **Pack**: mix different puzzles into one PDF (puzzles, answers or both), with review, replace and remove.
- 1, 2 or 4 puzzles per page, a name/date line, custom title text.
- **Puzzle number**: the same number and settings always produce the same puzzle.
- Languages: Uzbek, Russian, English.

---

## Dasturchilar uchun

Sayt — oddiy HTML + CSS + JavaScript (ES modullar). **Yig'ish (build) shart emas**, kutubxonalar yo'q.
GitHub Pages fayllarni to'g'ridan-to'g'ri ko'rsatadi.

### Tuzilishi

```
index.html              — sahifa qobig'i (sarlavha va <main>)
style.css               — barcha uslublar
sw.js                   — oflayn ishlash (Service Worker)
manifest.json           — telefonga o'rnatish (PWA)
src/
  app.js                — kirish nuqtasi: til, sahifalar (#/, #/pack, #/maze …)
  core/                 — umumiy qismlar (brauzersiz ham ishlaydi, testlanadi)
    rng.js              — seed bilan tasodifiy sonlar (bir xil seed → bir xil natija)
    levels.js           — daraja nomlari
    draw.js             — canvas'da chizish yordamchilari (o'lchamlar millimetrda)
    sheet.js            — A4 varaqni yig'ish: 1/2/4 joy, sarlavha, ism qatori, pastki yozuv
    pdf.js              — ko'p sahifali PDF (kutubxonasiz)
    i18n.js             — interfeys matnlari (uz / ru / en)
    storage.js, files.js
  generators/           — har bir generator — BITTA fayl
    maze.js  sudoku.js  wordsearch.js (+ wordsearch-words.js)  crossword.js  code.js
    registry.js         — generatorlar ro'yxati
  ui/                   — sahifalar: home.js, generator-page.js, pack-page.js va yordamchilar
tests/run.mjs           — testlar (Node bilan)
```

### Generator "shartnomasi"

Har bir generator quyidagilarni beradi — qolgan hammasini (sahifa, sozlamalar paneli, ko'rinish,
"bir varaqda nechta", PDF, to'plam, oflayn) umumiy kod bajaradi:

```js
export default {
  id: 'maze',                                   // manzil: #/maze
  name: { uz, ru, en }, desc: { uz, ru, en },   // nomi va qisqa tavsifi
  defaultTitle: { uz, ru, en },                 // varaq tepasidagi standart matn
  fileBase: { uz, ru, en },                     // fayl nomi uchun
  options: [                                    // sozlamalar — panel shulardan avtomatik yasaladi
    { key: 'level', type: 'level', default: 1 },
    { key: 'shape', type: 'choice', style: 'icons' | 'cards', choices: [...], default, pack: 'select' | 'random' },
    { key: 'hero', type: 'emoji', choices: [...] },
    { key: 'words', type: 'text', when: opts => ... },
    { key: 'w', type: 'number', advanced: true, min, max }
  ],
  generate(opts, seed),          // TOZA funksiya: bir xil (opts, seed) → bir xil topshiriq (oddiy ma'lumot)
  draw(ctx, puzzle, box, { showSolution, lang }),  // box = {x, y, w, h} millimetrda; faqat shu joyga chizadi
  info(puzzle, lang),            // varaq pastidagi qisqa ma'lumot: "10×14, Yulduz"
  hint(puzzle, drawInfo, lang),  // ekrandagi izoh: { text, warn }
  check(puzzle),                 // testlar uchun: muammolar ro'yxati ([] — hammasi joyida)
  cover: '<svg …>'               // bosh sahifadagi ikonka
}
```

### Yangi generator qo'shish (masalan, 6-chi)

1. `src/generators/` ichida yangi fayl yarating (`maze.js` ni namuna qiling) va yuqoridagi maydonlarni yozing.
2. `src/generators/registry.js` ga import qilib, `GENERATORS` ro'yxatiga qo'shing.
3. Faylni `sw.js` dagi `CORE` ro'yxatiga yozing va `VERSION` ni oshiring.
4. `npm test` — test yangi generatorni ham avtomatik tekshiradi: barcha darajalar, bir xil raqam → bir xil
   topshiriq, chizma varaqning 1, 2 va 4 qismiga sig'ishi, uch tildagi matnlar.

Bosh sahifa, alohida sahifa va "To'plam" uni o'zi ko'radi.

### GitHub Codespaces'da ishlash

```bash
npm test                    # barcha testlar (5–10 soniya); tezkor: npm run test:quick
npm start                   # sayt: http://localhost:8080 (Codespaces "Ports" oynasida ochiladi)
```

O'zgarishlarni saqlash:

```bash
git add -A
git commit -m "Nima o'zgardi"
git push
```

Bir-ikki daqiqada sayt GitHub Pages'da yangilanadi. Brauzer eski nusxani ko'rsatsa — sahifani bir marta yangilang
(Service Worker yangi versiyani yuklab oladi).

### Muhim qoidalar

- Generator ichida `Math.random()` ishlatilmaydi — faqat `makeRng(seed)`. Aks holda topshiriq va javob mos kelmay qoladi.
- Chizishda o'lchamlar **millimetrda**: bir xil kod ekrandagi ko'rinishni ham, 300 dpi PDF'ni ham chizadi.
- Yangi matn qo'shsangiz — uch tilda ham yozing (`npm test` yetishmayotganini ko'rsatadi).
