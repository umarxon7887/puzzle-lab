// app.js — ilovaning kirish nuqtasi: sarlavha, til tanlash, sahifalar (router) va oflayn rejim.
// Manzillar: #/ — bosh sahifa, #/pack — to'plam, #/cart — savat, #/<generator-id> — generator sahifasi.

import { h } from './ui/dom.js';
import { mountHome } from './ui/home.js';
import { mountGenerator } from './ui/generator-page.js';
import { mountPack } from './ui/pack-page.js';
import { mountCart } from './ui/cart-page.js';
import { ICONS, ASSISTANT_ICON } from './ui/icons.js';
import { cartCount } from './core/cart.js';
import { loadFonts } from './ui/fonts.js';
import { closeAllModals } from './ui/modal.js';
import { getGenerator } from './generators/registry.js';
import { LANGS, getLang, setLang, applyDocumentLang, t } from './core/i18n.js';
import { setPageContext } from './core/page-context.js';
import { ui } from './core/assistant-kb.js';
import { getTheme, setTheme, applyTheme } from './core/theme.js';

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
  // Savat: belgida savatdagi topshiriqlar soni
  const badge = h('span', { class: 'cart-badge', 'aria-hidden': 'true' });
  const cart = h('a', { class: 'cart-link', href: '#/cart', title: t('cartTitle') }, h('span', { class: 'cart-icon', html: ICONS.cart }), badge);
  const syncCart = () => {
    const n = cartCount();
    badge.textContent = n > 99 ? '99+' : String(n);
    badge.hidden = n === 0;
    cart.setAttribute('aria-label', n ? `${t('cartTitle')}: ${n}` : t('cartTitle'));
  };
  syncCart();
  header.append(
    h('a', { class: 'brand', href: '#/' }, h('img', { class: 'brand-logo', src: 'icon.svg', alt: '', width: 30, height: 30 }), h('span', { class: 'brand-name' }, t('appName'))),
    h('div', { class: 'topbar-right' }, themeSwitch(), cart, langs));
  header.syncCart = syncCart;
}

// Ko'rinish: kunduzgi / tungi / tizim bo'yicha. Tugma joriy holat belgisini ko'rsatadi, bosilsa kichik menyu.
const THEME_UI = [['light', 'sun', 'themeLight'], ['dark', 'moon', 'themeDark'], ['system', 'monitor', 'themeSystem']];
function themeSwitch() {
  const cur = getTheme();
  const curUi = THEME_UI.find(x => x[0] === cur);
  const btn = h('button', { type: 'button', class: 'theme-btn', 'aria-haspopup': 'true', 'aria-expanded': 'false',
    title: `${t('themeLabel')}: ${t(curUi[2])}`, 'aria-label': `${t('themeLabel')}: ${t(curUi[2])}`, html: ICONS[curUi[1]] });
  const menu = h('div', { class: 'theme-menu', role: 'menu', hidden: true },
    THEME_UI.map(([id, icon, label]) => {
      const b = h('button', { type: 'button', role: 'menuitemradio', class: 'theme-opt', 'aria-checked': String(id === cur) },
        h('span', { class: 'theme-opt-ic', html: ICONS[icon] }), h('span', {}, t(label)));
      b.addEventListener('click', () => { close(); setTheme(id); });
      return b;
    }));
  const wrap = h('div', { class: 'theme-wrap' }, btn, menu);
  const onDoc = e => { if (!wrap.contains(e.target)) close(); };
  const onKey = e => { if (e.key === 'Escape') { close(); btn.focus(); } };
  function close() { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('pointerdown', onDoc); document.removeEventListener('keydown', onKey); }
  btn.addEventListener('click', () => {
    if (!menu.hidden) return close();
    menu.hidden = false; btn.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', onDoc); document.addEventListener('keydown', onKey);
    menu.querySelector('[aria-checked="true"]')?.focus();
  });
  return wrap;
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
  setPageContext({ route: r || 'home' });             // generator sahifasi o'zi to'ldiradi
  if (!r) view = mountHome(main);
  else if (r === 'pack') view = mountPack(main);
  else if (r === 'cart') view = mountCart(main);
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

// Yordamchi tugmasi (pastki o'ng burchak). Oynaning kodi faqat birinchi bosilganda yuklanadi.
const fab = document.createElement('button');
fab.type = 'button';
fab.className = 'ai-fab';
fab.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ASSISTANT_ICON}</svg>`;
const syncFab = () => { const l = ui(getLang(), 'open'); fab.setAttribute('aria-label', l); fab.title = l; };
fab.setAttribute('aria-expanded', 'false');
fab.addEventListener('click', () => import('./ui/assistant.js').then(m => m.toggleAssistant(fab)).catch(console.error));
document.body.appendChild(fab);

applyTheme();
applyDocumentLang();
renderHeader();
syncFab();
route();
loadFonts();

window.addEventListener('hashchange', () => route());
window.addEventListener('themechange', () => renderHeader());
window.addEventListener('langchange', () => { renderHeader(); syncFab(); route({ keepScroll: true }); });
window.addEventListener('cartchange', () => {
  header.syncCart?.();
  const b = header.querySelector('.cart-link');
  if (b) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
});

// Oflayn ishlash va telefonga o'rnatish (PWA)
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
