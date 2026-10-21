// dots.js — «Nuqtalarni tutashtir» (Соедини по точкам) generatori.
// Rasmning tashqi chizig'i raqamlangan nuqtalarga aylantiriladi; ichki detallari chizilgan holda qoladi.
// Bola 1, 2, 3 … tartibida tutashtiradi — rasm chiqadi, so'ng uni bo'yashi mumkin.
// Nuqtalar konturli rasmning tashqi chegarasidan (picture-data.js) Visvalingam usulida tanlanadi:
// shaklning eng muhim burilish nuqtalari qoladi.
// Kafolat (check()): nuqtalar soni darajaga mos, ketma-ket ikki nuqta ustma-ust tushmaydi.

import { makeRng, pickOne } from '../core/rng.js';
import { INK, MUTE, ANSWER, font } from '../core/draw.js';
import { picPolys, picName, picMap, drawPic } from '../core/pictures.js';
import { GRID_KEYS, PIX_SMALL } from '../core/gridpics.js';
import { scaleOf, measureRule, drawRule } from '../core/parts.js';

// Oson darajada — sodda shakllar (12 nuqtada ham tanilib turadi)
const LEVELS = [{ K: 20, keys: PIX_SMALL }, { K: 35, keys: GRID_KEYS }, { K: 55, keys: GRID_KEYS }, { K: 80, keys: GRID_KEYS }];
const RULE = {
  uz: "Nuqtalarni 1 dan boshlab tartib bilan tutashtir, oxirgisini birinchisiga ula. Qanday rasm chiqdi? Uni bo'yab qo'y.",
  ru: 'Соедини точки по порядку, начиная с 1, последнюю — с первой. Что получилось? Раскрась рисунок.',
  en: 'Join the dots in order starting from 1, then join the last one to the first. What is it? Colour it in.'
};

// Nuqtalarni tanlash: zich kontur (R) bo'yicha Visvalingam–Whyatt (shaklning muhim burilishlari qoladi),
// so'ng bir-biriga juda yaqinlari olib tashlanadi va uzun bo'shliqlarga oraliq nuqta qo'shiladi —
// raqamlar bir-birining ustiga chiqmaydi, nuqtalar kontur bo'ylab tekisroq taqsimlanadi.
function pickDots(R, K) {
  const n = R.length;
  const cum = [0];
  for (let i = 1; i <= n; i++) cum.push(cum[i - 1] + Math.hypot(R[i % n][0] - R[i - 1][0], R[i % n][1] - R[i - 1][1]));
  const L = cum[n];
  const gap = (a, b) => (b > a ? cum[b] - cum[a] : L - cum[a] + cum[b]);
  let idx = R.map((_, i) => i);
  const area = (k) => {
    const a = R[idx[(k - 1 + idx.length) % idx.length]], b = R[idx[k]], c = R[idx[(k + 1) % idx.length]];
    return Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
  };
  while (idx.length > K) {
    let best = 0, bv = Infinity;
    for (let k = 0; k < idx.length; k++) { const v = area(k); if (v < bv) { bv = v; best = k; } }
    idx.splice(best, 1);
  }
  const minG = L / (K * 2.2), maxG = L / K * 1.8;
  const minE = Math.max(2.6, Math.min(3.8, 0.75 * L / K));   // to'g'ridan-to'g'ri masofa (raqamlar sig'ishi uchun)
  const near = (a, b) => gap(a, b) < minG || Math.hypot(R[a][0] - R[b][0], R[a][1] - R[b][1]) < minE;
  const thin = () => {                                   // juda yaqinlarini (kontur bo'ylab yoki to'g'ridan-to'g'ri) olib tashlash
    for (let guard = 0; guard < 300; guard++) {
      let k = -1;
      for (let i = 0; i < idx.length; i++) if (near(idx[i], idx[(i + 1) % idx.length])) { k = i; break; }
      if (k < 0 || idx.length <= 6) break;
      const k2 = (k + 1) % idx.length;
      idx.splice(area(k) < area(k2) ? k : k2, 1);
    }
  };
  thin();
  for (let guard = 0; guard < 200; guard++) {           // uzun bo'shliqlarga oraliq nuqta
    let k = -1;
    for (let i = 0; i < idx.length; i++) if (gap(idx[i], idx[(i + 1) % idx.length]) > maxG) { k = i; break; }
    if (k < 0) break;
    const a = idx[k], b = idx[(k + 1) % idx.length], target = (cum[a] + gap(a, b) / 2) % L;
    let m = a;
    while (Math.abs(cum[m % n] - target) > L / n * 1.01 && m < a + n) m++;
    idx.splice(k + 1, 0, m % n);
  }
  thin();
  return idx.map(i => R[i]);
}
// Kontur bo'ylab teng qadamli zich nuqtalar
function resample(poly, step) {
  const out = [];
  for (let i = 0; i < poly.length; i += 2) {
    const j = (i + 2) % poly.length;
    const x0 = poly[i], y0 = poly[i + 1], x1 = poly[j], y1 = poly[j + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let t = 0; t < n; t++) out.push([x0 + (x1 - x0) * t / n, y0 + (y1 - y0) * t / n]);
  }
  return out;
}
const signedArea = p => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; };
// Eng katta tashqi kontur (rasmning tashqi chegarasi)
function mainOuter(key) {
  const P = picPolys(key);
  let best = P.outer[0], ba = 0;
  for (const o of P.outer) { const a = Math.abs(signedArea(resample(o, 50))); if (a > ba) { ba = a; best = o; } }
  return best;
}

