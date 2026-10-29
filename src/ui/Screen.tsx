import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGame } from '../state/gameStore';
import { Coin, Icon, T } from './primitives';
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
      <Icon name="chevron-left" size={26} />
    </Pressable>
  );
}

/** Header row (back, title, coins) over any background; children fill the rest. */
export function ScreenFrame({ title, subtitle, children, back, right, aside, background }: { title: string; subtitle?: string; children: ReactNode; back?: string; right?: ReactNode; aside?: ReactNode; background?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const money = useGame((s) => s.save?.money ?? 0);
  return (
    <View style={styles.root}>
      {background}
      <View style={[styles.header, { paddingLeft: insets.left + 16, paddingRight: insets.right + 20, paddingTop: insets.top + 10 }]}>
        <BackButton to={back} />
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <T kind="title" style={styles.title}>{title}</T>
            {aside}
          </View>
          {subtitle && <T kind="caption" numberOfLines={1}>{subtitle}</T>}
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
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(14,34,30,0.7)', borderWidth: 1, borderColor: C.panelLine, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  title: { fontSize: 28, lineHeight: 36, textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 6 },
});
