import { GENERATORS, getGenerator } from './generators/registry.js';
import { t, setLanguage, getLang } from './core/i18n.js';

// 1. Sarlavhani o'rnatish
document.title = t('title');

// 2. Header'ni yaratish
const header = document.querySelector('header');
header.innerHTML = `
  <h1>🧩 ${t('title')}</h1>
  <div id="lang-switch"></div>
`;

// 3. Til almashtirish tugmalari
const langSwitch = document.getElementById('lang-switch');
['uz', 'ru', 'en'].forEach(lang => {
  const btn = document.createElement('button');
  btn.textContent = lang.toUpperCase();
  if (lang === getLang()) btn.classList.add('primary');
  btn.addEventListener('click', () => setLanguage(lang));
  langSwitch.appendChild(btn);
});

// 4. Asosiy konteyner
const container = document.getElementById('app-container');

// 5. Asosiy sahifa (Kartochkalar lentasi)
function renderHome() {
  container.innerHTML = `
    <div class="home-header">
      <h2>${t('homeTitle')}</h2>
      <p>${t('homeSubtitle')}</p>
    </div>
    <div class="card-grid" id="cardGrid"></div>
  `;

  const grid = container.querySelector('#cardGrid');
  GENERATORS.forEach(gen => {
    const card = document.createElement('div');
    card.className = 'generator-card';
    card.innerHTML = `
      <div class="card-cover" style="background: ${gen.coverGradient}">
        <span class="card-emoji">${gen.cover}</span>
      </div>
      <div class="card-content">
        <h3>${t(gen.nameKey)}</h3>
        <p>${t(gen.descriptionKey)}</p>
        <span class="card-arrow">→</span>
      </div>
    `;
    card.addEventListener('click', () => {
      window.location.hash = `#/${gen.id}`;
    });
    grid.appendChild(card);
  });
}

// 6. Generator sahifasi
function renderGenerator(id) {
  const gen = getGenerator(id);
  if (!gen) {
    renderHome();
    return;
  }

  container.innerHTML = `
    <button class="back-btn" id="backBtn">${t('backBtn')}</button>
    <div id="generatorContent"></div>
  `;

  container.querySelector('#backBtn').addEventListener('click', () => {
    window.location.hash = '#/';
  });

  const content = container.querySelector('#generatorContent');
  gen.init(content);
}

// 7. Router
function router() {
  const hash = window.location.hash || '#/';
  if (hash === '#/' || hash === '#' || hash === '') {
    renderHome();
  } else if (hash.startsWith('#/')) {
    const id = hash.replace('#/', '');
    renderGenerator(id);
  } else {
    renderHome();
  }
}

// 8. Dastlabki yuklash
router();
window.addEventListener('hashchange', router);
