// 여러 화면 크기에서 "문제를 푸는 화면"이 한 화면에 들어오는지, 옆으로 넘치지 않는지 잽니다.
// node layout.mjs [shots]   (shots 를 주면 스크린샷도 저장)
// OPT='{"big":true}' node layout.mjs   ← 설정(큰 글씨 등)을 켠 상태로 잴 때
import puppeteer from 'puppeteer-core';
const DEVICES = [
  ['SE1 Safari', 320, 454], ['SE1 full', 320, 568], ['SE3 Safari', 375, 553], ['SE3 full', 375, 667], ['13mini Safari', 375, 629],
  ['iPhone15 Safari', 390, 664], ['iPhone15 full', 390, 844], ['16Pro Safari', 402, 690], ['ProMax Safari', 430, 746],
  ['Galaxy S', 360, 680], ['Galaxy A', 412, 780], ['Fold cover', 344, 740], ['iPad', 768, 950], ['Landscape', 844, 340],
];
const TYPES = (process.env.TYPES || '방멱 정리|필요조건·충분조건|명제 (역·이·대우)|공분산과 상관계수|공간도형 응용|두 지점 관측|이차부등식').split('|');
const SHOTS = process.argv[2] === 'shots';
const b = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const rows = [];
for (const [name, w, h] of DEVICES) {
  for (const type of TYPES) {
    const p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    await p.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await p.evaluateOnNewDocument((lang, opt) => { localStorage.setItem('mathrpg_save_v1', JSON.stringify({ v: 1, lang, tut: 'done', codex: {}, sound: false, opt: JSON.parse(opt) })); }, process.env.LANG2 || 'ko', process.env.OPT || '{}');
    await p.goto('http://localhost:8765/', { waitUntil: 'networkidle0' }); await wait(150);
    const title = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, sh: document.documentElement.scrollHeight, ih: innerHeight }));
    await p.click('#titleNew'); await wait(100);
    // 유형 하나만 고릅니다.
    await p.evaluate((type) => { document.getElementById('scopeAll').click(); document.querySelectorAll('.scope-unit').forEach((x) => x.click()); document.querySelectorAll('.scope-fold').forEach((x) => { if (x.getAttribute('aria-expanded') !== 'true') x.click(); }); const it = [...document.querySelectorAll('.scope-item')].find((x) => x.querySelector('b').textContent === type); if (!it) throw new Error('no type ' + type); it.click(); document.getElementById('scopeStart').click(); }, type);
    await wait(150);
    const map = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, nodeMin: Math.min(...[...document.querySelectorAll('.node')].map((n) => n.getBoundingClientRect().height)), overlap: (() => { const r = [...document.querySelectorAll('.node')].map((n) => n.getBoundingClientRect()); let c = 0; for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) if (r[i].left < r[j].right - 1 && r[j].left < r[i].right - 1 && r[i].top < r[j].bottom - 1 && r[j].top < r[i].bottom - 1) c++; return c; })() }));
    await p.evaluate(() => document.querySelector('#mapRows .node.open').click()); await wait(450);
    const choose = await p.evaluate(() => { const last = document.getElementById('notice').getBoundingClientRect(); const ult = document.getElementById('ultBtn').getBoundingClientRect(); return { fold: Math.round(ult.bottom - innerHeight), sw: document.documentElement.scrollWidth, iw: innerWidth }; });
    if (SHOTS && type === TYPES[0]) await p.screenshot({ path: `L-${name.replace(/\W/g, '')}-choose.png` });
    await p.evaluate(() => document.querySelector('[data-action="skill"]').click()); await wait(300);
    const m = await p.evaluate(() => {
      const ans = document.getElementById('answers').getBoundingClientRect(); const hint = document.getElementById('hintBtn').getBoundingClientRect();
      const wide = [...document.querySelectorAll('#app *')].filter((e) => e.offsetParent && e.getBoundingClientRect().right > innerWidth + 1).length;
      const clipped = [...document.querySelectorAll('#answers button, #qText, #qNote')].filter((e) => e.scrollWidth > e.clientWidth + 1).length;
      const small = [...document.querySelectorAll('#answers button, #hintBtn, #menuBtn')].filter((e) => e.offsetParent && (e.getBoundingClientRect().height < 43.5)).length;
      const fig = document.querySelector('#qFigure svg'); const figW = fig ? Math.round(fig.getBoundingClientRect().width) : 0;
      const txt = document.querySelector('#qFigure svg text'); const scale = fig ? fig.getBoundingClientRect().width / 326 : 0;
      return { ansFold: Math.round(ans.bottom - innerHeight), hintFold: Math.round(hint.bottom - innerHeight), sw: document.documentElement.scrollWidth, iw: innerWidth, wide, clipped, small, figW, figFont: Math.round(14 * scale * 10) / 10, canvasH: Math.round(document.getElementById('stage').getBoundingClientRect().height), qFont: parseFloat(getComputedStyle(document.getElementById('qText')).fontSize) };
    });
    if (SHOTS) await p.screenshot({ path: `L-${name.replace(/\W/g, '')}-${TYPES.indexOf(type)}.png` });
    rows.push({ name, w, h, type, titleScroll: title.sh - title.ih, mapWide: map.sw - map.iw, mapOverlap: map.overlap, chooseFold: choose.fold, ...m, errs: errs.length });
    await p.close();
  }
}
await b.close();
const rot = (r) => r.w > r.h && r.h < 431;
for (const r of rows) if (rot(r)) { r.ansFold = -1; r.chooseFold = -1; }
const bad = rows.filter((r) => r.ansFold > 0 || r.wide || r.clipped || r.small || r.mapWide > 0 || r.mapOverlap || r.sw > r.iw || r.errs || r.chooseFold > 0);
const worst = {};
for (const r of rows) { const w = (worst[r.name] ||= { name: r.name, size: `${r.w}x${r.h}`, ans: -9999, choose: -9999, canvasMin: 999, figMin: 999, issues: 0 }); w.ans = Math.max(w.ans, r.ansFold); w.choose = Math.max(w.choose, r.chooseFold); w.canvasMin = Math.min(w.canvasMin, r.canvasH); if (r.figW) w.figMin = Math.min(w.figMin, r.figFont); w.issues += r.wide + r.clipped + r.small + (r.mapWide > 0) + r.mapOverlap + r.errs + (r.sw > r.iw); }
for (const w of Object.values(worst)) console.log(`${w.name.padEnd(16)} ${w.size.padEnd(9)} answers below fold: ${String(Math.max(0, w.ans)).padStart(3)}px  actions below fold: ${String(Math.max(0, w.choose)).padStart(3)}px  smallest canvas ${String(w.canvasMin).padStart(3)}  smallest figure text ${w.figMin}px  other issues ${w.issues}`);
for (const r of bad.slice(0, 12)) console.log('  PROBLEM', r.name, r.type, JSON.stringify({ ansFold: r.ansFold, chooseFold: r.chooseFold, wide: r.wide, clipped: r.clipped, small: r.small, mapWide: r.mapWide, errs: r.errs }));
console.log('rows', rows.length, 'with problems', bad.length);
