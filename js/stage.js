// 전투 무대: 캐릭터를 도형으로 그리고, 숫자를 시간에 따라 바꿔 움직입니다.
// 이미지 파일을 쓰지 않습니다. 새 몬스터는 draw 함수 하나를 추가하면 됩니다.
const W = 360;
const H = 230;
const BAND = [40, 198]; // 캐릭터와 적이 서 있는 세로 범위. 칸이 낮아져도 이 범위는 잘리지 않게 그립니다.

export function createStage(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  fit();
  window.addEventListener('resize', fit);

  const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const S = {
    idle: !calm,
    kind: 'twins',
    t: 0,
    shake: 0,
    guard: 0,
    parts: [],
    nums: [],
    slashes: [],
    rings: [],
    events: [],
    hero: { x: 88, y: 148, lunge: 0, hit: 0, down: false },
    foe: { x: 264, y: 112, lunge: 0, hit: 0, dead: 0, gone: false, spawn: 0, spec: 0, flag: false },
  };

  const stars = [];
  for (let i = 0; i < 22; i++) stars.push([Math.random() * W, Math.random() * 150, Math.random() * 1.4 + 0.4]);

  // ---- 시간 예약, 조각, 숫자 ----
  function after(sec, fn) {
    S.events.push({ at: S.t + sec, fn });
  }
  function burst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * 6.283;
      const s = 40 + Math.random() * 150;
      S.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0.5 + Math.random() * 0.4, color, r: 2 + Math.random() * 3 });
    }
  }
  // 떠오르는 글자. size 는 글자 크기, 처음 잠깐은 크게 튀어나왔다가 제 크기로 돌아옵니다.
  function num(x, y, text, color, size = 24) {
    S.nums.push({ x, y, text, color, size, life: 1, age: 0 });
  }
  // 베는 자국 (cross 이면 X 모양)
  function slash(x, y, color, cross) {
    S.slashes.push({ x, y, color, cross, life: 1 });
  }
  // 퍼져 나가는 고리
  function ring(x, y, color) {
    S.rings.push({ x, y, color, life: 1 });
  }
  function dec(obj, key, dur, dt) {
    if (obj[key] > 0) {
      obj[key] -= dt / dur;
      if (obj[key] <= 0) {
        obj[key] = 0;
        return true;
      }
    }
    return false;
  }

  function update(dt) {
    S.t += dt;
    for (let i = S.events.length - 1; i >= 0; i--) {
      if (S.events[i].at <= S.t) {
        const fn = S.events[i].fn;
        S.events.splice(i, 1);
        fn();
      }
    }
    dec(S.hero, 'lunge', 0.45, dt);
    dec(S.hero, 'hit', 0.4, dt);
    dec(S.foe, 'lunge', 0.45, dt);
    dec(S.foe, 'hit', 0.4, dt);
    dec(S.foe, 'spawn', 0.4, dt);
    if (dec(S.foe, 'spec', 0.8, dt)) S.foe.flag = !S.foe.flag;
    if (dec(S.foe, 'dead', 0.6, dt)) S.foe.gone = true;
    dec(S, 'guard', 0.7, dt);
    S.shake = Math.max(0, S.shake - dt * 24);
    for (let i = S.parts.length - 1; i >= 0; i--) {
      const p = S.parts[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 260 * dt;
      p.life -= dt;
      if (p.life <= 0) S.parts.splice(i, 1);
    }
    for (let i = S.nums.length - 1; i >= 0; i--) {
      const n = S.nums[i];
      n.y -= 30 * dt;
      n.life -= dt;
      n.age += dt;
      if (n.life <= 0) S.nums.splice(i, 1);
    }
    for (const list of [S.slashes, S.rings]) {
      for (let i = list.length - 1; i >= 0; i--) {
        list[i].life -= dt / 0.32;
        if (list[i].life <= 0) list.splice(i, 1);
      }
    }
  }

  // ---- 도형 그리기 도구 ----
  let flash = false; // 맞았을 때 모든 색을 흰색으로 바꿉니다.
  const C = (color) => (flash ? '#ffffff' : color);

  function circ(x, y, r, color) {
    ctx.fillStyle = C(color);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 6.2832);
    ctx.fill();
  }
  function ell(x, y, rx, ry, color) {
    ctx.fillStyle = C(color);
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, 6.2832);
    ctx.fill();
  }
  function poly(pts, color) {
    ctx.fillStyle = C(color);
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    ctx.fill();
  }
  function rrect(x, y, w, h, r, color) {
    ctx.fillStyle = C(color);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }
  function line(x1, y1, x2, y2, color, width) {
    ctx.strokeStyle = C(color);
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  function blinking(phase) {
    return S.idle && (S.t + phase) % 3.4 < 0.13;
  }
  function eye(x, y, r, white, pupil, phase) {
    if (blinking(phase)) {
      line(x - r, y, x + r, y, '#1c2740', 2);
      return;
    }
    if (white) {
      circ(x, y, r, '#ffffff');
      circ(x + 1, y + 1, r * 0.5, pupil);
    } else {
      circ(x, y, r, pupil);
    }
  }
  const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

  // ---- 캐릭터 ----
  // 주인공은 모습(js/heroes.js)마다 다르게 그립니다. S.look: 'starter' 다시 시작한 아이 · 'grit' 끈기 대장 · 'flash' 암산 번개 · 'sleuth' 오답 탐정
  function drawHero() {
    const look = S.look || 'starter';
    const robe = { starter: '#2bb8a3', grit: '#3b5bbd', flash: '#8a63d2', sleuth: '#b07a45' }[look] || '#2bb8a3';
    const shoe = { starter: '#1e8f80', grit: '#2a4390', flash: '#6243a8', sleuth: '#54391f' }[look] || '#1e8f80';
    // 지팡이 (끈기 대장과 암산 번개는 들지 않습니다)
    if (look === 'starter') {
      line(-36, -34, -36, 44, '#ffd24a', 3);
      circ(-36, -38, 5, '#f2a13b');
    }
    ell(-10, 46, 9, 4, shoe);
    ell(10, 46, 9, 4, shoe);
    poly([0, -18, -30, 44, 30, 44], robe);
    poly([0, -4, -8, 14, 8, 14], look === 'flash' ? '#ffe27a' : '#e9fbf7');
    line(20, 16, 34, 20, '#ffd9a8', 5);
    if (look === 'starter') {
      // 각도기
      ctx.fillStyle = C('#fff2c2');
      ctx.strokeStyle = C('#f2a13b');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(50, 22, 20, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      line(50, 22, 62, 8, '#e5484d', 1.5);
    } else if (look === 'sleuth') {
      // 돋보기 (오답 탐정)
      line(34, 20, 44, 6, '#6b4a2a', 4);
      ctx.fillStyle = C('rgba(191, 233, 255, 0.5)');
      ctx.strokeStyle = C('#ffd24a');
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(52, -8, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      line(45, -14, 50, -19, '#ffffff', 2);
    } else if (look === 'grit') {
      // 삼각자 모양 방패
      poly([32, -8, 32, 40, 66, 40], '#ffe9b0');
      poly([40, 12, 40, 32, 54, 32], robe);
      ctx.strokeStyle = C('#f2a13b');
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(32, -8);
      ctx.lineTo(32, 40);
      ctx.lineTo(66, 40);
      ctx.closePath();
      ctx.stroke();
    } else {
      // 번개 모양 분필
      poly([52, -14, 38, 12, 48, 12, 40, 36, 62, 4, 51, 4, 58, -14], '#ffe27a');
      ctx.strokeStyle = C('#f2a13b');
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      [[52, -14], [38, 12], [48, 12], [40, 36], [62, 4], [51, 4], [58, -14]].forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.stroke();
      // 노란 목도리 (바람에 날림)
      rrect(-14, -14, 28, 7, 3, '#ffd24a');
      poly([-12, -10, -34, -4, -30, 6, -10, -6], '#ffd24a');
    }
    circ(0, -26, 16, '#ffd9a8');
    if (look === 'starter') {
      poly([-20, -36, 20, -36, 6, -62], '#f2a13b');
      rrect(-24, -38, 48, 5, 2, '#d9822b');
    } else if (look === 'sleuth') {
      // 챙 달린 모자 (붉은 띠)
      ctx.fillStyle = C('#6b4a2a');
      ctx.beginPath();
      ctx.arc(0, -34, 15, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      rrect(-15, -41, 30, 4, 1, '#e5484d');
      rrect(-24, -37, 48, 6, 3, '#54391f');
    } else if (look === 'grit') {
      // 짧은 머리와 붉은 머리띠 (매듭이 뒤로 날림)
      ctx.fillStyle = C('#3a2a1c');
      ctx.beginPath();
      ctx.arc(0, -29, 16.5, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      rrect(-17, -36, 34, 6, 2, '#e5484d');
      poly([-16, -34, -30, -40, -28, -30], '#e5484d');
      poly([-16, -32, -32, -28, -27, -22], '#c93a40');
    } else {
      // 바람에 날리는 머리
      poly([-17, -30, -24, -46, -10, -40, -8, -52, 2, -42, 8, -54, 13, -40, 22, -44, 17, -28], '#5a3fa0');
    }
    eye(-6, -25, 2, false, '#1c2740', 0);
    eye(6, -25, 2, false, '#1c2740', 0);
    ctx.strokeStyle = C('#1c2740');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-5, -18);
    ctx.quadraticCurveTo(0, -14, 5, -18);
    ctx.stroke();
  }

  function drawTwin(x, y, body, horn, cosine, phase) {
    poly([x - 14, y - 20, x - 8, y - 36, x - 2, y - 22], horn);
    poly([x + 14, y - 20, x + 8, y - 36, x + 2, y - 22], horn);
    circ(x, y, 26, body);
    eye(x - 8, y - 8, 5, true, '#1c2740', phase);
    eye(x + 8, y - 8, 5, true, '#1c2740', phase);
    const s = cosine ? -1 : 1;
    ctx.strokeStyle = C('#ffffff');
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 16, y + 11);
    ctx.quadraticCurveTo(x - 8, y + 11 - 14 * s, x, y + 11);
    ctx.quadraticCurveTo(x + 8, y + 11 + 14 * s, x + 16, y + 11);
    ctx.stroke();
  }
  // 사코 쌍둥이: 고유 동작은 서로 자리 바꾸기
  function drawTwins(f) {
    const sp = f.spec > 0 ? 1 - f.spec : 0;
    const cur = f.flag ? 28 : -28;
    const ax = cur * (1 - 2 * ease(sp));
    const arc = Math.sin(sp * Math.PI);
    const bob = S.idle ? Math.sin(S.t * 3) * 3 : 0;
    drawTwin(-ax, bob + arc * 10, '#5aa9ff', '#3f86d9', true, 1.1);
    drawTwin(ax, -bob - arc * 22, '#ff7d8f', '#e25c70', false, 0);
  }
  // 부호 박쥐: 고유 동작은 날개의 플러스·마이너스 뒤집기
  function drawBat(f) {
    const sp = f.spec > 0 ? 1 - f.spec : 0;
    const swapped = f.flag !== sp > 0.5;
    const flap = S.idle ? 1 - 0.4 * (0.5 + 0.5 * Math.sin(S.t * 11)) : 1;
    ctx.save();
    ctx.scale(Math.max(0.04, Math.abs(Math.cos(sp * Math.PI))), 1);
    ctx.save();
    ctx.scale(1, flap);
    poly([-16, -4, -62, -24, -54, 6, -44, 2, -40, 18, -26, 10], '#6f55d6');
    poly([16, -4, 62, -24, 54, 6, 44, 2, 40, 18, 26, 10], '#6f55d6');
    const px = swapped ? 42 : -42;
    const mx = -px;
    line(px - 6, -8, px + 6, -8, '#ffffff', 3);
    line(px, -14, px, -2, '#ffffff', 3);
    line(mx - 6, -8, mx + 6, -8, '#ffffff', 3);
    ctx.restore();
    poly([-16, -14, -12, -32, -4, -18], '#9a7bff');
    poly([16, -14, 12, -32, 4, -18], '#9a7bff');
    circ(0, 0, 20, '#9a7bff');
    eye(-7, -4, 5, true, '#e5484d', 0.6);
    eye(7, -4, 5, true, '#e5484d', 0.6);
    ctx.strokeStyle = C('#1c2740');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-8, 8);
    ctx.quadraticCurveTo(0, 14, 8, 8);
    ctx.stroke();
    poly([-4, 10, -2, 16, 0, 11], '#ffffff');
    poly([4, 10, 2, 16, 0, 11], '#ffffff');
    ctx.restore();
  }
  // 덜약분 골렘: 고유 동작은 6/8 ↔ 3/4 약분
  function drawGolem(f) {
    const sp = f.spec > 0 ? 1 - f.spec : 0;
    const reduced = f.flag !== sp > 0.5;
    const from = f.flag ? 0.72 : 1;
    const to = f.flag ? 1 : 0.72;
    const sc = (from + (to - from) * ease(sp)) * (1 + Math.sin(sp * Math.PI) * 0.16);
    ctx.save();
    ctx.translate(0, 45);
    ctx.scale(sc, sc);
    ctx.translate(0, -45);
    rrect(-46, -20, 14, 30, 4, '#a37a45');
    rrect(32, -20, 14, 30, 4, '#a37a45');
    rrect(-28, -48, 56, 34, 4, '#d9b57c');
    rrect(-36, -12, 72, 7, 2, '#6b4a2b');
    rrect(-28, -3, 56, 38, 4, '#b58a52');
    rrect(-24, 35, 18, 10, 3, '#8a6537');
    rrect(6, 35, 18, 10, 3, '#8a6537');
    eye(-12, -38, 3, false, '#1c2740', 1.7);
    eye(12, -38, 3, false, '#1c2740', 1.7);
    ctx.fillStyle = C('#3b2a17');
    ctx.font = '700 17px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(reduced ? '3' : '6', 0, -23);
    ctx.fillText(reduced ? '4' : '8', 0, 17);
    ctx.restore();
  }
  // 안개 탑 (보스): 고유 동작은 안개로 높이를 가리기
  function drawTower(f) {
    const sp = f.spec > 0 ? 1 - f.spec : 0;
    rrect(-24, -44, 48, 90, 3, '#5b6a94');
    rrect(-30, -56, 12, 16, 2, '#6c7cab');
    rrect(-6, -56, 12, 16, 2, '#6c7cab');
    rrect(18, -56, 12, 16, 2, '#6c7cab');
    rrect(-30, -44, 60, 8, 2, '#6c7cab');
    rrect(-8, 22, 16, 24, 6, '#2a3558');
    for (let y = -24; y <= 30; y += 12) line(-24, y, -17, y, '#c7d3f2', 1.5);
    eye(-9, -18, 6, true, '#e5484d', 0.3);
    eye(9, -18, 6, true, '#e5484d', 0.3);
    line(-8, 0, 8, 0, '#1c2740', 2);
    const drift = S.idle ? Math.sin(S.t * 0.9) * 6 : 0;
    const fog = 0.4 + 0.55 * Math.sin(sp * Math.PI);
    const before = ctx.globalAlpha;
    ctx.globalAlpha = before * fog;
    ell(-18 + drift, -52, 30, 11, '#dfe8ff');
    ell(16 - drift, -42, 34, 12, '#dfe8ff');
    ell(-4 + drift * 0.5, -62 - sp * 6, 26, 10, '#dfe8ff');
    ctx.globalAlpha = before;
  }
  // 단위 도둑 (중간 보스): 고유 동작은 단위 "m" 이 든 자루를 들어 올리기
  function drawThief(f) {
    const sp = f.spec > 0 ? 1 - f.spec : 0;
    const lift = Math.sin(sp * Math.PI) * 24;
    ell(0, 20, 24, 28, '#3a3f5c');
    poly([-22, -8, 0, -46, 22, -8], '#2b2f47');
    circ(0, -14, 15, '#e8c9a0');
    rrect(-16, -21, 32, 10, 3, '#1c2740');
    eye(-6, -16, 3, true, '#1c2740', 0.9);
    eye(6, -16, 3, true, '#1c2740', 0.9);
    ctx.strokeStyle = C('#1c2740');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-5, -5);
    ctx.quadraticCurveTo(0, -1, 6, -6);
    ctx.stroke();
    line(18, 10, 30, 6 - lift, '#3a3f5c', 6);
    circ(36, 12 - lift, 16, '#c9a36b');
    poly([28, -2 - lift, 36, -12 - lift, 44, -2 - lift], '#a37a45');
    ctx.fillStyle = C('#3b2a17');
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('m', 36, 13 - lift);
  }
  // 글자를 캐릭터 위에 씁니다. (부등호, 2ab 같은 표시)
  function glyph(text, x, y, size, color) {
    ctx.fillStyle = C(color);
    ctx.font = `700 ${size}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }
  // 부등호 게 (数と式): 고유 동작은 집게의 부등호 방향 바꾸기
  function drawCrab(f) {
    const sp = f.spec > 0 ? 1 - f.spec : 0;
    const flipped = f.flag !== sp > 0.5;
    const lift = Math.sin(sp * Math.PI) * 12;
    const wave = S.idle ? Math.sin(S.t * 5) * 2 : 0;
    for (const dir of [-1, 1]) {
      line(dir * 18, 22, dir * 34, 36 + wave * dir, '#b3323a', 4);
      line(dir * 24, 16, dir * 42, 26 - wave * dir, '#b3323a', 4);
      line(dir * 22, 4, dir * 38, -12 - lift, '#b3323a', 6);
      circ(dir * 42, -20 - lift, 15, '#ff7d8f');
      line(dir * 9, -8, dir * 11, -22, '#b3323a', 3);
    }
    ell(0, 12, 30, 21, '#e5484d');
    eye(-11, -24, 5, true, '#1c2740', 1.1);
    eye(11, -24, 5, true, '#1c2740', 1.1);
    ctx.strokeStyle = C('#1c2740');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-7, 16);
    ctx.quadraticCurveTo(0, 21, 7, 16);
    ctx.stroke();
    glyph(flipped ? '>' : '<', -42, -19 - lift, 20, '#ffffff');
    glyph(flipped ? '<' : '>', 42, -19 - lift, 20, '#ffffff');
  }
  // 괄호 슬라임 (数と式): 고유 동작은 배에 적힌 가운데 항 "2ab" 를 삼켜 버리기
  function drawSlime(f) {
    const sp = f.spec > 0 ? 1 - f.spec : 0;
    const hidden = f.flag !== sp > 0.5;
    const open = Math.sin(sp * Math.PI) * 12;
    const squish = 1 + Math.sin(sp * Math.PI) * 0.12;
    glyph('(', -46 - open, 4, 64, '#dfe8ff');
    glyph(')', 46 + open, 4, 64, '#dfe8ff');
    ctx.save();
    ctx.translate(0, 44);
    ctx.scale(squish, 1 / squish);
    ctx.translate(0, -44);
    ell(0, 22, 32, 22, '#37b392');
    circ(0, 4, 26, '#4fd1ae');
    eye(-9, -4, 5, true, '#1c2740', 2.1);
    eye(9, -4, 5, true, '#1c2740', 2.1);
    if (hidden) {
      ell(0, 22, 7, 5, '#1c2740'); // 삼킨 뒤의 입
    } else {
      rrect(-17, 13, 34, 18, 6, '#eafff8');
      glyph('2ab', 0, 23, 13, '#1f6f5c');
    }
    ctx.restore();
  }
  // 포물선 유령 (二次関数): 고유 동작은 축(점선)의 반대쪽으로 넘어가기
  function drawGhost(f) {
    const sp = f.spec > 0 ? 1 - f.spec : 0;
    const from = f.flag ? -18 : 18;
    const x = from + (-from - from) * ease(sp);
    ctx.save();
    ctx.setLineDash([5, 5]);
    line(0, -62, 0, 48, '#8fb4ff', 2);
    ctx.restore();
    glyph('−', -44, 44, 16, '#8fb4ff');
    glyph('+', 44, 44, 16, '#8fb4ff');
    const sway = S.idle ? Math.sin(S.t * 3) * 3 : 0;
    ctx.save();
    ctx.translate(x, 0);
    ctx.fillStyle = C('#c9d4ff');
    ctx.beginPath();
    ctx.moveTo(-30, 40);
    ctx.quadraticCurveTo(-30, -52, 0, -52);
    ctx.quadraticCurveTo(30, -52, 30, 40);
    ctx.quadraticCurveTo(22 + sway, 30, 15, 40);
    ctx.quadraticCurveTo(7 + sway, 30, 0, 40);
    ctx.quadraticCurveTo(-8 + sway, 30, -15, 40);
    ctx.quadraticCurveTo(-23 + sway, 30, -30, 40);
    ctx.fill();
    // 몸에 그려진 포물선 무늬
    ctx.strokeStyle = C('#7a8bd6');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-16, 2);
    ctx.quadraticCurveTo(0, 46, 16, 2);
    ctx.stroke();
    eye(-10, -24, 6, true, '#3b4a9a', 2.6);
    eye(10, -24, 6, true, '#3b4a9a', 2.6);
    circ(0, 24, 3, '#ffc857'); // 꼭짓점
    ctx.restore();
  }
  // 뒤죽박죽 막대 (データの分析): 고유 동작은 크기 순서로 줄 서기 ↔ 다시 흩어지기
  function drawBars(f) {
    const sp = f.spec > 0 ? 1 - f.spec : 0;
    const mixed = [44, 78, 26];
    const sorted = [26, 44, 78];
    const from = f.flag ? sorted : mixed;
    const to = f.flag ? mixed : sorted;
    const colors = ['#ffb347', '#ff8c5a', '#ffd166'];
    line(-48, 45, 48, 45, '#8fb4ff', 2);
    for (let i = 0; i < 3; i++) {
      const h = from[i] + (to[i] - from[i]) * ease(sp);
      const x = -30 + i * 30;
      const bob = S.idle ? Math.sin(S.t * 4 + i * 1.7) * 2 : 0;
      rrect(x - 12, 44 - h - bob, 24, h + bob, 5, colors[i]);
      eye(x - 5, 54 - h - bob, 3, true, '#1c2740', 0.4 + i);
      eye(x + 5, 54 - h - bob, 3, true, '#1c2740', 0.4 + i);
      line(x - 4, 63 - h - bob, x + 4, 63 - h - bob, '#1c2740', 1.5);
    }
  }
  // 이항 마술사 (중간 보스, 数と式): 고유 동작은 카드의 부호를 그대로 둔 채 반대편으로 넘기기
  function drawMagician(f) {
    const sp = f.spec > 0 ? 1 - f.spec : 0;
    const side = f.flag ? 1 : -1;
    const cx = side * 40 + (-side * 80) * ease(sp);
    const cy = -26 - Math.sin(sp * Math.PI) * 26;
    ctx.save();
    ctx.setLineDash([4, 4]);
    line(0, -76, 0, 50, '#8fb4ff', 1.5); // 등호의 자리 (좌변 | 우변)
    ctx.restore();
    glyph('=', 0, -84, 16, '#8fb4ff');
    poly([-26, 46, 0, -18, 26, 46], '#5b3fa6');
    poly([-8, 46, 0, 4, 8, 46], '#7a5cd0');
    circ(0, -22, 15, '#f0d2a8');
    rrect(-20, -38, 40, 6, 2, '#1c2740');
    rrect(-13, -62, 26, 26, 3, '#1c2740');
    rrect(-13, -44, 26, 4, 1, '#e5484d');
    eye(-6, -22, 3, true, '#1c2740', 1.4);
    eye(6, -22, 3, true, '#1c2740', 1.4);
    ctx.strokeStyle = C('#1c2740');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-6, -13);
    ctx.quadraticCurveTo(0, -8, 7, -14);
    ctx.stroke();
    line(-14, 6, -30, -8, '#5b3fa6', 5);
    line(14, 6, 30, -8, '#5b3fa6', 5);
    rrect(cx - 12, cy - 15, 24, 30, 4, '#ffffff');
    glyph('+3', cx, cy, 13, '#e5484d'); // 넘어가도 부호가 그대로인 것이 실수
  }
  // 이상값 거인 (중간 보스, データの分析): 고유 동작은 혼자 높이 뛰어올라 평균선을 끌어올리기
  function drawGiant(f) {
    const sp = f.spec > 0 ? 1 - f.spec : 0;
    const jump = Math.sin(sp * Math.PI) * 30;
    const mean = 24 - jump * 0.45;
    for (const x of [-52, -40, 40, 52]) circ(x, 36, 5, '#8fb4ff');
    ctx.save();
    ctx.setLineDash([6, 4]);
    line(-60, mean, 60, mean, '#ffc857', 2);
    ctx.restore();
    ctx.save();
    ctx.translate(0, -jump);
    ell(0, 10, 28, 36, '#3f6fd9');
    circ(0, -30, 20, '#5a8cf0');
    rrect(-34, -4, 12, 30, 5, '#3f6fd9');
    rrect(22, -4, 12, 30, 5, '#3f6fd9');
    eye(-8, -32, 5, true, '#1c2740', 0.2);
    eye(8, -32, 5, true, '#1c2740', 0.2);
    line(-7, -20, 7, -20, '#1c2740', 2);
    glyph('!', 0, 12, 22, '#ffffff');
    ctx.restore();
  }
  // 판별식 용 (보스, 二次関数): 고유 동작은 배의 판별식 부호 바꾸기 (D > 0 ↔ D < 0)
  function drawDragon(f) {
    const sp = f.spec > 0 ? 1 - f.spec : 0;
    const negative = f.flag !== sp > 0.5;
    const flap = S.idle ? Math.sin(S.t * 4) * 6 : 0;
    const puff = 1 + Math.sin(sp * Math.PI) * 0.1;
    poly([-20, -10, -66, -40 - flap, -56, 4, -40, -4, -34, 14], '#2f8f6b');
    poly([20, -10, 66, -40 - flap, 56, 4, 40, -4, 34, 14], '#2f8f6b');
    poly([18, 34, 52, 46, 30, 22], '#3fae83');
    ctx.save();
    ctx.scale(puff, puff);
    ell(0, 14, 30, 34, '#3fae83');
    ell(0, 20, 20, 24, '#e9f7c9');
    circ(0, -30, 21, '#3fae83');
    poly([-16, -44, -22, -64, -6, -48], '#ffc857');
    poly([16, -44, 22, -64, 6, -48], '#ffc857');
    eye(-8, -34, 5, true, '#e5484d', 0.8);
    eye(8, -34, 5, true, '#e5484d', 0.8);
    circ(-4, -20, 1.5, '#1c2740');
    circ(4, -20, 1.5, '#1c2740');
    glyph(negative ? 'D<0' : 'D>0', 0, 20, 14, '#1f6f5c');
    ctx.restore();
  }
  // 중복 주사위 (数学A 場合の数): 고유 동작은 똑같은 주사위가 하나 더 나타났다 사라지기 (같은 경우를 두 번 세기)
  function drawDice(f) {
    const sp = f.spec > 0 ? 1 - f.spec : 0;
    const split = f.flag ? 1 - ease(sp) : ease(sp);
    const die = (x, y, alpha) => {
      const before = ctx.globalAlpha;
      ctx.globalAlpha = before * alpha;
      rrect(x - 24, y - 24, 48, 48, 9, '#ffffff');
      for (const [px, py] of [[-12, -12], [12, -12], [0, 0], [-12, 12], [12, 12]]) circ(x + px, y + py, 4, '#e5484d');
      ctx.globalAlpha = before;
    };
    if (split > 0.02) die(24 * split, 2 - 18 * split, 0.55);
    const x = -24 * split;
    die(x, 10, 1);
    rrect(x - 13, 5, 26, 10, 5, '#ffffff');
    eye(x - 7, 10, 3, false, '#1c2740', 0.5);
    eye(x + 7, 10, 3, false, '#1c2740', 0.5);
    line(x - 14, 34, x - 18, 46, '#c9d4ff', 4);
    line(x + 14, 34, x + 18, 46, '#c9d4ff', 4);
  }
  // 보조선 컴퍼스 (数学A 図形の性質): 고유 동작은 다리를 벌려 보조선(점선)을 긋기
  function drawCompass(f) {
    const sp = f.spec > 0 ? 1 - f.spec : 0;
    const drawn = f.flag ? 1 - ease(sp) : ease(sp);
    const spread = 16 + Math.sin(sp * Math.PI) * 8;
    if (drawn > 0.02) {
      ctx.save();
      ctx.setLineDash([5, 5]);
      line(-52, 44, -52 + 104 * drawn, 44 - 70 * drawn, '#ffc857', 2.5);
      ctx.restore();
    }
    line(0, -36, -spread, 44, '#9fb3d9', 7);
    line(0, -36, spread, 44, '#9fb3d9', 7);
    poly([-spread - 3, 40, -spread, 52, -spread + 3, 40], '#ffc857');
    poly([spread - 3, 40, spread, 52, spread + 3, 40], '#1c2740');
    circ(0, -36, 15, '#5a8cf0');
    rrect(-4, -62, 8, 16, 3, '#9fb3d9');
    eye(-6, -38, 4, true, '#1c2740', 1.9);
    eye(6, -38, 4, true, '#1c2740', 1.9);
    line(-5, -28, 5, -28, '#1c2740', 1.5);
  }
  // 법칙 저울 (중간 보스, 数学A 場合の数): 고유 동작은 "+" 와 "×" 접시가 반대로 기울기 (합의 법칙 ↔ 곱의 법칙)
  function drawScales(f) {
    const sp = f.spec > 0 ? 1 - f.spec : 0;
    const from = f.flag ? -0.22 : 0.22;
    const tilt = from + (-from - from) * ease(sp);
    rrect(-6, -30, 12, 70, 4, '#8a6537');
    rrect(-26, 38, 52, 10, 4, '#6b4a2b');
    circ(0, -40, 17, '#d9b57c');
    eye(-6, -42, 3.5, true, '#1c2740', 0.7);
    eye(6, -42, 3.5, true, '#1c2740', 0.7);
    line(-5, -32, 5, -32, '#1c2740', 1.5);
    ctx.save();
    ctx.translate(0, -18);
    ctx.rotate(tilt);
    line(-52, 0, 52, 0, '#c9a36b', 5);
    ctx.restore();
    for (const dir of [-1, 1]) {
      const x = dir * 52 * Math.cos(tilt);
      const y = -18 + dir * 52 * Math.sin(tilt);
      line(x, y, x - 14, y + 26, '#c9a36b', 1.5);
      line(x, y, x + 14, y + 26, '#c9a36b', 1.5);
      ell(x, y + 28, 18, 6, '#ffc857');
      circ(x, y + 14, 10, dir < 0 ? '#5a8cf0' : '#e5484d');
      glyph(dir < 0 ? '+' : '×', x, y + 14, 15, '#ffffff');
    }
  }
  // 원의 문지기 (보스, 数学A 図形の性質): 고유 동작은 안에 든 삼각형을 돌려 꼭짓점이 원 밖으로 나가게 하기
  function drawWarden(f) {
    const sp = f.spec > 0 ? 1 - f.spec : 0;
    const grow = 1 + Math.sin(sp * Math.PI) * 0.35;
    const turn = (S.idle ? S.t * 0.5 : 0) + ease(sp) * Math.PI * (2 / 3);
    ctx.strokeStyle = C('#8fb4ff');
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, -4, 50, 0, Math.PI * 2);
    ctx.stroke();
    circ(0, -4, 44, '#22315e');
    const pts = [];
    for (let i = 0; i < 3; i++) pts.push(Math.cos(turn + (i * Math.PI * 2) / 3) * 50 * grow, -4 + Math.sin(turn + (i * Math.PI * 2) / 3) * 50 * grow);
    ctx.strokeStyle = C('#ffc857');
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    ctx.lineTo(pts[2], pts[3]);
    ctx.lineTo(pts[4], pts[5]);
    ctx.closePath();
    ctx.stroke();
    for (let i = 0; i < 3; i++) circ(pts[i * 2], pts[i * 2 + 1], 4, '#ffc857');
    circ(0, -4, 17, '#ffffff');
    if (blinking(0.5)) line(-14, -4, 14, -4, '#1c2740', 3);
    else circ(2, -3, 8, '#e5484d');
    rrect(-20, 44, 14, 8, 3, '#5b6a94');
    rrect(6, 44, 14, 8, 3, '#5b6a94');
  }
  // 나머지 생쥐 (数学A 整数): 고유 동작은 치즈에 적힌 몫 q 와 나머지 r 을 바꿔 들기
  function drawMouse(f) {
    const sp = f.spec > 0 ? 1 - f.spec : 0;
    const swapped = f.flag !== sp > 0.5;
    const lift = Math.sin(sp * Math.PI) * 14;
    ctx.strokeStyle = C('#d08a9a');
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(24, 34);
    ctx.quadraticCurveTo(58, 44, 50, 14);
    ctx.stroke();
    ell(0, 22, 28, 24, '#9aa6c4');
    circ(-18, -22, 12, '#9aa6c4');
    circ(18, -22, 12, '#9aa6c4');
    circ(-18, -22, 6, '#f2b6c4');
    circ(18, -22, 6, '#f2b6c4');
    circ(0, -6, 20, '#b7c1dc');
    eye(-7, -9, 3.5, false, '#1c2740', 1.2);
    eye(7, -9, 3.5, false, '#1c2740', 1.2);
    circ(0, 0, 3, '#f2b6c4');
    line(-4, 3, -16, 1, '#1c2740', 1);
    line(4, 3, 16, 1, '#1c2740', 1);
    for (const dir of [-1, 1]) {
      const y = 22 - lift;
      poly([dir * 34 - 13, y + 12, dir * 34 + 13, y + 12, dir * 34, y - 12], '#ffc857');
      glyph((dir < 0) !== swapped ? 'q' : 'r', dir * 34, y + 4, 12, '#6b4a2b');
    }
  }
  // 약수 자물쇠 (중간 보스, 数学A 整数): 고유 동작은 고리를 철컥 들어 올렸다가 다시 잠그기
  function drawLock(f) {
    const sp = f.spec > 0 ? 1 - f.spec : 0;
    const lift = Math.sin(sp * Math.PI) * 16;
    const bob = S.idle ? Math.sin(S.t * 2.4) * 2 : 0;
    ctx.strokeStyle = C('#b9c4dd');
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-21, -14 + bob);
    ctx.lineTo(-21, -34 + bob - lift);
    ctx.arc(0, -34 + bob - lift, 21, Math.PI, 0);
    ctx.lineTo(21, -14 + bob - lift * 0.9);
    ctx.stroke();
    rrect(-36, -18 + bob, 72, 66, 12, '#e0a93f');
    rrect(-36, 34 + bob, 72, 14, 8, '#b9852a');
    rrect(-36, -18 + bob, 72, 10, 8, '#f3c865');
    eye(-13, 2 + bob, 5.5, true, '#1c2740', 0.3);
    eye(13, 2 + bob, 5.5, true, '#1c2740', 0.3);
    circ(0, 22 + bob, 6, '#1c2740');
    poly([-3.5, 24 + bob, 3.5, 24 + bob, 6, 36 + bob, -6, 36 + bob], '#1c2740');
    glyph('÷', -25, 26 + bob, 15, '#7a5a1c');
    glyph('÷', 25, 26 + bob, 15, '#7a5a1c');
  }
  // 톱니바퀴 하나 (teeth 개의 이가 달린 원)
  function cog(x, y, r, teeth, angle, color, dark) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    for (let i = 0; i < teeth; i++) {
      ctx.rotate((Math.PI * 2) / teeth);
      rrect(-r * 0.17, -r * 1.2, r * 0.34, r * 0.42, 2, color);
    }
    circ(0, 0, r, color);
    circ(0, 0, r * 0.66, dark);
    ctx.restore();
  }
  // 호제법 톱니바퀴 (보스, 数学A 整数): 큰 바퀴와 작은 바퀴가 맞물려 돕니다. 고유 동작은 빠르게 반 바퀴 돌기
  function drawGear(f) {
    const sp = f.spec > 0 ? 1 - f.spec : 0;
    const turn = (S.idle ? S.t * 0.5 : 0) + ease(sp) * Math.PI;
    cog(42, 34, 20, 8, -turn * 2.3 + 0.2, '#ffc857', '#b9852a');
    cog(0, -6, 46, 12, turn, '#9db1d6', '#3a4d85');
    circ(0, -6, 24, '#22336a');
    eye(-9, -10, 5.5, true, '#1c2740', 0.5);
    eye(9, -10, 5.5, true, '#1c2740', 0.5);
    line(-8, 4, 8, 4, '#eef6ff', 2.5);
    glyph('r', 42, 34, 15, '#5a3f10');
  }
  // 파스칼 삼각바위 (式と証明, 二項定理): 고유 동작은 꼭대기부터 숫자가 차례로 밝아지기
  function drawPascal(f) {
    const sp = f.spec > 0 ? 1 - f.spec : 0;
    poly([0, -58, 52, 46, -52, 46], '#6d5aa8');
    poly([0, -46, 40, 38, -40, 38], '#8a76c9');
    const rows = [['1'], ['1', '1'], ['1', '2', '1']];
    rows.forEach((row, r) => {
      const lit = sp > 0 && Math.floor(sp * 3.99) === r;
      row.forEach((n, k) => {
        const x = (k - (row.length - 1) / 2) * 22;
        const y = 2 + r * 16;
        circ(x, y, 7.5, lit ? '#ffe9a8' : '#efeaff');
        glyph(n, x, y + 0.5, 10, '#3b2f6b');
      });
    });
    eye(-8, -22, 4.5, true, '#1c2740', 0.8);
    eye(8, -22, 4.5, true, '#1c2740', 0.8);
  }
  // 세로셈 톱 (式と証明, 多項式の割り算): 고유 동작은 톱날이 좌우로 썰기
  function drawSaw(f) {
    const sp = f.spec > 0 ? 1 - f.spec : 0;
    const slide = Math.sin(sp * Math.PI * 4) * 7;
    rrect(-34, -8, 68, 44, 8, '#c98d4b');
    rrect(-28, -2, 56, 32, 5, '#e2b072');
    glyph('÷', 0, 22, 20, '#7a4a18');
    eye(-10, 6, 5, true, '#1c2740', 1.4);
    eye(10, 6, 5, true, '#1c2740', 1.4);
    ctx.save();
    ctx.translate(slide, 0);
    rrect(-44, -30, 88, 14, 3, '#cfd8e6');
    const teeth = [];
    for (let k = 0; k < 8; k++) teeth.push(-44 + k * 11, -16, -38.5 + k * 11, -8, -33 + k * 11, -16);
    for (let k = 0; k < teeth.length; k += 6) poly(teeth.slice(k, k + 6), '#aab6c8');
    rrect(40, -36, 14, 26, 4, '#7a4a18');
    ctx.restore();
    glyph('−', -44, 40, 14, '#ff9a8a');
  }
  // 허수 도깨비 (複素数と方程式): 고유 동작은 들고 있는 팻말이 i² = 1 에서 −1 로 뒤집히기
  function drawImp(f) {
    const sp = f.spec > 0 ? 1 - f.spec : 0;
    const flipped = f.flag !== sp > 0.5;
    poly([-20, -34, -28, -58, -8, -40], '#8a3fb0');
    poly([20, -34, 28, -58, 8, -40], '#8a3fb0');
    ell(0, 24, 26, 22, '#a55bd0');
    circ(0, -12, 26, '#b970e0');
    eye(-9, -16, 5.5, true, '#1c2740', 1.7);
    eye(9, -16, 5.5, true, '#1c2740', 1.7);
    line(-7, -1, 7, -1, '#3a1650', 2.5);
    glyph('i', 0, 24, 22, '#f6e7ff');
    ctx.save();
    ctx.translate(44, 6);
    ctx.scale(Math.max(0.08, Math.abs(Math.cos(sp * Math.PI))), 1);
    rrect(-20, -14, 40, 24, 5, '#fff3c4');
    glyph(flipped ? 'i²=−1' : 'i²=1', 0, -1, 11, '#6b4a10');
    ctx.restore();
    line(44, 16, 44, 44, '#7a5a2a', 3);
  }
  // 근과 계수의 거울 (複素数と方程式): 고유 동작은 거울 속 부호가 + 와 − 로 바뀌기
  function drawMirror(f) {
    const sp = f.spec > 0 ? 1 - f.spec : 0;
    const swapped = f.flag !== sp > 0.5;
    const glow = Math.sin(sp * Math.PI);
    rrect(-10, 36, 20, 12, 3, '#8a6a2c');
    rrect(-24, 44, 48, 8, 4, '#a9843a');
    ell(0, -6, 40, 48, '#c9a04a');
    ell(0, -6, 33, 41, glow > 0.2 ? '#e8fbff' : '#bfe6f5');
    ell(-12, -24, 8, 14, '#e8fbff');
    eye(-10, -14, 5, true, '#1c2740', 0.9);
    eye(10, -14, 5, true, '#1c2740', 0.9);
    glyph(swapped ? 'α−β' : 'α+β', 0, 12, 15, '#1f5d78');
  }
  // ---- 数学II 의 몬스터 (고유 동작은 f.spec 이 1 → 0 으로 줄어드는 동안 보입니다) ----
  const specOf = (f) => (f.spec > 0 ? 1 - f.spec : 0);
  // 거리 자 (図形と方程式): 눈금이 늘어났다 줄어듦
  function drawRuler(f) {
    const grow = Math.sin(specOf(f) * Math.PI) * 14;
    ctx.save();
    ctx.rotate(-0.5);
    rrect(-52 - grow, -14, 104 + grow * 2, 30, 5, '#f2c14e');
    for (let k = -4; k <= 4; k++) line(k * 11, -14, k * 11, k % 2 ? -6 : -1, '#7a5a12', 2);
    eye(-10, 6, 5, true, '#1c2740', 1.1);
    eye(10, 6, 5, true, '#1c2740', 1.1);
    ctx.restore();
    glyph('√', 34, 38, 20, '#f6e3a1');
  }
  // 원 과녁 (図形と方程式): 중심의 표시가 반대쪽으로 튐
  function drawTarget(f) {
    const sp = specOf(f);
    const off = (f.flag !== sp > 0.5 ? -1 : 1) * 9;
    circ(0, 0, 46, '#e85d5d');
    circ(0, 0, 34, '#fbeeee');
    circ(0, 0, 22, '#e85d5d');
    circ(0, 0, 10, '#fbeeee');
    circ(off, -off * 0.5, 4, '#1c2740');
    eye(-12, -26, 4.5, true, '#1c2740', 0.6);
    eye(12, -26, 4.5, true, '#1c2740', 0.6);
    rrect(-6, 44, 12, 14, 3, '#8a6a2c');
  }
  // 호도법 시계추 (三角関数): 추가 크게 흔들림
  function drawPendulum(f) {
    const swing = Math.sin(specOf(f) * Math.PI * 3) * 0.7 + 0.25;
    rrect(-30, -58, 60, 10, 4, '#7d8bb0');
    ctx.save();
    ctx.translate(0, -50);
    ctx.rotate(swing);
    line(0, 0, 0, 70, '#cfd8ee', 3);
    circ(0, 78, 22, '#5aa9e6');
    eye(-7, 74, 4.5, true, '#1c2740', 2.3);
    eye(7, 74, 4.5, true, '#1c2740', 2.3);
    glyph('π', 0, 90, 13, '#103a5c');
    ctx.restore();
  }
  // 덧셈정리 파도 (三角関数): 물결이 옆으로 흐름
  function drawWave(f) {
    const shift = specOf(f) * Math.PI * 4;
    ctx.fillStyle = C('#3fa7d6');
    ctx.beginPath();
    ctx.moveTo(-54, 50);
    for (let x = -54; x <= 54; x += 4) ctx.lineTo(x, -6 + Math.sin(x / 12 + shift) * 16 - Math.max(0, 22 - Math.abs(x) * 0.5));
    ctx.lineTo(54, 50);
    ctx.closePath();
    ctx.fill();
    ell(0, 34, 50, 16, '#2b7fa8');
    eye(-10, 8, 5.5, true, '#1c2740', 1.5);
    eye(10, 8, 5.5, true, '#1c2740', 1.5);
    glyph('α+β', 0, 32, 13, '#e6f7ff');
  }
  // 지수 새싹 (指数・対数): 줄기가 쑥 자람
  function drawSprout(f) {
    const tall = Math.sin(specOf(f) * Math.PI) * 18;
    rrect(-26, 20, 52, 30, 8, '#a8663a');
    rrect(-30, 14, 60, 12, 5, '#c98450');
    line(0, 16, 0, -22 - tall, '#3f9d4b', 6);
    ell(-16, -26 - tall, 16, 9, '#58c267');
    ell(16, -34 - tall, 16, 9, '#58c267');
    eye(-8, 34, 4.5, true, '#1c2740', 0.4);
    eye(8, 34, 4.5, true, '#1c2740', 0.4);
    glyph('2ˣ', 30, -30 - tall, 14, '#d7ffd9');
  }
  // 로그 통나무 (指数・対数): 데굴데굴 구름
  function drawLogger(f) {
    const roll = specOf(f) * Math.PI * 2;
    rrect(-48, -18, 96, 46, 20, '#9c6b3f');
    ell(-40, 5, 14, 23, '#d9b98c');
    ctx.save();
    ctx.translate(-40, 5);
    ctx.rotate(roll);
    ell(0, 0, 8, 13, '#b98d5c');
    line(-4, 0, 4, 0, '#7a5530', 2);
    ctx.restore();
    eye(2, -2, 5, true, '#1c2740', 1.9);
    eye(22, -2, 5, true, '#1c2740', 1.9);
    glyph('log', 12, 16, 13, '#f5e2c4');
    rrect(-34, 28, 10, 14, 3, '#7a5530');
    rrect(24, 28, 10, 14, 3, '#7a5530');
  }
  // 기울기 스케이터 (微分・積分): 비탈을 미끄러져 내려감
  function drawSkater(f) {
    const sp = specOf(f);
    const slide = Math.sin(sp * Math.PI) * 18;
    poly([-56, 50, 56, 50, 56, -6], '#4b5f96');
    line(-56, 50, 56, -6, '#9db1e6', 3);
    ctx.save();
    ctx.translate(-slide, slide * 0.5 - 4);
    ctx.rotate(-0.46);
    rrect(-20, -2, 40, 6, 3, '#f2c14e');
    circ(-12, 7, 4, '#1c2740');
    circ(12, 7, 4, '#1c2740');
    circ(0, -22, 20, '#ff8fa3');
    eye(-7, -25, 4.5, true, '#1c2740', 2.7);
    eye(7, -25, 4.5, true, '#1c2740', 2.7);
    line(-6, -13, 6, -13, '#7a2338', 2.5);
    ctx.restore();
    glyph('f′', 40, 38, 14, '#dfe8ff');
  }
  // 넓이 양동이 (微分・積分): 물이 찼다 빠짐
  function drawBucket(f) {
    const level = 0.35 + Math.sin(specOf(f) * Math.PI) * 0.5;
    poly([-36, -30, 36, -30, 28, 46, -28, 46], '#8f9bb8');
    const top = 46 - 70 * level;
    const half = 28 + (46 - top) * (8 / 76);
    poly([-half, top, half, top, 28, 46, -28, 46], '#4cc2e8');
    ctx.strokeStyle = C('#5a6788');
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, -30, 36, Math.PI, 0);
    ctx.stroke();
    eye(-10, 4, 5, true, '#1c2740', 0.2);
    eye(10, 4, 5, true, '#1c2740', 0.2);
    glyph('∫', 0, 30, 18, '#0d4960');
  }
  // 방정식 스핑크스 (数学II 중간 보스): 물음표가 차례로 떠오름
  function drawSphinx(f) {
    const sp = specOf(f);
    rrect(-52, 14, 104, 36, 10, '#c9a04a');
    rrect(-60, 34, 30, 16, 6, '#b08a3c');
    rrect(30, 34, 30, 16, 6, '#b08a3c');
    poly([-34, 16, -40, -40, 0, -62, 40, -40, 34, 16], '#2f6fb0');
    poly([-26, 14, -30, -34, 0, -52, 30, -34, 26, 14], '#f0c96a');
    circ(0, -16, 22, '#e2b072');
    eye(-9, -19, 5, true, '#1c2740', 0.9);
    eye(9, -19, 5, true, '#1c2740', 0.9);
    line(-6, -5, 6, -5, '#7a4a18', 2.5);
    for (let k = 0; k < 3; k++) if (sp > 0 && sp * 3 > k) glyph('x', -44 + k * 44, -58 - k % 2 * 8, 15, '#ffe9a8');
    glyph('x³', 0, 34, 15, '#5a3f10');
  }
  // 미적분 히드라 (数学II 보스): 세 머리가 번갈아 치켜듦
  function drawHydra(f) {
    const sp = specOf(f);
    ell(0, 30, 50, 24, '#2f8f6b');
    [-1, 0, 1].forEach((side, k) => {
      const up = Math.max(0, Math.sin(sp * Math.PI * 3 - k)) * 12;
      const hx = side * 34;
      const hy = -30 - (side === 0 ? 14 : 0) - up;
      ctx.strokeStyle = C('#37a57c');
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(side * 16, 22);
      ctx.quadraticCurveTo(side * 44, -4, hx, hy);
      ctx.stroke();
      circ(hx, hy, 15, '#45c495');
      eye(hx - 5, hy - 3, 3.6, true, '#1c2740', 1 + k);
      eye(hx + 5, hy - 3, 3.6, true, '#1c2740', 1 + k);
      glyph(['f′', '∫', 'dx'][k], hx, hy + 9, 9, '#0c3d2c');
    });
    glyph('0', 0, 32, 16, '#d9ffef');
  }
  // 진보스 "포기의 그림자": 주인공과 같은 모양의 검은 그림자. 눈만 빛나고, 강한 공격 때 크게 부풉니다.
  function drawShadow(f) {
    const sp = specOf(f);
    const grow = 1 + Math.sin(sp * Math.PI) * 0.18;
    const sway = Math.sin(S.t * 1.6) * 3;
    ctx.save();
    ctx.scale(grow, grow);
    for (let k = 0; k < 3; k++) { // 뒤로 흩어지는 그림자
      ctx.globalAlpha = 0.16;
      poly([sway * (k + 1), -30 - k * 6, -44 - k * 8, 46, 44 + k * 8, 46], '#6b5bd6');
    }
    ctx.globalAlpha = 1;
    poly([0, -22, -36, 46, 36, 46], '#141033');
    circ(0, -30, 19, '#141033');
    poly([-24, -40, 24, -40, 8 + sway, -76], '#141033'); // 구겨진 모자
    rrect(-28, -43, 56, 6, 3, '#241a52');
    circ(-7, -30, 3.4, '#ff7d8f');
    circ(7, -30, 3.4, '#ff7d8f');
    line(-9, -18, 9, -18, '#ff7d8f', 2); // 굳게 다문 입
    glyph('×', 0, 22, 22, '#6b5bd6');
    ctx.restore();
  }
  // 미루기의 문지기: 진보스의 방 앞을 막는 문. 시계 얼굴에 눈을 반쯤 감고 있다가, 강한 공격을 예고할 때 눈을 번쩍 뜹니다.
  function drawGate(f) {
    const sp = specOf(f);
    const wake = Math.sin(sp * Math.PI);
    const nod = Math.sin(S.t * 1.2) * 1.5 * (1 - wake);
    rrect(-34, -52 + nod, 68, 98, 10, '#2a2350'); // 문짝
    rrect(-28, -46 + nod, 56, 86, 7, '#3a3170');
    line(0, -46 + nod, 0, 40 + nod, '#2a2350', 3);
    circ(0, -14 + nod, 21, '#f6e7c1'); // 시계 얼굴
    circ(0, -14 + nod, 21 - 3, '#fff6dd');
    const hand = S.t * 0.25;
    line(0, -14 + nod, Math.sin(hand) * 12, -14 + nod - Math.cos(hand) * 12, '#2a2350', 2.5);
    line(0, -14 + nod, 8, -14 + nod, '#2a2350', 2.5);
    const lid = 2.6 * (1 - wake); // 감긴 정도
    for (const x of [-8, 8]) {
      circ(x, -19 + nod, 3.4, wake > 0.3 ? '#ff7d8f' : '#2a2350');
      rrect(x - 4.5, -23.5 + nod, 9, lid + 1.5, 1, '#fff6dd'); // 눈꺼풀
      line(x - 4.5, -22 + nod + lid, x + 4.5, -22 + nod + lid, '#2a2350', 1.6);
    }
    rrect(-5, 12 + nod, 10, 14, 3, '#ffc857'); // 자물쇠
    circ(0, 18 + nod, 2, '#2a2350');
    if (wake < 0.3) glyph('z', 30, -52 + Math.sin(S.t * 2) * 3, 16, '#a7ddff');
  }
  // 건너뛰는 토끼 (数学B 数列): 고유 동작은 한 칸을 건너뛰듯 높이 뛰기
  function drawHopper(f) {
    const hop = Math.sin(specOf(f) * Math.PI) * 26;
    const tilt = Math.sin(S.t * 2.2) * 2;
    ctx.save();
    ctx.translate(0, -hop);
    ell(-9 + tilt, -52, 6, 20, '#e9eef8'); // 귀
    ell(9 + tilt, -52, 6, 20, '#e9eef8');
    ell(-9 + tilt, -52, 2.5, 13, '#f2b6c4');
    ell(9 + tilt, -52, 2.5, 13, '#f2b6c4');
    ell(0, 20, 26, 24, '#e9eef8'); // 몸
    circ(0, -18, 19, '#f6f8fd'); // 머리
    eye(-7, -20, 3.4, false, '#1c2740', 0.7);
    eye(7, -20, 3.4, false, '#1c2740', 0.7);
    circ(0, -12, 2.4, '#f2b6c4');
    ell(-16, 42, 12, 6, '#d5dcec'); // 발
    ell(16, 42, 12, 6, '#d5dcec');
    glyph('+d', 0, 24, 15, '#5b6b96');
    ctx.restore();
  }
  // 곱절 버섯 (数学B 数列): 고유 동작은 갓이 두 배로 부풀기
  function drawShroom(f) {
    const puff = 1 + Math.sin(specOf(f) * Math.PI) * 0.45;
    rrect(-13, 0, 26, 46, 9, '#f3e6cf'); // 기둥
    eye(-6, 20, 3.2, false, '#1c2740', 0.2);
    eye(6, 20, 3.2, false, '#1c2740', 0.2);
    line(-4, 30, 4, 30, '#1c2740', 2);
    ctx.save();
    ctx.translate(0, 2);
    ctx.scale(puff, puff);
    ctx.fillStyle = C('#d9534f');
    ctx.beginPath();
    ctx.ellipse(0, 0, 40, 34, 0, Math.PI, 0); // 갓 (위쪽 반원)
    ctx.closePath();
    ctx.fill();
    circ(-18, -14, 6, '#ffe9e2');
    circ(12, -20, 7, '#ffe9e2');
    circ(24, -8, 4, '#ffe9e2');
    glyph('×2', -2, -8, 13, '#7a1f1c');
    ctx.restore();
  }
  // 화살표 까마귀 (数学C ベクトル): 고유 동작은 화살표를 반대로 뒤집기
  function drawCrow(f) {
    const sp = specOf(f);
    const flip = Math.cos(sp * Math.PI * 2) < 0 ? -1 : 1;
    const flap = Math.sin(S.t * 6) * 8;
    poly([-20, 0, -58, -22 - flap, -40, 12], '#2b2f4a'); // 날개
    poly([20, 0, 58, -22 - flap, 40, 12], '#2b2f4a');
    ell(0, 6, 24, 28, '#3a4066');
    circ(0, -26, 16, '#3a4066');
    poly([-5, -22, 5, -22, 0, -10], '#ffc857'); // 부리
    eye(-6, -29, 3.2, false, '#1c2740', 0.3);
    eye(6, -29, 3.2, false, '#1c2740', 0.3);
    line(-14 * flip, 14, 14 * flip, 14, '#ffc857', 3); // 화살표
    poly([14 * flip, 8, 14 * flip, 20, 24 * flip, 14], '#ffc857');
  }
  // 직각 사마귀 (数学C ベクトル): 고유 동작은 낫 두 개를 직각으로 치켜들기
  function drawMantis(f) {
    const up = Math.sin(specOf(f) * Math.PI) * 18;
    rrect(-8, -10, 16, 56, 7, '#5fbf6a'); // 몸
    poly([-16, -30, 16, -30, 0, -8], '#7ad685'); // 세모 머리
    eye(-8, -26, 3, false, '#1c2740', 0.5);
    eye(8, -26, 3, false, '#1c2740', 0.5);
    for (const dir of [-1, 1]) {
      line(dir * 8, 0, dir * 30, -6 - up, '#5fbf6a', 5);
      line(dir * 30, -6 - up, dir * 30, -36 - up, '#7ad685', 5); // 직각으로 꺾인 낫
      line(dir * 6, 40, dir * 22, 48, '#5fbf6a', 3);
    }
    ctx.strokeStyle = C('#d7ffd9');
    ctx.lineWidth = 1.5;
    ctx.strokeRect(30 - 8, -6 - up - 8, 8, 8); // 직각 표시
  }
  // 빙글 팽이 (数学C 複素数平面): 늘 돌고 있고, 고유 동작은 한 바퀴 크게 돌기
  function drawSpintop(f) {
    const turn = S.t * 5 + specOf(f) * Math.PI * 2;
    const wide = 30 * (0.75 + 0.25 * Math.abs(Math.cos(turn)));
    line(0, -44, 0, -24, '#c9d3ee', 4); // 꼭지
    poly([-wide, -24, wide, -24, 0, 44], '#7a6cf0');
    poly([-wide, -24, wide, -24, wide * 0.6, -6, -wide * 0.6, -6], '#9d92ff');
    line(-wide * 0.5 * Math.cos(turn), 6, wide * 0.5 * Math.cos(turn), 6, '#ffc857', 3);
    eye(-8, -15, 3, false, '#1c2740', 0.9);
    eye(8, -15, 3, false, '#1c2740', 0.9);
    glyph('×i', 0, 22, 12, '#eef0ff');
  }
  // 타원 알 (数学C 2次曲線): 고유 동작은 옆으로 길게 눌렸다 돌아오기
  function drawEgg(f) {
    const sq = Math.sin(specOf(f) * Math.PI) * 0.35;
    ctx.save();
    ctx.translate(0, 6);
    ctx.scale(1 + sq, 1 - sq);
    ell(0, 0, 30, 40, '#f6ecd4');
    ell(-8, -14, 9, 12, '#fffaf0');
    circ(-12, 6, 2.6, '#c9a26b'); // 두 초점
    circ(12, 6, 2.6, '#c9a26b');
    line(-12, 6, 12, 6, '#c9a26b', 1);
    eye(-9, -6, 3.4, false, '#1c2740', 0.1);
    eye(9, -6, 3.4, false, '#1c2740', 0.1);
    ctx.restore();
  }
  // 들쭉날쭉 고슴도치 (数学B 統計): 고유 동작은 가시를 길게 세우기
  function drawHedgehog(f) {
    const up = 1 + Math.sin(specOf(f) * Math.PI) * 0.6;
    for (let k = 0; k < 9; k++) {
      const a = Math.PI * (1.05 + (k / 8) * 0.9);
      const len = (30 + ((k * 7) % 5) * 4) * up; // 길이가 제각각인 가시
      line(Math.cos(a) * 20, 14 + Math.sin(a) * 16, Math.cos(a) * len * 1.2, 14 + Math.sin(a) * len, '#8a6a4a', 4);
    }
    ell(0, 20, 34, 24, '#b08a5e');
    ell(22, 26, 18, 14, '#e8cfa8'); // 얼굴
    circ(38, 26, 3.4, '#1c2740');
    eye(22, 20, 3, false, '#1c2740', 0.6);
    ell(-14, 42, 9, 4, '#8a6a4a');
    ell(12, 42, 9, 4, '#8a6a4a');
  }
  // 종 모양 해파리 (数学B 統計): 정규분포 곡선 모양의 갓. 고유 동작은 갓을 넓게 펴기
  function drawJelly(f) {
    const wide = 1 + Math.sin(specOf(f) * Math.PI) * 0.35;
    const bob = Math.sin(S.t * 2) * 4;
    ctx.fillStyle = C('#7fd6f0');
    ctx.beginPath();
    ctx.moveTo(-46 * wide, 6 + bob);
    ctx.bezierCurveTo(-20 * wide, 6 + bob, -16 * wide, -44 + bob, 0, -44 + bob); // 종 모양 곡선
    ctx.bezierCurveTo(16 * wide, -44 + bob, 20 * wide, 6 + bob, 46 * wide, 6 + bob);
    ctx.closePath();
    ctx.fill();
    for (let k = -2; k <= 2; k++) line(k * 9, 8 + bob, k * 9 + Math.sin(S.t * 3 + k) * 4, 40 + bob, '#a8e6f7', 3);
    eye(-8, -14 + bob, 3.2, false, '#1c2740', 0.4);
    eye(8, -14 + bob, 3.2, false, '#1c2740', 0.4);
    line(0, -44 + bob, 0, 6 + bob, '#e9fbff', 1);
  }
  // 계차 지네 (중간 보스, 数学B): 마디 사이가 점점 벌어집니다. 고유 동작은 몸을 길게 늘이기
  function drawCentipede(f) {
    const stretch = 1 + Math.sin(specOf(f) * Math.PI) * 0.5;
    let x = 24;
    for (let k = 5; k >= 1; k--) {
      const y = 28 + Math.sin(S.t * 3 + k) * 3;
      circ(x, y, 13 - k, '#c2603a');
      line(x, y + 8, x - 4, y + 20, '#7a3a22', 2);
      line(x, y + 8, x + 4, y + 20, '#7a3a22', 2);
      x += (4 + k * 2) * stretch; // 간격(계차)이 일정하게 늘어납니다
    }
    circ(-2, 14, 22, '#d9744a'); // 머리
    line(-12, -4, -22, -22, '#7a3a22', 3);
    line(6, -6, 12, -24, '#7a3a22', 3);
    eye(-10, 10, 4, true, '#1c2740', 0.2);
    eye(6, 10, 4, true, '#1c2740', 0.2);
    glyph('Σ', -2, 26, 13, '#ffe9d9');
  }
  // 표본 올빼미 (보스, 数学B): 고유 동작은 두 눈을 크게 뜨기
  function drawOwl(f) {
    const big = 1 + Math.sin(specOf(f) * Math.PI) * 0.5;
    poly([-46, -6, -70, 26, -40, 34], '#5a4a7a'); // 날개
    poly([46, -6, 70, 26, 40, 34], '#5a4a7a');
    ell(0, 10, 44, 46, '#6f5d96');
    ell(0, 22, 28, 30, '#d9cfee');
    poly([-34, -30, -22, -54, -10, -32], '#6f5d96'); // 귀깃
    poly([34, -30, 22, -54, 10, -32], '#6f5d96');
    for (const dir of [-1, 1]) {
      circ(dir * 16, -12, 13 * big, '#fff6dd');
      circ(dir * 16, -12, 6 * big, '#1c2740');
    }
    poly([-6, -2, 6, -2, 0, 10], '#ffc857');
    glyph('n', 0, 30, 16, '#5a4a7a');
  }
  // 내적 기사 (중간 보스, 数学C): 방패에 내적의 점. 고유 동작은 창을 직각으로 세우기
  function drawKnight(f) {
    const lift = Math.sin(specOf(f) * Math.PI);
    rrect(-20, -8, 40, 52, 8, '#8f9bb8'); // 갑옷
    circ(0, -26, 18, '#aab5d0'); // 투구
    rrect(-12, -30, 24, 6, 2, '#1c2740'); // 눈구멍
    poly([-4, -44, 4, -44, 0, -60], '#d9534f'); // 깃
    ctx.save();
    ctx.translate(26, 10);
    ctx.rotate(-lift * Math.PI / 2 + 0.5);
    line(0, 30, 0, -50, '#c9d3ee', 4);
    poly([-6, -50, 6, -50, 0, -66], '#ffc857');
    ctx.restore();
    poly([-44, -6, -12, -6, -12, 22, -28, 38, -44, 22], '#3a4a80'); // 방패
    circ(-28, 12, 5, '#ffc857');
  }
  // 복소수 회오리 (보스, 数学C): 소용돌이치는 바람. 고유 동작은 크게 부풀며 돌기
  function drawWhirl(f) {
    const grow = 1 + Math.sin(specOf(f) * Math.PI) * 0.3;
    for (let k = 0; k < 6; k++) {
      const y = -52 + k * 19;
      const w = (46 - k * 6) * grow;
      const shift = Math.sin(S.t * 4 + k * 0.9) * 8;
      ell(shift, y, w, 10, k % 2 ? '#7a8cf0' : '#9fb0ff');
    }
    eye(-12, -34, 5, true, '#1c2740', 0.3);
    eye(12, -34, 5, true, '#1c2740', 0.3);
    glyph('zⁿ', 0, -8, 16, '#eef0ff');
  }
  const FOE_DRAW = {
    shadow: drawShadow, gate: drawGate, hopper: drawHopper, shroom: drawShroom,
    crow: drawCrow, mantis: drawMantis, spintop: drawSpintop, egg: drawEgg, hedgehog: drawHedgehog, jelly: drawJelly,
    centipede: drawCentipede, owl: drawOwl, knight: drawKnight, whirl: drawWhirl,
    ruler: drawRuler, target: drawTarget, pendulum: drawPendulum, wave: drawWave, sprout: drawSprout, logger: drawLogger,
    skater: drawSkater, bucket: drawBucket, sphinx: drawSphinx, hydra: drawHydra,
    imp: drawImp, mirror: drawMirror,
    pascal: drawPascal, saw: drawSaw,
    twins: drawTwins, bat: drawBat, golem: drawGolem, thief: drawThief, tower: drawTower,
    crab: drawCrab, slime: drawSlime, ghost: drawGhost, bars: drawBars,
    magician: drawMagician, giant: drawGiant, dragon: drawDragon,
    dice: drawDice, compass: drawCompass,
    scales: drawScales, warden: drawWarden, mouse: drawMouse,
    lock: drawLock, gear: drawGear,
  };

  // ---- 그림 파일로 바꾸기 ----
  // 직접 그린 그림(PNG 등)이 있으면 도형 대신 그 그림을 씁니다. 목록은 art/art.json 에 적습니다. (방법은 art/README.md)
  // 움직임(흔들림, 돌진, 맞았을 때의 떨림, 쓰러짐)은 그림에도 똑같이 적용됩니다.
  const ART = { hero: null, foes: {} };
  function load(entry) {
    if (!entry) return null;
    const spec = typeof entry === 'string' ? { file: entry } : entry;
    if (!spec.file) return null;
    const art = { img: new Image(), ready: false, scale: spec.scale || 1, dy: spec.dy || 0 };
    art.img.onload = () => { art.ready = true; };
    art.img.src = `./art/${spec.file}`;
    return art;
  }
  // 그림을 발밑(base) 기준으로 높이 size 에 맞춰 그립니다. 그림이 아직 없거나 못 불러왔으면 false (도형으로 그립니다)
  function sprite(art, base, size) {
    if (!art || !art.ready || !art.img.naturalWidth) return false;
    const h = size * art.scale;
    const w = (h * art.img.naturalWidth) / art.img.naturalHeight;
    ctx.drawImage(art.img, -w / 2, base - h + art.dy, w, h);
    if (flash) { // 맞은 순간: 그림 위에 같은 그림을 밝게 한 번 더 얹어 번쩍이게 합니다
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(art.img, -w / 2, base - h + art.dy, w, h);
      ctx.restore();
    }
    return true;
  }
  function drawFoe(kind, f) {
    if (!sprite(ART.foes[kind], 62, 124)) (FOE_DRAW[kind] || drawTwins)(f);
  }

  // 대기·공격·피격을 위치와 크기로 바꾼 값
  function pose(actor, dirX, dirY, amp, phase) {
    const p = { ox: 0, oy: 0, sx: 1, sy: 1, a: 1 };
    if (S.idle) {
      const w = Math.sin(S.t * 2.2 + phase);
      p.oy += w * amp;
      p.sy *= 1 + w * 0.03;
      p.sx *= 1 - w * 0.02;
    }
    if (actor.lunge > 0) {
      const k = Math.sin((1 - actor.lunge) * Math.PI);
      p.ox += k * dirX;
      p.oy += k * dirY;
    }
    if (actor.hit > 0) p.ox += Math.sin(actor.hit * 42) * 7 * actor.hit;
    return p;
  }

  function draw() {
    const h = S.hero;
    const f = S.foe;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (S.shake > 0) ctx.translate((Math.random() - 0.5) * S.shake, (Math.random() - 0.5) * S.shake);

    ctx.fillStyle = '#14224a';
    ctx.fillRect(-10, -10, W + 20, H + 20);
    // 문제가 길면 싸우는 그림의 칸이 낮아져 위아래가 잘립니다 (CSS 의 object-fit: cover).
    // 캐릭터의 모자나 키 큰 적의 머리가 잘리지 않도록, 보이는 띠 안에 다 들어가게 장면을 줄여서 그립니다.
    const boxW = canvas.clientWidth;
    const boxH = canvas.clientHeight;
    let roof = 0; // 보이는 범위의 위쪽 끝 (그림 좌표). 떠오르는 숫자와 글이 이 위로 잘려 나가지 않게 합니다.
    if (boxW > 0 && boxH > 0) {
      const seen = boxH / (boxW / W); // 보이는 높이 (그림 좌표)
      const need = BAND[1] - BAND[0];
      if (seen < need) roof = BAND[0];
      else if (seen < H) roof = (H - seen) * 0.62;
      if (seen < need) {
        const top = (H - seen) * 0.62; // style.css 의 object-position: 50% 62% 와 같은 값
        const zoom = seen / need;
        ctx.translate(W / 2, top);
        ctx.scale(zoom, zoom);
        ctx.translate(-W / 2, -BAND[0]);
      }
    }
    for (let i = 0; i < stars.length; i++) {
      const st = stars[i];
      ctx.fillStyle = `rgba(167,221,255,${0.35 + 0.25 * Math.sin(S.t * 1.5 + i)})`;
      ctx.fillRect(st[0], st[1], st[2], st[2]);
    }
    ctx.fillStyle = '#1b2d5c';
    ctx.fillRect(20, 110, 26, 90);
    ctx.fillRect(150, 86, 22, 114);
    ctx.fillRect(316, 122, 30, 78);
    poly([20, 110, 33, 92, 46, 110], '#1b2d5c');
    poly([150, 86, 161, 68, 172, 86], '#1b2d5c');
    poly([316, 122, 331, 104, 346, 122], '#1b2d5c');
    ctx.fillStyle = '#0f1a3a';
    ctx.fillRect(-W, 190, W * 3, 60); // 장면을 줄여 그릴 때도 땅이 양옆 끝까지 이어지게 넓게 칠합니다

    ell(h.x, h.y + 50, 34, 6, '#0b1430');
    if (!f.gone) ell(f.x, 180, 44, 7, '#0b1430');

    if (h.lunge > 0.3 && h.lunge < 0.75) {
      ctx.save();
      ctx.setLineDash([6, 6]);
      line(h.x + 70, h.y - 40, f.x - 30, f.y, '#ffc857', 2);
      ctx.restore();
    }

    const ph = pose(h, 78, -24, 3, 0);
    if (h.down) {
      ph.sy *= 0.55;
      ph.a = 0.6;
    }
    ctx.save();
    ctx.globalAlpha = ph.a;
    ctx.translate(h.x + ph.ox, h.y + ph.oy + 46);
    ctx.scale(ph.sx, ph.sy);
    ctx.translate(0, -46);
    flash = h.hit > 0.6;
    if (!sprite(ART.hero, 50, 124)) drawHero();
    flash = false;
    ctx.restore();

    if (S.guard > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, S.guard * 1.5);
      ctx.strokeStyle = '#2fd9b9';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(h.x + 20, h.y, 62, -1.1, 1.1);
      ctx.stroke();
      ctx.restore();
    }

    if (!f.gone) {
      const pf = pose(f, -84, 30, S.kind === 'bat' ? 7 : 4, 1.3);
      if (f.dead > 0) {
        const p = 1 - f.dead;
        pf.sy *= 1 - 0.8 * p;
        pf.sx *= 1 + 0.3 * p;
        pf.a = 1 - p;
      } else if (f.spawn > 0) {
        pf.a = 1 - f.spawn;
        pf.sy *= 0.6 + 0.4 * (1 - f.spawn);
      }
      ctx.save();
      ctx.globalAlpha = Math.max(0, pf.a);
      ctx.translate(f.x + pf.ox, f.y + pf.oy + 45);
      ctx.scale(pf.sx, pf.sy);
      ctx.translate(0, -45);
      flash = f.hit > 0.6;
      drawFoe(S.kind, f);
      flash = false;
      ctx.restore();
    }

    for (const p of S.parts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.r, p.r);
    }
    // 베는 자국: 가운데가 굵고 양 끝이 가는 흰 선이 순식간에 그어졌다 사라집니다.
    for (const s of S.slashes) {
      const grow = Math.min(1, (1 - s.life) * 3.2);
      ctx.globalAlpha = Math.min(1, s.life * 1.6);
      for (const dir of s.cross ? [1, -1] : [1]) {
        const len = 46 * grow;
        ctx.strokeStyle = '#ffffff';
        ctx.lineCap = 'round';
        ctx.lineWidth = 7 * s.life + 1;
        ctx.beginPath();
        ctx.moveTo(s.x - len * dir, s.y - len * 0.8);
        ctx.lineTo(s.x + len * dir, s.y + len * 0.8);
        ctx.stroke();
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2.5 * s.life + 0.5;
        ctx.stroke();
      }
    }
    for (const r of S.rings) {
      ctx.globalAlpha = Math.max(0, r.life) * 0.8;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 4 * r.life + 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 14 + (1 - r.life) * 52, 0, 6.2832);
      ctx.stroke();
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const n of S.nums) {
      const pop = n.age < 0.16 ? 1.7 - (n.age / 0.16) * 0.7 : 1; // 처음에 크게 튀어나옴
      ctx.font = `900 ${Math.round(n.size * pop)}px system-ui, sans-serif`;
      ctx.globalAlpha = Math.min(1, n.life * 3);
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#0b1430';
      const y = Math.max(n.y, roof + n.size * pop * 0.62);
      ctx.strokeText(n.text, n.x, y);
      ctx.fillStyle = n.color;
      ctx.fillText(n.text, n.x, y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  let last = 0;
  function loop(ts) {
    if (!last) last = ts;
    const dt = Math.min(0.033, (ts - last) / 1000);
    last = ts;
    // 전투 화면이 아닐 때는 아무것도 하지 않습니다. (배터리와 다른 화면의 속도를 위해)
    if (!canvas.closest('[hidden]')) {
      update(dt);
      if (canvas.clientHeight !== 0 || !canvas.isConnected) draw(); // 높이 0 으로 접혀 있으면 그리기만 건너뜁니다.
    }
    requestAnimationFrame(loop);
  }
  draw();
  requestAnimationFrame(loop);

  // ---- 전투 규칙(battle.js)이 부르는 동작 ----
  return {
    // 새 적 등장
    setFoe(kind) {
      S.kind = kind;
      Object.assign(S.foe, { lunge: 0, hit: 0, dead: 0, gone: false, spawn: 1, spec: 0, flag: false });
    },
    // 주인공의 모습을 바꿉니다 (js/heroes.js 의 id)
    setHero(look) {
      S.look = look;
    },
    heroUp() {
      S.hero.down = false;
    },
    heroDown() {
      S.hero.down = true;
    },
    // 정답: 주인공이 공격
    // tag: 숫자 위에 덧붙이는 짧은 말 (예: "약점!")
    heroAttack(text, strong, done, tag = '') {
      S.hero.lunge = 1;
      after(0.2, () => {
        S.foe.hit = 1;
        S.shake = strong ? 11 : 6;
        slash(S.foe.x, S.foe.y, '#8ff0ff', false);
        if (strong) ring(S.foe.x, S.foe.y, '#ffc857');
        burst(S.foe.x, S.foe.y, '#8ff0ff', strong ? 28 : 16);
        num(S.foe.x, S.foe.y - 56, text, '#ffc857', strong ? 34 : 26);
        if (tag) num(S.foe.x, S.foe.y - 86, tag, '#ff9db0', 15);
      });
      after(0.6, done);
    },
    // 오답: 공격이 빗나감
    heroMiss(text, done) {
      S.hero.hit = 0.5;
      num(S.foe.x, S.foe.y - 58, text, '#a9c0e6');
      after(0.6, done);
    },
    // 필살기
    heroUlt(text, done) {
      S.hero.lunge = 1;
      after(0.2, () => {
        S.foe.hit = 1;
        S.shake = 15;
        slash(S.foe.x, S.foe.y, '#ffc857', true);
        ring(S.foe.x, S.foe.y, '#ffc857');
        after(0.12, () => ring(S.foe.x, S.foe.y, '#8ff0ff'));
        burst(S.foe.x, S.foe.y, '#ffc857', 36);
        burst(S.foe.x, S.foe.y, '#8ff0ff', 24);
        num(S.foe.x, S.foe.y - 58, text, '#ffc857', 40);
      });
      after(0.75, done);
    },
    // 적의 공격. guarded 이면 방어막이 보입니다.
    foeAttack(text, guarded, done) {
      S.foe.lunge = 1;
      if (guarded) S.guard = 1;
      after(0.2, () => {
        S.hero.hit = guarded ? 0.5 : 1;
        S.shake = guarded ? 3 : 8;
        burst(S.hero.x, S.hero.y - 10, guarded ? '#2fd9b9' : '#ff7d8f', guarded ? 8 : 16);
        if (guarded) ring(S.hero.x + 10, S.hero.y - 10, '#2fd9b9');
        else slash(S.hero.x, S.hero.y - 6, '#ff7d8f', false);
        num(S.hero.x, S.hero.y - 80, text, guarded ? '#2fd9b9' : '#ff7d8f', guarded ? 20 : 28);
      });
      after(0.65, done);
    },
    // 몬스터 고유 동작 (강한 공격 예고에 씁니다)
    foeSpecial() {
      if (!S.foe.gone && S.foe.dead === 0) S.foe.spec = 1;
    },
    // 적이 쓰러짐
    // 적이 쓰러짐. text: 떠오르는 글("격파!"), big: 중간 보스·보스의 더 큰 연출
    foeDefeat(done, text = '', big = false) {
      S.foe.dead = 1;
      S.shake = big ? 16 : 9;
      slash(S.foe.x, S.foe.y, '#ffc857', true);
      ring(S.foe.x, S.foe.y, '#ffffff');
      after(0.12, () => {
        burst(S.foe.x, S.foe.y, '#ffc857', big ? 46 : 34);
        burst(S.foe.x, S.foe.y, '#eef6ff', 16);
        ring(S.foe.x, S.foe.y, '#ffc857');
        if (text) num(S.foe.x, S.foe.y - 62, text, '#ffc857', big ? 34 : 26);
      });
      if (big) {
        // 큰 적은 여기저기서 연달아 터집니다.
        for (let i = 1; i <= 4; i++) {
          after(0.15 + i * 0.16, () => {
            const x = S.foe.x + (Math.random() - 0.5) * 90;
            const y = S.foe.y + (Math.random() - 0.5) * 70;
            burst(x, y, i % 2 ? '#8ff0ff' : '#ff9db0', 22);
            ring(x, y, i % 2 ? '#8ff0ff' : '#ff9db0');
            S.shake = 10;
          });
        }
      }
      after(big ? 1.35 : 0.95, done);
    },
    // 그림 파일 목록을 받습니다. { hero: 파일, monsters: { 몬스터 id: 파일 } } (art/art.json)
    setArt(manifest) {
      ART.hero = load(manifest && manifest.hero);
      ART.foes = {};
      for (const [id, entry] of Object.entries((manifest && manifest.monsters) || {})) ART.foes[id] = load(entry);
    },
    // 설정의 "연출 줄이기": 가만히 있을 때의 흔들림을 끕니다.
    setCalm(value) {
      S.idle = !(value || calm);
    },
    // 도감용 얼굴 그림: 그 몬스터만 그려서 작은 그림(data URL)으로 돌려줍니다.
    // plain 이면 배경과 그림자 없이(투명 배경) 그립니다. 그림 그리는 사람에게 줄 참고 그림을 뽑을 때 씁니다.
    portrait(kind, plain = false) {
      try {
        const dpr = canvas.width / W;
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        if (!plain) {
          ctx.fillStyle = '#14224a';
          ctx.fillRect(0, 0, W, H);
        }
        if (!plain) ell(264, 176, 40, 6, '#0b1430');
        const calm = { x: 264, y: 112, lunge: 0, hit: 0, dead: 0, gone: false, spawn: 0, spec: 0, flag: false };
        ctx.translate(calm.x, calm.y);
        if (kind === 'hero') {
          ctx.translate(0, 8);
          if (!sprite(ART.hero, 50, 124)) drawHero();
        } else {
          drawFoe(kind, calm);
        }
        ctx.restore();
        const size = 120;
        const off = document.createElement('canvas');
        off.width = size * 2;
        off.height = size * 2;
        off.getContext('2d').drawImage(canvas, (264 - 66) * dpr, (112 - 76) * dpr, 132 * dpr, 132 * dpr, 0, 0, size * 2, size * 2);
        const url = off.toDataURL('image/png');
        draw();
        return url || '';
      } catch (e) {
        return '';
      }
    },
  };
}
