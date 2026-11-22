// 숫자를 자동으로 만들어 내는 문제 생성기.
// 단원 파일의 틀에 "gen": "<이름>" 을 적으면 그 이름의 생성기가 숫자 묶음을 만듭니다.
// 생성기는 { answer: 정답, wrong: [오답 3개], ...문장 틀과 그림에 들어갈 값 } 을 돌려줍니다.
//
// 오답은 아무 숫자가 아니라 "흔한 실수를 했을 때 나오는 값"으로 만듭니다.
// 정답과 오답은 실제 값으로 비교해서, 모양만 다르고 값이 같은 보기가 생기지 않게 합니다.

const rand = (n) => Math.floor(Math.random() * n);
const pickOne = (arr) => arr[rand(arr.length)];
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const MINUS = '−';

// n√r/d 꼴의 값. 약분하고 루트 안의 제곱수를 밖으로 꺼냅니다.
// 돌려주는 것: { s: 화면에 보일 글, v: 실제 값, n, r, d }
function surd(n, r = 1, d = 1) {
  for (let f = 2; f * f <= r; f++) {
    while (r % (f * f) === 0) {
      r /= f * f;
      n *= f;
    }
  }
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d) || 1;
  n /= g;
  d /= g;
  const v = (n * Math.sqrt(r)) / d;
  const sign = n < 0 ? MINUS : '';
  const abs = Math.abs(n);
  let s;
  if (r === 1) s = `${sign}${abs}`;
  else s = `${sign}${abs === 1 ? '' : abs}√${r}`;
  if (d !== 1) s += `/${d}`;
  return { s, v, n, r, d };
}
const frac = (n, d) => surd(n, 1, d);
const times = (x, k) => surd(x.n * k, x.r, x.d);
const over = (x, k) => surd(x.n, x.r, x.d * k);

// (p + q√r) 또는 (p − q√r) 꼴의 값
function sum(p, q, r, sign = 1) {
  return {
    s: `(${p} ${sign > 0 ? '+' : MINUS} ${q === 1 ? '' : q}√${r})`,
    v: p + sign * q * Math.sqrt(r),
  };
}

// 정답과 겹치지 않는 오답 3개를 고릅니다. candidates 가 모자라면 pads 에서 채웁니다.
function choose(answer, candidates, pads = []) {
  const out = [];
  const usable = (c) =>
    c && Number.isFinite(c.v) && c.s !== answer.s && Math.abs(c.v - answer.v) > 1e-9 &&
    !out.some((o) => o.s === c.s || Math.abs(o.v - c.v) < 1e-9);
  for (const c of [...candidates, ...pads]) {
    if (out.length < 3 && usable(c)) out.push(c);
  }
  // 그래도 모자랄 때의 마지막 수단
  for (let k = 2; out.length < 3 && k < 40; k++) {
    const c = { s: `${Math.round(answer.v * k * 100) / 100}`.replace('-', MINUS), v: Math.round(answer.v * k * 100) / 100 };
    if (usable(c)) out.push(c);
  }
  return out;
}

// 생성기가 돌려줄 숫자 묶음을 만듭니다. unit 을 주면 값 뒤에 단위를 붙입니다.
function item(fields, answer, candidates, pads, unit = '') {
  const wrong = choose(answer, candidates, pads);
  const show = (x) => (unit ? `${x.s} ${unit}` : x.s);
  return { ...fields, answer: show(answer), wrong: wrong.map(show) };
}

// 세 변이 모두 정수인 직각삼각형 (a, b 는 직각을 낀 두 변, c 는 빗변)
const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [6, 8, 10], [9, 12, 15], [20, 21, 29], [9, 40, 41], [12, 35, 37]];
function triple() {
  let [a, b, c] = pickOne(TRIPLES);
  if (Math.random() < 0.5) [a, b] = [b, a];
  return { a, b, c };
}

// 정수로 떨어지는 삼각형 (a, b, c, A): a² = b² + c² − 2bc cos A
const INT_TRIANGLES = [
  [7, 3, 8, 60], [7, 5, 8, 60], [13, 7, 15, 60], [13, 8, 15, 60], [14, 6, 16, 60], [19, 16, 21, 60],
  [7, 3, 5, 120], [13, 7, 8, 120], [19, 5, 16, 120], [14, 6, 10, 120],
  [5, 3, 4, 90], [13, 5, 12, 90], [17, 8, 15, 90], [25, 7, 24, 90],
];

// 사인 법칙: b = a × sin B ÷ sin A 가 깔끔하게 떨어지는 각의 짝 [A, B, n, r, d] (b = a·n√r/d)
const SINE_PAIRS = [
  [30, 45, 1, 2, 1], [45, 30, 1, 2, 2], [30, 60, 1, 3, 1], [60, 30, 1, 3, 3],
  [45, 60, 1, 6, 2], [60, 45, 1, 6, 3], [30, 90, 2, 1, 1], [90, 30, 1, 1, 2],
  [45, 90, 1, 2, 1], [90, 45, 1, 2, 2], [60, 90, 2, 3, 3], [90, 60, 1, 3, 2],
  [30, 120, 1, 3, 1], [45, 120, 1, 6, 2], [30, 135, 1, 2, 1],
  [120, 30, 1, 3, 3], [120, 45, 1, 6, 3], [135, 30, 1, 2, 2],
];

export const GENERATORS = {
  // 직각삼각형의 세 변을 보고 sin, cos, tan 구하기
  ratio() {
    const { a, b, c } = triple();
    const fn = pickOne(['sin', 'cos', 'tan']);
    const value = { sin: frac(a, c), cos: frac(b, c), tan: frac(a, b) };
    const others = ['sin', 'cos', 'tan'].filter((name) => name !== fn).map((name) => value[name]);
    return item({ a, b, c, fn }, value[fn], [...others, frac(c, a), frac(b, a), frac(c, b)]);
  },

  // 빗변과 30°·60° 로 한 변의 길이 구하기 (kind: 'sin30' 또는 'cos60')
  length() {
    const c = 2 * (5 + rand(26));
    const answer = surd(c / 2);
    return item({ c }, answer, [surd(c), surd(c * 2), surd(c / 2 + 3)], [surd(c / 2 - 2), surd(c + 4)], 'm');
  },

  // 수평거리와 올려본 각으로 탑의 높이 구하기
  height() {
    const d = pickOne([6, 8, 9, 10, 12, 15, 16, 18, 20, 24, 25, 30]);
    const deg = pickOne([30, 45, 60]);
    const table = {
      30: [surd(d, 3, 3), [surd(d, 3, 1), surd(d, 1, 2), surd(d, 3, 2)]],
      45: [surd(d), [surd(d, 2, 2), surd(d, 3, 1), surd(d, 1, 2)]],
      60: [surd(d, 3, 1), [surd(d, 3, 3), surd(d, 3, 2), surd(d)]],
    };
    const [answer, wrong] = table[deg];
    return item({ d, deg }, answer, wrong, [times(answer, 2), over(answer, 2)], 'm');
  },

  // 두 지점에서 올려본 각으로 탑의 높이 구하기
  twopoint() {
    const g = pickOne([4, 6, 8, 10, 12, 14, 16, 20]);
    const h = g / 2;
    const [a, b] = pickOne([[30, 45], [30, 60], [45, 60]]);
    let answer;
    let wrong;
    if (a === 30 && b === 45) {
      answer = sum(h, h, 3);
      wrong = [surd(g, 3, 3), surd(g), sum(3 * h, h, 3, -1)];
    } else if (a === 30 && b === 60) {
      answer = surd(g, 3, 2);
      wrong = [surd(g, 3, 3), surd(g, 3, 1), surd(g, 3, 4)];
    } else {
      answer = sum(3 * h, h, 3);
      wrong = [surd(g), surd(g, 3, 1), { s: `(${h}√3 ${MINUS} ${h})`, v: h * Math.sqrt(3) - h }];
    }
    return item({ g, a, b }, answer, wrong, [surd(g * 2), surd(g, 1, 2), surd(g, 2, 1)], 'm');
  },

  // 삼각비의 상호 관계: 하나를 알 때 다른 하나 구하기. params.obtuse 이면 둔각.
  relation(params) {
    const { a, b, c } = triple();
    if (params.obtuse) {
      // θ 가 둔각이면 sin 은 양수, cos 과 tan 은 음수
      const ask = pickOne(['cos', 'tan']);
      const answer = ask === 'cos' ? frac(-b, c) : frac(-a, b);
      const positive = ask === 'cos' ? frac(b, c) : frac(a, b);
      return item({ given: 'sin', gv: frac(a, c).s, ask }, answer,
        [positive, ask === 'cos' ? frac(-a, c) : frac(-b, a), ask === 'cos' ? frac(-a, b) : frac(-b, c)],
        [frac(a, c), frac(-c, b)]);
    }
    const value = { sin: frac(a, c), cos: frac(b, c), tan: frac(a, b) };
    const [given, ask] = pickOne([['sin', 'cos'], ['cos', 'sin'], ['sin', 'tan'], ['cos', 'tan']]);
    const pool = [value.sin, value.cos, value.tan, frac(b, a), frac(c, b), frac(c, a)];
    return item({ given, gv: value[given].s, ask }, value[ask], pool);
  },

  // 사인 법칙: 한 변과 두 각으로 다른 변 구하기
  sinerule() {
    const a = pickOne([2, 3, 4, 6, 8, 10, 12]);
    const [A, B, n, r, d] = pickOne(SINE_PAIRS);
    const answer = surd(a * n, r, d);
    const upsideDown = surd(a * d, r, n * r); // 분자와 분모를 거꾸로 쓴 실수
    return item({ a, A, B }, answer, [upsideDown, surd(a), over(answer, 2), times(answer, 2)], [times(answer, 3)]);
  },

  // 사인 법칙: 한 변과 마주 보는 각으로 외접원의 반지름 구하기
  sineR() {
    const a = pickOne([2, 4, 6, 8, 10, 12]);
    const A = pickOne([30, 45, 60, 90, 120, 135, 150]);
    const table = { 30: surd(a), 150: surd(a), 45: surd(a, 2, 2), 135: surd(a, 2, 2), 60: surd(a, 3, 3), 120: surd(a, 3, 3), 90: surd(a, 1, 2) };
    const answer = table[A];
    // 2R 을 R 로 착각한 값, 사인 대신 코사인을 쓴 값 등
    return item({ a, A }, answer, [times(answer, 2), surd(a, 1, 2), surd(a), surd(a, 3, 2), surd(a, 2, 1)], [over(answer, 2)]);
  },

  // 코사인 법칙: 두 변과 끼인각으로 나머지 변 구하기
  cosrule() {
    const b = pickOne(range(2, 9));
    const c = pickOne(range(2, 9));
    const A = pickOne([60, 120]);
    const k = A === 60 ? -1 : 1; // −2bc cos A = ∓bc
    const answer = surd(1, b * b + c * c + k * b * c);
    return item({ b, c, A }, answer,
      [surd(1, b * b + c * c - k * b * c), surd(1, b * b + c * c), surd(b + c)],
      [surd(Math.abs(b - c) || 1), times(answer, 2)]);
  },

  // 코사인 법칙: 세 변으로 각 구하기
  cosangle() {
    // 닮은 삼각형(1~3배)과 b, c 를 바꾼 것까지 내어 같은 문제가 되풀이되지 않게 합니다.
    const k = 1 + rand(3);
    let [a, b, c] = pickOne(INT_TRIANGLES);
    const A = INT_TRIANGLES.find((row) => row[0] === a && row[1] === b && row[2] === c)[3];
    if (Math.random() < 0.5) [b, c] = [c, b];
    [a, b, c] = [a * k, b * k, c * k];
    const deg = (x) => ({ s: `${x}°`, v: x });
    const rest = [30, 45, 60, 90, 120, 135, 150].filter((x) => x !== A);
    // 60° 와 120° 를 헷갈리는 것이 가장 흔한 실수라서 먼저 넣습니다.
    const first = A === 60 ? [120] : A === 120 ? [60] : [];
    const others = rest.filter((x) => !first.includes(x)).sort(() => Math.random() - 0.5);
    return item({ a, b, c }, deg(A), [...first, ...others].map(deg));
  },

  // 두 변과 끼인각으로 삼각형의 넓이 구하기
  area() {
    const b = pickOne(range(2, 12));
    const c = pickOne(range(2, 12));
    const A = pickOne([30, 45, 60, 120, 135, 150]);
    const bc = b * c;
    const root = { 30: 1, 150: 1, 45: 2, 135: 2, 60: 3, 120: 3 }[A];
    const answer = surd(bc, root, 4);
    const cosMix = { 1: surd(bc, 3, 4), 2: surd(bc, 2, 2), 3: surd(bc, 1, 4) }[root]; // sin 대신 cos 을 쓴 값
    return item({ b, c, A }, answer, [surd(bc, 1, 2), cosMix, times(answer, 2)], [surd(bc), over(answer, 2)]);
  },
};

// =====================================================================
// 数と式 · 二次関数 · データの分析 (数学I 의 나머지 단원)
// =====================================================================

const nonzero = (from, to) => pickOne(range(from, to).filter((n) => n !== 0));
const numStr = (n) => String(n).replace('-', MINUS);
const shuffled = (arr) => [...arr].sort(() => Math.random() - 0.5);
const int = (n) => ({ s: numStr(n), v: n });
const dec = (v) => ({ s: numStr(Number.isInteger(v) ? v : Math.round(v * 10) / 10), v });

// c2·x² + c1·x + c0 을 글로 씁니다. 예: polyStr(1, -5, 6) → "x² − 5x + 6"
function polyStr(c2, c1, c0) {
  const parts = [];
  const term = (coef, sym) => {
    if (!coef) return;
    const abs = Math.abs(coef);
    parts.push([coef < 0, `${abs === 1 && sym ? '' : abs}${sym}`]);
  };
  term(c2, 'x²');
  term(c1, 'x');
  term(c0, '');
  if (!parts.length) return '0';
  return parts.map(([neg, body], i) => (i === 0 ? `${neg ? MINUS : ''}${body}` : ` ${neg ? MINUS : '+'} ${body}`)).join('');
}
// 다항식 보기: 값이 같은 식끼리 겹치지 않도록 x = 1.37 에서의 값으로 구별합니다.
const poly = (c2, c1, c0) => ({ s: polyStr(c2, c1, c0), v: c2 * 1.8769 + c1 * 1.37 + c0 });

// (ax + b) 를 글로 씁니다.
function lin(a, b) {
  const head = `${a === 1 ? '' : a === -1 ? MINUS : numStr(a)}x`;
  return b === 0 ? head : `(${head} ${b < 0 ? MINUS : '+'} ${Math.abs(b)})`;
}
// (ax + b)(cx + d) 꼴의 보기
function product(a, b, c, d) {
  const s = a === c && b === d ? `${lin(a, b)}²` : `${lin(a, b)}${lin(c, d)}`;
  return { s, v: poly(a * c, a * d + b * c, b * d).v };
}

// y = a(x − p)² + q 를 글로 씁니다.
function vertexForm(a, p, q) {
  const head = a === 1 ? '' : a === -1 ? MINUS : numStr(a);
  const inner = p === 0 ? 'x²' : `(x ${p > 0 ? MINUS : '+'} ${Math.abs(p)})²`;
  const tail = q === 0 ? '' : ` ${q < 0 ? MINUS : '+'} ${Math.abs(q)}`;
  return `y = ${head}${inner}${tail}`;
}
const point = (p, q) => ({ s: `(${numStr(p)}, ${numStr(q)})`, v: p * 1000.5 + q });
// 두 해 "x = a, b" (작은 수부터)
function roots(a, b) {
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  return { s: lo === hi ? `x = ${numStr(lo)}` : `x = ${numStr(lo)}, ${numStr(hi)}`, v: lo * 100.5 + hi };
}
// 이차부등식의 해: inside 이면 "a < x < b", 아니면 "x < a, b < x"
function interval(a, b, inside) {
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  return {
    s: inside ? `${numStr(lo)} < x < ${numStr(hi)}` : `x < ${numStr(lo)}, ${numStr(hi)} < x`,
    v: (inside ? 1 : 2) * 100000 + lo * 100.5 + hi,
  };
}
// 일차부등식의 해 "x < k" 등
const OPS = ['<', '>', '≦', '≧'];
const flipOp = (op) => ({ '<': '>', '>': '<', '≦': '≧', '≧': '≦' })[op];
const half = (op, k) => ({ s: `x ${op} ${numStr(k)}`, v: OPS.indexOf(op) * 1000 + k });

// 평균이 정수가 되는 자료를 만듭니다. devs 는 평균에서 떨어진 정도.
function dataFrom(devs, lowestMean = 6) {
  const mean = lowestMean + Math.max(0, -Math.min(...devs)) + rand(8);
  const values = shuffled(devs.map((d) => mean + d));
  return { mean, values, list: values.join(', ') };
}
// 편차 제곱의 평균(분산)이 정수가 되는 편차 묶음
const VAR_SETS = [[-2, -1, 0, 1, 2], [-4, -2, 0, 2, 4], [-3, -1, 0, 1, 3], [-4, -3, 0, 3, 4], [-1, -1, -1, -1, 4], [-5, 0, 0, 0, 5], [-1, -1, 1, 1], [-2, -2, 2, 2], [-3, -1, 1, 3], [-2, 0, 0, 2], [-4, 0, 0, 4]];
// 분산이 제곱수가 되는 편차 묶음 (표준편차가 정수)
const SD_SETS = [[-2, -2, 2, 2], [-3, -3, 3, 3], [-1, -1, 1, 1], [-1, -1, -1, -1, 4], [-6, -2, 0, 2, 6], [-4, -4, 4, 4], [-3, -1, 0, 1, 3], [-2, -2, -2, -2, 8], [-5, -5, 5, 5]];

Object.assign(GENERATORS, {
  // ---------- 数と式 ----------

  // 전개: (x + a)(x + b). params.hard 이면 (ax + b)(cx + d)
  expand(params) {
    if (params.hard) {
      const a = pickOne([2, 3]);
      const c = pickOne([1, 2, 3]);
      const b = nonzero(-5, 5);
      const d = nonzero(-5, 5);
      return item({ expr: product(a, b, c, d).s }, poly(a * c, a * d + b * c, b * d),
        [poly(a * c, a * d - b * c, b * d), poly(a * c, a * d + b * c, -b * d), poly(a * c, b * d, a * d + b * c)],
        [poly(a + c, a * d + b * c, b * d), poly(a * c, a * d + b * c + 1, b * d)]);
    }
    const a = nonzero(-9, 9);
    const b = nonzero(-9, 9);
    return item({ expr: product(1, a, 1, b).s }, poly(1, a + b, a * b),
      [poly(1, a + b, -a * b), poly(1, a * b, a + b), poly(1, a - b, a * b)],
      [poly(1, -(a + b), a * b), poly(1, a + b, a * b + 1), poly(1, a + b + 1, a * b)]);
  },

  // 인수분해: x² + px + q. params.hard 이면 x² 의 계수가 1 이 아닌 경우
  factor(params) {
    if (params.hard) {
      const a = pickOne([2, 3, 5]);
      const b = pickOne(range(-5, 5).filter((n) => n !== 0 && gcd(a, n) === 1));
      const d = nonzero(-5, 5);
      return item({ expr: polyStr(a, a * d + b, b * d) }, product(a, b, 1, d),
        [product(a, -b, 1, -d), product(a, d, 1, b), product(a, b, 1, -d)],
        [product(a, -b, 1, d), product(1, b, a, d), product(a, b + 1, 1, d)]);
    }
    let a = nonzero(-9, 9);
    let b = nonzero(-9, 9);
    if (a > b) [a, b] = [b, a];
    return item({ expr: polyStr(1, a + b, a * b) }, product(1, a, 1, b),
      [product(1, -b, 1, -a), product(1, -a, 1, b), product(1, a, 1, -b)],
      [product(1, a + 1, 1, b - 1), product(1, a - 1, 1, b + 1), product(1, a, 1, b + 1)]);
  },

  // 제곱근 정리: √n = k√m
  surdSimplify() {
    const k = pickOne([2, 3, 4, 5, 6]);
    const m = pickOne([2, 3, 5, 6, 7]);
    const answer = surd(k, m);
    return item({ n: k * k * m }, answer, [surd(k * k, m), surd(m, k), surd(k + 1, m)], [surd(k - 1, m), times(answer, 2)]);
  },

  // 분모의 유리화: c/√m
  rationalize() {
    const m = pickOne([2, 3, 5, 6, 7]);
    const c = pickOne(range(1, 12));
    const answer = surd(c, m, m);
    return item({ c, m }, answer, [surd(c, m, 1), surd(c, 1, m), surd(c * m, m, 1)], [times(answer, 2), over(answer, 2), surd(c + 1, m, m)]);
  },

  // 일차부등식: ax + b < c. a 가 음수이면 부등호의 방향이 바뀝니다.
  inequality() {
    const a = pickOne([-6, -5, -4, -3, -2, 2, 3, 4, 5, 6]);
    const k = nonzero(-6, 6);
    const b = nonzero(-9, 9);
    const op = pickOne(OPS);
    const answerOp = a > 0 ? op : flipOp(op);
    return item({ lhs: polyStr(0, a, b), op, c: numStr(a * k + b) }, half(answerOp, k),
      [half(flipOp(answerOp), k), half(answerOp, -k), half(flipOp(answerOp), -k)],
      [half(answerOp, k + 1), half(answerOp, k - 1)]);
  },

  // 집합의 원소의 개수: n(A∪B) = n(A) + n(B) − n(A∩B)
  sets() {
    const p = 10 + rand(21);
    const q = 10 + rand(21);
    const r = 2 + rand(Math.min(p, q) - 3);
    return item({ p, q, r }, int(p + q - r), [int(p + q), int(p + q + r), int(p + q - 2 * r)], [int(Math.abs(p - q) + r), int(p + q - r + 1)]);
  },

  // ---------- 二次関数 ----------

  // 꼭짓점: y = a(x − p)² + q
  vertex() {
    const a = pickOne([1, 2, 3, -1, -2]);
    const p = nonzero(-6, 6);
    const q = nonzero(-6, 6);
    return item({ f: vertexForm(a, p, q), ps: numStr(p), qs: numStr(q) }, point(p, q), [point(-p, q), point(p, -q), point(q, p)], [point(-p, -q), point(p + 1, q), point(p, q + 1)]);
  },

  // 완전제곱식으로 고쳐 꼭짓점 구하기: y = ax² + bx + c
  complete() {
    const a = pickOne([1, 1, 2, -1]);
    const p = nonzero(-5, 5);
    const q = nonzero(-5, 5);
    const c0 = a * p * p + q;
    return item({ f: `y = ${polyStr(a, -2 * a * p, c0)}`, form: vertexForm(a, p, q) }, point(p, q),
      [point(-p, q), point(p, c0), point(p, -q)],
      [point(-p, c0), point(2 * p, q), point(p + 1, q)]);
  },

  // 정해진 범위에서의 최솟값·최댓값: y = (x − p)² + q (s ≦ x ≦ t). params.ask 는 'min' 또는 'max'
  maxmin(params) {
    const p = pickOne(range(-3, 3));
    const q = pickOne(range(-5, 5));
    const f = (x) => (x - p) ** 2 + q;
    let s;
    let t;
    if (params.ask === 'min' && Math.random() < 0.7) {
      s = p - (1 + rand(3)); // 꼭짓점이 범위 안
      t = p + (1 + rand(3));
    } else {
      // 양 끝의 함숫값이 달라지도록 범위를 잡습니다. (꼭짓점이 범위 밖일 수도 있습니다)
      s = p - 2 + rand(5);
      t = s + 2 + rand(3);
      if (Math.abs(s - p) === Math.abs(t - p)) t += 1;
    }
    const inside = s <= p && p <= t;
    const low = inside ? q : Math.min(f(s), f(t));
    const high = Math.max(f(s), f(t));
    const answer = int(params.ask === 'min' ? low : high);
    const other = int(params.ask === 'min' ? high : low);
    return item({ f: vertexForm(1, p, q), s: numStr(s), t: numStr(t), axis: numStr(p), vq: numStr(q), vs: numStr(f(s)), vt: numStr(f(t)) }, answer,
      [other, int(q), int(Math.min(f(s), f(t))), int(p)],
      [int(answer.v + 1), int(answer.v - 1), int(f(s) + f(t))]);
  },

  // 이차방정식 풀기 (정수 해)
  quadeq() {
    const a = nonzero(-9, 9);
    const b = pickOne(range(-9, 9).filter((n) => n !== 0 && n !== a));
    return item({ f: `${polyStr(1, -(a + b), a * b)} = 0`, fac: product(1, -Math.min(a, b), 1, -Math.max(a, b)).s, prod: numStr(a * b), lin: numStr(-(a + b)) }, roots(a, b),
      [roots(-a, -b), roots(a, -b), roots(-a, b)],
      [roots(a, b + 1), roots(a - 1, b), roots(a + 1, b + 1)]);
  },

  // 판별식의 값: D = b² − 4ac
  discriminant() {
    const a = pickOne([1, 2, 3, -1]);
    const b = pickOne(range(-8, 8));
    const c = nonzero(-6, 6);
    const D = b * b - 4 * a * c;
    return item({ f: `${polyStr(a, b, c)} = 0`, a, b, c, b2: b * b, ac4: numStr(4 * a * c) }, int(D),
      [int(b * b + 4 * a * c), int(b * b - a * c), int(b - 4 * a * c)],
      [int(4 * a * c - b * b), int(D + 4), int(D - 1)]);
  },

  // 이차부등식 (정수 해 두 개)
  quadineq() {
    const a = nonzero(-8, 8);
    const b = pickOne(range(-8, 8).filter((n) => n !== 0 && n !== a));
    const op = pickOne(['<', '>']);
    const inside = op === '<';
    return item({ f: polyStr(1, -(a + b), a * b), op, fac: product(1, -Math.min(a, b), 1, -Math.max(a, b)).s, r1: numStr(Math.min(a, b)), r2: numStr(Math.max(a, b)) }, interval(a, b, inside),
      [interval(a, b, !inside), interval(-a, -b, inside), interval(-a, -b, !inside)],
      [interval(a, b + 1, inside), interval(a - 1, b, inside), interval(a + 1, b + 2, !inside)]);
  },

  // ---------- データの分析 ----------

  // 평균
  mean() {
    let devs;
    do {
      devs = [nonzero(-5, 5), nonzero(-5, 5), pickOne(range(-5, 5)), pickOne(range(-5, 5))];
      devs.push(-devs.reduce((sum, d) => sum + d, 0));
    } while (Math.abs(devs[4]) > 7);
    const { mean, values, list } = dataFrom(devs);
    const sorted = [...values].sort((x, y) => x - y);
    return item({ list }, int(mean), [int(sorted[2]), int(mean + 1), int(mean - 1)], [int(mean + 2), int(sorted[4] - sorted[0]), int(mean - 2)]);
  },

  // 중앙값 (자료는 크기 순서가 아닙니다)
  median() {
    const count = pickOne([5, 6]);
    const values = [];
    while (values.length < count) {
      const v = 1 + rand(20);
      if (!values.includes(v)) values.push(v);
    }
    const sorted = [...values].sort((x, y) => x - y);
    const answer = dec(count === 5 ? sorted[2] : (sorted[2] + sorted[3]) / 2);
    const naive = dec(count === 5 ? values[2] : (values[2] + values[3]) / 2); // 정렬하지 않고 가운데를 고른 실수
    const mean = dec(Math.round((values.reduce((sum, v) => sum + v, 0) / count) * 10) / 10);
    return item({ list: values.join(', ') }, answer, [naive, mean, dec(sorted[count === 5 ? 1 : 2])],
      [dec(sorted[3]), dec(answer.v + 1), dec(answer.v - 1), dec(answer.v + 2)]);
  },

  // 사분위범위 (자료 7개, 크기 순서)
  iqr() {
    const values = [2 + rand(5)];
    while (values.length < 7) values.push(values[values.length - 1] + 1 + rand(4));
    const [, q1, , med, , q3] = values;
    return item({ list: values.join(', ') }, int(q3 - q1),
      [int(values[6] - values[0]), int(q3 - med), int(med - q1), int(q3)],
      [int(q3 - q1 + 1), int(q3 - q1 - 1), int(q1)]);
  },

  // 분산 (편차 제곱의 평균)
  variance() {
    const devs = pickOne(VAR_SETS);
    const { values, list } = dataFrom(devs);
    const sq = devs.reduce((sum, d) => sum + d * d, 0);
    const n = devs.length;
    const sorted = [...values].sort((x, y) => x - y);
    return item({ list }, int(sq / n),
      [int(sq), dec(Math.round((sq / (n - 1)) * 10) / 10), int(sorted[n - 1] - sorted[0])],
      [int(sq / n + 1), int(sq / n + 2), dec(sq / n / 2)]);
  },

  // 표준편차 (분산의 양의 제곱근)
  sd() {
    const devs = pickOne(SD_SETS);
    const { list } = dataFrom(devs);
    const sq = devs.reduce((sum, d) => sum + d * d, 0);
    const variance = sq / devs.length;
    const answer = int(Math.sqrt(variance));
    return item({ list }, answer, [int(variance), int(sq), int(answer.v + 1)], [int(answer.v + 2), dec(answer.v / 2), int(answer.v * 3)]);
  },
});

