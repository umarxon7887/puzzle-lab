# Yordamchi uchun AI proksi (Cloudflare Worker)

Sayt GitHub Pages'da statik, shuning uchun Gemini kalitini sayt kodiga qo'yib bo'lmaydi (har kim ko'rib oladi).
Bu Worker kalitni yashirin saqlaydi va saytdan kelgan qisqa savollarni Gemini'ga uzatadi.
Bu papka saytga kirmaydi (sw.js ro'yxatida yo'q).

## Bir martalik sozlash (~10 daqiqa, bepul)
1. **Kalit.** https://aistudio.google.com/apikey — «Create API key». Billing ulanmagan loyiha tanlang: shunda bepul kvota tugasa ham pul yechilmaydi.
2. **Cloudflare.** https://dash.cloudflare.com — ro'yxatdan o'ting (bepul). *Workers & Pages → Create → Create Worker*, nomi `puzzle-lab-ai` → *Deploy*.
3. **Kod.** *Edit code* → bor kodni o'chirib, `ai-proxy.js` ning hammasini qo'ying → *Deploy*.
4. **Kalitni yashirish.** Worker → *Settings → Variables and Secrets → Add* → turi **Secret**, nomi `GEMINI_KEY`, qiymati — 1-qadamdagi kalit.
5. **Kunlik limit (tavsiya).** *Storage & Databases → KV → Create* (nomi `puzzle-lab-limits`). Worker → *Settings → Bindings → Add → KV namespace*, nomi `LIMITS`.
6. **Saytga ulash.** Worker manzilini (masalan `https://puzzle-lab-ai.<nom>.workers.dev`) `src/core/assistant-ai.js` dagi `AI_ENDPOINT` ga yozing.

## Cheklovlar (ai-proxy.js boshida o'zgartirsa bo'ladi)
- faqat `https://umarxon7887.github.io` dan so'rov qabul qilinadi;
- har IP kuniga 40 ta, hammasi kuniga 1000 ta savol;
- javob ≤ 700 token, loyiha bilimi ≤ 40 000 belgi, suhbat ≤ 12 000 belgi.
