// 화면 크기에 맞추기. 스마트폰마다 화면 높이가 다르고, 브라우저의 주소 줄 때문에 실제로 보이는 높이는 더 작습니다.
// 전투 화면에서 "지금 눌러야 하는 것"이 스크롤 없이 보이도록, 덜 중요한 것부터 차례로 줄입니다.
//   1) 싸우는 그림의 높이(180 → 132)  2) 여백(tight)  3) 문제 그림의 크기(모자란 만큼만)  4) 글자 크기(tighter)
//   5) 연속기의 "이미 푼 물음" 접기(tightest)  6) 싸우는 그림의 높이(최소 96px)
//   싸우는 그림의 높이는 180 · 132 · 96 세 단계로만 바뀝니다. (문제마다 크기가 제각각이 되지 않게)
//   그래도 넘치면 싸우는 그림은 남기고 화면을 내려서 답을 고르게 합니다. 적이 쓰러지는 연출 동안에는 줄이지 않습니다.
import { $ } from './ui.js';

// 지금 눈에 보이는 높이. 스마트폰 브라우저에서는 주소 줄과 아래쪽 도구 줄이 나왔다 들어갔다 해서 이 값이 바뀝니다.
// (두 손가락으로 확대했을 때는 확대하기 전의 높이로 셉니다)
function seenHeight() {
  const view = window.visualViewport;
  return view ? Math.round(view.height * (view.scale || 1)) : window.innerHeight;
}

// 화면을 맞출 때 기준으로 삼는 높이: "지금 보이는 높이".
// 예전에는 주소 줄이 다 나와 있을 때의 높이(100svh)에 맞췄는데, 줄이 들어가 있는 동안에는 아래쪽이 비는데도
// 싸우는 그림만 작아졌습니다. 지금 보이는 높이에 맞추고, 줄이 다시 나와 높이가 줄면 그때 다시 맞춥니다 (watchFit).
const viewHeight = seenHeight;

export function fitBattle() {
  const screen = $('screenBattle');
  const canvas = $('stage');
  if (!screen || screen.hidden) return;
  const figure = document.querySelector('#qFigure svg');
  canvas.style.height = '';
  if ($('nextBtn').hidden) screen.style.paddingBottom = ''; // 풀이를 보느라 내려 둔 동안에는 아래 여백을 그대로 둡니다
  if (figure) figure.style.maxWidth = '';
  screen.classList.remove('tight', 'tighter', 'tightest');

  // 적이 쓰러지는 연출 동안에는 줄이지 않습니다. 아래의 행동 버튼은 이때 누를 일이 없으니 화면 밖으로 밀려나도 괜찮습니다.
  if (screen.classList.contains('finale')) return;

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
  // 최소 높이. 이보다 줄이지 않습니다 (장면을 줄여 그려도 캐릭터와 적을 알아볼 수 있는 높이). 아주 낮은 화면(440px 아래)에서만 조금 더 줄입니다.
  const least = viewHeight() < 440 ? 64 : 96;
  // 높이는 "모자란 만큼"이 아니라 정해 둔 단계(넉넉한 높이 → 보기 좋은 높이 → 최소 높이)로만 줄입니다.
  // 모자란 만큼씩 줄이면 문제마다 그림의 크기가 조금씩 달라져, 문제가 바뀔 때마다 장면이 들쭉날쭉해 보입니다.
  const shrink = (floor) => {
    if (over() > 0 && floor < canvas.getBoundingClientRect().height) canvas.style.height = `${Math.round(floor)}px`;
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

// 화면이 돌아가거나 창의 크기가 바뀌면 다시 맞춥니다. 주소 줄이 나오고 들어가서 보이는 높이가 바뀔 때도 다시 맞춥니다.
// 다만 화면이 출렁이지 않도록 두 경우는 그대로 둡니다.
//   - 풀이를 읽는 중일 때 (스크롤하며 읽는 동안 그림이 커졌다 작아졌다 하면 안 됩니다)
//   - 아래로 내려 둔 채 높이가 "늘어난" 경우 (가려지는 것이 없으므로, 다음 문제에서 맞추면 됩니다)
export function watchFit() {
  let timer = 0;
  let width = window.innerWidth;
  let height = viewHeight();
  const again = () => {
    const w = window.innerWidth;
    const h = viewHeight();
    if (w === width && Math.abs(h - height) < 2) return;
    const grew = w === width && h > height;
    width = w;
    height = h;
    if (!$('nextBtn').hidden) return;
    if (grew && window.scrollY > 4) return;
    clearTimeout(timer);
    timer = setTimeout(fitBattle, 80);
  };
  window.addEventListener('resize', again);
  window.addEventListener('orientationchange', again);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', again);
}