// =====================================================================
// 数学I 의 빈 곳 (명제, 공간도형, 상관) 과 数学A (경우의 수·확률, 도형의 성질)
// =====================================================================

const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));
const nPr = (n, r) => fact(n) / fact(n - r);
const nCr = (n, r) => nPr(n, r) / fact(r);
const degree = (x) => ({ s: `${numStr(x)}°`, v: x });
const NOT = { '>': '≦', '≦': '>', '<': '≧', '≧': '<', '=': '≠', '≠': '=' };
// 보기마다 번호를 값으로 주어, 글이 다르면 다른 보기로 봅니다.
const labelled = (texts) => texts.map((s, i) => ({ s, v: i + 1 }));

Object.assign(GENERATORS, {
  // ---------- 数と式: 命題 ----------

  // 명제 "p ⟹ q" 의 역·이·대우. params.ask 는 'converse' | 'inverse' | 'contra'
  proposition(params) {
    const forms = [
      () => { const a = pickOne(range(2, 9)); const b = a - 1 - rand(3); return [`x > ${a}`, `x > ${numStr(b)}`]; },
      () => { const a = pickOne(range(-5, 3)); const b = a + 1 + rand(3); return [`x < ${numStr(a)}`, `x < ${numStr(b)}`]; },
      () => { const a = pickOne(range(2, 6)); return [`x = ${a}`, `x² = ${a * a}`]; },
      () => { const a = pickOne(range(1, 6)); const b = a + 1 + rand(3); return [`x ≧ ${b}`, `x > ${a}`]; },
      () => { const a = pickOne(range(2, 7)); return [`x = ${a}`, `x > ${a - 1 - rand(2)}`]; },
    ];
    const [P, Q] = pickOne(forms)();
    const neg = (text) => {
      const m = text.match(/^(\S+) (\S+) (.+)$/);
      return `${m[1]} ${NOT[m[2]]} ${m[3]}`;
    };
    const imp = (from, to) => `${from} ⟹ ${to}`;
    const all = {
      converse: imp(Q, P),
      inverse: imp(neg(P), neg(Q)),
      contra: imp(neg(Q), neg(P)),
      mixed: imp(neg(P), Q),
      mixed2: imp(P, neg(Q)),
    };
    const order = [params.ask, ...['contra', 'converse', 'inverse', 'mixed', 'mixed2'].filter((k) => k !== params.ask)];
    const [answer, ...rest] = labelled(order.map((k) => all[k]));
    return item({ stmt: imp(P, Q) }, answer, rest);
  },

  // 필요조건·충분조건: "p 는 q 이기 위한 ○○조건". 보기는 말이라서 "@이름" 으로 적습니다. (lang 파일의 opt)
  // pq 는 "p ⟹ q" 가 참인지, qp 는 "q ⟹ p" 가 참인지입니다.
  condition() {
    const a = pickOne(range(2, 7));
    const b = a + 1 + rand(3);
    const k = pickOne([2, 3, 4, 5]);
    // [p, q, p ⟹ q, q ⟹ p]
    const forms = [
      [`x = ${a}`, `x² = ${a * a}`, true, false],
      [`x > ${b}`, `x > ${a}`, true, false],
      [`|x| = ${a}`, `x² = ${a * a}`, true, true],
      [`x > ${a}`, `x² > ${a * a}`, true, false],
      [`x > ${a}`, `x < ${b}`, false, false],
      [`${k}x = ${k * a}`, `x = ${a}`, true, true],
      [`|x| < ${a}`, `x < ${a}`, true, false],
      [`x < ${MINUS}${a}`, `x² > ${a * a}`, true, false],
      [`x = ${b}`, `x > ${a}`, true, false],
      [`x > ${MINUS}${a}`, `x² > ${a * a}`, false, false],
      [`x + ${a} > 0`, `x > ${MINUS}${a}`, true, true],
      [`x² = ${a * a}`, `x > 0`, false, false],
    ];
    let [p, q, pq, qp] = pickOne(forms);
    if (pq !== qp && Math.random() < 0.5) [p, q, pq, qp] = [q, p, qp, pq];
    const name = pq && qp ? '@necsuf' : pq ? '@suf' : qp ? '@nec' : '@neither';
    const all = ['@necsuf', '@suf', '@nec', '@neither'];
    return { p, q, pq: pq ? '@true' : '@false', qp: qp ? '@true' : '@false', answer: name, wrong: all.filter((n) => n !== name) };
  },

  // ---------- 図形と計量: 空間図形 ----------

  // 직육면체의 대각선: √(a² + b² + c²)
  cuboid() {
    let a;
    let b;
    let c;
    do {
      [a, b, c] = [pickOne(range(1, 8)), pickOne(range(1, 8)), pickOne(range(1, 8))];
    } while (a === b && b === c);
    const sq = a * a + b * b + c * c;
    return item({ a, b, c }, surd(1, sq), [surd(1, a * a + b * b), surd(a + b + c), surd(sq), surd(1, a + b + c)],
      [surd(1, sq + 1), surd(1, b * b + c * c), surd(2, sq)]);
  },

  // 두 지점에서 올려본 각으로 탑의 높이 구하기 (∠AHB = 90°)
  // AH = h/tan α, BH = h/tan β 이고 AB² = AH² + BH² 이므로 h = AB ÷ √(1/tan²α + 1/tan²β)
  spaceheight() {
    const COT2x3 = { 30: 9, 45: 3, 60: 1 }; // (1/tan²) × 3
    const al = pickOne([30, 45, 60]);
    const be = pickOne([30, 45, 60]);
    const p = COT2x3[al] + COT2x3[be];
    const d = pickOne(range(2, 12)) * pickOne([1, 2, 5]);
    const answer = surd(d, 3 * p, p);
    return item({ al, be, d }, answer,
      [surd(d, 1, 2), surd(d, 3, 2), surd(d, 2, 2), surd(d), surd(d, 3, 3)],
      [times(answer, 2), over(answer, 2), surd(d, 6, 2)], 'm');
  },

  // ---------- データの分析: 相関 ----------

  // 공분산: 편차의 곱의 평균
  covariance() {
    const SETS = [[-2, -1, 1, 2], [-3, -1, 1, 3], [-1, -1, 1, 1], [-2, 0, 0, 2], [-2, -1, 0, 1, 2], [-4, -2, 0, 2, 4], [-1, 0, 0, 0, 1], [-3, -1, 0, 1, 3]];
    let dx;
    let dy;
    let sum;
    do {
      dx = pickOne(SETS);
      dy = shuffled(pickOne(SETS.filter((set) => set.length === dx.length)));
      sum = dx.reduce((acc, d, i) => acc + d * dy[i], 0);
    } while (sum % dx.length !== 0 || sum === 0);
    const n = dx.length;
    const mx = 3 + Math.max(...dx.map((d) => -d)) + rand(5);
    const my = 3 + Math.max(...dy.map((d) => -d)) + rand(5);
    const order = shuffled(range(0, n - 1));
    const pairs = order.map((i) => `(${mx + dx[i]}, ${my + dy[i]})`).join(', ');
    const cov = sum / n;
    return item({ pairs, mx, my }, int(cov), [int(sum), int(-cov), dec(Math.round((sum / (n - 1)) * 10) / 10)],
      [int(cov + 1), int(cov - 1), int(cov * 2), int(mx * my)]);
  },

  // 상관계수 r = s_xy ÷ (s_x × s_y)
  correlation() {
    let sx;
    let sy;
    let r;
    let sxy;
    do {
      sx = pickOne(range(2, 8));
      sy = pickOne(range(2, 8));
      r = pickOne([0.5, -0.5, 0.8, -0.8, 0.6, -0.6, 0.25, -0.25, 0.75, -0.75, 0.9, -0.9, 0.4, -0.4, 0.2, -0.2]);
      sxy = Math.round(r * sx * sy * 100) / 100;
    } while (Math.round(sxy * 10) !== sxy * 10);
    const two = (v) => ({ s: numStr(Math.round(v * 100) / 100), v: Math.round(v * 100) / 100 });
    return item({ sx, sy, sxy: numStr(sxy) }, two(r), [two(-r), two(sxy / (sx + sy)), two(sxy / sx), two(sxy / sy)],
      [two(r / 2), two(r > 0 ? r - 0.1 : r + 0.1), two(1 - Math.abs(r))]);
  },

  // ---------- 数学A: 場合の数と確率 ----------

  // 순열 nPr
  perm() {
    const n = pickOne(range(4, 10));
    const r = pickOne([2, 3, 4].filter((k) => k < n));
    return item({ n, r }, int(nPr(n, r)), [int(nCr(n, r)), int(n ** r), int(n * r)], [int(fact(r)), int(nPr(n, r) + n), int(nPr(n, r) / 2)]);
  },

  // 조합 nCr
  comb() {
    const n = pickOne(range(5, 12));
    const r = pickOne([2, 3, 4]);
    return item({ n, r }, int(nCr(n, r)), [int(nPr(n, r)), int(n * r), int(n ** r)], [int(nCr(n, r) + n), int(nCr(n, r + 1)), int(nCr(n, r) * 2)]);
  },

  // 원순열 (n − 1)!
  circular() {
    const n = pickOne(range(4, 7));
    return item({ n }, int(fact(n - 1)), [int(fact(n)), int(fact(n) / 2), int(fact(n - 2))], [int(n * n), int(fact(n - 1) * 2), int(n)]);
  },

  // 같은 것이 있는 순열 (p + q)! ÷ (p! q!)
  samearrange() {
    const p = pickOne(range(2, 5));
    const q = pickOne(range(1, 4));
    const answer = fact(p + q) / (fact(p) * fact(q));
    return item({ p, q }, int(answer), [int(fact(p + q)), int(fact(p) * fact(q)), int(fact(p + q) / fact(p))],
      [int(answer + 1), int(answer * 2), int(p * q), int(answer + p + q)]);
  },

  // 주사위 두 개의 눈의 합
  dicesum() {
    const sumTo = pickOne(range(3, 11));
    const ways = 6 - Math.abs(7 - sumTo);
    return item({ s: sumTo }, frac(ways, 36), [frac(1, 11), frac(ways, 12), frac(ways + 1, 36), frac(sumTo, 36)],
      [frac(ways - 1, 36), frac(1, 6), frac(1, 36), frac(ways, 18)]);
  },

  // 여사건: 동전을 n 번 던져 적어도 한 번 앞면
  complement() {
    const n = pickOne(range(2, 6));
    const all = 2 ** n;
    return item({ n }, frac(all - 1, all), [frac(1, all), frac(n, all), frac(1, 2), frac(n, 2 * n + 1)],
      [frac(all - 2, all), frac(all - n, all), frac(1, n)]);
  },

  // 조건부 확률: 되돌려 놓지 않고 두 번 꺼낼 때, 첫 번째가 빨강일 때 두 번째도 빨강
  conditional() {
    const r = pickOne(range(2, 6));
    const w = pickOne(range(2, 6));
    const all = r + w;
    return item({ r, w }, frac(r - 1, all - 1), [frac(r, all), frac(r * (r - 1), all * (all - 1)), frac(r - 1, all), frac(r, all - 1)],
      [frac(w, all - 1), frac(1, 2), frac(r - 1, all + 1)]);
  },

  // 기댓값: 제비 10개 중 a점이 p개, b점이 q개, 나머지는 0점
  expectation() {
    const a = pickOne([50, 100, 200]);
    const b = pickOne([10, 20, 30, 40].filter((v) => v < a));
    const p = pickOne([1, 2]);
    const q = pickOne([2, 3, 4]);
    const e = (a * p + b * q) / 10;
    return item({ a, b, p, q, rest: 10 - p - q }, int(e), [int(a * p + b * q), int((a + b) / 2), int((a + b) / 10), int((a * p + b * q) / (p + q))],
      [int(e + 5), int(e * 2), int(e + 10), int(e / 2)]);
  },

  // ---------- 数学A: 図形の性質 ----------

  // 각의 이등분선: BD : DC = AB : AC
  // 삼각형이 실제로 만들어지고(BC < AB + AC) BD 가 정수가 되도록 숫자를 고릅니다.
  bisector() {
    let c;
    let b;
    let a;
    let unit;
    do {
      const f = pickOne([2, 3, 4]);
      const c1 = pickOne(range(1, 5));
      const b1 = pickOne(range(1, 5).filter((n) => n !== c1 && gcd(n, c1) === 1));
      unit = pickOne(range(1, f - 1));
      [c, b, a] = [f * c1, f * b1, unit * (c1 + b1)];
      unit *= c1; // BD
    } while (a <= Math.abs(b - c) || a >= b + c);
    const bd = unit;
    return item({ c, b, a }, int(bd), [int(a - bd), frac(a, 2), frac(a * c, b), frac(a * b, c)], [int(bd + 1), int(a), frac(bd, 2)]);
  },

  // 무게중심: 중선을 2 : 1 로 나눕니다
  centroid() {
    const m = 3 * pickOne(range(2, 12));
    return item({ m }, int((2 * m) / 3), [int(m / 3), frac(m, 2), int(2 * m)], [int(m), int(m - 3), int((2 * m) / 3 + 1)]);
  },

  // 내심: ∠BIC = 90° + A/2
  incenter() {
    const A = 2 * pickOne(range(15, 60));
    return item({ A }, degree(90 + A / 2), [degree(180 - A), degree(2 * A), degree(90 - A / 2), degree(90 + A)],
      [degree(A / 2), degree(180 - A / 2), degree(A + 10)]);
  },

  // 외심: ∠BOC = 2A (A 는 예각)
  circumcenter() {
    const A = pickOne(range(25, 85));
    return item({ A }, degree(2 * A), [degree(180 - A), degree(90 + A / 2 === Math.floor(90 + A / 2) ? 90 + A / 2 : 90 + (A + 1) / 2), degree(A), degree(180 - 2 * A)],
      [degree(A + 90), degree(2 * A + 10), degree(360 - 2 * A)]);
  },

  // 원주각과 중심각. params.ask 는 'inscribed' (중심각 → 원주각) 또는 'central'
  inscribed(params) {
    const half = pickOne(range(15, 85));
    const full = 2 * half;
    if (params.ask === 'central') {
      return item({ x: half }, degree(full), [degree(half), degree(180 - half), degree(90 + half)], [degree(full + 10), degree(360 - full), degree(half / 2 === Math.floor(half / 2) ? half / 2 : half + 5)]);
    }
    return item({ x: full }, degree(half), [degree(full), degree(180 - full), degree(2 * full)], [degree(half + 10), degree(90 - half), degree(180 - half)]);
  },

  // 원에 내접하는 사각형: 마주 보는 각의 합은 180°
  cyclic() {
    const A = pickOne(range(50, 130).filter((x) => x !== 90));
    return item({ A }, degree(180 - A), [degree(A), degree(360 - A), degree(90 - A > 0 ? 90 - A : A - 90)], [degree(180 - A + 10), degree(2 * A), degree(180 - A - 10)]);
  },

  // 방멱 정리: PA × PB = PC × PD
  power() {
    let a;
    let b;
    let c;
    do {
      a = pickOne(range(2, 9));
      b = pickOne(range(a + 1, 16));
      c = pickOne(range(2, 12));
    } while ((a * b) % c !== 0 || c === a || c === b || (a * b) / c <= c);
    const d = (a * b) / c;
    return item({ a, b, c }, int(d), [int(a + b - c), frac(b * c, a), frac(a * c, b), int(a * b)], [int(d + 1), int(d - 1), int(b - a + c)]);
  },

  // 방멱 정리 (접선): PT² = PA × PB
  tangent() {
    const t = pickOne(range(4, 12));
    const pairs = range(1, t - 1).filter((a) => (t * t) % a === 0); // 1 은 언제나 들어 있습니다.
    const a = pickOne(pairs);
    const b = (t * t) / a;
    return item({ a, b }, int(t), [int(a * b), frac(a + b, 2), int(b - a)], [int(t + 1), int(t - 1), surd(1, a + b), int(2 * t)]);
  },
});

// =====================================================================
// 数学I · 数学A 의 남은 유형 (계산 문제, 정수의 성질, 그래프 읽기)
// =====================================================================

const sgn = (n) => (n < 0 ? MINUS : '+');
const absOf = (a) => (a === 0 ? '|x|' : `|x ${a > 0 ? MINUS : '+'} ${Math.abs(a)}|`); // |x − a|
const lcmOf = (a, b) => (a * b) / gcd(a, b);
const xEquals = (v) => ({ s: `x = ${numStr(v)}`, v });
const setStr = (arr) => `{${[...arr].sort((p, q) => p - q).join(', ')}}`;
const ratio = (m, n) => {
  const g = gcd(m, n);
  return { s: `${m / g} : ${n / g}`, v: m / n };
};
// 보기가 글이나 식으로 정해져 있을 때: 정답과 오답을 그대로 돌려줍니다.
const fixed = (fields, answer, wrong) => ({ ...fields, answer, wrong: wrong.filter((w) => w !== answer).slice(0, 3) });

