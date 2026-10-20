// storage.js — brauzer xotirasi (localStorage) bilan xavfsiz ishlash.
// Yashirin rejim yoki to'lgan xotirada localStorage xato beradi — sayt baribir ishlashi kerak.

const PREFIX = 'pl2:';

export const store = {
  get(key, fallback = null) {
    try {
      const v = globalThis.localStorage && localStorage.getItem(PREFIX + key);
      return v == null ? fallback : JSON.parse(v);
    } catch { return fallback; }
  },
  set(key, value) {
    try { if (globalThis.localStorage) localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* xotira to'la yoki yopiq */ }
  },
  remove(key) {
    try { if (globalThis.localStorage) localStorage.removeItem(PREFIX + key); } catch { /* e'tibor bermaymiz */ }
  }
};
