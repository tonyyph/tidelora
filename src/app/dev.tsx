import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { autopilot } from '../dev/autopilot';
import { rollIndividual } from '../ecology/encounter';
import { SPECIES_IDS } from '../ecology/species';
import { endTrip, keepPending, landCatch, startTrip } from '../inventory/catches';
import { createRng } from '../simulation/rng';
import { devRegistry } from '../dev/registry';
import { useGame } from '../state/gameStore';

/**
 * Development deep links, e.g.
 *   exp://127.0.0.1:8095/--/dev?new=1&to=fish
 *   exp://127.0.0.1:8095/--/dev?act=cast&dir=-0.5&power=0.6&auto=strike,fight,net
 *   exp://127.0.0.1:8095/--/dev?seed=rich&to=kitchen
 *   exp://127.0.0.1:8095/--/dev?act=cast&dir=-0.4&power=0.5&hold=hookWindow   (freeze at a phase)
 *   exp://127.0.0.1:8095/--/dev?minute=1080&to=fish   (set the clock)
 */
export default function Dev() {
  const p = useLocalSearchParams<Record<string, string>>();
  useEffect(() => {
    if (!__DEV__) {
      router.replace('/');
      return;
    }
    (async () => {
      const g = useGame.getState();
      if (p.new) await g.newGame();
      if (p.debug) g.updateSettings({ debug: p.debug === '1' });
      if (p.tutorial === 'done') g.completeTutorial();
      if (p.money) g.patch((s) => ({ ...s, money: Number(p.money) }));
      if (p.minute) g.patch((s) => ({ ...s, minute: Number(p.minute) }));
      if (p.bait) g.setBait(p.bait as never);
      if (p.depth) g.setBaitDepth(Number(p.depth));
      if (p.equip) {
        for (const id of p.equip.split(',')) {
          g.patch((s) => ({ ...s, ownedGear: s.ownedGear.includes(id) ? s.ownedGear : [...s.ownedGear, id] }));
          g.equip(id);
        }
      }
      if (p.rich) {
        g.patch((s) => {
          let cur = { ...s, money: Math.max(s.money, 700), tutorialDone: true, baitStock: { worm: 0, bran: 20, shrimp: 10 }, ownedGear: [...new Set([...s.ownedGear, 'cooler-ice'])], loadout: { ...s.loadout, cooler: 'cooler-ice' } };
          const t = startTrip(cur, 'bau-sen');
          if (t.ok) cur = t.save;
          const rng = createRng(99);
          for (const id of SPECIES_IDS) {
            for (let i = 0; i < (id === 'channa-striata' ? 1 : 2); i++) {
              const r = landCatch(cur, { individual: rollIndividual(rng, id), spotId: 'lotus', method: 'float', condition: 'good', fightSeconds: 10 }, 'worm', 'bau-sen');
              if (!r.ok) continue;
              const k = keepPending(r.save);
              if (k.ok) cur = k.save;
            }
          }
          const h = endTrip(cur);
          return h.ok ? h.save : cur;
        });
      }
      if (p.store) {
        if (p.store === 'keep') g.keep();
        if (p.store === 'release') g.release();
        devRegistry.runtime?.input({ type: 'reset' });
        if (p.store === 'home') {
          const r = g.goHome();
          if (r.ok && r.movedIds?.length) router.replace({ pathname: '/trip', params: { ids: r.movedIds.join(',') } });
          else router.replace('/home');
          return;
        }
      }
      if (p.act) {
        const rt = devRegistry.runtime;
        if (rt) {
          if (p.act === 'cast') {
            rt.input({ type: 'reset' });
            rt.input({ type: 'aim', dir: Number(p.dir ?? 0), power: Number(p.power ?? 0.5) });
            rt.input({ type: 'cast' });
          } else if (p.act === 'aim') {
            rt.input({ type: 'reset' });
            rt.input({ type: 'aim', dir: Number(p.dir ?? 0), power: Number(p.power ?? 0.5) });
          } else rt.input({ type: p.act as never });
          if (p.auto) {
            const a = p.auto.split(',');
            autopilot(rt, { strike: a.includes('strike'), fight: a.includes('fight'), net: a.includes('net') });
          }
          if (p.hold) {
            // Freeze the simulation when it reaches a phase, for screenshots of that moment.
            const id = setInterval(() => {
              if (rt.session.phase === p.hold) {
                rt.pause();
                clearInterval(id);
              }
            }, 30);
            setTimeout(() => clearInterval(id), 60000);
          }
        }
        router.back();
        return;
      }
      if (p.store) {
        router.back();
        return;
      }
      if (p.to) router.replace(`/${p.to === 'title' ? '' : p.to}` as never);
      else router.back();
    })();
  }, [p]);
  return <View style={{ flex: 1, backgroundColor: 'transparent' }} />;
}
