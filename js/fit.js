// 화면 크기에 맞추기. 스마트폰마다 화면 높이가 다르고, 브라우저의 주소 줄 때문에 실제로 보이는 높이는 더 작습니다.
// 전투 화면에서 "지금 눌러야 하는 것"이 스크롤 없이 보이도록, 덜 중요한 것부터 차례로 줄입니다.
//   1) 싸우는 그림의 높이(보기 좋은 높이까지)  2) 여백(tight)  3) 문제 그림의 크기(모자란 만큼만)  4) 글자 크기(tighter)
//   5) 연속기의 "이미 푼 물음" 접기(tightest)  6) 싸우는 그림의 높이(최소 96px 까지)
//   그래도 넘치면 싸우는 그림은 남기고 화면을 내려서 답을 고르게 합니다. 화면에 여유가 있으면 싸우는 그림은 줄이지 않습니다.
import { $ } from './ui.js';

// 지금 눈에 보이는 높이. 스마트폰 브라우저에서는 주소 줄과 아래쪽 도구 줄이 나왔다 들어갔다 해서 이 값이 계속 바뀝니다.
const seenHeight = () => (window.visualViewport ? window.visualViewport.height : window.innerHeight);

// 화면을 맞출 때 기준으로 삼는 높이: 주소 줄과 아래쪽 줄이 "모두 나와 있을 때"의 높이 (CSS 의 100svh).
// 줄이 들어가 있을 때의 큰 높이에 맞추면, 스크롤을 올려 줄이 다시 나오는 순간 아래쪽(답 버튼)이 가려집니다.
// 가장 작은 높이에 맞춰 두면 줄이 나오든 들어가든 잘리지 않고, 맞춘 뒤에 화면이 다시 출렁일 일도 없습니다.
let probe = null;   // 높이가 100svh 인 보이지 않는 막대
let least = { width: 0, height: 0 }; // svh 를 모르는 옛 브라우저용: 이 폭에서 본 가장 작은 높이
function viewHeight() {
  if (!probe) {
    probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:100svh;visibility:hidden;pointer-events:none';
    document.body.appendChild(probe);
  }
  const small = probe.getBoundingClientRect().height;
  if (small > 0) return small;
  const now = seenHeight();
  if (least.width !== window.innerWidth) least = { width: window.innerWidth, height: now };
  least.height = Math.min(least.height, now);
  return least.height;
}

export function fitBattle() {
  const screen = $('screenBattle');
  const canvas = $('stage');
  if (!screen || screen.hidden) return;
  const figure = document.querySelector('#qFigure svg');
  canvas.style.height = '';
  if ($('nextBtn').hidden) screen.style.paddingBottom = ''; // 풀이를 보느라 내려 둔 동안에는 아래 여백을 그대로 둡니다
  if (figure) figure.style.maxWidth = '';
  screen.classList.remove('tight', 'tighter', 'tightest');

  const answering = screen.classList.contains('answering');
  // 지금 꼭 보여야 하는 마지막 요소: 문제를 푸는 중이면 답 버튼, 아니면 맨 아래 안내 글.
  // 답을 고른 뒤의 풀이와 "다음" 버튼은 여기에 넣지 않습니다. 풀이는 길어서 어차피 한 화면에 다 들어오지 않고,
  // 거기에 맞추려고 싸우는 그림을 더 줄이면 답을 고르는 순간 화면이 출렁이며 캐릭터와 적이 잘립니다. 풀이는 스크롤해서 봅니다.
  const target = answering ? $('answers') : $('notice'); // 행동을 고를 때는 아래의 안내 글까지
  const over = () => Math.ceil(target.getBoundingClientRect().bottom + window.scrollY + 10 - viewHeight());

  // 싸우는 그림은 게임의 얼굴이라 되도록 크게 남깁니다. 그래서 두 번에 나누어 줄입니다.
  //   먼저 "보기 좋은 높이"까지만 줄이고 → 여백·문제 그림·글자를 줄인 뒤 → 그래도 모자라면 "최소 높이"까지 줄입니다.
  const natural = canvas.getBoundingClientRect().height;
  const roomy = answering ? 180 : 96; // 넉넉한 높이: 여기까지는 먼저 줄입니다
  const good = answering ? 132 : 96; // 보기 좋은 높이
  // 최소 높이. 이보다 줄이지 않습니다 (장면을 줄여 그려도 캐릭터와 적을 알아볼 수 있는 높이). 아주 낮은 화면(500px 아래)에서만 조금 더 줄입니다.
  const least = viewHeight() < 500 ? 64 : 96;
  const shrink = (floor) => {
    if (floor >= canvas.getBoundingClientRect().height) return over() <= 0;
    const now = canvas.getBoundingClientRect().height;
    const cut = Math.min(over(), Math.max(0, now - floor));
    if (cut > 0) canvas.style.height = `${Math.round(now - cut)}px`;
    return over() <= 0;
  };

  // 넓은 화면(가로로 놓은 태블릿 등)에서는 싸우는 그림과 문제가 좌우로 나란히 놓입니다. 그림을 줄여도 문제 쪽 자리가 늘지 않으므로 줄이지 않습니다.
  const wide = window.getComputedStyle(screen).display === 'grid';
  if (over() <= 0) return;
  if (!wide && shrink(Math.min(natural, roomy))) return;
  screen.classList.add('tight');
  if (over() <= 0) return;
  // 문제 그림을 먼저 조금 줄이고(넉넉한 높이까지), 그다음에 싸우는 그림을 보기 좋은 높이까지 줄입니다.
  if (figure) {
    const box = figure.getBoundingClientRect();
    const height = Math.max(Math.min(box.height, 150), box.height - over());
    figure.style.maxWidth = `${Math.floor((box.width * height) / box.height)}px`;
    if (over() <= 0) return;
  }
  if (!wide && shrink(Math.min(natural, good))) return;
  // 그림은 모자란 만큼만 줄입니다. (너무 작아지지 않게 아래 한계를 둡니다)
  if (figure) {
    const box = figure.getBoundingClientRect();
    // "큰 글씨"를 켠 사람에게는 그림도 작아지면 안 되므로, 덜 줄이고 모자라면 스크롤하게 둡니다.
    const floor = document.body.classList.contains('bigtext') ? 150 : 104;
    const height = Math.max(Math.min(box.height, floor), box.height - over());
    figure.style.maxWidth = `${Math.floor((box.width * height) / box.height)}px`;
    if (over() <= 0) return;
  }
  screen.classList.add('tighter');
  if (over() <= 0) return;
  // 연속기는 지문과 "이미 푼 물음"이 더 붙어 길어집니다. 싸우는 그림을 더 줄이기 전에 그쪽을 먼저 접습니다.
  screen.classList.add('tightest');
  if (over() <= 0) return;
  if (!wide && shrink(least)) return;
  // 그래도 넘치면 싸우는 그림은 그대로 두고 화면을 내려서 답을 고르게 합니다. (그림이 사라지면 게임 화면 같지 않습니다)
  // 가로로 눕힌 아주 낮은 화면에서만 그림을 접습니다. (세로로 돌려 달라는 안내가 뜨는 크기)
  if (answering && viewHeight() < 431 && over() > 24) canvas.style.height = '0px';
}

