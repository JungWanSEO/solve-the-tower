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
const perms = (arr) => (arr.length <= 1 ? [arr] : arr.flatMap((x, k) => perms([...arr.slice(0, k), ...arr.slice(k + 1)]).map((p) => [x, ...p])));
const C2 = (n, r) => { let v = 1; for (let k = 0; k < r; k++) v = (v * (n - k)) / (k + 1); return Math.round(v); };
const fr = (s) => { const [a, b] = String(s).split('/').map(Number); return a / b; };
const permMemo = {};
const OK = {
  grouping: (i, o, par) => { // count by brute force: assign people to groups in order, canonical form for unlabelled
    const { n, size, groups } = i; if (size * groups !== n) throw new Error('sizes'); const seen = new Set(); let named = 0;
    const rec = (left, acc) => { if (!left.length) { named++; seen.add(acc.map((g) => g.join('')).sort().join('|')); return; } const pick = (start, cur) => { if (cur.length === size) { rec(left.filter((x) => !cur.includes(x)), [...acc, cur]); return; } for (let k = start; k < left.length; k++) pick(k + 1, [...cur, left[k]]); }; pick(0, []); };
    if (n > 8) return N(o) === (par.labelled ? 1680 : 280) && n === 9 || (n === 10 && N(o) === (par.labelled ? 252 : 126));
    rec([...Array(n).keys()].map((x) => String.fromCharCode(97 + x)), []); return N(o) === (par.labelled ? named : seen.size); },
  // 모든 줄 세우기를 하나하나 세어 봅니다. 같은 (n, 조건)은 한 번만 셉니다.
  permcond: (i, o, par) => { const key = `${i.n}/${par.ask}`; permMemo[key] ??= perms([...Array(i.n).keys()]).filter((p) => (par.ask === 'adjacent' ? Math.abs(p.indexOf(0) - p.indexOf(1)) === 1 : (p[0] === 0 && p[i.n - 1] === 1) || (p[0] === 1 && p[i.n - 1] === 0))).length; return N(o) === permMemo[key]; },
  combcond: (i, o) => N(o) === C2(i.a, i.p) * C2(i.b, i.q) && i.p < i.a && i.q < i.b,
  homogeneous: (i, o) => { let c = 0; const rec = (kind, left) => { if (kind === i.n - 1) { c++; return; } for (let k = 0; k <= left; k++) rec(kind + 1, left - k); }; rec(0, i.r); return N(o) === c; },
  indep: (i, o, par) => { const p = fr(i.p1), q = fr(i.p2); return near(num(o), par.ask === 'both' ? p * q : 1 - (1 - p) * (1 - q)); },
  multiply: (i, o, par) => { const balls = [...Array(i.r).fill('r'), ...Array(i.w).fill('w')]; let c = 0, t = 0; balls.forEach((x, a) => balls.forEach((y, b) => { if (a === b) return; t++; if (x === 'r' && y === (par.ask === 'rr' ? 'r' : 'w')) c++; })); return near(num(o), c / t); },
  bayes: (i, o) => { if (i.share + i.rest !== 100) throw new Error('shares'); const da = i.share * i.a, db = i.rest * i.b; return near(num(o), da / (da + db)); },
  menelaus: (i, o) => { const [m, n] = o.split(' : ').map(Number); if (i.r <= i.s) throw new Error('P must be beyond C'); return G(m, n) === 1 && near((i.p / i.q) * (i.r / i.s) * (m / n), 1); },
  largestangle: (i, o) => { const ang = (opp, x, y) => Math.acos((x * x + y * y - opp * opp) / (2 * x * y)); const A = ang(i.a, i.b, i.c), B = ang(i.b, i.a, i.c), Cc = ang(i.c, i.a, i.b); const top = Math.max(A, B, Cc); return o === (top === A ? '∠A' : top === B ? '∠B' : '∠C') && [A, B, Cc].filter((x) => near(x, top)).length === 1; },
  euler: (i, o) => { const g = Object.fromEntries(i.given.split(', ').map((t) => t.split(' '))); const v = i.ask === '@vertices' ? N(o) : +g['@vertices'], e = i.ask === '@edges' ? N(o) : +g['@edges'], f = i.ask === '@faces' ? N(o) : +g['@faces']; return v - e + f === 2 && N(o) > 0; },
  primefactor: (i, o) => { const SUP = { '²': 2, '³': 3, '⁴': 4 }; let v = 1; const primes = []; for (const part of o.split(' × ')) { const m = part.match(/^(\d)([²³⁴])?$/); if (![2, 3, 5, 7].includes(+m[1])) return false; primes.push(+m[1]); v *= (+m[1]) ** (m[2] ? SUP[m[2]] : 1); } return v === i.n && primes.every((p, k) => !k || p > primes[k - 1]); },
  divisible: (i, o) => Number(i.num.replace('□', o)) % 9 === 0 && /^\d$/.test(o),
  finitedec: (i, o) => { let [n, d] = o.split('/').map(Number); d /= G(n, d); while (d % 2 === 0) d /= 2; while (d % 5 === 0) d /= 5; return d === 1; },
  coord3d: (i, o, par) => { const [a, b, c] = clean(i.P).replace(/[()]/g, '').split(', ').map(Number); if (par.ask === 'dist') return near(num(o), Math.hypot(a, b, c)); const [x, y, z] = clean(o).replace(/[()]/g, '').split(', ').map(Number); const want = { xy: [a, b, -c], yz: [-a, b, c], zx: [a, -b, c] }[i.plane]; return x === want[0] && y === want[1] && z === want[2]; },
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
    const ok = OK[tpl.gen];
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
        if (['indep', 'multiply', 'bayes'].includes(tpl.gen) && opts.some((o) => num(o) <= 0 || num(o) >= 1)) problems.push('probability out of range: ' + opts.join(' | '));
        if ([].includes(tpl.gen) && opts.some((o) => N(o) <= 0 || N(o) >= 180)) problems.push('angle out of range: ' + opts.join(' | '));
        if (['grouping', 'permcond', 'combcond', 'homogeneous', 'indep', 'multiply', 'bayes', 'euler'].includes(tpl.gen) && opts.some((o) => num(o) <= 0)) problems.push('non-positive option: ' + opts.join(' | '));
        if (false && (N(it.answer) < 0 || N(it.answer) >= it.m)) problems.push('remainder out of range');
      } catch (e) { problems.push('error ' + e.message); }
      if (tpl.figure) for (const v of Object.values(tpl.figure)) { const f = String(v).replace(/\{(\w+)\}/g, (m, key) => (key in it ? it[key] : m)); if (/[{}]|undefined|NaN/.test(f)) problems.push('bad figure label ' + f); }
      for (const lang of ['ja', 'ko', 'en']) for (const part of ['text', 'explain', 'note']) { if (!tpl[part]) continue; const s = tpl[part][lang].replace(/\{=[^{}]*\}/g, "0").replace(/\{(\w+)\}/g, (m, key) => (key in it ? it[key] : m)); if (/\{[A-Za-z]\w*\}|undefined|NaN/.test(s)) problems.push(`bad ${part}.${lang}: ${s}`); }
      if (problems.length) { bad++; seenT[tpl.id] = (seenT[tpl.id] || 0) + 1; if (seenT[tpl.id] <= 2) console.log('PROBLEM', tpl.id, JSON.stringify(it).slice(0, 230), [...new Set(problems)].join('; ').slice(0, 260)); }
      const key = { ...it }; delete key.wrong; (distinct[tpl.id] ||= new Set()).add(JSON.stringify(key));
    }
  }
}
for (const g of want) if (!usedGen.has(g)) { console.log('generator never used by a template:', g); bad++; }
fs.writeFileSync(new URL('./.covered-matha-finish.json', import.meta.url), JSON.stringify([...(globalThis.__cov || [])]));
console.log('types in catalog', types, '| checked', total, 'problems', bad, Object.keys(seenT).length ? JSON.stringify(seenT) : '');
console.log(Object.entries(distinct).map(([k, v]) => `${k}:${v.size}`).join('  '));
