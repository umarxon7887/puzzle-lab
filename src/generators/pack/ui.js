import { t, getLang } from '../../core/i18n.js';
import { makePdf, downloadPdf } from '../../core/pdf.js';
import { drawMazeForPack } from '../maze/ui.js';
import { drawCodeForPack } from '../code/ui.js';
import { drawSudokuForPack } from '../sudoku/ui.js';
import { drawWordsForPack } from '../wordsearch/ui.js';
import { drawCrossForPack } from '../crossword/ui.js';

var state = {
  config: {
    maze: { enabled: true, count: 2, level: 0, shape: 'rect' },
    code: { enabled: true, count: 2, level: 1, codeLength: 3 },
    sudoku: { enabled: true, count: 2, level: 1, type: '9' },
    words: { enabled: true, count: 2, level: 1, category: 'school' },
    cross: { enabled: true, count: 2, level: 1 }
  },
  items: [],
  showPreview: false,
  generating: false,
  progress: 0,
  total: 0
};

var SHAPES = {
  rect: 'To\'rtburchak',
  circle: 'Doira',
  star: 'Yulduz',
  heart: 'Yurak',
  triangle: 'Uchburchak',
  diamond: 'Romb',
  house: 'Uy',
  hexagon: 'Oltiburchak'
};

var SUDOKU_TYPES = {
  '4': '4x4',
  '5': '5x5',
  '6': '6x6',
  '7': '7x7',
  '8': '8x8',
  '9': '9x9',
  '9x': '9x9 Diagonal'
};

var WORD_CATS = {
  school: 'Maktab',
  autumn: 'Kuz',
  animals: 'Hayvonlar',
  food: 'Ovqat',
  sport: 'Sport',
  space: 'Fazo',
  mixed: 'Aralash'
};

export function init(container) {
  render(container);
}

export async function exportPack(withAnswer) {
  state.generating = true;
  state.total = state.items.length;
  state.progress = 0;
  var containerEl = document.querySelector('.card');
  if (containerEl) containerEl = containerEl.parentElement;
  if (!containerEl) containerEl = document.getElementById('app-container');
  renderProgress(containerEl);
  
  var pages = [];
  var canvas = document.createElement('canvas');
  var k = 300 / 25.4;
  
  var i;
  for (i = 0; i < state.items.length; i++) {
    state.progress = i + 1;
    renderProgress(containerEl);
    await new Promise(function(r) { setTimeout(r, 50); });
    var item = state.items[i];
    try {
      if (item.type === 'maze') drawMazeForPack(canvas, k, item.seed, item.config, withAnswer);
      else if (item.type === 'code') drawCodeForPack(canvas, k, item.seed, item.config, withAnswer);
      else if (item.type === 'sudoku') drawSudokuForPack(canvas, k, item.seed, item.config, withAnswer);
      else if (item.type === 'words') drawWordsForPack(canvas, k, item.seed, item.config, withAnswer);
      else if (item.type === 'cross') drawCrossForPack(canvas, k, item.seed, item.config, withAnswer);
      
      var blob = await new Promise(function(res) { canvas.toBlob(res, 'image/jpeg', 0.92); });
      if (!blob) throw new Error('Canvas to blob failed');
      var jpeg = new Uint8Array(await blob.arrayBuffer());
      pages.push({ buf: jpeg, w: canvas.width, h: canvas.height });
    } catch (err) {
      console.error('Error:', err);
    }
  }
  
  if (pages.length === 0) {
    alert('Xatolik yuz berdi');
    state.generating = false;
    render(containerEl);
    return;
  }
  
  var pdf = buildMultiPagePdf(pages);
  var lang = getLang();
  var fileName = 'Pack.pdf';
  if (lang === 'uz') {
    fileName = withAnswer ? 'Toplam (Javoblar).pdf' : 'Toplam.pdf';
  } else if (lang === 'ru') {
    fileName = withAnswer ? 'Набор (Ответы).pdf' : 'Набор.pdf';
  }
  
  downloadPdf(pdf, fileName);
  state.generating = false;
  render(containerEl);
}

