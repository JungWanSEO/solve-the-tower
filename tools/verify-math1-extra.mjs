// Independent check of the generators added for 命題, 空間図形, 相関 and 数学A.
import fs from 'node:fs';
const ROOT = new URL('../', import.meta.url).pathname; // 저장소 폴더
globalThis.document = { documentElement: {} };
const { GENERATORS } = await import(ROOT + 'js/generators.js');
const N = (s) => Number(String(s).replace(/−/g, '-').replace(/°| m$/g, ''));
const val = (s) => Function(`return (${String(s).replace(/ m$/, '').replace(/°/g, '').replace(/−/g, '-').replace(/(\d+)?√(\d+)/g, (m, k, r) => `${k ? k + '*' : ''}Math.sqrt(${r})`)});`)();
const near = (a, b) => Math.abs(a - b) < 1e-9;
const tanD = (d) => Math.tan((d * Math.PI) / 180);
const F = (n) => (n <= 1 ? 1 : n * F(n - 1));
const cmp = { '>': (a, b) => a > b, '<': (a, b) => a < b, '≧': (a, b) => a >= b, '≦': (a, b) => a <= b, '=': (a, b) => a === b, '≠': (a, b) => a !== b };
const pred = (text) => { const m = text.replace(/−/g, '-').match(/^(x²|x) (\S+) (-?\d+)$/); if (!m) throw new Error('bad pred ' + text); return (x) => cmp[m[2]](m[1] === 'x²' ? x * x : x, Number(m[3])); };
const parts = (s) => s.split(' ⟹ ');
const XS = []; for (let x = -12; x <= 12; x += 0.5) XS.push(x);
const sameP = (p, q) => XS.every((x) => p(x) === q(x));
const notP = (p) => (x) => !p(x);
const OK = {
  proposition: (i, o, par) => { const [p, q] = parts(i.stmt).map(pred); const [a, b] = parts(o).map(pred); const want = { converse: [q, p], inverse: [notP(p), notP(q)], contra: [notP(q), notP(p)] }[par.ask]; if (!XS.every((x) => !p(x) || q(x))) throw new Error('original statement is false: ' + i.stmt); return sameP(a, want[0]) && sameP(b, want[1]); },
  condition: (i, o) => { const fn = (text) => { const m = text.replace(/−/g, '-').match(/^(.+?) (=|>|<|≧|≦) (-?\d+)$/); if (!m) throw new Error('bad cond ' + text); const lhs = m[1].replace(/\|x\|/g, 'Math.abs(x)').replace(/x²/g, '(x*x)').replace(/(\d)x/g, '$1*x'); const f = Function('x', `return (${lhs});`); return (x) => cmp[m[2]](Math.round(f(x) * 1e6) / 1e6, Number(m[3])); }; const p = fn(i.p), q = fn(i.q); const G = []; for (let x = -60; x <= 60; x += 0.25) G.push(x); const pq = G.every((x) => !p(x) || q(x)), qp = G.every((x) => !q(x) || p(x)); if ((i.pq === '@true') !== pq || (i.qp === '@true') !== qp) throw new Error('pq/qp flags wrong'); return o === (pq && qp ? '@necsuf' : pq ? '@suf' : qp ? '@nec' : '@neither'); },
  cuboid: (i, o) => near(val(o), Math.hypot(i.a, i.b, i.c)),
  spaceheight: (i, o) => { const h = val(o); return near(Math.hypot(h / tanD(i.al), h / tanD(i.be)), i.d) || Math.abs(Math.hypot(h / tanD(i.al), h / tanD(i.be)) - i.d) < 1e-6; },
  covariance: (i, o) => { const pts = [...i.pairs.matchAll(/\((-?\d+), (-?\d+)\)/g)].map((m) => [Number(m[1]), Number(m[2])]); const n = pts.length; const mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n; if (!near(mx, i.mx) || !near(my, i.my)) throw new Error('stated means are wrong'); return near(pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / n, N(o)); },
  correlation: (i, o) => { const r = N(i.sxy) / (i.sx * i.sy); if (Math.abs(r) > 1) throw new Error('|r| > 1'); return near(r, N(o)); },
  perm: (i, o) => N(o) === F(i.n) / F(i.n - i.r),
  comb: (i, o) => N(o) === F(i.n) / F(i.n - i.r) / F(i.r),
  circular: (i, o) => N(o) === F(i.n - 1),
  samearrange: (i, o) => { let c = 0; const rec = (p, q) => { if (!p && !q) { c++; return; } if (p) rec(p - 1, q); if (q) rec(p, q - 1); }; rec(i.p, i.q); return N(o) === c; },
  dicesum: (i, o) => { let c = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b === i.s) c++; return near(val(o), c / 36); },
  complement: (i, o) => { let c = 0; for (let m = 0; m < 2 ** i.n; m++) if (m) c++; return near(val(o), c / 2 ** i.n); },
  conditional: (i, o) => { let rr = 0, r1 = 0; const balls = [...Array(i.r).fill('r'), ...Array(i.w).fill('w')]; balls.forEach((x, a) => balls.forEach((y, b) => { if (a !== b && x === 'r') { r1++; if (y === 'r') rr++; } })); return near(val(o), rr / r1); },
  expectation: (i, o) => { if (i.rest !== 10 - i.p - i.q || i.rest < 0) throw new Error('ticket count'); return near(N(o), (i.a * i.p + i.b * i.q + 0 * i.rest) / 10); },
  bisector: (i, o) => { const bd = val(o); if (!(i.a < i.b + i.c && i.b < i.a + i.c && i.c < i.a + i.b)) throw new Error('not a triangle'); return near(bd / (i.a - bd), i.c / i.b); },
  centroid: (i, o) => near(val(o), (2 * i.m) / 3),
  incenter: (i, o) => { const B = (180 - i.A) * 0.4, C = 180 - i.A - B; return near(N(o), 180 - B / 2 - C / 2); },
  circumcenter: (i, o) => i.A < 90 && near(N(o), 2 * i.A),
  inscribed: (i, o, par) => (par.ask === 'central' ? near(N(o), 2 * i.x) : near(N(o), i.x / 2)) && N(o) > 0 && N(o) < 360,
  cyclic: (i, o) => near(N(o) + i.A, 180),
  power: (i, o) => near(i.a * i.b, i.c * val(o)),
  tangent: (i, o) => near(val(o) ** 2, i.a * i.b),
};
let total = 0, bad = 0; const distinct = {}; const want = new Set(Object.keys(OK));
for (const file of ['math1-expr', 'math1-trig', 'math1-data', 'matha-count', 'matha-geom']) {
  const unit = JSON.parse(fs.readFileSync(`${ROOT}data/units/${file}.json`, 'utf8'));
  for (const g of unit.groups) for (const ty of g.types) if (!unit.types[ty]) { console.log('group has unknown type', ty); bad++; }
  for (const ty of Object.keys(unit.types)) if (!unit.groups.some((g) => g.types.includes(ty))) { console.log('type not in a group', ty); bad++; }
  for (const tpl of unit.templates) {
    if (!want.has(tpl.gen)) continue;
    const ok = OK[tpl.gen]; if (!GENERATORS[tpl.gen] || !unit.types[tpl.type]) { console.log('MISSING', tpl.id); bad++; continue; }
    (globalThis.__cov ||= new Set()).add(`${unit.id}/${tpl.id}`);
    for (let k = 0; k < 4000; k++) {
      const par = tpl.params || {}; const it = GENERATORS[tpl.gen](par); total++; const problems = [];
      const opts = [it.answer, ...it.wrong].map(String);
      try {
        if (!ok(it, it.answer, par)) problems.push('answer is wrong');
        if (it.wrong.length !== 3) problems.push('need 3 wrong options');
        if (new Set(opts).size !== 4) problems.push('duplicate option text');
        it.wrong.forEach((w) => { let also = false; try { also = ok(it, w, par); } catch (e) { also = false; } if (also) problems.push(`wrong option is also correct: ${w}`); });
        if (opts.some((o) => /NaN|undefined|Infinity/.test(o))) problems.push('bad option');
        if (/°$/.test(it.answer) && opts.some((o) => N(o) <= 0 || N(o) >= 360)) problems.push('angle out of range: ' + opts.join(' | '));
        if (['dicesum', 'complement', 'conditional'].includes(tpl.gen) && opts.some((o) => val(o) <= 0 || val(o) >= 1)) problems.push('probability out of range: ' + opts.join(' | '));
        if (opts.some((o) => /^−|^0($| )/.test(o)) && !['correlation', 'covariance', 'condition'].includes(tpl.gen)) problems.push('non-positive option: ' + opts.join(' | '));
      } catch (e) { problems.push('error ' + e.message); }
      if (tpl.figure) for (const v of Object.values(tpl.figure)) { const f = String(v).replace(/\{(\w+)\}/g, (m, key) => (key in it ? it[key] : m)); if (/[{}]|undefined|NaN/.test(f)) problems.push('bad figure label ' + f); }
      for (const lang of ['ja', 'ko', 'en']) for (const part of ['text', 'explain', 'note']) { if (!tpl[part]) continue; const s = tpl[part][lang].replace(/\{(\w+)\}/g, (m, key) => (key in it ? it[key] : m)); if (/[{}]|undefined|NaN/.test(s)) problems.push(`bad ${part}.${lang}: ${s}`); }
      if (problems.length) { bad++; const seenT = (globalThis.__s ||= {}); seenT[tpl.id] = (seenT[tpl.id] || 0) + 1; if (seenT[tpl.id] <= 2) console.log('PROBLEM', tpl.id, JSON.stringify(it), [...new Set(problems)].join('; ')); }
      const key = { ...it }; delete key.wrong; (distinct[tpl.id] ||= new Set()).add(JSON.stringify(key));
    }
  }
}
fs.writeFileSync(new URL('./.covered-math1-extra.json', import.meta.url), JSON.stringify([...(globalThis.__cov || [])]));
console.log('checked', total, 'problems', bad);
console.log(Object.entries(distinct).map(([k, v]) => `${k}:${v.size}`).join('  '));
