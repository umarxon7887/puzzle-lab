// fav-button.js — ★ «Saqlash» tugmasi (bosh sahifadagi kartalar va generator sahifasi uchun umumiy, v2.8.1).

import { h } from './dom.js';
import { ICONS } from './icons.js';
import { getGenerator } from '../generators/registry.js';
import { t, pick } from '../core/i18n.js';

// ★ tugmasi: karta havolasining ichida emas, yonida turadi (havola ichida tugma bo'lmaydi)
export function favButton(id, on, onToggle) {
  const b = h('button', { type: 'button', class: 'fav-btn', html: ICONS.star, dataset: { id } });
  const sync = v => {
    b.setAttribute('aria-pressed', String(v));
    const label = (v ? t('favRemove') : t('favAdd')) + ': ' + pick(getGenerator(id).name);
    b.setAttribute('aria-label', label); b.title = label;
  };
  sync(on);
  b.addEventListener('click', e => { e.preventDefault(); onToggle(id); });
  b.sync = sync;
  return b;
}
