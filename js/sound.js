// 효과음과 배경 음악. 소리 파일 없이 브라우저가 직접 음을 만들어 냅니다. (Web Audio)
// 새 소리를 넣으려면 SOUNDS 에 한 줄을 추가하고, 원하는 곳에서 play('이름') 을 부릅니다.
let ctx = null;
let on = true;
let level = 1; // 효과음 음량 (0 ~ 1, 설정 창에서 바꿉니다)

// 음 하나: [주파수(Hz), 시작(초), 길이(초), 파형, 끝 주파수(선택)]
const SOUNDS = {
  tap: [[520, 0, 0.05, 'triangle']],
  right: [[660, 0, 0.09, 'triangle'], [990, 0.08, 0.14, 'triangle']],
  wrong: [[220, 0, 0.16, 'sawtooth', 150], [150, 0.14, 0.2, 'sawtooth', 110]],
  hit: [[300, 0, 0.1, 'square', 90]],
  hurt: [[160, 0, 0.22, 'sawtooth', 60]],
  block: [[880, 0, 0.06, 'square'], [1320, 0.05, 0.1, 'square']],
  warn: [[440, 0, 0.12, 'square'], [440, 0.18, 0.12, 'square']],
  ult: [[440, 0, 0.08, 'square'], [660, 0.07, 0.08, 'square'], [880, 0.14, 0.08, 'square'], [1320, 0.21, 0.25, 'square']],
  win: [[523, 0, 0.12, 'triangle'], [659, 0.11, 0.12, 'triangle'], [784, 0.22, 0.12, 'triangle'], [1047, 0.33, 0.3, 'triangle']],
  lose: [[392, 0, 0.2, 'triangle'], [330, 0.2, 0.2, 'triangle'], [262, 0.4, 0.45, 'triangle']],
  clear: [[523, 0, 0.14, 'triangle'], [659, 0.13, 0.14, 'triangle'], [784, 0.26, 0.14, 'triangle'], [1047, 0.39, 0.14, 'triangle'], [784, 0.52, 0.1, 'triangle'], [1047, 0.62, 0.5, 'triangle']],
};
const VOLUME = 0.17; // 설정의 효과음 음량 100% 일 때의 크기 (기본 70% 에서 0.12)

// value: 음량 0 ~ 1 (true 는 1, false 는 0 으로 봅니다)
export function setSound(value) {
  level = value === true ? 1 : Math.max(0, Math.min(1, Number(value) || 0));
  on = level > 0;
}
export function soundOn() {
  return on;
}

// 화면을 처음 누를 때 오디오를 깨웁니다. (효과음을 꺼 두어도 음악은 나올 수 있게)
export function wake() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!ctx) ctx = new Ctx();
    // 아이폰은 전화·알림·앱 전환 뒤에 'interrupted' 상태가 되기도 합니다. 'running' 이 아니면 언제나 다시 켭니다.
    if (ctx.state !== 'running') ctx.resume();
  } catch (e) {
    // 소리를 낼 수 없는 환경
  }
}

export function play(name) {
  const notes = SOUNDS[name];
  if (!on || !notes) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!ctx) ctx = new Ctx();
    if (ctx.state === 'suspended') ctx.resume(); // 브라우저는 화면을 한 번 누른 뒤에야 소리를 허락합니다.
    const now = ctx.currentTime;
    for (const [freq, at, len, wave, endFreq] of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, now + at);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, now + at + len);
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, VOLUME * level), now + at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + len);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + len + 0.02);
    }
  } catch (e) {
    // 소리를 낼 수 없는 환경에서는 조용히 넘어갑니다.
  }
}

