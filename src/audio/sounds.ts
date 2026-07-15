let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  return ctx;
}

export function setMuted(value: boolean) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function tone(
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType = "sine",
  gainPeak = 0.25,
) {
  const audioCtx = getCtx();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(gainPeak, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

export function playDing() {
  if (muted) return;
  const audioCtx = getCtx();
  const now = audioCtx.currentTime;
  tone(1046.5, now, 0.35, "sine", 0.3);
  tone(1568, now + 0.08, 0.3, "sine", 0.22);
}

export function playBuzzer() {
  if (muted) return;
  const audioCtx = getCtx();
  const now = audioCtx.currentTime;
  tone(140, now, 0.5, "sawtooth", 0.28);
  tone(110, now + 0.05, 0.5, "square", 0.18);
}

export function playAward() {
  if (muted) return;
  const audioCtx = getCtx();
  const now = audioCtx.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    tone(freq, now + i * 0.11, 0.35, "triangle", 0.22);
  });
}

export function playClick() {
  if (muted) return;
  const audioCtx = getCtx();
  tone(600, audioCtx.currentTime, 0.08, "square", 0.08);
}

export function playTick() {
  if (muted) return;
  const audioCtx = getCtx();
  tone(880, audioCtx.currentTime, 0.1, "square", 0.18);
}

export function playTimeUp() {
  if (muted) return;
  const audioCtx = getCtx();
  const now = audioCtx.currentTime;
  tone(220, now, 0.6, "sawtooth", 0.3);
  tone(180, now + 0.15, 0.6, "sawtooth", 0.25);
  tone(140, now + 0.3, 0.7, "square", 0.22);
}
