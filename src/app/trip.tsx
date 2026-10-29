import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { play } from '../audio/sound';
import { SPECIES_BIO } from '../ecology/species';
import { catchPrice } from '../economy/market';
import type { CatchItem } from '../persistence/schema';
import { nextGoal } from '../progression/goals';
import { FishArt } from '../rendering/fish/FishArt';
import { useGame } from '../state/gameStore';
import { formatWeight } from '../ui/format';
import { Button, Panel, T } from '../ui/primitives';
import { ScreenFrame } from '../ui/Screen';
import { C } from '../ui/theme';
import { Backdrop } from '../ui/Backdrop';

/**
 * End of a trip: what came home, what it is worth, and one tap to sell it.
 * Fish not sold stay in the home chest for the kitchen.
 */
export default function Trip() {
  const save = useGame((s) => s.save);
  const g = useGame.getState;
  const { ids } = useLocalSearchParams<{ ids?: string }>();
  const [tripIds] = useState(() => (ids ? ids.split(',') : []));
  // Everything starts selected: selling is the common case, keeping is the choice.
  const [picked, setPicked] = useState<Set<string>>(() => new Set(tripIds));
  const [sold, setSold] = useState<{ count: number; earned: number } | null>(null);

  if (!save) return null;
  const fish = tripIds.map((id) => save.catches.find((c) => c.id === id)).filter((c): c is CatchItem => !!c && c.status === 'kept' && c.store === 'home');
  const chosen = fish.filter((c) => picked.has(c.id));
  const total = chosen.reduce((s, c) => s + catchPrice(c), 0);
  const tripValue = fish.reduce((s, c) => s + catchPrice(c), 0);
  const weight = fish.reduce((s, c) => s + c.weightKg, 0);
  const goal = nextGoal(save);
  const afterSale = save.money + (sold ? 0 : total);

  const toggle = (id: string) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  };

  const sell = () => {
    const r = g().sell(chosen.map((c) => c.id));
    if (r.ok) {
      play('coins');
      setSold({ count: chosen.length, earned: total });
      setPicked(new Set());
    }
  };

  const species = [...new Set(fish.map((c) => c.speciesId))];

  return (
    <ScreenFrame title="Về đến nhà" subtitle={`Ngày ${save.day} · mang về ${tripIds.length} con${weight ? ` · ${formatWeight(weight)}` : ''}`} back="/home" background={<Backdrop art="bg-home-morning" scrim="room" />}>
      <View style={styles.cols}>
        <View style={{ flex: 1 }}>
          {fish.length === 0 ? (
            <View style={styles.empty}>
              <T kind="title">{sold ? 'Đã bán hết cá của chuyến này' : 'Không còn cá nào của chuyến này'}</T>
              <T kind="caption">Giỏ đã được rửa sạch, sẵn sàng cho chuyến sau.</T>
            </View>
          ) : (
            <>
              <T kind="label" style={{ marginBottom: 6 }}>
                {species.map((id) => `${SPECIES_BIO[id].nameVi} ×${fish.filter((c) => c.speciesId === id).length}`).join(' · ')}
              </T>
              <FlatList
                data={fish}
                keyExtractor={(c) => c.id}
                contentContainerStyle={{ gap: 6, paddingBottom: 12 }}
                renderItem={({ item, index }) => (
                  <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 50).duration(300)}>
                    <Row item={item} picked={picked.has(item.id)} onPress={() => toggle(item.id)} />
                  </Animated.View>
                )}
              />
            </>
          )}
        </View>

        <Panel style={styles.side}>
          {sold ? (
            <Animated.View entering={FadeIn.duration(300)} style={{ gap: 4 }}>
              <T kind="label">Đã bán</T>
              <T kind="display" style={{ fontSize: 28, lineHeight: 36, color: C.brass }}>+{sold.earned} xu</T>
              <T kind="caption">{sold.count} con cá · chợ đầu làng</T>
            </Animated.View>
          ) : (
            <View style={{ gap: 4 }}>
              <T kind="label">Giá chợ hôm nay</T>
              <T kind="display" style={{ fontSize: 28, lineHeight: 36 }}>{tripValue} xu</T>
              <T kind="caption">cho cả {fish.length} con, giá theo cân và độ tươi</T>
            </View>
          )}

          {goal && (
            <View style={styles.goal}>
              <T kind="label">Mục tiêu · {goal.name}</T>
              <View style={styles.bar}>
                <View style={[styles.barFill, { width: `${Math.max(0, Math.min(100, Math.round((afterSale / goal.price) * 100)))}%` }, afterSale >= goal.price && { backgroundColor: C.brass }]} />
              </View>
              <T kind="caption">
                {save.money >= goal.price && !sold
                  ? 'Đã đủ tiền. Ghé tiệm đồ câu.'
                  : afterSale >= goal.price
                    ? sold
                      ? 'Đủ tiền rồi! Ghé tiệm đồ câu.'
                      : `Bán xong là đủ tiền (${afterSale}/${goal.price} xu).`
                    : `${afterSale}/${goal.price} xu${sold ? '' : ' sau khi bán'} · còn ${goal.price - afterSale} xu`}
              </T>
            </View>
          )}

          <View style={{ flex: 1 }} />
          <View style={{ gap: 8 }}>
            {!sold && fish.length > 0 && (
              <Button label={chosen.length ? `Bán ${chosen.length} con · +${total} xu` : 'Chọn cá để bán'} kind="primary" disabled={!chosen.length} onPress={sell} />
            )}
            {goal && afterSale >= goal.price && sold && <Button label="Ghé tiệm đồ câu" kind="primary" onPress={() => router.replace('/shop')} />}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button label="Ra bàu tiếp" style={{ flex: 1 }} onPress={() => router.replace('/prep')} />
              <Button label="Về nhà" style={{ flex: 1 }} onPress={() => router.replace('/home')} />
            </View>
            {!sold && fish.length > 0 && chosen.length < fish.length && (
              <T kind="caption">Cá không bán được cất vào thùng đá ở nhà để nấu.</T>
            )}
          </View>
        </Panel>
      </View>
    </ScreenFrame>
  );
}

function Row({ item, picked, onPress }: { item: CatchItem; picked: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: picked }} style={[styles.row, picked && styles.rowOn]}>
      <View style={[styles.check, picked && styles.checkOn]} />
      <View style={{ width: 96, alignItems: 'center' }}>
        <FishArt speciesId={item.speciesId} width={Math.min(96, 40 + item.lengthCm * 1.5)} shadow={false} />
      </View>
      <View style={{ flex: 1 }}>
        <T style={{ fontSize: 15 }} numberOfLines={1}>{SPECIES_BIO[item.speciesId].nameVi}</T>
        <T kind="caption">
          {item.lengthCm.toLocaleString('vi-VN')} cm · {formatWeight(item.weightKg)}
        </T>
      </View>
      <T kind="number" style={{ width: 70, textAlign: 'right', color: picked ? C.ivory : C.textDim }}>{catchPrice(item)} xu</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cols: { flex: 1, flexDirection: 'row', gap: 14 },
  side: { width: 290, gap: 12 },
  goal: { gap: 6, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  bar: { height: 6, borderRadius: 3, backgroundColor: 'rgba(243,235,221,0.15)', overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: C.mist },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, backgroundColor: C.panel, borderWidth: 1, borderColor: C.panelLine },
  rowOn: { borderColor: C.brass },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: 'rgba(243,235,221,0.5)' },
  checkOn: { backgroundColor: C.brass, borderColor: C.brass },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
});
