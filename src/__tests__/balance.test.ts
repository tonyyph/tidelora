import { STARTER_LOADOUT } from '../gear/catalog';
import { apply } from '../fishing/session';
import { castAndWaitForBite, newSession, runUntil, skilledFight } from './helpers';

(process.env.BALANCE ? it : it.skip)('prints balance', () => {
  const stats: Record<string, Record<string, number[]>> = {};
  for (const policy of ['skilled', 'naive']) {
    for (let seed = 1; seed <= 600; seed++) {
      const bait = (['worm', 'bran', 'shrimp'] as const)[seed % 3];
      const hook = bait === 'shrimp' ? 'hook-4' : 'hook-10';
      const s = newSession(seed, { bait, loadout: { ...STARTER_LOADOUT, hook } });
      const dir = [-0.6, 0, 0.6][Math.floor(seed / 3) % 3];
      const t0 = s.time;
      if (!castAndWaitForBite(s, dir, 0.75) || s.phase !== 'hookWindow') continue;
      const wait = s.time - t0;
      apply(s, { type: 'strike' });
      const sp = s.pending!.speciesId;
      const key = `${policy}:${sp}`;
      stats[key] ??= { wait: [], fight: [] };
      stats[key].wait.push(wait);
      if ((s.phase as string) !== 'fighting') { (stats[key][s.phase] ??= []).push(1); continue; }
      const f0 = s.time;
      if (policy === 'skilled') skilledFight(s);
      else runUntil(s, (x) => !['fighting', 'landing'].includes(x.phase), 240, (x) => { apply(x, { type: 'reel', on: true }); if (x.phase === 'landing') apply(x, { type: 'net' }); });
      (stats[key][s.phase] ??= []).push(1);
      if ((s.phase as string) === 'catchResult') stats[key].fight.push(s.time - f0);
    }
  }
  const out = Object.entries(stats).map(([k, v]) => {
    const avg = (a: number[]) => (a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '-');
    const counts = Object.entries(v).filter(([n]) => n !== 'wait' && n !== 'fight').map(([n, a]) => `${n}=${a.length}`).join(' ');
    return `${k.padEnd(32)} wait ${avg(v.wait)}s fight ${avg(v.fight)}s  ${counts}`;
  });
  console.log(out.join('\n'));
});
