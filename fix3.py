files = [
    'src/generators/maze/ui.js',
    'src/generators/wordsearch/ui.js',
    'src/generators/crossword/ui.js'
]

# Noto'g'ri matn (3 ta apostrof bilan)
old = "showAnswer: 'Javobni ko'''rish'"
# To'g'ri matn (ikki tirnoq ichida, 1 ta apostrof)
new = 'showAnswer: "Javobni ko\'rish"'

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if old in content:
        content = content.replace(old, new)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Tuzatildi: {filepath}")
    else:
        print(f"⚠️ Topilmadi: {filepath}")