Object.assign(GENERATORS, {
  // ---------- 数と式 ----------

  // 절댓값이 있는 방정식 |x − a| = b
  abseq() {
    const a = nonzero(-6, 6);
    const b = pickOne(range(1, 7));
    return item({ lhs: absOf(a), b }, roots(a - b, a + b),
      [roots(-a - b, -a + b), roots(a + b, a + b), roots(a - b, a - b)],
      [roots(a - b + 1, a + b), roots(a - b, a + b + 1), roots(b - a - 1, a + b)]);
  },

  // 절댓값이 있는 부등식 |x − a| < b, |x − a| > b
  absineq() {
    const a = nonzero(-6, 6);
    const b = pickOne(range(1, 7));
    const op = pickOne(['<', '>']);
    const inside = op === '<';
    return item({ lhs: absOf(a), b, op }, interval(a - b, a + b, inside),
      [interval(a - b, a + b, !inside), interval(-a - b, -a + b, inside), interval(-a - b, -a + b, !inside)],
      [interval(a - b + 1, a + b + 1, inside), interval(a - b - 1, a + b, inside)]);
  },

  // 연립부등식: 두 부등식을 모두 만족하는 범위
  system() {
    const a = pickOne(range(-5, 3));
    const b = a + 2 + rand(5);
    const p = pickOne([2, 3, 4]);
    const q = nonzero(-7, 7);
    const s = nonzero(-6, 6);
    const i1 = `${polyStr(0, p, q)} > ${numStr(p * a + q)}`;
    const i2 = `x ${sgn(s)} ${Math.abs(s)} ≦ ${numStr(b + s)}`;
    const [A, B] = [numStr(a), numStr(b)];
    const [answer, ...rest] = labelled([`${A} < x ≦ ${B}`, `x > ${A}`, `x ≦ ${B}`, `${A} ≦ x < ${B}`, `x < ${A}, ${B} ≦ x`]);
    return item({ i1, i2 }, answer, shuffled(rest));
  },

  // 대칭식의 값: x + y, xy 로 x² + y² 구하기
  symmetric() {
    const s = nonzero(-7, 7);
    const p = nonzero(-9, 9);
    return item({ s: numStr(s), p: numStr(p) }, int(s * s - 2 * p), [int(s * s + 2 * p), int(s * s - p), int(s * s)],
      [int(s * s - 2 * p + 2), int(2 * s - 2 * p), int(s * s - 2 * p - 1)]);
  },

  // 집합의 연산. params.ask 는 'cap' (교집합) 또는 'cup' (합집합)
  setop(params) {
    let A;
    let B;
    let cap;
    do {
      A = shuffled(range(1, 9)).slice(0, 4);
      B = shuffled(range(1, 9)).slice(0, 4);
      cap = A.filter((n) => B.includes(n));
    } while (cap.length < 1 || cap.length > 3);
    const all = {
      cap: setStr(cap),
      cup: setStr([...new Set([...A, ...B])]),
      onlyA: setStr(A.filter((n) => !B.includes(n))),
      onlyB: setStr(B.filter((n) => !A.includes(n))),
    };
    const order = [params.ask, ...['cap', 'cup', 'onlyA', 'onlyB'].filter((k) => k !== params.ask)];
    const [answer, ...rest] = labelled(order.map((k) => all[k]));
    return item({ A: setStr(A), B: setStr(B) }, answer, rest);
  },

  // 명제가 거짓임을 보이는 반례 고르기
  counter() {
    const a = pickOne(range(2, 6));
    // [명제, 반례, 반례가 아닌 값들]
    const forms = [
      [`x² > ${a * a} ⟹ x > ${a}`, -(a + 1), [a + 1, a, 0, a - 1]],
      [`x² = ${a * a} ⟹ x = ${a}`, -a, [a, 0, a + 1, -(a + 1)]],
      [`x < ${a} ⟹ x² < ${a * a}`, -(a + 1), [0, a + 1, a - 1, -(a - 1)]],
      [`|x| > ${a} ⟹ x > ${a}`, -(a + 1), [a + 1, 0, a, -a]],
    ];
    const [stmt, ce, others] = pickOne(forms);
    return item({ stmt }, xEquals(ce), shuffled(others).map(xEquals));
  },

  // ---------- 二次関数 ----------

  // 그래프의 평행이동
  shift() {
    const a = pickOne([1, 2, 3, -1, -2]);
    const p = nonzero(-5, 5);
    const q = nonzero(-5, 5);
    const form = (pp, qq) => ({ s: vertexForm(a, pp, qq), v: a * (1.37 - pp) ** 2 + qq });
    return item({ f: vertexForm(a, 0, 0), p: numStr(p), q: numStr(q) }, form(p, q), [form(-p, q), form(p, -q), form(-p, -q)], [form(q, p), form(p + 1, q)]);
  },

  // 꼭짓점과 지나는 점으로 이차함수의 계수 a 구하기
  determine() {
    const a = nonzero(-3, 3);
    const p = pickOne(range(-3, 3));
    const q = pickOne(range(-5, 5));
    const dx = pickOne([1, 2, -1, -2]);
    return item({ p: numStr(p), q: numStr(q), x0: numStr(p + dx), y0: numStr(a * dx * dx + q) }, int(a),
      [int(-a), int(a * dx * dx), int(a * dx * dx + q)], [int(a + 1), int(a - 1), int(2 * a), int(a + 2)]);
  },

  // 그래프와 x 축이 만나는 점의 개수
  xcount() {
    const k = pickOne([0, 1, 2]);
    const a = pickOne([1, 2, -1]);
    let f;
    let co; // [a, b, c]
    if (k === 1) {
      const r = nonzero(-5, 5);
      co = [a, -2 * a * r, a * r * r];
    } else if (k === 2) {
      const r1 = nonzero(-5, 5);
      const r2 = pickOne(range(-5, 5).filter((n) => n !== r1));
      co = [a, -a * (r1 + r2), a * r1 * r2];
    } else {
      const p = pickOne(range(-4, 4));
      const q = pickOne(range(1, 6));
      co = [a, -2 * a * p, a * p * p + a * q]; // 꼭짓점이 x 축과 같은 쪽으로 떨어져 있음
    }
    f = polyStr(...co);
    return item({ f: `y = ${f}`, a: numStr(co[0]), b: numStr(co[1]), c: numStr(co[2]), D: numStr(co[1] * co[1] - 4 * co[0] * co[2]) }, int(k), [0, 1, 2, 3].filter((n) => n !== k).map(int));
  },

  // 해가 "모든 실수" 이거나 "없음" 이 되는 이차부등식
  quadspecial() {
    const op = pickOne(['>', '≧', '<', '≦']);
    const a = nonzero(-6, 6);
    const A = numStr(a);
    const options = ['@allreal', '@none', `x = ${A}`, `x ≠ ${A}`];
    if (Math.random() < 0.6) {
      // (x − a)² 꼴: 0 이 되는 곳이 x = a 한 곳뿐
      const answer = { '>': `x ≠ ${A}`, '≧': '@allreal', '<': '@none', '≦': `x = ${A}` }[op];
      return fixed({ f: polyStr(1, -2 * a, a * a), op }, answer, options);
    }
    // 판별식이 음수: 항상 양수
    const q = pickOne(range(1, 6));
    return fixed({ f: polyStr(1, -2 * a, a * a + q), op }, op === '>' || op === '≧' ? '@allreal' : '@none', options);
  },

  // ---------- 図形と計量 ----------

  // 90° − θ, 180° − θ 의 삼각비
  cofunction() {
    const forms = [
      ['sin(180° − θ)', 'sin θ'], ['cos(180° − θ)', `${MINUS}cos θ`], ['tan(180° − θ)', `${MINUS}tan θ`],
      ['sin(90° − θ)', 'cos θ'], ['cos(90° − θ)', 'sin θ'], ['tan(90° − θ)', '1/tan θ'],
    ];
    // 절반은 구체적인 각으로 묻습니다. 예: sin 160° = sin 20°, cos 70° = sin 20°
    if (Math.random() < 0.5) {
      const d = pickOne([10, 15, 20, 25, 35, 40]);
      const numeric = [
        [`sin ${180 - d}°`, `sin ${d}°`], [`cos ${180 - d}°`, `${MINUS}cos ${d}°`], [`tan ${180 - d}°`, `${MINUS}tan ${d}°`],
        [`sin ${90 - d}°`, `cos ${d}°`], [`cos ${90 - d}°`, `sin ${d}°`],
      ];
      const [expr, answer] = pickOne(numeric);
      const pool = expr.startsWith('tan')
        ? [`tan ${d}°`, `${MINUS}tan ${d}°`, `1/tan ${d}°`, `${MINUS}1/tan ${d}°`]
        : [`sin ${d}°`, `${MINUS}sin ${d}°`, `cos ${d}°`, `${MINUS}cos ${d}°`];
      return fixed({ expr }, answer, pool);
    }
    const [expr, answer] = pickOne(forms);
    const pool = expr.startsWith('tan')
      ? ['tan θ', `${MINUS}tan θ`, '1/tan θ', `${MINUS}1/tan θ`]
      : ['sin θ', `${MINUS}sin θ`, 'cos θ', `${MINUS}cos θ`];
    return fixed({ expr }, answer, pool);
  },

  // 삼각비의 값에서 각 구하기 (0° ≦ θ ≦ 180°)
  trigeq() {
    const R2 = '√2/2';
    const R3 = '√3/2';
    const forms = [
      ['sin', '1/2', [30, 150]], ['sin', R2, [45, 135]], ['sin', R3, [60, 120]], ['sin', '1', [90]],
      ['cos', '1/2', [60]], ['cos', R2, [45]], ['cos', R3, [30]], ['cos', `${MINUS}1/2`, [120]], ['cos', `${MINUS}${R2}`, [135]], ['cos', `${MINUS}${R3}`, [150]], ['cos', '0', [90]],
      ['tan', '1', [45]], ['tan', '√3', [60]], ['tan', '1/√3', [30]], ['tan', `${MINUS}1`, [135]], ['tan', `${MINUS}√3`, [120]], ['tan', `${MINUS}1/√3`, [150]],
    ];
    const [fn, val, angles] = pickOne(forms);
    const show = (list) => [...list].sort((p, q) => p - q).map((x) => `${x}°`).join(', ');
    const tries = [
      angles.length > 1 ? [angles[0]] : [angles[0], 180 - angles[0]], // 해를 하나 빠뜨리거나, 없는 해를 더함
      angles.map((x) => Math.abs(90 - x)),                             // sin 과 cos 을 바꿈
      angles.map((x) => 180 - x),                                      // 부호를 놓침
      [30, 150], [60], [45], [120], [135], [60, 120],
    ];
    const seen = new Set([show(angles)]);
    const wrong = [];
    for (const list of tries) {
      const text = show([...new Set(list)]);
      if (wrong.length < 3 && !seen.has(text) && list.every((x) => x > 0 && x < 180 || x === 90)) {
        seen.add(text);
        wrong.push(text);
      }
    }
    return { fn, val, answer: show(angles), wrong };
  },

  // 내접원의 반지름: S = r(a + b + c)/2
  inradius() {
    const [a, b, c, S] = pickOne([[5, 4, 3, 6], [13, 12, 5, 30], [10, 8, 6, 24], [17, 15, 8, 60], [15, 14, 13, 84], [20, 15, 7, 42], [17, 10, 9, 36], [6, 5, 5, 12], [8, 5, 5, 12], [12, 10, 10, 48], [10, 13, 13, 60], [25, 24, 7, 84]]);
    const sum = a + b + c;
    return item({ a, b, c, S }, frac(2 * S, sum), [frac(S, sum), frac(sum, 2), frac(2 * S, a)], [frac(S, a), frac(4 * S, sum), frac(S, 2 * sum)]);
  },

  // ---------- データの分析 ----------

  // 이상값 고르기
  outlier() {
    const q1 = 10 + rand(21);
    const iqr = 2 * (2 + rand(5));
    const q3 = q1 + iqr;
    const lo = q1 - 1.5 * iqr;
    const hi = q3 + 1.5 * iqr;
    const answer = Math.random() < 0.5 ? hi + rand(5) : lo - rand(5);
    return item({ q1, q3 }, int(answer), shuffled([q3 + iqr, q1 - iqr, hi - 1, lo + 1, q3 + 1, q1 - 1]).map(int));
  },

  // 변량의 변환 y = ax + b. params.ask 는 'mean' | 'sd' | 'var'
  transform(params) {
    const a = pickOne([2, 3, -2, 5, 10, -3]);
    const b = nonzero(-4, 4) * 5;
    const m = 10 + rand(51);
    const s = 2 + rand(8);
    const fields = { expr: polyStr(0, a, b), m, s, v: s * s };
    if (params.ask === 'mean') return item(fields, int(a * m + b), [int(a * m), int(m + b), int(a * (m + b))], [int(a * m + b + 5), int(m)]);
    if (params.ask === 'sd') return item(fields, int(Math.abs(a) * s), [int(a * s + b), int(a * a * s), int(s), int(a * s)], [int(Math.abs(a) * s + 1), int(Math.abs(a) + s)]);
    return item(fields, int(a * a * s * s), [int(Math.abs(a) * s * s), int(a * a * s * s + b), int(s * s), int(a * s * s + b)], [int(a * a * s), int(a * a * s * s + 1)]);
  },

  // 히스토그램 읽기. params.ask 는 'mode' (가장 많은 계급의 계급값) 또는 'count' (어떤 값 이상인 사람 수)
  histogram(params) {
    const step = pickOne([5, 10]);
    const from = pickOne([20, 30, 40, 50]);
    let freq;
    do {
      freq = range(1, 5).map(() => 1 + rand(9));
    } while (freq.filter((f) => f === Math.max(...freq)).length !== 1);
    const fields = { freq: freq.join(','), from, step };
    if (params.ask === 'mode') {
      const top = freq.indexOf(Math.max(...freq));
      const mid = (i) => dec(from + step * i + step / 2);
      return item(fields, mid(top), [int(Math.max(...freq)), int(from + step * top), int(from + step * (top + 1))], range(0, 4).filter((i) => i !== top).map(mid));
    }
    const j = 1 + rand(4);
    const above = freq.slice(j).reduce((sum, f) => sum + f, 0);
    const total = freq.reduce((sum, f) => sum + f, 0);
    return item({ ...fields, th: from + step * j }, int(above), [int(total - above), int(freq[j]), int(total)], [int(above + 1), int(above - 1), int(above + freq[j - 1]), int(above + 2)]);
  },

  // 상자그림 읽기. params.ask 는 'iqr' 또는 'range'
  boxplot(params) {
    const lo = 5 * (1 + rand(6));
    const five = [lo];
    for (let i = 0; i < 4; i++) five.push(five[i] + 5 * (1 + rand(3)));
    const [mn, q1, med, q3, mx] = five;
    const fields = { five: five.join(',') };
    if (params.ask === 'iqr') return item(fields, int(q3 - q1), [int(mx - mn), int(q3 - med), int(med), int(med - q1)], [int(q3), int(q3 - q1 + 5), int(q1)]);
    return item(fields, int(mx - mn), [int(q3 - q1), int(mx), int(mx - med), int(mx - q1)], [int(mx - mn + 5), int(mn)]);
  },

  // 산포도를 보고 상관계수 고르기
  scatter() {
    const kind = pickOne(['pos', 'neg', 'none']);
    const corr = (pts) => {
      const n = pts.length;
      const mx = pts.reduce((sum, p) => sum + p[0], 0) / n;
      const my = pts.reduce((sum, p) => sum + p[1], 0) / n;
      const sxy = pts.reduce((sum, p) => sum + (p[0] - mx) * (p[1] - my), 0);
      const sxx = pts.reduce((sum, p) => sum + (p[0] - mx) ** 2, 0);
      const syy = pts.reduce((sum, p) => sum + (p[1] - my) ** 2, 0);
      return sxy / Math.sqrt(sxx * syy);
    };
    let pts;
    let r;
    do {
      pts = range(1, 12).map(() => {
        const x = 1 + rand(9);
        const noise = rand(3) - 1;
        const y = kind === 'pos' ? x + noise : kind === 'neg' ? 10 - x + noise : 1 + rand(9);
        return [x, Math.min(9, Math.max(1, y))];
      });
      r = corr(pts);
    } while (Number.isNaN(r) || (kind === 'pos' && r < 0.88) || (kind === 'neg' && r > -0.88) || (kind === 'none' && Math.abs(r) > 0.1));
    const all = ['0.9', `${MINUS}0.9`, '0', '1.8'];
    return fixed({ pts: pts.map((p) => p.join(',')).join(';') }, { pos: '0.9', neg: `${MINUS}0.9`, none: '0' }[kind], all);
  },

  // ---------- 数学A: 場合の数と確率 ----------

  // 약수의 개수
  divisors() {
    let e;
    do {
      e = [rand(5), rand(4), rand(2)];
    } while (e.filter((x) => x > 0).length < 2 || 2 ** e[0] * 3 ** e[1] * 5 ** e[2] > 720);
    const n = 2 ** e[0] * 3 ** e[1] * 5 ** e[2];
    const count = (e[0] + 1) * (e[1] + 1) * (e[2] + 1);
    return item({ n }, int(count), [int(e.filter((x) => x > 0).reduce((p, x) => p * x, 1)), int(e[0] + e[1] + e[2]), int(count - 2)],
      [int(count + 1), int(count - 1), int(count + 2), int(count * 2)]);
  },

  // 중복순열 n^r
  repperm() {
    const n = pickOne(range(2, 5));
    const r = pickOne(range(2, 4).filter((k) => k !== n));
    return item({ n, r }, int(n ** r), [int(r ** n), int(n * r), int(n >= r ? nPr(n, r) : fact(n))], [int(n ** r + n), int(n + r), int(n ** r * 2)]);
  },

  // 격자 길의 최단 경로
  gridpath() {
    const a = pickOne(range(2, 5));
    const b = pickOne(range(2, 4));
    const ways = nCr(a + b, a);
    return item({ a, b }, int(ways), [int(a * b), int((a + 1) * (b + 1)), int(2 ** (a + b))], [int(ways + a), int(a + b), int(ways * 2)]);
  },

  // 반복시행: 동전을 n 번 던져 앞면이 정확히 k 번
  repeated() {
    const n = pickOne(range(3, 6));
    const k = pickOne(range(1, n - 1));
    const all = 2 ** n;
    return item({ n, k }, frac(nCr(n, k), all), [frac(1, all), frac(k, n), frac(k, all), frac(nCr(n, k), 2 * all)],
      [frac(nCr(n, k) + 1, all), frac(1, 2), frac(n, all)]);
  },

  // 확률의 덧셈정리: a 의 배수 또는 b 의 배수
  union() {
    const N = pickOne([20, 30, 40, 50, 60]);
    // 두 수의 공배수가 범위 안에 적어도 하나는 있는 짝만 냅니다.
    const [a, b] = pickOne([[2, 3], [2, 5], [3, 5], [3, 4], [4, 6], [2, 7], [3, 7]].filter(([x, y]) => lcmOf(x, y) <= N));
    const na = Math.floor(N / a);
    const nb = Math.floor(N / b);
    const nab = Math.floor(N / lcmOf(a, b));
    return item({ N, a, b }, frac(na + nb - nab, N), [frac(na + nb, N), frac(nab, N), frac(na, N), frac(nb, N)],
      [frac(na + nb - nab + 1, N), frac(na + nb - nab - 1, N), frac(1, 2)]);
  },

  // ---------- 数学A: 図形の性質 ----------

  // 접선과 현이 이루는 각
  tanchord() {
    const x = pickOne(range(25, 80).filter((n) => n !== 45 && n !== 60));
    return item({ x }, degree(x), [degree(180 - x), degree(90 - x), degree(2 * x)], [degree(x + 10), degree(180 - 2 * x > 0 ? 180 - 2 * x : x + 20), degree(x - 10)]);
  },

  // 삼각형의 변과 내접원의 접점까지의 길이: AF = (b + c − a) / 2
  tangentlen() {
    let a;
    let b;
    let c;
    do {
      [a, b, c] = [pickOne(range(4, 13)), pickOne(range(4, 13)), pickOne(range(4, 13))];
    } while (a === b || b === c || a === c || a >= b + c || b >= a + c || c >= a + b || (a + b + c) % 2);
    return item({ a, b, c }, int((b + c - a) / 2), [int((a + c - b) / 2), int((a + b - c) / 2), frac(c, 2), int((a + b + c) / 2)], [frac(b, 2), int(c - 1)]);
  },

  // 체바의 정리
  ceva() {
    let p;
    let q;
    let r;
    let s;
    do {
      [p, q, r, s] = [1 + rand(5), 1 + rand(5), 1 + rand(5), 1 + rand(5)];
    } while (gcd(p, q) !== 1 || gcd(r, s) !== 1 || q * s === p * r || p * s === q * r);
    return item({ p, q, r, s }, ratio(q * s, p * r), [ratio(p * r, q * s), ratio(p * s, q * r), ratio(q * r, p * s)], [ratio(q * s + 1, p * r), ratio(q * s, p * r + 1)]);
  },

  // 두 원의 위치 관계: 공통접선의 개수
  twocircles() {
    const r2 = pickOne(range(2, 5));
    const r1 = r2 + pickOne(range(1, 5));
    const k = pickOne([0, 1, 2, 3, 4]);
    const d = [r1 - r2 - 1 > 0 ? r1 - r2 - 1 : 0, r1 - r2, r1 - r2 + 1 + rand(2 * r2 - 1), r1 + r2, r1 + r2 + 1 + rand(4)][k];
    if (k === 0 && d === 0) return GENERATORS.twocircles(); // 중심이 같은 경우는 내지 않습니다.
    return item({ r1, r2, d }, int(k), shuffled([0, 1, 2, 3, 4].filter((n) => n !== k)).map(int));
  },

  // ---------- 数学A: 数学と人間の活動 (整数の性質) ----------

  // 최대공약수와 최소공배수. params.ask 는 'gcd' 또는 'lcm'. params.big 이면 유클리드 호제법용 큰 수
  gcdlcm(params) {
    const g = params.big ? pickOne([7, 11, 13, 17, 19, 23]) : pickOne(range(2, 12));
    let m;
    let n;
    do {
      [m, n] = params.big ? [8 + rand(18), 8 + rand(18)] : [2 + rand(8), 2 + rand(8)];
    } while (m === n || gcd(m, n) !== 1);
    const [a, b] = [g * m, g * n];
    if (params.ask === 'lcm') return item({ a, b }, int(g * m * n), [int(a * b), int(g), int(a + b)], [int(g * m * n * 2), int(g * m * n + g), int(Math.max(a, b))]);
    const near = params.big ? [7, 11, 13, 17, 19, 23, 29].filter((x) => x !== g) : [g * 2, g + 1, 1];
    return item({ a, b }, int(g), [int(g * m * n), int(Math.abs(a - b)), ...shuffled(near).map(int)], [int(g + 2), int(Math.min(a, b))]);
  },

  // 나머지의 계산. params.ask 는 'sum' 또는 'prod'
  remainder(params) {
    const m = pickOne([5, 6, 7, 8, 9, 11]);
    const r1 = 1 + rand(m - 1);
    const r2 = 1 + rand(m - 1);
    const raw = params.ask === 'sum' ? r1 + r2 : r1 * r2;
    return item({ m, r1, r2 }, int(raw % m), [int(raw), int(params.ask === 'sum' ? r1 * r2 : r1 + r2), int(Math.abs(r1 - r2))],
      [int((raw + 1) % m), int((raw + 2) % m), int((raw + 3) % m), int(m)]);
  },

  // 일차부정방정식 ax + by = 1 의 정수해 고르기
  dioph() {
    let a;
    let b;
    do {
      [a, b] = [2 + rand(8), 2 + rand(8)];
    } while (gcd(a, b) !== 1);
    const found = [];
    for (let x = -8; x <= 8; x++) for (let y = -8; y <= 8; y++) if (a * x + b * y === 1) found.push([x, y]);
    const [x0, y0] = found.sort((p, q) => Math.abs(p[0]) + Math.abs(p[1]) - Math.abs(q[0]) - Math.abs(q[1]))[0];
    const others = [[-x0, -y0], [y0, x0], [x0, y0 + 1], [x0 + 1, y0], [x0, -y0], [-x0, y0], [x0 - 1, y0 + 1]].filter(([x, y]) => a * x + b * y !== 1);
    return item({ eq: `${a}x + ${b}y = 1` }, point(x0, y0), others.map(([x, y]) => point(x, y)));
  },

  // n 진법. params.dir 는 'to10' (10진법으로) 또는 'from10' (n 진법으로)
  nbase(params) {
    const base = pickOne([2, 2, 3, 5]);
    const n = base === 2 ? 5 + rand(27) : 5 + rand(base * base * base - 5);
    const digits = n.toString(base);
    const value = (text) => parseInt(text, base);
    if (params.dir === 'to10') {
      const reversed = value(digits.split('').reverse().join(''));
      return item({ num: digits, base }, int(n), [int(reversed), int([...digits].reduce((sum, d) => sum + Number(d), 0)), int(Number(digits))],
        [int(n + 1), int(n - 1), int(n * base), int(n + base)]);
    }
    const text = (v) => ({ s: v.toString(base), v });
    const reversed = value(digits.split('').reverse().join(''));
    return item({ n, base }, text(n), [text(reversed), text(n + 1), text(n - 1), text(n * base)], [text(n + base), text(n + 2)]);
  },
});

