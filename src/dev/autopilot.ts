import { SPECIES_TUNING } from '../ecology/species';
import type { FishingRuntime } from '../fishing/runtime';

/** Development only: plays a fight the way the balance tests' skilled angler does. */
export function autopilot(rt: FishingRuntime, opts: { strike: boolean; fight: boolean; net: boolean }) {
  const id = setInterval(() => {
    const s = rt.session;
    if (s.phase === 'hookWindow' && opts.strike) rt.input({ type: 'strike' });
    if (s.phase === 'fighting' && s.fish && opts.fight) {
      const limit = Math.min(s.config.loadout.line.strengthKgf, SPECIES_TUNING[s.fish.individual.speciesId].mouthHold);
      rt.input({ type: 'drag', level: Math.min(0.9, (limit * 0.55) / s.config.loadout.reel.dragMaxKgf) });
      rt.input({ type: 'reel', on: s.fight.tension < limit * 0.5 });
      rt.input({ type: 'steer', dir: -s.fish.heading });
    }
    if (s.phase === 'landing' && opts.net) rt.input({ type: 'net' });
    if (['catchResult', 'lineBroken', 'fishEscaped', 'snagged', 'missedHook', 'baitLost'].includes(s.phase)) clearInterval(id);
  }, 50);
  return () => clearInterval(id);
}