function buildMultiPagePdf(pages) {
  var enc = new TextEncoder();
  var parts = [];
  var offsets = {};
  var len = 0;
  var push = function(d) {
    var b = typeof d === 'string' ? enc.encode(d) : d;
    parts.push(b);
    len += b.length;
  };
  var PW = 595.28, PH = 841.89;
  var N = pages.length;
  
  push('%PDF-1.4\n');
  offsets[1] = len;
  push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  
  var kids = '';
  var i;
  for (i = 0; i < N; i++) {
    if (i > 0) kids += ' ';
    kids += (3 + 3*i) + ' 0 R';
  }
  offsets[2] = len;
  push('2 0 obj\n<< /Type /Pages /Kids [' + kids + '] /Count ' + N + ' >>\nendobj\n');
  
  for (i = 0; i < N; i++) {
    var pageNum = 3 + 3*i;
    var imgNum = 4 + 3*i;
    var contentNum = 5 + 3*i;
    var p = pages[i];
    var content = 'q ' + PW + ' 0 0 ' + PH + ' 0 0 cm /Im0 Do Q';
    
    offsets[pageNum] = len;
    push(pageNum + ' 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /XObject << /Im0 ' + imgNum + ' 0 R >> >> /Contents ' + contentNum + ' 0 R >>\nendobj\n');
    
    offsets[imgNum] = len;
    push(imgNum + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + p.w + ' /Height ' + p.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.buf.length + ' >>\nstream\n');
    push(p.buf);
    push('\nendstream\nendobj\n');
    
    offsets[contentNum] = len;
    push(contentNum + ' 0 obj\n<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream\nendobj\n');
  }
  
  var xrefStart = len;
  var maxObj = 2 + 3*N;
  var xref = 'xref\n0 ' + (maxObj+1) + '\n0000000000 65535 f \n';
  for (i = 1; i <= maxObj; i++) {
    xref += String(offsets[i] || 0).padStart(10, '0') + ' 00000 n \n';
  }
  push(xref + 'trailer\n<< /Size ' + (maxObj+1) + ' /Root 1 0 R >>\nstartxref\n' + xrefStart + '\n%%EOF');
  
  return new Blob(parts, { type: 'application/pdf' });
}

function render(container) {
  if (state.generating) { renderProgress(container); return; }
  if (state.showPreview && state.items.length > 0) { renderPreview(container); return; }
  renderConfig(container);
}

function renderConfig(container) {
  var c = state.config;
  var levelNames = t('levelNames');
  var html = '<div class="card">';
  html += '<div class="game-header"><h2>Toplam yaratish</h2><p>Har bir turdan nechta topshiriq kerakligini tanlang</p></div>';
  html += '<div class="pack-types">';
  html += renderMazeConfig(c.maze, levelNames);
  html += renderCodeConfig(c.code, levelNames);
  html += renderSudokuConfig(c.sudoku, levelNames);
  html += renderWordsConfig(c.words, levelNames);
  html += renderCrossConfig(c.cross, levelNames);
  html += '</div>';
  html += '<button class="primary-action" id="buildBtn" style="margin-top:16px;">Toplamni yaratish</button>';
  html += '</div>';
  container.innerHTML = html;
  attachConfigEvents(container);
}

function renderMazeConfig(config, levelNames) {
  var html = '<div class="pack-type-card" id="pack_maze">';
  html += '<div class="pack-type-header"><label style="display:flex; align-items:center; gap:8px; flex:1;">';
  html += '<input type="checkbox" id="cfg_maze_enabled" ' + (config.enabled ? 'checked' : '') + ' style="width:18px; height:18px;">';
  html += '<span style="font-size:24px;">Labirint</span>';
  html += '</label></div>';
  html += '<div class="pack-type-body" ' + (!config.enabled ? 'style="opacity:0.5; pointer-events:none;"' : '') + '>';
  html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">';
  html += '<label><span style="font-size:11px; font-weight:700;">Soni</span>';
  html += '<input type="number" id="cfg_maze_count" min="0" max="20" value="' + config.count + '" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;"></label>';
  html += '<label><span style="font-size:11px; font-weight:700;">Daraja</span>';
  html += '<select id="cfg_maze_level" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;">';
  var i;
  for (i = 0; i < levelNames.length; i++) {
    html += '<option value="' + i + '"' + (config.level === i ? ' selected' : '') + '>' + levelNames[i] + '</option>';
  }
  html += '</select></label></div>';
  html += '<label style="margin-top:8px;"><span style="font-size:11px; font-weight:700;">Shakl</span>';
  html += '<select id="cfg_maze_shape" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;">';
  var keys = Object.keys(SHAPES);
  for (i = 0; i < keys.length; i++) {
    var k = keys[i];
    html += '<option value="' + k + '"' + (config.shape === k ? ' selected' : '') + '>' + SHAPES[k] + '</option>';
  }
  html += '</select></label></div></div>';
  return html;
}

