/**
 * Seeded, serialisable RNG (mulberry32). The whole state is one uint32, so a
 * fishing session can be saved mid-way and replayed exactly.
 */
export type Rng = { s: number };

export function createRng(seed: number): Rng {
  return { s: seed >>> 0 };
}

/** Uniform float in [0, 1). Mutates the rng. */
export function rand(rng: Rng): number {
  rng.s = (rng.s + 0x6d2b79f5) >>> 0;
  let t = rng.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function range(rng: Rng, min: number, max: number): number {
  return min + (max - min) * rand(rng);
}

export function chance(rng: Rng, p: number): boolean {
  return rand(rng) < p;
}

/** Standard normal via Box-Muller. */
export function gaussian(rng: Rng): number {
  const u = Math.max(rand(rng), 1e-9);
  const v = rand(rng);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function pickWeighted<T>(rng: Rng, items: readonly { item: T; weight: number }[]): T | null {
  const total = items.reduce((sum, i) => sum + Math.max(0, i.weight), 0);
  if (total <= 0) return null;
  let roll = rand(rng) * total;
  for (const i of items) {
    roll -= Math.max(0, i.weight);
    if (roll < 0) return i.item;
  }
  return items[items.length - 1].item;
}

/** Hash a string into a uint32 seed (FNV-1a). */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
