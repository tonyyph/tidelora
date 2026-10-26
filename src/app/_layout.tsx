import { BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold } from '@expo-google-fonts/be-vietnam-pro';
import { Lora_500Medium_Italic, Lora_600SemiBold, useFonts } from '@expo-google-fonts/lora';
import * as ScreenOrientation from 'expo-screen-orientation';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { setHapticsEnabled } from '../audio/haptics';
import { initAudio, setVolumes, stopLoops } from '../audio/sound';
import { flushSaves } from '../persistence/storage';
import { useGame } from '../state/gameStore';
import { C } from '../ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: 'transparent' } };

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Lora_600SemiBold, Lora_500Medium_Italic, BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold });
  const ready = useGame((s) => s.ready);
  const settings = useGame((s) => s.settings);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    initAudio();
    useGame.getState().boot();
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        stopLoops();
        flushSaves();
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    setVolumes(settings.sfx, settings.ambience);
    setHapticsEnabled(settings.haptics);
  }, [settings.sfx, settings.ambience, settings.haptics]);

  useEffect(() => {
    if (fontsLoaded && ready) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, ready]);

  if (!fontsLoaded || !ready) return <View style={{ flex: 1, backgroundColor: C.ink }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.ink }}>
      <SafeAreaProvider>
        <ThemeProvider value={theme}>
          <StatusBar hidden />
          <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: C.ink } }} />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
