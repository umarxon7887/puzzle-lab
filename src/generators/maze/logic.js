import { makeRng } from '../../core/utils.js';

export const DIRS = [[0,-1],[1,0],[0,1],[-1,0]];
export const HEROES = ['🦸','🧒','👧','🐱','🐶','🐰','🦊','🐻','🐼','🐸','🤖','🚀'];
export const GOALS  = ['🏁','🏠','🏰','🍎','🍯','🥕','🎁','⭐','🌳','🦴','🧀','🍦'];
export const LEVELS = [[10,14],[20,28],[35,49],[60,85]];

function regular(n, rot) {
  return Array.from({length:n}, (_, i) => { const t = rot + i*2*Math.PI/n; return [Math.cos(t), Math.sin(t)]; });
}
function starPts() {
  const p = [];
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.42 : 1, t = -Math.PI/2 + i*Math.PI/5; p.push([r*Math.cos(t), r*Math.sin(t)]); }
  return p;
}
function heartPts() {
  const p = [];
  for (let i = 0; i < 72; i++) {
    const t = i*2*Math.PI/72;
    p.push([16*Math.pow(Math.sin(t),3), -(13*Math.cos(t) - 5*Math.cos(2*t) - 2*Math.cos(3*t) - Math.cos(4*t))]);
  }
  const xs = p.map(q => q[0]), ys = p.map(q => q[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const sc = 2 / Math.max(maxX - minX, maxY - minY), cx = (minX+maxX)/2, cy = (minY+maxY)/2;
  return p.map(([x, y]) => [(x-cx)*sc, (y-cy)*sc]);
}

export const SHAPES = {
  rect: null,
  circle: regular(48, 0),
  star: starPts(),
  heart: heartPts(),
  triangle: [[0,-1],[1,0.75],[-1,0.75]],
  diamond: [[0,-1],[1,0],[0,1],[-1,0]],
  house: [[0,-1],[1,-0.15],[0.72,-0.15],[0.72,0.9],[-0.72,0.9],[-0.72,-0.15],[-1,-0.15]],
  hexagon: regular(6, Math.PI/6)
};

function inPoly(x, y, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
  }
  return c;
}

function makeMask(W, H, shape) {
  const all = Array.from({length:H}, () => Array(W).fill(true));
  const poly = SHAPES[shape];
  if (!poly) return all;
  const m = Math.min(W, H) / 2;
  const inn = Array.from({length:H}, (_, y) => Array.from({length:W}, (_, x) => inPoly((x + 0.5 - W/2)/m, (y + 0.5 - H/2)/m, poly)));
  const comp = Array.from({length:H}, () => Array(W).fill(-1));
  let best = -1, bestSize = 0, id = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inn[y][x] || comp[y][x] >= 0) continue;
    let size = 0; const q = [[x, y]]; comp[y][x] = id;
    for (let i = 0; i < q.length; i++) {
      const [cx, cy] = q[i]; size++;
      DIRS.forEach(([dx, dy]) => {
        const nx = cx+dx, ny = cy+dy;
        if (nx>=0 && ny>=0 && nx<W && ny<H && inn[ny][nx] && comp[ny][nx] < 0) { comp[ny][nx] = id; q.push([nx, ny]); }
      });
    }
    if (size > bestSize) { bestSize = size; best = id; }
    id++;
  }
  if (bestSize < 12) return all;
  return comp.map(row => row.map(c => c === best));
}

export function buildMaze(W, H, seed, shape) {
  const rand = makeRng(seed);
  const inn = makeMask(W, H, shape);
  const isIn = (x, y) => x >= 0 && y >= 0 && x < W && y < H && inn[y][x];
  const cells = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inn[y][x]) cells.push([x, y]);
  
  const open = Array.from({length:H}, () => Array.from({length:W}, () => [false,false,false,false]));
  const seen = Array.from({length:H}, () => Array(W).fill(false));
  
  const s0 = cells[Math.floor(rand()*cells.length)];
  const stack = [s0];
  seen[s0[1]][s0[0]] = true;
  
  while (stack.length) {
    const [x, y] = stack[stack.length-1];
    const nb = [];
    DIRS.forEach(([dx,dy], d) => { if (isIn(x+dx, y+dy) && !seen[y+dy][x+dx]) nb.push(d); });
    if (!nb.length) { stack.pop(); continue; }
    const d = nb[Math.floor(rand()*nb.length)];
    const nx = x+DIRS[d][0], ny = y+DIRS[d][1];
    open[y][x][d] = true;
    open[ny][nx][(d+2)%4] = true;
    seen[ny][nx] = true;
    stack.push([nx, ny]);
  }

  function bfs(fx, fy) {
    const dist = Array.from({length:H}, () => Array(W).fill(-1));
    const prev = {};
    dist[fy][fx] = 0;
    const q = [[fx, fy]];
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      DIRS.forEach(([dx,dy], d) => {
        if (!open[y][x][d]) return;
        const nx = x+dx, ny = y+dy;
        if (dist[ny][nx] < 0) { dist[ny][nx] = dist[y][x]+1; prev[nx+','+ny] = [x, y]; q.push([nx, ny]); }
      });
    }
    return { q, prev };
  }

  const isEdge = (x, y) => DIRS.some(([dx,dy]) => !isIn(x+dx, y+dy));
  const mx = cells.reduce((t, c) => t + c[0], 0) / cells.length;
  const my = cells.reduce((t, c) => t + c[1], 0) / cells.length;
  const dc = c => Math.hypot(c[0]-mx, c[1]-my);
  const edge = cells.filter(c => isEdge(c[0], c[1]));
  const maxD = Math.max(...edge.map(dc));
  const far = edge.filter(c => dc(c) >= 0.8*maxD);
  const a = far[Math.floor(rand()*far.length)];
  let e = null, bestD = -1;
  far.forEach(c => { const d = Math.hypot(c[0]-a[0], c[1]-a[1]); if (c !== a && d > bestD) { bestD = d; e = c; } });
  if (!e) e = edge.find(c => c !== a) || cells.find(c => c !== a);
  
  const b = bfs(a[0], a[1]);
  const outDir = c => {
    let best = 0, bs = -Infinity;
    for (let d = 0; d < 4; d++) {
      if (isIn(c[0]+DIRS[d][0], c[1]+DIRS[d][1])) continue;
      const sc = DIRS[d][0]*(c[0]-mx) + DIRS[d][1]*(c[1]-my);
      if (sc > bs) { bs = sc; best = d; }
    }
    return best;
  };

  const path = [];
  for (let c = e; c; c = b.prev[c[0]+','+c[1]]) path.push(c);
  path.reverse();
  
  let minX = W, maxX = 0, minY = H, maxY = 0;
  cells.forEach(([x, y]) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); });
  
  return { isIn, open, start:a, end:e, sDir:outDir(a), eDir:outDir(e), path, bbox:{minX, maxX, minY, maxY}, count:cells.length };
}
