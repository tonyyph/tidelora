import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { play } from '../audio/sound';
import type { BaitId } from '../ecology/types';
import { BAITS, GEAR, type GearItem, type GearSlot } from '../gear/catalog';
import { atHome } from '../inventory/catches';
import { useGame } from '../state/gameStore';
import { Button, Divider, Panel, T } from '../ui/primitives';
import { ScreenFrame } from '../ui/Screen';
import { C } from '../ui/theme';
import { WoodSurface } from '../ui/WoodSurface';

const SLOT_VI: Record<GearSlot, string> = { rod: 'Cần câu', reel: 'Máy câu', line: 'Cước', hook: 'Lưỡi', float: 'Phao', cooler: 'Giữ cá' };

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
  const [slot, setSlot] = useState<GearSlot>('rod');
  if (!save) return null;
  const items = Object.values(GEAR).filter((x) => x.slot === slot);
  const current = GEAR[save.loadout[slot]];
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
    <ScreenFrame title="Chợ & tiệm đồ câu" subtitle="Đồ nghề có được có mất: chọn theo con cá bạn muốn" background={<WoodSurface tone="bench" />}>
      <View style={styles.cols}>
        <View style={styles.slots}>
          {(Object.keys(SLOT_VI) as GearSlot[]).map((s) => (
            <Pressable key={s} onPress={() => setSlot(s)} style={[styles.slot, s === slot && styles.slotOn]}>
              <T style={[{ fontSize: 15 }, s === slot && { color: C.ink }]}>{SLOT_VI[s]}</T>
            </Pressable>
          ))}
          <Divider />
          <T kind="label">Mồi</T>
          {(Object.keys(BAITS) as BaitId[])
            .filter((b) => !BAITS[b].free)
            .map((b) => (
              <Button
                key={b}
                small
                label={`${BAITS[b].nameVi} ×${BAITS[b].packSize} · ${BAITS[b].packPrice} xu`}
                disabled={save.money < BAITS[b].packPrice}
                onPress={() => g().buyBaitPack(b).ok && play('coins', 0.5)}
              />
            ))}
          <T kind="caption">Trùn đất luôn miễn phí: tự đào ven bờ.</T>
          {homeFish > 0 && <Button small label={`Bán cá ở kho (${homeFish})`} onPress={() => router.push('/stash')} style={{ marginTop: 6 }} />}
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.cards}>
          {items.map((item) => {
            const owned = save.ownedGear.includes(item.id);
            const equipped = save.loadout[slot] === item.id;
            const cur = stats(current);
            return (
              <Panel key={item.id} style={[styles.card, equipped && { borderColor: C.brass }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <T kind="title">{item.nameVi}</T>
                  <T kind="number">{item.price ? `${item.price} xu` : 'Có sẵn'}</T>
                </View>
                <T kind="caption">{item.blurb}</T>
                <Divider />
                {stats(item).map(([label, v, unit, higher], i) => {
                  const base = cur[i]?.[1] ?? v;
                  const better = v === base ? null : higher ? v > base : v < base;
                  return (
                    <View key={label} style={styles.statRow}>
                      <T kind="caption" style={{ flex: 1 }}>{label}</T>
                      {!equipped && v !== base && (
                        <T kind="caption" style={{ marginRight: 6 }}>
                          {fmt(base)} →
                        </T>
                      )}
                      <T kind="number" style={{ fontSize: 14, color: better === null ? C.ivory : better ? C.fresh : C.warn }}>
                        {fmt(v)} {unit}
                        {better === null ? '' : better ? ' ▲' : ' ▼'}
                      </T>
                    </View>
                  );
                })}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                  {equipped ? (
                    <T kind="label" style={{ color: C.brass }}>Đang dùng</T>
                  ) : owned ? (
                    <Button small label="Dùng" onPress={() => g().equip(item.id)} />
                  ) : (
                    <Button small kind="primary" label={save.money < item.price ? `Thiếu ${item.price - save.money} xu` : 'Mua'} disabled={save.money < item.price} onPress={() => buy(item)} />
                  )}
                </View>
              </Panel>
            );
          })}
        </ScrollView>
      </View>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  cols: { flex: 1, flexDirection: 'row', gap: 14 },
  slots: { width: 230, gap: 6 },
  slot: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(11,26,29,0.6)' },
  slotOn: { backgroundColor: C.ivory },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 16 },
  card: { width: 300, borderWidth: 1, borderColor: C.line },
  statRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
});
