import { useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, type ScrollViewInstance, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, runOnJS, useAnimatedStyle, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { play, setLoop } from '../audio/sound';
import { autoPick, candidates, checkCook, COOK_ERROR_VI } from '../cooking/cook';
import { DISH_UNLOCK_HINT, PANTRY_PRICE, RECIPES } from '../cooking/recipes';
import { SPECIES_BIO } from '../ecology/species';
import { catchPrice, dishPrice } from '../economy/market';
import type { DishLot } from '../persistence/schema';
import { BAND_LABEL, band } from '../preservation/freshness';
import { ART, DISH_ART } from '../rendering/art';
import { DishArt } from '../rendering/dish/DishArt';
import { useGame } from '../state/gameStore';
import { formatWeight } from '../ui/format';
import { Backdrop } from '../ui/Backdrop';
import { Button, Icon, T } from '../ui/primitives';
import { ScreenFrame } from '../ui/Screen';
import { C, F } from '../ui/theme';

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
  const [pickOpen, setPickOpen] = useState(false);
  const [stageW, setStageW] = useState(0);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Recipes 21%, dish 45%, details 34% of the body after gaps; on narrow phones the list and
  // details keep a readable minimum and the dish gives way.
  const bodyW = width - insets.left - insets.right - 40 - 28;
  const listW = Math.max(150, Math.round(bodyW * 0.21));
  const sideW = Math.max(272, Math.round(bodyW * 0.34));
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

  const pickedKg = picked.reduce((sum, id) => sum + (save.catches.find((x) => x.id === id)?.weightKg ?? 0), 0);
  const fishOk = unlocked && pickedKg >= recipe.minKg;
  const pantryOk = save.pantry >= recipe.pantry;

  return (
    <ScreenFrame title="Gian bếp" background={<Backdrop art="bg-kitchen-interior" scrim="top" />}>
      <View style={styles.cols}>
        <View style={[styles.list, { width: listW }]}>
          {Object.values(RECIPES).map((r) => {
            const on = r.id === recipeId;
            const open = save.recipesUnlocked.includes(r.id);
            return (
              <Pressable key={r.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => chooseRecipe(r.id)} style={[styles.recipe, on && styles.recipeOn]}>
                <View style={styles.thumb}>
                  <Image source={ART[DISH_ART[r.dish]]} style={[styles.thumbArt, !open && { opacity: 0.35 }]} resizeMode="contain" />
                  {!open && <Icon name="lock-outline" size={20} />}
                </View>
                <T style={[styles.recipeName, !open && { color: C.textDim }]} numberOfLines={3}>
                  {open ? r.nameVi : 'Chưa mở'}
                </T>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.stage} onLayout={(e) => setStageW(e.nativeEvent.layout.width)}>
          <View style={{ flex: 1 }} />
          {stageW > 0 && <DishArt kind={recipe.dish} width={Math.min(stageW * 0.85, 360)} steam={cooking ? 1 : done ? 0.7 : 0.45} />}
          {cooking && <FireTending onDone={finish} />}
          {done && !cooking && (
            <Animated.View entering={FadeIn} style={styles.doneBox}>
              <T kind="title">Xong {done.portions} phần</T>
              <T kind="caption" style={{ textAlign: 'center' }}>Chất lượng {Math.round(done.quality * 100)}% · bán được khoảng {dishPrice(done)} xu · đã cất vào kho món</T>
              <Button small label="Nấu thêm" onPress={() => setDone(null)} style={{ alignSelf: 'center', marginTop: 6 }} />
            </Animated.View>
          )}
        </View>

        <View style={[styles.side, { width: sideW }]}>
          <T style={styles.dishName}>{recipe.nameVi}</T>
          <T kind="caption" numberOfLines={1}>{unlocked ? recipe.blurb : DISH_UNLOCK_HINT[recipe.unlock]}</T>
          <View style={styles.box}>
            <T style={styles.boxHead}>Nguyên liệu</T>
            <Pressable accessibilityRole="button" accessibilityLabel="Chọn cá" onPress={() => setPickOpen((v) => !v)} style={styles.ing}>
              <Icon name="fish" size={22} color={C.secondary} />
              <T style={styles.ingText} numberOfLines={1}>
                Cá · {picked.length ? `${formatWeight(pickedKg)} · ${picked.length} con` : `cần ≥ ${formatWeight(recipe.minKg)}`}
              </T>
              <Icon name={pickOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.secondary} />
              <Tick ok={fishOk} />
            </Pressable>
            {pickOpen && (
              <View style={{ maxHeight: 132 }}>
                {options.length === 0 ? (
                  <T kind="caption" style={{ padding: 6 }}>{unlocked ? `Kho chưa có cá hợp món. ${recipe.substitutes}` : DISH_UNLOCK_HINT[recipe.unlock]}</T>
                ) : (
                  <ScrollView ref={listRef} onLayout={() => longList && listRef.current?.flashScrollIndicators()} contentContainerStyle={{ gap: 4, paddingVertical: 4 }}>
                    {options.map((c) => {
                      const on = picked.includes(c.id);
                      return (
                        <Pressable key={c.id} onPress={() => toggle(c.id)} style={[styles.fishRow, on && { borderColor: C.brass }]}>
                          <View style={[styles.check, on && { backgroundColor: C.brass, borderColor: C.brass }]} />
                          <T style={{ flex: 1, fontSize: 13.5 }} numberOfLines={1}>
                            {SPECIES_BIO[c.speciesId].nameVi} · {formatWeight(c.weightKg)}
                          </T>
                          <T kind="caption">{BAND_LABEL[band(c.freshness)]}</T>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            )}
            <View style={styles.ing}>
              <Icon name="shaker-outline" size={22} color={C.secondary} />
              <T style={styles.ingText} numberOfLines={1}>
                Rau & gia vị · {recipe.pantry}/{save.pantry} phần
              </T>
              {!pantryOk && (
                <Pressable accessibilityRole="button" onPress={() => g().buyPantry().ok && play('coins', 0.5)} disabled={save.money < PANTRY_PRICE} hitSlop={6}>
                  <T style={styles.buy}>Mua · {PANTRY_PRICE} xu</T>
                </Pressable>
              )}
              <Tick ok={pantryOk} />
            </View>
            <View style={[styles.ing, { borderBottomWidth: 0 }]}>
              <Icon name="bowl-mix-outline" size={22} color={C.secondary} />
              <T style={styles.ingText} numberOfLines={1}>
                {check.ok ? `${check.portions} phần · ${Math.round(check.quality * 100)}%` : `${recipe.equipment} · ${recipe.minutes} phút`}
              </T>
              <Tick ok={check.ok} />
            </View>
          </View>
          {check.ok ? (
            // Advice, not an error: selling raw can pay more, and cooking is still allowed.
            <View style={styles.verdict}>
              <Icon name={gain >= 0 ? 'trending-up' : 'information-outline'} size={16} color={gain >= 0 ? C.fresh : C.secondary} />
              <T style={[styles.verdictText, { color: gain >= 0 ? C.fresh : C.secondary }]} numberOfLines={2}>
                {gain >= 0 ? `Nấu lời hơn bán sống ${gain} xu` : `Bán sống lời hơn ${-gain} xu`} · món ≈ {dishValue} xu
              </T>
            </View>
          ) : (
            <T kind="caption" style={{ color: C.warn }}>{COOK_ERROR_VI[check.error]}</T>
          )}
          <View style={{ flex: 1 }} />
          <Button label={mastered ? 'Nấu nhanh' : 'Bắt đầu nấu'} kind="primary" icon={<Icon name="pot-steam-outline" size={22} color={C.ink} />} disabled={!check.ok || cooking} onPress={start} style={styles.cook} />
        </View>
      </View>
    </ScreenFrame>
  );
}

function Tick({ ok }: { ok: boolean }) {
  return <Icon name={ok ? 'check-circle' : 'checkbox-blank-circle-outline'} size={20} color={ok ? C.fresh : 'rgba(196,198,175,0.45)'} />;
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
  list: { gap: 8 },
  recipe: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 6, paddingRight: 10, borderRadius: 14, backgroundColor: C.panel, borderWidth: 1, borderColor: C.panelLine },
  recipeOn: { borderColor: C.brass, borderWidth: 2 },
  thumb: { width: 48, height: 42, borderRadius: 10, backgroundColor: 'rgba(243,235,221,0.08)', alignItems: 'center', justifyContent: 'center' },
  thumbArt: { position: 'absolute', width: 48, height: 42 },
  recipeName: { flex: 1, fontSize: 13.5, lineHeight: 17 },
  stage: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6, gap: 6 },
  doneBox: { alignItems: 'center', padding: 10, borderRadius: 14, backgroundColor: C.panel },
  verdict: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  side: { gap: 5, padding: 12, borderRadius: 18, backgroundColor: C.panel, borderWidth: 1, borderColor: C.panelLine },
  dishName: { fontFamily: F.display, fontSize: 22, lineHeight: 28, color: C.ivory },
  box: { marginTop: 4, borderRadius: 12, borderWidth: 1, borderColor: C.panelLine, paddingHorizontal: 10 },
  boxHead: { fontFamily: F.display, fontSize: 15, lineHeight: 20, color: C.ivory, paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.panelLine },
  ing: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 36, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.panelLine },
  ingText: { flex: 1, fontFamily: F.sans, fontSize: 14, color: C.ivory },
  buy: { fontFamily: F.sansBold, fontSize: 13, color: C.brassHi },
  verdictText: { flex: 1, fontFamily: F.sansMedium, fontSize: 13.5, lineHeight: 18 },
  cook: { minHeight: 48 },
  fishRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 6, borderRadius: 8, borderWidth: 1, borderColor: C.panelLine },
  check: { width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: 'rgba(243,235,221,0.5)' },
  fire: { flexDirection: 'row', gap: 12, padding: 10, borderRadius: 12, backgroundColor: C.panel, marginTop: 8 },
  gauge: { width: 26, height: 90, borderRadius: 13, backgroundColor: 'rgba(243,235,221,0.1)', overflow: 'hidden', justifyContent: 'flex-end' },
  band: { position: 'absolute', left: 0, right: 0, height: '24%', backgroundColor: 'rgba(243,235,221,0.25)' },
  flame: { width: '100%', backgroundColor: C.warn, borderTopLeftRadius: 13, borderTopRightRadius: 13 },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(243,235,221,0.15)' },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: C.brass },
  blow: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: C.warn, alignItems: 'center', justifyContent: 'center' },
});
