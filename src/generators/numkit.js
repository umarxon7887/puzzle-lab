// numkit.js — «4–7-sinf: sonli mantiq» generatorlari uchun umumiy qismlar (v2.8):
// bir qatorli ifodani bo'laklab o'lchash va chizish (sonlar, amallar, bo'sh kataklar, belgi-shakllar).
// Belgi-shakllar (★, ◆ …) shrift belgisi emas, figures.js shakli sifatida chiziladi: har qanday printerda bir xil chiqadi.

import { INK, ANSWER, font, roundRect } from '../core/draw.js';
import { drawFigure } from '../core/figures.js';

export const MUL = '×', DIV = '÷', MINUS = '−';
export const opText = op => (op === '*' ? MUL : op === '/' ? DIV : op === '-' ? MINUS : op);
export const numText = v => String(v).replace('-', MINUS);

// Tokenlar: { t: 'n', v } son yoki matn; { t: 'op', v } amal; { t: 'box', v, w } bo'sh katak (v — javob);
// { t: 'sym', shape } belgi-shakl; { t: 'gap', w } bo'sh joy (fs ulushida); { t: 'arrow', label } strelka → (ustida harf);
// { t: 'sbox', shape } bo'sh katak, javobda ichida shakl; { t: 'poly', n, v } n burchakli shakl, ichida son;
// { t: 'nest', shapes, v } ichma-ich shakllar (tashqidan ichkiga), eng ichkisida son
// ichma-ich shakllar (tashqidan ichkiga): eng ichkisining radiusi 0.95·fs; har tashqisi ichidagisi sig'adigan
// darajada katta (CIRC — shaklning tashqi, INR — ichki chizilgan aylana radiusi, figures.js birligida)
const CIRC = { circle: 0.92, square: 1.13, hexagon: 0.94, diamond: 0.98, triangle: 0.95 };
const INR = { circle: 0.92, square: 0.8, hexagon: 0.81, diamond: 0.61, triangle: 0.45 };
export function nestRadii(shapes) {
  const r = new Array(shapes.length);
  r[shapes.length - 1] = 0.95;
  for (let i = shapes.length - 2; i >= 0; i--) r[i] = r[i + 1] * CIRC[shapes[i + 1]] / (0.86 * INR[shapes[i]]);
  return r;
}
export const nestOuter = shapes => nestRadii(shapes)[0] * Math.max(...shapes.map(sh => CIRC[sh] || 1));
function tokenW(ctx, tk, fs) {
  if (tk.t === 'box') return fs * (tk.w || 1.35) + fs * 0.2;
  if (tk.t === 'sym') return fs * 1.3;
  if (tk.t === 'gap') return fs * (tk.w || 0.3);
  if (tk.t === 'arrow') return fs * (tk.label ? 1.9 : 1.5);
  if (tk.t === 'sbox') return fs * 1.45;
  if (tk.t === 'poly') return fs * 2.3;
  if (tk.t === 'nest') return fs * (0.45 + 2 * nestOuter(tk.shapes));
  font(ctx, fs, tk.t === 'op' ? 700 : 800);
  return ctx.measureText(tk.t === 'op' ? opText(tk.v) : numText(tk.v)).width + (tk.t === 'op' ? fs * 0.6 : fs * 0.3);
}
export function measureTokens(ctx, tokens, fs) { return tokens.reduce((s, tk) => s + tokenW(ctx, tk, fs), 0); }

