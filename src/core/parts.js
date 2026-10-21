// parts.js — generatorlar chizishida takrorlanadigan kichik qismlar: qoida matni, javob aylanasi,
// katak, "?" katagi, ruscha ko'plik shakllari.

import { INK, MUTE, LINE, ANSWER, PT, font, wrapLines, roundRect } from './draw.js';
import { TAU } from './figures.js';

// Ruscha: 1 предмет, 2 предмета, 5 предметов
export const ruPlural = (n, one, few, many) => {
  const a = n % 10, b = n % 100;
  return a === 1 && b !== 11 ? one : (a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many);
};

// Joy kengligiga qarab o'lcham koeffitsiyenti (to'liq varaq = 1)
export const scaleOf = box => Math.max(0.6, Math.min(1, box.w / 186));

// Pastdagi qoida matni: avval o'lchab olinadi (balandligi kerak), keyin chiziladi
export function measureRule(ctx, text, w, scale) {
  const fs = 10.5 * PT * scale, lh = fs * 1.35;
  font(ctx, fs, 400);
  const lines = wrapLines(ctx, text, w);
  return { fs, lh, lines, h: lines.length * lh };
}
export function drawRule(ctx, rule, cx, y) {
  font(ctx, rule.fs, 400);
  ctx.fillStyle = MUTE; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  rule.lines.forEach((ln, i) => ctx.fillText(ln, cx, y + i * rule.lh));
}

// Javob aylanasi (qizil)
export function ring(ctx, cx, cy, r, scale = 1) {
  ctx.save();
  ctx.strokeStyle = ANSWER; ctx.lineWidth = Math.max(0.5, 0.75 * scale);
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
  ctx.restore();
}

// Oddiy katak (yumaloq burchakli, och kulrang chegara)
export function cellBox(ctx, x, y, w, h, scale = 1, { fill = '#fff', stroke = LINE, r } = {}) {
  roundRect(ctx, x, y, w, h, r ?? Math.min(w, h) * 0.14);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(0.2, 0.3 * scale); ctx.stroke();
}

// "?" katagi: uzuq chiziqli chegara va so'roq belgisi
export function questionCell(ctx, x, y, s, scale = 1, color = MUTE) {
  ctx.save();
  roundRect(ctx, x, y, s, s, s * 0.14);
  ctx.fillStyle = '#fff'; ctx.fill();
  ctx.setLineDash([s * 0.06, s * 0.05]);
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(0.3, 0.4 * scale); ctx.stroke();
  ctx.setLineDash([]);
  font(ctx, s * 0.5, 800);
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('?', x + s / 2, y + s / 2 + s * 0.03);
  ctx.restore();
}

// Javob uchun bo'sh katak (son yoziladi); value berilsa — qizil bilan yoziladi
export function answerBox(ctx, x, y, w, h, scale, value) {
  roundRect(ctx, x, y, w, h, Math.min(w, h) * 0.18);
  ctx.fillStyle = '#fff'; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.25, 0.35 * scale); ctx.stroke();
  if (value !== undefined && value !== null) {
    font(ctx, h * 0.62, 800);
    ctx.fillStyle = ANSWER; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(value), x + w / 2, y + h / 2 + h * 0.04);
  }
}

// Ikki nuqta orasidagi chiziq (javoblarda tutashtirish uchun)
export function line(ctx, x1, y1, x2, y2, color, width) {
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.restore();
}
export function dot(ctx, x, y, r, color = INK) {
  ctx.save(); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
}

// Javob varag'idagi turli rangli belgilar uchun ranglar
export const COLORS = ['#2563EB', '#DC2626', '#16A34A', '#9333EA', '#EA580C', '#0891B2', '#DB2777', '#65A30D', '#CA8A04', '#4F46E5'];

