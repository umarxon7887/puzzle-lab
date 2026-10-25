// home.js — bosh sahifa: "To'plam" kartasi, «Saqlanganlar» (★ bilan belgilangan generatorlar) va barcha generatorlar.

import { h } from './dom.js';
import { ICONS, PACK_COVER } from './icons.js';
import { GENERATORS, getGenerator } from '../generators/registry.js';
import { getFavs, toggleFav } from '../core/favs.js';
import { favButton } from './fav-button.js';
import { t, pick } from '../core/i18n.js';

export function mountHome(main) {
  const ac = new AbortController();
  const ids = GENERATORS.map(g => g.id);
  const favBtns = [];
  const card = (g, on) => {
    const fb = favButton(g.id, on, id => toggleFav(id));
    favBtns.push(fb);
    return h('div', { class: 'gen-card-wrap' },
      h('a', { class: 'gen-card', href: '#/' + g.id },
        h('span', { class: 'gen-card-cover', html: g.cover }),
        h('span', { class: 'gen-card-body' },
          h('span', { class: 'gen-card-name' }, pick(g.name)),
          h('span', { class: 'gen-card-desc' }, pick(g.desc)))),
      fb);
  };

  const favBox = h('div', { class: 'fav-box' });
  function renderFavs() {
    // eski ★ tugmalari ro'yxatidan saqlanganlar bo'limidagilarni chiqarib tashlaymiz
    for (const b of favBox.querySelectorAll('.fav-btn')) favBtns.splice(favBtns.indexOf(b), 1);
    favBox.innerHTML = '';
    const favs = getFavs(ids);
    if (favs.length) {
      favBox.append(
        h('h2', { class: 'section-title' }, t('favSection'), h('span', { class: 'section-count' }, String(favs.length))),
        h('nav', { class: 'gen-grid fav-grid', 'aria-label': t('favSection') }, favs.map(id => card(getGenerator(id), true))));
    } else favBox.append(h('p', { class: 'fav-hint' }, h('span', { class: 'fav-hint-star', html: ICONS.star }), t('favHint')));
  }
  renderFavs();
  const favSet = () => new Set(getFavs(ids));
  const set0 = favSet();
  const allCards = GENERATORS.map(g => card(g, set0.has(g.id)));

  window.addEventListener('favchange', () => {
    renderFavs();
    const set = favSet();
    for (const b of favBtns) b.sync(set.has(b.dataset.id));
  }, { signal: ac.signal });

  main.append(h('div', { class: 'page home' },
    h('section', { class: 'hero' },
      h('h1', null, t('homeTitle')),
      h('p', null, t('homeLead'))),
    h('a', { class: 'pack-card', href: '#/pack' },
      h('span', { class: 'pack-card-cover', html: PACK_COVER }),
      h('span', { class: 'pack-card-body' },
        h('span', { class: 'pack-card-name' }, t('packCardTitle')),
        h('span', { class: 'pack-card-desc' }, t('packCardDesc'))),
      h('span', { class: 'pack-card-arrow', html: ICONS.arrow })),
    favBox,
    h('h2', { class: 'section-title' }, t('sectionGenerators')),
    h('nav', { class: 'gen-grid', 'aria-label': t('sectionGenerators') }, allCards),
    h('footer', { class: 'site-foot' }, t('homeFoot'))));

  return { title: '', destroy() { ac.abort(); } };
}
