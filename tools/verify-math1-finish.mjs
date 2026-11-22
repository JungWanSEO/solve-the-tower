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
const trigExpr = (s, th) => Function('sin', 'cos', 'tan', 't', `return (${clean(s).replace(/°/g, '').replace(/θ/g, 't').replace(/(sin|cos|tan) t/g, '$1(t)').replace(/(sin|cos|tan)\(([^)]*)\)/g, '$1($2)')});`)(trig.sin, trig.cos, trig.tan, th);
const corr = (pts) => { const n = pts.length, mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n; const sxy = pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0); return sxy / Math.sqrt(pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0) * pts.reduce((a, p) => a + (p[1] - my) ** 2, 0)); };
const heron = (a, b, c) => { const s = (a + b + c) / 2; return Math.sqrt(s * (s - a) * (s - b) * (s - c)); };

const j2 = (s) => js(String(s).replace(/x\(/g, 'x*(').replace(/\)\(/g, ')*('));
const ev2 = (s, x) => Function('x', `return (${j2(s)});`)(x);
const P5 = [-2.3, -1, 0.5, 1.7, 3.1];
const rootJs = (s) => clean(s).replace(/(\d+)?√(\d+)/g, (m, k, r) => `${k ? k + '*' : ''}Math.sqrt(${r})`).replace(/√\(/g, 'Math.sqrt(').replace(/\|([^|]+)\|/g, 'Math.abs($1)');
const num = (s) => Function(`return (${rootJs(String(s).replace(/ cm²$/, ''))});`)();
const condP = (text) => { const t = clean(text); const parts = t.split(/ @(and|or) /); if (parts.length === 1) return ineq(t); const p = ineq(parts[0]), q = ineq(parts[2]); return parts[1] === 'and' ? (x) => p(x) && q(x) : (x) => p(x) || q(x); };
const kPred = (s) => { const t = clean(s); let m; if ((m = t.match(/^(-?\d+) < k < (-?\d+)$/))) return (k) => +m[1] < k && k < +m[2]; if ((m = t.match(/^k < (-?\d+), (-?\d+) < k$/))) return (k) => k < +m[1] || +m[2] < k; if ((m = t.match(/^k (≦|<|>|≧) (-?\d+)$/))) return (k) => cmp[m[1]](k, +m[2]); throw new Error('k range ' + s); };
const KS = []; for (let k = -70; k <= 70; k += 0.25) KS.push(k);
const binomTail = (n, k) => { let c = 1, sum = 0; const C = [1]; for (let i = 1; i <= n; i++) C.push((C[i - 1] * (n - i + 1)) / i); for (let i = k; i <= n; i++) sum += C[i]; return sum / 2 ** n; };
const OK = {
  polyadd: (i, o, par) => P5.every((x) => near(ev2(o, x), ev2(i.A, x) + (par.op === '+' ? 1 : -1) * ev2(i.B, x))),
  coef: (i, o) => { const f = (x) => ev2(i.expr, x); const c0 = f(0), c2 = (f(1) + f(-1)) / 2 - c0, S = (f(1) - f(-1)) / 2, c3 = (f(2) - 4 * c2 - c0 - 2 * S) / 6, c1 = S - c3; if (!near(c3, Math.round(c3))) throw new Error('not cubic'); return near(N(o), i.which === 'x²' ? c2 : c1); },
  factor2: (i, o) => P5.every((x) => near(ev2(o, x), ev2(i.expr, x))) && /\(/.test(o),
  recurring: (i, o) => { const body = i.dec.slice(2, -1); const len = body.length / 3; const rep = body.slice(0, len); if (body !== rep + rep + rep) throw new Error('not repeating'); return near(num(o), Number(rep) / (10 ** len - 1)); },
  absval: (i, o) => near(N(o), num(i.expr)),
  surdadd: (i, o) => near(num(o), num(i.expr)),
  surdbinom: (i, o) => near(num(o), i.c / (Math.sqrt(i.a) + i.b)),
  nested: (i, o) => near(num(o), num(i.expr)),
  ineqword: (i, o) => { let n = 0; while (i.price * (n + 1) + i.box <= i.budget) n++; return N(o) === n; },
  setop: (i, o, par) => { if (!par.options) return null; const A = setOf(i.A), B = setOf(i.B), U = [1, 2, 3, 4, 5, 6, 7, 8, 9]; const want = par.ask === 'notcup' ? U.filter((x) => !A.has(x) && !B.has(x)) : U.filter((x) => !A.has(x)); return eqSet(setOf(o), new Set(want)); },
  truth: (i, o) => { const [p, q] = o.split(' ⟹ ').map(ineq); return XS.every((x) => !p(x) || q(x)); },
  negation: (i, o) => { const s = condP(i.stmt), a = condP(o); return XS.every((x) => a(x) === !s(x)); },
  fvalue: (i, o) => near(N(o), ev2(i.f, N(i.k))),
  range1: (i, o) => { const m = clean(o).match(/^(-?\d+) ≦ y ≦ (-?\d+)$/); const ys = [ev2(i.f, N(i.s)), ev2(i.f, N(i.t))]; return near(+m[1], Math.min(...ys)) && near(+m[2], Math.max(...ys)) && N(i.s) < N(i.t); },
  reflect: (i, o) => P5.every((x) => near(ev2(o, x), i.axis === '@xaxis' ? -ev2(i.f, x) : i.axis === '@yaxis' ? ev2(i.f, -x) : -ev2(i.f, -x))),
  threepoints: (i, o) => near(ev2(o, 0), N(i.y0)) && near(ev2(o, 1), N(i.y1)) && near(ev2(o, -1), N(i.y2)),
  maxminconst: (i, o) => { const g = (x) => ev2(i.f.replace(' + c', ''), x); let best = -Infinity; for (let x = N(i.s); x <= N(i.t) + 1e-9; x += 0.125) best = Math.max(best, g(x) + N(o)); return near(best, N(i.M)); },
  formula: (i, o) => { const body = clean(o).replace('x = ', ''); const f = (x) => ev2(i.f.replace(' = 0', ''), x); const both = ['+', '-'].map((sg) => num(body.replace('±', sg))); return both.every((x) => Math.abs(f(x)) < 1e-9) && !near(both[0], both[1]); },
  realcond: (i, o) => { const g = (x) => ev2(i.f.replace(' + k = 0', ''), x); const b = g(1) - 1; const want = (k) => { const D = b * b - 4 * k; return i.cond === '@real' ? D >= 0 : i.cond === '@two' ? D > 0 : D < 0; }; const got = kPred(o); return KS.every((k) => got(k) === want(k)); },
  alwayspos: (i, o) => { const c = Number(i.f.match(/\+ (\d+)$/)[1]); const got = kPred(o); return KS.every((k) => got(k) === (k * k - 4 * c < 0)); },
  quadsystem: (i, o) => { const g = ineq(i.g); const want = (x) => ev2(i.f, x) < 0 && g(x); const edges = XS.filter((x) => Math.abs(ev2(i.f, x)) < 1e-9 || near(x, N(i.g.split(' ')[2]))); return same(want, rangePred(o), edges) && XS.some(want); },
  rectmax: (i, o) => { let best = 0; for (let x = 0; x <= i.P / 2; x += 0.25) best = Math.max(best, x * (i.P / 2 - x)); return / cm²$/.test(o) && near(num(o), best); },
  tritype: (i, o) => { const [a, b, c] = [i.a, i.b, i.c].sort((x, y) => x - y); const k = c >= a + b ? '@notri' : a * a + b * b === c * c ? '@right' : a * a + b * b > c * c ? '@acute' : '@obtuse'; return o === k; },
  heron: (i, o) => { if (!(i.a < i.b + i.c && i.b < i.a + i.c && i.c < i.a + i.b)) throw new Error('not a triangle'); return near(num(o), heron(i.a, i.b, i.c)); },
  tetra: (i, o, par) => { const a = i.a; const h = Math.sqrt(a * a - (a / Math.sqrt(3)) ** 2); const vol = ((Math.sqrt(3) / 4) * a * a * h) / 3; return Math.abs(num(o) - (par.ask === 'height' ? h : vol)) < 1e-9; },
  mode: (i, o) => { const v = i.list.split(', ').map(Number); const c = {}; v.forEach((x) => { c[x] = (c[x] || 0) + 1; }); const top = Math.max(...Object.values(c)); const modes = Object.keys(c).filter((k) => c[k] === top); if (modes.length !== 1) throw new Error('several modes'); return N(o) === Number(modes[0]); },
  histmean: (i, o) => { const f = i.freq.split(',').map(Number); const tot = f.reduce((a, b) => a + b, 0); return near(N(o), f.reduce((a, x, k) => a + x * (i.from + i.step * k + i.step / 2), 0) / tot); },
  hypothesis: (i, o) => { const p = binomTail(30, i.k); if (Math.abs(p - Number(i.p)) > 0.0006) throw new Error(`stated probability ${i.p} but exact is ${p.toFixed(4)}`); return o === (p < 0.05 ? '@reject' : '@keep'); },
  var2: (i, o) => N(o) === i.q - i.m * i.m && i.q - i.m * i.m > 0,
  mergemean: (i, o) => near(N(o), (i.n1 * i.m1 + i.n2 * i.m2) / (i.n1 + i.n2)),
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
    const ok = OK[tpl.gen]; if (tpl.gen === 'setop' && !(tpl.params || {}).options) continue;
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
        if ([].includes(tpl.gen) && opts.some((o) => val(o) <= 0 || val(o) > 1)) problems.push('probability out of range: ' + opts.join(' | '));
        if ([].includes(tpl.gen) && opts.some((o) => N(o) <= 0 || N(o) >= 180)) problems.push('angle out of range: ' + opts.join(' | '));
        if (['ineqword', 'heron', 'tetra', 'mode', 'histmean', 'var2', 'mergemean', 'recurring'].includes(tpl.gen) && opts.some((o) => num(o) <= 0)) problems.push('non-positive option: ' + opts.join(' | '));
        if (false && (N(it.answer) < 0 || N(it.answer) >= it.m)) problems.push('remainder out of range');
      } catch (e) { problems.push('error ' + e.message); }
      if (tpl.figure) for (const v of Object.values(tpl.figure)) { const f = String(v).replace(/\{(\w+)\}/g, (m, key) => (key in it ? it[key] : m)); if (/[{}]|undefined|NaN/.test(f)) problems.push('bad figure label ' + f); }
      for (const lang of ['ja', 'ko', 'en']) for (const part of ['text', 'explain', 'note']) { if (!tpl[part]) continue; const s = tpl[part][lang].replace(/\{(\w+)\}/g, (m, key) => (key in it ? it[key] : m)); if (/\{[A-Za-z]\w*\}|undefined|NaN/.test(s)) problems.push(`bad ${part}.${lang}: ${s}`); }
      if (problems.length) { bad++; seenT[tpl.id] = (seenT[tpl.id] || 0) + 1; if (seenT[tpl.id] <= 2) console.log('PROBLEM', tpl.id, JSON.stringify(it).slice(0, 230), [...new Set(problems)].join('; ').slice(0, 260)); }
      const key = { ...it }; delete key.wrong; (distinct[tpl.id] ||= new Set()).add(JSON.stringify(key));
    }
  }
}
for (const g of want) if (!usedGen.has(g)) { console.log('generator never used by a template:', g); bad++; }
fs.writeFileSync(new URL('./.covered-math1-finish.json', import.meta.url), JSON.stringify([...(globalThis.__cov || [])]));
console.log('types in catalog', types, '| checked', total, 'problems', bad, Object.keys(seenT).length ? JSON.stringify(seenT) : '');
console.log(Object.entries(distinct).map(([k, v]) => `${k}:${v.size}`).join('  '));
