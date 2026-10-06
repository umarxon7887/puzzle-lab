import { GENERATORS, getGenerator } from './generators/registry.js';
import { t, setLanguage, getLang } from './core/i18n.js';

// 1. Sarlavhani o'rnatish
document.title = t('title');

// 2. Til almashtirish tugmalarini yaratish
const langSwitch = document.getElementById('lang-switch');
['uz', 'ru', 'en'].forEach(lang => {
  const btn = document.createElement('button');
  btn.textContent = lang.toUpperCase();
  btn.style.marginLeft = '8px';
  btn.style.padding = '4px 8px';
  btn.style.fontSize = '12px';
  if (lang === getLang()) {
    btn.classList.add('primary');
  }
  btn.addEventListener('click', () => setLanguage(lang));
  langSwitch.appendChild(btn);
});

// 3. Navigatsiyani yaratish
const nav = document.getElementById('main-nav');
GENERATORS.forEach(gen => {
  const a = document.createElement('a');
  a.href = `#${gen.id}`;
  a.textContent = t(gen.nameKey);
  a.addEventListener('click', (e) => {
    e.preventDefault();
    loadGenerator(gen.id);
  });
  nav.appendChild(a);
});

// 4. Generatorni yuklash funksiyasi
function loadGenerator(id) {
  const gen = getGenerator(id);
  if (!gen) return;

  window.history.pushState({}, '', `#${id}`);
  
  // Aktiv tabni belgilash
  document.querySelectorAll('#main-nav a').forEach(a => a.classList.remove('active'));
  const activeLink = document.querySelector(`#main-nav a[href="#${id}"]`);
  if (activeLink) activeLink.classList.add('active');

  // Konteynerni tozalash va yangi generatorni ishga tushirish
  const container = document.getElementById('app-container');
  container.innerHTML = ''; // Tozalash
  
  gen.init(container);
}

// 5. Dastlabki yuklash
const initialId = window.location.hash.replace('#', '') || 'code';
loadGenerator(initialId);

// Orqaga tugmasi ishlashi uchun
window.addEventListener('popstate', () => {
  const id = window.location.hash.replace('#', '') || 'code';
  loadGenerator(id);
});
