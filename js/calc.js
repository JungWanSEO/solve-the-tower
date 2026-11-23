// 풀이 속의 계산식. 풀이 글에 {= 식 } 을 적으면, 그 문제의 숫자로 계산한 값이 들어갑니다.
//   예: "a² = {b}² + {c}² − 2 × {b} × {c} × cos {A}° = {= b*b + c*c - 2*b*c*cosd(A) }"
// 식에는 생성기가 돌려준 값의 이름(a, b, n …)과 아래 도구를 쓸 수 있습니다.
// 결과가 정수가 아니면 분수로 적습니다. 계산할 수 없으면 "?" 가 나오며, tools/verify-explain.mjs 가 그것을 잡아냅니다.
const MINUS = '−';
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));
const nPr = (n, r) => { let v = 1; for (let k = 0; k < r; k++) v *= n - k; return v; };
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const neg = (text) => String(text).replace(/-/g, MINUS);
// x 와 y 가 들어 있는 식의 값 (직선, 원)
const evxy = (expr, x, y) => Function('x', 'y', `return (${String(expr).replace(/−/g, '-').replace(/([xy])²/g, '($1**2)').replace(/(\d)([xy(])/g, '$1*$2')});`)(x, y);
const TOOLS = {
  gcd, fact, nPr,
  nCr: (n, r) => nPr(n, r) / fact(r),
  lcm: (a, b) => (a * b) / gcd(a, b),
  floor: Math.floor, max: Math.max, min: Math.min, abs: Math.abs, sqrt: Math.sqrt,
  // 소수로 보여 줄 값 (분수로 바꾸지 않습니다)
  round: (v, places = 0) => { const r = Math.round(v * 10 ** places) / 10 ** places; return Number.isInteger(r) ? r : neg(r); },
  cosd: (deg) => Math.round(Math.cos((deg * Math.PI) / 180) * 1e12) / 1e12,
  tand: (deg) => Math.round(Math.tan((deg * Math.PI) / 180) * 1e12) / 1e12,
  sind: (deg) => Math.round(Math.sin((deg * Math.PI) / 180) * 1e12) / 1e12,
  // seq(6, 3) → "6 × 5 × 4" (순열을 곱으로 풀어 쓴 것)
  seq: (n, r) => Array.from({ length: r }, (_, k) => n - k).join(' × '),
  // pf(72) → "2³ × 3²" (소인수분해)
  pf: (n) => { const out = []; let m = n; for (let p = 2; p * p <= m; p++) { let e = 0; while (m % p === 0) { m /= p; e++; } if (e) out.push(`${p}${e > 1 ? [...String(e)].map((d) => SUP[d]).join('') : ''}`); } if (m > 1) out.push(String(m)); return out.join(' × '); },
  // ev("x² − 3x + 2", 4) → 식에 x 값을 넣은 결과
  ev: (expr, x) => Function('x', `return (${String(expr).replace(/^[yf]\(?x?\)? = /, '').replace(/−/g, '-').replace(/x([²³⁴])/g, (m, c) => `(x**${'²³⁴'.indexOf(c) + 2})`).replace(/(\d)\(/g, '$1*(').replace(/(\d)x/g, '$1*x').replace(/^-\(/, '-1*(').replace(/([^\d*(]|^)-\(x\*\*/g, '$1-1*(x**')});`)(x),
  // ---- 문제에 보이는 글에서 숫자를 읽어 내는 도구 ----
  // nums("(x − 7)(x + 9)") → [−7, 9]: 글에 나오는 수를 차례로 (바로 앞의 − 는 부호로 읽습니다. 지수·아래 첨자는 읽지 않습니다)
  nums: (text) => (String(text).replace(/−/g, '-').match(/(-\s?)?\d+(?:\.\d+)?/g) || []).map((t) => Number(t.replace(/\s/g, ''))),
  // lin("6x + 9") → [6, 9]: 일차식의 계수와 상수항
  lin: (expr) => { const f = (x) => TOOLS.ev(expr, x); return [f(1) - f(0), f(0)]; },
  // co("2x² − 3x + 5 = 0") → [2, −3, 5]: 다항식의 계수 (높은 차수부터. 삼차식이면 4개)
  co: (expr) => { const e = String(expr).replace(/ = 0$/, ''); const f = (x) => TOOLS.ev(e, x); const c0 = f(0); const p = f(1) - c0; const q = f(-1) - c0; const r = f(2) - c0;
    const b = (p + q) / 2; const a = (r - 4 * b - (p - q)) / 6; const c = (p - q) / 2 - a; return Math.abs(a) < 1e-9 ? [b, c, c0] : [a, b, c, c0]; },
  // pair(1, −72) → "−8, 9": 더해서 p, 곱해서 q 가 되는 두 정수
  pair: (p, q) => { for (let m = -300; m <= 300; m++) { const n = p - m; if (m <= n && m * n === q) return `${neg(m)}, ${neg(n)}`; } return '?'; },
  // sqpart(72) → 36: n 을 나누는 가장 큰 제곱수
  sqpart: (n) => { let best = 1; for (let k = 2; k * k <= n; k++) if (n % (k * k) === 0) best = k * k; return best; },
  inner: (text) => String(text).replace(/\|/g, ''),
  cbrt: (v) => Math.round(Math.cbrt(v) * 1e9) / 1e9,
  // expand10("1011", 2) → "1×8 + 0×4 + 1×2 + 1×1"
  expand10: (digits, base) => [...String(digits)].map((d, k, all) => `${d}×${base ** (all.length - 1 - k)}`).join(' + '),
  // divs(73, 5) → "73 ÷ 5 = 14 … 3, 14 ÷ 5 = 2 … 4, 2 ÷ 5 = 0 … 2"
  divs: (n, base) => { const out = []; let m = n; while (m > 0) { out.push(`${m} ÷ ${base} = ${Math.floor(m / base)} … ${m % base}`); m = Math.floor(m / base); } return out.join(', '); },
  digsum: (text) => [...String(text)].reduce((sum, ch) => sum + (/\d/.test(ch) ? Number(ch) : 0), 0),
  // euclidS(340, 187) → "340 = 187 × 1 + 153, 187 = 153 × 1 + 34, …" (호제법의 계산 과정)
  euclidS: (a, b) => { const out = []; let [x, y] = [Math.max(a, b), Math.min(a, b)]; while (y > 0) { out.push(`${x} = ${y} × ${Math.floor(x / y)} + ${x % y}`); [x, y] = [y, x % y]; } return out.join(', '); },
  // qroots(1, −5, 6) → [2, 3]: 이차방정식의 두 실근 (작은 것부터)
  qroots: (a, b, c) => { const D = b * b - 4 * a * c; if (D < 0) return [NaN, NaN]; const r = [(-b - Math.sqrt(D)) / (2 * a), (-b + Math.sqrt(D)) / (2 * a)].map((v) => Math.round(v * 1e9) / 1e9); return r.sort((p, q) => p - q); },
  // fac("x² + 3x − 4") → "(x − 1)(x + 4)": x² 의 계수가 1 이고 근이 정수인 이차식의 인수분해
  fac: (expr) => { const [a, b, c] = TOOLS.co(expr); const [r1, r2] = TOOLS.qroots(a, b, c); const part = (r) => (r === 0 ? 'x' : `(x ${r > 0 ? MINUS : '+'} ${Math.abs(r)})`); return r1 === r2 ? `${part(r1)}²` : `${part(r1)}${part(r2)}`; },
  iroots: (expr) => { const e = String(expr).replace(/ = 0$/, ''); const out = []; for (let x = -30; x <= 30; x++) if (Math.abs(TOOLS.ev(e, x)) < 1e-9) out.push(x); return out; },
  // cx("3 − 2i") → [3, −2]: 복소수의 실수부분과 허수부분
  cx: (text) => { const t = String(text).replace(/−/g, '-').replace(/\s/g, ''); if (!t.endsWith('i')) return [Number(t), 0]; const body = t.slice(0, -1); let cut = Math.max(body.lastIndexOf('+'), body.lastIndexOf('-')); if (cut < 0) cut = 0; const re = body.slice(0, cut); const im = body.slice(cut); return [re === '' ? 0 : Number(re), im === '' || im === '+' ? 1 : im === '-' ? -1 : Number(im)]; },
  // lineco("3x − 4y = 40") → [3, −4, −40]: ax + by + c = 0 의 a, b, c
  lineco: (eq) => { const [l, r] = String(eq).split(' = '); const f = (x, y) => evxy(l, x, y) - Number(String(r).replace(/−/g, '-')); const c = f(0, 0); return [f(1, 0) - c, f(0, 1) - c, c]; },
  // circ("x² + y² + 2x − 10y + 10 = 0") → [−1, 5, 16]: 원의 중심 (a, b) 와 r²
  circ: (eq) => { const [l, r] = String(eq).split(' = '); const f = (x, y) => evxy(l, x, y) - Number(String(r).replace(/−/g, '-')); const a = -(f(1, 0) - f(-1, 0)) / 4; const b = -(f(0, 1) - f(0, -1)) / 4; return [a, b, -f(a, b)]; },
  // exps("3³ × 3⁻² ÷ 3⁻²") → [3, −2, −2]: 지수들
  exps: (text) => (String(text).match(/[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+/g) || []).map((run) => Number([...run].map((ch) => (ch === '⁻' ? '-' : SUP.indexOf(ch))).join(''))),
  // Fint([3, 2, 1], 2) → 계수가 [3, 2, 1] 인 다항식(높은 차수부터)을 적분한 식에 x 를 넣은 값 (적분상수 0)
  Fint: (coefs, x) => coefs.reduce((sum, c, k) => { const power = coefs.length - k; return sum + (c / power) * x ** power; }, 0),
};
// 생성기가 글로 돌려준 수("−3", "3/5")를 계산할 수 있는 수로 바꿉니다.
function toValue(value) {
  if (typeof value !== 'string') return value;
  const text = value.replace(/−/g, '-');
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  const m = text.match(/^(-?\d+)\/(\d+)$/);
  return m ? Number(m[1]) / Number(m[2]) : value;
}
// 계산 결과를 글로 적습니다: 정수, 아니면 분수, 그것도 아니면 소수 셋째 자리까지
function show(value) {
  if (typeof value === 'string') return value;
  if (typeof value !== 'number' || !Number.isFinite(value)) return '?';
  if (Math.abs(value - Math.round(value)) < 1e-9) return neg(Math.round(value));
  for (let d = 2; d <= 3000; d++) { const n = value * d; if (Math.abs(n - Math.round(n)) < 1e-7) return `${neg(Math.round(n))}/${d}`; }
  // 제곱하면 분수가 되는 수는 루트로 적습니다. 예: 0.8660… → √3/2, 4.2426… → 3√2
  const sq = value * value;
  for (let d = 1; d <= 400; d++) {
    const n = sq * d;
    if (Math.abs(n - Math.round(n)) > 1e-6 || Math.round(n) === 0) continue;
    let inside = Math.round(n) * d; // 값 = √(n/d) = √(n·d) ÷ d
    let outside = 1;
    for (let k = 2; k * k <= inside; k++) while (inside % (k * k) === 0) { inside /= k * k; outside *= k; }
    const g = gcd(outside, d);
    const [top, bottom] = [outside / g, d / g];
    return `${value < 0 ? MINUS : ''}${top === 1 ? '' : top}√${inside}${bottom === 1 ? '' : `/${bottom}`}`;
  }
  return neg(Math.round(value * 1000) / 1000);
}
export function calcFill(text, item) {
  if (!String(text).includes('{=')) return text;
  const scope = { ...TOOLS };
  for (const [key, value] of Object.entries(item || {})) if (/^[A-Za-z_]\w*$/.test(key)) scope[key] = toValue(value);
  const names = Object.keys(scope);
  const values = names.map((n) => scope[n]);
  return String(text).replace(/\{=([^{}]*)\}/g, (whole, source) => {
    try { return show(Function(...names, `"use strict"; return (${source});`)(...values)); } catch (e) { return '?'; }
  });
}
