// 문제 불러오기와 출제.
//
// 단원 파일(data/units/*.json)은 "문장 틀(templates)"로 되어 있습니다.
//   - items 가 있는 틀: 적어 둔 숫자 묶음 중에서 냅니다.
//   - gen 이 있는 틀: js/generators.js 가 매번 새 숫자를 만들어 냅니다.
// 틀 하나만 3개 언어로 쓰면, 숫자만 다른 문제가 전부 3개 언어로 나옵니다.
//
// 유형의 이름은 "단원/유형" 입니다. (예: math1-trig/sinerule)
// 플레이어가 고른 범위(유형 목록) 안에서만 문제를 냅니다.
import { calcFill } from './calc.js';
import { CONFIG } from './config.js';
import { fill, pick, t } from './i18n.js';
import { GENERATORS, CHAINS } from './generators.js';

let catalog = null;
const units = [];
const templates = [];        // 모든 틀 { id, level, type, tpl, gen }
const types = new Map();     // "단원/유형" → { key, unit, names }
const usedItems = new Map(); // 틀 id → 이미 낸 숫자 묶음의 번호
const recent = [];           // 자동 생성 문제의 최근 기록 (바로 같은 문제가 나오지 않게)
let scope = null;            // 범위: 유형 이름의 집합. null 이면 전체
let last = null;
const chains = [];        // 연속기 묶음 (단원 파일의 "chains")

async function getJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

// 목록(data/catalog.json)에 적힌 모든 단원을 불러옵니다.
export async function loadAll(onStep = () => {}) {
  catalog = await getJson('./data/catalog.json');
  onStep();
  // 단원 파일은 하나씩 기다리지 않고 한꺼번에 받습니다. (통신이 느릴 때 차이가 큽니다)
  // 목록의 off 에 적힌 단원은 건너뜁니다. (학교 범위가 아닌 단원을 지우지 않고 꺼 둘 때 씁니다)
  // "단원/유형" 으로 적으면 그 유형만 끕니다. 예: "math2-trig/compose"
  const off = new Set(catalog.off || []);
  const wanted = catalog.subjects.flatMap((subject) => subject.units.filter((id) => !off.has(id)).map((id) => ({ subject, id })));
  const loaded = await Promise.all(wanted.map(({ id }) => getJson(`./data/units/${id}.json`).then((unit) => {
    onStep();
    return unit;
  })));
  // 받은 순서와 상관없이 목록에 적힌 순서대로 정리합니다.
  loaded.forEach((unit, n) => {
    unit.subject = wanted[n].subject;
    // 꺼 둔 유형: 유형 목록, 묶음, 문제 틀, 그 유형이 들어간 연속기에서 모두 뺍니다.
    const gone = new Set(Object.keys(unit.types).filter((name) => off.has(`${unit.id}/${name}`)));
    if (gone.size) {
      for (const name of gone) delete unit.types[name];
      unit.groups = unit.groups.map((g) => ({ ...g, types: g.types.filter((t) => !gone.has(t)) })).filter((g) => g.types.length);
      unit.templates = unit.templates.filter((tpl) => !gone.has(tpl.type));
      unit.chains = (unit.chains || []).filter((ch) => !ch.steps.some((st) => gone.has(st.type)));
    }
    if (!Object.keys(unit.types).length) return; // 유형을 모두 껐으면 단원도 나오지 않습니다
    units.push(unit);
    for (const [name, names] of Object.entries(unit.types)) {
      const key = `${unit.id}/${name}`;
      types.set(key, { key, unit, names });
    }
    for (const tpl of unit.chains || []) {
      chains.push({ id: `${unit.id}/${tpl.id}`, tpl, gen: CHAINS[tpl.gen], types: tpl.steps.map((s) => `${unit.id}/${s.type}`), boss: tpl.boss === true, draft: tpl.draft === true });
    }
    for (const tpl of unit.templates) {
      templates.push({
        id: `${unit.id}/${tpl.id}`,
        level: tpl.level,
        type: `${unit.id}/${tpl.type}`,
        tpl,
        gen: tpl.gen ? GENERATORS[tpl.gen] : null,
      });
    }
  });
  return { catalog, units };
}

