// 数学B·C 문제 틀과 연속기 묶음의 독립 검산.
// 생성기가 낸 "문제에 보이는 글"만 읽어서 답을 처음부터 다시 계산하고, 생성기의 정답·오답과 대조합니다.
// (생성기 안의 계산을 그대로 따라 하지 않습니다. 수열은 공식을 쓰지 않고 항을 하나씩 만들어 더합니다)
import fs from 'node:fs';
const ROOT = new URL('../', import.meta.url).pathname;
globalThis.document = { documentElement: {} };
const { GENERATORS, CHAINS } = await import(ROOT + 'js/generators.js');
const UNITS = ['mathb-seq', 'mathb-stat', 'mathc-vector', 'mathc-curve'];
const RUNS = 3000;
const SLOW = {};

const clean = (s) => String(s).replace(/−/g, '-');
const N = (s) => Number(clean(s));
const near = (a, b) => Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
const figureProblems = () => [];

// ---- 数列 ----
// "aₙ = 2n² − 3n + 1", "aₙ = 3·2ⁿ⁻¹ − 1", "aₙ = 2ⁿ + 3" 을 n 의 함수로 읽습니다
const anFn = (text) => {
  const body = clean(text).replace(/^[aS]ₙ = /, '')
    .replace(/(\d+)ⁿ⁻¹/g, '($1**(n-1))').replace(/(\d+)ⁿ/g, '($1**n)')
    .replace(/n²/g, '(n**2)').replace(/·/g, '*').replace(/(\d)\(/g, '$1*(').replace(/(\d)n/g, '$1*n');
  if (/[^0-9n+\-*() .]/.test(body)) throw new Error('cannot read ' + text);
  return Function('n', `return (${body});`);
};
// 보기의 식이 수열 terms(1번째부터)와 모두 맞는지
const fits = (o, terms) => { const f = anFn(o); return terms.every((v, k) => near(f(k + 1), v)); };
// 등차·등비수열의 항을 하나씩 만듭니다
const arithTerms = (a, d, n) => Array.from({ length: n }, (_, k) => a + k * d);
const geomTerms = (a, r, n) => { const out = [a]; while (out.length < n) out.push(out[out.length - 1] * r); return out; };
const total = (list) => list.reduce((s, v) => s + v, 0);
// "aₙ₊₁ = 3aₙ − 4" → [3, −4]
const ruleOf = (rule) => { const m = clean(rule).match(/^aₙ₊₁ = (\d+)aₙ ([+-]) (\d+)$/); return [Number(m[1]), (m[2] === '-' ? -1 : 1) * Number(m[3])]; };
const recurTerms = (a1, rule, n) => { const [p, q] = ruleOf(rule); const out = [N(a1)]; while (out.length < n) out.push(p * out[out.length - 1] + q); return out; };
// "2, 5, 10, 17, 26, …" 의 계차가 등차수열이라고 보고 뒤의 항을 이어 만듭니다
const extend = (seq, n) => {
  const t = clean(seq).replace(', …', '').split(', ').map(Number);
  const diffs = t.slice(1).map((v, k) => v - t[k]);
  const e = diffs[1] - diffs[0];
  if (t.length !== 5 || !diffs.slice(1).every((v, k) => v - diffs[k] === e)) throw new Error('differences are not arithmetic');
  while (t.length < n) { diffs.push(diffs[diffs.length - 1] + e); t.push(t[t.length - 1] + diffs[diffs.length - 1]); }
  return t;
};
// Σ 의 식 "(3k − 4)", "k²", "(k² + 2k)" 를 k 의 함수로
const sigmaFn = (expr) => Function('k', `return (${clean(expr).replace(/k²/g, '(k**2)').replace(/(\d)k/g, '$1*k')});`);

// ---- ベクトル ----
// "3", "−2√3", "5√2/2", "7/2" 같은 값을 수로
const num = (s) => Function(`return (${clean(s).replace(/(\d+)?√(\d+)/g, (m, k, r) => `${k ? k + '*' : ''}Math.sqrt(${r})`)});`)();
// "(1, −√3)" → [1, −1.732…]
const vec = (s) => clean(s).replace(/[()]/g, '').split(', ').map(num);
const dot = (a, b) => a.reduce((sum, v, k) => sum + v * b[k], 0);
const mag = (a) => Math.sqrt(dot(a, a));
const angleOf = (a, b) => (Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (mag(a) * mag(b))))) * 180) / Math.PI;
// "2a − 3b" 또는 "(2a + 3b)/5" 에서 a, b 의 계수
const linAB = (text) => { const f = Function('a', 'b', `return (${clean(text).replace(/(\d)([ab])/g, '$1*$2')});`); return [f(1, 0), f(0, 1)]; };

