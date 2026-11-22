// 모든 문제 틀과 연속기 묶음이 어느 검사 파일에서든 한 번은 검사됐는지 확인합니다.
// 다른 verify-*.mjs 를 먼저 실행해야 합니다. (npm run verify 가 순서대로 실행합니다)
import fs from 'node:fs';
const ROOT = new URL('../', import.meta.url).pathname;
const here = new URL('./', import.meta.url).pathname;
const covered = new Set(fs.readdirSync(here).filter((f) => /^\.covered-.*\.json$/.test(f)).flatMap((f) => JSON.parse(fs.readFileSync(here + f, 'utf8'))));
const cat = JSON.parse(fs.readFileSync(ROOT + 'data/catalog.json', 'utf8'));
const all = [];
for (const id of cat.subjects.flatMap((s) => s.units)) {
  const unit = JSON.parse(fs.readFileSync(`${ROOT}data/units/${id}.json`, 'utf8'));
  for (const tpl of unit.templates) if (tpl.gen) all.push(`${unit.id}/${tpl.id}`);
  for (const ch of unit.chains || []) all.push(`${unit.id}/${ch.id}`);
}
const missing = all.filter((id) => !covered.has(id));
for (const id of missing) console.log('NOT VERIFIED', id);
console.log('templates and chains', all.length, '| verified', all.length - missing.length, '| problems', missing.length);
