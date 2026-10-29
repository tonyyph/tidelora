import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BaitId } from '../../ecology/types';
import { BAITS, BAIT_DEPTHS, GEAR } from '../../gear/catalog';
import { inCooler, coolerOf } from '../../inventory/catches';
import type { SaveGame } from '../../persistence/schema';
import { formatDepth } from '../format';
import { Button, Divider, T } from '../primitives';
import { C } from '../theme';

const DEPTH_LABEL = ['Tầng mặt', 'Tầng giữa', 'Sát đáy*'];

/** In-trip tackle: bait and float depth. Gear itself is changed at home. */
export function TackleSheet({ save, canChange, onBait, onDepth, onClose }: { save: SaveGame; canChange: boolean; onBait: (b: BaitId) => void; onDepth: (m: number) => void; onClose: () => void }) {
  const cooler = coolerOf(save);
  const insets = useSafeAreaInsets();
  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={styles.scrim}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Đóng" />
      <Animated.View entering={SlideInLeft.duration(260)} style={[styles.sheet, { width: 380 + insets.left }]}>
        {/* Scrolls on short screens so Xong stays reachable; padded clear of the camera cutout. */}
        <ScrollView contentContainerStyle={[styles.body, { paddingLeft: 28 + insets.left, paddingTop: 22 + insets.top, paddingBottom: 22 + insets.bottom }]}>
          <T kind="title">Hộp đồ câu</T>
          {!canChange && <T kind="caption" style={{ color: C.brass }}>Thu cần về rồi mới đổi mồi.</T>}
          <Divider />
          <T kind="label">Mồi</T>
          <View style={styles.row}>
            {(Object.keys(BAITS) as BaitId[]).map((b) => {
              const def = BAITS[b];
              const stock = def.free ? '∞' : String(save.baitStock[b]);
              const empty = !def.free && save.baitStock[b] <= 0;
              const on = save.bait === b;
              return (
                <Pressable key={b} disabled={!canChange || empty} onPress={() => onBait(b)} style={[styles.chip, on && styles.chipOn, (empty || !canChange) && !on && { opacity: 0.4 }]} accessibilityState={{ selected: on }}>
                  <T style={[styles.chipText, on && { color: C.ink }]}>{def.nameVi}</T>
                  <T kind="caption" style={on ? { color: C.ink } : undefined}>{stock}</T>
                </Pressable>
              );
            })}
          </View>
          <T kind="caption">{BAITS[save.bait].blurb}</T>
          <T kind="label" style={{ marginTop: 10 }}>Độ sâu phao</T>
          <View style={styles.row}>
            {BAIT_DEPTHS.map((d, i) => {
              const on = Math.abs(save.baitDepthM - d) < 0.01;
              return (
                <Pressable key={d} disabled={!canChange} onPress={() => onDepth(d)} style={[styles.chip, on && styles.chipOn, !canChange && !on && { opacity: 0.4 }]} accessibilityState={{ selected: on }}>
                  <T style={[styles.chipText, on && { color: C.ink }]}>{DEPTH_LABEL[i]}</T>
                  <T kind="caption" style={on ? { color: C.ink } : undefined}>{formatDepth(d)}</T>
                </Pressable>
              );
            })}
          </View>
          <T kind="caption">*Nếu chỗ thả nông hơn độ sâu phao, mồi nằm sát đáy.</T>
          <Divider />
          <T kind="label">Đang dùng</T>
          <T kind="caption">
            {[GEAR[save.loadout.rod].nameVi, GEAR[save.loadout.reel].nameVi, GEAR[save.loadout.line].nameVi, GEAR[save.loadout.hook].nameVi, GEAR[save.loadout.float].nameVi].join(' · ')}
          </T>
          <T kind="caption">
            {cooler.nameVi}: {inCooler(save).length}/{cooler.capacity}
          </T>
          <Button label="Xong" small onPress={onClose} style={{ alignSelf: 'flex-start', marginTop: 8 }} />
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(5,14,16,0.35)' },
  sheet: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(17,40,35,0.96)', borderRightWidth: 1, borderColor: C.panelLine },
  body: { paddingRight: 28, gap: 6 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(243,235,221,0.3)', minWidth: 92, gap: 2 },
  chipOn: { backgroundColor: C.brass, borderColor: C.brassHi },
  chipText: { fontSize: 14 },
});
