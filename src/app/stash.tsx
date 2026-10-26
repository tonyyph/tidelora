import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { play } from '../audio/sound';
import { RECIPES } from '../cooking/recipes';
import { SPECIES_BIO } from '../ecology/species';
import { catchPrice, dishPrice } from '../economy/market';
import { atHome } from '../inventory/catches';
import type { CatchItem } from '../persistence/schema';
import { BAND_LABEL, band } from '../preservation/freshness';
import { FishArt } from '../rendering/fish/FishArt';
import { useGame } from '../state/gameStore';
import { formatWeight } from '../ui/format';
import { Button, Panel, T } from '../ui/primitives';
import { ScreenFrame } from '../ui/Screen';
import { C } from '../ui/theme';
import { WoodSurface } from '../ui/WoodSurface';

type Sort = 'new' | 'heavy' | 'fresh';
const SORT_VI: Record<Sort, string> = { new: 'Mới nhất', heavy: 'Nặng nhất', fresh: 'Tươi nhất' };

/** Home chest. Every fish is its own record; grouping is only a view. */
export default function Stash() {
  const save = useGame((s) => s.save);
  const g = useGame.getState;
  const [tab, setTab] = useState<'fish' | 'dishes'>('fish');
  const [filter, setFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>('new');
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const fish = useMemo(() => {
    if (!save) return [];
    const list = atHome(save).filter((c) => !filter || c.speciesId === filter);
    const key = (c: CatchItem) => (sort === 'heavy' ? -c.weightKg : sort === 'fresh' ? -c.freshness : -(c.day * 1440 + c.minute));
    return list.sort((a, b) => a.speciesId.localeCompare(b.speciesId) || key(a) - key(b));
  }, [save, filter, sort]);

  if (!save) return null;
  const all = atHome(save);
  const speciesHere = [...new Set(all.map((c) => c.speciesId))];
  const chosen = fish.filter((c) => picked.has(c.id));
  const total = chosen.reduce((s, c) => s + catchPrice(c), 0);

  const toggle = (id: string) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  };

  const sell = () => {
    if (!chosen.length) return;
    Alert.alert(`Bán ${chosen.length} con cá?`, `Bạn nhận ${total} xu. Cá đã bán không lấy lại được.`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Bán',
        onPress: () => {
          if (g().sell(chosen.map((c) => c.id)).ok) {
            play('coins');
            setPicked(new Set());
          }
        },
      },
    ]);
  };

  return (
    <ScreenFrame title="Kho cá" subtitle="Thùng đá lớn ở nhà · giữ tươi lâu hơn giỏ" background={<WoodSurface tone="bench" />}>
      <View style={styles.tabs}>
        <Tab on={tab === 'fish'} label={`Cá (${all.length})`} onPress={() => setTab('fish')} />
        <Tab on={tab === 'dishes'} label={`Món đã nấu (${save.dishes.length})`} onPress={() => setTab('dishes')} />
        <View style={{ flex: 1 }} />
        {tab === 'fish' && (
          <>
            {(Object.keys(SORT_VI) as Sort[]).map((s) => (
              <Tab key={s} small on={sort === s} label={SORT_VI[s]} onPress={() => setSort(s)} />
            ))}
          </>
        )}
      </View>

      {tab === 'fish' ? (
        all.length === 0 ? (
          <Empty title="Thùng đá còn trống" body="Cá giữ lại trong chuyến câu sẽ được cất ở đây khi bạn về nhà." action="Ra bàu câu" onAction={() => router.replace('/prep')} />
        ) : (
          <View style={{ flex: 1, flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <View style={styles.filters}>
                <Tab small on={!filter} label="Tất cả" onPress={() => setFilter(null)} />
                {speciesHere.map((id) => (
                  <Tab key={id} small on={filter === id} label={`${SPECIES_BIO[id].nameVi} · ${all.filter((c) => c.speciesId === id).length}`} onPress={() => setFilter(id)} />
                ))}
              </View>
              <FlatList
                data={fish}
                keyExtractor={(c) => c.id}
                contentContainerStyle={{ gap: 6, paddingBottom: 12 }}
                renderItem={({ item, index }) => (
                  <>
                    {(index === 0 || fish[index - 1].speciesId !== item.speciesId) && (
                      <T kind="label" style={{ marginTop: index ? 8 : 0 }}>
                        {SPECIES_BIO[item.speciesId].nameVi} · {fish.filter((c) => c.speciesId === item.speciesId).length} con ·{' '}
                        {formatWeight(fish.filter((c) => c.speciesId === item.speciesId).reduce((s, c) => s + c.weightKg, 0))}
                      </T>
                    )}
                    <FishRow item={item} picked={picked.has(item.id)} onPress={() => toggle(item.id)} />
                  </>
                )}
              />
            </View>
            <Panel style={styles.side}>
              <T kind="label">Đã chọn</T>
              <T kind="display" style={{ fontSize: 24, lineHeight: 30 }}>{chosen.length} con</T>
              <T kind="caption">Giá chợ hôm nay: {total} xu</T>
              <View style={{ gap: 6, marginTop: 10 }}>
                <Button label={`Bán ${chosen.length ? `· +${total} xu` : ''}`} kind="primary" disabled={!chosen.length} onPress={sell} />
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <Button label="Chọn hết" small kind="quiet" onPress={() => setPicked(new Set(fish.map((c) => c.id)))} />
                  <Button label="Bỏ chọn" small kind="quiet" disabled={!chosen.length} onPress={() => setPicked(new Set())} />
                </View>
                <Button label="Mang vào bếp" small onPress={() => router.push('/kitchen')} />
              </View>
              <T kind="caption" style={{ marginTop: 8 }}>
                Độ tươi chỉ giảm theo giờ trong game (mỗi lần câu, nấu, đi lại), không giảm khi bạn tắt ứng dụng.
              </T>
            </Panel>
          </View>
        )
      ) : save.dishes.length === 0 ? (
        <Empty title="Chưa có món nào" body="Món nấu từ cá giữ được giá trị, không bị giảm tươi như cá sống." action="Vào bếp" onAction={() => router.push('/kitchen')} />
      ) : (
        <FlatList
          data={save.dishes}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ gap: 6 }}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 16 }}>{RECIPES[item.recipeId].nameVi}</T>
                <T kind="caption">
                  {item.portions} phần · chất lượng {Math.round(item.quality * 100)}% · từ {item.sourceCatchIds.length} con cá
                </T>
              </View>
              <Button
                small
                label={`Bán · +${dishPrice(item)} xu`}
                onPress={() => {
                  if (g().sellDish([item.id]).ok) play('coins');
                }}
              />
            </View>
          )}
        />
      )}
    </ScreenFrame>
  );
}

