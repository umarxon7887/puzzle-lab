// pack-page.js — "To'plam": turli generatorlardan aralash topshiriqlar to'plami.
// O'qituvchi har turdan nechta kerakligini tanlaydi → ro'yxat yaratiladi → har birini ko'rib,
// almashtirishi ("Boshqasi") yoki olib tashlashi mumkin → bitta PDF (topshiriqlar / javoblar / ikkalasi).

import { h, nextFrame, toast } from './dom.js';
import { ICONS, PACK_COVER } from './icons.js';
import { openModal, attachMenu } from './modal.js';
import { createPreview } from './preview.js';
import { getPuzzle, makeSlot, defaultOpts } from './puzzles.js';
import { loadFonts } from './fonts.js';
import { GENERATORS, getGenerator } from '../generators/registry.js';
import { t, pick, getLang, lvl } from '../core/i18n.js';
import { levelsOf } from '../core/levels.js';
import { store } from '../core/storage.js';
import { makeRng, newSeed, shuffle, pickOne } from '../core/rng.js';
import { drawPage, slotAspect, PER_PAGE } from '../core/sheet.js';
import { renderPdf } from '../core/pdf.js';
import { download } from '../core/files.js';

const MAX_COUNT = 30;
const THUMB_PX = 360;

const mainOption = gen => gen.options.find(op => op.pack === 'select') || null;
const packChoices = op => op.choices.filter(c => !c.noPack);

function defaultRow(gen, i) {
  const mo = mainOption(gen);
  return { on: i < 3, count: 2, level: 1, main: mo ? mo.default : null };
}

function loadState() {
  const s = store.get('pack', {}) || {};
  const rows = {};
  GENERATORS.forEach((gen, i) => {
    const r = { ...defaultRow(gen, i), ...((s.rows || {})[gen.id] || {}) };
    r.count = Math.max(0, Math.min(MAX_COUNT, r.count | 0));
    if (!(r.level === 'mix' || levelsOf(gen).includes(r.level))) r.level = 1;
    const mo = mainOption(gen);
    if (mo && r.main !== 'mix' && !packChoices(mo).some(c => c.value === r.main)) r.main = mo.default;
    rows[gen.id] = r;
  });
  const items = Array.isArray(s.items) ? s.items.filter(it => getGenerator(it.gen) && Number.isInteger(it.seed)) : [];
  return {
    rows,
    order: s.order === 'shuffled' ? 'shuffled' : 'grouped',
    perPage: PER_PAGE.includes(s.perPage) ? s.perPage : 1,
    answersPerPage: PER_PAGE.includes(s.answersPerPage) ? s.answersPerPage : 4,
    nameLine: !!s.nameLine,
    items
  };
}

// Bitta to'plam elementi: generator, aniq sozlamalar va raqam ("Aralash" tanlangan bo'lsa — tasodifiy)
function makeItem(gen, row, seed = newSeed()) {
  const rand = makeRng(seed ^ 0x2545F491);
  const opts = defaultOpts(gen);
  opts.level = row.level === 'mix' ? pickOne(rand, [0, 1, 2, 3]) : row.level;   // «Aralash» — asosiy 4 daraja
  for (const op of gen.options) {
    if (op.pack === 'select') {
      const ch = packChoices(op);
      opts[op.key] = row.main === 'mix' || !ch.some(c => c.value === row.main) ? pickOne(rand, ch).value : row.main;
    } else if (op.pack === 'random') {
      opts[op.key] = pickOne(rand, op.type === 'emoji' ? op.choices : op.choices.map(c => c.value));
    }
  }
  return { gen: gen.id, opts, seed, mixLevel: row.level === 'mix', mixMain: row.main === 'mix' };
}

