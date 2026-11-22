// 문제에 붙는 그림. 문제의 숫자를 읽어 자동으로 그립니다.
// 단원 파일의 틀에 "figure" 를 적으면 그 문제들에 그림이 붙습니다.
//
//   "figure": { "kind": "triangle", "angle": "θ", "opp": "{a}", "adj": "{b}", "hyp": "{c}" }
//
// kind 는 아래와 같습니다. (数学A 와 공간도형용 그림은 파일 아래쪽 설명을 보세요) 빈 글("")을 적은 자리에는 아무것도 표시하지 않습니다.
//   triangle  직각삼각형   angle 각 · opp 맞은편 변 · adj 이웃 변 · hyp 빗변
//   tower     탑 하나      angle 올려본 각 · dist 수평거리 · height 높이
//   twopoint  탑과 두 지점 far 먼 지점의 각 · near 가까운 지점의 각 · gap 두 지점 사이 · height 높이
//   anytri    삼각형 ABC   angleA·angleB·angleC 각 · sideA·sideB·sideC 변 (a 는 A 와 마주 보는 변)
//             변은 "b = 7" 처럼 이름이 자동으로 붙습니다. 값만 적으세요.
// 그림은 길이의 비율이 정확하지 않은 약도입니다.
import { fill } from './i18n.js';

const INK = '#eef6ff';
const LINE = '#8fb4ff';
const DIM = '#5c78b5';
const ASK = '#ffc857'; // 구해야 하는 값("?")의 색

