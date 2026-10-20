// sheet.js — A4 varaqni yig'uvchi (barcha generatorlar uchun umumiy).
// Varaqda 1, 2 yoki 4 ta topshiriq bo'lishi mumkin. Har bir joy (slot) uchun: ism qatori,
// sarlavha (raqam bilan), generatorning o'zi chizadigan maydon va pastki yozuv.
// Generator faqat o'ziga berilgan to'rtburchak (box, mm) ichida chizadi.

import { INK, MUTE, ANSWER, PT, font, wrapLines, roundRect } from './draw.js';

export const PAGE_W = 210, PAGE_H = 297, MARGIN = 12;
const FOOT_GAP = 7;                                   // pastki yozuv uchun joy, mm

// Sahifadagi joylar (n = 1, 2 yoki 4)
export function slotRects(n, area, gap = 10) {
  if (n === 2) {
    const h = (area.h - gap) / 2;
    return [{ x: area.x, y: area.y, w: area.w, h }, { x: area.x, y: area.y + h + gap, w: area.w, h }];
  }
  if (n === 4) {
    const w = (area.w - gap) / 2, h = (area.h - gap) / 2;
    return [[0, 0], [1, 0], [0, 1], [1, 1]].map(([i, j]) => ({ x: area.x + i * (w + gap), y: area.y + j * (h + gap), w, h }));
  }
  return [{ ...area }];
}
// Joy shakli: 2 tadan bo'lsa joylar yotiq — labirint ham yotiq quriladi
export const slotAspect = n => (n === 2 ? 'landscape' : 'portrait');
export const PER_PAGE = [1, 2, 4];

const NAME = { uz: ['Ism:', 'Sana:'], ru: ['Имя:', 'Дата:'], en: ['Name:', 'Date:'] };
const ANSWER_MARK = { uz: 'JAVOB', ru: 'ОТВЕТ', en: 'ANSWER' };

function drawNameLine(ctx, x, y, w, lang, scale) {
  const [n, d] = NAME[lang] || NAME.uz;
  const fs = 10.5 * PT * scale;
  font(ctx, fs, 600);
  ctx.fillStyle = MUTE; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const base = y + fs * 1.1;
  const dW = Math.min(45, w * 0.3);
  ctx.fillText(n, x, base);
  const nW = ctx.measureText(n).width + 1.5;
  ctx.fillText(d, x + w - dW, base);
  const dLabel = ctx.measureText(d).width + 1.5;
  ctx.strokeStyle = '#9CA3AF'; ctx.lineWidth = 0.25;
  ctx.beginPath();
  ctx.moveTo(x + nW, base + 0.6); ctx.lineTo(x + w - dW - 6, base + 0.6);
  ctx.moveTo(x + w - dW + dLabel, base + 0.6); ctx.lineTo(x + w, base + 0.6);
  ctx.stroke();
  return fs * 1.1 + 4 * scale;
}

function drawMark(ctx, text, right, top, scale) {
  const fs = 8 * PT * scale;
  font(ctx, fs, 800);
  const w = ctx.measureText(text).width + 4 * scale, h = fs + 2.4 * scale;
  roundRect(ctx, right - w, top, w, h, h / 2);
  ctx.fillStyle = ANSWER; ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, right - w / 2, top + h / 2 + fs * 0.05);
}