// =====================================================================
// 数学I 마무리: 교과서 차례에서 빠져 있던 소단원
// =====================================================================

const kStr = (text) => ({ s: text, v: 0 });
const paren = (c2, c1, c0) => `(${polyStr(c2, c1, c0)})`;
const funcOf = (a, b, c) => ({ s: `y = ${polyStr(a, b, c)}`, v: a * 1.8769 + b * 1.37 + c });
// "a ≦ y ≦ b" 같은 범위 (보기끼리 구별하려고 양 끝 값으로 번호를 만듭니다)
const band = (lo, hi, name = 'y') => ({ s: `${numStr(lo)} ≦ ${name} ≦ ${numStr(hi)}`, v: lo * 1000.5 + hi });

Object.assign(GENERATORS, {
  // ---------- 数と式 ----------

  // 다항식의 덧셈과 뺄셈. params.op 는 '+' 또는 '−'
  polyadd(params) {
    const A = [nonzero(-4, 4), nonzero(-6, 6), nonzero(-7, 7)];
    const B = [nonzero(-4, 4), nonzero(-6, 6), nonzero(-7, 7)];
    const sign = params.op === '+' ? 1 : -1;
    const mix = (s2, s1, s0) => poly(A[0] + s2 * B[0], A[1] + s1 * B[1], A[2] + s0 * B[2]);
    return item({ A: paren(...A), B: paren(...B) }, mix(sign, sign, sign),
      [mix(sign, -sign, -sign), mix(-sign, -sign, -sign), mix(sign, sign, -sign)], [mix(sign, -sign, sign), mix(-sign, sign, sign)]);
  },

  // 전개했을 때의 계수 구하기: (ax + b)(x² + cx + d)
  coef() {
    const a = pickOne([1, 2, 3]);
    const b = nonzero(-5, 5);
    const c = nonzero(-5, 5);
    const d = nonzero(-6, 6);
    const which = pickOne(['x²', 'x']);
    const answer = which === 'x²' ? a * c + b : a * d + b * c;
    const other = which === 'x²' ? a * d + b * c : a * c + b;
    return item({ expr: `${lin(a, b)}${paren(1, c, d)}`, which }, int(answer), [int(other), int(which === 'x²' ? a * c : a * d), int(b * d)],
      [int(answer + 1), int(answer - 1), int(-answer), int(answer + 2)]);
  },

  // 공식을 쓰는 인수분해: 제곱의 차, 완전제곱식
  factor2() {
    if (Math.random() < 0.5) {
      const a = pickOne([1, 2, 3]);
      const b = pickOne(range(1, 7).filter((n) => gcd(n, a) === 1));
      return item({ expr: polyStr(a * a, 0, -b * b) }, product(a, b, a, -b), [product(a, b, a, b), product(a, -b, a, -b), product(1, b, a * a, -b)],
        [product(a, b + 1, a, -b), product(a, b, a, -b - 1)]);
    }
    const a = nonzero(-7, 7);
    return item({ expr: polyStr(1, 2 * a, a * a) }, product(1, a, 1, a), [product(1, -a, 1, -a), product(1, a, 1, -a), product(1, 2 * a, 1, 0)],
      [product(1, a + 1, 1, a - 1), product(1, a + 1, 1, a + 1)]);
  },

  // 순환소수를 분수로
  recurring() {
    const two = Math.random() < 0.5;
    const n = two ? pickOne(range(10, 98).filter((x) => x % 11 !== 0)) : pickOne(range(1, 8));
    const den = two ? 99 : 9;
    const rep = String(n);
    return item({ dec: `0.${rep}${rep}${rep}…` }, frac(n, den), [frac(n, two ? 100 : 10), frac(n, two ? 990 : 90), frac(n, two ? 90 : 99)],
      [frac(n + 1, den), frac(n, den + 1), frac(n - 1, den)]);
  },

  // 절댓값의 계산
  absval() {
    const a = -pickOne(range(2, 9));
    const b = pickOne(range(1, 6));
    const c = b + pickOne(range(1, 7));
    const answer = Math.abs(a) + Math.abs(b - c);
    return item({ expr: `|${numStr(a)}| + |${b} ${MINUS} ${c}|` }, int(answer), [int(a + b - c), int(Math.abs(a) + (b - c)), int(a + (c - b))],
      [int(answer + 1), int(answer + 2), int(Math.abs(a))]);
  },

  // 근호의 덧셈·뺄셈: √12 + √27 = 5√3
  surdadd() {
    const m = pickOne([2, 3, 5, 6, 7]);
    const a = pickOne(range(2, 5));
    const b = pickOne(range(1, 5).filter((n) => n !== a));
    const plus = Math.random() < 0.6;
    const answer = surd(plus ? a + b : a - b, m);
    return item({ expr: `√${m * a * a} ${plus ? '+' : MINUS} √${m * b * b}` }, answer,
      [surd(1, plus ? m * (a * a + b * b) : m * Math.abs(a * a - b * b)), surd(plus ? a - b : a + b, m), surd(a * b, m)],
      [times(answer, 2), surd(plus ? a + b + 1 : a - b - 1, m), surd(a + b, m * m)]);
  },

  // 분모에 근호와 정수가 함께 있을 때의 유리화: c/(√a + b)
  surdbinom() {
    const [c, a, b] = pickOne([[1, 2, 1], [2, 3, 1], [1, 3, 2], [4, 5, 1], [1, 5, 2], [3, 7, 2], [6, 7, 1], [5, 6, 1], [2, 6, 2], [1, 10, 3], [6, 10, 2], [7, 8, 1], [4, 8, 2]]);
    const flipped = a - b * b < 0; // 분모를 정리하면 부호가 바뀌는 경우 (예: 1/(√3 + 2) = 2 − √3)
    const form = (first, sign) => ({
      s: first ? `√${a} ${sign > 0 ? '+' : MINUS} ${b}` : `${b} ${sign > 0 ? '+' : MINUS} √${a}`,
      v: first ? Math.sqrt(a) + sign * b : b + sign * Math.sqrt(a),
    });
    const answer = flipped ? form(false, -1) : form(true, -1);
    return item({ c, a, b }, answer, [form(true, 1), flipped ? form(true, -1) : form(false, -1), { s: `(√${a} ${MINUS} ${b})/${c + 1}`, v: (Math.sqrt(a) - b) / (c + 1) }],
      [{ s: `${c}√${a}`, v: c * Math.sqrt(a) }, { s: `√${a}/${b}`, v: Math.sqrt(a) / b }]);
  },

  // 이중근호 풀기: √(p + q ± 2√(pq)) = √p ± √q
  nested() {
    const [p, q] = pickOne([[3, 2], [5, 2], [5, 3], [7, 2], [6, 5], [7, 3], [7, 5], [3, 1], [2, 1], [5, 1], [6, 1], [7, 1], [7, 6], [10, 3]]);
    const plus = Math.random() < 0.5;
    const root = (n) => (n === 1 ? '1' : `√${n}`);
    const form = (x, y, sign) => ({ s: `${root(x)} ${sign > 0 ? '+' : MINUS} ${root(y)}`, v: Math.sqrt(x) + sign * Math.sqrt(y) });
    return item({ expr: `√(${p + q} ${plus ? '+' : MINUS} 2√${p * q})` }, form(p, q, plus ? 1 : -1),
      [form(p, q, plus ? -1 : 1), form(p + q, p * q, plus ? 1 : -1), form(q, p, -1)], [form(p + 1, q, 1), form(p, q + 1, 1), form(p + q, 1, 1)]);
  },

  // 일차부등식의 활용: 예산 안에서 살 수 있는 가장 많은 개수
  ineqword() {
    const price = pickOne([120, 150, 180, 200, 250]);
    const box = pickOne([50, 80, 100, 150]);
    const budget = 100 * pickOne(range(10, 30));
    const most = Math.floor((budget - box) / price);
    return item({ price, box, budget }, int(most), [int(Math.floor(budget / price)), int(most + 1), int(Math.floor((budget + box) / price))],
      [int(most - 1), int(most + 2), int(most - 2)]);
  },

  // 명제의 참·거짓: 참인 것 고르기
  truth() {
    const a = pickOne(range(2, 6));
    const trues = [`x = ${a} ⟹ x² = ${a * a}`, `x > ${a + 1} ⟹ x > ${a}`, `x² < ${a * a} ⟹ x < ${a}`, `|x| < ${a} ⟹ x < ${a}`, `x > ${a} ⟹ x² > ${a * a}`];
    const falses = [`x² = ${a * a} ⟹ x = ${a}`, `x > ${a} ⟹ x > ${a + 1}`, `x < ${a} ⟹ x² < ${a * a}`, `x² > ${a * a} ⟹ x > ${a}`, `x < ${a} ⟹ |x| < ${a}`];
    const [answer, ...rest] = labelled([pickOne(trues), ...shuffled(falses).slice(0, 3)]);
    return item({}, answer, rest);
  },

  // "그리고", "또는" 이 든 조건의 부정 (드모르간의 법칙). @and, @or 는 lang 파일의 글로 바뀝니다.
  negation() {
    const a = pickOne(range(-4, 3));
    const b = a + 2 + rand(5);
    const [A, B] = [numStr(a), numStr(b)];
    const inner = Math.random() < 0.5; // 원래 조건이 "a < x < b" 꼴인지
    const stmt = inner ? `x > ${A} @and x < ${B}` : `x < ${A} @or x > ${B}`;
    const answer = inner ? `x ≦ ${A} @or x ≧ ${B}` : `x ≧ ${A} @and x ≦ ${B}`;
    const wrong = inner
      ? [`x ≦ ${A} @and x ≧ ${B}`, `x > ${A} @or x < ${B}`, `x < ${A} @or x > ${B}`]
      : [`x ≧ ${A} @or x ≦ ${B}`, `x < ${A} @and x > ${B}`, `x > ${A} @and x < ${B}`];
    return { stmt, answer, wrong };
  },

  // ---------- 二次関数 ----------

  // 함숫값 f(k)
  fvalue() {
    const a = nonzero(-3, 3);
    const b = nonzero(-5, 5);
    const c = pickOne(range(-6, 6));
    const k = nonzero(-4, 4);
    const f = (x) => a * x * x + b * x + c;
    return item({ f: polyStr(a, b, c), k: numStr(k), sub: `${numStr(a)} × (${numStr(k)})² ${b < 0 ? MINUS : '+'} ${Math.abs(b)} × (${numStr(k)}) ${c < 0 ? MINUS : '+'} ${Math.abs(c)}`, t1: numStr(a * k * k), t2: numStr(b * k), t3: numStr(c) }, int(f(k)), [int(f(-k)), int(-a * k * k + b * k + c), int(a * k * 2 + b * k + c)],
      [int(f(k) + 1), int(f(k) - 1), int(f(k) + 2)]);
  },

  // 일차함수의 치역
  range1() {
    const a = nonzero(-4, 4);
    const b = pickOne(range(-6, 6));
    const s = pickOne(range(-4, 2));
    const t = s + 1 + rand(5);
    const [y1, y2] = [a * s + b, a * t + b];
    const lo = Math.min(y1, y2);
    const hi = Math.max(y1, y2);
    return item({ f: `y = ${polyStr(0, a, b)}`, s: numStr(s), t: numStr(t) }, band(lo, hi),
      [band(s, t), band(Math.min(-a * s + b, -a * t + b), Math.max(-a * s + b, -a * t + b)), band(lo - b, hi - b)],
      [band(lo, hi + 1), band(lo - 1, hi), band(lo + 1, hi + 1)]);
  },

  // 그래프의 대칭이동. axis 는 '@xaxis' | '@yaxis' | '@origin'
  reflect() {
    const a = pickOne([1, 2, 3, -1, -2]);
    const b = nonzero(-6, 6);
    const c = nonzero(-6, 6);
    const moved = { '@xaxis': funcOf(-a, -b, -c), '@yaxis': funcOf(a, -b, c), '@origin': funcOf(-a, b, -c) };
    const axis = pickOne(Object.keys(moved));
    return item({ f: `y = ${polyStr(a, b, c)}`, axis }, moved[axis], Object.keys(moved).filter((k) => k !== axis).map((k) => moved[k]),
      [funcOf(-a, -b, c), funcOf(a, b, -c), funcOf(-a, b, c)]);
  },

  // 세 점을 지나는 이차함수
  threepoints() {
    const a = pickOne([1, 2, -1, -2, 3]);
    const b = nonzero(-4, 4);
    const c = nonzero(-5, 5);
    return item({ y0: numStr(c), y1: numStr(a + b + c), y2: numStr(a - b + c) }, funcOf(a, b, c), [funcOf(a, -b, c), funcOf(-a, b, c), funcOf(a, b, -c)],
      [funcOf(b, a, c), funcOf(a, b, c + 1), funcOf(a + 1, b, c)]);
  },

  // 최댓값이 주어졌을 때 상수 c 구하기: y = x² − 2px + c (s ≦ x ≦ t)
  maxminconst() {
    const p = pickOne(range(-2, 3));
    const left = 1 + rand(3);
    const right = pickOne(range(1, 4).filter((n) => n !== left));
    const s = p - left;
    const t = p + right;
    const c = pickOne(range(-6, 6));
    const g = (x) => x * x - 2 * p * x;
    const far = left > right ? s : t;
    const near = left > right ? t : s;
    const M = g(far) + c;
    return item({ f: `y = ${polyStr(1, -2 * p, 0)} + c`, s: numStr(s), t: numStr(t), M: numStr(M) }, int(c), [int(M - g(near)), int(M - g(p)), int(M)],
      [int(c + 1), int(c - 1), int(-c), int(c + 2)]);
  },

  // 근의 공식 (해가 무리수)
  formula() {
    let b;
    let c;
    let D;
    let s;
    do {
      b = nonzero(-7, 7);
      c = nonzero(-6, 6);
      D = b * b - 4 * c;
      s = D > 0 ? surd(1, D) : null;
    } while (!s || s.r === 1);
    const form = (bb, dd) => {
      const q = surd(1, dd);
      const root = `${q.n === 1 ? '' : q.n}√${q.r}`;
      const v = (-bb + Math.sqrt(dd)) / 2;
      if (bb % 2 === 0 && q.n % 2 === 0) return { s: `x = ${numStr(-bb / 2)} ± ${q.n / 2 === 1 ? '' : q.n / 2}√${q.r}`, v };
      return { s: `x = (${numStr(-bb)} ± ${root})/2`, v };
    };
    const plain = (bb, dd) => {
      const q = surd(1, dd);
      return { s: `x = ${numStr(-bb)} ± ${q.n === 1 ? '' : q.n}√${q.r}`, v: -bb + Math.sqrt(dd) + 0.001 };
    };
    const wrongD = b * b + 4 * c;
    return item({ f: `${polyStr(1, b, c)} = 0`, bs: numStr(b), cs: numStr(c), nb: numStr(-b), D }, form(b, D), [form(-b, D), plain(b, D), wrongD > 0 && surd(1, wrongD).r !== 1 ? form(b, wrongD) : null],
      [plain(-b, D), form(b, D + 4), form(b + 2, D + 4)]);
  },

  // 이차방정식이 실수해를 가질 조건. cond 는 '@real' | '@two' | '@noreal'
  realcond() {
    const m = nonzero(-5, 5);
    const k = numStr(m * m);
    const cond = pickOne(['@real', '@two', '@noreal']);
    const answer = { '@real': `k ≦ ${k}`, '@two': `k < ${k}`, '@noreal': `k > ${k}` }[cond];
    return fixed({ f: `${polyStr(1, 2 * m, 0)} + k = 0`, cond }, answer, [`k ≦ ${k}`, `k < ${k}`, `k > ${k}`, `k ≧ ${k}`]);
  },

  // 모든 실수 x 에서 x² + kx + m² > 0 이 되는 k 의 범위
  alwayspos() {
    const m = pickOne(range(1, 6));
    const kband = (lo, hi, inside) => ({ s: inside ? `${numStr(lo)} < k < ${numStr(hi)}` : `k < ${numStr(lo)}, ${numStr(hi)} < k`, v: (inside ? 1 : 2) * 1000 + hi });
    return item({ f: `${polyStr(1, 0, 0)} + kx + ${m * m}` }, kband(-2 * m, 2 * m, true), [kband(-2 * m, 2 * m, false), kband(-m, m, true), kband(-4 * m * m, 4 * m * m, true)],
      [kband(-m * m, m * m, true), kband(-2 * m - 1, 2 * m + 1, true)]);
  },

  // 연립이차부등식: 이차부등식과 일차부등식을 함께
  quadsystem() {
    const a = pickOne(range(-6, 2));
    const b = a + 3 + rand(5);
    const c = a + 1 + rand(b - a - 1);
    const right = Math.random() < 0.5;
    return item({ f: polyStr(1, -(a + b), a * b), g: `x ${right ? '>' : '<'} ${numStr(c)}` }, right ? interval(c, b, true) : interval(a, c, true),
      [interval(a, b, true), right ? interval(a, c, true) : interval(c, b, true), half(right ? '>' : '<', c)],
      [interval(a, b, false), right ? interval(c, b + 1, true) : interval(a - 1, c, true)]);
  },

  // 이차함수의 활용: 끈으로 만드는 직사각형의 넓이의 최댓값
  rectmax() {
    const P = 4 * pickOne(range(3, 15));
    const side = P / 4;
    return item({ P }, int(side * side), [int((P / 2) * (P / 2)), int(side * (side + 1)), int(P * side)], [int(side * side + side), int(side * side * 2), int(side * side - 1)], 'cm²');
  },

  // ---------- 図形と計量 ----------

  // 세 변으로 삼각형의 모양 판정
  tritype() {
    const kind = pickOne(['@acute', '@right', '@obtuse', '@notri']);
    let a;
    let b;
    let c;
    do {
      a = pickOne(range(2, 12));
      b = pickOne(range(a, 13));
      c = pickOne(range(b + 1, 20));
    } while ({ '@notri': c < a + b, '@right': c >= a + b || a * a + b * b !== c * c, '@acute': c >= a + b || a * a + b * b <= c * c, '@obtuse': c >= a + b || a * a + b * b >= c * c }[kind]);
    return fixed({ a, b, c }, kind, ['@acute', '@right', '@obtuse', '@notri']);
  },

  // 헤론의 공식: 세 변으로 넓이 구하기
  heron() {
    const [a, b, c, S] = pickOne([[15, 14, 13, 84], [20, 15, 7, 42], [17, 10, 9, 36], [6, 5, 5, 12], [8, 5, 5, 12], [10, 13, 13, 60], [20, 13, 11, 66], [15, 13, 4, 24], [21, 20, 13, 126], [25, 17, 12, 90], [28, 25, 17, 210], [29, 25, 6, 60], [35, 29, 8, 84], [14, 13, 15, 84], [16, 17, 17, 120]]);
    const s = (a + b + c) / 2;
    return item({ a, b, c }, int(S), [int(2 * S), frac(S, 2), int(s), dec(Math.round(s * (s - a) * 10) / 10)], [int(S + s), int(S - 6), int(S + 6)]);
  },

  // 정사면체의 높이와 부피. params.ask 는 'height' 또는 'volume'
  tetra(params) {
    const a = pickOne([2, 3, 4, 5, 6, 8, 9, 10, 12, 15]);
    if (params.ask === 'height') {
      return item({ a }, surd(a, 6, 3), [surd(a, 3, 2), surd(a, 6, 2), surd(a, 2, 3), surd(a, 3, 3)], [surd(a, 6, 6), surd(a, 2, 2)]);
    }
    const cube = a * a * a;
    return item({ a }, surd(cube, 2, 12), [surd(cube, 2, 4), surd(cube, 3, 12), surd(cube, 2, 6), surd(cube, 6, 12)], [surd(cube, 3, 4), surd(cube, 2, 3)]);
  },

  // ---------- データの分析 ----------

  // 최빈값
  mode() {
    let values;
    let counts;
    let top;
    do {
      const base = 2 + rand(6);
      values = range(1, 9).map(() => base + rand(6));
      counts = {};
      values.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
      top = Math.max(...Object.values(counts));
    } while (Object.values(counts).filter((n) => n === top).length !== 1 || top < 3);
    const answer = Number(Object.keys(counts).find((k) => counts[k] === top));
    const sorted = [...values].sort((x, y) => x - y);
    return item({ list: values.join(', ') }, int(answer), [int(sorted[4]), int(top), int(sorted[8])], shuffled([...new Set(values)]).map(int));
  },

  // 도수분포(히스토그램)에서 평균 구하기
  histmean() {
    const from = pickOne([0, 10, 20, 40]);
    let freq;
    do {
      freq = [1 + rand(3), 1 + rand(4), 1 + rand(4), 1 + rand(3)];
    } while (freq.reduce((sum, f) => sum + f, 0) !== 10);
    const mids = freq.map((_, i) => from + 5 + 10 * i);
    const mean = freq.reduce((sum, f, i) => sum + f * mids[i], 0) / 10;
    const top = freq.indexOf(Math.max(...freq));
    return item({ freq: freq.join(','), from, step: 10 }, dec(mean), [dec(mids.reduce((sum, m) => sum + m, 0) / 4), dec(mean - 5), dec(mids[top]), dec(mean + 5)],
      [dec(mean + 1), dec(mean - 1), dec(mean + 2)]);
  },

  // 가설검정의 생각: 30번 중 k 번 이상이 "우연히" 일어날 확률과 기준 0.05 를 비교합니다.
  // 확률은 동전을 30번 던져 앞면이 k 번 이상 나올 확률(이항분포)입니다.
  hypothesis() {
    const table = { 16: '0.428', 17: '0.292', 18: '0.181', 19: '0.100', 20: '0.049', 21: '0.021', 22: '0.008', 23: '0.003' };
    const k = pickOne([16, 17, 18, 19, 20, 21, 22, 23]);
    return fixed({ k, p: table[k] }, Number(table[k]) < 0.05 ? '@reject' : '@keep', ['@reject', '@keep', '@surely', '@never']);
  },

  // 분산의 다른 공식: (x² 의 평균) − (평균)²
  var2() {
    const m = pickOne(range(2, 9));
    const v = pickOne(range(1, 12));
    const q = m * m + v;
    return item({ m, q }, int(v), [int(q - m), int(q), int(q + m * m)], [int(v + 1), int(v * 2), int(q - 2 * m), int(v - 1)]);
  },

  // 두 집단을 합친 평균
  mergemean() {
    let n1;
    let n2;
    let m1;
    let m2;
    let mean;
    do {
      [n1, n2] = [pickOne([10, 20, 30, 40]), pickOne([10, 20, 30, 40])];
      [m1, m2] = [40 + rand(41), 40 + rand(41)];
      mean = (n1 * m1 + n2 * m2) / (n1 + n2);
    } while (n1 === n2 || m1 === m2 || Math.round(mean * 10) !== mean * 10);
    return item({ n1, n2, m1, m2 }, dec(mean), [dec((m1 + m2) / 2), dec((n1 * m2 + n2 * m1) / (n1 + n2)), dec(Math.max(m1, m2))], [dec(mean + 1), dec(mean - 1), dec(Math.min(m1, m2))]);
  },
});

