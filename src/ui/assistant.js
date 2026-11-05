// assistant.js — «Yordamchi» oynasi. Faqat birinchi marta ochilganda yuklanadi (app.js: dynamic import).
// Ko'rinishi «My AI Agent» (gemini-chat) uslubida: iliq krem fon, oq yumaloq kartochkalar, gradient plitka-ikonkalar,
// pastda yumaloq yozish qutisi. Kichik oyna yoki butun ekran (⤢ tugmasi).
// Savol → avval tayyor javob (assistant-kb.js, 0 token) → topilmasa AI (assistant-ai.js, loyiha bilimi bilan).

import { h } from './dom.js';
import { ASSISTANT_ICON } from './icons.js';
import { getLang } from '../core/i18n.js';
import { store } from '../core/storage.js';
import { getGenerator } from '../generators/registry.js';
import { getPageContext } from '../core/page-context.js';
import { localAnswer, chipsFor, skillsMenu, systemPrompt, pageNote, ui } from '../core/assistant-kb.js';
import { askAI, aiAvailable, getKey, setKey } from '../core/assistant-ai.js';

const P = (o, l) => o?.[l] ?? o?.uz ?? '';
// Ikonkalar — gemini-chat'dagi chiziqli to'plamdan
const PATHS = {
  bot: ASSISTANT_ICON,
  sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 16v4M17 18h4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2.5"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><path d="M10 11v6M14 11v6"/>',
  settings: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  expand: '<path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="m21 3-7 7"/><path d="m3 21 7-7"/>',
  shrink: '<path d="m14 10 7-7"/><path d="M20 10h-6V4"/><path d="m3 21 7-7"/><path d="M4 14h6v6"/>',
  redo: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>'
};
const ic = name => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name]}</svg>`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Kichik Markdown: **qalin**, `kod`, «- » ro'yxat, «1. » raqamli ro'yxat, paragraflar. Matn avval xavfsiz qilinadi.
function mdLite(text) {
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/(^|\s)\*(?!\s)([^*]+?)\*(?=\s|$|[.,!?])/g, '$1<em>$2</em>');
  const out = [];
  let list = null;
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const raw of String(text).replace(/^#{1,6}\s+/gm, '').split('\n')) {
    const line = raw.trimEnd();
    const ul = /^\s*[-*•]\s+(.*)$/.exec(line), ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (ul || ol) {
      const tag = ul ? 'ul' : 'ol';
      if (list !== tag) { close(); out.push(`<${tag}>`); list = tag; }
      out.push(`<li>${inline((ul || ol)[1])}</li>`);
    } else if (!line.trim()) close();
    else { close(); out.push(`<p>${inline(line)}</p>`); }
  }
  close();
  return out.join('');
}

let panel = null;
// Suhbat: [{who:'bot'|'me', text, ts, gens?, chips?, ai?, cached?, err?}] — sessiya davomida saqlanadi
let log = [];
try { log = JSON.parse(sessionStorage.getItem('pl2:ai-log') || '[]'); } catch { log = []; }
const saveLog = () => { try { sessionStorage.setItem('pl2:ai-log', JSON.stringify(log.slice(-40))); } catch { /* yopiq */ } };

// Boshqa joydan savol berish (masalan, «Tushuntir» kartochkasidagi «Yordamchidan so'rash»)
export function askAssistant(q) {
  if (!panel) openPanel(document.querySelector('.ai-fab'));
  panel?.ask(q);
}

// Sahifadagi amallar (tool): AI javobidagi [[do:...]] yoki tayyor javobdagi action → generator sahifasiga buyruq
const DO_RE = /\[\[do:(explain|next|prev|answer|stop)\]\]/g;
const CMD = { explain: 'start', next: 'next', prev: 'prev', answer: 'answer', stop: 'stop' };
function runAction(cmd) {
  if (!cmd) return;
  window.dispatchEvent(new CustomEvent('pl:explain', { detail: { cmd } }));
  // Varaq ko'rinsin: tushuntirish boshlanganda oyna yopiladi (kartochkadagi tugma bilan qaytsa bo'ladi)
  if (cmd === 'start' || cmd === 'answer') closePanel();
}

export function toggleAssistant(fab) {
  if (panel) { closePanel(); return; }
  openPanel(fab);
}

function closePanel() {
  if (!panel) return;
  panel.el.remove();
  document.body.classList.remove('ai-full-open');
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
  const ibtn = (icon, label, cls = '') => h('button', { type: 'button', class: 'ai-ibtn ' + cls, 'aria-label': label, title: label, html: ic(icon) });

  const inner = h('div', { class: 'ai-wrap ai-list' });
  const msgs = h('main', { class: 'ai-msgs', role: 'log', 'aria-live': 'polite' }, inner);
  const chipsRow = h('div', { class: 'ai-sugg' });
  const input = h('textarea', { class: 'ai-input', rows: 1, maxlength: 600, placeholder: T('placeholder'), 'aria-label': T('placeholder') });
  const sendBtn = h('button', { type: 'submit', class: 'ai-send', 'aria-label': T('send'), title: T('send'), html: ic('send') });
  const form = h('form', { class: 'ai-box' }, input, h('div', { class: 'ai-bar' }, h('span', { class: 'ai-hintline' }, T('sub')), sendBtn));
  const fullBtn = ibtn('expand', T('full'));
  const clearBtn = ibtn('trash', T('clear'));
  const keyBtn = ibtn('settings', T('settings'));
  const closeBtn = ibtn('x', T('close'));
  const keyBox = h('div', { class: 'ai-keybox', hidden: true });

  const el = h('section', { class: 'ai-panel', role: 'dialog', 'aria-label': T('name') },
    h('header', { class: 'ai-top' }, h('div', { class: 'ai-wrap ai-top-in' },
      h('span', { class: 'ai-tile gem', html: ic('bot') }),
      h('div', { class: 'ai-title' }, h('strong', null, T('name')), h('span', null, T('tagline'))),
      fullBtn, clearBtn, keyBtn, closeBtn)),
    keyBox, msgs,
    h('footer', { class: 'ai-composer' }, h('div', { class: 'ai-wrap' }, chipsRow, form)));
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('open'));

  // Katta ekran rejimi (tanlov eslab qolinadi)
  const setFull = on => {
    el.classList.toggle('full', on);
    document.body.classList.toggle('ai-full-open', on);
    fullBtn.innerHTML = ic(on ? 'shrink' : 'expand');
    const l = on ? T('small') : T('full');
    fullBtn.setAttribute('aria-label', l); fullBtn.title = l;
    store.set('ai-full', on);
  };
  setFull(!!store.get('ai-full', false));
  fullBtn.addEventListener('click', () => { setFull(!el.classList.contains('full')); msgs.scrollTop = msgs.scrollHeight; });

  const ctx = () => { const c = getPageContext(); return { ...c, route: c.route || 'home' }; };
  const time = ts => ts ? new Date(ts).toLocaleTimeString(lang === 'en' ? 'en-GB' : lang, { hour: '2-digit', minute: '2-digit' }) : '';

  // ---------- Xabarlarni chizish ----------
  function article(m, i) {
    const me = m.who === 'me';
    const tag = me ? '' : m.err ? T('tagErr') : m.cached ? T('fromCache') : m.ai ? 'AI' : m.local ? T('tagLocal') : '';
    const meta = h('div', { class: 'ai-meta' },
      h('span', { class: 'ai-tile sm ' + (me ? 'me' : 'gem'), html: ic(me ? 'user' : 'bot') }),
      h('span', { class: 'ai-who' }, me ? T('me') : T('name')),
      h('span', null, time(m.ts)),
      tag && h('span', { class: 'ai-tag' + (m.err ? ' warn' : '') }, tag));
    const art = h('article', { class: 'ai-msg ' + (me ? 'user' : 'model') + (m.err ? ' err' : '') }, meta);
    if (me) { art.append(h('div', { class: 'ai-body plain' }, m.text)); return art; }

    // [[id]] — generator nomi matnda, tugmasi pastda
    const ids = [...(m.gens || [])];
    const txt = String(m.text).replace(/\[\[([a-z0-9]+)\]\]/g, (s, id) => {
      const g = getGenerator(id);
      if (!g) return '';
      if (!ids.includes(id)) ids.push(id);
      return '«' + P(g.name, lang) + '»';
    });
    art.append(h('div', { class: 'ai-body md', html: mdLite(txt) }));
    if (ids.length) {
      art.append(h('div', { class: 'ai-gens' }, ids.map(id => {
        const g = getGenerator(id);
        return g && h('a', { class: 'ai-gen', href: '#/' + id, onclick: () => { if (el.classList.contains('full')) setFull(false); } },
          h('span', { class: 'ai-gen-cover', html: g.cover }),
          h('span', { class: 'ai-gen-tx' }, h('span', { class: 't' }, P(g.name, lang)), h('span', { class: 's' }, P(g.desc, lang))),
          h('span', { class: 'ai-gen-go', html: ic('arrow') }));
      })));
    }
    if (m.chips) art.append(h('div', { class: 'ai-sugg inline' }, m.chips.map(c => chip(c))));
    // Amallar: nusxa; AI javobi bo'lsa — qayta so'rash
    const copyBtn = h('button', { type: 'button', class: 'ai-ab', 'aria-label': T('copy'), title: T('copy'), html: ic('copy') });
    copyBtn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(txt); copyBtn.innerHTML = ic('check'); setTimeout(() => { copyBtn.innerHTML = ic('copy'); }, 1200); } catch { /* ruxsat yo'q */ }
    });
    const acts = h('div', { class: 'ai-acts' }, copyBtn);
    if ((m.ai || m.err) && i === log.length - 1 && log[i - 1]?.who === 'me') {
      const re = h('button', { type: 'button', class: 'ai-ab txt', html: ic('redo') + `<span>${esc(T('retry'))}</span>` });
      re.addEventListener('click', () => { const q = log[i - 1].text; log.splice(i - 1, 2); saveLog(); ask(q, { fresh: true }); });
      acts.append(re);
    }
    art.append(acts);
    return art;
  }
  function render() {
    inner.innerHTML = '';
    if (!log.length) {
      inner.append(h('div', { class: 'ai-hero' },
        h('span', { class: 'ai-tile big gem', html: ic('bot') }),
        h('h2', null, T('name')),
        h('p', null, T('hello'))));
    }
    log.forEach((m, i) => inner.append(article(m, i)));
    msgs.scrollTop = msgs.scrollHeight;
    chipsRow.innerHTML = '';
    chipsRow.append(...chipsFor(ctx(), lang).map(c => chip(c)));
  }
  function chip(c) {
    return h('button', { type: 'button', class: 'ai-chip', onclick: () => {
      if (c.menu === 'skills') { log.push({ who: 'me', text: c.q, ts: Date.now() }, { who: 'bot', local: true, ts: Date.now(), ...skillsMenu(lang) }); saveLog(); render(); return; }
      ask(c.q);
    } }, h('span', { html: ic('sparkle') }), h('span', null, c.label));
  }

  // ---------- Savol ----------
  let busy = false;
  async function ask(q, { fresh = false } = {}) {
    q = String(q || '').trim();
    if (!q || busy) return;
    const prev = log.slice(-6);
    log.push({ who: 'me', text: q, ts: Date.now() });
    const c = ctx();
    const local = fresh ? null : localAnswer(q, lang, c);
    if (local) { log.push({ who: 'bot', local: true, ts: Date.now(), ...local }); saveLog(); render(); if (local.action) setTimeout(() => runAction(local.action), 450); return; }
    if (!aiAvailable()) { log.push({ who: 'bot', err: true, ts: Date.now(), text: T('noAi') }); saveLog(); render(); return; }

    busy = true; sendBtn.disabled = true;
    render();
    const wait = h('div', { class: 'ai-thinking' }, h('span', { class: 'ai-dots', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')), T('thinking'));
    inner.append(wait); msgs.scrollTop = msgs.scrollHeight;
    // Oldingi xabarlar (tayyor javoblar ham) — «tushunmadim» kabi savollarda AI nimaga javob berilganini ko'radi
    const history = prev.filter(m => !m.err).map(m => ({ role: m.who === 'me' ? 'user' : 'model', text: m.text }));
    try {
      const r = await askAI({ question: q, note: pageNote(lang, c), lang, ctx: c, system: systemPrompt(lang), history, fresh });
      const acts = [...String(r.text || '').matchAll(DO_RE)].map(x => CMD[x[1]]);
      const text = String(r.text || '').replace(DO_RE, '').trim();
      log.push({ who: 'bot', text: text || T('aiErr'), ai: !!text, err: !text, cached: r.cached, ts: Date.now() });
      if (acts.length && !r.cached) setTimeout(() => runAction(acts[acts.length - 1]), 450);
    } catch (e) {
      log.push({ who: 'bot', err: true, ts: Date.now(), text: e.code === 'limit' ? T('aiLimit') : e.code === 'offline' ? T('offline') : e.code === 'no-ai' ? T('noAi') : T('aiErr') });
    } finally {
      busy = false; sendBtn.disabled = false;
      saveLog(); render();
    }
  }
  form.addEventListener('submit', e => { e.preventDefault(); const q = input.value; input.value = ''; autosize(); ask(q); });
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
  const autosize = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 140) + 'px'; };
  input.addEventListener('input', autosize);

  // ---------- Sozlamalar: shaxsiy kalit (ixtiyoriy) ----------
  keyBtn.addEventListener('click', () => {
    if (!keyBox.hidden) { keyBox.hidden = true; return; }
    const inp = h('input', { type: 'password', class: 'ai-key-input', autocomplete: 'off', spellcheck: 'false', placeholder: 'AIza…', 'aria-label': T('keyLabel') });
    inp.value = getKey();
    const save = h('button', { type: 'button', class: 'ai-btn' }, T('keySave'));
    save.addEventListener('click', () => { setKey(inp.value); save.textContent = T('keySaved'); setTimeout(() => { keyBox.hidden = true; }, 700); });
    keyBox.innerHTML = '';
    keyBox.append(h('div', { class: 'ai-wrap' }, h('label', { class: 'ai-label' }, T('keyLabel')), h('div', { class: 'ai-key-row' }, inp, save), h('p', { class: 'ai-help' }, T('keyNote'))));
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
  panel = { el, onKey, onRoute, onLang, fab, ask };
  fab?.setAttribute('aria-expanded', 'true');
  render();
  input.focus({ preventScroll: true });
}
