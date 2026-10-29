import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { play } from '../audio/sound';
import { PANTRY_PRICE, RECIPES } from '../cooking/recipes';
import { SPECIES_BIO } from '../ecology/species';
import type { BaitId } from '../ecology/types';
import { catchPrice, dishPrice } from '../economy/market';
import { BAITS } from '../gear/catalog';
import { atHome } from '../inventory/catches';
import type { CatchItem } from '../persistence/schema';
import { BAND_LABEL, band } from '../preservation/freshness';
import { ART, DISH_ART, type ArtId } from '../rendering/art';
import { FishArt, fishAspect } from '../rendering/fish/FishArt';
import { useGame } from '../state/gameStore';
import { Backdrop } from '../ui/Backdrop';
import { formatWeight } from '../ui/format';
import { BrassFill, Button, Icon, type IconName, T } from '../ui/primitives';
import { ScreenFrame } from '../ui/Screen';
import { C, F } from '../ui/theme';

type Tab = 'fish' | 'pantry' | 'dishes';
const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'fish', label: 'Cá tươi', icon: 'fish' },
  { id: 'pantry', label: 'Nguyên liệu', icon: 'leaf' },
  { id: 'dishes', label: 'Món ăn', icon: 'bowl-mix-outline' },
];

const BAND_COLOR = { fresh: C.fresh, good: C.brass, fading: C.warn } as const;

