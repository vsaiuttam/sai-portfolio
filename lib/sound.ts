/**
 * Site sounds, synthesised with Web Audio (no audio files): the noren
 * curtain, the portrait's transformation, the theme switch, copying the
 * email, and the garden (rake, rings, stones, leaves, broom, the
 * shishi-odoshi's knock, the cat).
 *
 * On by default and remembered per visitor (header button or the M key).
 * Every sound answers something the visitor did, and the AudioContext is
 * only created inside that click or key press, as browsers require.
 */

let ac: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let enabled = true;
let loaded = false;
let lastSwish = 0;
const listeners = new Set<(on: boolean) => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    enabled = localStorage.getItem("sound") !== "off";
  } catch {}
}

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

export function soundOn() {
  load();
  return enabled;
}

export function setSoundOn(on: boolean) {
  load();
  enabled = on;
  try {
    localStorage.setItem("sound", on ? "on" : "off");
  } catch {}
  if (on) ensure();
  listeners.forEach((fn) => fn(on));
}

export function onSoundChange(fn: (on: boolean) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export const sound = {
  get on() {
    return soundOn();
  },
  /** Shishi-odoshi: hollow bamboo striking stone. */
  knock() {
    if (!soundOn()) return;
    tone("sine", 900, 700, 0.5, 0.002, 0.12);
    tone("triangle", 420, 300, 0.25, 0.002, 0.18);
    noise("bandpass", 1900, 6, 0.35, 0.001, 0.05);
  },
  meow() {
    if (!soundOn()) return;
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
    if (!soundOn()) return;
    tone("sine", 140, 55, 0.5, 0.004, 0.22);
    noise("lowpass", 500, 0.7, 0.25, 0.002, 0.1);
  },
  /** A ring raked around a pebble: a small bell. */
  chime() {
    if (!soundOn()) return;
    tone("sine", 1046, 1040, 0.16, 0.004, 1.3);
    tone("sine", 1568, 1560, 0.08, 0.004, 1.0, 0.03);
  },
  /** The rake through gravel; throttled so a long stroke is a texture. */
  swish(amount: number) {
    if (!soundOn()) return;
    const now = performance.now();
    if (now - lastSwish < 70) return;
    lastSwish = now;
    noise("bandpass", 2600, 0.9, Math.min(0.22, 0.05 + amount * 0.012), 0.01, 0.09);
  },
  rustle() {
    if (!soundOn()) return;
    noise("highpass", 3200, 0.7, 0.12, 0.01, 0.16);
  },
  /** Square-wave blips climbing a pentatonic scale, one per wave of tiles. */
  blips(count: number, startMs: number, stepMs: number, up = true) {
    if (!soundOn()) return;
    const scale = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760];
    for (let i = 0; i < count; i++) {
      const j = Math.round((i / Math.max(1, count - 1)) * (scale.length - 1));
      const f = scale[up ? j : scale.length - 1 - j];
      tone("square", f, f, 0.05, 0.004, 0.06, (startMs + i * stepMs) / 1000);
    }
  },
  /** Switching on: a small wooden tick. */
  tick() {
    if (!soundOn()) return;
    tone("triangle", 1400, 1100, 0.12, 0.002, 0.05);
  },
  /** The theme switch: a click, then a soft tone, higher for light. */
  theme(dark: boolean) {
    if (!soundOn()) return;
    noise("highpass", 2500, 0.8, 0.2, 0.001, 0.025);
    tone("sine", dark ? 330 : 494, dark ? 262 : 587, 0.12, 0.01, 0.35, 0.04);
  },
  /** A hanko-like stamp, for copying the email. */
  stamp() {
    if (!soundOn()) return;
    tone("sine", 180, 90, 0.35, 0.003, 0.12);
    noise("bandpass", 1200, 1.2, 0.12, 0.002, 0.06);
  },
  /** The noren dropping: cloth falling through air, then the rod settling. */
  norenDown(ms: number) {
    if (!soundOn()) return;
    noise("bandpass", 2400, 0.7, 0.22, 0.05, ms / 1000, 500);
    tone("triangle", 260, 200, 0.22, 0.003, 0.16, ms / 1000);
    noise("bandpass", 900, 4, 0.18, 0.002, 0.05);
  },
  /** Passing through: the cloth swept aside, rising. */
  norenUp(ms: number) {
    if (!soundOn()) return;
    noise("bandpass", 600, 0.7, 0.2, 0.06, ms / 1000, 3000);
  },
  /** The portrait crunching into pixels: a bit-crushed falling chirp. */
  crunch(ms: number) {
    if (!soundOn()) return;
    tone("square", 1200, 180, 0.07, 0.01, ms / 1000);
    noise("lowpass", 3000, 0.8, 0.08, 0.01, ms / 1000, 400);
  },
  /** The new picture landing: a three-note fanfare (falling when undone). */
  land(up: boolean, delayMs = 0) {
    if (!soundOn()) return;
    const notes = up ? [784, 988, 1319] : [988, 784, 587];
    notes.forEach((f, i) => tone("square", f, f, 0.07, 0.004, i === 2 ? 0.28 : 0.08, delayMs / 1000 + i * 0.09));
  },
  broom() {
    if (!soundOn()) return;
    noise("bandpass", 700, 0.8, 0.18, 0.08, 1.1, 2600);
  },
};