// ---- 平面上の曲線と複素数平面 ----
// "3 − 2i", "−√3 + i", "8i", "−4" 를 [실수부분, 허수부분] 으로
const cpx = (text) => {
  const t = clean(text).replace(/ /g, '');
  if (!t.endsWith('i')) return [num(t), 0];
  const body = t.slice(0, -1);
  let cut = -1;
  for (let k = body.length - 1; k > 0; k--) if (body[k] === '+' || body[k] === '-') { cut = k; break; }
  const im = cut < 0 ? body : body.slice(cut);
  const re = cut < 0 ? '' : body.slice(0, cut);
  const coef = im === '' || im === '+' ? 1 : im === '-' ? -1 : num(im);
  return [re === '' ? 0 : num(re), coef];
};
const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const ceq = (a, b) => near(a[0], b[0]) && near(a[1], b[1]);
const cpow = (z, n) => { let out = [1, 0]; for (let k = 0; k < n; k++) out = cmul(out, z); return out; };
// "5π/6", "π", "−π/2" → 라디안
const rad = (text) => Function(`return (${clean(text).replace(/(\d*)π/g, (m, k) => `${k || 1}*Math.PI`)});`)();
const argOf = (z) => (Math.atan2(z[1], z[0]) + 2 * Math.PI) % (2 * Math.PI);
const sameAngle = (a, b) => near(Math.cos(a), Math.cos(b)) && near(Math.sin(a), Math.sin(b));
const point = (text) => clean(text).replace(/[()]/g, '').split(', ').map(num);
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
// "y² = −12x" → ['x', −12] (대칭축이 x 축), "x² = 8y" → ['y', 8]
const parabOf = (eq) => { const m = clean(eq).match(/^([xy])² = (-?\d+)([xy])$/); return [m[3], Number(m[2])]; };
// 포물선 위의 두 점 (정의대로 확인하려고)
const parabPoints = ([axis, k]) => [[k / 4, k / 2], [k, k]].map(([u, v]) => (axis === 'x' ? [u, v] : [v, u]));
// "x²/25 + y²/9 = 1", "x²/9 − y²/16 = 1" → [x² 의 분모, y² 의 분모]
const conicOf = (eq) => { const m = clean(eq).match(/^x²\/(\d+) ([+-]) y²\/(\d+) = 1$/); return [Number(m[1]), Number(m[3]), m[2]]; };
// "(±8, 0)" → [[8, 0], [−8, 0]], "(0, ±8)" → [[0, 8], [0, −8]]
const foci = (text) => { const m = text.match(/^\((±)?([\d√]+), (±)?([\d√]+)\)$/); return m[1] ? [[num(m[2]), 0], [-num(m[2]), 0]] : [[0, num(m[4])], [0, -num(m[4])]]; };

