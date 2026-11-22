// 게임 속 튜토리얼. 처음 하는 사람에게 첫 전투에서 한 번에 하나씩만 알려 줍니다.
// 단계는 저장 기록의 data.tut 에 들어 있고, 'done' 이면 끝난 것입니다. 끝난 뒤에는 다시 나오지 않습니다.
// (처음 화면의 "튜토리얼 다시 보기" 로 다시 볼 수 있습니다)
//
// 안내는 두 가지 모양으로 나옵니다.
//   강조 안내 (js/guide.js): 화면을 어둡게 가리고 눌러야 할 곳만 밝게 보여 줍니다. 화살표 달린 말풍선이 붙습니다.
//   안내 줄: 문제를 푸는 동안에는 화면을 가리지 않고, 위쪽 노란 줄에 한 문장만 보여 줍니다.
//
// 단계 순서
//   start    지도에서 첫 칸 고르기
//   look1~3  전투 화면 둘러보기 (적의 체력과 약점 → 다음 턴 예고 → 내 체력과 필살기) : "다음" 으로 넘김
//   basic    기본 공격 누르기      → basicQ   답 고르기 (정답을 알려 줍니다. skillQ, defendQ 도 같음)
//   skill    스킬 누르기           → skillQ   답 고르기
//   warn     강한 공격 예고 보기 : "다음" 으로 넘김
//   defend   방어 누르기           → defendQ  답 고르기
//   free     자유롭게 싸우기 (필살기가 차면 따로 안내)
//   reward   강화 고르기
//   map      다음 칸 고르기 → done

// 지금 단계에서 이 일이 일어나면 다음 단계로 넘어갑니다.
const NEXT = {
  start: { fight: 'look1' },
  look1: { next: 'look2' },
  look2: { next: 'look3' },
  look3: { next: 'basic' },
  basic: { 'chose:basic': 'basicQ' },
  basicQ: { answered: 'skill' },
  skill: { 'chose:skill': 'skillQ' },
  skillQ: { answered: 'warn' },
  warn: { next: 'defend' },
  defend: { 'chose:defend': 'defendQ' },
  defendQ: { answered: 'free' },
  free: { won: 'reward' },
  reward: { rewarded: 'map' },
  map: { picked: 'done' },
};

// 이 단계에서는 이 버튼만 누를 수 있습니다. 'none' 이면 둘러보는 중이라 아무 행동도 누를 수 없습니다.
const ONLY = { look1: 'none', look2: 'none', look3: 'none', basic: 'basic', skill: 'skill', warn: 'none', defend: 'defend' };

// 문제를 푸는 동안 위쪽 안내 줄에 나오는 문구 (lang 파일의 tut.<이름>)
const COACH = { basicQ: 'tut.answer', skillQ: 'tut.answer', defendQ: 'tut.guard', free: 'tut.free' };

// 강조 안내: 어느 화면에서, 무엇을 밝게 보여 주고, 무슨 말을 하고, 어떻게 넘어가는지
//   target 은 강조할 요소의 CSS 선택자들 (여러 개면 모두를 감싸는 네모)
//   mode 'tap'  = 강조한 곳을 직접 눌러야 넘어감,  'next' = 읽고 "다음" 을 눌러 넘어감
const GUIDES = {
  start: { screen: 'screenMap', target: ['#mapRows .node.open'], text: 'tut.start', mode: 'tap' },
  look1: { screen: 'screenBattle', target: ['#foeName', '#foeWeak', '#foeBar', '#foeHpText'], text: 'tut.look1', mode: 'next' },
  look2: { screen: 'screenBattle', target: ['#foeIntent'], text: 'tut.look2', mode: 'next' },
  look3: { screen: 'screenBattle', target: ['#meBox'], text: 'tut.look3', mode: 'next' },
  basic: { screen: 'screenBattle', target: ['[data-action="basic"]'], text: 'tut.basic', mode: 'tap' },
  skill: { screen: 'screenBattle', target: ['[data-action="skill"]'], text: 'tut.skill', mode: 'tap' },
  warn: { screen: 'screenBattle', target: ['#foeIntent'], text: 'tut.warn', mode: 'next' },
  defend: { screen: 'screenBattle', target: ['[data-action="defend"]'], text: 'tut.defend', mode: 'tap' },
  reward: { screen: 'screenEvent', target: ['#evOptions'], text: 'tut.reward', mode: 'tap' },
  map: { screen: 'screenMap', target: ['#mapRows .node.open'], text: 'tut.map', mode: 'tap' },
};
const ORDER = Object.keys(GUIDES);

export function createTutorial(data, onStep) {
  let ultReady = false;

  // 전투 도중에 닫았다가 다시 열면 지도에서 시작하므로, 전투 단계는 처음으로 되돌립니다.
  if (data.tut !== 'done' && data.tut !== 'map' && data.tut !== 'start') data.tut = 'start';

  function go(event) {
    if (data.tut === 'done') return;
    let to = (NEXT[data.tut] || {})[event];
    // 예상보다 일찍 이겨도 보상 안내로 넘어갑니다.
    if (!to && event === 'won' && data.tut !== 'map') to = 'reward';
    if (!to) return;
    data.tut = to;
    onStep();
  }

  return {
    // 튜토리얼 전투가 진행 중인지 (피해가 줄고 쓰러지지 않습니다)
    active: () => data.tut !== 'done' && data.tut !== 'map',
    done: () => data.tut === 'done',
    only: () => ONLY[data.tut] || null,
    // 튜토리얼의 세 문제(기본 공격, 스킬, 방어)에서는 정답을 알려 주고 그 답만 누를 수 있게 합니다.
    // 조작을 배우는 자리라, 틀려서 흐름이 어긋나는 일이 없게 합니다. (자유롭게 싸우는 단계부터는 알려 주지 않습니다)
    teach: () => ['basicQ', 'skillQ', 'defendQ'].includes(data.tut),
    coach() {
      if (data.tut === 'done') return null;
      return COACH[data.tut] || null;
    },
    // 지금 보여 줄 강조 안내. 없으면 null.
    //   where = { screen, choosing(전투에서 행동을 고르는 중인지), chainReady(연속기 버튼을 누를 수 있는지) }
    guide(where) {
      const inBattle = where.screen === 'screenBattle' && where.choosing;
      if (data.tut !== 'done') {
        const spec = GUIDES[data.tut];
        if (spec && spec.screen === where.screen && (spec.screen !== 'screenBattle' || where.choosing)) {
          return { ...spec, step: ORDER.indexOf(data.tut) + 1, total: ORDER.length, next: () => go('next') };
        }
        if (data.tut === 'free' && inBattle && ultReady) return { target: ['#ultBtn'], text: 'tut.ult', mode: 'tap' };
        if (data.tut !== 'free') return null;
      }
      // 한 번만 알려 주는 도움말: 연속기 (튜토리얼을 끝낸 사람에게도 처음 한 번 나옵니다)
      if (inBattle && where.chainReady && !data.seenChain) {
        return { target: ['#chainBtn'], text: 'tut.chain', mode: 'next', next: () => { data.seenChain = true; onStep(); } };
      }
      return null;
    },
    setUltReady(ready) {
      ultReady = ready;
    },
    // 건너뛰기: 안내를 모두 끝내고 다시 보여주지 않습니다.
    skip() {
      data.seenChain = true;
      if (data.tut !== 'done') data.tut = 'done';
      onStep();
    },
    // 다시 보기: 처음부터 다시 안내합니다. (새 지도에서 시작해야 합니다)
    restart() {
      data.tut = 'start';
      data.seenChain = false;
      onStep();
    },
    emit: go,
  };
}