// 집합의 연산에 여집합을 더합니다. (전체집합은 1 ~ 9)
const baseSetop = GENERATORS.setop;
GENERATORS.setop = function setop(params) {
  if (!params.options) return baseSetop(params);
  let A;
  let B;
  let cap;
  do {
    A = shuffled(range(1, 9)).slice(0, 4);
    B = shuffled(range(1, 9)).slice(0, 4);
    cap = A.filter((n) => B.includes(n));
  } while (cap.length < 1 || cap.length > 3);
  const U = range(1, 9);
  const cup = [...new Set([...A, ...B])];
  const all = {
    cap: setStr(cap),
    cup: setStr(cup),
    onlyA: setStr(A.filter((n) => !B.includes(n))),
    onlyB: setStr(B.filter((n) => !A.includes(n))),
    notA: setStr(U.filter((n) => !A.includes(n))),
    notB: setStr(U.filter((n) => !B.includes(n))),
    notcup: setStr(U.filter((n) => !cup.includes(n))),
    notcap: setStr(U.filter((n) => !cap.includes(n))),
  };
  const [answer, ...rest] = labelled(params.options.map((k) => all[k]));
  return item({ A: setStr(A), B: setStr(B) }, answer, rest);
};

// =====================================================================
// 数学A 마무리
// =====================================================================

Object.assign(GENERATORS, {
  // 조 나누기. params.labelled 이면 조에 이름(방 A, B, …)이 있어 서로 구별합니다.
  grouping(params) {
    const [n, size, groups] = pickOne([[4, 2, 2], [6, 2, 3], [6, 3, 2], [8, 4, 2], [8, 2, 4], [9, 3, 3], [10, 5, 2]]);
    const named = fact(n) / fact(size) ** groups; // 조를 구별할 때
    const plain = named / fact(groups);            // 조를 구별하지 않을 때
    const answer = params.labelled ? named : plain;
    return item({ n, size, groups }, int(answer), [int(params.labelled ? plain : named), int(nCr(n, size)), int(fact(n) / fact(size))],
      [int(answer * 2), int(answer + groups), int(nPr(n, size)), int(answer + 1)]);
  },

  // 조건이 붙은 순열. params.ask 는 'adjacent' (두 사람이 이웃) 또는 'ends' (두 사람이 양 끝)
  permcond(params) {
    const n = pickOne(range(4, 8));
    const answer = params.ask === 'adjacent' ? 2 * fact(n - 1) : 2 * fact(n - 2);
    return item({ n }, int(answer), [int(answer / 2), int(fact(n)), int(params.ask === 'adjacent' ? 2 * fact(n - 2) : 2 * fact(n - 1))],
      [int(fact(n) / 2), int(answer * 2), int(fact(n - 1) + 2)]);
  },

  // 남녀를 나누어 뽑는 조합
  combcond() {
    const a = pickOne(range(3, 7));
    const b = pickOne(range(3, 6));
    const p = pickOne(range(1, Math.min(3, a - 1)));
    const q = pickOne(range(1, Math.min(2, b - 1)));
    const answer = nCr(a, p) * nCr(b, q);
    return item({ a, b, p, q }, int(answer), [int(nCr(a, p) + nCr(b, q)), int(nCr(a + b, p + q)), int(nPr(a, p) * nPr(b, q))],
      [int(answer + a), int(answer * 2), int(a * b), int(answer + 1)]);
  },

  // 중복조합: n 종류에서 중복을 허락해 r 개 고르기
  homogeneous() {
    const n = pickOne(range(2, 4));
    const r = pickOne(range(3, 6));
    const answer = nCr(n + r - 1, r);
    return item({ n, r }, int(answer), [int(n ** r), int(nCr(n + r, r)), int(n * r)], [int(answer + 1), int(answer + n), int(answer * 2)]);
  },

  // 독립인 두 시행. params.ask 는 'both' (둘 다 성공) 또는 'atleast' (적어도 한쪽 성공)
  indep(params) {
    const [a, b] = pickOne([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5]]);
    const [c, d] = pickOne([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [4, 5]].filter(([x, y]) => x !== a || y !== b));
    const both = frac(a * c, b * d);
    const atleast = frac(b * d - (b - a) * (d - c), b * d);
    const fields = { p1: `${a}/${b}`, p2: `${c}/${d}` };
    if (params.ask === 'both') return item(fields, both, [a * d + b * c < b * d ? frac(a * d + b * c, b * d) : null, atleast, frac(a + c, b + d)], [frac(a, b), frac(c, d), frac(1, b * d)]);
    return item(fields, atleast, [both, frac((b - a) * (d - c), b * d), frac(a + c, b + d)], [frac(a, b), frac(c, d), frac(b * d - 1, b * d)]);
  },

  // 확률의 곱셈정리: 되돌려 놓지 않고 두 번 꺼내기. params.ask 는 'rr' (둘 다 빨강) 또는 'rw' (빨강, 흰색 순서)
  multiply(params) {
    const r = pickOne(range(2, 6));
    const w = pickOne(range(2, 6));
    const all = r + w;
    const answer = params.ask === 'rr' ? frac(r * (r - 1), all * (all - 1)) : frac(r * w, all * (all - 1));
    return item({ r, w }, answer, [params.ask === 'rr' ? frac(r * r, all * all) : frac(r * w, all * all), frac(r, all), frac(r - 1, all - 1), frac(w, all - 1)],
      [frac(r * w * 2, all * (all - 1)), frac(1, all), frac(r, all - 1)]);
  },

  // 원인의 확률: 불량품이 A 에서 나왔을 확률
  bayes() {
    const share = pickOne([20, 30, 40, 50, 60, 70, 80]);
    const a = pickOne(range(1, 5));
    const b = pickOne(range(1, 5).filter((n) => n !== a));
    const fromA = share * a;
    const fromB = (100 - share) * b;
    return item({ share, rest: 100 - share, a, b }, frac(fromA, fromA + fromB), [frac(a, a + b), frac(share, 100), frac(fromB, fromA + fromB), frac(fromA, 10000)],
      [frac(a, 100), frac(fromA + 1, fromA + fromB + 1), frac(1, 2)]);
  },

  // 메넬라우스의 정리
  menelaus() {
    let p;
    let q;
    let r;
    let s;
    do {
      [p, q, s] = [1 + rand(4), 1 + rand(4), 1 + rand(3)];
      r = s + 1 + rand(3); // P 는 BC 의 C 쪽 연장선 위에 있으므로 BP > PC
    } while (gcd(p, q) !== 1 || gcd(r, s) !== 1 || s * q === r * p);
    return item({ p, q, r, s }, ratio(s * q, r * p), [ratio(r * p, s * q), ratio(r * q, s * p), ratio(s * p, r * q)], [ratio(s * q + 1, r * p), ratio(s * q, r * p + 1)]);
  },

  // 변과 각의 크기 관계: 가장 큰 각
  largestangle() {
    let a;
    let b;
    let c;
    do {
      [a, b, c] = [pickOne(range(3, 12)), pickOne(range(3, 12)), pickOne(range(3, 12))];
    } while (a === b || b === c || a === c || a >= b + c || b >= a + c || c >= a + b);
    const top = Math.max(a, b, c);
    return fixed({ a, b, c }, top === a ? '∠A' : top === b ? '∠B' : '∠C', ['∠A', '∠B', '∠C', '@allsame']);
  },

  // 오일러의 다면체 정리 v − e + f = 2
  euler() {
    const [v, e, f] = pickOne([[4, 6, 4], [8, 12, 6], [6, 12, 8], [20, 30, 12], [12, 30, 20], [5, 8, 5], [6, 9, 5], [7, 12, 7], [10, 15, 7], [9, 16, 9], [12, 18, 8]]);
    const ask = pickOne(['@vertices', '@edges', '@faces']);
    const answer = { '@vertices': v, '@edges': e, '@faces': f }[ask];
    const given = { '@vertices': `@edges ${e}, @faces ${f}`, '@edges': `@vertices ${v}, @faces ${f}`, '@faces': `@vertices ${v}, @edges ${e}` }[ask];
    const sum = ask === '@edges' ? v + f : ask === '@vertices' ? e + f : v + e;
    return item({ given, ask }, int(answer), [int(answer + 2), int(answer - 2), int(sum), int(answer + 4)], [int(answer + 1), int(answer - 1)]);
  },

  // 소인수분해
  primefactor() {
    let e;
    let n;
    do {
      e = [rand(5), rand(4), rand(3), rand(2)];
      n = 2 ** e[0] * 3 ** e[1] * 5 ** e[2] * 7 ** e[3];
    } while (e.filter((x) => x > 0).length < 2 || n > 900 || n < 12);
    const SUP = ['', '', '²', '³', '⁴'];
    const show = (ex) => {
      const text = [2, 3, 5, 7].map((prime, i) => (ex[i] > 0 ? `${prime}${SUP[ex[i]]}` : '')).filter(Boolean).join(' × ');
      return { s: text, v: 2 ** ex[0] * 3 ** ex[1] * 5 ** ex[2] * 7 ** ex[3] };
    };
    const bump = (i, d) => e.map((x, k) => (k === i ? Math.max(0, Math.min(4, x + d)) : x));
    const first = e.findIndex((x) => x > 0);
    const last = e.length - 1 - [...e].reverse().findIndex((x) => x > 0);
    return item({ n }, show(e), [show(bump(first, 1)), show(bump(last, 1)), show(bump(first, -1))], [show(bump(last, -1)), show(bump(0, 1)), show(bump(1, 1)), show(bump(2, 1))]);
  },

  // 배수의 판정: 9 의 배수가 되도록 빈칸의 숫자 정하기
  divisible() {
    let a;
    let b;
    let c;
    let d;
    do {
      [a, b, c] = [1 + rand(9), rand(10), rand(10)];
      d = (9 - ((a + b + c) % 9)) % 9;
    } while (d === 0); // 0 과 9 가 모두 답이 되는 경우는 내지 않습니다.
    return item({ num: `${a}${b}□${c}` }, int(d), shuffled(range(1, 8).filter((x) => x !== d)).slice(0, 5).map(int));
  },

  // 유한소수가 되는 분수 고르기
  finitedec() {
    const good = pickOne([[3, 8], [7, 20], [9, 25], [3, 40], [11, 16], [7, 50], [13, 80], [9, 125], [1, 32], [3, 16]]);
    const bad = shuffled([[5, 12], [4, 15], [7, 30], [2, 9], [5, 14], [8, 21], [5, 18], [7, 24], [4, 35], [1, 6], [5, 22], [7, 45]]).slice(0, 3);
    const show = ([n, d]) => ({ s: `${n}/${d}`, v: n / d });
    return item({}, show(good), bad.map(show));
  },

  // 공간의 좌표. params.ask 는 'dist' (원점까지의 거리) 또는 'mirror' (좌표평면에 대한 대칭점)
  coord3d(params) {
    const a = nonzero(-6, 6);
    const b = nonzero(-6, 6);
    const c = nonzero(-6, 6);
    const P = `(${numStr(a)}, ${numStr(b)}, ${numStr(c)})`;
    if (params.ask === 'dist') {
      const sq = a * a + b * b + c * c;
      return item({ P }, surd(1, sq), [surd(1, a * a + b * b), surd(Math.abs(a) + Math.abs(b) + Math.abs(c)), surd(sq)], [surd(1, sq + 1), surd(2, sq), surd(1, b * b + c * c)]);
    }
    const plane = pickOne(['xy', 'yz', 'zx']);
    const pt = (x, y, z) => ({ s: `(${numStr(x)}, ${numStr(y)}, ${numStr(z)})`, v: x * 10000.5 + y * 100.25 + z });
    const mirror = { xy: pt(a, b, -c), yz: pt(-a, b, c), zx: pt(a, -b, c) };
    return item({ P, plane }, mirror[plane], Object.keys(mirror).filter((k) => k !== plane).map((k) => mirror[k]), [pt(-a, -b, -c), pt(-a, -b, c), pt(a, -b, -c)]);
  },
});

// =====================================================================
// 연속기: 한 상황에서 물음 (1)(2)(3) 을 이어 푸는 문제
// 돌려주는 것: { ...지문과 그림에 들어갈 값, steps: [{ answer, wrong }, …] }
// 앞 물음의 정답은 뒤 물음의 문장에서 {a1}, {a2} 로 쓸 수 있습니다.
// =====================================================================
const step = (answer, candidates, pads) => item({}, answer, candidates, pads);
// 연속기용 삼각형 [a, b, c, A]: 각 A 가 60° 또는 120° 이고 세 변이 모두 정수인 것
const CHAIN_TRIANGLES = [
  [7, 3, 8, 60], [7, 5, 8, 60], [13, 7, 15, 60], [13, 8, 15, 60], [14, 6, 16, 60], [14, 10, 16, 60], [19, 5, 21, 60], [19, 16, 21, 60], [21, 9, 24, 60], [21, 15, 24, 60], [31, 11, 35, 60], [31, 24, 35, 60],
  [7, 3, 5, 120], [13, 7, 8, 120], [19, 5, 16, 120], [14, 6, 10, 120], [21, 9, 15, 120], [26, 14, 16, 120], [31, 11, 24, 120], [37, 7, 33, 120],
];
// 연속기용 직각삼각형 [a, b, c] (c 가 빗변)
const CHAIN_RIGHT = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [6, 8, 10], [9, 12, 15], [20, 21, 29], [12, 16, 20], [9, 40, 41], [15, 20, 25]];

export const CHAINS = {
  // 이차함수: 완전제곱식 → 꼭짓점 → 정해진 범위에서의 최댓값
  quad() {
    const p = nonzero(-3, 3);
    const q = pickOne(range(-5, 5));
    const left = 1 + rand(3);
    const right = pickOne(range(1, 4).filter((n) => n !== left));
    const [s, t] = [p - left, p + right];
    const f = (x) => (x - p) ** 2 + q;
    const c = p * p + q;
    const form = (pp, qq) => ({ s: vertexForm(1, pp, qq), v: (1.37 - pp) ** 2 + qq });
    const max = Math.max(f(s), f(t));
    return {
      f: `y = ${polyStr(1, -2 * p, c)}`, s: numStr(s), t: numStr(t),
      steps: [
        step(form(p, q), [form(-p, q), form(p, c), form(p, -q)], [form(-p, c), form(p + 1, q)]),
        step(point(p, q), [point(-p, q), point(p, -q), point(q, p)], [point(-p, -q), point(p + 1, q)]),
        step(int(max), [int(Math.min(f(s), f(t))), int(q), int(p)], [int(max + 1), int(max - 1), int(f(s) + f(t))]),
      ],
    };
  },

  // 삼각형: 코사인 법칙으로 변 → 넓이 → 내접원의 반지름
  tri() {
    let [a, b, c, A] = pickOne(CHAIN_TRIANGLES);
    if (Math.random() < 0.5) [b, c] = [c, b];
    const bc = b * c;
    const sum = a + b + c;
    const area = surd(bc, 3, 4);
    const other = Math.round(Math.sqrt(b * b + c * c + (A === 60 ? 1 : -1) * bc) * 100) / 100; // cos 의 부호를 틀린 값
    return {
      b, c, A,
      steps: [
        step(int(a), [dec(other), surd(1, b * b + c * c), int(b + c)], [int(a + 1), int(a - 1), int(a + 2)]),
        step(area, [surd(bc, 1, 4), surd(bc, 3, 2), surd(bc, 1, 2)], [times(area, 2), over(area, 2)]),
        step(surd(bc, 3, 2 * sum), [surd(bc, 3, 4 * sum), surd(bc, 3, sum), surd(sum, 1, 2)], [surd(bc, 1, 2 * sum), surd(bc, 3, 2 * (sum - a))]),
      ],
    };
  },

  // 데이터: 평균 → 분산 → 표준편차
  data() {
    const devs = pickOne(SD_SETS);
    const { mean, values, list } = dataFrom(devs);
    const sq = devs.reduce((sum, d) => sum + d * d, 0);
    const variance = sq / devs.length;
    const sd = Math.sqrt(variance);
    const sorted = [...values].sort((x, y) => x - y);
    return {
      list,
      steps: [
        step(int(mean), [int(sorted[Math.floor(values.length / 2)]), int(mean + 1), int(mean - 1)], [int(mean + 2), int(mean - 2)]),
        step(int(variance), [int(sq), int(sd), int(sorted[values.length - 1] - sorted[0])], [int(variance + 1), int(variance * 2), int(variance + 2)]),
        step(int(sd), [int(variance), int(sq), int(sd + 1)], [int(sd + 2), dec(sd / 2), int(sd * 3)]),
      ],
    };
  },

  // 확률: 전체 경우의 수 → 확률 → 기댓값 (빨간 공의 개수)
  prob() {
    const r = pickOne(range(2, 6));
    const w = pickOne(range(2, 6));
    const n = r + w;
    const all = nCr(n, 2);
    return {
      r, w,
      steps: [
        step(int(all), [int(nPr(n, 2)), int(n * 2), int(n * n)], [int(all + 1), int(all + n), int(all - 1)]),
        step(frac(nCr(r, 2), all), [frac(r, n), frac(r * r, n * n), frac(r * w, all)], [frac(1, all), frac(nCr(r, 2) + 1, all), frac(nCr(w, 2), all)]),
        step(frac(2 * r, n), [frac(r, n), frac(nCr(r, 2), all), int(1)], [frac(2 * w, n), frac(2 * r + 1, n), frac(r, 2)]),
      ],
    };
  },

  // 정수: 최대공약수 → 최소공배수 → 둘의 곱
  int() {
    const g = pickOne(range(2, 9));
    let m;
    let n;
    do {
      [m, n] = [2 + rand(6), 2 + rand(6)];
    } while (m === n || gcd(m, n) !== 1);
    const [a, b] = [g * m, g * n];
    const l = g * m * n;
    return {
      a, b,
      steps: [
        step(int(g), [int(l), int(Math.abs(a - b)), int(g * 2)], [int(g + 1), int(1), int(Math.min(a, b))]),
        step(int(l), [int(a * b), int(g), int(a + b)], [int(l * 2), int(l + g), int(Math.max(a, b))]),
        step(int(a * b), [int(g * l + g), int(a + b), int(l)], [int(a * b + g), int(a * b * 2), int(g + l)]),
      ],
    };
  },

  // 직각삼각형: 빗변 → sin A → 내접원의 반지름
  right() {
    let [a, b, c] = pickOne(CHAIN_RIGHT);
    if (Math.random() < 0.5) [a, b] = [b, a];
    const r = (a + b - c) / 2;
    return {
      a, b,
      steps: [
        step(int(c), [int(a + b), dec(Math.sqrt(Math.abs(a * a - b * b))), int(c + 1)], [int(c - 1), int(c + 2), int(c + 3)]),
        step(frac(a, c), [frac(b, c), frac(a, b), frac(c, a)], [frac(b, a), frac(1, c), frac(a, a + b)]),
        step(int(r), [int(a + b - c), dec(c / 2), int(r + 1)], [int(r + 2), frac(a * b, a + b + c + 1), int(r + 3)]),
      ],
    };
  },

  // 이차식: 판별식 → 방정식의 해 → 부등식의 해
  roots() {
    let p;
    let q;
    do {
      [p, q] = [nonzero(-5, 6), nonzero(-5, 6)];
    } while (p >= q || p + q === 0);
    const D = (p - q) ** 2;
    return {
      f: polyStr(1, -(p + q), p * q),
      steps: [
        step(int(D), [int((p + q) ** 2), int((p + q) ** 2 + 4 * p * q), int(q - p)], [int(D + 4), int(D + 1), int(D + 8)]),
        step(roots(p, q), [roots(-p, -q), roots(p, -q), roots(-p, q)], [roots(p + 1, q + 1), roots(p - 1, q), roots(p, q + 1)]),
        step(interval(p, q, true), [interval(p, q, false), interval(-q, -p, true), interval(-q, -p, false)], [interval(p, q + 1, true), interval(p - 1, q, true)]),
      ],
    };
  },

  // 원에 내접하는 사각형: 마주 보는 각 → 중심각 → 접선과 현이 이루는 각
  circle() {
    const A = pickOne(range(10, 17)) * 5; // 50° ~ 85°
    return {
      A,
      steps: [
        step(degree(180 - A), [degree(A), degree(90 - A), degree(2 * A)], [degree(190 - A), degree(170 - A), degree(90 + A)]),
        step(degree(2 * A), [degree(A), degree(180 - A), degree(360 - 2 * A)], [degree(2 * A + 10), degree(90 + A), degree(2 * A - 10)]),
        step(degree(A), [degree(90 - A), degree(180 - A), degree(2 * A)], [degree(A + 5), degree(A - 5), degree(A + 10)]),
      ],
    };
  },

  // 뽑기: 뽑아서 세우기 → 뽑기만 하기 → 한 명이 반드시 들어가게 뽑기
  count() {
    const n = pickOne(range(5, 10));
    return {
      n,
      steps: [
        step(int(nPr(n, 3)), [int(nCr(n, 3)), int(n ** 3), int(n * 3)], [int(nPr(n, 2)), int(nPr(n, 3) + n), int(nPr(n, 3) * 2)]),
        step(int(nCr(n, 3)), [int(nPr(n, 3)), int(nCr(n, 2)), int(n * (n - 1))], [int(nCr(n, 3) + 1), int(nCr(n, 3) + n), int(nCr(n, 3) * 2)]),
        step(int(nCr(n - 1, 2)), [int(nCr(n, 3)), int(nCr(n - 1, 3)), int(nCr(n, 2))], [int(nCr(n - 1, 2) + 1), int(n - 1), int(nCr(n - 1, 2) * 2)]),
      ],
    };
  },

  // 대칭식: x + y 와 xy 로 x² + y² → (x − y)² → x³ + y³
  sym() {
    let x;
    let y;
    do {
      [x, y] = [nonzero(-4, 6), nonzero(-4, 6)];
    } while (x <= y || x + y === 0 || x * y === 1 || x + y === 1);
    const [sm, p] = [x + y, x * y];
    const sq = sm * sm - 2 * p;
    const diff = sm * sm - 4 * p;
    const cube = sm ** 3 - 3 * sm * p;
    return {
      s: numStr(sm), p: numStr(p), x, y,
      steps: [
        step(int(sq), [int(sm * sm), int(sm * sm + 2 * p), int(sm * sm - p)], [int(sq + 2), int(sq - 2), int(sq + 4)]),
        step(int(diff), [int(sq), int(sm * sm + 4 * p), int(sq - p)], [int(diff + 4), int(diff + 1), int(diff + 2)]),
        step(int(cube), [int(sm ** 3), int(sm ** 3 - 3 * p), int(sm ** 3 + 3 * sm * p)], [int(cube + sm), int(cube + 3), int(cube - 3)]),
      ],
    };
  },

  // 정수: 나눗셈의 나머지 → 호제법으로 최대공약수 → 약분했을 때의 분모
  euclid() {
    let g;
    let m;
    let n;
    do {
      [g, m, n] = [pickOne(range(2, 12)), 3 + rand(9), 2 + rand(7)];
    } while (m <= n || gcd(m, n) !== 1 || g * m > 150);
    const [a, b] = [g * m, g * n];
    const r = a % b;
    return {
      a, b,
      steps: [
        step(int(r), [int(Math.floor(a / b)), int(a - b), int(b - r)], [int(r + 1), int(r + g), int(r + 2)]),
        step(int(g), [int(r), int(b), int(1)], [int(g * 2), int(g + 1), int(g + 2)]),
        step(int(n), [int(m), int(b), int(g)], [int(n + 1), int(n * 2), int(n + 2)]),
      ],
    };
  },

  // 데이터: 중앙값 → 사분위범위 → 이상값의 기준
  box() {
    let v;
    let iqr;
    do {
      const set = new Set();
      while (set.size < 7) set.add(1 + rand(30));
      v = [...set].sort((p, q) => p - q);
      iqr = v[5] - v[1];
    } while (iqr % 2 !== 0 || iqr < 4);
    const fence = v[5] + 1.5 * iqr;
    return {
      list: v.join(', '),
      steps: [
        step(int(v[3]), [int(v[2]), int(v[4]), dec((v[0] + v[6]) / 2)], [int(v[3] + 1), int(v[3] - 1), int(v[3] + 2)]),
        step(int(iqr), [int(v[6] - v[0]), int(v[4] - v[2]), int(v[5] - v[3])], [int(iqr + 1), int(iqr + 2), int(iqr - 1)]),
        step(int(fence), [int(v[5] + iqr), int(v[3] + 1.5 * iqr), int(v[6] + 1.5 * iqr)], [int(fence + 1), int(fence + 3), int(fence - 2)]),
      ],
    };
  },

  // [보스 전용 · 검수 중] 문자 a 가 든 이차함수: 꼭짓점 → 최솟값 m 의 최댓값 → 최솟값이 정해진 값이 되는 a
  //   f(x) = x² − 2ax + 2ta + q (0 ≦ x ≦ c).  꼭짓점 (a, −a² + 2ta + q)
  //   0 < a < c 이면 최솟값 m = −(a − t)² + t² + q,  a > c 이면 최솟값 f(c) = c² + q − 2(c − t)a
  killer() {
    const t = pickOne([1, 2]);
    const c = pickOne([3, 4]);
    const q = pickOne(range(1, 5));
    const a0 = c + pickOne([1, 2]);
    const T = c * c + q - 2 * (c - t) * a0;
    const lin = `${2 * t}a + ${q}`;
    const texts = [`(a, ${MINUS}a² + ${lin})`, `(${MINUS}a, ${MINUS}a² + ${lin})`, `(a, a² + ${lin})`, `(2a, ${MINUS}4a² + ${lin})`, `(a, ${MINUS}a² + ${q})`];
    const [vertexAnswer, ...vertexWrong] = texts.map((text, i) => ({ s: text, v: i + 1 }));
    return {
      f: `x² ${MINUS} 2ax + ${lin}`, c, T: numStr(T), t, q,
      m: `${MINUS}a² + ${lin}`, comp: `${MINUS}(a ${MINUS} ${t})² + ${t * t + q}`, fc: `${c * c + q} ${MINUS} ${2 * (c - t)}a`,
      steps: [
        step(vertexAnswer, vertexWrong.slice(0, 3), [vertexWrong[3]]),
        step(int(t * t + q), [int(q), int(2 * t * t + q), int(t + q)], [int(t * t + q + 1), int(t * t + q + 2), int(t * t + q - 1)]),
        step(int(a0), [int(a0 + 1), int(c), int(a0 - 1)], [int(a0 + 2), int(a0 + 3), int(2 * a0)]),
      ],
    };
  },
};