// ---- 유형 정보 (범위 선택 화면과 도감이 씁니다) ----
export const typeLabel = (key) => (types.has(key) ? pick(types.get(key).names) : key);
export const allTypeKeys = () => [...types.keys()];
export const hasType = (key) => types.has(key);

// 과목 → 단원 → 묶음 → 유형 의 나무 모양 목록
export function scopeTree() {
  return catalog.subjects.map((subject) => ({
    names: subject.name,
    units: units.filter((u) => u.subject === subject).map((unit) => ({
      names: unit.name,
      groups: (unit.groups || [{ name: unit.name, types: Object.keys(unit.types) }]).map((group) => ({
        names: group.name,
        types: group.types.map((name) => `${unit.id}/${name}`),
      })),
    })),
  }));
}

// 유형 목록에 걸친 과목 이름들 (화면 위쪽에 보여줍니다)
// 긴 탑: 고른 유형을 막 3개로 나눕니다. 막의 수는 과목 수와 상관없이 늘 3 입니다 (CONFIG.act.count).
// 배우는 순서(목록의 단원 순서)대로 이어 붙인 뒤, 세 막의 유형 수가 비슷해지도록 단원의 경계에서 자릅니다.
//   과목 하나(단원 셋)만 골랐다면 단원마다 한 막, 과목을 여럿 골랐다면 한 막에 여러 단원·과목이 들어갑니다.
//   단원이 셋보다 적으면 유형 단위로 자릅니다. 유형이 너무 적으면(막마다 2개 미만) 긴 탑을 만들지 않습니다 → []
export function actsFor(keys) {
  const count = CONFIG.act.count;
  const mine = keys.filter((key) => types.has(key));
  if (mine.length < count * 2) return [];
  let blocks = units.map((unit) => mine.filter((key) => types.get(key).unit === unit)).filter((list) => list.length);
  if (blocks.length < count) blocks = blocks.flat().map((key) => [key]);
  // 자르는 자리 두 곳을 모두 해 보고, 가장 큰 막이 가장 작아지는 것을 고릅니다
  const size = (from, to) => blocks.slice(from, to).reduce((sum, list) => sum + list.length, 0);
  let best = null;
  for (let i = 1; i < blocks.length - 1; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const parts = [size(0, i), size(i, j), size(j, blocks.length)];
      const score = Math.max(...parts) * 1000 - Math.min(...parts);
      if (!best || score < best.score) best = { score, cuts: [0, i, j, blocks.length] };
    }
  }
  return [0, 1, 2].map((n) => {
    const part = blocks.slice(best.cuts[n], best.cuts[n + 1]).flat();
    return { id: types.get(part[0]).unit.subject.id, keys: part };
  });
}
// 막의 이름: 단원 하나뿐이면 그 단원 이름, 아니면 들어 있는 과목 이름들
export function actLabel(keys) {
  const list = keys.map((key) => types.get(key)).filter(Boolean);
  const inUnits = [...new Set(list.map((type) => type.unit))];
  if (inUnits.length === 1) return pick(inUnits[0].name);
  return [...new Set(list.map((type) => pick(type.unit.subject.name)))].join(' · ');
}
// 처음 하는 사람에게 골라 두는 범위: 목록의 첫 과목(数学I)만. 아직 배우지 않은 과목의 문제가 섞여 나오지 않게 합니다.
export const starterKeys = () => { const first = catalog.subjects[0]; const keys = allTypeKeys().filter((key) => types.get(key)?.unit.subject === first); return keys.length ? keys : allTypeKeys(); };
export const subjectName = (id) => { const subject = catalog.subjects.find((s) => s.id === id); return subject ? pick(subject.name) : ''; };

export function subjectNames(keys) {
  const seen = [];
  for (const key of keys) {
    const type = types.get(key);
    if (type && !seen.includes(type.unit.subject)) seen.push(type.unit.subject);
  }
  return seen.map((subject) => pick(subject.name));
}

