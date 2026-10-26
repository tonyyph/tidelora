/**
 * Fixed-timestep accumulator. Frame time is clamped so returning from the
 * background never triggers a long catch-up loop: at most MAX_STEPS run per frame
 * and the rest is dropped, which pauses the world rather than fast-forwarding it.
 */
export const STEP = 1 / 60;
const MAX_FRAME = 0.1;
const MAX_STEPS = 6;

export type Accumulator = { acc: number };

export function advance(accumulator: Accumulator, frameSeconds: number, step: (dt: number) => void): number {
  accumulator.acc += Math.min(Math.max(frameSeconds, 0), MAX_FRAME);
  let steps = 0;
  while (accumulator.acc >= STEP && steps < MAX_STEPS) {
    step(STEP);
    accumulator.acc -= STEP;
    steps++;
  }
  if (steps === MAX_STEPS) accumulator.acc = 0;
  return steps;
}
