import type { BaitId } from '../ecology/types';
import type { CatchRecord } from '../fishing/session';
import { GEAR, type Cooler } from '../gear/catalog';
import { makeId, type CatchItem, type SaveGame } from '../persistence/schema';
import { advanceTime } from '../preservation/freshness';
import { recordInJournal } from '../progression/journal';

export type Tx<T = object> = ({ ok: true; save: SaveGame } & T) | { ok: false; error: string };

export const kept = (save: SaveGame) => save.catches.filter((c) => c.status === 'kept');
export const inCooler = (save: SaveGame) => kept(save).filter((c) => c.store === 'cooler');
export const atHome = (save: SaveGame) => kept(save).filter((c) => c.store === 'home');

export function coolerOf(save: SaveGame): Cooler {
  return GEAR[save.loadout.cooler] as Cooler;
}

export function coolerFree(save: SaveGame): number {
  return coolerOf(save).capacity - inCooler(save).length;
}

/**
 * Step 1 of a catch: it becomes a pending catch and the journal records it, both in
 * one save. If the app dies on the result screen the same pending catch comes back
 * on launch, so nothing is recorded or added twice.
 */
export function landCatch(save: SaveGame, record: CatchRecord, bait: BaitId, locationId: string): Tx {
  if (save.pendingCatch) return { ok: false, error: 'pending-exists' };
  const [id, s1] = makeId(save, 'c');
  const journaled = recordInJournal(s1, { ...record.individual, spotId: record.spotId }, bait);
  const s2 = advanceTime(journaled.save, 6);
  const item: CatchItem = {
    id,
    speciesId: record.individual.speciesId,
    lengthCm: record.individual.lengthCm,
    weightKg: record.individual.weightKg,
    day: s2.day,
    minute: s2.minute,
    locationId,
    spotId: record.spotId,
    method: record.method,
    condition: record.condition,
    freshness: 1,
    store: 'cooler',
    status: 'kept',
  };
  return {
    ok: true,
    save: { ...s2, pendingCatch: { ...item, bait, isNewSpecies: journaled.isNew, isRecord: journaled.isRecord } },
  };
}

/** Step 2a: keep it in the cooler. Fails without side effects when the cooler is full. */
export function keepPending(save: SaveGame): Tx {
  const p = save.pendingCatch;
  if (!p) return { ok: false, error: 'no-pending' };
  if (coolerFree(save) <= 0) return { ok: false, error: 'cooler-full' };
  const { bait: _bait, isNewSpecies: _n, isRecord: _r, ...item } = p;
  return { ok: true, save: { ...save, pendingCatch: null, catches: [...save.catches, item] } };
}

/** Step 2b: release it. It stays in the journal and adds a release to the species' notes. */
export function releasePending(save: SaveGame): Tx {
  const p = save.pendingCatch;
  if (!p) return { ok: false, error: 'no-pending' };
  const entry = save.journal[p.speciesId];
  return {
    ok: true,
    save: {
      ...save,
      pendingCatch: null,
      knowledge: save.knowledge + 2,
      journal: entry ? { ...save.journal, [p.speciesId]: { ...entry, released: entry.released + 1 } } : save.journal,
    },
  };
}

/** Release a kept fish later from the cooler (no knowledge bonus; it is no longer lively). */
export function releaseKept(save: SaveGame, ids: string[]): Tx<{ count: number }> {
  const set = new Set(ids);
  let count = 0;
  const catches = save.catches.map((c) => {
    if (set.has(c.id) && c.status === 'kept' && c.store === 'cooler') {
      count++;
      return { ...c, status: 'released' as const };
    }
    return c;
  });
  if (count === 0) return { ok: false, error: 'nothing-to-release' };
  return { ok: true, save: { ...save, catches }, count };
}

export function startTrip(save: SaveGame, locationId: string): Tx<{ cost: number }> {
  if (save.trip) return { ok: true, save, cost: 0 };
  const cooler = coolerOf(save);
  const cost = cooler.tripCost;
  if (save.money < cost) return { ok: false, error: 'no-money-ice' };
  const [id, s1] = makeId(save, 't');
  const s2 = advanceTime(s1, 25);
  return {
    ok: true,
    cost,
    save: {
      ...s2,
      money: s2.money - cost,
      trip: { locationId, startDay: s2.day, startMinute: s2.minute },
      stats: { ...s2.stats, trips: s2.stats.trips + 1 },
      ledger: cost > 0 ? [...s2.ledger, { id, kind: 'trip' as const, amount: -cost, day: s2.day, label: 'Đá lạnh' }].slice(-100) : s2.ledger,
    },
  };
}

/** Return home: the cooler is emptied into the home chest. Pending catches must be resolved first. */
export function endTrip(save: SaveGame): Tx<{ moved: number; movedIds: string[] }> {
  if (save.pendingCatch) return { ok: false, error: 'pending-exists' };
  if (!save.trip) return { ok: true, save, moved: 0, movedIds: [] };
  const s1 = advanceTime(save, 25);
  const movedIds: string[] = [];
  const catches = s1.catches.map((c) => {
    if (c.status === 'kept' && c.store === 'cooler') {
      movedIds.push(c.id);
      return { ...c, store: 'home' as const };
    }
    return c;
  });
  return { ok: true, moved: movedIds.length, movedIds, save: { ...s1, trip: null, catches } };
}

/** Drop finished records beyond the most recent ones so saves stay small. */
export function pruneHistory(save: SaveGame, keep = 120): SaveGame {
  const done = save.catches.filter((c) => c.status !== 'kept');
  if (done.length <= keep) return save;
  const drop = new Set(done.slice(0, done.length - keep).map((c) => c.id));
  return { ...save, catches: save.catches.filter((c) => !drop.has(c.id)) };
}
