// gridpics.js — konturli rasmlardan (picture-data.js) katakli qog'oz uchun rasmlar yasash.
// «Simmetrik chiz», «Nusxa ko'chir», «Grafik diktant», «Yapon krossvordi», «Raqam bo'yicha bo'ya»,
// «Koordinatalar bo'yicha chiz» generatorlari shu yerdan foydalanadi.
//
//  • pixelate(key, N)   — rasm siluetini N katakli (uzun tomoni bo'yicha) to'rga aylantiradi: 1 — bo'yalgan katak;
//  • inkGrid(key, N)    — rasm chiziqlari tushgan kataklar (rangli rasm uchun: kontur va detallar);
//  • cleanBits(...)     — eng katta bo'lak qoladi, ichki teshiklar to'ldiriladi, «burchak bilan tegish» tuzatiladi;
//  • outline(bits)      — bo'yalgan sohaning chegarasi: katak burchaklaridan o'tadigan yopiq ko'pburchak
//                         (soat strelkasi bo'yicha, faqat gorizontal/vertikal tomonlar);
//  • diagonalize(poly)  — 1×1 zinapoyalarni 45° qiyshiq chiziqqa almashtiradi (katakli daftardagi rasm kabi).
// Hammasi deterministik (bir xil kirish → bir xil natija), shuning uchun topshiriq va javob doim mos.

import { picPolys, mirrorDiff } from './pictures.js';

