import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { type ComponentProps, type ReactNode, useState } from 'react';
import Animated, { Keyframe } from 'react-native-reanimated';
import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { play } from '../audio/sound';
import { haptic } from '../audio/haptics';
import { useGame } from '../state/gameStore';
import { C, F, size } from './theme';

export function T({ children, style, kind = 'body', numberOfLines }: { children: ReactNode; style?: StyleProp<TextStyle>; kind?: 'body' | 'label' | 'title' | 'display' | 'caption' | 'number'; numberOfLines?: number }) {
  const large = useGame((s) => s.settings.largeText);
  const base: TextStyle =
    kind === 'display'
      ? { fontFamily: F.display, fontSize: size(28, large), color: C.ivory, letterSpacing: 0.2 }
      : kind === 'title'
        ? { fontFamily: F.display, fontSize: size(19, large), color: C.ivory }
        : kind === 'label'
          ? { fontFamily: F.sansBold, fontSize: size(12.5, large), color: C.textDim, letterSpacing: 0.6, textTransform: 'uppercase' }
          : kind === 'caption'
            ? { fontFamily: F.sans, fontSize: size(13.5, large), lineHeight: size(18, large), color: C.textDim }
            : kind === 'number'
              ? { fontFamily: F.sansBold, fontSize: size(15, large), color: C.ivory, fontVariant: ['tabular-nums'] }
              : { fontFamily: F.sans, fontSize: size(14.5, large), color: C.ivory, lineHeight: size(20, large) };
  return (
    <Text style={[base, style]} numberOfLines={numberOfLines} maxFontSizeMultiplier={1.3}>
      {children}
    </Text>
  );
}

type BtnProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  kind?: 'primary' | 'ghost' | 'quiet' | 'danger';
  style?: StyleProp<ViewStyle>;
  small?: boolean;
  icon?: ReactNode;
};

export function Button({ label, kind = 'ghost', style, small, icon, onPress, disabled, ...rest }: BtnProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={(e) => {
        play('tap');
        haptic.tap();
        onPress?.(e);
      }}
      style={({ pressed }) => [
        styles.btn,
        small && styles.small,
        kind === 'primary' && styles.primary,
        kind === 'quiet' && styles.quiet,
        kind === 'danger' && styles.danger,
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.75, transform: [{ scale: 0.985 }] },
        style,
      ]}
      {...rest}
    >
      {kind === 'primary' && <BrassFill radius={small ? 10 : 12} />}
      {icon}
      <T style={[styles.btnText, kind === 'primary' && { color: C.ink }, small && { fontSize: 14 }]} numberOfLines={1}>
        {label}
      </T>
    </Pressable>
  );
}

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Line icons for navigation and status (MaterialCommunityIcons, Apache 2.0). */
export function Icon({ name, size: s = 20, color = C.ivory }: { name: IconName; size?: number; color?: string }) {
  return <MaterialCommunityIcons name={name} size={s} color={color} />;
}

/** The restrained brass gradient used only on primary actions. */
export function BrassFill({ radius }: { radius: number }) {
  return (
    <LinearGradient
      colors={[C.brassHi, C.brass, C.brassLo]}
      locations={[0, 0.55, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      pointerEvents="none"
    />
  );
}

export function Panel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.line, marginVertical: 8 }} />;
}

const COIN_DELTA = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 8 }] },
  15: { opacity: 1, transform: [{ translateY: 0 }] },
  75: { opacity: 1, transform: [{ translateY: -2 }] },
  100: { opacity: 0, transform: [{ translateY: -12 }] },
}).duration(1600);

/** Money pill. When the value changes, the difference floats up beside it. */
export function Coin({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const [delta, setDelta] = useState<{ n: number; key: number } | null>(null);
  if (value !== shown) {
    setDelta({ n: value - shown, key: (delta?.key ?? 0) + 1 });
    setShown(value);
  }
  return (
    <View style={styles.coin} accessibilityLabel={`${value} xu`}>
      <View style={styles.coinDot} />
      <T kind="number">{value.toLocaleString('vi-VN')}</T>
      {delta && (
        <Animated.View key={delta.key} entering={COIN_DELTA} style={styles.coinDelta} pointerEvents="none">
          <T kind="number" style={{ color: delta.n > 0 ? C.brass : C.textDim }}>
            {delta.n > 0 ? '+' : '−'}
            {Math.abs(delta.n).toLocaleString('vi-VN')}
          </T>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(196,198,175,0.38)',
    backgroundColor: 'rgba(14,34,30,0.72)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  small: { minHeight: 38, paddingHorizontal: 12, borderRadius: 10 },
  primary: { borderColor: '#E6CF9C', borderRadius: 12, overflow: 'hidden' },
  quiet: { borderColor: 'transparent', backgroundColor: 'transparent' },
  danger: { borderColor: C.warn },
  btnText: { fontFamily: F.sansBold, fontSize: 15, color: C.ivory },
  panel: { backgroundColor: C.panel, borderRadius: 16, borderWidth: 1, borderColor: C.panelLine, padding: 14 },
  coin: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 34, borderRadius: 17, backgroundColor: 'rgba(14,34,30,0.72)', borderWidth: 1, borderColor: C.panelLine },
  coinDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: C.brass, borderWidth: 1.5, borderColor: '#E9D29E' },
  coinDelta: { position: 'absolute', right: 8, top: 34 },
});
