// assistant.js — «Yordamchi» oynasi. Faqat birinchi marta ochilganda yuklanadi (app.js: dynamic import).
// Savol → avval tayyor javob (assistant-kb.js, 0 token) → topilmasa AI (assistant-ai.js, kesh bilan).

import { h } from './dom.js';
import { ICONS } from './icons.js';
import { getLang } from '../core/i18n.js';
import { store } from '../core/storage.js';
import { getGenerator } from '../generators/registry.js';
import { getPageContext } from '../core/page-context.js';
import { localAnswer, chipsFor, skillsMenu, systemPrompt, ui } from '../core/assistant-kb.js';
import { askAI, aiAvailable, getKey, setKey } from '../core/assistant-ai.js';

const P = (o, l) => o?.[l] ?? o?.uz ?? '';
const SPARK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>';
const SEND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13"/><path d="m12 5 7 7-7 7"/></svg>';
const KEY = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 8.7-8.7"/><path d="m18 5 2 2"/><path d="m15 8 2 2"/></svg>';

let panel = null;
// Suhbat: [{who:'bot'|'me', text, gens?, chips?, ai?}] — sahifa almashganda ham saqlanadi (sessiya davomida)
let log = [];
try { log = JSON.parse(sessionStorage.getItem('pl2:ai-log') || '[]'); } catch { log = []; }
const saveLog = () => { try { sessionStorage.setItem('pl2:ai-log', JSON.stringify(log.slice(-30))); } catch { /* yopiq */ } };

export function toggleAssistant(fab) {
  if (panel) { closePanel(); return; }
  openPanel(fab);
}

function closePanel() {
  if (!panel) return;
  panel.el.remove();
  document.removeEventListener('keydown', panel.onKey, true);
  window.removeEventListener('hashchange', panel.onRoute);
  window.removeEventListener('langchange', panel.onLang);
  panel.fab?.setAttribute('aria-expanded', 'false');
  panel.fab?.focus();
  panel = null;
}

