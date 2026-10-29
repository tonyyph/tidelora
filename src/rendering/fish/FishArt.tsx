import { BlurMask, Canvas, Oval } from '@shopify/react-native-skia';
import { Image, View } from 'react-native';

import { ART, artAspect, FISH_ART } from '../art';

type Props = { speciesId: string; width: number; shadow?: boolean };

/** A species' painted side view, `width` px = total length (snout to tail tip). */
export function FishArt({ speciesId, width, shadow = true }: Props) {
  const id = FISH_ART[speciesId];
  if (!id) return null;
  const height = width * artAspect(id);
  const sh = Math.max(6, height * 0.14);
  return (
    <View style={{ width, height }}>
      {shadow && (
        <Canvas style={{ position: 'absolute', left: 0, top: height - sh * 0.9, width, height: sh * 2 }} pointerEvents="none">
          <Oval x={width * 0.14} y={sh * 0.5} width={width * 0.7} height={sh * 0.7} color="#000000" opacity={0.3}>
            <BlurMask blur={sh * 0.45} style="normal" />
          </Oval>
        </Canvas>
      )}
      <Image source={ART[id]} style={{ width, height }} resizeMode="contain" accessibilityIgnoresInvertColors />
    </View>
  );
}

export function fishAspect(speciesId: string) {
  const id = FISH_ART[speciesId];
  return id ? artAspect(id) : 0.3;
}
