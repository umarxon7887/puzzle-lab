# MANTIQJON savollar banki — AI (Claude) uchun qo'llanma

Bu papkada mantiqjon.uz testlari uchun savollar banki va test generatori bor.
AI dasturni to'liq boshqara oladi: savollarni ko'rish, qo'shish, tahrirlash, o'chirish,
butun testni import qilish, yangi test yaratish va PDF qilish. Dastur oynasi ochiq bo'lsa,
AI qilgan o'zgarish 2–3 soniyada oynada ko'rinadi.

## Fayllar

| Fayl | Nima |
|---|---|
| `bank.json` | **Yagona manba.** Barcha savollar va saqlangan testlar. |
| `mjbank.py` | Server (dastur oynasi), buyruqlar (CLI) va MCP server. Faqat Python 3. |
| `mantiqjon_bank.html` | Dastur oynasi (server orqali ochiladi). |
| `ishga_tushir.sh` | Oynani ochadi (ish stoli yorlig'i shuni chaqiradi). |

## Savol tuzilishi (`bank.json` → `savollar[]`)

```json
{
  "id": "S0012",
  "sinf": [3, 4],
  "ball": 4,
  "matn": "Savol matni...\n[rasm: rasm1.svg, 30%]\nA) 12\nB) 15\nC) 16\nD) 30\nE) 39",
  "javob": "B",
  "manba": "Kenguru 1997, 3–4-sinf, 19-savol",
  "teglar": ["kenguru"],
  "izoh": "",
  "rasmlar": {"rasm1.svg": "data:image/svg+xml;base64,..."},
  "yaratildi": "2026-11-26T08:33:55",
  "ozgartirildi": "2026-11-26T08:33:55"
}
```

- `sinf` — savol mos keladigan sinflar ro'yxati (1–11). `ball` — 3, 4 yoki 5.
- `javob` — A–E (bo'sh bo'lishi mumkin, lekin kalit jadvalida "?" chiqadi).
- `id`, `yaratildi`, `ozgartirildi` ni dastur o'zi qo'yadi.

## Savol matni qoidalari (muharrir bilan bir xil)

- Raqam yozilmaydi — test yaratilganda qo'yiladi. Bo'sh qator = yangi xatboshi.
- Variantlar: `A) ...` … `E) ...`, har biri alohida qatorda.
- `[rasm: nom, 30%]` — rasm o'ngda; `[rasm-past: nom, 60%]` — rasm matn tagida.
- `[rasm: nom, 24%, x:-5, y:3]` — rasm o'z joyidan millimetrda surilgan (oynada sichqoncha bilan surilganda shunday yoziladi).
- `A) [rasm: a.svg]` — variantlar rasm bo'lsa, beshtasi bir qatorga tushadi.
- `**qalin**`, `*qiya*`, `x^{2}`, `a_{1}`, `[[SO'Z]]` (ramkali kartochka).
- Rasmlar `rasmlar` ichida data URL bo'lib turadi. Chizmalarni SVG qilish afzal (chop etishda tiniq).
  SVG da `viewBox` (katta B bilan) bo'lishi shart.

## 1-usul: buyruqlar (eng oddiy)

```bash
cd <shu papka>
python3 mjbank.py stats                                   # nechta savol, sinf×ball jadvali
python3 mjbank.py rules                                   # matn qoidalari
python3 mjbank.py list --sinf 3 --ball 4 [--qidir so'z] [--manba Kenguru] [--javobsiz] [--json]
python3 mjbank.py show S0012 [--rasmsiz]                  # to'liq JSON
python3 mjbank.py add savol.json                          # bitta savol yoki ro'yxat; '-' = stdin
python3 mjbank.py edit S0012 --javob C --ball 5 --sinf 4 5 --manba "..." --teglar "a, b"
python3 mjbank.py edit S0012 --matn-fayl yangi_matn.txt   # matnni almashtirish
python3 mjbank.py edit S0012 --rasm rasm1.svg chizma.svg  # rasm qo'shish/almashtirish
python3 mjbank.py edit S0012 --json '{"izoh": "yechim: ..."}'
python3 mjbank.py delete S0012
python3 mjbank.py import test.mjtest --sinf 3 4 --manba "Kenguru 1999, 3–4-sinf" [--kalit BEDDB...] [--sinov]
python3 mjbank.py generate --sinf 3 --soni 10 10 5 [--sarlavha "..."] [--ishlatilmagan] [--save] [--pdf test.pdf] [--mjtest test.mjtest]
python3 mjbank.py tests
python3 mjbank.py pdf T0003 test.pdf
python3 mjbank.py mjtest T0003 test.mjtest                # muharrirda ochish uchun
python3 mjbank.py delete-test T0003
```

`import` butun testni (muharrir `.mjtest` fayli yoki matn) savollarga bo'ladi:
`# 3 ballik savollar` sarlavhasi ballni beradi, `1. ...` savollarni ajratadi, javob har savol
tagida `Javob: B` qatori yoki `--kalit` bilan beriladi. Bankda aynan shu matnli savol bo'lsa,
u qayta qo'shilmaydi. Avval `--sinov` bilan tekshirib ko'ring.

## 2-usul: MCP server (Claude Desktop / Claude Code)

```bash
claude mcp add mantiqjon-bank -s user -- python3 /TO'LIQ/YO'L/mjbank.py mcp
```

Asboblar: `bank_holati`, `qoidalar`, `savollar_royxati`, `savol_olish`, `savol_qoshish`,
`savol_tahrirlash`, `savol_ochirish`, `test_import`, `test_yaratish`, `testlar_royxati`,
`test_tahrirlash`, `test_ochirish`, `test_pdf`, `test_mjtest`.

## 3-usul: HTTP API (dastur oynasi ochiq bo'lganda, http://127.0.0.1:8765)

| So'rov | Nima |
|---|---|
| `GET /api/holat` | versiya, savollar soni |
| `GET /api/bank` | butun bank |
| `GET /api/savollar?sinf=3&ball=4&qidir=...` | ro'yxat (rasmlar faqat nomi) |
| `GET /api/savollar/S0012` | bitta savol to'liq |
| `POST /api/savollar` | qo'shish (bitta yoki ro'yxat) |
| `PATCH /api/savollar/S0012` | qisman tahrirlash; `PUT` — to'liq almashtirish |
| `DELETE /api/savollar/S0012` | o'chirish |
| `POST /api/import` | `{matn, rasmlar, sinf, manba, kalit, sinov}` |
| `POST /api/yarat` | `{sinf, soni:{"3":10,"4":10,"5":5}, sarlavha, vaqt, saqla}` |
| `GET/POST /api/testlar`, `DELETE /api/testlar/T0001` | saqlangan testlar |

## 4-usul: `bank.json` ni to'g'ridan-to'g'ri tahrirlash

Mumkin, lekin JSON buzilmasin va `id` lar takrorlanmasin. Buyruqlar afzal — ular tekshiradi.

## Kelishuv: yangi test tayyorlanganda

Claude foydalanuvchi uchun yangi test tarjima qilsa yoki tuzsa, tayyor bo'lgach shu testni
bankka ham qo'shadi: `.mjtest` faylini `import` bilan (sinf, manba va javoblar kaliti bilan),
savollar 3/4/5 ballik bo'limlarga ajratilgan holda.
