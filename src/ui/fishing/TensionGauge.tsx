import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import type { SceneFrame } from '../../rendering/sceneFrame';
import { T } from '../primitives';
import { C } from '../theme';

/**
 * Line tension, readable without colour: the label changes (Ổn / Căng / Sắp đứt),
 * the fill gains hatching past the warning mark and pulses near breaking.
 */
export function TensionGauge({ frame, reducedMotion }: { frame: SharedValue<SceneFrame>; reducedMotion: boolean }) {
  const fill = useAnimatedStyle(() => {
    const d = Math.min(1, frame.value.danger);
    return {
      width: `${Math.round(d * 100)}%`,
      backgroundColor: d > 0.85 ? C.warn : d > 0.6 ? C.brass : C.mist,
      opacity: d > 0.85 && !reducedMotion ? 0.65 + 0.35 * Math.abs(Math.sin(frame.value.t * 9)) : 1,
    };
  });
  const hatch = useAnimatedStyle(() => ({ opacity: frame.value.danger > 0.6 ? 0.5 : 0 }));
  const ok = useAnimatedStyle(() => ({ opacity: frame.value.danger <= 0.6 ? 1 : 0 }));
  const tight = useAnimatedStyle(() => ({ opacity: frame.value.danger > 0.6 && frame.value.danger <= 0.85 ? 1 : 0 }));
  const danger = useAnimatedStyle(() => ({ opacity: frame.value.danger > 0.85 ? 1 : 0 }));

  return (
    <View style={styles.wrap} accessibilityLabel="Độ căng dây">
      <View style={styles.labels}>
        <T kind="label">Độ căng</T>
        <View>
          <Animated.View style={ok}>
            <T kind="label" style={{ color: C.mist }}>Ổn</T>
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, tight]}>
            <T kind="label" style={{ color: C.brass }}>Căng</T>
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, danger]}>
            <T kind="label" style={{ color: C.warn }}>Sắp đứt</T>
          </Animated.View>
        </View>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fill]}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.hatchRow, hatch]}>
            {Array.from({ length: 14 }, (_, i) => (
              <View key={i} style={styles.hatch} />
            ))}
          </Animated.View>
        </Animated.View>
        <View style={[styles.mark, { left: '60%' }]} />
        <View style={[styles.mark, { left: '85%' }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 220, gap: 6 },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 10, borderRadius: 5, backgroundColor: 'rgba(243,235,221,0.14)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5, overflow: 'hidden' },
  hatchRow: { flexDirection: 'row', gap: 6, paddingLeft: 2 },
  hatch: { width: 3, height: 20, marginTop: -5, backgroundColor: C.ink, transform: [{ rotate: '35deg' }] },
  mark: { position: 'absolute', top: 0, bottom: 0, width: 1.5, backgroundColor: 'rgba(11,26,29,0.6)' },
});
