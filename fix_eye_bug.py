import re

# ==========================================
# 1. SO'Z QIDIRUV (wordsearch/ui.js) ni tuzatish
# ==========================================
with open('src/generators/wordsearch/ui.js', 'r', encoding='utf-8') as f:
    ws = f.read()

# 1.1. state ga showAnswer qo'shish
if 'showAnswer:' not in ws:
    ws = re.sub(
        r'(let state = \{[^}]*puzzle: null,)',
        r'\1\n  showAnswer: false,',
        ws
    )

# 1.2. renderActionBar ga onToggleAnswer qo'shish
ws = re.sub(
    r'(showPdf: true, showSettings: true, showAnswer: true,)',
    r'\1\n    isAnswerShown: state.showAnswer,\n    onToggleAnswer: () => { state.showAnswer = !state.showAnswer; render(container); },',
    ws
)

# 1.3. Grid chizishda javobni ko'rsatish (HTML qismida)
# Agar showAnswer true bo'lsa va katak yechimga tegishli bo'lsa, yashil fon beramiz
ws = re.sub(
    r'(<div class="ws-cell"[^>]*>)(\$\{cell\.char\})',
    r'\1\2\${ state.showAnswer && cell.isSolution ? \' style="background:#4CAF50;color:white;font-weight:900;"\' : \'\' }',
    ws
)

with open('src/generators/wordsearch/ui.js', 'w', encoding='utf-8') as f:
    f.write(ws)
print("✅ So'z qidiruv (wordsearch) tuzatildi!")

# ==========================================
# 2. KROSSVORD (crossword/ui.js) ni tuzatish
# ==========================================
with open('src/generators/crossword/ui.js', 'r', encoding='utf-8') as f:
    cw = f.read()

# 2.1. state ga showAnswer qo'shish
if 'showAnswer:' not in cw:
    cw = re.sub(
        r'(let state = \{[^}]*puzzle: null,)',
        r'\1\n  showAnswer: false,',
        cw
    )

# 2.2. renderActionBar ga onToggleAnswer qo'shish
cw = re.sub(
    r'(showPdf: true, showSettings: true, showAnswer: true,)',
    r'\1\n    isAnswerShown: state.showAnswer,\n    onToggleAnswer: () => { state.showAnswer = !state.showAnswer; render(container); },',
    cw
)

# 2.3. Inputlarga javobni yozish (Agar showAnswer true bo'lsa)
cw = re.sub(
    r'(<input[^>]*class="cw-input"[^>]*value=")\$\{cell\.userVal \|\| \'\'\}',
    r'\1\${state.showAnswer ? cell.answer : (cell.userVal || \'\')}',
    cw
)

# Inputga style qo'shish (javob ko'rsatilganda och ko'k fon)
cw = re.sub(
    r'(<input[^>]*class="cw-input"[^>]*>)',
    r'\1\${ state.showAnswer ? \' style="background:#e0f2fe; font-weight:900; color:#0369a1;"\' : \'\' }',
    cw
)

with open('src/generators/crossword/ui.js', 'w', encoding='utf-8') as f:
    f.write(cw)
print("✅ Krossvord (crossword) tuzatildi!")

print("\n🎉 Ikkala o'yinda ham 'Ko'z' belgisi endi to'g'ri ishlaydi!")
