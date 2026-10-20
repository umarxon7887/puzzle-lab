// tests/run.mjs — barcha testlar (hech qanday kutubxonasiz, oddiy Node bilan ishlaydi).
// Ishga tushirish:  npm test        (yoki: node tests/run.mjs)
// Tezkor rejim:     npm test -- --quick
// Bitta generator:  npm test -- --only=sudoku

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { makeRng, shuffle, deriveSeed, randInt } from '../src/core/rng.js';
import { GENERATORS, getGenerator } from '../src/generators/registry.js';
import { TOPICS, BANKS } from '../src/generators/wordsearch-words.js';
import { toCells, parseCustom } from '../src/generators/wordsearch.js';
import { clueText } from '../src/generators/code.js';
import { _dict, LANGS } from '../src/core/i18n.js';
import { buildPdf } from '../src/core/pdf.js';
import { slotRects, drawPage, PAGE_W, PAGE_H } from '../src/core/sheet.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const QUICK = args.includes('--quick');
const ONLY = (args.find(a => a.startsWith('--only=')) || '').slice(7);
const SEEDS = QUICK ? 3 : 10;
const LANG_CODES = LANGS.map(l => l.code);

let passed = 0, failed = 0;
const failures = [];
function section(name) { console.log('\n' + name); }
async function test(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    passed++;
    console.log(`  \u2713 ${name} (${Date.now() - t0} ms)`);
  } catch (e) {
    failed++;
    failures.push(name);
    console.log(`  \u2717 ${name}\n      ${String(e && e.message || e).split('\n').join('\n      ')}`);
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function eq(a, b, msg) { if (a !== b) throw new Error(`${msg || 'not equal'}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`); }
const json = x => JSON.stringify(x);

// Canvas o'rniga ishlatiladigan "soxta" kontekst: chizilgan nuqtalarni yig'adi
function mockCtx() {
  const pts = [];
  const ctx = {
    font: '10px sans-serif', fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, lineCap: 'butt', lineJoin: 'miter',
    textAlign: 'left', textBaseline: 'alphabetic', globalAlpha: 1,
    save() {}, restore() {}, setTransform() {}, setLineDash() {}, beginPath() {}, closePath() {},
    stroke() {}, fill() {}, clip() {}, clearRect() {},
    moveTo(x, y) { pts.push([x, y, 'moveTo']); },
    lineTo(x, y) { pts.push([x, y, 'lineTo']); },
    quadraticCurveTo(cx, cy, x, y) { pts.push([x, y, 'quad']); },
    arc(x, y, r) { pts.push([x - r, y - r, 'arc'], [x + r, y + r, 'arc']); },
    rect(x, y, w, h) { pts.push([x, y, 'rect'], [x + w, y + h, 'rect']); },
    fillRect(x, y, w, h) { pts.push([x, y, 'fillRect'], [x + w, y + h, 'fillRect']); },
    strokeRect(x, y, w, h) { pts.push([x, y, 'strokeRect'], [x + w, y + h, 'strokeRect']); },
    fillText(t, x, y) { pts.push([x, y, 'text:' + t]); },
    measureText(t) {
      const m = /([\d.]+)px/.exec(ctx.font);
      return { width: String(t).length * (m ? +m[1] : 10) * 0.55 };
    }
  };
  return { ctx, pts };
}
function checkInside(pts, box, tol, label) {
  for (const [x, y, what] of pts) {
    assert(Number.isFinite(x) && Number.isFinite(y), `${label}: NaN coordinate (${what})`);
    if (x < box.x - tol || x > box.x + box.w + tol || y < box.y - tol || y > box.y + box.h + tol) {
      throw new Error(`${label}: ${what} at (${x.toFixed(1)}, ${y.toFixed(1)}) is outside box ${json(box)}`);
    }
  }
}
const BOXES = {
  full: { x: 12, y: 30, w: 186, h: 240 },
  half: { x: 12, y: 24, w: 186, h: 104 },
  quarter: { x: 12, y: 30, w: 88, h: 96 }
};

// ---------------------------------------------------------------------------
section('Tasodifiy sonlar (rng)');

await test('bir xil seed — bir xil ketma-ketlik', () => {
  const a = makeRng(12345), b = makeRng(12345);
  for (let i = 0; i < 100; i++) eq(a(), b(), 'rng differs');
});
await test('qiymatlar [0, 1) oralig\'ida', () => {
  const r = makeRng(7);
  for (let i = 0; i < 5000; i++) { const v = r(); assert(v >= 0 && v < 1, 'out of range ' + v); }
});
await test('randInt chegaralarni o\'z ichiga oladi', () => {
  const r = makeRng(99), seen = new Set();
  for (let i = 0; i < 2000; i++) { const v = randInt(r, 3, 6); assert(v >= 3 && v <= 6); seen.add(v); }
  eq(seen.size, 4, 'not all values seen');
});
await test('shuffle — o\'rin almashtirish (hech narsa yo\'qolmaydi)', () => {
  const arr = shuffle(Array.from({ length: 50 }, (_, i) => i), makeRng(5));
  eq(arr.slice().sort((a, b) => a - b).join(','), Array.from({ length: 50 }, (_, i) => i).join(','));
});
await test('deriveSeed: 0 — o\'zi, boshqalari farqli va 1…999999999 oralig\'ida', () => {
  eq(deriveSeed(555, 0), 555);
  const s = new Set([555]);
  for (let i = 1; i < 4; i++) { const d = deriveSeed(555, i); assert(d >= 1 && d <= 999999999); s.add(d); eq(d, deriveSeed(555, i), 'not deterministic'); }
  eq(s.size, 4, 'derived seeds collide');
});

// ---------------------------------------------------------------------------
section('Generatorlar ro\'yxati (shartnoma)');

await test('har bir generatorda kerakli maydonlar bor', () => {
  const ids = new Set();
  for (const g of GENERATORS) {
    assert(/^[a-z][a-z0-9-]*$/.test(g.id), 'bad id ' + g.id);
    assert(!ids.has(g.id), 'duplicate id ' + g.id); ids.add(g.id);
    for (const key of ['name', 'desc', 'defaultTitle', 'fileBase']) {
      for (const l of LANG_CODES) assert(typeof g[key]?.[l] === 'string' && g[key][l].trim(), `${g.id}.${key}.${l} missing`);
    }
    for (const fn of ['generate', 'draw', 'info', 'hint', 'check']) assert(typeof g[fn] === 'function', `${g.id}.${fn} missing`);
    assert(typeof g.cover === 'string' && g.cover.startsWith('<svg'), g.id + ' cover');
    assert(g.options.some(o => o.type === 'level'), g.id + ' has no level option');
    for (const o of g.options) {
      assert(o.key && o.type, g.id + ' option without key/type');
      if (o.type !== 'level') for (const l of LANG_CODES) assert(o.label?.[l], `${g.id}.${o.key}.label.${l}`);
      if (o.type === 'choice') {
        assert(o.choices.some(c => c.value === o.default), `${g.id}.${o.key}: default not in choices`);
        for (const c of o.choices) for (const l of LANG_CODES) assert(c.label?.[l], `${g.id}.${o.key}.${c.value}.label.${l}`);
      }
      if (o.type === 'emoji') assert(o.choices.includes(o.default), `${g.id}.${o.key}: default not in choices`);
    }
  }
  eq(getGenerator('maze').id, 'maze');
  eq(getGenerator('nope'), null);
});
await test('ikonkalardagi SVG gradient id lari takrorlanmaydi', () => {
  const ids = GENERATORS.map(g => (/id="([^"]+)"/.exec(g.cover) || [])[1]).filter(Boolean);
  eq(new Set(ids).size, ids.length, 'duplicate SVG ids: ' + ids.join(','));
});

// ---------------------------------------------------------------------------
// Har bir generator: barcha darajalar va asosiy tanlovlar bo'yicha bir nechta raqam
for (const g of GENERATORS) {
  if (ONLY && g.id !== ONLY) continue;
  section(`Generator: ${g.id}`);
  const main = g.options.find(o => o.type === 'choice' && o.pack === 'select');
  const variants = main ? main.choices.filter(c => !c.noPack).map(c => ({ [main.key]: c.value })) : [{}];
  const langs = g.usesLang ? LANG_CODES : ['uz'];
  for (const v of variants) {
    for (const lang of langs) {
      const label = Object.values(v).join('') + (g.usesLang ? '/' + lang : '');
      await test(`${label || 'standart'}: barcha darajalar to'g'ri (${SEEDS} tadan)`, () => {
        for (let level = 0; level < 4; level++) {
          for (let s = 0; s < SEEDS; s++) {
            const seed = 1 + s * 7919 + level * 104729 + label.length;
            const p = g.generate({ level, ...v, lang }, seed);
            const problems = g.check(p);
            assert(!problems.length, `level ${level}, seed ${seed}: ${problems.slice(0, 3).join('; ')}`);
          }
        }
      });
    }
  }
  await test('bir xil raqam — aynan bir xil topshiriq; boshqa raqam — boshqa', () => {
    const o = { level: 1, lang: 'uz' };
    eq(json(g.generate(o, 4242)), json(g.generate(o, 4242)), 'not deterministic');
    const distinct = new Set([1, 2, 3, 4, 5].map(s => json(g.generate(o, s * 1000 + 1))));
    assert(distinct.size >= 4, 'too many identical puzzles for different seeds');
  });
  await test('chizish: varaqning 1, 2 va 4 qismiga sig\'adi', () => {
    for (const [name, box] of Object.entries(BOXES)) {
      for (let level = 0; level < 4; level++) {
        for (const v of variants) {
          const p = g.generate({ level, ...v, lang: 'uz', aspect: name === 'half' ? 'landscape' : 'portrait' }, 777 + level);
          for (const showSolution of [false, true]) {
            for (const lang of LANG_CODES) {
              const { ctx, pts } = mockCtx();
              g.draw(ctx, p, box, { showSolution, lang });
              assert(pts.length > 10, 'nothing drawn');
              checkInside(pts, box, 1.5, `${name}/L${level}/${json(v)}/${lang}${showSolution ? '/answer' : ''}`);
            }
          }
        }
      }
    }
  });
  await test('info() va hint() barcha tillarda matn qaytaradi', () => {
    const p = g.generate({ level: 2, lang: 'uz' }, 31337);
    for (const l of LANG_CODES) {
      assert(typeof g.info(p, l) === 'string' && g.info(p, l).length, 'info ' + l);
      const hnt = g.hint(p, { cell: 5 }, l);
      assert(hnt && typeof hnt.text === 'string' && hnt.text.length, 'hint ' + l);
    }
  });
}

// ---------------------------------------------------------------------------
if (!ONLY || ONLY === 'words') {
  section("So'z qidiruv: so'zlar va o'zbek harflari");

  await test("O' va G' bitta katak: BO'RI → B, O‘, R, I", () => {
    eq(toCells("bo'ri").join(' '), 'B O\u2018 R I');
    eq(toCells('G‘ISHT').join(' '), 'G\u2018 I S H T');
    eq(toCells("qo'ng'iroq").length, 8);
    eq(toCells("ta'lim").join(''), 'TALIM', 'tutuq belgisi tashlanadi');
    eq(toCells('ўрик').join(''), 'ЎРИК');
  });
  await test('har bir mavzuda har uch tilda kamida 26 ta so\'z, takrorsiz, 2–13 harf', () => {
    for (const lang of LANG_CODES) {
      for (const tp of TOPICS) {
        const list = BANKS[lang][tp.key];
        assert(Array.isArray(list), `${lang}/${tp.key} missing`);
        assert(list.length >= 26, `${lang}/${tp.key}: only ${list.length} words`);
        const keys = list.map(w => toCells(w).join('|'));
        eq(new Set(keys).size, keys.length, `${lang}/${tp.key}: duplicates`);
        for (const w of list) {
          const n = toCells(w).length;
          assert(n >= 2 && n <= 13, `${lang}/${tp.key}: "${w}" has ${n} letters`);
          if (lang === 'ru') assert(/^[А-ЯЁ]+$/.test(w), `ru word with non-Cyrillic letters: ${w}`);
          if (lang === 'en') assert(/^[A-Z]+$/.test(w), `en word with bad letters: ${w}`);
          if (lang === 'uz') {
            assert(/^[A-Z']+$/.test(w), `uz word with bad letters: ${w}`);
            assert(!/W/.test(w), `uz word with W: ${w}`);
            assert(!/C(?!H)/.test(w), `uz word with C not followed by H: ${w}`);
            assert(!/'/.test(w.replace(/[OG]'/g, '')), `uz word with tutuq (apostrophe not after O/G): ${w}`);
          }
        }
      }
    }
  });
  await test('mavzular nomi uch tilda', () => {
    for (const tp of TOPICS) for (const l of LANG_CODES) assert(tp.name[l], tp.key + ' ' + l);
  });
  await test("o'qituvchi yozgan so'zlar: vergul, yangi qator, bo'sh joy", () => {
    let r = parseCustom("olma, nok, o'rik\ngilos; anor", 'uz');
    eq(r.words.map(w => w.text).join(' '), 'OLMA NOK O\u2018RIK GILOS ANOR');
    eq(r.alphabet, 'uz');
    r = parseCustom('olma nok anor', 'uz');
    eq(r.words.length, 3, 'space separated');
    r = parseCustom('qor odam, archa, chana', 'uz');
    eq(r.words[0].text, 'QOR ODAM', 'multi-word item kept');
    eq(r.words[0].cells.join(''), 'QORODAM');
    r = parseCustom('кошка, собака, мышь', 'uz');
    eq(r.alphabet, 'ru', 'cyrillic words → russian alphabet');
    r = parseCustom('ўрик, қовун, ғишт, олма', 'ru');
    eq(r.alphabet, 'uzc', 'uzbek cyrillic');
    r = parseCustom('cat, dog, bird', 'en');
    eq(r.alphabet, 'en');
    r = parseCustom('ot, ota, otamiz, olma, olma', 'uz');
    eq(r.words.map(w => w.text).join(' '), 'OTAMIZ OLMA', 'substrings and duplicates removed');
    assert(r.skipped >= 2, 'skipped count');
  });
  await test("o'z so'zlari bilan topshiriq (har bir so'z bir marta)", () => {
    const g = getGenerator('words');
    for (const [words, lang] of [["olma, nok, o'rik, gilos, anor, uzum, behi, qovun", 'uz'], ['кошка, собака, мышь, лиса, волк', 'ru'], ['cat, dog, bird, fish, frog, duck', 'en'], ['ўрик, қовун, ғишт, олма', 'uz']]) {
      for (let level = 0; level < 4; level++) for (let s = 1; s <= SEEDS; s++) {
        const p = g.generate({ level, topic: 'custom', words, lang }, s * 31 + level);
        assert(p.custom && !p.fallback, 'custom words not used');
        const problems = g.check(p);
        assert(!problems.length, `${words} L${level} s${s}: ${problems.join('; ')}`);
      }
    }
    const fb = g.generate({ level: 1, topic: 'custom', words: 'a, b', lang: 'uz' }, 5);
    assert(fb.fallback, 'fallback when fewer than 3 words');
  });
}

if (!ONLY || ONLY === 'code') {
  section('Kodni top: matnlar');
  await test("ishora matnlari barcha (A, B) va tillar uchun", () => {
    for (const l of LANG_CODES) for (let A = 0; A <= 4; A++) for (let B = 0; A + B <= 5; B++) {
      const s = clueText(A, B, l);
      assert(typeof s === 'string' && s.length > 5 && !/undefined/.test(s), `${l} ${A},${B}: ${s}`);
    }
  });
}

// ---------------------------------------------------------------------------
section('Tillar (i18n)');
await test("uz, ru, en — barcha kalitlar bor va turi bir xil", () => {
  const base = _dict.uz;
  for (const l of LANG_CODES) {
    for (const k of Object.keys(base)) {
      assert(k in _dict[l], `${l}: missing key ${k}`);
      eq(typeof _dict[l][k], typeof base[k], `${l}.${k} type`);
    }
    for (const k of Object.keys(_dict[l])) assert(k in base, `${l}: extra key ${k}`);
  }
});
await test('fayl nomlarida taqiqlangan belgilar yo\'q', () => {
  for (const l of LANG_CODES) for (const g of GENERATORS) {
    for (const k of ['fileTask', 'fileAnswer', 'fileBoth']) {
      const name = _dict[l][k](g.fileBase[l], 123456);
      assert(!/[\\/:*?"<>|]/.test(name), `${l} ${k}: ${name}`);
      assert(name.endsWith('.pdf') && name.includes('123456'), name);
    }
  }
});

// ---------------------------------------------------------------------------
section('Varaq va PDF');
await test('joylar varaq ichida va bir-birini qoplamaydi', () => {
  const area = { x: 12, y: 12, w: 186, h: 266 };
  for (const n of [1, 2, 4]) {
    const r = slotRects(n, area);
    eq(r.length, n);
    for (const a of r) assert(a.x >= 0 && a.y >= 0 && a.x + a.w <= PAGE_W && a.y + a.h <= PAGE_H, 'outside page');
    for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
      const a = r[i], b = r[j];
      assert(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, 'overlap');
    }
  }
});
await test('butun varaq (1, 2, 4 tadan, ism qatori bilan) xatosiz chiziladi', () => {
  for (const g of GENERATORS) for (const n of [1, 2, 4]) {
    const slots = Array.from({ length: n }, (_, i) => ({ gen: g, puzzle: g.generate({ level: 1, lang: 'en', aspect: n === 2 ? 'landscape' : 'portrait' }, 100 + i), title: 'Title ' + i, fontPt: 24, number: n > 1 ? String(i + 1) : '', footer: 'footer' }));
    for (const showSolution of [false, true]) {
      const { ctx, pts } = mockCtx();
      const infos = drawPage(ctx, 10, { slots, layout: n, lang: 'en', showSolution, nameLine: true, pageLabel: '1 / 1' });
      eq(infos.length, n);
      checkInside(pts, { x: 0, y: 0, w: PAGE_W, h: PAGE_H }, 0.01, `${g.id} x${n}`);
    }
  }
});
await test("PDF tuzilishi to'g'ri (xref manzillari obyektlarga mos)", async () => {
  const jpeg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3, 4, 5, 0xFF, 0xD9]);
  const blob = buildPdf([{ jpeg, w: 10, h: 14 }, { jpeg, w: 10, h: 14 }, { jpeg, w: 10, h: 14 }], { title: "Sinov — O‘zbekcha: Лабиринт" });
  const buf = new Uint8Array(await blob.arrayBuffer());
  const text = new TextDecoder('latin1').decode(buf);
  assert(text.startsWith('%PDF-1.4'), 'header');
  assert(text.trimEnd().endsWith('%%EOF'), 'eof');
  const startxref = +/startxref\n(\d+)/.exec(text)[1];
  assert(text.slice(startxref, startxref + 4) === 'xref', 'startxref points to xref');
  const m = /xref\n0 (\d+)\n/.exec(text.slice(startxref));
  const count = +m[1];
  eq(count, 4 + 3 * 3, 'object count');
  const lines = text.slice(startxref).split('\n').slice(3, 3 + count - 1);
  lines.forEach((ln, i) => {
    const off = +ln.slice(0, 10);
    const head = text.slice(off, off + 12);
    assert(head.startsWith(`${i + 1} 0 obj`), `object ${i + 1} offset wrong: "${head}"`);
  });
  assert(/\/Count 3/.test(text), 'page count');
  assert(/\/Title <FEFF/.test(text), 'unicode title');
});

