import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import Animated, { FadeIn, runOnJS, useAnimatedStyle, useFrameCallback, useSharedValue } from 'react-native-reanimated';

import { play, setLoop } from '../audio/sound';
import { autoPick, candidates, checkCook, COOK_ERROR_VI } from '../cooking/cook';
import { DISH_UNLOCK_HINT, PANTRY_PRICE, RECIPES } from '../cooking/recipes';
import { SPECIES_BIO } from '../ecology/species';
import { catchPrice, dishPrice } from '../economy/market';
import type { DishLot } from '../persistence/schema';
import { BAND_LABEL, band } from '../preservation/freshness';
import { DishArt } from '../rendering/dish/DishArt';
import { useGame } from '../state/gameStore';
import { formatWeight } from '../ui/format';
import { Button, Divider, Panel, T } from '../ui/primitives';
import { ScreenFrame } from '../ui/Screen';
import { C, F } from '../ui/theme';
import { WoodSurface } from '../ui/WoodSurface';

/**
 * Kitchen: pick a recipe, pick compatible fish, cook. The first time a recipe is
 * cooked it is a short fire-tending moment; after that it can be cooked quickly.
 */
export default function Kitchen() {
  const save = useGame((s) => s.save);
  const g = useGame.getState;
  const unlockedIds = save?.recipesUnlocked ?? [];
  const [recipeId, setRecipeId] = useState(unlockedIds[0] ?? 'kho-to');
  const [picked, setPicked] = useState<string[]>(() => {
    const s = useGame.getState().save;
    return s ? autoPick(s, s.recipesUnlocked[0] ?? 'kho-to') : [];
  });
  const [cooking, setCooking] = useState(false);
  const [done, setDone] = useState<DishLot | null>(null);
  const listRef = useRef<ScrollViewInstance>(null);

  const recipe = RECIPES[recipeId];
  const options = useMemo(() => (save ? candidates(save, recipe) : []), [save, recipe]);

  const chooseRecipe = (id: string) => {
    setRecipeId(id);
    const s = useGame.getState().save;
    setPicked(s ? autoPick(s, id) : []);
    setDone(null);
  };

  if (!save) return null;
  const unlocked = save.recipesUnlocked.includes(recipeId);
  const mastered = save.recipesMastered.includes(recipeId);
  const check = checkCook(save, recipeId, picked, mastered ? 0.85 : 1);
  const rawValue = picked.reduce((s, id) => {
    const c = save.catches.find((x) => x.id === id);
    return s + (c ? catchPrice(c) : 0);
  }, 0);
  const dishValue = check.ok ? dishPrice({ id: '', recipeId, portions: check.portions, quality: check.quality, sourceCatchIds: [], day: 0, minute: 0 }) : 0;

  const pantryCost = recipe.pantry * PANTRY_PRICE;
  const gain = dishValue - pantryCost - rawValue;
  const longList = options.length > 4;

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const finish = (skill: number) => {
    setCooking(false);
    setLoop('sizzle', 0);
    const before = useGame.getState().save!.dishes.length;
    const r = g().cook(recipeId, picked, skill);
    if (r.ok) {
      const lot = useGame.getState().save!.dishes[before];
      setDone(lot ?? null);
      play('discovery', 0.6);
      setPicked([]);
    }
  };

  const start = () => {
    if (!check.ok) return;
    if (mastered) finish(0.85);
    else {
      setCooking(true);
      setLoop('sizzle', 1);
    }
  };

  return (
    <ScreenFrame title="Gian bếp" subtitle="Bếp củi, nồi đất, chạn gia vị" background={<WoodSurface tone="kitchen" />}>
      <View style={styles.cols}>
        <View style={styles.list}>
          {Object.values(RECIPES).map((r) => {
            const on = r.id === recipeId;
            const open = save.recipesUnlocked.includes(r.id);
            return (
              <Pressable key={r.id} onPress={() => chooseRecipe(r.id)} style={[styles.recipe, on && styles.recipeOn]}>
                <T style={[styles.recipeName, !open && { color: C.textDim }]}>{open ? r.nameVi : 'Công thức chưa mở'}</T>
                <T kind="caption" numberOfLines={2}>{open ? r.substitutes : DISH_UNLOCK_HINT[r.unlock]}</T>
              </Pressable>
            );
          })}
          <Divider />
          <T kind="caption">Gia vị trong chạn: {save.pantry} phần</T>
          <Button small label={`Mua gia vị · ${PANTRY_PRICE} xu`} disabled={save.money < PANTRY_PRICE} onPress={() => g().buyPantry().ok && play('coins', 0.5)} />
        </View>

        <View style={styles.stage}>
          <View style={styles.dishWrap}>
            <DishArt kind={recipe.dish} width={260} steam={cooking ? 1 : done ? 0.6 : 0} />
          </View>
          <T kind="display" style={{ textAlign: 'center' }}>{recipe.nameVi}</T>
          <T kind="caption" style={{ textAlign: 'center', maxWidth: 360, alignSelf: 'center' }}>{recipe.blurb}</T>
          <T kind="caption" style={{ textAlign: 'center' }}>
            {recipe.equipment} · {recipe.minutes} phút · cần ≥ {formatWeight(recipe.minKg)} cá · {recipe.pantry} phần gia vị
          </T>
          {cooking && <FireTending onDone={finish} />}
          {done && !cooking && (
            <Animated.View entering={FadeIn} style={styles.doneBox}>
              <T kind="title">Xong {done.portions} phần</T>
              <T kind="caption">Chất lượng {Math.round(done.quality * 100)}% · bán được khoảng {dishPrice(done)} xu · đã cất vào kho món</T>
              <Button small label="Nấu thêm" onPress={() => setDone(null)} style={{ alignSelf: 'center', marginTop: 6 }} />
            </Animated.View>
          )}
        </View>

        <Panel style={styles.side}>
          <T kind="label">Cá hợp món này ({options.length})</T>
          {!unlocked ? (
            <T kind="caption">{DISH_UNLOCK_HINT[recipe.unlock]}</T>
          ) : options.length === 0 ? (
            <T kind="caption">Kho chưa có cá hợp món. {recipe.substitutes}</T>
          ) : (
            <View style={{ flex: 1 }}>
            <ScrollView ref={listRef} onLayout={() => longList && listRef.current?.flashScrollIndicators()} style={{ flex: 1 }} contentContainerStyle={{ gap: 4, paddingBottom: longList ? 22 : 0 }}>
              {options.map((c) => {
                const on = picked.includes(c.id);
                return (
                  <Pressable key={c.id} onPress={() => toggle(c.id)} style={[styles.fishRow, on && { borderColor: C.brass }]}>
                    <View style={[styles.check, on && { backgroundColor: C.brass, borderColor: C.brass }]} />
                    <T style={{ flex: 1, fontSize: 14 }} numberOfLines={1}>
                      {SPECIES_BIO[c.speciesId].nameVi} · {formatWeight(c.weightKg)}
                    </T>
                    <T kind="caption">{BAND_LABEL[band(c.freshness)]}</T>
                  </Pressable>
                );
              })}
            </ScrollView>
            {longList && <LinearGradient colors={['rgba(11,26,29,0)', 'rgba(11,26,29,0.95)']} style={styles.listFade} pointerEvents="none" />}
            </View>
          )}
          <Divider />
          {check.ok ? (
            <View style={[styles.verdict, { borderColor: gain >= 0 ? C.fresh : C.warn }]}>
              <Line k={`Món ${check.portions} phần · ${Math.round(check.quality * 100)}%`} v={`~${dishValue} xu`} />
              <Line k={`Gia vị ${recipe.pantry} phần`} v={`−${pantryCost} xu`} />
              <Line k="Nếu bán cá sống" v={`~${rawValue} xu`} />
              <T style={[styles.verdictText, { color: gain >= 0 ? C.fresh : C.warn }]}>
                {gain >= 0 ? `Nấu lời hơn ${gain} xu` : `Bán sống lời hơn ${-gain} xu`}
              </T>
            </View>
          ) : (
            <T kind="caption" style={{ color: C.warn }}>{COOK_ERROR_VI[check.error]}</T>
          )}
          <Button label={mastered ? 'Nấu nhanh' : 'Bắt đầu nấu'} kind="primary" disabled={!check.ok || cooking} onPress={start} style={{ marginTop: 8 }} />
          {mastered && <T kind="caption" style={{ marginTop: 4 }}>Đã thuộc món: nấu nhanh với chất lượng ổn định.</T>}
        </Panel>
      </View>
    </ScreenFrame>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <T kind="caption">{k}</T>
      <T kind="caption" style={{ color: C.ivory }}>{v}</T>
    </View>
  );
}

