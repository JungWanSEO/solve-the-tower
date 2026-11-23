// "지도 한 장"의 상태와 지도 만들기.
// 체력, 골드, 힌트, 강화는 지도 한 장 동안 유지되고, 쓰러지면 모두 사라집니다.
//
// 지도 모양 (CONFIG.map 의 half = 4 일 때)
//   10층  보스
//    9층  휴식 (보스 직전 준비)
//  6~8층  갈라지는 길
//    5층  중간 보스
//  1~4층  갈라지는 길  ← 맨 아래에서 출발할 칸을 고릅니다
import { CONFIG } from './config.js';
import { gainRelic } from './relics.js';

// 칸 종류가 나올 확률의 무게 (출발 칸, 중간 보스, 보스 직전, 보스는 따로 정합니다)
const WEIGHTS = { battle: 4, event: 2.5, elite: 1.5, treasure: 1.2, shop: 1, rest: 1 };

const rand = (n) => Math.floor(Math.random() * n);

// boost: 칸 종류별로 무게에 곱할 값 (도전 단계에서 강적을 늘릴 때 씁니다)
function weightedPick(types, boost = {}) {
  const weight = (type) => WEIGHTS[type] * (boost[type] || 1);
  const total = types.reduce((sum, type) => sum + weight(type), 0);
  let r = Math.random() * total;
  for (const type of types) {
    r -= weight(type);
    if (r < 0) return type;
  }
  return types[types.length - 1];
}

// 지도의 절반을 만듭니다. 아래에서 위로 올라가는 길을 여러 개 그어, 길이 지나간 자리에 칸이 생깁니다.
function buildHalf(base, tag) {
  const { half, width, paths } = CONFIG.map;
  const cells = new Map(); // "층,열" → 칸
  const edges = new Set(); // "층,열>다음 열"
  const cell = (f, c) => {
    const key = `${f},${c}`;
    if (!cells.has(key)) cells.set(key, { id: `${tag}${f}_${c}`, floor: base + f, col: c, type: 'battle', next: [] });
    return cells.get(key);
  };

  let firstStart = -1;
  for (let p = 0; p < paths; p++) {
    let c = rand(width);
    if (p === 0) firstStart = c;
    if (p === 1) while (c === firstStart) c = rand(width); // 출발 칸이 적어도 둘
    for (let f = 0; f < half; f++) {
      const here = cell(f, c);
      if (f === half - 1) break;
      let to = Math.max(0, Math.min(width - 1, c + rand(3) - 1));
      // 길이 서로 엇갈려 꼬이지 않게 합니다.
      if (to > c && edges.has(`${f},${c + 1}>${c}`)) to = c;
      if (to < c && edges.has(`${f},${c - 1}>${c}`)) to = c;
      edges.add(`${f},${c}>${to}`);
      const nextCell = cell(f + 1, to);
      if (!here.next.includes(nextCell.id)) here.next.push(nextCell.id);
      c = to;
    }
  }
  const list = [...cells.values()];
  return {
    list,
    first: list.filter((n) => n.floor === base),
    last: list.filter((n) => n.floor === base + half - 1),
  };
}

function assignTypes(nodes, boost) {
  const { half } = CONFIG.map;
  const parents = {};
  for (const n of nodes) {
    for (const id of n.next) {
      if (!parents[id]) parents[id] = [];
      parents[id].push(n);
    }
  }
  const sorted = [...nodes].sort((a, b) => a.floor - b.floor);
  for (const n of sorted) {
    if (n.type === 'midboss' || n.type === 'boss') continue;
    if (n.floor === 0) { n.type = 'battle'; continue; }      // 출발은 항상 전투
    if (n.floor === 2 * half) { n.type = 'rest'; continue; } // 보스 직전은 항상 휴식
    let pool = Object.keys(WEIGHTS);
    if (n.floor < 2) pool = pool.filter((type) => type !== 'elite' && type !== 'rest' && type !== 'shop');
    if (n.floor === half + 1) pool = pool.filter((type) => type !== 'elite'); // 중간 보스 바로 다음
    let type = weightedPick(pool, boost);
    // 휴식·상점·강적이 연달아 나오지 않게 합니다.
    const above = parents[n.id] || [];
    if ((type === 'rest' || type === 'shop' || type === 'elite') && above.some((p) => p.type === type)) type = 'battle';
    n.type = type;
  }
  // 중간 보스 바로 아래 층에는 쉴 곳(휴식)이 적어도 하나 있게 합니다. 가장 큰 고비 앞에서 숨을 고를 수 있습니다.
  const before = nodes.filter((n) => n.floor === half - 1);
  if (before.length && !before.some((n) => n.type === 'rest')) before[rand(before.length)].type = 'rest';
}

// ascend: 도전 단계 (2 이상이면 강적 칸이 늘어납니다)
export function makeMap(ascend = 0) {
  const { half, width } = CONFIG.map;
  const lower = buildHalf(0, 'a');
  const upper = buildHalf(half + 1, 'b');
  const center = (width - 1) / 2;
  const mid = { id: 'mid', floor: half, col: center, type: 'midboss', next: upper.first.map((n) => n.id) };
  const boss = { id: 'boss', floor: 2 * half + 1, col: center, type: 'boss', next: [] };
  lower.last.forEach((n) => { n.next = ['mid']; });
  upper.last.forEach((n) => { n.next = ['boss']; });
  const nodes = [...lower.list, mid, ...upper.list, boss];
  assignTypes(nodes, ascend >= 2 ? { elite: CONFIG.ascend.eliteWeight } : {});
  return nodes;
}

