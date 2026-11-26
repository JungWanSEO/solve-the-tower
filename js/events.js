// 전투가 아닌 칸과 결과 화면: 보상, 상점, 휴식, 보물, 패배, 단원 클리어.
// 모두 같은 화면(#screenEvent)을 씁니다. 제목, 설명, 고를 것 목록, 나가기 버튼으로 이루어집니다.
import { CONFIG } from './config.js';
import { t } from './i18n.js';
import { next, nextByType, explainText, explainBrief, typeLabel, optionText } from './questions.js';
import { fillQuestion } from './qview.js';
import { UPGRADES, SHOP, rollUpgrades } from './run.js';
import { RELICS, has, gainRelic, loseRelic, sameRarityLeft, rollRelics, relicVars, relicPrice } from './relics.js';
import { $, twoLineButton, toast, fillRelicText } from './ui.js';
import { play } from './sound.js';
import { scene, hasScene, icon, heroPortrait, currentHeroLook } from './art.js';
import { HERO_IDS, unlockedHeroes, heroVars, ultVars } from './heroes.js';

// 화면 제목으로 위쪽 장면 그림을 고릅니다. (? 칸은 mystery.<사건>.title 의 사건 이름이 곧 그림 이름)
const ART = { 'bless.title': 'bless', 'ev.rewardTitle': 'reward', 'ev.shopTitle': 'shop', 'ev.restTitle': 'rest', 'ev.treasureTitle': 'treasure', 'relic.chooseTitle': 'treasure', 'hero.gainedTitle': 'clear', 'ev.overTitle': 'over', 'ev.clearTitle': 'clear' };
const artOf = (titleKey) => ART[titleKey] || (titleKey.split('.')[0] === 'mystery' ? titleKey.split('.')[1] : '');

