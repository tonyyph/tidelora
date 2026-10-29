import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { atHome } from '../inventory/catches';
import { band, clockLabel } from '../preservation/freshness';
import { nextGoal } from '../progression/goals';
import { useGame } from '../state/gameStore';
import { Backdrop } from '../ui/Backdrop';
import { BrassFill, Coin, Icon, type IconName, T } from '../ui/primitives';
import { C, F } from '../ui/theme';

/** The house on the marsh edge: every place the player can go between trips. */
export default function Home() {
  const insets = useSafeAreaInsets();
  const save = useGame((s) => s.save);
  const pending = !!save?.pendingCatch;
  useEffect(() => {
    // A catch still waiting for keep/release must be resolved on the water first.
    if (pending) router.replace('/fish');
  }, [pending]);
  if (!save) return null;
  const home = atHome(save);
  const fading = home.some((c) => band(c.freshness) === 'fading');
  const goal = nextGoal(save);

  const places: { label: string; icon: IconName; to: string; badge?: string; warn?: boolean }[] = [
    { label: 'Kho cá', icon: 'fish', to: '/stash', badge: home.length ? String(home.length) : undefined, warn: fading },
    { label: 'Gian bếp', icon: 'pot-steam-outline', to: '/kitchen' },
    { label: 'Tiệm đồ câu', icon: 'hook', to: '/shop' },
    { label: 'Sổ tay', icon: 'book-open-variant', to: '/journal' },
  ];

  return (
    <View style={styles.root}>
      <Backdrop art="bg-home-morning" scrim="left" minute={save.minute} />

      <Animated.View entering={FadeIn.duration(600)} style={[styles.head, { left: insets.left + 28, top: insets.top + 16 }]}>
        <T style={styles.logo}>Tidelora</T>
        <View style={styles.swash} />
        <T style={styles.headline}>{'Một ngày\nbên mặt nước'}</T>
        <T style={styles.where}>
          Đồng Tháp Mười · {clockLabel(save.minute)} · Ngày {save.day}
        </T>
        {goal && (
          <Pressable accessibilityRole="button" accessibilityLabel={`Mục tiêu: ${goal.name}`} onPress={() => router.push('/shop')} style={styles.goal}>
            <View style={styles.goalHead}>
              <T kind="caption" style={{ color: C.ivory }} numberOfLines={1}>
                Mục tiêu · {goal.name}
              </T>
              <T kind="caption" style={{ color: goal.ready ? C.brassHi : C.secondary }}>
                {goal.ready ? 'Đủ tiền' : `${goal.have}/${goal.price} xu`}
              </T>
            </View>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${Math.min(100, Math.round((goal.have / goal.price) * 100))}%` }]} />
            </View>
          </Pressable>
        )}
      </Animated.View>

      <View style={[styles.topRight, { right: insets.right + 20, top: insets.top + 14 }]}>
        <Coin value={save.money} />
        <Pressable accessibilityRole="button" accessibilityLabel="Cài đặt" onPress={() => router.push('/settings')} hitSlop={6} style={styles.round}>
          <Icon name="cog-outline" size={20} />
        </Pressable>
      </View>

      <Animated.View entering={FadeInDown.delay(150).duration(450)} style={[styles.nav, { left: insets.left + 20, bottom: insets.bottom + 16 }]}>
        {places.map((p, i) => (
          <Pressable
            key={p.to}
            accessibilityRole="button"
            accessibilityLabel={p.badge ? `${p.label}, ${p.badge} con` : p.label}
            onPress={() => router.push(p.to as never)}
            style={({ pressed }) => [styles.navItem, i > 0 && styles.navDivider, pressed && { opacity: 0.65 }]}
          >
            <View>
              <Icon name={p.icon} size={28} color={C.ivory} />
              {p.badge && (
                <View style={[styles.badge, p.warn && { backgroundColor: C.warn }]}>
                  <T style={styles.badgeText}>{p.badge}</T>
                </View>
              )}
            </View>
            <T style={styles.navLabel} numberOfLines={1}>{p.label}</T>
          </Pressable>
        ))}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(250).duration(450)} style={[styles.ctaWrap, { right: insets.right + 24, bottom: insets.bottom + 22 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Ra bàu câu" onPress={() => router.push('/prep')} style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.98 }] }]}>
          <BrassFill radius={30} />
          <T style={styles.ctaText}>Ra bàu câu</T>
          <Icon name="arrow-right" size={24} color={C.ink} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ink },
  head: { position: 'absolute', maxWidth: 360 },
  logo: { fontFamily: F.display, fontSize: 30, lineHeight: 38, color: C.ivory, letterSpacing: 0.4, textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 8 },
  swash: { width: 92, height: 2, borderRadius: 1, backgroundColor: C.ivory, opacity: 0.7, marginLeft: 22, marginTop: -2, marginBottom: 14 },
  headline: { fontFamily: F.display, fontSize: 34, lineHeight: 40, color: C.ivory, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 10 },
  where: { fontFamily: F.sansMedium, fontSize: 15, color: C.ivory, marginTop: 6, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 6 },
  goal: { marginTop: 12, width: 260, gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, backgroundColor: 'rgba(14,34,30,0.62)', borderWidth: 1, borderColor: C.panelLine },
  goalHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  bar: { height: 4, borderRadius: 2, backgroundColor: 'rgba(243,235,221,0.16)', overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2, backgroundColor: C.brass },
  topRight: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 10 },
  round: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(14,34,30,0.72)', borderWidth: 1, borderColor: C.panelLine },
  nav: { position: 'absolute', flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 6, borderRadius: 20, backgroundColor: C.panel, borderWidth: 1, borderColor: C.panelLine },
  navItem: { minWidth: 92, alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 2 },
  navDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: 'rgba(196,198,175,0.35)' },
  navLabel: { fontFamily: F.sansMedium, fontSize: 13.5, color: C.ivory },
  badge: { position: 'absolute', right: -12, top: -6, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: C.brass, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: F.sansBold, fontSize: 11, lineHeight: 14, color: C.ink },
  ctaWrap: { position: 'absolute' },
  cta: { height: 60, minWidth: 230, paddingHorizontal: 30, borderRadius: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#EAD3A0', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  ctaText: { fontFamily: F.display, fontSize: 22, lineHeight: 28, color: C.ink },
});
