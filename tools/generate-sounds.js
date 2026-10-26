/* eslint-disable */
/**
 * Synthesises every sound in assets/sounds as 16-bit mono WAV. No samples with
 * unknown rights are used. Re-run with `pnpm sounds`; never hand-edit the output.
 * All of these are placeholders until recorded or licensed audio replaces them.
 */
const fs = require('fs');
const path = require('path');

const RATE = 22050;
const OUT = path.join(__dirname, '..', 'assets', 'sounds');
fs.mkdirSync(OUT, { recursive: true });

let seed = 12345;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const white = () => rnd() * 2 - 1;

function writeWav(name, samples) {
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const gain = peak > 0.98 ? 0.98 / peak : 1;
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((s, i) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s * gain)) * 32767), 44 + i * 2));
  fs.writeFileSync(path.join(OUT, name + '.wav'), buf);
  console.log('wrote', name, (samples.length / RATE).toFixed(2) + 's');
}

const len = (sec) => Math.round(sec * RATE);
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));

/** One-pole low-pass / high-pass helpers on a buffer. */
function lowpass(x, cutoff) {
  const a = Math.exp((-2 * Math.PI * cutoff) / RATE);
  let y = 0;
  return x.map((v) => (y = (1 - a) * v + a * y));
}
function highpass(x, cutoff) {
  const lp = lowpass(x, cutoff);
  return x.map((v, i) => v - lp[i]);
}
function bandNoise(n, lo, hi) {
  return lowpass(highpass(Array.from({ length: n }, white), lo), hi);
}
/** Crossfade the tail into the head so the buffer loops without a click. */
function makeLoop(x, fadeSec) {
  const f = len(fadeSec);
  const out = x.slice(0, x.length - f);
  for (let i = 0; i < f; i++) {
    const t = i / f;
    out[i] = out[i] * t + x[x.length - f + i] * (1 - t);
  }
  return out;
}

// ── Dawn marsh ambience: lapping water, faint air, insects, sparse distant birds ──
function ambience() {
  const n = len(24);
  const air = lowpass(bandNoise(n, 60, 900), 500);
  const lap = bandNoise(n, 150, 1400);
  const insects = bandNoise(n, 3800, 6200);
  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const lapEnv = Math.pow(Math.max(0, Math.sin(t * 1.3) * Math.sin(t * 0.37 + 1)), 3);
    const insectEnv = 0.5 + 0.5 * Math.sin(t * 9.0) * Math.sin(t * 0.21);
    out[i] = air[i] * 0.35 + lap[i] * lapEnv * 0.5 + insects[i] * insectEnv * 0.05;
  }
  // Distant bird calls: short downward whistles in pairs, quiet and far apart.
  const calls = [2.1, 2.6, 7.9, 12.4, 12.8, 13.2, 18.6, 21.0];
  for (const start of calls) {
    const base = 2400 + rnd() * 900;
    const dur = 0.18 + rnd() * 0.12;
    let ph = 0;
    for (let i = 0; i < len(dur); i++) {
      const t = i / RATE;
      const f = base * (1 - 0.25 * (t / dur)) + 120 * Math.sin(t * 60);
      ph += (2 * Math.PI * f) / RATE;
      const idx = len(start) + i;
      if (idx < n) out[idx] += Math.sin(ph) * Math.sin((Math.PI * t) / dur) * 0.05;
    }
  }
  // Rare fish rise far away.
  for (const start of [5.4, 16.2]) {
    const s = lowpass(bandNoise(len(0.35), 200, 2000), 1200);
    s.forEach((v, i) => {
      const idx = len(start) + i;
      if (idx < n) out[idx] += v * env(i / RATE, 0.005, 0.07) * 0.25;
    });
  }
  return makeLoop(out, 1.5);
}

function plop(depth = 1) {
  const n = len(0.45);
  const out = new Array(n).fill(0);
  let ph = 0;
  const noise = bandNoise(n, 300, 3000);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const f = 420 * depth + 900 * Math.exp(-t * 30);
    ph += (2 * Math.PI * f) / RATE;
    out[i] = Math.sin(ph) * env(t, 0.003, 0.06) * 0.6 + noise[i] * env(t, 0.002, 0.04) * 0.5;
  }
  return out;
}

function nibble() {
  const n = len(0.16);
  const noise = bandNoise(n, 900, 4000);
  return noise.map((v, i) => {
    const t = i / RATE;
    return v * env(t, 0.002, 0.02) * 0.6 + Math.sin(2 * Math.PI * 1100 * t) * env(t, 0.002, 0.025) * 0.25;
  });
}

function whoosh() {
  const n = len(0.5);
  const noise = bandNoise(n, 400, 5000);
  return noise.map((v, i) => {
    const t = i / RATE;
    return v * Math.sin(Math.PI * Math.min(1, t / 0.45)) ** 2 * 0.7;
  });
}

