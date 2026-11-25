// Tiny WebAudio synth — original sounds, no files, no network.
// Every sound is a short oscillator / noise burst made on the spot.
export function createAudio() {
  let ctx = null;
  let master = null;
  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.16;
      master.connect(ctx.destination);
    } catch { return false; }
    return true;
  }
  function tone(freq, dur, type = 'sine', vol = 1, slideTo = null) {
    if (!ensure()) return;
    try {
      if (ctx.state === 'suspended') ctx.resume();
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(g); g.connect(master);
      osc.start(t0); osc.stop(t0 + dur + 0.02);
    } catch { /* sound is optional */ }
  }
  function noise(dur, vol = 0.5) {
    if (!ensure()) return;
    try {
      if (ctx.state === 'suspended') ctx.resume();
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain(); g.gain.value = vol;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1200;
      src.connect(f); f.connect(g); g.connect(master);
      src.start();
    } catch { /* sound is optional */ }
  }
  return {
    unlock() { ensure(); },
    pick() { tone(520, 0.08, 'triangle', 0.8); },
    chop() { noise(0.07, 0.7); tone(180, 0.06, 'square', 0.4); },
    sizzle() { noise(0.35, 0.35); },
    plate() { tone(660, 0.09, 'triangle', 0.8); tone(880, 0.12, 'triangle', 0.6); },
    serve() { tone(523, 0.12, 'sine', 0.9); setTimeout(() => tone(784, 0.18, 'sine', 0.9), 90); },
    fail() { tone(220, 0.25, 'sawtooth', 0.5, 140); },
    click() { tone(440, 0.05, 'square', 0.4); },
    tick() { tone(980, 0.04, 'square', 0.25); },
  };
}