export function mountPack(main) {
  const ac = new AbortController();
  const { signal } = ac;
  const st = loadState();
  const save = () => store.set('pack', st);
  let token = 0, exporting = false;

  const genOpts = it => ({ ...it.opts, aspect: slotAspect(st.perPage), perPage: st.perPage });
  const puzzleOf = it => getPuzzle(getGenerator(it.gen), genOpts(it), it.seed);

  // ---------- Sarlavha ----------
  const head = h('div', { class: 'page-head' },
    h('a', { class: 'back-link', href: '#/' }, h('span', { class: 'bl-icon', html: ICONS.back }), t('back')),
    h('div', { class: 'page-title' }, h('span', { class: 'page-cover', html: PACK_COVER }), h('h1', null, t('packTitle'))));
  const lead = h('p', { class: 'lead' }, t('packLead'));

  // ---------- Turlar ro'yxati ----------
  const rowsEl = h('div', { class: 'pack-rows' });
  GENERATORS.forEach(gen => {
    const row = st.rows[gen.id];
    const id = 'pk-' + gen.id;
    const chk = h('input', { type: 'checkbox', id });
    chk.checked = row.on;
    const out = h('output', { class: 'stepper-val', 'aria-live': 'polite' }, String(row.count));
    const minus = h('button', { type: 'button', class: 'stepper-btn', 'aria-label': '−1', html: ICONS.minus });
    const plus = h('button', { type: 'button', class: 'stepper-btn', 'aria-label': '+1', html: ICONS.plus });
    const lvlSel = h('select', { 'aria-label': t('level') },
      levelsOf(gen).map(i => h('option', { value: String(i) }, lvl(i))),
      h('option', { value: 'mix' }, t('packMixed')));
    lvlSel.value = String(row.level);
    const mo = mainOption(gen);
    let mainSel = null;
    if (mo) {
      mainSel = h('select', { 'aria-label': pick(mo.label) },
        h('option', { value: 'mix' }, t('packMixed')),
        packChoices(mo).map(c => h('option', { value: c.value }, (c.big ? pick(c.big) + ' ' : '') + pick(c.label))));
      mainSel.value = String(row.main);
    }
    const body = h('div', { class: 'pack-row-body' },
      h('div', { class: 'mini-field' }, h('span', { 'aria-hidden': 'true' }, t('packCount')),
        h('div', { class: 'stepper', role: 'group', 'aria-label': t('packCount') }, minus, out, plus)),
      h('label', { class: 'mini-field' }, h('span', null, t('level')), lvlSel),
      mo ? h('label', { class: 'mini-field' }, h('span', null, pick(mo.label)), mainSel) : null);
    const el = h('div', { class: 'pack-row' + (row.on ? '' : ' off') },
      h('label', { class: 'pack-row-head', for: id }, chk, h('span', { class: 'pack-row-cover', html: gen.cover }), h('span', { class: 'pack-row-name' }, pick(gen.name))),
      body);
    const sync = () => {
      out.textContent = String(row.count);
      minus.disabled = row.count <= 1; plus.disabled = row.count >= MAX_COUNT;
      el.classList.toggle('off', !row.on);
      body.inert = !row.on;
    };
    chk.addEventListener('change', () => { row.on = chk.checked; if (row.on && !row.count) row.count = 1; sync(); save(); });
    minus.addEventListener('click', () => { row.count = Math.max(1, row.count - 1); sync(); save(); });
    plus.addEventListener('click', () => { row.count = Math.min(MAX_COUNT, row.count + 1); sync(); save(); });
    lvlSel.addEventListener('change', () => { row.level = lvlSel.value === 'mix' ? 'mix' : +lvlSel.value; save(); });
    if (mainSel) mainSel.addEventListener('change', () => { row.main = mainSel.value; save(); });
    sync();
    rowsEl.appendChild(el);
  });

  // ---------- Umumiy sozlamalar ----------
  function segOf(label, values, get, set, fmt = String) {
    const btns = values.map(v => h('button', { type: 'button', class: 'seg-btn' }, fmt(v)));
    const sync = () => btns.forEach((b, i) => b.setAttribute('aria-pressed', String(values[i] === get())));
    btns.forEach((b, i) => b.addEventListener('click', () => { set(values[i]); sync(); }));
    sync();
    return h('div', { class: 'field' }, h('span', { class: 'field-label' }, label),
      h('div', { class: 'seg seg-' + values.length, role: 'group', 'aria-label': label }, btns));
  }
  const nameChk = h('input', { type: 'checkbox', id: 'pk-name' });
  nameChk.checked = st.nameLine;
  nameChk.addEventListener('change', () => { st.nameLine = nameChk.checked; save(); });
  const optsEl = h('div', { class: 'pack-opts' },
    segOf(t('packOrder'), ['grouped', 'shuffled'], () => st.order, v => { st.order = v; save(); },
      v => (v === 'grouped' ? t('packOrderGrouped') : t('packOrderShuffled'))),
    segOf(t('perPage'), PER_PAGE, () => st.perPage, v => { st.perPage = v; save(); renderReview(); }),
    segOf(t('packAnswersPerPage'), PER_PAGE, () => st.answersPerPage, v => { st.answersPerPage = v; save(); }),
    h('label', { class: 'check-row', for: 'pk-name' }, nameChk, h('span', null, t('nameLine'))));

  const buildBtn = h('button', { type: 'button', class: 'btn btn-primary btn-block' });
  const msg = h('p', { class: 'hint warn', hidden: true, role: 'alert' });
  buildBtn.addEventListener('click', build);

  const panel = h('section', { class: 'panel pack-panel' }, rowsEl, optsEl, msg, buildBtn);

  // ---------- Ko'rib chiqish ----------
  const totalEl = h('span', { class: 'review-total' });
  const grid = h('div', { class: 'thumbs' });
  const empty = h('p', { class: 'empty' }, t('packEmpty'));
  const review = h('section', { class: 'pack-review', 'aria-labelledby': 'pk-review-h' },
    h('div', { class: 'review-head' }, h('h2', { id: 'pk-review-h' }, t('packReview')), totalEl), empty, grid);

  // ---------- Pastki panel ----------
  const pdfBtn = h('button', { type: 'button', class: 'btn btn-primary btn-new' },
    h('span', { class: 'btn-icon', html: ICONS.download }), h('span', null, t('pdf')));
  const bar = h('div', { class: 'action-bar' }, h('div', { class: 'action-inner' }, h('div', { class: 'menu-wrap menu-wrap-wide' }, pdfBtn)));
  attachMenu(pdfBtn, () => [
    { label: t('packPdfTasks'), icon: ICONS.file, onSelect: () => exportPdf('task') },
    { label: t('packPdfAnswers'), icon: ICONS.answer, onSelect: () => exportPdf('answer') },
    { label: t('pdfBoth'), icon: ICONS.files, onSelect: () => exportPdf('both') }
  ], { signal });

  main.append(h('div', { class: 'page pack-page' }, head, lead, panel, review), bar);

  function build() {
    const chosen = GENERATORS.filter(g => st.rows[g.id].on && st.rows[g.id].count > 0);
    if (!chosen.length) { msg.textContent = t('packNothing'); msg.hidden = false; return; }
    msg.hidden = true;
    if (st.items.length && !window.confirm(t('packConfirmRebuild'))) return;
    const items = [];
    for (const gen of chosen) for (let i = 0; i < st.rows[gen.id].count; i++) items.push(makeItem(gen, st.rows[gen.id]));
    if (st.order === 'shuffled') shuffle(items, Math.random);
    st.items = items;
    save();
    renderReview();
    review.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function itemTitle(it, i) {
    const gen = getGenerator(it.gen);
    return `${i + 1}. ${pick(gen.name)} · ${lvl(it.opts.level)}`;
  }

  // Ko'rib chiqish ro'yxatini chizish (kichik varaqlar birma-bir, sahifa qotmasligi uchun)
  async function renderReview() {
    const my = ++token;
    const n = st.items.length;
    buildBtn.textContent = n ? t('packRebuild') : t('packBuild');
    totalEl.textContent = n ? t('packTotal', n, Math.ceil(n / st.perPage)) : '';
    empty.hidden = n > 0;
    bar.hidden = n === 0;
    grid.innerHTML = '';
    const cards = st.items.map((it, i) => {
      const canvas = h('canvas', { class: 'thumb-canvas', width: THUMB_PX, height: Math.round(THUMB_PX * 297 / 210) });
      const openBtn = h('button', { type: 'button', class: 'thumb-open', 'aria-label': t('packOpen') + ': ' + itemTitle(it, i) }, canvas);
      openBtn.addEventListener('click', () => openItem(i));
      const regen = h('button', { type: 'button', class: 'icon-btn small', title: t('packRegen'), 'aria-label': t('packRegen'), html: ICONS.refresh });
      regen.addEventListener('click', () => { regenItem(i); });
      const rm = h('button', { type: 'button', class: 'icon-btn small danger', title: t('packRemove'), 'aria-label': t('packRemove'), html: ICONS.trash });
      rm.addEventListener('click', () => { removeItem(i); });
      const fig = h('figure', { class: 'thumb' }, openBtn,
        h('figcaption', null, h('span', { class: 'thumb-title' }, itemTitle(it, i)), h('span', { class: 'thumb-actions' }, regen, rm)));
      grid.appendChild(fig);
      return canvas;
    });
    for (let i = 0; i < cards.length; i++) {
      await nextFrame();
      if (my !== token) return;
      drawThumb(cards[i], st.items[i], i);
    }
  }

  function singlePage(it, i, showSolution) {
    const gen = getGenerator(it.gen);
    return { slots: [makeSlot(gen, puzzleOf(it), { title: pick(gen.defaultTitle), fontPt: 22, number: String(i + 1) })], layout: 1, lang: getLang(), showSolution, nameLine: st.nameLine };
  }
  function drawThumb(canvas, it, i) {
    try {
      const ctx = canvas.getContext('2d');
      drawPage(ctx, canvas.width / 210, singlePage(it, i, false));
    } catch (e) { console.error(e); }
  }
  function redrawThumbs() {
    grid.querySelectorAll('canvas').forEach((c, i) => { if (st.items[i]) drawThumb(c, st.items[i], i); });
  }
  window.addEventListener('fontsready', redrawThumbs, { signal });

  function regenItem(i) {
    const it = st.items[i];
    const gen = getGenerator(it.gen);
    const mo = mainOption(gen);
    const row = { level: it.mixLevel ? 'mix' : it.opts.level, main: it.mixMain ? 'mix' : (mo ? it.opts[mo.key] : null) };
    st.items[i] = makeItem(gen, row);
    save();
    const fig = grid.children[i];
    if (fig) {
      fig.querySelector('.thumb-title').textContent = itemTitle(st.items[i], i);
      drawThumb(fig.querySelector('canvas'), st.items[i], i);
    }
  }
  function removeItem(i) {
    st.items.splice(i, 1);
    save();
    renderReview();
  }

  // Kattaroq ko'rish oynasi: oldingi/keyingi, javob, almashtirish, olib tashlash
  function openItem(index) {
    let i = index, show = false;
    const pv = createPreview((ctx, k) => { if (st.items[i]) drawPage(ctx, k, singlePage(st.items[i], i, show)); }, { maxPx: 1300 });
    const counter = h('span', { class: 'viewer-count' });
    const mk = (icon, label, fn, cls = '') => {
      const b = h('button', { type: 'button', class: 'icon-btn ' + cls, title: label, 'aria-label': label, html: ICONS[icon] });
      b.addEventListener('click', fn);
      return b;
    };
    const prev = mk('back', t('prev'), () => { if (i > 0) { i--; update(); } });
    const next = mk('next', t('next'), () => { if (i < st.items.length - 1) { i++; update(); } });
    const eye = mk('eye', t('showAnswer'), () => { show = !show; eye.setAttribute('aria-pressed', String(show)); eye.innerHTML = show ? ICONS.eyeOff : ICONS.eye; pv.redraw(); });
    eye.setAttribute('aria-pressed', 'false');
    const regen = mk('refresh', t('packRegen'), () => { regenItem(i); pv.redraw(); });
    const rm = mk('trash', t('packRemove'), () => {
      removeItem(i);
      if (!st.items.length) { m.close(); return; }
      i = Math.min(i, st.items.length - 1); update();
    }, 'danger');
    const body = h('div', { class: 'viewer' }, h('div', { class: 'sheet-frame' }, pv.canvas),
      h('div', { class: 'viewer-bar' }, prev, counter, next, h('span', { class: 'spacer' }), eye, regen, rm));
    const m = openModal({ title: itemTitle(st.items[i], i), body, className: 'modal-wide', onClose: () => pv.destroy() });
    function update() {
      m.box.querySelector('h2').textContent = itemTitle(st.items[i], i);
      counter.textContent = `${i + 1} / ${st.items.length}`;
      prev.disabled = i === 0; next.disabled = i === st.items.length - 1;
      pv.redraw();
    }
    update();
  }

  // ---------- PDF ----------
  function pagesFor(showSolution) {
    const per = showSolution ? st.answersPerPage : st.perPage;
    const pages = [];
    for (let i = 0; i < st.items.length; i += per) {
      const chunk = st.items.slice(i, i + per);
      pages.push({
        layout: per, lang: getLang(), showSolution, nameLine: st.nameLine && !showSolution,
        slots: chunk.map((it, j) => {
          const gen = getGenerator(it.gen);
          return makeSlot(gen, puzzleOf(it), { title: showSolution ? pick(gen.name) : pick(gen.defaultTitle), fontPt: 22, number: String(i + j + 1) });
        })
      });
    }
    pages.forEach((p, k) => { p.pageLabel = t('pageLabel', k + 1, pages.length); });
    return pages;
  }

  async function exportPdf(kind) {
    if (exporting || !st.items.length) return;
    exporting = true;
    try {
      await loadFonts();
      toast(t('busy'), { busy: true });
      await nextFrame();
      const pages = kind === 'answer' ? pagesFor(true) : kind === 'task' ? pagesFor(false) : [...pagesFor(false), ...pagesFor(true)];
      const n = st.items.length;
      const blob = await renderPdf(pages.length, (ctx, k, i) => drawPage(ctx, k, pages[i]), {
        dpi: 250, quality: 0.88,
        title: t('packFile', n).replace(/\.pdf$/, ''),
        onProgress: (i, total) => toast(t('pdfBusy', i, total), { busy: true })
      });
      download(blob, kind === 'task' ? t('packFile', n) : kind === 'answer' ? t('packFileAnswer', n) : t('packFileBoth', n));
      toast(t('pdfReady'));
    } catch (e) {
      console.error(e);
      toast(t('pdfError'));
    } finally {
      exporting = false;
    }
  }

  renderReview();
  return {
    title: t('packTitle'),
    destroy() { token++; ac.abort(); }
  };
}