function renderCodeConfig(config, levelNames) {
  var html = '<div class="pack-type-card" id="pack_code">';
  html += '<div class="pack-type-header"><label style="display:flex; align-items:center; gap:8px; flex:1;">';
  html += '<input type="checkbox" id="cfg_code_enabled" ' + (config.enabled ? 'checked' : '') + ' style="width:18px; height:18px;">';
  html += '<span style="font-size:24px;">Kodni top</span>';
  html += '</label></div>';
  html += '<div class="pack-type-body" ' + (!config.enabled ? 'style="opacity:0.5; pointer-events:none;"' : '') + '>';
  html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">';
  html += '<label><span style="font-size:11px; font-weight:700;">Soni</span>';
  html += '<input type="number" id="cfg_code_count" min="0" max="20" value="' + config.count + '" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;"></label>';
  html += '<label><span style="font-size:11px; font-weight:700;">Daraja</span>';
  html += '<select id="cfg_code_level" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;">';
  var i;
  for (i = 0; i < levelNames.length; i++) {
    html += '<option value="' + i + '"' + (config.level === i ? ' selected' : '') + '>' + levelNames[i] + '</option>';
  }
  html += '</select></label></div>';
  html += '<label style="margin-top:8px;"><span style="font-size:11px; font-weight:700;">Kod uzunligi</span>';
  html += '<select id="cfg_code_codeLength" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;">';
  var lengths = [3, 4, 5];
  for (i = 0; i < lengths.length; i++) {
    var v = lengths[i];
    html += '<option value="' + v + '"' + (config.codeLength === v ? ' selected' : '') + '>' + v + '</option>';
  }
  html += '</select></label></div></div>';
  return html;
}

function renderSudokuConfig(config, levelNames) {
  var html = '<div class="pack-type-card" id="pack_sudoku">';
  html += '<div class="pack-type-header"><label style="display:flex; align-items:center; gap:8px; flex:1;">';
  html += '<input type="checkbox" id="cfg_sudoku_enabled" ' + (config.enabled ? 'checked' : '') + ' style="width:18px; height:18px;">';
  html += '<span style="font-size:24px;">Sudoku</span>';
  html += '</label></div>';
  html += '<div class="pack-type-body" ' + (!config.enabled ? 'style="opacity:0.5; pointer-events:none;"' : '') + '>';
  html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">';
  html += '<label><span style="font-size:11px; font-weight:700;">Soni</span>';
  html += '<input type="number" id="cfg_sudoku_count" min="0" max="20" value="' + config.count + '" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;"></label>';
  html += '<label><span style="font-size:11px; font-weight:700;">Daraja</span>';
  html += '<select id="cfg_sudoku_level" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;">';
  var i;
  for (i = 0; i < levelNames.length; i++) {
    html += '<option value="' + i + '"' + (config.level === i ? ' selected' : '') + '>' + levelNames[i] + '</option>';
  }
  html += '</select></label></div>';
  html += '<label style="margin-top:8px;"><span style="font-size:11px; font-weight:700;">Sudoku turi</span>';
  html += '<select id="cfg_sudoku_type" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;">';
  var keys = Object.keys(SUDOKU_TYPES);
  for (i = 0; i < keys.length; i++) {
    var k = keys[i];
    html += '<option value="' + k + '"' + (config.type === k ? ' selected' : '') + '>' + SUDOKU_TYPES[k] + '</option>';
  }
  html += '</select></label></div></div>';
  return html;
}

