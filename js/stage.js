// 전투 무대: 캐릭터를 도형으로 그리고, 숫자를 시간에 따라 바꿔 움직입니다.
// 이미지 파일을 쓰지 않습니다. 새 몬스터는 draw 함수 하나를 추가하면 됩니다.
const W = 360;
const H = 230;

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
  function drawHero() {
    line(-36, -34, -36, 44, '#ffd24a', 3);
    circ(-36, -38, 5, '#f2a13b');
    ell(-10, 46, 9, 4, '#1e8f80');
    ell(10, 46, 9, 4, '#1e8f80');
    poly([0, -18, -30, 44, 30, 44], '#2bb8a3');
    poly([0, -4, -8, 14, 8, 14], '#e9fbf7');
    line(20, 16, 34, 20, '#ffd9a8', 5);
    ctx.fillStyle = C('#fff2c2');
    ctx.strokeStyle = C('#f2a13b');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(50, 22, 20, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    line(50, 22, 62, 8, '#e5484d', 1.5);
    circ(0, -26, 16, '#ffd9a8');
    poly([-20, -36, 20, -36, 6, -62], '#f2a13b');
    rrect(-24, -38, 48, 5, 2, '#d9822b');
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
  const FOE_DRAW = {
    twins: drawTwins, bat: drawBat, golem: drawGolem, thief: drawThief, tower: drawTower,
    crab: drawCrab, slime: drawSlime, ghost: drawGhost, bars: drawBars,
    magician: drawMagician, giant: drawGiant, dragon: drawDragon,
    dice: drawDice, compass: drawCompass,
    scales: drawScales, warden: drawWarden, mouse: drawMouse,
    lock: drawLock, gear: drawGear,
  };

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
    ctx.fillRect(-10, 190, W + 20, 60);

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
    drawHero();
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
      (FOE_DRAW[S.kind] || drawTwins)(f);
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
      ctx.strokeText(n.text, n.x, n.y);
      ctx.fillStyle = n.color;
      ctx.fillText(n.text, n.x, n.y);
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
    // 설정의 "연출 줄이기": 가만히 있을 때의 흔들림을 끕니다.
    setCalm(value) {
      S.idle = !(value || calm);
    },
    // 도감용 얼굴 그림: 그 몬스터만 그려서 작은 그림(data URL)으로 돌려줍니다.
    portrait(kind) {
      try {
        const dpr = canvas.width / W;
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#14224a';
        ctx.fillRect(0, 0, W, H);
        ell(264, 176, 40, 6, '#0b1430');
        const calm = { x: 264, y: 112, lunge: 0, hit: 0, dead: 0, gone: false, spawn: 0, spec: 0, flag: false };
        ctx.translate(calm.x, calm.y);
        (FOE_DRAW[kind] || drawTwins)(calm);
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