export function createEvents({ getRun, data, record, onChange, persist = () => {} }) {
  let draw = null; // 지금 화면을 다시 그리는 함수 (언어를 바꿀 때 씁니다)

  function open(fn) {
    draw = fn;
    redraw();
  }
  function redraw() {
    if (!draw) return;
    draw();
    onChange();
  }

  // 무엇을 얻었는지 잠깐 알려 줍니다. 예: "단단한 줄자 · 기본 공격 피해 +1"
  const gained = (key, ico) => toast(`${t(`${key}.name`)} · ${t(`${key}.desc`)}`, icon(ico));

  // ---- 유물 ----
  const relicName = (id) => t(`relic.${id}.name`);
  const relicText = (id) => t(`relic.${id}.text`, relicVars(id));
  // 유물을 얻습니다: 이번 판의 유물 목록에 넣고, 도감용 기록(data.relics)에 남기고, 처음이면 안내를 띄웁니다.
  function takeRelic(id) {
    if (!gainRelic(getRun(), id)) return false;
    if (!data.relics) data.relics = {};
    data.relics[id] = true;
    tip('relic');
    return true;
  }
  // 방금 만든 선택 버튼을 유물 버튼으로 꾸밉니다 (등급 색, 불이익 줄의 색)
  function markPick(id) {
    const btn = $('evOptions').lastChild;
    btn.classList.add('relic-pick', `rarity-${RELICS[id].rarity}`);
    fillRelicText(btn.querySelector('small'), relicText(id));
  }
  // 방금 얻은 유물을 보여 주는 카드 (누르는 것이 아니라 읽는 것)
  function relicCard(id) {
    const card = document.createElement('div');
    card.className = `relic-card rarity-${RELICS[id].rarity}`;
    card.innerHTML = `<i class="ico">${icon(`r-${id}`)}</i><span class="relic-got"></span><b></b><em></em><small></small>`;
    card.querySelector('.relic-got').textContent = t('relic.got');
    card.querySelector('b').textContent = relicName(id);
    card.querySelector('em').textContent = t(`relic.rarity.${RELICS[id].rarity}`);
    fillRelicText(card.querySelector('small'), relicText(id));
    $('evOptions').appendChild(card);
    showTip('relic');
  }

  // ---- 진보스의 열쇠 ----
  // 지금 이 열쇠를 내놓을 수 있는지: 탑을 한 번 깬 뒤부터, 튜토리얼이 끝난 뒤, 아직 그 열쇠가 없을 때
  const keyOffer = (kind) => CONFIG.trueBoss.on && (data.clears || 0) >= CONFIG.trueBoss.clears && data.tut === 'done' && !(getRun().keys && getRun().keys[kind]);
  function takeKey(kind) {
    const run = getRun();
    run.keys = { ...(run.keys || {}), [kind]: true };
    play('right');
    toast(t('key.gotOne', { name: t(`key.${kind}.name`) }), icon('key'));
    persist();
  }
  const keyOption = (kind, onDone) => option(t(`key.${kind}.take`), t(`key.${kind}.sub`), false, () => {
    takeKey(kind);
    onDone();
  }, 'key');
  // 유물 1개와 열쇠 중 하나를 고릅니다 (강적, 보물 상자). 받지 않고 넘어갈 수는 없습니다.
  function relicOrKey(done) {
    const run = getRun();
    const [offer = ''] = rollRelics(run, 1);
    let result = ''; // 고른 뒤: 유물 id 또는 'key'
    open(() => {
      if (result) {
        base('key.orTitle', result === 'key' ? t('key.gotOne', { name: t('key.relic.name') }) : '');
        if (result !== 'key') relicCard(result);
        leave('ev.continue', done);
        return;
      }
      base('key.orTitle', t('key.orText'));
      if (offer) {
        option(relicName(offer), relicText(offer), false, () => {
          takeRelic(offer);
          result = offer;
          play('right');
          persist();
          redraw();
        }, `r-${offer}`, t(`relic.rarity.${RELICS[offer].rarity}`));
        markPick(offer);
      }
      keyOption('relic', () => {
        result = 'key';
        redraw();
      });
    });
  }

  // ---- 모습(직업) ----
  // 모습 하나를 보여 주는 카드. onPick 이 있으면 누르는 버튼, 없으면 읽는 카드입니다. locked: 아직 얻지 못한 모습
  function heroCard(id, { onPick = null, locked = false, current = false } = {}) {
    const vars = heroVars(id);
    const card = document.createElement(onPick ? 'button' : 'div');
    if (onPick) card.type = 'button';
    card.className = `hero-card hero-${id}${locked ? ' locked' : ''}${current ? ' current' : ''}`;
    card.innerHTML = `<i class="hero-face">${heroPortrait(id, locked)}</i><b></b><em></em><small class="hero-role"></small><small class="hero-ability"></small><small class="hero-ult"></small><small class="hero-start"></small>`;
    card.querySelector('b').textContent = locked ? t('codex.unseen') : t(`hero.${id}.name`);
    card.querySelector('em').textContent = locked ? '' : t('hero.hp', vars);
    card.querySelector('em').hidden = locked;
    card.querySelector('.hero-role').textContent = locked ? t('hero.locked', vars) : t(`hero.${id}.role`);
    card.querySelector('.hero-ability').textContent = locked ? '' : t(`hero.${id}.ability`, vars);
    card.querySelector('.hero-ult').textContent = locked ? '' : t('hero.ultLine', { name: t(`hero.${id}.ult`), desc: t(`hero.${id}.ultSub`, ultVars(id)) });
    card.querySelector('.hero-start').textContent = locked ? '' : t('hero.start', { name: `${relicName(CONFIG.hero[id].relic)} (${relicText(CONFIG.hero[id].relic).split('\n')[0]})` });
    if (onPick) {
      card.disabled = locked;
      card.addEventListener('click', () => onPick(id));
    }
    $('evOptions').appendChild(card);
  }

  // ---- 화면 조각 ----
  function base(titleKey, text) {
    $('evTitle').textContent = t(titleKey);
    $('evText').textContent = text;
    const art = artOf(titleKey);
    const box = $('evArt');
    box.hidden = !hasScene(art);
    const key = `${art}:${currentHeroLook()}`; // 장면 그림 속 주인공은 지금 모습으로 그립니다
    if (box.dataset.art !== key) { // 같은 그림이면 다시 그리지 않아 움직임이 끊기지 않습니다.
      box.dataset.art = key;
      box.innerHTML = scene(art);
    }
    $('evQuiz').hidden = true;
    $('evTip').hidden = true;
    $('evOptions').innerHTML = '';
    $('evLeave').hidden = true;
  }
  // ico: 왼쪽에 붙일 그림 이름, price: 오른쪽에 붙일 값 (예: "30G")
  function option(title, sub, disabled, onClick, ico = '', price = '') {
    const btn = twoLineButton(title, sub);
    if (ico) {
      btn.classList.add('with-ico');
      const mark = document.createElement('i');
      mark.className = `ico ico-${ico}`;
      mark.innerHTML = icon(ico);
      btn.prepend(mark);
    }
    if (price) {
      const tag = document.createElement('em');
      tag.textContent = price;
      btn.appendChild(tag);
    }
    btn.disabled = disabled;
    btn.addEventListener('click', onClick);
    $('evOptions').appendChild(btn);
  }
  // 처음 들어온 칸에는 그 칸이 무엇인지 한 번만 알려 줍니다. (다 본 것은 기록의 tips 에 적습니다)
  function tip(kind) {
    if (!data.tips) data.tips = {};
    if (data.tips[kind] === true) return;
    data.tips[kind] = 'showing'; // 이 화면을 나갈 때까지 계속 보여 줍니다
  }
  function showTip(kind) {
    if (!data.tips || data.tips[kind] !== 'showing') return;
    $('evTip').hidden = false;
    $('evTipText').textContent = t(`tip.${kind}`);
  }
  function closeTips() {
    for (const kind of Object.keys(data.tips || {})) if (data.tips[kind] === 'showing') data.tips[kind] = true;
  }
  function leave(labelKey, onClick) {
    const btn = $('evLeave');
    btn.hidden = false;
    btn.textContent = t(labelKey);
    btn.onclick = () => {
      draw = null;
      closeTips();
      onClick();
    };
  }
  function drawQuiz(state, onPick) {
    $('evQuiz').hidden = false;
    $('evQMeta').textContent = t('ui.level', { n: state.q.level, type: typeLabel(state.q.type) });
    const box = $('evAnswers');
    fillQuestion({ text: $('evQText'), figure: $('evQFigure'), cap: $('evQCap'), note: $('evQNote'), answers: box }, state.q);
    box.innerHTML = '';
    state.q.options.forEach((text, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = optionText(text);
      btn.disabled = state.picked >= 0;
      if (state.picked >= 0) {
        if (i === state.q.correct) btn.classList.add('right');
        else if (i === state.picked) btn.classList.add('wrong');
      }
      btn.addEventListener('click', () => onPick(i));
      box.appendChild(btn);
    });
  }

  // 문제 하나를 풀고 결과를 보여주는 화면.
  // onResult(ok, q) 는 보상을 한 번 적용하고, "결과 문장을 만드는 함수"를 돌려줍니다.
  // after(): 답을 고른 뒤 화면 아래에 더 그릴 것 (예: 얻은 유물 카드)
  function quizScreen({ titleKey, intro, question, onResult, done, tipKind = '', after = null }) {
    const state = { q: question, picked: -1, result: null };
    open(() => {
      base(titleKey, state.picked < 0 ? intro() : state.result());
      if (tipKind && state.picked < 0) showTip(tipKind);
      drawQuiz(state, (i) => {
        if (state.picked >= 0) return;
        state.picked = i;
        const ok = i === state.q.correct;
        record(state.q.type, ok);
        play(ok ? 'right' : 'wrong');
        state.result = onResult(ok, state.q);
        persist(); // 결과 화면에서 앱을 닫아도 얻은 것이 남게 바로 저장합니다
        redraw();
      });
      if (state.picked >= 0 && after) after();
      if (state.picked >= 0) leave('ev.continue', done);
    });
  }

  // 가장 자주 틀린 유형의 문제를 고릅니다. 틀린 적이 없으면 쉬운 문제를 냅니다.
  function reviewQuestion() {
    const scope = getRun().scope;
    const missed = Object.entries(data.codex)
      .filter(([key, entry]) => scope.includes(key) && entry.wrong > 0 && (entry.streak || 0) < CONFIG.codexStreak)
      .sort((a, b) => b[1].wrong - a[1].wrong);
    if (missed.length) {
      const q = nextByType(missed[0][0]);
      if (q) return q;
    }
    return next(1);
  }

  return {
    refresh: redraw,

    // 전투 승리: 골드를 받고 강화 셋 중 하나를 고릅니다.
    // relic: 이 전투에서 유물도 나오는지 (강적). 줄 유물이 남아 있지 않으면 골드를 대신 받습니다.
    reward(gold, done, relic = false) {
      const picks = rollUpgrades(3);
      let got = '';
      let extra = 0;
      const pickKey = relic && keyOffer('relic'); // 열쇠를 고를 수 있으면 유물을 바로 주지 않고, 강화를 고른 뒤에 유물과 열쇠 중 하나를 묻습니다
      if (relic && !pickKey) {
        [got = ''] = rollRelics(getRun(), 1);
        if (got) takeRelic(got);
        else if (CONFIG.relic.drops) {
          extra = CONFIG.relic.emptyGold;
          getRun().gold += extra;
        }
        persist();
      }
      open(() => {
        base('ev.rewardTitle', got ? t('ev.rewardTextRelic', { gold }) : `${t('ev.rewardText', { gold })}${extra ? ` ${t('relic.none', { gold: extra })}` : ''}`);
        if (got) {
          relicCard(got);
          // 유물은 이미 받았고, 아래는 따로 고르는 강화라는 것을 알려 줍니다 (유물 카드를 눌러야 하는 줄 아는 일이 있었습니다)
          const label = document.createElement('p');
          label.className = 'pick-label';
          label.textContent = t('ev.rewardPick');
          $('evOptions').appendChild(label);
        }
        picks.forEach((id) => {
          option(t(`up.${id}.name`), t(`up.${id}.desc`), false, () => {
            UPGRADES[id](getRun());
            gained(`up.${id}`, id);
            draw = null;
            if (pickKey) relicOrKey(done);
            else done();
          }, id);
        });
      });
    },

    // 새 판을 시작할 때 모습 고르기. 얻은 모습만 고를 수 있고, 아직 얻지 못한 모습은 그림자와 얻는 조건이 보입니다.
    heroChoice(onPick) {
      const mine = unlockedHeroes(data);
      open(() => {
        base('hero.pickTitle', t('hero.pickText'));
        for (const id of HERO_IDS) {
          heroCard(id, { locked: !mine.includes(id), current: id === data.hero, onPick: (picked) => {
            draw = null;
            onPick(picked);
          } });
        }
      });
    },

    // 탑을 깨서 새 모습을 얻었을 때: 그림, 이름, 성장 이야기, 능력, 시작 유물을 보여 줍니다.
    heroGained(id, done) {
      open(() => {
        base('hero.gainedTitle', `${t(`hero.${id}.story`)}\n${t('hero.gainedText')}`);
        heroCard(id);
        $('evOptions').lastChild.classList.add('gained');
        leave('ev.continue', done);
      });
    },

    // 유물 3개 중 1개 고르기 (중간 보스를 이겼을 때, 긴 탑에서 막을 넘어갈 때). 받지 않아도 됩니다.
    // 줄 유물이 하나도 없으면 골드를 대신 주고 바로 넘어갑니다.
    relicChoice(done, withKey = false) {
      const run = getRun();
      const picks = rollRelics(run, 3, 'big');
      if (!CONFIG.relic.drops) {
        done();
        return;
      }
      if (!picks.length && !(withKey && keyOffer('win'))) {
        run.gold += CONFIG.relic.emptyGold;
        toast(t('relic.none', { gold: CONFIG.relic.emptyGold }), icon('coin'));
        done();
        return;
      }
      let taken = '';
      open(() => {
        if (taken) {
          base('relic.chooseTitle', '');
          relicCard(taken);
          leave('ev.continue', done);
          return;
        }
        base('relic.chooseTitle', t('relic.chooseText'));
        picks.forEach((id) => {
          option(relicName(id), relicText(id), false, () => {
            takeRelic(id);
            taken = id;
            play('right');
            persist();
            redraw();
          }, `r-${id}`, t(`relic.rarity.${RELICS[id].rarity}`));
          markPick(id);
        });
        // 중간 보스에서는 유물 대신 "승리의 열쇠"를 고를 수도 있습니다.
        if (withKey && keyOffer('win')) keyOption('win', () => {
          draw = null;
          done();
        });
        leave('relic.skip', done);
      });
    },

    // 상점: 골드로 강화를 삽니다. 여러 개 살 수 있습니다. 유물도 한 칸 팝니다.
    // node: 지도의 그 칸. 어떤 유물을 파는지 칸에 적어 두어, 나갔다 들어와도 같은 유물이 나옵니다.
    shop(done, node = {}) {
      tip('shop');
      if (node.relic === undefined) {
        [node.relic = ''] = rollRelics(getRun(), 1);
        persist();
      }
      open(() => {
        const run = getRun();
        base('ev.shopTitle', t('ev.shopText', { gold: run.gold }));
        showTip('shop');
        if (node.relic && !has(run, node.relic)) {
          const id = node.relic;
          const price = relicPrice(id);
          option(relicName(id), relicText(id), run.gold < price, () => {
            if (run.gold < price) return;
            run.gold -= price;
            takeRelic(id);
            play('right');
            toast(`${relicName(id)} · ${t('relic.got')}`, icon(`r-${id}`));
            persist();
            redraw();
          }, `r-${id}`, `${price}G`);
          markPick(id);
        }
        SHOP.forEach(({ id, price }) => {
          option(t(`up.${id}.name`), t(`up.${id}.desc`), run.gold < price, () => {
            if (run.gold < price) return;
            run.gold -= price;
            UPGRADES[id](run);
            play('right');
            gained(`up.${id}`, id);
            redraw();
          }, id, `${price}G`);
        });
        leave('ev.leave', done);
      });
    },

    // 휴식: 쉬어서 체력을 회복하거나, 틀렸던 유형을 복습합니다.
    // node: 지도의 그 칸. 이미 쉬었거나 복습을 시작한 칸은 다시 들어와도 한 번 더 할 수 없습니다.
    rest(done, node = {}) {
      const run = getRun();
      const heal = Math.ceil(run.maxHp * CONFIG.rest.healRatio) + (has(run, 'bottle') ? CONFIG.relic.bottle : 0); // 물통: 쉴 때 더 회복
      let slept = false;
      let keyTaken = false;
      tip('rest');
      if (node.used) {
        open(() => {
          base('ev.restTitle', t('ev.restUsed'));
          leave('ev.continue', done);
        });
        return;
      }
      const menu = () => {
        if (slept) {
          base('ev.restTitle', t('ev.restSlept', { n: heal }));
          leave('ev.continue', done);
          return;
        }
        if (keyTaken) {
          base('ev.restTitle', t('key.rest.got'));
          leave('ev.continue', done);
          return;
        }
        base('ev.restTitle', t('ev.restText'));
        showTip('rest');
        option(t('ev.restSleep'), t('ev.restSleepSub', { n: heal }), false, () => {
          run.hp = Math.min(run.maxHp, run.hp + heal);
          slept = true;
          node.used = true;
          persist();
          redraw();
        }, 'heal');
        option(t('ev.restReview'), t('ev.restReviewSub'), false, () => {
          node.used = true;
          persist();
          quizScreen({
            titleKey: 'ev.restTitle',
            intro: () => t('ev.reviewText', { n: CONFIG.rest.reviewHeal }),
            question: reviewQuestion(),
            onResult(ok, q) {
              if (ok) {
                run.hints += 1;
                run.hp = Math.min(run.maxHp, run.hp + CONFIG.rest.reviewHeal);
                return () => t('ev.reviewOk', { n: CONFIG.rest.reviewHeal });
              }
              return () => t('ev.reviewFail', { explain: explainBrief(q.raw) });
            },
            done,
          });
        }, 'book');
        // 쉬는 대신 "쉼의 열쇠"를 받을 수도 있습니다.
        if (keyOffer('rest')) keyOption('rest', () => {
          node.used = true;
          keyTaken = true;
          persist();
          redraw();
        });
      };
      open(menu);
    },

    // 보물: 문제를 맞히면 상자가 열립니다.
    // 문제를 본 뒤에 나갔다가 다시 들어와 문제를 바꾸는 것을 막습니다. 한 번 본 상자는 잠깁니다.
    treasure(done, node = {}) {
      const run = getRun();
      tip('treasure');
      if (node.used) {
        open(() => {
          base('ev.treasureTitle', t('ev.treasureUsed'));
          leave('ev.continue', done);
        });
        return;
      }
      node.used = true;
      persist();
      let got = ''; // 상자에서 나온 유물
      let choose = false; // 유물과 열쇠 중 하나를 고르는 화면으로 넘어갈지
      const openChest = () => {
        [got = ''] = rollRelics(run, 1);
        if (got) takeRelic(got);
      };
      quizScreen({
        tipKind: 'treasure',
        titleKey: 'ev.treasureTitle',
        intro: () => t('ev.treasureText'),
        question: next(2),
        onResult(ok, q) {
          if (ok && keyOffer('relic')) {
            // 열쇠를 고를 수 있으면: 골드만 먼저 받고, 다음 화면에서 유물과 열쇠 중 하나를 고릅니다.
            run.gold += CONFIG.gold.treasureWin;
            choose = true;
            return () => `${t('ev.treasureOkGold', { gold: CONFIG.gold.treasureWin })} ${t('key.orText')}`;
          }
          if (ok) {
            run.gold += CONFIG.gold.treasureWin;
            openChest();
            // 맞히면 유물이 나옵니다. 줄 유물이 남아 있지 않으면 예전처럼 힌트를 받습니다.
            if (got) return () => t('ev.treasureOkRelic', { gold: CONFIG.gold.treasureWin });
            run.hints += 1;
            return () => t('ev.treasureOk', { gold: CONFIG.gold.treasureWin });
          }
          run.gold += CONFIG.gold.treasureLose;
          if (CONFIG.relic.treasureOnWrong) openChest(); // 틀려도 유물을 줄지는 설정으로 정합니다 (밸런스 비교용)
          return () => t('ev.treasureFail', { gold: CONFIG.gold.treasureLose, explain: explainBrief(q.raw) });
        },
        after: () => { if (got) relicCard(got); },
        done: () => (choose ? relicOrKey(done) : done()),
      });
    },

    // ? 칸: 무슨 일이 생길지 모릅니다. 좋은 일, 나쁜 일, 선택, 기습 중 하나가 나옵니다. (12종 + 기습)
    //   바로 일어나는 일: spring 샘물 · fog 안개 · purse 지갑 · thief 소매치기 · note 쪽지 · weaknote 약점 쪽지
    //   문제를 푸는 일  : statue 석상 · board 낡은 칠판 · bet 내기꾼
    //   골라서 얻는 일  : dojo 수련장 · peddler 떠돌이 상인 · locker 잊힌 사물함 · bench 벤치
    //   ambush 기습     : 전투가 시작됩니다. ambush 는 그 전투를 시작하는 함수입니다.
    // 숫자와 나오는 비중은 CONFIG.mystery 에, 글은 lang 파일의 mystery.<사건> 에 있습니다.
    // 한 번 정해진 사건은 칸(node)에 적어 둡니다. 나갔다가 다시 들어와도 같은 사건이 나오고, 이미 고른 일은 다시 고를 수 없습니다.
    mystery(node, done, ambush) {
      const run = getRun();
      const M = CONFIG.mystery;
      const mine = Array.isArray(run.relics) ? run.relics : [];
      // 내놓을 수 있는 유물: 같은 등급의 다른 유물이 아직 남아 있는 것
      const swappable = () => mine.filter((id) => RELICS[id] && sameRarityLeft(run, RELICS[id].rarity).length);
      // 지금 낼 수 있는 사건만 고릅니다 (골드나 체력이 모자라 아무것도 못 하는 사건은 나오지 않습니다)
      const can = {
        bet: () => run.gold >= M.bet,
        dojo: () => run.hp > M.dojoCost,
        peddler: () => run.gold >= M.peddler && sameRarityLeft(run, 'common').length > 0,
        locker: () => swappable().length > 0,
      };
      const kinds = ['spring', 'fog', 'purse', 'thief', 'note', 'statue', 'ambush', 'board', 'bet', 'dojo', 'peddler', 'locker', 'bench', 'weaknote'];
      if (!kinds.includes(node.mystery)) {
        const pool = kinds.filter((id) => !can[id] || can[id]());
        let roll = Math.random() * pool.reduce((sum, id) => sum + (M.weights[id] || 1), 0);
        node.mystery = pool.find((id) => (roll -= M.weights[id] || 1) < 0) || pool[0];
        persist();
      }
      const kind = node.mystery;
      const title = `mystery.${kind}.title`;
      tip('event');

      if (kind === 'ambush') {
        open(() => {
          base('mystery.ambush.title', t('mystery.ambush.text'));
          showTip('event');
          leave('mystery.ambush.go', ambush);
        });
        return;
      }

      if (kind === 'statue') {
        // 선택: 문제에 도전하면 강화를 얻지만, 틀리면 체력을 잃습니다.
        open(() => {
          base('mystery.statue.title', t('mystery.statue.text', { n: M.statueLoss }));
          showTip('event');
          option(t('mystery.statue.try'), t('mystery.statue.trySub', { n: M.statueLoss }), Boolean(node.used), () => {
            node.used = true; // 문제를 본 뒤 나갔다가 다시 와도 한 번 더 도전할 수 없습니다
            persist();
            quizScreen({
              titleKey: 'mystery.statue.title',
              intro: () => t('mystery.statue.quiz'),
              question: next(2),
              onResult(ok, q) {
                if (ok) {
                  const id = rollUpgrades(1)[0];
                  UPGRADES[id](run);
                  return () => t('mystery.statue.ok', { name: t(`up.${id}.name`), desc: t(`up.${id}.desc`) });
                }
                run.hp = Math.max(1, run.hp - M.statueLoss);
                return () => t('mystery.statue.fail', { n: M.statueLoss, explain: explainBrief(q.raw) });
              },
              done,
            });
          });
          leave('mystery.statue.skip', done);
        });
        return;
      }

      // ---- 골라서 하는 사건들 ----
      // menu(): 고를 것을 그립니다. 고른 뒤에는 settle(결과 글, 얻은 유물)로 결과 화면이 됩니다.
      let after = null;
      const settle = (text, relic = '') => {
        node.used = true;
        after = { text, relic };
        persist();
        redraw();
      };
      const choose = (menu) => open(() => {
        if (after || node.used) {
          base(title, after ? after.text() : t('mystery.done'));
          if (after && after.relic) relicCard(after.relic);
          leave('ev.continue', done);
          return;
        }
        menu();
        showTip('event');
      });

      if (kind === 'board') {
        // 낡은 칠판: 문제를 맞히면 힌트를 얻습니다. 틀려도 잃는 것은 없습니다.
        choose(() => {
          base(title, t('mystery.board.text', { n: M.boardHints }));
          option(t('mystery.board.try'), t('mystery.board.trySub', { n: M.boardHints }), false, () => {
            node.used = true;
            persist();
            quizScreen({
              titleKey: title,
              intro: () => t('mystery.board.quiz'),
              question: next(2),
              onResult(ok, q) {
                if (ok) {
                  run.hints += M.boardHints;
                  return () => t('mystery.board.ok', { n: M.boardHints });
                }
                return () => t('mystery.board.fail', { explain: explainBrief(q.raw) });
              },
              done,
            });
          }, 'hint');
          leave('mystery.skip', done);
        });
        return;
      }

      if (kind === 'bet') {
        // 내기꾼: 골드를 걸고 문제를 풉니다. 건 골드는 문제를 보기 전에 냅니다 (문제를 보고 나가서 물리는 것을 막습니다).
        choose(() => {
          base(title, t('mystery.bet.text', { n: M.bet, win: M.betWin }));
          option(t('mystery.bet.try', { n: M.bet }), t('mystery.bet.trySub', { n: M.bet, win: M.betWin }), run.gold < M.bet, () => {
            if (run.gold < M.bet) return;
            run.gold -= M.bet;
            node.used = true;
            persist();
            quizScreen({
              titleKey: title,
              intro: () => t('mystery.bet.quiz'),
              question: next(2),
              onResult(ok, q) {
                if (ok) {
                  run.gold += M.bet + M.betWin;
                  return () => t('mystery.bet.ok', { n: M.bet, win: M.betWin });
                }
                return () => t('mystery.bet.fail', { n: M.bet, explain: explainBrief(q.raw) });
              },
              done,
            });
          }, 'coin');
          leave('mystery.skip', done);
        });
        return;
      }

      if (kind === 'dojo') {
        // 수련장: 체력을 내고 강화 셋 중 하나를 고릅니다.
        if (!Array.isArray(node.picks)) {
          node.picks = rollUpgrades(3);
          persist();
        }
        choose(() => {
          base(title, t('mystery.dojo.text', { n: M.dojoCost }));
          node.picks.filter((id) => UPGRADES[id]).forEach((id) => {
            option(t(`up.${id}.name`), t(`up.${id}.desc`), run.hp <= M.dojoCost, () => {
              if (run.hp <= M.dojoCost) return;
              run.hp -= M.dojoCost;
              UPGRADES[id](run);
              play('right');
              settle(() => t('mystery.dojo.ok', { n: M.dojoCost, name: t(`up.${id}.name`), desc: t(`up.${id}.desc`) }));
            }, id, t('mystery.dojo.cost', { n: M.dojoCost }));
          });
          leave('mystery.skip', done);
        });
        return;
      }

      if (kind === 'peddler') {
        // 떠돌이 상인: 흔한 유물 하나를 상점보다 싸게 팝니다.
        if (node.relic === undefined) {
          const left = sameRarityLeft(run, 'common');
          node.relic = left.length ? left[Math.floor(Math.random() * left.length)] : '';
          persist();
        }
        choose(() => {
          const id = node.relic;
          base(title, t(id && !has(run, id) ? 'mystery.peddler.text' : 'mystery.peddler.empty', { n: M.peddler, gold: run.gold }));
          if (id && !has(run, id)) {
            option(relicName(id), relicText(id), run.gold < M.peddler, () => {
              if (run.gold < M.peddler) return;
              run.gold -= M.peddler;
              takeRelic(id);
              play('right');
              settle(() => t('mystery.peddler.ok', { n: M.peddler }), id);
            }, `r-${id}`, `${M.peddler}G`);
            markPick(id);
          }
          leave('mystery.skip', done);
        });
        return;
      }

      if (kind === 'locker') {
        // 잊힌 사물함: 가진 유물 하나를 넣으면 같은 등급의 다른 유물이 나옵니다. 무엇이 나올지는 모릅니다.
        choose(() => {
          const list = swappable();
          base(title, t(list.length ? 'mystery.locker.text' : 'mystery.locker.empty'));
          list.forEach((id) => {
            option(relicName(id), relicText(id), false, () => {
              const left = sameRarityLeft(run, RELICS[id].rarity, [id]);
              if (!left.length) return;
              const got = left[Math.floor(Math.random() * left.length)];
              loseRelic(run, id);
              takeRelic(got);
              play('right');
              settle(() => t('mystery.locker.ok', { old: relicName(id) }), got);
            }, `r-${id}`, t(`relic.rarity.${RELICS[id].rarity}`));
            markPick(id);
          });
          leave('mystery.skip', done);
        });
        return;
      }

      if (kind === 'bench') {
        // 쉬어 가는 벤치: 지금 회복할지, 최대 체력을 늘릴지 고릅니다.
        choose(() => {
          base(title, t('mystery.bench.text'));
          option(t('mystery.bench.heal'), t('mystery.bench.healSub', { n: M.benchHeal }), false, () => {
            const before = run.hp;
            run.hp = Math.min(run.maxHp, run.hp + M.benchHeal);
            const n = run.hp - before;
            settle(() => t('mystery.bench.healOk', { n }));
          }, 'heal');
          option(t('mystery.bench.max'), t('mystery.bench.maxSub', { n: M.benchMax }), false, () => {
            run.maxHp += M.benchMax;
            run.hp += M.benchMax;
            settle(() => t('mystery.bench.maxOk', { n: M.benchMax }));
          }, 'maxhp');
        });
        return;
      }

      // 바로 일어나는 일: 효과를 한 번만 적용하고 결과를 보여줍니다.
      let n = 1;
      if (typeof node.mysteryN === 'number') {
        n = node.mysteryN; // 이미 적용한 사건: 결과만 다시 보여줍니다.
      } else if (kind === 'spring') {
        const before = run.hp;
        run.hp = Math.min(run.maxHp, run.hp + M.spring);
        n = run.hp - before;
      } else if (kind === 'fog') {
        const before = run.hp;
        run.hp = Math.max(1, run.hp - M.fog);
        n = before - run.hp;
      } else if (kind === 'purse') {
        run.gold += M.purse;
        n = M.purse;
      } else if (kind === 'thief') {
        n = Math.min(run.gold, M.thief);
        run.gold -= n;
      } else if (kind === 'note') {
        run.hints += 1;
      } else if (kind === 'weaknote') {
        run.weakNote = M.weakNote; // 다음 전투에서 씁니다 (js/battle.js)
        n = M.weakNote;
      }
      node.mysteryN = n;
      persist();
      open(() => {
        base(title, t(`mystery.${kind}.text`, { n }));
        showTip('event');
        leave('ev.continue', done);
      });
    },

    // 재도전 선물: 새 판을 시작할 때 하나를 고릅니다. last = 지난 판 { floor, clear }
    //   중간 보스 층 이하에서 쓰러졌으면 "도움" 둘 중 하나, 더 올라갔거나 깼으면 보통 선물 셋 중 하나.
    blessing(last, done) {
      const B = CONFIG.bless;
      const run = getRun();
      const gifts = {
        maxHp: () => { run.maxHp += B.maxHp; run.hp += B.maxHp; },
        frail: () => { run.frail = B.frail; },
        gold: () => { run.gold += B.gold; },
        hints: () => { run.hints += B.hints; },
        maxHpSmall: () => { run.maxHp += B.maxHpSmall; run.hp += B.maxHpSmall; },
        basic: () => UPGRADES.basic(run),
        skill: () => UPGRADES.skill(run),
      };
      const ICONS = { maxHp: 'maxhp', frail: 'weak', gold: 'coin', hints: 'hint', maxHpSmall: 'maxhp', basic: 'basic', skill: 'skill' };
      const early = !last.clear && last.floor <= B.early;
      const pool = ['gold', 'hints', 'maxHpSmall', 'basic', 'skill'].sort(() => Math.random() - 0.5).slice(0, 3);
      const picks = early ? ['maxHp', 'frail'] : pool;
      open(() => {
        const cheer = run.cheer ? `\n\n${t('cheer.text', { n: run.cheer, hp: CONFIG.cheer.hp * run.cheer, pct: Math.round(CONFIG.cheer.guard * run.cheer * 100) })}` : '';
        base('bless.title', t(last.clear ? 'bless.textClear' : early ? 'bless.textEarly' : 'bless.textFar', { n: last.floor }) + cheer);
        picks.forEach((id) => {
          option(t(`bless.${id}`, B), t(`bless.${id}Sub`, B), false, () => {
            gifts[id]();
            toast(`${t(`bless.${id}`, B)} · ${t(`bless.${id}Sub`, B)}`, icon(ICONS[id]));
            draw = null;
            done();
          }, ICONS[id]);
        });
      });
    },

    // 게임 오버: 지도 한 장을 처음부터 다시 시작합니다.
    gameover(info, done) {
      open(() => {
        base('ev.overTitle', t('ev.overText', { n: info.floor, total: info.total }));
        leave('ev.restart', done);
      });
    },

    // 보스를 쓰러뜨려 단원을 클리어했습니다.
    // opened: 이번에 새로 열린 도전 단계 (없으면 0)
    // extra: 덧붙일 글 (진보스와 싸운 결과)
    clear(gold, done, opened = 0, extra = '') {
      open(() => {
        base('ev.clearTitle', t('ev.clearText', { n: data.clears, gold }) + (extra ? `\n${extra}` : '') + (opened ? `\n\n${t('ascend.opened', { n: opened })}\n${t(`ascend.l${opened}`)}` : ''));
        leave('ev.newRun', done);
      });
    },
  };
}
