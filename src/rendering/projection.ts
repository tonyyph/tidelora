/**
 * Pinhole projection from the water plane (x lateral metres, z metres out from
 * the angler) to screen pixels. The camera stands EYE_M above the water.
 * Pure and worklet-safe, so both the JS adapter and Skia derived values can use it.
 */
export const EYE_M = 1.6;
/** The nearest distance visible at the bottom edge. */
const NEAR_Z = 2.6;

export type View = { width: number; height: number; horizon: number; focal: number };

export function makeView(width: number, height: number): View {
  'worklet';
  const horizon = Math.round(height * 0.4);
  const focal = ((height - horizon) * NEAR_Z) / EYE_M;
  return { width, height, horizon, focal };
}

export function project(v: View, x: number, z: number, y = 0): { sx: number; sy: number; scale: number } {
  'worklet';
  const zz = Math.max(z, 0.5);
  const scale = v.focal / zz;
  return { sx: v.width / 2 + x * scale, sy: v.horizon + (EYE_M - y) * scale, scale };
}

/** Inverse for a point on the water: screen y → distance, screen x → lateral. */
export function unproject(v: View, sx: number, sy: number): { x: number; z: number } {
  'worklet';
  const dy = Math.max(sy - v.horizon, 1);
  const z = (v.focal * EYE_M) / dy;
  return { x: ((sx - v.width / 2) * z) / v.focal, z };
}
