// 밸런스 재기: 정답률이 다른 봇들이 여러 판을 해서, 얼마나 깨고 어디서 쓰러지는지 표로 보여 줍니다.
//   node balance.mjs [판 수=30] [정답률들=0.5,0.6,0.7,0.8,0.9]
//   TUNE='{"config":{"player":{"hp":34}}}' node balance.mjs   ← 숫자를 바꿔 보고 싶을 때 (저장소는 건드리지 않습니다)
//   SAVE='{"ascend":2}' node balance.mjs                      ← 저장 기록에 값을 넣고 시작할 때
//   SMART= node balance.mjs                                  ← 길을 완전히 무작위로 고르게 할 때 (기본은 체력이 낮으면 휴식 칸을 찾아감)
import { spawn } from 'node:child_process';

const RUNS = Number(process.argv[2] || 30);
const ACCS = (process.argv[3] || '0.5,0.6,0.7,0.8,0.9').split(',').map(Number);
const PER = 6; // 한 프로세스가 맡는 판 수 (여러 프로세스로 나누어 동시에 돌립니다)
const here = new URL('./play.mjs', import.meta.url).pathname;
// 튜토리얼은 끝낸 것으로 두고 잽니다. (튜토리얼 중에는 피해가 절반이라 결과가 달라집니다)
const seed = JSON.stringify({ v: 1, lang: 'ja', tut: 'done', seenChain: true, sound: false, wins: 0, clears: 0, codex: {}, seen: {}, ...JSON.parse(process.env.SAVE || '{}') });

function one(acc, runs) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [here, String(acc), '9999', seed], { env: { SMART: '1', ...process.env, RUNS: String(runs), JSONOUT: '1', CAP: '4000000' } });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.on('close', () => {
      try { resolve(JSON.parse(out.trim().split('\n').pop())); } catch (e) { resolve({ clears: 0, deaths: 0, deathFloors: {}, errors: 1 }); }
    });
  });
}

console.log(`runs per accuracy: ${RUNS}`);
console.log('accuracy | clear rate | deaths by floor (1F … 10F)');
for (const acc of ACCS) {
  const jobs = [];
  for (let left = RUNS; left > 0; left -= PER) jobs.push(one(acc, Math.min(PER, left)));
  const parts = await Promise.all(jobs);
  const total = { clears: 0, deaths: 0, floors: {}, errors: 0 };
  for (const part of parts) {
    total.clears += part.clears;
    total.deaths += part.deaths;
    total.errors += part.errors || 0;
    for (const [f, n] of Object.entries(part.deathFloors || {})) total.floors[f] = (total.floors[f] || 0) + n;
  }
  const all = total.clears + total.deaths;
  const floors = Array.from({ length: 10 }, (_, i) => String(total.floors[i + 1] || 0).padStart(2)).join(' ');
  console.log(`   ${Math.round(acc * 100)}%   |   ${String(Math.round((total.clears / Math.max(1, all)) * 100)).padStart(3)}% (${total.clears}/${all}) | ${floors}${total.errors ? `  errors ${total.errors}` : ''}`);
}
