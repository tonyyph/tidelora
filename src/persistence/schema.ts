import type { BaitId, MethodId } from '../ecology/types';
import { STARTER_GEAR, STARTER_LOADOUT, type Loadout } from '../gear/catalog';

export const SAVE_VERSION = 1;

export type CatchStatus = 'kept' | 'sold' | 'cooked' | 'released';
export type StoreArea = 'cooler' | 'home';

/** One caught animal. Never merged with others; display code may group them. */
export type CatchItem = {
  id: string;
  speciesId: string;
  lengthCm: number;
  weightKg: number;
  day: number;
  minute: number;
  locationId: string;
  spotId: string;
  method: MethodId;
  condition: 'excellent' | 'good' | 'bruised';
  /** 0..1, game-time freshness. */
  freshness: number;
  store: StoreArea;
  status: CatchStatus;
};

export type DishLot = {
  id: string;
  recipeId: string;
  portions: number;
  quality: number;
  sourceCatchIds: string[];
  day: number;
  minute: number;
};

export type JournalEntry = {
  speciesId: string;
  firstDay: number;
  caught: number;
  released: number;
  maxLengthCm: number;
  maxWeightKg: number;
  spots: string[];
  baits: BaitId[];
};

export type PendingCatch = CatchItem & { bait: BaitId; isNewSpecies: boolean; isRecord: boolean };

export type LedgerEntry = { id: string; kind: 'sell-catch' | 'sell-dish' | 'buy' | 'trip'; amount: number; day: number; label: string };

export type SaveGame = {
  version: number;
  createdAt: number;
  money: number;
  day: number;
  /** Minutes since midnight on `day`, game time. Only advances through play. */
  minute: number;
  ownedGear: string[];
  loadout: Loadout;
  bait: BaitId;
  baitDepthM: number;
  baitStock: Record<BaitId, number>;
  pantry: number;
  catches: CatchItem[];
  dishes: DishLot[];
  journal: Record<string, JournalEntry>;
  knowledge: number;
  recipesUnlocked: string[];
  recipesMastered: string[];
  tutorialDone: boolean;
  trip: { locationId: string; startDay: number; startMinute: number } | null;
  pendingCatch: PendingCatch | null;
  ledger: LedgerEntry[];
  nextId: number;
  stats: { casts: number; trips: number; dishesCooked: number };
};

export function newSave(now = Date.now()): SaveGame {
  return {
    version: SAVE_VERSION,
    createdAt: now,
    money: 60,
    day: 1,
    minute: 5 * 60 + 30,
    ownedGear: [...STARTER_GEAR],
    loadout: { ...STARTER_LOADOUT },
    bait: 'worm',
    baitDepthM: 0.9,
    baitStock: { worm: 0, bran: 10, shrimp: 0 },
    pantry: 2,
    catches: [],
    dishes: [],
    journal: {},
    knowledge: 0,
    recipesUnlocked: ['canh-chua', 'kho-to'],
    recipesMastered: [],
    tutorialDone: false,
    trip: null,
    pendingCatch: null,
    ledger: [],
    nextId: 1,
    stats: { casts: 0, trips: 0, dishesCooked: 0 },
  };
}

type Migration = (old: Record<string, unknown>) => Record<string, unknown>;

/** Migrations keyed by the version they upgrade *from*. */
export const MIGRATIONS: Record<number, Migration> = {
  // v0 was the pre-release prototype save: no pantry and no bait depth.
  0: (old) => ({ ...old, version: 1, pantry: old.pantry ?? 2, baitDepthM: old.baitDepthM ?? 0.9 }),
};

export class SaveError extends Error {}

export function migrate(raw: unknown): SaveGame {
  if (!raw || typeof raw !== 'object') throw new SaveError('Save is not an object');
  let data = raw as Record<string, unknown>;
  let version = typeof data.version === 'number' ? data.version : 0;
  if (version > SAVE_VERSION) throw new SaveError(`Save version ${version} is newer than this build`);
  while (version < SAVE_VERSION) {
    const m = MIGRATIONS[version];
    if (!m) throw new SaveError(`No migration from v${version}`);
    data = m(data);
    version = data.version as number;
  }
  // Fill any field a hand-edited or partial save is missing.
  return { ...newSave(), ...(data as Partial<SaveGame>), version: SAVE_VERSION } as SaveGame;
}

export function makeId(save: SaveGame, prefix: string): [string, SaveGame] {
  return [`${prefix}-${save.nextId}`, { ...save, nextId: save.nextId + 1 }];
}
