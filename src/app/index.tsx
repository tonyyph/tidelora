import { router } from 'expo-router';
import { useEffect } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { setLoop } from '../audio/sound';
import { LiveBackdrop } from '../rendering/scene/LiveBackdrop';
import { useGame } from '../state/gameStore';
import { Button, T } from '../ui/primitives';
import { C, F } from '../ui/theme';

export default function Title() {
  const insets = useSafeAreaInsets();
  const save = useGame((s) => s.save);
  const newGame = useGame((s) => s.newGame);

  useEffect(() => {
    setLoop('amb', 1);
  }, []);

  const resume = () => {
    if (!save) return;
    if (save.pendingCatch || save.trip) router.replace('/fish');
    else router.replace('/home');
  };

  const start = async () => {
    const go = async () => {
      await newGame();
      router.replace('/fish');
    };
    if (save && save.stats.casts > 0) {
      Alert.alert('Hành trình mới', 'Bắt đầu lại sẽ xoá tiến trình hiện tại.', [
        { text: 'Huỷ', style: 'cancel' },
        { text: 'Bắt đầu lại', style: 'destructive', onPress: go },
      ]);
    } else go();
  };

  return (
    <View style={styles.root}>
      <LiveBackdrop />
      <View style={[StyleSheet.absoluteFill, styles.shade]} pointerEvents="none" />
      <Animated.View entering={FadeIn.duration(1200)} style={[styles.logo, { left: insets.left + 28, top: insets.top + 22 }]}>
        <T style={styles.word}>Tidelora</T>
        <T kind="caption" style={styles.tag}>A living world beneath the surface</T>
      </Animated.View>
      <Animated.View entering={FadeIn.delay(500).duration(900)} style={[styles.actions, { right: insets.right + 28, bottom: insets.bottom + 22 }]}>
        <View style={styles.row}>
          {save && <Button label="Hành trình mới" kind="quiet" small onPress={start} />}
          <Button label="Nhật ký" kind="quiet" small onPress={() => router.push('/journal')} disabled={!save} />
          <Button label="Cài đặt" kind="quiet" small onPress={() => router.push('/settings')} />
        </View>
        <Button label={save ? 'Tiếp tục' : 'Bắt đầu'} kind="primary" onPress={save ? resume : start} style={styles.primary} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ink },
  shade: { backgroundColor: 'rgba(5,14,16,0.12)' },
  logo: { position: 'absolute' },
  word: { fontFamily: F.displayItalic, fontSize: 30, lineHeight: 42, paddingTop: 4, color: C.ivory, letterSpacing: 0.5, textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 6 },
  tag: { marginTop: 2, color: 'rgba(243,235,221,0.8)' },
  actions: { position: 'absolute', alignItems: 'flex-end', gap: 10 },
  row: { flexDirection: 'row', gap: 4 },
  primary: { minWidth: 200 },
});
