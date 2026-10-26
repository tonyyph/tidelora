import { SPECIES_TUNING } from '../ecology/species';
import type { Tx } from '../inventory/catches';
import { makeId, type CatchItem, type DishLot, type SaveGame } from '../persistence/schema';
import { advanceTime } from '../preservation/freshness';
import { RECIPES, type Recipe } from './recipes';

export type CookCheck =
  | { ok: true; totalKg: number; portions: number; quality: number }
  | { ok: false; error: CookError };

export type CookError =
  | 'locked'
  | 'no-fish'
  | 'duplicate'
  | 'unavailable'
  | 'incompatible'
  | 'too-many'
  | 'too-little'
  | 'no-pantry';

export const COOK_ERROR_VI: Record<CookError, string> = {
  locked: 'Chưa mở công thức này.',
  'no-fish': 'Chưa chọn cá.',
  duplicate: 'Một con cá không thể dùng hai lần.',
  unavailable: 'Có con cá không còn trong kho nhà.',
  incompatible: 'Có loài không hợp với món này.',
  'too-many': 'Quá nhiều cá cho một mẻ.',
  'too-little': 'Chưa đủ khối lượng cá.',
  'no-pantry': 'Thiếu gia vị trong chạn.',
};

export function fitsRecipe(recipe: Recipe, speciesId: string): boolean {
  return SPECIES_TUNING[speciesId]?.recipeTags.some((t) => recipe.accepts.includes(t)) ?? false;
}

/** Fish at home that this recipe can use, freshest first. */
export function candidates(save: SaveGame, recipe: Recipe): CatchItem[] {
  return save.catches
    .filter((c) => c.status === 'kept' && c.store === 'home' && fitsRecipe(recipe, c.speciesId))
    .sort((a, b) => b.freshness - a.freshness);
}

export function checkCook(save: SaveGame, recipeId: string, catchIds: string[], skill = 1): CookCheck {
  const recipe = RECIPES[recipeId];
  if (!recipe || !save.recipesUnlocked.includes(recipeId)) return { ok: false, error: 'locked' };
  if (catchIds.length === 0) return { ok: false, error: 'no-fish' };
  if (new Set(catchIds).size !== catchIds.length) return { ok: false, error: 'duplicate' };
  if (catchIds.length > recipe.maxFish) return { ok: false, error: 'too-many' };
  const items = catchIds.map((id) => save.catches.find((c) => c.id === id));
  if (items.some((c) => !c || c.status !== 'kept' || c.store !== 'home')) return { ok: false, error: 'unavailable' };
  const fish = items as CatchItem[];
  if (fish.some((c) => !fitsRecipe(recipe, c.speciesId))) return { ok: false, error: 'incompatible' };
  const totalKg = fish.reduce((s, c) => s + c.weightKg, 0);
  if (totalKg < recipe.minKg) return { ok: false, error: 'too-little' };
  if (save.pantry < recipe.pantry) return { ok: false, error: 'no-pantry' };
  const portions = Math.max(1, Math.floor((totalKg * recipe.yield) / recipe.portionKg + 1e-9));
  const fresh = fish.reduce((s, c) => s + c.freshness * c.weightKg, 0) / totalKg;
  const quality = Math.round(Math.min(1, (1 - recipe.freshnessWeight + recipe.freshnessWeight * fresh) * (0.7 + 0.3 * skill)) * 100) / 100;
  return { ok: true, totalKg, portions, quality };
}

/**
 * Cook as one transaction: fish are marked cooked, pantry consumed, a dish lot
 * created and the clock advanced, or nothing changes at all.
 * `skill` (0..1) comes from the first-time cooking minigame; quick cooking uses 0.85
 * once the recipe is mastered.
 */
export function cook(save: SaveGame, recipeId: string, catchIds: string[], skill = 1): Tx<{ lot: DishLot }> {
  const check = checkCook(save, recipeId, catchIds, skill);
  if (!check.ok) return { ok: false, error: check.error };
  const recipe = RECIPES[recipeId];
  const [id, s1] = makeId(save, 'd');
  const ids = new Set(catchIds);
  const s2 = advanceTime(s1, recipe.minutes);
  const lot: DishLot = {
    id,
    recipeId,
    portions: check.portions,
    quality: check.quality,
    sourceCatchIds: [...catchIds],
    day: s2.day,
    minute: s2.minute,
  };
  return {
    ok: true,
    lot,
    save: {
      ...s2,
      pantry: s2.pantry - recipe.pantry,
      catches: s2.catches.map((c) => (ids.has(c.id) ? { ...c, status: 'cooked' as const } : c)),
      dishes: [...s2.dishes, lot],
      recipesMastered: s2.recipesMastered.includes(recipeId) ? s2.recipesMastered : [...s2.recipesMastered, recipeId],
      stats: { ...s2.stats, dishesCooked: s2.stats.dishesCooked + 1 },
    },
  };
}

/** Greedy pick for quick cooking: freshest compatible fish until the weight is met. */
export function autoPick(save: SaveGame, recipeId: string): string[] {
  const recipe = RECIPES[recipeId];
  const picked: string[] = [];
  let kg = 0;
  for (const c of candidates(save, recipe)) {
    if (kg >= recipe.minKg || picked.length >= recipe.maxFish) break;
    picked.push(c.id);
    kg += c.weightKg;
  }
  return kg >= recipe.minKg ? picked : [];
}