// ---- 統計的な推測 ----
// 표의 글 "0, 3, 5" 와 "1/8, 1/8, 3/4" 에서 값과 확률을 읽습니다
const tableOf = (i) => { const xs = i.xs.split(', ').map(Number); const ps = i.ps.split(', ').map(num); if (!near(ps.reduce((a, b) => a + b, 0), 1) || new Set(xs).size !== xs.length || ps.some((v) => v <= 0)) throw new Error('bad table'); return [xs, ps]; };
const meanOf = ([xs, ps]) => xs.reduce((sum, x, k) => sum + x * ps[k], 0);
// 분산은 정의대로: (값 − 평균)² 의 기댓값
const varOf = (t) => { const m = meanOf(t); return t[0].reduce((sum, x, k) => sum + (x - m) ** 2 * t[1][k], 0); };
// "3X − 9" → [3, −9]
const linX = (expr) => { const f = Function('X', `return (${clean(expr).replace(/(\d)X/, '$1*X')});`); return [f(1) - f(0), f(0)]; };
// 이항분포의 평균과 분산을 확률을 하나씩 더해서 구합니다 (np, npq 를 쓰지 않습니다)
const binomStats = (n, p) => { let pk = (1 - p) ** n; let mean = 0; let second = 0; for (let k = 0; k <= n; k++) { mean += k * pk; second += k * k * pk; pk *= ((n - k) / (k + 1)) * (p / (1 - p)); } return [mean, second - mean * mean]; };
// 표준정규분포의 확률을 넓이로 직접 구합니다 (심프슨 공식)
const phi = (z) => Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
const area = (lo, hi) => { const n = 4000; const h = (hi - lo) / n; let sum = phi(lo) + phi(hi); for (let k = 1; k < n; k++) sum += phi(lo + k * h) * (k % 2 ? 4 : 2); return (sum * h) / 3; };
// "55 ≦ X ≦ 60", "X ≧ 100", "X ≦ 40" (Z 도 같은 꼴) → [아래 끝, 위 끝]
const rangeOf = (text) => { const t = clean(text); let m = t.match(/^(-?[\d.]+) ≦ [XZ] ≦ (-?[\d.]+)$/); if (m) return [Number(m[1]), Number(m[2])]; m = t.match(/^[XZ] ≧ (-?[\d.]+)$/); if (m) return [Number(m[1]), Infinity]; m = t.match(/^[XZ] ≦ (-?[\d.]+)$/); return [-Infinity, Number(m[1])]; };
const probOf = ([lo, hi]) => area(Math.max(lo, -9), Math.min(hi, 9));
const interval = (text) => text.replace(/[\[\]]/g, '').split(', ').map(Number);

