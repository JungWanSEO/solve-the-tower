// 언어 처리. 화면 문구는 lang/<언어>.json 에서, 문제·몬스터 이름은
// 데이터 안의 { ja, ko, en } 묶음에서 가져옵니다.
let dict = {};
let lang = 'ja';

export async function loadLang(code) {
  const res = await fetch(`./lang/${code}.json`);
  if (!res.ok) throw new Error(`lang/${code}.json ${res.status}`);
  dict = await res.json();
  lang = code;
  document.documentElement.lang = code;
}

export function getLang() {
  return lang;
}

// "{이름}" 자리를 값으로 채웁니다.
export function fill(text, vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, key) => (key in vars ? vars[key] : whole));
}

// 화면 문구: t('ui.hp'), t('msg.correct', { d: 5 })
export function t(key, vars) {
  const found = key.split('.').reduce((node, part) => (node ? node[part] : undefined), dict);
  return typeof found === 'string' ? fill(found, vars) : key;
}

// 데이터 안의 { ja, ko, en } 에서 지금 언어의 글을 고릅니다.
export function pick(texts) {
  if (!texts) return '';
  return texts[lang] ?? texts.ja ?? '';
}

// data-i18n 속성이 붙은 요소의 글을 한 번에 바꿉니다.
export function applyStatic(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
}