function insideAny(polys, x, y) {
  for (const p of polys) {
    let c = false;
    for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
      const xi = p[i], yi = p[i + 1], xj = p[j], yj = p[j + 1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    if (c) return true;
  }
  return false;
}
function insideEvenOdd(polys, x, y) {
  let c = false;
  for (const p of polys) {
    for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
      const xi = p[i], yi = p[i + 1], xj = p[j], yj = p[j + 1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
  }
  return c;
}

// To'r o'lchami: rasmning uzun tomoni N katak; qisqa tomoni nisbatga qarab
function frame(key, N) {
  const [x0, y0, x1, y1] = picPolys(key).box;
  const w = x1 - x0, h = y1 - y0, side = Math.max(w, h);
  const cols = Math.max(2, Math.round(N * w / side)), rows = Math.max(2, Math.round(N * h / side));
  return { x0, y0, cw: w / cols, ch: h / rows, cols, rows };
}

const cache = new Map();
// Siluet: katakning ≥ thr qismi rasm ichida bo'lsa — bo'yalgan. Natija: { w, h, bits: [[0|1…]…] }
export function pixelate(key, N, thr = 0.5) {
  const ck = 'p|' + key + '|' + N + '|' + thr;
  if (cache.has(ck)) return cache.get(ck);
  const P = picPolys(key), F = frame(key, N), S = 5;
  const bits = [];
  for (let r = 0; r < F.rows; r++) {
    const row = [];
    for (let c = 0; c < F.cols; c++) {
      let n = 0;
      for (let a = 0; a < S; a++) for (let b = 0; b < S; b++) {
        if (insideAny(P.outer, F.x0 + (c + (a + 0.5) / S) * F.cw, F.y0 + (r + (b + 0.5) / S) * F.ch)) n++;
      }
      row.push(n / (S * S) >= thr ? 1 : 0);
    }
    bits.push(row);
  }
  const res = { w: F.cols, h: F.rows, bits };
  cache.set(ck, res);
  return res;
}
// Chiziqlar tushgan kataklar (siyoh ulushi ≥ thr)
export function inkGrid(key, N, thr = 0.18) {
  const ck = 'i|' + key + '|' + N + '|' + thr;
  if (cache.has(ck)) return cache.get(ck);
  const P = picPolys(key), F = frame(key, N), S = 6;
  const bits = [], cov = [];
  for (let r = 0; r < F.rows; r++) {
    const row = [], crow = [];
    for (let c = 0; c < F.cols; c++) {
      let n = 0;
      for (let a = 0; a < S; a++) for (let b = 0; b < S; b++) {
        if (insideEvenOdd(P.all, F.x0 + (c + (a + 0.5) / S) * F.cw, F.y0 + (r + (b + 0.5) / S) * F.ch)) n++;
      }
      row.push(n / (S * S) >= thr ? 1 : 0);
      crow.push(n / (S * S));
    }
    bits.push(row); cov.push(crow);
  }
  const res = { w: F.cols, h: F.rows, bits, cov };
  cache.set(ck, res);
  return res;
}

export const cloneBits = bits => bits.map(r => r.slice());
export const countBits = bits => bits.reduce((s, r) => s + r.reduce((a, b) => a + b, 0), 0);

// Eng katta 4-bog'langan bo'lak qoladi, ichki teshiklar to'ldiriladi, faqat burchak bilan tegib turgan
// kataklar orasiga katak qo'shiladi (chegara bitta uzluksiz chiziq bo'lishi uchun).
export function cleanBits(bits0) {
  const h = bits0.length, w = bits0[0].length;
  let bits = cloneBits(bits0);
  // eng katta bo'lak
  const comp = bits.map(r => r.map(() => -1));
  let best = -1, bestN = 0, id = 0;
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    if (!bits[r][c] || comp[r][c] >= 0) continue;
    let n = 0; const st = [[r, c]]; comp[r][c] = id;
    while (st.length) {
      const [y, x] = st.pop(); n++;
      for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const yy = y + dy, xx = x + dx;
        if (yy >= 0 && yy < h && xx >= 0 && xx < w && bits[yy][xx] && comp[yy][xx] < 0) { comp[yy][xx] = id; st.push([yy, xx]); }
      }
    }
    if (n > bestN) { bestN = n; best = id; }
    id++;
  }
  bits = bits.map((row, r) => row.map((v, c) => (v && comp[r][c] === best ? 1 : 0)));
  for (let pass = 0; pass < 4; pass++) {
    // teshiklarni to'ldirish: chetdan yetib bo'lmaydigan bo'sh kataklar
    const out = bits.map(r => r.map(() => 0));
    const st = [];
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) if ((r === 0 || c === 0 || r === h - 1 || c === w - 1) && !bits[r][c]) { out[r][c] = 1; st.push([r, c]); }
    while (st.length) {
      const [y, x] = st.pop();
      for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const yy = y + dy, xx = x + dx;
        if (yy >= 0 && yy < h && xx >= 0 && xx < w && !bits[yy][xx] && !out[yy][xx]) { out[yy][xx] = 1; st.push([yy, xx]); }
      }
    }
    bits = bits.map((row, r) => row.map((v, c) => (v || !out[r][c] ? 1 : 0)));
    // burchak bilan tegish: 2×2 oynada diagonal juftlik
    let changed = false;
    for (let r = 0; r + 1 < h; r++) for (let c = 0; c + 1 < w; c++) {
      const a = bits[r][c], b = bits[r][c + 1], d = bits[r + 1][c], e = bits[r + 1][c + 1];
      if (a && e && !b && !d) { bits[r][c + 1] = 1; changed = true; }
      else if (b && d && !a && !e) { bits[r][c] = 1; changed = true; }
    }
    if (!changed) break;
  }
  return bits;
}

// Chap yarmini ko'zgu bilan o'ngga ko'chirish (simmetrik rasm). Eni juft bo'lishi kerak.
export function mirrorLeft(bits) {
  const w = bits[0].length;
  return bits.map(row => row.map((v, c) => (c < w / 2 ? v : row[w - 1 - c])));
}

