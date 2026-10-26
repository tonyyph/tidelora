import { GEAR, type Cooler } from '../gear/catalog';
import type { CatchItem, SaveGame } from '../persistence/schema';

/**
 * Freshness is a game mechanic on game time only. Closing the app never ages
 * anything, and freshness bottoms out at FLOOR instead of spoiling.
 */
export const FLOOR = 0.3;
/** Home storage: the big ice chest at the house. Loss per game hour. */
export const HOME_LOSS_PER_HOUR = 0.006;

export type FreshnessBand = 'fresh' | 'good' | 'fading';

export function band(freshness: number): FreshnessBand {
  if (freshness >= 0.8) return 'fresh';
  if (freshness >= 0.55) return 'good';
  return 'fading';
}

export const BAND_LABEL: Record<FreshnessBand, string> = { fresh: 'Tươi', good: 'Còn khá', fading: 'Kém tươi' };

/** Sale value multiplier: fresh fish sell at full price, fading fish at 65%. */
export function priceMultiplier(freshness: number): number {
  return 0.5 + 0.5 * freshness;
}

/** Minutes until an item crosses into the next lower band, or null when it is already fading. */
export function minutesToNextBand(item: CatchItem, coolerLossPerHour: number): number | null {
  const loss = item.store === 'home' ? HOME_LOSS_PER_HOUR : coolerLossPerHour;
  const next = item.freshness >= 0.8 ? 0.8 : item.freshness >= 0.55 ? 0.55 : null;
  if (next === null || loss <= 0) return null;
  return Math.max(0, ((item.freshness - next) / loss) * 60);
}

function age(item: CatchItem, hours: number, coolerLoss: number): CatchItem {
  if (item.status !== 'kept') return item;
  const loss = (item.store === 'home' ? HOME_LOSS_PER_HOUR : coolerLoss) * hours;
  return { ...item, freshness: Math.max(FLOOR, Math.round((item.freshness - loss) * 1000) / 1000) };
}

/** Advance the game clock by `minutes`, ageing kept catches. */
export function advanceTime(save: SaveGame, minutes: number): SaveGame {
  if (minutes <= 0) return save;
  const cooler = GEAR[save.loadout.cooler] as Cooler;
  const hours = minutes / 60;
  let minute = save.minute + minutes;
  let day = save.day;
  while (minute >= 24 * 60) {
    minute -= 24 * 60;
    day += 1;
  }
  return { ...save, day, minute: Math.round(minute), catches: save.catches.map((c) => age(c, hours, cooler.freshLossPerHour)) };
}

export function clockLabel(minute: number): string {
  const h = Math.floor(minute / 60) % 24;
  const m = Math.floor(minute % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
