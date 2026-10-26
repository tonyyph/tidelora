import { type ReactNode, useState } from 'react';
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
          ? { fontFamily: F.sansBold, fontSize: size(12, large), color: C.textDim, letterSpacing: 0.6, textTransform: 'uppercase' }
          : kind === 'caption'
            ? { fontFamily: F.sans, fontSize: size(12.5, large), color: C.textDim }
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
      {icon}
      <T style={[styles.btnText, kind === 'primary' && { color: C.ink }, small && { fontSize: 13 }]} numberOfLines={1}>
        {label}
      </T>
    </Pressable>
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
    <View style={styles.coin}>
      <View style={styles.coinDot} />
      <T kind="number">{value.toLocaleString('vi-VN')}</T>
      <T kind="caption">xu</T>
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
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(243,235,221,0.35)',
    backgroundColor: 'rgba(11,26,29,0.42)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  small: { minHeight: 36, paddingHorizontal: 12 },
  primary: { backgroundColor: C.ivory, borderColor: C.ivory },
  quiet: { borderColor: 'transparent', backgroundColor: 'transparent' },
  danger: { borderColor: C.warn },
  btnText: { fontFamily: F.sansBold, fontSize: 15, color: C.ivory },
  panel: { backgroundColor: 'rgba(11,26,29,0.78)', borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line, padding: 14 },
  coin: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coinDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.brass, borderWidth: 1, borderColor: '#E4CC94' },
  coinDelta: { position: 'absolute', right: 0, top: 20 },
});
