import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGame } from '../state/gameStore';
import { Coin, T } from './primitives';
import { C } from './theme';

export function BackButton({ to }: { to?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Quay lại"
      hitSlop={10}
      onPress={() => (to ? router.replace(to as never) : router.canGoBack() ? router.back() : router.replace('/home'))}
      style={styles.back}
    >
      <View style={styles.chev} />
    </Pressable>
  );
}

/** Header row (back, title, coins) over any background; children fill the rest. */
export function ScreenFrame({ title, subtitle, children, back, right, background }: { title: string; subtitle?: string; children: ReactNode; back?: string; right?: ReactNode; background?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const money = useGame((s) => s.save?.money ?? 0);
  return (
    <View style={styles.root}>
      {background}
      <View style={[styles.header, { paddingLeft: insets.left + 16, paddingRight: insets.right + 20, paddingTop: insets.top + 10 }]}>
        <BackButton to={back} />
        <View style={{ flex: 1 }}>
          <T kind="title" style={{ fontSize: 22, lineHeight: 30 }}>{title}</T>
          {subtitle && <T kind="caption">{subtitle}</T>}
        </View>
        {right}
        <Coin value={money} />
      </View>
      <View style={[styles.body, { paddingLeft: insets.left + 20, paddingRight: insets.right + 20, paddingBottom: insets.bottom + 12 }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ink },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 8 },
  body: { flex: 1 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(11,26,29,0.5)', alignItems: 'center', justifyContent: 'center' },
  chev: { width: 11, height: 11, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: C.ivory, transform: [{ rotate: '45deg' }], marginLeft: 4 },
});
