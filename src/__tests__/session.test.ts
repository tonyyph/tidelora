import { SPECIES_IDS } from '../ecology/species';
import { STARTER_LOADOUT } from '../gear/catalog';
import { apply, aimTarget, createSession, step, TRANSITIONS, type Phase, type Session } from '../fishing/session';
import { STEP } from '../simulation/fixedStep';
import { castAndWaitForBite, config, newSession, runUntil, skilledFight } from './helpers';

function trace(s: Session) {
  const phases: Phase[] = [];
  const orig = s.events.push.bind(s.events);
  s.events.push = (...e) => {
    for (const ev of e) if (ev.type === 'phase') phases.push(ev.to);
    return orig(...e);
  };
  return phases;
}

describe('fishing state machine', () => {
  it('walks the full path aiming → … → catchResult through legal edges only', () => {
    const s = newSession(11, { tutorial: true });
    const phases = trace(s);
    expect(castAndWaitForBite(s, -0.5, 0.6)).toBe(true);
    expect(s.phase).toBe('hookWindow');
    apply(s, { type: 'strike' });
    expect(s.phase).toBe('fighting');
    skilledFight(s);
    expect(s.phase).toBe('catchResult');
    expect(phases).toEqual(expect.arrayContaining(['casting', 'settling', 'waiting', 'investigating', 'nibbling', 'hookWindow', 'fighting', 'landing', 'catchResult']));
    let prev: Phase = 'aiming';
    for (const p of phases) {
      expect(TRANSITIONS[prev]).toContain(p);
      prev = p;
    }
    expect(s.result?.individual.weightKg).toBeGreaterThan(0);
  });

  it('never jumps from waiting straight to a catch', () => {
    for (const to of TRANSITIONS.waiting) expect(to).not.toBe('catchResult');
  });

  it('striking with no fish on keeps the float out and explains why', () => {
    const s = newSession(5);
    apply(s, { type: 'cast' });
    runUntil(s, (x) => x.phase === 'waiting');
    apply(s, { type: 'strike' });
    expect(s.phase).toBe('waiting');
    const hint = s.events.find((e) => e.type === 'falseStrike');
    expect(hint && hint.type === 'falseStrike' && hint.text).toMatch(/phao/i);
  });

  it('ignoring the take loses the bait', () => {
    const s = newSession(9);
    castAndWaitForBite(s, 0, 0.5);
    runUntil(s, (x) => x.phase !== 'hookWindow', 10);
    expect(s.phase).toBe('baitLost');
    expect(s.events.some((e) => e.type === 'baitUsed')).toBe(true);
  });

  it('is deterministic for the same seed and inputs', () => {
    const play = () => {
      const s = newSession(1234, { tutorial: true });
      castAndWaitForBite(s, 0.3, 0.7);
      apply(s, { type: 'strike' });
      skilledFight(s);
      return JSON.stringify({ phase: s.phase, result: s.result, time: s.time.toFixed(4), rng: s.rng.s });
    };
    expect(play()).toEqual(play());
  });

  it('a tap-spam reel barely moves the fish; holding reels it in', () => {
    const run = (hold: boolean) => {
      const s = newSession(77, { tutorial: true });
      castAndWaitForBite(s, 0, 0.6);
      apply(s, { type: 'strike' });
      const start = s.fight.lineM;
      for (let i = 0; i < 180 && s.phase === 'fighting'; i++) {
        apply(s, { type: 'reel', on: hold ? true : i % 2 === 0 });
        if (!hold) apply(s, { type: 'reel', on: false });
        step(s, STEP);
      }
      return start - s.fight.lineM;
    };
    expect(run(true)).toBeGreaterThan(run(false) + 0.5);
  });

  it('cranking the drag to max on light line snaps it against a strong fish', () => {
    let broke = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const s = newSession(seed, { bait: 'shrimp', tutorial: true, loadout: { ...STARTER_LOADOUT, hook: 'hook-4', rod: 'rod-carbon', reel: 'reel-2500' } });
      apply(s, { type: 'aim', dir: 0.7, power: 0.8 });
      apply(s, { type: 'cast' });
      runUntil(s, (x) => x.phase === 'hookWindow', 200);
      if (s.pending?.speciesId !== 'channa-striata') continue;
      apply(s, { type: 'strike' });
      apply(s, { type: 'drag', level: 1 });
      runUntil(s, (x) => x.phase !== 'fighting', 60, (x) => apply(x, { type: 'reel', on: true }));
      if (s.phase === 'lineBroken') broke++;
    }
    expect(broke).toBeGreaterThan(0);
  });

  it('a skilled angler can land every species', () => {
    const landed = new Set<string>();
    for (let seed = 1; seed <= 400 && landed.size < SPECIES_IDS.length; seed++) {
      const bait = (['worm', 'bran', 'shrimp'] as const)[seed % 3];
      const hook = bait === 'shrimp' ? 'hook-4' : 'hook-10';
      const s = newSession(seed, { bait, assist: true, loadout: { ...STARTER_LOADOUT, hook } });
      const dir = [-0.6, 0, 0.6][seed % 3];
      if (!castAndWaitForBite(s, dir, 0.75) || s.phase !== 'hookWindow') continue;
      apply(s, { type: 'strike' });
      if ((s.phase as string) !== 'fighting') continue;
      skilledFight(s);
      if ((s.phase as string) === 'catchResult') landed.add(s.result!.individual.speciesId);
    }
    expect([...landed].sort()).toEqual(SPECIES_IDS.slice().sort());
  });

  it('gear changes the game: the carbon rod casts farther and scatters less', () => {
    const bamboo = config();
    const carbon = config({ loadout: { ...STARTER_LOADOUT, rod: 'rod-carbon' } });
    expect(aimTarget(carbon, 0, 1).z).toBeGreaterThan(aimTarget(bamboo, 0, 1).z + 5);
    const spread = (c: typeof bamboo) => {
      const xs: number[] = [];
      for (let seed = 0; seed < 60; seed++) {
        const s = createSession(seed, c);
        apply(s, { type: 'aim', dir: 0, power: 0.5 });
        apply(s, { type: 'cast' });
        xs.push(s.landing.x);
      }
      const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
      return Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
    };
    expect(spread(carbon)).toBeLessThan(spread(bamboo));
  });

  it('ignores inputs that do not belong to the current phase', () => {
    const s = newSession(2);
    apply(s, { type: 'net' });
    apply(s, { type: 'strike' });
    apply(s, { type: 'reel', on: true });
    expect(s.phase).toBe('aiming');
    expect(s.fight.reeling).toBe(false);
  });
});
