// modal.js — oyna (dialog) va ochiladigan menyu (popover).
// Oyna ochilganda fokus ichkarida qoladi, Esc yoki fon bosilsa yopiladi,
// yopilgach fokus oynani ochgan tugmaga qaytadi.

import { h } from './dom.js';
import { ICONS } from './icons.js';
import { t } from '../core/i18n.js';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const openModals = new Set();

// Sahifa almashganda ochiq oynalarni to'g'ri yopish (hodisa tinglovchilari ham olib tashlanadi)
export function closeAllModals() { [...openModals].forEach(close => close()); }

export function openModal({ title, body, className = '', onClose }) {
  const opener = document.activeElement;
  const titleId = 'm-' + Math.random().toString(36).slice(2, 8);
  const closeBtn = h('button', { type: 'button', class: 'icon-btn ghost', 'aria-label': t('close'), title: t('close'), html: ICONS.close });
  const box = h('div', { class: 'modal ' + className, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
    h('div', { class: 'modal-head' }, h('h2', { id: titleId }, title), closeBtn),
    h('div', { class: 'modal-body' }, body)
  );
  const overlay = h('div', { class: 'modal-overlay' }, box);
  document.body.appendChild(overlay);
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => overlay.classList.add('open'));

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const items = [...box.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    openModals.delete(close);
    document.removeEventListener('keydown', onKey, true);
    overlay.remove();
    if (!document.querySelector('.modal-overlay')) document.body.classList.remove('no-scroll');
    if (onClose) onClose();
    if (opener && opener.focus && document.contains(opener)) opener.focus();
  }
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', onKey, true);
  openModals.add(close);
  const firstField = box.querySelector('.modal-body ' + FOCUSABLE);
  (firstField || closeBtn).focus({ preventScroll: true });
  return { close, box };
}

// Tugma ustida ochiladigan menyu. items: [{ label, icon, onSelect }]
export function attachMenu(button, getItems, { signal } = {}) {
  let menu = null;
  function close() {
    if (!menu) return;
    menu.remove(); menu = null;
    button.setAttribute('aria-expanded', 'false');
  }
  function open() {
    close();
    const items = getItems();
    menu = h('div', { class: 'menu', role: 'menu' },
      items.map(it => h('button', {
        type: 'button', role: 'menuitem', class: 'menu-item',
        onclick: () => { close(); button.focus(); it.onSelect(); }
      }, h('span', { class: 'mi-icon', html: it.icon || '' }), h('span', null, it.label)))
    );
    button.parentElement.appendChild(menu);
    button.setAttribute('aria-expanded', 'true');
    menu.querySelector('button').focus();
  }
  button.setAttribute('aria-haspopup', 'menu');
  button.setAttribute('aria-expanded', 'false');
  button.addEventListener('click', e => { e.stopPropagation(); menu ? close() : open(); }, { signal });
  document.addEventListener('click', e => { if (menu && !menu.contains(e.target)) close(); }, { signal });
  document.addEventListener('keydown', e => {
    if (!menu) return;
    if (e.key === 'Escape') { close(); button.focus(); }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const list = [...menu.querySelectorAll('button')];
      const i = list.indexOf(document.activeElement);
      list[(i + (e.key === 'ArrowDown' ? 1 : list.length - 1)) % list.length].focus();
    }
  }, { signal });
  return { close };
}
