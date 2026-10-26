import { RECIPES, PANTRY_PRICE } from '../cooking/recipes';
import { SPECIES_TUNING } from '../ecology/species';
import type { BaitId } from '../ecology/types';
import { BAITS, GEAR, type GearSlot } from '../gear/catalog';
import type { Tx } from '../inventory/catches';
import { makeId, type CatchItem, type DishLot, type SaveGame } from '../persistence/schema';
import { priceMultiplier } from '../preservation/freshness';

const CONDITION_MULT: Record<CatchItem['condition'], number> = { excellent: 1.05, good: 1, bruised: 0.85 };

/** Sale price in xu (the game's coin). Never below 1 for a kept fish. */
export function catchPrice(c: CatchItem): number {
  const t = SPECIES_TUNING[c.speciesId];
  return Math.max(1, Math.round(t.pricePerKg * c.weightKg * priceMultiplier(c.freshness) * CONDITION_MULT[c.condition]));
}

export function dishPrice(d: DishLot): number {
  const r = RECIPES[d.recipeId];
  return Math.max(1, Math.round(r.valuePerPortion * d.portions * (0.6 + 0.4 * d.quality)));
}

const log = (save: SaveGame, kind: SaveGame['ledger'][number]['kind'], amount: number, label: string): SaveGame => {
  const [id, s] = makeId(save, 'l');
  return { ...s, ledger: [...s.ledger, { id, kind, amount, day: s.day, label }].slice(-100) };
};

/** Sell kept fish at home. Each id pays once; already-sold ids are ignored. */
export function sellCatches(save: SaveGame, ids: string[]): Tx<{ earned: number; count: number }> {
  const set = new Set(ids);
  let earned = 0;
  let count = 0;
  const catches = save.catches.map((c) => {
    if (!set.has(c.id) || c.status !== 'kept' || c.store !== 'home') return c;
    earned += catchPrice(c);
    count++;
    return { ...c, status: 'sold' as const };
  });
  if (count === 0) return { ok: false, error: 'nothing-to-sell' };
  const s = log({ ...save, catches, money: save.money + earned }, 'sell-catch', earned, `Bán ${count} con cá`);
  return { ok: true, save: s, earned, count };
}

export function sellDishes(save: SaveGame, ids: string[]): Tx<{ earned: number }> {
  const set = new Set(ids);
  const sold = save.dishes.filter((d) => set.has(d.id));
  if (sold.length === 0) return { ok: false, error: 'nothing-to-sell' };
  const earned = sold.reduce((s, d) => s + dishPrice(d), 0);
  const s = log({ ...save, dishes: save.dishes.filter((d) => !set.has(d.id)), money: save.money + earned }, 'sell-dish', earned, `Bán ${sold.length} mẻ món`);
  return { ok: true, save: s, earned };
}

export function buyGear(save: SaveGame, gearId: string): Tx {
  const g = GEAR[gearId];
  if (!g) return { ok: false, error: 'unknown' };
  if (save.ownedGear.includes(gearId)) return { ok: false, error: 'owned' };
  if (save.money < g.price) return { ok: false, error: 'no-money' };
  const s = log({ ...save, money: save.money - g.price, ownedGear: [...save.ownedGear, gearId] }, 'buy', -g.price, g.nameVi);
  return { ok: true, save: s };
}

export function buyBait(save: SaveGame, bait: BaitId): Tx {
  const b = BAITS[bait];
  if (b.free) return { ok: false, error: 'free' };
  if (save.money < b.packPrice) return { ok: false, error: 'no-money' };
  const s = log(
    { ...save, money: save.money - b.packPrice, baitStock: { ...save.baitStock, [bait]: save.baitStock[bait] + b.packSize } },
    'buy',
    -b.packPrice,
    b.nameVi,
  );
  return { ok: true, save: s };
}

export function buyPantry(save: SaveGame, units = 1): Tx {
  const cost = PANTRY_PRICE * units;
  if (save.money < cost) return { ok: false, error: 'no-money' };
  return { ok: true, save: log({ ...save, money: save.money - cost, pantry: save.pantry + units }, 'buy', -cost, 'Gia vị') };
}

export function equip(save: SaveGame, gearId: string): Tx {
  const g = GEAR[gearId];
  if (!g || !save.ownedGear.includes(gearId)) return { ok: false, error: 'not-owned' };
  if (g.slot === 'cooler' && save.trip) return { ok: false, error: 'cooler-in-use' };
  return { ok: true, save: { ...save, loadout: { ...save.loadout, [g.slot as GearSlot]: gearId } } };
}

/** Bait availability: worms are always free, so a player can never be stuck without bait. */
export function baitAvailable(save: SaveGame, bait: BaitId): boolean {
  return BAITS[bait].free || save.baitStock[bait] > 0;
}

export function consumeBait(save: SaveGame, bait: BaitId): SaveGame {
  if (BAITS[bait].free) return save;
  return { ...save, baitStock: { ...save.baitStock, [bait]: Math.max(0, save.baitStock[bait] - 1) } };
}