/** Home chest: fish as cards, the chosen one in detail; pantry and cooked dishes alongside. */
export default function Stash() {
  const save = useGame((s) => s.save);
  const g = useGame.getState;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('fish');
  const [selId, setSelId] = useState<string | null>(null);

  const fish = useMemo(() => {
    if (!save) return [];
    // Species together, freshest first within each, so what to use next is up front.
    return atHome(save).sort((a, b) => a.speciesId.localeCompare(b.speciesId) || b.freshness - a.freshness);
  }, [save]);

  if (!save) return null;
  const sel = fish.find((c) => c.id === selId) ?? fish[0] ?? null;
  const chestValue = fish.reduce((s, c) => s + catchPrice(c), 0);
  const fading = fish.filter((c) => band(c.freshness) === 'fading');
  // Grid 55%, detail 45% of the body (inside the safe area and screen padding).
  const detailW = Math.round((width - insets.left - insets.right - 40 - 14) * 0.45);

  const sell = (items: CatchItem[], title: string) => {
    const total = items.reduce((s, c) => s + catchPrice(c), 0);
    Alert.alert(title, `Bạn nhận ${total} xu. Cá đã bán không lấy lại được.`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Bán',
        onPress: () => {
          if (g().sell(items.map((c) => c.id)).ok) play('coins');
        },
      },
    ]);
  };

  return (
    <ScreenFrame
      title="Kho cá"
      aside={
        <View style={styles.count}>
          <T style={styles.countText}>{fish.length} con</T>
          <Icon name="archive-outline" size={18} color={C.secondary} />
        </View>
      }
      right={fish.length > 1 && tab === 'fish' ? <Button small label={`Bán cả kho · ${chestValue} xu`} onPress={() => sell(fish, `Bán cả ${fish.length} con?`)} /> : undefined}
      background={<Backdrop art="bg-storage-quiet" scrim="room" />}
    >
      <View style={styles.tabs}>
        {TABS.map((t) => {
          const on = t.id === tab;
          return (
            <Pressable key={t.id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setTab(t.id)} style={[styles.tab, on && styles.tabOn]}>
              {on && <BrassFill radius={12} />}
              <Icon name={t.icon} size={20} color={on ? C.ink : C.secondary} />
              <T style={[styles.tabText, on && { color: C.ink }]}>{t.label}</T>
            </Pressable>
          );
        })}
      </View>

      {tab === 'fish' &&
        (fish.length === 0 || !sel ? (
          <Empty title="Thùng đá còn trống" body="Cá giữ lại trong chuyến câu sẽ được cất ở đây khi bạn về nhà." action="Ra bàu câu" onAction={() => router.replace('/prep')} />
        ) : (
          <View style={styles.cols}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
              {fish.map((c) => (
                <FishCard key={c.id} item={c} on={c.id === sel.id} onPress={() => setSelId(c.id)} />
              ))}
            </ScrollView>
            <Animated.View key={sel.id} entering={FadeIn.duration(220)} style={[styles.detail, { width: detailW }]}>
              <T style={styles.detailName} numberOfLines={1}>{SPECIES_BIO[sel.speciesId].nameVi}</T>
              <View style={styles.stats}>
                <Icon name="weight" size={16} color={C.secondary} />
                <T style={styles.stat}>{formatWeight(sel.weightKg)}</T>
                <T style={styles.stat}>·</T>
                <Icon name="tape-measure" size={16} color={C.secondary} />
                <T style={styles.stat}>{sel.lengthCm.toLocaleString('vi-VN')} cm</T>
                <View style={{ flex: 1 }} />
                <Icon name="leaf" size={16} color={BAND_COLOR[band(sel.freshness)]} />
                <T style={[styles.stat, { color: BAND_COLOR[band(sel.freshness)] }]}>{BAND_LABEL[band(sel.freshness)]}</T>
              </View>
              <FitFish speciesId={sel.speciesId} maxWidth={detailW - 48} />
              <View style={styles.actions}>
                <Button label="Vào bếp" icon={<Icon name="pot-steam-outline" size={20} />} style={{ flex: 1 }} onPress={() => router.push('/kitchen')} />
                <Button
                  label={`Bán · ${catchPrice(sel)} xu`}
                  kind="primary"
                  icon={<View style={styles.coin} />}
                  style={{ flex: 1 }}
                  onPress={() => {
                    if (g().sell([sel.id]).ok) {
                      play('coins');
                      setSelId(null);
                    }
                  }}
                />
              </View>
              {fading.length > 0 && <Button small kind="danger" label={`Bán ${fading.length} con kém tươi`} onPress={() => sell(fading, `Bán ${fading.length} con kém tươi?`)} />}
            </Animated.View>
          </View>
        ))}

      {tab === 'pantry' && (
        <ScrollView contentContainerStyle={styles.grid}>
          <Stock art={null} icon="shaker-outline" title="Gia vị" note={`${save.pantry} phần · mua thêm ở bếp, ${PANTRY_PRICE} xu một phần`} />
          {(Object.keys(BAITS) as BaitId[]).map((b) => (
            <Stock
              key={b}
              art={b === 'worm' ? 'item-earthworm' : null}
              icon={b === 'bran' ? 'grain' : 'fishbowl-outline'}
              title={BAITS[b].nameVi}
              note={BAITS[b].free ? 'Tự đào ven bờ, luôn có' : `Còn ${save.baitStock[b]} lần quăng`}
            />
          ))}
        </ScrollView>
      )}

      {tab === 'dishes' &&
        (save.dishes.length === 0 ? (
          <Empty title="Chưa có món nào" body="Món nấu từ cá giữ được giá trị, không bị giảm tươi như cá sống." action="Vào bếp" onAction={() => router.push('/kitchen')} />
        ) : (
          <ScrollView contentContainerStyle={styles.grid}>
            {save.dishes.map((d) => (
              <View key={d.id} style={[styles.card, styles.dishCard]}>
                <Image source={ART[DISH_ART[RECIPES[d.recipeId].dish]]} style={styles.dishArt} resizeMode="contain" />
                <View style={{ flex: 1, gap: 2 }}>
                  <T style={styles.cardName}>{RECIPES[d.recipeId].nameVi}</T>
                  <T kind="caption">
                    {d.portions} phần · chất lượng {Math.round(d.quality * 100)}%
                  </T>
                  <Button
                    small
                    kind="primary"
                    label={`Bán · ${dishPrice(d)} xu`}
                    style={{ alignSelf: 'flex-start', marginTop: 4 }}
                    onPress={() => {
                      if (g().sellDish([d.id]).ok) play('coins');
                    }}
                  />
                </View>
              </View>
            ))}
          </ScrollView>
        ))}
    </ScreenFrame>
  );
}

