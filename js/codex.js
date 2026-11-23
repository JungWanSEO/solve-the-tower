// 도감 화면. 만난 몬스터와, 유형별 정답 기록(오답 노트)을 보여줍니다.
import { CONFIG } from './config.js';
import { t, pick } from './i18n.js';
import { scopeTree, typeLabel, hasType } from './questions.js';
import { statusOf } from './scope.js';
import { $, fillRelicText } from './ui.js';
import { icon } from './art.js';
import { RELICS, RELIC_IDS, relicVars } from './relics.js';

export function createCodex({ data, monsters, portrait = () => '' }) {
  const faces = {}; // 몬스터 얼굴 그림 (한 번 그리면 다시 씁니다)
  function card(title, lines, badge) {
    const el = document.createElement('div');
    el.className = 'codex-card';
    const head = document.createElement('div');
    head.className = 'codex-head';
    const b = document.createElement('b');
    b.textContent = title;
    head.appendChild(b);
    if (badge) {
      const tag = document.createElement('span');
      tag.className = `badge badge-${badge}`;
      tag.textContent = t(`codex.status.${badge}`);
      head.appendChild(tag);
    }
    el.appendChild(head);
    for (const text of lines) {
      const small = document.createElement('small');
      small.textContent = text;
      el.appendChild(small);
    }
    return el;
  }

  let tab = 'types';        // 지금 보는 탭
  const open = new Set();   // 펼쳐 놓은 단원

  function render() {
    $('codexSummary').textContent = t('codex.summary', { wins: data.wins, clears: data.clears });
    $('codexTabTypes').setAttribute('aria-selected', String(tab === 'types'));
    $('codexTabMonsters').setAttribute('aria-selected', String(tab === 'monsters'));
    $('codexTypes').hidden = tab !== 'types';
    $('codexMonsters').hidden = tab !== 'monsters';
    $('codexTabRelics').setAttribute('aria-selected', String(tab === 'relics'));
    $('codexRelics').hidden = tab !== 'relics';

    // 유물: 한 번이라도 얻어 본 것만 그림과 설명을 보여 주고, 나머지는 몇 개 남았는지만 셉니다.
    const rBox = $('codexRelics');
    rBox.innerHTML = '';
    const found = RELIC_IDS.filter((id) => data.relics && data.relics[id]);
    const rCount = document.createElement('p');
    rCount.className = 'codex-count';
    rCount.textContent = t('codex.relicMet', { n: found.length, total: RELIC_IDS.length });
    rBox.appendChild(rCount);
    for (const id of found) {
      const row = document.createElement('div');
      row.className = `codex-card relic-row rarity-${RELICS[id].rarity}`;
      row.innerHTML = `<i class="ico">${icon(`r-${id}`)}</i><b></b><em></em><small></small>`;
      row.querySelector('b').textContent = t(`relic.${id}.name`);
      row.querySelector('em').textContent = t(`relic.rarity.${RELICS[id].rarity}`);
      fillRelicText(row.querySelector('small'), t(`relic.${id}.text`, relicVars(id)));
      rBox.appendChild(row);
    }
    if (found.length < RELIC_IDS.length) rBox.appendChild(card(t('codex.unseen'), [t('codex.relicLeft', { n: RELIC_IDS.length - found.length })]));

    // 몬스터: 만난 것만 카드로, 아직 못 만난 것은 한 줄로 셉니다.
    const mBox = $('codexMonsters');
    mBox.innerHTML = '';
    const met = monsters.filter((m) => data.seen[m.id]);
    const count = document.createElement('p');
    count.className = 'codex-count';
    count.textContent = t('codex.met', { n: met.length, total: monsters.length });
    mBox.appendChild(count);
    for (const m of met) {
      const lines = [t('codex.mistake', { text: pick(m.mistake) })];
      if (hasType(m.weak)) lines.push(t('ui.weak', { type: typeLabel(m.weak) }));
      const el = card(pick(m.name), lines);
      // 몬스터 탭을 볼 때만 얼굴을 그립니다. (전투 그림판을 잠깐 빌려 그리므로)
      if (tab === 'monsters') {
        if (!(m.id in faces)) faces[m.id] = portrait(m.id);
        if (faces[m.id]) {
          const img = document.createElement('img');
          img.src = faces[m.id];
          img.alt = '';
          el.classList.add('with-face');
          el.prepend(img);
        }
      }
      mBox.appendChild(el);
    }
    if (met.length < monsters.length) mBox.appendChild(card(t('codex.unseen'), [t('codex.unseenLeft', { n: monsters.length - met.length })]));

    // 유형: 단원마다 접어 두고, 정복한 수를 막대로 보여 줍니다. 제목을 누르면 펼쳐집니다.
    const tBox = $('codexTypes');
    tBox.innerHTML = '';
    for (const subject of scopeTree()) {
      for (const unit of subject.units) {
        const keys = unit.groups.flatMap((group) => group.types);
        const done = keys.filter((key) => statusOf(data.codex[key]) === 'done').length;
        const tried = keys.filter((key) => statusOf(data.codex[key]) !== 'new').length;
        const id = keys[0].split('/')[0];
        const isOpen = open.has(id);
        const head = document.createElement('button');
        head.type = 'button';
        head.className = 'codex-unit';
        head.setAttribute('aria-expanded', String(isOpen));
        const caret = document.createElement('i');
        const name = document.createElement('b');
        name.textContent = `${pick(subject.names)} · ${pick(unit.names)}`;
        const num = document.createElement('small');
        num.textContent = t('codex.unitDone', { done, total: keys.length });
        const bar = document.createElement('span');
        bar.className = 'codex-bar';
        const tryFill = document.createElement('span');
        tryFill.className = 'tried';
        tryFill.style.width = `${(tried / keys.length) * 100}%`;
        const doneFill = document.createElement('span');
        doneFill.className = 'done';
        doneFill.style.width = `${(done / keys.length) * 100}%`;
        bar.append(tryFill, doneFill);
        head.append(caret, name, num, bar);
        head.addEventListener('click', () => {
          if (isOpen) open.delete(id);
          else open.add(id);
          render();
        });
        tBox.appendChild(head);
        if (!isOpen) continue;
        for (const type of keys) {
          const entry = data.codex[type];
          const status = statusOf(entry);
          const lines = [];
          if (status !== 'new') {
            const total = entry.right + entry.wrong;
            lines.push(t('codex.record', { right: entry.right, wrong: entry.wrong, rate: Math.round((entry.right / total) * 100) }));
          }
          if (status === 'open' || status === 'progress') lines.push(t('codex.toDone', { n: CONFIG.codexStreak - (entry.streak || 0) }));
          tBox.appendChild(card(typeLabel(type), lines, status));
        }
      }
    }
  }
  $('codexTabTypes').addEventListener('click', () => { tab = 'types'; render(); });
  $('codexTabMonsters').addEventListener('click', () => { tab = 'monsters'; render(); });
  $('codexTabRelics').addEventListener('click', () => { tab = 'relics'; render(); });

  return { render };
}