// slot = { gen, puzzle, title, fontPt, number, footer }
function drawSlot(ctx, slot, rect, o) {
  const { lang, showSolution, nameLine, single } = o;
  const scale = single ? 1 : Math.max(0.72, Math.min(1, rect.w / 186 + 0.12));
  let y = rect.y;
  if (showSolution) drawMark(ctx, ANSWER_MARK[lang] || ANSWER_MARK.uz, rect.x + rect.w, rect.y - (single ? 6.5 : 0), scale);
  if (nameLine) y += drawNameLine(ctx, rect.x, y, rect.w - (showSolution && !single ? 18 : 0), lang, scale);

  // Sarlavha (raqam bilan): "3. Sudokuni yech!"
  const title = String(slot.title || '').trim();
  const num = slot.number ? String(slot.number) : '';
  if (title || num) {
    const pt = single ? (slot.fontPt || 24) : Math.min(slot.fontPt || 24, 18) * scale;
    const fs = pt * PT;
    font(ctx, fs, 800);
    const prefix = num ? num + '. ' : '';
    const lines = wrapLines(ctx, prefix + title, rect.w - (showSolution && !single && !nameLine ? 18 : 0));
    ctx.fillStyle = INK; ctx.textBaseline = 'top';
    ctx.textAlign = single && !num ? 'center' : 'left';
    const tx = single && !num ? rect.x + rect.w / 2 : rect.x;
    lines.forEach((ln, i) => ctx.fillText(ln, tx, y + i * fs * 1.22));
    y += lines.length * fs * 1.22 + (single ? 5 : 3);
  }

  // Joyning pastki yozuvi (bir varaqda bir nechta bo'lsa)
  let bottom = rect.y + rect.h;
  if (!single && slot.footer) {
    const fs = 6.5 * PT;
    font(ctx, fs, 400);
    ctx.fillStyle = '#9CA3AF'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(slot.footer, rect.x + rect.w, bottom);
    bottom -= fs + 1.5;
  }
  const box = { x: rect.x, y: y + 1, w: rect.w, h: Math.max(10, bottom - y - 1) };
  return slot.gen.draw(ctx, slot.puzzle, box, { showSolution, lang });
}

// Bir varaqni chizadi. k — 1 mm necha piksel. Natija: har bir joy uchun generator qaytargan ma'lumot.
// page = { slots: [...], layout: 1|2|4, lang, showSolution, nameLine, footer, pageLabel }
// layout — varaqdagi joylar soni (oxirgi varaqda topshiriq kamroq bo'lsa ham joylar o'lchami o'zgarmaydi)
export function drawPage(ctx, k, page) {
  // Butun canvas'ni oq rangga bo'yaymiz (piksellarda) — chetdagi yarim piksel ham toza bo'lsin
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#fff';
  if (ctx.canvas) ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  const M = MARGIN, n = page.layout || page.slots.length, single = n === 1;
  const footBase = PAGE_H - M + 3;

  font(ctx, 8 * PT, 400);
  ctx.fillStyle = '#9CA3AF'; ctx.textBaseline = 'alphabetic';
  const footer = single ? page.slots[0].footer : page.footer;
  if (footer) { ctx.textAlign = 'right'; ctx.fillText(footer, PAGE_W - M, footBase); }
  if (page.pageLabel) { ctx.textAlign = 'left'; ctx.fillText(page.pageLabel, M, footBase); }

  const area = { x: M, y: M + (single && page.showSolution ? 4 : 0), w: PAGE_W - 2 * M, h: footBase - FOOT_GAP - M - (single && page.showSolution ? 4 : 0) };
  const rects = slotRects(n, area);

  // Qirqish chiziqlari (bir varaqda bir nechta topshiriq bo'lsa)
  if (!single && page.slots.length > 1) {
    ctx.save();
    ctx.strokeStyle = '#CBD5E1'; ctx.lineWidth = 0.3; ctx.setLineDash([2, 1.6]);
    ctx.beginPath();
    const midY = rects[0].y + rects[0].h + (rects[n === 2 ? 1 : 2].y - rects[0].y - rects[0].h) / 2;
    if (page.slots.length > (n === 4 ? 2 : 1)) { ctx.moveTo(M - 4, midY); ctx.lineTo(PAGE_W - M + 4, midY); }
    if (n === 4) {
      const midX = rects[0].x + rects[0].w + (rects[1].x - rects[0].x - rects[0].w) / 2;
      const endY = page.slots.length > 3 ? footBase - FOOT_GAP + 2 : midY - 2;
      ctx.moveTo(midX, M - 4); ctx.lineTo(midX, endY);
    }
    ctx.stroke();
    ctx.restore();
  }

  return page.slots.map((slot, i) => {
    ctx.save();
    const info = drawSlot(ctx, slot, rects[i], { ...page, single });
    ctx.restore();
    return info || {};
  });
}
