import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { play } from '../audio/sound';
import type { BaitId } from '../ecology/types';
import { BAITS, GEAR, type GearItem, type GearSlot } from '../gear/catalog';
import { compareGear } from '../gear/compare';
import { atHome } from '../inventory/catches';
import { useGame } from '../state/gameStore';
import { ART, artAspect, GEAR_ART, type ArtId } from '../rendering/art';
import { Button, Divider, Icon, type IconName, Panel, T } from '../ui/primitives';
import { ScreenFrame } from '../ui/Screen';
import { C, F } from '../ui/theme';
import { Backdrop } from '../ui/Backdrop';

type Tab = GearSlot | 'bait';
const TAB_VI: Record<Tab, string> = { bait: 'Mồi', rod: 'Cần câu', reel: 'Máy câu', line: 'Cước', hook: 'Lưỡi', float: 'Phao', cooler: 'Giữ cá' };
/** Fallback icons for items without painted art. */
const TAB_ICON: Record<Tab, IconName> = { bait: 'grain', rod: 'slash-forward', reel: 'cog-outline', line: 'sine-wave', hook: 'hook', float: 'map-marker-down', cooler: 'basket-outline' };
const BAIT_ART: Partial<Record<BaitId, ArtId>> = { worm: 'item-earthworm' };

/** Stat lines per slot, as [label, value, unit, higher-is-better]. */
function stats(g: GearItem): [string, number, string, boolean][] {
  switch (g.slot) {
    case 'rod':
      return [
        ['Tầm quăng', g.castM, 'm', true],
        ['Độ lệch', g.errorM, 'm', false],
        ['Độ dẻo đỡ giật', g.flex, '', true],
        ['Lực nâng cá', g.liftKgf, 'kgf', true],
      ];
    case 'reel':
      return [
        ['Tốc độ thu', g.retrieveMs, 'm/s', true],
        ['Drag tối đa', g.dragMaxKgf, 'kgf', true],
        ['Độ mịn drag', g.dragSmooth, '', true],
        ['Sức chứa ống', g.spoolM, 'm', true],
      ];
    case 'line':
      return [
        ['Chịu lực', g.strengthKgf, 'kgf', true],
        ['Dễ bị cá thấy', g.visibility, '', false],
      ];
    case 'hook':
      return [['Cỡ', g.size === 'small' ? 10 : 4, '', false]];
    case 'float':
      return [
        ['Độ nhạy', g.sensitivity, '', true],
        ['Đứng vững trong gió', g.stability, '', true],
        ['Quăng xa thêm', g.castBonusM, 'm', true],
      ];
    case 'cooler':
      return [
        ['Sức chứa', g.capacity, 'con', true],
        ['Mất tươi mỗi giờ', g.freshLossPerHour * 100, '%', false],
        ['Phí mỗi chuyến', g.tripCost, 'xu', false],
      ];
  }
}

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toLocaleString('vi-VN', { maximumFractionDigits: 2 }));