export default {
  id: 'dots',
  skills: ['counting', 'motor'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: 'Nuqtalarni tutashtir', ru: 'Соедини по точкам', en: 'Dot to dot' },
  desc: {
    uz: "1, 2, 3 … tartibida nuqtalarni tutashtirib, yashirin rasmni chiqarish",
    ru: 'Соединить точки по порядку 1, 2, 3 … и увидеть рисунок',
    en: 'Join the dots in order 1, 2, 3 … to reveal a picture'
  },
  fileBase: { uz: 'Nuqtalarni tutashtir', ru: 'Соедини по точкам', en: 'Dot to dot' },
  defaultTitle: { uz: 'Nuqtalarni tutashtir!', ru: 'Соедини по точкам!', en: 'Join the dots!' },
  options: [{ key: 'level', type: 'level', default: 1 }],
  levelHint: {
    uz: ['~20 ta nuqta, sodda shakllar', '~35 ta nuqta', '~55 ta nuqta', '~80 ta nuqta'],
    ru: ['~20 точек, простые формы', '~35 точек', '~55 точек', '~80 точек'],
    en: ['~20 dots, simple shapes', '~35 dots', '~55 dots', '~80 dots']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    let K = LEVELS[level].K;
    if (opts.perPage === 4) K = Math.min(K, 30); else if (opts.perPage === 2) K = Math.min(K, 50);
    const rand = makeRng(seed);
    const key = pickOne(rand, LEVELS[level].keys);
    const outer = mainOuter(key);
    let pts = pickDots(resample(outer, 0.8), K);
    if (signedArea(pts) < 0) pts.reverse();                  // soat strelkasi bo'yicha (ekranda)
    // 1-nuqta — eng yuqoridagisi
    let s = 0;
    pts.forEach((q, i) => { if (q[1] < pts[s][1] - 1e-9 || (Math.abs(q[1] - pts[s][1]) < 1e-9 && q[0] < pts[s][0])) s = i; });
    pts = pts.slice(s).concat(pts.slice(0, s)).map(([x, y]) => [+x.toFixed(2), +y.toFixed(2)]);
    return { level, seed, key, pts };
  },

  info(p, lang) {
    return { uz: `${p.pts.length} ta nuqta`, ru: `${p.pts.length} точек`, en: `${p.pts.length} dots` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box);
    const rule = measureRule(ctx, RULE[lang] || RULE.uz, box.w, scale);
    const gap = 4 * scale;
    const size = Math.min(box.w * 0.92, (box.h - rule.h - gap) * 0.92);
    const cx = box.x + box.w / 2, cy = box.y + (box.h - rule.h - gap) / 2;
    const map = picMap(cx, cy, size);
    // Ichki detallar: rasm kulrangda chiziladi, so'ng faqat tashqi chegara bo'ylab oq «o'chirg'ich» o'tkaziladi
    drawPic(ctx, p.key, map, showSolution ? INK : '#4B5563');
    if (!showSolution) {
      ctx.save();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = size * 0.034; ctx.lineJoin = 'round';
      const o = mainOuter(p.key);
      ctx.beginPath();
      for (let i = 0; i < o.length; i += 2) { const [x, y] = map(o[i], o[i + 1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.closePath(); ctx.stroke();
      ctx.restore();
    }
    if (showSolution) {
      ctx.save(); ctx.strokeStyle = ANSWER; ctx.lineWidth = Math.max(0.4, size * 0.005); ctx.lineJoin = 'round';
      ctx.beginPath();
      p.pts.forEach(([u, v], i) => { const [x, y] = map(u, v); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.closePath(); ctx.stroke(); ctx.restore();
    }
    // Nuqtalar va raqamlar (raqam — rasm markazidan tashqariga qarab)
    const [mx, my] = map(50, 50);
    const n = p.pts.length;
    const fs = Math.max(1.9, Math.min(4.2, size / (n > 65 ? 58 : n > 45 ? 50 : 42)));
    const dot = Math.max(0.45, fs * 0.17);
    // Raqam joyi: avval rasm markazidan tashqariga, u band bo'lsa — yon tomonlarga buriladi
    const placed = [];                                     // band to'rtburchaklar: raqamlar va nuqtalar
    const XY = p.pts.map(([u, v]) => map(u, v));
    XY.forEach(([x, y]) => placed.push([x - dot * 1.5, y - dot * 1.5, x + dot * 1.5, y + dot * 1.5]));
    const hit = r => placed.some(q => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]);
    XY.forEach(([x, y], i) => {
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(x, y, i === 0 ? dot * 1.7 : dot, 0, Math.PI * 2); ctx.fill();
      font(ctx, fs, i === 0 ? 900 : 700);
      const tw = ctx.measureText(String(i + 1)).width, th = fs * 0.8;
      const base = Math.atan2(y - my, x - mx);
      let best = null;
      for (const da of [0, 0.7, -0.7, 1.4, -1.4, 2.2, -2.2, Math.PI]) {
        const a = base + da, r = fs * 0.55 + Math.max(tw, th) * 0.5;
        const lx = x + Math.cos(a) * r, ly = y + Math.sin(a) * r;
        const rect = [lx - tw / 2, ly - th / 2, lx + tw / 2, ly + th / 2];
        if (!best) best = { lx, ly, rect };
        if (!hit(rect)) { best = { lx, ly, rect }; break; }
      }
      placed.push(best.rect);
      ctx.fillStyle = i === 0 ? ANSWER : MUTE; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), best.lx, best.ly + fs * 0.04);
    });
    if (showSolution) {
      font(ctx, Math.max(2.8, 9 * 0.3528 * scale * 1.3), 800);
      ctx.fillStyle = ANSWER; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(picName(p.key, lang), box.x, box.y);
    }
    drawRule(ctx, rule, box.x + box.w / 2, cy + size / 2 + gap);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const T = { uz: `Rasm: ${picName(p.key, 'uz')}`, ru: `Рисунок: ${picName(p.key, 'ru')}`, en: `Picture: ${picName(p.key, 'en')}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    if (p.pts.length < 8) problems.push('too few dots');
    p.pts.forEach(([x, y], i) => {
      const [a, b] = p.pts[(i + 1) % p.pts.length];
      if (Math.hypot(a - x, b - y) < 1.2) problems.push(`dots ${i + 1} and ${i + 2} too close`);
      if (x < 0 || x > 100 || y < 0 || y > 100) problems.push('dot outside the picture frame');
    });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-dots" aria-hidden="true"><defs><linearGradient id="cg-dots" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6d365"/><stop offset="1" stop-color="#fd7043"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-dots)"/><rect x="26" y="26" width="148" height="148" rx="16" fill="#fff"/><path class="dt-path" pathLength="100" d="M100 44 L118 82 L158 86 L128 112 L138 152 L100 132 L62 152 L72 112 L42 86 L82 82 Z" fill="none" stroke="#DC2626" stroke-width="4" stroke-linejoin="round"/><g fill="#1f2937"><circle cx="100" cy="44" r="5"/><circle cx="118" cy="82" r="4"/><circle cx="158" cy="86" r="4"/><circle cx="128" cy="112" r="4"/><circle cx="138" cy="152" r="4"/><circle cx="100" cy="132" r="4"/><circle cx="62" cy="152" r="4"/><circle cx="72" cy="112" r="4"/><circle cx="42" cy="86" r="4"/><circle cx="82" cy="82" r="4"/></g><g font-family="Nunito, sans-serif" font-weight="900" font-size="13" fill="#6b7280" text-anchor="middle"><text x="100" y="36" fill="#DC2626">1</text><text x="128" y="78">2</text><text x="168" y="84">3</text><text x="140" y="118">4</text><text x="150" y="166">5</text></g></svg>`
};