/**
 * First-time cooking: keep the fire in the band for five seconds by holding to
 * stoke and letting go to calm it. Runs on the UI thread; reports a 0..1 skill.
 */
function FireTending({ onDone }: { onDone: (skill: number) => void }) {
  const heat = useSharedValue(0.3);
  const holding = useSharedValue(0);
  const elapsed = useSharedValue(0);
  const inBand = useSharedValue(0);
  const finished = useSharedValue(0);
  const DURATION = 5;

  useFrameCallback((f) => {
    'worklet';
    if (finished.value) return;
    const dt = Math.min(0.05, (f.timeSincePreviousFrame ?? 16) / 1000);
    elapsed.value += dt;
    const target = 0.55 + 0.15 * Math.sin(elapsed.value * 1.3);
    heat.value = Math.max(0, Math.min(1, heat.value + (holding.value ? 0.55 : -0.4) * dt));
    if (Math.abs(heat.value - target) < 0.12) inBand.value += dt;
    if (elapsed.value >= DURATION) {
      finished.value = 1;
      runOnJS(onDone)(0.55 + 0.45 * Math.min(1, inBand.value / (DURATION * 0.8)));
    }
  });

  const flame = useAnimatedStyle(() => ({ height: `${Math.round(heat.value * 100)}%` }));
  const bandStyle = useAnimatedStyle(() => {
    const target = 0.55 + 0.15 * Math.sin(elapsed.value * 1.3);
    return { bottom: `${Math.round((target - 0.12) * 100)}%` };
  });
  const progress = useAnimatedStyle(() => ({ width: `${Math.round(Math.min(1, elapsed.value / DURATION) * 100)}%` }));

  return (
    <View style={styles.fire}>
      <View style={styles.gauge}>
        <Animated.View style={[styles.band, bandStyle]} />
        <Animated.View style={[styles.flame, flame]} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <T kind="caption">Giữ để thổi lửa, thả tay để lửa dịu. Giữ ngọn lửa trong vạch sáng.</T>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progress]} />
        </View>
        <Pressable
          onPressIn={() => holding.set(1)}
          onPressOut={() => holding.set(0)}
          style={({ pressed }) => [styles.blow, pressed && { backgroundColor: 'rgba(201,117,94,0.35)' }]}
          accessibilityLabel="Giữ để thổi lửa"
        >
          <T style={{ fontSize: 16 }}>Thổi lửa</T>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cols: { flex: 1, flexDirection: 'row', gap: 14 },
  list: { width: 220, gap: 6 },
  recipe: { padding: 10, borderRadius: 12, backgroundColor: 'rgba(11,26,29,0.62)', borderWidth: 1, borderColor: 'transparent' },
  recipeOn: { borderColor: C.brass },
  recipeName: { fontSize: 16 },
  stage: { flex: 1, gap: 4, justifyContent: 'center' },
  dishWrap: { alignItems: 'center' },
  doneBox: { alignItems: 'center', marginTop: 6 },
  side: { width: 270 },
  listFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 28 },
  verdict: { gap: 3, padding: 10, borderRadius: 10, borderWidth: 1, backgroundColor: 'rgba(243,235,221,0.05)' },
  verdictText: { fontFamily: F.sansBold, fontSize: 15, marginTop: 4 },
  fishRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 7, borderRadius: 8, borderWidth: 1, borderColor: C.line },
  check: { width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: 'rgba(243,235,221,0.5)' },
  fire: { flexDirection: 'row', gap: 12, padding: 10, borderRadius: 12, backgroundColor: 'rgba(11,26,29,0.7)', marginTop: 8 },
  gauge: { width: 26, height: 90, borderRadius: 13, backgroundColor: 'rgba(243,235,221,0.1)', overflow: 'hidden', justifyContent: 'flex-end' },
  band: { position: 'absolute', left: 0, right: 0, height: '24%', backgroundColor: 'rgba(243,235,221,0.25)' },
  flame: { width: '100%', backgroundColor: C.warn, borderTopLeftRadius: 13, borderTopRightRadius: 13 },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(243,235,221,0.15)' },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: C.brass },
  blow: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: C.warn, alignItems: 'center', justifyContent: 'center' },
});
