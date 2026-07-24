// Lightweight win/loss feedback for Double or Nothing's reveal moment.
// Deliberately asymmetric — losses read as sharper and faster, wins as
// warmer and slightly longer, because losses are felt more strongly than
// equivalent gains (loss aversion), and the reveal is the game's payoff
// moment so it should feel distinct every time.

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    }
    if (audioCtx.state === "suspended") void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

function playTone(freq: number, duration: number, type: OscillatorType, delay = 0) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  } catch {
    // Audio is a nice-to-have; never let it break gameplay.
  }
}

export function playWinFeedback() {
  playTone(880, 0.22, "triangle");
  playTone(1175, 0.28, "triangle", 0.1);
  navigator.vibrate?.(35);
}

export function playLossFeedback() {
  playTone(180, 0.22, "sawtooth");
  navigator.vibrate?.([25, 40, 25]);
}
