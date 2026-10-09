with open('src/generators/pack/ui.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Yordamchi funksiyani qo'shish
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

# Birinchi importdan keyin qo'shish
content = content.replace(
    "import { t, getLang } from '../../core/i18n.js';",
    "import { t, getLang } from '../../core/i18n.js';\n" + timestamp_helper
)

# 2. downloadPdf chaqiruvlarini topib, fayl nomini o'zgartirish
content = content.replace(
    'downloadPdf(pdf, name);',
    'downloadPdf(pdf, addTimestampToFileName(name));'
)

with open('src/generators/pack/ui.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Pack (To'plam) PDF nomlariga timestamp qo'shildi!")