// ---- 범위 ----
export function setScope(keys) {
  const valid = (keys || []).filter((key) => types.has(key));
  scope = valid.length ? new Set(valid) : null;
  usedItems.clear();
  recent.length = 0;
}
const inScope = (entry) => !scope || scope.has(entry.type);

// ---- 출제 ----
const rand = (n) => Math.floor(Math.random() * n);

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 틀에서 숫자 묶음 하나를 고릅니다.
function itemFrom(entry) {
  if (entry.gen) {
    // 자동 생성: 최근에 낸 것과 겹치지 않을 때까지 몇 번 다시 만듭니다.
    let item = entry.gen(entry.tpl.params || {});
    for (let tries = 0; tries < 12; tries++) {
      const sig = `${entry.id}:${JSON.stringify(item)}`;
      if (!recent.includes(sig)) {
        recent.push(sig);
        if (recent.length > 24) recent.shift();
        break;
      }
      item = entry.gen(entry.tpl.params || {});
    }
    return item;
  }
  // 적어 둔 목록: 한 바퀴 다 돌 때까지 같은 것은 내지 않습니다.
  const items = entry.tpl.items;
  let used = usedItems.get(entry.id);
  if (!used || used.size >= items.length) {
    used = new Set();
    usedItems.set(entry.id, used);
  }
  const left = items.map((_, i) => i).filter((i) => !used.has(i));
  const index = left[rand(left.length)];
  used.add(index);
  return items[index];
}

function build(entry) {
  const item = itemFrom(entry);
  const options = shuffle([String(item.answer), ...item.wrong.map(String)]);
  last = {
    raw: { tpl: entry.tpl, item },
    level: entry.level,
    type: entry.type,
    options,
    correct: options.indexOf(String(item.answer)),
  };
  return last;
}

// 유형을 먼저 고르고, 그 유형의 틀 중 하나를 고릅니다. (유형마다 고르게 나오도록)
// 방금 낸 유형들. 같은 유형이 금방 다시 나오면 지루하므로, 다른 유형이 남아 있는 동안에는 이 유형들을 피합니다.
const recentTypes = [];
function remember(list, value, keep) {
  const at = list.indexOf(value);
  if (at >= 0) list.splice(at, 1);
  list.push(value);
  while (list.length > keep) list.shift();
}
function pickEntry(candidates) {
  const byType = new Map();
  for (const entry of candidates) {
    if (!byType.has(entry.type)) byType.set(entry.type, []);
    byType.get(entry.type).push(entry);
  }
  // 고를 수 있는 유형의 절반까지(많아도 CONFIG.variety.types 개) 최근 것을 뺍니다.
  const keep = Math.min(CONFIG.variety.types, Math.floor(byType.size / 2));
  const stale = new Set(recentTypes.slice(recentTypes.length - keep));
  const fresh = keep > 0 ? [...byType.keys()].filter((type) => !stale.has(type)) : [];
  const types = fresh.length ? fresh : [...byType.keys()];
  const group = byType.get(types[rand(types.length)]);
  const entry = group[rand(group.length)];
  remember(recentTypes, entry.type, CONFIG.variety.types);
  return entry;
}

