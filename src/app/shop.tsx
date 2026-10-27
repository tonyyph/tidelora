import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { play } from '../audio/sound';
import type { BaitId } from '../ecology/types';
import { BAITS, GEAR, type GearItem, type GearSlot } from '../gear/catalog';
import { compareGear } from '../gear/compare';
import { atHome } from '../inventory/catches';
import { useGame } from '../state/gameStore';
import { Button, Divider, Panel, T } from '../ui/primitives';
import { ScreenFrame } from '../ui/Screen';
import { C, F } from '../ui/theme';
import { WoodSurface } from '../ui/WoodSurface';

type Tab = GearSlot | 'bait';
const TAB_VI: Record<Tab, string> = { bait: 'Mồi', rod: 'Cần câu', reel: 'Máy câu', line: 'Cước', hook: 'Lưỡi', float: 'Phao', cooler: 'Giữ cá' };

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

  return (
    <ScreenFrame title="Chợ & tiệm đồ câu" subtitle="Đồ nghề có được có mất: chọn theo con cá bạn muốn" background={<WoodSurface tone="bench" />}
      right={homeFish > 0 ? <Button small label={`Bán cá ở kho (${homeFish})`} onPress={() => router.push('/stash')} /> : undefined}
    >
      <View style={styles.cols}>
        <View style={styles.slots}>
          {(Object.keys(TAB_VI) as Tab[]).map((t) => {
            const upgrades = t === 'bait' ? 0 : Object.values(GEAR).filter((x) => x.slot === t && !save.ownedGear.includes(x.id)).length;
            return (
              <Pressable key={t} onPress={() => setSlot(t)} style={[styles.slot, t === slot && styles.slotOn]}>
                <T style={[{ fontSize: 15 }, t === slot && { color: C.ink }]}>{TAB_VI[t]}</T>
                {upgrades > 0 && <View style={[styles.newDot, t === slot && { backgroundColor: C.ink }]} />}
              </Pressable>
            );
          })}
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.cards}>
          {slot === 'bait'
            ? (Object.keys(BAITS) as BaitId[]).map((b) => {
                const bait = BAITS[b];
                return (
                  <Panel key={b} style={styles.card}>
                    <View style={styles.cardHead}>
                      <T kind="title">{bait.nameVi}</T>
                      <T kind="number">{bait.free ? 'Miễn phí' : `${bait.packPrice} xu`}</T>
                    </View>
                    <T kind="caption">{bait.blurb}</T>
                    <Divider />
                    <T style={{ fontSize: 14 }}>{bait.free ? 'Tự đào ven bờ, luôn có' : `Gói ${bait.packSize} lần quăng · đang có ${save.baitStock[b]}`}</T>
                    {!bait.free && (
                      <View style={styles.cardFoot}>
                        <Button
                          small
                          kind="primary"
                          label={save.money < bait.packPrice ? `Thiếu ${bait.packPrice - save.money} xu` : `Mua gói · ${bait.packPrice} xu`}
                          disabled={save.money < bait.packPrice}
                          onPress={() => g().buyBaitPack(b).ok && play('coins', 0.5)}
                        />
                      </View>
                    )}
                  </Panel>
                );
              })
            : Object.values(GEAR)
                .filter((x) => x.slot === slot)
                .map((item) => <GearCard key={item.id} item={item} current={GEAR[save.loadout[slot]]} owned={save.ownedGear.includes(item.id)} money={save.money} onBuy={() => buy(item)} onEquip={() => g().equip(item.id)} />)}
        </ScrollView>
      </View>
    </ScreenFrame>
  );
}

function GearCard({ item, current, owned, money, onBuy, onEquip }: { item: GearItem; current: GearItem; owned: boolean; money: number; onBuy: () => void; onEquip: () => void }) {
  const equipped = item.id === current.id;
  const diffs = compareGear(current, item);
  return (
    <Panel style={[styles.card, equipped && { borderColor: C.brass }]}>
      <View style={styles.cardHead}>
        <T kind="title">{item.nameVi}</T>
        <T kind="number">{item.price ? `${item.price} xu` : 'Có sẵn'}</T>
      </View>
      <T kind="caption">{item.blurb}</T>
      <Divider />
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
      <View style={styles.cardFoot}>
        {equipped ? (
          <T kind="label" style={{ color: C.brass }}>Đang dùng</T>
        ) : owned ? (
          <Button small label="Dùng" onPress={onEquip} />
        ) : (
          <Button small kind="primary" label={money < item.price ? `Thiếu ${item.price - money} xu` : 'Mua'} disabled={money < item.price} onPress={onBuy} />
        )}
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  cols: { flex: 1, flexDirection: 'row', gap: 14 },
  slots: { width: 170, gap: 5 },
  slot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, minHeight: 38, borderRadius: 10, backgroundColor: 'rgba(11,26,29,0.6)' },
  newDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.brass },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  cardFoot: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: 8 },
  diffRow: { flexDirection: 'row', gap: 8, paddingVertical: 1 },
  diffMark: { width: 12, fontFamily: F.sansBold, fontSize: 16, lineHeight: 19 },
  slotOn: { backgroundColor: C.ivory },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 16 },
  card: { width: '48%', flexGrow: 1, borderWidth: 1, borderColor: C.line },
  statRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
});