// ---- 배경 음악 ----
// 화음 진행을 따라 음을 하나씩 짚는 단순한 반복 음악입니다. (이 게임을 위해 만든 진행)
// 곡 하나: bpm 빠르기, wave 파형, chords 한 마디씩의 화음(미디 음 번호 셋), lead 한 마디 8칸에서 짚을 화음 자리(-1 은 쉼), bass 베이스를 치는 칸
const TRACKS = {
  // 지도·상점·휴식: 잔잔하게
  calm: { bpm: 78, wave: 'triangle', chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], lead: [0, 2, 1, 2, 0, 2, 1, -1], bass: [0, 4], pad: 0.3 },
  // 보통 전투: 과목마다 분위기가 다릅니다 (몬스터의 약점 단원으로 고릅니다)
  battle: { bpm: 116, wave: 'triangle', chords: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]], lead: [0, 1, 2, 1, 0, 2, 1, 2], bass: [0, 2, 4, 6], kick: [0, 4] }, // 数学I: 씩씩하게
  battleA: { bpm: 104, wave: 'triangle', chords: [[55, 59, 62], [52, 55, 59], [48, 52, 55], [50, 54, 57]], melody: [[0, null, 4, 7, null, 4, 7, 12], [0, null, 3, 7, null, 3, 7, null], [0, 4, 7, null, 12, null, 7, 4], [0, null, 4, 7, 9, 7, 4, null]], bass: [0, 3, 4, 7], kick: [0, 3, 6] }, // 数学A: 가볍고 통통 튀게
  battle2: { bpm: 110, wave: 'sawtooth', leadVol: 0.55, chords: [[50, 53, 57], [48, 52, 55], [46, 50, 53], [45, 49, 52]], melody: [[0, null, 7, null, 3, null, 7, 10], [0, null, 7, null, 4, 5, 7, null], [0, null, 7, null, 4, null, 7, 11], [0, 4, 7, null, 12, 10, 7, null]], bass: [0, 2, 4, 6], kick: [0, 4], pad: 0.22 }, // 数学II: 어둡고 신비롭게
  // 강적: 쉬지 않고 몰아치는 베이스
  elite: { bpm: 138, wave: 'square', leadVol: 0.7, chords: [[45, 48, 52], [45, 48, 52], [43, 46, 50], [41, 45, 48]], lead: [0, 0, 2, 0, 1, 0, 2, 1], bass: [0, 1, 2, 3, 4, 5, 6, 7], kick: [0, 2, 4, 6] },
  // 중간 보스: 긴장감 있는 빠른 곡
  midboss: { bpm: 128, wave: 'square', leadVol: 0.75, chords: [[45, 48, 52], [45, 48, 52], [41, 45, 48], [43, 47, 50]], lead: [0, 2, 1, 2, 0, 2, 1, 2], bass: [0, 1, 2, 4, 5, 6], kick: [0, 4, 6] },
  // 보스: 느리고 웅장하게. 화음을 길게 깔고, 가락은 한 옥타브 아래를 겹쳐 두껍게, 큰북이 박을 칩니다.
  boss: { bpm: 92, wave: 'sawtooth', leadVol: 0.6, big: true, chords: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]],
    melody: [[0, null, null, 7, null, null, 5, 3], [7, null, null, 4, null, null, 7, null], [7, null, 4, null, 7, null, 12, null], [4, null, null, 7, null, 4, null, null],
      [12, null, null, 10, null, null, 7, 3], [7, null, 11, null, 12, null, 7, null], [7, null, 9, null, 12, null, 16, null], [16, null, null, 12, null, 7, 4, null]],
    bass: [0, 4], pad: 0.45, drum: [0, 3, 6, 7] },
};
const MUSIC_VOLUME = 0.06; // 설정의 음악 음량 100% 일 때의 크기 (기본 50% 에서 0.03)
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
let musicOn = true;
let musicLevel = 1; // 음악 음량 (0 ~ 1)
let wanted = 'calm'; // 지금 나와야 하는 곡
let shift = 0; // 곡 전체를 반음 몇 개만큼 올리거나 내릴지 (보스마다 조가 다릅니다)
let step = 0;
let nextAt = 0;
let timer = 0;

function tone(freq, at, len, wave, volume) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * musicLevel), at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + len + 0.03);
}