// 단계에 맞는 문제를 하나 냅니다.
// 범위 안에 그 단계의 문제가 없으면 가장 가까운 단계의 문제를 냅니다.
// favor: 적의 약점 유형. 주면 CONFIG.weakRate 의 확률로 그 유형을 먼저 냅니다. (그 유형에 이 단계의 문제가 없으면 가장 가까운 단계)
//   범위가 넓어질수록 약점 유형이 우연히 나올 확률은 줄어듭니다 (유형 수 분의 1). 이렇게 따로 올려 두어야 약점이 의미를 가집니다.
// sure: favor 유형을 확률 없이 반드시 냅니다 (? 칸 "약점 쪽지"). 그 유형의 문제가 있기만 하면 단계 차이는 따지지 않습니다.
export function next(level, favor = '', sure = false) {
  const pool = templates.filter(inScope);
  if (favor && (sure || Math.random() < CONFIG.weakRate)) {
    const mine = pool.filter((entry) => entry.type === favor);
    const reach = mine.length ? Math.min(...mine.map((entry) => Math.abs(entry.level - level))) : 9;
    if (reach <= (sure ? 8 : 1)) { // 두 단계 넘게 차이 나는 문제는 내지 않습니다 (쉬운 문제를 고른 사람에게 가장 어려운 문제가 나오지 않게)
      const near = Math.min(...mine.map((entry) => Math.abs(entry.level - level)));
      const pickFrom = mine.filter((entry) => Math.abs(entry.level - level) === near);
      const entry = pickFrom[rand(pickFrom.length)];
      remember(recentTypes, entry.type, CONFIG.variety.types);
      return build(entry);
    }
  }
  for (const distance of [0, 1, 2]) {
    const candidates = pool.filter((entry) => Math.abs(entry.level - level) === distance);
    if (candidates.length) {
      // 같은 거리라면 더 어려운 쪽보다 원래 단계에 가까운 쉬운 쪽을 먼저 봅니다.
      const lower = candidates.filter((entry) => entry.level <= level);
      return build(pickEntry(lower.length ? lower : candidates));
    }
  }
  return build(pickEntry(templates));
}

// 유형을 정해서 문제를 하나 냅니다. (휴식 칸의 복습에 씁니다) 없으면 null.
export function nextByType(key) {
  const candidates = templates.filter((entry) => entry.type === key);
  return candidates.length ? build(pickEntry(candidates)) : null;
}

// 지금 언어로 문제 문장과 해설을 만듭니다. 언어를 바꾸면 다시 부르면 됩니다.
export function questionText(raw) {
  return fill(pick(raw.tpl.text), shown(raw.item));
}

// 풀이 글. 단원 파일에서 줄바꿈으로 단계를 나눠 적으면 화면에 ①②③ 단계로 나옵니다.
export function explainText(raw) {
  return fill(calcFill(pick(raw.tpl.explain), raw.item), shown(raw.item)); // {= 식 } 을 먼저 계산합니다 (js/calc.js)
}
// 풀이의 단계들 (한 줄짜리 풀이는 한 단계)
export const explainSteps = (raw) => explainText(raw).split('\n').map((line) => line.trim()).filter(Boolean);
// 알림 줄처럼 좁은 곳에 쓰는 한 줄: 마지막 단계 (답이 들어 있는 줄)
export const explainBrief = (raw) => explainSteps(raw).at(-1) || '';

// 보기가 말로 된 문제: 보기에 "@이름" 을 적으면 lang 파일의 opt.<이름> 문구가 지금 언어로 나옵니다.
export function optionText(text) {
  // 글 안에 섞여 있는 "@이름" 도 바꿉니다. 예: "x ≦ 1 @or x ≧ 5" → "x ≦ 1 または x ≧ 5"
  return String(text).replace(/@(\w+)/g, (whole, name) => {
    const word = t(`opt.${name}`);
    return word === `opt.${name}` ? whole : word;
  });
}
// 문장 틀에 넣을 값들 ("@이름" 은 지금 언어의 글로 바꿉니다)
function shown(item) {
  const out = {};
  for (const [key, value] of Object.entries(item)) out[key] = typeof value === 'string' ? optionText(value) : value;
  return out;
}

// 문제를 풀 때 지켜야 하는 조건. 틀에 "note" 가 있으면 문제 아래에 따로 보여 줍니다.
// 예: "x 는 실수", "눈높이는 생각하지 않는다", "원주율은 3.14 로 계산한다"
export function noteText(raw) {
  return raw.tpl.note ? fill(pick(raw.tpl.note), shown(raw.item)) : '';
}

