import type { BaitId } from '../ecology/types';

/**
 * Gear with trade-offs. Units: metres, kgf, metres per second, game hours.
 * Values marked "0..1" are normalised gameplay values.
 */

export type GearSlot = 'rod' | 'reel' | 'line' | 'hook' | 'float' | 'cooler';

type Base = { id: string; slot: GearSlot; nameVi: string; blurb: string; price: number; starter?: boolean };

export type Rod = Base & {
  slot: 'rod';
  castM: number;
  /** Landing scatter radius in metres. */
  errorM: number;
  /** 0..1 share of a sudden pull the blank absorbs. */
  flex: number;
  /** Extra kgf the rod lets you lift during landing. */
  liftKgf: number;
};
export type Reel = Base & { slot: 'reel'; retrieveMs: number; dragMaxKgf: number; dragSmooth: number; spoolM: number };
export type Line = Base & { slot: 'line'; strengthKgf: number; visibility: number; diameterMm: number };
export type Hook = Base & { slot: 'hook'; size: 'small' | 'large' };
export type Float = Base & { slot: 'float'; sensitivity: number; stability: number; castBonusM: number };
export type Cooler = Base & { slot: 'cooler'; capacity: number; freshLossPerHour: number; tripCost: number };

export type GearItem = Rod | Reel | Line | Hook | Float | Cooler;

export const GEAR: Record<string, GearItem> = {
  'rod-bamboo': {
    id: 'rod-bamboo', slot: 'rod', nameVi: 'Cần tre 3m6', price: 0, starter: true,
    blurb: 'Dẻo, đỡ cú giật tốt, quăng gần.',
    castM: 13, errorM: 1.3, flex: 0.85, liftKgf: 0.6,
  },
  'rod-carbon': {
    id: 'rod-carbon', slot: 'rod', nameVi: 'Cần carbon 4m5', price: 300,
    blurb: 'Quăng xa và chuẩn hơn, nhưng cứng: cú giật dồn thẳng vào dây.',
    castM: 21, errorM: 0.7, flex: 0.45, liftKgf: 1.1,
  },
  'reel-1000': {
    id: 'reel-1000', slot: 'reel', nameVi: 'Máy câu 1000', price: 0, starter: true,
    blurb: 'Thu chậm, drag mịn.',
    retrieveMs: 0.9, dragMaxKgf: 2.6, dragSmooth: 0.75, spoolM: 60,
  },
  'reel-2500': {
    id: 'reel-2500', slot: 'reel', nameVi: 'Máy câu 2500', price: 240,
    blurb: 'Thu nhanh, drag mạnh nhưng nhả giật cục.',
    retrieveMs: 1.35, dragMaxKgf: 5, dragSmooth: 0.45, spoolM: 100,
  },
  'line-016': {
    id: 'line-016', slot: 'line', nameVi: 'Cước 0.16 mm', price: 0, starter: true,
    blurb: 'Mảnh, cá ít nghi ngờ, chịu lực thấp.',
    strengthKgf: 2.0, visibility: 0.25, diameterMm: 0.16,
  },
  'line-028': {
    id: 'line-028', slot: 'line', nameVi: 'Cước 0.28 mm', price: 60,
    blurb: 'Chịu lực gấp đôi, nhưng cá cảnh giác dễ thấy.',
    strengthKgf: 4.3, visibility: 0.75, diameterMm: 0.28,
  },
  'hook-10': {
    id: 'hook-10', slot: 'hook', nameVi: 'Lưỡi số 10', price: 0, starter: true,
    blurb: 'Nhỏ, ăn chắc miệng cá nhỏ; khó giữ cá lóc.',
    size: 'small',
  },
  'hook-4': {
    id: 'hook-4', slot: 'hook', nameVi: 'Lưỡi số 4', price: 20,
    blurb: 'To, giữ chắc cá lóc; cá nhỏ khó đớp trúng.',
    size: 'large',
  },
  'float-reed': {
    id: 'float-reed', slot: 'float', nameVi: 'Phao lông nhím', price: 0, starter: true,
    blurb: 'Rất nhạy, thấy rõ cá rỉa; lắc theo gió.',
    sensitivity: 1, stability: 0.4, castBonusM: 0,
  },
  'float-balsa': {
    id: 'float-balsa', slot: 'float', nameVi: 'Phao gỗ balsa', price: 40,
    blurb: 'Đứng vững, nặng nên quăng xa thêm; tín hiệu rỉa mờ hơn.',
    sensitivity: 0.6, stability: 0.9, castBonusM: 2,
  },
  'cooler-basket': {
    id: 'cooler-basket', slot: 'cooler', nameVi: 'Giỏ tre ướt', price: 0, starter: true,
    blurb: 'Gọn, miễn phí, giữ được ít và mau giảm tươi.',
    capacity: 8, freshLossPerHour: 0.05, tripCost: 0,
  },
  'cooler-ice': {
    id: 'cooler-ice', slot: 'cooler', nameVi: 'Thùng đá xốp', price: 160,
    blurb: 'Giữ lạnh tốt, chứa nhiều; tốn tiền đá mỗi chuyến.',
    capacity: 12, freshLossPerHour: 0.012, tripCost: 8,
  },
};

