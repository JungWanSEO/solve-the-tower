// 전투 규칙과 화면 연결.
// 한 턴: 행동 고르기 → 문제 풀기 → 결과 → 적의 턴 → 다시 행동 고르기
// 체력, 힌트, 강화는 "지도 한 장"의 상태(run)에서 가져옵니다.
import { CONFIG } from './config.js';
import { t, pick } from './i18n.js';
import { next, explainText, explainSteps, explainBrief, typeLabel, optionText, hasChain, nextChain, stepSummary, questionText, setDebugLast } from './questions.js';
import { fillQuestion } from './qview.js';
import { $ } from './ui.js';
import { icon } from './art.js';
import { play } from './sound.js';
import { fitBattle, showReview } from './fit.js';
import { has } from './relics.js';
import { isHero } from './heroes.js';

// mastered(type): 그 유형을 이미 정복했는지 (도서관 카드 유물이 봅니다)
// onRelic(id, vars): 유물의 효과가 났을 때 화면에 알립니다.
export function createBattle({ stage, getRun, record, tutorial, onChange, mastered = () => true, onRelic = () => {} }) {
  let wasReview = false; // 바로 앞의 화면이 풀이 확인이었는지 (다음 문제로 넘어갈 때 화면을 맨 위로 되돌리려고 기억합니다)
  const B = {
    foe: null,
    weak: null,      // 이번 전투에서 적의 약점 유형
    kind: 'battle',  // 'battle' 전투 | 'elite' 강적 | 'midboss' 중간 보스 | 'boss' 보스
    safe: false,     // 튜토리얼 전투: 피해가 줄고 쓰러지지 않습니다.
    foeHp: 0,
    foeMax: 0,
    combo: 0,        // 연속 정답 수 (필살기 게이지)
    turn: 0,
    intent: 'normal',
    lastAction: null, // 방어는 연속으로 쓸 수 없습니다.
    phase: 'busy',   // 'choose' 행동 고르기 | 'answer' 답 고르기 | 'busy' 연출 중 | 'review' 틀린 문제 확인
    gen: 0,          // 전투를 새로 시작하거나 그만둘 때마다 올라갑니다. 예전 연출의 뒷일을 막는 데 씁니다.
    cur: null,       // 지금 문제
    picked: -1,
    notice: { key: 'msg.choose', vars: null },
    onEnd: null,
    chain: null,     // 지금 푸는 연속기 { data, index }
    chainUsed: false, // 연속기를 다 썼는지. 한 전투에 한 번만 씁니다. (유물 "연속기 띠"가 있으면 chainLeft 가 2 에서 시작)
    chainLeft: 1,
    rel: {},         // 유물의 전투 중 상태 { pencil, eraser: 아직 안 썼는지, note: 오답 노트가 걸려 있는지, streak: 연승 리본이 세는 연속 정답, shield: 막기 횟수 }
    shownHp: null,   // 화면에 마지막으로 보여 준 체력 (줄어들면 연출을 냅니다)
    shownFoeHp: null,
  };

  const typeName = typeLabel;

  // ---- 유물 (js/relics.js) ----
  const R = (id) => has(getRun(), id);
  const RC = CONFIG.relic;
  // 필살기에 필요한 연속 정답: 모습 "암산 번개"는 적게, 유물 "두꺼운 문제집"은 하나 더
  const ultNeed = () => (isHero(getRun(), 'flash') ? CONFIG.hero.flash.ultNeed : CONFIG.ultNeed) + (R('workbook') ? RC.workbook.need : 0);
  const flat = () => (R('ruler') ? RC.ruler.dmg : 0); // 금이 간 자: 모든 피해에 더합니다
  const basicDmg = () => CONFIG.damage.basic + getRun().up.basic + flat();
  const skillDmg = () => CONFIG.damage.skill + getRun().up.skill + flat() + (R('highlighter') ? RC.highlighter : 0);
  const counterDmg = () => CONFIG.damage.counter + getRun().up.counter + flat() + (R('setsquare') ? RC.setsquare : 0);
  const ultDmg = () => CONFIG.damage.ult + flat() + (R('workbook') ? RC.workbook.ult : 0);
  const chainDmg = (i) => CONFIG.damage.chain[i] + flat() + (R('chainbelt') ? RC.chainbelt.dmg : 0);
  const weakMul = () => CONFIG.damage.weakBonus + getRun().up.weak + (R('redpen') ? RC.redpen : 0);
  // 공격 문제(기본·스킬·연속기)를 맞혔을 때 유물이 더해 주는 피해. 쓴 유물은 화면에 알립니다.
  function hitBonus() {
    let add = 0;
    if (R('pencil') && B.rel.pencil) {
      B.rel.pencil = false;
      add += RC.pencil;
      onRelic('pencil', { n: RC.pencil });
    }
    if (R('grid') && !$('qFigure').hidden) {
      add += RC.grid;
      onRelic('grid', { n: RC.grid });
    }
    // 모습 "끈기 대장": 방어에 성공한 뒤의 첫 정답
    if (B.rel.guardUp) {
      B.rel.guardUp = false;
      add += CONFIG.hero.grit.guardBonus;
      onRelic('hero-grit', { n: CONFIG.hero.grit.guardBonus });
    }
    if (R('wrongnote') && B.rel.note) {
      B.rel.note = false;
      add += RC.wrongnote;
      onRelic('wrongnote', { n: RC.wrongnote });
    }
    return add;
  }
  // 문제를 맞혔을 때마다: 연승 리본과 도서관 카드. fresh: 답하기 전에 그 유형이 아직 정복 전이었는지
  function onRight(fresh) {
    B.rel.streak = (B.rel.streak || 0) + 1;
    if (R('ribbon') && B.rel.streak % RC.ribbon === 0) {
      B.rel.shield = (B.rel.shield || 0) + 1;
      onRelic('ribbon', { ready: true });
    }
    if (R('library') && fresh) {
      getRun().gold += RC.library;
      onRelic('library', { n: RC.library });
    }
  }
  // 문제를 틀렸을 때마다. 돌려주는 값: 이번에 받는 피해에 곱할 비율 (지우개가 있으면 전투마다 첫 오답은 절반)
  function onWrong() {
    B.rel.streak = 0;
    if (R('wrongnote')) B.rel.note = true;
    if (R('eraser') && B.rel.eraser) {
      B.rel.eraser = false;
      onRelic('eraser', { n: Math.round(RC.eraser * 100) });
      return RC.eraser;
    }
    return 1;
  }

  // 연출이 끝난 뒤 할 일을 감쌉니다. 그 사이 전투를 나갔다면 아무것도 하지 않습니다.
  const live = (fn) => {
    const gen = B.gen;
    return (...args) => {
      if (gen === B.gen) fn(...args);
    };
  };

  // 적이 이번 턴에 주는 피해
  function intentDamage() {
    let dmg = B.intent === 'big' ? CONFIG.foeAttack.big : CONFIG.foeAttack.normal;
    if (B.kind === 'elite') dmg += CONFIG.elite.attackAdd;
    if (B.kind === 'midboss') dmg += CONFIG.midboss.attackAdd;
    if (B.kind === 'boss') dmg += CONFIG.boss.attackAdd;
    // 도전 단계: 3단계부터 보통 공격이, 5단계에서는 강한 공격이 더 아픕니다.
    const level = getRun().ascend || 0;
    if (level >= 3 && B.intent !== 'big') dmg += CONFIG.ascend.attackAdd;
    if (level >= 5 && B.intent === 'big') dmg += CONFIG.ascend.bigAdd;
    // 격려: 단계만큼 받는 피해가 줄어듭니다. (1 아래로는 내려가지 않습니다)
    const cheer = getRun().cheer || 0;
    if (cheer) dmg = Math.max(1, Math.round(dmg * (1 - CONFIG.cheer.guard * cheer)));
    if (B.safe) dmg = Math.floor(dmg / 2);
    return dmg;
  }

  function say(key, vars) {
    B.notice = { key, vars: vars || null };
    $('notice').textContent = t(key, B.notice.vars);
  }

  // 짧은 연출용 클래스를 붙였다가 뗍니다. (연출은 css/style.css 의 hurt, flash)
  function pulse(el, name) {
    el.classList.remove(name);
    void el.offsetWidth; // 같은 연출을 연달아 다시 시작하기 위한 줄
    el.classList.add(name);
    setTimeout(() => el.classList.remove(name), 500);
  }

  // ---- 화면 갱신 ----
  function renderQuestion() {
    // 문제와 답은 "푸는 중"과 "풀이를 읽는 중"에만 보입니다. 답을 고른 뒤 공격·반격 연출이 나오는 동안에는 접어서,
    // 싸우는 그림이 원래 크기로 돌아온 상태에서 연출이 보이게 합니다. (작은 화면에서는 문제를 푸는 동안 그림이 작게 줄어 있습니다)
    const showing = B.cur && (B.phase === 'answer' || B.phase === 'review');
    $('question').hidden = !showing;
    $('answers').hidden = !showing;
    // 문제를 푸는 동안에는 행동 버튼을 접어 문제와 답이 한 화면에 보이게 합니다.
    $('screenBattle').classList.toggle('answering', Boolean(showing));
    if (!showing) $('screenBattle').classList.remove('has-figure');
    const hint = $('hintBtn');
    hint.hidden = B.phase !== 'answer';
    $('nextBtn').hidden = B.phase !== 'review';
    // 답을 고른 순간부터 정답과 해설을 답 아래에 보여 줍니다. 맞혔을 때도 보여 줍니다.
    // (찍어서 맞힌 문제도 풀이를 보며 복습하도록. 틀렸을 때는 배우는 순간이라 가장 잘 보이는 자리에 둡니다)
    const missed = Boolean(showing) && B.picked >= 0;
    $('reviewBox').hidden = !missed;
    $('reviewBox').classList.toggle('right', missed && B.picked === B.cur.correct);
    if (missed) {
      $('reviewAnswer').textContent = t(B.picked === B.cur.correct ? 'ui.reviewRight' : 'ui.reviewAnswer', { answer: optionText(B.cur.options[B.cur.correct]) });
      // 풀이: 한 단계면 글 한 줄, 여러 단계면 번호 붙은 목록
      const steps = explainSteps(B.cur.raw);
      const box = $('reviewText');
      box.textContent = '';
      if (steps.length <= 1) box.textContent = steps[0] || '';
      else {
        const list = document.createElement('ol');
        list.className = 'steps';
        for (const line of steps) { const li = document.createElement('li'); li.textContent = line; list.appendChild(li); }
        box.appendChild(list);
      }
    }
    if (!showing) return;

    const run = getRun();
    hint.textContent = t('ui.hint', { n: run.hints });
    hint.disabled = run.hints <= 0 || B.cur.removed >= 0;

    $('qMeta').textContent = B.chain
      ? t('ui.chainStep', { n: B.chain.index + 1, total: B.chain.data.steps.length, type: typeName(B.cur.type) })
      : t('ui.level', { n: B.cur.level, type: typeName(B.cur.type) });
    const box = $('answers');
    fillQuestion({ text: $('qText'), figure: $('qFigure'), cap: $('qCap'), note: $('qNote'), answers: box }, B.cur);
    $('screenBattle').classList.toggle('has-figure', !$('qFigure').hidden);
    // 연속기: 공통 지문, 진행 표시, 이미 푼 물음의 요약을 문제 위에 보여 줍니다.
    $('qChain').hidden = !B.chain;
    if (B.chain) {
      const { data, index } = B.chain;
      $('qChainDots').textContent = data.steps.map((_, i) => (i < index ? '●' : i === index ? '◉' : '○')).join('');
      $('qChainIntro').textContent = data.intro();
      $('qChainDone').textContent = data.steps.slice(0, index).map((q, i) => stepSummary(q, i)).join('\n');
      $('qText').textContent = `(${index + 1}) ${questionText(B.cur.raw)}`;
    }
    const teach = tutorial.teach();
    box.innerHTML = '';
    box.classList.toggle('fill', Boolean(B.cur.fill));
    if (B.cur.fill) {
      renderFill(box);
      return;
    }
    B.cur.options.forEach((text, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = optionText(text);
      btn.disabled = B.phase !== 'answer' || i === B.cur.removed;
      if (i === B.cur.removed) btn.classList.add('gone');
      // 튜토리얼의 문제: 정답을 밝게 표시하고, 다른 답은 누를 수 없게 합니다.
      if (teach && B.phase === 'answer') {
        if (i === B.cur.correct) btn.classList.add('teach');
        else btn.disabled = true;
      }
      if (B.picked >= 0) {
        if (i === B.cur.correct) btn.classList.add('right');
        else if (i === B.picked) btn.classList.add('wrong');
      }
      btn.addEventListener('click', () => answer(i));
      box.appendChild(btn);
    });
  }

  // ---- 숫자 칸 채우기 (도전 6단계의 보스전) ----
  // 정답 글에서 숫자와 − 를 칸으로 바꿉니다. 예: "3√2/2" → [ ]√[ ]/[ ],  "x = −2, 5" → x = [ ][ ], [ ]
  // 칸이 없거나(말로 된 답) 너무 많으면 null 을 돌려주고, 그 문제는 평소처럼 보기에서 고릅니다.
  function makeFill(q) {
    const text = optionText(q.options[q.correct]);
    const parts = [...text].map((ch) => (/[0-9−-]/.test(ch) ? { want: ch === '-' ? '−' : ch, got: '', locked: false } : { text: ch }));
    const cells = parts.filter((part) => part.want);
    if (!cells.length || cells.length > 6 || /[가-힣ぁ-んァ-ヶ一-龠]/.test(text)) return null;
    return { parts, cells, at: 0 };
  }
  const fillOn = () => B.kind === 'boss' && (getRun().ascend || 0) >= CONFIG.ascend.fillLevel;

  function renderFill(box) {
    const F = B.cur.fill;
    const open = B.phase === 'answer';
    const row = document.createElement('div');
    row.className = 'fill-row';
    F.parts.forEach((part) => {
      if (!part.want) {
        const span = document.createElement('span');
        span.textContent = part.text;
        row.appendChild(span);
        return;
      }
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'fill-cell';
      cell.textContent = part.got;
      const index = F.cells.indexOf(part);
      if (open && index === F.at) cell.classList.add('on');
      if (part.locked) cell.classList.add('locked');
      if (!open && B.picked >= 0) cell.classList.add(part.got === part.want ? 'right' : 'wrong');
      cell.disabled = !open || part.locked;
      cell.addEventListener('click', () => {
        F.at = index;
        render();
      });
      row.appendChild(cell);
    });
    box.appendChild(row);
    if (!open) return;
    const pad = document.createElement('div');
    pad.className = 'fill-pad';
    for (const key of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '−', '⌫']) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fill-key';
      btn.dataset.key = key;
      btn.textContent = key;
      btn.addEventListener('click', () => typeFill(key));
      pad.appendChild(btn);
    }
    box.appendChild(pad);
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'primary fill-ok';
    ok.textContent = t('ui.fillOk');
    ok.disabled = F.cells.some((cell) => !cell.got);
    ok.addEventListener('click', () => {
      const right = F.cells.every((cell) => cell.got === cell.want);
      answer(right ? B.cur.correct : (B.cur.correct + 1) % B.cur.options.length);
    });
    box.appendChild(ok);
  }
  // 숫자판을 눌렀을 때: 지금 칸에 넣고 다음 빈 칸으로 갑니다. ⌫ 는 지금 칸(비어 있으면 앞 칸)을 지웁니다.
  function typeFill(key) {
    const F = B.cur.fill;
    if (B.phase !== 'answer' || !F) return;
    const free = (i) => F.cells[i] && !F.cells[i].locked;
    if (key === '⌫') {
      if (free(F.at) && F.cells[F.at].got) F.cells[F.at].got = '';
      else {
        let i = F.at - 1;
        while (i >= 0 && !free(i)) i -= 1;
        if (i >= 0) { F.cells[i].got = ''; F.at = i; }
      }
    } else if (free(F.at)) {
      F.cells[F.at].got = key;
      let i = F.at + 1;
      while (i < F.cells.length && (!free(i) || F.cells[i].got)) i += 1;
      if (i < F.cells.length) F.at = i;
    }
    render();
  }

  function render() {
    if (!B.foe) return;
    const run = getRun();
    let name = pick(B.foe.name);
    if (B.kind === 'elite') name = t('ui.elite', { name });
    if (B.kind === 'midboss') name = t('ui.midboss', { name });
    if (B.kind === 'boss') name = t('ui.boss', { name });
    $('foeName').textContent = name;
    $('foeWeak').textContent = t('ui.weak', { type: typeName(B.weak) });
    $('foeHpBar').style.width = `${Math.max(0, (B.foeHp / B.foeMax) * 100)}%`;
    $('foeHpGhost').style.width = $('foeHpBar').style.width; // 흰 줄이 조금 늦게 따라 줄어, 방금 깎인 만큼이 보입니다.
    $('foeHpText').textContent = `${Math.max(0, B.foeHp)} / ${B.foeMax}`;
    $('foeIntentText').textContent = t(B.intent === 'big' ? 'ui.intentBig' : 'ui.intentNormal', { d: intentDamage() });
    if ($('foeIntentIco').dataset.kind !== B.intent) {
      $('foeIntentIco').dataset.kind = B.intent;
      $('foeIntentIco').innerHTML = icon(B.intent === 'big' ? 'warn' : 'sword');
    }
    // 버튼마다 맞혔을 때의 피해를 적습니다.
    $('basicDmg').textContent = t('ui.dmg', { d: basicDmg() });
    $('skillDmg').textContent = t('ui.dmg', { d: skillDmg() });
    $('defendDmg').textContent = t('ui.counterDmg', { d: counterDmg() });
    $('foeIntent').classList.toggle('big', B.intent === 'big');
    // 강한 공격 턴에는 공격 버튼에도 "맞혀도 피해를 받는다"는 것을 적어 둡니다.
    // 맞히면 적이 쓰러지는 행동은 그렇게 적고 강조합니다. 쓰러뜨리면 적의 공격(강한 공격 포함)은 오지 않습니다.
    // 약점 보너스는 어떤 문제가 나올지 몰라 셈에 넣지 않습니다. (확실히 쓰러뜨리는 경우만 표시)
    const chainAll = CONFIG.damage.chain.reduce((sum, d, i) => sum + chainDmg(i), 0);
    const ends = { basic: basicDmg() >= B.foeHp, skill: skillDmg() >= B.foeHp, defend: counterDmg() >= B.foeHp, chain: !B.chainUsed && chainAll >= B.foeHp, ult: B.combo >= ultNeed() && ultDmg() >= B.foeHp }; // 쓸 수 없는 행동은 표시하지 않습니다
    const alive = B.foeHp > 0;
    $('basicSub').textContent = t(alive && ends.basic ? 'ui.finish' : B.intent === 'big' ? 'ui.attackBigSub' : 'ui.basicSub');
    $('skillSub').textContent = t(alive && ends.skill ? 'ui.finish' : B.intent === 'big' ? 'ui.attackBigSub' : 'ui.skillSub');
    for (const btn of document.querySelectorAll('#actions button, #chainBtn, #ultBtn')) btn.classList.toggle('finish', alive && B.phase === 'choose' && Boolean(ends[btn.dataset.action]));
    // 체력이 줄어든 순간: 체력 줄이 흔들리며 번쩍이고, 화면 가장자리가 붉어집니다.
    if (B.shownHp !== null && run.hp < B.shownHp) pulse($('meBox'), 'hurt');
    if (B.shownHp !== null && run.hp < B.shownHp) pulse($('screenBattle'), 'flash');
    if (B.shownFoeHp !== null && B.foeHp < B.shownFoeHp) pulse($('foeBar'), 'hurt');
    B.shownHp = run.hp;
    B.shownFoeHp = B.foeHp;
    $('meBox').classList.toggle('low', run.hp / run.maxHp <= 0.3);
    $('hpBar').style.width = `${Math.max(0, (run.hp / run.maxHp) * 100)}%`;
    $('hpGhost').style.width = $('hpBar').style.width;
    $('hpText').textContent = `${Math.max(0, run.hp)} / ${run.maxHp}`;
    $('comboText').textContent = t('ui.combo', { n: B.combo });

    const pips = $('ultPips');
    pips.innerHTML = '';
    for (let i = 0; i < ultNeed(); i++) {
      const pip = document.createElement('span');
      if (i < B.combo) pip.className = 'on';
      pips.appendChild(pip);
    }

    const choosing = B.phase === 'choose';
    const only = tutorial.only(); // 튜토리얼 중에는 안내한 버튼만 누를 수 있습니다.
    const cooling = B.lastAction === 'defend';
    document.querySelectorAll('#actions button').forEach((btn) => {
      const action = btn.dataset.action;
      btn.disabled = !choosing || (only && only !== action) || (action === 'defend' && cooling);
      btn.classList.toggle('picked', B.phase === 'answer' && B.cur && B.cur.action === action);
    });
    $('defendSub').textContent = t(cooling ? 'ui.defendWait' : alive && ends.defend ? 'ui.finishCounter' : 'ui.defendSub');

    // 연속기 버튼: 이번 범위에 풀 수 있는 묶음이 있을 때만 보입니다.
    const chainBtn = $('chainBtn');
    chainBtn.hidden = !hasChain(B.kind === 'boss');
    chainBtn.disabled = !choosing || Boolean(only) || B.chainUsed;
    $('chainSub').textContent = B.chainUsed ? t('ui.chainUsed') : alive && ends.chain ? t('ui.finishChain') : R('chainbelt') ? t('ui.chainSubN', { n: B.chainLeft }) : t('ui.chainSub');

    const ready = B.combo >= ultNeed();
    const ult = $('ultBtn');
    ult.disabled = !(choosing && ready) || Boolean(only);
    ult.classList.toggle('ready', ready);
    $('ultText').textContent = ready ? t('ui.ultReady') : t('ui.ultCharge', { n: B.combo, need: ultNeed() });
    $('ultSub').textContent = alive && ends.ult ? t('ui.finishUlt', { d: ultDmg() }) : t('ui.dmg', { d: ultDmg() });
    $('ultFill').style.width = `${Math.min(1, B.combo / ultNeed()) * 100}%`; // 연속 정답만큼 차오릅니다.

    $('notice').textContent = t(B.notice.key, B.notice.vars);
    renderQuestion();
    tutorial.setUltReady(ready && choosing);
    onChange();
    // 문제를 푸는 동안에는 위쪽 줄들을 줄여 문제에 자리를 내 줍니다. 그다음 화면 높이에 맞춥니다.
    document.body.classList.toggle('is-answering', $('screenBattle').classList.contains('answering'));
    // 연출이 나오는 동안(문제가 접혀 있고 누를 것이 없을 때)에는 싸우는 그림을 줄이지 않습니다 (fit.js).
    $('screenBattle').classList.toggle('finale', B.phase === 'busy' && !$('screenBattle').classList.contains('answering'));
    // 풀이를 보느라 내려 둔 화면은 다음 문제로 넘어갈 때 맨 위로 되돌립니다.
    if (wasReview && B.phase !== 'review') window.scrollTo(0, 0);
    wasReview = B.phase === 'review';
    fitBattle();
    if (wasReview) showReview();
  }

  // ---- 턴 진행 ----
  function planIntent() {
    B.turn += 1;
    B.intent = B.turn % (R('alarm') ? RC.alarm : CONFIG.foeAttack.bigEvery) === 0 ? 'big' : 'normal'; // 알람 시계: 강한 공격이 더 드물게
    if (B.intent === 'big') {
      stage.foeSpecial(); // 고유 동작으로 강한 공격을 예고
      play('warn');
    }
  }

  function backToChoose() {
    planIntent();
    B.phase = 'choose';
    B.chain = null;
    B.cur = null;
    B.picked = -1;
    render();
  }

  function choose(action) {
    if (B.phase !== 'choose') return;
    const only = tutorial.only();
    if (only && only !== action) return;

    if (action === 'ult') {
      if (B.combo < ultNeed()) return;
      B.combo = 0;
      B.lastAction = 'ult';
      B.phase = 'busy';
      const dmg = ultDmg();
      say('msg.ult', { d: dmg });
      play('ult');
      render();
      stage.heroUlt(`-${dmg}`, live(() => afterHit(dmg)));
      return;
    }

    if (action === 'chain') {
      if (B.chainUsed) return;
      const data = nextChain(B.kind === 'boss');
      if (!data) return;
      B.chainLeft -= 1;
      B.chainUsed = B.chainLeft <= 0;
      B.lastAction = 'chain';
      B.chain = { data, index: 0 };
      askStep();
      say('msg.solveChain');
      render();
      return;
    }

    if (action === 'defend' && B.lastAction === 'defend') return;
    B.lastAction = action;
    let level = CONFIG.guardLevel;
    if (action === 'basic') level = B.foe.basicLevel || 1;
    if (action === 'skill') level = B.foe.skillLevel || 2;
    B.cur = next(level);
    B.cur.action = action;
    B.cur.removed = -1;
    B.cur.fill = fillOn() ? makeFill(B.cur) : null;
    B.picked = -1;
    B.phase = 'answer';
    say(action === 'defend' ? 'msg.solveGuard' : 'msg.solve');
    tutorial.emit(`chose:${action}`);
    render();
  }

  // 연속기의 지금 물음을 문제로 올립니다.
  function askStep() {
    B.cur = B.chain.data.steps[B.chain.index];
    B.cur.fill = fillOn() ? makeFill(B.cur) : null;
    B.cur.action = 'chain';
    B.cur.removed = -1;
    B.picked = -1;
    B.phase = 'answer';
    setDebugLast(B.cur);
  }

  // 연속기의 물음 하나를 맞혔을 때: 피해를 주고, 남은 물음이 있으면 이어 갑니다.
  function chainHit(dmg) {
    play('hit');
    B.foeHp -= dmg;
    render();
    if (B.foeHp <= 0) {
      reviewThen(win);
    } else if (B.chain.index + 1 < B.chain.data.steps.length) {
      reviewThen(() => {
        B.chain.index += 1;
        askStep();
        render();
      });
    } else if (B.intent === 'big') {
      say('msg.bigHit', { d: intentDamage() });
      foeTurn(1);
    } else {
      reviewThen(backToChoose);
    }
  }

  // 힌트: 틀린 보기 하나를 지웁니다.
  function useHint() {
    const run = getRun();
    if (B.phase !== 'answer' || run.hints <= 0 || B.cur.removed >= 0) return;
    if (B.cur.fill) {
      // 칸 채우기에서는 힌트가 칸 하나를 알려 줍니다.
      const F = B.cur.fill;
      const target = F.cells.find((cell) => !cell.locked && cell.got !== cell.want) || F.cells.find((cell) => !cell.locked);
      if (!target) return;
      target.got = target.want;
      target.locked = true;
      const next = F.cells.findIndex((cell) => !cell.locked && !cell.got);
      if (next >= 0) F.at = next;
      B.cur.removed = 99; // 이 문제에서는 힌트를 썼다는 표시 (보기 번호가 아닙니다)
      run.hints -= 1;
      render();
      return;
    }
    const wrong = B.cur.options.map((_, i) => i).filter((i) => i !== B.cur.correct);
    B.cur.removed = wrong[Math.floor(Math.random() * wrong.length)];
    run.hints -= 1;
    render();
  }

  function answer(i) {
    if (B.phase !== 'answer' || i === B.cur.removed) return;
    const run = getRun();
    B.phase = 'busy';
    B.picked = i;
    const ok = i === B.cur.correct;
    const fresh = !mastered(B.cur.type); // 도서관 카드: 답하기 전에 아직 정복하지 못한 유형이었는지
    record(B.cur.type, ok);
    const soft = ok ? 1 : onWrong(); // 유물: 틀렸을 때 받는 피해의 비율
    if (ok) onRight(fresh);
    play(ok ? 'right' : 'wrong');
    tutorial.emit('answered');

    if (B.cur.action === 'defend') {
      if (ok) {
        // 완벽 방어: 피해 0, 반격, 연속 정답 +1
        B.combo = Math.min(ultNeed(), B.combo + 1);
        if (isHero(run, 'grit')) B.rel.guardUp = true; // 끈기 대장: 다음 정답이 세집니다
        say('msg.guardOk');
        render();
        foeTurn(0, counter);
      } else {
        B.combo = 0;
        say('msg.guardFail', { explain: explainBrief(B.cur.raw) });
        render();
        foeTurn(CONFIG.defendReduce * soft);
      }
      return;
    }

    if (B.cur.action === 'chain') {
      if (ok) {
        const last = B.chain.index + 1 === B.chain.data.steps.length;
        const weak = B.cur.type === B.weak;
        const dmg = Math.round(chainDmg(B.chain.index) * (weak ? weakMul() : 1)) + hitBonus();
        B.combo = Math.min(ultNeed(), B.combo + 1);
        say(last ? 'msg.chainDone' : 'msg.chainNext', { d: dmg });
        render();
        stage.heroAttack(`-${dmg}`, weak || last, live(() => chainHit(dmg)), weak ? t('ui.weakHit') : '');
      } else {
        // 틀리면 연속기는 거기서 끝납니다. 정답과 해설을 보여 주고 적의 공격을 받습니다.
        B.combo = 0;
        say('msg.wrong', { explain: explainBrief(B.cur.raw) });
        render();
        B.owed = Math.ceil(intentDamage() * soft); // 틀린 값은 이미 치른 것으로 적어 둡니다 (연출 중에 나가도 피해는 받습니다)
        stage.heroMiss(t('msg.miss'), live(() => foeTurn(soft)));
      }
      return;
    }

    if (ok) {
      const weak = B.cur.type === B.weak;
      const base = B.cur.action === 'skill' ? skillDmg() : basicDmg();
      const dmg = Math.round(base * (weak ? weakMul() : 1)) + hitBonus();
      B.combo = Math.min(ultNeed(), B.combo + 1);
      say(weak ? 'msg.correctWeak' : 'msg.correct', { d: dmg });
      render();
      stage.heroAttack(`-${dmg}`, weak, live(() => afterHit(dmg)), weak ? t('ui.weakHit') : '');
    } else {
      B.combo = 0;
      say('msg.wrong', { explain: explainBrief(B.cur.raw) });
      render();
      B.owed = Math.ceil(intentDamage() * soft);
      stage.heroMiss(t('msg.miss'), live(() => foeTurn(soft)));
    }
  }

  function afterHit(dmg) {
    play('hit');
    B.foeHp -= dmg;
    render();
    if (B.foeHp <= 0) {
      reviewThen(win);
    } else if (B.intent === 'big' || CONFIG.foeAttack.hitOnCorrect) {
      // 강한 공격은 방어로만 막을 수 있습니다. 맞혔는데 왜 맞았는지 알려 줍니다.
      if (B.intent === 'big') say('msg.bigHit', { d: intentDamage() });
      foeTurn(1);
    } else {
      reviewThen(backToChoose); // 공격 문제를 맞히면 적의 보통 공격은 오지 않습니다.
    }
  }

  // 맞힌 문제도 풀이를 읽을 시간을 줍니다: "다음" 을 눌러야 go 가 실행됩니다. (문제마다 한 번만. 틀린 문제는 foeTurn 이 따로 멈춥니다)
  function reviewThen(go) {
    if (B.cur && B.picked === B.cur.correct && !B.cur.reviewed) {
      B.cur.reviewed = true;
      B.after = go;
      B.phase = 'review';
      render();
      return;
    }
    go();
  }

  // 방어에 성공한 뒤의 반격
  function counter() {
    const dmg = counterDmg();
    stage.heroAttack(`-${dmg}`, false, live(() => {
      B.foeHp -= dmg;
      render();
      if (B.foeHp <= 0) reviewThen(win);
      else reviewThen(backToChoose);
    }));
  }

  // mult: 받는 피해 비율 (1 = 그대로, 0.5 = 방어 실패, 0 = 완벽 방어)
  function foeTurn(mult, then) {
    let dmg = Math.ceil(intentDamage() * mult);
    // 연승 리본: 쌓아 둔 막기가 있으면 이번 피해를 한 번 막습니다.
    if (dmg > 0 && B.rel.shield > 0) {
      B.rel.shield -= 1;
      dmg = 0;
      onRelic('ribbon', { used: true });
    }
    B.owed = dmg;
    stage.foeAttack(dmg > 0 ? `-${dmg}` : t('msg.blocked'), mult < 1, live(() => {
      const run = getRun();
      play(dmg > 0 ? 'hurt' : 'block');
      B.owed = 0;
      run.hp -= dmg;
      if (B.safe && run.hp < 1) run.hp = 1;
      // 반창고: 쓰러질 때 한 판에 한 번, 체력을 남기고 버팁니다.
      if (run.hp <= 0 && R('bandage') && !(run.spent && run.spent.bandage)) {
        run.spent = { ...(run.spent || {}), bandage: true };
        run.hp = RC.bandage;
        onRelic('bandage', { n: RC.bandage });
      }
      if (run.hp <= 0) {
        run.hp = 0;
        render();
        stage.heroDown();
        finish('lose');
      } else if (then) {
        then();
      } else if (B.cur && B.picked >= 0 && B.picked !== B.cur.correct) {
        // 틀린 문제는 정답과 해설을 읽을 시간을 줍니다. "다음" 을 눌러야 넘어갑니다.
        B.phase = 'review';
        render();
      } else {
        reviewThen(backToChoose);
      }
    }));
  }

  function win() {
    const big = B.kind === 'midboss' || B.kind === 'boss';
    // 문제와 답을 접어 싸우는 그림을 원래 크기로 되돌린 뒤에 쓰러지는 연출을 보여 줍니다.
    // (문제를 푸는 동안에는 그림이 작게 줄어 있어서, 그대로 두면 쓰러지는 모습과 터지는 효과가 잘립니다)
    B.phase = 'busy';
    B.chain = null;
    B.cur = null;
    B.picked = -1;
    render();
    pulse($('screenBattle'), 'koflash');
    stage.foeDefeat(live(() => finish('win')), t('ui.defeated'), big);
  }

  function finish(result) {
    play(result === 'win' ? 'win' : 'lose');
    B.phase = 'busy';
    document.body.classList.remove('is-answering');
    const done = B.onEnd;
    B.onEnd = null;
    if (done) done(result);
  }

  // 전투 시작. monster 는 monsters.json 의 항목입니다.
  // floor: 지도에서 몇 번째 층인지 (0 부터). 처음 몇 층의 보통 전투는 적의 체력이 낮습니다.
  function start({ monster, kind, weak, safe, floor = 99 }, onEnd) {
    B.gen += 1;
    $('screenBattle').classList.remove('finale');
    B.foe = monster;
    B.weak = weak;
    B.kind = kind;
    B.safe = Boolean(safe);
    const run = getRun();
    const level = run.ascend || 0;
    // 도전 단계: 1단계부터 모든 적, 5단계에서는 중간 보스와 보스의 체력이 더 늘어납니다.
    const tough = 1 + (level >= 1 ? CONFIG.ascend.foeHp : 0) + (level >= 5 && (kind === 'midboss' || kind === 'boss') ? CONFIG.ascend.bossHp : 0);
    const warmup = kind === 'battle' && floor < CONFIG.early.floors ? CONFIG.early.hpMul : 1;
    const later = 1 + CONFIG.act.hpAdd * (run.act || 0); // 긴 탑: 뒤의 막일수록 적이 조금 단단합니다
    B.foeMax = Math.round(monster.hp * (kind === 'elite' ? CONFIG.elite.hpMul : 1) * tough * warmup * later);
    // 재도전 선물 "약해진 적": 남은 횟수 동안 전투·강적의 체력이 1 입니다. (횟수는 이겼을 때 js/main.js 가 줄입니다)
    if (run.frail > 0 && (kind === 'battle' || kind === 'elite')) B.foeMax = 1;
    B.foeHp = B.foeMax;
    B.turn = 0;
    B.combo = R('bookmark') ? Math.min(ultNeed(), RC.bookmark) : 0; // 책갈피: 연속 정답 1 에서 시작
    B.lastAction = null;
    B.onEnd = onEnd;
    B.chain = null;
    B.chainUsed = false;
    B.chainLeft = R('chainbelt') ? RC.chainbelt.uses : 1;
    B.rel = { pencil: true, eraser: true, note: false, streak: 0, shield: 0, guardUp: false };
    B.owed = 0;
    B.shownHp = null;
    B.shownFoeHp = null;
    stage.setHero(run.hero || 'starter');
    stage.heroUp();
    stage.setFoe(monster.id);
    say('msg.choose');
    backToChoose();
  }

  // ---- 버튼 연결 ----
  document.querySelectorAll('#screenBattle [data-action]').forEach((btn) => {
    btn.addEventListener('click', () => choose(btn.dataset.action));
  });
  $('hintBtn').addEventListener('click', useHint);
  $('nextBtn').addEventListener('click', () => {
    if (B.phase !== 'review') return;
    // 풀이를 읽느라 화면이 아래로 내려가 있습니다. 이어지는 연출(적이 쓰러지는 모습, 다음 물음)이 보이도록 먼저 맨 위로 올립니다.
    window.scrollTo(0, 0);
    wasReview = false;
    const go = B.after; // 맞힌 문제의 풀이를 읽고 넘어갈 때 이어서 할 일
    B.after = null;
    if (go) go();
    else backToChoose();
  });

  // 전투 도중에 나갑니다. 남아 있던 연출의 뒷일은 모두 버립니다.
  function abort() {
    // 맞기 직전에 나가서 피해를 피하는 것을 막습니다. 받기로 되어 있던 피해는 받고 나갑니다. (체력은 1 아래로 내려가지 않습니다)
    if (B.owed > 0) {
      const run = getRun();
      run.hp = Math.max(1, run.hp - B.owed);
      B.owed = 0;
    }
    B.gen += 1;
    B.phase = 'busy';
    B.onEnd = null;
    B.chain = null;
    B.after = null;
    B.cur = null;
    B.after = null;
    B.picked = -1;
    render();
    document.body.classList.remove('is-answering');
  }

  return {
    start,
    abort,
    choosing: () => B.phase === 'choose',
    chainReady: () => B.phase === 'choose' && !B.chainUsed && hasChain(B.kind === 'boss'),
    refresh: render, // 언어를 바꾼 뒤 화면의 글을 다시 씁니다.
    relicState: () => ({ ...B.rel, chainLeft: B.chainLeft, fighting: B.phase !== 'busy' || Boolean(B.onEnd) }), // 가방 창이 "이번 전투: 사용함" 같은 상태를 적을 때 봅니다
  };
}
