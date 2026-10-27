import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BAU_SEN } from '../ecology/locations';
import { SPECIES_BIO } from '../ecology/species';
import type { BaitId } from '../ecology/types';
import { baitAvailable } from '../economy/market';
import { BAITS, BAIT_DEPTHS, GEAR, loadoutWarnings, resolveLoadout, type GearSlot } from '../gear/catalog';
import { useGame } from '../state/gameStore';
import { clockLabel } from '../preservation/freshness';
import { conditionsLabel, dayPart } from '../rendering/scene/timeOfDay';
import { formatDepth } from '../ui/format';
import { Button, Panel, T } from '../ui/primitives';
import { ScreenFrame } from '../ui/Screen';
import { C } from '../ui/theme';
import { WoodSurface } from '../ui/WoodSurface';

const SLOT_VI: Record<GearSlot, string> = { rod: 'Cần', reel: 'Máy', line: 'Cước', hook: 'Lưỡi', float: 'Phao', cooler: 'Giữ cá' };

const BAIT_SHORT: Record<BaitId, string> = { worm: 'Trùn', bran: 'Cám', shrimp: 'Tép' };
const DEPTH_HINT: Record<number, string> = { 0.4: 'nông', 0.9: 'vừa', 1.8: 'sâu' };

const PRESETS: { id: string; label: string; bait: BaitId; depth: number; hook: string }[] = [
  { id: 'small', label: 'Cá nhỏ mép sen', bait: 'worm', depth: 0.9, hook: 'hook-10' },
  { id: 'barb', label: 'Cá mè vinh', bait: 'bran', depth: 1.8, hook: 'hook-10' },
  { id: 'snakehead', label: 'Cá lóc gốc tràm', bait: 'shrimp', depth: 0.9, hook: 'hook-4' },
];