// Bo'yalgan soha chegarasi: [[x, y]…] (katak burchaklari, x — ustun, y — qator), soat strelkasi bo'yicha,
// faqat burilish nuqtalari. Bitta bo'lak va teshiksiz soha uchun (cleanBits'dan keyin).
export function outline(bits) {
  const h = bits.length, w = bits[0].length;
  const at = (r, c) => (r >= 0 && r < h && c >= 0 && c < w ? bits[r][c] : 0);
  const next = new Map();
  const key = (x, y) => x + ',' + y;
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    if (!bits[r][c]) continue;
    if (!at(r - 1, c)) next.set(key(c, r), [c + 1, r]);
    if (!at(r, c + 1)) next.set(key(c + 1, r), [c + 1, r + 1]);
    if (!at(r + 1, c)) next.set(key(c + 1, r + 1), [c, r + 1]);
    if (!at(r, c - 1)) next.set(key(c, r + 1), [c, r]);
  }
  if (!next.size) return [];
  // eng yuqori-chap nuqtadan boshlaymiz
  let start = null;
  for (const k of next.keys()) { const [x, y] = k.split(',').map(Number); if (!start || y < start[1] || (y === start[1] && x < start[0])) start = [x, y]; }
  const pts = [start];
  let cur = next.get(key(...start));
  for (let guard = 0; guard < 100000 && !(cur[0] === start[0] && cur[1] === start[1]); guard++) { pts.push(cur); cur = next.get(key(...cur)); if (!cur) return []; }
  return simplify(pts);
}

// Bir chiziqda yotgan oraliq nuqtalarni olib tashlash
export function simplify(pts) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n];
    const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (cross !== 0) out.push(b);
  }
  return out;
}

// 1×1 zinapoyalarni 45° chiziqqa almashtirish. Yopiq ko'pburchak → yangi yopiq ko'pburchak.
export function diagonalize(poly) {
  const n = poly.length;
  if (n < 4) return poly.slice();
  // birlik qadamlar ro'yxati
  const steps = [];
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    const dx = Math.sign(b[0] - a[0]), dy = Math.sign(b[1] - a[1]), len = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
    steps.push({ dx, dy, len });
  }
  // aylanishni uzun bo'lakdan boshlaymiz (zinapoya chegarada bo'linib qolmasin)
  let s0 = 0;
  steps.forEach((s, i) => { if (s.len > steps[s0].len) s0 = i; });
  const runs = steps.slice(s0).concat(steps.slice(0, s0));
  const segs = [];                                  // { dx, dy, len } — dx,dy ∈ {-1,0,1}
  for (let i = 0; i < runs.length; i++) {
    const a = runs[i], b = runs[i + 1];
    if (a.len === 1 && b && b.len === 1 && a.dx * b.dx + a.dy * b.dy === 0) {
      segs.push({ dx: a.dx + b.dx, dy: a.dy + b.dy, len: 1 });
      i++;
    } else segs.push({ dx: a.dx, dy: a.dy, len: a.len });
  }
  // bir yo'nalishdagi qo'shni bo'laklarni birlashtirish
  const merged = [];
  for (const s of segs) {
    const last = merged[merged.length - 1];
    if (last && last.dx === s.dx && last.dy === s.dy) last.len += s.len;
    else merged.push({ ...s });
  }
  const start = poly[s0];
  const out = [start.slice()];
  let x = start[0], y = start[1];
  for (const s of merged) { x += s.dx * s.len; y += s.dy * s.len; out.push([x, y]); }
  out.pop();                                        // oxirgi nuqta — boshlanish nuqtasining o'zi
  return simplify(out);
}

// Ko'pburchak o'zini kesmaydimi (qo'shni bo'lmagan tomonlar kesishmasligi va tegmasligi)
export function isSimple(poly) {
  const n = poly.length;
  const seg = (i) => [poly[i], poly[(i + 1) % n]];
  const orient = (a, b, c) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  const onSeg = (a, b, p) => Math.min(a[0], b[0]) <= p[0] && p[0] <= Math.max(a[0], b[0]) && Math.min(a[1], b[1]) <= p[1] && p[1] <= Math.max(a[1], b[1]);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    if (j === i || (j + 1) % n === i || (i + 1) % n === j) continue;
    const [a, b] = seg(i), [c, d] = seg(j);
    const o1 = orient(a, b, c), o2 = orient(a, b, d), o3 = orient(c, d, a), o4 = orient(c, d, b);
    if (o1 !== o2 && o3 !== o4) return false;
    if (o1 === 0 && onSeg(a, b, c)) return false;
    if (o2 === 0 && onSeg(a, b, d)) return false;
    if (o3 === 0 && onSeg(c, d, a)) return false;
    if (o4 === 0 && onSeg(c, d, b)) return false;
  }
  return true;
}

