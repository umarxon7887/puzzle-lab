// cart.js — «Savat»: foydalanuvchi generator sahifalarida sozlab qo'shgan topshiriqlar ro'yxati.
// Faqat ma'lumot (DOM yo'q) — sahifa ui/cart-page.js'da, testlar tests/run.mjs'da.
//
// Element: { gen, opts, seed, title, fontPt }
//   gen — generator id; opts — uning sozlamalari (daraja, tur …); seed — topshiriq raqami;
//   title — varaq tepasidagi matn (null — generatorning standart matni); fontPt — matn o'lchami.
// Variantlar (copies): har bir o'quvchiga alohida variant — turlari va sozlamalari bir xil, raqamlari boshqa.
// Shablon: savatdagi topshiriqlarning turlari va sozlamalari (raqamsiz) nom bilan saqlanadi;
// yuklanganda har biriga yangi raqam beriladi — «o'sha to'plam, lekin yangi masalalar».

import { store } from './storage.js';
import { deriveSeed, newSeed } from './rng.js';

export const MAX_ITEMS = 60;
export const MAX_COPIES = 40;
export const MAX_TEMPLATES = 20;
const PER = [1, 2, 4];

const cleanItem = it => (it && typeof it.gen === 'string' && Number.isInteger(it.seed) && it.seed > 0 && it.opts && typeof it.opts === 'object'
  ? { gen: it.gen, opts: { ...it.opts }, seed: it.seed, title: typeof it.title === 'string' ? it.title : null, fontPt: Math.max(14, Math.min(40, +it.fontPt || 24)) }
  : null);

export function loadCart() {
  const s = store.get('cart', {}) || {};
  const items = (Array.isArray(s.items) ? s.items : []).map(cleanItem).filter(Boolean).slice(0, MAX_ITEMS);
  const templates = (Array.isArray(s.templates) ? s.templates : [])
    .filter(tp => tp && typeof tp.name === 'string' && Array.isArray(tp.items))
    .map(tp => ({ name: tp.name.slice(0, 60), items: tp.items.map(it => cleanItem({ ...it, seed: 1 })).filter(Boolean).map(({ seed, ...rest }) => rest) }))
    .slice(0, MAX_TEMPLATES);
  return {
    items,
    perPage: PER.includes(s.perPage) ? s.perPage : 1,
    answersPerPage: PER.includes(s.answersPerPage) ? s.answersPerPage : 4,
    nameLine: s.nameLine !== false,
    copies: Math.max(1, Math.min(MAX_COPIES, s.copies | 0 || 1)),
    templates
  };
}

export function saveCart(cart) {
  store.set('cart', cart);
  if (typeof window !== 'undefined' && window.dispatchEvent) window.dispatchEvent(new Event('cartchange'));
}

export const cartCount = () => loadCart().items.length;

// Savatga qo'shish. Natija: { added, total } (savat to'lgan bo'lsa added kamroq bo'ladi)
export function addToCart(entries) {
  const cart = loadCart();
  const room = MAX_ITEMS - cart.items.length;
  const list = entries.map(cleanItem).filter(Boolean).slice(0, Math.max(0, room));
  cart.items.push(...list);
  saveCart(cart);
  return { added: list.length, total: cart.items.length };
}

// k-variant uchun raqam (0 — asl raqamning o'zi)
export const variantSeed = (seed, k) => (k === 0 ? seed : deriveSeed(seed, 1000 + k));

// PDF varaqlari: [{ copy, entries: [{ item, seed, number }] }] — variantlar ketma-ket, har biri o'z varaqlarida.
// Har bir variantda raqamlash 1 dan boshlanadi (o'quvchi varag'i alohida).
export function cartPages(cart, perPage) {
  const pages = [];
  for (let k = 0; k < cart.copies; k++) {
    for (let i = 0; i < cart.items.length; i += perPage) {
      pages.push({
        copy: k,
        entries: cart.items.slice(i, i + perPage).map((item, j) => ({ item, seed: variantSeed(item.seed, k), number: i + j + 1 }))
      });
    }
  }
  return pages;
}

// Shablonlar
export function saveTemplate(cart, name) {
  const items = cart.items.map(({ gen, opts, title, fontPt }) => ({ gen, opts: { ...opts }, title, fontPt }));
  const tp = { name: String(name || '').trim().slice(0, 60) || `#${cart.templates.length + 1}`, items };
  const i = cart.templates.findIndex(x => x.name === tp.name);
  if (i >= 0) cart.templates[i] = tp; else cart.templates.unshift(tp);
  cart.templates = cart.templates.slice(0, MAX_TEMPLATES);
  return tp;
}
export function itemsFromTemplate(tp, seedFn = newSeed) {
  return tp.items.slice(0, MAX_ITEMS).map(it => ({ gen: it.gen, opts: { ...it.opts }, seed: seedFn(), title: it.title ?? null, fontPt: it.fontPt || 24 }));
}