/** The prep bench: check the rig, pick bait and depth, then go. One tap to start. */
export default function Prep() {
  const save = useGame((s) => s.save);
  const g = useGame.getState;
  if (!save) return null;
  const loadout = resolveLoadout(save.loadout);
  const warnings = loadoutWarnings(loadout, save.bait);

  const cycle = (slot: GearSlot) => {
    const owned = Object.values(GEAR).filter((x) => x.slot === slot && save.ownedGear.includes(x.id));
    if (owned.length < 2) return;
    const i = owned.findIndex((x) => x.id === save.loadout[slot]);
    g().equip(owned[(i + 1) % owned.length].id);
  };

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    g().setBait(baitAvailable(save, p.bait) ? p.bait : 'worm');
    g().setBaitDepth(p.depth);
    if (save.ownedGear.includes(p.hook)) g().equip(p.hook);
  };

  const discovered = BAU_SEN.species.filter((id) => save.journal[id]);

  return (
    <ScreenFrame
      title="Chuẩn bị chuyến đi"
      subtitle={`${BAU_SEN.nameVi} · ${conditionsLabel(save.minute, BAU_SEN.weather.nameVi)} · ${clockLabel(save.minute)} ${dayPart(save.minute)}`}
      background={<WoodSurface tone="bench" />}
      right={<Button label="Xuống bàu" kind="primary" style={{ minWidth: 170 }} onPress={() => router.replace('/fish')} />}
    >
      <View style={styles.cols}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.bench}>
          <Panel style={{ gap: 8 }}>
            <T kind="label">Bộ có sẵn · chạm một lần là xong</T>
            <View style={styles.presets}>
              {PRESETS.map((p) => {
                const on = save.bait === p.bait && Math.abs(save.baitDepthM - p.depth) < 0.01 && save.loadout.hook === p.hook;
                const ready = baitAvailable(save, p.bait) && save.ownedGear.includes(p.hook);
                return (
                  <Pressable key={p.id} accessibilityRole="button" onPress={() => applyPreset(p)} style={[styles.preset, on && styles.presetOn]}>
                    <T style={[{ fontSize: 14.5 }, on && { color: C.ink }]} numberOfLines={1}>{p.label}</T>
                    <T kind="caption" style={on ? { color: C.ink } : undefined} numberOfLines={1}>
                      {ready ? `${BAIT_SHORT[p.bait]} · ${formatDepth(p.depth)}${p.hook === 'hook-4' ? ' · lưỡi 4' : ''}` : !save.ownedGear.includes(p.hook) ? 'Chưa có lưỡi 4' : `Hết ${BAIT_SHORT[p.bait].toLowerCase()}`}
                    </T>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.row}>
              <T kind="label" style={styles.rowLabel}>Mồi</T>
              {(Object.keys(BAITS) as BaitId[]).map((b) => {
                const on = save.bait === b;
                const ok = baitAvailable(save, b);
                return (
                  <Pressable key={b} disabled={!ok} onPress={() => g().setBait(b)} style={[styles.chip, on && styles.chipOn, !ok && { opacity: 0.4 }]}>
                    <T style={[{ fontSize: 14 }, on && { color: C.ink }]}>
                      {BAIT_SHORT[b]}
                      <T kind="caption" style={on ? { color: C.ink } : undefined}>{BAITS[b].free ? ' · tự đào' : ` · còn ${save.baitStock[b]}`}</T>
                    </T>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.row}>
              <T kind="label" style={styles.rowLabel}>Độ sâu</T>
              {BAIT_DEPTHS.map((d) => {
                const on = Math.abs(save.baitDepthM - d) < 0.01;
                return (
                  <Pressable key={d} onPress={() => g().setBaitDepth(d)} style={[styles.chip, on && styles.chipOn]}>
                    <T style={[{ fontSize: 14 }, on && { color: C.ink }]}>
                      {formatDepth(d)}
                      <T kind="caption" style={on ? { color: C.ink } : undefined}>{` · ${DEPTH_HINT[d]}`}</T>
                    </T>
                  </Pressable>
                );
              })}
            </View>
            {warnings.map((w) => (
              <T key={w} kind="caption" style={{ color: C.warn }}>
                ⚠︎ {w}
              </T>
            ))}
            {loadout.cooler.tripCost > 0 && <T kind="caption">Đá lạnh cho thùng: {loadout.cooler.tripCost} xu mỗi chuyến.</T>}
          </Panel>

          <Panel style={{ gap: 4 }}>
            <T kind="label">Bàu Sen hôm nay</T>
            <T kind="caption">
              Nước {BAU_SEN.waterTempC.value}°C, {BAU_SEN.clarity.value.toLowerCase()} · sâu {formatDepth(BAU_SEN.depthM.value[0])} – {formatDepth(BAU_SEN.depthM.value[1])}
            </T>
            <T kind="caption">Điểm câu: {BAU_SEN.microhabitats.map((m) => `${m.nameVi.toLowerCase()} ~${formatDepth(m.depthM)}`).join(' · ')}</T>
            <T kind="caption">
              Loài đã gặp: {discovered.length ? discovered.map((id) => SPECIES_BIO[id].nameVi).join(', ') : 'chưa có'}
              {discovered.length < BAU_SEN.species.length ? ` · còn ${BAU_SEN.species.length - discovered.length} loài chưa gặp` : ''}
            </T>
          </Panel>
        </ScrollView>

        <Panel style={styles.gear}>
          <T kind="label">Bộ cần · chạm để đổi</T>
          {(Object.keys(SLOT_VI) as GearSlot[]).map((slot) => {
            const item = GEAR[save.loadout[slot]];
            const owned = Object.values(GEAR).filter((x) => x.slot === slot && save.ownedGear.includes(x.id));
            const canSwap = owned.length > 1;
            return (
              <Pressable
                key={slot}
                onPress={() => (canSwap ? cycle(slot) : router.push({ pathname: '/shop', params: { slot } }))}
                style={({ pressed }) => [styles.slot, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel={`${SLOT_VI[slot]}: ${item.nameVi}. ${canSwap ? 'Chạm để đổi' : 'Xem ở tiệm'}`}
              >
                <T kind="caption" style={{ width: 44 }}>{SLOT_VI[slot]}</T>
                <T style={{ flex: 1, fontSize: 14 }} numberOfLines={1}>{item.nameVi}</T>
                <T kind="caption" style={[styles.slotAction, canSwap && styles.slotSwap]}>
                  {canSwap ? `Đổi ${owned.findIndex((x) => x.id === item.id) + 1}/${owned.length}` : 'Tiệm ›'}
                </T>
              </Pressable>
            );
          })}
        </Panel>
      </View>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  cols: { flex: 1, flexDirection: 'row', gap: 14 },
  gear: { width: 250, gap: 0 },
  bench: { gap: 10, paddingBottom: 12 },
  presets: { flexDirection: 'row', gap: 8 },
  preset: { flex: 1, paddingHorizontal: 9, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(185,155,99,0.55)', backgroundColor: 'rgba(11,26,29,0.4)', gap: 2 },
  presetOn: { backgroundColor: C.ivory, borderColor: C.ivory },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  slotAction: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
  slotSwap: { color: C.ink, backgroundColor: C.brass },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  rowLabel: { width: 64 },
  chip: { paddingHorizontal: 11, minHeight: 40, justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(243,235,221,0.3)' },
  chipOn: { backgroundColor: C.ivory, borderColor: C.ivory },
});