// Rasmdan katakli chizma: { w, h, poly } — poly: yopiq ko'pburchak (katak burchaklarida), diag — 45° chiziqlar ruxsat
export function gridPicture(key, N, { diag = true, symmetric = false, thr = 0.5 } = {}) {
  let { bits } = pixelate(key, N, thr);
  if (symmetric) {
    if (bits[0].length % 2) bits = bits.map(r => [...r, 0]);       // juft eni (o'q kataklar orasidan o'tadi)
    bits = mirrorLeft(bits);
  }
  bits = cleanBits(bits);
  if (symmetric) bits = mirrorLeft(bits);
  let poly = outline(bits);
  if (diag) { const d = diagonalize(poly); if (d.length >= 3 && isSimple(d)) poly = d; }
  return { w: bits[0].length, h: bits.length, bits, poly };
}

// Katakli to'rda (12–16 katak) ham tanib olinadigan rasmlar (siluetlari ko'z bilan tekshirib tanlangan)
export const GRID_KEYS = [
  'apple', 'pear', 'fish', 'cat', 'teapot', 'key', 'umbrella', 'mushroom', 'banana', 'carrot', 'lemon', 'dog', 'rabbit',
  'hen', 'duck', 'horse', 'cow', 'bird', 'turtle', 'snail', 'butterfly', 'spoon', 'fork', 'bottle', 'glasses', 'scissors',
  'pencil', 'lamp', 'bell', 'broom', 'balloon', 'boat', 'airplane', 'house', 'tree', 'star', 'leaf', 'kettle', 'hat', 'sock',
  'chair', 'table', 'frying_pan', 'watering_can', 'hammer', 'wrench', 'ladder', 'tshirt', 'dress', 'trousers', 'mitten',
  'boot', 'glove', 'truck', 'train', 'rocket', 'ship', 'scooter', 'hot_air_balloon', 'whale', 'dolphin', 'octopus', 'crab',
  'starfish', 'seahorse', 'dragonfly', 'elephant', 'giraffe', 'bear', 'fox', 'camel', 'owl', 'squirrel', 'penguin', 'apricot',
  'ice_cream', 'candy', 'lollipop', 'pizza', 'cupcake', 'cloud', 'snowflake', 'rainbow', 'lightning', 'mountains', 'cactus',
  'tulip', 'acorn', 'fir_tree', 'palm', 'teddy_bear', 'guitar', 'trumpet', 'robot', 'spinning_top', 'gift', 'moon', 'bow_tie',
  'jug', 'cap', 'globe'
];

// Chap-o'ng simmetrik rasmlar (ko'zgu aksi asliga deyarli teng)
export const SYM_KEYS = GRID_KEYS.filter(k => mirrorDiff(k) < 2.5);

