// 数学II 문제 틀과 연속기 묶음의 독립 검산.
// 생성기가 낸 "문제에 보이는 글"만 읽어서 답을 처음부터 다시 계산하고, 생성기의 정답·오답과 대조합니다.
// (생성기 안의 계산을 그대로 따라 하지 않습니다)
import fs from 'node:fs';
const ROOT = new URL('../', import.meta.url).pathname;
globalThis.document = { documentElement: {} };
const { GENERATORS, CHAINS } = await import(ROOT + 'js/generators.js');
const UNITS = ['math2-expr', 'math2-complex'];
const RUNS = 3000;

const SUP = { '²': 2, '³': 3, '⁴': 4, '⁵': 5, '⁶': 6, '⁷': 7 };
const clean = (s) => String(s).replace(/−/g, '-');
// 식을 자바스크립트 식으로 바꿉니다. 예: "(2x − 3)³" → "(2*x-3)**3"
const js = (s) => clean(s)
  .replace(/[²³⁴⁵⁶⁷]/g, (c) => `**${SUP[c]}`)
  .replace(/(\d)x/g, '$1*x')
  .replace(/(\d)\(/g, '$1*(')
  .replace(/\)\(/g, ')*(')
  .replace(/x\(/g, 'x*(');
const ev = (s, x) => Function('x', `return (${js(s)});`)(x);
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
    for (let k = 0; k < RUNS; k++) {
      const it = GENERATORS[tpl.gen](par); total++; const problems = [];
      const opts = [it.answer, ...it.wrong].map(String);
      try {
        if (!ok(it, String(it.answer), par)) problems.push('answer is wrong');
        if (it.wrong.length !== 3) problems.push('need 3 wrong options');
        if (new Set(opts).size !== 4) problems.push('duplicate option text');
        it.wrong.forEach((w) => { let also = false; try { also = ok(it, String(w), par); } catch (e) { also = false; } if (also) problems.push(`wrong option is also correct: ${w}`); });
        if (opts.some((o) => /NaN|undefined|Infinity/.test(o))) problems.push('bad option');
        if (tpl.gen === 'amgm' && opts.some((o) => N(o) <= 0)) problems.push('non-positive option');
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
    for (let k = 0; k < RUNS; k++) {
      const it = CHAINS[ch.gen](); total++; const problems = [];
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
