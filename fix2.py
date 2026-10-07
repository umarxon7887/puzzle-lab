import os
import re

files = [
    'src/generators/maze/ui.js',
    'src/generators/wordsearch/ui.js',
    'src/generators/crossword/ui.js'
]

for filepath in files:
    if not os.path.exists(filepath):
        print(f"❌ Fayl topilmadi: {filepath}")
        continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    changed = False
    for i in range(len(lines)):
        line = lines[i]
        # "Javobni ko" va "rish" so'zlari bor qatorni topamiz
        if 'Javobni ko' in line and 'rish' in line and 'showAnswer' in line:
            print(f"📍 {filepath}:{i+1} - Topildi!")
            print(f"   Eski: {repr(line.strip())}")
            # Noto'g'ri qismni to'g'ri qism bilan almashtiramiz
            # showAnswer: 'Javobni ko...rish' ni showAnswer: "Javobni ko'rish" ga almashtiramiz
            lines[i] = re.sub(
                r"showAnswer:\s*'[^']*Javobni ko[^']*rish[^']*'",
                'showAnswer: "Javobni ko\'rish"',
                line
            )
            print(f"   Yangi: {repr(lines[i].strip())}")
            changed = True
    
    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print(f"✅ Saqlandi: {filepath}\n")
    else:
        print(f"⚠️ O'zgarish yo'q: {filepath}\n")
