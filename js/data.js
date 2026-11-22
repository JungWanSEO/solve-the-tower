// 데이터 관리 화면. 이 기기에 남아 있는 것을 보고, 백업하고, 지웁니다.
//   1) 쓰고 있는 용량        2) 기록 내보내기 / 가져오기 (백업 코드)
//   3) 홈 화면에 추가 안내    4) 기록 초기화 / 모두 지우기
// 서버로 보내는 것은 없습니다. 모든 것은 이 기기의 브라우저 안에서만 일어납니다.
import { CONFIG } from './config.js';
import { t } from './i18n.js';
import { blank, store, encodeSave, decodeSave } from './save.js';
import { allTypeKeys } from './questions.js';
import { statusOf } from './scope.js';
import { $ } from './ui.js';

const CACHE_PREFIX = 'solve-the-tower-';
const kb = (bytes) => (bytes < 1024 ? `${bytes} B` : `${Math.round(bytes / 1024)} KB`);

// 아이폰·아이패드의 사파리 탭에서 열었는지 (홈 화면에 추가한 것이 아닌지)
export function inIosSafariTab() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  return ios && !standalone;
}

// 오프라인용으로 저장해 둔 파일의 크기
async function cacheBytes() {
  if (!('caches' in window)) return 0;
  let total = 0;
  for (const name of await caches.keys()) {
    if (!name.startsWith(CACHE_PREFIX)) continue;
    const cache = await caches.open(name);
    for (const request of await cache.keys()) {
      const res = await cache.match(request);
      if (res) total += (await res.clone().blob()).size;
    }
  }
  return total;
}

// 여러 버튼이 달린 확인 창. buttons: [{ label, kind: 'primary' | 'danger' | '', run }]
export function ask({ title, text, buttons }) {
  $('dialogTitle').textContent = title;
  $('dialogText').textContent = text;
  const box = $('dialogButtons');
  box.innerHTML = '';
  for (const b of buttons) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = b.kind === 'primary' ? 'primary' : `hint ${b.kind || ''}`;
    btn.textContent = b.label;
    btn.addEventListener('click', () => {
      $('dialog').hidden = true;
      if (b.run) b.run();
    });
    box.appendChild(btn);
  }
  $('dialog').hidden = false;
  box.firstChild.focus();
}

export function createData({ data, onBack }) {
  const note = (key, vars) => {
    $('dataNote').textContent = key ? t(key, vars) : '';
  };

  function summary() {
    const done = allTypeKeys().filter((key) => statusOf(data.codex[key]) === 'done').length;
    return { wins: data.wins, clears: data.clears, done };
  }

  async function render() {
    const saved = localStorage.getItem(CONFIG.saveKey) || '';
    $('dataUsage').textContent = t('data.usage', { save: kb(new Blob([saved]).size), files: '…' });
    $('dataSummary').textContent = t('data.summary', summary());
    $('dataIos').hidden = !inIosSafariTab();
    $('dataOther').hidden = inIosSafariTab();
    cacheBytes().then((bytes) => {
      $('dataUsage').textContent = t('data.usage', { save: kb(new Blob([saved]).size), files: kb(bytes) });
    }).catch(() => {});
  }

  // ---- 내보내기 ----
  function exportCode() {
    store(data);
    $('dataCode').value = encodeSave(data);
    $('dataCodeBox').hidden = false;
    $('dataImportBox').hidden = true;
    note('data.exported');
  }
  $('dataExport').addEventListener('click', exportCode);
  $('dataCopy').addEventListener('click', async () => {
    const area = $('dataCode');
    try {
      await navigator.clipboard.writeText(area.value);
    } catch (e) {
      area.select();
      document.execCommand('copy'); // 예전 브라우저용
    }
    note('data.copied');
  });
  $('dataFile').addEventListener('click', () => {
    const day = new Date().toISOString().slice(0, 10);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([$('dataCode').value], { type: 'text/plain' }));
    link.download = `solve-the-tower-${day}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    note('data.fileSaved');
  });

  // ---- 가져오기 ----
  $('dataImport').addEventListener('click', () => {
    $('dataImportBox').hidden = false;
    $('dataCodeBox').hidden = true;
    $('dataPaste').value = '';
    note('');
    $('dataPaste').focus();
  });
  $('dataPick').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) $('dataPaste').value = await file.text();
    event.target.value = '';
  });
  $('dataApply').addEventListener('click', () => {
    const loaded = decodeSave($('dataPaste').value);
    if (!loaded) {
      note('data.badCode');
      return;
    }
    const done = Object.values(loaded.codex).filter((entry) => statusOf(entry) === 'done').length;
    ask({
      title: t('data.importTitle'),
      text: t('data.importText', { wins: loaded.wins, clears: loaded.clears, done }),
      buttons: [
        { label: t('data.cancel'), kind: 'primary' },
        { label: t('data.importOk'), kind: 'danger', run: () => { store(loaded); window.location.reload(); } },
      ],
    });
  });

  // ---- 지우기 ----
  // 지우기 전에 무엇이 사라지는지 보여 주고, 먼저 내보낼 기회를 줍니다.
  function confirmErase(titleKey, textKey, okKey, run) {
    ask({
      title: t(titleKey),
      text: `${t(textKey)}\n\n${t('data.summary', summary())}`,
      buttons: [
        { label: t('data.cancel'), kind: 'primary' },
        { label: t('data.exportFirst'), run: exportCode },
        { label: t(okKey), kind: 'danger', run },
      ],
    });
  }
  // 기록 초기화: 진행 기록과 도감만 지웁니다. 언어와 소리 설정은 남깁니다.
  $('dataReset').addEventListener('click', () => confirmErase('data.resetTitle', 'data.resetText', 'data.resetOk', () => {
    store({ ...blank(), lang: data.lang, sound: data.sound, music: data.music, opt: data.opt });
    window.location.reload();
  }));
  // 모두 지우기: 기록, 오프라인용 파일, 서비스 워커 등록까지 지웁니다. 이 기기에 아무것도 남지 않습니다.
  $('dataWipe').addEventListener('click', () => confirmErase('data.wipeTitle', 'data.wipeText', 'data.wipeOk', async () => {
    try {
      localStorage.removeItem(CONFIG.saveKey);
      if ('caches' in window) await Promise.all((await caches.keys()).filter((name) => name.startsWith(CACHE_PREFIX)).map((name) => caches.delete(name)));
      if ('serviceWorker' in navigator) await Promise.all((await navigator.serviceWorker.getRegistrations()).map((reg) => reg.unregister()));
    } catch (e) {
      // 일부를 지우지 못해도 끝 화면은 보여 줍니다.
    }
    // 다시 열면 파일을 새로 받게 되므로, 여기서는 다시 불러오지 않고 끝 화면만 보여 줍니다.
    window.sttWiped = true;
    $('wipedTitle').textContent = t('data.wipedTitle');
    $('wipedText').textContent = t('data.wipedText');
    $('wipedAgain').textContent = t('data.wipedAgain');
    $('wiped').hidden = false;
  }));
  $('wipedAgain').addEventListener('click', () => window.location.reload());
  $('dataBack').addEventListener('click', onBack);

  return {
    open() {
      $('dataCodeBox').hidden = true;
      $('dataImportBox').hidden = true;
      note('');
      render();
    },
    render,
  };
}
