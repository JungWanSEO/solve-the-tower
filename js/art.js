// 그림 모음. 모두 이 게임을 위해 직접 그린 SVG 입니다. (바깥 그림 파일을 쓰지 않습니다)
//   ICON   작은 선 그림 (버튼, 상점 물건)        icon('sword')
//   scene  화면 위쪽에 놓는 장면 그림             scene('shop')
// 색은 전투 화면(js/stage.js)의 주인공과 맞춥니다.

const ICON = {
  // 전투 행동
  sword: '<path d="M14.5 3.5H20v5.5L9.5 19.5 4.5 14.5z"/><path d="M4 20l3-3M3 13l8 8"/>',
  spark: '<path d="M12 2l2.2 6.3L20.5 10.5l-6.3 2.2L12 19l-2.2-6.3L3.5 10.5l6.3-2.2z"/><path d="M19 16v4M17 18h4"/>',
  shield: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
  chain: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
  star: '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/>',
  warn: '<path d="M12 3l10 17H2z"/><path d="M12 10v4M12 17h.01"/>',
  // 처음 화면
  book: '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 21a2 2 0 002 2h13v-4M9 8h6"/>',
  replay: '<path d="M4 12a8 8 0 108-8H7"/><path d="M10 1L7 4l3 3"/>',
  box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>',
  // 강화와 상점 물건
  heal: '<path d="M9 3h6M10 3v5l-4.5 8A3 3 0 008 20.5h8a3 3 0 002.5-4.5L14 8V3"/><path d="M7.5 14h9"/>',
  hint: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 00-3.5 10.9V15h7v-1.1A6 6 0 0012 3z"/>',
  basic: '<path d="M14.5 3.5H20v5.5L9.5 19.5 4.5 14.5z"/><path d="M4 20l3-3M3 13l8 8"/>',
  skill: '<path d="M12 2l2.2 6.3L20.5 10.5l-6.3 2.2L12 19l-2.2-6.3L3.5 10.5l6.3-2.2z"/>',
  maxhp: '<path d="M12 20.5S3.5 15.5 3.5 9.3A4.3 4.3 0 0112 7a4.3 4.3 0 018.5 2.3c0 6.2-8.5 11.2-8.5 11.2z"/><path d="M12 10.5v5M9.5 13h5"/>',
  counter: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M14.5 9l-5 5M9.5 9.5V14H14"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M14.5 9.5h-3.7a1.7 1.7 0 000 3.4h2.4a1.7 1.7 0 010 3.4H9.5"/>',
  weak: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4"/>',
  news: '<path d="M4 10v4h3l7 4V6l-7 4z"/><path d="M17.5 9.5a3.5 3.5 0 010 5M8 14v4.5h2.5"/>',
  key: '<circle cx="8" cy="8" r="4.5"/><path d="M11.2 11.2L20 20M16 16l2.5-2.5M18.5 18.5L21 16"/>',
  // 유물 (학용품). 이름은 'r-' + 유물 id (js/relics.js)
  'r-pencil': '<path d="M4 20l1-5L16 4l4 4L9 19z"/><path d="M14 6l4 4M5 15l4 4"/>',
  'r-eraser': '<path d="M8 19l-4.5-4.5a1.5 1.5 0 010-2.1L12 4a1.5 1.5 0 012.1 0l5.4 5.4a1.5 1.5 0 010 2.1L12 19z"/><path d="M8 8.5l7.5 7.5M8 19h12"/>',
  'r-grid': '<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16"/>',
  'r-snack': '<path d="M8 8c-3 2.5-4.5 5.5-4.5 8.5a4 4 0 004 4h9a4 4 0 004-4c0-3-1.5-6-4.5-8.5z"/><path d="M8 8h8M9 4.5L10.5 8M15 4.5L13.5 8M12 3.5V8"/>',
  'r-piggy': '<path d="M4 12.5a7 5.5 0 0114 0v.5h2v3h-2.3a7 5.5 0 01-1.7 1.8V20h-3v-1.2a8 8 0 01-3 0V20H7v-1.9a5.6 5.6 0 01-3-5.6z"/><path d="M9.5 8.3H13M15.5 12h.01"/>',
  'r-note': '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h7M9 16h5"/>',
  'r-setsquare': '<path d="M4 20V5l15 15z"/><path d="M7.5 16.5v-4l4 4z"/>',
  'r-bottle': '<path d="M10 2.5h4v3l2 2.5V20a1.5 1.5 0 01-1.5 1.5h-5A1.5 1.5 0 018 20V8l2-2.5z"/><path d="M8 12h8M8 16h8"/>',
  'r-bookmark': '<path d="M7 3h10v18l-5-4-5 4z"/><path d="M10 8h4"/>',
  'r-notebook': '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v18M12.500 8h3.500M12.500 12h3.500"/>',
  'r-dogear': '<path d="M5 4h14v11l-5 5H5z"/><path d="M19 15h-5v5M8.500 9h7M8.500 13h4"/>',
  'r-kneepad': '<path d="M7 4h10v5a5 5 0 010 6v5H7v-5a5 5 0 010-6z"/><circle cx="12" cy="12" r="2.500"/>',
  'r-sneakers': '<path d="M3 17v-6l4 1 3-4 4 5 5 1.500a2.500 2.500 0 012 2.500v1H3z"/><path d="M3 15h18M10.500 9.500l1.500 1M12.500 12l1.500 1"/>',
  'r-stopwatch': '<circle cx="12" cy="14" r="7"/><path d="M12 14V10M10 3h4M12 3v4M18 8l1.500-1.500"/>',
  'r-flashmemo': '<path d="M5 3h14v18H5z"/><path d="M13 7l-3 5h4l-3 5"/>',
  'r-ribbon': '<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5L7 21l5-2.5 5 2.5-1.5-7.5"/>',
  'r-redpen': '<path d="M9 3h6v11l-3 5-3-5z"/><path d="M9 7h6M12 19v2.5"/>',
  'r-wrongnote': '<path d="M6 3h12a1 1 0 011 1v16a1 1 0 01-1 1H6z"/><path d="M4 7h3M4 12h3M4 17h3M10.5 9.5l5 5M15.5 9.5l-5 5"/>',
  'r-alarm': '<circle cx="12" cy="13" r="7"/><path d="M12 9.5V13l2.5 1.5M5 4.5L2.5 7M19 4.5L21.5 7M7 19l-1.5 2M17 19l1.5 2"/>',
  'r-highlighter': '<path d="M14 3l7 7-8.5 8.5H8l-2.5-2.5V11.5z"/><path d="M5.5 16L3 20.5h5M10 7.5l6.5 6.5"/>',
  'r-library': '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M6.5 10h5M6.5 13.5H10M15 9.5h3v5h-3z"/>',
  'r-bandage': '<path d="M3.8 14.8l11-11a3.8 3.8 0 015.4 5.4l-11 11a3.8 3.8 0 01-5.4-5.4z"/><path d="M8.5 10l5.5 5.5M11 11.5h.01M12.5 13h.01"/>',
  'r-chainbelt': '<path d="M3 9h18v6H3z"/><rect x="9" y="7" width="6" height="10" rx="1"/><path d="M12 10.5v3"/>',
  'r-ruler': '<path d="M3 15.5L15.5 3 21 8.5 8.5 21z"/><path d="M7 12l1.5 1.5M10 9l1.5 1.5M13 6l1.5 1.5M12.5 17l1-3 2.5 1 .5-3.5"/>',
  'r-workbook': '<path d="M5 4h12a2 2 0 012 2v14H7a2 2 0 01-2-2z"/><path d="M5 18a2 2 0 012-2h12M9 8h6M9 11.5h4"/>',
  'r-bag': '<path d="M6 9h12a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8a2 2 0 012-2z"/><path d="M9 9V6.5a3 3 0 016 0V9M9 14h6v3H9z"/>',
};

