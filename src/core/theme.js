// theme.js — kunduzgi / tungi / tizim rejimi. Tanlov pl2:theme da saqlanadi.
// «system» — qurilma sozlamasiga ergashadi va u o'zgarsa darhol almashadi.
// index.html dagi kichik skript sahifa chizilishidan oldin shu ishni qiladi (oq «chaqnash» bo'lmasin).

import { store } from './storage.js';

export const THEMES = ['light', 'dark', 'system'];
const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;

export const getTheme = () => { const t = store.get('theme', 'system'); return THEMES.includes(t) ? t : 'system'; };
export const resolvedTheme = (t = getTheme()) => (t === 'system' ? (mq?.matches ? 'dark' : 'light') : t);

export function applyTheme() {
  const r = resolvedTheme();
  document.documentElement.dataset.theme = r;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', r === 'dark' ? '#0E1220' : '#4F46E5');
}

export function setTheme(t) {
  store.set('theme', THEMES.includes(t) ? t : 'system');
  applyTheme();
  window.dispatchEvent(new CustomEvent('themechange'));
}

mq?.addEventListener?.('change', () => { if (getTheme() === 'system') { applyTheme(); window.dispatchEvent(new CustomEvent('themechange')); } });
