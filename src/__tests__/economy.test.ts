import { autoPick, checkCook, cook } from '../cooking/cook';
import { buyBait, buyGear, catchPrice, consumeBait, sellCatches, sellDishes } from '../economy/market';
import { endTrip, keepPending, landCatch, releasePending, startTrip } from '../inventory/catches';
import { migrate, newSave, SAVE_VERSION, type SaveGame } from '../persistence/schema';
import { advanceTime, FLOOR } from '../preservation/freshness';
import type { CatchRecord } from '../fishing/session';
import { GEAR, type Cooler } from '../gear/catalog';

const rec = (speciesId: string, weightKg: number, lengthCm = 20): CatchRecord => ({
  individual: { speciesId, weightKg, lengthCm },
  spotId: 'lotus',
  method: 'float',
  condition: 'good',
  fightSeconds: 12,
});

function withCatches(records: CatchRecord[], save = newSave(0)): SaveGame {
  let s = startTrip(save, 'bau-sen');
  if (!s.ok) throw new Error(s.error);
  let cur = s.save;
  for (const r of records) {
    const a = landCatch(cur, r, 'worm', 'bau-sen');
    if (!a.ok) throw new Error(a.error);
    const b = keepPending(a.save);
    if (!b.ok) throw new Error(b.error);
    cur = b.save;
  }
  const home = endTrip(cur);
  if (!home.ok) throw new Error(home.error);
  return home.save;
}

describe('catch lifecycle', () => {
  it('a pending catch is recorded once; landing again while pending is refused', () => {
    const s = startTrip(newSave(0), 'bau-sen');
    if (!s.ok) throw new Error();
    const a = landCatch(s.save, rec('anabas-testudineus', 0.03), 'worm', 'bau-sen');
    if (!a.ok) throw new Error();
    expect(a.save.journal['anabas-testudineus'].caught).toBe(1);
    expect(landCatch(a.save, rec('anabas-testudineus', 0.03), 'worm', 'bau-sen').ok).toBe(false);
    expect(a.save.catches).toHaveLength(0);
    const k = keepPending(a.save);
    if (!k.ok) throw new Error();
    expect(k.save.catches).toHaveLength(1);
    expect(keepPending(k.save).ok).toBe(false);
  });

  it('release keeps the journal record and adds knowledge without adding inventory', () => {
    const s = startTrip(newSave(0), 'bau-sen');
    if (!s.ok) throw new Error();
    const a = landCatch(s.save, rec('trichopodus-pectoralis', 0.07), 'bran', 'bau-sen');
    if (!a.ok) throw new Error();
    const r = releasePending(a.save);
    if (!r.ok) throw new Error();
    expect(r.save.catches).toHaveLength(0);
    expect(r.save.journal['trichopodus-pectoralis']).toMatchObject({ caught: 1, released: 1 });
    expect(r.save.knowledge).toBeGreaterThan(a.save.knowledge);
  });

  it('a full cooler refuses to keep instead of overfilling', () => {
    const recs = Array.from({ length: (GEAR['cooler-basket'] as Cooler).capacity }, () => rec('anabas-testudineus', 0.03));
    let save = withCatches([]);
    const t = startTrip(save, 'bau-sen');
    if (!t.ok) throw new Error();
    save = t.save;
    for (const r of recs) {
      const a = landCatch(save, r, 'worm', 'bau-sen');
      if (!a.ok) throw new Error();
      const k = keepPending(a.save);
      if (!k.ok) throw new Error(k.error);
      save = k.save;
    }
    const extra = landCatch(save, rec('anabas-testudineus', 0.03), 'worm', 'bau-sen');
    if (!extra.ok) throw new Error();
    expect(keepPending(extra.save)).toEqual({ ok: false, error: 'cooler-full' });
  });

  it('catches snakehead unlocks nướng trui', () => {
    const s = withCatches([rec('channa-striata', 0.5, 36)]);
    expect(s.recipesUnlocked).toContain('nuong-trui');
  });
});