// =====================================================================
// 数学II
// =====================================================================

// 높은 차수부터 적은 계수로 다항식을 글로 씁니다. 예: polyN([1, 0, 0, 27]) → "x³ + 27"
const SUP = ['', '', '²', '³', '⁴', '⁵', '⁶', '⁷'];
function polyN(coefs) {
  const parts = [];
  coefs.forEach((coef, k) => {
    if (!coef) return;
    const deg = coefs.length - 1 - k;
    const sym = deg === 0 ? '' : `x${SUP[deg]}`;
    const abs = Math.abs(coef);
    parts.push([coef < 0, `${abs === 1 && sym ? '' : abs}${sym}`]);
  });
  if (!parts.length) return '0';
  return parts.map(([neg, body], i) => (i === 0 ? `${neg ? MINUS : ''}${body}` : ` ${neg ? MINUS : '+'} ${body}`)).join('');
}
// 다항식 보기: x = 1.37 에서의 값으로 서로 구별합니다.
const AT = 1.37;
const valN = (coefs) => coefs.reduce((acc, c) => acc * AT + c, 0);
const polyOpt = (coefs) => ({ s: polyN(coefs), v: valN(coefs) });
const powerOf = (x, n) => `x${SUP[n]}`.replace('x', x);
const SUB = '₀₁₂₃₄₅₆₇₈₉';
const combStr = (n, k) => `${SUB[n]}C${SUB[k]}`; // ₅C₂ 처럼 씁니다 (한 자리 수만)

Object.assign(GENERATORS, {
  // ---------- 数学II: 式と証明 ----------

  // 세제곱의 전개: (x + a)³. params.hard 이면 (2x + a)³
  cubeexpand(params) {
    const k = params.hard ? pickOne([2, 3]) : 1;
    const a = params.hard ? nonzero(-3, 3) : nonzero(-5, 5);
    const right = [k ** 3, 3 * k * k * a, 3 * k * a * a, a ** 3];
    return item({ expr: `${lin(k, a)}³` }, polyOpt(right),
      [polyOpt([k ** 3, 0, 0, a ** 3]), polyOpt([k ** 3, k * k * a, k * a * a, a ** 3]), polyOpt([k ** 3, 3 * k * k * a, 3 * k * a * a, -(a ** 3)])],
      [polyOpt([k ** 3, -3 * k * k * a, 3 * k * a * a, -(a ** 3)]), polyOpt([k, 3 * k * k * a, 3 * k * a * a, a ** 3]), polyOpt([k ** 3, 3 * k * a, 3 * k * a * a, a ** 3]), polyOpt([k ** 3, 3 * k * k * a, 3 * k * a * a + 1, a ** 3])]);
  },

  // 세제곱의 합·차의 인수분해: x³ ± a³ = (x ± a)(x² ∓ ax + a²)
  cubefactor() {
    const a = 1 + rand(5);
    const s = pickOne([1, -1]);
    const opt = (p, q, r) => ({ s: `${lin(1, p)}${paren(1, q, r)}`, v: (AT + p) * (AT * AT + q * AT + r) });
    const cube = { s: `${lin(1, s * a)}³`, v: (AT + s * a) ** 3 };
    return item({ expr: polyN([1, 0, 0, s * a ** 3]) }, opt(s * a, -s * a, a * a),
      [opt(s * a, s * a, a * a), opt(-s * a, -s * a, a * a), cube],
      [opt(s * a, -2 * s * a, a * a), opt(-s * a, s * a, a * a), opt(s * a, -s * a, -a * a)]);
  },

  // 이항정리: (x + a)ⁿ 의 전개식에서 x^k 의 계수. params.hard 이면 a 가 1 이 아님
  binom(params) {
    const n = pickOne(params.hard ? [5, 6] : [4, 5, 6]);
    const a = params.hard ? pickOne([2, 3, -2, -3]) : pickOne([1, 1, -1, 2]);
    const k = 1 + rand(n - 1);
    const c = nCr(n, k);
    const answer = c * a ** (n - k);
    return item({ expr: `${lin(1, a)}${SUP[n]}`, term: powerOf('x', k), n, k, a: numStr(a), comb: combStr(n, k), rest: n - k }, int(answer),
      [int(c), int(c * a ** k), int(a ** (n - k))],
      [int(-answer), int(c * a * (n - k)), int(nCr(n, k - 1) * a ** (n - k)), int(answer + c), int(c + n), int(answer * 2)]);
  },

  // 다항식의 나눗셈: (ax² + …) ÷ (x − k). params.ask 는 'quot'(몫) 또는 'rem'(나머지). params.hard 이면 x² 의 계수가 2 또는 3
  polydiv(params) {
    const a = params.hard ? pickOne([2, 3]) : 1;
    const k = nonzero(-4, 4);
    const m = nonzero(-6, 6);
    const r = nonzero(-9, 9);
    const p = m - a * k; // (x − k)(ax + m) + r = ax² + (m − ak)x + (r − km)
    const q = r - k * m;
    const fields = { expr: polyStr(a, p, q), div: polyStr(0, 1, -k) };
    const linear = (c1, c0) => ({ s: polyStr(0, c1, c0), v: c1 * AT + c0 });
    if (params.ask === 'quot') {
      return item(fields, linear(a, m), [linear(a, p), linear(a, p - a * k), linear(a, -m)],
        [linear(a, m + 1), linear(a, m - 1), linear(1, m + a), linear(a, m + 2)]);
    }
    return item(fields, int(r), [int(a * k * k - p * k + q), int(q), int(-r)], [int(r + 1), int(r - 1), int(k * m), int(r + 2), int(r - 2)]);
  },

  // 분수식의 약분: (x + a)(x + b) / (x + a)(x + c) = (x + b)/(x + c)
  fracexpr() {
    let a;
    let b;
    let c;
    do {
      [a, b, c] = [nonzero(-6, 6), nonzero(-6, 6), nonzero(-6, 6)];
    } while (a === b || b === c || a === c || a + b === 0 || a + c === 0);
    const ratio = (p, q) => ({ s: `${lin(1, p)}/${lin(1, q)}`, v: (AT + p) / (AT + q) });
    return item({ top: polyStr(1, a + b, a * b), bottom: polyStr(1, a + c, a * c) }, ratio(b, c),
      [ratio(c, b), ratio(a, c), ratio(b, a), ratio(-b, -c)], [ratio(a + b, a + c), ratio(b + 1, c), ratio(b, c + 1)]);
  },

  // 항등식의 계수: px + q = a(x + m) + b(x − n) 에서 a 또는 b. params.ask 는 'a' 또는 'b'
  identity(params) {
    let a;
    let b;
    let m;
    let n;
    do {
      [a, b, m, n] = [nonzero(-6, 6), nonzero(-6, 6), 1 + rand(3), 1 + rand(3)];
    } while (a === b || a + b === 0 || a * m - b * n === 0);
    const p = a + b;
    const q = a * m - b * n;
    const answer = params.ask === 'a' ? a : b;
    const other = params.ask === 'a' ? b : a;
    return item({ left: polyStr(0, p, q), right: `a(x + ${m}) + b(x ${MINUS} ${n})` }, int(answer),
      [int(other), int(p), int(q)], [int(-answer), int(answer + 1), int(answer - 1), int(answer + 2), int(p - q)]);
  },

  // 산술평균과 기하평균: x > 0 일 때 x + c/x 의 최솟값. params.hard 이면 ax + b/x
  amgm(params) {
    if (params.hard) {
      const a = pickOne([2, 3, 4, 5]);
      const t = pickOne([1, 2, 3, 4]);
      const b = a * t * t; // √(ab) = at
      return item({ expr: `${a}x + ${b}/x` }, int(2 * a * t), [int(a * t), int(a * b), int(a + b)],
        [int(4 * a * t), int(2 * a * t + 1), int(a * t * t), int(2 * b), int(2 * a * t + 2)]);
    }
    const k = 1 + rand(9);
    return item({ expr: `x + ${k * k}/x` }, int(2 * k), [int(k), int(k * k), int(k * k + 1)], [int(4 * k), int(2 * k + 1), int(2 * k * k), int(k + 1), int(2 * k - 1)]);
  },
});

Object.assign(CHAINS, {
  // 이항정리: ₙCₖ → a 의 거듭제곱 → 계수
  binom() {
    const n = pickOne([5, 6]);
    const a = pickOne([2, 3, -2]);
    const k = pickOne(range(2, n - 2));
    const c = nCr(n, k);
    const pw = a ** (n - k);
    return {
      expr: `${lin(1, a)}${SUP[n]}`, term: powerOf('x', k), n, k, a: numStr(a), comb: combStr(n, k), rest: n - k,
      steps: [
        step(int(c), [int(nPr(n, k)), int(n * k), int(nCr(n, k - 1))], [int(c + n), int(c * 2), int(c - 1)]),
        step(int(pw), [int(a ** k), int(a * (n - k)), int(-pw)], [int(pw * a), int(pw + a), int(pw * 2)]),
        step(int(c * pw), [int(c + pw), int(c * a ** k), int(c)], [int(-c * pw), int(c * pw + c), int(c * pw * 2)]),
      ],
    };
  },

  // 산술평균·기하평균: 두 항의 곱 → 최솟값 → 그때의 x
  amgm() {
    const k = 2 + rand(6);
    const d = nonzero(-5, 9);
    const min = 2 * k + d;
    return {
      expr: `x + ${k * k}/x ${d < 0 ? MINUS : '+'} ${Math.abs(d)}`, c: k * k, d: numStr(d),
      steps: [
        step(int(k * k), [int(k), int(2 * k), int(k * k + 1)], [int(k * k * 2), int(k * k - 1), int(k * k + d)]),
        step(int(min), [int(2 * k), int(k * k + d), int(k + d)], [int(min + 1), int(min - 1), int(2 * k * k + d), int(min + 2)]),
        step(int(k), [int(k * k), int(2 * k), int(min)], [int(k + 1), int(k - 1), int(k + 2)]),
      ],
    };
  },
});

// ---------- 数学II: 複素数と方程式 ----------

// 복소수 a + bi 를 글로 씁니다. 예: cplxStr(3, -1) → "3 − i"
function cplxStr(re, im) {
  if (im === 0) return numStr(re);
  const body = `${Math.abs(im) === 1 ? '' : Math.abs(im)}i`;
  if (re === 0) return `${im < 0 ? MINUS : ''}${body}`;
  return `${numStr(re)} ${im < 0 ? MINUS : '+'} ${body}`;
}
const cplx = (re, im) => ({ s: cplxStr(re, im), v: re * 1000.5 + im * 1.0007 });
// 세 해 "x = a, b, c" (작은 수부터)
function roots3(list) {
  const sorted = [...list].sort((p, q) => p - q);
  return { s: `x = ${sorted.map(numStr).join(', ')}`, v: sorted[0] * 10000.5 + sorted[1] * 100.3 + sorted[2] };
}
// ab 가 제곱수가 되는 짝 (√(−a) × √(−b) 계산용)
const SQUARE_PAIRS = [[2, 8], [3, 12], [2, 18], [3, 27], [5, 20], [2, 32], [6, 24], [3, 48], [5, 45], [7, 28], [2, 50], [8, 18]];

Object.assign(GENERATORS, {
  // 복소수의 사칙연산. params.op 는 'add', 'sub', 'mul', 'div'
  cplxcalc(params) {
    const [a, b, c, d] = [nonzero(-5, 5), nonzero(-5, 5), nonzero(-5, 5), nonzero(-5, 5)];
    const p = cplxStr(a, b);
    const q = cplxStr(c, d);
    if (params.op === 'add') {
      return item({ expr: `(${p}) + (${q})`, p, q }, cplx(a + c, b + d), [cplx(a - c, b - d), cplx(a + c, b - d), cplx(a + d, b + c)],
        [cplx(a + c + 1, b + d), cplx(a + c, b + d + 1), cplx(a * c, b * d)]);
    }
    if (params.op === 'sub') {
      return item({ expr: `(${p}) ${MINUS} (${q})`, p, q }, cplx(a - c, b - d), [cplx(a - c, b + d), cplx(a + c, b + d), cplx(c - a, d - b)],
        [cplx(a - c + 1, b - d), cplx(a - c, b - d - 1), cplx(a - d, b - c)]);
    }
    if (params.op === 'mul') {
      return item({ expr: `(${p})(${q})`, p, q }, cplx(a * c - b * d, a * d + b * c),
        [cplx(a * c + b * d, a * d + b * c), cplx(a * c, b * d), cplx(a * c - b * d, a * d - b * c)],
        [cplx(a * c - b * d, b * d), cplx(a * c - b * d + 1, a * d + b * c), cplx(-(a * c - b * d), a * d + b * c), cplx(a * c - b * d, a * d + b * c + 1)]);
    }
    // 나눗셈: 몫이 정수 복소수가 되도록 (몫 × 나누는 수) 를 분자로 씁니다.
    const [nr, ni] = [a * c - b * d, a * d + b * c]; // (a + bi)(c + di)
    if (nr === 0 || ni === 0) return GENERATORS.cplxcalc(params);
    const num = cplxStr(nr, ni);
    return item({ expr: `(${num})/(${q})`, p: num, q }, cplx(a, b), [cplx(a, -b), cplx(b, a), cplx(-a, b)],
      [cplx(a + 1, b), cplx(a, b + 1), cplx(-a, -b), cplx(a - 1, b)]);
  },

  // 음수의 제곱근. params.ask 가 'prod' 이면 √(−a) × √(−b), 아니면 √(−n) 을 i 로 나타내기
  negsqrt(params) {
    if (params.ask === 'prod') {
      const [a, b] = shuffled(pickOne(SQUARE_PAIRS));
      const r = Math.round(Math.sqrt(a * b));
      const imag = (n) => ({ s: `${n < 0 ? MINUS : ''}${Math.abs(n)}i`, v: n * 1.0007 });
      return item({ expr: `√(${MINUS}${a}) × √(${MINUS}${b})` }, int(-r), [int(r), imag(r), imag(-r)], [int(-a * b), int(a * b), int(-r - 1)]);
    }
    const k = pickOne([2, 3, 4, 5, 6]);
    const m = pickOne([1, 1, 2, 3, 5, 7]);
    const n = k * k * m;
    const imag = (x, neg) => ({ s: `${neg ? MINUS : ''}${x.s}i`, v: (neg ? -1 : 1) * x.v * 1.0007 });
    const real = (x, neg) => ({ s: `${neg ? MINUS : ''}${x.s}`, v: (neg ? -1 : 1) * x.v * 1000.5 });
    return item({ expr: `√(${MINUS}${n})` }, imag(surd(k, m), false), [real(surd(k, m), true), imag(surd(k, m), true), real(surd(k, m), false)],
      [imag(surd(1, n === 4 ? 2 : k * m), false), imag(surd(k * k, m), false), imag(surd(k + 1, m), false)]);
  },

  // 허근을 갖는 이차방정식: x² + 2px + (p² + q²) = 0 의 해 x = −p ± qi
  cplxroot() {
    const p = nonzero(-4, 4);
    const q = 1 + rand(4);
    const pm = (re, im) => ({ s: `x = ${numStr(re)} ± ${im === 1 ? '' : im}i`, v: re * 1000.5 + im * 1.0007 });
    const real = (re, d) => ({ s: `x = ${numStr(re)} ± ${d}`, v: re * 77.7 + d * 0.013 + 5e6 });
    return item({ eq: `${polyStr(1, 2 * p, p * p + q * q)} = 0` }, pm(-p, q), [pm(p, q), pm(-p, 2 * q), real(-p, q)],
      [pm(-2 * p, q), pm(-p, q + 1), pm(-p, q * q), pm(p, 2 * q)]);
  },

  // 판별식: x² + 2mx + k = 0 이 허근을 가질 k 의 범위 (params.ask 'imag'), 서로 다른 두 실근 ('real')
  imagk(params) {
    const m = nonzero(-6, 6);
    const sq = m * m;
    const opt = (op, n) => ({ s: `k ${op} ${numStr(n)}`, v: OPS.indexOf(op) * 1000 + n });
    const want = params.ask === 'imag' ? '>' : '<';
    return item({ eq: `${polyStr(1, 2 * m, 0)} + k = 0` }, opt(want, sq), [opt(flipOp(want), sq), opt(want, Math.abs(m)), opt(want, 4 * sq)],
      [opt(want === '>' ? '≧' : '≦', sq), opt(want, 2 * sq), opt(flipOp(want), 4 * sq), opt(want, -sq)]);
  },

  // 근과 계수의 관계: ax² + bx + c = 0 의 두 해 α, β. params.ask 는 'sum', 'prod', 'sq' (α² + β²)
  vieta(params) {
    const a = params.ask === 'sq' ? 1 : pickOne([1, 1, 2, 3]);
    const b = nonzero(-7, 7);
    const c = nonzero(-7, 7);
    const fields = { eq: `${polyStr(a, b, c)} = 0` };
    if (params.ask === 'sum') return item(fields, frac(-b, a), [frac(b, a), frac(c, a), frac(-c, a)], [frac(-b, 1), frac(-b + 1, a), frac(-b - 1, a), frac(a, b)]);
    if (params.ask === 'prod') return item(fields, frac(c, a), [frac(-c, a), frac(-b, a), frac(b, a)], [frac(c, 1), frac(c + 1, a), frac(c - 1, a), frac(a, c)]);
    const sq = b * b - 2 * c;
    return item(fields, int(sq), [int(b * b), int(b * b + 2 * c), int(b * b - c)], [int(-b - 2 * c), int(sq + 1), int(sq - 1), int(b * b - 4 * c), int(sq + 2)]);
  },

  // 나머지정리: P(x) = x³ + ax² + bx + c 를 x − k 로 나눈 나머지
  remthm() {
    const [a, b, c] = [nonzero(-4, 4), nonzero(-6, 6), nonzero(-9, 9)];
    const k = pickOne([1, -1, 2, -2, 3]);
    const P = (x) => x ** 3 + a * x * x + b * x + c;
    return item({ expr: polyN([1, a, b, c]), div: polyStr(0, 1, -k) }, int(P(k)), [int(P(-k)), int(c), int(-P(k))],
      [int(P(k) + 1), int(P(k) - 1), int(P(k) + k), int(1 + a + b + c), int(P(k) + 2), int(P(k) - 2)]);
  },

  // 인수정리: x³ + ax² + bx + c 가 x − k 로 나누어떨어질 때 a 의 값
  factthm() {
    const k = pickOne([1, -1, 2, -2]);
    const m = nonzero(-5, 5);
    const b = nonzero(-6, 6);
    const c = -(k ** 3 + m * k * k + b * k);
    if (c === 0) return GENERATORS.factthm();
    const tail = polyStr(0, b, c);
    const expr = `x³ + ax² ${tail.startsWith(MINUS) ? `${MINUS} ${tail.slice(1)}` : `+ ${tail}`}`;
    const other = -((-k) ** 3 + b * -k + c) / (k * k); // 부호를 거꾸로 넣었을 때
    return item({ expr, div: polyStr(0, 1, -k) }, int(m), [int(-m), ...(Number.isInteger(other) ? [int(other)] : []), int(m + b)],
      [int(m + 1), int(m - 1), int(m + 2), int(m - 2), int(c)]);
  },

  // 고차방정식: (x − r1)(x − r2)(x − r3) = 0 을 전개한 식의 해
  higheq() {
    const [r1, r2, r3] = shuffled(range(-4, 4)).slice(0, 3);
    const co = [1, -(r1 + r2 + r3), r1 * r2 + r1 * r3 + r2 * r3, -r1 * r2 * r3];
    return item({ eq: `${polyN(co)} = 0` }, roots3([r1, r2, r3]),
      [roots3([-r1, -r2, -r3]), roots3([r1, r2, -r3]), roots3([r1, -r2, r3])].filter((o) => new Set(o.s.replace('x = ', '').split(', ')).size === 3),
      [[r1, r2, r3 + 1], [r1, r2 + 1, r3], [r1 - 1, r2, r3], [r1, r2, r3 + 2], [r1 + 2, r2, r3], [-r1, r2, r3]].filter((l) => new Set(l).size === 3).map(roots3));
  },
});

