// cart-page.js — «Savat» sahifasi (#/cart).
// Generator sahifalarida «Savatga qo'shish» bilan yig'ilgan topshiriqlar: ko'rib chiqish, tartibini o'zgartirish,
// almashtirish, olib tashlash, variantlar soni (har o'quvchiga alohida) va bitta PDF.
// Savatni shablon sifatida saqlash mumkin — keyingi safar bir klikda xuddi shunday to'plam, lekin yangi masalalar.

import { h, nextFrame, toast } from './dom.js';
import { ICONS, CART_COVER } from './icons.js';
import { openModal, attachMenu } from './modal.js';
import { createPreview } from './preview.js';
import { getPuzzle, makeSlot } from './puzzles.js';
import { loadFonts } from './fonts.js';
import { getGenerator } from '../generators/registry.js';
import { t, pick, getLang, lvl } from '../core/i18n.js';
import { newSeed } from '../core/rng.js';
import { drawPage, slotAspect, PER_PAGE } from '../core/sheet.js';
import { renderPdf } from '../core/pdf.js';
import { download } from '../core/files.js';
import { loadCart, saveCart, cartPages, saveTemplate, itemsFromTemplate, MAX_COPIES } from '../core/cart.js';

const THUMB_PX = 360;

export function mountCart(main) {
  const ac = new AbortController();
  const { signal } = ac;
  const cart = loadCart();
  cart.items = cart.items.filter(it => getGenerator(it.gen));
  const save = () => saveCart(cart);
  let token = 0, exporting = false;

  const slotOf = (it, seed, per, number, showSolution) => {
    const gen = getGenerator(it.gen);
    const p = getPuzzle(gen, { ...it.opts, aspect: slotAspect(per), perPage: per }, seed);
    return makeSlot(gen, p, { title: showSolution ? pick(gen.name) : (it.title ?? pick(gen.defaultTitle)), fontPt: it.fontPt, number: String(number) });
  };
  const itemTitle = (it, i) => `${i + 1}. ${pick(getGenerator(it.gen).name)} · ${lvl(it.opts.level ?? 1)}`;

  // ---------- Sarlavha ----------
  const head = h('div', { class: 'page-head' },
    h('a', { class: 'back-link', href: '#/' }, h('span', { class: 'bl-icon', html: ICONS.back }), t('back')),
    h('div', { class: 'page-title' }, h('span', { class: 'page-cover', html: CART_COVER }), h('h1', null, t('cartTitle'))));
  const lead = h('p', { class: 'lead' }, t('cartLead'));

  // ---------- Sozlamalar ----------
  function segOf(label, values, get, set) {
    const btns = values.map(v => h('button', { type: 'button', class: 'seg-btn' }, String(v)));
    const sync = () => btns.forEach((b, i) => b.setAttribute('aria-pressed', String(values[i] === get())));
    btns.forEach((b, i) => b.addEventListener('click', () => { set(values[i]); sync(); }));
    sync();
    return h('div', { class: 'field' }, h('span', { class: 'field-label' }, label),
      h('div', { class: 'seg seg-' + values.length, role: 'group', 'aria-label': label }, btns));
  }
  const nameChk = h('input', { type: 'checkbox', id: 'ct-name' });
  nameChk.checked = cart.nameLine;
  nameChk.addEventListener('change', () => { cart.nameLine = nameChk.checked; save(); });
  // Variantlar soni
  const cOut = h('output', { class: 'stepper-val', 'aria-live': 'polite' }, String(cart.copies));
  const cMinus = h('button', { type: 'button', class: 'stepper-btn', 'aria-label': '−1', html: ICONS.minus });
  const cPlus = h('button', { type: 'button', class: 'stepper-btn', 'aria-label': '+1', html: ICONS.plus });
  const syncCopies = () => { cOut.textContent = String(cart.copies); cMinus.disabled = cart.copies <= 1; cPlus.disabled = cart.copies >= MAX_COPIES; updateTotal(); };
  cMinus.addEventListener('click', () => { cart.copies = Math.max(1, cart.copies - 1); save(); syncCopies(); });
  cPlus.addEventListener('click', () => { cart.copies = Math.min(MAX_COPIES, cart.copies + 1); save(); syncCopies(); });
  const copiesField = h('div', { class: 'field' },
    h('span', { class: 'field-label' }, t('cartCopies')),
    h('div', { class: 'stepper', role: 'group', 'aria-label': t('cartCopies') }, cMinus, cOut, cPlus),
    h('p', { class: 'field-note' }, t('cartCopiesNote')));
  const optsEl = h('section', { class: 'panel cart-opts' },
    segOf(t('perPage'), PER_PAGE, () => cart.perPage, v => { cart.perPage = v; save(); renderReview(); }),
    segOf(t('packAnswersPerPage'), PER_PAGE, () => cart.answersPerPage, v => { cart.answersPerPage = v; save(); }),
    copiesField,
    h('label', { class: 'check-row', for: 'ct-name' }, nameChk, h('span', null, t('nameLine'))));

  // ---------- Ko'rib chiqish ----------
  const totalEl = h('span', { class: 'review-total' });
  const grid = h('div', { class: 'thumbs' });
  const empty = h('div', { class: 'empty' }, h('p', null, t('cartEmpty')), h('a', { class: 'btn btn-primary', href: '#/' }, t('cartGoHome')));
  const review = h('section', { class: 'pack-review', 'aria-labelledby': 'ct-review-h' },
    h('div', { class: 'review-head' }, h('h2', { id: 'ct-review-h' }, t('packReview')), totalEl), empty, grid);

  // ---------- Shablonlar ----------
  const tplName = h('input', { type: 'text', id: 'ct-tpl', maxlength: 60, placeholder: t('cartTemplateExample'), 'aria-label': t('cartTemplateName') });
  const tplSave = h('button', { type: 'button', class: 'btn' }, t('cartTemplateSave'));
  const tplList = h('div', { class: 'tpl-list' });
  tplSave.addEventListener('click', () => {
    if (!cart.items.length) return;
    const tp = saveTemplate(cart, tplName.value || t('cartTemplateDefault', cart.templates.length + 1));
    tplName.value = '';
    save(); renderTemplates();
    toast(t('cartTemplateSaved') + ': ' + tp.name);
  });
  const tplPanel = h('section', { class: 'panel cart-templates', 'aria-labelledby': 'ct-tpl-h' },
    h('h2', { id: 'ct-tpl-h', class: 'group-title' }, t('cartTemplates')),
    h('p', { class: 'field-note' }, t('cartTemplatesNote')),
    h('div', { class: 'tpl-save' }, tplName, tplSave),
    tplList);

  function renderTemplates() {
    tplSave.disabled = !cart.items.length;
    tplList.innerHTML = '';
    cart.templates.forEach((tp, i) => {
      const load = h('button', { type: 'button', class: 'btn btn-small' }, t('cartTemplateLoad'));
      load.addEventListener('click', () => {
        if (cart.items.length && !window.confirm(t('cartConfirmReplace'))) return;
        cart.items = itemsFromTemplate(tp).filter(it => getGenerator(it.gen));
        save(); renderReview();
        toast(t('cartTemplateLoaded', cart.items.length));
      });
      const del = h('button', { type: 'button', class: 'icon-btn small danger', title: t('cartTemplateDelete'), 'aria-label': t('cartTemplateDelete') + ': ' + tp.name, html: ICONS.trash });
      del.addEventListener('click', () => { cart.templates.splice(i, 1); save(); renderTemplates(); });
      tplList.appendChild(h('div', { class: 'tpl-row' },
        h('span', { class: 'tpl-name' }, tp.name), h('span', { class: 'tpl-count' }, t('cartTemplateItems', tp.items.length)), load, del));
    });
  }

  // ---------- Pastki panel ----------
  const pdfBtn = h('button', { type: 'button', class: 'btn btn-primary btn-new' },
    h('span', { class: 'btn-icon', html: ICONS.download }), h('span', null, t('pdf')));
  const clearBtn = h('button', { type: 'button', class: 'icon-btn danger', title: t('cartClear'), 'aria-label': t('cartClear'), html: ICONS.trash });
  clearBtn.addEventListener('click', () => {
    if (!window.confirm(t('cartConfirmClear'))) return;
    cart.items = []; save(); renderReview();
  });
  const bar = h('div', { class: 'action-bar' }, h('div', { class: 'action-inner' }, h('div', { class: 'menu-wrap menu-wrap-wide' }, pdfBtn), clearBtn));
  attachMenu(pdfBtn, () => [
    { label: t('packPdfTasks'), icon: ICONS.file, onSelect: () => exportPdf('task') },
    { label: t('packPdfAnswers'), icon: ICONS.answer, onSelect: () => exportPdf('answer') },
    { label: t('pdfBoth'), icon: ICONS.files, onSelect: () => exportPdf('both') }
  ], { signal });

  main.append(h('div', { class: 'page pack-page cart-page' }, head, lead, review, optsEl, tplPanel), bar);

  function updateTotal() {
    const n = cart.items.length;
    totalEl.textContent = n ? t('cartTotal', n, cart.copies, cartPages(cart, cart.perPage).length) : '';
  }

  async function renderReview() {
    const my = ++token;
    const n = cart.items.length;
    updateTotal();
    empty.hidden = n > 0;
    bar.hidden = n === 0;
    optsEl.hidden = n === 0;
    renderTemplates();
    grid.innerHTML = '';
    const canvases = cart.items.map((it, i) => {
      const canvas = h('canvas', { class: 'thumb-canvas', width: THUMB_PX, height: Math.round(THUMB_PX * 297 / 210) });
      const openBtn = h('button', { type: 'button', class: 'thumb-open', 'aria-label': t('packOpen') + ': ' + itemTitle(it, i) }, canvas);
      openBtn.addEventListener('click', () => openItem(i));
      const mk = (icon, label, fn, cls = '') => {
        const b = h('button', { type: 'button', class: 'icon-btn small ' + cls, title: label, 'aria-label': label, html: ICONS[icon] });
        b.addEventListener('click', fn);
        return b;
      };
      const left = mk('back', t('cartMoveUp'), () => move(i, -1));
      const right = mk('next', t('cartMoveDown'), () => move(i, 1));
      left.disabled = i === 0; right.disabled = i === n - 1;
      const fig = h('figure', { class: 'thumb' }, openBtn,
        h('figcaption', null, h('span', { class: 'thumb-title' }, itemTitle(it, i)),
          h('span', { class: 'thumb-actions' }, left, right, mk('refresh', t('packRegen'), () => regen(i)), mk('trash', t('packRemove'), () => remove(i), 'danger'))));
      grid.appendChild(fig);
      return canvas;
    });
    for (let i = 0; i < canvases.length; i++) {
      await nextFrame();
      if (my !== token) return;
      drawThumb(canvases[i], i);
    }
  }
  const singlePage = (i, showSolution) => ({
    slots: [slotOf(cart.items[i], cart.items[i].seed, cart.perPage, i + 1, showSolution)],
    layout: 1, lang: getLang(), showSolution, nameLine: cart.nameLine && !showSolution
  });
  function drawThumb(canvas, i) {
    try { drawPage(canvas.getContext('2d'), canvas.width / 210, singlePage(i, false)); } catch (e) { console.error(e); }
  }
  window.addEventListener('fontsready', () => grid.querySelectorAll('canvas').forEach((c, i) => { if (cart.items[i]) drawThumb(c, i); }), { signal });

  function move(i, d) {
    const j = i + d;
    if (j < 0 || j >= cart.items.length) return;
    [cart.items[i], cart.items[j]] = [cart.items[j], cart.items[i]];
    save(); renderReview();
  }
  function regen(i) {
    cart.items[i] = { ...cart.items[i], seed: newSeed() };
    save();
    const fig = grid.children[i];
    if (fig) drawThumb(fig.querySelector('canvas'), i);
  }
  function remove(i) {
    cart.items.splice(i, 1);
    save(); renderReview();
  }

  // Kattaroq ko'rish oynasi
  function openItem(index) {
    let i = index, show = false;
    const pv = createPreview((ctx, k) => { if (cart.items[i]) drawPage(ctx, k, singlePage(i, show)); }, { maxPx: 1300 });
    const counter = h('span', { class: 'viewer-count' });
    const mk = (icon, label, fn, cls = '') => {
      const b = h('button', { type: 'button', class: 'icon-btn ' + cls, title: label, 'aria-label': label, html: ICONS[icon] });
      b.addEventListener('click', fn);
      return b;
    };
    const prev = mk('back', t('prev'), () => { if (i > 0) { i--; update(); } });
    const next = mk('next', t('next'), () => { if (i < cart.items.length - 1) { i++; update(); } });
    const eye = mk('eye', t('showAnswer'), () => { show = !show; eye.setAttribute('aria-pressed', String(show)); eye.innerHTML = show ? ICONS.eyeOff : ICONS.eye; pv.redraw(); });
    eye.setAttribute('aria-pressed', 'false');
    const re = mk('refresh', t('packRegen'), () => { regen(i); pv.redraw(); });
    const rm = mk('trash', t('packRemove'), () => {
      remove(i);
      if (!cart.items.length) { m.close(); return; }
      i = Math.min(i, cart.items.length - 1); update();
    }, 'danger');
    const body = h('div', { class: 'viewer' }, h('div', { class: 'sheet-frame' }, pv.canvas),
      h('div', { class: 'viewer-bar' }, prev, counter, next, h('span', { class: 'spacer' }), eye, re, rm));
    const m = openModal({ title: itemTitle(cart.items[i], i), body, className: 'modal-wide', onClose: () => pv.destroy() });
    function update() {
      m.box.querySelector('h2').textContent = itemTitle(cart.items[i], i);
      counter.textContent = `${i + 1} / ${cart.items.length}`;
      prev.disabled = i === 0; next.disabled = i === cart.items.length - 1;
      pv.redraw();
    }
    update();
  }

  // ---------- PDF ----------
  function pagesFor(showSolution) {
    const per = showSolution ? cart.answersPerPage : cart.perPage;
    const list = cartPages(cart, per);
    const perCopy = list.length / cart.copies;
    return list.map((pg, k) => ({
      layout: per, lang: getLang(), showSolution, nameLine: cart.nameLine && !showSolution,
      // Topshiriqning o'zi o'quvchi varag'idagi o'lchamda yaratiladi (javob boshqa joylashuvda chizilsa ham mos keladi)
      slots: pg.entries.map(e => slotOf(e.item, e.seed, cart.perPage, e.number, showSolution)),
      pageLabel: cart.copies > 1 ? t('cartVariantPage', pg.copy + 1, (k % perCopy) + 1, perCopy) : t('pageLabel', k + 1, list.length)
    }));
  }
  async function exportPdf(kind) {
    if (exporting || !cart.items.length) return;
    exporting = true;
    try {
      await loadFonts();
      toast(t('busy'), { busy: true });
      await nextFrame();
      const pages = kind === 'answer' ? pagesFor(true) : kind === 'task' ? pagesFor(false) : [...pagesFor(false), ...pagesFor(true)];
      const n = cart.items.length;
      const blob = await renderPdf(pages.length, (ctx, k, i) => drawPage(ctx, k, pages[i]), {
        dpi: 250, quality: 0.88,
        title: t('cartFile', n, cart.copies).replace(/\.pdf$/, ''),
        onProgress: (i, total) => toast(t('pdfBusy', i, total), { busy: true })
      });
      download(blob, kind === 'task' ? t('cartFile', n, cart.copies) : kind === 'answer' ? t('cartFileAnswer', n, cart.copies) : t('cartFileBoth', n, cart.copies));
      toast(t('pdfReady'));
    } catch (e) {
      console.error(e);
      toast(t('pdfError'));
    } finally {
      exporting = false;
    }
  }

  syncCopies();
  renderReview();
  return { title: t('cartTitle'), destroy() { token++; ac.abort(); } };
}
