// 갈림길 지도 화면. 탑의 안쪽을 아래에서 위로 올라갑니다. 보스가 맨 위, 입구가 맨 아래입니다.
// 칸은 그림이 든 둥근 버튼, 길은 굽은 선으로 그립니다. 길이 이어진 칸으로만 갈 수 있습니다.
// 칸을 누르면 내 말이 길을 따라 움직인 뒤에 그 칸으로 들어갑니다.
import { CONFIG } from './config.js';
import { t } from './i18n.js';
import { available, nodeOf } from './run.js';
import { $ } from './ui.js';

const ROW = 78;   // 한 층의 높이(px)
const GATE = 64;  // 맨 아래 입구가 차지하는 높이(px)
const MOVE = 340; // 말이 움직이는 시간(ms)
const SVG = 'http://www.w3.org/2000/svg';
const LEGEND = ['battle', 'elite', 'event', 'treasure', 'shop', 'rest', 'midboss', 'boss'];
const BIG = ['midboss', 'boss'];

// 칸 그림 (24×24, 선으로만 그린 자체 제작 아이콘)
const ICONS = {
  battle: '<path d="M5 4l10 10M4 5l1-1M13 16l3-3M15 15l4 4"/><path d="M19 4L9 14M20 5l-1-1M11 16l-3-3M9 15l-4 4"/>',
  elite: '<path d="M6 9C4 7 4 4 5 3c1 3 3 4 5 4M18 9c2-2 2-5 1-6-1 3-3 4-5 4"/><path d="M6 12a6 6 0 0112 0c0 3-1 4-2 5v3H8v-3c-1-1-2-2-2-5z"/><path d="M9.5 13.5h.01M14.5 13.5h.01M11 20v-2M13 20v-2"/>',
  event: '<path d="M8.5 9a3.5 3.5 0 117 0c0 2.5-3.5 2.5-3.5 5.5"/><path d="M12 18.5h.01"/>',
  treasure: '<path d="M4 11V8a4 4 0 014-4h8a4 4 0 014 4v3"/><path d="M3 11h18v8H3z"/><path d="M12 11v2.5M10.5 15h3"/>',
  shop: '<path d="M9 4h6l-1.5 3h-3z"/><path d="M10.5 7C7 9 5 12 5 15.5 5 18.5 7.5 20 12 20s7-1.5 7-4.5C19 12 17 9 13.5 7"/><path d="M12 11v5M10.3 12.3h2.7a1 1 0 010 2h-2a1 1 0 000 2h2.7"/>',
  rest: '<path d="M12 3c1 3 4 4.5 4 8a4 4 0 01-8 0c0-1.5.6-2.5 1.5-3.5.3 1.2 1 1.8 1.6 2C11 7.5 10.8 5 12 3z"/><path d="M5 20l14-3M5 17l14 3"/>',
  midboss: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9.5 11h.01M14.5 11h.01M9.5 15c1.5-1 3.5-1 5 0"/>',
  boss: '<path d="M4 8l4 4 4-7 4 7 4-4-1.5 10h-13z"/><path d="M6.5 21h11"/>',
  gate: '<path d="M5 21V11a7 7 0 0114 0v10"/><path d="M3 21h18M12 8v13"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

// 칸마다 정해진 만큼만 자리를 살짝 흩어서, 바둑판처럼 보이지 않게 합니다. (같은 칸은 늘 같은 자리)
function wobble(id, salt) {
  let h = salt;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return (h % 200) / 100 - 1; // -1 ~ 1
}

// 움직임을 줄이도록 설정한 기기에서는 말의 이동을 생략합니다.
const still = () => document.body.classList.contains('calm') || !window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createMap({ getRun, onPick, getWins = () => 0 }) {
  let moving = false;
  $('mapLegendBox').addEventListener('click', (event) => {
    if (event.target.tagName === 'SUMMARY') $('mapLegendBox').dataset.touched = '1';
  });

  function render() {
    moving = false;
    const run = getRun();
    const height = run.floors * ROW + GATE;
    const big = (n) => BIG.includes(n.type);
    const x = (n) => (big(n) ? 50 : 10 + ((n.col + 0.5) / CONFIG.map.width) * 82 + wobble(n.id, 7) * 2); // 가로 위치(%)
    const y = (n) => (run.floors - 1 - n.floor) * ROW + ROW / 2 + (big(n) ? 0 : wobble(n.id, 13) * 6);   // 세로 위치(px)
    const gate = { x: 50, y: height - GATE / 2 + 4 };
    const open = new Set(available(run));
    const visited = new Set(run.visited);

    const here = run.at === null ? null : nodeOf(run, run.at);
    const floor = here ? here.floor + 1 : 0;
    $('mapProgress').textContent = t('map.progress', { n: floor, total: run.floors });
    $('mapBar').style.width = `${(floor / run.floors) * 100}%`;

    const box = $('mapRows');
    box.innerHTML = '';
    box.style.height = `${height}px`;

    // 층 표시: 얇은 바닥 선과 층 번호. 중간 보스와 보스의 층은 따로 물들입니다.
    const special = {};
    for (const n of run.nodes) if (big(n)) special[n.floor] = n.type;
    for (let f = 0; f < run.floors; f++) {
      const band = document.createElement('div');
      band.className = `map-floor ${special[f] ? `is-${special[f]}` : ''}`;
      band.style.top = `${(run.floors - 1 - f) * ROW}px`;
      band.style.height = `${ROW}px`;
      const num = document.createElement('span');
      num.textContent = `${f + 1}F`;
      band.appendChild(num);
      box.appendChild(band);
    }

    // 길: 위아래로 부드럽게 굽은 선
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('class', 'map-lines');
    svg.setAttribute('viewBox', `0 0 100 ${height}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    const draw = (x1, y1, x2, y2, cls) => {
      const path = document.createElementNS(SVG, 'path');
      const mid = (y1 + y2) / 2;
      path.setAttribute('d', `M${x1} ${y1} C${x1} ${mid} ${x2} ${mid} ${x2} ${y2}`);
      path.setAttribute('class', cls);
      svg.appendChild(path);
    };
    const first = run.nodes.filter((n) => n.floor === 0);
    for (const n of first) {
      const cls = visited.has(n.id) ? 'path walked' : run.at === null ? 'path open' : 'path';
      draw(gate.x, gate.y, x(n), y(n), cls);
    }
    for (const n of run.nodes) {
      for (const id of n.next) {
        const to = nodeOf(run, id);
        let cls = 'path';
        if (visited.has(n.id) && visited.has(id)) cls += ' walked';
        else if (n.id === run.at && open.has(id)) cls += ' open';
        draw(x(n), y(n), x(to), y(to), cls);
      }
    }
    box.appendChild(svg);

    // 입구
    const door = document.createElement('div');
    door.className = 'map-gate';
    door.style.left = `${gate.x}%`;
    door.style.top = `${gate.y}px`;
    door.innerHTML = `${icon('gate')}<small></small>`;
    door.lastChild.textContent = t('map.gate');
    box.appendChild(door);

    // 내 말: 지금 있는 칸(아직 출발 전이면 입구) 위에 서 있습니다.
    const token = document.createElement('div');
    token.className = 'map-token';
    const at = here ? { x: x(here), y: y(here) } : gate;
    token.style.left = `${at.x}%`;
    token.style.top = `${at.y}px`;

    // 칸
    let focus = null;
    for (const n of run.nodes) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `node type-${n.type}`;
      btn.innerHTML = `${icon(n.type)}<small></small>`;
      btn.lastChild.textContent = t(`node.${n.type}`);
      btn.setAttribute('aria-label', `${n.floor + 1}F ${t(`node.${n.type}`)}`);
      btn.style.left = `${x(n)}%`;
      btn.style.top = `${y(n)}px`;
      if (visited.has(n.id)) btn.classList.add('done');
      if (n.id === run.at) btn.classList.add('here');
      if (open.has(n.id)) {
        btn.classList.add('open');
        btn.addEventListener('click', () => {
          if (moving) return;
          if (still()) {
            onPick(n);
            return;
          }
          // 말이 길을 따라 그 칸으로 간 뒤에 들어갑니다.
          moving = true;
          btn.classList.add('picked');
          token.classList.add('walking');
          token.style.left = `${x(n)}%`;
          token.style.top = `${y(n)}px`;
          setTimeout(() => {
            if (moving) onPick(n);
          }, MOVE);
        });
        if (!focus) focus = btn;
      } else {
        btn.disabled = true;
      }
      box.appendChild(btn);
    }
    box.appendChild(token);

    // 칸 종류 설명
    const legend = $('mapLegend');
    legend.innerHTML = '';
    for (const type of LEGEND) {
      const row = document.createElement('div');
      const mark = document.createElement('span');
      mark.className = `dot type-${type}`;
      mark.innerHTML = icon(type);
      const name = document.createElement('b');
      name.textContent = t(`node.${type}`);
      const sub = document.createElement('small');
      sub.textContent = t(`node.${type}Sub`);
      row.append(mark, name, sub);
      legend.appendChild(row);
    }

    // 칸 설명은 처음 몇 판 동안만 펼쳐 두고, 그 뒤로는 접어 둡니다. (직접 여닫은 뒤에는 그대로 둡니다)
    const fold = $('mapLegendBox');
    if (!fold.dataset.touched) fold.open = getRun().floors > 0 && (getWins() < 3);
    const look = focus || door;
    if (look.scrollIntoView) look.scrollIntoView({ block: 'center' });
  }

  return { render };
}