export function drawTokens(ctx, tokens, x, cy, fs, { show = false, color = INK, scale = 1 } = {}) {
  ctx.save();
  let cx = x;
  for (const tk of tokens) {
    const w = tokenW(ctx, tk, fs);
    if (tk.t === 'box') {
      const h = fs * 1.25;
      roundRect(ctx, cx + fs * 0.16, cy - h / 2, w - fs * 0.32, h, h * 0.16);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.25, 0.32 * scale); ctx.stroke();
      if (show && tk.v !== undefined && tk.v !== null) {
        const txt = tk.op ? opText(tk.v) : numText(tk.v);
        let f2 = fs * 0.95;
        font(ctx, f2, 800);
        const tw = ctx.measureText(txt).width;
        if (tw > w * 0.86) { f2 *= w * 0.86 / tw; font(ctx, f2, 800); }
        ctx.fillStyle = ANSWER; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(txt, cx + w / 2, cy + fs * 0.04);
      }
    } else if (tk.t === 'sym') {
      drawFigure(ctx, { shape: tk.shape, fill: 'solid', lw: Math.max(0.2, fs * 0.05) }, cx + w / 2, cy, fs * 1.45);
    } else if (tk.t === 'arrow') {
      const x1 = cx + fs * 0.2, x2 = cx + w - fs * 0.2, hd = fs * 0.28;
      ctx.strokeStyle = tk.color || color; ctx.lineWidth = Math.max(0.25, fs * 0.09); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(x1, cy); ctx.lineTo(x2, cy); ctx.moveTo(x2 - hd, cy - hd); ctx.lineTo(x2, cy); ctx.lineTo(x2 - hd, cy + hd); ctx.stroke();
      if (tk.label) { font(ctx, fs * 0.7, 900); ctx.fillStyle = '#4338CA'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(tk.label, (x1 + x2) / 2, cy - fs * 0.12); }
    } else if (tk.t === 'sbox') {
      const h = fs * 1.25;
      roundRect(ctx, cx + fs * 0.1, cy - h / 2, w - fs * 0.2, h, h * 0.16);
      ctx.fillStyle = show ? '#FEF2F2' : '#fff'; ctx.fill();
      ctx.strokeStyle = show ? ANSWER : INK; ctx.lineWidth = Math.max(0.25, 0.32 * scale); ctx.stroke();
      if (show) drawFigure(ctx, { shape: tk.shape, fill: 'solid', lw: Math.max(0.2, fs * 0.05) }, cx + w / 2, cy, fs * 1.3);
    } else if (tk.t === 'nest') {
      const px = cx + w / 2, rs = nestRadii(tk.shapes);
      tk.shapes.forEach((sh, i) => drawFigure(ctx, { shape: sh, fill: 'empty', lw: Math.max(0.25, fs * 0.07) }, px, cy, rs[i] * fs / 0.38));
      const inner = tk.shapes[tk.shapes.length - 1], room = 1.5 * INR[inner] * rs[rs.length - 1] * fs;
      let f2 = fs * 0.66; font(ctx, f2, 800);
      const tw = ctx.measureText(String(tk.v)).width; if (tw > room) { f2 *= room / tw; font(ctx, f2, 800); }
      ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(tk.v), px, cy + f2 * 0.05);
    } else if (tk.t === 'poly') {
      const R = fs * 1.05, px = cx + w / 2;
      ctx.beginPath();
      const a0 = -Math.PI / 2 + (tk.n % 2 === 0 ? Math.PI / tk.n : 0);       // juft tomonlida tekis asos (kvadrat — to'g'ri)
      for (let i = 0; i < tk.n; i++) { const a = a0 + i * 2 * Math.PI / tk.n; const X = px + Math.cos(a) * R, Y = cy + Math.sin(a) * R + (tk.n === 3 ? R * 0.18 : 0); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }
      ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.3, fs * 0.08); ctx.stroke();
      font(ctx, fs * (tk.n === 3 ? 0.62 : 0.72), 800); ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(tk.v), px, cy + fs * (tk.n === 3 ? 0.32 : 0.05));
    } else if (tk.t !== 'gap') {
      font(ctx, fs, tk.t === 'op' ? 700 : 800);
      ctx.fillStyle = tk.color || color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(tk.t === 'op' ? opText(tk.v) : numText(tk.v), cx + w / 2, cy + fs * 0.04);
    }
    cx += w;
  }
  ctx.restore();
  return cx - x;
}

// Amallar tartibi bilan hisoblash: avval × ÷ (chapdan o'ngga), keyin + −. Bo'linish qoldiqsiz bo'lmasa — NaN
export function evalOps(nums, ops) {
  const terms = [nums[0]], signs = [];
  for (let i = 0; i < ops.length; i++) {
    const o = ops[i], v = nums[i + 1];
    if (o === '*') terms[terms.length - 1] *= v;
    else if (o === '/') { const a = terms[terms.length - 1]; if (v === 0 || a % v !== 0) return NaN; terms[terms.length - 1] = a / v; }
    else { signs.push(o); terms.push(v); }
  }
  return terms.reduce((s, t, i) => (i === 0 ? t : signs[i - 1] === '+' ? s + t : s - t), 0);
}
