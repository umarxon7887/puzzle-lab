// ai-proxy.js — Topshiriqlar Lab yordamchisi uchun Cloudflare Worker (sayt fayllariga kirmaydi).
// Gemini kaliti shu yerda yashirin turadi (Secret: GEMINI_KEY), sayt kodida kalit yo'q.
//
// Himoya:
//  • faqat ruxsat etilgan saytdan (ALLOWED_ORIGIN) so'rov qabul qilinadi;
//  • so'rov hajmi cheklangan (matn ≤ 9000 belgi, ≤ 9 xabar, javob ≤ 400 token);
//  • kunlik limit: har IP uchun PER_IP_DAY, hammasi uchun ALL_DAY (KV bog'langan bo'lsa — LIMITS);
//  • tavsiya: kalitni billing ulanmagan Google loyihasidan oling — shunda pul sarfi umuman bo'lmaydi.

const ALLOWED_ORIGIN = 'https://umarxon7887.github.io';
const MODEL = 'gemini-flash-lite-latest';
const PER_IP_DAY = 40;
const ALL_DAY = 1000;

const cors = origin => ({
  'access-control-allow-origin': origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN,
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
  vary: 'origin'
});
const json = (obj, status, origin) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', ...cors(origin) } });

async function bump(env, key, max) {
  if (!env.LIMITS) return true;                       // KV ulanmagan bo'lsa — faqat Google kvotasi cheklaydi
  const n = +(await env.LIMITS.get(key)) || 0;
  if (n >= max) return false;
  await env.LIMITS.put(key, String(n + 1), { expirationTtl: 90000 });
  return true;
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('origin') || '';
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    if (req.method !== 'POST') return json({ error: 'method' }, 405, origin);
    if (origin !== ALLOWED_ORIGIN) return json({ error: 'origin' }, 403, origin);

    let body;
    try { body = await req.json(); } catch { return json({ error: 'json' }, 400, origin); }
    const system = String(body.system || '').slice(0, 4000);
    const contents = Array.isArray(body.contents) ? body.contents.slice(-9) : [];
    const clean = contents.map(m => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: String(m.parts?.[0]?.text || '').slice(0, 1200) }]
    }));
    const size = system.length + clean.reduce((n, m) => n + m.parts[0].text.length, 0);
    if (!clean.length || clean[clean.length - 1].role !== 'user' || size > 9000) return json({ error: 'size' }, 400, origin);

    const day = new Date().toISOString().slice(0, 10);
    const ip = req.headers.get('cf-connecting-ip') || 'x';
    if (!(await bump(env, `all:${day}`, ALL_DAY)) || !(await bump(env, `ip:${day}:${ip}`, PER_IP_DAY))) return json({ error: 'limit' }, 429, origin);

    const maxTokens = Math.min(400, Math.max(50, body.maxTokens | 0 || 320));
    const call = think => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${env.MODEL || MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] }, contents: clean,
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.4, ...(think ? { thinkingConfig: { thinkingBudget: 0 } } : {}) }
      })
    });
    let r = await call(true);
    if (r.status === 400) r = await call(false);
    if (r.status === 503) { await new Promise(res => setTimeout(res, 2000)); r = await call(false); }
    if (r.status === 429) return json({ error: 'limit' }, 429, origin);
    if (!r.ok) return json({ error: 'upstream', status: r.status }, 502, origin);
    const j = await r.json();
    const text = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
    return json({ text }, 200, origin);
  }
};
