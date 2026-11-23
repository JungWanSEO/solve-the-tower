// 시작점이자 진행 담당.
// 처음 화면 → 범위 고르기 → 지도 → (칸을 고름) → 전투 / ? / 상점 / 휴식 / 보물 → 지도 → … → 보스
// 전투에서 쓰러지면 게임 오버이고, 범위를 다시 골라 새 지도로 처음부터 시작합니다.
import { CONFIG } from './config.js';
import { loadLang, applyStatic, t } from './i18n.js';
import { load, store } from './save.js';
import { loadAll, setScope, allTypeKeys, hasType, hasUnit, subjectNames, actsFor, subjectName } from './questions.js';
import { newRun, nextAct, isLastAct } from './run.js';
import { createStage } from './stage.js';
import { createBattle } from './battle.js';
import { createMap } from './map.js';
import { createEvents } from './events.js';
import { createCodex } from './codex.js';
import { createTutorial } from './tutorial.js';
import { createTitle } from './title.js';
import { createScope } from './scope.js';
import { $, show, celebrate, toast } from './ui.js';
import { play, music, battleMusic, wake } from './sound.js';
import { createSettings, optionsOf } from './settings.js';
import { fitBattle, watchFit } from './fit.js';
import { showGuide, hideGuide } from './guide.js';
import { createData, inIosSafariTab, ask } from './data.js';
import { fillIcons, icon, setSceneArt } from './art.js';

const FIGHTS = ['battle', 'elite', 'midboss', 'boss'];

