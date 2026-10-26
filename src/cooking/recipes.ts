/**
 * Recipes are cooked dishes from the Mekong Delta kitchen, simplified for the game.
 * Each slot accepts only species tagged for it (see SPECIES_TUNING.recipeTags).
 * Yields are game values: `yield` is the usable share of whole-fish weight.
 */
export type Recipe = {
  id: string;
  nameVi: string;
  blurb: string;
  /** Any of these species tags fill the fish slot. */
  accepts: string[];
  /** Substitution note shown to the player. */
  substitutes: string;
  minKg: number;
  maxFish: number;
  /** Seasoning units from the pantry. */
  pantry: number;
  equipment: string;
  minutes: number;
  yield: number;
  portionKg: number;
  valuePerPortion: number;
  /** Best quality comes from fresh fish; this is the weight freshness carries in quality. */
  freshnessWeight: number;
  unlock: 'start' | 'catch-channa';
  dish: 'clay-pot' | 'soup-bowl' | 'grilled';
};

export const RECIPES: Record<string, Recipe> = {
  'kho-to': {
    id: 'kho-to',
    nameVi: 'Cá đồng kho tộ',
    blurb: 'Cá nhỏ kho nước màu trong nồi đất, liu riu đến khi keo lại.',
    accepts: ['ca-dong-nho'],
    substitutes: 'Cá rô đồng, cá sặc rằn hoặc cá mè vinh, trộn được.',
    minKg: 0.15,
    maxFish: 8,
    pantry: 1,
    equipment: 'Nồi đất',
    minutes: 45,
    yield: 0.7,
    portionKg: 0.05,
    valuePerPortion: 32,
    freshnessWeight: 0.4,
    unlock: 'start',
    dish: 'clay-pot',
  },
  'canh-chua': {
    id: 'canh-chua',
    nameVi: 'Canh chua cá',
    blurb: 'Canh chua me với bạc hà, cà chua và giá; cá thịt trắng.',
    accepts: ['ca-thit-trang'],
    substitutes: 'Cá lóc đồng hoặc cá mè vinh.',
    minKg: 0.25,
    maxFish: 3,
    pantry: 2,
    equipment: 'Nồi canh',
    minutes: 30,
    yield: 0.6,
    portionKg: 0.08,
    valuePerPortion: 42,
    freshnessWeight: 0.7,
    unlock: 'start',
    dish: 'soup-bowl',
  },
  'nuong-trui': {
    id: 'nuong-trui',
    nameVi: 'Cá lóc nướng trui',
    blurb: 'Cá lóc nguyên con nướng trong rơm, bóc vảy cháy, cuốn rau.',
    accepts: ['ca-loc'],
    substitutes: 'Chỉ cá lóc đồng, nguyên con.',
    minKg: 0.3,
    maxFish: 1,
    pantry: 1,
    equipment: 'Bếp rơm ngoài sân',
    minutes: 35,
    yield: 0.55,
    portionKg: 0.1,
    valuePerPortion: 95,
    freshnessWeight: 0.8,
    unlock: 'catch-channa',
    dish: 'grilled',
  },
};

export const PANTRY_PRICE = 5;
export const DISH_UNLOCK_HINT: Record<Recipe['unlock'], string> = {
  start: '',
  'catch-channa': 'Mở khi bắt được cá lóc đồng đầu tiên.',
};
