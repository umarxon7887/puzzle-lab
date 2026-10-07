import os

files = [
    'src/generators/maze/ui.js',
    'src/generators/wordsearch/ui.js',
    'src/generators/crossword/ui.js'
]

for filepath in files:
    if not os.path.exists(filepath):
        continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Noto'g'ri qismni to'g'ri qism bilan almashtiramiz
    old = '''showAnswer: "Javobni ko'rish"Javobni yashirish' }'''
    new = '''showAnswer: "Javobni ko'rish", hideAnswer: "Javobni yashirish" }'''
    
    if old in content:
        content = content.replace(old, new)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Tuzatildi: {filepath}")
    else:
        print(f"️ Topilmadi: {filepath}")
