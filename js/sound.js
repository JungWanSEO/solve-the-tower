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
    if (ctx.state === 'suspended') ctx.resume();
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
  calm: { bpm: 78, wave: 'triangle', chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], lead: [0, 2, 1, 2, 0, 2, 1, -1], bass: [0, 4] },
  battle: { bpm: 116, wave: 'triangle', chords: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]], lead: [0, 1, 2, 1, 0, 2, 1, 2], bass: [0, 2, 4, 6] },
  boss: { bpm: 128, wave: 'square', chords: [[45, 48, 52], [45, 48, 52], [41, 45, 48], [43, 47, 50]], lead: [0, 2, 1, 2, 0, 2, 1, 2], bass: [0, 1, 2, 4, 5, 6] },
};
const MUSIC_VOLUME = 0.06; // 설정의 음악 음량 100% 일 때의 크기 (기본 50% 에서 0.03)
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
let musicOn = true;
let musicLevel = 1; // 음악 음량 (0 ~ 1)
let wanted = 'calm'; // 지금 나와야 하는 곡
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

// 0.1초마다 깨어나, 앞으로 0.3초 안에 울릴 음을 미리 예약합니다.
function tick() {
  if (!musicOn || !ctx || ctx.state !== 'running' || document.hidden) return;
  const track = TRACKS[wanted];
  const beat = 60 / track.bpm / 2; // 8분음표 하나의 길이
  if (nextAt < ctx.currentTime) nextAt = ctx.currentTime + 0.05;
  while (nextAt < ctx.currentTime + 0.3) {
    const chord = track.chords[Math.floor(step / 8) % track.chords.length];
    const slot = step % 8;
    const pick = track.lead[slot];
    if (pick >= 0) tone(hz(chord[pick] + 12), nextAt, beat * 0.9, track.wave, MUSIC_VOLUME);
    if (track.bass.includes(slot)) tone(hz(chord[0] - 12), nextAt, beat * 1.6, 'sine', MUSIC_VOLUME * 1.6);
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
// 곡을 바꿉니다: 'calm'(지도·상점 등), 'battle'(전투), 'boss'(중간 보스·보스)
export function music(name) {
  if (!TRACKS[name] || name === wanted) return;
  wanted = name;
  step = 0;
}
