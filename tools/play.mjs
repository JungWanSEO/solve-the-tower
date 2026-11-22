// Headless playthrough: a bot plays whole runs through the real DOM and game code.
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = new URL('../', import.meta.url).pathname.replace(/\/$/, ''); // 저장소 폴더
process.argv.splice(2, 0, ROOT);
const ACC = Number(process.argv[3] || 0.75);
const WANT_CLEARS = Number(process.argv[4] || 1);
const SEED_SAVE = process.argv[5] || '';

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/<script[^>]*><\/script>/, '');
const dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: false });
const { window } = dom; window.scrollTo = () => {};
const noop = new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 1 : k === 'canvas' ? {} : noop), apply: () => noop, set: () => true });
window.HTMLCanvasElement.prototype.getContext = () => noop;
window.Element.prototype.scrollIntoView = () => {};
window.HTMLCanvasElement.prototype.toDataURL = () => ''; // 봇은 그림을 보지 않습니다
let frames = [];
const g = globalThis;
g.window = window; g.document = window.document; g.localStorage = window.localStorage;
g.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
window.requestAnimationFrame = g.requestAnimationFrame;
window.matchMedia = (q) => ({ matches: /reduced-motion/.test(q) }); // 봇은 기다리지 않으므로 지도의 말 이동을 생략시킵니다
g.matchMedia = window.matchMedia;
g.addEventListener = window.addEventListener.bind(window);
window.devicePixelRatio = 1;
g.fetch = async (p) => {
  const file = path.join(ROOT, p.replace(/^\.\//, ''));
  if (!fs.existsSync(file)) return { ok: false, status: 404, json: async () => ({}) };
  return { ok: true, status: 200, json: async () => JSON.parse(fs.readFileSync(file, 'utf8')) };
};
if (SEED_SAVE) window.localStorage.setItem('mathrpg_save_v1', SEED_SAVE);
const errors = [];
process.on('unhandledRejection', (e) => errors.push('unhandled: ' + (e && e.stack || e)));
const origErr = console.error; console.error = (...a) => { errors.push(a.map(String).join(' ')); };

// answer key: question text (ja) -> answer
const unit = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/units/math1-trig.json'), 'utf8'));
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
const key = new Map();
const figAlt = (tp, it) => (tp.figure ? Object.entries(tp.figure).filter(([k]) => k !== 'kind').map(([, v]) => fill(String(v), it)).filter(Boolean).join(', ') : '');
for (const tp of unit.templates) for (const it of tp.items || []) key.set(fill(tp.text.ja, it) + '|' + figAlt(tp, it), String(it.answer));

const TUNE = JSON.parse(process.env.TUNE || '{}');
{ const { CONFIG } = await import(path.join(ROOT, 'js/config.js'));
  const merge = (d, src) => { for (const [k, v] of Object.entries(src)) { if (v && typeof v === 'object') merge(d[k], v); else d[k] = v; } };
  merge(CONFIG, TUNE.config || {}); }
const baseFetch = g.fetch;
g.fetch = async (p) => { const r = await baseFetch(p); if (!/monsters/.test(p) || !TUNE.hp) return r; const list = await r.json(); for (const m of list) if (TUNE.hp[m.id]) m.hp = TUNE.hp[m.id]; return { ok: true, status: 200, json: async () => list }; };
await import(path.join(ROOT, 'js/main.js'));
await new Promise((r) => setTimeout(r, 50));
const Q = await import(path.join(ROOT, 'js/questions.js'));

const $ = (id) => window.document.getElementById(id);
const vis = (id) => $(id) && !$(id).hidden;
const enabled = (sel) => [...window.document.querySelectorAll(sel)].filter((b) => !b.disabled && !b.hidden);
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
const stats = { types: {}, clicks: 0, answers: 0, right: 0, nodes: {}, battles: 0, defeats: 0, hints: 0, bought: 0, deathFloors: {}, coach: new Set(), codexOpened: 0 };
let ts = 0, shopClicks = 0, lastScreen = '';

function solve(textId, boxSel) {
  // 숫자 칸 채우기: 정답의 숫자를 숫자판으로 넣습니다. 틀릴 차례에는 첫 칸을 다른 숫자로 넣습니다.
  if (window.document.querySelector(`${boxSel.split(' ')[0]}.fill .fill-ok`)) {
    const q = Q.debugLast(); const want = [...Q.optionText(q.options[q.correct])].filter((ch) => /[0-9−-]/.test(ch)).map((ch) => (ch === '-' ? '−' : ch));
    const good = Math.random() < ACC; stats.answers++; stats.fills = (stats.fills || 0) + 1; if (good) stats.right++;
    const key = (k) => window.document.querySelector(`.fill-key[data-key="${k}"]`).click();
    const free = [...window.document.querySelectorAll('.fill-cell')].filter((c) => !c.classList.contains('locked')).length;
    want.slice(want.length - free).forEach((ch, i) => key(!good && i === 0 ? (ch === '7' ? '8' : '7') : ch));
    const ok = window.document.querySelector('.fill-ok'); if (ok.disabled) { errors.push('fill not complete'); return true; } ok.click(); return true;
  }
  const btns = enabled(boxSel);
  if (!btns.length) return false;
  const lastQ = Q.debugLast();
  const ans = lastQ ? (Q.optionText ? Q.optionText(lastQ.options[lastQ.correct]) : lastQ.options[lastQ.correct]) : undefined;
  if (ans === undefined || !btns.concat([...window.document.querySelectorAll(boxSel)]).some((x) => x.textContent === ans)) { errors.push('answer not on screen: ' + ans + ' / ' + $(textId).textContent); }
  stats.types[lastQ.type] = (stats.types[lastQ.type] || 0) + 1;
  const good = btns.find((b) => b.textContent === ans);
  const bad = btns.filter((b) => b.textContent !== ans);
  const pickGood = Math.random() < ACC || !bad.length;
  stats.answers++; if (pickGood && good) stats.right++;
  (pickGood && good ? good : rnd(bad)).click();
  return true;
}

function act() {
  { const g = $('guide'); if (g && !g.hidden) { stats.guides = stats.guides || new Set(); stats.guides.add($('guideText').textContent.slice(0, 12)); const nx = $('guideNext'); if (!nx.hidden) { nx.click(); return; } } }
  const coach = $('coach'); if (coach && !coach.hidden) stats.coach.add(coach.textContent);
  if (vis('screenTitle')) { stats.title = (stats.title || 0) + 1; const c = $('titleContinue'); (c.hidden ? $('titleNew') : c).click(); return; }
  if (!$('confirm').hidden) { $('confirmOk').click(); return; }
  { const dlg = $('dialog'); if (dlg && !dlg.hidden) { (stats.dialogs ||= new Set()).add(`${$('dialogTitle').textContent} | ${$('dialogText').textContent}`); const bs = [...dlg.querySelectorAll('#dialogButtons button')]; if (bs.length === 2 && /10/.test(bs[1].textContent)) { stats.lengthAsked = (stats.lengthAsked || 0) + 1; (process.env.LONG ? bs[0] : bs[1]).click(); } else { if (bs.length === 1 && /막|幕|Act/.test($('dialogTitle').textContent)) stats.acts = (stats.acts || 0) + 1; bs[0].click(); } return; } }
  if (vis('screenScope')) { stats.scope = (stats.scope || 0) + 1; const mode = process.env.SCOPE || 'all';
    if (mode === 'all') $('scopeAll').click();
    else { $('scopeAll').click(); window.document.querySelectorAll('.scope-fold').forEach((x) => { if (x.getAttribute('aria-expanded') !== 'true') x.click(); }); const items = [...window.document.querySelectorAll('.scope-item')]; items.forEach((b, i) => { if (!mode.split(',').includes(String(i))) b.click(); }); }
    $('scopeStart').click(); return; }
  if (vis('screenCodex')) { stats.codexOpened++; $('codexClose').click(); return; }
  if (vis('screenMap')) {
    if ($('codexBtn') && !$('codexBtn').hidden && stats.codexOpened === 0 && Math.random() < 0.3) { $('codexBtn').click(); return; }
    if (!stats.backed && Math.random() < 0.05 && stats.clicks > 20) { stats.backed = 1; $('menuBtn').click(); $('menuQuit').click(); return; }
    const nodes = enabled('#mapRows .node');
    // SMART=1: 사람처럼 길을 고릅니다. 체력이 60% 아래면 휴식 칸을, 넉넉하면 강적을 피하지 않고 아무 칸이나 고릅니다.
    if (nodes.length) { const r0 = save().run || {}; const low = process.env.SMART && r0.maxHp && r0.hp / r0.maxHp < 0.6; const rest = nodes.filter((x) => x.classList.contains('type-rest')); const safe = nodes.filter((x) => !x.classList.contains('type-elite')); const n = low && rest.length ? rnd(rest) : low && safe.length ? rnd(safe) : rnd(nodes); const type = [...n.classList].find((c) => c.startsWith('type-')); stats.nodes[type] = (stats.nodes[type] || 0) + 1; if (/battle|elite|boss/.test(type)) stats.battles++; shopClicks = 0; n.click(); stats.clicks++; }
    return;
  }
  if (vis('screenBattle')) {
    if (!$('nextBtn').hidden) { stats.reviews = (stats.reviews || 0) + 1; $('nextBtn').click(); return; }
    if (!stats.quitBattle && stats.clicks > 40 && Math.random() < 0.02) { stats.quitBattle = 1; $('menuBtn').click(); $('menuQuit').click(); return; }
    if (!$('answers').hidden && enabled('#answers button').length) {
      const hint = $('hintBtn');
      if (!hint.hidden && !hint.disabled && Math.random() < 0.3) { hint.click(); stats.hints++; return; }
      solve('qText', '#answers button'); stats.clicks++; return;
    }
    const ult = $('ultBtn');
    if (!ult.disabled) { ult.click(); stats.clicks++; return; }
    { const ch = $('chainBtn'); if (ch && !ch.hidden && !ch.disabled && Math.random() < 0.5) { ch.click(); stats.chains = (stats.chains || 0) + 1; stats.clicks++; return; } }
    const acts = enabled('#actions button');
    if (!acts.length) return;
    const big = /強い|강한|heavy/.test($('foeIntent').textContent);
    const def = acts.find((b) => b.dataset.action === 'defend');
    { const fin = acts.find((b) => b.classList.contains('finish') && b.dataset.action !== 'defend'); if (fin) { fin.click(); stats.clicks++; stats.finishes = (stats.finishes || 0) + 1; return; } } // 맞히면 끝나는 행동이 있으면 그것을 고릅니다
    if (big && def) { def.click(); stats.clicks++; return; }
    const atk = acts.filter((b) => b.dataset.action !== 'defend');
    (atk.length ? rnd(atk) : rnd(acts)).click(); stats.clicks++; return;
  }
  if (vis('screenEvent')) {
    if (!$('evQuiz').hidden && enabled('#evAnswers button').length) { solve('evQText', '#evAnswers button'); stats.clicks++; return; }
    const title = $('evTitle').textContent;
    if (/ゲームオーバー|게임 오버|Game over/.test(title) && lastScreen !== 'defeat') { stats.defeats++; lastScreen = 'defeat'; const f = (save().last || {}).floor || 0; stats.deathFloors[f] = (stats.deathFloors[f] || 0) + 1; } else if (!/ゲームオーバー|게임 오버|Game over/.test(title)) lastScreen = '';
    const opts = enabled('#evOptions button');
    const leave = $('evLeave');
    if (opts.length && (leave.hidden || (shopClicks < 6 && Math.random() < 0.6))) { shopClicks++; if (!leave.hidden) stats.bought++; rnd(opts).click(); stats.clicks++; return; }
    if (!leave.hidden) { leave.click(); stats.clicks++; return; }
  }
}

const save = () => JSON.parse(window.localStorage.getItem('mathrpg_save_v1') || '{}');
let i = 0;
const CAP = Number(process.env.CAP || 400000);
const RUNS = Number(process.env.RUNS || 0);
for (; i < CAP && !errors.length; i++) {
  ts += 16; const q = frames; frames = []; for (const f of q) f(ts);
  if (i % 12 === 0) act();
  if (i % 500 === 0 && (save().clears || 0) >= WANT_CLEARS) break;
  if (RUNS && i % 500 === 0 && (save().clears || 0) + stats.defeats >= RUNS) break; // RUNS: 이기든 지든 정해진 판 수만 합니다
  if (RUNS && i % 12 === 0 && vis('screenTitle') && (save().clears || 0) + stats.defeats >= RUNS) break;
}
const s = save();
if (process.env.JSONOUT) { console.log(JSON.stringify({ acc: ACC, clears: s.clears || 0, deaths: stats.defeats, deathFloors: stats.deathFloors, answered: stats.answers, right: stats.right, errors: errors.length })); process.exit(errors.length ? 1 : 0); }
if (process.env.DIALOGS) for (const d of stats.dialogs || []) console.log('DIALOG', d);
if (process.env.BRIEF) { console.log(`acc ${ACC}: clears ${s.clears || 0}, deaths ${stats.defeats}, clear rate ${(((s.clears || 0) / Math.max(1, (s.clears || 0) + stats.defeats)) * 100).toFixed(0)}%, midboss reached ${stats.nodes['type-midboss'] || 0}, boss reached ${stats.nodes['type-boss'] || 0}, errors ${errors.length}, acts passed ${stats.acts || 0}, answered ${stats.answers}`); process.exit(errors.length ? 1 : 0); }
console.log(JSON.stringify({ acc: ACC, frames: i, minutesOfAnimation: +(i * 16 / 60000).toFixed(1), clears: s.clears, wins: s.wins, tut: s.tut, stats: { ...stats, coach: [...stats.coach].length, guides: stats.guides ? stats.guides.size : 0 }, answeredRate: +(stats.right / Math.max(1, stats.answers)).toFixed(2), seen: Object.keys(s.seen || {}), codexTypes: Object.keys(s.codex || {}).length, errors: errors.slice(0, 3) }));
// language switch smoke test on whatever screen is showing
for (const l of ['ko', 'en', 'ja']) { const sel = $('langSelect'); sel.value = l; sel.dispatchEvent(new window.Event('change')); await new Promise((r) => setTimeout(r, 30)); for (let k = 0; k < 5; k++) { ts += 16; const q = frames; frames = []; for (const f of q) f(ts); } }
const leftovers = [...window.document.querySelectorAll('#app *')].filter((e) => !e.children.length && /\b(ui|msg|ev|map|node|up|tut|codex|bless|ascend|cheer|tip|set|data|title|scope)\.[a-zA-Z0-9.]+$/.test(e.textContent.trim())).map((e) => e.textContent.trim());
console.log('lang switch errors:', errors.length, '| untranslated keys on screen:', [...new Set(leftovers)].slice(0, 5));
process.exit(errors.length ? 1 : 0);
