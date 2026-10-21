// paintnum.js — «Raqam bo'yicha bo'ya» (Раскраска по номерам) generatori.
// Katakli to'rning har bir katagida raqam; tepadagi kalitda har raqamning rangi. Bola kataklarni
// ko'rsatilgan rangga bo'yaydi — pikselli rasm chiqadi. Rasmlar konturli rasmlardan avtomatik olinadi:
// rasm chiziqlari — qora, ichi — asosiy rang (qiyin darajalarda chiziqlar bilan ajralgan bo'laklar — boshqa ranglar),
// fon — havorang.
// Kafolat (check()): har bir katakda kalitdagi raqamlardan biri; kalitdagi har bir rang rasmda ishlatilgan.

import { makeRng, pickOne } from '../core/rng.js';
import { INK, MUTE, font, roundRect } from '../core/draw.js';
import { colorArt, PIX_BIG } from '../core/gridpics.js';
import { scaleOf, measureRule, drawRule } from '../core/parts.js';
import { picName } from '../core/pictures.js';

const PALETTE = {
  red: { hex: '#EF4444', uz: 'qizil', ru: 'красный', en: 'red' },
  orange: { hex: '#F97316', uz: "to'q sariq", ru: 'оранжевый', en: 'orange' },
  yellow: { hex: '#FACC15', uz: 'sariq', ru: 'жёлтый', en: 'yellow' },
  green: { hex: '#22C55E', uz: 'yashil', ru: 'зелёный', en: 'green' },
  blue: { hex: '#3B82F6', uz: "ko'k", ru: 'синий', en: 'blue' },
  purple: { hex: '#A855F7', uz: 'binafsha', ru: 'фиолетовый', en: 'purple' },
  pink: { hex: '#F472B6', uz: 'pushti', ru: 'розовый', en: 'pink' },
  brown: { hex: '#A16207', uz: 'jigarrang', ru: 'коричневый', en: 'brown' },
  grey: { hex: '#9CA3AF', uz: 'kulrang', ru: 'серый', en: 'grey' },
  black: { hex: '#1F2937', uz: 'qora', ru: 'чёрный', en: 'black' },
  sky: { hex: '#BAE6FD', uz: 'havorang', ru: 'голубой', en: 'light blue' }
};
// Rasmlarning tabiiy asosiy rangi (yo'q bo'lsa — tasodifiy)
const MAIN = {
  apple: 'red', pear: 'yellow', fish: 'orange', cat: 'orange', teapot: 'blue', key: 'yellow', umbrella: 'red', mushroom: 'red',
  banana: 'yellow', carrot: 'orange', lemon: 'yellow', dog: 'brown', rabbit: 'grey', hen: 'orange', duck: 'yellow', horse: 'brown',
  cow: 'pink', bird: 'blue', turtle: 'green', snail: 'orange', butterfly: 'purple', spoon: 'grey', fork: 'grey', bottle: 'green',
  glasses: 'blue', scissors: 'red', pencil: 'yellow', lamp: 'yellow', bell: 'yellow', broom: 'brown', balloon: 'red', boat: 'red',
  airplane: 'blue', house: 'orange', tree: 'green', star: 'yellow', leaf: 'green', kettle: 'red', hat: 'purple', sock: 'red',
  chair: 'brown', table: 'brown', frying_pan: 'grey', watering_can: 'green', hammer: 'brown', wrench: 'grey', ladder: 'brown',
  tshirt: 'blue', dress: 'pink', trousers: 'blue', mitten: 'red', boot: 'brown', glove: 'yellow', truck: 'red', train: 'green',
  rocket: 'grey', ship: 'blue', scooter: 'red', hot_air_balloon: 'red', whale: 'blue', dolphin: 'blue', octopus: 'purple',
  crab: 'red', starfish: 'orange', seahorse: 'yellow', dragonfly: 'green', elephant: 'grey', giraffe: 'yellow', bear: 'brown',
  fox: 'orange', camel: 'yellow', owl: 'brown', squirrel: 'orange', penguin: 'grey', apricot: 'orange', ice_cream: 'pink',
  candy: 'pink', lollipop: 'pink', pizza: 'yellow', cupcake: 'pink', cloud: 'grey', rainbow: 'red', lightning: 'yellow',
  mountains: 'grey', cactus: 'green', tulip: 'red', acorn: 'brown', fir_tree: 'green', palm: 'green', teddy_bear: 'brown',
  guitar: 'orange', trumpet: 'yellow', robot: 'grey', spinning_top: 'red', gift: 'red', moon: 'yellow', bow_tie: 'red', jug: 'blue', cap: 'blue'
};
const SECOND = ['yellow', 'green', 'blue', 'pink', 'orange', 'purple', 'red', 'brown'];

