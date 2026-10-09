with open('src/generators/pack/ui.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Dublikat funksiyani olib tashlash (faqat bittasini qoldirish)
import re

# Barcha addTimestampToFileName funksiyalarini topish
pattern = r'// PDF nomiga timestamp qo\'shish uchun yordamchi funksiya\nfunction addTimestampToFileName\(fileName\) \{[\s\S]*?\n\}\n\n?'
matches = re.findall(pattern, content)

# Agar 2 tadan ko'p bo'lsa, faqat birinchisini qoldirib, qolganlarini o'chirish
if len(matches) > 1:
    # Birinchi funksiyadan keyin barcha dublikatlarni o'chirish
    first_occurrence = content.find(matches[0])
    after_first = content[first_occurrence + len(matches[0]):]
    
    for match in matches[1:]:
        after_first = after_first.replace(match, '')
    
    content = content[:first_occurrence + len(matches[0])] + after_first

# 2. downloadPdf chaqiruvlarini tekshirish va to'g'rilash
# Agar addTimestampToFileName allaqachon qo'llanilgan bo'lsa, qo'shimcha qo'shmaslik
content = re.sub(
    r'downloadPdf\(pdf,\s*addTimestampToFileName\(addTimestampToFileName\(([^)]+)\)\)\)',
    r'downloadPdf(pdf, addTimestampToFileName(\1))',
    content
)

# Agar oddiy downloadPdf(pdf, name) bo'lsa, timestamp qo'shish
content = re.sub(
    r'downloadPdf\(pdf,\s*(?!addTimestampToFileName)(\w+)\)',
    r'downloadPdf(pdf, addTimestampToFileName(\1))',
    content
)

with open('src/generators/pack/ui.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Pack faylidagi dublikat olib tashlandi va downloadPdf to'g'rilandi!")
