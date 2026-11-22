// 화면 크기에 맞추기. 스마트폰마다 화면 높이가 다르고, 브라우저의 주소 줄 때문에 실제로 보이는 높이는 더 작습니다.
// 전투 화면에서 "지금 눌러야 하는 것"이 스크롤 없이 보이도록, 덜 중요한 것부터 차례로 줄입니다.
//   1) 싸우는 그림의 높이(보기 좋은 높이까지)  2) 여백(tight)  3) 문제 그림의 크기(모자란 만큼만)  4) 글자 크기(tighter)
//   5) 싸우는 그림의 높이(최소 높이까지)  — 화면에 여유가 있으면 싸우는 그림은 줄이지 않습니다.
import { $ } from './ui.js';

const viewHeight = () => (window.visualViewport ? window.visualViewport.height : window.innerHeight);

export function fitBattle() {
  const screen = $('screenBattle');
  const canvas = $('stage');
  if (!screen || screen.hidden) return;
  const figure = document.querySelector('#qFigure svg');
  canvas.style.height = '';
  if (figure) figure.style.maxWidth = '';
  screen.classList.remove('tight', 'tighter');

  const answering = screen.classList.contains('answering');
  // 지금 꼭 보여야 하는 마지막 요소: 틀린 문제 확인 중이면 "다음" 버튼, 문제를 푸는 중이면 답 버튼, 아니면 맨 아래 안내 글
  const target = !$('nextBtn').hidden ? $('nextBtn') : answering ? $('answers') : $('notice'); // 행동을 고를 때는 아래의 안내 글까지
  const over = () => Math.ceil(target.getBoundingClientRect().bottom + window.scrollY + 10 - viewHeight());

  // 싸우는 그림은 게임의 얼굴이라 되도록 크게 남깁니다. 그래서 두 번에 나누어 줄입니다.
  //   먼저 "보기 좋은 높이"까지만 줄이고 → 여백·문제 그림·글자를 줄인 뒤 → 그래도 모자라면 "최소 높이"까지 줄입니다.
  const natural = canvas.getBoundingClientRect().height;
  const good = answering ? 132 : 96; // 보기 좋은 높이
  const least = answering ? 84 : 96; // 최소 높이 (캐릭터와 적의 얼굴이 보이는 높이)
  const shrink = (floor) => {
    const now = canvas.getBoundingClientRect().height;
    const cut = Math.min(over(), Math.max(0, now - floor));
    if (cut > 0) canvas.style.height = `${Math.round(now - cut)}px`;
    return over() <= 0;
  };

  if (over() <= 0) return;
  if (shrink(Math.min(natural, good))) return;
  screen.classList.add('tight');
  if (over() <= 0) return;
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
  if (shrink(least)) return;
  if (answering && shrink(60)) return; // 조금만 더 줄이면 들어가는 경우
  // 아주 작은 화면: 답 버튼이 가려지는 것보다는 싸우는 그림을 접는 편이 낫습니다.
  if (answering && over() > 24) canvas.style.height = '0px';
}

// 화면이 돌아가거나 주소 줄이 접히고 펴질 때 다시 맞춥니다.
export function watchFit() {
  let timer = 0;
  const again = () => {
    clearTimeout(timer);
    timer = setTimeout(fitBattle, 60);
  };
  window.addEventListener('resize', again);
  window.addEventListener('orientationchange', again);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', again);
}
