// generator-page.js — har qanday generator uchun UMUMIY sahifa.
// Generator faqat o'z sozlamalarini (options) va generate/draw funksiyalarini beradi —
// sahifa, ko'rinish, PDF, "bir varaqda nechta", raqam (seed) va h.k. shu yerda.

import { h, nextFrame, toast } from './dom.js';
import { ICONS } from './icons.js';
import { openModal, attachMenu } from './modal.js';
import { createPreview } from './preview.js';
import { buildOptions } from './options.js';
import { getPuzzle, makeSlot, defaultOpts, isCached } from './puzzles.js';
import { loadFonts } from './fonts.js';
import { t, pick, getLang } from '../core/i18n.js';
import { store } from '../core/storage.js';
import { newSeed, deriveSeed } from '../core/rng.js';
import { drawPage, slotAspect, PER_PAGE } from '../core/sheet.js';
import { renderPdf } from '../core/pdf.js';
import { download } from '../core/files.js';
import { addToCart } from '../core/cart.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function loadState(gen) {
  const saved = store.get('gen:' + gen.id, {}) || {};
  const opts = { ...defaultOpts(gen), ...(saved.opts || {}) };
  for (const op of gen.options) {                      // eskirgan/buzilgan qiymatlarni tuzatamiz
    if (op.type === 'choice' && !op.choices.some(c => c.value === opts[op.key])) opts[op.key] = op.default;
    if (op.type === 'emoji' && !op.choices.includes(opts[op.key])) opts[op.key] = op.default;
    if (op.type === 'level' && ![0, 1, 2, 3].includes(opts.level)) opts.level = op.default;
  }
  return {
    opts,
    seed: Number.isInteger(saved.seed) && saved.seed > 0 ? saved.seed : newSeed(),
    perPage: PER_PAGE.includes(saved.perPage) ? saved.perPage : 1,
    nameLine: !!saved.nameLine,
    title: typeof saved.title === 'string' ? saved.title : null,     // null — standart matn
    fontPt: clamp(+saved.fontPt || 24, 14, 40)
  };
}