// ---- 연속기: 한 상황에서 물음 (1)(2)(3) 을 이어 풉니다 ----
// 묶음에 든 유형이 모두 이번 범위에 들어 있어야 그 묶음이 나옵니다.
// 묶음에 "boss": true 를 적으면 보스전에서만 나오는 어려운 묶음(킬러 묶음)이 됩니다.
// "draft": true 는 아직 검수 중인 묶음입니다. 평소에는 나오지 않고, 주소 끝에 ?draft=1 을 붙여 열었을 때만
// (어느 전투에서든, 다른 묶음보다 먼저) 나와서 검수하는 사람이 바로 풀어 볼 수 있습니다.
export const DRAFT = typeof window !== 'undefined' && window.location && /[?&]draft\b/.test(window.location.search || '');
const chainFits = (entry) => entry.gen && entry.types.every((key) => !scope || scope.has(key));
function chainPool(boss = false) {
  const all = chains.filter(chainFits);
  if (DRAFT && all.some((entry) => entry.draft)) return all.filter((entry) => entry.draft);
  const ready = all.filter((entry) => !entry.draft);
  const killers = ready.filter((entry) => entry.boss);
  if (boss && killers.length) return killers; // 보스전에는 킬러 묶음이 먼저
  return ready.filter((entry) => !entry.boss);
}
// boss: 보스전인지
// 그 단원이 지금 게임에 들어 있는지 (꺼 둔 단원의 몬스터를 빼는 데 씁니다)
export const hasUnit = (id) => units.some((unit) => unit.id === id);
export const hasChain = (boss = false) => chainPool(boss).length > 0;
// 범위(유형 목록)를 주면, 그 범위에서 나올 수 있는 연속기 묶음이 몇 개인지 셉니다. (범위 고르기 화면용. 검수 중인 묶음은 세지 않습니다)
export const chainCount = (keys) => { const set = new Set(keys); return chains.filter((entry) => entry.gen && !entry.draft && entry.types.every((key) => set.has(key))).length; };
export const chainTotal = () => chains.filter((entry) => entry.gen && !entry.draft).length;

// 연속기 하나를 만듭니다. 돌려주는 것: { intro(), steps: [물음, …] }
// 물음 하나는 보통 문제와 같은 모양이라, 화면과 도감이 그대로 다룰 수 있습니다.
// 물음에 figure 를 적으면 묶음의 그림에 그 이름표만 덮어씁니다. (구할 것은 "?", 구한 뒤에는 "{a1}")
const recentChains = [];
export function nextChain(boss = false) {
  const pool = chainPool(boss);
  if (!pool.length) return null;
  // 방금 나온 묶음은 피합니다: 고를 수 있는 묶음의 절반까지(많아도 CONFIG.variety.chains 개).
  const keep = Math.min(CONFIG.variety.chains, Math.floor(pool.length / 2));
  const stale = new Set(recentChains.slice(recentChains.length - keep));
  const fresh = keep > 0 ? pool.filter((item) => !stale.has(item.id)) : [];
  const from = fresh.length ? fresh : pool;
  const entry = from[rand(from.length)];
  remember(recentChains, entry.id, CONFIG.variety.chains);
  const data = entry.gen();
  const { steps: made, ...fields } = data;
  const answers = {};
  made.forEach((s, i) => { answers[`a${i + 1}`] = s.answer; });
  const steps = entry.tpl.steps.map((def, i) => {
    const options = shuffle([String(made[i].answer), ...made[i].wrong.map(String)]);
    return {
      raw: {
        tpl: { text: def.text, explain: def.explain, note: def.note || entry.tpl.note, figure: entry.tpl.figure && { ...entry.tpl.figure, ...(def.figure || {}) } },
        item: { ...fields, ...answers, answer: made[i].answer },
      },
      level: def.level,
      type: entry.types[i],
      options,
      correct: options.indexOf(String(made[i].answer)),
      sum: def.sum,
    };
  });
  return { id: entry.id, intro: () => fill(pick(entry.tpl.intro), shown(fields)), steps };
}
// 풀어 낸 물음을 한 줄로 요약합니다. 예: "(1) 꼭짓점: (2, −1)"
export const stepSummary = (q, index) => `(${index + 1}) ${pick(q.sum)}: ${optionText(q.raw.item.answer)}`;
// 검사 도구용: 지금 푸는 물음을 "방금 낸 문제"로 알려 줍니다.
export function setDebugLast(q) {
  last = q;
}

// 자동 검사 도구가 방금 낸 문제의 정답을 확인할 때 씁니다. 게임에서는 쓰지 않습니다.
export const debugLast = () => last;
