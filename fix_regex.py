import re
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
    
    # showAnswer: dan boshlab, Javobni ko...rish gacha bo'lgan qo'shtirnoqlarni topamiz
    pattern = r"showAnswer:\s*['\"].*?Javobni ko.*?rish.*?['\"]"
    replacement = 'showAnswer: "Javobni ko\'rish"'
    
    if re.search(pattern, content):
        content = re.sub(pattern, replacement, content)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Tuzatildi: {filepath}")
    else:
        print(f"⚠️ Topilmadi: {filepath}")