// scope: 이번 판에 나올 문제 유형의 목록 ("단원/유형")
// ascend: 이번 판의 도전 단계 (0 이면 보통), cheer: 격려 단계 (연달아 쓰러진 횟수에서 나옵니다)
// acts: 긴 탑일 때 막의 목록 [{ id: 과목, keys: 그 막의 유형 }]. 없거나 하나뿐이면 지금까지처럼 지도 한 장으로 끝납니다.
// hero: 이번 판의 모습 (js/heroes.js). 체력과 시작 유물이 모습마다 다릅니다.
export function newRun(scope, ascend = 0, cheer = 0, acts = null, hero = 'starter') {
  const { bonusPerType, bonusMax } = CONFIG.scope;
  const long = Array.isArray(acts) && acts.length > 1;
  const run = {
    scope: long ? [...acts[0].keys] : [...scope], // 지금 막에서 나오는 유형
    ...(long ? { full: [...scope], acts: acts.map((a) => ({ id: a.id, keys: [...a.keys] })), act: 0 } : {}),
    goldMul: 1 + Math.min(bonusMax, bonusPerType * Math.max(0, scope.length - 1)), // 범위가 넓을수록 골드를 더 받습니다
    nodes: makeMap(ascend),
    ascend,          // 도전 단계
    cheer,           // 격려 단계 (받는 피해가 줄어듭니다)
    frail: 0,        // 재도전 선물: 적 체력이 1 이 되는 전투가 몇 번 남았는지
    floors: 2 * CONFIG.map.half + 2,
    at: null,        // 마지막으로 끝낸 칸 (아직 출발 전이면 null)
    pending: null,   // 들어갔지만 아직 끝내지 못한 칸
    visited: [],     // 지나온 칸
    hero,
    hp: (CONFIG.hero[hero] || CONFIG.hero.starter).hp + CONFIG.cheer.hp * cheer,
    maxHp: (CONFIG.hero[hero] || CONFIG.hero.starter).hp + CONFIG.cheer.hp * cheer,
    gold: 0,
    hints: ascend >= 4 ? CONFIG.ascend.hints : CONFIG.player.hints,
    up: { basic: 0, skill: 0, counter: 0, weak: 0 }, // 강화로 더해진 값
    relics: [],      // 이번 판에 얻은 유물의 id (얻은 순서대로. js/relics.js)
    spent: {},       // 한 판에 한 번만 쓰는 유물을 이미 썼는지 { bandage: true }
    lastFoe: null,
  };
  gainRelic(run, (CONFIG.hero[hero] || CONFIG.hero.starter).relic); // 모습의 시작 유물
  for (const id of CONFIG.relic.start) gainRelic(run, id); // 밸런스를 잴 때 더 넣는 유물 (보통은 없습니다)
  return run;
}

// 긴 탑에서 다음 막으로 넘어갑니다: 새 지도, 그 막의 유형, 체력 회복. 골드·강화·힌트는 그대로 가져갑니다.
export const isLastAct = (run) => !run.acts || run.act >= run.acts.length - 1;
export function nextAct(run) {
  run.act += 1;
  run.scope = [...run.acts[run.act].keys];
  run.nodes = makeMap(run.ascend || 0);
  run.at = null;
  run.pending = null;
  run.visited = [];
  run.lastFoe = null;
  const before = run.hp;
  run.hp = Math.min(run.maxHp, run.hp + CONFIG.act.heal);
  return run.hp - before;
}

export const nodeOf = (run, id) => run.nodes.find((n) => n.id === id);

// 지금 고를 수 있는 칸의 id 목록
export function available(run) {
  if (run.pending) return [run.pending];
  if (run.at === null) return run.nodes.filter((n) => n.floor === 0).map((n) => n.id);
  const here = nodeOf(run, run.at);
  return here ? here.next : [];
}

// 강화 목록. 이름과 설명은 lang 파일의 up.<id> 에 있습니다.
export const UPGRADES = {
  maxhp: (run) => { run.maxHp += 4; run.hp += 4; },
  heal: (run) => { run.hp = Math.min(run.maxHp, run.hp + 8); },
  hint: (run) => { run.hints += 1; },
  basic: (run) => { run.up.basic += 1; },
  skill: (run) => { run.up.skill += 1; },
  counter: (run) => { run.up.counter += 1; },
  weak: (run) => { run.up.weak += 0.5; },
};

// 보상으로 보여줄 강화를 겹치지 않게 뽑습니다.
export function rollUpgrades(count = 3) {
  const ids = Object.keys(UPGRADES);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, count);
}

// 상점에서 파는 것과 가격
export const SHOP = [
  { id: 'heal', price: 30 },
  { id: 'hint', price: 25 },
  { id: 'basic', price: 50 },
  { id: 'maxhp', price: 60 },
  { id: 'skill', price: 70 },
];