/** The selected fish as large as the space between the stats and the actions allows. */
function FitFish({ speciesId, maxWidth }: { speciesId: string; maxWidth: number }) {
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  // About three quarters of the picture area, never past its height.
  const w = box ? Math.min(maxWidth, box.w * 0.78, (box.h - 8) / fishAspect(speciesId)) : 0;
  return (
    <View style={styles.hero} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {w > 0 && <FishArt speciesId={speciesId} width={w} />}
    </View>
  );
}

function FishCard({ item, on, onPress }: { item: CatchItem; on: boolean; onPress: () => void }) {
  const b = band(item.freshness);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={`${SPECIES_BIO[item.speciesId].nameVi}, ${formatWeight(item.weightKg)}, ${BAND_LABEL[b]}`}
      onPress={onPress}
      style={[styles.card, on && styles.cardOn]}
    >
      <View style={styles.cardArt}>
        <FishArt speciesId={item.speciesId} width={Math.min(150, 70 + item.lengthCm * 2.4)} shadow={false} />
      </View>
      <View style={[styles.dot, { backgroundColor: BAND_COLOR[b] }]} />
      <View style={styles.cardFoot}>
        <T style={styles.cardName} numberOfLines={1}>{SPECIES_BIO[item.speciesId].nameVi}</T>
        <T style={styles.cardWeight}>{formatWeight(item.weightKg)}</T>
      </View>
    </Pressable>
  );
}

function Stock({ art, icon, title, note }: { art: ArtId | null; icon: IconName; title: string; note: string }) {
  return (
    <View style={[styles.card, styles.stockCard]}>
      <View style={styles.stockArt}>{art ? <Image source={ART[art]} style={{ width: 64, height: 44 }} resizeMode="contain" /> : <Icon name={icon} size={34} color={C.brassHi} />}</View>
      <View style={{ flex: 1 }}>
        <T style={styles.cardName}>{title}</T>
        <T kind="caption">{note}</T>
      </View>
    </View>
  );
}

function Empty({ title, body, action, onAction }: { title: string; body: string; action: string; onAction: () => void }) {
  return (
    <View style={styles.empty}>
      <Image source={ART['item-basket']} style={{ width: 90, height: 78, opacity: 0.9 }} resizeMode="contain" />
      <T kind="title">{title}</T>
      <T kind="caption" style={{ maxWidth: 360, textAlign: 'center' }}>{body}</T>
      <Button label={action} small onPress={onAction} style={{ marginTop: 8 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  count: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  countText: { fontFamily: F.sansMedium, fontSize: 16, color: C.secondary },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12, padding: 4, borderRadius: 16, backgroundColor: 'rgba(14,34,30,0.6)', borderWidth: 1, borderColor: C.panelLine, alignSelf: 'flex-start' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingHorizontal: 16, borderRadius: 12, overflow: 'hidden' },
  tabOn: {},
  tabText: { fontFamily: F.sansMedium, fontSize: 14.5, color: C.secondary },
  cols: { flex: 1, flexDirection: 'row', gap: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 16 },
  card: { width: '48.5%', borderRadius: 16, backgroundColor: C.panel, borderWidth: 1, borderColor: C.panelLine, overflow: 'hidden' },
  cardOn: { borderColor: C.brass, borderWidth: 2 },
  cardArt: { height: 92, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(60,82,52,0.35)' },
  dot: { position: 'absolute', right: 10, top: 10, width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: 'rgba(0,0,0,0.3)' },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  cardName: { fontFamily: F.display, fontSize: 16.5, lineHeight: 22, color: C.ivory, flexShrink: 1 },
  cardWeight: { fontFamily: F.sansMedium, fontSize: 13.5, color: C.secondary },
  detail: { gap: 8, padding: 16, borderRadius: 18, backgroundColor: C.panel, borderWidth: 1, borderColor: C.panelLine },
  detailName: { fontFamily: F.display, fontSize: 26, lineHeight: 34, color: C.ivory },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.panelLine },
  stat: { fontFamily: F.sansMedium, fontSize: 14, color: C.secondary },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 60 },
  actions: { flexDirection: 'row', gap: 8 },
  coin: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#E2C682', borderWidth: 1.5, borderColor: '#8D6E39' },
  dishCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  dishArt: { width: 96, height: 72 },
  stockCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  stockArt: { width: 64, height: 48, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
});