function renderWordsConfig(config, levelNames) {
  var catNames = t('catNames');
  var wordsLevelNames = t('wordsLevelNames');
  var html = '<div class="pack-type-card" id="pack_words">';
  html += '<div class="pack-type-header"><label style="display:flex; align-items:center; gap:8px; flex:1;">';
  html += '<input type="checkbox" id="cfg_words_enabled" ' + (config.enabled ? 'checked' : '') + ' style="width:18px; height:18px;">';
  html += '<span style="font-size:24px;">Soz qidiruv</span>';
  html += '</label></div>';
  html += '<div class="pack-type-body" ' + (!config.enabled ? 'style="opacity:0.5; pointer-events:none;"' : '') + '>';
  html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">';
  html += '<label><span style="font-size:11px; font-weight:700;">Soni</span>';
  html += '<input type="number" id="cfg_words_count" min="0" max="20" value="' + config.count + '" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;"></label>';
  html += '<label><span style="font-size:11px; font-weight:700;">Daraja</span>';
  html += '<select id="cfg_words_level" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;">';
  var i;
  for (i = 0; i < wordsLevelNames.length; i++) {
    html += '<option value="' + i + '"' + (config.level === i ? ' selected' : '') + '>' + wordsLevelNames[i] + '</option>';
  }
  html += '</select></label></div>';
  html += '<label style="margin-top:8px;"><span style="font-size:11px; font-weight:700;">Mavzu</span>';
  html += '<select id="cfg_words_category" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;">';
  html += '<option value="mixed"' + (config.category === 'mixed' ? ' selected' : '') + '>Aralash</option>';
  var keys = Object.keys(catNames);
  for (i = 0; i < keys.length; i++) {
    var k = keys[i];
    html += '<option value="' + k + '"' + (config.category === k ? ' selected' : '') + '>' + catNames[k] + '</option>';
  }
  html += '</select></label></div></div>';
  return html;
}

function renderCrossConfig(config, levelNames) {
  var crossLevelNames = t('crossLevelNames');
  var html = '<div class="pack-type-card" id="pack_cross">';
  html += '<div class="pack-type-header"><label style="display:flex; align-items:center; gap:8px; flex:1;">';
  html += '<input type="checkbox" id="cfg_cross_enabled" ' + (config.enabled ? 'checked' : '') + ' style="width:18px; height:18px;">';
  html += '<span style="font-size:24px;">Krossvord</span>';
  html += '</label></div>';
  html += '<div class="pack-type-body" ' + (!config.enabled ? 'style="opacity:0.5; pointer-events:none;"' : '') + '>';
  html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">';
  html += '<label><span style="font-size:11px; font-weight:700;">Soni</span>';
  html += '<input type="number" id="cfg_cross_count" min="0" max="20" value="' + config.count + '" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;"></label>';
  html += '<label><span style="font-size:11px; font-weight:700;">Daraja</span>';
  html += '<select id="cfg_cross_level" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); font-size:12px;">';
  var i;
  for (i = 0; i < crossLevelNames.length; i++) {
    html += '<option value="' + i + '"' + (config.level === i ? ' selected' : '') + '>' + crossLevelNames[i] + '</option>';
  }
  html += '</select></label></div></div></div>';
  return html;
}

function attachConfigEvents(container) {
  var types = ['maze', 'code', 'sudoku', 'words', 'cross'];
  var t;
  for (t = 0; t < types.length; t++) {
    var itemType = types[t];
    var enabledCb = container.querySelector('#cfg_' + itemType + '_enabled');
    var body = container.querySelector('#pack_' + itemType + ' .pack-type-body');
    if (enabledCb && body) {
      (function(type, b) {
        enabledCb.addEventListener('change', function(e) {
          state.config[type].enabled = e.target.checked;
          b.style.opacity = e.target.checked ? '1' : '0.5';
          b.style.pointerEvents = e.target.checked ? 'auto' : 'none';
        });
      })(itemType, body);
    }
    var countInput = container.querySelector('#cfg_' + itemType + '_count');
    if (countInput) {
      (function(type) {
        countInput.addEventListener('change', function(e) {
          state.config[type].count = Math.max(0, Math.min(20, parseInt(e.target.value) || 0));
        });
      })(itemType);
    }
    var levelSelect = container.querySelector('#cfg_' + itemType + '_level');
    if (levelSelect) {
      (function(type) {
        levelSelect.addEventListener('change', function(e) {
          state.config[type].level = parseInt(e.target.value);
        });
      })(itemType);
    }
    var shape = container.querySelector('#cfg_' + itemType + '_shape');
    if (shape) {
      (function(type) {
        shape.addEventListener('change', function(e) {
          state.config[type].shape = e.target.value;
        });
      })(itemType);
    }
    var codeLength = container.querySelector('#cfg_' + itemType + '_codeLength');
    if (codeLength) {
      (function(type) {
        codeLength.addEventListener('change', function(e) {
          state.config[type].codeLength = parseInt(e.target.value);
        });
      })(itemType);
    }
    var typeSelect = container.querySelector('#cfg_' + itemType + '_type');
    if (typeSelect) {
      (function(type) {
        typeSelect.addEventListener('change', function(e) {
          state.config[type].type = e.target.value;
        });
      })(itemType);
    }
    var categorySelect = container.querySelector('#cfg_' + itemType + '_category');
    if (categorySelect) {
      (function(type) {
        categorySelect.addEventListener('change', function(e) {
          state.config[type].category = e.target.value;
        });
      })(itemType);
    }
  }
  var buildBtn = container.querySelector('#buildBtn');
  if (buildBtn) {
    buildBtn.addEventListener('click', function() { buildPack(container); });
  }
}

