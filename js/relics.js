// 유물: 한 번 얻으면 그 판이 끝날 때까지 저절로 작동하는 아이템입니다.
//   - 개수 제한이 없고, 같은 유물은 한 판에 한 번만 나옵니다.
//   - 유물은 수학을 대신 풀어 주지 않습니다. 맞혔을 때의 보상과 틀렸을 때의 손해만 바꿉니다.
//   - 숫자는 모두 js/config.js 의 CONFIG.relic 에 있습니다. 이름과 설명은 lang/ 의 relic.<id> 에 있습니다.
//   - 효과가 실제로 걸리는 곳: 전투는 js/battle.js, 보상·회복·골드는 js/main.js, 상점·휴식·보물은 js/events.js
import { CONFIG } from './config.js';

// 등급: common(흔함) · uncommon(드묾) · boss(보스. 불이익이 함께 있는 것도 있습니다)
export const RELICS = {
  pencil: { rarity: 'common' },      // 닳은 연필: 전투마다 첫 정답의 피해 +2
  eraser: { rarity: 'common' },      // 지우개: 전투마다 첫 오답으로 받는 피해 절반
  grid: { rarity: 'common' },        // 모눈종이: 그림이 있는 문제를 맞히면 피해 +2
  snack: { rarity: 'common' },       // 간식 주머니: 전투에서 이기면 체력 +2
  piggy: { rarity: 'common' },       // 돼지 저금통: 전투 보상 골드 +25%
  note: { rarity: 'common' },        // 선배의 쪽지: 새 칸에 들어갈 때마다 힌트 +1 (3개까지)
  setsquare: { rarity: 'common' },   // 삼각자: 방어 성공 뒤의 반격 피해 +2
  bottle: { rarity: 'common' },      // 물통: 휴식 칸에서 회복 +5
  bookmark: { rarity: 'common' },    // 책갈피: 전투를 연속 정답 1 에서 시작
  ribbon: { rarity: 'uncommon' },    // 연승 리본: 3문제 연속 정답마다 다음 피해 한 번을 막음
  redpen: { rarity: 'uncommon' },    // 붉은 볼펜: 약점 피해 배율 +0.5
  wrongnote: { rarity: 'uncommon' }, // 오답 노트: 틀리면 다음 정답의 피해 +3
  alarm: { rarity: 'uncommon' },     // 알람 시계: 적의 강한 공격이 4턴마다
  highlighter: { rarity: 'uncommon' }, // 형광펜: 스킬 피해 +2
  library: { rarity: 'uncommon' },   // 도서관 카드: 아직 정복하지 못한 유형을 맞히면 골드 +8
  bandage: { rarity: 'uncommon' },   // 반창고: 쓰러질 때 한 판에 한 번, 체력 1 로 버팀
  chainbelt: { rarity: 'boss' },     // 연속기 띠: 연속기를 전투마다 2번
  ruler: { rarity: 'boss' },         // 금이 간 자: 모든 피해 +1, 최대 체력 −5
  workbook: { rarity: 'boss' },      // 두꺼운 문제집: 필살기 피해 +4, 필살기에 연속 정답 4개 필요
  bag: { rarity: 'boss' },           // 무거운 가방: 최대 체력 +10, 전투 승리 회복 −2
};
export const RELIC_IDS = Object.keys(RELICS);

export const has = (run, id) => Boolean(run && Array.isArray(run.relics) && run.relics.includes(id));

// 설명 글에 넣을 숫자. 예: t('relic.pencil.text', relicVars('pencil')) → "전투마다 첫 정답의 피해 +2"
export function relicVars(id) {
  const c = CONFIG.relic;
  const v = c[id];
  if (id === 'eraser' || id === 'piggy') return { n: Math.round(v * 100) };
  if (id === 'ruler') return { n: v.dmg, hp: v.hp };
  if (id === 'workbook') return { n: v.ult, need: v.need };
  if (id === 'bag') return { hp: v.hp, n: v.heal };
  if (id === 'chainbelt') return { n: v.uses, dmg: v.dmg };
  if (id === 'alarm') return { n: v, was: CONFIG.foeAttack.bigEvery };
  if (id === 'redpen') return { n: CONFIG.damage.weakBonus + v, was: CONFIG.damage.weakBonus };
  return { n: v };
}