export default function Shop() {
  const save = useGame((s) => s.save);
  const g = useGame.getState;
  const params = useLocalSearchParams<{ slot?: string }>();
  const [slot, setSlot] = useState<Tab>(() => (params.slot && params.slot in TAB_VI ? (params.slot as Tab) : 'rod'));
  const [picked, setPicked] = useState<string | null>(null);
  if (!save) return null;
  const homeFish = atHome(save).length;

  const buy = (item: GearItem) => {
    Alert.alert(`Mua ${item.nameVi}?`, `${item.price} xu. ${item.blurb}`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Mua',
        onPress: () => {
          if (g().buy(item.id).ok) {
            play('coins');
            g().equip(item.id);
          }
        },
      },
    ]);
  };

  // Products in the tab: id, name, price label, art/icon and state.
  const items =
    slot === 'bait'
      ? (Object.keys(BAITS) as BaitId[]).map((b) => ({ id: b as string, name: BAITS[b].nameVi, price: BAITS[b].free ? 'Miễn phí' : `${BAITS[b].packPrice} xu`, art: BAIT_ART[b], state: BAITS[b].free ? 'Luôn có' : `Còn ${save.baitStock[b]}` }))
      : Object.values(GEAR)
          .filter((x) => x.slot === slot)
          .map((x) => ({
            id: x.id,
            name: x.nameVi,
            price: x.price ? `${x.price} xu` : 'Có sẵn',
            art: GEAR_ART[x.id],
            state: save.loadout[slot as GearSlot] === x.id ? 'Đang dùng' : save.ownedGear.includes(x.id) ? 'Đã có' : '',
          }));
  const sel = items.find((x) => x.id === picked) ?? items.find((x) => x.state === 'Đang dùng') ?? items[0];

  return (
    <ScreenFrame title="Tiệm đồ câu" subtitle="Đồ nghề có được có mất: chọn theo con cá bạn muốn" background={<Backdrop art="bg-tackle-workbench" scrim="room" />}
      right={homeFish > 0 ? <Button small label={`Bán cá ở kho (${homeFish})`} onPress={() => router.push('/stash')} /> : undefined}
    >
      <View style={styles.cols}>
        <View style={styles.slots}>
        <ScrollView contentContainerStyle={{ gap: 5, paddingBottom: 8 }}>
          {(Object.keys(TAB_VI) as Tab[]).map((t) => {
            const upgrades = t === 'bait' ? 0 : Object.values(GEAR).filter((x) => x.slot === t && !save.ownedGear.includes(x.id)).length;
            return (
              <Pressable
                key={t}
                accessibilityRole="tab"
                accessibilityState={{ selected: t === slot }}
                accessibilityLabel={upgrades ? `${TAB_VI[t]}, có đồ mới` : TAB_VI[t]}
                onPress={() => {
                  setSlot(t);
                  setPicked(null);
                }}
                style={[styles.slot, t === slot && styles.slotOn]}
              >
                <T style={[{ fontSize: 15 }, t === slot && { color: C.ink, fontFamily: F.sansBold }]} numberOfLines={1}>{TAB_VI[t]}</T>
                {upgrades > 0 && <View style={[styles.newDot, t === slot && { backgroundColor: C.ink }]} />}
              </Pressable>
            );
          })}
        </ScrollView>
        </View>

        <View style={styles.list}>
        <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
          {items.map((x) => {
            const on = x.id === sel?.id;
            return (
              <Pressable key={x.id} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${x.name}, ${x.price}${x.state ? `, ${x.state}` : ''}`} onPress={() => setPicked(x.id)} style={[styles.row, on && styles.rowOn]}>
                <Thumb art={x.art} icon={TAB_ICON[slot]} size={56} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T style={styles.rowName} numberOfLines={1}>{x.name}</T>
                  <T kind="caption" numberOfLines={1} style={x.state === 'Đang dùng' && { color: C.brassHi }}>{x.state || 'Chưa có'}</T>
                </View>
                <T kind="number" style={{ fontSize: 14 }}>{x.price}</T>
              </Pressable>
            );
          })}
        </ScrollView>
        </View>

        <View style={styles.detail}>
          {sel && (slot === 'bait' ? <BaitDetail id={sel.id as BaitId} art={sel.art} money={save.money} stock={save.baitStock[sel.id as BaitId]} onBuy={() => g().buyBaitPack(sel.id as BaitId).ok && play('coins', 0.5)} /> : (
            <GearDetail item={GEAR[sel.id]} art={sel.art} icon={TAB_ICON[slot]} current={GEAR[save.loadout[slot as GearSlot]]} owned={save.ownedGear.includes(sel.id)} money={save.money} onBuy={() => buy(GEAR[sel.id])} onEquip={() => g().equip(sel.id)} />
          ))}
        </View>
      </View>
    </ScreenFrame>
  );
}

/** Painted item if there is one, otherwise a quiet icon tile. Fits inside `size`. */
function Thumb({ art, icon, size, height = size }: { art?: ArtId; icon: IconName; size: number; height?: number }) {
  if (!art) {
    return (
      <View style={[styles.thumb, { width: size, height }]}>
        <Icon name={icon} size={Math.min(size, height) * 0.48} color={C.secondary} />
      </View>
    );
  }
  const a = artAspect(art);
  const w = Math.min(size, height / a);
  return (
    <View style={{ width: size, height, alignItems: 'center', justifyContent: 'center' }}>
      <Image source={ART[art]} style={{ width: w, height: w * a }} resizeMode="contain" accessibilityIgnoresInvertColors />
    </View>
  );
}

function DetailHead({ name, price, blurb, art, icon }: { name: string; price: string; blurb: string; art?: ArtId; icon: IconName }) {
  return (
    <>
      <View style={styles.hero}>
        <Thumb art={art} icon={icon} size={170} height={art ? 104 : 64} />
      </View>
      <View style={styles.cardHead}>
        <T kind="title" style={{ flex: 1 }} numberOfLines={2}>{name}</T>
        <T kind="number">{price}</T>
      </View>
      <T kind="caption">{blurb}</T>
      <Divider />
    </>
  );
}

function BaitDetail({ id, art, money, stock, onBuy }: { id: BaitId; art?: ArtId; money: number; stock: number; onBuy: () => void }) {
  const bait = BAITS[id];
  return (
    <Panel style={styles.detailPanel}>
      <ScrollView contentContainerStyle={{ paddingBottom: 4 }}>
        <DetailHead name={bait.nameVi} price={bait.free ? 'Miễn phí' : `${bait.packPrice} xu`} blurb={bait.blurb} art={art} icon="grain" />
        <T style={{ fontSize: 14 }}>{bait.free ? 'Tự đào ven bờ, luôn có' : `Gói ${bait.packSize} lần quăng · đang có ${stock}`}</T>
      </ScrollView>
      {!bait.free && (
        <Button kind="primary" label={money < bait.packPrice ? `Thiếu ${bait.packPrice - money} xu` : `Mua gói · ${bait.packPrice} xu`} disabled={money < bait.packPrice} onPress={onBuy} style={styles.cta} />
      )}
    </Panel>
  );
}

function GearDetail({ item, art, icon, current, owned, money, onBuy, onEquip }: { item: GearItem; art?: ArtId; icon: IconName; current: GearItem; owned: boolean; money: number; onBuy: () => void; onEquip: () => void }) {
  const equipped = item.id === current.id;
  const diffs = compareGear(current, item);
  return (
    <Panel style={styles.detailPanel}>
      <ScrollView contentContainerStyle={{ paddingBottom: 4 }}>
        <DetailHead name={item.nameVi} price={item.price ? `${item.price} xu` : 'Có sẵn'} blurb={item.blurb} art={art} icon={icon} />
        {equipped ? (
          stats(item).map(([label, v, unit]) => (
            <View key={label} style={styles.statRow}>
              <T kind="caption" style={{ flex: 1 }}>{label}</T>
              <T kind="number" style={{ fontSize: 14 }}>{fmt(v)} {unit}</T>
            </View>
          ))
        ) : (
          <>
            <T kind="label" style={{ marginBottom: 2 }}>So với {current.nameVi}</T>
            {diffs.map((d) => (
              <View key={d.text} style={styles.diffRow}>
                <T style={[styles.diffMark, { color: d.good ? C.fresh : C.warn }]}>{d.good ? '+' : '−'}</T>
                <T style={{ flex: 1, fontSize: 14, lineHeight: 19 }}>{d.text}</T>
              </View>
            ))}
          </>
        )}
      </ScrollView>
      {equipped ? (
        <View style={[styles.cta, styles.using]}>
          <Icon name="check-circle-outline" size={18} color={C.brassHi} />
          <T style={{ color: C.brassHi, fontFamily: F.sansBold }}>Đang dùng</T>
        </View>
      ) : owned ? (
        <Button label="Dùng" onPress={onEquip} style={styles.cta} />
      ) : (
        <Button kind="primary" label={money < item.price ? `Thiếu ${item.price - money} xu` : `Mua · ${item.price} xu`} disabled={money < item.price} onPress={onBuy} style={styles.cta} />
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  cols: { flex: 1, flexDirection: 'row', gap: 12 },
  // Categories, products, detail: 20 / 45 / 35 of the width.
  slots: { flex: 20, minWidth: 0 },
  list: { flex: 45, minWidth: 0 },
  detail: { flex: 35, minWidth: 0 },
  slot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, minHeight: 44, borderRadius: 10, backgroundColor: C.panel, borderWidth: 1, borderColor: C.panelLine },
  slotOn: { backgroundColor: C.brass, borderColor: C.brassHi },
  newDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.brass },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingLeft: 8, paddingRight: 14, borderRadius: 14, backgroundColor: C.panel, borderWidth: 1, borderColor: C.panelLine },
  rowOn: { borderColor: C.brass, borderWidth: 2, paddingVertical: 7, paddingLeft: 7, paddingRight: 13 },
  rowName: { fontFamily: F.sansMedium, fontSize: 15.5 },
  thumb: { borderRadius: 10, backgroundColor: 'rgba(243,235,221,0.06)', alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: 6, borderRadius: 12, backgroundColor: 'rgba(243,235,221,0.05)', paddingVertical: 6 },
  detailPanel: { flex: 1, paddingBottom: 12 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  diffRow: { flexDirection: 'row', gap: 8, paddingVertical: 1 },
  diffMark: { width: 12, fontFamily: F.sansBold, fontSize: 16, lineHeight: 19 },
  statRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  cta: { marginTop: 10 },
  using: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(185,155,99,0.5)' },
});
