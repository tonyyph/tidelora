import { endTrip, keepPending, landCatch, startTrip } from '../inventory/catches';
import { newSave } from '../persistence/schema';
import { nextGoal, nextTip } from '../progression/goals';

describe('goals', () => {
  it('points a new player at the cheapest useful upgrade first', () => {
    const g = nextGoal(newSave(0))!;
    expect(g.gearId).toBe('hook-4');
    expect(g.ready).toBe(true);
  });

  it('moves up the ladder as gear is bought and ends when everything is owned', () => {
    const s = { ...newSave(0), money: 100, ownedGear: [...newSave(0).ownedGear, 'hook-4', 'cooler-ice'] };
    const g = nextGoal(s)!;
    expect(g.gearId).toBe('rod-carbon');
    expect(g.ready).toBe(false);
    const all = { ...s, ownedGear: [...s.ownedGear, 'rod-carbon', 'line-028', 'reel-2500', 'float-balsa'] };
    expect(nextGoal(all)).toBeNull();
  });

  it('suggests hunting snakehead once the big hook is owned', () => {
    const s = { ...newSave(0), ownedGear: [...newSave(0).ownedGear, 'hook-4'] };
    expect(nextTip(s)).toMatch(/cá lóc/);
  });

  it('endTrip reports exactly the fish carried home, for the trip summary', () => {
    let s = startTrip(newSave(0), 'bau-sen');
    if (!s.ok) throw new Error();
    let save = s.save;
    for (let i = 0; i < 3; i++) {
      const a = landCatch(save, { individual: { speciesId: 'anabas-testudineus', weightKg: 0.03, lengthCm: 12 }, spotId: 'lotus', method: 'float', condition: 'good', fightSeconds: 9 }, 'worm', 'bau-sen');
      if (!a.ok) throw new Error();
      const k = keepPending(a.save);
      if (!k.ok) throw new Error();
      save = k.save;
    }
    const home = endTrip(save);
    if (!home.ok) throw new Error();
    expect(home.movedIds).toHaveLength(3);
    expect(home.movedIds.every((id) => home.save.catches.find((c) => c.id === id)?.store === 'home')).toBe(true);
    expect(nextTip(home.save)).toMatch(/3 con/);
  });
});
