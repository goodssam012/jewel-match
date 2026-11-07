let actx = null;
let muted = false;

export function setMuted(value) {
  muted = value;
}

export function beep(freq, dur = 0.12, type = 'sine', vol = 0.12) {
  if (muted) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
    o.connect(g).connect(actx.destination);
    o.start();
    o.stop(actx.currentTime + dur);
  } catch {
    // 소리를 낼 수 없는 환경이면 조용히 넘어간다.
  }
}

export const sfx = {
  select: () => beep(660, 0.04, 'sine', 0.05),
  swap: () => beep(440, 0.06),
  fail: () => beep(180, 0.15, 'square', 0.05),
  hint: () => beep(880, 0.08),
  match(combo) {
    const k = Math.pow(1.12, combo - 1);
    beep(520 * k, 0.15, 'triangle');
    setTimeout(() => beep(780 * k, 0.12, 'sine', 0.08), 60);
  },
  levelUp() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.2, 'triangle', 0.1), i * 110));
  },
};
