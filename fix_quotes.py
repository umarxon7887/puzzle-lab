import os

files = [
    'src/generators/maze/ui.js',
    'src/generators/wordsearch/ui.js',
    'src/generators/crossword/ui.js'
]

for filepath in files:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        changed = False
        for i in range(len(lines)):
            if "Javobni ko" in lines[i] and "rish" in lines[i]:
                # Barcha noto'g'ri variantlarni to'g'ri "Javobni ko'rish" ga almashtiramiz
                lines[i] = lines[i].replace("showAnswer: 'Javobni ko'''rish'", 'showAnswer: "Javobni ko\'rish"')
                lines[i] = lines[i].replace("showAnswer: 'Javobni ko''rish'", 'showAnswer: "Javobni ko\'rish"')
                lines[i] = lines[i].replace("showAnswer: 'Javobni ko\\'\\'\\'rish'", 'showAnswer: "Javobni ko\'rish"')
                changed = True
        
        if changed:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.writelines(lines)
            print(f"✅ Tuzatildi: {filepath}")
        else:
            print(f"⚠️ O'zgarish topilmadi: {filepath}")
    else:
        print(f"❌ Fayl topilmadi: {filepath}")
