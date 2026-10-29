import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { Settings } from '../persistence/storage';
import { useGame } from '../state/gameStore';
import { Panel, T } from '../ui/primitives';
import { ScreenFrame } from '../ui/Screen';
import { C, F } from '../ui/theme';
import { Backdrop } from '../ui/Backdrop';

type BoolKey = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];

const TOGGLES: { key: BoolKey; label: string; note: string }[] = [
  { key: 'assist', label: 'Chế độ thư giãn', note: 'Cửa sổ giật cần và vớt cá rộng hơn, quăng chuẩn hơn.' },
  { key: 'haptics', label: 'Rung phản hồi', note: 'Cá rỉa, cá cắn, dây căng nguy hiểm, vớt cá.' },
  { key: 'reducedMotion', label: 'Giảm chuyển động', note: 'Sóng, sương và cỏ chuyển động chậm, tắt côn trùng bay.' },
  { key: 'leftHanded', label: 'Thuận tay trái', note: 'Đổi nút thao tác chính sang bên trái.' },
  { key: 'largeText', label: 'Chữ lớn', note: 'Tăng cỡ chữ giao diện.' },
];

export default function SettingsScreen() {
  const settings = useGame((s) => s.settings);
  const update = useGame((s) => s.updateSettings);
  return (
    <ScreenFrame title="Cài đặt" background={<Backdrop art="bg-home-morning" scrim="room" />}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Panel style={styles.col}>
          <T kind="label">Âm thanh</T>
          <Steps label="Hiệu ứng" value={settings.sfx} onChange={(v) => update({ sfx: v })} />
          <Steps label="Môi trường" value={settings.ambience} onChange={(v) => update({ ambience: v })} />
          <T kind="label" style={{ marginTop: 12 }}>Đồ họa</T>
          <View style={styles.row}>
            {(['high', 'low'] as const).map((q) => (
              <Pressable key={q} onPress={() => update({ quality: q })} accessibilityRole="radio" accessibilityState={{ selected: settings.quality === q }} style={[styles.chip, settings.quality === q && styles.chipOn]}>
                <T style={settings.quality === q ? { color: C.ink } : undefined}>{q === 'high' ? 'Cao' : 'Tiết kiệm'}</T>
              </Pressable>
            ))}
          </View>
          <T kind="caption">Mức tiết kiệm bỏ lớp gợn chi tiết và côn trùng, giữ nguyên tín hiệu phao.</T>
        </Panel>
        <Panel style={styles.col}>
          {TOGGLES.map((t) => (
            <Pressable key={t.key} onPress={() => update({ [t.key]: !settings[t.key] })} accessibilityRole="switch" accessibilityState={{ checked: settings[t.key] }} style={styles.toggle}>
              <View style={{ flex: 1 }}>
                <T>{t.label}</T>
                <T kind="caption">{t.note}</T>
              </View>
              <View style={[styles.switch, settings[t.key] && styles.switchOn]}>
                <View style={[styles.knob, settings[t.key] && { alignSelf: 'flex-end', backgroundColor: C.ink }]} />
              </View>
            </Pressable>
          ))}
          {__DEV__ && (
            <Pressable onPress={() => update({ debug: !settings.debug })} style={styles.toggle}>
              <View style={{ flex: 1 }}>
                <T>Lớp gỡ lỗi (dev)</T>
                <T kind="caption">Seed, loài hợp lệ/bị loại và hệ số trên màn câu.</T>
              </View>
              <View style={[styles.switch, settings.debug && styles.switchOn]}>
                <View style={[styles.knob, settings.debug && { alignSelf: 'flex-end', backgroundColor: C.ink }]} />
              </View>
            </Pressable>
          )}
        </Panel>
      </ScrollView>
    </ScreenFrame>
  );
}

function Steps({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const steps = [0, 0.25, 0.5, 0.75, 1];
  const nearest = steps.reduce((best, x) => (Math.abs(x - value) < Math.abs(best - value) ? x : best), steps[0]);
  const on = (x: number) => x === nearest;
  return (
    <View style={{ gap: 6 }}>
      <T kind="caption">{label}</T>
      <View style={styles.row}>
        {steps.map((s) => (
          // One chip marks the one value: the level, not everything up to it.
          <Pressable key={s} onPress={() => onChange(s)} accessibilityRole="radio" accessibilityState={{ selected: on(s) }} accessibilityLabel={`${label} ${s === 0 ? 'tắt' : `${Math.round(s * 100)}%`}`} style={[styles.step, on(s) && styles.stepOn]}>
            <T kind="caption" style={on(s) ? { color: C.ink, fontFamily: F.sansBold } : undefined}>{s === 0 ? 'Tắt' : `${Math.round(s * 100)}`}</T>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  col: { flex: 1, gap: 8 },
  row: { flexDirection: 'row', gap: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(243,235,221,0.3)' },
  chipOn: { backgroundColor: C.brass, borderColor: C.brassHi },
  step: { width: 52, height: 34, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(243,235,221,0.3)', alignItems: 'center', justifyContent: 'center' },
  stepOn: { backgroundColor: C.brass, borderColor: C.brassHi },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  switch: { width: 46, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: 'rgba(243,235,221,0.5)', padding: 3, justifyContent: 'center' },
  switchOn: { backgroundColor: C.brass, borderColor: C.brass },
  knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: C.ivory },
});
