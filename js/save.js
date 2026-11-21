// 진행 기록을 이 기기의 브라우저에 저장합니다. 서버로 보내지 않습니다.
import { CONFIG } from './config.js';

export function blank() {
  return {
    v: 1,                      // 저장 형식 버전
    lang: CONFIG.defaultLang,  // 고른 언어
    wins: 0,                   // 이긴 전투 수
    clears: 0,                 // 단원을 클리어한 횟수
    codex: {},                 // 유형별 기록: { 유형: { right, wrong, streak } }
    seen: {},                  // 만난 몬스터: { 몬스터 id: true }
    tut: 'start',              // 튜토리얼 진행 단계 ('done' 이면 끝)
    sound: true,               // 효과음 켜기
    music: true,               // 배경 음악 켜기
    opt: null,                 // 설정 { music, sfx, calm, big, cheer } (js/settings.js)
    run: null,                 // 진행 중인 지도 한 장 (js/run.js)
    last: null,                // 지난 판의 결과 { floor, clear } (재도전 선물이 봅니다)
    falls: 0,                  // 탑을 깨지 못하고 연달아 쓰러진 횟수 (격려 단계)
    ascend: 0,                 // 고른 도전 단계
    ascendMax: 0,              // 열린 가장 높은 도전 단계
  };
}

export function load() {
  try {
    const data = JSON.parse(localStorage.getItem(CONFIG.saveKey) || 'null');
    if (data && data.v === 1) return { ...blank(), ...data };
  } catch (e) {
    // 저장소를 쓸 수 없는 환경에서는 새 기록으로 시작합니다.
  }
  return blank();
}

export function store(data) {
  if (window.sttWiped) return; // "모두 지우기" 뒤에는 아무것도 다시 저장하지 않습니다.
  try {
    localStorage.setItem(CONFIG.saveKey, JSON.stringify(data));
  } catch (e) {
    // 저장에 실패해도 게임은 계속됩니다.
  }
}

// ---- 백업 코드 ----
// 기록을 글자 코드로 바꿉니다. 모양: STT1-<확인용 숫자>-<내용>
// 서버 없이 다른 기기나 홈 화면 앱으로 기록을 옮길 때 씁니다.
const sumOf = (text) => [...text].reduce((sum, ch) => (sum + ch.charCodeAt(0)) % 65536, 0).toString(16);

export function encodeSave(data) {
  const body = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  return `STT1-${sumOf(body)}-${body}`;
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

// 코드를 기록으로 되돌립니다. 잘못된 코드면 null. 알 수 없는 값은 버리고 기본값을 씁니다.
export function decodeSave(code) {
  try {
    const found = String(code).replace(/\s+/g, '').match(/^STT1-([0-9a-f]+)-([A-Za-z0-9+/=]+)$/);
    if (!found || sumOf(found[2]) !== found[1]) return null;
    const raw = JSON.parse(decodeURIComponent(escape(atob(found[2]))));
    if (!raw || raw.v !== 1 || typeof raw.codex !== 'object' || raw.codex === null) return null;
    const out = blank();
    if (CONFIG.langs.includes(raw.lang)) out.lang = raw.lang;
    if (isNum(raw.wins)) out.wins = raw.wins;
    if (isNum(raw.clears)) out.clears = raw.clears;
    if (isNum(raw.deaths)) out.deaths = raw.deaths;
    if (typeof raw.tut === 'string' && raw.tut.length < 20) out.tut = raw.tut;
    if (typeof raw.sound === 'boolean') out.sound = raw.sound;
    if (typeof raw.music === 'boolean') out.music = raw.music;
    if (raw.opt && typeof raw.opt === 'object') {
      const vol = (v) => (typeof v === 'number' && v >= 0 && v <= 1 ? v : undefined);
      out.opt = { music: vol(raw.opt.music), sfx: vol(raw.opt.sfx), calm: raw.opt.calm === true, big: raw.opt.big === true, cheer: raw.opt.cheer !== false };
    }
    if (typeof raw.seenChain === 'boolean') out.seenChain = raw.seenChain;
    if (isNum(raw.falls)) out.falls = Math.floor(raw.falls);
    if (isNum(raw.ascendMax)) out.ascendMax = Math.min(CONFIG.ascend.max, Math.floor(raw.ascendMax));
    if (isNum(raw.ascend)) out.ascend = Math.min(out.ascendMax, Math.floor(raw.ascend));
    if (raw.last && isNum(raw.last.floor)) out.last = { floor: Math.floor(raw.last.floor), clear: raw.last.clear === true };
    for (const [key, entry] of Object.entries(raw.codex)) {
      if (key.length < 60 && entry && isNum(entry.right) && isNum(entry.wrong)) out.codex[key] = { right: entry.right, wrong: entry.wrong, streak: isNum(entry.streak) ? entry.streak : 0 };
    }
    if (raw.seen && typeof raw.seen === 'object') for (const key of Object.keys(raw.seen)) if (key.length < 30) out.seen[key] = true;
    if (Array.isArray(raw.lastScope)) out.lastScope = raw.lastScope.filter((key) => typeof key === 'string' && key.length < 60);
    // 진행 중인 지도는 모양이 맞을 때만 가져옵니다. 아니면 새 지도로 시작합니다.
    if (raw.run && Array.isArray(raw.run.nodes) && isNum(raw.run.hp) && isNum(raw.run.maxHp) && Array.isArray(raw.run.scope)) out.run = raw.run;
    return out;
  } catch (e) {
    return null;
  }
}
