export function makePdf(jpeg, imgW, imgH) {
  const enc = new TextEncoder();
  const parts = [], offsets = [];
  let len = 0;
  const push = d => { const b = typeof d === 'string' ? enc.encode(d) : d; parts.push(b); len += b.length; };
  const PW = 595.28, PH = 841.89; // A4 o'lchami (pt)
  const content = `q ${PW} 0 0 ${PH} 0 0 cm /Im0 Do Q`;

  push('%PDF-1.4\n');
  offsets[1] = len; push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  offsets[2] = len; push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  offsets[3] = len; push(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`);
  offsets[4] = len;
  push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
  push(jpeg); push('\nendstream\nendobj\n');
  offsets[5] = len; push(`5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);

  const xref = len;
  let x = 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i++) x += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  push(x + `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);

  return new Blob(parts, { type: 'application/pdf' });
}

// PDF nomiga timestamp qo'shish uchun yordamchi funksiya
function addTimestampToFileName(fileName) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return `${fileName}_${timestamp}`;
  return `${fileName.slice(0, lastDot)}_${timestamp}${fileName.slice(lastDot)}`;
}

export function downloadPdf(blob, name) {
  // Fayl nomiga avtomatik timestamp qo'shish
  const nameWithTimestamp = addTimestampToFileName(name);
  
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nameWithTimestamp;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
