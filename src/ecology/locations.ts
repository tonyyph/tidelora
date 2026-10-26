import type { Location, Microhabitat } from './types';

/**
 * Bàu Sen is a fictional lotus marsh. Its reference region is the Plain of Reeds
 * (Đồng Tháp Mười) in the Mekong Delta. Water values describe a typical
 * dry-season dawn there and are game approximations, not measurements.
 */
export const BAU_SEN: Location = {
  id: 'bau-sen',
  nameVi: 'Bàu Sen',
  regionId: 'mekong-delta',
  regionRef: 'Đồng Tháp Mười, Đồng bằng sông Cửu Long, Việt Nam',
  waterbody: 'Bàu ngập ven đồng, nước tù, có sen súng và tràm',
  salinity: { value: { kind: 'fresh', ppt: [0, 0.5] }, certainty: 'approximate' },
  waterTempC: { value: 27, certainty: 'approximate', note: 'Buổi sáng mùa khô, giá trị minh họa.' },
  depthM: { value: [0.4, 2.6], certainty: 'approximate' },
  clarity: { value: 'Đục nhẹ, màu trà do lá tràm phân hủy', certainty: 'approximate' },
  current: 'Gần như đứng yên',
  substrate: 'Bùn và than bùn, lớp lá mục',
  shelter: ['Đám sen và súng', 'Gốc tràm ngập', 'Bờ cỏ năn'],
  weather: { id: 'mist-calm', nameVi: 'Sương sớm · Lặng gió', windMs: 1.2, windDir: 1 },
  time: 'dawn',
  clockStart: 5 * 60 + 40,
  tide: null,
  species: ['anabas-testudineus', 'barbonymus-gonionotus', 'trichopodus-pectoralis', 'channa-striata'],
  methods: ['float'],
  microhabitats: [
    {
      id: 'roots',
      nameVi: 'Gốc tràm ngập',
      cover: 'roots',
      depthM: 1.4,
      substrate: 'peat',
      snagRisk: 0.35,
      area: { x: [4, 14], z: [10, 20] },
    },
    {
      id: 'lotus',
      nameVi: 'Mép đám sen',
      cover: 'lotus',
      depthM: 0.9,
      substrate: 'mud',
      snagRisk: 0.12,
      area: { x: [-14, -3.5], z: [8, 17] },
    },
    {
      id: 'deep',
      nameVi: 'Lòng bàu sâu',
      cover: 'deep',
      depthM: 2.4,
      substrate: 'mud',
      snagRisk: 0.04,
      area: { x: [-3.5, 4], z: [13, 26] },
    },
    {
      id: 'shallows',
      nameVi: 'Bãi nông sát bờ',
      cover: 'open',
      depthM: 0.6,
      substrate: 'mud',
      snagRisk: 0.05,
      area: { x: [-8, 8], z: [3, 10] },
    },
  ],
  unlock: { kind: 'start' },
};

export const LOCATIONS: Record<string, Location> = { [BAU_SEN.id]: BAU_SEN };

const inside = (m: Microhabitat, x: number, z: number) =>
  x >= m.area.x[0] && x <= m.area.x[1] && z >= m.area.z[0] && z <= m.area.z[1];

/** The microhabitat a float lands in: first containing area, else the nearest centre. */
export function microhabitatAt(location: Location, x: number, z: number): Microhabitat {
  const hit = location.microhabitats.find((m) => inside(m, x, z));
  if (hit) return hit;
  let best = location.microhabitats[0];
  let bestD = Infinity;
  for (const m of location.microhabitats) {
    const cx = (m.area.x[0] + m.area.x[1]) / 2;
    const cz = (m.area.z[0] + m.area.z[1]) / 2;
    const d = (cx - x) ** 2 + (cz - z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return best;
}