// Ko'pburchak tomonlarini vertikal chiziq (x = ax) bilan kesishgan joyida bo'lish
export function splitAtX(poly, ax) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    out.push(a);
    if ((a[0] - ax) * (b[0] - ax) < 0) {
      const t = (ax - a[0]) / (b[0] - a[0]);
      out.push([ax, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}
// Ko'pburchakning x ≤ ax tomonidagi bo'laklari (kesmalar ro'yxati [[x1,y1,x2,y2]…])
export function leftSegments(poly, ax) {
  const p = splitAtX(poly, ax), segs = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    if (a[0] <= ax + 1e-9 && b[0] <= ax + 1e-9 && !(a[0] === ax && b[0] === ax)) segs.push([a[0], a[1], b[0], b[1]]);
  }
  return segs;
}

// Chiziqlarni kataklarga o'tkazishda ostona: kichik to'rda chiziq katakning kichik qismini egallaydi,
// shuning uchun ostona pastroq (aks holda chiziq uzilib qoladi)
export const inkThr = N => Math.max(0.06, Math.min(0.2, 0.07 + (N - 10) * 0.01));

// Rasm chiziqlaridan katakli rasm (piksel-art): { w, h, bits }. symmetric — chap yarmi ko'zgu bilan o'ngga.
export function pixelArt(key, N, { symmetric = false } = {}) {
  const g = inkGrid(key, N, inkThr(N));
  let bits = cloneBits(g.bits);
  // Faqat burchagi bilan tegib turgan chiziq kataklari orasiga katak qo'shamiz (chiziq uzilmasin):
  // qo'shni ikki katakdan siyohi ko'prog'i bo'yaladi
  const h = bits.length, w = bits[0].length;
  for (let r = 0; r + 1 < h; r++) for (let c = 0; c + 1 < w; c++) {
    const a = bits[r][c], b = bits[r][c + 1], d = bits[r + 1][c], e = bits[r + 1][c + 1];
    if (a && e && !b && !d) { if (g.cov[r][c + 1] >= g.cov[r + 1][c]) bits[r][c + 1] = 1; else bits[r + 1][c] = 1; }
    else if (b && d && !a && !e) { if (g.cov[r][c] >= g.cov[r + 1][c + 1]) bits[r][c] = 1; else bits[r + 1][c + 1] = 1; }
  }
  if (symmetric) {
    if (bits[0].length % 2) bits = bits.map(r => [...r, 0]);
    bits = mirrorLeft(bits);
  }
  // bo'sh chekka qator/ustunlarni olib tashlash (simmetriya buzilmasligi uchun ustunlar juft-juft)
  while (bits.length > 2 && bits[0].every(v => !v)) bits.shift();
  while (bits.length > 2 && bits[bits.length - 1].every(v => !v)) bits.pop();
  while (bits[0].length > 2 && bits.every(r => !r[0]) && bits.every(r => !r[r.length - 1])) bits = bits.map(r => r.slice(1, -1));
  if (!symmetric) {
    while (bits[0].length > 2 && bits.every(r => !r[0])) bits = bits.map(r => r.slice(1));
    while (bits[0].length > 2 && bits.every(r => !r[r.length - 1])) bits = bits.map(r => r.slice(0, -1));
  }
  return { w: bits[0].length, h: bits.length, bits };
}

// Katakli rasm (pixelArt) sifatida yaxshi tanilib turadiganlar: kichik to'rda (10–12) va kattada (14+)
export const PIX_SMALL = ['apple', 'fish', 'umbrella', 'mushroom', 'star', 'house', 'boat', 'balloon', 'lamp', 'sock', 'boot',
  'cloud', 'moon', 'lightning', 'bow_tie', 'cupcake', 'ice_cream', 'fir_tree', 'glasses', 'bottle', 'tshirt', 'dress', 'trousers',
  'ladder', 'mitten', 'truck', 'rainbow', 'hat', 'pear', 'lemon', 'leaf', 'bell', 'key'];
export const PIX_BIG = GRID_KEYS.filter(k => !['globe', 'snowflake'].includes(k));
// Kontur (tashqi chegara) chizig'i sifatida tanilib turadiganlar
export const LINE_SMALL = ['house', 'star', 'fir_tree', 'mushroom', 'apple', 'sock', 'boot', 'boat', 'moon', 'lightning', 'truck', 'fish', 'key', 'cactus', 'table', 'chair'];
export const LINE_BIG = [...LINE_SMALL, 'horse', 'giraffe', 'camel', 'elephant', 'duck', 'dolphin', 'whale', 'hen', 'bird', 'turtle',
  'snail', 'fox', 'teapot', 'rocket', 'airplane', 'pear', 'banana', 'carrot', 'wrench', 'train', 'scooter', 'seahorse', 'palm',
  'tulip', 'guitar', 'cat', 'rabbit', 'ship'];

// Rangli katakli rasm («Raqam bo'yicha bo'ya» uchun): har katak — 0 fon, 1 chiziq, 2+ rasm ichidagi soha
// (chiziqlar bilan ajralgan bo'laklar; eng kattasi — 2). Natija: { w, h, cells, regions: [kataklar soni…] }
// Ichki/tashqi qism siluet bo'yicha aniqlanadi (chiziqda uzilish bo'lsa ham fon rasm ichiga «oqib» kirmaydi).
export function colorArt(key, N) {
  const g = inkGrid(key, N, inkThr(N));
  const sil = pixelate(key, N, 0.5).bits;
  const h = g.bits.length, w = g.bits[0].length;
  const ink = cloneBits(g.bits);
  for (let r = 0; r + 1 < h; r++) for (let c = 0; c + 1 < w; c++) {
    const a = ink[r][c], b = ink[r][c + 1], d = ink[r + 1][c], e = ink[r + 1][c + 1];
    if (a && e && !b && !d) { if (g.cov[r][c + 1] >= g.cov[r + 1][c]) ink[r][c + 1] = 1; else ink[r + 1][c] = 1; }
    else if (b && d && !a && !e) { if (g.cov[r][c] >= g.cov[r + 1][c + 1]) ink[r][c] = 1; else ink[r + 1][c + 1] = 1; }
  }
  // -1 — rasm ichidagi (hali raqamlanmagan) katak
  const cells = ink.map((row, r) => row.map((v, c) => (v ? 1 : sil[r][c] ? -1 : 0)));
  const sizes = [];
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    if (cells[r][c] !== -1) continue;
    const id = sizes.length, list = [[r, c]];
    cells[r][c] = -2 - id;
    let n = 0;
    while (list.length) {
      const [y, x] = list.pop(); n++;
      for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const yy = y + dy, xx = x + dx;
        if (yy >= 0 && yy < h && xx >= 0 && xx < w && cells[yy][xx] === -1) { cells[yy][xx] = -2 - id; list.push([yy, xx]); }
      }
    }
    sizes.push(n);
  }
  // Sohalar kattaligi bo'yicha: 2 — eng katta, 3 — keyingisi …
  const order = sizes.map((_, i) => i).sort((a, b) => sizes[b] - sizes[a] || a - b);
  const rank = new Map(order.map((id, k) => [id, k]));
  let out = cells.map(row => row.map(v => (v <= -2 ? 2 + rank.get(-2 - v) : v)));
  // Bo'sh chekkalarni kesib, atrofiga 1 katak fon qo'shamiz
  let r0 = 0, r1 = h - 1, c0 = 0, c1 = w - 1;
  while (r0 < r1 && out[r0].every(v => v === 0)) r0++;
  while (r1 > r0 && out[r1].every(v => v === 0)) r1--;
  while (c0 < c1 && out.every(row => row[c0] === 0)) c0++;
  while (c1 > c0 && out.every(row => row[c1] === 0)) c1--;
  out = out.slice(r0, r1 + 1).map(row => [0, ...row.slice(c0, c1 + 1), 0]);
  const blank = out[0].map(() => 0);
  out = [blank, ...out, blank.slice()];
  return { w: out[0].length, h: out.length, cells: out, regions: order.map(id => sizes[id]) };
}

