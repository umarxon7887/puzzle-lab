export const TYPES = {
  '4':  {N:4, br:2, bc:2},
  '5':  {N:5, jig:true},
  '6':  {N:6, br:2, bc:3},
  '7':  {N:7, jig:true},
  '8':  {N:8, br:2, bc:4},
  '9':  {N:9, br:3, bc:3},
  '9x': {N:9, br:3, bc:3, diag:true}
};

export const LEVEL_CLUES = {'4':[11,9,7,6], '5':[16,13,11,9], '6':[24,20,17,14], '7':[32,27,23,19], '8':[40,33,28,24], '9':[42,34,29,25], '9x':[40,32,27,23]};
export const LEVEL_MODE = ['naked', 'singles', 'none', 'none'];

function makeRng(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function assemble(t, region) {
  const N = t.N, units = [];
  for (let r = 0; r < N; r++) units.push(Array.from({length:N}, (_, c) => r*N + c));
  for (let c = 0; c < N; c++) units.push(Array.from({length:N}, (_, r) => r*N + c));
  for (let id = 0; id < N; id++) units.push(region.map((v, i) => v === id ? i : -1).filter(i => i >= 0));
  if (t.diag) {
    units.push(Array.from({length:N}, (_, i) => i*N + i));
    units.push(Array.from({length:N}, (_, i) => i*N + (N-1-i)));
  }
  const peerSets = Array.from({length:N*N}, () => new Set());
  units.forEach(u => u.forEach(a => u.forEach(b => { if (a !== b) peerSets[a].add(b); })));
  return { ...t, region, units, peers: peerSets.map(s => [...s]) };
}

export function makeJigsaw(N, rand) {
  for (let attempt = 0; attempt < 300; attempt++) {
    const reg = Array(N*N).fill(-1), size = Array(N).fill(0);
    const perm = shuffle(Array.from({length:N}, (_, i) => i), rand);
    for (let r = 0; r < N; r++) { reg[r*N + perm[r]] = r; size[r] = 1; }
    let assigned = N;
    while (assigned < N*N) {
      const options = [];
      for (let i = 0; i < N*N; i++) {
        const k = reg[i];
        if (k < 0 || size[k] >= N) continue;
        const r = Math.floor(i / N), c = i % N;
        if (r > 0   && reg[i-N] < 0) options.push([k, i-N]);
        if (r < N-1 && reg[i+N] < 0) options.push([k, i+N]);
        if (c > 0   && reg[i-1] < 0) options.push([k, i-1]);
        if (c < N-1 && reg[i+1] < 0) options.push([k, i+1]);
      }
      if (!options.length) break;
      const [k, j] = options[Math.floor(rand() * options.length)];
      reg[j] = k; size[k]++; assigned++;
    }
    if (assigned === N*N) return reg;
  }
  return null;
}

const specCache = {};
export function buildSpec(key, seed) {
  const t = TYPES[key], N = t.N;
  const ck = t.jig ? key + '|' + seed : key;
  if (specCache[ck]) return specCache[ck];
  let spec = null;
  if (t.jig) {
    const rand = makeRng(seed * 17 + 3);
    for (let a = 0; a < 200 && !spec; a++) {
      const reg = makeJigsaw(N, rand);
      if (!reg) continue;
      const cand = assemble(t, reg);
      if (countSolutions(cand, Array(N*N).fill(0), 1) >= 1) spec = cand;
    }
    if (!spec) spec = assemble(t, Array.from({length:N*N}, (_, i) => Math.floor(i / N)));
  } else {
    spec = assemble(t, Array.from({length:N*N}, (_, i) => Math.floor(Math.floor(i / N) / t.br) * (N / t.bc) + Math.floor((i % N) / t.bc)));
  }
  return (specCache[ck] = spec);
}

const popcount = m => { let c = 0; while (m) { m &= m - 1; c++; } return c; };

export function countSolutions(spec, g, limit, rand, firstOut) {
  const full = (1 << spec.N) - 1;
  let count = 0;
  function rec() {
    let best = -1, bestMask = 0, bestCnt = 99;
    for (let i = 0; i < g.length; i++) {
      if (g[i]) continue;
      let used = 0; const ps = spec.peers[i];
      for (let k = 0; k < ps.length; k++) { const v = g[ps[k]]; if (v) used |= 1 << (v-1); }
      const m = full & ~used, c = popcount(m);
      if (c === 0) return;
      if (c < bestCnt) { bestCnt = c; best = i; bestMask = m; if (c === 1) break; }
    }
    if (best < 0) { count++; if (firstOut && count === 1) firstOut.push(...g); return; }
    const digits = [];
    for (let d = 1; d <= spec.N; d++) if (bestMask & (1 << (d-1))) digits.push(d);
    if (rand) shuffle(digits, rand);
    for (const d of digits) { g[best] = d; rec(); g[best] = 0; if (count >= limit) return; }
  }
  rec();
  return count;
}

export function solvableBySingles(spec, g0, hidden) {
  const g = g0.slice(), N = spec.N, full = (1 << N) - 1;
  const cand = i => { let used = 0; const ps = spec.peers[i]; for (let k = 0; k < ps.length; k++) { const v = g[ps[k]]; if (v) used |= 1 << (v-1); } return full & ~used; };
  let progress = true;
  while (progress) {
    progress = false;
    for (let i = 0; i < g.length; i++) {
      if (g[i]) continue;
      const m = cand(i);
      if (m === 0) return false;
      if ((m & (m - 1)) === 0) { g[i] = Math.log2(m) + 1; progress = true; }
    }
    if (!progress && hidden) {
      outer:
      for (const u of spec.units) {
        for (let d = 1; d <= N; d++) {
          if (u.some(i => g[i] === d)) continue;
          const spots = u.filter(i => !g[i] && (cand(i) & (1 << (d-1))));
          if (spots.length === 1) { g[spots[0]] = d; progress = true; break outer; }
        }
      }
    }
  }
  return g.every(v => v);
}

export function generateSudoku(key, level, seed) {
  const spec = buildSpec(key, seed), total = spec.N * spec.N;
  const sol = [];
  countSolutions(spec, Array(total).fill(0), 1, makeRng(seed), sol);
  const rand = makeRng(seed * 31 + 7);
  const target = LEVEL_CLUES[key][level], mode = LEVEL_MODE[level];
  const attempts = level === 3 ? 6 : 1;
  let bestG = null, bestClues = total + 1;
  for (let a = 0; a < attempts && bestClues > target; a++) {
    const order = shuffle(Array.from({length:total}, (_, i) => i), rand);
    const g = sol.slice();
    let clues = total;
    for (const i of order) {
      if (clues <= target) break;
      if (!g[i]) continue;
      const j = total - 1 - i;
      const cells = (i === j || !g[j]) ? [i] : [i, j];
      const backup = cells.map(c => g[c]);
      cells.forEach(c => { g[c] = 0; });
      const ok = mode === 'none' ? countSolutions(spec, g, 2) === 1 : solvableBySingles(spec, g, mode === 'singles');
      if (ok) clues -= cells.length; else cells.forEach((c, k) => { g[c] = backup[k]; });
    }
    if (clues < bestClues) { bestClues = clues; bestG = g; }
  }
  return { spec, sol, puzzle: bestG, clues: bestClues, total };
}