export function mountGenerator(main, gen) {
  const ac = new AbortController();
  const { signal } = ac;
  const st = loadState(gen);
  const save = () => store.set('gen:' + gen.id, st);
  save();                                              // raqam saqlanadi: qayta kirganda o'sha topshiriq chiqadi
  let showAnswer = false, slots = [], infos = [], token = 0, exporting = false, lastInteractive = null;

  // ---------- Sarlavha ----------
  const head = h('div', { class: 'page-head' },
    h('a', { class: 'back-link', href: '#/' }, h('span', { class: 'bl-icon', html: ICONS.back }), t('back')),
    h('div', { class: 'page-title' },
      h('span', { class: 'page-cover', html: gen.cover }),
      h('h1', null, pick(gen.name))));

  // ---------- Sozlamalar paneli ----------
  const optsUI = buildOptions(gen, st.opts, () => { save(); regenerate(); });
  const titleTa = h('textarea', { id: 'title-input', rows: 2, maxlength: 300 });
  titleTa.value = st.title ?? pick(gen.defaultTitle);
  const resetBtn = h('button', { type: 'button', class: 'link-btn', hidden: st.title === null }, t('titleReset'));
  resetBtn.addEventListener('click', () => {
    st.title = null; titleTa.value = pick(gen.defaultTitle); resetBtn.hidden = true; save(); preview.redraw();
  });
  titleTa.addEventListener('input', () => { st.title = titleTa.value; resetBtn.hidden = false; save(); preview.redraw(); });
  const fontVal = h('output', { class: 'range-val' }, st.fontPt + ' pt');
  const fontRange = h('input', { type: 'range', min: 14, max: 40, step: 1, value: st.fontPt, 'aria-label': t('fontSize') });
  fontRange.addEventListener('input', () => { st.fontPt = +fontRange.value; fontVal.textContent = st.fontPt + ' pt'; save(); preview.redraw(); });
  const hintEl = h('p', { class: 'hint', 'aria-live': 'polite' });

  const panel = h('section', { class: 'panel settings-panel' },
    optsUI.el,
    h('div', { class: 'field field-title' },
      h('div', { class: 'field-row' }, h('label', { class: 'field-label', for: 'title-input' }, t('titleLabel')), resetBtn),
      titleTa,
      h('div', { class: 'range-row' }, h('span', { class: 'range-label' }, t('fontSize')), fontRange, fontVal)),
    hintEl);

  // ---------- Varaq ko'rinishi ----------
  const pageSpec = showSolution => ({
    slots: slots.map(s => ({ ...s, title: st.title ?? pick(gen.defaultTitle), fontPt: st.fontPt })),
    layout: st.perPage, lang: getLang(), showSolution, nameLine: st.nameLine
  });
  const preview = createPreview((ctx, k) => {
    if (!slots.length) { ctx.setTransform(k, 0, 0, k, 0, 0); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 210, 297); return; }
    infos = drawPage(ctx, k, pageSpec(showAnswer));
    updateHint();
  }, { label: t('previewAlt') + ': ' + pick(gen.name) });
  const busy = h('div', { class: 'busy', hidden: true }, h('span', { class: 'spinner', 'aria-hidden': 'true' }), t('busy'));
  const interactive = h('div', { class: 'interactive' });
  const previewCol = h('section', { class: 'preview-col' },
    h('div', { class: 'sheet-frame' }, preview.canvas, busy),
    h('p', { class: 'preview-note' }, t('previewNote')),
    interactive);

  // ---------- Pastki panel ----------
  const newBtn = h('button', { type: 'button', class: 'btn btn-primary btn-new', 'aria-label': t('newPuzzle') },
    h('span', { class: 'btn-icon', html: ICONS.refresh }),
    h('span', { class: 'lbl-full' }, t('newPuzzle')), h('span', { class: 'lbl-short', 'aria-hidden': 'true' }, t('newPuzzleShort')));
  newBtn.addEventListener('click', () => { st.seed = newSeed(); save(); regenerate(); });
  const eyeBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-pressed': 'false' });
  eyeBtn.addEventListener('click', () => { showAnswer = !showAnswer; syncEye(); preview.redraw(); });
  const pdfBtn = h('button', { type: 'button', class: 'icon-btn', title: t('pdf'), 'aria-label': t('pdf'), html: ICONS.download });
  const setBtn = h('button', { type: 'button', class: 'icon-btn', title: t('settings'), 'aria-label': t('settings'), html: ICONS.settings });
  // Savatga: varaqdagi topshiriq(lar) aynan shu sozlamalar va raqamlar bilan qo'shiladi
  const cartBtn = h('button', { type: 'button', class: 'icon-btn cart-add', title: t('cartAdd'), 'aria-label': t('cartAdd'), html: ICONS.cartPlus });
  cartBtn.addEventListener('click', () => {
    if (!slots.length) return;
    const entries = slots.map((_, i) => ({ gen: gen.id, opts: { ...st.opts }, seed: deriveSeed(st.seed, i), title: st.title, fontPt: st.fontPt }));
    const r = addToCart(entries);
    toast(r.added ? t('cartAdded', r.added, r.total) : t('cartFull'));
  });
  setBtn.addEventListener('click', openSettings);
  const bar = h('div', { class: 'action-bar' },
    h('div', { class: 'action-inner' }, newBtn, eyeBtn, h('div', { class: 'menu-wrap' }, pdfBtn), cartBtn, setBtn));
  attachMenu(pdfBtn, () => [
    { label: t('pdfTask'), icon: ICONS.file, onSelect: () => exportPdf('task') },
    { label: t('pdfAnswer'), icon: ICONS.answer, onSelect: () => exportPdf('answer') },
    { label: t('pdfBoth'), icon: ICONS.files, onSelect: () => exportPdf('both') }
  ], { signal });

  function syncEye() {
    eyeBtn.innerHTML = showAnswer ? ICONS.eyeOff : ICONS.eye;
    eyeBtn.setAttribute('aria-pressed', String(showAnswer));
    eyeBtn.setAttribute('aria-label', t('showAnswer'));
    eyeBtn.title = showAnswer ? t('hideAnswer') : t('showAnswer');
  }
  syncEye();

  main.append(h('div', { class: 'page gen-page' }, head, h('div', { class: 'gen-layout' }, panel, previewCol)), bar);

  // ---------- Topshiriqlarni yaratish ----------
  async function regenerate() {
    const my = ++token;
    const genOpts = { ...st.opts, aspect: slotAspect(st.perPage), perPage: st.perPage };
    const seeds = Array.from({ length: st.perPage }, (_, i) => deriveSeed(st.seed, i));
    const slow = seeds.some(s => !isCached(gen, genOpts, s));
    if (slow) { busy.hidden = false; await nextFrame(); if (my !== token) return; }
    const puzzles = [];
    for (const s of seeds) {
      try { puzzles.push(getPuzzle(gen, genOpts, s)); }
      catch (e) { console.error(e); busy.hidden = true; toast(t('genError')); return; }
      if (slow && st.perPage > 1) { await nextFrame(); if (my !== token) return; }
    }
    busy.hidden = true;
    slots = puzzles.map((p, i) => makeSlot(gen, p, { number: st.perPage > 1 ? String(i + 1) : '' }));
    preview.redrawNow();
    updateInteractive();
  }

  function updateHint() {
    if (!slots.length || !gen.hint) { hintEl.textContent = ''; return; }
    const r = gen.hint(slots[0].puzzle, infos[0] || {}, getLang()) || { text: '' };
    hintEl.textContent = r.text;
    hintEl.classList.toggle('warn', !!r.warn);
  }

  function updateInteractive() {
    const p = st.perPage === 1 && gen.interactive ? slots[0]?.puzzle : null;
    if (p === lastInteractive) return;
    lastInteractive = p;
    interactive.innerHTML = '';
    if (p) gen.interactive(interactive, p, getLang());
  }

  // ---------- Sozlamalar oynasi ----------
  function openSettings() {
    const seg = h('div', { class: 'seg seg-3', role: 'group', 'aria-label': t('perPage') });
    const segBtns = PER_PAGE.map(n => h('button', { type: 'button', class: 'seg-btn' }, String(n)));
    const syncSeg = () => segBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(PER_PAGE[i] === st.perPage)));
    segBtns.forEach((b, i) => {
      b.addEventListener('click', () => { st.perPage = PER_PAGE[i]; syncSeg(); save(); regenerate(); });
      seg.appendChild(b);
    });
    syncSeg();

    const nameChk = h('input', { type: 'checkbox', id: 'opt-name' });
    nameChk.checked = st.nameLine;
    nameChk.addEventListener('change', () => { st.nameLine = nameChk.checked; save(); preview.redraw(); });

    const seedInp = h('input', { type: 'number', id: 'opt-seed', min: 1, max: 999999999, inputmode: 'numeric' });
    seedInp.value = st.seed;
    seedInp.addEventListener('change', () => {
      const v = Math.round(+seedInp.value);
      if (Number.isFinite(v) && v >= 1 && v <= 999999999) { st.seed = v; save(); regenerate(); }
      else seedInp.value = st.seed;
    });
    const diceBtn = h('button', { type: 'button', class: 'icon-btn', title: t('random'), 'aria-label': t('random'), html: ICONS.dice });
    diceBtn.addEventListener('click', () => { st.seed = newSeed(); seedInp.value = st.seed; save(); regenerate(); });

    const adv = buildOptions(gen, st.opts, () => { save(); regenerate(); }, { advanced: true });
    const doneBtn = h('button', { type: 'button', class: 'btn btn-primary btn-block' }, t('done'));

    const body = h('div', { class: 'settings-body' },
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, t('perPage')), seg),
      h('label', { class: 'check-row', for: 'opt-name' }, nameChk, h('span', null, t('nameLine'))),
      h('div', { class: 'field' },
        h('label', { class: 'field-label', for: 'opt-seed' }, t('seed')),
        h('div', { class: 'seed-row' }, seedInp, diceBtn),
        h('p', { class: 'field-note' }, t('seedHelp'))),
      adv.empty ? null : h('div', { class: 'field-group' }, h('h3', { class: 'group-title' }, t('advanced')), adv.el),
      doneBtn);
    const m = openModal({ title: t('settings'), body });
    doneBtn.addEventListener('click', () => m.close());
  }

  // ---------- PDF ----------
  async function exportPdf(kind) {
    if (exporting || !slots.length) return;
    exporting = true;
    try {
      await loadFonts();
      const pages = kind === 'both' ? [false, true] : [kind === 'answer'];
      const blob = await renderPdf(pages.length, (ctx, k, i) => drawPage(ctx, k, pageSpec(pages[i])), {
        title: `${pick(gen.name)} ${st.seed}`,
        onProgress: (i, n) => toast(t('pdfBusy', i, n), { busy: true })
      });
      const key = kind === 'task' ? 'fileTask' : kind === 'answer' ? 'fileAnswer' : 'fileBoth';
      download(blob, t(key, pick(gen.fileBase), st.seed));
      toast(t('pdfReady'));
    } catch (e) {
      console.error(e);
      toast(t('pdfError'));
    } finally {
      exporting = false;
    }
  }

  regenerate();
  return {
    title: pick(gen.name),
    destroy() { token++; ac.abort(); preview.destroy(); }
  };
}
