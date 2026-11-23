// 업데이트 소식: 게임 안에서 "이번에 무엇이 바뀌었는지"를 보는 창입니다.
//   - 내용은 data/news.json 에 있습니다. 맨 위가 가장 새 버전입니다. 학생이 읽는 글이라 버전마다 3~5줄로 짧게 씁니다.
//   - 개발 기록인 CHANGELOG.md 와는 따로 둡니다. 배포할 때마다 두 가지를 함께 씁니다.
//   - 새 버전을 처음 열었을 때 한 번 저절로 뜹니다. 본 버전은 저장 기록의 newsSeen 에 적습니다.
import { $ } from './ui.js';
import { t } from './i18n.js';

export function createNews({ data, persist }) {
  let list = [];
  const ready = fetch('./data/news.json').then((res) => (res.ok ? res.json() : [])).then((json) => {
    list = Array.isArray(json) ? json : [];
  }).catch(() => {});

  function render() {
    $('newsTitle').textContent = t('news.title');
    $('newsClose').textContent = t('relic.close');
    const box = $('newsList');
    box.innerHTML = '';
    list.forEach((entry, i) => {
      const head = document.createElement('h3');
      head.textContent = `${t('news.version', { v: entry.version })}${entry.date ? ` · ${entry.date}` : ''}`;
      if (i === 0) {
        const tag = document.createElement('em');
        tag.textContent = t('news.latest');
        head.appendChild(tag);
      }
      const ul = document.createElement('ul');
      for (const line of (entry.items && (entry.items[data.lang] || entry.items.ja)) || []) {
        const li = document.createElement('li');
        li.textContent = line;
        ul.appendChild(li);
      }
      box.append(head, ul);
    });
    if (!list.length) box.textContent = t('news.none');
  }

  function open() {
    render();
    if (list[0]) data.newsSeen = list[0].version;
    persist();
    $('news').hidden = false;
    $('newsClose').focus({ preventScroll: true });
    $('news').querySelector('.menu-box').scrollTop = 0;
  }
  $('newsClose').addEventListener('click', () => { $('news').hidden = true; });
  $('news').addEventListener('click', (event) => { if (event.target === $('news')) $('news').hidden = true; });

  return {
    open: () => ready.then(open),
    // 새 버전의 소식을 아직 보지 않았으면 한 번 띄웁니다. 처음 하는 사람(튜토리얼 전)에게는 띄우지 않고 본 것으로 적어 둡니다.
    showIfNew() {
      ready.then(() => {
        if (!list[0] || data.newsSeen === list[0].version) return;
        if (data.tut !== 'done') {
          data.newsSeen = list[0].version;
          persist();
          return;
        }
        open();
      });
    },
    refresh: () => { if (!$('news').hidden) render(); },
  };
}
