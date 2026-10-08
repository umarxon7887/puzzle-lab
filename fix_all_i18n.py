import re

# 1. i18n.js ga yangi kalitlarni qo'shish
with open('src/core/i18n.js', 'r', encoding='utf-8') as f:
    i18n = f.read()

# O'zbek tili uchun
i18n = i18n.replace(
    'packMazeLevel: "Qiyinlik"\n  },',
    '''packMazeLevel: "Qiyinlik",
    newGame: "Yangi",
    perPage: "PDF da: {n} ta bir sahifada",
    wordsCount: "{n} ta so'z",
    equationsCount: "{n} ta tenglama",
    emptyCells: "{n} bo'sh katak",
    generating: "Yaratilmoqda...",
    back: "Orqaga",
    shapeRect: "To'rtburchak",
    shapeCircle: "Doira",
    shapeStar: "Yulduz",
    shapeHeart: "Yurak",
    shapeTriangle: "Uchburchak"
  },'''
)

# Rus tili uchun
i18n = i18n.replace(
    'packMazeLevel: "Сложность"\n  },',
    '''packMazeLevel: "Сложность",
    newGame: "Новый",
    perPage: "В PDF: {n} на странице",
    wordsCount: "{n} слов",
    equationsCount: "{n} уравнений",
    emptyCells: "{n} пустых клеток",
    generating: "Создание...",
    back: "Назад",
    shapeRect: "Прямоугольник",
    shapeCircle: "Круг",
    shapeStar: "Звезда",
    shapeHeart: "Сердце",
    shapeTriangle: "Треугольник"
  },'''
)

# Ingliz tili uchun
i18n = i18n.replace(
    'packMazeLevel: "Difficulty"\n  }\n};',
    '''packMazeLevel: "Difficulty",
    newGame: "New",
    perPage: "In PDF: {n} per page",
    wordsCount: "{n} words",
    equationsCount: "{n} equations",
    emptyCells: "{n} empty cells",
    generating: "Generating...",
    back: "Back",
    shapeRect: "Rectangle",
    shapeCircle: "Circle",
    shapeStar: "Star",
    shapeHeart: "Heart",
    shapeTriangle: "Triangle"
  }
};'''
)

with open('src/core/i18n.js', 'w', encoding='utf-8') as f:
    f.write(i18n)

print("✅ i18n.js yangilandi!")

# 2. sudoku/ui.js ni tuzatish
with open('src/generators/sudoku/ui.js', 'r', encoding='utf-8') as f:
    sudoku = f.read()

sudoku = sudoku.replace("primaryText: '🔄 Yangi'", "primaryText: t('newGame')")
sudoku = sudoku.replace("new: 'Yangi'", "new: t('newGame')")

with open('src/generators/sudoku/ui.js', 'w', encoding='utf-8') as f:
    f.write(sudoku)

print("✅ sudoku/ui.js tuzatildi!")

# 3. wordsearch/ui.js ni tuzatish
with open('src/generators/wordsearch/ui.js', 'r', encoding='utf-8') as f:
    words = f.read()

words = words.replace("primaryText: '🔄 Yangi'", "primaryText: t('newGame')")
words = words.replace("new: 'Yangi'", "new: t('newGame')")
words = words.replace("${state.puzzle.total} ta so'z", "${t('wordsCount', state.puzzle.total)}")

with open('src/generators/wordsearch/ui.js', 'w', encoding='utf-8') as f:
    f.write(words)

print("✅ wordsearch/ui.js tuzatildi!")

# 4. crossword/ui.js ni tuzatish
with open('src/generators/crossword/ui.js', 'r', encoding='utf-8') as f:
    cross = f.read()

cross = cross.replace("primaryText: ' Yangi'", "primaryText: t('newGame')")
cross = cross.replace("new: 'Yangi'", "new: t('newGame')")
cross = cross.replace("${p.eqCount} ta tenglama", "${t('equationsCount', p.eqCount)}")
cross = cross.replace("${p.hiddenCount} bo'sh katak", "${t('emptyCells', p.hiddenCount)}")

with open('src/generators/crossword/ui.js', 'w', encoding='utf-8') as f:
    f.write(cross)

print("✅ crossword/ui.js tuzatildi!")

print("\n🎉 Barcha fayllar tuzatildi!")