// Maydonga (eni A, bo'yi 1) n ta doirani bir-birini bosmaydigan qilib tasodifiy joylashtirish.
// Qaytaradi: { r, pts: [{x, y}] } — r: doira radiusi. Joy yetmasa, radius asta-sekin kichrayadi.
export function scatter(n, A, rand, density = 0.42, gapK = 1.1) {
  let r = Math.sqrt(density * A / (n * Math.PI));
  for (let shrink = 0; shrink < 40; shrink++, r *= 0.96) {
    const pts = [], minD = 2 * r * gapK;
    for (let t = 0; t < n * 400 && pts.length < n; t++) {
      const x = r + rand() * (A - 2 * r), y = r + rand() * (1 - 2 * r);
      if (pts.every(p => (p.x - x) ** 2 + (p.y - y) ** 2 >= minD * minD)) pts.push({ x: +x.toFixed(4), y: +y.toFixed(4) });
    }
    if (pts.length === n) return { r: +r.toFixed(4), pts };
  }
  throw new Error('scatter: no room');
}

// Qizil ellips (javob uchun, cho'zinchoq kartochkalar atrofida) — siniq chiziq bilan chiziladi
export function ringEllipse(ctx, cx, cy, rx, ry, scale = 1) {
  ctx.save();
  ctx.strokeStyle = '#DC2626'; ctx.lineWidth = Math.max(0.5, 0.75 * scale);
  ctx.beginPath();
  for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2, x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
  ctx.closePath(); ctx.stroke();
  ctx.restore();
}

// «Vaqt: ____ soniya» qatori (diqqat mashqlari uchun). cx — markaz, y — matn asosi (baseline).
// fields — qo'shimcha qatorlar: [{ label, unit }] (masalan «Topildi: ___ ta»)
const TIME_TXT = { uz: ['Vaqt:', 'soniya'], ru: ['Время:', 'сек'], en: ['Time:', 'seconds'] };
export function timeLine(ctx, cx, y, scale, lang, fields = []) {
  const items = [TIME_TXT[lang] || TIME_TXT.uz, ...fields.map(f => [f.label, f.unit || ''])];
  font(ctx, 11 * PT * scale * 1.15, 700);
  ctx.save();
  ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const lineW = 24 * scale, sep = 10 * scale;
  const widths = items.map(([a, b]) => ctx.measureText(a).width + 2 + lineW + (b ? 2 + ctx.measureText(b).width : 0));
  let x = cx - (widths.reduce((s, w) => s + w, 0) + sep * (items.length - 1)) / 2;
  ctx.strokeStyle = '#9CA3AF'; ctx.lineWidth = 0.3;
  items.forEach(([a, b], i) => {
    const wa = ctx.measureText(a).width;
    ctx.fillText(a, x, y);
    ctx.beginPath(); ctx.moveTo(x + wa + 2, y + 0.6); ctx.lineTo(x + wa + 2 + lineW, y + 0.6); ctx.stroke();
    if (b) ctx.fillText(b, x + wa + 2 + lineW + 2, y);
    x += widths[i] + sep;
  });
  ctx.restore();
}

// Katakli qog'oz (yoki nuqtali to'r): x, y — chap yuqori burchak, cols×rows katak, cs — katak o'lchami (mm)
export function drawGrid(ctx, x, y, cols, rows, cs, scale = 1, { dots = false, color = '#C7CDD6', border = true } = {}) {
  ctx.save();
  if (dots) {
    ctx.fillStyle = '#9CA3AF';
    const r = Math.max(0.28, Math.min(0.55, cs * 0.06));
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) { ctx.beginPath(); ctx.arc(x + i * cs, y + j * cs, r, 0, Math.PI * 2); ctx.fill(); }
  } else {
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(0.15, 0.22 * scale);
    ctx.beginPath();
    for (let i = 0; i <= cols; i++) { ctx.moveTo(x + i * cs, y); ctx.lineTo(x + i * cs, y + rows * cs); }
    for (let j = 0; j <= rows; j++) { ctx.moveTo(x, y + j * cs); ctx.lineTo(x + cols * cs, y + j * cs); }
    ctx.stroke();
    if (border) { ctx.strokeStyle = '#9CA3AF'; ctx.lineWidth = Math.max(0.25, 0.35 * scale); ctx.strokeRect(x, y, cols * cs, rows * cs); }
  }
  ctx.restore();
}
