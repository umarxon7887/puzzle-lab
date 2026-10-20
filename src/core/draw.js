// draw.js — canvas'da chizish uchun umumiy yordamchilar.
// Muhim: varaq chizilganda kontekst millimetrga moslanadi (ctx.setTransform(k,0,0,k,0,0)),
// ya'ni barcha o'lchamlar MILLIMETRDA yoziladi: 10 = 10 mm, shrift 3.5 = 3.5 mm baland.
// Shu tufayli bir xil kod ekrandagi preview'ni ham, 300 dpi'li PDF'ni ham chizadi.

export const FONT = '"Nunito","Trebuchet MS","DejaVu Sans",Arial,sans-serif';
export const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
export const PT = 0.3528;            // 1 pt (tipografik punkt) = 0.3528 mm

export const INK = '#111827';        // asosiy matn va chiziqlar
export const MUTE = '#6B7280';       // ikkinchi darajali matn
export const LINE = '#D1D5DB';       // ingichka chiziqlar
export const ANSWER = '#DC2626';     // javoblar rangi (qizil)
export const ANSWER_BG = '#FDECEC';  // javob katakchasi foni

// Shrift o'rnatish: size — millimetrda.
export function font(ctx, size, weight = 400, family = FONT) {
  ctx.font = `${weight} ${size}px ${family}`;
}

// Matnni berilgan kenglikka sig'adigan qatorlarga bo'ladi (so'z bo'yicha).
export function wrapLines(ctx, text, maxW) {
  if (!text || !String(text).trim()) return [];
  const out = [];
  String(text).split('\n').forEach(par => {
    if (!par.trim()) { out.push(''); return; }
    let line = '';
    par.trim().split(/\s+/).forEach(word => {
      const t = line ? line + ' ' + word : word;
      if (!line || ctx.measureText(t).width <= maxW) line = t;
      else { out.push(line); line = word; }
    });
    out.push(line);
  });
  return out;
}

export function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Katak markaziga matn (son yoki harf) yozish.
export function centerText(ctx, text, cx, cy, size, weight = 700, color = INK) {
  font(ctx, size, weight);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(text), cx, cy + size * 0.04);
}

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
