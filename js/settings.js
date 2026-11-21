// 설정 창. 처음 화면과 게임 중 메뉴 어디서나 엽니다.
//   소리(음악·효과음 음량) · 언어 · 화면(연출 줄이기, 큰 글씨) · 게임(격려 받기) · 데이터 관리
// 바꾼 값은 바로 적용하고 이 기기에 저장합니다. 값은 저장 기록의 opt 에 들어갑니다.
import { t } from './i18n.js';
import { play, setSound, setMusic } from './sound.js';
import { $ } from './ui.js';

// 기본값. 예전 기록의 "소리 끄기"(sound: false, music: false)는 음량 0 으로 이어받습니다.
export function optionsOf(data) {
  const saved = data.opt || {};
  const num = (v, fallback) => (typeof v === 'number' && v >= 0 && v <= 1 ? v : fallback);
  return {
    music: num(saved.music, data.music === false ? 0 : 0.5), // 음악 음량 (0 ~ 1)
    sfx: num(saved.sfx, data.sound === false ? 0 : 0.7),     // 효과음 음량 (0 ~ 1)
    calm: saved.calm === true,                               // 연출 줄이기
    big: saved.big === true,                                 // 큰 글씨
    cheer: saved.cheer !== false,                            // 격려 받기
  };
}

// 저장된 설정을 화면과 소리에 적용합니다. (시작할 때와 값을 바꿀 때마다 부릅니다)
export function applyOptions(data, onCalm = () => {}) {
  const opt = optionsOf(data);
  setMusic(opt.music);
  setSound(opt.sfx);
  document.body.classList.toggle('calm', opt.calm);
  document.body.classList.toggle('bigtext', opt.big);
  onCalm(opt.calm);
  return opt;
}

export function createSettings({ data, save, onCalm, onData, onLang }) {
  let opt = applyOptions(data, onCalm);

  const write = () => {
    data.opt = { ...opt };
    data.sound = opt.sfx > 0;   // 예전 형식과도 맞춰 둡니다
    data.music = opt.music > 0;
    save();
    opt = applyOptions(data, onCalm);
    render();
  };
  const percent = (v) => (v > 0 ? `${Math.round(v * 100)}%` : t('set.off'));

  function render() {
    $('setMusic').value = Math.round(opt.music * 100);
    $('setSfx').value = Math.round(opt.sfx * 100);
    $('setMusicNum').textContent = percent(opt.music);
    $('setSfxNum').textContent = percent(opt.sfx);
    for (const [id, on] of [['setCalm', opt.calm], ['setBig', opt.big], ['setCheer', opt.cheer]]) {
      $(id).setAttribute('aria-checked', String(on));
    }
    $('langSelect').value = data.lang;
  }

  // 음량: 끄는 동안에는 숫자만 바꾸고, 손을 떼면 저장합니다. 효과음은 손을 뗄 때 한 번 들려줍니다.
  $('setMusic').addEventListener('input', () => {
    opt.music = Number($('setMusic').value) / 100;
    setMusic(opt.music);
    $('setMusicNum').textContent = percent(opt.music);
  });
  $('setMusic').addEventListener('change', write);
  $('setSfx').addEventListener('input', () => {
    opt.sfx = Number($('setSfx').value) / 100;
    $('setSfxNum').textContent = percent(opt.sfx);
  });
  $('setSfx').addEventListener('change', () => {
    write();
    play('right');
  });
  for (const [id, key] of [['setCalm', 'calm'], ['setBig', 'big'], ['setCheer', 'cheer']]) {
    $(id).addEventListener('click', () => {
      opt[key] = !opt[key];
      write();
    });
  }
  $('langSelect').addEventListener('change', () => onLang($('langSelect').value));

  function close() {
    $('settings').hidden = true;
  }
  function open() {
    render();
    $('settings').hidden = false;
    $('setClose').focus({ preventScroll: true });
    $('settings').querySelector('.set-box').scrollTop = 0; // 항상 맨 위(소리)부터 보이게
  }
  $('setClose').addEventListener('click', close);
  $('setData').addEventListener('click', () => {
    close();
    onData();
  });
  $('settings').addEventListener('click', (event) => {
    if (event.target === $('settings')) close(); // 바깥을 누르면 닫힘
  });

  return { open, close, render, isOpen: () => !$('settings').hidden, options: () => opt };
}
