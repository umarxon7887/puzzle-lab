// preview.js — A4 varaqni ekranda ko'rsatadigan canvas.
// Canvas o'lchami ekran kengligiga va piksel zichligiga (retina) moslanadi,
// oyna o'lchami o'zgarsa yoki shriftlar yuklansa, qayta chiziladi.

import { h } from './dom.js';

// draw(ctx, k) — varaqni chizadi (k: 1 mm necha piksel)
export function createPreview(draw, { maxPx = 1500, label = '' } = {}) {
  const canvas = h('canvas', { class: 'sheet-canvas', role: 'img', 'aria-label': label });
  let raf = 0, lastW = 0;

  function paint() {
    raf = 0;
    const cssW = canvas.clientWidth;
    if (!cssW) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = Math.min(maxPx, Math.round(cssW * dpr));
    const hgt = Math.round(w * 297 / 210);
    if (canvas.width !== w || canvas.height !== hgt) { canvas.width = w; canvas.height = hgt; }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    draw(ctx, w / 210);
    lastW = cssW;
  }
  const request = () => { if (!raf) raf = requestAnimationFrame(paint); };

  const ro = new ResizeObserver(() => { if (canvas.clientWidth !== lastW) request(); });
  ro.observe(canvas);
  const onFonts = () => request();
  window.addEventListener('fontsready', onFonts);

  return {
    canvas,
    redraw: request,
    redrawNow: paint,
    destroy() { ro.disconnect(); window.removeEventListener('fontsready', onFonts); if (raf) cancelAnimationFrame(raf); }
  };
}
