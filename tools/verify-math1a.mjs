// Independent check of the generators added to complete 数学I and 数学A.
import fs from 'node:fs';
const ROOT = new URL('../', import.meta.url).pathname; // 저장소 폴더
globalThis.document = { documentElement: {} };
const { GENERATORS } = await import(ROOT + 'js/generators.js');
const clean = (s) => String(s).replace(/−/g, '-');
const N = (s) => Number(clean(s).replace(/°/g, ''));
const val = (s) => Function(`return (${clean(s).replace(/°/g, '').replace(/(\d+)?√(\d+)/g, (m, k, r) => `${k ? k + '*' : ''}Math.sqrt(${r})`)});`)();
const near = (a, b) => Math.abs(a - b) < 1e-9;
const F = (n) => (n <= 1 ? 1 : n * F(n - 1));
const G = (a, b) => (b ? G(b, a % b) : Math.abs(a));
const cmp = { '>': (a, b) => a > b, '<': (a, b) => a < b, '≧': (a, b) => a >= b, '≦': (a, b) => a <= b, '=': (a, b) => Math.abs(a - b) < 1e-9, '≠': (a, b) => Math.abs(a - b) > 1e-9 };
const js = (s) => clean(s).replace(/^y = /, '').replace(/\|([^|]+)\|/g, 'Math.abs($1)').replace(/\(([^()]*)\)²/g, '(($1)*($1))').replace(/x²/g, '(x*x)').replace(/(\d)x/g, '$1*x').replace(/(\d)\(/g, '$1*(').replace(/^-\(/, '-1*(');
const ev = (s, x) => Function('x', `return (${js(s)});`)(x);
const XS = []; for (let x = -40; x <= 40; x += 0.125) XS.push(x);
const rootsOf = (s) => clean(s).replace('x = ', '').split(', ').map(Number);
const rangePred = (s) => { const t = clean(s); let m;
  if ((m = t.match(/^(-?\d+) < x < (-?\d+)$/))) return (x) => +m[1] < x && x < +m[2];
  if ((m = t.match(/^x < (-?\d+), (-?\d+) < x$/))) return (x) => x < +m[1] || +m[2] < x;
  if ((m = t.match(/^(-?\d+) < x ≦ (-?\d+)$/))) return (x) => +m[1] < x && x <= +m[2];
  if ((m = t.match(/^(-?\d+) ≦ x < (-?\d+)$/))) return (x) => +m[1] <= x && x < +m[2];
  if ((m = t.match(/^x < (-?\d+), (-?\d+) ≦ x$/))) return (x) => x < +m[1] || +m[2] <= x;
  if ((m = t.match(/^x (>|<|≦|≧|=|≠) (-?\d+)$/))) return (x) => cmp[m[1]](x, +m[2]);
  if (t === '@allreal') return () => true; if (t === '@none') return () => false;
  throw new Error('cannot read range ' + s); };
const same = (p, q, skip = []) => XS.every((x) => skip.some((b) => Math.abs(x - b) < 1e-9) || p(x) === q(x));
const ineq = (text) => { const m = clean(text).match(/^(.+?) (>|<|≦|≧|=) (-?\d+)$/); return (x) => cmp[m[2]](ev(m[1], x), +m[3]); };
const setOf = (s) => new Set(s.replace(/[{}]/g, '').split(', ').filter(Boolean).map(Number));
const eqSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
const trig = { sin: (d) => Math.sin(d * Math.PI / 180), cos: (d) => Math.cos(d * Math.PI / 180), tan: (d) => Math.tan(d * Math.PI / 180) };
const trigExpr = (s, th) => Function('sin', 'cos', 'tan', 't', `return (${clean(s).replace(/°/g, '').replace(/θ/g, 't').replace(/(sin|cos|tan) t/g, '$1(t)').replace(/(sin|cos|tan) (\d+)/g, '$1($2)').replace(/(sin|cos|tan)\(([^)]*)\)/g, '$1($2)')});`)(trig.sin, trig.cos, trig.tan, th);
const corr = (pts) => { const n = pts.length, mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n; const sxy = pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0); return sxy / Math.sqrt(pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0) * pts.reduce((a, p) => a + (p[1] - my) ** 2, 0)); };
const heron = (a, b, c) => { const s = (a + b + c) / 2; return Math.sqrt(s * (s - a) * (s - b) * (s - c)); };
const OK = {
  abseq: (i, o) => { const r = rootsOf(o); const sol = XS.filter((x) => near(ev(i.lhs, x), i.b)); return r.length === sol.length && r.every((x) => sol.some((y) => near(x, y))); },
  absineq: (i, o) => same((x) => cmp[i.op](ev(i.lhs, x), i.b), rangePred(o), XS.filter((x) => near(ev(i.lhs, x), i.b))),
  system: (i, o) => same((x) => ineq(i.i1)(x) && ineq(i.i2)(x), rangePred(o)),
  symmetric: (i, o) => { const s = N(i.s), p = N(i.p); return N(o) === s * s - 2 * p; },
  setop: (i, o, par) => { const A = setOf(i.A), B = setOf(i.B); const want = par.ask === 'cap' ? new Set([...A].filter((x) => B.has(x))) : new Set([...A, ...B]); return eqSet(setOf(o), want); },
  counter: (i, o) => { const [p, q] = i.stmt.split(' ⟹ ').map(ineq); const x = N(o.replace('x = ', '')); return p(x) && !q(x); },
  shift: (i, o) => [-3.3, -1, 0.4, 2.7, 5].every((x) => near(ev(o, x), ev(i.f, x - N(i.p)) + N(i.q))),
  determine: (i, o) => { const a = N(o), p = N(i.p), q = N(i.q); return a !== 0 && near(a * (N(i.x0) - p) ** 2 + q, N(i.y0)); },
  xcount: (i, o) => { const c = ev(i.f, 0), a = (ev(i.f, 1) + ev(i.f, -1)) / 2 - c, b = (ev(i.f, 1) - ev(i.f, -1)) / 2; const D = b * b - 4 * a * c; return N(o) === (D > 1e-9 ? 2 : D < -1e-9 ? 0 : 1); },
  quadspecial: (i, o) => same((x) => cmp[i.op](ev(i.f, x), 0), rangePred(o)),
  cofunction: (i, o) => [17, 37, 64].every((t) => Math.abs(trigExpr(i.expr, t) - trigExpr(o, t)) < 1e-9),
  trigeq: (i, o) => { const want = val(i.val.replace(/^1\/√3$/, '1/Math.sqrt(3)').replace(/^−1\/√3$/, '-1/Math.sqrt(3)')); const sol = []; for (let d = 0; d <= 180; d++) { if (i.fn === 'tan' && d === 90) continue; if (Math.abs(trig[i.fn](d) - want) < 1e-9) sol.push(d); } const got = o.split(', ').map(N); return sol.length > 0 && got.length === sol.length && got.every((x) => sol.includes(x)); },
  inradius: (i, o) => { if (!near(heron(i.a, i.b, i.c), i.S)) throw new Error('area is wrong'); return near(val(o), (2 * i.S) / (i.a + i.b + i.c)); },
  outlier: (i, o) => { const iqr = i.q3 - i.q1; const v = N(o); return v <= i.q1 - 1.5 * iqr || v >= i.q3 + 1.5 * iqr; },
  transform: (i, o, par) => { const a = (ev(i.expr, 1) - ev(i.expr, 0)), b = ev(i.expr, 0); const want = par.ask === 'mean' ? a * i.m + b : par.ask === 'sd' ? Math.abs(a) * i.s : a * a * i.v; if (i.v !== i.s * i.s) throw new Error('v'); return near(N(o), want); },
  histogram: (i, o, par) => { const f = i.freq.split(',').map(Number); if (par.ask === 'mode') { const t = f.indexOf(Math.max(...f)); if (f.filter((x) => x === Math.max(...f)).length !== 1) throw new Error('tie'); return near(N(o), i.from + i.step * t + i.step / 2); } let c = 0; f.forEach((x, k) => { if (i.from + i.step * k >= i.th) c += x; }); if ((i.th - i.from) % i.step) throw new Error('threshold not on a boundary'); return N(o) === c; },
  boxplot: (i, o, par) => { const f = i.five.split(',').map(Number); if (!f.every((x, k) => !k || x > f[k - 1])) throw new Error('order'); return N(o) === (par.ask === 'iqr' ? f[3] - f[1] : f[4] - f[0]); },
  scatter: (i, o) => { const pts = i.pts.split(';').map((p) => p.split(',').map(Number)); const r = corr(pts); if (pts.some((p) => p.some((v) => v < 1 || v > 9))) throw new Error('point off the chart'); return Math.abs(r - N(o)) < 0.13; },
  divisors: (i, o) => { let c = 0; for (let d = 1; d <= i.n; d++) if (i.n % d === 0) c++; return N(o) === c; },
  repperm: (i, o) => N(o) === i.n ** i.r,
  gridpath: (i, o) => { const W = Array.from({ length: i.b + 1 }, () => Array(i.a + 1).fill(1)); for (let y = 1; y <= i.b; y++) for (let x = 1; x <= i.a; x++) W[y][x] = W[y - 1][x] + W[y][x - 1]; return N(o) === W[i.b][i.a]; },
  repeated: (i, o) => { let c = 0; for (let m = 0; m < 2 ** i.n; m++) if (m.toString(2).split('1').length - 1 === i.k) c++; return near(val(o), c / 2 ** i.n); },
  union: (i, o) => { let c = 0; for (let k = 1; k <= i.N; k++) if (k % i.a === 0 || k % i.b === 0) c++; return near(val(o), c / i.N); },
  tanchord: (i, o) => N(o) === i.x,
  tangentlen: (i, o) => { const { a, b, c } = i; if (!(a < b + c && b < a + c && c < a + b)) throw new Error('not a triangle'); const af = val(o), bf = c - af, cd = a - bf; return af > 0 && bf > 0 && cd > 0 && near(b - af, cd); },
  ceva: (i, o) => { const [m, n] = o.split(' : ').map(Number); return G(m, n) === 1 && near((i.p / i.q) * (i.r / i.s) * (m / n), 1); },
  twocircles: (i, o) => { const { r1, r2, d } = i; if (d <= 0 || r1 <= r2) throw new Error('bad circles'); const k = d > r1 + r2 ? 4 : d === r1 + r2 ? 3 : d > r1 - r2 ? 2 : d === r1 - r2 ? 1 : 0; return N(o) === k; },
  gcdlcm: (i, o, par) => N(o) === (par.ask === 'lcm' ? (i.a * i.b) / G(i.a, i.b) : G(i.a, i.b)),
  remainder: (i, o, par) => { const a = i.m * 3 + i.r1, b = i.m * 5 + i.r2; return N(o) === (par.ask === 'sum' ? a + b : a * b) % i.m; },
  dioph: (i, o) => { const m = i.eq.match(/^(\d+)x \+ (\d+)y = 1$/); const [x, y] = clean(o).replace(/[()]/g, '').split(', ').map(Number); return +m[1] * x + +m[2] * y === 1; },
  nbase: (i, o, par) => (par.dir === 'to10' ? N(o) === parseInt(i.num, i.base) : parseInt(o, i.base) === i.n && [...o].every((ch) => Number(ch) < i.base) && !/^0/.test(o)),
};
let total = 0, bad = 0; const distinct = {}; const seenT = {}; const want = new Set(Object.keys(OK)); const usedGen = new Set();
const cat = JSON.parse(fs.readFileSync(ROOT + 'data/catalog.json', 'utf8')); let types = 0;
for (const file of cat.subjects.flatMap((s) => s.units)) {
  const unit = JSON.parse(fs.readFileSync(`${ROOT}data/units/${file}.json`, 'utf8')); types += Object.keys(unit.types).length;
  for (const g of unit.groups) for (const ty of g.types) if (!unit.types[ty]) { console.log('group has unknown type', file, ty); bad++; }
  for (const ty of Object.keys(unit.types)) { if (!unit.groups.some((g) => g.types.includes(ty))) { console.log('type not in a group', file, ty); bad++; } if (!unit.templates.some((t) => t.type === ty)) { console.log('type without questions', file, ty); bad++; } }
  for (const tpl of unit.templates) {
    if (!unit.types[tpl.type]) { console.log('template with unknown type', tpl.id); bad++; }
    if (!want.has(tpl.gen)) continue; usedGen.add(tpl.gen);
    const ok = OK[tpl.gen]; if (tpl.params && tpl.params.options) continue; // 여집합 문제는 verify-math1-finish 가 맡습니다.
    (globalThis.__cov ||= new Set()).add(`${unit.id}/${tpl.id}`);
    for (let k = 0; k < 3000; k++) {
      const par = tpl.params || {}; const it = GENERATORS[tpl.gen](par); total++; const problems = [];
      const opts = [it.answer, ...it.wrong].map(String);
      try {
        if (!ok(it, String(it.answer), par)) problems.push('answer is wrong');
        if (it.wrong.length !== 3) problems.push('need 3 wrong options, got ' + it.wrong.length);
        if (new Set(opts).size !== 4) problems.push('duplicate option text');
        it.wrong.forEach((w) => { let also = false; try { also = ok(it, String(w), par); } catch (e) { also = false; } if (also) problems.push(`wrong option is also correct: ${w}`); });
        if (opts.some((o) => /NaN|undefined|Infinity/.test(o))) problems.push('bad option');
        if (['repeated', 'union'].includes(tpl.gen) && opts.some((o) => val(o) <= 0 || val(o) > 1)) problems.push('probability out of range: ' + opts.join(' | '));
        if (['tanchord'].includes(tpl.gen) && opts.some((o) => N(o) <= 0 || N(o) >= 180)) problems.push('angle out of range: ' + opts.join(' | '));
        if (['divisors', 'repperm', 'gridpath', 'gcdlcm', 'tangentlen', 'inradius', 'histogram', 'boxplot'].includes(tpl.gen) && opts.some((o) => val(o) <= 0)) problems.push('non-positive option: ' + opts.join(' | '));
        if (tpl.gen === 'remainder' && (N(it.answer) < 0 || N(it.answer) >= it.m)) problems.push('remainder out of range');
      } catch (e) { problems.push('error ' + e.message); }
      if (tpl.figure) for (const v of Object.values(tpl.figure)) { const f = String(v).replace(/\{(\w+)\}/g, (m, key) => (key in it ? it[key] : m)); if (/[{}]|undefined|NaN/.test(f)) problems.push('bad figure label ' + f); }
      for (const lang of ['ja', 'ko', 'en']) for (const part of ['text', 'explain', 'note']) { if (!tpl[part]) continue; const s = tpl[part][lang].replace(/\{(\w+)\}/g, (m, key) => (key in it ? it[key] : m)); if (/\{[A-Za-z]\w*\}|undefined|NaN/.test(s)) problems.push(`bad ${part}.${lang}: ${s}`); }
      if (problems.length) { bad++; seenT[tpl.id] = (seenT[tpl.id] || 0) + 1; if (seenT[tpl.id] <= 2) console.log('PROBLEM', tpl.id, JSON.stringify(it).slice(0, 230), [...new Set(problems)].join('; ').slice(0, 260)); }
      const key = { ...it }; delete key.wrong; (distinct[tpl.id] ||= new Set()).add(JSON.stringify(key));
    }
  }
}
for (const g of want) if (!usedGen.has(g)) { console.log('generator never used by a template:', g); bad++; }
fs.writeFileSync(new URL('./.covered-math1a.json', import.meta.url), JSON.stringify([...(globalThis.__cov || [])]));
console.log('types in catalog', types, '| checked', total, 'problems', bad, Object.keys(seenT).length ? JSON.stringify(seenT) : '');
console.log(Object.entries(distinct).map(([k, v]) => `${k}:${v.size}`).join('  '));
