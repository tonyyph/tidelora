import type { ImageSourcePropType } from 'react-native';

import type { Recipe } from '../cooking/recipes';
import { ART_SIZE } from './artManifest';

/**
 * Painted art from the v1 and v3 asset packs (art/source, built by `pnpm art`).
 * Static requires only, so Metro bundles exactly these files.
 */
export const ART = {
  'bg-home-morning': require('../../assets/art/bg-home-morning.jpg'),
  'bg-fishing-lake-morning': require('../../assets/art/bg-fishing-lake-morning.jpg'),
  'bg-kitchen-interior': require('../../assets/art/bg-kitchen-interior.jpg'),
  'bg-lake-noon': require('../../assets/art/bg-lake-noon.jpg'),
  'bg-lake-dusk': require('../../assets/art/bg-lake-dusk.jpg'),
  'bg-lake-night': require('../../assets/art/bg-lake-night.jpg'),
  'bg-storage-quiet': require('../../assets/art/bg-storage-quiet.jpg'),
  'bg-tackle-workbench': require('../../assets/art/bg-tackle-workbench.jpg'),
  'fish-climbing-perch': require('../../assets/art/fish-climbing-perch.png'),
  'fish-silver-barb': require('../../assets/art/fish-silver-barb.png'),
  'fish-snakeskin-gourami': require('../../assets/art/fish-snakeskin-gourami.png'),
  'fish-striped-snakehead': require('../../assets/art/fish-striped-snakehead.png'),
  'dish-sour-fish-soup': require('../../assets/art/dish-sour-fish-soup.png'),
  'dish-braised-fish': require('../../assets/art/dish-braised-fish.png'),
  'dish-grilled-fish': require('../../assets/art/dish-grilled-fish.png'),
  'item-rod-carbon': require('../../assets/art/item-rod-carbon.png'),
  'item-earthworm': require('../../assets/art/item-earthworm.png'),
  'item-basket': require('../../assets/art/item-basket.png'),
  'item-cooler': require('../../assets/art/item-cooler.png'),
  'item-reel': require('../../assets/art/item-reel.png'),
  'float-balsa': require('../../assets/art/float-balsa.png'),
  'rod-grip-reel': require('../../assets/art/rod-grip-reel.png'),
} satisfies Record<keyof typeof ART_SIZE, ImageSourcePropType>;

export type ArtId = keyof typeof ART;

/** Height over width of a trimmed image. */
export const artAspect = (id: ArtId) => ART_SIZE[id].h / ART_SIZE[id].w;

/** Each species' side view. All sprites face left, trimmed to the fish (fins and feelers included). */
export const FISH_ART: Record<string, ArtId> = {
  'anabas-testudineus': 'fish-climbing-perch',
  'barbonymus-gonionotus': 'fish-silver-barb',
  'trichopodus-pectoralis': 'fish-snakeskin-gourami',
  'channa-striata': 'fish-striped-snakehead',
};

export const DISH_ART: Record<Recipe['dish'], ArtId> = {
  'clay-pot': 'dish-braised-fish',
  'soup-bowl': 'dish-sour-fish-soup',
  grilled: 'dish-grilled-fish',
};

/**
 * Where the far shore meets the water in the fishing painting, as a share of its
 * height. The scene lines this up with the projection's horizon so casts land on water.
 */
export const LAKE_HORIZON = 0.375;
/** The sun's x in the fishing painting, as a share of its width. */
export const LAKE_SUN_X = 0.355;

/**
 * Shop pictures, by gear id. Only items with matching art: the starter bamboo
 * pole, line, hooks and the quill float have none and fall back to an icon.
 */
export const GEAR_ART: Partial<Record<string, ArtId>> = {
  'rod-carbon': 'item-rod-carbon',
  'reel-1000': 'item-reel',
  'reel-2500': 'item-reel',
  'float-balsa': 'float-balsa',
  'cooler-basket': 'item-basket',
  'cooler-ice': 'item-cooler',
};

export type LakeArt = 'bg-fishing-lake-morning' | 'bg-lake-noon' | 'bg-lake-dusk' | 'bg-lake-night';

/**
 * The four lake paintings share one camera, so the shoreline and dock line up and
 * the scene can crossfade between them. Each holds over a span of the game clock
 * (hours) and fades into the next. `glint` is where light lies on the water
 * (share of width), its strength and colour.
 */
type LakeKey = { from: number; to: number; art: LakeArt; glintX: number; glint: number; glintRGB: [number, number, number] };
const LAKE_KEYS: LakeKey[] = [
  { from: 5.5, to: 9.5, art: 'bg-fishing-lake-morning', glintX: LAKE_SUN_X, glint: 1, glintRGB: [1, 0.88, 0.7] },
  { from: 10.5, to: 15.5, art: 'bg-lake-noon', glintX: 0.5, glint: 0.35, glintRGB: [1, 1, 0.95] },
  { from: 17, to: 18.75, art: 'bg-lake-dusk', glintX: 0.33, glint: 0.6, glintRGB: [1, 0.72, 0.68] },
  { from: 19.75, to: 4.5 + 24, art: 'bg-lake-night', glintX: 0.56, glint: 0.55, glintRGB: [0.78, 0.86, 1] },
];

export type LakeLight = { a: LakeArt; b: LakeArt; mix: number; glintX: number; glint: number; glintRGB: [number, number, number]; night: number };

/** Which paintings to show at a game minute: `a` faded towards `b` by `mix`. */
export function lakeLight(minute: number): LakeLight {
  let hr = (((minute / 60) % 24) + 24) % 24;
  if (hr < LAKE_KEYS[0].from) hr += 24;
  for (let i = 0; i < LAKE_KEYS.length; i++) {
    const k = LAKE_KEYS[i];
    const next = LAKE_KEYS[(i + 1) % LAKE_KEYS.length];
    const nextFrom = i + 1 < LAKE_KEYS.length ? next.from : next.from + 24;
    if (hr >= k.from && hr < nextFrom) {
      const m = hr < k.to ? 0 : (hr - k.to) / (nextFrom - k.to);
      const lerp = (x: number, y: number) => x + (y - x) * m;
      const isNight = (key: LakeKey) => (key.art === 'bg-lake-night' ? 1 : 0);
      return {
        a: k.art,
        b: next.art,
        mix: m,
        glintX: lerp(k.glintX, next.glintX),
        glint: lerp(k.glint, next.glint),
        glintRGB: [0, 1, 2].map((c) => lerp(k.glintRGB[c], next.glintRGB[c])) as [number, number, number],
        night: lerp(isNight(k), isNight(next)),
      };
    }
  }
  const k = LAKE_KEYS[0];
  return { a: k.art, b: k.art, mix: 0, glintX: k.glintX, glint: k.glint, glintRGB: k.glintRGB, night: 0 };
}
