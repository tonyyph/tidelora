import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { play } from '../audio/sound';
import { BAU_SEN } from '../ecology/locations';
import { SOURCES, SPECIES_BIO, SPECIES_IDS, SPECIES_TUNING } from '../ecology/species';
import type { Certainty } from '../ecology/types';
import { BAITS } from '../gear/catalog';
import { unlockedNotes } from '../progression/journal';
import { FishArt } from '../rendering/fish/FishArt';
import { useGame } from '../state/gameStore';
import { formatWeight } from '../ui/format';
import { T } from '../ui/primitives';
import { ScreenFrame } from '../ui/Screen';
import { C, F } from '../ui/theme';
import { Backdrop } from '../ui/Backdrop';

const CERT: Record<Certainty, string> = { verified: 'đã kiểm', approximate: 'ước lượng', unknown: 'chưa rõ' };

/** Naturalist's notebook. Biology (sourced) and gameplay tips are kept on separate parts of the page. */
export default function Journal() {
  const save = useGame((s) => s.save);
  const { sp } = useLocalSearchParams<{ sp?: string }>();
  const [sel, setSel] = useState(sp && SPECIES_BIO[sp] ? sp : SPECIES_IDS[0]);
  const [prevSp, setPrevSp] = useState(sp);
  if (sp !== prevSp) {
    setPrevSp(sp);
    if (sp && SPECIES_BIO[sp]) setSel(sp);
  }
  if (!save) return null;
  const entry = save.journal[sel];
  const bio = SPECIES_BIO[sel];
  const tuning = SPECIES_TUNING[sel];
  const known = !!entry;

  return (
    <ScreenFrame title="Sổ tay thiên nhiên" subtitle={`${Object.keys(save.journal).length}/${SPECIES_IDS.length} loài ở ${BAU_SEN.nameVi}`} background={<Backdrop art="bg-storage-quiet" scrim="room" />}>
      <View style={styles.book}>
        <View style={styles.index}>
          {SPECIES_IDS.map((id) => {
            const k = !!save.journal[id];
            return (
              <Pressable
                key={id}
                onPress={() => {
                  setSel(id);
                  play('page', 0.6);
                }}
                style={[styles.idx, sel === id && styles.idxOn]}
              >
                <T style={[styles.idxName, !k && { color: C.paperDim }, sel === id && { color: C.paperInk }]}>{k ? SPECIES_BIO[id].nameVi : 'Chưa gặp'}</T>
                {k && <T style={[styles.idxSci, sel !== id && { color: C.secondary }]}>{SPECIES_BIO[id].scientific}</T>}
              </Pressable>
            );
          })}
        </View>
        <View style={styles.pageCol}>
        <ScrollView style={styles.page} contentContainerStyle={{ padding: 22, gap: 10 }}>
          {!known ? (
            <View style={{ gap: 10 }}>
              <T style={styles.h1}>Một loài chưa ghi nhận</T>
              <View style={{ opacity: 0.12 }}>
                <FishArt speciesId={sel} width={260} shadow={false} />
              </View>
              <T style={styles.p}>Bắt hoặc quan sát loài này ở {BAU_SEN.nameVi} để mở trang sổ.</T>
              <T style={styles.p}>Gợi ý: thử nhiều điểm câu, nhiều loại mồi và độ sâu khác nhau.</T>
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', gap: 20, alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <T style={styles.h1}>{bio.nameVi}</T>
                  <T style={styles.sci}>{bio.scientific}</T>
                  <T style={styles.small}>{bio.nameEn} · họ {bio.family}</T>
                </View>
                <FishArt speciesId={sel} width={280} />
              </View>

              <View style={styles.cols}>
                <View style={{ flex: 1, gap: 6 }}>
                  <T style={styles.h2}>Sinh học</T>
                  <Fact k="Hình dáng" v={bio.bodyForm} />
                  <Fact k="Đặc điểm" v={bio.features.join('; ')} />
                  <Fact k="Môi trường" v={bio.habitat} />
                  <Fact k="Phân bố" v={bio.distribution} />
                  <Fact k="Thức ăn" v={bio.diet.value} c={bio.diet.certainty} />
                  <Fact k="Nhiệt độ" v={`${bio.tempC.value.min}–${bio.tempC.value.max} °C`} c={bio.tempC.certainty} />
                  <Fact k="Chiều dài" v={`thường ${bio.lengthCm.value.common ?? '?'} cm, tối đa ${bio.lengthCm.value.max} cm ${bio.lengthCm.value.measure}`} c={bio.lengthCm.certainty} />
                  {bio.behaviourVerified.map((b) => (
                    <T key={b} style={styles.p}>• {b}</T>
                  ))}
                  <T style={styles.small}>Nguồn: {bio.sources.map((s) => `${SOURCES[s].title} (truy cập ${SOURCES[s].accessed})`).join('; ')}</T>
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <T style={styles.h2}>Ghi chép của bạn</T>
                  <T style={styles.p}>
                    Bắt {entry.caught} lần · thả {entry.released} lần · từ ngày {entry.firstDay}
                  </T>
                  <T style={styles.p}>
                    Lớn nhất: {entry.maxLengthCm.toLocaleString('vi-VN')} cm · nặng nhất {formatWeight(entry.maxWeightKg)}
                  </T>
                  <T style={styles.p}>Gặp ở: {entry.spots.map((s) => BAU_SEN.microhabitats.find((m) => m.id === s)?.nameVi ?? s).join(', ')}</T>
                  <T style={styles.p}>Mồi đã ăn: {entry.baits.map((b) => BAITS[b].nameVi).join(', ')}</T>
                  <T style={styles.h2}>Mẹo câu</T>
                  {unlockedNotes(sel, entry).map((n) => (
                    <T key={n.at} style={[styles.p, !n.unlocked && { color: C.paperDim }]}>
                      {n.unlocked ? `• ${n.text}` : `• Ghi nhận thêm ${n.at - entry.caught - entry.released} lần (bắt hoặc thả) để mở.`}
                    </T>
                  ))}
                  <T style={styles.h3}>Ghi chú mô phỏng</T>
                  {tuning.gameNotes.map((n) => (
                    <T key={n} style={styles.small}>{n}</T>
                  ))}
                </View>
              </View>
            </>
          )}
        </ScrollView>
        </View>
      </View>
    </ScreenFrame>
  );
}

