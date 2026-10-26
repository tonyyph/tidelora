import { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { BAU_SEN } from '../../ecology/locations';
import { STARTER_LOADOUT, resolveLoadout } from '../../gear/catalog';
import { FishingRuntime } from '../../fishing/runtime';
import { createSession } from '../../fishing/session';
import { hashSeed } from '../../simulation/rng';
import { useGame } from '../../state/gameStore';
import { makeView } from '../projection';
import { emptyFrame } from '../sceneFrame';
import { BauSenScene } from './BauSenScene';

let attractRuns = 0;

/**
 * The scene with a quiet "attract" session: the float sits out by the lotus and
 * fish come and nibble, but nobody strikes. Used behind menus.
 */
export function LiveBackdrop() {
  const { width, height } = useWindowDimensions();
  const frame = useSharedValue(emptyFrame());
  const settings = useGame((s) => s.settings);
  const [runtime] = useState(() => {
    attractRuns += 1;
    const session = createSession(hashSeed(`attract-${attractRuns}`), {
      location: BAU_SEN,
      loadout: resolveLoadout(STARTER_LOADOUT),
      method: 'float',
      bait: 'worm',
      baitDepthM: 0.9,
      assist: false,
      tutorial: false,
    });
    return new FishingRuntime(session, makeView(width, height), frame);
  });

  useEffect(() => runtime.setView(makeView(width, height)), [runtime, width, height]);

  useEffect(() => {
    const recast = () => {
      runtime.input({ type: 'reset' });
      runtime.input({ type: 'aim', dir: -0.42, power: 0.55 });
      runtime.input({ type: 'cast' });
    };
    runtime.setListeners({
      onPhase: (phase) => {
        if (phase === 'hookWindow') setTimeout(() => runtime.input({ type: 'retrieve' }), 900);
        if (phase === 'aiming' || phase === 'baitLost') setTimeout(recast, 1200);
      },
    });
    runtime.start();
    recast();
    return () => runtime.stop();
  }, [runtime]);

  return <BauSenScene width={width} height={height} frame={frame} quality={settings.quality} reducedMotion={settings.reducedMotion} />;
}
