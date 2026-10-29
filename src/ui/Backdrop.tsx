import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ART, type ArtId } from '../rendering/art';
import { timeGrade } from '../rendering/scene/timeOfDay';

type Scrim = 'none' | 'top' | 'left' | 'room';

/**
 * A painted background, cover-fitted. Text gets local scrims rather than a dimmed
 * scene: `left` shades the left half for a menu column, `room` lays a dark green
 * wash over interiors so cards stay readable, `top` only shades the header strip. Outdoor scenes pass `minute` to
 * follow the game clock with the same grade as the fishing scene.
 */
const styles = StyleSheet.create({ fill: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' } });

export function Backdrop({ art, scrim = 'none', minute }: { art: ArtId; scrim?: Scrim; minute?: number }) {
  const grade = minute === undefined ? null : timeGrade(minute);
  return (
    <Animated.View entering={FadeIn.duration(350)} style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Explicit size: an Image laid out only by insets falls back to its intrinsic size. */}
      <Image source={ART[art]} style={styles.fill} resizeMode="cover" accessibilityIgnoresInvertColors />
      {grade && grade.tint !== '#FFFFFF' && <View style={[StyleSheet.absoluteFill, { backgroundColor: grade.tint, mixBlendMode: 'multiply' }]} />}
      {grade && grade.lift > 0 && <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', opacity: grade.lift, mixBlendMode: 'soft-light' }]} />}
      {scrim === 'left' && (
        <LinearGradient colors={['rgba(8,20,18,0.72)', 'rgba(8,20,18,0.35)', 'rgba(8,20,18,0)']} locations={[0, 0.38, 0.62]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      )}
      {scrim === 'room' && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,26,22,0.52)' }]} />}
      {scrim !== 'none' && (
        <LinearGradient colors={['rgba(8,20,18,0.55)', 'rgba(8,20,18,0)']} locations={[0, 1]} style={[StyleSheet.absoluteFill, { bottom: '70%' }]} />
      )}
    </Animated.View>
  );
}
