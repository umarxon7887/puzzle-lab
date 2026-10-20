// dom.js — elementlar yaratish uchun kichik yordamchilar.
//   h('button', { class: 'btn', onclick: fn, 'aria-label': '...' }, 'Matn', boshqaElement)
// Matnlar har doim textContent orqali qo'yiladi (innerHTML emas) — xavfsiz.
// Faqat ishonchli SVG ikonkalar uchun { html: '<svg…>' } ishlatiladi.

export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, String(v));
    }
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export const nextFrame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));

// Pastda qisqa xabar (masalan, "PDF tayyor")
let toastTimer = 0;
export function toast(text, { busy = false, ms = 2600 } = {}) {
  let el = document.getElementById('toast');
  if (!el) {
    el = h('div', { id: 'toast', class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(el);
  }
  el.textContent = '';
  if (busy) el.appendChild(h('span', { class: 'spinner', 'aria-hidden': 'true' }));
  el.appendChild(document.createTextNode(text));
  el.classList.add('show');
  clearTimeout(toastTimer);
  if (!busy) toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}
export function hideToast() {
  const el = document.getElementById('toast');
  if (el) el.classList.remove('show');
}