export function icon(name) {
  const body = ICON[name] || ICON.star;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

// ---- 장면 그림 (360 × 130, 땅은 y = 108) ----
const SKY = '#14224a';
const FAR = '#1b2d5c';
const GROUND = '#0f1a3a';
const TEAL = '#2fd9b9';
const AMBER = '#ffc857';
const ROSE = '#ff7d8f';

const STARS = [[22, 18], [64, 34], [108, 12], [150, 30], [196, 16], [238, 38], [282, 14], [322, 30], [344, 58], [14, 60], [176, 52], [262, 62]];
const stars = (dim = 1) => STARS.map(([x, y], i) => `<rect class="tw tw${i % 3}" x="${x}" y="${y}" width="${i % 2 ? 2 : 1.5}" height="${i % 2 ? 2 : 1.5}" fill="#a7ddff" opacity="${0.7 * dim}"/>`).join('');

// 주인공 (발 밑이 x, y). 모습(js/heroes.js)마다 다르게 그립니다.
//   starter 다시 시작한 아이: 초록 옷, 주황 모자, 지팡이 · grit 끈기 대장: 남색 옷, 붉은 머리띠, 삼각자 방패 · flash 암산 번개: 보라 옷, 노란 목도리, 번개 분필
let heroLook = 'starter';
export function setHeroLook(look) {
  heroLook = look || 'starter';
}
export const currentHeroLook = () => heroLook;
function heroBody(look, { down = false, cheer = false } = {}) {
  const robe = { starter: '#2bbf9f', grit: '#3b5bbd', flash: '#8a63d2' }[look] || '#2bbf9f';
  const head = look === 'grit'
    ? `<path d="M-9.5-41a9.5 9.5 0 0119 0z" fill="#3a2a1c"/><rect x="-10" y="-46" width="20" height="4" rx="1.5" fill="#e5484d"/><path d="M-9-45l-9-4 2 7z" fill="#e5484d"/>`
    : look === 'flash'
      ? `<path d="M-10-41l-4-10 8 4 1-8 6 6 4-8 3 9 6-3-3 10z" fill="#5a3fa0"/>`
      : `<path d="M-14-45L0-64 14-45z" fill="#f2a03d"/><rect x="-16" y="-46" width="32" height="4" rx="2" fill="#f2a03d"/>`;
  const held = look === 'grit'
    ? `<path d="M15-26V0h19z" fill="#ffe9b0" stroke="#f2a13b" stroke-width="1.5" stroke-linejoin="round"/>`
    : look === 'flash'
      ? `<path d="M24-${cheer ? 62 : 34}l-8 15h6l-5 14 13-18h-7l5-11z" fill="#ffe27a" stroke="#f2a13b" stroke-width="1" stroke-linejoin="round"/>`
      : cheer
        ? `<path d="M16-18L24-66" stroke="${AMBER}" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="-68" r="4.5" fill="${AMBER}"/>`
        : `<path d="M-19 0V-52" stroke="${AMBER}" stroke-width="3" stroke-linecap="round"/><circle cx="-19" cy="-55" r="4" fill="${AMBER}"/>`;
  return `<path d="M-13 0L0-34 13 0z" fill="${robe}"/>` +
    `<path d="M-4-12L0-22 4-12z" fill="${look === 'flash' ? '#ffe27a' : '#eafff9'}"/>` +
    (look === 'flash' ? `<rect x="-8" y="-33" width="16" height="4" rx="2" fill="#ffd24a"/><path d="M-7-31l-12 3 2 5z" fill="#ffd24a"/>` : '') +
    `<circle cx="0" cy="-39" r="9" fill="#ffd9a8"/>` + head +
    `<circle cx="-3" cy="-39" r="1.3" fill="#3a2f10"/><circle cx="3" cy="-39" r="1.3" fill="#3a2f10"/>` +
    (down ? '' : `<path d="M-3-35q3 2.5 6 0" stroke="#3a2f10" stroke-width="1.2" fill="none" stroke-linecap="round"/>`) + held;
}
function hero(x, y, { down = false, cheer = false } = {}) {
  const turn = down ? ' rotate(90)' : '';
  return `<ellipse cx="${x + (down ? 26 : 0)}" cy="${y + 2}" rx="${down ? 40 : 17}" ry="3.5" fill="#0b1430"/><g transform="translate(${x} ${y - (down ? 13 : 0)})${turn}">${heroBody(heroLook, { down, cheer })}</g>`;
}
// 모습 하나의 초상 (고르는 화면과 "새 모습을 얻었습니다" 창). dim: 아직 얻지 못한 모습은 그림자로
export function heroPortrait(look, dim = false) {
  return `<svg viewBox="-34 -72 68 78" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"${dim ? ' style="filter:brightness(0) opacity(0.45)"' : ''}>` +
    `<ellipse cx="0" cy="2" rx="18" ry="3.5" fill="#0b1430"/>${heroBody(look)}</svg>`;
}

const frame = (inner, tone = SKY) =>
  `<svg viewBox="0 0 360 130" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true">` +
  `<rect width="360" height="130" fill="${tone}"/>${inner}</svg>`;
const ground = (color = GROUND) => `<rect y="108" width="360" height="22" fill="${color}"/>`;
const hills = `<path d="M0 108V84l34-14 40 20 46-26 40 22 44-18 52 24 44-20 60 18v18z" fill="${FAR}"/>`;
// 은은한 빛: 크기가 다른 원 셋을 옅게 겹칩니다.
const glow = (x, y, r, color, o = 0.35) => [1, 0.72, 0.45].map((k) => `<circle cx="${x}" cy="${y}" r="${Math.round(r * k)}" fill="${color}" opacity="${(o * 0.45).toFixed(3)}"/>`).join('');
const coin = (x, y, r = 5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${AMBER}"/><circle cx="${x}" cy="${y}" r="${r - 2}" fill="none" stroke="#b8862a" stroke-width="1"/>`;

const SCENES = {
  // 상점: 줄무늬 차양 아래 물약과 두루마리
  shop: () => frame(
    stars() + hills + ground() +
    `<rect x="196" y="58" width="6" height="50" fill="#6b4a2a"/><rect x="300" y="58" width="6" height="50" fill="#6b4a2a"/>` +
    `<rect x="190" y="82" width="122" height="26" rx="3" fill="#7a5632"/><rect x="190" y="82" width="122" height="5" fill="#96703f"/>` +
    [0, 1, 2, 3, 4, 5].map((i) => `<path d="M${186 + i * 22} 40h22v14q-11 9-22 0z" fill="${i % 2 ? '#eef6ff' : ROSE}"/>`).join('') +
    `<rect x="184" y="36" width="134" height="6" rx="3" fill="#c95a6c"/>` +
    // 물약, 두루마리, 하트
    `<path d="M214 66h8v5l5 8a3 3 0 01-3 4h-12a3 3 0 01-3-4l5-8z" fill="#4ad0b4"/><rect x="213" y="63" width="10" height="4" rx="1" fill="#eef6ff"/>` +
    `<rect x="240" y="68" width="22" height="13" rx="3" fill="#f3e3b5"/><path d="M244 72h14M244 76h9" stroke="#a88a4a" stroke-width="1.5"/>` +
    `<path d="M286 81s-9-5-9-11a4.5 4.5 0 019-2 4.5 4.5 0 019 2c0 6-9 11-9 11z" fill="${ROSE}"/>` +
    coin(252, 96, 6) + `<path d="M252 93v6" stroke="#b8862a" stroke-width="1.5"/>` +
    hero(96, 108),
  ),
  // 휴식: 모닥불과 천막
  rest: () => frame(
    stars() + `<circle cx="300" cy="28" r="13" fill="#eef6ff"/><circle cx="306" cy="24" r="12" fill="${SKY}"/>` + hills + ground() +
    `<path d="M236 108l34-52 34 52z" fill="#35508f"/><path d="M270 56l-9 52h18z" fill="#0f1a3a"/><path d="M270 56l34 52" stroke="#4d6ab0" stroke-width="2"/>` +
    glow(178, 96, 34, '#ff9a3c', 0.18) + glow(178, 98, 20, '#ffb84a', 0.25) +
    `<path d="M160 108l36-7M160 101l36 7" stroke="#7a5632" stroke-width="5" stroke-linecap="round"/>` +
    `<path class="flame" d="M178 62c6 12 16 16 16 28a16 16 0 01-32 0c0-6 3-10 6-13 1 5 4 7 6 8-2-9-1-16 4-23z" fill="#ff9a3c"/>` +
    `<path class="flame" d="M178 78c3 6 8 8 8 14a8 8 0 01-16 0c0-4 2-6 4-8 .5 3 2 4 3 4-1-4 0-7 1-10z" fill="${AMBER}"/>` +
    hero(104, 108),
  ),
  // 보물: 빛나는 상자
  treasure: () => frame(
    stars() + hills + ground() +
    glow(236, 84, 46, AMBER, 0.14) + glow(236, 86, 28, AMBER, 0.2) +
    [[-42, -34], [-22, -48], [0, -54], [22, -48], [42, -34]].map(([dx, dy]) => `<path class="ray" d="M236 74l${dx} ${dy}" stroke="${AMBER}" stroke-width="2" stroke-linecap="round" opacity="0.6"/>`).join('') +
    `<rect x="204" y="80" width="64" height="28" rx="3" fill="#8a5a2c"/><path d="M204 80a32 20 0 0164 0z" fill="#a66d35"/>` +
    `<rect x="204" y="78" width="64" height="5" fill="${AMBER}"/><rect x="214" y="64" width="5" height="44" fill="${AMBER}" opacity="0.8"/><rect x="253" y="64" width="5" height="44" fill="${AMBER}" opacity="0.8"/>` +
    `<rect x="230" y="78" width="12" height="13" rx="2" fill="${AMBER}"/><circle cx="236" cy="84" r="2" fill="#6b4a2a"/>` +
    hero(104, 108),
  ),
  // 재도전 선물: 탑 입구의 등불과 선물 상자
  bless: () => frame(
    stars() + hills + ground() +
    `<path d="M214 108V44h44v64z" fill="#22336a"/><path d="M208 44h56l-6-10h-44z" fill="#2c4186"/><path d="M226 108V78a10 10 0 0120 0v30z" fill="#0f1a3a"/>` +
    `<path d="M186 108V54" stroke="#6b4a2a" stroke-width="4" stroke-linecap="round"/><path d="M186 56h-16v8" stroke="#6b4a2a" stroke-width="3" fill="none" stroke-linecap="round"/>` +
    glow(170, 74, 30, AMBER, 0.3) + `<rect class="tw tw0" x="163" y="64" width="14" height="18" rx="4" fill="${AMBER}"/><rect x="161" y="62" width="18" height="4" rx="2" fill="#6b4a2a"/>` +
    `<rect x="126" y="92" width="24" height="16" rx="2" fill="${ROSE}"/><rect x="124" y="88" width="28" height="6" rx="2" fill="#ff9db0"/><rect x="136" y="88" width="4" height="20" fill="#eef6ff"/>` +
    hero(86, 108),
  ),
  // 승리: 지팡이를 들고 기뻐함
  reward: () => frame(
    stars() + hills + ground() +
    glow(180, 60, 52, AMBER, 0.1) +
    [[120, 40], [150, 22], [214, 26], [244, 46], [132, 70], [232, 74]].map(([x, y], i) => `<path class="tw tw${i % 3}" d="M${x} ${y - 6}l1.8 4.2 4.2 1.8-4.2 1.8-1.8 4.2-1.8-4.2-4.2-1.8 4.2-1.8z" fill="${i % 2 ? TEAL : AMBER}"/>`).join('') +
    coin(226, 102) + coin(240, 104, 4) + coin(214, 104, 4) +
    hero(176, 108, { cheer: true }),
  ),
  // 패배: 쓰러진 주인공
  over: () => frame(
    stars(0.5) + `<path d="M0 108V84l34-14 40 20 46-26 40 22 44-18 52 24 44-20 60 18v18z" fill="#1a2444"/>` + ground('#0c1430') +
    `<path d="M262 108V48h36v60z" fill="#1f2c56"/><path d="M256 48h48l-6-10h-36z" fill="#1f2c56"/><rect x="274" y="62" width="12" height="16" rx="6" fill="#0c1430"/>` +
    `<path d="M96 36q14 10 0 22M110 30q16 14 0 32" stroke="#5c78b5" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.5"/>` +
    hero(170, 108, { down: true }),
    '#111b3c',
  ),
  // 클리어: 탑 꼭대기의 깃발
  clear: () => frame(
    stars() + glow(180, 70, 70, AMBER, 0.1) +
    `<path d="M120 130V84h120v46z" fill="#2a3c74"/><path d="M112 84h136v-8h-16v-10h-18v10h-22v-10h-24v10h-22v-10h-18v10h-16z" fill="#35508f"/>` +
    `<path d="M228 66V20" stroke="#eef6ff" stroke-width="3" stroke-linecap="round"/><path class="flag" d="M228 21l34 9-34 11z" fill="${TEAL}"/>` +
    [[56, 30], [84, 54], [300, 34], [318, 62], [40, 78], [286, 84]].map(([x, y], i) => `<path class="tw tw${i % 3}" d="M${x} ${y - 7}l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="${[AMBER, TEAL, ROSE][i % 3]}"/>`).join('') +
    hero(166, 76, { cheer: true }),
  ),
  // ? 칸의 사건들
  spring: () => frame(
    stars() + hills + ground() + glow(232, 86, 40, '#6fd6ff', 0.14) +
    `<ellipse cx="232" cy="102" rx="46" ry="9" fill="#35508f"/><ellipse cx="232" cy="100" rx="38" ry="6" fill="#6fd6ff"/>` +
    `<rect x="227" y="66" width="10" height="34" rx="2" fill="#4d6ab0"/><ellipse cx="232" cy="66" rx="16" ry="4" fill="#4d6ab0"/>` +
    `<path class="ray" d="M232 62q-20-22-26 34M232 62q20-22 26 34M232 60V46" stroke="#a7ecff" stroke-width="2.5" fill="none" stroke-linecap="round"/>` +
    hero(110, 108),
  ),
  fog: () => frame(
    stars(0.4) + `<path d="M0 108V84l34-14 40 20 46-26 40 22 44-18 52 24 44-20 60 18v18z" fill="#1a2748"/>` + ground() + hero(150, 108) +
    [[40, 52, 150], [190, 70, 170], [-10, 88, 180], [150, 98, 200], [220, 40, 120]].map(([x, y, w], i) => `<rect class="drift d${i % 2}" x="${x}" y="${y}" width="${w}" height="16" rx="8" fill="#a9c0e6" opacity="${0.16 + (i % 3) * 0.06}"/>`).join(''),
  ),
  purse: () => frame(
    stars() + hills + ground() + glow(226, 96, 30, AMBER, 0.16) +
    `<path d="M208 104c-6-12 2-24 10-28h16c8 4 16 16 10 28z" fill="#a66d35"/><path d="M216 76l-4-9h28l-4 9z" fill="#8a5a2c"/><path d="M214 77h24" stroke="${AMBER}" stroke-width="2.5" stroke-linecap="round"/>` +
    coin(252, 103) + coin(264, 105, 4) + coin(196, 105, 4) + coin(226, 92, 5) +
    hero(112, 108),
  ),
  thief: () => frame(
    stars() + hills + ground() +
    // 달아나는 그림자
    `<ellipse cx="252" cy="110" rx="18" ry="3.5" fill="#0b1430"/>` +
    `<g transform="translate(252 108) rotate(12)"><path d="M-12 0L0-32 12 0z" fill="#2a2f52"/><circle cx="0" cy="-37" r="9" fill="#3b4270"/><rect x="-9" y="-41" width="18" height="6" rx="3" fill="#12162e"/><circle cx="-3" cy="-38" r="1.4" fill="#eef6ff"/><circle cx="4" cy="-38" r="1.4" fill="#eef6ff"/>` +
    `<path d="M12-20c10-4 18 4 14 14-8 4-16 0-14-14z" fill="#a66d35"/></g>` +
    coin(214, 100, 4) + coin(200, 104, 3.5) +
    `<path d="M286 70h22M292 82h26M284 94h18" stroke="#5c78b5" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>` +
    hero(104, 108),
  ),
  note: () => frame(
    stars() + hills + ground() + glow(232, 74, 40, '#f3e3b5', 0.1) +
    `<g transform="rotate(-8 232 74)"><rect x="202" y="46" width="60" height="56" rx="4" fill="#f3e3b5"/><path d="M212 60h40M212 70h30M212 80h36M212 90h20" stroke="#a88a4a" stroke-width="2.5" stroke-linecap="round"/>` +
    `<path d="M244 88l5 5 9-11" stroke="#2bbf9f" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>` +
    hero(112, 108),
  ),
  statue: () => frame(
    stars() + hills + ground() + glow(236, 60, 34, '#c9a0ff', 0.14) +
    `<rect x="208" y="96" width="56" height="12" rx="2" fill="#4d5a80"/><rect x="216" y="88" width="40" height="9" fill="#5f6d96"/>` +
    `<path d="M220 88V58a16 16 0 0132 0v30z" fill="#7482ab"/><path d="M220 60l-8-12 12 4M252 60l8-12-12 4" fill="#7482ab"/>` +
    `<circle class="tw tw0" cx="230" cy="62" r="3" fill="#c9a0ff"/><circle class="tw tw0" cx="242" cy="62" r="3" fill="#c9a0ff"/><path d="M230 74h12" stroke="#3b4667" stroke-width="2.5" stroke-linecap="round"/>` +
    hero(112, 108),
  ),
  ambush: () => frame(
    stars() + hills + ground() +
    `<path d="M196 108c0-18 12-28 24-22 4-12 22-12 26 0 12-6 24 4 24 22z" fill="#1f3a4f"/><path d="M276 108c0-12 8-20 18-16 4-8 16-8 20 0 8-2 14 6 14 16z" fill="#1a3044"/>` +
    `<circle class="tw tw1" cx="222" cy="92" r="3.5" fill="${ROSE}"/><circle class="tw tw1" cx="238" cy="92" r="3.5" fill="${ROSE}"/><circle class="tw tw2" cx="298" cy="98" r="2.5" fill="${ROSE}"/><circle class="tw tw2" cx="308" cy="98" r="2.5" fill="${ROSE}"/>` +
    `<rect x="150" y="36" width="14" height="30" rx="5" fill="${AMBER}"/><circle cx="157" cy="76" r="6" fill="${AMBER}"/>` +
    hero(104, 108),
  ),
  // 낡은 칠판: 다리 달린 칠판과 분필 글씨
  board: () => frame(
    stars() + hills + ground() + glow(238, 66, 44, '#9fe3c8', 0.08) +
    `<path d="M206 108l8-18M270 108l-8-18" stroke="#6b4a2a" stroke-width="4" stroke-linecap="round"/>` +
    `<rect x="194" y="38" width="88" height="56" rx="3" fill="#7a5632"/><rect x="199" y="43" width="78" height="46" rx="2" fill="#1f4a3f"/>` +
    `<path d="M208 56h22M208 66h34M208 76h16" stroke="#e8f3ee" stroke-width="2" stroke-linecap="round" opacity="0.8"/>` +
    `<path class="tw tw0" d="M250 60q8-8 14 0t-6 12M258 80h.5" stroke="${AMBER}" stroke-width="2.5" fill="none" stroke-linecap="round"/>` +
    `<rect x="228" y="92" width="20" height="4" rx="1" fill="#96703f"/><rect x="232" y="89" width="9" height="3" rx="1" fill="#eef6ff"/>` +
    hero(112, 108),
  ),
  // 내기꾼: 작은 탁자에 주사위와 동전을 올려 둔 두건 쓴 사람
  bet: () => frame(
    stars() + hills + ground() + glow(226, 88, 30, AMBER, 0.12) +
    `<ellipse cx="270" cy="110" rx="18" ry="3.5" fill="#0b1430"/><path d="M256 108l14-36 14 36z" fill="#5a3d7a"/><circle cx="270" cy="66" r="10" fill="#f0c9a0"/>` +
    `<path d="M258 66a12 13 0 0124 0l-4-3h-16z" fill="#3f2a58"/><circle cx="266" cy="67" r="1.4" fill="#12162e"/><circle cx="273" cy="67" r="1.4" fill="#12162e"/><path d="M266 72q4 3 8 0" stroke="#12162e" stroke-width="1.3" fill="none" stroke-linecap="round"/>` +
    `<rect x="200" y="86" width="52" height="5" rx="2" fill="#96703f"/><path d="M208 91v17M244 91v17" stroke="#6b4a2a" stroke-width="4" stroke-linecap="round"/>` +
    `<rect class="tw tw1" x="208" y="74" width="12" height="12" rx="2.5" fill="#eef6ff"/><circle cx="211.500" cy="77.500" r="1.3" fill="#12162e"/><circle cx="216.500" cy="82.500" r="1.3" fill="#12162e"/>` +
    coin(234, 81, 5) + coin(243, 82, 4) +
    hero(112, 108),
  ),
  // 수련장: 과녁이 달린 허수아비 기둥
  dojo: () => frame(
    stars() + hills + ground() + glow(236, 70, 40, ROSE, 0.08) +
    `<rect x="232" y="50" width="8" height="58" rx="2" fill="#6b4a2a"/><rect x="206" y="62" width="60" height="7" rx="3" fill="#7a5632"/>` +
    `<rect x="222" y="60" width="28" height="32" rx="8" fill="#c9a660"/><path d="M226 68h20M226 76h20M226 84h20" stroke="#a88a4a" stroke-width="1.5"/>` +
    `<circle cx="236" cy="46" r="11" fill="#d9bb7a"/><circle cx="236" cy="76" r="8" fill="#eef6ff"/><circle cx="236" cy="76" r="5" fill="${ROSE}"/><circle class="tw tw0" cx="236" cy="76" r="2" fill="#eef6ff"/>` +
    `<path d="M286 108V70M286 70l10-6M286 82l-9-5" stroke="#4d6ab0" stroke-width="3" stroke-linecap="round" opacity="0.6"/>` +
    hero(120, 108),
  ),
  // 떠돌이 상인: 커다란 짐을 멘 사람과 등불
  peddler: () => frame(
    stars() + hills + ground() + glow(206, 80, 30, AMBER, 0.16) +
    `<ellipse cx="250" cy="110" rx="24" ry="3.5" fill="#0b1430"/>` +
    `<rect x="252" y="50" width="30" height="48" rx="8" fill="#7a5632"/><rect x="254" y="44" width="26" height="12" rx="5" fill="#f3e3b5"/><path d="M256 68h22M256 80h22" stroke="#96703f" stroke-width="2"/>` +
    `<path d="M232 108l14-38 14 38z" fill="#2f6f73"/><circle cx="246" cy="64" r="10" fill="#f0c9a0"/><path d="M233 60h26l-5-10h-16z" fill="#c9a660"/>` +
    `<circle cx="242" cy="65" r="1.4" fill="#12162e"/><circle cx="249" cy="65" r="1.4" fill="#12162e"/>` +
    `<path d="M236 84l-26-12" stroke="#6b4a2a" stroke-width="3" stroke-linecap="round"/><path d="M210 72v6" stroke="#6b4a2a" stroke-width="2"/><rect class="tw tw0" x="204" y="78" width="12" height="15" rx="4" fill="${AMBER}"/>` +
    hero(112, 108),
  ),
  // 잊힌 사물함: 한 칸만 문이 열려 빛이 새는 사물함
  locker: () => frame(
    stars() + hills + ground() + glow(238, 78, 34, '#6fd6ff', 0.1) +
    `<rect x="196" y="44" width="86" height="64" rx="3" fill="#4d5a80"/>` +
    [0, 1, 2].map((i) => `<rect x="${200 + i * 27}" y="48" width="24" height="56" rx="2" fill="${i === 1 ? '#0f1a3a' : '#5f6d96'}"/><path d="M${205 + i * 27} 55h14M${205 + i * 27} 60h14" stroke="#3b4667" stroke-width="1.5"/>`).join('') +
    `<rect class="tw tw0" x="231" y="70" width="16" height="16" rx="3" fill="#6fd6ff" opacity="0.85"/>` +
    `<path d="M251 48l14 6v52l-14-2z" fill="#7482ab"/><circle cx="262" cy="80" r="1.8" fill="#3b4667"/>` +
    hero(112, 108),
  ),
  // 쉬어 가는 벤치: 가로등 아래의 벤치
  bench: () => frame(
    stars() + `<circle cx="306" cy="30" r="12" fill="#eef6ff"/><circle cx="312" cy="26" r="11" fill="${SKY}"/>` + hills + ground() +
    `<path d="M282 108V46" stroke="#4d5a80" stroke-width="4" stroke-linecap="round"/><path d="M282 48h-14" stroke="#4d5a80" stroke-width="3" stroke-linecap="round"/>` +
    glow(266, 58, 30, AMBER, 0.22) + `<rect class="tw tw0" x="260" y="48" width="12" height="14" rx="4" fill="${AMBER}"/>` +
    `<rect x="196" y="84" width="66" height="6" rx="2" fill="#96703f"/><rect x="196" y="66" width="66" height="5" rx="2" fill="#96703f"/><rect x="196" y="74" width="66" height="5" rx="2" fill="#7a5632"/>` +
    `<path d="M202 66v42M256 66v42" stroke="#6b4a2a" stroke-width="4" stroke-linecap="round"/>` +
    hero(120, 108),
  ),
  // 약점 쪽지: 과녁 표시가 그려진 쪽지
  weaknote: () => frame(
    stars() + hills + ground() + glow(232, 74, 40, ROSE, 0.1) +
    `<g transform="rotate(6 232 74)"><rect x="202" y="46" width="60" height="56" rx="4" fill="#f3e3b5"/><path d="M210 58h20M210 92h28" stroke="#a88a4a" stroke-width="2.5" stroke-linecap="round"/>` +
    `<circle cx="238" cy="74" r="12" fill="none" stroke="${ROSE}" stroke-width="2.5"/><circle class="tw tw0" cx="238" cy="74" r="4" fill="${ROSE}"/><path d="M238 58v8M238 82v8M222 74h8M246 74h8" stroke="${ROSE}" stroke-width="2.5" stroke-linecap="round"/></g>` +
    `<path d="M232 42l-3 8h6z" fill="#c95a6c"/><circle cx="232" cy="40" r="4" fill="${ROSE}"/>` +
    hero(112, 108),
  ),
  // 처음 화면: 구름 위로 솟은 탑 (360 × 170)
  title: () =>
    `<svg viewBox="0 0 360 170" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax meet" aria-hidden="true">` +
    stars() + [[30, 96], [330, 110], [88, 70], [276, 84]].map(([x, y], i) => `<rect class="tw tw${i % 3}" x="${x}" y="${y}" width="2" height="2" fill="#a7ddff" opacity="0.7"/>`).join('') +
    `<circle cx="286" cy="38" r="20" fill="#eef6ff" opacity="0.95"/><circle cx="296" cy="32" r="19" fill="#0b1430"/>` +
    `<path d="M0 170v-34l40-18 44 22 50-30 46 26 50-22 56 28 74-24v52z" fill="#152352"/>` +
    // 탑
    `<path d="M142 170l8-118h60l8 118z" fill="#22336a"/><path d="M150 52l-6-12h72l-6 12z" fill="#2c4186"/>` +
    `<path d="M144 40V30h12v6h12v-6h12v6h12v-6h12v6h12v-6h0v10z" fill="#2c4186"/>` +
    `<path d="M147 96h66M145 130h70" stroke="#2c4186" stroke-width="3"/>` +
    [[172, 62], [172, 104], [172, 138]].map(([x, y], i) => `<rect class="tw tw${i}" x="${x}" y="${y}" width="16" height="22" rx="8" fill="${AMBER}" opacity="0.9"/>`).join('') +
    `<path d="M180 30V8" stroke="#eef6ff" stroke-width="2.5" stroke-linecap="round"/><path class="flag" d="M180 9l24 6-24 8z" fill="${TEAL}"/>` +
    `<rect class="drift d0" x="-20" y="118" width="130" height="14" rx="7" fill="#a9c0e6" opacity="0.14"/><rect class="drift d1" x="236" y="100" width="150" height="14" rx="7" fill="#a9c0e6" opacity="0.12"/>` +
    `<rect y="160" width="360" height="10" fill="#0b1430"/>` +
    hero(92, 160) +
    `</svg>`,
};

// 직접 그린 장면 그림이 있으면 그것을 씁니다. { 장면 이름: 파일 } (art/art.json 의 scenes)
let sceneFiles = {};
export function setSceneArt(map) {
  sceneFiles = map || {};
}
const fileOf = (name) => { const entry = sceneFiles[name]; return typeof entry === 'string' ? entry : entry && entry.file; };

// 장면 그림. 모르는 이름이면 빈 글을 돌려줍니다.
export function scene(name) {
  if (fileOf(name)) return `<img src="./art/${fileOf(name)}" alt="" style="display:block;width:100%;height:100%;object-fit:cover">`;
  const draw = SCENES[name];
  return draw ? draw() : '';
}
export const hasScene = (name) => Boolean(SCENES[name]);

// 화면에 있는 <i data-ico="sword"> 자리에 그림을 넣습니다.
export function fillIcons(root = document) {
  root.querySelectorAll('[data-ico]').forEach((el) => {
    el.innerHTML = icon(el.dataset.ico);
  });
}