// ---------------------------------------------------------------------------
section('Oflayn rejim (sw.js)');
await test("sw.js ro'yxatida barcha fayllar bor va ular mavjud", () => {
  const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  const list = JSON.parse('[' + /const CORE = \[([\s\S]*?)\];/.exec(sw)[1].replace(/'/g, '"').replace(/,\s*$/, '') + ']');
  const walk = dir => readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
  const srcFiles = walk(join(ROOT, 'src')).filter(f => f.endsWith('.js')).map(f => relative(ROOT, f).split('\\').join('/'));
  for (const f of srcFiles) assert(list.includes(f), `sw.js CORE is missing ${f}`);
  for (const f of list) if (f !== './') assert(existsSync(join(ROOT, f)), `sw.js lists missing file ${f}`);
  for (const f of ['index.html', 'style.css', 'manifest.json']) assert(list.includes(f), 'missing ' + f);
});
await test('manifest.json to\'g\'ri', () => {
  const m = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));
  assert(m.name && m.short_name && m.start_url && m.icons.length >= 2, 'fields');
  for (const ic of m.icons) assert(existsSync(join(ROOT, ic.src)), 'icon missing ' + ic.src);
});

// ---------------------------------------------------------------------------
console.log(`\n${failed ? '\u274c' : '\u2705'}  ${passed} ta test o'tdi, ${failed} ta xato` + (failed ? ':\n  - ' + failures.join('\n  - ') : ''));
process.exitCode = failed ? 1 : 0;