function esc(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function label(x, y, text, anchor = 'middle') {
  if (!text) return '';
  const ask = String(text).includes('?');
  if (!ask) return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="14" font-weight="600" fill="${INK}">${esc(text)}</text>`;
  // 구해야 하는 값은 노란 테두리의 이름표로 눈에 띄게 합니다. 예: "a = ?"
  const width = String(text).length * 9 + 16;
  const left = anchor === 'start' ? x - 8 : anchor === 'end' ? x - width + 8 : x - width / 2;
  return `<rect x="${left}" y="${y - 17}" width="${width}" height="24" rx="8" fill="#3a2f10" stroke="${ASK}" stroke-width="1.5"/>` +
    `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="17" font-weight="800" fill="${ASK}">${esc(text)}</text>`;
}

const frame = (inner, height = 152) =>
  `<svg viewBox="0 0 326 ${height}" xmlns="http://www.w3.org/2000/svg" fill="none" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

// ---- 도형을 그리는 작은 도구 (점은 [x, y]) ----
const r1 = (n) => Math.round(n * 10) / 10;
const seg = (p, q, color = LINE, width = 2.5, dash = '') =>
  `<path d="M${r1(p[0])} ${r1(p[1])} L${r1(q[0])} ${r1(q[1])}" stroke="${color}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
const shape = (pts, color = LINE, width = 2.5) =>
  `<path d="M${pts.map((p) => `${r1(p[0])} ${r1(p[1])}`).join(' L')} Z" stroke="${color}" stroke-width="${width}"/>`;
const ring = (c, r, color = LINE) => `<circle cx="${c[0]}" cy="${c[1]}" r="${r}" stroke="${color}" stroke-width="2.5"/>`;
const dot = (p, color = INK) => `<circle cx="${r1(p[0])}" cy="${r1(p[1])}" r="3.5" fill="${color}"/>`;
const unit = (from, to) => {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
  return [(to[0] - from[0]) / len, (to[1] - from[1]) / len];
};
const along = (from, to, dist) => {
  const [ux, uy] = unit(from, to);
  return [from[0] + ux * dist, from[1] + uy * dist];
};
const between = (p, q, k = 0.5) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
const onCircle = (c, r, deg) => [c[0] + r * Math.cos((deg * Math.PI) / 180), c[1] + r * Math.sin((deg * Math.PI) / 180)];
// 꼭짓점 v 에서 p 쪽 변과 q 쪽 변 사이의 각을 나타내는 작은 호
function arc(v, p, q, r = 18, color = ASK) {
  const a = along(v, p, r);
  const b = along(v, q, r);
  const cross = (a[0] - v[0]) * (b[1] - v[1]) - (a[1] - v[1]) * (b[0] - v[0]);
  return `<path d="M${r1(a[0])} ${r1(a[1])} A${r} ${r} 0 0 ${cross > 0 ? 1 : 0} ${r1(b[0])} ${r1(b[1])}" stroke="${color}" stroke-width="2"/>`;
}
// 각 안쪽(두 변의 가운데 방향)으로 dist 만큼 들어간 점
function inside(v, p, q, dist) {
  const [ax, ay] = unit(v, p);
  const [bx, by] = unit(v, q);
  return along(v, [v[0] + ax + bx, v[1] + ay + by], dist);
}
// 꼭짓점 이름 (도형의 중심 반대쪽에 작게 적습니다)
function vertex(p, name, center, dist = 13) {
  const [x, y] = along(p, center, -dist);
  return `<text x="${r1(x)}" y="${r1(y + 5)}" text-anchor="middle" font-size="13" font-weight="700" fill="${DIM}">${name}</text>`;
}
// 글의 가운데가 [x, y] 근처에 오도록 적습니다. side 가 -1 이면 글의 끝을, 1 이면 처음을 맞춥니다.
const tag = (p, text, side = 0) => label(r1(p[0]), r1(p[1] + 5), text, side < 0 ? 'end' : side > 0 ? 'start' : 'middle');
// 선분 pq 의 가운데에서 수직으로 off 만큼 떨어진 점 (off 의 부호로 어느 쪽인지 정합니다)
function beside(p, q, off, k = 0.5) {
  const [ux, uy] = unit(p, q);
  const m = between(p, q, k);
  return [m[0] - uy * off, m[1] + ux * off];
}

const DRAW = {
  // θ 는 왼쪽 아래, 직각은 오른쪽 아래
  triangle(L) {
    return frame(
      `<path d="M40 125 L240 125 L240 25 Z" stroke="${LINE}" stroke-width="2.5"/>` +
      `<path d="M228 125 L228 113 L240 113" stroke="${LINE}" stroke-width="1.5"/>` +
      `<path d="M68 125 A28 28 0 0 0 65 112.5" stroke="${ASK}" stroke-width="2"/>` +
      label(76, 119, L.angle, 'start') +
      label(140, 144, L.adj) +
      label(250, 80, L.opp, 'start') +
      label(128, 62, L.hyp, 'end')
    );
  },
  tower(L) {
    return frame(
      `<path d="M16 128 L284 128" stroke="${DIM}" stroke-width="2"/>` +
      `<rect x="226" y="28" width="20" height="100" fill="#2a3a66" stroke="${LINE}" stroke-width="2"/>` +
      `<path d="M40 128 L236 28" stroke="${LINE}" stroke-width="2" stroke-dasharray="6 5"/>` +
      `<circle cx="40" cy="128" r="4" fill="${INK}"/>` +
      `<path d="M72 128 A32 32 0 0 0 68.5 113.5" stroke="${ASK}" stroke-width="2"/>` +
      label(80, 122, L.angle, 'start') +
      label(134, 147, L.dist) +
      label(254, 84, L.height, 'start')
    );
  },
  twopoint(L) {
    return frame(
      `<path d="M10 128 L290 128" stroke="${DIM}" stroke-width="2"/>` +
      `<rect x="236" y="28" width="20" height="100" fill="#2a3a66" stroke="${LINE}" stroke-width="2"/>` +
      `<path d="M30 128 L246 28" stroke="${LINE}" stroke-width="2" stroke-dasharray="6 5"/>` +
      `<path d="M130 128 L246 28" stroke="${LINE}" stroke-width="2" stroke-dasharray="6 5"/>` +
      `<circle cx="30" cy="128" r="4" fill="${INK}"/>` +
      `<circle cx="130" cy="128" r="4" fill="${INK}"/>` +
      `<path d="M60 128 A30 30 0 0 0 57.2 115.4" stroke="${ASK}" stroke-width="2"/>` +
      `<path d="M154 128 A24 24 0 0 0 148.2 112.3" stroke="${ASK}" stroke-width="2"/>` +
      label(66, 123, L.far, 'start') +
      label(160, 121, L.near, 'start') +
      `<path d="M30 136 L30 142 M130 136 L130 142 M30 139 L130 139" stroke="${DIM}" stroke-width="1.5"/>` +
      label(80, 151, L.gap) +
      label(264, 84, L.height, 'start')
    );
  },
  // 변 a 는 BC, b 는 CA, c 는 AB.
  // 적힌 각이 둔각이면 그 꼭짓점이 실제로 벌어져 보이도록 모양을 바꿉니다.
  // 각을 묻는 문제("?")에서는 모양으로 답이 드러나지 않게 기본 모양을 씁니다.
  anytri(L) {
    let P = { A: [45, 122], B: [262, 122], C: [182, 32] };
    if (parseFloat(L.angleA) > 90) P = { A: [120, 122], B: [268, 122], C: [48, 38] };
    else if (parseFloat(L.angleB) > 90) P = { A: [32, 122], B: [180, 122], C: [252, 38] };
    const G = [(P.A[0] + P.B[0] + P.C[0]) / 3, (P.A[1] + P.B[1] + P.C[1]) / 3];
    // from 에서 to 방향으로 dist 만큼 옮긴 점 (dist 가 음수이면 반대 방향)
    const move = (from, to, dist) => {
      const dx = to[0] - from[0];
      const dy = to[1] - from[1];
      const len = Math.hypot(dx, dy) || 1;
      return [Math.round(from[0] + (dx / len) * dist), Math.round(from[1] + (dy / len) * dist) + 5];
    };
    const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    const corner = (p, text) => {
      const [x, y] = move(p, G, -13);
      return `<text x="${x}" y="${y}" text-anchor="middle" font-size="13" font-weight="700" fill="${DIM}">${text}</text>`;
    };
    // 변에는 이름을 붙여 적습니다. ("7" → "b = 7", "?" → "a = ?") 묻는 각도 "A = ?" 로 적습니다.
    const named = (name, text) => (text ? `${name} = ${text}` : '');
    // 묻는 각은 꼭짓점에서 조금 더 안쪽에 적어 변과 겹치지 않게 합니다.
    const angle = (p, name, text) => label(...move(p, G, text === '?' ? 80 : 30), text === '?' ? named(name, text) : text);
    // 변의 이름표는 삼각형 바깥쪽에 둡니다. 바깥이 왼쪽이면 글의 끝을, 오른쪽이면 글의 처음을 변에 맞춥니다.
    const side = (p, q, name, text) => {
      if (!text) return '';
      const [mx, my] = mid(p, q);
      const len = Math.hypot(mx - G[0], my - G[1]) || 1;
      const ux = (mx - G[0]) / len;
      const uy = (my - G[1]) / len;
      const anchor = ux > 0.3 ? 'start' : ux < -0.3 ? 'end' : 'middle';
      const gap = text === '?' ? 16 : 10;
      const y = my + uy * gap + (uy > 0.3 ? 14 : uy < -0.3 ? -2 : 5);
      return label(Math.round(mx + ux * gap), Math.round(y), named(name, text), anchor);
    };
    return frame(
      `<path d="M${P.A[0]} ${P.A[1]} L${P.B[0]} ${P.B[1]} L${P.C[0]} ${P.C[1]} Z" stroke="${LINE}" stroke-width="2.5"/>` +
      corner(P.A, 'A') + corner(P.B, 'B') + corner(P.C, 'C') +
      angle(P.A, 'A', L.angleA) + angle(P.B, 'B', L.angleB) + angle(P.C, 'C', L.angleC) +
      side(P.B, P.C, 'a', L.sideA) + side(P.C, P.A, 'b', L.sideB) + side(P.A, P.B, 'c', L.sideC)
    );
  },
};

// ---------- 数学A 図形の性質 · 空間図形 ----------
Object.assign(DRAW, {
  // 각의 이등분선: ab, ac, bc 는 변의 길이, bd 는 BD
  bisect(L) {
    const A = [150, 24];
    const B = [40, 126];
    const C = [286, 126];
    const D = [142, 126];
    const G = [159, 92];
    return frame(
      shape([A, B, C]) + seg(A, D, ASK, 2) +
      arc(A, B, D, 22) + arc(A, D, C, 26) +
      vertex(A, 'A', G) + vertex(B, 'B', G) + vertex(C, 'C', G) + vertex(D, 'D', [D[0], 0], 15) +
      tag(beside(A, B, 12), L.ab, -1) + tag(beside(A, C, -12), L.ac, 1) +
      tag([91, 147], L.bd) + tag([228, 147], L.bc),
      164,
    );
  },
  // 중선과 무게중심: am 은 AM, ag 는 AG
  median(L) {
    const A = [150, 24];
    const B = [40, 126];
    const C = [286, 126];
    const M = between(B, C);
    const G = between(A, M, 2 / 3);
    const tick = (p) => seg([p[0], p[1] - 5], [p[0], p[1] + 5], INK, 1.5);
    return frame(
      shape([A, B, C]) + seg(A, M, ASK, 2) + dot(G) +
      tick(between(B, M)) + tick(between(M, C)) +
      vertex(A, 'A', G) + vertex(B, 'B', G) + vertex(C, 'C', G) + vertex(M, 'M', [M[0], 0], 15) +
      `<text x="${r1(G[0] + 12)}" y="${r1(G[1] + 5)}" text-anchor="start" font-size="13" font-weight="700" fill="${DIM}">G</text>` +
      tag([98, 44], L.ag, -1) + tag([246, 147], L.am),
      164,
    );
  },
  // 원주각과 중심각. names 는 "위, 왼쪽, 오른쪽" 점의 이름. chord 가 있으면 아래 현도 그립니다. (외심 그림)
  circleangle(L) {
    const O = [163, 92];
    const R = 74;
    const P = onCircle(O, R, 262);
    const A = onCircle(O, R, 142);
    const B = onCircle(O, R, 38);
    const [top, left, right] = (L.names || 'P,A,B').split(',');
    return frame(
      ring(O, R) + seg(P, A) + seg(P, B) + seg(O, A, ASK, 2) + seg(O, B, ASK, 2) +
      (L.chord ? seg(A, B) : '') + dot(O) +
      arc(P, A, B, 20) + arc(O, A, B, 16) +
      vertex(P, top, O) + vertex(A, left, O) + vertex(B, right, O) +
      `<text x="${O[0] + 12}" y="${O[1] - 4}" text-anchor="start" font-size="13" font-weight="700" fill="${DIM}">O</text>` +
      tag(inside(P, A, B, 46), L.insc) + tag([O[0], O[1] + 32], L.central),
      184,
    );
  },
  // 내심: angleA 는 ∠A, bic 는 ∠BIC
  incenter(L) {
    const A = [150, 22];
    const B = [36, 140];
    const C = [290, 140];
    const a = Math.hypot(B[0] - C[0], B[1] - C[1]);
    const b = Math.hypot(A[0] - C[0], A[1] - C[1]);
    const c = Math.hypot(A[0] - B[0], A[1] - B[1]);
    const I = [(a * A[0] + b * B[0] + c * C[0]) / (a + b + c), (a * A[1] + b * B[1] + c * C[1]) / (a + b + c)];
    return frame(
      shape([A, B, C]) + seg(B, I, ASK, 2) + seg(C, I, ASK, 2) + dot(I) +
      arc(A, B, C, 20) + arc(I, B, C, 14) +
      vertex(A, 'A', I) + vertex(B, 'B', I) + vertex(C, 'C', I) + `<text x="${r1(I[0] + 14)}" y="${r1(I[1] - 6)}" text-anchor="start" font-size="13" font-weight="700" fill="${DIM}">I</text>` +
      tag(inside(A, B, C, 38), L.angleA) + tag([I[0], I[1] + 22], L.bic),
      164,
    );
  },
  // 원에 내접하는 사각형: angleA, angleC
  cyclic(L) {
    const O = [163, 92];
    const R = 74;
    const A = onCircle(O, R, 205);
    const B = onCircle(O, R, 118);
    const C = onCircle(O, R, 22);
    const D = onCircle(O, R, 300);
    return frame(
      ring(O, R) + shape([A, B, C, D]) + arc(A, B, D, 18) + arc(C, B, D, 18) +
      vertex(A, 'A', O) + vertex(B, 'B', O) + vertex(C, 'C', O) + vertex(D, 'D', O) +
      tag(inside(A, B, D, 36), L.angleA) + tag(inside(C, B, D, 38), L.angleC),
      184,
    );
  },
  // 두 현이 원 안에서 만날 때: pa, pb, pc, pd
  chords(L) {
    const O = [163, 92];
    const R = 74;
    const A = onCircle(O, R, 200);
    const B = onCircle(O, R, 15);
    const C = onCircle(O, R, 250);
    const D = onCircle(O, R, 95);
    // 두 현의 교점 P
    const d1 = [B[0] - A[0], B[1] - A[1]];
    const d2 = [D[0] - C[0], D[1] - C[1]];
    const k = ((C[0] - A[0]) * d2[1] - (C[1] - A[1]) * d2[0]) / (d1[0] * d2[1] - d1[1] * d2[0]);
    const P = [A[0] + d1[0] * k, A[1] + d1[1] * k];
    return frame(
      ring(O, R) + seg(A, B) + seg(C, D) + dot(P) +
      vertex(A, 'A', O) + vertex(B, 'B', O) + vertex(C, 'C', O) + vertex(D, 'D', O) +
      `<text x="${r1(P[0] + 9)}" y="${r1(P[1] - 8)}" text-anchor="start" font-size="13" font-weight="700" fill="${DIM}">P</text>` +
      tag(beside(A, P, 14, 0.45), L.pa) + tag(beside(P, B, 13, 0.6), L.pb) +
      tag(beside(C, P, 12, 0.45), L.pc, -1) + tag(beside(P, D, -14, 0.6), L.pd, 1),
      184,
    );
  },
  // 원 밖의 점에서 그은 할선과 접선: pa, pb 는 P 에서 잰 길이, pt 는 접선의 길이
  tangent(L) {
    const O = [214, 96];
    const R = 62;
    const P = [26, 128];
    // 접점 T (위쪽)
    const dist = Math.hypot(O[0] - P[0], O[1] - P[1]);
    const base = Math.atan2(O[1] - P[1], O[0] - P[0]);
    const turn = Math.asin(R / dist);
    const len = Math.sqrt(dist * dist - R * R);
    const T = [P[0] + len * Math.cos(base - turn), P[1] + len * Math.sin(base - turn)];
    // 할선: P 에서 중심보다 조금 아래를 지나는 직선
    const dir = unit(P, [O[0], O[1] + 26]);
    const mid = (O[0] - P[0]) * dir[0] + (O[1] - P[1]) * dir[1];
    const gap = Math.hypot(P[0] + dir[0] * mid - O[0], P[1] + dir[1] * mid - O[1]);
    const half = Math.sqrt(R * R - gap * gap);
    const A = [P[0] + dir[0] * (mid - half), P[1] + dir[1] * (mid - half)];
    const B = [P[0] + dir[0] * (mid + half), P[1] + dir[1] * (mid + half)];
    return frame(
      ring(O, R) + seg(P, B) + seg(P, T, ASK, 2) + dot(P) + dot(A) + dot(B) + dot(T) +
      vertex(P, 'P', O) + vertex(T, 'T', O) + vertex(A, 'A', [A[0], 0], 14) + vertex(B, 'B', O) +
      tag(beside(P, T, -13, 0.45), L.pt) + tag([between(P, A)[0], between(P, A)[1] + 18], L.pa) + tag([B[0] + 16, B[1] + 36], L.pb, -1),
      186,
    );
  },
  // 직육면체 ABCD-EFGH: ab, ad, ae 는 모서리, ag 는 대각선
  cuboid(L) {
    const A = [64, 46];
    const B = [208, 46];
    const E = [64, 136];
    const F = [208, 136];
    const back = (p) => [p[0] + 58, p[1] - 28];
    const [D, C, H, G] = [back(A), back(B), back(E), back(F)];
    return frame(
      shape([A, B, F, E]) + seg(A, D) + seg(B, C) + seg(D, C) + seg(C, G) + seg(F, G) +
      seg(E, H, DIM, 2, '5 5') + seg(H, G, DIM, 2, '5 5') + seg(D, H, DIM, 2, '5 5') +
      seg(A, G, ASK, 2, '7 5') +
      [['A', A, -13, 0], ['B', B, 11, 16], ['C', C, 12, -2], ['D', D, -6, -8], ['E', E, -13, 4], ['F', F, 2, 16], ['G', G, 13, 6], ['H', H, 12, -8]]
        .map(([n, p, dx, dy]) => `<text x="${p[0] + dx}" y="${p[1] + dy + 4}" text-anchor="middle" font-size="13" font-weight="700" fill="${DIM}">${n}</text>`).join('') +
      tag([between(A, B)[0] + 22, A[1] - 13], L.ab) + tag(beside(A, D, -12), L.ad, -1) + tag([A[0] - 10, between(A, E)[1] + 12], L.ae, -1) +
      tag([between(A, G, 0.62)[0], between(A, G, 0.62)[1] + 22], L.ag),
      156,
    );
  },
  // 두 지점에서 올려본 탑 (∠AHB = 90°): angleA, angleB, ab, ph
  space(L) {
    const H = [176, 112];
    const P = [176, 20];
    const A = [52, 138];
    const B = [286, 150];
    const mark = [along(H, A, 13), [along(H, A, 13)[0] + along(H, B, 13)[0] - H[0], along(H, A, 13)[1] + along(H, B, 13)[1] - H[1]], along(H, B, 13)];
    return frame(
      seg(H, A, DIM, 2) + seg(H, B, DIM, 2) + seg(A, B, DIM, 2, '5 5') +
      `<path d="M${mark.map((p) => `${r1(p[0])} ${r1(p[1])}`).join(' L')}" stroke="${DIM}" stroke-width="1.5"/>` +
      seg(H, P, LINE, 4) + seg(A, P, LINE, 2, '6 5') + seg(B, P, LINE, 2, '6 5') +
      dot(A) + dot(B) + arc(A, H, P, 26) + arc(B, H, P, 26) +
      vertex(P, 'P', H) + vertex(H, 'H', [H[0] + 30, 0], 14) + vertex(A, 'A', H) + vertex(B, 'B', H) +
      tag(inside(A, H, P, 44), L.angleA) + tag(inside(B, H, P, 46), L.angleB) +
      tag([between(A, B)[0], between(A, B)[1] + 16], L.ab) + tag([P[0] + 12, 62], L.ph, 1),
      176,
    );
  },
});

// ---------- 내접원, 체바, 접선과 현, 격자 길, 통계 그래프 ----------
const small = (p, text, anchor = 'middle', color = DIM, size = 12) =>
  `<text x="${r1(p[0])}" y="${r1(p[1])}" text-anchor="${anchor}" font-size="${size}" font-weight="700" fill="${color}">${esc(text)}</text>`;
const list = (text) => String(text).split(',').map(Number);

Object.assign(DRAW, {
  // 삼각형과 내접원. ab, bc, ca 는 변의 길이, r 은 반지름. af 를 적으면 접점 D, E, F 와 AF 를 표시합니다.
  incircle(L) {
    const A = [140, 22];
    const B = [36, 146];
    const C = [292, 146];
    const a = Math.hypot(B[0] - C[0], B[1] - C[1]);
    const b = Math.hypot(A[0] - C[0], A[1] - C[1]);
    const c = Math.hypot(A[0] - B[0], A[1] - B[1]);
    const I = [(a * A[0] + b * B[0] + c * C[0]) / (a + b + c), (a * A[1] + b * B[1] + c * C[1]) / (a + b + c)];
    const R = B[1] - I[1];
    const s = (a + b + c) / 2;
    const F = along(A, B, s - a);
    const E = along(A, C, s - a);
    const D = [I[0], B[1]];
    const touch = L.af ? dot(D) + dot(E) + dot(F) + vertex(D, 'D', I, 14) + vertex(E, 'E', I) + vertex(F, 'F', I) : '';
    return frame(
      shape([A, B, C]) + ring(I, r1(R), ASK) + touch +
      (L.r ? seg(I, D, ASK, 2, '4 4') + dot(I) + tag([I[0] + 12, I[1] + R / 2], L.r, 1) : '') +
      vertex(A, 'A', I) + vertex(B, 'B', I) + vertex(C, 'C', I) +
      tag(beside(A, B, 12, L.af ? 0.72 : 0.5), L.ab, -1) + tag(beside(A, C, -12), L.ca, 1) + tag([between(B, C)[0] + (L.af ? 44 : 0), 164], L.bc) +
      (L.af ? tag(beside(A, F, 12), L.af, -1) : ''),
      176,
    );
  },
  // 체바의 정리: af, fb, bd, dc 는 비의 값, ce 는 묻는 자리
  ceva(L) {
    const A = [150, 22];
    const B = [40, 140];
    const C = [290, 140];
    const D = between(B, C, 0.45);
    const E = between(C, A, 0.5);
    // AD 와 BE 의 교점 P 를 지나도록 F 를 정합니다.
    const cross = (p, q, r, t) => {
      const d1 = [q[0] - p[0], q[1] - p[1]];
      const d2 = [t[0] - r[0], t[1] - r[1]];
      const k = ((r[0] - p[0]) * d2[1] - (r[1] - p[1]) * d2[0]) / (d1[0] * d2[1] - d1[1] * d2[0]);
      return [p[0] + d1[0] * k, p[1] + d1[1] * k];
    };
    const P = cross(A, D, B, E);
    const F = cross(C, P, A, B);
    return frame(
      shape([A, B, C]) + seg(A, D, ASK, 2) + seg(B, E, ASK, 2) + seg(C, F, ASK, 2) + dot(P) +
      vertex(A, 'A', P) + vertex(B, 'B', P) + vertex(C, 'C', P) + vertex(D, 'D', [D[0], 0], 15) + vertex(E, 'E', P) + vertex(F, 'F', P) +
      tag(beside(A, F, 13), L.af, -1) + tag(beside(F, B, 13), L.fb, -1) +
      tag([between(B, D)[0], 158], L.bd) + tag([between(D, C)[0], 158], L.dc) +
      tag(beside(C, A, 16, 0.5), L.ce, 1),
      172,
    );
  },
  // 접선과 현이 이루는 각: acb 는 원주각, bat 는 접선과 현 사이의 각
  tanchord(L) {
    const O = [150, 86];
    const R = 68;
    const A = onCircle(O, R, 90);
    const B = onCircle(O, R, 335);
    const C = onCircle(O, R, 215);
    const T = [A[0] + 120, A[1]];
    const S = [A[0] - 110, A[1]];
    return frame(
      ring(O, R) + shape([A, B, C]) + seg(S, T, LINE, 2.5) + dot(A) +
      arc(C, A, B, 20) + arc(A, B, T, 24) +
      vertex(A, 'A', [A[0], 0], 15) + vertex(B, 'B', O) + vertex(C, 'C', O) + small([T[0] + 4, T[1] - 8], 'T', 'middle', DIM, 13) +
      tag(inside(C, A, B, 42), L.acb) + tag(inside(A, B, T, 46), L.bat),
      184,
    );
  },
  // 격자 길: cols × rows, 왼쪽 아래 A 에서 오른쪽 위 B 까지
  grid(L) {
    const cols = Number(L.cols);
    const rows = Number(L.rows);
    const cell = Math.min(46, 250 / cols, 118 / rows);
    const x0 = 163 - (cols * cell) / 2;
    const y0 = 20;
    let out = '';
    for (let i = 0; i <= cols; i++) out += seg([x0 + i * cell, y0], [x0 + i * cell, y0 + rows * cell], LINE, 2);
    for (let j = 0; j <= rows; j++) out += seg([x0, y0 + j * cell], [x0 + cols * cell, y0 + j * cell], LINE, 2);
    const A = [x0, y0 + rows * cell];
    const B = [x0 + cols * cell, y0];
    return frame(out + dot(A, ASK) + dot(B, ASK) + small([A[0] - 12, A[1] + 6], 'A', 'middle', INK, 14) + small([B[0] + 12, B[1] + 2], 'B', 'middle', INK, 14), y0 + rows * cell + 22);
  },
  // 메넬라우스의 정리: ar, rb 는 비의 값, bp 는 "BP : PC = …" 글, cq 는 묻는 자리
  menelaus(L) {
    const A = [120, 20];
    const B = [34, 132];
    const C = [206, 132];
    const P = [296, 132];
    const R = between(A, B, 0.42);
    // 직선 PR 과 변 CA 의 교점 Q
    const d1 = [R[0] - P[0], R[1] - P[1]];
    const d2 = [A[0] - C[0], A[1] - C[1]];
    const k = ((C[0] - P[0]) * d2[1] - (C[1] - P[1]) * d2[0]) / (d1[0] * d2[1] - d1[1] * d2[0]);
    const Q = [P[0] + d1[0] * k, P[1] + d1[1] * k];
    const G = [120, 95];
    return frame(
      shape([A, B, C]) + seg(C, P, LINE, 2.5, '6 5') + seg(P, along(R, P, -8), ASK, 2) + dot(P) + dot(Q) + dot(R) +
      vertex(A, 'A', G) + vertex(B, 'B', G) + vertex(C, 'C', [C[0], 0], 15) + vertex(P, 'P', [P[0], 0], 15) + vertex(R, 'R', [R[0] + 20, R[1] + 6], 18) + small([Q[0] - 8, Q[1] + 18], 'Q', 'middle', DIM, 13) +
      tag(beside(A, R, 14), L.ar, -1) + tag(beside(R, B, 14), L.rb, -1) + tag(beside(C, A, 26, 0.5), L.cq, 1) + tag([166, 166], L.bp),
      182,
    );
  },
  // 정사면체: edge 는 모서리의 길이, h 는 높이의 이름표 (비우면 높이를 그리지 않습니다)
  tetra(L) {
    const A = [150, 16];
    const B = [52, 128];
    const C = [214, 152];
    const D = [286, 104];
    const H = [(B[0] + C[0] + D[0]) / 3, (B[1] + C[1] + D[1]) / 3];
    return frame(
      seg(B, D, DIM, 2, '5 5') + shape([A, B, C]) + seg(A, D) + seg(C, D) +
      (L.h ? seg(A, H, ASK, 2, '6 4') + dot(H) + small([H[0] + 10, H[1] + 14], 'H') + tag([between(A, H, 0.62)[0] - 12, between(A, H, 0.62)[1]], L.h, -1) : '') +
      vertex(A, 'A', H) + vertex(B, 'B', H) + vertex(C, 'C', H, 15) + vertex(D, 'D', H) +
      tag(beside(A, B, 12), L.edge, -1),
      172,
    );
  },
  // 히스토그램: freq 는 "2,5,8,4,1", from 은 첫 계급의 시작, step 은 계급의 폭
  histogram(L) {
    const freq = list(L.freq);
    const from = Number(L.from);
    const step = Number(L.step);
    const top = Math.max(...freq);
    const x0 = 44;
    const y0 = 132;
    const w = 46;
    const unitH = 104 / top;
    let out = seg([x0, y0], [x0 + w * freq.length + 8, y0], INK, 2) + seg([x0, y0], [x0, 14], INK, 2);
    freq.forEach((f, i) => {
      const h = f * unitH;
      out += `<rect x="${x0 + i * w}" y="${r1(y0 - h)}" width="${w}" height="${r1(h)}" fill="#2f4f8f" stroke="${LINE}" stroke-width="2"/>`;
      out += small([x0 + i * w + w / 2, y0 - h - 5], String(f), 'middle', INK, 13);
    });
    for (let i = 0; i <= freq.length; i++) out += small([x0 + i * w, y0 + 15], String(from + step * i), 'middle', INK, 12);
    return frame(out, 154);
  },
  // 상자그림: five 는 "최솟값,Q1,중앙값,Q3,최댓값"
  boxplot(L) {
    const five = list(L.five);
    const lo = five[0];
    const hi = five[4];
    const x = (v) => 30 + ((v - lo) / (hi - lo)) * 266;
    const y = 48;
    let out = seg([x(lo), y], [x(five[1]), y]) + seg([x(five[3]), y], [x(hi), y]) +
      `<rect x="${r1(x(five[1]))}" y="${y - 22}" width="${r1(x(five[3]) - x(five[1]))}" height="44" fill="#2f4f8f" stroke="${LINE}" stroke-width="2.5"/>` +
      seg([x(five[2]), y - 22], [x(five[2]), y + 22], ASK, 3) + seg([x(lo), y - 12], [x(lo), y + 12]) + seg([x(hi), y - 12], [x(hi), y + 12]);
    five.forEach((v) => {
      out += seg([x(v), y + 30], [x(v), y + 38], DIM, 1.5) + small([x(v), y + 54], String(v), 'middle', INK, 13);
    });
    return frame(out, 114);
  },
  // 산포도: pts 는 "x,y;x,y;…" (1 ~ 9)
  scatter(L) {
    const pts = String(L.pts).split(';').map((p) => p.split(',').map(Number));
    const x = (v) => 60 + v * 22;
    const y = (v) => 150 - v * 13.5;
    let out = seg([60, 150], [276, 150], INK, 2) + seg([60, 150], [60, 14], INK, 2) + small([282, 154], 'x', 'start', INK, 13) + small([60, 10], 'y', 'middle', INK, 13);
    const seen = {};
    pts.forEach(([px, py]) => {
      const key = `${px},${py}`;
      seen[key] = (seen[key] || 0) + 1;
      out += `<circle cx="${x(px) + (seen[key] - 1) * 5}" cy="${r1(y(py))}" r="4.5" fill="${ASK}"/>`;
    });
    return frame(out, 164);
  },
});

// ---- 数学II 그림 ----
//   plane       좌표평면 (정확한 그림). plot 에 생성기가 만든 설정(JSON 글)을 넣습니다: "figure": { "kind": "plane", "plot": "{plot}" }
//               r [x0, x1, y0, y1] 범위 · pts [[x, y, 이름]] 점 · segs [[x1, y1, x2, y2, 점선?]] 선분 · lines [[a, b, c]] 직선 ax + by = c
//               circles [[cx, cy, r]] 원 · curves [[계수…]] 곡선 (높은 차수부터) · area [위 곡선, 아래 곡선, 시작, 끝] 색칠할 넓이
//               mx, my 축에 적을 눈금 값
//   unitcircle  단위원 (정확한 그림). deg 각의 크기(도) · label 각의 이름표
//   sector      부채꼴 (정확한 그림). deg 중심각의 크기(도) · r 반지름 · angle 중심각 · arc 호의 길이 · area 넓이
let planeCount = 0;
const polyAt = (coefs, x) => coefs.reduce((acc, c) => acc * x + c, 0);
Object.assign(DRAW, {
  plane(L) {
    let P;
    try { P = JSON.parse(L.plot); } catch (e) { return frame(''); }
    const [x0, x1, y0, y1] = P.r;
    const H = 176;
    // 원이 있는 그림은 가로세로 눈금을 같게, 함수의 그래프(free)는 칸에 꽉 차게 그립니다.
    const k = Math.min(300 / (x1 - x0), (H - 22) / (y1 - y0));
    const kx = P.free ? Math.min(300, (H - 22) * 1.5) / (x1 - x0) : k;
    const ky = P.free ? (H - 22) / (y1 - y0) : k;
    const ox = 163 - ((x0 + x1) / 2) * kx;
    const oy = H / 2 + ((y0 + y1) / 2) * ky;
    const X = (x) => r1(ox + x * kx);
    const Y = (y) => r1(oy - y * ky);
    const txt = (x, y, t, color = INK, size = 15, anchor = 'middle') =>
      `<text x="${r1(x)}" y="${r1(y)}" text-anchor="${anchor}" font-size="${size}" font-weight="600" fill="${color}">${esc(t)}</text>`;
    const id = `pl${++planeCount}`;
    let out = `<clipPath id="${id}"><rect x="${X(x0)}" y="${Y(y1)}" width="${r1((x1 - x0) * kx)}" height="${r1((y1 - y0) * ky)}"/></clipPath>`;
    if (!P.free && x1 - x0 <= 16 && y1 - y0 <= 16) {
      for (let x = Math.ceil(x0); x <= x1; x++) out += `<path d="M${X(x)} ${Y(y0)} V${Y(y1)}" stroke="${DIM}" stroke-width="1" opacity="0.28"/>`;
      for (let y = Math.ceil(y0); y <= y1; y++) out += `<path d="M${X(x0)} ${Y(y)} H${X(x1)}" stroke="${DIM}" stroke-width="1" opacity="0.28"/>`;
    }
    let body = '';
    if (P.area) {
      const [top, bottom, from, to] = P.area;
      const pts = [];
      for (let n = 0; n <= 40; n++) { const x = from + ((to - from) * n) / 40; pts.push(`${X(x)} ${Y(polyAt(top, x))}`); }
      for (let n = 40; n >= 0; n--) { const x = from + ((to - from) * n) / 40; pts.push(`${X(x)} ${Y(bottom ? polyAt(bottom, x) : 0)}`); }
      body += `<path d="M${pts.join(' L')} Z" fill="${ASK}" opacity="0.38"/>`;
    }
    for (const c of P.curves || []) {
      const pts = [];
      for (let n = 0; n <= 90; n++) { const x = x0 + ((x1 - x0) * n) / 90; const y = polyAt(c, x); if (y > y0 - (y1 - y0) && y < y1 + (y1 - y0)) pts.push(`${X(x)} ${Y(y)}`); }
      body += `<path d="M${pts.join(' L')}" stroke="${LINE}" stroke-width="2.5"/>`;
    }
    for (const [a, b, c] of P.lines || []) {
      body += b ? `<path d="M${X(x0)} ${Y((c - a * x0) / b)} L${X(x1)} ${Y((c - a * x1) / b)}" stroke="${LINE}" stroke-width="2.5"/>`
        : `<path d="M${X(c / a)} ${Y(y0)} V${Y(y1)}" stroke="${LINE}" stroke-width="2.5"/>`;
    }
    for (const [cx, cy, r] of P.circles || []) body += `<circle cx="${X(cx)}" cy="${Y(cy)}" r="${r1(r * k)}" stroke="${LINE}" stroke-width="2.5"/>`;
    for (const [a, b, c, d, dash] of P.segs || []) body += `<path d="M${X(a)} ${Y(b)} L${X(c)} ${Y(d)}" stroke="${dash ? DIM : ASK}" stroke-width="${dash ? 1.5 : 2.5}"${dash ? ' stroke-dasharray="5 4"' : ''}/>`;
    // 축
    const ax = Math.min(Math.max(0, y0), y1);
    const ay = Math.min(Math.max(0, x0), x1);
    out += `<path d="M${X(x0)} ${Y(ax)} H${X(x1)} M${X(x1) - 6} ${Y(ax) - 4} L${X(x1)} ${Y(ax)} L${X(x1) - 6} ${Y(ax) + 4}" stroke="${INK}" stroke-width="1.5"/>`;
    out += `<path d="M${X(ay)} ${Y(y0)} V${Y(y1)} M${X(ay) - 4} ${Y(y1) + 6} L${X(ay)} ${Y(y1)} L${X(ay) + 4} ${Y(y1) + 6}" stroke="${INK}" stroke-width="1.5"/>`;
    out += txt(X(x1) - 2, Y(ax) + 14, 'x', DIM, 14, 'end') + txt(X(ay) + 6, Y(y1) + 12, 'y', DIM, 14, 'start');
    if (x0 < 0 && x1 > 0 && y0 < 0 && y1 > 0) out += txt(X(0) - 5, Y(0) + 13, 'O', DIM, 14, 'end');
    for (const v of P.mx || []) out += `<path d="M${X(v)} ${Y(ax) - 3} V${Y(ax) + 3}" stroke="${INK}" stroke-width="1.5"/>` + txt(X(v), Y(ax) + 15, String(v).replace('-', '−'), INK, 15);
    for (const v of P.my || []) out += `<path d="M${X(ay) - 3} ${Y(v)} H${X(ay) + 3}" stroke="${INK}" stroke-width="1.5"/>` + txt(X(ay) - 7, Y(v) + 4, String(v).replace('-', '−'), INK, 15, 'end');
    out += `<g clip-path="url(#${id})">${body}</g>`;
    for (const [x, y, name, side] of P.pts || []) {
      out += dot([X(x), Y(y)], ASK);
      if (name) out += txt(X(x) + (side === 'l' ? -8 : 8), Y(y) - 7, name, INK, 16, side === 'l' ? 'end' : 'start');
    }
    return frame(out, H);
  },
  unitcircle(L) {
    const deg = Number(L.deg) || 0;
    const C = [163, 90];
    const R = 62;
    const Pt = [C[0] + R * Math.cos((deg * Math.PI) / 180), C[1] - R * Math.sin((deg * Math.PI) / 180)];
    const txt = (x, y, t, color = DIM, size = 14, anchor = 'middle') => `<text x="${r1(x)}" y="${r1(y)}" text-anchor="${anchor}" font-size="${size}" font-weight="600" fill="${color}">${esc(t)}</text>`;
    // 음의 각은 시계 방향으로, 한 바퀴를 넘는 각은 넘은 만큼만 그립니다.
    const sweep = deg < 0 ? -(((-deg) % 360) || 360) : (deg % 360) || (deg ? 360 : 0);
    const mid = (sweep / 2) * (Math.PI / 180);
    const end = [C[0] + 20 * Math.cos((sweep * Math.PI) / 180), C[1] - 20 * Math.sin((sweep * Math.PI) / 180)];
    const arcPath = sweep ? `<path d="M${C[0] + 20} ${C[1]} A20 20 0 ${Math.abs(sweep) > 180 ? 1 : 0} ${sweep < 0 ? 1 : 0} ${r1(end[0])} ${r1(end[1])}" stroke="${ASK}" stroke-width="2"/>` : '';
    return frame(
      `<path d="M${C[0] - 92} ${C[1]} H${C[0] + 92} M${C[0]} ${C[1] + 80} V${C[1] - 80}" stroke="${INK}" stroke-width="1.5"/>` +
      ring(C, R) + arcPath + seg(C, Pt, ASK, 2.5) + seg(Pt, [Pt[0], C[1]], DIM, 1.5, '5 4') + seg(Pt, [C[0], Pt[1]], DIM, 1.5, '5 4') + dot(Pt, ASK) +
      txt(C[0] + 96, C[1] + 14, 'x') + txt(C[0] + 10, C[1] - 72, 'y') + txt(C[0] - 8, C[1] + 14, 'O') +
      txt(C[0] + R + 8, C[1] + 14, '1') + txt(C[0] - R - 10, C[1] + 14, '−1') + txt(Pt[0] + (Pt[0] >= C[0] ? 10 : -10), Pt[1] + (Pt[1] <= C[1] ? -6 : 14), 'P', INK, 16) +
      (L.label ? `<rect x="${C[0] - 150}" y="8" width="84" height="24" rx="8" fill="#16234a"/>` + txt(C[0] - 108, 25, `θ = ${L.label}`, ASK, 15) : ''),
      176,
    );
  },
  sector(L) {
    const deg = Math.min(170, Math.max(20, Number(L.deg) || 60));
    const R = 106;
    const B0 = onCircle([0, 0], R, -deg);
    const left = Math.min(0, B0[0]);
    const O = [163 - (left + R) / 2, 144];
    const A = [O[0] + R, O[1]];
    const B = onCircle(O, R, -deg);
    const M = onCircle(O, R, -deg / 2);
    const T = onCircle(O, 34, -deg / 2);
    const S = onCircle(O, R * 0.62, -deg / 2);
    return frame(
      `<path d="M${r1(O[0])} ${O[1]} L${r1(A[0])} ${A[1]} A${R} ${R} 0 0 0 ${r1(B[0])} ${r1(B[1])} Z" stroke="${LINE}" stroke-width="2.5"/>` +
      arc(O, A, B, 20) + label(T[0] + 6, T[1] + 5, L.angle, 'start') + label(between(O, A)[0], O[1] + 20, L.r) +
      label(M[0] + (M[0] > O[0] ? 8 : -8), M[1] - 6, L.arc, M[0] > O[0] ? 'start' : 'end') + label(S[0], S[1] - 8, L.area),
      168,
    );
  },
});

// 길이와 각도를 정확히 그리지 않은 약도인지. 통계 그래프와 격자 길은 정확한 그림입니다.
const EXACT = ['histogram', 'boxplot', 'scatter', 'grid', 'plane', 'unitcircle', 'sector'];
export const isSketch = (raw) => Boolean(raw.tpl.figure) && !EXACT.includes(raw.tpl.figure.kind);

// 문제의 그림을 만듭니다. 그림이 없는 문제면 null.
// alt 는 화면을 읽어 주는 도구를 위한 설명입니다. (그림에 적힌 값들)
export function figureFor(raw) {
  const spec = raw.tpl.figure;
  if (!spec || !DRAW[spec.kind]) return null;
  const labels = {};
  for (const [key, value] of Object.entries(spec)) {
    if (key !== 'kind') labels[key] = fill(String(value), raw.item);
  }
  return {
    svg: DRAW[spec.kind](labels),
    alt: Object.values(labels).filter((v) => v && !/^[{[]/.test(v)).join(', '), // 그림 설정(JSON)은 읽어 주지 않습니다
  };
}

// 그림 자리에 그림을 넣거나, 그림이 없는 문제면 숨깁니다.
export function showFigure(el, raw) {
  const fig = raw ? figureFor(raw) : null;
  el.hidden = !fig;
  if (!fig) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = fig.svg;
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', fig.alt);
}
