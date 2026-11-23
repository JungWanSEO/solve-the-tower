// 数学II 문제 틀과 연속기 묶음의 독립 검산.
// 생성기가 낸 "문제에 보이는 글"만 읽어서 답을 처음부터 다시 계산하고, 생성기의 정답·오답과 대조합니다.
// (생성기 안의 계산을 그대로 따라 하지 않습니다)
import fs from 'node:fs';
const ROOT = new URL('../', import.meta.url).pathname;
globalThis.document = { documentElement: {} };
const { GENERATORS, CHAINS } = await import(ROOT + 'js/generators.js');
const UNITS = ['math2-expr', 'math2-complex', 'math2-coord', 'math2-trig', 'math2-explog', 'math2-calc'];
const RUNS = 3000;
const SLOW = { chord: 300, compose: 60, period: 300, extrema: 150, interval2: 300, cubicx: 150, area2: 400, area: 400, integral: 600, pdist: 800 }; // 수치로 찾는 검사는 횟수를 줄입니다
const figureProblems = (figure, it, extra = {}) => { const out = []; for (const v of Object.values(figure || {})) { const f = String(v).replace(/\{(\w+)\}/g, (m, key) => (key in extra ? extra[key] : key in it ? it[key] : m)); if (/\{[A-Za-z]\w*\}|undefined|NaN|null,null/.test(f)) out.push('bad figure label ' + f.slice(0, 60)); if (f.startsWith('{')) { try { const P = JSON.parse(f); if (!(P.r[1] > P.r[0] && P.r[3] > P.r[2]) || P.r.some((n) => !Number.isFinite(n))) out.push('bad plot range'); } catch (e) { out.push('plot is not JSON'); } } } return out; };

