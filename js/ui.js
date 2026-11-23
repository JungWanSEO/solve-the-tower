// 화면 전환에 쓰는 작은 도구.
export const $ = (id) => document.getElementById(id);

const SCREENS = ['screenTitle', 'screenScope', 'screenMap', 'screenBattle', 'screenEvent', 'screenCodex', 'screenData'];

// 화면 하나만 보이게 합니다.
export function show(id) {
  for (const name of SCREENS) {
    const el = $(name);
    if (el) el.hidden = name !== id;
  }
}

// 글이 두 줄인 버튼을 만듭니다. (큰 글 + 작은 설명)
export function twoLineButton(title, sub) {
  const btn = document.createElement('button');
  btn.type = 'button';
  const b = document.createElement('b');
  b.textContent = title;
  btn.appendChild(b);
  if (sub) {
    const small = document.createElement('small');
    small.textContent = sub;
    btn.appendChild(small);
  }
  return btn;
}

// 잠깐 떴다 사라지는 알림. ico 에는 그림(SVG 글)을 넣을 수 있습니다. 예: "단단한 줄자 획득"
let toastTimer = 0;
export function toast(text, ico = '') {
  const box = $('toast');
  if (!box) return;
  box.innerHTML = ico ? `<i>${ico}</i>` : '';
  const span = document.createElement('span');
  span.textContent = text;
  box.appendChild(span);
  box.hidden = false;
  box.classList.remove('show');
  void box.offsetWidth;
  box.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { box.hidden = true; }, 2200);
}

// 색종이가 쏟아지는 축하 연출 (탑 클리어 때)
export function celebrate(count = 70) {
  if (document.body.classList.contains('calm') || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  const layer = document.createElement('div');
  layer.className = 'confetti';
  const colors = ['#2fd9b9', '#ffc857', '#ff7d8f', '#8fb4ff', '#c9a0ff', '#eef6ff'];
  for (let i = 0; i < count; i++) {
    const bit = document.createElement('i');
    bit.style.left = `${Math.random() * 100}%`;
    bit.style.background = colors[i % colors.length];
    bit.style.animationDuration = `${2 + Math.random() * 1.8}s`;
    bit.style.animationDelay = `${Math.random() * 0.9}s`;
    bit.style.setProperty('--drift', `${(Math.random() - 0.5) * 120}px`);
    bit.style.setProperty('--spin', `${(Math.random() - 0.5) * 1400}deg`);
    if (i % 3 === 0) bit.style.borderRadius = '50%';
    layer.appendChild(bit);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 5000);
}

// 유물의 효과 글을 넣습니다. 불이익이 있는 유물은 둘째 줄이 "▼" 로 시작하는데, 그 줄만 다른 색으로 보이게 나눠 넣습니다.
export function fillRelicText(el, text) {
  const [good, ...bad] = String(text).split('\n');
  el.textContent = good;
  for (const line of bad) {
    const down = document.createElement('span');
    down.className = 'relic-down';
    down.textContent = line;
    el.append(document.createElement('br'), down);
  }
}