function FishRow({ item, picked, onPress }: { item: CatchItem; picked: boolean; onPress: () => void }) {
  const b = band(item.freshness);
  return (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: picked }} style={[styles.row, picked && styles.rowOn]}>
      <View style={[styles.check, picked && styles.checkOn]} />
      <View style={{ width: 72, alignItems: 'center' }}>
        <FishArt speciesId={item.speciesId} width={Math.min(72, 28 + item.lengthCm * 1.2)} shadow={false} />
      </View>
      <View style={{ flex: 1 }}>
        <T style={{ fontSize: 15 }} numberOfLines={1}>
          {item.lengthCm.toLocaleString('vi-VN')} cm · {formatWeight(item.weightKg)}
        </T>
        <T kind="caption">Ngày {item.day} · {item.condition === 'excellent' ? 'nguyên vẹn' : item.condition === 'good' ? 'tốt' : 'trầy nhẹ'}</T>
      </View>
      <View style={{ width: 110, gap: 4 }}>
        <T kind="caption" style={{ color: b === 'fading' ? C.warn : b === 'good' ? C.brass : C.fresh }}>{BAND_LABEL[b]}</T>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${Math.round(item.freshness * 100)}%`, backgroundColor: b === 'fading' ? C.warn : C.mist }]} />
        </View>
      </View>
      <T kind="number" style={{ width: 70, textAlign: 'right' }}>{catchPrice(item)} xu</T>
    </Pressable>
  );
}

function Tab({ on, label, onPress, small }: { on: boolean; label: string; onPress: () => void; small?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityState={{ selected: on }} style={[styles.tab, small && { paddingVertical: 5 }, on && styles.tabOn]}>
      <T style={[{ fontSize: small ? 13 : 15 }, on && { color: C.ink }]}>{label}</T>
    </Pressable>
  );
}

function Empty({ title, body, action, onAction }: { title: string; body: string; action: string; onAction: () => void }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyMark} />
      <T kind="title">{title}</T>
      <T kind="caption" style={{ maxWidth: 360, textAlign: 'center' }}>{body}</T>
      <Button label={action} small onPress={onAction} style={{ marginTop: 8 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 10, alignItems: 'center' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(11,26,29,0.55)', borderWidth: 1, borderColor: C.line },
  tabOn: { backgroundColor: C.ivory, borderColor: C.ivory },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12, backgroundColor: 'rgba(11,26,29,0.72)', borderWidth: 1, borderColor: 'transparent' },
  rowOn: { borderColor: C.brass },
  check: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: 'rgba(243,235,221,0.5)' },
  checkOn: { backgroundColor: C.brass, borderColor: C.brass },
  bar: { height: 4, borderRadius: 2, backgroundColor: 'rgba(243,235,221,0.15)' },
  barFill: { height: 4, borderRadius: 2 },
  side: { width: 250 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  emptyMark: { width: 54, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: 'rgba(243,235,221,0.35)', marginBottom: 8 },
});
