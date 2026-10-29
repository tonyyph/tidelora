import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '../audio/haptics';
import { play, setLoop, stopLoops } from '../audio/sound';
import { BAU_SEN, microhabitatAt } from '../ecology/locations';
import type { BaitId } from '../ecology/types';
import { baitAvailable } from '../economy/market';
import { FishingRuntime } from '../fishing/runtime';
import { aimTarget, createSession, dragKgf, FAIL_PHASES, type GameEvent, type Phase } from '../fishing/session';
import { BAITS, resolveLoadout } from '../gear/catalog';
import { inCooler } from '../inventory/catches';
import { clockLabel } from '../preservation/freshness';
import { ART } from '../rendering/art';
import { makeView, unproject } from '../rendering/projection';
import { BauSenScene } from '../rendering/scene/BauSenScene';
import { conditionsLabel } from '../rendering/scene/timeOfDay';
import { emptyFrame, type SceneFrame } from '../rendering/sceneFrame';
import { devRegistry } from '../dev/registry';
import { hashSeed } from '../simulation/rng';
import { newSave } from '../persistence/schema';
import { useGame } from '../state/gameStore';
import { COACH, coachStep, HINT_GENERAL } from '../tutorial/coach';
import { CatchResult } from '../ui/fishing/CatchResult';
import { DebugOverlay } from '../ui/fishing/DebugOverlay';
import { TackleSheet } from '../ui/fishing/TackleSheet';
import { TensionGauge } from '../ui/fishing/TensionGauge';
import { formatDepth } from '../ui/format';
import { BrassFill, Button, Icon, type IconName, Panel, T } from '../ui/primitives';
import { C, F } from '../ui/theme';

const QUIET: Phase[] = ['waiting', 'investigating', 'nibbling'];
const BAIT_ICON: Record<BaitId, IconName> = { worm: 'grain', bran: 'grain', shrimp: 'fishbowl-outline' };
const STRIKE: Phase[] = ['waiting', 'investigating', 'nibbling', 'hookWindow'];