// 북 소리: 높은 음에서 낮은 음으로 빠르게 떨어지는 사인파. deep 이면 큰북처럼 낮고 길게
function drum(at, deep) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const len = deep ? 0.5 : 0.13;
  osc.type = 'sine';
  osc.frequency.setValueAtTime(deep ? 95 : 150, at);
  osc.frequency.exponentialRampToValueAtTime(deep ? 38 : 48, at + len);
  gain.gain.setValueAtTime(Math.max(0.0002, MUSIC_VOLUME * (deep ? 2.6 : 1.5) * musicLevel), at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + len + 0.03);
}

// 0.1초마다 깨어나, 앞으로 0.3초 안에 울릴 음을 미리 예약합니다.
function tick() {
  if (!musicOn || !ctx || ctx.state !== 'running' || document.hidden) return;
  const track = TRACKS[wanted];
  const beat = 60 / track.bpm / 2; // 8분음표 하나의 길이
  const leadVol = MUSIC_VOLUME * (track.leadVol || 1);
  if (nextAt < ctx.currentTime) nextAt = ctx.currentTime + 0.05;
  while (nextAt < ctx.currentTime + 0.3) {
    const bar = Math.floor(step / 8);
    const chord = track.chords[bar % track.chords.length].map((n) => n + shift);
    const slot = step % 8;
    // 가락: melody 가 있으면 화음의 밑음에서 반음 몇 개 위인지로, 없으면 lead 가 짚는 화음 자리로
    let note = null;
    if (track.melody) { const up = track.melody[bar % track.melody.length][slot]; if (up !== null && up !== undefined) note = chord[0] + 12 + up; }
    else if (track.lead[slot] >= 0) note = chord[track.lead[slot]] + 12;
    if (note !== null) {
      tone(hz(note), nextAt, beat * (track.big ? 1.9 : 0.9), track.wave, leadVol);
      if (track.big) tone(hz(note - 12), nextAt, beat * 1.9, 'triangle', leadVol * 0.9);
    }
    if (track.bass.includes(slot)) tone(hz(chord[0] - 12), nextAt, beat * (track.big ? 3.6 : 1.6), 'sine', MUSIC_VOLUME * 1.6);
    // 깔리는 화음: 마디의 첫 박에 세 음을 길게
    if (track.pad && slot === 0) for (const n of chord) tone(hz(n), nextAt, beat * 7.6, 'triangle', MUSIC_VOLUME * track.pad);
    if (track.kick && track.kick.includes(slot)) drum(nextAt, false);
    if (track.drum && track.drum.includes(slot)) drum(nextAt, true);
    step += 1;
    nextAt += beat;
  }
}

// value: 음량 0 ~ 1 (true 는 1, false 는 0 으로 봅니다)
export function setMusic(value) {
  musicLevel = value === true ? 1 : Math.max(0, Math.min(1, Number(value) || 0));
  musicOn = musicLevel > 0;
  if (musicOn && !timer && typeof setInterval === 'function' && (window.AudioContext || window.webkitAudioContext)) timer = setInterval(tick, 100);
}
// 곡을 바꿉니다: 'calm'(지도·상점 등), 'battle'·'battleA'·'battle2'(과목별 보통 전투), 'elite'(강적), 'midboss', 'boss'
// key: 곡의 조를 반음 몇 개만큼 옮길지 (보스마다 다른 조로 들리게 할 때 씁니다)
export function music(name, key = 0) {
  if (!TRACKS[name] || (name === wanted && key === shift)) return;
  wanted = name;
  shift = key;
  step = 0;
}
// 전투에 맞는 곡 고르기. weak 는 몬스터의 약점 유형("단원/유형"), id 는 몬스터 id
export function battleMusic(kind, weak = '', id = '') {
  if (kind === 'boss') return music('boss', ([...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 5) - 2);
  if (kind === 'midboss') return music('midboss');
  if (kind === 'elite') return music('elite');
  // 数学B 는 数学A 의 곡, 数学C 는 数学II 의 곡을 함께 씁니다 (과목마다 따로 만든 곡은 아직 셋뿐입니다)
  return music(/^(math2|mathc)-/.test(weak) ? 'battle2' : /^(matha|mathb)-/.test(weak) ? 'battleA' : 'battle');
}