function openPanel(fab) {
  const lang = getLang();
  const T = (k, ...a) => ui(lang, k, ...a);
  const list = h('div', { class: 'ai-log', role: 'log', 'aria-live': 'polite' });
  const chipsRow = h('div', { class: 'ai-chips' });
  const input = h('textarea', { class: 'ai-input', rows: 1, maxlength: 300, placeholder: T('placeholder'), 'aria-label': T('placeholder') });
  const sendBtn = h('button', { type: 'submit', class: 'ai-send', 'aria-label': T('send'), title: T('send'), html: SEND });
  const form = h('form', { class: 'ai-form' }, input, sendBtn);
  const keyBtn = h('button', { type: 'button', class: 'icon-btn ghost small', 'aria-label': T('settings'), title: T('settings'), html: KEY });
  const clearBtn = h('button', { type: 'button', class: 'icon-btn ghost small', 'aria-label': T('clear'), title: T('clear'), html: ICONS.trash });
  const closeBtn = h('button', { type: 'button', class: 'icon-btn ghost small', 'aria-label': T('close'), title: T('close'), html: ICONS.close });
  const keyBox = h('div', { class: 'ai-keybox', hidden: true });

  const el = h('section', { class: 'ai-panel', role: 'dialog', 'aria-label': T('name') },
    h('header', { class: 'ai-head' },
      h('span', { class: 'ai-avatar', html: SPARK }),
      h('div', { class: 'ai-title' }, h('strong', null, T('name')), h('span', null, T('sub'))),
      keyBtn, clearBtn, closeBtn),
    keyBox, list, chipsRow, form);
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('open'));

  const ctx = () => { const c = getPageContext(); return { ...c, route: c.route || 'home' }; };

  // ---------- Xabarlarni chizish ----------
  function bubble(m) {
    const b = h('div', { class: 'ai-msg ' + (m.who === 'me' ? 'me' : 'bot') + (m.err ? ' err' : '') });
    if (m.who === 'me') { b.textContent = m.text; return b; }
    // [[id]] — generator tugmasi; **qalin** belgilarini olib tashlaymiz
    const ids = [...(m.gens || [])];
    const txt = String(m.text).replace(/\*\*/g, '').replace(/\[\[([a-z0-9]+)\]\]/g, (s, id) => {
      const g = getGenerator(id);
      if (!g) return '';
      if (!ids.includes(id)) ids.push(id);
      return '«' + P(g.name, lang) + '»';
    });
    b.append(h('p', null, txt));
    if (ids.length) {
      b.append(h('div', { class: 'ai-gens' }, ids.map(id => {
        const g = getGenerator(id);
        return g && h('a', { class: 'ai-gen', href: '#/' + id }, h('span', { class: 'ai-gen-cover', html: g.cover }), h('span', null, P(g.name, lang)));
      })));
    }
    if (m.chips) b.append(h('div', { class: 'ai-chips inline' }, m.chips.map(c => chip(c))));
    if (m.cached) b.append(h('span', { class: 'ai-note' }, T('fromCache')));
    return b;
  }
  function render() {
    list.innerHTML = '';
    list.append(bubble({ who: 'bot', text: T('hello') }));
    for (const m of log) list.append(bubble(m));
    list.scrollTop = list.scrollHeight;
    chipsRow.innerHTML = '';
    chipsRow.append(...chipsFor(ctx(), lang).map(c => chip(c)));
  }
  function chip(c) {
    return h('button', { type: 'button', class: 'ai-chip', onclick: () => {
      if (c.menu === 'skills') { log.push({ who: 'me', text: c.q }, { who: 'bot', ...skillsMenu(lang) }); saveLog(); render(); return; }
      ask(c.q);
    } }, c.label);
  }

  // ---------- Savol ----------
  let busy = false;
  async function ask(q) {
    q = String(q || '').trim();
    if (!q || busy) return;
    log.push({ who: 'me', text: q });
    const c = ctx();
    const local = localAnswer(q, lang, c);
    if (local) { log.push({ who: 'bot', ...local }); saveLog(); render(); return; }
    if (!aiAvailable()) { log.push({ who: 'bot', text: T('noAi') }); saveLog(); render(); return; }

    busy = true; sendBtn.disabled = true;
    render();
    const wait = h('div', { class: 'ai-msg bot wait' }, h('span', { class: 'ai-dots', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')), h('span', { class: 'sr-only' }, T('thinking')));
    list.append(wait); list.scrollTop = list.scrollHeight;
    // AI tarixi: faqat oxirgi AI savol-javoblari (tayyor javoblar emas)
    const hist = [];
    for (let i = 0; i < log.length - 1; i++) if (log[i + 1]?.ai && log[i].who === 'me') hist.push({ role: 'user', text: log[i].text }, { role: 'model', text: log[i + 1].text });
    try {
      const r = await askAI({ question: q, lang, ctx: c, system: systemPrompt(lang, c), history: hist.slice(-4) });
      log.push({ who: 'bot', text: r.text || T('aiErr'), ai: !!r.text, cached: r.cached });
    } catch (e) {
      log.push({ who: 'bot', err: true, text: e.code === 'limit' ? T('aiLimit') : e.code === 'offline' ? T('offline') : e.code === 'no-ai' ? T('noAi') : T('aiErr') });
    } finally {
      busy = false; sendBtn.disabled = false;
      saveLog(); render();
    }
  }
  form.addEventListener('submit', e => { e.preventDefault(); const q = input.value; input.value = ''; autosize(); ask(q); });
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
  const autosize = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 96) + 'px'; };
  input.addEventListener('input', autosize);

  // ---------- Sozlamalar: shaxsiy kalit (ixtiyoriy) ----------
  keyBtn.addEventListener('click', () => {
    if (!keyBox.hidden) { keyBox.hidden = true; return; }
    const inp = h('input', { type: 'password', class: 'ai-key-input', autocomplete: 'off', spellcheck: 'false', placeholder: 'AIza…', 'aria-label': T('keyLabel') });
    inp.value = getKey();
    const save = h('button', { type: 'button', class: 'btn btn-primary ai-key-save' }, T('keySave'));
    save.addEventListener('click', () => { setKey(inp.value); save.textContent = T('keySaved'); setTimeout(() => { keyBox.hidden = true; }, 700); });
    keyBox.innerHTML = '';
    keyBox.append(h('label', { class: 'field-label' }, T('keyLabel')), h('div', { class: 'ai-key-row' }, inp, save), h('p', { class: 'field-note' }, T('keyNote')));
    keyBox.hidden = false;
    inp.focus();
  });
  clearBtn.addEventListener('click', () => { log = []; saveLog(); render(); input.focus(); });
  closeBtn.addEventListener('click', closePanel);

  const onKey = e => { if (e.key === 'Escape' && !document.querySelector('.modal-overlay')) { e.preventDefault(); closePanel(); } };
  const onRoute = () => setTimeout(render, 0);              // sahifa almashsa — tugmalar yangilanadi
  const onLang = () => { const f = panel?.fab; closePanel(); openPanel(f); };
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('hashchange', onRoute);
  window.addEventListener('langchange', onLang);
  panel = { el, onKey, onRoute, onLang, fab };
  fab?.setAttribute('aria-expanded', 'true');
  render();
  input.focus({ preventScroll: true });
}

export { SPARK };
