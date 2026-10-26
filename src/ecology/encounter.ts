import { clamp, gaussian, pickWeighted, rand, type Rng } from '../simulation/rng';
import { SPECIES_BIO, SPECIES_TUNING, weightKgFor } from './species';
import type { BaitId, FeedingZone, Location, MethodId, Microhabitat } from './types';

/**
 * Species selection:
 * 1. Hard constraints remove species that cannot be here (region, salinity, method, bait).
 * 2. The remaining species are scored on conditions, each factor floored so that no
 *    product of small numbers ever makes a fish unreachable.
 * 3. Sample with the session's seeded RNG.
 */

export type EncounterContext = {
  location: Location;
  spot: Microhabitat;
  method: MethodId;
  bait: BaitId;
  /** Depth the float holds the bait at, metres. */
  baitDepthM: number;
  /** 0..1, how visible the line and float are to wary fish. */
  visibility: number;
};

export type FactorBreakdown = {
  cover: number;
  bait: number;
  zone: number;
  time: number;
  temperature: number;
  wariness: number;
  base: number;
};

export type EncounterEntry = {
  speciesId: string;
  excluded: string | null;
  factors: FactorBreakdown | null;
  score: number;
  probability: number;
};

export type EncounterReport = {
  baitZone: FeedingZone;
  entries: EncounterEntry[];
  totalScore: number;
};

const FLOOR = 0.2;

export function baitZone(baitDepthM: number, spotDepthM: number): FeedingZone {
  if (baitDepthM >= spotDepthM - 0.1) return 'bottom';
  if (baitDepthM < 0.45) return 'surface';
  return 'mid';
}

export function hardExclusion(speciesId: string, ctx: EncounterContext): string | null {
  const bio = SPECIES_BIO[speciesId];
  const tuning = SPECIES_TUNING[speciesId];
  if (!bio || !tuning) return 'Không có trong danh mục';
  if (!bio.regions.includes(ctx.location.regionId)) return 'Ngoài vùng phân bố';
  if (!ctx.location.species.includes(speciesId)) return 'Không ghi nhận ở địa điểm này';
  if (!bio.salinity.value.includes(ctx.location.salinity.value.kind)) return 'Độ mặn không phù hợp';
  if (!tuning.methods.includes(ctx.method)) return 'Phương pháp không phù hợp';
  if (!tuning.bait[ctx.bait]) return 'Không ăn loại mồi này';
  return null;
}

export function scoreEncounters(ctx: EncounterContext): EncounterReport {
  const zone = baitZone(ctx.baitDepthM, ctx.spot.depthM);
  const temp = ctx.location.waterTempC.value;
  const entries: EncounterEntry[] = ctx.location.species.map((id) => {
    const excluded = hardExclusion(id, ctx);
    if (excluded) return { speciesId: id, excluded, factors: null, score: 0, probability: 0 };
    const bio = SPECIES_BIO[id];
    const t = SPECIES_TUNING[id];
    const { min, max } = bio.tempC.value;
    const outside = temp < min ? min - temp : temp > max ? temp - max : 0;
    const factors: FactorBreakdown = {
      cover: Math.max(FLOOR, t.cover[ctx.spot.cover] ?? FLOOR),
      bait: Math.max(FLOOR, t.bait[ctx.bait] ?? 0),
      zone: bio.feedingZone.value.includes(zone) ? 1 : 0.45,
      time: bio.activity.value.includes(ctx.location.time) ? 1 : 0.5,
      temperature: Math.max(0.4, 1 - outside * 0.15),
      wariness: Math.max(0.35, 1 - t.wariness * ctx.visibility),
      base: t.baseWeight,
    };
    const score = Object.values(factors).reduce((p, f) => p * f, 1);
    return { speciesId: id, excluded: null, factors, score, probability: 0 };
  });
  const totalScore = entries.reduce((s, e) => s + e.score, 0);
  for (const e of entries) e.probability = totalScore > 0 ? e.score / totalScore : 0;
  return { baitZone: zone, entries, totalScore };
}

export function sampleSpecies(rng: Rng, report: EncounterReport): string | null {
  return pickWeighted(
    rng,
    report.entries.filter((e) => !e.excluded).map((e) => ({ item: e.speciesId, weight: e.score })),
  );
}

export type Individual = { speciesId: string; lengthCm: number; weightKg: number };

/** Log-normal length around the game mean (right-skewed: big fish are rarer), clamped. */
export function rollIndividual(rng: Rng, speciesId: string): Individual {
  const { meanCm, sdCm, minCm, maxCm } = SPECIES_TUNING[speciesId].size;
  const sigma = sdCm / meanCm;
  const lengthCm = clamp(meanCm * Math.exp(sigma * gaussian(rng) - (sigma * sigma) / 2), minCm, maxCm);
  const condition = 0.94 + rand(rng) * 0.12;
  const weightKg = weightKgFor(speciesId, lengthCm) * condition;
  return {
    speciesId,
    lengthCm: Math.round(lengthCm * 10) / 10,
    weightKg: Math.round(weightKg * 1000) / 1000,
  };
}

/** Mean seconds until a fish shows interest; better spots bring fish sooner. */
export function expectedWaitSeconds(report: EncounterReport): number {
  return clamp(3 / Math.max(report.totalScore, 0.05), 2, 7);
}
