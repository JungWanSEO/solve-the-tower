// Independent numeric check of the 数と式 / 二次関数 / データの分析 generators.
import fs from 'node:fs';
const ROOT = new URL('../', import.meta.url).pathname; // 저장소 폴더
globalThis.document = { documentElement: {} };
const { GENERATORS } = await import(ROOT + 'js/generators.js');
const N = (s) => Number(String(s).replace(/−/g, '-'));
const js = (s) => String(s).replace(/^y = /, '').replace(/ = 0$/, '').replace(/−/g, '-').replace(/\(([^()]*)\)²/g, '(($1)*($1))').replace(/x²/g, '(x*x)').replace(/(\d)x/g, '$1*x').replace(/(\d)\(/g, '$1*(').replace(/\)\(/g, ')*(').replace(/x\(/g, 'x*(').replace(/\)x/g, ')*x');
const ev = (s, x) => Function('x', `return (${js(s)});`)(x);
const surdNum = (s) => Function(`return (${String(s).replace(/−/g, '-').replace(/(\d)?√(\d+)/g, (m, k, r) => `${k ? k + '*' : ''}Math.sqrt(${r})`)});`)();
const XS = [-3.7, -1.3, 0.4, 1.9, 2.6, 5.1];
const samePoly = (a, b) => XS.every((x) => Math.abs(ev(a, x) - ev(b, x)) < 1e-6);
const GRID = []; for (let x = -40; x <= 40; x += 0.25) GRID.push(x);
const cmp = { '<': (a, b) => a < b, '>': (a, b) => a > b, '≦': (a, b) => a <= b, '≧': (a, b) => a >= b };
const halfPred = (s) => { const m = String(s).match(/^x ([<>≦≧]) (.+)$/); return (x) => cmp[m[1]](x, N(m[2])); };
const intervalPred = (s) => { let m = String(s).match(/^(.+) < x < (.+)$/); if (m) return (x) => N(m[1]) < x && x < N(m[2]); m = String(s).match(/^x < (.+), (.+) < x$/); return (x) => x < N(m[1]) || N(m[2]) < x; };
const samePred = (p, q, skip = []) => GRID.every((x) => skip.some((b) => Math.abs(x - b) < 1e-9) || p(x) === q(x));
const pt = (s) => String(s).replace(/[()]/g, '').split(', ').map(N);
const rootsOf = (s) => String(s).replace('x = ', '').split(', ').map(N);
const listOf = (i) => i.list.split(', ').map(Number);
const stats = (v) => { const n = v.length, mean = v.reduce((a, b) => a + b, 0) / n, s = [...v].sort((a, b) => a - b); const med = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; const variance = v.reduce((a, b) => a + (b - mean) ** 2, 0) / n; return { mean, med, variance, s }; };
// each check returns true when the option string is a correct answer for the item
const OK = {
  expand: (i, o) => samePoly(i.expr, o), factor: (i, o) => samePoly(i.expr, o),
  surdSimplify: (i, o) => Math.abs(Math.sqrt(i.n) - surdNum(o)) < 1e-9,
  rationalize: (i, o) => Math.abs(i.c / Math.sqrt(i.m) - surdNum(o)) < 1e-9,
  inequality: (i, o) => samePred((x) => cmp[i.op](ev(i.lhs, x), N(i.c)), halfPred(o)),
  sets: (i, o) => N(o) === i.p + i.q - i.r,
  vertex: (i, o) => { const [p, q] = pt(o); const f = (x) => ev(i.f, x); return Math.abs(f(p) - q) < 1e-9 && Math.abs(f(p + 1) - f(p - 1)) < 1e-9 && Math.abs(f(p + 2) - f(p - 2)) < 1e-9; },
  maxmin: (i, o, params) => { let best = null; for (let x = N(i.s); x <= N(i.t) + 1e-9; x += 0.125) { const y = ev(i.f, x); if (best === null || (params.ask === 'min' ? y < best : y > best)) best = y; } return Math.abs(best - N(o)) < 1e-9; },
  quadeq: (i, o) => { const r = rootsOf(o); return r.length === 2 && r[0] !== r[1] && r.every((x) => Math.abs(ev(i.f, x)) < 1e-9); },
  discriminant: (i, o) => N(o) === i.b * i.b - 4 * i.a * i.c && samePoly(i.f, `${i.a}*x*x + ${i.b}*x + ${i.c}`.replace(/\+ -/g, '- ')),
  quadineq: (i, o) => { const bounds = GRID.filter((x) => Math.abs(ev(i.f, x)) < 1e-9); return samePred((x) => cmp[i.op](ev(i.f, x), 0), intervalPred(o), bounds); },
  mean: (i, o) => Math.abs(stats(listOf(i)).mean - N(o)) < 1e-9,
  median: (i, o) => Math.abs(stats(listOf(i)).med - N(o)) < 1e-9,
  iqr: (i, o) => { const v = listOf(i); return v.length === 7 && v.every((x, k) => !k || x > v[k - 1]) && N(o) === v[5] - v[1]; },
  variance: (i, o) => Math.abs(stats(listOf(i)).variance - N(o)) < 1e-9,
  sd: (i, o) => Math.abs(Math.sqrt(stats(listOf(i)).variance) - N(o)) < 1e-9,
};
OK.complete = OK.vertex;
let total = 0, bad = 0; const distinct = {};
for (const file of ['math1-expr', 'math1-quad', 'math1-data']) {
  const unit = JSON.parse(fs.readFileSync(`${ROOT}data/units/${file}.json`, 'utf8'));
  for (const tpl of unit.templates) {
    const ok = OK[tpl.gen]; if (!ok || tpl.params && tpl.params.options) continue; // 다른 검사 파일이 맡은 틀
    (globalThis.__cov ||= new Set()).add(`${unit.id}/${tpl.id}`);
    for (let k = 0; k < 4000; k++) {
      const it = GENERATORS[tpl.gen](tpl.params || {}); total++; const problems = [];
      const opts = [it.answer, ...it.wrong].map(String);
      try {
        if (!ok(it, it.answer, tpl.params || {})) problems.push('answer is wrong');
        if (it.wrong.length !== 3) problems.push('need 3 wrong options');
        if (new Set(opts).size !== 4) problems.push('duplicate option text');
        it.wrong.forEach((w) => { if (ok(it, w, tpl.params || {})) problems.push(`wrong option is also correct: ${w}`); });
      } catch (e) { problems.push('error ' + e.message); }
      for (const lang of ['ja', 'ko', 'en']) for (const part of ['text', 'explain']) { const s = tpl[part][lang].replace(/\{(\w+)\}/g, (m, key) => (key in it ? it[key] : m)); if (/[{}]|undefined|NaN/.test(s)) problems.push(`bad ${part}.${lang}: ${s}`); }
      if (problems.length) { bad++; if (bad <= 8) console.log('PROBLEM', tpl.id, JSON.stringify(it), problems.join('; ')); }
      const key = { ...it }; delete key.wrong; (distinct[tpl.id] ||= new Set()).add(JSON.stringify(key));
    }
  }
}
fs.writeFileSync(new URL('./.covered-math1-basic.json', import.meta.url), JSON.stringify([...(globalThis.__cov || [])]));
console.log('checked', total, 'problems', bad);
console.log(Object.entries(distinct).map(([k, v]) => `${k}:${v.size}`).join('  '), '| total', Object.values(distinct).reduce((a, v) => a + v.size, 0));
