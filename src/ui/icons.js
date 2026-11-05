// icons.js — chiziqli SVG ikonkalar (rangi CSS'dagi currentColor'dan olinadi).
const svg = body => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;

// Yordamchi belgisi (pastki tugma va oynadagi plitkalar). Almashtirish uchun faqat shu qatorni o'zgartiring.
export const ASSISTANT_ICON = '<rect x="4.5" y="8" width="15" height="11" rx="3.5"/><path d="M12 4.6V8"/><circle cx="12" cy="3.6" r="1.1" fill="currentColor"/><circle cx="9.2" cy="12.8" r="1.25" fill="currentColor" stroke="none"/><circle cx="14.8" cy="12.8" r="1.25" fill="currentColor" stroke="none"/><path d="M10 16h4M2.5 12.5v2.6M21.5 12.5v2.6"/>';

export const ICONS = {
  refresh: svg('<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/>'),
  download: svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="m9 15 3 3 3-3"/>'),
  eye: svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  eyeOff: svg('<path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.5 0-10-7-10-7a18.4 18.4 0 0 1 5.06-5.94"/><path d="M9.9 5.24A9.1 9.1 0 0 1 12 5c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="m2 2 20 20"/>'),
  settings: svg('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'),
  back: svg('<path d="m15 18-6-6 6-6"/>'),
  next: svg('<path d="m9 18 6-6-6-6"/>'),
  arrow: svg('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>'),
  check: svg('<path d="M20 6 9 17l-5-5"/>'),
  close: svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
  dice: svg('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>'),
  plus: svg('<path d="M12 5v14"/><path d="M5 12h14"/>'),
  minus: svg('<path d="M5 12h14"/>'),
  trash: svg('<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'),
  expand: svg('<path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="m21 3-7 7"/><path d="m3 21 7-7"/>'),
  file: svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>'),
  answer: svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="m9 15 2 2 4-4"/>'),
  files: svg('<path d="M15 2H9a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7z"/><path d="M15 2v5h5"/><path d="M4 7v13a2 2 0 0 0 2 2h9"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: svg('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'),
  monitor: svg('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'),
  cart: svg('<path d="M3 4h2l2.4 11.2a1.8 1.8 0 0 0 1.8 1.4h8.3a1.8 1.8 0 0 0 1.7-1.3L21 8H6.2"/><circle cx="9.5" cy="20" r="1.4"/><circle cx="17.5" cy="20" r="1.4"/>'),
  star: svg('<path d="M12 3.2l2.7 5.5 6 .9-4.35 4.25 1.03 6-5.38-2.83-5.38 2.83 1.03-6L3.3 9.6l6-.9z"/>'),
  cartPlus: svg('<path d="M3 4h2l2.4 11.2a1.8 1.8 0 0 0 1.8 1.4h8.3a1.8 1.8 0 0 0 1.7-1.3L21 8H6.2"/><circle cx="9.5" cy="20" r="1.4"/><circle cx="17.5" cy="20" r="1.4"/><path d="M13.5 9.5v4"/><path d="M11.5 11.5h4"/>')
};

export const PACK_COVER = `<svg viewBox="0 0 200 200" class="cover-pack" aria-hidden="true"><defs><linearGradient id="cg-pack" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366F1"/><stop offset="1" stop-color="#22C1C3"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-pack)"/><g class="pk-sheet pk-s3"><rect x="62" y="40" width="92" height="120" rx="8" fill="#fff" opacity=".55" transform="rotate(10 108 100)"/></g><g class="pk-sheet pk-s2"><rect x="54" y="42" width="92" height="120" rx="8" fill="#fff" opacity=".8" transform="rotate(3 100 102)"/></g><g class="pk-sheet pk-s1"><rect x="46" y="44" width="92" height="120" rx="8" fill="#fff"/><rect x="58" y="58" width="68" height="8" rx="4" fill="#C7D2FE"/><path d="M60 80h28v28H60z M68 80v28 M76 80v28 M60 88h28 M60 96h28" stroke="#6366F1" stroke-width="2" fill="none"/><path d="M96 82h28M96 92h22M96 102h26" stroke="#A5B4FC" stroke-width="4" stroke-linecap="round"/><rect x="58" y="118" width="68" height="30" rx="6" fill="#EEF2FF"/><text x="92" y="139" font-family="Nunito,Arial,sans-serif" font-size="18" font-weight="900" fill="#4F46E5" text-anchor="middle">PDF</text></g></svg>`;

export const CART_COVER = `<svg viewBox="0 0 200 200" class="cover-cart" aria-hidden="true"><defs><linearGradient id="cg-cart" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F59E0B"/><stop offset="1" stop-color="#EF4444"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-cart)"/><g class="ct-sheets"><rect x="70" y="34" width="56" height="72" rx="6" fill="#fff" opacity=".7" transform="rotate(-12 98 70)"/><rect x="84" y="30" width="56" height="72" rx="6" fill="#fff" transform="rotate(8 112 66)"/><path d="M96 48h30M96 58h22M96 68h26" stroke="#FCA5A5" stroke-width="5" stroke-linecap="round" transform="rotate(8 112 66)"/></g><path d="M30 70h18l12 66a8 8 0 0 0 8 6h66a8 8 0 0 0 8-6l12-50H56" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><circle cx="78" cy="162" r="9" fill="#fff"/><circle cx="138" cy="162" r="9" fill="#fff"/></svg>`;