function attachPreviewEvents(container) {
  var refreshBtns = container.querySelectorAll('[data-action="refresh"]');
  var i;
  for (i = 0; i < refreshBtns.length; i++) {
    (function(idx) {
      refreshBtns[idx].addEventListener('click', function() {
        state.items[idx].seed = Math.floor(Math.random() * 1e9) + 1;
        render(container);
      });
    })(parseInt(refreshBtns[i].dataset.idx));
  }
  var removeBtns = container.querySelectorAll('[data-action="remove"]');
  for (i = 0; i < removeBtns.length; i++) {
    (function(idx) {
      removeBtns[idx].addEventListener('click', function() {
        state.items.splice(idx, 1);
        if (state.items.length === 0) state.showPreview = false;
        render(container);
      });
    })(parseInt(removeBtns[i].dataset.idx));
  }
  var taskBtn = container.querySelector('#downloadTaskBtn');
  if (taskBtn) taskBtn.addEventListener('click', function() { exportPack(false); });
  var answerBtn = container.querySelector('#downloadAnswerBtn');
  if (answerBtn) answerBtn.addEventListener('click', function() { exportPack(true); });
  var backBtn = container.querySelector('#backToConfigBtn');
  if (backBtn) backBtn.addEventListener('click', function() { state.showPreview = false; render(container); });
}

function getTypeIcon(type) {
  var icons = { maze: 'Labirint', code: 'Kod', sudoku: 'Sudoku', words: 'Soz', cross: 'Kross' };
  return icons[type] || type;
}

function getTypeName(type) {
  var names = { maze: 'Labirint', code: 'Kodni top', sudoku: 'Sudoku', words: 'Soz qidiruv', cross: 'Krossvord' };
  return names[type] || type;
}

function getItemDetails(item) {
  var c = item.config;
  var levelNames = t('levelNames');
  if (item.type === 'maze') return levelNames[c.level] + ' | ' + (SHAPES[c.shape] || c.shape);
  if (item.type === 'code') return c.codeLength + ' xonali | ' + levelNames[c.level];
  if (item.type === 'sudoku') return (SUDOKU_TYPES[c.type] || c.type) + ' | ' + levelNames[c.level];
  if (item.type === 'words') return (WORD_CATS[c.category] || c.category) + ' | ' + t('wordsLevelNames')[c.level];
  if (item.type === 'cross') return t('crossLevelNames')[c.level];
  return '';
}

function renderProgress(container) {
  var pct = state.total > 0 ? Math.round(state.progress / state.total * 100) : 0;
  var html = '<div class="card" style="text-align:center; padding:40px 20px;">';
  html += '<div style="font-size:48px; margin-bottom:16px;">Yaratilmoqda...</div>';
  html += '<h3 style="margin-bottom:8px;">' + state.progress + ' / ' + state.total + '</h3>';
  html += '<div style="background:#E5E7EB; border-radius:8px; height:8px; overflow:hidden; margin-top:16px;">';
  html += '<div style="background:#4F46E5; height:100%; width:' + pct + '%; transition:width 0.3s;"></div>';
  html += '</div></div>';
  container.innerHTML = html;
}
