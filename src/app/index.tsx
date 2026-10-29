import { router } from 'expo-router';
import { useEffect } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { setLoop } from '../audio/sound';
import { useGame } from '../state/gameStore';
import { Backdrop } from '../ui/Backdrop';
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
      <Backdrop art="bg-home-morning" scrim="left" minute={save?.minute} />
      <Animated.View entering={FadeIn.duration(1200)} style={[styles.logo, { left: insets.left + 28, top: insets.top + 22 }]}>
        <T style={styles.word}>Tidelora</T>
        <View style={styles.swash} />
        <T style={styles.tag}>{'Một ngày\nbên mặt nước'}</T>
        <T style={styles.where}>Đồng Tháp Mười</T>
      </Animated.View>
      <Animated.View entering={FadeIn.delay(500).duration(900)} style={[styles.actions, { right: insets.right + 28, bottom: insets.bottom + 22 }]}>
        <View style={styles.row}>
          {save && <Button label="Hành trình mới" small onPress={start} />}
          <Button label="Nhật ký" small onPress={() => router.push('/journal')} disabled={!save} />
          <Button label="Cài đặt" small onPress={() => router.push('/settings')} />
        </View>
        <Button label={save ? 'Tiếp tục' : 'Bắt đầu'} kind="primary" onPress={save ? resume : start} style={styles.primary} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ink },
  logo: { position: 'absolute' },
  word: { fontFamily: F.display, fontSize: 40, lineHeight: 50, paddingTop: 4, color: C.ivory, letterSpacing: 0.5, textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 8 },
  swash: { width: 120, height: 2, borderRadius: 1, backgroundColor: C.ivory, opacity: 0.7, marginLeft: 30, marginBottom: 16 },
  tag: { fontFamily: F.display, fontSize: 34, lineHeight: 40, color: C.ivory, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 10 },
  where: { fontFamily: F.sansMedium, fontSize: 15, color: C.ivory, marginTop: 6 },
  actions: { position: 'absolute', alignItems: 'flex-end', gap: 10 },
  row: { flexDirection: 'row', gap: 8 },
  primary: { minWidth: 220, minHeight: 54, borderRadius: 27 },
});