Object.assign(CHAINS, {
  // 근과 계수의 관계: α + β → αβ → α² + β²
  vieta() {
    const b = nonzero(-7, 7);
    const c = nonzero(-7, 7);
    const sq = b * b - 2 * c;
    return {
      eq: `${polyStr(1, b, c)} = 0`,
      steps: [
        step(int(-b), [int(b), int(c), int(-c)], [int(-b + 1), int(-b - 1), int(-b + 2)]),
        step(int(c), [int(-c), int(-b), int(b)], [int(c + 1), int(c - 1), int(c + 2)]),
        step(int(sq), [int(b * b), int(b * b + 2 * c), int(b * b - c)], [int(sq + 1), int(sq - 1), int(b * b - 4 * c), int(sq + 2)]),
      ],
    };
  },

  // 인수정리와 고차방정식: 나머지 → 가장 작은 해 → 가장 큰 해
  cubic() {
    const [r1, r2, r3] = shuffled(range(-4, 4)).slice(0, 3).sort((p, q) => p - q);
    const co = [1, -(r1 + r2 + r3), r1 * r2 + r1 * r3 + r2 * r3, -r1 * r2 * r3];
    const P = (x) => co.reduce((acc, k) => acc * x + k, 0);
    const t = pickOne(range(-5, 5).filter((x) => ![r1, r2, r3].includes(x) && x !== 0));
    return {
      expr: polyN(co), div: polyStr(0, 1, -t),
      steps: [
        step(int(P(t)), [int(P(-t)), int(co[3]), int(-P(t))], [int(P(t) + 1), int(P(t) - 1), int(P(t) + 2), int(P(t) - 2)]),
        step(int(r1), [int(-r3), int(r2), int(r3)], [int(r1 - 1), int(r1 + 1), int(r1 - 2), int(r1 + 2)]),
        step(int(r3), [int(-r1), int(r2), int(r1)], [int(r3 + 1), int(r3 - 1), int(r3 + 2), int(r3 - 2)]),
      ],
    };
  },
});

// ---------- 数学II: 図形と方程式 ----------

const ptStr = (x, y) => `(${numStr(x)}, ${numStr(y)})`;
// 기호가 붙은 항들을 이어 씁니다. 예: termsStr([[1, 'x²'], [1, 'y²'], [-4, 'x'], [3, '']]) → "x² + y² − 4x + 3"
function termsStr(list) {
  const parts = list.filter(([coef]) => coef).map(([coef, sym]) => [coef < 0, `${Math.abs(coef) === 1 && sym ? '' : Math.abs(coef)}${sym}`]);
  if (!parts.length) return '0';
  return parts.map(([neg, body], i) => (i === 0 ? `${neg ? MINUS : ''}${body}` : ` ${neg ? MINUS : '+'} ${body}`)).join('');
}
const lineOpt = (m, k) => ({ s: `y = ${polyStr(0, m, k)}`, v: m * 1000.5 + k });
const planeOf = (spec) => JSON.stringify(spec);
// 점들이 모두 들어가는 좌표평면 범위 (원점 포함, 여유 1칸)
function boxOf(points, pad = 1) {
  const xs = [0, ...points.map((p) => p[0])];
  const ys = [0, ...points.map((p) => p[1])];
  return [Math.min(...xs) - pad, Math.max(...xs) + pad, Math.min(...ys) - pad, Math.max(...ys) + pad];
}
const NORMS = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [6, 8, 10], [8, 6, 10]];
const CHORDS = [[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13]]; // [중심에서 직선까지 거리, 현의 절반, 반지름]

Object.assign(GENERATORS, {
  // 두 점 사이의 거리. params.hard 이면 답이 √ 꼴
  dist(params) {
    let dx;
    let dy;
    if (params.hard) {
      do { [dx, dy] = [nonzero(-5, 5), nonzero(-5, 5)]; } while (Number.isInteger(Math.sqrt(dx * dx + dy * dy)));
    } else {
      const [a, b] = pickOne([[3, 4], [4, 3], [6, 8], [8, 6], [5, 12], [12, 5]]);
      [dx, dy] = [a * pickOne([1, -1]), b * pickOne([1, -1])];
    }
    const x1 = pickOne(range(-4, 4).filter((x) => Math.abs(x + dx) <= 9));
    const y1 = pickOne(range(-4, 4).filter((y) => Math.abs(y + dy) <= 9));
    const [x2, y2] = [x1 + dx, y1 + dy];
    const sq = dx * dx + dy * dy;
    const fields = { A: ptStr(x1, y1), B: ptStr(x2, y2), x1, y1, x2, y2, plot: planeOf({ r: boxOf([[x1, y1], [x2, y2]]), pts: [[x1, y1, 'A'], [x2, y2, 'B']], segs: [[x1, y1, x2, y2]] }) };
    return item(fields, surd(1, sq), [int(Math.abs(dx) + Math.abs(dy)), int(sq), surd(1, Math.abs(dx * dx - dy * dy) || 2)],
      [surd(1, sq + 1), surd(1, sq + 2), surd(1, x1 * x1 + y1 * y1 + 3), int(Math.max(Math.abs(dx), Math.abs(dy)))]);
  },

  // 내분점, 외분점, 무게중심. params.ask 는 'in', 'out', 'cent'
  divide(params) {
    if (params.ask === 'cent') {
      const g = [nonzero(-3, 3), nonzero(-3, 3)];
      let A;
      let B;
      let C;
      do {
        A = [nonzero(-6, 6), nonzero(-6, 6)];
        B = [nonzero(-6, 6), nonzero(-6, 6)];
        C = [3 * g[0] - A[0] - B[0], 3 * g[1] - A[1] - B[1]];
      } while (Math.abs(C[0]) > 7 || Math.abs(C[1]) > 7 || (A[0] - C[0]) * (B[1] - C[1]) === (B[0] - C[0]) * (A[1] - C[1]));
      const sum = [A[0] + B[0] + C[0], A[1] + B[1] + C[1]];
      return item({ A: ptStr(...A), B: ptStr(...B), C: ptStr(...C), pa: A, pb: B, pc: C,
        plot: planeOf({ r: boxOf([A, B, C]), pts: [[...A, 'A'], [...B, 'B'], [...C, 'C']], segs: [[...A, ...B], [...B, ...C], [...C, ...A]] }) },
      point(g[0], g[1]), [point(sum[0], sum[1]), point(g[0], -g[1]), point(g[1], g[0])],
      [point(g[0] + 1, g[1]), point(g[0], g[1] + 1), point(g[0] - 1, g[1]), point(-g[0], g[1])]);
    }
    const [m, n] = pickOne(params.ask === 'out' ? [[2, 1], [3, 1], [3, 2]] : [[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2]]);
    let d;
    let A;
    let B;
    let P;
    do {
      d = [range(-2, 2)[rand(5)], range(-2, 2)[rand(5)]];
      A = [range(-5, 5)[rand(11)], range(-5, 5)[rand(11)]];
      if (params.ask === 'out') { B = [A[0] + (m - n) * d[0], A[1] + (m - n) * d[1]]; P = [A[0] + m * d[0], A[1] + m * d[1]]; }
      else { P = [A[0] + m * d[0], A[1] + m * d[1]]; B = [P[0] + n * d[0], P[1] + n * d[1]]; }
    } while ((d[0] === 0 && d[1] === 0) || [...B, ...P].some((v) => Math.abs(v) > 9));
    const flip = params.ask === 'out' ? [A[0] - n * d[0], A[1] - n * d[1]] : [A[0] + n * d[0], A[1] + n * d[1]];
    return item({ A: ptStr(...A), B: ptStr(...B), m, n, pa: A, pb: B }, point(P[0], P[1]),
      [point(flip[0], flip[1]), point(A[0] + B[0], A[1] + B[1]), point(P[1], P[0])],
      [point(P[0] + 1, P[1]), point(P[0], P[1] + 1), point(P[0] - 1, P[1]), point(P[0], P[1] - 1)]);
  },

  // 직선의 방정식. params.ask 가 'two' 이면 두 점, 아니면 한 점과 기울기
  lineeq(params) {
    const m = nonzero(-3, 3);
    const x1 = nonzero(-4, 4);
    const y1 = range(-5, 5)[rand(11)];
    const k = y1 - m * x1;
    const wrong = [lineOpt(-m, y1 + m * x1), lineOpt(m, y1), lineOpt(m, -k), lineOpt(m, y1 + m * x1)];
    const pads = [lineOpt(m, k + 1), lineOpt(m, k - 1), lineOpt(m + 1, k), lineOpt(m, k + 2)];
    if (params.ask === 'two') {
      const dx = pickOne([-2, -1, 1, 2].filter((v) => v !== -x1));
      const [x2, y2] = [x1 + dx, y1 + m * dx];
      return item({ A: ptStr(x1, y1), B: ptStr(x2, y2), pa: [x1, y1], pb: [x2, y2],
        plot: planeOf({ r: boxOf([[x1, y1], [x2, y2]], 2), pts: [[x1, y1, 'A'], [x2, y2, 'B']], lines: [[m, -1, -k]] }) }, lineOpt(m, k), wrong, pads);
    }
    return item({ A: ptStr(x1, y1), m: numStr(m), pa: [x1, y1], slope: m }, lineOpt(m, k), wrong, pads);
  },

  // 평행·수직인 직선의 기울기: 직선 ax + by + c = 0 에 대해. params.ask 는 'para' 또는 'perp'
  slope(params) {
    let a;
    let b;
    do { [a, b] = [nonzero(-5, 5), nonzero(-5, 5)]; } while (Math.abs(a) === Math.abs(b));
    const c = nonzero(-9, 9);
    const fields = { line: `${termsStr([[a, 'x'], [b, 'y'], [c, '']])} = 0` };
    const para = frac(-a, b);
    const perp = frac(b, a);
    return params.ask === 'para'
      ? item(fields, para, [perp, frac(a, b), frac(-b, a)], [frac(-a, 1), frac(1, b), frac(-c, b)])
      : item(fields, perp, [para, frac(-b, a), frac(a, b)], [frac(b, 1), frac(1, a), frac(-c, a)]);
  },

  // 점과 직선 사이의 거리
  pdist() {
    const [a0, b0, n] = pickOne(NORMS);
    const [a, b] = [a0 * pickOne([1, -1]), b0 * pickOne([1, -1])];
    let x0;
    let y0;
    let c;
    let val;
    do {
      [x0, y0, c] = [range(-4, 4)[rand(9)], range(-4, 4)[rand(9)], nonzero(-12, 12)];
      val = Math.abs(a * x0 + b * y0 + c);
    } while (val === 0 || val > 60);
    return item({ P: ptStr(x0, y0), line: `${termsStr([[a, 'x'], [b, 'y'], [c, '']])} = 0`, px: x0, py: y0 }, frac(val, n),
      [int(val), frac(Math.abs(a * x0 + b * y0), n), frac(val, Math.abs(a) + Math.abs(b))].filter((o) => o.v > 0),
      [frac(val + n, n), frac(val, n * n), frac(Math.abs(c), n), frac(val + 1, n), frac(val + 2, n)]);
  },

  // 원의 방정식 x² + y² + ax + by + c = 0 의 중심 또는 반지름. params.ask 는 'center' 또는 'radius'
  circleeq(params) {
    const [p, q, r] = [nonzero(-5, 5), nonzero(-5, 5), 1 + rand(6)];
    const fields = { eq: `${termsStr([[1, 'x²'], [1, 'y²'], [-2 * p, 'x'], [-2 * q, 'y'], [p * p + q * q - r * r, '']])} = 0` };
    if (params.ask === 'center') {
      return item(fields, point(p, q), [point(-p, -q), point(-2 * p, -2 * q), point(2 * p, 2 * q)], [point(p, -q), point(-p, q), point(q, p)]);
    }
    return item(fields, int(r), [int(r * r), int(Math.abs(p * p + q * q - r * r)), int(2 * r)], [int(r + 1), int(r + 2), int(r + 3), int(p * p + q * q)]);
  },

  // 원 x² + y² = r² 과 직선이 만나서 생기는 현의 길이
  chord() {
    const [d, h, r] = pickOne(CHORDS);
    const [a, b] = pickOne([[3, 4], [4, 3], [-3, 4], [3, -4], [4, -3], [-4, 3]]);
    const c = 5 * d * pickOne([1, -1]);
    return item({ circle: `x² + y² = ${r * r}`, line: `${termsStr([[a, 'x'], [b, 'y']])} = ${numStr(c)}`,
      plot: planeOf({ r: [-r - 2, r + 2, -r - 2, r + 2], circles: [[0, 0, r]], lines: [[a, b, c]] }) }, int(2 * h),
    [int(h), int(2 * d), int(d)], [int(r), int(2 * r), int(2 * h + 2), int(2 * h - 2), int(h + d)]);
  },

  // 부등식의 영역: 네 점 가운데 영역 안에 있는 점 하나 고르기 (경계 위의 점은 들어가지 않습니다)
  region() {
    const m = nonzero(-2, 2);
    const k = range(-3, 3)[rand(7)];
    const op = pickOne(['>', '<']);
    const side = (x, y) => Math.sign(y - (m * x + k)) * (op === '>' ? 1 : -1);
    const all = shuffled(range(-4, 4).flatMap((x) => range(-5, 5).map((y) => [x, y])));
    const inside = all.find(([x, y]) => side(x, y) > 0 && Math.abs(y - (m * x + k)) <= 3);
    const edge = all.find(([x, y]) => side(x, y) === 0);
    const outside = all.filter(([x, y]) => side(x, y) < 0 && Math.abs(y - (m * x + k)) <= 4).slice(0, 4);
    return item({ ineq: `y ${op} ${polyStr(0, m, k)}` }, point(...inside), [point(...edge), ...outside.map((p) => point(...p))]);
  },
});

Object.assign(CHAINS, {
  // 원과 직선: 반지름 → 중심에서 직선까지 거리 → 현의 길이
  chord() {
    const [d, h, r] = pickOne(CHORDS);
    const [p, q] = [nonzero(-4, 4), nonzero(-4, 4)];
    const [a, b] = pickOne([[3, 4], [4, 3], [3, -4], [4, -3]]);
    const c = 5 * d * pickOne([1, -1]) - a * p - b * q; // |ap + bq + c| = 5d
    const sq = (v, sym) => (v === 0 ? `${sym}²` : `(${sym} ${v > 0 ? MINUS : '+'} ${Math.abs(v)})²`);
    return {
      circle: `${sq(p, 'x')} + ${sq(q, 'y')} = ${r * r}`, line: `${termsStr([[a, 'x'], [b, 'y'], [c, '']])} = 0`,
      plot: planeOf({ r: [p - r - 2, p + r + 2, q - r - 2, q + r + 2], circles: [[p, q, r]], lines: [[a, b, -c]], pts: [[p, q, 'C']] }),
      steps: [
        step(int(r), [int(r * r), int(2 * r), int(Math.abs(p) + Math.abs(q))], [int(r + 1), int(r - 1), int(r + 2)]),
        step(int(d), [int(5 * d), int(Math.abs(c)), int(r)], [int(d + 1), int(d - 1), int(d + 2), int(d * 2)]),
        step(int(2 * h), [int(h), int(2 * d), int(r - d)], [int(2 * r), int(2 * h + 2), int(2 * h - 2), int(h + d)]),
      ],
    };
  },

  // 직선: 기울기 → y 절편 → x 절편
  line() {
    const m = pickOne([-3, -2, 2, 3]);
    const x0 = nonzero(-3, 3); // x 절편
    const k = -m * x0;
    const dx = pickOne([1, 2].filter((v) => x0 + v !== 0));
    const [x1, y1] = [x0 + dx, m * dx];
    const [x2, y2] = [x0 - dx, -m * dx];
    return {
      A: ptStr(x1, y1), B: ptStr(x2, y2), pa: [x1, y1], pb: [x2, y2],
      plot: planeOf({ r: boxOf([[x1, y1], [x2, y2], [0, k]], 1), pts: [[x1, y1, 'A'], [x2, y2, 'B']], lines: [[m, -1, -k]] }),
      steps: [
        step(int(m), [int(-m), frac(1, m), frac(-1, m)], [int(m + 1), int(m - 1), int(2 * m)]),
        step(int(k), [int(-k), int(x0), int(y1)], [int(k + 1), int(k - 1), int(k + m)]),
        step(int(x0), [int(-x0), int(k), frac(k, m)], [int(x0 + 1), int(x0 - 1), int(x0 + 2), int(x0 - 2)]),
      ],
    };
  },
});

// ---------- 数学II: 三角関数 ----------

// nπ/d 꼴의 각. 예: piFrac(7, 6) → "7π/6"
function piFrac(n, d = 1) {
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d) || 1;
  n /= g;
  d /= g;
  if (n === 0) return { s: '0', v: 0, n, d };
  return { s: `${n === 1 ? '' : n === -1 ? MINUS : numStr(n)}π${d === 1 ? '' : `/${d}`}`, v: n / d, n, d };
}
const radOf = (deg) => piFrac(deg, 180);
// 특수각의 정확한 값
const SIN_REF = { 0: [0, 1, 1], 30: [1, 1, 2], 45: [1, 2, 2], 60: [1, 3, 2], 90: [1, 1, 1] };
function sinDeg(deg) {
  const d = ((deg % 360) + 360) % 360;
  let ref = d % 180;
  if (ref > 90) ref = 180 - ref;
  const [n, r, den] = SIN_REF[ref];
  return surd(d > 180 ? -n : n, r, den);
}
const cosDeg = (deg) => sinDeg(deg + 90);
function tanDeg(deg) {
  const d = ((deg % 180) + 180) % 180;
  const ref = d > 90 ? 180 - d : d;
  const [n, r, den] = { 0: [0, 1, 1], 30: [1, 3, 3], 45: [1, 1, 1], 60: [1, 3, 1] }[ref];
  return surd(d > 90 ? -n : n, r, den);
}
const TRIG = { sin: sinDeg, cos: cosDeg, tan: tanDeg };
const TRIG_POOL = [surd(1, 1, 2), surd(-1, 1, 2), surd(1, 2, 2), surd(-1, 2, 2), surd(1, 3, 2), surd(-1, 3, 2), surd(1, 3, 3), surd(-1, 3, 3), surd(1, 3), surd(-1, 3), int(1), int(-1), int(0)];
const ACUTE = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 15, 17], [15, 8, 17]]; // [sin 의 분자, cos 의 분자, 분모]
const SECTOR_ANGLES = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 6], [5, 6]];
const degOpt = (deg) => ({ s: `${deg}°`, v: deg });

Object.assign(GENERATORS, {
  // 도 ↔ 호도. params.dir 가 'from' 이면 호도 → 도
  radian(params) {
    const deg = pickOne([15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 210, 225, 240, 270, 300, 315, 330]);
    if (params.dir === 'from') {
      return item({ rad: radOf(deg).s }, degOpt(deg), [degOpt(deg / 2), degOpt(deg * 2), degOpt(360 - deg)].filter((o) => Number.isInteger(o.v)),
        [degOpt(deg + 15), degOpt(deg - 15), degOpt(deg + 30), degOpt(180 - deg > 0 ? 180 - deg : deg + 45)]);
    }
    return item({ deg }, radOf(deg), [piFrac(deg, 90), piFrac(deg, 360), piFrac(180, deg)], [radOf(deg + 15), radOf(deg + 30), radOf(deg - 15)]);
  },

  // 부채꼴의 호의 길이와 넓이. params.ask 는 'arc' 또는 'area'
  sectorq(params) {
    const r = 2 + rand(8);
    const [p, q] = pickOne(SECTOR_ANGLES);
    const arc = piFrac(r * p, q);
    const area = piFrac(r * r * p, 2 * q);
    const fields = { r, theta: piFrac(p, q).s, deg: (180 * p) / q };
    return params.ask === 'arc'
      ? item(fields, arc, [area, piFrac(r * r * p, q), piFrac(2 * r * p, q)], [piFrac(p, q), piFrac(r * p, 2 * q), piFrac(r * p + q, q)])
      : item(fields, area, [arc, piFrac(r * r * p, q), piFrac(r * p, 2 * q)], [piFrac(2 * r * r * p, q), piFrac(r * r * p + 2 * q, 2 * q), piFrac(r * r, 2)]);
  },

  // 일반각의 삼각함수 값
  trigval() {
    const fn = pickOne(['sin', 'cos', 'tan']);
    const deg = pickOne([120, 135, 150, 210, 225, 240, 300, 315, 330, -30, -45, -60, -120, -135, 390, 405, 420]);
    const answer = TRIG[fn](deg);
    const neg = surd(-answer.n, answer.r, answer.d);
    const other = fn === 'sin' ? cosDeg(deg) : sinDeg(deg);
    return item({ expr: `${fn}(${radOf(deg).s})`, deg, label: radOf(deg).s }, answer, [neg, other, surd(-other.n, other.r, other.d)], shuffled(TRIG_POOL));
  },

  // 주기와 최댓값: y = a sin(bx) + c. params.ask 는 'period' 또는 'max'
  period(params) {
    const fn = pickOne(['sin', 'cos']);
    const a = pickOne([-4, -3, -2, 2, 3, 4]);
    const [n, d] = pickOne([[2, 1], [3, 1], [4, 1], [6, 1], [1, 2], [1, 3], [2, 3]]);
    const arg = d === 1 ? ` ${n}x` : `(${n === 1 ? '' : n}x/${d})`;
    const head = `${a === 1 ? '' : a === -1 ? MINUS : numStr(a)}${fn}${arg}`;
    if (params.ask === 'period') {
      return item({ expr: `y = ${head}` }, piFrac(2 * d, n), [piFrac(d, n), piFrac(2 * n, d), piFrac(n, d)], [piFrac(2, 1), piFrac(4 * d, n), piFrac(1, 1), piFrac(d, 2 * n)]);
    }
    const c = nonzero(-4, 4);
    const max = Math.abs(a) + c;
    return item({ expr: `y = ${head} ${c < 0 ? MINUS : '+'} ${Math.abs(c)}` }, int(max), [int(a + c), int(Math.abs(a)), int(c - Math.abs(a))],
      [int(max + 1), int(max - 1), int(Math.abs(a) * n + c), int(c), int(max + 2)]);
  },

  // 덧셈정리: α, β 는 예각, sin α 와 cos β 가 주어졌을 때. params.ask 는 'sin+', 'sin-', 'cos+', 'cos-'
  addition(params) {
    let A;
    let B;
    do { [A, B] = [pickOne(ACUTE), pickOne(ACUTE)]; } while (A[2] === B[2]);
    const [sa, ca, c] = A;
    const [sb, cb, g] = B;
    const all = { 'sin+': sa * cb + ca * sb, 'sin-': sa * cb - ca * sb, 'cos+': ca * cb - sa * sb, 'cos-': ca * cb + sa * sb };
    const sign = params.ask.endsWith('+') ? '+' : MINUS;
    const others = Object.entries(all).filter(([key]) => key !== params.ask).map(([, v]) => frac(v, c * g));
    return item({ sa: `${sa}/${c}`, cb: `${cb}/${g}`, expr: `${params.ask.slice(0, 3)}(α ${sign} β)` }, frac(all[params.ask], c * g),
      [...others, frac(sa * g + sb * c, c * g)], [frac(sa * cb, c * g), frac(ca * sb, c * g), frac(-all[params.ask], c * g)]);
  },

  // 2배각: sin θ 와 θ 의 범위가 주어졌을 때. params.ask 는 'sin2' 또는 'cos2'
  double(params) {
    const [a, b0, c] = pickOne(ACUTE);
    const second = Math.random() < 0.5;
    const b = second ? -b0 : b0;
    const fields = { sin: `${a}/${c}`, range: second ? 'π/2 < θ < π' : '0 < θ < π/2' };
    return params.ask === 'sin2'
      ? item(fields, frac(2 * a * b, c * c), [frac(-2 * a * b, c * c), frac(2 * a, c), frac(a * b, c * c)], [frac(c * c - 2 * a * a, c * c), frac(2 * b, c), frac(a * a, c * c)])
      : item(fields, frac(c * c - 2 * a * a, c * c), [frac(2 * a * a - c * c, c * c), frac(2 * a, c), frac(c * c - a * a, c * c)], [frac(2 * a * b, c * c), frac(c * c - 2 * a, c * c), frac(a * a, c * c)]);
  },

  // 삼각함수의 합성: a sin θ + b cos θ 의 최댓값
  compose() {
    const [a, b] = [1 + rand(5), nonzero(-5, 5)];
    const sq = a * a + b * b;
    return item({ expr: `${a === 1 ? '' : a}sin θ ${b < 0 ? MINUS : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}cos θ` }, surd(1, sq),
      [int(a + Math.abs(b)), int(sq), int(Math.max(a, Math.abs(b)))], [surd(1, sq + 1), surd(1, Math.abs(a * a - b * b) || 3), int(a + b), surd(1, sq + 2)]);
  },

  // 삼각방정식: 0 ≦ θ < 2π 에서 sin θ = k 또는 cos θ = k
  trigeq2() {
    const fn = pickOne(['sin', 'cos']);
    const val = pickOne([surd(1, 1, 2), surd(-1, 1, 2), surd(1, 2, 2), surd(-1, 2, 2), surd(1, 3, 2), surd(-1, 3, 2)]);
    const solve = (f, v) => [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330].filter((deg) => Math.abs(TRIG[f](deg).v - v) < 1e-9);
    const opt = (list) => ({ s: `θ = ${list.map((deg) => radOf(deg).s).join(', ')}`, v: list[0] * 1000.5 + list[1] });
    const mine = solve(fn, val.v);
    const other = fn === 'sin' ? 'cos' : 'sin';
    return item({ eq: `${fn} θ = ${val.s}` }, opt(mine), [opt(solve(fn, -val.v)), opt(solve(other, val.v)), opt(solve(other, -val.v))],
      [opt([mine[0], (mine[0] + 180) % 360].sort((p, q) => p - q)), opt([mine[1], (mine[1] + 180) % 360].sort((p, q) => p - q))]);
  },
});

