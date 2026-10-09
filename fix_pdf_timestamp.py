import re
from datetime import datetime

# Barcha generator fayllari
files = [
    'src/generators/code/ui.js',
    'src/generators/maze/ui.js',
    'src/generators/sudoku/ui.js',
    'src/generators/wordsearch/ui.js',
    'src/generators/crossword/ui.js',
    'src/generators/pack/ui.js'
]

# Timestamp qo'shish uchun yordamchi funksiya
# Fayl nomini oladi va timestamp qo'shilgan nomni qaytaradi
timestamp_helper = """
// PDF nomiga timestamp qo'shish uchun yordamchi funksiya
function addTimestampToFileName(fileName) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return `${fileName}_${timestamp}`;
  return `${fileName.slice(0, lastDot)}_${timestamp}${fileName.slice(lastDot)}`;
}
"""

for filepath in files:
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        # 1. Yordamchi funksiyani fayl boshiga qo'shish (importlardan keyin)
        if 'addTimestampToFileName' not in content:
            # Birinchi importdan keyin qo'shish
            content = re.sub(
                r'(import .+?;\n)',
                r'\1' + timestamp_helper,
                content,
                count=1
            )
        
        # 2. downloadPdf chaqiruvlarini topib, fayl nomini o'zgartirish
        # Pattern: downloadPdf(pdf, fileName) -> downloadPdf(pdf, addTimestampToFileName(fileName))
        content = re.sub(
            r'downloadPdf\((\w+),\s*(\w+)\)',
            r'downloadPdf(\1, addTimestampToFileName(\2))',
            content
        )
        
        # 3. Agar to'g'ridan-to'g'ri string bilan downloadPdf chaqirilgan bo'lsa
        # downloadPdf(pdf, "someName.pdf") -> downloadPdf(pdf, addTimestampToFileName("someName.pdf"))
        content = re.sub(
            r'downloadPdf\((\w+),\s*(`[^`]+`|"[^"]+"|\'[^\']+\')\)',
            r'downloadPdf(\1, addTimestampToFileName(\2))',
            content
        )
        
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ {filepath} yangilandi!")
        else:
            print(f"⚠️  {filepath} - o'zgarish topilmadi")
    except FileNotFoundError:
        print(f"❌ {filepath} topilmadi")

print("\n🎉 Barcha PDF nomlariga timestamp qo'shildi!")
print("Endi har bir yuklangan PDF noyob nomga ega bo'ladi.")
