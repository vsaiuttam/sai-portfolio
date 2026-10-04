/**
 * Garden sounds, synthesised with Web Audio (no audio files): the bamboo
 * knock of the shishi-odoshi, a cat's meow, a stone set down, the chime of
 * a raked ring, the swish of the rake, leaves, and a broom.
 *
 * Off by default. The AudioContext is only created after the visitor turns
 * sound on (a click), which is what browsers require.
 */

let ac: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let enabled = false;
let lastSwish = 0;

function ensure(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ac) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ac = new Ctor();
      master = ac.createGain();
      master.gain.value = 0.6;
      master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === "suspended") void ac.resume();
    return ac;
  } catch {
    return null;
  }
}

function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function tone(type: OscillatorType, f0: number, f1: number, peak: number, attack: number, decay: number, delay = 0) {
  const c = ensure();
  if (!c || !master) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + attack + decay);
  env(g, t, peak, attack, decay);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + attack + decay + 0.05);
}

function noise(filter: BiquadFilterType, freq: number, q: number, peak: number, attack: number, decay: number, freqTo?: number) {
  const c = ensure();
  if (!c || !master || !noiseBuf) return;
  const t = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = filter;
  f.frequency.setValueAtTime(freq, t);
  if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, t + attack + decay);
  f.Q.value = q;
  const g = c.createGain();
  env(g, t, peak, attack, decay);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random() * 0.5);
  src.stop(t + attack + decay + 0.05);
}

export const sound = {
  get on() {
    return enabled;
  },
  set(on: boolean) {
    enabled = on;
    if (on) ensure();
  },
  /** Shishi-odoshi: hollow bamboo striking stone. */
  knock() {
    if (!enabled) return;
    tone("sine", 900, 700, 0.5, 0.002, 0.12);
    tone("triangle", 420, 300, 0.25, 0.002, 0.18);
    noise("bandpass", 1900, 6, 0.35, 0.001, 0.05);
  },
  meow() {
    if (!enabled) return;
    const c = ensure();
    if (!c || !master) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    const f = c.createBiquadFilter();
    const g = c.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(560, t);
    o.frequency.linearRampToValueAtTime(980, t + 0.14);
    o.frequency.linearRampToValueAtTime(820, t + 0.3);
    o.frequency.exponentialRampToValueAtTime(480, t + 0.55);
    lfo.frequency.value = 7;
    lfoGain.gain.value = 18;
    lfo.connect(lfoGain).connect(o.frequency);
    f.type = "bandpass";
    f.frequency.setValueAtTime(1300, t);
    f.frequency.linearRampToValueAtTime(1900, t + 0.15);
    f.frequency.linearRampToValueAtTime(1000, t + 0.55);
    f.Q.value = 3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32, t + 0.06);
    g.gain.setValueAtTime(0.32, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(f).connect(g).connect(master);
    o.start(t);
    lfo.start(t);
    o.stop(t + 0.65);
    lfo.stop(t + 0.65);
  },
  /** A stone set down on sand. */
  thunk() {
    if (!enabled) return;
    tone("sine", 140, 55, 0.5, 0.004, 0.22);
    noise("lowpass", 500, 0.7, 0.25, 0.002, 0.1);
  },
  /** A ring raked around a pebble: a small bell. */
  chime() {
    if (!enabled) return;
    tone("sine", 1046, 1040, 0.16, 0.004, 1.3);
    tone("sine", 1568, 1560, 0.08, 0.004, 1.0, 0.03);
  },
  /** The rake through gravel; throttled so a long stroke is a texture. */
  swish(amount: number) {
    if (!enabled) return;
    const now = performance.now();
    if (now - lastSwish < 70) return;
    lastSwish = now;
    noise("bandpass", 2600, 0.9, Math.min(0.22, 0.05 + amount * 0.012), 0.01, 0.09);
  },
  rustle() {
    if (!enabled) return;
    noise("highpass", 3200, 0.7, 0.12, 0.01, 0.16);
  },
  broom() {
    if (!enabled) return;
    noise("bandpass", 700, 0.8, 0.18, 0.08, 1.1, 2600);
  },
};
