// Checks every question numerically: the stated answer must equal an independently computed value,
// and the three wrong options must be distinct from the answer and from each other.
import fs from 'node:fs';
const ROOT = new URL('../', import.meta.url).pathname; // 저장소 폴더
globalThis.document = { documentElement: {} };
const { GENERATORS } = await import(ROOT + 'js/generators.js');
const { figureFor } = await import(ROOT + 'js/figures.js');
const unit = JSON.parse(fs.readFileSync(ROOT + 'data/units/math1-trig.json', 'utf8'));
const rad = (d) => (d * Math.PI) / 180;
const num = (s) => {
  let e = String(s).replace(/ ?m$/, '').replace(/°$/, '').replace(/−/g, '-').replace(/(\d)?√(\d+)/g, (m, k, r) => `${k ? k + '*' : ''}Math.sqrt(${r})`);
  return Function(`return (${e});`)();
};
const fnv = (fn, d) => Math[fn](rad(d));
const TRUTH = {
  'exact-value': (i) => fnv(i.fn, i.deg), 'obtuse-value': (i) => fnv(i.fn, i.deg),
  'ratio-from-sides': (i) => ({ sin: i.a / i.c, cos: i.b / i.c, tan: i.a / i.b })[i.fn],
  relation: (i) => { const g = num(i.gv); const th = i.given === 'sin' ? Math.asin(g) : Math.acos(g); return Math[i.ask](th); },
  'relation-obtuse': (i) => { const th = Math.PI - Math.asin(num(i.gv)); return Math[i.ask](th); },
  'length-sin30': (i) => i.c * Math.sin(rad(30)), 'length-cos60': (i) => i.c * Math.cos(rad(60)),
  'tower-height': (i) => i.d * Math.tan(rad(i.deg)),
  'two-points': (i) => (i.g * Math.tan(rad(i.a)) * Math.tan(rad(i.b))) / (Math.tan(rad(i.b)) - Math.tan(rad(i.a))),
  'sine-rule': (i) => (i.a * Math.sin(rad(i.B))) / Math.sin(rad(i.A)),
  'sine-radius': (i) => i.a / (2 * Math.sin(rad(i.A))),
  'cosine-rule': (i) => Math.sqrt(i.b ** 2 + i.c ** 2 - 2 * i.b * i.c * Math.cos(rad(i.A))),
  'cosine-angle': (i) => (Math.acos((i.b ** 2 + i.c ** 2 - i.a ** 2) / (2 * i.b * i.c)) * 180) / Math.PI,
  'triangle-area': (i) => 0.5 * i.b * i.c * Math.sin(rad(i.A)),
};
let bad = 0, total = 0; const distinct = {};
const check = (tpl, it) => {
  total++;
  const want = TRUTH[tpl.id](it), got = num(it.answer);
  const opts = [it.answer, ...it.wrong].map(String), vals = opts.map(num);
  const problems = [];
  if (Math.abs(want - got) > 1e-6) problems.push(`answer ${it.answer} = ${got} but true ${want}`);
  if (it.wrong.length !== 3) problems.push('need 3 wrong');
  if (new Set(opts).size !== 4) problems.push('duplicate text');
  for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) if (Math.abs(vals[a] - vals[b]) < 1e-9) problems.push(`same value ${opts[a]} / ${opts[b]}`);
  if (vals.some((v) => !Number.isFinite(v))) problems.push('non-finite');
  for (const lang of ['ja', 'ko', 'en']) for (const part of ['text', 'explain']) { const s = tpl[part][lang].replace(/\{(\w+)\}/g, (m, k) => (k in it ? it[k] : m)); if (/[{}]/.test(s) || /undefined|NaN/.test(s)) problems.push(`bad ${part}.${lang}: ${s}`); }
  if (tpl.figure) { const f = figureFor({ tpl, item: it }); if (!f || /undefined|NaN|\{/.test(f.alt)) problems.push('bad figure ' + (f && f.alt)); }
  if (problems.length && bad < 8) console.log('PROBLEM', tpl.id, JSON.stringify(it), problems.join('; '));
  if (problems.length) bad++;
  (distinct[tpl.id] ||= new Set()).add(JSON.stringify(it));
};
for (const tpl of unit.templates) {
  if (!TRUTH[tpl.id]) continue; // 다른 검사 파일이 맡은 틀
  (globalThis.__cov ||= new Set()).add(`${unit.id}/${tpl.id}`);
  if (tpl.items) tpl.items.forEach((it) => check(tpl, it));
  else { if (!GENERATORS[tpl.gen]) { console.log('NO GENERATOR', tpl.gen); bad++; continue; } for (let k = 0; k < 4000; k++) check(tpl, GENERATORS[tpl.gen](tpl.params || {})); }
}
fs.writeFileSync(new URL('./.covered-trig.json', import.meta.url), JSON.stringify([...(globalThis.__cov || [])]));
console.log('checked', total, 'problems', bad);
console.log(Object.entries(distinct).map(([k, v]) => `${k}:${v.size}`).join('  '));
console.log('distinct questions total:', Object.values(distinct).reduce((s, v) => s + v.size, 0));
const honest = {}; for (const [k, v] of Object.entries(distinct)) { honest[k] = new Set([...v].map((s) => { const o = JSON.parse(s); delete o.wrong; return JSON.stringify(o); })).size; }
console.log('distinct ignoring option order:', JSON.stringify(honest), 'total', Object.values(honest).reduce((a, b) => a + b, 0));