describe('selling', () => {
  it('pays each fish exactly once, even when the same ids are sold twice', () => {
    const s = withCatches([rec('barbonymus-gonionotus', 0.3), rec('anabas-testudineus', 0.04)]);
    const ids = s.catches.map((c) => c.id);
    const first = sellCatches(s, [...ids, ids[0]]);
    if (!first.ok) throw new Error();
    expect(first.earned).toBe(s.catches.reduce((sum, c) => sum + catchPrice(c), 0));
    expect(sellCatches(first.save, ids).ok).toBe(false);
    expect(first.save.money).toBe(s.money + first.earned);
  });

  it('cannot sell fish still in the cooler (sell at home)', () => {
    let s = startTrip(newSave(0), 'bau-sen');
    if (!s.ok) throw new Error();
    const a = landCatch(s.save, rec('barbonymus-gonionotus', 0.3), 'worm', 'bau-sen');
    if (!a.ok) throw new Error();
    const k = keepPending(a.save);
    if (!k.ok) throw new Error();
    expect(sellCatches(k.save, [k.save.catches[0].id]).ok).toBe(false);
  });

  it('money never goes negative and bait never below zero', () => {
    const broke = { ...newSave(0), money: 3 };
    expect(buyBait(broke, 'shrimp').ok).toBe(false);
    expect(buyGear(broke, 'rod-carbon').ok).toBe(false);
    const empty = { ...newSave(0), baitStock: { worm: 0, bran: 0, shrimp: 0 } };
    expect(consumeBait(empty, 'shrimp').baitStock.shrimp).toBe(0);
    expect(buyGear(newSave(0), 'rod-bamboo')).toEqual({ ok: false, error: 'owned' });
  });
});

describe('cooking', () => {
  it('consumes exactly the chosen fish and pantry, and creates one lot', () => {
    const s = withCatches([rec('anabas-testudineus', 0.08), rec('trichopodus-pectoralis', 0.09), rec('barbonymus-gonionotus', 0.3)]);
    const ids = s.catches.filter((c) => c.speciesId !== 'barbonymus-gonionotus').map((c) => c.id);
    const r = cook(s, 'kho-to', ids);
    if (!r.ok) throw new Error(r.error);
    expect(r.save.pantry).toBe(s.pantry - 1);
    expect(r.save.catches.filter((c) => c.status === 'cooked').map((c) => c.id).sort()).toEqual(ids.sort());
    expect(r.save.catches.find((c) => c.speciesId === 'barbonymus-gonionotus')!.status).toBe('kept');
    expect(r.save.dishes).toHaveLength(1);
    expect(r.lot.portions).toBe(Math.floor((0.17 * 0.7) / 0.05));
  });

  it('refuses reuse, duplicates, wrong species and missing pantry without changing anything', () => {
    const s = withCatches([rec('channa-striata', 0.5, 36), rec('anabas-testudineus', 0.2)]);
    const [snake, perch] = s.catches.map((c) => c.id);
    expect(checkCook(s, 'nuong-trui', [perch])).toEqual({ ok: false, error: 'incompatible' });
    expect(checkCook(s, 'canh-chua', [snake, snake])).toEqual({ ok: false, error: 'duplicate' });
    expect(checkCook({ ...s, pantry: 0 }, 'canh-chua', [snake])).toEqual({ ok: false, error: 'no-pantry' });
    const once = cook(s, 'nuong-trui', [snake]);
    if (!once.ok) throw new Error();
    expect(cook(once.save, 'canh-chua', [snake])).toEqual({ ok: false, error: 'unavailable' });
  });

  it('a dish sells once, and cooking is not always better than selling raw', () => {
    const s = withCatches([rec('channa-striata', 0.36, 33)]);
    const raw = catchPrice(s.catches[0]);
    const c = cook(s, 'nuong-trui', s.catches.map((x) => x.id));
    if (!c.ok) throw new Error();
    const sold = sellDishes(c.save, [c.lot.id]);
    if (!sold.ok) throw new Error();
    expect(sellDishes(sold.save, [c.lot.id]).ok).toBe(false);
    // A small snakehead loses value as a single dish once pantry cost is counted.
    expect(sold.earned - 5).toBeLessThan(raw * 1.4);
  });

  it('autoPick only picks compatible home fish', () => {
    const s = withCatches([rec('channa-striata', 0.5, 36), rec('anabas-testudineus', 0.2)]);
    expect(autoPick(s, 'kho-to').map((id) => s.catches.find((c) => c.id === id)!.speciesId)).toEqual(['anabas-testudineus']);
  });
});

describe('freshness and time', () => {
  it('ages on game time only and bottoms out instead of spoiling', () => {
    const s = withCatches([rec('anabas-testudineus', 0.05)]);
    const later = advanceTime(s, 60 * 24 * 30);
    expect(later.catches[0].freshness).toBe(FLOOR);
    expect(later.day).toBeGreaterThan(s.day);
  });
});

describe('persistence', () => {
  it('round-trips through JSON', () => {
    const s = withCatches([rec('anabas-testudineus', 0.05)]);
    expect(migrate(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  it('migrates a v0 save and rejects newer versions', () => {
    const v0 = { money: 99, day: 3 };
    const m = migrate(v0);
    expect(m.version).toBe(SAVE_VERSION);
    expect(m.money).toBe(99);
    expect(m.pantry).toBe(2);
    expect(() => migrate({ version: SAVE_VERSION + 1 })).toThrow();
  });
});
