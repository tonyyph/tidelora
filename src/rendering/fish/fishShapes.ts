/**
 * Procedural side-view fish, facing left, in a 100-unit box where 100 = total
 * length. Outlines follow each species' body form in SPECIES_BIO; they are
 * placeholder art (see docs/ASSET_MANIFEST.md) until painted art replaces them.
 */
export type FinSpec = { d: string; color: string; alpha: number; rays?: number; stroke?: number };

export type FishShape = {
  /** Vertical extent for layout, in units. */
  top: number;
  bottom: number;
  body: string;
  caudal: FinSpec;
  fins: FinSpec[];
  /** Fins drawn behind the body (far-side pelvic/anal). */
  backFins?: FinSpec[];
  gradient: [string, string, string];
  eye: { cx: number; cy: number; r: number };
  mouth: string;
  gill: string;
  lateral?: string;
  scale: number;
  markings: { d: string; color: string; alpha: number; width?: number; fill?: boolean }[];
};

const chevrons = (from: number, to: number, step: number) => {
  let d = '';
  for (let x = from; x <= to; x += step) d += `M${x},-6 L${x + 4},0 L${x},6 `;
  return d;
};
const bars = (from: number, to: number, step: number, top: number, bottom: number, slant: number) => {
  let d = '';
  for (let x = from; x <= to; x += step) d += `M${x},${top} C${x + slant * 0.3},${top / 2} ${x + slant * 0.7},${bottom / 2} ${x + slant},${bottom} `;
  return d;
};
const dashes = (from: number, to: number, y: number) => {
  let d = '';
  let x = from;
  let i = 0;
  while (x < to) {
    const len = 3.5 + ((i * 7) % 5);
    d += `M${x},${y + ((i % 3) - 1) * 0.6} L${x + len},${y + (((i + 1) % 3) - 1) * 0.6} `;
    x += len + 2.2;
    i++;
  }
  return d;
};

