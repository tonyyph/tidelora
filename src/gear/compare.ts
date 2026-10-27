import type { GearItem } from './catalog';

/** One plain-language difference between the gear in use and a candidate. */
export type GearDiff = { text: string; good: boolean };

const n = (v: number) => (Number.isInteger(v) ? String(v) : v.toLocaleString('vi-VN', { maximumFractionDigits: 1 }));

/**
 * What changes if you swap `current` for `next`, said the way a tackle-shop
 * owner would say it. Pure, so the shop shows the same thing the session uses.
 */
export function compareGear(current: GearItem, next: GearItem): GearDiff[] {
  if (current.id === next.id || current.slot !== next.slot) return [];
  const out: GearDiff[] = [];
  const add = (cond: boolean, good: boolean, text: string) => cond && out.push({ text, good });
  if (current.slot === 'rod' && next.slot === 'rod') {
    const d = next.castM - current.castM;
    add(d !== 0, d > 0, `Quăng ${d > 0 ? 'xa' : 'gần'} hơn ${n(Math.abs(d))} m`);
    add(next.errorM !== current.errorM, next.errorM < current.errorM, next.errorM < current.errorM ? 'Phao rơi chuẩn chỗ ngắm hơn' : 'Phao rơi lệch chỗ ngắm hơn');
    add(next.flex < current.flex, false, 'Cứng hơn: cá giật mạnh dễ đứt cước mảnh');
    add(next.flex > current.flex, true, 'Dẻo hơn: đỡ cú giật của cá');
    add(next.liftKgf > current.liftKgf, true, 'Nhấc cá lớn lên vợt dễ hơn');
    add(next.liftKgf < current.liftKgf, false, 'Khó nhấc cá lớn hơn');
  } else if (current.slot === 'reel' && next.slot === 'reel') {
    const r = Math.round((next.retrieveMs / current.retrieveMs - 1) * 100);
    add(r !== 0, r > 0, `Thu dây ${r > 0 ? 'nhanh' : 'chậm'} hơn ${Math.abs(r)}%`);
    add(next.dragMaxKgf !== current.dragMaxKgf, next.dragMaxKgf > current.dragMaxKgf, next.dragMaxKgf > current.dragMaxKgf ? `Drag giữ được tới ${n(next.dragMaxKgf)} kgf, hợp cá lớn` : `Drag yếu hơn, tối đa ${n(next.dragMaxKgf)} kgf`);
    add(next.dragSmooth < current.dragSmooth, false, 'Drag nhả giật cục: dễ đứt dây khi cá vọt');
    add(next.dragSmooth > current.dragSmooth, true, 'Drag nhả mượt hơn');
  } else if (current.slot === 'line' && next.slot === 'line') {
    const k = next.strengthKgf / current.strengthKgf;
    add(k > 1, true, `Chịu lực gấp ${n(Math.round(k * 10) / 10)} lần, khó bị cá giật đứt`);
    add(k < 1, false, `Chịu lực chỉ còn ${Math.round(k * 100)}%`);
    add(next.visibility > current.visibility, false, 'Dễ bị cá thấy: cá cảnh giác ăn ít hơn');
    add(next.visibility < current.visibility, true, 'Mảnh hơn, cá ít nghi ngờ');
  } else if (current.slot === 'hook' && next.slot === 'hook') {
    add(next.size === 'large', true, 'Giữ chắc miệng cá lóc');
    add(next.size === 'large', false, 'Cá nhỏ (rô, sặc) khó đớp trúng');
    add(next.size === 'small', true, 'Ăn chắc miệng cá nhỏ');
    add(next.size === 'small', false, 'Khó giữ cá lóc');
  } else if (current.slot === 'float' && next.slot === 'float') {
    add(next.castBonusM !== current.castBonusM, next.castBonusM > current.castBonusM, `Quăng ${next.castBonusM > current.castBonusM ? 'xa thêm' : 'bớt'} ${n(Math.abs(next.castBonusM - current.castBonusM))} m`);
    add(next.stability > current.stability, true, 'Đứng vững khi có gió');
    add(next.stability < current.stability, false, 'Lắc theo gió nhiều hơn');
    add(next.sensitivity < current.sensitivity, false, 'Cá rỉa nhẹ khó thấy hơn');
    add(next.sensitivity > current.sensitivity, true, 'Thấy rõ cá rỉa hơn');
  } else if (current.slot === 'cooler' && next.slot === 'cooler') {
    const c = next.capacity - current.capacity;
    add(c !== 0, c > 0, `Chứa ${c > 0 ? 'thêm' : 'bớt'} ${Math.abs(c)} con mỗi chuyến`);
    add(next.freshLossPerHour < current.freshLossPerHour, true, `Cá giữ tươi lâu hơn ${n(Math.round(current.freshLossPerHour / next.freshLossPerHour))} lần`);
    add(next.freshLossPerHour > current.freshLossPerHour, false, 'Cá mau kém tươi hơn');
    add(next.tripCost > current.tripCost, false, `Tốn ${next.tripCost} xu tiền đá mỗi chuyến`);
    add(next.tripCost < current.tripCost, true, 'Không tốn tiền đá');
  }
  // Good news first, then the catch.
  return out.sort((a, b) => Number(b.good) - Number(a.good));
}
