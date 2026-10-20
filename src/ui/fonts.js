// fonts.js — Nunito shriftini yuklashni kutish.
// Canvas'da chizishdan oldin shrift yuklangan bo'lishi kerak, aks holda matn boshqa shriftda
// chiqadi. Internet bo'lmasa — zaxira shrift bilan davom etamiz (2.5 soniyadan keyin).

let ready = null;

export function loadFonts() {
  if (ready) return ready;
  if (typeof document === 'undefined' || !document.fonts || !document.fonts.load) return (ready = Promise.resolve());
  const sample = 'AaBbOʻ‘ БбЁё 0123';
  const all = Promise.all([400, 600, 700, 800].map(w => document.fonts.load(`${w} 16px Nunito`, sample))).catch(() => {});
  ready = Promise.race([all, new Promise(r => setTimeout(r, 2500))]).then(() => {
    window.dispatchEvent(new Event('fontsready'));
  });
  // Shrift keyinroq yuklansa ham (sekin internet), varaqlar qayta chiziladi
  document.fonts.addEventListener?.('loadingdone', () => window.dispatchEvent(new Event('fontsready')));
  return ready;
}
