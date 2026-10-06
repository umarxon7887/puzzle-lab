export const LEVELS = [
  { ops:['+','-'], span:30, mulMax:10, targetEq:14, hideFrac:0.40 },
  { ops:['+','-','×'], span:40, mulMax:10, targetEq:19, hideFrac:0.52 },
  { ops:['+','-','×','÷'], span:60, mulMax:12, targetEq:24, hideFrac:0.62 },
  { ops:['+','-','×','÷'], span:90, mulMax:12, targetEq:29, hideFrac:0.70 }
];

const MAXV = 999;
const ok3 = (A, B, C) => [A, B, C].every(v => Number.isInteger(v) && v >= 1 && v <= MAXV);

function makeRng(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const randInt = (rand, lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

function applyOp(a, op, b) {
  if (op === '+') return a + b;
  if (op === '-') return a - b >= 1 ? a - b : null;
  if (op === '×') return a * b;
  return (b !== 0 && a % b === 0) ? a / b : null;
}

function genFree(op, span, mulMax, rand) {
  if (op === '+') { const A = randInt(rand,1,span), B = randInt(rand,1,span); return { A, B, C: A+B }; }
  if (op === '-') { const A = randInt(rand,10,10+span), maxB = Math.min(A-1, span); if (maxB<1) return null; const B = randInt(rand,1,maxB); return { A, B, C: A-B }; }
  if (op === '×') { const A = randInt(rand,2,mulMax), B = randInt(rand,2,mulMax); return { A, B, C: A*B }; }
  const B = randInt(rand,2,mulMax), C = randInt(rand,2,mulMax); return { A: B*C, B, C };
}

function genGivenA(A, op, span, mulMax, rand) {
  if (op === '+') { const B = randInt(rand,1,span); return { A, B, C: A+B }; }
  if (op === '-') { if (A<2) return null; const B = randInt(rand,1,A-1); return { A, B, C: A-B }; }
  if (op === '×') { const B = randInt(rand,2,mulMax); return { A, B, C: A*B }; }
  const divs = []; for (let d=2; d<=mulMax; d++) if (A%d===0 && A/d>=2) divs.push(d);
  if (!divs.length) return null; const B = divs[Math.floor(rand()*divs.length)]; return { A, B, C: A/B };
}

function genGivenB(B, op, span, mulMax, rand) {
  if (op === '+') { const A = randInt(rand,1,span); return { A, B, C: A+B }; }
  if (op === '-') { const C = randInt(rand,1,span); return { A: B+C, B, C }; }
  if (op === '×') { const A = randInt(rand,2,mulMax); return { A, B, C: A*B }; }
  const C = randInt(rand,2,mulMax); return { A: B*C, B, C };
}

function genGivenC(C, op, span, mulMax, rand) {
  if (op === '+') { if (C<2) return null; const A = randInt(rand,1,C-1); return { A, B: C-A, C }; }
  if (op === '-') { const A = C + randInt(rand,1,span); return { A, B: A-C, C }; }
  if (op === '×') {
    const divs = []; for (let d=2; d<=mulMax; d++) if (C%d===0 && C/d>=2 && C/d<=mulMax) divs.push(d);
    if (!divs.length) return null; const A = divs[Math.floor(rand()*divs.length)]; return { A, B: C/A, C };
  }
  const B = randInt(rand,2,mulMax); return { A: B*C, B, C };
}

function solveThird(known, op) {
  if (known.C === undefined) { const c = applyOp(known.A, op, known.B); return c===null ? null : { ...known, C:c }; }
  if (known.B === undefined) {
    let b;
    if (op === '+') b = known.C - known.A;
    else if (op === '-') b = known.A - known.C;
    else if (op === '×') b = (known.A!==0 && known.C%known.A===0) ? known.C/known.A : NaN;
    else b = (known.C!==0 && known.A%known.C===0) ? known.A/known.C : NaN;
    return (Number.isInteger(b) && b>=1) ? { ...known, B:b } : null;
  }
  let a;
  if (op === '+') a = known.C - known.B;
  else if (op === '-') a = known.C + known.B;
  else if (op === '×') a = (known.B!==0 && known.C%known.B===0) ? known.C/known.B : NaN;
  else a = known.B * known.C;
  return (Number.isInteger(a) && a>=1) ? { ...known, A:a } : null;
}

function tryPlace(gridType, gridOp, gridVal, op, orient, ar, ac, role, rand, span, mulMax, LIMIT) {
  let cells;
  if (orient === 'H') {
    const startC = role===0 ? ac : role===2 ? ac-2 : ac-4;
    if (startC<1 || startC+4>=LIMIT-1 || ar<1 || ar>=LIMIT-1) return null;
    cells = [0,1,2,3,4].map(i => ({ r:ar, c:startC+i }));
  } else {
    const startR = role===0 ? ar : role===2 ? ar-2 : ar-4;
    if (startR<1 || startR+4>=LIMIT-1 || ac<1 || ac>=LIMIT-1) return null;
    cells = [0,1,2,3,4].map(i => ({ r:startR+i, c:ac }));
  }
  const before = orient==='H' ? {r:cells[0].r, c:cells[0].c-1} : {r:cells[0].r-1, c:cells[0].c};
  const after  = orient==='H' ? {r:cells[4].r, c:cells[4].c+1} : {r:cells[4].r+1, c:cells[4].c};
  if (gridType[before.r+','+before.c] || gridType[after.r+','+after.c]) return null;

  const roles = ['A','op','B','eq','C'];
  const known = {};
  for (let i=0; i<5; i++) {
    const k = cells[i].r+','+cells[i].c, rl = roles[i], t = gridType[k];
    if (rl==='op' || rl==='eq') { if (t) return null; }
    else if (t==='num') known[rl] = gridVal[k];
    else if (t) return null;
  }
  const kcount = Object.keys(known).length;
  let vals;
  if (kcount===0) vals = genFree(op, span, mulMax, rand);
  else if (kcount===1) {
    if (known.A!==undefined) vals = genGivenA(known.A, op, span, mulMax, rand);
    else if (known.B!==undefined) vals = genGivenB(known.B, op, span, mulMax, rand);
    else vals = genGivenC(known.C, op, span, mulMax, rand);
  } else if (kcount===2) {
    vals = solveThird(known, op);
  } else {
    vals = (applyOp(known.A, op, known.B) === known.C) ? known : null;
  }
  if (!vals || !ok3(vals.A, vals.B, vals.C)) return null;

  for (let i=0; i<5; i++) {
    const k = cells[i].r+','+cells[i].c, rl = roles[i];
    if (rl==='op') { gridType[k]='op'; gridOp[k]=op; }
    else if (rl==='eq') { gridType[k]='eq'; }
    else { gridType[k]='num'; gridVal[k]=vals[rl]; }
  }
  return { a:cells[0], b:cells[2], c:cells[4], op };
}

export function buildCrossword(level, seed) {
  const { ops, span, mulMax, targetEq, hideFrac } = LEVELS[level];
  const rand = makeRng(seed);
  const LIMIT = 65, CENTER = 32;
  const gridType = {}, gridOp = {}, gridVal = {};
  const equations = [];

  let first = null;
  for (let t=0; t<40 && !first; t++) {
    first = tryPlace(gridType, gridOp, gridVal, ops[Math.floor(rand()*ops.length)], 'H', CENTER, CENTER, 0, rand, span, mulMax, LIMIT);
  }
  if (first) equations.push(first);

  let attempts = 0;
  while (equations.length < targetEq && attempts < 2500) {
    attempts++;
    const numKeys = Object.keys(gridType).filter(k => gridType[k]==='num');
    if (!numKeys.length) break;
    const [ar, ac] = numKeys[Math.floor(rand()*numKeys.length)].split(',').map(Number);
    const role = [0,2,4][Math.floor(rand()*3)];
    const orient = rand()<0.5 ? 'H' : 'V';
    const op = ops[Math.floor(rand()*ops.length)];
    const res = tryPlace(gridType, gridOp, gridVal, op, orient, ar, ac, role, rand, span, mulMax, LIMIT);
    if (res) equations.push(res);
  }

  let minR=1e9,maxR=-1e9,minC=1e9,maxC=-1e9;
  Object.keys(gridType).forEach(k => { const [r,c]=k.split(',').map(Number); minR=Math.min(minR,r); maxR=Math.max(maxR,r); minC=Math.min(minC,c); maxC=Math.max(maxC,c); });

  const numKeysAll = Object.keys(gridType).filter(k => gridType[k]==='num');
  const known = new Set(numKeysAll);
  function fullyDeduced(knownSet) {
    const kn = new Set(knownSet);
    let progress = true;
    while (progress) {
      progress = false;
      for (const eq of equations) {
        const ka = eq.a.r+','+eq.a.c, kb = eq.b.r+','+eq.b.c, kc = eq.c.r+','+eq.c.c;
        const ha=kn.has(ka), hb=kn.has(kb), hc=kn.has(kc), cnt=[ha,hb,hc].filter(Boolean).length;
        if (cnt===2) { if(!ha){kn.add(ka);progress=true;} else if(!hb){kn.add(kb);progress=true;} else if(!hc){kn.add(kc);progress=true;} }
      }
    }
    return kn.size === numKeysAll.length;
  }
  const target = Math.max(1, Math.round(numKeysAll.length * hideFrac));
  const order = numKeysAll.slice();
  for (let i=order.length-1; i>0; i--) { const j=Math.floor(rand()*(i+1)); [order[i],order[j]]=[order[j],order[i]]; }
  let hidden = 0;
  for (const k of order) {
    if (hidden >= target) break;
    known.delete(k);
    if (fullyDeduced(known)) hidden++; else known.add(k);
  }

  return { gridType, gridOp, gridVal, equations, bbox:{minR,maxR,minC,maxC}, given: known, hiddenCount: hidden, totalCells: numKeysAll.length, eqCount: equations.length };
}
