/**
 * Light by game clock for scenes painted only at dawn (the house): a multiply tint
 * (colour and darkness) and a soft-light lift (midday glare), so the sky follows the
 * clock without repainting. The lake has a painting per time of day instead (`lakeLight`).
 */
export type TimeGrade = { tint: string; lift: number; label: string };

type Key = { at: number; tint: [number, number, number]; lift: number };

const h = (hours: number) => hours * 60;
const KEYS: Key[] = [
  { at: h(0), tint: [92, 108, 140], lift: 0 },
  { at: h(4.5), tint: [92, 108, 140], lift: 0 },
  { at: h(5.5), tint: [255, 255, 255], lift: 0 },
  { at: h(7), tint: [255, 255, 255], lift: 0.05 },
  { at: h(9), tint: [238, 246, 248], lift: 0.14 },
  { at: h(14), tint: [240, 246, 246], lift: 0.16 },
  { at: h(16.5), tint: [255, 236, 206], lift: 0.06 },
  { at: h(18), tint: [228, 168, 150], lift: 0 },
  { at: h(19), tint: [140, 132, 162], lift: 0 },
  { at: h(20), tint: [92, 108, 140], lift: 0 },
  { at: h(24), tint: [92, 108, 140], lift: 0 },
];

export function dayPart(minute: number): string {
  const hr = (((minute / 60) % 24) + 24) % 24;
  if (hr < 4.5 || hr >= 19.5) return 'đêm';
  if (hr < 7) return 'bình minh';
  if (hr < 11) return 'buổi sáng';
  if (hr < 14) return 'trưa';
  if (hr < 17) return 'buổi chiều';
  return 'hoàng hôn';
}

const SKY: Record<string, string> = {
  'bình minh': 'Sương sớm',
  'buổi sáng': 'Trời trong',
  trưa: 'Nắng trưa',
  'buổi chiều': 'Nắng chiều',
  'hoàng hôn': 'Ráng chiều',
  đêm: 'Trời đêm',
};

/** Sky words for the HUD, paired with the location's wind: "Ráng chiều · Lặng gió". */
export function conditionsLabel(minute: number, weatherVi: string): string {
  const wind = weatherVi.split(' · ')[1];
  return wind ? `${SKY[dayPart(minute)]} · ${wind}` : SKY[dayPart(minute)];
}

export function timeGrade(minute: number): TimeGrade {
  const m = ((minute % 1440) + 1440) % 1440;
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].at <= m) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = b.at === a.at ? 0 : (m - a.at) / (b.at - a.at);
  const c = a.tint.map((v, k) => Math.round(v + (b.tint[k] - v) * t));
  const hex = `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  return { tint: hex.toUpperCase(), lift: a.lift + (b.lift - a.lift) * t, label: dayPart(m) };
}
