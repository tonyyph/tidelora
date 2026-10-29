import { BlurMask, Canvas, Group, Oval, useClock } from '@shopify/react-native-skia';
import { Image, View } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';

import type { Recipe } from '../../cooking/recipes';
import { ART, artAspect, DISH_ART } from '../art';

/** A painted dish with a soft contact shadow; `steam` (0..1) adds rising wisps drawn in code. */
export function DishArt({ kind, width, steam = 0 }: { kind: Recipe['dish']; width: number; steam?: number }) {
  const id = DISH_ART[kind];
  const height = width * artAspect(id);
  return (
    <View style={{ width, height }}>
      <View style={{ position: 'absolute', left: width * 0.1, right: width * 0.1, bottom: -height * 0.03, height: height * 0.16, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.38)' }} />
      <Image source={ART[id]} style={{ width, height }} resizeMode="contain" accessibilityIgnoresInvertColors />
      {steam > 0 && <Steam width={width} height={height} strength={steam} />}
    </View>
  );
}

const WISPS = [
  { x: 0.38, phase: 0 },
  { x: 0.52, phase: 0.37 },
  { x: 0.64, phase: 0.71 },
];

function Steam({ width, height, strength }: { width: number; height: number; strength: number }) {
  const clock = useClock();
  const rise = height * 0.9;
  return (
    <Canvas style={{ position: 'absolute', left: 0, top: -rise * 0.7, width, height: rise }} pointerEvents="none">
      {WISPS.map((w, i) => (
        <Wisp key={i} clock={clock} x={width * w.x} phase={w.phase} rise={rise} size={width * 0.09} strength={strength} />
      ))}
    </Canvas>
  );
}

function Wisp({ clock, x, phase, rise, size, strength }: { clock: ReturnType<typeof useClock>; x: number; phase: number; rise: number; size: number; strength: number }) {
  const k = useDerivedValue(() => ((clock.value / 2600 + phase) % 1));
  const rect = useDerivedValue(() => {
    const t = k.value;
    const s = size * (0.7 + t * 0.9);
    return { x: x - s / 2 + Math.sin(t * 6 + phase * 9) * size * 0.35, y: rise * (0.95 - t * 0.85) - s, width: s, height: s * 2.2 };
  });
  const opacity = useDerivedValue(() => Math.sin(k.value * Math.PI) * 0.22 * strength);
  return (
    <Group opacity={opacity}>
      <Oval rect={rect} color="#FFFFFF">
        <BlurMask blur={size * 0.45} style="normal" />
      </Oval>
    </Group>
  );
}
