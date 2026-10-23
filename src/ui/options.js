// options.js — generator sozlamalaridan (gen.options) boshqaruv elementlarini yasaydi.
// Turlari: level (daraja), choice (tanlov: ikonkali yoki kartochka), emoji, text, number.
// advanced: true bo'lganlar "Sozlamalar" oynasida ko'rsatiladi.

import { h } from './dom.js';
import { t, pick, lvl } from '../core/i18n.js';
import { levelsOf } from '../core/levels.js';

let uid = 0;

// opts — joriy qiymatlar (o'zgartiriladi); onChange(key) — o'zgarganda chaqiriladi
export function buildOptions(gen, opts, onChange, { advanced = false } = {}) {
  const root = h('div', { class: 'options' });
  const syncers = [];
  const list = gen.options.filter(op => !!op.advanced === advanced);

  for (const op of list) {
    const id = 'op-' + (++uid);
    const label = op.type === 'level' ? t('level') : pick(op.label);
    const field = h('div', { class: 'field field-' + op.type });
    const labelEl = h('span', { class: 'field-label', id: id + '-l' }, label);

    if (op.type === 'level') {
      const levels = levelsOf(gen);
      const seg = h('div', { class: 'seg seg-' + levels.length, role: 'radiogroup', 'aria-labelledby': id + '-l' });
      const note = gen.levelHint ? h('p', { class: 'field-note' }) : null;
      const btns = levels.map(i => h('button', {
        type: 'button', role: 'radio', class: 'seg-btn lvl-' + (i < 0 ? 've' : i),
        onclick: () => { opts.level = i; for (const o of gen.options) if (o.fromLevel) delete opts[o.key]; onChange('level'); syncAll(); }
      }, lvl(i)));
      btns.forEach(b => seg.appendChild(b));
      const sync = () => {
        btns.forEach((b, j) => { const on = opts.level === levels[j]; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
        if (note) note.textContent = pick(gen.levelHint)[levels.indexOf(opts.level)] || '';
      };
      radioKeys(seg, btns);
      syncers.push(sync);
      field.append(labelEl, seg);
      if (note) field.append(note);
    }

    else if (op.type === 'choice') {
      const icons = op.style === 'icons';
      const grid = h('div', { class: 'choices choices-' + (op.style || 'cards'), role: 'radiogroup', 'aria-labelledby': id + '-l' });
      const btns = op.choices.map(ch => {
        const b = h('button', {
          type: 'button', role: 'radio', class: 'choice', title: icons ? pick(ch.label) : null,
          onclick: () => { opts[op.key] = ch.value; onChange(op.key); syncAll(); }
        },
        ch.icon ? h('span', { class: 'choice-icon', html: ch.icon }) : h('span', { class: 'choice-big' }, pick(ch.big)),
        h('span', { class: icons ? 'sr-only' : 'choice-label' }, pick(ch.label)));
        b.dataset.value = ch.value;
        grid.appendChild(b);
        return b;
      });
      radioKeys(grid, btns);
      // Ikonkali tanlovda nom maydon sarlavhasida ko'rsatiladi: "Labirint shakli: Yulduz"
      const current = icons ? h('span', { class: 'field-current', 'aria-hidden': 'true' }) : null;
      if (current) labelEl.append(': ', current);
      syncers.push(() => btns.forEach((b, i) => {
        const on = String(opts[op.key]) === b.dataset.value;
        b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1;
        if (on && current) current.textContent = pick(op.choices[i].label);
      }));
      field.append(labelEl, grid);
    }

    else if (op.type === 'emoji') {
      const grid = h('div', { class: 'emojis', role: 'radiogroup', 'aria-labelledby': id + '-l' });
      const btns = op.choices.map(em => h('button', {
        type: 'button', role: 'radio', class: 'emoji', 'aria-label': em,
        onclick: () => { opts[op.key] = em; onChange(op.key); syncAll(); }
      }, em));
      btns.forEach(b => grid.appendChild(b));
      radioKeys(grid, btns);
      syncers.push(() => btns.forEach(b => {
        const on = opts[op.key] === b.textContent;
        b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1;
      }));
      field.append(labelEl, grid);
    }

    else if (op.type === 'text') {
      const ta = h('textarea', { id, rows: 3, placeholder: pick(op.placeholder), spellcheck: 'false' });
      ta.value = opts[op.key] ?? '';
      let timer = 0;
      ta.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => { opts[op.key] = ta.value; onChange(op.key); }, 350);
      });
      field.append(h('label', { class: 'field-label', for: id }, label), ta);
      syncers.push(() => { if (document.activeElement !== ta) ta.value = opts[op.key] ?? ''; });
    }

    else if (op.type === 'number') {
      const inp = h('input', { id, type: 'number', inputmode: 'numeric', min: op.min, max: op.max, step: 1 });
      const val = () => opts[op.key] ?? (op.fromLevel ? op.fromLevel(opts.level ?? 1) : op.default);
      inp.addEventListener('change', () => {
        let v = Math.round(+inp.value);
        if (!Number.isFinite(v)) v = val();
        v = Math.max(op.min, Math.min(op.max, v));
        inp.value = v;
        opts[op.key] = v; onChange(op.key);
      });
      field.append(h('label', { class: 'field-label', for: id }, label), inp);
      syncers.push(() => { if (document.activeElement !== inp) inp.value = val(); });
    }

    if (op.when) syncers.push(() => { field.hidden = !op.when(opts); });
    root.appendChild(field);
  }

  function syncAll() { syncers.forEach(f => f()); }
  syncAll();
  return { el: root, sync: syncAll, empty: list.length === 0 };
}

// Radio guruhida o'q tugmalari bilan yurish (klaviatura uchun)
function radioKeys(group, btns) {
  group.addEventListener('keydown', e => {
    const i = btns.indexOf(document.activeElement);
    if (i < 0) return;
    let j = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % btns.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + btns.length) % btns.length;
    if (j < 0) return;
    e.preventDefault();
    btns[j].focus();
    btns[j].click();
  });
}