async function boot() {
  const data = load();
  if (!CONFIG.langs.includes(data.lang)) data.lang = CONFIG.defaultLang;
  // 글, 문제, 몬스터를 한꺼번에 받습니다. 받는 동안 처음 화면에 진행 막대가 보입니다.
  let steps = 0;
  const step = () => {
    steps += 1;
    const bar = $('loadingBar');
    if (bar) bar.style.width = `${Math.min(100, Math.round((steps / 10) * 100))}%`;
  };
  const [, , allMonsters] = await Promise.all([
    loadLang(data.lang).then(step),
    loadAll(step),
    fetch('./data/monsters.json').then((res) => {
      if (!res.ok) throw new Error(`data/monsters.json ${res.status}`);
      step();
      return res.json();
    }),
  ]);
  // 꺼 둔 단원(data/catalog.json 의 off)의 몬스터는 나오지 않습니다.
  const monsters = allMonsters.filter((m) => hasUnit(m.weak.split('/')[0]));
  applyStatic();

  // 예전 기록 맞추기: 유형 이름에 단원이 붙기 전의 기록을 새 이름으로 옮깁니다.
  for (const key of Object.keys(data.codex)) {
    if (!key.includes('/')) {
      data.codex[`math1-trig/${key}`] = data.codex[key];
      delete data.codex[key];
    }
  }
  // 저장된 지도가 없거나 예전 형식이면 새로 만듭니다. 범위가 없던 지도는 전체 범위로 봅니다.
  if (!data.run || !Array.isArray(data.run.nodes)) data.run = newRun(allTypeKeys());
  if (!Array.isArray(data.run.scope) || !data.run.scope.some(hasType)) data.run.scope = allTypeKeys();
  data.run.scope = data.run.scope.filter(hasType); // 꺼진 단원의 유형이 예전 기록에 남아 있으면 뺍니다
  if (data.run.acts) { // 긴 탑: 막마다 같은 정리를 합니다. 모양이 맞지 않으면 지금 막 하나로 끝나는 탑이 됩니다.
    const acts = Array.isArray(data.run.acts) ? data.run.acts.map((a) => ({ id: a.id, keys: (Array.isArray(a.keys) ? a.keys : []).filter(hasType) })) : [];
    if (acts.length > 1 && acts.every((a) => a.keys.length) && Number.isInteger(data.run.act) && acts[data.run.act]) data.run.acts = acts;
    else { delete data.run.acts; delete data.run.act; delete data.run.full; }
  }
  setScope(data.run.scope);

  document.addEventListener('pointerdown', wake, { passive: true }); // 브라우저는 화면을 누른 뒤에야 소리를 허락합니다.
  // 버튼을 누를 때의 짧은 소리 (답 버튼은 정답·오답 소리가 따로 납니다)
  document.addEventListener('click', (event) => {
    const btn = event.target.closest && event.target.closest('button');
    wake();
    if (btn && !btn.closest('#answers, #evAnswers')) play('tap');
  });

  const getRun = () => data.run;
  const persist = () => store(data);
  let screen = 'screenTitle';

  // 튜토리얼 안내: 강조 안내(말풍선)가 있으면 그것을, 없으면 위쪽 안내 줄을 보여 줍니다.
  function updateCoach() {
    const menuOpen = !$('menu').hidden || !$('confirm').hidden;
    const spec = menuOpen ? null : tutorial.guide({
      screen,
      choosing: screen === 'screenBattle' && battle.choosing(),
      chainReady: screen === 'screenBattle' && battle.chainReady(),
    });
    if (spec) {
      showGuide({ ...spec, onNext: spec.next, onSkip: skipTutorial });
    } else {
      hideGuide();
    }
    const key = spec ? null : tutorial.coach();
    const el = $('coach');
    el.hidden = !key || screen !== 'screenBattle';
    if (key) $('coachText').textContent = t(key);
  }
  function skipTutorial() {
    // 튜토리얼 전투 도중에 건너뛰면, 그 연습 전투를 끝내고 지도로 돌아가 처음부터 제대로 시작합니다.
    const practice = screen === 'screenBattle' && tutorial.active();
    tutorial.skip();
    if (practice) {
      battle.abort();
      const run = getRun();
      run.hp = run.maxHp;
      run.pending = null;
      goMap();
      toast(t('tut.skipped'));
      return;
    }
    if (screen === 'screenBattle') battle.refresh();
  }
  const tutorial = createTutorial(data, () => {
    persist();
    if (screen === 'screenBattle') battle.refresh(); // 눌러도 되는 버튼이 바뀌므로 다시 그립니다.
    else updateCoach();
  });

  // 유형별 정답 기록 (도감, 범위 고르기, 복습에 씁니다)
  function record(type, ok) {
    const entry = data.codex[type] || { right: 0, wrong: 0, streak: 0 };
    if (ok) {
      entry.right += 1;
      entry.streak = (entry.streak || 0) + 1;
    } else {
      entry.wrong += 1;
      entry.streak = 0;
    }
    data.codex[type] = entry;
    persist();
  }

  // 위쪽 상태 줄
  function onChange() {
    const run = getRun();
    // 위쪽 줄: 큰 글씨는 지금 몇 층인지, 작은 글씨는 이번 판의 범위
    const spot = run.nodes.find((n) => n.id === (run.pending ?? run.at));
    $('subjectName').textContent = `${subjectNames(run.scope).join(' · ')} · ${t('ui.scopeCount', { n: run.scope.length, total: allTypeKeys().length })}`;
    const where = spot ? t('ui.where', { n: spot.floor + 1, total: run.floors }) : t('ui.whereStart', { total: run.floors });
    // 긴 탑에서는 막과 층을 짧게 함께 적습니다. (좁은 화면에서 잘리지 않도록)
    $('unitName').textContent = !run.acts ? where : spot ? t('ui.actWhere', { a: run.act + 1, at: run.acts.length, n: spot.floor + 1, total: run.floors }) : t('ui.actStart', { a: run.act + 1, at: run.acts.length });
    // 체력·골드·힌트는 그림이 붙은 칩으로, 지금 걸려 있는 효과는 색 딱지로 보여 줍니다.
    const chips = [
      ['hp', 'maxhp', `${Math.max(0, run.hp)}/${run.maxHp}`],
      ['gold', 'coin', `${run.gold}G`],
      ['hints', 'hint', String(run.hints)],
    ];
    // 효과 딱지는 누르면 설명이 나옵니다.
    const info = {};
    if (run.ascend) {
      chips.push(['tag ascend', '', t('ascend.short', { n: run.ascend })]);
      info.ascend = [t('ascend.name'), Array.from({ length: run.ascend }, (_, i) => t(`ascend.l${i + 1}`)).join('\n')];
    }
    if (run.cheer) {
      chips.push(['tag cheer', '', t('cheer.short', { n: run.cheer })]);
      info.cheer = [t('cheer.name'), t('cheer.text', { n: run.cheer, hp: CONFIG.cheer.hp * run.cheer, pct: Math.round(CONFIG.cheer.guard * run.cheer * 100) })];
    }
    if (run.frail > 0) {
      chips.push(['tag frail', '', t('bless.frailLeft', { n: run.frail })]);
      info.frail = [t('bless.frail'), t('bless.frailSub', CONFIG.bless)];
    }
    const label = t('ui.status', { hp: Math.max(0, run.hp), max: run.maxHp, gold: run.gold, hints: run.hints });
    const bar = $('runStatus');
    if (bar.dataset.shown !== chips.join('|')) { // 바뀌었을 때만 다시 그립니다
      bar.dataset.shown = chips.join('|');
      bar.setAttribute('aria-label', label);
      bar.innerHTML = '';
      for (const [cls, ico, text] of chips) {
        const kind = cls.split(' ')[1];
        const chip = document.createElement(info[kind] ? 'button' : 'span');
        chip.className = `stat ${cls}`;
        if (info[kind]) {
          chip.type = 'button';
          chip.addEventListener('click', () => ask({ title: info[kind][0], text: info[kind][1], buttons: [{ label: t('ui.ok'), kind: 'primary' }] }));
        }
        if (ico) chip.innerHTML = icon(ico);
        chip.append(text);
        bar.appendChild(chip);
      }
    }
    bar.classList.toggle('low', run.hp / run.maxHp <= 0.3);
    updateCoach();
  }

  const stage = createStage($('stage'));
  // 직접 그린 그림이 있으면 불러옵니다. (art/art.json 이 없거나 비어 있으면 원래의 도형 그림을 씁니다)
  fetch('./art/art.json').then((res) => (res.ok ? res.json() : null)).then((manifest) => {
    if (!manifest) return;
    stage.setArt(manifest);
    setSceneArt(manifest.scenes);
    if (manifest.scenes && manifest.scenes.title) title.render();
  }).catch(() => {});
  const battle = createBattle({ stage, getRun, record, tutorial, onChange });
  const events = createEvents({ getRun, data, record, onChange, persist });
  const map = createMap({ getRun, onPick, getWins: () => data.wins });
  const codex = createCodex({ data, monsters, portrait: (id) => stage.portrait(id) });

  function go(name) {
    screen = name;
    show(name);
    if (name !== 'screenBattle') music('calm'); // 전투가 아니면 잔잔한 곡
    window.scrollTo(0, 0); // 긴 화면에서 넘어와도 맨 위부터 보이게
    const menu = name === 'screenTitle' || name === 'screenScope' || name === 'screenData';
    // 도감은 지도와 이벤트 화면에서만 엽니다. (전투 중에는 숨김)
    $('codexBtn').hidden = name === 'screenBattle' || name === 'screenCodex' || menu;
    $('runStatus').hidden = menu;
    $('topBar').hidden = menu; // 처음 화면과 범위 화면에는 위쪽 바가 없습니다.
    $('unitBox').hidden = menu;
    // 메뉴 버튼: 게임 중인 화면(지도, 전투, 사건)에서 보입니다.
    $('menuBtn').hidden = menu || name === 'screenCodex';
    if (!menu) armBack();
    if (name !== 'screenBattle') document.body.classList.remove('is-answering');
    onChange();
    fitBattle();
  }

  // ---- 메뉴 (일시 정지) ----
  function openMenu() {
    if ($('menuBtn').hidden) return;
    const key = screen === 'screenBattle' ? 'menu.textBattle' : screen === 'screenEvent' ? 'menu.textEvent' : 'menu.textMap';
    $('menuText').textContent = t(key);
    $('menu').dataset.key = key;
    $('menu').hidden = false;
    $('menuResume').focus();
    updateCoach(); // 메뉴가 열려 있는 동안에는 강조 안내를 치웁니다.
  }
  function closeMenu() {
    $('menu').hidden = true;
    updateCoach();
  }
  $('menuBtn').addEventListener('click', openMenu);
  $('menuResume').addEventListener('click', closeMenu);
  $('menu').addEventListener('click', (event) => {
    if (event.target === $('menu')) closeMenu(); // 바깥을 누르면 닫힘
  });
  $('menuQuit').addEventListener('click', () => {
    closeMenu();
    if (screen === 'screenBattle') battle.abort();
    goTitle();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (settings.isOpen()) settings.close();
    else if (!$('menu').hidden) closeMenu();
    else openMenu();
  });

  // 스마트폰의 "뒤로" 버튼: 게임 중에는 페이지를 떠나지 않고 메뉴를 엽니다.
  let armed = false;
  function armBack() {
    if (armed) return;
    armed = true;
    window.history.pushState({ game: true }, '');
  }
  window.addEventListener('popstate', () => {
    armed = false;
    if (screen === 'screenTitle' && !settings.isOpen()) return; // 처음 화면에서는 그대로 나갑니다.
    armBack();
    if (screen === 'screenScope' || screen === 'screenData') goTitle();
    else if (screen === 'screenCodex') $('codexClose').click();
    else if (settings.isOpen()) settings.close();
    else if (!$('menu').hidden) closeMenu();
    else openMenu();
  });

  // 튜토리얼 건너뛰기: 잠겨 있던 버튼이 바로 풀립니다.
  $('coachSkip').addEventListener('click', skipTutorial);

  // 도감 열고 닫기: 닫으면 보던 화면으로 돌아갑니다.
  let beforeCodex = 'screenMap';
  function openCodex() {
    beforeCodex = screen;
    go('screenCodex');
    codex.render();
  }
  $('codexBtn').addEventListener('click', openCodex);
  $('codexClose').addEventListener('click', () => {
    go(beforeCodex);
    if (beforeCodex === 'screenMap') map.render();
    else if (beforeCodex === 'screenTitle') title.render();
    else events.refresh();
  });

  function goMap() {
    persist();
    go('screenMap');
    map.render();
  }

  // 칸을 끝냈습니다. 지도로 돌아가 다음 칸을 고릅니다.
  function complete(node) {
    const run = getRun();
    run.visited.push(node.id);
    run.at = node.id;
    run.pending = null;
    goMap();
  }

  // 범위 고르기: 고른 유형으로 새 지도를 만들어 출발합니다.
  const scope = createScope({
    data,
    onStart(keys) {
      // 과목을 둘 이상 골랐으면 탑의 길이를 묻습니다. (튜토리얼 중에는 묻지 않고 짧은 탑)
      const acts = actsFor(keys);
      if (acts.length > 1 && !tutorial.active()) {
        ask({
          title: t('act.askTitle'),
          text: t('act.askText', { n: acts.length, floors: acts.length * (2 * CONFIG.map.half + 2), list: acts.map((a) => subjectName(a.id)).join(' → ') }),
          buttons: [
            { label: t('act.long', { n: acts.length }), kind: 'primary', run: () => begin(keys, acts) },
            { label: t('act.short'), run: () => begin(keys, null) },
          ],
        });
        return;
      }
      begin(keys, null);
    },
    onBack: () => goTitle(),
  });
  function begin(keys, acts) {
    {
      data.lastScope = keys;
      const level = Math.min(data.ascend || 0, data.ascendMax || 0);
      // 격려는 보통 난이도에서만 붙습니다. (도전 단계는 스스로 고른 어려움이므로)
      data.run = newRun(keys, level, level || !optionsOf(data).cheer ? 0 : Math.min(CONFIG.cheer.max, data.falls || 0), acts); // 설정에서 격려를 꺼 두면 붙지 않습니다
      setScope(data.run.scope);
      // 재도전 선물: 한 판이라도 끝낸 적이 있으면, 지난 판의 성적에 맞는 선물을 고르고 출발합니다.
      if (CONFIG.bless.on && data.last && !tutorial.active()) {
        persist();
        go('screenEvent');
        events.blessing(data.last, goMap);
        return;
      }
      goMap();
    }
  }
  function goScope() {
    persist();
    go('screenScope');
    scope.open();
  }

  // 처음 화면: 이어서 하기 / 처음부터 시작 / 도감
  fillIcons(); // 버튼의 작은 그림
  const title = createTitle({
    getRun,
    getRecord: () => ({ wins: data.wins, clears: data.clears, ascendMax: data.ascendMax || 0 }),
    onContinue: goMap,
    onNew: goScope,
    onCodex: openCodex,
    tutorialDone: () => tutorial.done(),
    // 튜토리얼 다시 보기: 처음부터 다시 안내하도록 돌려놓고, 새 지도를 시작합니다.
    onTutorial() {
      tutorial.restart();
      goScope();
    },
  });
  // 데이터 관리: 용량 보기, 백업, 홈 화면 안내, 지우기
  const dataScreen = createData({ data, onBack: () => goTitle() });
  function goData() {
    persist();
    go('screenData');
    dataScreen.open();
  }
  $('titleData').addEventListener('click', goData);
  $('iosHint').addEventListener('click', goData);
  $('iosHint').hidden = !inIosSafariTab();

  function goTitle() {
    persist();
    title.reset();
    go('screenTitle');
    title.render();
  }

  function chooseMonster(kind) {
    const run = getRun();
    // 이번 범위에 들어 있는 단원의 몬스터가 먼저 나옵니다. 하나도 없으면 전체에서 고릅니다.
    const units = new Set(run.scope.map((key) => key.split('/')[0]));
    const fit = (list) => {
      const fitting = list.filter((m) => units.has(m.weak.split('/')[0]));
      return fitting.length ? fitting : list;
    };
    const any = (list) => list[Math.floor(Math.random() * list.length)];
    if (kind === 'boss') return any(fit(monsters.filter((m) => m.boss)));
    if (kind === 'midboss') return any(fit(monsters.filter((m) => m.midboss)));
    const normal = monsters.filter((m) => !m.boss && !m.midboss);
    if (tutorial.active()) return normal[0];
    const base = fit(normal);
    const fresh = base.filter((m) => m.id !== run.lastFoe);
    const pool = fresh.length ? fresh : base;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // 적의 약점 유형: 몬스터의 원래 약점이 이번 범위에 있으면 그것, 없으면 범위 안에서 하나 고릅니다.
  function chooseWeak(monster) {
    const run = getRun();
    if (run.scope.includes(monster.weak)) return monster.weak;
    return run.scope[Math.floor(Math.random() * run.scope.length)];
  }

  // kind 를 따로 주면 그 종류로 싸웁니다. (? 칸의 기습은 보통 전투)
  function fight(node, kind = node.type) {
    const run = getRun();
    // 닫았다가 다시 열어도 같은 적이 나오도록 칸에 적어 둡니다.
    if (!node.monster) node.monster = chooseMonster(kind).id;
    const monster = monsters.find((m) => m.id === node.monster) || monsters[0];
    if (!node.weak || !run.scope.includes(node.weak)) node.weak = chooseWeak(monster);
    run.lastFoe = monster.id;
    battleMusic(kind, monster.weak, monster.id); // 보통 전투는 과목별, 강적·중간 보스·보스는 각자의 곡
    // 중간 보스 방 앞에는 작은 샘이 있습니다. 들어갈 때 한 번, 체력을 조금 회복합니다.
    if (kind === 'midboss' && CONFIG.midboss.healBefore > 0 && !node.sipped) {
      node.sipped = true;
      const before = run.hp;
      run.hp = Math.min(run.maxHp, run.hp + CONFIG.midboss.healBefore);
      if (run.hp > before) toast(t('msg.midSpring', { n: run.hp - before }), icon('heal'));
    }
    data.seen[monster.id] = true;
    persist();

    tutorial.emit('fight');
    go('screenBattle');
    battle.start({ monster, kind, weak: node.weak, safe: tutorial.active(), floor: node.floor }, (result) => {
      if (result === 'lose') {
        // 게임 오버: 지도 한 장의 진행은 사라지고, 도감 기록은 남습니다.
        data.deaths = (data.deaths || 0) + 1;
        data.last = { floor: node.floor + 1, clear: false }; // 다음 판의 재도전 선물이 이것을 봅니다
        if (!run.ascend) data.falls = (data.falls || 0) + 1; // 연달아 쓰러진 횟수 (격려 단계가 됩니다)
        data.run = newRun(run.full || run.scope);
        persist();
        go('screenEvent');
        events.gameover({ floor: node.floor + 1, total: run.floors }, goScope);
        return;
      }
      const gold = Math.round(CONFIG.gold[kind] * (run.goldMul || 1));
      data.wins += 1;
      run.gold += gold;
      run.hp = Math.min(run.maxHp, run.hp + ((run.ascend || 0) >= 4 ? CONFIG.ascend.heal : CONFIG.player.healOnWin));
      if (run.frail > 0 && (kind === 'battle' || kind === 'elite')) run.frail -= 1;
      tutorial.emit('won');
      go('screenEvent');
      if (kind === 'boss' && !isLastAct(run)) {
        // 긴 탑: 막의 보스를 이기면 다음 막으로 넘어갑니다. (탑 클리어는 마지막 막에서)
        play('clear');
        const healed = nextAct(run);
        setScope(run.scope);
        persist();
        goMap();
        ask({
          title: t('act.nextTitle', { n: run.act + 1, name: subjectName(run.acts[run.act].id) }),
          text: t(isLastAct(run) ? 'act.lastText' : 'act.nextText', { gold, hp: healed, left: run.acts.length - run.act }),
          buttons: [{ label: t('ui.ok'), kind: 'primary' }],
        });
      } else if (kind === 'boss') {
        play('clear');
        data.clears += 1;
        data.last = { floor: run.floors, clear: true };
        data.falls = 0;
        // 지금 열려 있는 가장 높은 도전 단계로 깼으면 다음 단계가 열립니다.
        const level = run.ascend || 0;
        const opened = level === (data.ascendMax || 0) && level < CONFIG.ascend.max;
        if (opened) {
          data.ascendMax = level + 1;
          data.ascend = level + 1;
        }
        data.run = newRun(run.full || run.scope);
        persist();
        events.clear(gold, goScope, opened ? level + 1 : 0);
        celebrate();
      } else {
        persist();
        events.reward(gold, () => {
          tutorial.emit('rewarded');
          complete(node);
        });
      }
    });
  }

  function onPick(node) {
    const run = getRun();
    run.pending = node.id;
    persist();
    tutorial.emit('picked');
    if (FIGHTS.includes(node.type)) {
      fight(node);
      return;
    }
    go('screenEvent');
    if (node.type === 'event') {
      // ? 칸: 좋은 일, 나쁜 일, 선택, 기습 중 하나
      events.mystery(node, () => complete(node), () => fight(node, 'battle'));
    } else {
      events[node.type](() => complete(node), node); // shop, rest, treasure
    }
  }

  // 언어 바꾸기 (설정 창의 선택 상자)
  async function changeLang(lang) {
    data.lang = lang;
    persist();
    await loadLang(data.lang);
    applyStatic();
    if (screen === 'screenTitle') title.render();
    if (screen === 'screenScope') scope.render();
    if (screen === 'screenMap') map.render();
    if (screen === 'screenBattle') battle.refresh();
    if (screen === 'screenEvent') events.refresh();
    if (screen === 'screenCodex') codex.render();
    if (screen === 'screenData') dataScreen.render();
    if (!$('menu').hidden) $('menuText').textContent = t($('menu').dataset.key);
    settings.render();
    onChange();
  }
  // 설정: 음량, 언어, 큰 글씨, 연출 줄이기, 격려, 데이터 관리
  const settings = createSettings({
    data,
    save: () => store(data),
    onCalm: (calm) => stage.setCalm(calm),
    onLang: changeLang,
    onData: () => {
      closeMenu();
      goData();
    },
  });
  $('titleSettings').addEventListener('click', settings.open);
  $('menuSettings').addEventListener('click', settings.open);

  watchFit();
  goTitle();
  document.body.classList.add('ready'); // 불러오기 끝: 진행 막대를 치우고 버튼을 보여 줍니다.
  clearTimeout(window.sttSlow);
  watchUpdate();
}

// 새 버전 알림과 오프라인 실행 (sw.js). 새 버전이 준비되면 처음 화면 위에 알림 줄이 나옵니다.
function watchUpdate() {
  // 처음 화면 아래에 지금 버전을 작게 적습니다. (sw.js 의 VERSION 한 곳에서 읽습니다)
  fetch('./sw.js').then((res) => res.text()).then((text) => {
    const found = text.match(/VERSION = '([^']+)'/);
    if (found) $('versionText').textContent = `v${found[1]}`;
  }).catch(() => {});
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    const offer = (worker) => {
      if (!worker || !navigator.serviceWorker.controller) return; // 첫 설치는 알릴 것이 없습니다.
      $('updateBar').hidden = false;
      $('updateBtn').onclick = () => worker.postMessage('skip');
    };
    if (reg.waiting) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      if (worker) worker.addEventListener('statechange', () => { if (worker.state === 'installed') offer(worker); });
    });
  }).catch(() => {});
  // 새 버전으로 바뀌면 화면을 다시 엽니다. (처음 설치될 때는 다시 열 필요가 없습니다)
  const hadWorker = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !hadWorker) return;
    reloading = true;
    window.location.reload();
  });
}

boot().catch((err) => {
  // 불러오지 못했을 때: 이유와 "다시 시도" 버튼을 보여 줍니다.
  // (파일을 더블클릭해서 열면(file://) 데이터 파일을 읽지 못합니다. README 의 실행 방법을 보세요.)
  clearTimeout(window.sttSlow);
  const box = document.getElementById('loading');
  if (box) {
    box.classList.add('failed');
    document.getElementById('loadingText').textContent = (window.sttText || {}).fail || 'Could not load.';
    document.getElementById('loadingDetail').textContent = err.message;
    document.getElementById('loadingRetry').hidden = false;
  }
  console.error(err);
});
