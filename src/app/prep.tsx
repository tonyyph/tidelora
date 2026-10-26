import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BAU_SEN } from '../ecology/locations';
import { SPECIES_BIO } from '../ecology/species';
import type { BaitId } from '../ecology/types';
import { baitAvailable } from '../economy/market';
import { BAITS, BAIT_DEPTHS, GEAR, loadoutWarnings, resolveLoadout, type GearSlot } from '../gear/catalog';
import { useGame } from '../state/gameStore';
import { formatDepth } from '../ui/format';
import { Button, Divider, Panel, T } from '../ui/primitives';
import { ScreenFrame } from '../ui/Screen';
import { C } from '../ui/theme';
import { WoodSurface } from '../ui/WoodSurface';

const SLOT_VI: Record<GearSlot, string> = { rod: 'Cần', reel: 'Máy', line: 'Cước', hook: 'Lưỡi', float: 'Phao', cooler: 'Giữ cá' };

const PRESETS: { id: string; label: string; bait: BaitId; depth: number; hook: string }[] = [
  { id: 'small', label: 'Cá nhỏ mép sen', bait: 'worm', depth: 0.9, hook: 'hook-10' },
  { id: 'barb', label: 'Mè vinh lòng sâu', bait: 'bran', depth: 1.8, hook: 'hook-10' },
  { id: 'snakehead', label: 'Săn cá lóc gốc tràm', bait: 'shrimp', depth: 0.9, hook: 'hook-4' },
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
      subtitle="Bàn đồ nghề"
      background={<WoodSurface tone="bench" />}
      right={<Button label="Xuống bàu" kind="primary" style={{ minWidth: 170 }} onPress={() => router.replace('/fish')} />}
    >
      <View style={styles.cols}>
        <Panel style={styles.place}>
          <T kind="label">Điểm đến</T>
          <T kind="display" style={{ fontSize: 26, lineHeight: 34 }}>{BAU_SEN.nameVi}</T>
          <T kind="caption">{BAU_SEN.regionRef}</T>
          <Divider />
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 4 }}>
            <Row k="Thủy vực" v={BAU_SEN.waterbody} />
            <Row k="Nước" v={`Ngọt · ${BAU_SEN.waterTempC.value}°C · ${BAU_SEN.clarity.value}`} />
            <Row k="Độ sâu" v={`${formatDepth(BAU_SEN.depthM.value[0])} – ${formatDepth(BAU_SEN.depthM.value[1])} · ${BAU_SEN.current}`} />
            <Row k="Đáy" v={BAU_SEN.substrate} />
            <Row k="Trời" v={`${BAU_SEN.weather.nameVi} · bình minh`} />
            <T kind="label" style={{ marginTop: 8 }}>Các điểm câu</T>
            {BAU_SEN.microhabitats.map((m) => (
              <T key={m.id} kind="caption">
                {m.nameVi} · ~{formatDepth(m.depthM)}
              </T>
            ))}
            <T kind="label" style={{ marginTop: 8 }}>Loài đã gặp ở đây</T>
            <T kind="caption">
              {discovered.length ? discovered.map((id) => SPECIES_BIO[id].nameVi).join(', ') : 'Chưa ghi nhận loài nào.'}
              {discovered.length < BAU_SEN.species.length ? ` · còn ${BAU_SEN.species.length - discovered.length} loài chưa gặp` : ''}
            </T>
          </ScrollView>
        </Panel>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.bench}>
          <Panel style={{ gap: 4 }}>
            <T kind="label">Bộ cần · chạm để đổi đồ đã có</T>
            <View style={styles.slots}>
              {(Object.keys(SLOT_VI) as GearSlot[]).map((slot) => {
                const item = GEAR[save.loadout[slot]];
                const owned = Object.values(GEAR).filter((x) => x.slot === slot && save.ownedGear.includes(x.id)).length;
                return (
                  <Pressable key={slot} onPress={() => cycle(slot)} style={[styles.slot, owned > 1 && { borderColor: 'rgba(185,155,99,0.6)' }]} accessibilityLabel={`${SLOT_VI[slot]}: ${item.nameVi}`}>
                    <T kind="label">{SLOT_VI[slot]}{owned > 1 ? ` · ${owned}` : ''}</T>
                    <T style={{ fontSize: 14 }} numberOfLines={1}>{item.nameVi}</T>
                    <T kind="caption" numberOfLines={2}>{item.blurb}</T>
                  </Pressable>
                );
              })}
            </View>
          </Panel>

          <Panel style={{ gap: 6 }}>
            <T kind="label">Mồi và độ sâu</T>
            <View style={styles.row}>
              {(Object.keys(BAITS) as BaitId[]).map((b) => {
                const on = save.bait === b;
                const ok = baitAvailable(save, b);
                return (
                  <Pressable key={b} disabled={!ok} onPress={() => g().setBait(b)} style={[styles.chip, on && styles.chipOn, !ok && { opacity: 0.4 }]}>
                    <T style={[{ fontSize: 14 }, on && { color: C.ink }]}>{BAITS[b].nameVi}</T>
                    <T kind="caption" style={on ? { color: C.ink } : undefined}>{BAITS[b].free ? 'tự đào' : `còn ${save.baitStock[b]}`}</T>
                  </Pressable>
                );
              })}
              <View style={{ width: 12 }} />
              {BAIT_DEPTHS.map((d) => {
                const on = Math.abs(save.baitDepthM - d) < 0.01;
                return (
                  <Pressable key={d} onPress={() => g().setBaitDepth(d)} style={[styles.chip, on && styles.chipOn]}>
                    <T style={[{ fontSize: 14 }, on && { color: C.ink }]}>{formatDepth(d)}</T>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.row}>
              <T kind="label" style={{ alignSelf: 'center' }}>Bộ có sẵn</T>
              {PRESETS.map((p) => (
                <Button key={p.id} small kind="quiet" label={p.label} onPress={() => applyPreset(p)} />
              ))}
            </View>
            {warnings.map((w) => (
              <T key={w} kind="caption" style={{ color: C.warn }}>
                ⚠︎ {w}
              </T>
            ))}
            {loadout.cooler.tripCost > 0 && <T kind="caption">Đá lạnh cho thùng: {loadout.cooler.tripCost} xu mỗi chuyến.</T>}
          </Panel>
        </ScrollView>
      </View>
    </ScreenFrame>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <T kind="caption" style={{ width: 64 }}>{k}</T>
      <T kind="caption" style={{ flex: 1, color: C.ivory }}>{v}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  cols: { flex: 1, flexDirection: 'row', gap: 14 },
  place: { width: 300 },
  bench: { gap: 10, paddingBottom: 12 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { width: '32%', flexGrow: 1, borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 8, gap: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(243,235,221,0.3)' },
  chipOn: { backgroundColor: C.ivory, borderColor: C.ivory },
});
