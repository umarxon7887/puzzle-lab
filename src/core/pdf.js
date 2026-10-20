// pdf.js — ko'p sahifali PDF yaratish (hech qanday kutubxonasiz).
// Har bir sahifa — A4 o'lchamdagi JPEG rasm. Natija Blob ko'rinishida qaytadi.

const A4_PT = [595.28, 841.89];                     // A4 o'lchami, pt (1/72 dyuym)

// PDF matn qatori uchun UTF-16BE hex ko'rinish (o'zbek/rus harflari ham to'g'ri chiqadi)
function pdfText(str) {
  let hex = 'FEFF';
  for (const ch of String(str)) {
    const cp = ch.codePointAt(0);
    if (cp > 0xFFFF) {
      const v = cp - 0x10000;
      hex += (0xD800 + (v >> 10)).toString(16).padStart(4, '0') + (0xDC00 + (v & 0x3FF)).toString(16).padStart(4, '0');
    } else hex += cp.toString(16).padStart(4, '0');
  }
  return '<' + hex.toUpperCase() + '>';
}

// pages: [{ jpeg: Uint8Array, w, h }] — w, h: rasm o'lchami (piksel)
export function buildPdf(pages, meta = {}) {
  const enc = new TextEncoder();
  const parts = [], offsets = [];
  let len = 0;
  const push = d => { const b = typeof d === 'string' ? enc.encode(d) : d; parts.push(b); len += b.length; };
  const [PW, PH] = A4_PT;
  const N = pages.length;
  const pageObj = i => 4 + 3 * i;                    // har bir sahifaga 3 ta obyekt: sahifa, rasm, mazmun

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  offsets[1] = len; push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  const kids = pages.map((_, i) => `${pageObj(i)} 0 R`).join(' ');
  offsets[2] = len; push(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${N} >>\nendobj\n`);
  offsets[3] = len;
  push(`3 0 obj\n<< /Title ${pdfText(meta.title || '')} /Creator ${pdfText(meta.creator || 'Topshiriqlar Lab')} /Producer ${pdfText('Topshiriqlar Lab')} >>\nendobj\n`);
  const content = `q ${PW} 0 0 ${PH} 0 0 cm /Im0 Do Q`;
  pages.forEach((p, i) => {
    const po = pageObj(i), io = po + 1, co = po + 2;
    offsets[po] = len;
    push(`${po} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 ${io} 0 R >> >> /Contents ${co} 0 R >>\nendobj\n`);
    offsets[io] = len;
    push(`${io} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`);
    push(p.jpeg);
    push('\nendstream\nendobj\n');
    offsets[co] = len;
    push(`${co} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);
  });
  const size = 4 + 3 * N;
  const xref = len;
  let x = `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (let i = 1; i < size; i++) x += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  push(x + `trailer\n<< /Size ${size} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts, { type: 'application/pdf' });
}

export function canvasToJpeg(canvas, quality = 0.9) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async blob => {
      if (!blob) { reject(new Error('toBlob failed')); return; }
      try { resolve(new Uint8Array(await blob.arrayBuffer())); } catch (e) { reject(e); }
    }, 'image/jpeg', quality);
  });
}

// Sahifalarni ketma-ket chizib PDF yig'adi.
// drawPage(ctx, k, i) — i-sahifani chizadi; onProgress(i, total) — holatni ko'rsatish uchun.
export async function renderPdf(count, drawPage, { dpi = 300, quality = 0.9, title = '', onProgress } = {}) {
  const k = dpi / 25.4;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(210 * k);
  canvas.height = Math.round(297 * k);
  const ctx = canvas.getContext('2d');
  const pages = [];
  for (let i = 0; i < count; i++) {
    if (onProgress) onProgress(i + 1, count);
    await new Promise(r => setTimeout(r, 0));          // ekran yangilanishiga imkon beradi
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawPage(ctx, k, i);
    pages.push({ jpeg: await canvasToJpeg(canvas, quality), w: canvas.width, h: canvas.height });
  }
  canvas.width = canvas.height = 1;                   // xotirani bo'shatish (ayniqsa telefonlarda)
  return buildPdf(pages, { title });
}
