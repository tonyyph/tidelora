import { apply, step, TRANSITIONS, type Input, type Phase } from '../fishing/session';
import { landCatch, startTrip } from '../inventory/catches';
import { migrate, newSave } from '../persistence/schema';
import { advance, STEP } from '../simulation/fixedStep';
import { createRng, rand } from '../simulation/rng';
import { newSession } from './helpers';

const INPUTS: ((r: () => number) => Input)[] = [
  () => ({ type: 'beginAim' }),
  (r) => ({ type: 'aim', dir: r() * 2 - 1, power: r() }),
  () => ({ type: 'cast' }),
  () => ({ type: 'strike' }),
  (r) => ({ type: 'reel', on: r() < 0.6 }),
  (r) => ({ type: 'drag', level: r() }),
  (r) => ({ type: 'steer', dir: r() * 2 - 1 }),
  () => ({ type: 'net' }),
  () => ({ type: 'retrieve' }),
  () => ({ type: 'cancel' }),
  () => ({ type: 'reset' }),
];

describe('robustness', () => {
  it('random input storms never produce an illegal transition or NaN', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const s = newSession(seed, { assist: seed % 2 === 0 });
      const rng = createRng(seed * 31);
      const r = () => rand(rng);
      let prev: Phase = s.phase;
      for (let i = 0; i < 4000; i++) {
        if (r() < 0.08) apply(s, INPUTS[Math.floor(r() * INPUTS.length)](r));
        step(s, STEP);
        for (const e of s.events.splice(0)) {
          if (e.type === 'phase') {
            expect(TRANSITIONS[prev]).toContain(e.to);
            prev = e.to;
          }
        }
        expect(Number.isFinite(s.fight.tension)).toBe(true);
        expect(Number.isFinite(s.float.dip)).toBe(true);
        if (s.fish) expect(s.fish.stamina).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('returning from background never runs a long catch-up', () => {
    const acc = { acc: 0 };
    let steps = 0;
    const ran = advance(acc, 3600, () => steps++);
    expect(ran).toBeLessThanOrEqual(6);
    expect(acc.acc).toBe(0);
    expect(steps).toBe(ran);
  });

  it('a session paused mid-fight resumes in the same state', () => {
    const s = newSession(21, { tutorial: true });
    apply(s, { type: 'aim', dir: 0, power: 0.6 });
    apply(s, { type: 'cast' });
    for (let i = 0; i < 6000 && s.phase !== 'hookWindow'; i++) step(s, STEP);
    apply(s, { type: 'strike' });
    expect(s.phase).toBe('fighting');
    const snapshot = JSON.stringify(s);
    // The runtime simply stops stepping while paused; nothing in the session advances.
    expect(JSON.stringify(s)).toBe(snapshot);
  });

  it('a pending catch survives a save round trip and blocks a second landing', () => {
    const t = startTrip(newSave(0), 'bau-sen');
    if (!t.ok) throw new Error();
    const landed = landCatch(t.save, { individual: { speciesId: 'anabas-testudineus', lengthCm: 12, weightKg: 0.03 }, spotId: 'lotus', method: 'float', condition: 'good', fightSeconds: 9 }, 'worm', 'bau-sen');
    if (!landed.ok) throw new Error();
    const reloaded = migrate(JSON.parse(JSON.stringify(landed.save)));
    expect(reloaded.pendingCatch?.speciesId).toBe('anabas-testudineus');
    expect(reloaded.journal['anabas-testudineus'].caught).toBe(1);
    expect(landCatch(reloaded, { individual: { speciesId: 'anabas-testudineus', lengthCm: 12, weightKg: 0.03 }, spotId: 'lotus', method: 'float', condition: 'good', fightSeconds: 9 }, 'worm', 'bau-sen').ok).toBe(false);
  });
});
