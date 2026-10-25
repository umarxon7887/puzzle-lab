// favs.js — «Saqlanganlar»: foydalanuvchiga yoqqan generatorlar (v2.8.1).
// Akkauntsiz: ro'yxat brauzer xotirasida (localStorage `pl2:favs`) — har bir qurilma va brauzerda alohida.
// Ro'yxatda faqat generator id'lari; eng oxirgi saqlangani birinchi. Har o'zgarishda 'favchange' hodisasi yuboriladi.

import { store } from './storage.js';

const KEY = 'favs';
export const FAV_MAX = 100;

// Xom ro'yxatni tozalash: faqat satrlar, takrorsiz, mavjud generatorlar (validIds berilsa), ko'pi bilan FAV_MAX ta
export function cleanFavs(raw, validIds = null) {
  if (!Array.isArray(raw)) return [];
  const ok = validIds ? new Set(validIds) : null;
  const out = [];
  for (const id of raw) {
    if (typeof id !== 'string' || out.includes(id) || (ok && !ok.has(id))) continue;
    out.push(id);
    if (out.length >= FAV_MAX) break;
  }
  return out;
}

// Ro'yxatda bo'lsa olib tashlaydi, bo'lmasa boshiga qo'shadi (toza funksiya)
export function toggleIn(list, id) {
  return list.includes(id) ? list.filter(x => x !== id) : [id, ...list].slice(0, FAV_MAX);
}

export function getFavs(validIds = null) { return cleanFavs(store.get(KEY, []), validIds); }
export function isFav(id) { return getFavs().includes(id); }

// Holatni almashtiradi va yangi holatni qaytaradi (true — saqlangan)
export function toggleFav(id) {
  const next = toggleIn(getFavs(), id);
  store.set(KEY, next);
  const on = next.includes(id);
  if (typeof CustomEvent === 'function' && globalThis.dispatchEvent) globalThis.dispatchEvent(new CustomEvent('favchange', { detail: { id, on } }));
  return on;
}
