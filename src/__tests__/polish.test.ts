import { compareGear } from '../gear/compare';
import { GEAR } from '../gear/catalog';
import { conditionsLabel, dayPart, timeGrade } from '../rendering/scene/timeOfDay';

describe('gear comparison in words', () => {
  it('says the carbon rod casts further but is stiffer', () => {
    const d = compareGear(GEAR['rod-bamboo'], GEAR['rod-carbon']);
    expect(d[0]).toEqual({ text: 'Quăng xa hơn 8 m', good: true });
    expect(d.some((x) => !x.good && /Cứng hơn/.test(x.text))).toBe(true);
  });

  it('lists good news before trade-offs and nothing for the same item', () => {
    const d = compareGear(GEAR['cooler-basket'], GEAR['cooler-ice']);
    expect(d.map((x) => x.good)).toEqual([true, true, false]);
    expect(d[2].text).toMatch(/8 xu/);
    expect(compareGear(GEAR['rod-bamboo'], GEAR['rod-bamboo'])).toEqual([]);
  });
});

describe('time of day', () => {
  it('leaves the dawn painting untouched at dawn and darkens it at night', () => {
    expect(timeGrade(6 * 60).tint).toBe('#FFFFFF');
    expect(timeGrade(23 * 60).tint).toBe('#5C6C8C');
    expect(timeGrade(12 * 60).lift).toBeGreaterThan(0.1);
  });

  it('names the part of the day and wraps past midnight', () => {
    expect(dayPart(5 * 60 + 30)).toBe('bình minh');
    expect(dayPart(12 * 60)).toBe('trưa');
    expect(dayPart(18 * 60)).toBe('hoàng hôn');
    expect(dayPart(26 * 60)).toBe('đêm');
    expect(timeGrade(1440 + 6 * 60).tint).toBe('#FFFFFF');
    expect(conditionsLabel(18 * 60, 'Sương sớm · Lặng gió')).toBe('Ráng chiều · Lặng gió');
  });
});
