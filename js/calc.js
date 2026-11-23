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
const TOOLS = {
  gcd, fact, nPr,
  nCr: (n, r) => nPr(n, r) / fact(r),
  lcm: (a, b) => (a * b) / gcd(a, b),
  floor: Math.floor, max: Math.max, min: Math.min, abs: Math.abs, sqrt: Math.sqrt,
  // 소수로 보여 줄 값 (분수로 바꾸지 않습니다)
  round: (v, places = 0) => { const r = Math.round(v * 10 ** places) / 10 ** places; return Number.isInteger(r) ? r : neg(r); },
  cosd: (deg) => Math.round(Math.cos((deg * Math.PI) / 180) * 1e12) / 1e12,
  sind: (deg) => Math.round(Math.sin((deg * Math.PI) / 180) * 1e12) / 1e12,
  // seq(6, 3) → "6 × 5 × 4" (순열을 곱으로 풀어 쓴 것)
  seq: (n, r) => Array.from({ length: r }, (_, k) => n - k).join(' × '),
  // pf(72) → "2³ × 3²" (소인수분해)
  pf: (n) => { const out = []; let m = n; for (let p = 2; p * p <= m; p++) { let e = 0; while (m % p === 0) { m /= p; e++; } if (e) out.push(`${p}${e > 1 ? [...String(e)].map((d) => SUP[d]).join('') : ''}`); } if (m > 1) out.push(String(m)); return out.join(' × '); },
  // ev("x² − 3x + 2", 4) → 식에 x 값을 넣은 결과
  ev: (expr, x) => Function('x', `return (${String(expr).replace(/^[yf]\(?x?\)? = /, '').replace(/−/g, '-').replace(/x([²³⁴])/g, (m, c) => `(x**${'²³⁴'.indexOf(c) + 2})`).replace(/(\d)\(/g, '$1*(').replace(/(\d)x/g, '$1*x').replace(/^-\(/, '-1*(').replace(/([^\d*(]|^)-\(x\*\*/g, '$1-1*(x**')});`)(x),
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