export default function FishScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const save = useGame((s) => s.save);
  const settings = useGame((s) => s.settings);
  const store = useGame.getState;
  const frame = useSharedValue(emptyFrame());
  const [phase, setPhase] = useState<Phase>('aiming');
  const [tackleOpen, setTackleOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [aimSpot, setAimSpot] = useState<string | null>(null);
  const [dragLevel, setDragLevel] = useState(0.45);
  const [fightInfo, setFightInfo] = useState<FightInfo>(NO_FIGHT);
  const notice = useGame((s) => s.notice);
  const setNotice = useGame((s) => s.setNotice);
  const tutorial = !!save && !save.tutorialDone;
  const view = useMemo(() => makeView(width, height), [width, height]);

  useEffect(() => {
    if (!store().save) router.replace('/');
    else store().enterWater();
  }, [store]);

  const [runtime] = useState(() => {
    const s = useGame.getState().save ?? newSave();
    const seed = hashSeed(`${s.createdAt}:${s.stats.casts}:${s.stats.trips}`);
    const session = createSession(seed, {
      location: BAU_SEN,
      loadout: resolveLoadout(s.loadout),
      method: 'float',
      bait: baitAvailable(s, s.bait) ? s.bait : 'worm',
      baitDepthM: s.baitDepthM,
      assist: useGame.getState().settings.assist,
      tutorial: !s.tutorialDone,
    });
    // The session lives for the whole visit to the water.
    return new FishingRuntime(session, makeView(width, height), frame);
  });

  useEffect(() => runtime.setView(view), [runtime, view]);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 3200);
    return () => clearTimeout(id);
  }, [notice, setNotice]);

  const onEvents = useCallback(
    (events: GameEvent[]) => {
      for (const e of events) {
        switch (e.type) {
          case 'phase':
            if (e.to === 'casting') {
              play('cast');
              store().passTime(3);
            }
            if (e.to === 'catchResult' && runtime.session.result) {
              store().landFish(runtime.session.result, runtime.session.config.bait);
              haptic.landed();
            }
            if (['lineBroken', 'fishEscaped', 'snagged', 'baitLost'].includes(e.to)) haptic.fail();
            break;
          case 'plop':
            play('plop');
            break;
          case 'cue':
            if (e.kind === 'fry') play('nibble', 0.25);
            break;
          case 'nibble':
            play('nibble', 0.6 + e.strength);
            haptic.nibble();
            break;
          case 'bite':
            play('bite');
            haptic.bite();
            break;
          case 'falseStrike':
            setNotice(e.text);
            break;
          case 'strike':
            if (e.hooked) {
              play('splashSmall');
              haptic.hooked();
            }
            break;
          case 'splash':
            play(e.strength > 0.6 ? 'splashBig' : 'splashSmall', 0.5 + e.strength * 0.5);
            break;
          case 'tensionWarn':
            haptic.tension();
            break;
          case 'snap':
            play('snap');
            break;
          case 'escape':
            play('splashSmall', 0.7);
            break;
          case 'net':
            play('net');
            break;
          case 'baitUsed': {
            const bait = runtime.session.config.bait;
            store().usedBait(bait);
            const after = store().save!;
            if (!baitAvailable(after, bait)) {
              store().setBait('worm');
              runtime.reconfigure({ bait: 'worm' });
              setNotice('Hết mồi, chuyển sang trùn đất.');
            }
            break;
          }
        }
      }
    },
    [runtime, store, setNotice],
  );

  useEffect(() => {
    runtime.setListeners({ onPhase: setPhase, onEvents });
    if (__DEV__) {
      devRegistry.runtime = runtime;
      devRegistry.openTackle = () => setTackleOpen(true);
      devRegistry.pause = () => {
        runtime.pause();
        setPaused(true);
      };
    }
    runtime.start();
    setLoop('amb', 1);
    // Reel and drag loops follow the fight; a light poll, not a per-frame React update.
    const loops = setInterval(() => {
      const s = runtime.session;
      const fighting = s.phase === 'fighting' && !runtime.isPaused;
      setLoop('reel', fighting && s.fight.reeling ? 1 : 0, 0.8 + s.fight.reelHeld * 0.5);
      const slipping = fighting && s.fight.tension >= dragKgf(s) * 0.97;
      setLoop('drag', slipping ? 1 : 0, 0.9 + Math.min(0.4, s.fight.tension / 4));
      // Fight readout for the HUD text; only re-renders when it actually changes.
      const info: FightInfo = s.fish && s.phase === 'fighting' ? { heading: s.fish.heading, mode: s.fish.mode.id, slipping } : NO_FIGHT;
      setFightInfo((prev) => (prev.heading === info.heading && prev.mode === info.mode && prev.slipping === info.slipping ? prev : info));
    }, 100);
    const sub = AppState.addEventListener('change', (st) => {
      if (st !== 'active') {
        runtime.pause();
        setPaused(true);
      }
    });
    return () => {
      clearInterval(loops);
      sub.remove();
      runtime.stop();
      stopLoops(['amb']);
    };
  }, [runtime, onEvents]);

  // ── input ──
  const canAim = phase === 'aiming' && !save?.pendingCatch && !paused && !tackleOpen;
  const steerStart = useRef(0);
  const pan = usePanGesture({
    runOnJS: true,
    minDistance: 0,
    onBegin: (e) => {
      if (canAim) {
        runtime.aimAtScreen(e.x, e.y);
        setAimSpot(spotLabel(e.x, e.y));
      }
      steerStart.current = e.x;
    },
    onUpdate: (e) => {
      if (canAim) {
        runtime.aimAtScreen(e.x, e.y);
        setAimSpot(spotLabel(e.x, e.y));
      } else if (runtime.session.phase === 'fighting') {
        runtime.input({ type: 'steer', dir: Math.max(-1, Math.min(1, e.translationX / (width * 0.25))) });
      }
    },
    onDeactivate: () => {
      if (canAim && runtime.session.phase === 'aiming') runtime.input({ type: 'cast' });
      runtime.input({ type: 'steer', dir: 0 });
    },
    onFinalize: () => {
      runtime.input({ type: 'steer', dir: 0 });
    },
  });

  function spotLabel(sx: number, sy: number) {
    const { x, z } = unproject(view, sx, Math.max(sy, view.horizon + 4));
    const t = aimTarget(runtime.session.config, 0, 1);
    const m = microhabitatAt(BAU_SEN, x, Math.min(z, t.z));
    return `${m.nameVi} · sâu ~${formatDepth(m.depthM)}`;
  }

  const setDrag = (lvl: number) => {
    const v = Math.max(0.1, Math.min(1, Math.round(lvl * 20) / 20));
    setDragLevel(v);
    runtime.input({ type: 'drag', level: v });
  };

  const reset = () => {
    runtime.input({ type: 'reset' });
    setAimSpot(null);
  };

  const onKeep = () => {
    if (store().keep().ok) {
      if (tutorial) store().completeTutorial();
      const after = store().save;
      if (after && inCooler(after).length >= runtime.session.config.loadout.cooler.capacity) {
        setNotice('Giỏ đã đầy. Bấm Về nhà để bán cá.');
      }
      reset();
    }
  };
  const onRelease = () => {
    if (store().release().ok) {
      play('splashSmall', 0.6);
      if (tutorial) store().completeTutorial();
      reset();
    }
  };

  const goHome = () => {
    if (store().save?.pendingCatch) return;
    const r = store().goHome();
    if (!r.ok) return;
    if (r.movedIds?.length) router.replace({ pathname: '/trip', params: { ids: r.movedIds.join(',') } });
    else router.replace('/home');
  };

  const changeBait = (b: BaitId) => {
    store().setBait(b);
    runtime.reconfigure({ bait: b });
  };
  const changeDepth = (m: number) => {
    store().setBaitDepth(m);
    runtime.reconfigure({ baitDepthM: m });
  };

  // HUD dims while waiting, so the water does the talking.
  const hidden = !!save?.pendingCatch;
  const hudStyle = useAnimatedStyle(() => ({ opacity: withTiming(hidden ? 0 : QUIET.includes(phase) ? 0.65 : 1, { duration: 600 }) }));

  if (!save) return null;
  const left = settings.leftHanded;
  const fighting = phase === 'fighting' || phase === 'landing';
  const failed = FAIL_PHASES.includes(phase);
  const outcome = runtime.session.outcome;
  const coach = tutorial ? COACH[phase] : HINT_GENERAL[phase];
  const strikeHot = phase === 'hookWindow';
  const cooler = inCooler(save).length;
  const capacity = runtime.session.config.loadout.cooler.capacity;
  const basketFull = cooler >= capacity;
  const canLeave = cooler > 0 && (phase === 'aiming' || failed);
  const loupe = { x: width - insets.right - 16 - 140, y: insets.top + 66, w: 140, h: 100 };

  return (
    <View style={styles.root}>
      <GestureDetector gesture={pan}>
        <Animated.View entering={FadeIn.duration(450)} style={StyleSheet.absoluteFill}>
          <BauSenScene width={width} height={height} frame={frame} quality={settings.quality} reducedMotion={settings.reducedMotion} loupe={loupe} minute={save.minute} rod={save.loadout.rod === 'rod-carbon' ? 'carbon' : 'bamboo'} float={save.loadout.float === 'float-balsa' ? 'balsa' : 'quill'} />
        </Animated.View>
      </GestureDetector>

      {/* A soft shade under the top HUD so it reads on a bright sky. */}
      <LinearGradient colors={['rgba(8,20,18,0.5)', 'rgba(8,20,18,0)']} style={styles.topShade} pointerEvents="none" />
      <Animated.View style={[StyleSheet.absoluteFill, hudStyle]} pointerEvents="box-none">
        {/* Top-left: place and time */}
        <View style={[styles.topLeft, { left: insets.left + 20, top: insets.top + 10 }]} pointerEvents="none">
          <T style={styles.place}>{BAU_SEN.nameVi}</T>
          <T style={styles.when}>
            {clockLabel(save.minute)} · {conditionsLabel(save.minute, BAU_SEN.weather.nameVi)}
          </T>
          {aimSpot && phase === 'aiming' && <T style={styles.spot}>Đang ngắm: {aimSpot}</T>}
        </View>
        {/* Top-right: pause */}
        <Pressable
          accessibilityLabel="Tạm dừng"
          onPress={() => {
            runtime.pause();
            setPaused(true);
          }}
          style={[styles.pause, { right: insets.right + 16, top: insets.top + 10 }]}
        >
          <Icon name="pause" size={24} />
        </Pressable>

        {/* Bottom-left (or right for left-handed): tackle */}
        <View style={[styles.bottomSide, left ? { right: insets.right + 20, alignItems: 'flex-end' } : { left: insets.left + 20 }, { bottom: insets.bottom + 16 }]}>
          {canLeave && (
            <Animated.View entering={FadeIn.duration(250)}>
              <Button small kind={basketFull ? 'primary' : 'ghost'} label={`Về nhà · bán ${cooler} con`} onPress={goHome} />
            </Animated.View>
          )}
          <View style={styles.sideRow}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Hộp đồ: ${BAITS[save.bait].nameVi}, ${formatDepth(save.baitDepthM)}`} onPress={() => setTackleOpen(true)} style={({ pressed }) => [styles.pill, pressed && { opacity: 0.7 }]}>
              {save.bait === 'worm' ? <Image source={ART['item-earthworm']} style={styles.pillArt} resizeMode="contain" /> : <Icon name={BAIT_ICON[save.bait]} size={22} color={C.brassHi} />}
              <T style={styles.pillText}>
                {BAITS[save.bait].nameVi} · {formatDepth(save.baitDepthM)}
              </T>
            </Pressable>
            <View style={[styles.pill, basketFull && styles.basketFull]} accessibilityLabel={`Giỏ cá ${cooler} trên ${capacity}`}>
              <Image source={ART[save.loadout.cooler === 'cooler-ice' ? 'item-cooler' : 'item-basket']} style={styles.pillArt} resizeMode="contain" />
              <T kind="number" style={styles.pillText}>
                {basketFull ? 'Giỏ đầy' : `${cooler}/${capacity}`}
              </T>
            </View>
          </View>
        </View>

        {/* Main thumb actions */}
        <View style={[styles.actions, left ? { left: insets.left + 24, alignItems: 'flex-start' } : { right: insets.right + 24 }, { bottom: insets.bottom + 18 }]}>
          {fighting && <FightPanel frame={frame} info={fightInfo} landing={phase === 'landing'} reducedMotion={settings.reducedMotion} />}
          {phase === 'fighting' && (
            <View style={styles.dragRow}>
              <T kind="label">Drag</T>
              <Pressable accessibilityRole="button" accessibilityLabel="Nới drag" onPress={() => setDrag(dragLevel - 0.1)} style={styles.dragBtn} hitSlop={4}>
                <T style={styles.dragSign}>−</T>
              </Pressable>
              <T kind="number" style={{ minWidth: 58, textAlign: 'center' }}>
                {(dragLevel * runtime.session.config.loadout.reel.dragMaxKgf).toFixed(1)} kgf
              </T>
              <Pressable accessibilityRole="button" accessibilityLabel="Siết drag" onPress={() => setDrag(dragLevel + 0.1)} style={styles.dragBtn} hitSlop={4}>
                <T style={styles.dragSign}>+</T>
              </Pressable>
            </View>
          )}
          <View style={[styles.mainRow, left && { flexDirection: 'row-reverse' }]}>
            {tutorial && POINT_AT[phase] && <Pointer key={phase} label={POINT_AT[phase]!} flip={left} reducedMotion={settings.reducedMotion} />}
            {QUIET.includes(phase) && <Button small label="Thu cần" onPress={() => runtime.input({ type: 'retrieve' })} />}
            {STRIKE.includes(phase) && (
              <Pressable accessibilityRole="button" accessibilityLabel="Giật cần" onPressIn={() => runtime.input({ type: 'strike' })} style={[styles.big, styles.bigStrike, strikeHot && styles.bigHot]}>
                {strikeHot && <BrassFill radius={BIG / 2} />}
                <PulseRing active={strikeHot} reducedMotion={settings.reducedMotion} />
                <T style={[styles.bigText, strikeHot && { color: C.ink }]}>{strikeHot ? 'Giật!' : 'Giật'}</T>
              </Pressable>
            )}
            {phase === 'fighting' && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Giữ để thu dây"
                onPressIn={() => runtime.input({ type: 'reel', on: true })}
                onPressOut={() => runtime.input({ type: 'reel', on: false })}
                style={({ pressed }) => [styles.big, styles.bigHot, pressed && styles.bigPressed]}
              >
                <BrassFill radius={BIG / 2} />
                <T style={[styles.bigText, { color: C.ink }]}>Thu dây</T>
                <T kind="caption" style={{ color: 'rgba(11,26,29,0.7)' }}>giữ</T>
              </Pressable>
            )}
            {phase === 'landing' && (
              <Pressable accessibilityRole="button" accessibilityLabel="Vớt cá" onPress={() => runtime.input({ type: 'net' })} style={[styles.big, styles.bigHot]}>
                <BrassFill radius={BIG / 2} />
                <PulseRing active reducedMotion={settings.reducedMotion} />
                <T style={[styles.bigText, { color: C.ink }]}>Vớt</T>
              </Pressable>
            )}
          </View>
        </View>

        {coach && !failed && !save.pendingCatch && !notice && (
          <Coach
            key={phase}
            text={coach}
            step={tutorial ? coachStep(phase) : null}
            top={insets.top + 84}
            // Mid-fight the panel sits by the thumb, so the line moves to the other side.
            side={fighting ? (left ? { right: insets.right + 20 } : { left: insets.left + 20 }) : null}
            sticky={tutorial || phase === 'hookWindow' || phase === 'landing'}
            hot={phase === 'hookWindow'}
          />
        )}
        {tutorial && phase === 'aiming' && !save.pendingCatch && <AimDemo width={width} height={height} reducedMotion={settings.reducedMotion} />}
      </Animated.View>

      {failed && outcome && (
        <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut} style={[styles.failWrap, { top: insets.top + 60 }]}>
          <Panel style={styles.fail}>
            <T kind="title">{outcome.reason}</T>
            {!!outcome.hint && <T kind="caption" style={{ marginTop: 4 }}>{outcome.hint}</T>}
            <Button label="Quăng lại" kind="primary" small onPress={reset} style={{ alignSelf: 'flex-end', marginTop: 10 }} />
          </Panel>
        </Animated.View>
      )}

      {notice && (
        <Pressable onPress={() => setNotice(null)} style={[styles.notice, { top: insets.top + 54 }]}>
          <T kind="caption" style={{ color: C.ivory }}>{notice}</T>
        </Pressable>
      )}

      {__DEV__ && settings.debug && <DebugOverlay runtime={runtime} />}

      {save.pendingCatch && <CatchResult pending={save.pendingCatch} save={save} onKeep={onKeep} onRelease={onRelease} />}

      {/* Pause owns the screen: the tackle sheet steps aside and comes back on resume. */}
      {tackleOpen && !paused && <TackleSheet save={save} canChange={phase === 'aiming'} onBait={changeBait} onDepth={changeDepth} onClose={() => setTackleOpen(false)} />}

      {paused && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.pauseScrim}>
          <Panel style={styles.pausePanel}>
            <T kind="display">Tạm nghỉ</T>
            <T kind="caption">Mặt nước sẽ chờ bạn.</T>
            <View style={{ gap: 8, marginTop: 14 }}>
              <Button
                label="Câu tiếp"
                kind="primary"
                onPress={() => {
                  setPaused(false);
                  runtime.resume();
                }}
              />
              <Button label={`Về nhà${cooler ? ` · mang ${cooler} con` : ''}`} onPress={goHome} disabled={fighting} />
              <Button label="Cài đặt" kind="quiet" onPress={() => router.push('/settings')} />
            </View>
            {fighting && <T kind="caption" style={{ marginTop: 8 }}>Đang đấu cá, chưa thể rời đi.</T>}
          </Panel>
        </Animated.View>
      )}
    </View>
  );
}

type FightInfo = { heading: number; mode: string | null; slipping: boolean };
const NO_FIGHT: FightInfo = { heading: 0, mode: null, slipping: false };

/** Short coaching line under the top bar. Fades out after a few seconds unless the moment needs it. */
function Coach({ text, step, top, side, sticky, hot }: { text: string; step: [number, number] | null; top: number; side: { left: number } | { right: number } | null; sticky: boolean; hot: boolean }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (sticky) return;
    const id = setTimeout(() => setVisible(false), 6000);
    return () => clearTimeout(id);
  }, [sticky]);
  if (!visible) return null;
  return (
    <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(400)} style={[styles.coach, { top }, side && { ...side, alignSelf: undefined, maxWidth: 340, top: top + 22 }]} pointerEvents="none">
      <T style={[styles.coachText, hot && { color: C.ink, backgroundColor: C.brass }]}>
        {step && <T style={[styles.coachStep, hot && { color: C.ink }]}>{`Bước ${step[0]}/${step[1]}  `}</T>}
        {text}
      </T>
    </Animated.View>
  );
}

/** First trip only: which thumb control to look at, said beside it. */
const POINT_AT: Partial<Record<Phase, string>> = { hookWindow: 'Bấm', fighting: 'Giữ', landing: 'Bấm' };

/** A small label with a chevron nudging toward the button it sits next to. */
function Pointer({ label, flip, reducedMotion }: { label: string; flip: boolean; reducedMotion: boolean }) {
  const k = useSharedValue(0);
  useEffect(() => {
    if (!reducedMotion) k.value = withRepeat(withTiming(1, { duration: 550 }), -1, true);
    return () => cancelAnimation(k);
  }, [reducedMotion, k]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: (flip ? -1 : 1) * k.value * 6 }] }));
  return (
    <Animated.View entering={FadeIn.duration(250)} style={[styles.pointer, style]} pointerEvents="none">
      <T style={styles.pointerText}>{flip ? `← ${label}` : `${label} →`}</T>
    </Animated.View>
  );
}

/** First cast: a ghost fingertip drags from the bank toward the lotus edge, then lifts. */
function AimDemo({ width, height, reducedMotion }: { width: number; height: number; reducedMotion: boolean }) {
  const k = useSharedValue(reducedMotion ? 1 : 0);
  useEffect(() => {
    if (!reducedMotion) k.value = withRepeat(withTiming(1, { duration: 1600 }), -1, false);
    return () => cancelAnimation(k);
  }, [reducedMotion, k]);
  const from = { x: width * 0.52, y: height * 0.86 };
  const to = { x: width * 0.32, y: height * 0.64 };
  const dot = useAnimatedStyle(() => {
    const t = Math.min(1, k.value / 0.75);
    const e = 1 - (1 - t) * (1 - t);
    return {
      opacity: k.value < 0.08 ? k.value / 0.08 : k.value > 0.85 ? Math.max(0, (1 - k.value) / 0.15) : 1,
      transform: [{ translateX: from.x + (to.x - from.x) * e - 22 }, { translateY: from.y + (to.y - from.y) * e - 22 }, { scale: k.value > 0.75 ? 1 - (k.value - 0.75) * 1.2 : 1 }],
    };
  });
  return (
    <Animated.View style={[styles.finger, dot]} pointerEvents="none">
      <View style={styles.fingerCore} />
    </Animated.View>
  );
}

/** A ring that breathes out from a button when it is the thing to press now. */
function PulseRing({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) {
  const k = useSharedValue(0);
  useEffect(() => {
    if (active && !reducedMotion) k.value = withRepeat(withTiming(1, { duration: 750 }), -1, false);
    else {
      cancelAnimation(k);
      k.value = 0;
    }
  }, [active, reducedMotion, k]);
  const style = useAnimatedStyle(() => ({
    opacity: active ? (reducedMotion ? 0.8 : 0.9 * (1 - k.value)) : 0,
    transform: [{ scale: 1 + k.value * 0.35 }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.pulse, style]} />;
}

const MODE_VI: Record<string, string> = {
  cover: 'Lao vào gốc tràm',
  run: 'Chạy dài',
  dive: 'Lặn sâu',
  thrash: 'Quẫy mặt nước',
  shake: 'Lắc đầu',
  flutter: 'Giãy',
  turn: 'Quay đầu',
  rest: 'Đang nghỉ',
};

/** Everything needed mid-fight, next to the thumb: tension, the fish's strength and where it is heading. */
function FightPanel({ frame, info, landing, reducedMotion }: { frame: SharedValue<SceneFrame>; info: FightInfo; landing: boolean; reducedMotion: boolean }) {
  const stamina = useAnimatedStyle(() => ({ width: `${Math.round(Math.max(0, Math.min(1, frame.value.fishStamina)) * 100)}%` }));
  const steerTo = info.heading > 0 ? '←' : '→';
  const hint = landing
    ? 'Cá đã mệt, bấm Vớt!'
    : info.mode === 'cover'
      ? `Vuốt ${steerTo} để kéo cá khỏi gốc tràm`
      : info.slipping
        ? 'Cá đang kéo dây ra. Chờ, đừng siết drag quá tay.'
        : info.mode === 'rest'
          ? 'Cá đang nghỉ: giữ Thu dây ngay!'
          : null;
  return (
    <View style={styles.fightPanel}>
      <View style={styles.fightRow}>
        <T kind="label">Sức cá</T>
        <View style={styles.staminaTrack}>
          <Animated.View style={[styles.staminaFill, stamina]} />
        </View>
        <T style={styles.heading}>{info.heading < 0 ? '◀\uFE0E' : info.heading > 0 ? '▶\uFE0E' : ''}</T>
      </View>
      {!landing && info.mode && <T kind="caption" style={info.mode === 'cover' ? { color: C.warn } : undefined}>{MODE_VI[info.mode] ?? ''}</T>}
      <TensionGauge frame={frame} reducedMotion={reducedMotion} />
      {hint && <T kind="caption" style={[styles.fightHint, info.mode === 'cover' && !landing && { color: C.ivory, backgroundColor: 'rgba(201,117,94,0.55)' }]}>{hint}</T>}
    </View>
  );
}

/** Thumb controls: big enough to find without looking, small enough to leave the float in view. */
const BIG = 84;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ink },
  topLeft: { position: 'absolute' },
  topShade: { position: 'absolute', left: 0, right: 0, top: 0, height: 130 },
  place: { fontFamily: F.display, fontSize: 30, lineHeight: 38, color: C.ivory, textShadowColor: 'rgba(0,0,0,0.55)', textShadowRadius: 8 },
  when: { fontFamily: F.sansMedium, fontSize: 14.5, color: C.ivory, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 6 },
  spot: { fontFamily: F.sansMedium, fontSize: 13.5, color: C.brassHi, marginTop: 2, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 6 },
  pause: { position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(14,34,30,0.72)', borderWidth: 1, borderColor: C.panelLine, alignItems: 'center', justifyContent: 'center' },
  bottomSide: { position: 'absolute', gap: 8, alignItems: 'flex-start' },
  sideRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 10, paddingRight: 16, height: 48, borderRadius: 14, backgroundColor: C.panel, borderWidth: 1, borderColor: C.panelLine },
  pillArt: { width: 34, height: 30 },
  pillText: { fontFamily: F.sansMedium, fontSize: 15, color: C.ivory },
  basketFull: { borderColor: C.warn },
  actions: { position: 'absolute', alignItems: 'flex-end', gap: 12 },
  dragRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 12, paddingRight: 4, paddingVertical: 4, borderRadius: 30, backgroundColor: C.panel, borderWidth: 1, borderColor: C.panelLine },
  dragBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: 'rgba(243,235,221,0.45)', backgroundColor: 'rgba(14,34,30,0.6)', alignItems: 'center', justifyContent: 'center' },
  dragSign: { fontFamily: F.sansBold, fontSize: 22, lineHeight: 26, color: C.ivory },
  fightPanel: { width: 210, gap: 6, padding: 12, borderRadius: 16, backgroundColor: C.panel, borderWidth: 1, borderColor: C.panelLine },
  fightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  staminaTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(243,235,221,0.14)', overflow: 'hidden' },
  staminaFill: { height: 8, borderRadius: 4, backgroundColor: C.fresh },
  heading: { width: 18, textAlign: 'center', color: C.ivory, fontSize: 14 },
  fightHint: { color: C.ivory, backgroundColor: 'rgba(243,235,221,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, overflow: 'hidden' },
  pulse: { position: 'absolute', left: -3, top: -3, right: -3, bottom: -3, borderRadius: BIG / 2 + 4, borderWidth: 3, borderColor: '#E9CF95' },
  mainRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  big: { width: BIG, height: BIG, borderRadius: BIG / 2, borderWidth: 1.5, borderColor: 'rgba(243,235,221,0.55)', backgroundColor: 'rgba(14,34,30,0.6)', alignItems: 'center', justifyContent: 'center' },
  bigStrike: { backgroundColor: 'rgba(14,34,30,0.74)', borderWidth: 2, borderColor: 'rgba(243,235,221,0.75)' },
  bigHot: { borderColor: '#F0DCA8', borderWidth: 3, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  bigPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  bigText: { fontFamily: F.display, fontSize: 18, lineHeight: 23, color: C.ivory },
  coach: { position: 'absolute', alignSelf: 'center', maxWidth: 420 },
  coachStep: { fontFamily: F.sansBold, fontSize: 12.5, color: C.brass },
  pointer: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(11,26,29,0.7)' },
  pointerText: { fontFamily: F.sansBold, fontSize: 15, color: '#E9CF95' },
  finger: { position: 'absolute', left: 0, top: 0, width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: 'rgba(243,235,221,0.85)', alignItems: 'center', justifyContent: 'center' },
  fingerCore: { width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(243,235,221,0.75)' },
  coachText: { textAlign: 'center', fontSize: 13.5, lineHeight: 19, color: C.ivory, backgroundColor: 'rgba(11,26,29,0.62)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, overflow: 'hidden' },
  failWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  fail: { maxWidth: 460, minWidth: 320 },
  notice: { position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(11,26,29,0.8)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  pauseScrim: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(5,14,16,0.55)', alignItems: 'center', justifyContent: 'center' },
  pausePanel: { width: 340, alignItems: 'stretch' },
});
