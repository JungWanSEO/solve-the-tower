// 数学B·C 문제 틀과 연속기 묶음의 독립 검산.
// 생성기가 낸 "문제에 보이는 글"만 읽어서 답을 처음부터 다시 계산하고, 생성기의 정답·오답과 대조합니다.
// (생성기 안의 계산을 그대로 따라 하지 않습니다. 수열은 공식을 쓰지 않고 항을 하나씩 만들어 더합니다)
import fs from 'node:fs';
const ROOT = new URL('../', import.meta.url).pathname;
globalThis.document = { documentElement: {} };
const { GENERATORS, CHAINS } = await import(ROOT + 'js/generators.js');
const UNITS = ['mathb-seq'];
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

const OK = {
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
