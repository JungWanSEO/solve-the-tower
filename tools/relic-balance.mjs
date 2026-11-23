// 유물 하나의 세기 재기: 유물을 하나만 들고(다른 유물은 나오지 않게 하고) 여러 판을 해서, 유물이 없을 때와 클리어율을 비교합니다.
//   node relic-balance.mjs [판 수=240] [정답률=0.7] [유물 id 들, 쉼표로. 비우면 전부]
//   예) node relic-balance.mjs 240 0.7 pencil,eraser
//   TUNE='{"config":{"relic":{"pencil":3}}}' node relic-balance.mjs 240 0.7 pencil   ← 숫자를 바꿔서 잴 때
// 목표(계획서): 흔함 +3~8%p, 드묾 +8~12%p, 보스 등급 +8~15%p. 판 수가 240 이면 오차가 ±6%p 쯤 되므로 큰 차이만 믿습니다.
import { spawnSync } from 'node:child_process';
import { RELICS, RELIC_IDS } from '../js/relics.js';

const RUNS = Number(process.argv[2] || 240);
const ACC = process.argv[3] || '0.7';
const IDS = (process.argv[4] ? process.argv[4].split(',') : RELIC_IDS).filter((id) => RELICS[id]);
const here = new URL('./balance.mjs', import.meta.url).pathname;
const base = JSON.parse(process.env.TUNE || '{}');

function measure(start) {
  const tune = { ...base, config: { ...(base.config || {}), relic: { ...((base.config || {}).relic || {}), drops: false, start } } };
  const out = spawnSync('node', [here, String(RUNS), ACC], { env: { ...process.env, TUNE: JSON.stringify(tune) }, encoding: 'utf8' }).stdout;
  const m = /\((\d+)\/(\d+)\)/.exec(out);
  return m ? { clears: Number(m[1]), runs: Number(m[2]) } : { clears: 0, runs: 0 };
}
const pct = (r) => (r.runs ? (r.clears / r.runs) * 100 : 0);
const GOAL = { common: [3, 8], uncommon: [8, 12], boss: [8, 15] };

const none = process.env.BASE ? { clears: Number(process.env.BASE) * RUNS / 100, runs: RUNS } : measure([]);
console.log(`정답률 ${Math.round(Number(ACC) * 100)}% · 유물마다 ${RUNS}판`);
console.log(`유물 없음       ${pct(none).toFixed(0)}%`);
for (const id of IDS) {
  const r = measure([id]);
  const diff = pct(r) - pct(none);
  const [lo, hi] = GOAL[RELICS[id].rarity];
  const verdict = diff < lo - 6 ? '약함' : diff > hi + 6 ? '강함' : '범위 안';
  console.log(`${id.padEnd(12)} ${RELICS[id].rarity.padEnd(9)} ${pct(r).toFixed(0).padStart(3)}%  ${(diff >= 0 ? '+' : '') + diff.toFixed(0)}%p  (목표 +${lo}~${hi})  ${verdict}`);
}
