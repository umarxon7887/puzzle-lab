// app.js — ilovaning kirish nuqtasi: sarlavha, til tanlash, sahifalar (router) va oflayn rejim.
// Manzillar: #/ — bosh sahifa, #/pack — to'plam, #/<generator-id> — generator sahifasi.

import { h } from './ui/dom.js';
import { mountHome } from './ui/home.js';
import { mountGenerator } from './ui/generator-page.js';
import { mountPack } from './ui/pack-page.js';
import { loadFonts } from './ui/fonts.js';
import { closeAllModals } from './ui/modal.js';
import { getGenerator } from './generators/registry.js';
import { LANGS, getLang, setLang, applyDocumentLang, t } from './core/i18n.js';

const header = document.querySelector('.topbar');
const main = document.getElementById('main');
let view = null, currentRoute = null;

function renderHeader() {
  header.innerHTML = '';
  const langs = h('div', { class: 'lang-switch', role: 'group', 'aria-label': t('langLabel') },
    LANGS.map(l => {
      const b = h('button', { type: 'button', lang: l.code, title: l.name, 'aria-label': l.name, 'aria-pressed': String(l.code === getLang()) }, l.short);
      b.addEventListener('click', () => setLang(l.code));
      return b;
    }));
  header.append(
    h('a', { class: 'brand', href: '#/' }, h('img', { class: 'brand-logo', src: 'icon.svg', alt: '', width: 30, height: 30 }), h('span', { class: 'brand-name' }, t('appName'))),
    langs);
}

function parseRoute() {
  const raw = (location.hash || '#/').replace(/^#\/?/, '').split('?')[0];
  return raw.replace(/\/+$/, '');
}

function route({ keepScroll = false } = {}) {
  const r = parseRoute();
  const scroll = window.scrollY;
  closeAllModals();
  if (view) { view.destroy(); view = null; }
  main.innerHTML = '';
  document.body.classList.remove('no-scroll');
  if (!r) view = mountHome(main);
  else if (r === 'pack') view = mountPack(main);
  else {
    const gen = getGenerator(r);
    if (gen) view = mountGenerator(main, gen);
    else { history.replaceState(null, '', '#/'); view = mountHome(main); }
  }
  document.body.dataset.route = r || 'home';
  document.title = (view.title ? view.title + ' — ' : '') + t('appName');
  if (keepScroll) window.scrollTo(0, scroll);
  else if (r !== currentRoute) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
  currentRoute = r;
}

applyDocumentLang();
renderHeader();
route();
loadFonts();

window.addEventListener('hashchange', () => route());
window.addEventListener('langchange', () => { renderHeader(); route({ keepScroll: true }); });

// Oflayn ishlash va telefonga o'rnatish (PWA)
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