// 답을 고른 뒤: 풀이와 "다음" 버튼이 보이도록 화면을 내립니다. 풀이가 길면 풀이의 첫 줄이 위에 오는 데까지만 내립니다.
export function showReview() {
  const box = $('reviewBox');
  const next = $('nextBtn');
  if (next.hidden) return;
  const head = $('topBar').getBoundingClientRect().height;
  const toNext = next.getBoundingClientRect().bottom + 12 - seenHeight(); // "다음" 버튼이 다 보이려면 내려야 하는 거리
  const toTop = (box.hidden ? next : box).getBoundingClientRect().top - head - 8; // 풀이의 첫 줄이 가려지지 않는 한계
  let move = Math.min(toNext, toTop);
  if (move <= 0) return;
  // 싸우는 그림이 위쪽 줄 밑으로 반쯤 걸쳐 잘려 보이지 않게, 내릴 바에는 그림이 다 넘어갈 때까지 내립니다.
  const stageEnd = document.querySelector('#screenBattle .foe').getBoundingClientRect().bottom - head;
  if (stageEnd > move && stageEnd <= toTop) move = stageEnd;
  // 화면 아래에 내릴 자리가 모자라면 그만큼 여백을 둡니다. (다음 문제에서 fitBattle 이 지웁니다)
  const screen = $('screenBattle');
  const short = window.scrollY + move + seenHeight() - document.documentElement.scrollHeight;
  if (short > 0) screen.style.paddingBottom = `${Math.ceil(short)}px`;
  window.scrollBy({ top: move, behavior: document.body.classList.contains('calm') ? 'auto' : 'smooth' });
}

// 화면이 돌아가거나 창의 크기가 바뀌면 다시 맞춥니다.
// 주소 줄이 접히고 펴지는 것만으로는 다시 맞추지 않습니다. (기준 높이가 "줄이 다 나와 있을 때"로 고정이라 달라질 것이 없습니다)
export function watchFit() {
  let timer = 0;
  let width = window.innerWidth;
  let height = viewHeight();
  const again = () => {
    const w = window.innerWidth;
    const h = viewHeight();
    if (w === width && Math.abs(h - height) < 2) return;
    width = w;
    height = h;
    clearTimeout(timer);
    timer = setTimeout(fitBattle, 60);
  };
  window.addEventListener('resize', again);
  window.addEventListener('orientationchange', again);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', again);
}
