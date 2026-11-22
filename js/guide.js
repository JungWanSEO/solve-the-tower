// 강조 안내. 화면을 어둡게 가리고, 알려 주려는 곳만 밝게 남긴 뒤 화살표 달린 말풍선을 붙입니다.
// 화면 크기가 달라도 어긋나지 않도록, 강조할 요소의 실제 위치를 매 순간 다시 잽니다.
//
//   showGuide({ target: ['선택자', …], text: '말풍선 글', mode: 'tap' | 'next', step, total, onNext, onSkip })
//   hideGuide()
import { t } from './i18n.js';
import { $ } from './ui.js';

let now = null;      // 지금 보여 주는 안내
let lastBox = '';    // 마지막으로 그린 위치 (같으면 다시 그리지 않습니다)
let ticking = false;

// 강조할 요소들을 모두 감싸는 네모. 화면에 보이는 요소가 없으면 null.
function boxOf(selectors) {
  const rects = selectors.flatMap((sel) => [...document.querySelectorAll(sel)])
    .filter((el) => !el.closest('[hidden]'))
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0);
  if (!rects.length) return null;
  const pad = 6;
  const left = Math.max(4, Math.min(...rects.map((r) => r.left)) - pad);
  const top = Math.max(4, Math.min(...rects.map((r) => r.top)) - pad);
  const right = Math.min(window.innerWidth - 4, Math.max(...rects.map((r) => r.right)) + pad);
  const bottom = Math.min(window.innerHeight - 4, Math.max(...rects.map((r) => r.bottom)) + pad);
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

const place = (el, left, top, width, height) => {
  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(top)}px`;
  el.style.width = `${Math.max(0, Math.round(width))}px`;
  el.style.height = `${Math.max(0, Math.round(height))}px`;
};

function draw() {
  if (!now) return;
  const root = $('guide');
  const box = boxOf(now.target);
  // 강조할 곳이 아직 화면에 없으면(화면이 바뀌는 중) 잠시 숨깁니다.
  root.classList.toggle('waiting', !box);
  if (!box) {
    lastBox = '';
    return;
  }
  const W = window.innerWidth;
  const H = window.innerHeight;
  const key = [box.left, box.top, box.width, box.height, W, H, now.text, now.mode].join('|');
  if (key === lastBox) return;
  lastBox = key;

  // 어두운 가림막 네 장: 강조한 곳만 빼고 덮습니다. (가림막은 눌러도 아무 일도 일어나지 않습니다)
  place($('guideTop'), 0, 0, W, box.top);
  place($('guideBottom'), 0, box.bottom, W, H - box.bottom);
  place($('guideLeft'), 0, box.top, box.left, box.height);
  place($('guideRight'), box.right, box.top, W - box.right, box.height);
  place($('guideRing'), box.left, box.top, box.width, box.height);
  // "다음" 으로 넘기는 안내에서는 강조한 곳도 누르지 못하게 투명한 막을 덮습니다.
  place($('guideBlock'), box.left, box.top, box.width, box.height);
  $('guideBlock').hidden = now.mode !== 'next';

  // 말풍선: 강조한 곳 아래에 두고, 자리가 없으면 위에 둡니다.
  const bubble = $('guideBubble');
  const width = Math.min(330, W - 24);
  bubble.style.width = `${width}px`;
  const left = Math.min(W - width - 12, Math.max(12, box.left + box.width / 2 - width / 2));
  bubble.style.left = `${Math.round(left)}px`;
  const height = bubble.getBoundingClientRect().height;
  const below = box.bottom + 14 + height <= H - 8;
  const above = box.top - 14 - height >= 8;
  const under = below || !above;
  bubble.classList.toggle('under', under);
  bubble.style.top = `${Math.round(under ? Math.min(H - height - 8, box.bottom + 14) : box.top - 14 - height)}px`;
  // 화살표는 강조한 곳의 가운데를 가리킵니다.
  const arrowX = Math.min(width - 28, Math.max(16, box.left + box.width / 2 - left - 8));
  $('guideArrow').style.left = `${Math.round(arrowX)}px`;
}

function tick() {
  if (!now) {
    ticking = false;
    return;
  }
  draw();
  requestAnimationFrame(tick);
}

export function showGuide(spec) {
  const same = now && now.text === spec.text && now.mode === spec.mode && now.target.join() === spec.target.join();
  now = spec;
  $('guide').hidden = false;
  $('guideText').textContent = t(spec.text);
  $('guideStep').textContent = spec.step ? `${spec.step} / ${spec.total}` : '';
  $('guideNext').hidden = spec.mode !== 'next';
  $('guideNext').textContent = t('tut.next');
  $('guideSkip').textContent = t('tut.skip');
  $('guideNext').onclick = () => spec.onNext && spec.onNext();
  $('guideSkip').onclick = () => spec.onSkip && spec.onSkip();
  if (!same) lastBox = '';
  draw();
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(tick);
  }
}

export function hideGuide() {
  now = null;
  lastBox = '';
  $('guide').hidden = true;
}
