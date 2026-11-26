// 모습(직업): 수학을 포기했던 주인공이 탑을 깨며 성장한 세 가지 모습입니다.
//   - 처음에는 첫 모습만 있고, 탑을 깰 때마다 하나씩 얻습니다. 얻었는지는 탑을 깬 횟수(data.clears)로 판단합니다.
//   - 모습마다 체력, 고유 능력, 시작 유물, 그림이 다릅니다. 행동 버튼은 모두 같습니다.
//   - 숫자는 js/config.js 의 CONFIG.hero, 이름과 설명은 lang/ 의 hero.<id>, 그림은 js/stage.js(전투)와 js/art.js(장면·초상)
import { CONFIG } from './config.js';

export const HERO_IDS = ['starter', 'grit', 'flash']; // 다시 시작한 아이 · 끈기 대장 · 암산 번개
export const heroOf = (run) => (run && HERO_IDS.includes(run.hero) ? run.hero : 'starter');
export const isHero = (run, id) => heroOf(run) === id;

// 지금까지 얻은 모습 (얻는 순서대로)
export const unlockedHeroes = (data) => HERO_IDS.filter((id) => (data.clears || 0) >= CONFIG.hero[id].clears);
// 얻었지만 아직 "새 모습을 얻었습니다" 창을 보지 않은 모습
export const newHeroes = (data) => unlockedHeroes(data).filter((id) => id !== 'starter' && !(data.heroSeen && data.heroSeen[id]));

// 설명 글에 넣을 숫자
export function heroVars(id) {
  const h = CONFIG.hero[id];
  return { hp: h.hp, n: id === 'grit' ? h.guardBonus : id === 'flash' ? h.ultNeed : 0, was: CONFIG.ultNeed, clears: h.clears };
}
// 그 모습의 필살기 (CONFIG.hero.<id>.ult) 와, 설명 글에 넣을 숫자. add: 유물 등으로 더해지는 피해
export const ultOf = (id) => (CONFIG.hero[id] && CONFIG.hero[id].ult) || { dmg: CONFIG.damage.ult };
export function ultVars(id, add = 0) {
  const u = ultOf(id);
  return { d: u.dmg * (u.hits || 1) + add, n: u.heal || u.shield || u.hits || 0 };
}
