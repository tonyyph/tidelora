import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { play } from '../../audio/sound';
import { BAU_SEN } from '../../ecology/locations';
import { SPECIES_BIO } from '../../ecology/species';
import { catchPrice } from '../../economy/market';
import { coolerFree, coolerOf } from '../../inventory/catches';
import type { PendingCatch, SaveGame } from '../../persistence/schema';
import { FishArt, fishAspect } from '../../rendering/fish/FishArt';
import { Button, T } from '../primitives';
import { C, F } from '../theme';
import { formatWeight } from '../format';

const CONDITION_VI = { excellent: 'Nguyên vẹn', good: 'Tốt', bruised: 'Trầy nhẹ' } as const;

export function CatchResult({ pending, save, onKeep, onRelease }: { pending: PendingCatch; save: SaveGame; onKeep: () => void; onRelease: () => void }) {
  const { width, height } = useWindowDimensions();
  const bio = SPECIES_BIO[pending.speciesId];
  // Board length scales with the catch so small fish are not lost on it; the ruler keeps it honest.
  const boardCm = Math.max(20, Math.ceil((pending.lengthCm * 1.35) / 10) * 10);
  const boardW = Math.min(width * 0.62, 620);
  const fishW = (pending.lengthCm / boardCm) * boardW;
  const fishH = fishW * fishAspect(pending.speciesId);
  const boardH = Math.max(fishH + 34, height * 0.26);
  const free = coolerFree(save);
  const price = catchPrice({ ...pending, freshness: 1 });
  const cap = coolerOf(save).capacity;
  const spot = BAU_SEN.microhabitats.find((m) => m.id === pending.spotId)?.nameVi ?? '';

  useEffect(() => {
    if (pending.isNewSpecies) play('discovery');
  }, [pending.id, pending.isNewSpecies]);

  return (
    <Animated.View entering={FadeIn.duration(450)} style={styles.root}>
      <View style={styles.head}>
        {pending.isNewSpecies && (
          <Animated.View entering={FadeIn.delay(400).duration(800)} style={styles.tag}>
            <T kind="label" style={{ color: C.brass }}>Loài mới trong sổ</T>
          </Animated.View>
        )}
        {pending.isRecord && (
          <View style={styles.tag}>
            <T kind="label" style={{ color: C.brass }}>Kỷ lục cá nhân</T>
          </View>
        )}
        <T kind="display">{bio.nameVi}</T>
        <T style={styles.sci}>{bio.scientific}</T>
      </View>

      <Animated.View entering={FadeInDown.duration(500)} style={[styles.board, { width: boardW, height: boardH }]}>
        <View style={styles.grain} />
        <View style={styles.ruler}>
          {Array.from({ length: boardCm + 1 }, (_, i) => (
            <View key={i} style={[styles.tick, { left: (i / boardCm) * boardW, height: i % 10 === 0 ? 12 : i % 5 === 0 ? 8 : 4 }]} />
          ))}
          {Array.from({ length: boardCm / 10 + 1 }, (_, i) => (
            <T key={`n${i}`} style={[styles.tickNum, { left: ((i * 10) / boardCm) * boardW - 8 }]}>
              {i * 10}
            </T>
          ))}
        </View>
        <View style={{ position: 'absolute', left: 0, bottom: (boardH - fishH) / 2 - 6 }}>
          <FishArt speciesId={pending.speciesId} width={fishW} />
        </View>
        {/* The measured length, from the catch data, on the same scale as the ruler and the fish. */}
        <View style={[styles.mark, { left: Math.min(fishW, boardW - 1) }]} />
        <T style={[styles.markNum, { left: Math.min(fishW, boardW - 40) - 20 }]}>{pending.lengthCm.toLocaleString('vi-VN')} cm</T>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.stats}>
          <Stat label="Chiều dài" value={`${pending.lengthCm.toLocaleString('vi-VN')} cm`} />
          <Stat label="Khối lượng" value={formatWeight(pending.weightKg)} />
          <Stat label="Tình trạng" value={CONDITION_VI[pending.condition]} />
          <Stat label="Nơi bắt" value={spot} />
          <Stat label="Giá chợ" value={`~${price} xu`} />
        </View>
        <View style={styles.actions}>
          <Button label="Thả lại" onPress={onRelease} />
          <Button
            label={free > 0 ? `Giữ lại · giỏ ${cap - free + 1}/${cap}` : 'Giỏ đã đầy'}
            kind="primary"
            disabled={free <= 0}
            onPress={onKeep}
          />
        </View>
      </View>
      {free <= 0 && <T kind="caption" style={styles.full}>Giỏ đầy: thả lại con này. Sau đó bấm Về nhà để bán cá rồi quay lại.</T>}
    </Animated.View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <T kind="label">{label}</T>
      <T kind="number">{value}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(8,20,22,0.82)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 14 },
  head: { alignItems: 'center', gap: 2 },
  sci: { fontFamily: F.displayItalic, color: C.textDim, fontSize: 15 },
  tag: { borderWidth: 1, borderColor: 'rgba(185,155,99,0.5)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 6 },
  board: { borderRadius: 6, backgroundColor: '#7A6249', overflow: 'visible', borderWidth: 1, borderColor: '#5B4734', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
  grain: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 6, backgroundColor: 'rgba(40,25,10,0.18)', borderTopWidth: 6, borderTopColor: 'rgba(255,240,210,0.08)' },
  ruler: { position: 'absolute', left: 0, right: 0, top: 0, height: 26 },
  tick: { position: 'absolute', top: 0, width: 1, backgroundColor: 'rgba(243,235,221,0.6)' },
  mark: { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1, backgroundColor: C.brassHi, opacity: 0.85 },
  markNum: { position: 'absolute', bottom: 6, width: 60, textAlign: 'center', fontSize: 11, color: C.ink, backgroundColor: C.brassHi, borderRadius: 6, overflow: 'hidden', fontFamily: F.sansBold },
  tickNum: { position: 'absolute', top: 12, width: 16, textAlign: 'center', fontSize: 9, color: 'rgba(243,235,221,0.7)', fontFamily: F.sansMedium },
  footer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', width: '100%', maxWidth: 820, gap: 20 },
  stats: { flexDirection: 'row', gap: 22, flexShrink: 1 },
  actions: { flexDirection: 'row', gap: 10 },
  full: { color: C.warn },
});
