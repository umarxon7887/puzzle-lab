import os

files = [
    'src/generators/maze/ui.js',
    'src/generators/wordsearch/ui.js',
    'src/generators/crossword/ui.js'
]

for filepath in files:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Noto'g'ri pattern: 'Javobni ko'''rish'
        # To'g'ri pattern: "Javobni ko'rish"
        old_pattern = "'Javobni ko'''rish'"
        new_pattern = '"Javobni ko\'rish"'
        
        if old_pattern in content:
            content = content.replace(old_pattern, new_pattern)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Tuzatildi: {filepath}")
        else:
            print(f"⚠️ Pattern topilmadi: {filepath}")
    else:
        print(f"❌ Fayl topilmadi: {filepath}")
