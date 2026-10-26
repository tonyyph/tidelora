import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { atHome } from '../inventory/catches';
import { clockLabel, band } from '../preservation/freshness';
import { nextGoal, nextTip } from '../progression/goals';
import { LiveBackdrop } from '../rendering/scene/LiveBackdrop';
import { useGame } from '../state/gameStore';
import { Coin, T } from '../ui/primitives';
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
  const fading = home.filter((c) => band(c.freshness) === 'fading').length;
  const species = Object.keys(save.journal).length;
  const goal = nextGoal(save);
  const tip = nextTip(save);

  const places: { label: string; note: string; to: string; primary?: boolean }[] = [
    { label: 'Ra bàu câu', note: 'Chuẩn bị đồ và xuống Bàu Sen', to: '/prep', primary: true },
    { label: 'Kho cá', note: home.length ? `${home.length} con trong thùng đá${fading ? ` · ${fading} con kém tươi` : ''}` : 'Thùng đá đang trống', to: '/stash' },
    { label: 'Gian bếp', note: save.dishes.length ? `${save.dishes.length} mẻ món đã nấu` : `${save.recipesUnlocked.length} công thức`, to: '/kitchen' },
    { label: 'Chợ & tiệm đồ câu', note: 'Bán cá, mua mồi và đồ nghề', to: '/shop' },
    { label: 'Sổ tay thiên nhiên', note: `${species}/4 loài đã ghi`, to: '/journal' },
  ];

  return (
    <View style={styles.root}>
      <LiveBackdrop />
      <LinearGradient colors={['rgba(8,20,22,0.82)', 'rgba(8,20,22,0.55)', 'rgba(8,20,22,0)']} locations={[0, 0.45, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.shade} pointerEvents="none" />
      <Animated.View entering={FadeIn.duration(500)} style={[styles.panel, { paddingLeft: insets.left + 28, paddingTop: insets.top + 22, paddingBottom: insets.bottom + 18 }]}>
        <T kind="label">Nhà ven bàu · Đồng Tháp Mười</T>
        <T style={styles.title}>Ngày {save.day}, {clockLabel(save.minute)}</T>
        <View style={{ marginTop: 4, marginBottom: 8 }}>
          <Coin value={save.money} />
        </View>
        {places.map((p, i) => (
          <Animated.View key={p.to} entering={FadeInLeft.delay(80 * i).duration(380)}>
            <Pressable accessibilityRole="button" accessibilityLabel={p.label} onPress={() => router.push(p.to as never)} style={({ pressed }) => [styles.place, pressed && { opacity: 0.7 }]}>
              <View style={[styles.mark, p.primary && { backgroundColor: C.brass }]} />
              <View style={{ flex: 1 }}>
                <T style={[styles.placeLabel, p.primary && { color: C.ivory }]}>{p.label}</T>
                <T kind="caption">{p.note}</T>
              </View>
            </Pressable>
          </Animated.View>
        ))}
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', gap: 18 }}>
          <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
            <T kind="caption">Cài đặt</T>
          </Pressable>
          <Pressable onPress={() => router.replace('/')} hitSlop={8}>
            <T kind="caption">Màn mở đầu</T>
          </Pressable>
        </View>
      </Animated.View>

      {(goal || tip) && (
        <Animated.View entering={FadeIn.delay(300).duration(500)} style={[styles.goalCard, { right: insets.right + 24, bottom: insets.bottom + 20 }]}>
          {goal && (
            <Pressable accessibilityRole="button" accessibilityLabel={`Mục tiêu: ${goal.name}`} onPress={() => router.push('/shop')} style={{ gap: 6 }}>
              <View style={styles.goalHead}>
                <T kind="label">Mục tiêu tiếp theo</T>
                <T kind="number" style={{ color: goal.ready ? C.brass : C.ivory }}>
                  {Math.min(goal.have, goal.price)}/{goal.price} xu
                </T>
              </View>
              <T style={styles.goalName}>{goal.name}</T>
              <View style={styles.bar}>
                <View style={[styles.barFill, { width: `${Math.min(100, Math.round((goal.have / goal.price) * 100))}%` }, goal.ready && { backgroundColor: C.brass }]} />
              </View>
              <T kind="caption">{goal.ready ? 'Đủ tiền rồi! Chạm để ghé tiệm.' : goal.why}</T>
            </Pressable>
          )}
          {tip && <T kind="caption" style={[{ color: C.ivory }, goal && styles.tip]}>{tip}</T>}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ink },
  shade: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '62%' },
  panel: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 420, paddingRight: 24 },
  title: { fontFamily: F.display, fontSize: 26, lineHeight: 34, color: C.ivory, marginTop: 2 },
  place: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 5 },
  mark: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(243,235,221,0.5)' },
  goalCard: { position: 'absolute', width: 300, padding: 14, gap: 4, borderRadius: 14, backgroundColor: 'rgba(8,20,22,0.78)', borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  goalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalName: { fontFamily: F.display, fontSize: 18, lineHeight: 24, color: C.ivory },
  bar: { height: 6, borderRadius: 3, backgroundColor: 'rgba(243,235,221,0.15)', overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: C.mist },
  tip: { marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  placeLabel: { fontFamily: F.display, fontSize: 19, lineHeight: 25, color: C.ivory },
});
