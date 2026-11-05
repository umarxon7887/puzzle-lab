// assistant-ai.js — yordamchining AI qismi (Gemini). Faqat tayyor javob topilmaganda chaqiriladi.
//
// Ikki yo'l:
//   1) AI_ENDPOINT — sayt egasining Cloudflare Worker'i (worker/ai-proxy.js). Kalit o'sha yerda yashirin,
//      sayt kodida kalit YO'Q. Hamkasblar hech narsa kiritmaydi.
//   2) Foydalanuvchining o'z kaliti (yordamchi sozlamalarida) — faqat shu brauzerda, to'g'ridan-to'g'ri Google'ga.
// Ikkalasi ham bo'lmasa — AI o'chiq, faqat tayyor javoblar ishlaydi.
//
// Token tejash: qisqa tizim ko'rsatmasi (assistant-kb.js), tarixdan oxirgi 4 xabar, javob ≤ 320 token,
// «o'ylash» o'chiq, bir xil savolga javob brauzerda saqlanadi (kesh).

import { store } from './storage.js';
import { norm } from './assistant-kb.js';

// Worker manzili (masalan 'https://puzzle-lab-ai.<nom>.workers.dev'). Bo'sh — Worker yo'q.
export const AI_ENDPOINT = 'https://puzzle-lab-ai.garrihiskill.workers.dev';
export const MODEL = 'gemini-flash-lite-latest';
const MAX_OUT = 320;
const HISTORY = 4;
const CACHE_MAX = 60;

export const getKey = () => store.get('ai-key', '') || '';
export const setKey = k => (k ? store.set('ai-key', String(k).trim()) : store.remove('ai-key'));
export const aiAvailable = () => !!(AI_ENDPOINT || getKey());

// ---------- Kesh ----------
const cacheKey = (lang, ctx, q) => [lang, ctx.genId || ctx.route || 'home', norm(q)].join('|');
function cacheGet(k) { const c = store.get('ai-cache', {}) || {}; return c[k]?.a || null; }
function cachePut(k, a) {
  const c = store.get('ai-cache', {}) || {};
  c[k] = { a, t: Date.now() };
  const keys = Object.keys(c);
  if (keys.length > CACHE_MAX) keys.sort((x, y) => c[x].t - c[y].t).slice(0, keys.length - CACHE_MAX).forEach(x => delete c[x]);
  store.set('ai-cache', c);
}

// history: [{role:'user'|'model', text}] — faqat AI suhbati (tayyor javoblar kiritilmaydi)
export async function askAI({ question, lang, ctx, system, history = [] }) {
  const firstTurn = history.length === 0;
  const ck = cacheKey(lang, ctx, question);
  const hit = cacheGet(ck);                             // aynan shu savol shu sahifada avval berilgan bo'lsa — tokensiz
  if (hit) return { text: hit, cached: true };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) { const e = new Error('offline'); e.code = 'offline'; throw e; }

  const contents = [...history.slice(-HISTORY), { role: 'user', text: question }]
    .map(m => ({ role: m.role, parts: [{ text: String(m.text).slice(0, 1200) }] }));
  const key = getKey();
  const text = key ? await direct(key, system, contents) : await viaWorker(system, contents);
  if (firstTurn && text) cachePut(ck, text);
  return { text, cached: false };
}

async function viaWorker(system, contents) {
  if (!AI_ENDPOINT) { const e = new Error('no-ai'); e.code = 'no-ai'; throw e; }
  const r = await fetch(AI_ENDPOINT, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ system, contents, maxTokens: MAX_OUT })
  });
  if (r.status === 429) { const e = new Error('limit'); e.code = 'limit'; throw e; }
  if (!r.ok) throw new Error('worker ' + r.status);
  const j = await r.json();
  return String(j.text || '').trim();
}

// To'g'ridan-to'g'ri Gemini: kalit sarlavhada (manzilda emas), 400 bo'lsa «o'ylash» sozlamasisiz, 503 bo'lsa qayta urinish
async function direct(key, system, contents) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const body = think => JSON.stringify({
    systemInstruction: { parts: [{ text: system }] }, contents,
    generationConfig: { maxOutputTokens: MAX_OUT, temperature: 0.4, ...(think ? { thinkingConfig: { thinkingBudget: 0 } } : {}) }
  });
  let think = true;
  for (let i = 0; i < 3; i++) {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: body(think) });
    if (r.ok) {
      const j = await r.json();
      return (j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
    }
    if (r.status === 400 && think) { think = false; continue; }
    if (r.status === 429) { const e = new Error('limit'); e.code = 'limit'; throw e; }
    if (r.status === 503 && i < 2) { await new Promise(res => setTimeout(res, 2000 * (i + 1))); continue; }
    throw new Error('gemini ' + r.status);
  }
  throw new Error('gemini retry');
}
