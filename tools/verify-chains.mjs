// Independent check of the chain (linked question) generators.
import fs from 'node:fs';
const ROOT = new URL('../', import.meta.url).pathname; // 저장소 폴더
globalThis.document = { documentElement: {} };
const { CHAINS } = await import(ROOT + 'js/generators.js');
const clean = (s) => String(s).replace(/−/g, '-');
const N = (s) => Number(clean(s));
const num = (s) => Function(`return (${clean(s).replace(/(\d+)?√(\d+)/g, (m, k, r) => `${k ? k + '*' : ''}Math.sqrt(${r})`)});`)();
const near = (a, b) => Math.abs(a - b) < 1e-9;
const js = (s) => clean(s).replace(/^y = /, '').replace(/\(([^()]*)\)²/g, '(($1)*($1))').replace(/x²/g, '(x*x)').replace(/(\d)x/g, '$1*x').replace(/(\d)\(/g, '$1*(').replace(/^-\(/, '-1*(');
const ev = (s, x) => Function('x', `return (${js(s)});`)(x);
const pt = (s) => clean(s).replace(/[()]/g, '').split(', ').map(Number);
const G = (a, b) => (b ? G(b, a % b) : Math.abs(a));
const XS = [-3.1, -1, 0.3, 2.2, 4.5];
const OK = {
  quad: [
    (d, o) => /\)²|x²/.test(o) && XS.every((x) => near(ev(o, x), ev(d.f, x))) && !/x² [+-] \d+x/.test(clean(o)),
    (d, o) => { const [p, q] = pt(o); const f = (x) => ev(d.f, x); return near(f(p), q) && near(f(p + 1), f(p - 1)); },
    (d, o) => { let best = -Infinity; for (let x = N(d.s); x <= N(d.t) + 1e-9; x += 0.125) best = Math.max(best, ev(d.f, x)); return near(best, N(o)); },
  ],
  tri: [
    (d, o) => near(num(o), Math.sqrt(d.b * d.b + d.c * d.c - 2 * d.b * d.c * Math.cos(d.A * Math.PI / 180))),
    (d, o) => near(num(o), 0.5 * d.b * d.c * Math.sin(d.A * Math.PI / 180)),
    (d, o) => { const a = Math.sqrt(d.b * d.b + d.c * d.c - 2 * d.b * d.c * Math.cos(d.A * Math.PI / 180)); const S = 0.5 * d.b * d.c * Math.sin(d.A * Math.PI / 180); return Math.abs(num(o) - (2 * S) / (a + d.b + d.c)) < 1e-9; },
  ],
  data: [
    (d, o) => { const v = d.list.split(', ').map(Number); return near(N(o), v.reduce((a, b) => a + b, 0) / v.length); },
    (d, o) => { const v = d.list.split(', ').map(Number); const m = v.reduce((a, b) => a + b, 0) / v.length; return near(N(o), v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length); },
    (d, o) => { const v = d.list.split(', ').map(Number); const m = v.reduce((a, b) => a + b, 0) / v.length; return near(N(o), Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length)); },
  ],
  prob: (() => { const pairs = (d) => { const balls = [...Array(d.r).fill(1), ...Array(d.w).fill(0)]; const out = []; for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) out.push(balls[i] + balls[j]); return out; }; return [
    (d, o) => N(o) === pairs(d).length,
    (d, o) => near(num(o), pairs(d).filter((x) => x === 2).length / pairs(d).length),
    (d, o) => near(num(o), pairs(d).reduce((a, b) => a + b, 0) / pairs(d).length),
  ]; })(),
  right: [
    (d, o) => near(num(o), Math.hypot(d.a, d.b)),
    (d, o) => near(num(o), d.a / Math.hypot(d.a, d.b)),
    (d, o) => near(num(o), (d.a * d.b) / (d.a + d.b + Math.hypot(d.a, d.b))),
  ],
  roots: (() => { const f = (d) => (x) => ev(d.f, x); const nums = (o) => (clean(o).match(/-?\d+(\.\d+)?/g) || []).map(Number); return [
    (d, o) => { const c = f(d)(0), b = f(d)(1) - 1 - c; return N(o) === b * b - 4 * c; },
    (d, o) => { const r = nums(o); return /^x = /.test(o) && r.length === 2 && r[0] !== r[1] && r.every((x) => near(f(d)(x), 0)); },
    (d, o) => { const r = nums(o); if (!/^-?[\d.]+ < x < -?[\d.]+$/.test(clean(o))) return false; return near(f(d)(r[0]), 0) && near(f(d)(r[1]), 0) && f(d)((r[0] + r[1]) / 2) < 0; },
  ]; })(),
  // 원 위에 실제로 점을 놓고 각을 재서 맞춰 봅니다. B 는 0°, D 는 2A°(중심각), A 는 큰 호 위, C 는 작은 호 위.
  circle: (() => { const rad = (x) => x * Math.PI / 180; const P = (t) => [Math.cos(rad(t)), Math.sin(rad(t))]; const ang = (v, p, q) => { const a = [p[0] - v[0], p[1] - v[1]], b = [q[0] - v[0], q[1] - v[1]]; return Math.acos((a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b))) * 180 / Math.PI; };
    const pts = (d) => ({ B: P(0), D: P(2 * d.A), A: P(2 * d.A + (360 - 2 * d.A) / 2), C: P(d.A * 0.7), O: [0, 0] });
    const isDeg = (o) => /^\d+°$/.test(o);
    return [
      (d, o) => { if (!isDeg(o)) return false; const q = pts(d); if (!near(ang(q.A, q.B, q.D), d.A)) throw new Error('setup'); return Math.abs(parseFloat(o) - ang(q.C, q.B, q.D)) < 1e-6; },
      (d, o) => { const q = pts(d); return Math.abs(parseFloat(o) - ang(q.O, q.B, q.D)) < 1e-6; },
      (d, o) => { const q = pts(d); const t = ang(q.B, [q.B[0], q.B[1] + 1], q.D); return Math.abs(parseFloat(o) - Math.min(t, 180 - t)) < 1e-6; },
    ]; })(),
  // 사람을 하나하나 세워 보며 셉니다.
  count: (() => { const triples = (n) => { const out = []; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) if (i !== j && j !== k && i !== k) out.push([i, j, k]); return out; };
    return [
      (d, o) => N(o) === triples(d.n).length,
      (d, o) => N(o) === triples(d.n).filter((t) => t[0] < t[1] && t[1] < t[2]).length,
      (d, o) => N(o) === triples(d.n).filter((t) => t[0] < t[1] && t[1] < t[2] && t.includes(0)).length,
    ]; })(),
  // 숨겨 둔 x, y 로 직접 계산해 봅니다. (주어진 합과 곱이 그 x, y 의 것인지도 확인)
  sym: (() => { const ok = (d) => { if (N(d.s) !== d.x + d.y || N(d.p) !== d.x * d.y) throw new Error('sum or product'); return true; }; return [
    (d, o) => ok(d) && N(o) === d.x ** 2 + d.y ** 2,
    (d, o) => ok(d) && N(o) === (d.x - d.y) ** 2,
    (d, o) => ok(d) && N(o) === d.x ** 3 + d.y ** 3,
  ]; })(),
  euclid: [
    (d, o) => { let r = d.a; while (r >= d.b) r -= d.b; return N(o) === r && r !== 0; },
    (d, o) => { let best = 1; for (let k = 1; k <= d.b; k++) if (d.a % k === 0 && d.b % k === 0) best = k; return N(o) === best; },
    (d, o) => { let best = 1; for (let k = 1; k <= d.b; k++) if (d.a % k === 0 && d.b % k === 0) best = k; return N(o) === d.b / best; },
  ],
  box: (() => { const q = (d) => { const v = d.list.split(', ').map(Number); if (v.length !== 7 || !v.every((x, k) => !k || x > v[k - 1])) throw new Error('list'); const med = (a) => (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2); return { m: med(v), q1: med(v.slice(0, 3)), q3: med(v.slice(4)) }; }; return [
    (d, o) => N(o) === q(d).m,
    (d, o) => N(o) === q(d).q3 - q(d).q1,
    (d, o) => near(N(o), q(d).q3 + 1.5 * (q(d).q3 - q(d).q1)),
  ]; })(),
  int: [
    (d, o) => N(o) === G(d.a, d.b),
    (d, o) => N(o) === (d.a * d.b) / G(d.a, d.b),
    (d, o) => N(o) === d.a * d.b,
  ],
};
let total = 0, bad = 0; const seen = {}; const used = new Set();
const cat = JSON.parse(fs.readFileSync(ROOT + 'data/catalog.json', 'utf8'));
for (const file of cat.subjects.flatMap((s) => s.units)) {
  const unit = JSON.parse(fs.readFileSync(`${ROOT}data/units/${file}.json`, 'utf8'));
  for (const ch of unit.chains || []) {
    used.add(ch.gen);
    (globalThis.__cov ||= new Set()).add(`${unit.id}/${ch.id}`);
    if (!CHAINS[ch.gen] || !OK[ch.gen]) { console.log('MISSING', ch.id); bad++; continue; }
    if (ch.steps.length !== OK[ch.gen].length) { console.log('step count', ch.id); bad++; }
    for (const s of ch.steps) if (!unit.types[s.type]) { console.log('unknown type', ch.id, s.type); bad++; }
    const distinct = new Set();
    for (let k = 0; k < 4000; k++) {
      const d = CHAINS[ch.gen](); total++; const problems = [];
      if (d.steps.length !== ch.steps.length) problems.push('generator step count');
      const answers = {}; d.steps.forEach((s, i) => { answers[`a${i + 1}`] = s.answer; });
      d.steps.forEach((s, i) => {
        const opts = [s.answer, ...s.wrong].map(String);
        try {
          if (!OK[ch.gen][i](d, String(s.answer))) problems.push(`step ${i + 1} answer is wrong`);
          if (s.wrong.length !== 3) problems.push(`step ${i + 1} needs 3 wrong options`);
          if (new Set(opts).size !== 4) problems.push(`step ${i + 1} duplicate option`);
          s.wrong.forEach((w) => { let also = false; try { also = OK[ch.gen][i](d, String(w)); } catch (e) { also = false; } if (also) problems.push(`step ${i + 1} wrong option is also correct: ${w}`); });
          if (opts.some((o) => /NaN|undefined|Infinity/.test(o))) problems.push('bad option');
          if (ch.gen === 'prob' && i > 0 && opts.some((o) => num(o) <= 0)) problems.push('non-positive probability option');
        } catch (e) { problems.push(`step ${i + 1} error ${e.message}`); }
        for (const lang of ['ja', 'ko', 'en']) for (const part of ['text', 'explain', 'sum', 'note']) { if (!ch.steps[i][part]) continue; const t = ch.steps[i][part][lang].replace(/\{(\w+)\}/g, (m, key) => (key in d ? d[key] : key in answers ? answers[key] : key === 'answer' ? s.answer : m)); if (/\{[A-Za-z]\w*\}|undefined|NaN/.test(t)) problems.push(`bad ${part}.${lang}: ${t}`); }
      });
      for (const lang of ['ja', 'ko', 'en']) { const t = ch.intro[lang].replace(/\{(\w+)\}/g, (m, key) => (key in d ? d[key] : m)); if (/\{[A-Za-z]\w*\}|undefined|NaN/.test(t)) problems.push('bad intro ' + t); }
      if (ch.figure) for (const v of Object.values(ch.figure)) { const f = String(v).replace(/\{(\w+)\}/g, (m, key) => (key in d ? d[key] : m)); if (/[{}]|undefined|NaN/.test(f)) problems.push('bad figure label ' + f); }
      if (problems.length) { bad++; seen[ch.id] = (seen[ch.id] || 0) + 1; if (seen[ch.id] <= 3) console.log('PROBLEM', ch.id, JSON.stringify(d).slice(0, 300), [...new Set(problems)].join('; ').slice(0, 240)); }
      distinct.add(JSON.stringify(d));
    }
    console.log(ch.id, 'distinct', distinct.size);
  }
}
for (const g of Object.keys(CHAINS)) if (!used.has(g)) { console.log('chain generator not used', g); bad++; }
fs.writeFileSync(new URL('./.covered-chains.json', import.meta.url), JSON.stringify([...(globalThis.__cov || [])]));
console.log('chains checked', total, 'problems', bad, JSON.stringify(seen));