// 얻는 순간 한 번 일어나는 일 (최대 체력이 바뀌는 유물)
const ON_GAIN = {
  ruler(run) {
    run.maxHp = Math.max(1, run.maxHp - CONFIG.relic.ruler.hp);
    run.hp = Math.min(run.hp, run.maxHp);
  },
  bag(run) {
    run.maxHp += CONFIG.relic.bag.hp;
    run.hp += CONFIG.relic.bag.hp;
  },
};

// 유물을 얻습니다. 이미 가진 유물이면 아무 일도 없습니다.
export function gainRelic(run, id) {
  if (!RELICS[id] || has(run, id)) return false;
  if (!Array.isArray(run.relics)) run.relics = [];
  run.relics.push(id);
  if (ON_GAIN[id]) ON_GAIN[id](run);
  return true;
}

// 잃는 순간 한 번 일어나는 일 (얻을 때 바뀐 최대 체력을 되돌립니다)
const ON_LOSE = {
  ruler(run) {
    run.maxHp += CONFIG.relic.ruler.hp;
  },
  bag(run) {
    run.maxHp = Math.max(1, run.maxHp - CONFIG.relic.bag.hp);
    run.hp = Math.max(1, Math.min(run.hp, run.maxHp));
  },
};
// 유물을 내놓습니다 (? 칸 "잊힌 사물함"). 갖고 있지 않으면 아무 일도 없습니다.
export function loseRelic(run, id) {
  if (!has(run, id)) return false;
  run.relics.splice(run.relics.indexOf(id), 1);
  if (ON_LOSE[id]) ON_LOSE[id](run);
  return true;
}
// 아직 갖지 않은, 등급이 같은 유물들 (? 칸의 "떠돌이 상인"과 "잊힌 사물함")
export const sameRarityLeft = (run, rarity, skip = []) => (CONFIG.relic.drops ? RELIC_IDS.filter((id) => RELICS[id].rarity === rarity && !has(run, id) && !skip.includes(id)) : []);

const pickOne = (list) => list[Math.floor(Math.random() * list.length)];

// 아직 갖지 않은 유물 중에서 count 개를 겹치지 않게 뽑습니다. 남은 것이 모자라면 있는 만큼만 돌려줍니다.
//   pool 'normal': 흔함과 드묾을 2 : 1 로 (보물 상자, 강적, 상점)
//   pool 'big'   : 드묾과 보스 등급 (중간 보스, 막을 넘어갈 때)
export function rollRelics(run, count = 1, pool = 'normal', skip = []) {
  if (!CONFIG.relic.drops) return [];
  const left = RELIC_IDS.filter((id) => !has(run, id) && !skip.includes(id));
  const of = (rarity) => left.filter((id) => RELICS[id].rarity === rarity);
  const out = [];
  const take = (id) => {
    out.push(id);
    left.splice(left.indexOf(id), 1);
  };
  while (out.length < count && left.length) {
    if (pool === 'big') {
      const big = [...of('uncommon'), ...of('boss')];
      take(pickOne(big.length ? big : left));
    } else {
      const common = of('common');
      const uncommon = of('uncommon');
      const normal = [...common, ...uncommon];
      if (!normal.length) break; // 보스 등급만 남았으면 보통 보상으로는 주지 않습니다
      const wantCommon = Math.random() < CONFIG.relic.commonWeight / (CONFIG.relic.commonWeight + 1);
      take(pickOne(wantCommon && common.length ? common : uncommon.length ? uncommon : common));
    }
  }
  return out;
}

// 상점 가격
export const relicPrice = (id) => CONFIG.relic.price[RELICS[id].rarity] || CONFIG.relic.price.uncommon;