export type Loadout = Record<GearSlot, string>;

export const STARTER_LOADOUT: Loadout = {
  rod: 'rod-bamboo',
  reel: 'reel-1000',
  line: 'line-016',
  hook: 'hook-10',
  float: 'float-reed',
  cooler: 'cooler-basket',
};

export const STARTER_GEAR = Object.values(GEAR).filter((g) => g.starter).map((g) => g.id);

export type BaitDef = { id: BaitId; nameVi: string; blurb: string; packPrice: number; packSize: number; free?: boolean };

export const BAITS: Record<BaitId, BaitDef> = {
  worm: { id: 'worm', nameVi: 'Trùn đất', blurb: 'Tự đào ven bờ, không tốn tiền. Hầu hết cá đồng đều ăn.', packPrice: 0, packSize: 0, free: true },
  bran: { id: 'bran', nameVi: 'Cám gạo nắm', blurb: 'Mồi thực vật: cá mè vinh, cá sặc rất thích; cá lóc không ăn.', packPrice: 6, packSize: 10 },
  shrimp: { id: 'shrimp', nameVi: 'Tép sống', blurb: 'Mồi sống cho cá săn mồi như cá lóc.', packPrice: 15, packSize: 5 },
};

export const BAIT_DEPTHS = [0.4, 0.9, 1.8] as const;

export type ResolvedLoadout = { rod: Rod; reel: Reel; line: Line; hook: Hook; float: Float; cooler: Cooler };

export function resolveLoadout(l: Loadout): ResolvedLoadout {
  return {
    rod: GEAR[l.rod] as Rod,
    reel: GEAR[l.reel] as Reel,
    line: GEAR[l.line] as Line,
    hook: GEAR[l.hook] as Hook,
    float: GEAR[l.float] as Float,
    cooler: GEAR[l.cooler] as Cooler,
  };
}

/** Short compatibility warnings shown on the prep table. */
export function loadoutWarnings(l: ResolvedLoadout, bait: BaitId): string[] {
  const out: string[] = [];
  if (bait === 'shrimp' && l.hook.size === 'small') out.push('Tép sống nhắm cá lóc, nhưng lưỡi số 10 khó giữ miệng cá lóc.');
  if (bait === 'bran' && l.hook.size === 'large') out.push('Cám nắm hợp cá nhỏ, lưỡi số 4 sẽ trượt nhiều.');
  if (l.rod.flex < 0.6 && l.line.strengthKgf < 2.5) out.push('Cần cứng với cước mảnh: cú giật mạnh dễ đứt dây.');
  if (l.reel.dragMaxKgf > l.line.strengthKgf * 1.5) out.push('Drag tối đa vượt sức cước; đừng siết quá tay.');
  return out;
}