// To'liq bo'yalgan siluet, ichidagi chiziqlar (detallar) oq bo'lib qoladi — katta to'rda ham aniq tanilib turadi
// («Yapon krossvordi» uchun: katta bo'yalgan sohalar jumboqni taxminsiz yechishga yordam beradi)
export function detailSilhouette(key, N) {
  const sil = cleanBits(pixelate(key, N, 0.5).bits);
  const ink = inkGrid(key, N, Math.min(0.35, inkThr(N) * 1.4)).bits;
  const h = sil.length, w = sil[0].length;
  const inside = (r, c) => r >= 0 && r < h && c >= 0 && c < w && sil[r][c];
  let bits = sil.map((row, r) => row.map((v, c) => (v && ink[r][c] && inside(r - 1, c) && inside(r + 1, c) && inside(r, c - 1) && inside(r, c + 1) ? 0 : v)));
  while (bits.length > 2 && bits[0].every(v => !v)) bits.shift();
  while (bits.length > 2 && bits[bits.length - 1].every(v => !v)) bits.pop();
  while (bits[0].length > 2 && bits.every(r => !r[0])) bits = bits.map(r => r.slice(1));
  while (bits[0].length > 2 && bits.every(r => !r[r.length - 1])) bits = bits.map(r => r.slice(0, -1));
  return { w: bits[0].length, h: bits.length, bits };
}