// extra — qo'shimcha ranglar soni (katta bo'laklar uchun)
const LEVELS = [
  { N: 16, keys: PIX_BIG, extra: 0 },
  { N: 20, keys: PIX_BIG, extra: 1 },
  { N: 25, keys: PIX_BIG, extra: 2 },
  { N: 30, keys: PIX_BIG, extra: 3 }
];
const RULE = {
  uz: "Har bir katakni undagi raqamning rangiga bo'ya (rangi tepadagi kalitda). Qanday rasm chiqdi?",
  ru: 'Раскрась каждую клетку цветом её номера (цвета — в ключе сверху). Что получилось?',
  en: 'Colour each square with the colour of its number (see the key at the top). What picture appears?'
};

export default {
  id: 'paintnum',
  skills: ['attention', 'motor'], // rivojlantiradigan ko'nikmalar (core/skills.js)
  name: { uz: "Raqam bo'yicha bo'ya", ru: 'Раскраска по номерам', en: 'Colour by number' },
  desc: {
    uz: "Kataklarni raqamiga mos rangga bo'yab, pikselli rasm hosil qilish",
    ru: 'Раскрасить клетки по номерам и получить пиксельную картинку',
    en: 'Colour the squares by their numbers to reveal a pixel picture'
  },
  fileBase: { uz: "Raqam bo'yicha bo'ya", ru: 'Раскраска по номерам', en: 'Colour by number' },
  defaultTitle: { uz: "Raqam bo'yicha bo'ya!", ru: 'Раскрась по номерам!', en: 'Colour by number!' },
  options: [{ key: 'level', type: 'level', default: 1 }],
  levelHint: {
    uz: ['16 katak, 3 ta rang', '20 katak, 4 tagacha rang', '25 katak, 5 tagacha rang', '30 katak, 6 tagacha rang'],
    ru: ['16 клеток, 3 цвета', '20 клеток, до 4 цветов', '25 клеток, до 5 цветов', '30 клеток, до 6 цветов'],
    en: ['16 squares, 3 colours', '20 squares, up to 4 colours', '25 squares, up to 5 colours', '30 squares, up to 6 colours']
  },

  generate(opts, seed) {
    const level = Math.max(0, Math.min(3, opts.level | 0));
    const L = LEVELS[level];
    const N = opts.perPage === 4 ? Math.min(L.N, 16) : opts.perPage === 2 ? Math.min(L.N, 20) : L.N;
    const rand = makeRng(seed);
    let key, art;
    for (let t = 0; t < 30; t++) {
      key = pickOne(rand, L.keys);
      art = colorArt(key, N);
      if (art.regions.length && art.regions[0] >= 4) break;
    }
    // Ranglar: 1 — asosiy, 2 — chiziq (qora), 3 — fon, 4… — qo'shimcha bo'laklar (kamida 4 katakli)
    const main = MAIN[key] || pickOne(rand, SECOND);
    const colors = [main, 'black', 'sky'];
    const regionColor = new Map([[2, 1]]);                   // soha raqami → kalit raqami (1 dan)
    const seconds = SECOND.filter(c => c !== main);
    let extra = 0;
    art.regions.forEach((size, i) => {
      if (i === 0) return;
      if (extra < L.extra && size >= 4) { colors.push(seconds[(extra + (seed % 3)) % seconds.length]); regionColor.set(2 + i, colors.length); extra++; }
      else regionColor.set(2 + i, 1);
    });
    const nums = art.cells.map(row => row.map(v => (v === 0 ? 3 : v === 1 ? 2 : regionColor.get(v))));
    return { level, seed, key, w: art.w, h: art.h, colors, nums };
  },

  info(p, lang) {
    return { uz: `${p.w}×${p.h}, ${p.colors.length} rang`, ru: `${p.w}×${p.h}, ${p.colors.length} цв.`, en: `${p.w}×${p.h}, ${p.colors.length} colours` }[lang] || '';
  },

  draw(ctx, p, box, { showSolution, lang }) {
    ctx.save();
    const scale = scaleOf(box);
    const rule = measureRule(ctx, RULE[lang] || RULE.uz, box.w, scale);
    const gap = 4 * scale;
    // Kalit: [● 1 qizil] bo'laklari
    const fs = 3.6 * scale;
    font(ctx, fs, 700);
    const chips = p.colors.map((c, i) => { const label = `${i + 1} — ${PALETTE[c][lang] || PALETTE[c].uz}`; return { c, label, w: fs * 2.0 + ctx.measureText(label).width + fs * 0.9 }; });
    const chipH = fs * 1.9, cg = fs * 0.6;
    const rowsK = [];
    let cur = [], cw = 0;
    for (const ch of chips) { if (cur.length && cw + ch.w > box.w) { rowsK.push(cur); cur = []; cw = 0; } cur.push(ch); cw += ch.w + cg; }
    if (cur.length) rowsK.push(cur);
    const keyH = rowsK.length * (chipH + cg) - cg;
    const cs = Math.min(box.w / p.w, (box.h - keyH - rule.h - 2 * gap) / p.h, 11);
    const W = cs * p.w, H = cs * p.h;
    const top = box.y + Math.max(0, (box.h - keyH - H - rule.h - 2 * gap) * 0.3);
    rowsK.forEach((row, ri) => {
      const tw = row.reduce((s, ch) => s + ch.w + cg, -cg);
      let x = box.x + (box.w - tw) / 2;
      const y = top + ri * (chipH + cg);
      for (const ch of row) {
        roundRect(ctx, x, y, ch.w, chipH, chipH / 2);
        ctx.fillStyle = '#F3F4F6'; ctx.fill();
        ctx.beginPath(); ctx.arc(x + chipH / 2, y + chipH / 2, chipH * 0.32, 0, Math.PI * 2);
        ctx.fillStyle = PALETTE[ch.c].hex; ctx.fill(); ctx.strokeStyle = '#6B7280'; ctx.lineWidth = 0.2; ctx.stroke();
        font(ctx, fs, 700);
        ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(ch.label, x + fs * 2.0, y + chipH / 2 + fs * 0.04);
        x += ch.w + cg;
      }
    });
    const gx = box.x + (box.w - W) / 2, gy = top + keyH + gap;
    if (showSolution) p.nums.forEach((row, r) => row.forEach((n, c) => { ctx.fillStyle = PALETTE[p.colors[n - 1]].hex; ctx.fillRect(gx + c * cs, gy + r * cs, cs, cs); }));
    ctx.strokeStyle = '#9CA3AF'; ctx.lineWidth = Math.max(0.15, 0.2 * scale);
    ctx.beginPath();
    for (let c = 0; c <= p.w; c++) { ctx.moveTo(gx + c * cs, gy); ctx.lineTo(gx + c * cs, gy + H); }
    for (let r = 0; r <= p.h; r++) { ctx.moveTo(gx, gy + r * cs); ctx.lineTo(gx + W, gy + r * cs); }
    ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.3, 0.45 * scale); ctx.strokeRect(gx, gy, W, H);
    if (!showSolution) {
      font(ctx, cs * 0.5, 600);
      ctx.fillStyle = MUTE; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      p.nums.forEach((row, r) => row.forEach((n, c) => ctx.fillText(String(n), gx + c * cs + cs / 2, gy + r * cs + cs / 2 + cs * 0.03)));
    }
    drawRule(ctx, rule, box.x + box.w / 2, gy + H + gap);
    ctx.restore();
    return {};
  },

  hint(p, info, lang) {
    const T = { uz: `Rasm: ${picName(p.key, 'uz')}`, ru: `Рисунок: ${picName(p.key, 'ru')}`, en: `Picture: ${picName(p.key, 'en')}` };
    return { text: T[lang] || T.uz, warn: false };
  },

  check(p) {
    const problems = [];
    const used = new Set();
    p.nums.forEach(row => row.forEach(n => { if (!(n >= 1 && n <= p.colors.length)) problems.push('bad number'); used.add(n); }));
    for (let i = 1; i <= p.colors.length; i++) if (!used.has(i)) problems.push(`colour ${i} unused`);
    if (new Set(p.colors).size !== p.colors.length) problems.push('repeated colour');
    p.colors.forEach(c => { if (!PALETTE[c]) problems.push('unknown colour ' + c); });
    return problems;
  },

  cover: `<svg viewBox="0 0 200 200" class="cover-paintnum" aria-hidden="true"><defs><linearGradient id="cg-paintnum" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9a9e"/><stop offset="1" stop-color="#fad0c4"/></linearGradient></defs><rect width="200" height="200" rx="28" fill="url(#cg-paintnum)"/><rect x="40" y="40" width="120" height="120" fill="#fff"/><g class="pn-fill"><rect x="40" y="40" width="120" height="120" fill="#BAE6FD"/><rect x="70" y="70" width="60" height="60" fill="#EF4444"/><rect x="90" y="50" width="20" height="20" fill="#22C55E"/></g><g stroke="#94a3b8" stroke-width="1.5"><path d="M60 40V160M80 40V160M100 40V160M120 40V160M140 40V160M40 60H160M40 80H160M40 100H160M40 120H160M40 140H160"/></g><rect x="40" y="40" width="120" height="120" fill="none" stroke="#334155" stroke-width="3"/><g font-family="Nunito, sans-serif" font-weight="800" font-size="13" fill="#475569" text-anchor="middle"><text x="50" y="55">3</text><text x="70" y="55">3</text><text x="50" y="75">3</text><text x="90" y="95">1</text><text x="110" y="115">1</text></g></svg>`
};
