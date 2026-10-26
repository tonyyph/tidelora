/**
 * Ecology data model. Biological facts (SpeciesBio) are kept apart from game
 * balance (SpeciesTuning) so either can change without touching the other.
 */

export type Certainty = 'verified' | 'approximate' | 'unknown';
export type Salinity = 'fresh' | 'brackish' | 'marine';
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';
export type FeedingZone = 'surface' | 'mid' | 'bottom';
export type MethodId = 'float' | 'bottom' | 'lure' | 'trap';
export type BaitId = 'worm' | 'bran' | 'shrimp';
export type CoverType = 'open' | 'lotus' | 'roots' | 'reeds' | 'deep';
export type Substrate = 'mud' | 'sand' | 'peat' | 'rock';

export type Sourced<T> = { value: T; certainty: Certainty; note?: string };

export type SourceRef = { id: string; title: string; url: string; accessed: string };

export type SpeciesBio = {
  id: string;
  nameVi: string;
  nameEn: string;
  scientific: string;
  family: string;
  group: 'fish' | 'crustacean' | 'cephalopod';
  /** Native or established distribution, as stated by the sources. */
  distribution: string;
  /** Region ids the game allows this species in (hard constraint). */
  regions: string[];
  habitat: string;
  salinity: Sourced<Salinity[]>;
  depthM: Sourced<{ min: number; max: number | null; usual?: [number, number] }>;
  tempC: Sourced<{ min: number; max: number }>;
  activity: Sourced<TimeOfDay[]>;
  diet: Sourced<string>;
  feedingZone: Sourced<FeedingZone[]>;
  lengthCm: Sourced<{ common: number | null; max: number; measure: 'TL' | 'SL' }>;
  maxWeightKg: Sourced<number | null>;
  /** Length-weight W(g) = a * L(cm)^b. */
  lengthWeight: Sourced<{ a: number; b: number }>;
  bodyForm: string;
  features: string[];
  movement: string;
  /** Verified behaviour, in plain language, kept apart from game simplifications. */
  behaviourVerified: string[];
  airBreather: boolean;
  sources: string[];
};

export type FightModeId = 'run' | 'shake' | 'dive' | 'cover' | 'thrash' | 'flutter' | 'rest' | 'turn';

export type FightMode = {
  id: FightModeId;
  /** Pull multiplier on the fish's base pull. */
  pull: number;
  /** Direction: +1 away from angler, 0 sideways only, -1 toward. */
  away: number;
  /** Sideways heading change per second. */
  sideways: number;
  /** Seconds, [min, max]. */
  duration: [number, number];
  /** Selection weight while stamina is high / low. */
  weightFresh: number;
  weightTired: number;
  /** Pull oscillation (head shakes) in Hz, 0 = steady. */
  shakeHz: number;
  surface?: boolean;
};

export type BitePattern = {
  /** How the float reads while a fish investigates and nibbles. Game simplification. */
  style: 'jiggle' | 'lift' | 'slide' | 'plunge';
  nibbles: [number, number];
  nibbleDepth: number;
  /** Seconds the real take lasts before the fish drops the bait. */
  window: [number, number];
  /** Chance the fish wanders off while investigating, before wariness. */
  leaveChance: number;
};

export type SpeciesTuning = {
  id: string;
  methods: MethodId[];
  bait: Partial<Record<BaitId, number>>;
  /** Preference per cover type, 0..1. */
  cover: Partial<Record<CoverType, number>>;
  /** Base encounter weight; rarity comes from conditions, not from this alone. */
  baseWeight: number;
  wariness: number;
  /** Game size distribution for this location type (not the biological max). */
  size: { meanCm: number; sdCm: number; minCm: number; maxCm: number };
  /** kgf pulled per kg^0.7 of body weight at full stamina. */
  power: number;
  endurance: number;
  /** Max steady tension (kgf) before the hook tears out of the mouth. */
  mouthHold: number;
  /** Which hook sizes hold well: small, medium, large. */
  hookFit: Record<'small' | 'large', number>;
  modes: FightMode[];
  bite: BitePattern;
  pricePerKg: number;
  recipeTags: string[];
  /** Simplifications this tuning makes, for the journal's "game note". */
  gameNotes: string[];
};

export type Microhabitat = {
  id: string;
  nameVi: string;
  cover: CoverType;
  depthM: number;
  substrate: Substrate;
  snagRisk: number;
  /** Region on the water plane: lateral metres and distance metres. */
  area: { x: [number, number]; z: [number, number] };
};

export type Location = {
  id: string;
  nameVi: string;
  regionId: string;
  regionRef: string;
  waterbody: string;
  salinity: Sourced<{ kind: Salinity; ppt: [number, number] }>;
  waterTempC: Sourced<number>;
  depthM: Sourced<[number, number]>;
  clarity: Sourced<string>;
  current: string;
  substrate: string;
  shelter: string[];
  weather: { id: 'mist-calm'; nameVi: string; windMs: number; windDir: number };
  time: TimeOfDay;
  clockStart: number;
  tide: null;
  species: string[];
  methods: MethodId[];
  microhabitats: Microhabitat[];
  unlock: { kind: 'start' };
};
