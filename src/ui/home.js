// home.js — bosh sahifa: "To'plam" kartasi va barcha generatorlar ro'yxati.

import { h } from './dom.js';
import { ICONS, PACK_COVER } from './icons.js';
import { GENERATORS } from '../generators/registry.js';
import { t, pick } from '../core/i18n.js';

export function mountHome(main) {
  const cards = GENERATORS.map(g => h('a', { class: 'gen-card', href: '#/' + g.id },
    h('span', { class: 'gen-card-cover', html: g.cover }),
    h('span', { class: 'gen-card-body' },
      h('span', { class: 'gen-card-name' }, pick(g.name)),
      h('span', { class: 'gen-card-desc' }, pick(g.desc)))));

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
    h('h2', { class: 'section-title' }, t('sectionGenerators')),
    h('nav', { class: 'gen-grid', 'aria-label': t('sectionGenerators') }, cards),
    h('footer', { class: 'site-foot' }, t('homeFoot'))));

  return { title: '', destroy() {} };
}
