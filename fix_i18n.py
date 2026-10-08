with open('src/core/i18n.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Yetishmayotgan kalitlarni qo'shish uchun joylar
additions = """
    generating: "Yaratilmoqda...",
    back: "Orqaga",
    shapeRect: "To'rtburchak",
    shapeCircle: "Doira",
    shapeStar: "Yulduz",
    shapeHeart: "Yurak",
    shapeTriangle: "Uchburchak",
"""

additions_ru = """
    generating: "Создание...",
    back: "Назад",
    shapeRect: "Прямоугольник",
    shapeCircle: "Круг",
    shapeStar: "Звезда",
    shapeHeart: "Сердце",
    shapeTriangle: "Треугольник",
"""

additions_en = """
    generating: "Generating...",
    back: "Back",
    shapeRect: "Rectangle",
    shapeCircle: "Circle",
    shapeStar: "Star",
    shapeHeart: "Heart",
    shapeTriangle: "Triangle",
"""

# O'zbek tili uchun qo'shish
content = content.replace('packMazeLevel: "Qiyinlik"\n  },', 'packMazeLevel: "Qiyinlik",\n' + additions + '  },')
# Rus tili uchun
content = content.replace('packMazeLevel: "Сложность"\n  },', 'packMazeLevel: "Сложность",\n' + additions_ru + '  },')
# Ingliz tili uchun
content = content.replace('packMazeLevel: "Difficulty"\n  }\n};', 'packMazeLevel: "Difficulty",\n' + additions_en + '  }\n};')

with open('src/core/i18n.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ i18n.js yangilandi!")