export const FISH_SHAPES: Record<string, FishShape> = {
  'anabas-testudineus': {
    top: -21,
    bottom: 22,
    body: 'M2,1 C2,-6 8,-12 18,-13.5 C34,-15 60,-13 78,-6.5 L82,-5 L82,5 L78,6.5 C62,12.5 40,15 22,13 C10,11.5 3,7 2,1 Z',
    caudal: { d: 'M80,-5.5 C88,-9 97,-10 99,-4 C100.5,0 100,3 98,5.5 C95,10 87,9 80,5.5 Z', color: '#5D5F45', alpha: 0.88, rays: 9 },
    fins: [
      { d: 'M23,-13.5 L25,-19 L28,-14.5 L30,-20 L33,-15 L35,-20.5 L38,-15 L40,-20.5 L43,-15 L45,-20 L48,-14.8 L50,-19.5 L53,-14.6 L55,-19 L58,-14.3 L60,-18.5 C66,-22 75,-18 80,-6.5 L78,-6.6 C68,-11 50,-13.5 23,-13.5 Z', color: '#3F4430', alpha: 0.92 },
      { d: 'M52,13 L54,18 L57,13.5 L59,18.5 L62,13 C68,18 76,15 80,6.5 L78,6.6 C70,10 62,12 52,13 Z', color: '#474B35', alpha: 0.9 },
      { d: 'M30,12.5 C31,18 34,21 37,21 C36,17 35,14 34,13 Z', color: '#8D8C66', alpha: 0.8 },
      { d: 'M22,2 C27,0 33,2 36,6 C31,7 26,6 22,4 Z', color: '#9A9670', alpha: 0.7, rays: 5 },
    ],
    gradient: ['#4D5839', '#8A8D67', '#D2CCA9'],
    eye: { cx: 11, cy: -4, r: 3.2 },
    mouth: 'M2.4,0.6 L7,1.6',
    gill: 'M25,-11.5 C21,-4 21,5 24,11.5 M24.5,-6 L27,-7 M23.5,-1 L26.5,-1.5 M23.5,4 L26.5,4.5',
    lateral: 'M24,-8 C40,-9 58,-7 78,-3',
    scale: 3.2,
    markings: [
      { d: 'M77,0 m-3.4,0 a3.4,3.4 0 1,0 6.8,0 a3.4,3.4 0 1,0 -6.8,0', color: '#1E2116', alpha: 0.75, fill: true },
      { d: 'M28,-2 m-2.2,0 a2.2,2.2 0 1,0 4.4,0 a2.2,2.2 0 1,0 -4.4,0', color: '#1E2116', alpha: 0.6, fill: true },
      { d: bars(36, 68, 8, -12, 12, 1), color: '#2A2E1E', alpha: 0.07, width: 3 },
    ],
  },
  'barbonymus-gonionotus': {
    top: -31,
    bottom: 22,
    body: 'M2,-1 C3,-7 8,-12 16,-15 C28,-19 42,-19.5 54,-16 C66,-12 74,-7 78,-4 L78,4 C72,7 62,11 50,13.5 C36,16 20,14.5 10,9 C5,6 2,3 2,-1 Z',
    caudal: { d: 'M76,-4 C84,-8 92,-14 100,-19 C97,-10 93,-3 90,0 C93,3 97,10 100,19 C92,14 84,8 76,4 Z', color: '#C99A55', alpha: 0.85, rays: 12 },
    fins: [
      { d: 'M38,-19 L44,-31 C46,-30 47,-28 48,-26 L56,-15.5 C50,-18 44,-19 38,-19 Z', color: '#C69A5A', alpha: 0.85, rays: 7 },
      { d: 'M56,12.5 L60,20 C62,20 63,19 64,18 L68,10 Z', color: '#D3A35E', alpha: 0.85, rays: 4 },
      { d: 'M36,15 L40,22 L44,15 Z', color: '#D9A85F', alpha: 0.85 },
      { d: 'M18,4 C23,3 28,6 30,9 C25,10 21,8 18,6 Z', color: '#D8B278', alpha: 0.75, rays: 5 },
    ],
    gradient: ['#5F6E67', '#C9CEC4', '#F0EEE6'],
    eye: { cx: 10, cy: -4, r: 3.4 },
    mouth: 'M2,0 L4.6,0.8',
    gill: 'M19,-13 C16,-5 16,4 19,10',
    lateral: 'M19,-3 C40,-2 60,0 78,0',
    scale: 5,
    markings: [{ d: 'M8,-12 C30,-18 55,-16 76,-5', color: '#FFFFFF', alpha: 0.18, width: 4 }],
  },
  'trichopodus-pectoralis': {
    top: -21,
    bottom: 31,
    body: 'M3,-2 C4,-7 9,-12 18,-14 C34,-16.5 54,-15.5 70,-10 C75,-8 78,-6 82,-4 L82,4 C78,7 74,10 68,12.5 C52,17 32,17.5 18,14 C9,11.5 4,6 3,-2 Z',
    caudal: { d: 'M80,-4.5 C87,-9 94,-12 99,-12 C97,-5 96,-1 97.5,0 C96,1 97,5 99,12 C94,12 87,9 80,4.5 Z', color: '#6A6649', alpha: 0.82, rays: 10 },
    fins: [
      { d: 'M52,-15.5 C58,-21 66,-20 74,-13 L72,-11 C66,-13 60,-14.5 52,-15.5 Z', color: '#626047', alpha: 0.85, rays: 6 },
      { d: 'M30,16.5 C45,24 64,23 80,7 L78,6 C66,12 50,16 30,16.5 Z', color: '#66634A', alpha: 0.85, rays: 14 },
      { d: 'M19,2 C25,0 30,2 33,6 C28,7 23,6 19,4 Z', color: '#A49F7C', alpha: 0.6, rays: 5 },
    ],
    backFins: [{ d: 'M25,13 C32,26 60,32 95,29', color: '#7E7A5A', alpha: 0.9, stroke: 0.9 }],
    gradient: ['#5C5D44', '#8F8C6C', '#CEC7A4'],
    eye: { cx: 10, cy: -4.5, r: 3 },
    mouth: 'M3,-2.6 L6,-3.8',
    gill: 'M20,-12 C17,-4 17,5 20,12',
    scale: 2.4,
    markings: [
      { d: dashes(12, 79, 0), color: '#2C2B1D', alpha: 0.55, width: 2.2 },
      { d: bars(24, 70, 5.5, -13, 14, 7), color: '#2C2B1D', alpha: 0.16, width: 1.4 },
    ],
  },
  'channa-striata': {
    top: -11,
    bottom: 11,
    body: 'M1,0.5 C1,-3 4,-5.5 10,-6.8 C25,-8 55,-8 80,-6 L88,-4.5 L88,4.5 L80,6 C55,8 28,8.5 12,7 C5,6 1,3.5 1,0.5 Z',
    caudal: { d: 'M86,-4.8 C92,-7 98,-6.5 100,-2 C100.8,0 100.8,1 100,2.5 C98,6.5 92,7 86,4.8 Z', color: '#3E3C30', alpha: 0.9, rays: 9 },
    fins: [
      { d: 'M30,-7.9 C50,-11 75,-11 87,-5.5 L85,-5.6 C70,-8 50,-8.2 30,-7.9 Z', color: '#3F3D31', alpha: 0.9, rays: 22 },
      { d: 'M50,7.8 C64,10.5 78,10 87,5.5 L85,5.6 C72,7.5 60,8 50,7.8 Z', color: '#47453A', alpha: 0.9, rays: 14 },
      { d: 'M20,1 C25,-1 30,1 31,4 C27,6 23,5 20,3 Z', color: '#5A5848', alpha: 0.8, rays: 6 },
      { d: 'M30,7.5 C32,10 35,10.5 36,8 Z', color: '#77745F', alpha: 0.8 },
    ],
    gradient: ['#33352B', '#6B6954', '#D8D3BF'],
    eye: { cx: 7.5, cy: -2.8, r: 1.6 },
    mouth: 'M1,1 L10,2.4',
    gill: 'M18,-6.3 C15,-1 15,4 17,7',
    lateral: 'M18,-1 C40,-1.5 70,-1 88,0',
    scale: 2.6,
    markings: [
      { d: chevrons(26, 82, 7.5), color: '#1E1F18', alpha: 0.32, width: 2.4 },
      { d: 'M4,-3.5 C10,-5.5 16,-6 22,-6', color: '#1E1F18', alpha: 0.35, width: 1.4 },
    ],
  },
};
