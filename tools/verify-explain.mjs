// 풀이 글 검사: 모든 문제 틀과 연속기 물음의 풀이를 실제 숫자로 채워 보고,
// 자리표시가 남았는지, 계산식 {= } 이 계산되지 않았는지("?", NaN) 확인합니다. 단계 수도 셉니다.
import fs from 'node:fs';
const ROOT = new URL('../', import.meta.url).pathname;
globalThis.document = { documentElement: {} };
const { GENERATORS, CHAINS } = await import(ROOT + 'js/generators.js');
const { calcFill } = await import(ROOT + 'js/calc.js');
const fill = (s, item) => calcFill(s, item).replace(/\{(\w+)\}/g, (m, k) => (k in item ? item[k] : m));
const cat = JSON.parse(fs.readFileSync(ROOT + 'data/catalog.json', 'utf8'));
let checked = 0; let bad = 0; let single = 0; let total = 0; const seen = {}; const show = process.argv.includes('--show');
const test = (id, text, item, lang) => { const out = fill(text, item); checked++;
  if (/\{[A-Za-z=]|\?\/|NaN|undefined|Infinity|= \?| \?$|\?,|→ \?/.test(out.replace(/は\?|\?$/g, '')) || out.includes('{=')) { bad++; seen[id] = (seen[id] || 0) + 1; if (seen[id] <= 2) console.log('PROBLEM', id, lang, out.replace(/\n/g, ' / ').slice(0, 260)); } return out; };
for (const id of cat.subjects.flatMap((s) => s.units).filter((u) => !(cat.off || []).includes(u))) {
  const unit = JSON.parse(fs.readFileSync(`${ROOT}data/units/${id}.json`, 'utf8'));
  for (const tpl of unit.templates) { total++; if (!tpl.explain.ja.includes('\n')) single++;
    for (let k = 0; k < 200; k++) { const item = tpl.gen ? GENERATORS[tpl.gen](tpl.params || {}) : { ...(tpl.items || [{}])[k % (tpl.items || [{}]).length] };
      for (const lang of ['ja', 'ko', 'en']) { const out = test(`${id}/${tpl.id}`, tpl.explain[lang], item, lang); if (show && k === 0 && lang === 'ko' && tpl.explain.ko.includes('{=')) console.log(`[${tpl.id}] ${out.replace(/\n/g, ' / ')}`); } } }
  for (const ch of unit.chains || []) for (let k = 0; k < 200; k++) { const made = CHAINS[ch.gen](); const item = { ...made }; made.steps.forEach((s, n) => { item[`a${n + 1}`] = s.answer; });
    ch.steps.forEach((st, n) => { if (k === 0) { total++; if (!st.explain.ja.includes('\n')) single++; } for (const lang of ['ja', 'ko', 'en']) test(`${id}/${ch.id}#${n + 1}`, st.explain[lang], { ...item, answer: made.steps[n].answer }, lang); }); }
}
console.log(`explanations ${total} | one-line ${single} | checked ${checked} problems ${bad}`);
process.exit(bad ? 1 : 0);