const SUP = { '²': 2, '³': 3, '⁴': 4, '⁵': 5, '⁶': 6, '⁷': 7 };
const clean = (s) => String(s).replace(/−/g, '-');
// 식을 자바스크립트 식으로 바꿉니다. 예: "(2x − 3)³" → "(2*x-3)**3"
const js = (s) => clean(s)
  .replace(/([xy])([²³⁴⁵⁶⁷])/g, (m, v, c) => `(${v}**${SUP[c]})`) // −x² 은 −(x²)
  .replace(/[²³⁴⁵⁶⁷]/g, (c) => `**${SUP[c]}`)
  .replace(/(\d)x/g, '$1*x')
  .replace(/(\d)\(x\*\*/g, '$1*(x**')
  .replace(/(\d)\(/g, '$1*(')
  .replace(/\)\(/g, ')*(')
  .replace(/x\(/g, 'x*(');
const FN = new Map(); // 같은 식은 한 번만 함수로 만듭니다
const ev = (s, x) => { let f = FN.get(s); if (!f) { f = Function('x', `return (${js(s)});`); FN.set(s, f); } return f(x); };
const XS = [-3.7, -2.2, -1.3, -0.4, 0.6, 1.9, 2.8, 4.1];
const near = (a, b) => Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
const sameExpr = (p, q) => XS.every((x) => near(ev(p, x), ev(q, x)));
const N = (s) => Number(clean(s));
const C = (n, r) => { let v = 1; for (let k = 0; k < r; k++) v = (v * (n - k)) / (k + 1); return Math.round(v); };
const SUBS = '₀₁₂₃₄₅₆₇₈₉';
// "(x − 2)⁵" 을 실제로 곱해서 계수 배열(낮은 차수부터)을 만듭니다.
const expandPower = (expr) => {
  const m = clean(expr).match(/^\(x ([+-]) (\d+)\)(.)$/);
  const a = (m[1] === '-' ? -1 : 1) * Number(m[2]);
  let co = [1];
  for (let k = 0; k < SUP[m[3]]; k++) { const next = Array(co.length + 1).fill(0); co.forEach((c, d) => { next[d + 1] += c; next[d] += c * a; }); co = next; }
  return { co, a, n: SUP[m[3]] };
};
const degOf = (term) => (term === 'x' ? 1 : SUP[term.slice(1)]);
// x > 0 에서의 최솟값을 수치로 찾습니다 (볼록한 식이라 삼분법으로 충분합니다)
const minOf = (expr) => { let lo = 1e-3, hi = 200; for (let k = 0; k < 300; k++) { const a = lo + (hi - lo) / 3, b = hi - (hi - lo) / 3; if (ev(expr, a) < ev(expr, b)) hi = b; else lo = a; } return { x: (lo + hi) / 2, y: ev(expr, (lo + hi) / 2) }; };
const rootOf = (div) => { const m = clean(div).match(/^x ([+-]) (\d+)$/); return (m[1] === '-' ? 1 : -1) * Number(m[2]); };

// ---- 複素数と方程式 ----
const num = (s) => Function(`return (${clean(s).replace(/(\d+)?√(\d+)/g, (m, k, r) => `${k ? k + '*' : ''}Math.sqrt(${r})`)});`)();
// "3 − 2i", "−i", "2√3i", "5" 를 [실수부분, 허수부분] 으로 읽습니다
const parseC = (text) => {
  const t = clean(text).replace(/ /g, '');
  if (!t.endsWith('i')) return [num(t), 0];
  const body = t.slice(0, -1);
  let cut = Math.max(body.lastIndexOf('+'), body.lastIndexOf('-'));
  if (cut < 0) cut = 0;
  const re = body.slice(0, cut); const im = body.slice(cut);
  const coef = im === '' || im === '+' ? 1 : im === '-' ? -1 : num(im);
  return [re === '' ? 0 : num(re), coef];
};
const cEq = (a, b) => near(a[0], b[0]) && near(a[1], b[1]);
const cMul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cDiv = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
// "ax² + bx + c = 0" 에서 a, b, c 를 값 대입으로 읽습니다
const quadOf = (eq) => { const f = (x) => ev(eq.replace(' = 0', ''), x); const c = f(0); const a = (f(1) + f(-1)) / 2 - c; const b = (f(1) - f(-1)) / 2; return { a, b, c }; };
// 이차방정식의 두 해 (복소수)
const quadRoots = ({ a, b, c }) => { const D = b * b - 4 * a * c; const sq = D >= 0 ? [Math.sqrt(D), 0] : [0, Math.sqrt(-D)]; return [[(-b + sq[0]) / (2 * a), sq[1] / (2 * a)], [(-b - sq[0]) / (2 * a), -sq[1] / (2 * a)]]; };
const cmp = { '>': (a, b) => a > b, '<': (a, b) => a < b, '≧': (a, b) => a >= b, '≦': (a, b) => a <= b };
const kPred = (o) => { const m = clean(o).match(/^k (>|<|≧|≦) (-?\d+)$/); return (k) => cmp[m[1]](k, Number(m[2])); };
const KS = []; for (let k = -160; k <= 160; k += 0.25) KS.push(k);
const intRoots = (expr) => { const out = []; for (let x = -30; x <= 30; x++) if (near(ev(expr, x), 0) && Math.abs(ev(expr, x)) < 1e-9) out.push(x); return out; };

const OK = {
  cplxcalc: (i, o, par) => { const [p, q] = [parseC(i.p), parseC(i.q)]; const want = par.op === 'add' ? [p[0] + q[0], p[1] + q[1]] : par.op === 'sub' ? [p[0] - q[0], p[1] - q[1]] : par.op === 'mul' ? cMul(p, q) : cDiv(p, q); return cEq(parseC(o), want); },
  negsqrt: (i, o, par) => { const t = clean(i.expr); let m;
    if (par.ask === 'prod') { m = t.match(/^√\(-(\d+)\) × √\(-(\d+)\)$/); return cEq(parseC(o), cMul([0, Math.sqrt(+m[1])], [0, Math.sqrt(+m[2])])); }
    m = t.match(/^√\(-(\d+)\)$/); return cEq(parseC(o), [0, Math.sqrt(+m[1])]); },
  cplxroot: (i, o) => { const q = quadOf(i.eq); const m = clean(o).match(/^x = (-?\d+) ± (\d*)i$/); if (!m) return false; const im = m[2] === '' ? 1 : Number(m[2]); const [r] = quadRoots(q); return q.b * q.b - 4 * q.a * q.c < 0 && cEq([Number(m[1]), im], [r[0], Math.abs(r[1])]); },
  imagk: (i, o, par) => { const f = (x) => ev(i.eq.replace(' + k = 0', ''), x); const b = f(1) - 1; if (!near(f(0), 0)) throw new Error('constant'); const pred = kPred(o); return KS.every((k) => pred(k) === (par.ask === 'imag' ? b * b - 4 * k < 0 : b * b - 4 * k > 0)); },
  vieta: (i, o, par) => { const [r1, r2] = quadRoots(quadOf(i.eq)); const s1 = [r1[0] + r2[0], r1[1] + r2[1]]; const pr = cMul(r1, r2); const s2a = cMul(r1, r1); const s2b = cMul(r2, r2);
    const want = par.ask === 'sum' ? s1 : par.ask === 'prod' ? pr : [s2a[0] + s2b[0], s2a[1] + s2b[1]]; return near(want[1], 0) && near(num(o), want[0]); },
  remthm: (i, o) => { // (P(x) − 나머지) ÷ (x − k) 가 이차식이어야 합니다: 세 번째 차이가 0
    const k = rootOf(i.div); const r = N(o); const xs = [0, 1, 2, 3, 4, 5, 6].map((d) => k + 1 + d); const g = xs.map((x) => (ev(i.expr, x) - r) / (x - k));
    const d1 = g.slice(1).map((v, n) => v - g[n]); const d2 = d1.slice(1).map((v, n) => v - d1[n]); const d3 = d2.slice(1).map((v, n) => v - d2[n]); return d3.every((v) => near(v, 0) && Math.abs(v) < 1e-7); },
  factthm: (i, o) => near(ev(i.expr.replace('ax²', `(${clean(o)})*x²`), rootOf(i.div)), 0) && Math.abs(ev(i.expr.replace('ax²', `(${clean(o)})*x²`), rootOf(i.div))) < 1e-9,
  higheq: (i, o) => { const expr = i.eq.replace(' = 0', ''); const rs = clean(o).replace('x = ', '').split(', ').map(Number); const all = intRoots(expr); return rs.length === 3 && new Set(rs).size === 3 && all.length === 3 && rs.every((r) => all.includes(r)) && rs.join() === [...rs].sort((a, b) => a - b).join(); },
  cubeexpand: (i, o) => sameExpr(i.expr, o) && !/[()]/.test(o),
  cubefactor: (i, o) => sameExpr(i.expr, o) && /^\(x [+−] \d+\)\(x² /.test(o),
  binom: (i, o) => { const { co } = expandPower(i.expr); return N(o) === co[degOf(i.term)]; },
  polydiv: (i, o, par) => {
    if (par.ask === 'rem') return near(ev(i.expr, rootOf(i.div)), N(o));
    const rest = XS.map((x) => ev(i.expr, x) - ev(o, x) * ev(i.div, x)); // 몫이 맞으면 나머지가 x 와 상관없는 상수
    return rest.every((r) => near(r, rest[0])) && !/x²/.test(o);
  },
  fracexpr: (i, o) => XS.every((x) => near(ev(i.top, x) / ev(i.bottom, x), ev(o.replace(')/(', ')*(1/(') .replace(/\)$/, '))'), x))) && lowest(o),
  identity: (i, o, par) => { // a(x + m) + b(x − n) = px + q 를 x = n, x = −m 을 넣어 풉니다
    const m = clean(i.right).match(/^a\(x \+ (\d+)\) \+ b\(x - (\d+)\)$/); const [mm, nn] = [Number(m[1]), Number(m[2])];
    const a = ev(i.left, nn) / (nn + mm); const b = ev(i.left, -mm) / (-mm - nn);
    return near(N(o), par.ask === 'a' ? a : b);
  },
  amgm: (i, o) => near(minOf(i.expr).y, N(o)),
};
// 분수식이 더 약분되지 않는지: 분자와 분모의 근이 달라야 합니다
function lowest(o) { const m = clean(o).match(/^\(x ([+-]) (\d+)\)\/\(x ([+-]) (\d+)\)$/); return !!m && !(m[1] === m[3] && m[2] === m[4]); }

const CHAIN_OK = {
  vieta: (it) => { const q = quadOf(it.eq); const [r1, r2] = quadRoots(q); const pr = cMul(r1, r2); const a = cMul(r1, r1); const b = cMul(r2, r2);
    return q.a === 1 && near(N(it.steps[0].answer), r1[0] + r2[0]) && near(N(it.steps[1].answer), pr[0]) && near(N(it.steps[2].answer), a[0] + b[0]); },
  cubic: (it) => { const all = intRoots(it.expr); const t = rootOf(it.div);
    return all.length === 3 && !all.includes(t) && near(N(it.steps[0].answer), ev(it.expr, t)) && N(it.steps[1].answer) === Math.min(...all) && N(it.steps[2].answer) === Math.max(...all); },
  binom: (it) => { const { co, a, n } = expandPower(it.expr); const k = degOf(it.term);
    return [C(n, k), a ** (n - k), co[k]].map((v, s) => N(it.steps[s].answer) === v).every(Boolean) && it.comb === `${SUBS[n]}C${SUBS[k]}` && it.rest === n - k && N(it.a) === a && it.n === n && it.k === k; },
  amgm: (it) => { const best = minOf(it.expr); const m = clean(it.expr).match(/^x \+ (\d+)\/x ([+-]) (\d+)$/);
    return N(it.steps[0].answer) === Number(m[1]) && it.c === Number(m[1]) && near(best.y, N(it.steps[1].answer)) && Math.abs(best.x - N(it.steps[2].answer)) < 1e-3 && N(it.d) === (m[2] === '-' ? -1 : 1) * Number(m[3]); },
};

// ---- 図形と方程式 ----
const js2 = (s) => js(s).replace(/(\d)y/g, '$1*y');
const FN2 = new Map();
const ev2 = (s, x, y) => { let f = FN2.get(s); if (!f) { f = Function('x', 'y', `return (${js2(s)});`); FN2.set(s, f); } return f(x, y); };
const parsePt = (o) => { const m = clean(o).match(/^\((-?[\d/]+), (-?[\d/]+)\)$/); return [num(m[1]), num(m[2])]; };
// "… = 0" 또는 "… = c" 꼴의 직선에서 f(x, y) = 좌변 − 우변
const sideOf = (eq) => { const [l, r] = eq.split(' = '); return (x, y) => ev2(l, x, y) - num(r); };
const lineCo = (f) => { const c = f(0, 0); return { a: f(1, 0) - c, b: f(0, 1) - c, c }; };
// 점에서 직선까지의 거리를 "직선 위의 점 가운데 가장 가까운 점" 으로 구합니다 (공식을 쓰지 않습니다)
const distTo = (f, px, py) => { const { a, b, c } = lineCo(f); const q0 = b !== 0 ? [0, -c / b] : [-c / a, 0]; const d = (t) => Math.hypot(q0[0] + t * b - px, q0[1] - t * a - py);
  let lo = -400, hi = 400; for (let k = 0; k < 300; k++) { const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3; if (d(m1) < d(m2)) hi = m2; else lo = m1; } return d((lo + hi) / 2); };
const circleOf = (eq) => { const f = sideOf(eq); const cx = -(f(1, 0) - f(-1, 0)) / 4; const cy = -(f(0, 1) - f(0, -1)) / 4; return { cx, cy, r: Math.sqrt(-f(cx, cy)) }; };
// 원과 직선의 두 교점 사이의 거리를 원 위를 한 바퀴 돌며 수치로 찾습니다
const chordLen = (circ, f) => { const g = (t) => f(circ.cx + circ.r * Math.cos(t), circ.cy + circ.r * Math.sin(t)); const hits = []; const n = 7200;
  for (let k = 0; k < n; k++) { let a = (2 * Math.PI * k) / n + 1e-7, b = (2 * Math.PI * (k + 1)) / n + 1e-7; if (g(a) * g(b) > 0) continue; for (let j = 0; j < 80; j++) { const m = (a + b) / 2; if (g(a) * g(m) <= 0) b = m; else a = m; } hits.push(a); }
  if (hits.length !== 2) throw new Error('intersections ' + hits.length); return Math.hypot(circ.r * (Math.cos(hits[0]) - Math.cos(hits[1])), circ.r * (Math.sin(hits[0]) - Math.sin(hits[1]))); };
const vEq = (p, q) => near(p[0], q[0]) && near(p[1], q[1]);
// ---- 三角関数 ----
const pv = (s) => Function(`return (${clean(s).replace(/(\d)π/g, '$1*Math.PI').replace(/π/g, 'Math.PI')});`)();
const trigFn = (expr) => { const m = clean(expr).match(/^y = (-?\d*)(sin|cos)(?: (\d+)x|\((\d*)x\/(\d+)\))(?: ([+-]) (\d+))?$/); const a = m[1] === '' ? 1 : m[1] === '-' ? -1 : Number(m[1]); const k = m[3] ? Number(m[3]) : (m[4] === '' ? 1 : Number(m[4])) / Number(m[5]); const c = m[6] ? (m[6] === '-' ? -1 : 1) * Number(m[7]) : 0; return (x) => a * Math[m[2]](k * x) + c; };
const thetaOf = (i) => (String(i.range || 'π/2').startsWith('π/2') ? Math.PI - Math.asin(num(i.sin)) : Math.asin(num(i.sin)));
// ---- 指数・対数 ----
const UNSUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-', '⁺': '+', 'ˣ': 'x' };
const unsup = (s) => String(s).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ˣ]+/g, (run) => `**(${[...run].map((ch) => UNSUP[ch]).join('')})`);
const UNSUB = '₀₁₂₃₄₅₆₇₈₉';
const logVal = (t) => { const m = clean(t).match(/^log([₀-₉]+) (.+)$/); const base = Number([...m[1]].map((ch) => UNSUB.indexOf(ch)).join('')); return { base, arg: m[2] }; };
const logNum = (t) => { const { base, arg } = logVal(t); return Math.log(num(arg)) / Math.log(base); };
const xPred = (o) => { const t = clean(o); let m; if ((m = t.match(/^0 < x < (\d+)$/))) return (x) => x > 0 && x < +m[1]; if ((m = t.match(/^x (>|<|≧|≦) (-?\d+)$/))) return (x) => cmp[m[1]](x, +m[2]); throw new Error('range ' + o); };
// ---- 微分・積分 ----
const rhs = (s) => String(s).replace(/^y = /, '');
const dAt = (expr, x) => (ev(expr, x + 1e-5) - ev(expr, x - 1e-5)) / 2e-5;
const simpson = (g, a, b) => { const n = 2000; const h = (b - a) / n; let sum = g(a) + g(b); for (let k = 1; k < n; k++) sum += g(a + k * h) * (k % 2 ? 4 : 2); return (sum * h) / 3; };
// f′ 의 부호가 바뀌는 곳을 찾아 [극대가 되는 x 들, 극소가 되는 x 들] 을 돌려줍니다
const turning = (expr) => { const out = { max: [], min: [] }; for (let k = -9000; k < 9000; k++) { const a = k / 1000 + 0.00037, b = a + 0.001; const da = dAt(expr, a), db = dAt(expr, b); if (da > 0 && db < 0) out.max.push(Math.round((a + b) / 2)); if (da < 0 && db > 0) out.min.push(Math.round((a + b) / 2)); } return out; };
const zeros = (expr) => { const out = []; for (let x = -12; x <= 12; x++) if (Math.abs(ev(expr, x)) < 1e-9) out.push(x); return out; };

Object.assign(OK, {
  dist: (i, o) => near(num(o), Math.hypot(i.x2 - i.x1, i.y2 - i.y1)),
  divide: (i, o, par) => { const P = parsePt(o); const [A, B] = [i.pa, i.pb];
    if (par.ask === 'cent') return vEq([3 * P[0], 3 * P[1]], [A[0] + B[0] + i.pc[0], A[1] + B[1] + i.pc[1]]);
    if (par.ask === 'out') return vEq([(P[0] - A[0]) * i.n, (P[1] - A[1]) * i.n], [(P[0] - B[0]) * i.m, (P[1] - B[1]) * i.m]);
    return vEq([(P[0] - A[0]) * i.n, (P[1] - A[1]) * i.n], [(B[0] - P[0]) * i.m, (B[1] - P[1]) * i.m]); },
  lineeq: (i, o, par) => { if (!/^y = /.test(o)) return false; const L = (x) => ev(rhs(o), x); if (!near(L(i.pa[0]), i.pa[1])) return false; return par.ask === 'two' ? near(L(i.pb[0]), i.pb[1]) : near(L(1) - L(0), i.slope); },
  slope: (i, o, par) => { const { a, b } = lineCo(sideOf(i.line)); const m = -a / b; return par.ask === 'para' ? near(num(o), m) : near(num(o) * m, -1); },
  pdist: (i, o) => Math.abs(num(o) - distTo(sideOf(i.line), i.px, i.py)) < 1e-6,
  circleeq: (i, o, par) => { const c = circleOf(i.eq); return par.ask === 'center' ? vEq(parsePt(o), [c.cx, c.cy]) : near(N(o), c.r); },
  chord: (i, o) => Math.abs(N(o) - chordLen(circleOf(i.circle), sideOf(i.line))) < 1e-6,
  region: (i, o) => { const m = clean(i.ineq).match(/^y (<|>) (.+)$/); const [x, y] = parsePt(o); return cmp[m[1]](y, ev(m[2], x)); },
  radian: (i, o, par) => (par.dir === 'from' ? /°$/.test(o) && near(parseFloat(o), (pv(i.rad) * 180) / Math.PI) : near(pv(o), (i.deg * Math.PI) / 180)),
  sectorq: (i, o, par) => { const th = pv(i.theta); return near(pv(o), par.ask === 'arc' ? (2 * Math.PI * i.r * th) / (2 * Math.PI) : (Math.PI * i.r * i.r * th) / (2 * Math.PI)); },
  trigval: (i, o) => { const m = i.expr.match(/^(sin|cos|tan)\((.+)\)$/); return Math.abs(Math[m[1]](pv(m[2])) - num(o)) < 1e-9 && near(pv(m[2]), (i.deg * Math.PI) / 180) && i.label === m[2]; },
  period: (i, o, par) => { const f = trigFn(i.expr); const xs = []; for (let k = 0; k < 4000; k++) xs.push(k * 0.0123);
    if (par.ask === 'max') return Math.abs(Math.max(...xs.concat(xs.map((x) => -x)).map(f)) - N(o)) < 1e-3;
    const T = pv(o); const repeats = (t) => xs.every((x) => Math.abs(f(x + t) - f(x)) < 1e-7); return T > 0 && repeats(T) && [2, 3, 4, 5, 6].every((k) => !repeats(T / k)); },
  trigeq2: (i, o) => { const m = clean(i.eq).match(/^(sin|cos) θ = (.+)$/); const want = num(m[2]); const got = clean(o).replace('θ = ', '').split(', ').map(pv);
    let count = 0; for (let k = 0; k < 360; k++) if (Math.abs(Math[m[1]]((k * Math.PI) / 180) - want) < 1e-9) count++;
    return got.length === count && got.every((t) => t >= 0 && t < 2 * Math.PI && Math.abs(Math[m[1]](t) - want) < 1e-9) && got[0] < got[1]; },
  addition: (i, o, par) => { const al = Math.asin(num(i.sa)); const be = Math.acos(num(i.cb)); const v = { 'sin+': Math.sin(al + be), 'sin-': Math.sin(al - be), 'cos+': Math.cos(al + be), 'cos-': Math.cos(al - be) }[par.ask]; return Math.abs(v - num(o)) < 1e-9 && i.expr.startsWith(par.ask.slice(0, 3)); },
  double: (i, o, par) => { const th = thetaOf(i); return Math.abs((par.ask === 'sin2' ? Math.sin(2 * th) : Math.cos(2 * th)) - num(o)) < 1e-9; },
  compose: (i, o) => { const m = clean(i.expr).match(/^(\d*)sin θ ([+-]) (\d*)cos θ$/); const a = m[1] === '' ? 1 : +m[1]; const b = (m[2] === '-' ? -1 : 1) * (m[3] === '' ? 1 : +m[3]); let best = -1e9; for (let k = 0; k < 200000; k++) { const t = (k * 2 * Math.PI) / 200000; best = Math.max(best, a * Math.sin(t) + b * Math.cos(t)); } return Math.abs(best - num(o)) < 1e-6; },
  exprule: (i, o) => near(Function(`return (${unsup(i.expr).replace(/×/g, '*').replace(/÷/g, '/')});`)(), num(o)),
  root: (i, o, par) => { if (par.ask === 'frac') return near(i.base ** num(i.exp), num(o)); const m = i.expr.match(/^(∛|∜|⁵√)(\d+)$/); return near(Number(m[2]) ** (1 / { '∛': 3, '∜': 4, '⁵√': 5 }[m[1]]), N(o)); },
  expeq: (i, o, par) => { const [l, r] = i.eq.split(/ (?:=|<|>) /); const f = (x) => Function('x', `return (${unsup(l)});`)(x); const R = num(r);
    if (par.ask === 'eq') { const m = clean(o).match(/^x = (-?\d+)$/); return !!m && near(f(Number(m[1])), R); }
    const op = i.eq.includes(' < ') ? '<' : '>'; const pred = xPred(o); for (let x = -12; x <= 12; x += 0.25) if (pred(x) !== cmp[op](f(x), R) && !near(f(x), R)) return false; return true; },
  logval: (i, o) => Math.abs(logNum(i.expr) - num(o)) < 1e-9,
  logrule: (i, o, par) => { const parts = clean(i.expr).split(par.ask === 'sum' ? ' + ' : ' - '); const v = par.ask === 'sum' ? logNum(parts[0]) + logNum(parts[1]) : logNum(parts[0]) - logNum(parts[1]); return parts.length === 2 && Math.abs(v - N(o)) < 1e-9; },
  logeq: (i, o, par) => { const [l, r] = i.eq.split(/ (?:=|<|>) /); const { base, arg } = logVal(l); const g = (x) => ev(arg.replace(/^\((.*)\)$/, '$1'), x);
    if (par.ask === 'eq') { const m = clean(o).match(/^x = (-?\d+)$/); return !!m && g(+m[1]) > 0 && Math.abs(Math.log(g(+m[1])) / Math.log(base) - Number(r)) < 1e-9; }
    const op = i.eq.includes(' < ') ? '<' : '>'; const pred = xPred(o); for (let x = -5; x <= 90; x += 0.25) { const truth = g(x) > 0 && cmp[op](Math.log(g(x)) / Math.log(base), Number(r)); if (pred(x) !== truth && !(g(x) > 0 && Math.abs(Math.log(g(x)) / Math.log(base) - Number(r)) < 1e-9)) return false; } return true; },
  digits: (i, o) => String(BigInt(i.base) ** BigInt(i.n)).length === N(o) && i.power === `${i.base}${[...String(i.n)].map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join('')}` && i.log.endsWith(i.base === 2 ? '0.3010' : '0.4771'),
  avgrate: (i, o) => near((ev(i.expr, N(i.q)) - ev(i.expr, N(i.p))) / (N(i.q) - N(i.p)), N(o)),
  deriv: (i, o, par) => (par.ask === 'func' ? !/x³/.test(o) && XS.every((x) => Math.abs(dAt(i.expr, x) - ev(o, x)) < 1e-4) : Math.abs(dAt(i.expr, N(i.k)) - N(o)) < 1e-4),
  tangent2: (i, o) => { if (!/^y = /.test(o)) return false; const t = N(i.t); const f = rhs(i.expr); const L = (x) => ev(rhs(o), x); return near(L(t), ev(f, t)) && Math.abs(L(1) - L(0) - dAt(f, t)) < 1e-4; },
  extrema: (i, o, par) => { const t = turning(i.expr); return t.max.length === 1 && t.min.length === 1 && near(ev(i.expr, par.ask === 'max' ? t.max[0] : t.min[0]), N(o)); },
  interval2: (i, o, par) => { const [a, b] = [N(i.a), N(i.b)]; let best = par.ask === 'max' ? -1e9 : 1e9; for (let k = 0; k <= 20000; k++) { const v = ev(i.expr, a + ((b - a) * k) / 20000); best = par.ask === 'max' ? Math.max(best, v) : Math.min(best, v); } return Math.abs(best - N(o)) < 1e-4; },
  integral: (i, o, par) => { if (par.ask === 'indef') { if (!/ \+ C$/.test(o)) return false; const F = o.replace(/ \+ C$/, ''); return XS.every((x) => Math.abs(dAt(F, x) - ev(i.expr, x)) < 1e-4); } return Math.abs(simpson((x) => ev(i.expr, x), N(i.p), N(i.q)) - N(o)) < 1e-6; },
  area2: (i, o) => { const f = rhs(i.expr); const z = zeros(f); return z.length === 2 && Math.abs(simpson((x) => Math.abs(ev(f, x)), z[0], z[1]) - num(o)) < 1e-6; },
});
Object.assign(CHAIN_OK, {
  chord: (it) => { const c = circleOf(it.circle); const f = sideOf(it.line); return near(N(it.steps[0].answer), c.r) && Math.abs(N(it.steps[1].answer) - distTo(f, c.cx, c.cy)) < 1e-6 && Math.abs(N(it.steps[2].answer) - chordLen(c, f)) < 1e-6; },
  line: (it) => { const [A, B] = [it.pa, it.pb]; const m = (B[1] - A[1]) / (B[0] - A[0]); const k = A[1] - m * A[0]; return near(num(it.steps[0].answer), m) && near(num(it.steps[1].answer), k) && near(num(it.steps[2].answer), -k / m) && it.A === `(${A.join(', ')})`.replace(/-/g, '−'); },
  sector: (it) => { const th = (it.deg * Math.PI) / 180; return near(pv(it.steps[0].answer), th) && near(pv(it.steps[1].answer), it.r * th) && near(pv(it.steps[2].answer), (Math.PI * it.r * it.r * it.deg) / 360); },
  double: (it) => { const th = thetaOf(it); return [Math.cos(th), Math.sin(2 * th), Math.cos(2 * th)].every((v, n) => Math.abs(v - num(it.steps[n].answer)) < 1e-9); },
  digits: (it) => { const v = it.n * 0.301; return Math.abs(Number(it.steps[0].answer) - v) < 1e-9 && N(it.steps[1].answer) === Math.floor(v) && N(it.steps[2].answer) === String(2n ** BigInt(it.n)).length; },
  expquad: (it) => { const m = clean(it.eq).match(/^4ˣ - (\d+)·2ˣ \+ (\d+) = 0$/); const [S, P] = [+m[1], +m[2]]; const [t1, t2, x] = it.steps.map((st) => N(st.answer)); return t1 < t2 && t1 + t2 === S && t1 * t2 === P && near(2 ** x, t2) && near(4 ** x - S * 2 ** x + P, 0); },
  cubicx: (it) => { const t = turning(it.expr); return t.max.length === 1 && t.min.length === 1 && N(it.steps[0].answer) === Math.min(t.max[0], t.min[0]) && t.max[0] < t.min[0] && near(ev(it.expr, t.max[0]), N(it.steps[1].answer)) && near(ev(it.expr, t.min[0]), N(it.steps[2].answer)); },
  area: (it) => { const f = rhs(it.expr); const z = zeros(f); return z.length === 2 && N(it.steps[0].answer) === z[0] && N(it.steps[1].answer) === z[1] && Math.abs(simpson((x) => Math.abs(ev(f, x)), z[0], z[1]) - num(it.steps[2].answer)) < 1e-6; },
});

let total = 0; let bad = 0; const seen = {}; const distinct = {}; const cov = new Set();
const report = (id, it, problems) => { bad++; seen[id] = (seen[id] || 0) + 1; if (seen[id] <= 2) console.log('PROBLEM', id, JSON.stringify(it).slice(0, 260), [...new Set(problems)].join('; ').slice(0, 260)); };
const fill = (s, it, extra = {}) => s.replace(/\{(\w+)\}/g, (m, key) => (key in extra ? extra[key] : key in it ? it[key] : m));
for (const file of UNITS) {
  const unit = JSON.parse(fs.readFileSync(`${ROOT}data/units/${file}.json`, 'utf8'));
  const typeIds = new Set(Object.keys(unit.types));
  const grouped = unit.groups.flatMap((g) => g.types);
  if (grouped.length !== typeIds.size || grouped.some((t) => !typeIds.has(t))) { console.log('PROBLEM groups do not match types in', file); bad++; }
  for (const t of typeIds) if (!unit.templates.some((tpl) => tpl.type === t)) { console.log('PROBLEM type has no template:', t); bad++; }
  for (const tpl of unit.templates) {
    cov.add(`${unit.id}/${tpl.id}`);
    const ok = OK[tpl.gen]; const par = tpl.params || {};
    if (!ok || !typeIds.has(tpl.type)) { console.log('PROBLEM no checker or unknown type for', tpl.id); bad++; continue; }
    for (let k = 0; k < (SLOW[tpl.gen] || RUNS); k++) {
      const it = GENERATORS[tpl.gen](par); total++; const problems = [...figureProblems(tpl.figure, it)];
      const opts = [it.answer, ...it.wrong].map(String);
      try {
        if (!ok(it, String(it.answer), par)) problems.push('answer is wrong');
        if (it.wrong.length !== 3) problems.push('need 3 wrong options');
        if (new Set(opts).size !== 4) problems.push('duplicate option text');
        it.wrong.forEach((w) => { let also = false; try { also = ok(it, String(w), par); } catch (e) { also = false; } if (also) problems.push(`wrong option is also correct: ${w}`); });
        if (opts.some((o) => /NaN|undefined|Infinity/.test(o))) problems.push('bad option');
        if (tpl.gen === 'amgm' && opts.some((o) => N(o) <= 0)) problems.push('non-positive option');
        if (['dist', 'pdist', 'chord', 'area2', 'compose'].includes(tpl.gen) && opts.some((o) => num(o) <= 0)) problems.push('non-positive option: ' + opts.join(' | '));
      } catch (e) { problems.push('error ' + e.message); }
      for (const lang of ['ja', 'ko', 'en']) for (const part of ['text', 'explain']) { const s = fill(tpl[part][lang], it); if (/\{[A-Za-z]\w*\}|undefined|NaN/.test(s)) problems.push(`unfilled ${part}.${lang}: ${s}`); }
      if (problems.length) report(tpl.id, it, problems);
      const key = { ...it }; delete key.wrong; (distinct[tpl.id] ||= new Set()).add(JSON.stringify(key));
    }
  }
  for (const ch of unit.chains || []) {
    cov.add(`${unit.id}/${ch.id}`);
    const ok = CHAIN_OK[ch.gen];
    if (!ok) { console.log('PROBLEM no chain checker for', ch.id); bad++; continue; }
    for (let k = 0; k < (SLOW[ch.gen] || RUNS); k++) {
      const it = CHAINS[ch.gen](); total++; const problems = [];
      { const ex = {}; it.steps.forEach((st, n) => { ex[`a${n + 1}`] = st.answer; }); ch.steps.forEach((st) => problems.push(...figureProblems({ ...(ch.figure || {}), ...(st.figure || {}) }, it, ex))); }
      try {
        if (it.steps.length !== ch.steps.length) problems.push('step count');
        if (!ok(it)) problems.push('a step answer is wrong');
        it.steps.forEach((st, n) => { const opts = [st.answer, ...st.wrong].map(String); if (st.wrong.length !== 3 || new Set(opts).size !== 4) problems.push(`step ${n + 1} options`); if (!typeIds.has(ch.steps[n].type)) problems.push('unknown step type'); });
      } catch (e) { problems.push('error ' + e.message); }
      const extra = {}; it.steps.forEach((st, n) => { extra[`a${n + 1}`] = st.answer; });
      for (const lang of ['ja', 'ko', 'en']) {
        const texts = [ch.intro[lang], ...ch.steps.flatMap((st, n) => [st.text[lang], fill(st.explain[lang], {}, { answer: it.steps[n].answer }), st.sum[lang]])];
        for (const t of texts) { const s = fill(t, it, extra); if (/\{[A-Za-z]\w*\}|undefined|NaN/.test(s)) problems.push(`unfilled ${lang}: ${s}`); }
      }
      if (problems.length) report(ch.id, it, problems);
      const key = { ...it, steps: it.steps.map((s) => s.answer) }; (distinct[ch.id] ||= new Set()).add(JSON.stringify(key));
    }
  }
}
fs.writeFileSync(new URL('./.covered-math2.json', import.meta.url), JSON.stringify([...cov]));
console.log('checked', total, '| problems', bad, Object.keys(seen).length ? JSON.stringify(seen) : '');
console.log(Object.entries(distinct).map(([k, v]) => `${k}:${v.size}`).join('  '));
process.exit(bad ? 1 : 0);
