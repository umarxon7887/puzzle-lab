// files.js — faylni yuklab berish va fayl nomini xavfsiz qilish.

// Windows/macOS/Android'da taqiqlangan belgilarni olib tashlaydi
export function safeFileName(name) {
  const s = String(name).replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim();
  return s.slice(0, 150) || 'file';
}

export function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeFileName(name);
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
