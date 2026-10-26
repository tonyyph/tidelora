import { SPECIES_TUNING } from '../ecology/species';
import { BAU_SEN } from '../ecology/locations';
import type { BaitId } from '../ecology/types';
import { STARTER_LOADOUT, resolveLoadout, type Loadout } from '../gear/catalog';
import { STEP } from '../simulation/fixedStep';
import { apply, createSession, step, type Phase, type Session, type SessionConfig } from '../fishing/session';

export function config(over: Partial<Omit<SessionConfig, "loadout">> & { loadout?: Loadout } = {}): SessionConfig {
  const { loadout, ...rest } = over;
  return {
    location: BAU_SEN,
    loadout: resolveLoadout(loadout ?? STARTER_LOADOUT),
    method: 'float',
    bait: 'worm' as BaitId,
    baitDepthM: 0.9,
    assist: false,
    tutorial: false,
    ...rest,
  };
}

export function runUntil(s: Session, pred: (s: Session) => boolean, maxSeconds = 120, policy?: (s: Session) => void) {
  const steps = Math.round(maxSeconds / STEP);
  for (let i = 0; i < steps; i++) {
    if (pred(s)) return true;
    policy?.(s);
    step(s, STEP);
  }
  return pred(s);
}

/** Aim at a lateral direction and power, then cast and wait for a take. */
export function castAndWaitForBite(s: Session, dir: number, power: number) {
  apply(s, { type: 'aim', dir, power });
  apply(s, { type: 'cast' });
  return runUntil(s, (x) => x.phase === 'hookWindow' || x.phase === 'baitLost', 200);
}

const DONE: Phase[] = ['catchResult', 'fishEscaped', 'lineBroken', 'snagged'];

/** A careful angler: reels when tension is comfortable, eases off near limits, steers against runs. */
export function skilledFight(s: Session) {
  return runUntil(
    s,
    (x) => DONE.includes(x.phase),
    240,
    (x) => {
      if (x.phase === 'landing') {
        apply(x, { type: 'net' });
        return;
      }
      if (x.phase !== 'fighting' || !x.fish) return;
      const limit = Math.min(x.config.loadout.line.strengthKgf, speciesHold(x));
      const t = x.fight.tension;
      apply(x, { type: 'drag', level: Math.min(0.9, (limit * 0.55) / x.config.loadout.reel.dragMaxKgf) });
      apply(x, { type: 'reel', on: t < limit * 0.5 });
      apply(x, { type: 'steer', dir: -x.fish.heading });
    },
  );
}

function speciesHold(s: Session) {
  return SPECIES_TUNING[s.fish!.individual.speciesId].mouthHold;
}

export function newSession(seed: number, over: Partial<Omit<SessionConfig, "loadout">> & { loadout?: Loadout } = {}) {
  return createSession(seed, config(over));
}