Object.assign(CHAINS, {
  // 부채꼴: 호도 → 호의 길이 → 넓이
  sector() {
    const r = 2 + rand(8);
    const [p, q] = pickOne(SECTOR_ANGLES);
    const deg = (180 * p) / q;
    return {
      r, deg,
      steps: [
        step(piFrac(p, q), [piFrac(2 * p, q), piFrac(p, 2 * q), piFrac(q, p)], [radOf(deg + 15), radOf(deg + 30), radOf(deg - 15)]),
        step(piFrac(r * p, q), [piFrac(r * r * p, 2 * q), piFrac(2 * r * p, q), piFrac(p, q)], [piFrac(r * p, 2 * q), piFrac(r * r * p, q), piFrac(r * p + q, q)]),
        step(piFrac(r * r * p, 2 * q), [piFrac(r * r * p, q), piFrac(r * p, q), piFrac(r * p, 2 * q)], [piFrac(2 * r * r * p, q), piFrac(r * r, 2), piFrac(r * r * p + 2 * q, 2 * q)]),
      ],
    };
  },

  // 2배각: cos θ → sin 2θ → cos 2θ (θ 는 둔각)
  double() {
    const [a, b, c] = pickOne(ACUTE);
    return {
      sin: `${a}/${c}`,
      steps: [
        step(frac(-b, c), [frac(b, c), frac(-a, c), frac(c - a, c)], [frac(-b - 1, c), frac(-b + 1, c), frac(-1, c)]),
        step(frac(-2 * a * b, c * c), [frac(2 * a * b, c * c), frac(2 * a, c), frac(-a * b, c * c)], [frac(-2 * b, c), frac(a * a, c * c), frac(-2 * a * b + 1, c * c)]),
        step(frac(c * c - 2 * a * a, c * c), [frac(2 * a * a - c * c, c * c), frac(-2 * b, c), frac(b * b, c * c)], [frac(c * c - a * a, c * c), frac(2 * a, c), frac(c * c - 2 * a, c * c)]),
      ],
    };
  },
});

// ---------- 数学II: 指数関数・対数関数 ----------

const SUPMAP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', x: 'ˣ', '+': '⁺', '-': '⁻', [MINUS]: '⁻' };
const sup = (text) => String(text).split('').map((ch) => SUPMAP[ch] ?? ch).join('');
const sub = (n) => String(n).split('').map((ch) => SUB[ch]).join('');
const logStr = (base, arg) => `log${sub(base)} ${arg}`;
const powOpt = (a, e) => (e >= 0 ? int(a ** e) : frac(1, a ** -e));
const xEq = (n) => ({ s: `x = ${numStr(n)}`, v: n });
const textOpt = (s, v) => ({ s, v });
const LOG10 = { 2: '0.3010', 3: '0.4771' };
const digitsOf = (base, n) => String(BigInt(base) ** BigInt(n)).length;
const SUM_BASES = { 6: [2, 3], 10: [2, 5], 12: [3, 4], 15: [3, 5], 14: [2, 7] };

Object.assign(GENERATORS, {
  // 지수법칙: a^m × a^n ÷ a^p
  exprule() {
    const a = pickOne([2, 3, 5]);
    const pool = [-3, -2, -1, 2, 3, 4, 5];
    let m;
    let n;
    let p;
    let e;
    do { [m, n, p] = [pickOne(pool), pickOne(pool), pickOne(pool)]; e = m + n - p; } while (e < -2 || e > (a === 2 ? 5 : 3));
    const cand = [m + n + p, m * n - p, m - n - p, m * n, e + 1, e - 1, -e, e + 2].filter((x) => x >= -4 && x <= 7);
    return item({ expr: `${a}${sup(m)} × ${a}${sup(n)} ÷ ${a}${sup(p)}` }, powOpt(a, e), cand.map((x) => powOpt(a, x)), [int(a * 2), int(1), frac(1, a)]);
  },

  // 거듭제곱근과 유리수 지수. params.ask 가 'frac' 이면 a 의 p/q 제곱
  root(params) {
    if (params.ask === 'frac') {
      const b = pickOne([2, 3]);
      const q = pickOne([2, 3, 4]);
      if (b ** q > 100) return GENERATORS.root(params);
      const p = pickOne(range(-3, 4).filter((x) => x !== 0 && x !== q && Math.abs(x) % q !== 0));
      return item({ base: b ** q, exp: `${numStr(p)}/${q}` }, powOpt(b, p), [frac(b ** q * p, q), powOpt(b, -p), powOpt(b, q)],
        [powOpt(b, p + 1), powOpt(b, p - 1), powOpt(b, 2 * p), int(b ** q)]);
    }
    const [n, sign] = pickOne([[3, '∛'], [3, '∛'], [4, '∜'], [5, '⁵√']]);
    const b = pickOne(n === 3 ? [2, 3, 4, 5, 6] : n === 4 ? [2, 3] : [2, 3]);
    return item({ expr: `${sign}${b ** n}` }, int(b), [int(b ** (n - 1)), int(Math.round(b ** n / n)), int(n)], [int(b + 1), int(b - 1), int(b * 2), int(b + 2)]);
  },

  // 지수방정식과 부등식. params.ask 는 'eq' 또는 'ineq'
  expeq(params) {
    const a = pickOne([2, 3, 5]);
    const k = 2 + rand(a === 2 ? 5 : a === 3 ? 3 : 2);
    if (params.ask === 'eq') {
      const c = nonzero(-3, 3);
      return item({ eq: `${a}${sup(`x${c < 0 ? '-' : '+'}${Math.abs(c)}`)} = ${a ** k}` }, xEq(k - c), [xEq(k + c), xEq(k), xEq(a ** k - c)],
        [xEq(k - c + 1), xEq(k - c - 1), xEq(-k), xEq(k * c)]);
    }
    const small = Math.random() < 0.5; // 밑이 1 보다 작으면 부등호의 방향이 바뀝니다
    const op = pickOne(['<', '>']);
    const left = small ? `(1/${a})${sup('x')}` : `${a}${sup('x')}`;
    const right = small ? `1/${a ** k}` : `${a ** k}`;
    const ans = small ? flipOp(op) : op;
    return item({ eq: `${left} ${op} ${right}` }, half(ans, k), [half(flipOp(ans), k), half(ans, -k), half(flipOp(ans), -k)],
      [half(ans, a ** k), half(ans, k + 1), half(ans, k - 1)]);
  },

  // 로그의 값. params.hard 이면 밑의 변환이 필요한 꼴
  logval(params) {
    const a = pickOne([2, 3]);
    if (params.hard) {
      const p = pickOne([2, 3]);
      const q = pickOne(range(1, 5).filter((x) => x !== p && a ** x <= 243 && a ** p <= 27));
      return item({ expr: logStr(a ** p, a ** q) }, frac(q, p), [frac(p, q), int(q - p), frac(a ** q, a ** p), int(q)], [frac(q + 1, p), frac(q, p + 1), int(p)]);
    }
    const k = pickOne(a === 2 ? [-3, -2, -1, 2, 3, 4, 5, 6] : [-2, -1, 2, 3, 4]);
    const arg = k >= 0 ? `${a ** k}` : `(1/${a ** -k})`;
    return item({ expr: logStr(a, arg) }, int(k), [int(-k), powOpt(a, k), frac(a ** Math.abs(k), a)], [int(k + 1), int(k - 1), int(2 * k), int(a)]);
  },

  // 로그의 성질: 합과 차. params.ask 는 'sum' 또는 'diff'
  logrule(params) {
    if (params.ask === 'sum') {
      const b = Number(pickOne(Object.keys(SUM_BASES)));
      const [p, q] = SUM_BASES[b];
      const k = pickOne(b <= 10 ? [1, 2, 3] : [1, 2]);
      const [m, n] = pickOne([[p ** k, q ** k], [p * b ** (k - 1), q]]);
      return item({ expr: `${logStr(b, m)} + ${logStr(b, n)}` }, int(k), [int(m + n), int(m * n), int(k + 1)], [int(k + 2), int(2 * k + 1), int(b), int(k + 3)]);
    }
    const b = pickOne([2, 3, 5]);
    const n = pickOne([3, 5, 6, 7].filter((x) => x % b !== 0));
    const k = pickOne(b === 2 ? [1, 2, 3, 4] : [1, 2]);
    const m = n * b ** k;
    return item({ expr: `${logStr(b, m)} ${MINUS} ${logStr(b, n)}` }, int(k), [int(m - n), int(b ** k), int(k + 1)], [int(k + 2), int(k - 1), int(2 * k + 1), int(n)]);
  },

  // 로그방정식과 부등식. params.ask 는 'eq' 또는 'ineq'
  logeq(params) {
    const a = pickOne([2, 3]);
    const k = pickOne(a === 2 ? [2, 3, 4] : [1, 2, 3]);
    const N = a ** k;
    if (params.ask === 'eq') {
      const c = nonzero(-5, 5);
      return item({ eq: `${logStr(a, `(x ${c > 0 ? MINUS : '+'} ${Math.abs(c)})`)} = ${k}` }, xEq(N + c), [xEq(N - c), xEq(a * k + c), xEq(k ** a + c), xEq(N)],
        [xEq(N + c + 1), xEq(N + c - 1), xEq(k + c)]);
    }
    const op = pickOne(['<', '>']);
    const between = (hi) => textOpt(`0 < x < ${hi}`, 70000 + hi);
    const above = (lo) => textOpt(`x > ${lo}`, 80000 + lo);
    const below = (hi) => textOpt(`x < ${hi}`, 90000 + hi);
    return op === '<'
      ? item({ eq: `${logStr(a, 'x')} < ${k}` }, between(N), [below(N), above(N), between(a * k)], [below(a * k), between(N + a), between(k)])
      : item({ eq: `${logStr(a, 'x')} > ${k}` }, above(N), [between(N), below(N), above(a * k)], [above(k), above(N + a), between(a * k)]);
  },

  // 상용로그와 자릿수: 2ⁿ 또는 3ⁿ 은 몇 자리 수인가
  digits() {
    const base = pickOne([2, 3]);
    let n;
    let d;
    do { n = 10 + rand(41); d = Math.floor(n * Number(LOG10[base])) + 1; } while (d !== digitsOf(base, n));
    return item({ power: `${base}${sup(n)}`, base, n, log: `${logStr(10, base)} = ${LOG10[base]}` }, int(d), [int(d - 1), int(n), int(d + 1)], [int(d + 2), int(d - 2), int(Math.round(n / 2))]);
  },
});

Object.assign(CHAINS, {
  // 자릿수: n × log₁₀2 → 정수 부분 → 자릿수
  digits() {
    const n = pickOne([10, 20, 30, 40, 50, 15, 25, 35, 45]);
    const value = Math.round(n * 3010) / 10000;
    const whole = Math.floor(value);
    const dec = (v) => textOpt(String(Math.round(v * 10000) / 10000), v);
    return {
      power: `2${sup(n)}`, n, log: `${logStr(10, 2)} = 0.3010`,
      steps: [
        step(dec(value), [dec(value * 10), dec(n + 0.301), dec(value / 10)], [dec(value + 1), dec(value - 1), dec(value + 0.301)]),
        step(int(whole), [int(whole + 1), int(n), int(Math.round(value * 10))], [int(whole - 1), int(whole + 2), int(whole - 2)]),
        step(int(whole + 1), [int(whole), int(whole + 2), int(n)], [int(whole - 1), int(whole + 3), int(Math.round(n / 2))]),
      ],
    };
  },

  // 지수방정식 (치환): 2ˣ = t 로 놓고 작은 t → 큰 t → 큰 쪽의 해 x
  expquad() {
    const [p, q] = pickOne([[0, 1], [0, 2], [1, 2], [1, 3], [0, 3], [2, 3], [1, 4], [2, 4]]);
    const [t1, t2] = [2 ** p, 2 ** q];
    return {
      eq: `4${sup('x')} ${MINUS} ${t1 + t2}·2${sup('x')} + ${t1 * t2} = 0`,
      steps: [
        step(int(t1), [int(t2), int(t1 + t2), int(t1 * t2)], [int(t1 + 1), int(t1 + 2), int(t1 + 3)]),
        step(int(t2), [int(t1), int(t1 + t2), int(t1 * t2)], [int(t2 + 1), int(t2 - 1), int(t2 * 2), int(t2 + 2)]),
        step(int(q), [int(t2), int(p), int(q + 1)], [int(q - 1), int(q + 2), int(2 * q), int(q + 3)]),
      ],
    };
  },
});

// ---------- 数学II: 微分法と積分法 ----------

// 극값을 x = p (극대), x = q (극소) 에서 갖는 삼차함수 (p < q). 계수는 높은 차수부터
function cubicWith(p, q, c) {
  return (p + q) % 2 === 0 ? [1, (-3 * (p + q)) / 2, 3 * p * q, c] : [2, -3 * (p + q), 6 * p * q, c];
}
const windowOf = (coefs, from, to) => {
  const ys = range(0, 40).map((n) => valAt(coefs, from + ((to - from) * n) / 40));
  return [from, to, Math.min(0, ...ys) - 1, Math.max(0, ...ys) + 1];
};
const valAt = (coefs, x) => coefs.reduce((acc, k) => acc * x + k, 0);

Object.assign(GENERATORS, {
  // 평균변화율: f(x) = x² + bx + c 에서 x 가 p 부터 q 까지 변할 때
  avgrate() {
    const [b, c] = [nonzero(-5, 5), range(-5, 5)[rand(11)]];
    const p = range(-3, 3)[rand(7)];
    const q = p + 1 + rand(3);
    const f = (x) => x * x + b * x + c;
    const rate = p + q + b;
    return item({ expr: polyStr(1, b, c), p: numStr(p), q: numStr(q) }, int(rate), [int(f(q) - f(p)), int(2 * p + b), int(2 * q + b)],
      [int(rate + 1), int(rate - 1), int(f(q) + f(p)), int(rate + 2), int(-rate)]);
  },

  // 도함수와 미분계수. params.ask 는 'func' 또는 'value'
  deriv(params) {
    const [a, b, c, d] = [pickOne([1, 2]), nonzero(-4, 4), nonzero(-6, 6), nonzero(-7, 7)];
    const fields = { expr: polyN([a, b, c, d]) };
    if (params.ask === 'func') {
      return item(fields, polyOpt([3 * a, 2 * b, c]), [polyOpt([a, b, c]), polyOpt([3 * a, 2 * b, c, d]), polyOpt([3 * a, b, c])],
        [polyOpt([3 * a, 2 * b, 0]), polyOpt([a, 2 * b, c]), polyOpt([3 * a, 2 * b, c + 1])]);
    }
    const k = pickOne([-2, -1, 1, 2]);
    const value = 3 * a * k * k + 2 * b * k + c;
    return item({ ...fields, k: numStr(k) }, int(value), [int(valAt([a, b, c, d], k)), int(a * k * k + b * k + c), int(3 * a * k * k + 2 * b * k + c + d)],
      [int(value + 1), int(value - 1), int(-value), int(value + 2)]);
  },

  // 접선의 방정식: y = x² + bx + c 위의 x = t 인 점에서
  tangent2() {
    const [b, c, t] = [range(-3, 3)[rand(7)], range(-3, 3)[rand(7)], nonzero(-2, 2)];
    const m = 2 * t + b;
    const y = t * t + b * t + c;
    const k = c - t * t;
    if (m === 0) return GENERATORS.tangent2();
    return item({ expr: `y = ${polyStr(1, b, c)}`, t: numStr(t), px: t, coefs: [1, b, c],
      plot: planeOf({ free: 1, r: [t - 4, t + 4, Math.min(y, 0) - 4, Math.max(y, 0) + 5], curves: [[1, b, c]], lines: [[m, -1, -k]], pts: [[t, y, '']] }) }, lineOpt(m, k),
    [lineOpt(m, c), lineOpt(m, y), lineOpt(2 * t, k), lineOpt(-m, k)], [lineOpt(m, k + 1), lineOpt(m, k - 1), lineOpt(m + 1, k)]);
  },

  // 극댓값과 극솟값. params.ask 는 'max' 또는 'min'
  extrema(params) {
    const p = range(-2, 1)[rand(4)];
    const q = p + 1 + rand(3);
    const co = cubicWith(p, q, range(-4, 4)[rand(9)]);
    const [hi, lo] = [valAt(co, p), valAt(co, q)];
    const answer = params.ask === 'max' ? hi : lo;
    const [x0, x1] = [p - 1.3, q + 1.3];
    return item({ expr: polyN(co), coefs: co, plot: planeOf({ free: 1, r: windowOf(co, x0, x1), curves: [co], mx: [p, q].filter((v) => v !== 0) }) }, int(answer),
      [int(params.ask === 'max' ? lo : hi), int(params.ask === 'max' ? p : q), int(co[3])], [int(answer + 1), int(answer - 1), int(-answer), int(answer + 2), int(answer - 2)]);
  },

  // 닫힌 구간에서의 최댓값·최솟값. params.ask 는 'max' 또는 'min'
  interval2(params) {
    const p = range(-2, 0)[rand(3)];
    const q = p + 1 + rand(2);
    const co = cubicWith(p, q, range(-3, 3)[rand(7)]);
    const [a, b] = [p - 1 - rand(2), q + 1 + rand(2)];
    const cand = [a, p, q, b].map((x) => valAt(co, x));
    const answer = params.ask === 'max' ? Math.max(...cand) : Math.min(...cand);
    return item({ expr: polyN(co), a: numStr(a), b: numStr(b), coefs: co, from: a, to: b }, int(answer), shuffled(cand).map(int),
      [int(answer + 1), int(answer - 1), int(answer + 2), int(-answer), int(answer - 2)]);
  },

  // 적분. params.ask 가 'indef' 이면 부정적분, 'def' 이면 정적분
  integral(params) {
    const [a, b, c] = [pickOne([1, 2]), nonzero(-3, 3), nonzero(-5, 5)];
    const f = [3 * a, 2 * b, c];
    const F = [a, b, c, 0];
    const withC = (coefs) => ({ s: `${polyN(coefs)} + C`, v: valN(coefs) });
    if (params.ask === 'indef') {
      return item({ expr: polyN(f), coefs: f }, withC(F), [withC([6 * a, 2 * b]), withC([3 * a, 2 * b, c, 0]), withC([a, b, c])],
        [withC([a, b, 0, 0]), withC([a, 2 * b, c, 0]), withC([3 * a, b, c, 0])]);
    }
    const p = range(-2, 1)[rand(4)];
    const q = p + 1 + rand(3);
    const value = valAt(F, q) - valAt(F, p);
    return item({ expr: polyN(f), p: numStr(p), q: numStr(q), coefs: f, from: p, to: q }, int(value),
      [int(valAt(F, q) + valAt(F, p)), int(-value), int(valAt(f, q) - valAt(f, p)), int(valAt(F, q))],
      [int(value + 1), int(value - 1), int(value + 2), int(value - 2), int(value * 2)]);
  },

  // 포물선과 x 축으로 둘러싸인 넓이
  area2() {
    const p = range(-3, 1)[rand(5)];
    const d = 1 + rand(5);
    const q = p + d;
    const s = pickOne([1, -1]);
    const co = [s, -s * (p + q), s * p * q];
    const peak = valAt(co, (p + q) / 2);
    return item({ expr: `y = ${polyStr(...co)}`, coefs: co,
      plot: planeOf({ free: 1, r: [p - 1.5, q + 1.5, Math.min(0, peak) - 1.5, Math.max(0, peak) + 1.5], curves: [co], area: [co, null, p, q], mx: [p, q].filter((v) => v !== 0) }) },
    frac(d ** 3, 6), [frac(d ** 3, 3), frac(d ** 3, 2), frac(d * d, 6), frac(d ** 3, 12)], [frac(d ** 3 + 6, 6), frac(d, 6), int(d)]);
  },
});

Object.assign(CHAINS, {
  // 삼차함수: f′(x) = 0 의 작은 해 → 극댓값 → 극솟값
  cubicx() {
    const p = range(-2, 1)[rand(4)];
    const q = p + 1 + rand(3);
    const co = cubicWith(p, q, range(-4, 4)[rand(9)]);
    const [hi, lo] = [valAt(co, p), valAt(co, q)];
    return {
      expr: polyN(co), coefs: co, plot: planeOf({ free: 1, r: windowOf(co, p - 1.3, q + 1.3), curves: [co] }),
      steps: [
        step(int(p), [int(q), int(-p), int(-q)], [int(p - 1), int(p + 2), int(p - 2), int(q + 1)]),
        step(int(hi), [int(lo), int(p), int(co[3])], [int(hi + 1), int(hi - 1), int(-hi), int(hi + 2)]),
        step(int(lo), [int(hi), int(q), int(co[3])], [int(lo + 1), int(lo - 1), int(-lo), int(lo - 2)]),
      ],
    };
  },

  // 넓이: 작은 교점 → 큰 교점 → 넓이
  area() {
    const p = range(-3, 1)[rand(5)];
    const d = 1 + rand(5);
    const q = p + d;
    const co = [-1, p + q, -p * q];
    const peak = valAt(co, (p + q) / 2);
    return {
      expr: `y = ${polyStr(...co)}`, coefs: co,
      plot: planeOf({ free: 1, r: [p - 1.5, q + 1.5, -1.5, peak + 1.5], curves: [co], area: [co, null, p, q], mx: [p, q].filter((v) => v !== 0) }),
      steps: [
        step(int(p), [int(q), int(-p), int(-q)], [int(p - 1), int(p + 1), int(p - 2), int(p + 2)]),
        step(int(q), [int(p), int(-q), int(-p)], [int(q + 1), int(q - 1), int(q + 2), int(q - 2)]),
        step(frac(d ** 3, 6), [frac(d ** 3, 3), frac(d ** 3, 2), frac(d * d, 6)], [frac(d ** 3, 12), frac(d ** 3 + 6, 6), int(d)]),
      ],
    };
  },
});