const OK = {
  expect: (i, o) => { const t = tableOf(i); return near(num(o), meanOf(t)) && near(Function(`return (${i.work.replace(/×/g, '*')});`)(), meanOf(t)); },
  rvvar: (i, o) => { const t = tableOf(i); return near(num(o), varOf(t)) && near(num(i.ex), meanOf(t)) && near(num(i.ex2), t[0].reduce((sum, x, k) => sum + x * x * t[1][k], 0)); },
  lintrans: (i, o, par) => { const [a, b] = linX(i.expr); return a === N(i.a) && b === N(i.b) && (par.ask === 'var' ? N(o) === a * a * i.v : N(o) === a * i.m + b); },
  bindist: (i, o, par) => { const p = num(i.p); const [m, v] = binomStats(i.n, p); return near(num(i.q), 1 - p) && Math.abs(num(o) - (par.ask === 'var' ? v : m)) < 1e-6; },
  normal: (i, o, par) => {
    if (par.ask !== 'prob') return near(N(o), (N(i.x) - i.m) / i.s) && N(i.diff) === N(i.x) - i.m;
    const [lo, hi] = rangeOf(i.range); const zr = rangeOf(i.zrange);
    const same = (a, b) => (Number.isFinite(a) ? near((a - i.m) / i.s, b) : a === b);
    return same(lo, zr[0]) && same(hi, zr[1]) && Math.abs(N(o) - probOf(zr)) < 3e-4 && i.note.includes('0.3413') && i.note.includes('0.4772');
  },
  samplemean: (i, o) => near(num(o), i.sigma / Math.sqrt(i.n)) && i.root * i.root === i.n,
  confint: (i, o) => { const [lo, hi] = interval(o); const half = (1.96 * i.sigma) / Math.sqrt(i.n); return Math.abs((lo + hi) / 2 - i.mean) < 0.006 && Math.abs((hi - lo) / 2 - half) < 0.006 && near(N(i.se), i.sigma / Math.sqrt(i.n)) && Math.abs(N(i.half) - half) < 1e-4 && i.root * i.root === i.n; },

  cabs: (i, o, par) => { if (par.ask === 'dist') { const a = cpx(i.z1); const b = cpx(i.z2); return near(num(o), dist(a, b)) && ceq(cpx(i.diff), [a[0] - b[0], a[1] - b[1]]) && N(i.p) === a[0] - b[0] && N(i.q) === a[1] - b[1]; } const z = cpx(i.z); return near(num(o), Math.hypot(z[0], z[1])) && z[0] === N(i.a) && z[1] === N(i.b); },
  carg: (i, o) => { const z = cpx(i.z); const t = argOf(z); const q = z[0] > 0 ? (z[1] > 0 ? 1 : 4) : (z[1] > 0 ? 2 : 3); return near(rad(o), t) && i.quad === q && near(num(i.re), Math.abs(z[0])) && near(num(i.im), Math.abs(z[1])) && near(rad(i.ref), Math.atan(Math.abs(z[1]) / Math.abs(z[0]))); },
  demoivre: (i, o) => { const z = cpx(i.z); const w = cpow(z, i.n); return Math.abs(cpx(o)[0] - w[0]) < 1e-6 && Math.abs(cpx(o)[1] - w[1]) < 1e-6 && near(num(i.r), Math.hypot(z[0], z[1])) && near(rad(i.arg), argOf(z)) && Math.abs(i.rn - Math.hypot(w[0], w[1])) < 1e-6 && sameAngle(rad(i.argn), argOf(w)); },
  crot: (i, o) => { const z = cpx(i.z); const t = rad(i.ang); const w = [z[0] * Math.cos(t) - z[1] * Math.sin(t), z[0] * Math.sin(t) + z[1] * Math.cos(t)]; return ceq(cpx(o), w) && ceq(cpx(i.mul), [Math.cos(t), Math.sin(t)]); },
  parab: (i, o, par) => {
    const info = parabOf(i.eq); const [axis, k] = info;
    if (N(i.k) !== k || !near(num(i.p) * 4, k) || i.form !== (axis === 'x' ? 'y² = 4px' : 'x² = 4py')) return false;
    // 정의: 포물선 위의 점은 초점까지의 거리와 준선까지의 거리가 같습니다
    let F; let line;
    if (par.ask === 'dir') { const m = clean(o).match(/^([xy]) = (-?[\d/]+)$/); line = [m[1], num(m[2])]; F = line[0] === 'x' ? [-line[1], 0] : [0, -line[1]]; if (line[0] !== axis) return false; }
    else { F = point(o); line = F[1] === 0 && axis === 'x' ? ['x', -F[0]] : F[0] === 0 && axis === 'y' ? ['y', -F[1]] : null; if (!line) return false; }
    return parabPoints(info).every((P) => near(dist(P, F), Math.abs((line[0] === 'x' ? P[0] : P[1]) - line[1])));
  },
  ellipse: (i, o, par) => {
    const [dx, dy, sign] = conicOf(i.eq); if (sign !== '+') return false;
    const big = Math.max(dx, dy);
    if (i.big !== big || i.small !== Math.min(dx, dy) || i.a * i.a !== big || i.axis !== (dx > dy ? 'x' : 'y')) return false;
    if (par.ask === 'axis') return N(o) === 2 * Math.sqrt(big);
    // 정의: 타원 위의 점에서 두 초점까지의 거리의 합이 긴지름의 길이와 같습니다
    const F = foci(o);
    return [[Math.sqrt(dx), 0], [0, Math.sqrt(dy)], [Math.sqrt(dx) * 0.6, Math.sqrt(dy) * 0.8]].every((P) => near(dist(P, F[0]) + dist(P, F[1]), 2 * Math.sqrt(big)));
  },
  hyper: (i, o, par) => {
    const [a2, b2, sign] = conicOf(i.eq); if (sign !== '-' || i.a2 !== a2 || i.b2 !== b2 || i.a * i.a !== a2 || i.b * i.b !== b2) return false;
    if (par.ask === 'asym') { const m = clean(o).match(/^y = ±(?:\((\d+)\/(\d+)\)|(\d*))x$/); const slope = m[1] ? Number(m[1]) / Number(m[2]) : Number(m[3] || 1); const x = 1e7; return Math.abs(Math.sqrt(b2 * (x * x / a2 - 1)) / x - slope) < 1e-6; }
    // 정의: 쌍곡선 위의 점에서 두 초점까지의 거리의 차가 2a 입니다
    const F = foci(o);
    return [[Math.sqrt(a2), 0], [2 * Math.sqrt(a2), Math.sqrt(3 * b2)], [3 * Math.sqrt(a2), Math.sqrt(8 * b2)]].every((P) => near(Math.abs(dist(P, F[0]) - dist(P, F[1])), 2 * Math.sqrt(a2)));
  },

  vcomp: (i, o) => { const [k, l] = linAB(i.expr); const a = vec(i.av); const b = vec(i.bv); const got = vec(o); return k === i.k && l === N(i.l) && near(got[0], k * a[0] + l * b[0]) && near(got[1], k * a[1] + l * b[1]) && a[0] === N(i.a1) && a[1] === N(i.a2) && b[0] === N(i.b1) && b[1] === N(i.b2); },
  vmag: (i, o, par) => { const a = vec(i.av); if (par.ask === 'sum') { const b = vec(i.bv); return near(num(o), mag([a[0] + b[0], a[1] + b[1]])) && N(i.c1) === a[0] + b[0] && N(i.c2) === a[1] + b[1]; } return near(num(o), mag(a)); },
  vdot: (i, o, par) => (par.ask === 'angle' ? near(num(o), i.p * i.q * Math.cos((i.deg * Math.PI) / 180)) : near(num(o), dot(vec(i.av), vec(i.bv)))),
  vangle: (i, o) => { const a = vec(i.av); const b = vec(i.bv); return near(Number(o.replace('°', '')), angleOf(a, b)) && near(num(i.dot), dot(a, b)) && near(num(i.ma), mag(a)) && near(num(i.mb), mag(b)) && near(Function(`return (${clean(i.work).replace(/×/g, '*').replace(/√(\d+)/g, 'Math.sqrt($1)')});`)(), dot(a, b)); },
  vperp: (i, o, par) => { const a = vec(i.av); const b = [N(o), N(i.r)]; return par.ask === 'para' ? near(a[0] * b[1] - a[1] * b[0], 0) : near(dot(a, b), 0); },
  vdiv: (i, o, par) => { const [ca, cb] = linAB(o); const t = par.ask === 'ext' ? i.m / (i.m - i.n) : i.m / (i.m + i.n); return near(ca, 1 - t) && near(cb, t); }, // P = A + t(B − A)
  vspace: (i, o, par) => {
    if (par.ask === 'perp') return near(dot(vec(i.av), [N(o), N(i.s), N(i.t)]), 0);
    if (par.ask === 'dist') { const A = vec(i.A); const B = vec(i.B); const d = B.map((v, k) => v - A[k]); return near(num(o), mag(d)) && d[0] === N(i.d1) && d[1] === N(i.d2) && d[2] === N(i.d3); }
    return near(num(o), mag(vec(i.av)));
  },
  // 넓이는 헤론의 공식으로 따로 구해 봅니다 (세 변의 길이에서)
  varea: (i, o) => { const A = vec(i.A); const B = vec(i.B); const [p, q, r] = [mag(A), mag(B), mag([A[0] - B[0], A[1] - B[1]])]; const s = (p + q + r) / 2; return Math.abs(num(o) - Math.sqrt(Math.max(0, s * (s - p) * (s - q) * (s - r)))) < 1e-6; },

  arith: (i, o, par) => {
    if (par.ask === 'general') {
      const d = (N(i.aq) - N(i.ap)) / (i.q - i.p);
      const a = N(i.ap) - (i.p - 1) * d;
      return Number.isInteger(d) && fits(o, arithTerms(a, d, 12));
    }
    return arithTerms(N(i.a), N(i.d), i.n)[i.n - 1] === N(o);
  },
  arithsum: (i, o, par) => {
    if (par.ask === 'last') { const d = (i.l - i.a) / (i.n - 1); return Number.isInteger(d) && total(arithTerms(i.a, d, i.n)) === N(o); }
    return total(arithTerms(N(i.a), N(i.d), i.n)) === N(o);
  },
  geom: (i, o) => geomTerms(i.a, N(i.r), i.n)[i.n - 1] === N(o),
  geomsum: (i, o) => total(geomTerms(i.a, N(i.r), i.n)) === N(o),
  sigma: (i, o) => { const f = sigmaFn(i.expr); let s = 0; for (let k = 1; k <= i.n; k++) s += f(k); return s === N(o); },
  diffseq: (i, o, par) => (par.ask === 'general' ? fits(o, extend(i.seq, 12)) : extend(i.seq, i.n)[i.n - 1] === N(o)),
  sumterm: (i, o) => { const S = anFn(i.sn); const terms = Array.from({ length: 10 }, (_, k) => S(k + 1) - (k ? S(k) : 0)); return fits(o, terms) && near(S(1), i.p + N(i.q)); },
  recur: (i, o, par) => (par.ask === 'general' ? fits(o, recurTerms(i.a1, i.rule, 9)) : recurTerms(i.a1, i.rule, i.k)[i.k - 1] === N(o)),
};
const CHAIN_OK = {
  binom3: (it) => { const p = num(it.p); const [m, v] = binomStats(it.n, p); const [a, b, c] = it.steps.map((st) => num(st.answer)); return Math.abs(a - m) < 1e-6 && Math.abs(b - v) < 1e-6 && Math.abs(c - Math.sqrt(v)) < 1e-6 && near(num(it.q), 1 - p); },
  conf3: (it) => { const se = it.sigma / Math.sqrt(it.n); const [a, b, c] = it.steps.map((st) => N(st.answer)); return near(a, se) && Math.abs(b - 1.96 * se) < 1e-4 && Math.abs(c - (it.mean + 1.96 * se)) < 1e-4 && it.root * it.root === it.n; },
  ellipse3: (it) => { const [dx, dy] = conicOf(it.eq); const [A, B, c] = it.steps.map((st) => num(st.answer)); const F = [[c, 0], [-c, 0]];
    return dx > dy && it.big === dx && it.small === dy && A === 2 * Math.sqrt(dx) && B === 2 * Math.sqrt(dy) && c > 0 && [[Math.sqrt(dx), 0], [0, Math.sqrt(dy)]].every((P) => near(dist(P, F[0]) + dist(P, F[1]), A)); },
  polar3: (it) => { const z = cpx(it.z); const w = cpow(z, it.n); const q = z[0] > 0 ? (z[1] > 0 ? 1 : 4) : (z[1] > 0 ? 2 : 3);
    return near(num(it.steps[0].answer), Math.hypot(z[0], z[1])) && near(rad(it.steps[1].answer), argOf(z)) && Math.abs(cpx(it.steps[2].answer)[0] - w[0]) < 1e-6 && Math.abs(cpx(it.steps[2].answer)[1] - w[1]) < 1e-6
      && Math.abs(it.rn - Math.hypot(w[0], w[1])) < 1e-6 && sameAngle(rad(it.argn), argOf(w)) && near(it.q, z[0] * z[0] + z[1] * z[1]) && it.quad === q && near(num(it.re), Math.abs(z[0])) && near(num(it.im), Math.abs(z[1])) && near(rad(it.ref), Math.atan(Math.abs(z[1]) / Math.abs(z[0]))); },
  vangle3: (it) => { const a = vec(it.av); const b = vec(it.bv); return near(num(it.steps[0].answer), dot(a, b)) && near(num(it.steps[1].answer), mag(a) * mag(b)) && near(Number(it.steps[2].answer.replace('°', '')), angleOf(a, b)) && near(num(it.ma), mag(a)) && near(num(it.mb), mag(b)); },
  vtri: (it) => { const A = vec(it.A); const B = vec(it.B); const [p, q, r] = [mag(A), mag(B), mag([A[0] - B[0], A[1] - B[1]])]; const s = (p + q + r) / 2;
    return near(N(it.steps[0].answer), dot(A, B)) && near(N(it.steps[1].answer), dot(A, A) * dot(B, B)) && Math.abs(num(it.steps[2].answer) - Math.sqrt(Math.max(0, s * (s - p) * (s - q) * (s - r)))) < 1e-6 && A[0] === N(it.x1) && A[1] === N(it.y1) && B[0] === N(it.x2) && B[1] === N(it.y2); },
  arithpair: (it) => {
    const [d, a, S] = it.steps.map((st) => N(st.answer));
    const t = arithTerms(a, d, Math.max(it.n, it.q));
    return t[it.p - 1] === N(it.ap) && t[it.q - 1] === N(it.aq) && total(t.slice(0, it.n)) === S;
  },
  recurstep: (it) => {
    const [alpha, b1, ak] = it.steps.map((st) => N(st.answer));
    const [p, q] = ruleOf(it.rule);
    const m = clean(it.eq).match(/^α = (\d+)α ([+-]) (\d+)$/);
    return Number(m[1]) === p && (m[2] === '-' ? -1 : 1) * Number(m[3]) === q && p === it.p && q === N(it.q)
      && alpha === p * alpha + q && b1 === N(it.first) - alpha && recurTerms(it.first, it.rule, it.k)[it.k - 1] === ak && it.k === 5;
  },
};

let total_ = 0; let bad = 0; const seen = {}; const distinct = {}; const cov = new Set();
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
      const it = GENERATORS[tpl.gen](par); total_++; const problems = [...figureProblems(tpl.figure, it)];
      const opts = [it.answer, ...it.wrong].map(String);
      try {
        if (!ok(it, String(it.answer), par)) problems.push('answer is wrong');
        if (it.wrong.length !== 3) problems.push('need 3 wrong options');
        if (new Set(opts).size !== 4) problems.push('duplicate option text');
        it.wrong.forEach((w) => { let also = false; try { also = ok(it, String(w), par); } catch (e) { also = false; } if (also) problems.push(`wrong option is also correct: ${w}`); });
        if (opts.some((o) => /NaN|undefined|Infinity/.test(o))) problems.push('bad option');
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
      const it = CHAINS[ch.gen](); total_++; const problems = [];
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
fs.writeFileSync(new URL('./.covered-mathbc.json', import.meta.url), JSON.stringify([...cov]));
console.log('checked', total_, '| problems', bad, Object.keys(seen).length ? JSON.stringify(seen) : '');
console.log(Object.entries(distinct).map(([k, v]) => `${k}:${v.size}`).join('  '));
process.exit(bad ? 1 : 0);