function Fact({ k, v, c }: { k: string; v: string; c?: Certainty }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <T style={[styles.small, { width: 74 }]}>{k}</T>
      <T style={[styles.p, { flex: 1 }]}>
        {v}
        {c && c !== 'verified' ? <T style={styles.cert}> ({CERT[c]})</T> : null}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  book: { flex: 1, flexDirection: 'row' },
  // Sidebar 25%, page 75%.
  index: { flex: 25, minWidth: 0, gap: 4, paddingRight: 10 },
  idx: { padding: 10, borderRadius: 10, backgroundColor: C.panel, borderWidth: 1, borderColor: C.panelLine },
  idxOn: { backgroundColor: C.paper },
  idxName: { fontFamily: F.display, fontSize: 16, color: C.ivory },
  idxSci: { fontFamily: F.displayItalic, fontSize: 12, color: C.paperDim },
  pageCol: { flex: 75, minWidth: 0 },
  page: { flex: 1, backgroundColor: C.paper, borderRadius: 6 },
  h1: { fontFamily: F.display, fontSize: 28, lineHeight: 36, color: C.paperInk },
  h2: { fontFamily: F.display, fontSize: 17, color: C.paperInk, marginTop: 6 },
  h3: { fontFamily: F.sansBold, fontSize: 12, color: C.paperDim, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  sci: { fontFamily: F.displayItalic, fontSize: 17, color: C.paperDim },
  p: { fontFamily: F.sans, fontSize: 14, lineHeight: 20, color: C.paperInk },
  small: { fontFamily: F.sans, fontSize: 12, lineHeight: 17, color: C.paperDim },
  cert: { fontFamily: F.sans, fontSize: 12, color: '#9A6B3C' },
  cols: { flexDirection: 'row', gap: 22 },
});
