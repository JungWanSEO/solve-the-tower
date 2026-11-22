// 검수에서 고친 일본어를 게임 파일에 다시 넣습니다.
// 쓰는 법: node tools/script-import.mjs <고친 목록.json>   (끝에 --write 를 붙여야 실제로 고칩니다. 없으면 바뀔 곳만 보여 줍니다)
// 목록은 [{ "key": "...", "ja": "고친 문장" }, …] 꼴입니다. 표 파일(xlsx)의 "直した日本語" 칸을 이 꼴로 바꿔서 넘깁니다.
// 안전장치: 문장 속 {a}, {answer} 같은 자리표시는 원래 문장과 똑같이 들어 있어야 합니다. 다르면 그 줄은 넣지 않고 알려 줍니다.
import fs from 'node:fs';
const ROOT = new URL('../', import.meta.url).pathname;
const [file, flag] = process.argv.slice(2);
if (!file) { console.log('usage: node tools/script-import.mjs <fixes.json> [--write]'); process.exit(1); }
const fixes = JSON.parse(fs.readFileSync(file, 'utf8')).filter((f) => f.key && typeof f.ja === 'string' && f.ja.trim());
const cache = {};
const load = (p) => (cache[p] ||= JSON.parse(fs.readFileSync(ROOT + p, 'utf8')));
const holes = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join(' ');
// 키가 가리키는 곳을 찾아 { get, set } 을 돌려줍니다.
function locate(key) {
  const p = key.split(':');
  if (p[0] === 'ui') { const path = p[1].split('.'); const d = load('lang/ja.json'); let o = d; for (const k of path.slice(0, -1)) o = o?.[k]; const last = path.at(-1); return o && last in o ? { get: () => o[last], set: (v) => { o[last] = v; } } : null; }
  const at = (obj) => (obj && obj.ja !== undefined ? { get: () => obj.ja, set: (v) => { obj.ja = v; } } : null);
  if (p[0] === 'subject') return at(load('data/catalog.json').subjects.find((s) => s.id === p[1])?.name);
  if (p[0] === 'monster') return at(load('data/monsters.json').find((m) => m.id === p[1])?.[p[2]]);
  if (p[0] === 'unit') {
    const u = load(`data/units/${p[1]}.json`);
    if (p[2] === 'name') return at(u.name);
    if (p[2] === 'group') return at(u.groups[Number(p[3])]?.name);
    if (p[2] === 'type') return at(u.types[p[3]]);
    if (p[2] === 'tpl') return at(u.templates.find((t) => t.id === p[3])?.[p[4]]);
    if (p[2] === 'chain') { const ch = u.chains.find((c) => c.id === p[3]); if (p[4] === 'intro') return at(ch?.intro); const st = ch?.steps[Number(p[4].replace('step', '')) - 1]; return at(st?.[p[5]]); }
  }
  return null;
}
let changed = 0; let same = 0; const problems = [];
for (const f of fixes) {
  const spot = locate(f.key);
  if (!spot) { problems.push(`키를 찾을 수 없음: ${f.key}`); continue; }
  const now = spot.get(); const next = f.ja.trim();
  if (now === next) { same++; continue; }
  if (holes(now) !== holes(next)) { problems.push(`자리표시가 다름: ${f.key}\n    지금: ${now}\n    고침: ${next}`); continue; }
  console.log(`${f.key}\n  - ${now}\n  + ${next}`);
  spot.set(next); changed++;
}
for (const p of problems) console.log('넣지 않음 →', p);
console.log(`바뀜 ${changed} · 그대로 ${same} · 넣지 않음 ${problems.length}`);
if (flag === '--write') { for (const [p, d] of Object.entries(cache)) fs.writeFileSync(ROOT + p, JSON.stringify(d, null, 2) + '\n'); console.log('파일에 적었습니다. sw.js 의 VERSION 을 올리고 npm run verify 를 돌리세요.'); }
else console.log('미리 보기입니다. 실제로 고치려면 끝에 --write 를 붙이세요.');
