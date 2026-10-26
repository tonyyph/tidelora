import { atHome } from '../inventory/catches';
import { GEAR } from '../gear/catalog';
import type { SaveGame } from '../persistence/schema';
import { band } from '../preservation/freshness';

/**
 * What to save up for next, and one concrete thing to try. Pure: derived from
 * the save every time, so it never drifts from what the player actually owns.
 */
export type Goal = { gearId: string; name: string; price: number; have: number; ready: boolean; why: string };

const LADDER: { id: string; why: string }[] = [
  { id: 'hook-4', why: 'Giữ chắc cá lóc, loài đắt nhất bàu.' },
  { id: 'cooler-ice', why: 'Chứa 12 con và giữ cá tươi lâu, mỗi chuyến bán được nhiều hơn.' },
  { id: 'rod-carbon', why: 'Quăng tới lòng bàu sâu và gốc tràm xa, chuẩn hơn.' },
  { id: 'line-028', why: 'Cước khỏe, cá lóc lớn khó giật đứt.' },
  { id: 'reel-2500', why: 'Thu dây nhanh, drag mạnh cho cá lớn.' },
  { id: 'float-balsa', why: 'Phao đứng vững khi có gió, quăng xa thêm.' },
];

export function nextGoal(save: SaveGame): Goal | null {
  const step = LADDER.find((g) => !save.ownedGear.includes(g.id));
  if (!step) return null;
  const item = GEAR[step.id];
  return { gearId: item.id, name: item.nameVi, price: item.price, have: save.money, ready: save.money >= item.price, why: step.why };
}

export function nextTip(save: SaveGame): string | null {
  const home = atHome(save);
  const fading = home.filter((c) => band(c.freshness) === 'fading').length;
  if (fading) return `${fading} con trong kho đã kém tươi. Bán hoặc nấu sớm.`;
  if (home.length) return `Còn ${home.length} con trong kho. Ghé Kho cá để bán, hoặc vào bếp nấu món lời hơn.`;
  if (!save.journal['channa-striata'] && save.ownedGear.includes('hook-4')) {
    return 'Thử săn cá lóc: lắp lưỡi số 4, mồi tép sống, thả phao sát gốc tràm bên phải.';
  }
  if (!save.journal['barbonymus-gonionotus']) return 'Cá mè vinh thích cám, ở lòng bàu sâu giữa mặt nước.';
  return null;
}
