/**
 * The renderer's view of a fishing session: plain numbers, written once per
 * frame into a single shared value. Skia reads it on the UI thread; React never
 * re-renders for it.
 */
export type SceneFrame = {
  t: number;
  floatX: number;
  floatY: number;
  floatScale: number;
  floatDip: number;
  floatLie: number;
  floatVisible: number;
  tipX: number;
  tipY: number;
  bend: number;
  lineSag: number;
  lineToX: number;
  lineToY: number;
  lineVisible: number;
  fishX: number;
  fishY: number;
  fishLen: number;
  fishAngle: number;
  fishAlpha: number;
  aimX: number;
  aimY: number;
  aimRx: number;
  aimRy: number;
  aimVisible: number;
  /** 0..1 how close the line or hook hold is to failing. */
  danger: number;
  /** 1 while the take is on (strike now), ~0.35 while nibbling, else 0. */
  bite: number;
  /** 1 while the float sits on the water, so the close-up loupe shows. */
  loupe: number;
  /** Fight readout: which way the fish is swimming (−1 left, +1 right), its stamina, and whether it is diving for cover. */
  fishHeading: number;
  fishStamina: number;
  fishCover: number;
  /** Ripples: x, y, age, strength × 4. */
  ripples: number[];
};

export const emptyFrame = (): SceneFrame => ({
  t: 0,
  floatX: 0,
  floatY: 0,
  floatScale: 1,
  floatDip: 0,
  floatLie: 0,
  floatVisible: 0,
  tipX: 0,
  tipY: 0,
  bend: 0,
  lineSag: 1,
  lineToX: 0,
  lineToY: 0,
  lineVisible: 0,
  fishX: 0,
  fishY: 0,
  fishLen: 0,
  fishAngle: 0,
  fishAlpha: 0,
  aimX: 0,
  aimY: 0,
  aimRx: 0,
  aimRy: 0,
  aimVisible: 0,
  danger: 0,
  bite: 0,
  loupe: 0,
  fishHeading: 0,
  fishStamina: 0,
  fishCover: 0,
  ripples: new Array(16).fill(0),
});