function reelLoop() {
  // A ratchet click train with a soft gear hum; plays looped, rate follows retrieve speed.
  const n = len(0.6);
  const out = new Array(n).fill(0);
  const clicks = 14;
  for (let k = 0; k < clicks; k++) {
    const start = Math.floor((k / clicks) * n);
    for (let i = 0; i < len(0.012); i++) {
      const idx = start + i;
      if (idx < n) out[idx] += white() * Math.exp(-i / 40) * 0.5;
    }
  }
  for (let i = 0; i < n; i++) out[i] += Math.sin((2 * Math.PI * 180 * i) / RATE) * 0.06;
  return highpass(out, 300);
}

function dragLoop() {
  const n = len(0.5);
  const noise = bandNoise(n, 1500, 7000);
  return noise.map((v, i) => {
    const t = i / RATE;
    const buzz = Math.sign(Math.sin(2 * Math.PI * 55 * t)) * 0.5 + 0.5;
    return v * buzz * 0.55;
  });
}

function splash(size) {
  const n = len(0.5 + size * 0.6);
  const noise = bandNoise(n, 150, 5000);
  const low = lowpass(Array.from({ length: n }, white), 400);
  return noise.map((v, i) => {
    const t = i / RATE;
    const e = env(t, 0.005, 0.08 + size * 0.2);
    const burst = t < 0.25 ? 1 + Math.sin(t * 90) * 0.4 : 1;
    return (v * 0.7 + low[i] * size) * e * burst;
  });
}

function snap() {
  const n = len(0.35);
  return Array.from({ length: n }, (_, i) => {
    const t = i / RATE;
    return white() * env(t, 0.0005, 0.01) * 0.9 + Math.sin(2 * Math.PI * 1800 * t * (1 - t)) * env(t, 0.001, 0.05) * 0.4;
  });
}

function net() {
  const n = len(0.9);
  const noise = bandNoise(n, 200, 3500);
  return noise.map((v, i) => {
    const t = i / RATE;
    return v * (env(t, 0.05, 0.25) * 0.6 + (t > 0.35 ? env(t - 0.35, 0.01, 0.15) * 0.4 : 0));
  });
}

function tap() {
  // A soft wooden knock.
  const n = len(0.12);
  return Array.from({ length: n }, (_, i) => {
    const t = i / RATE;
    return (Math.sin(2 * Math.PI * 520 * t) * 0.6 + Math.sin(2 * Math.PI * 1310 * t) * 0.25) * env(t, 0.001, 0.018);
  });
}

function coins() {
  const n = len(0.6);
  const out = new Array(n).fill(0);
  [0, 0.07, 0.15].forEach((start, k) => {
    for (let i = 0; i < len(0.4); i++) {
      const t = i / RATE;
      const idx = len(start) + i;
      const f = 2600 + k * 340;
      if (idx < n) out[idx] += (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(2 * Math.PI * f * 2.76 * t)) * env(t, 0.001, 0.08) * 0.3;
    }
  });
  return out;
}

function discovery() {
  // Two soft plucked notes, a fifth apart: understated.
  const n = len(1.6);
  const out = new Array(n).fill(0);
  [[0, 523.25], [0.18, 783.99]].forEach(([start, f]) => {
    for (let i = 0; i < len(1.3); i++) {
      const t = i / RATE;
      const idx = len(start) + i;
      const v = Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 2 * t) * Math.exp(-t * 6);
      if (idx < n) out[idx] += v * env(t, 0.004, 0.45) * 0.28;
    }
  });
  return out;
}

function sizzleLoop() {
  const n = len(3);
  const noise = bandNoise(n, 2500, 9000);
  const out = noise.map((v, i) => v * (0.35 + 0.2 * Math.sin(i / 900)));
  for (let k = 0; k < 40; k++) {
    const start = Math.floor(rnd() * (n - 400));
    for (let i = 0; i < 300; i++) out[start + i] += white() * Math.exp(-i / 50) * 0.5;
  }
  return makeLoop(out, 0.3);
}

function page() {
  const n = len(0.35);
  const noise = bandNoise(n, 800, 6000);
  return noise.map((v, i) => v * Math.sin((Math.PI * i) / n) ** 3 * 0.4);
}

writeWav('amb-dawn-marsh', ambience());
writeWav('cast', whoosh());
writeWav('plop', plop(1));
writeWav('nibble', nibble());
writeWav('bite', plop(0.6));
writeWav('reel', reelLoop());
writeWav('drag', dragLoop());
writeWav('splash-small', splash(0.3));
writeWav('splash-big', splash(1));
writeWav('snap', snap());
writeWav('net', net());
writeWav('tap', tap());
writeWav('coins', coins());
writeWav('discovery', discovery());
writeWav('sizzle', sizzleLoop());
writeWav('page', page());
