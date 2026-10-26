import { baitZone, hardExclusion, rollIndividual, sampleSpecies, scoreEncounters } from '../ecology/encounter';
import { BAU_SEN, microhabitatAt } from '../ecology/locations';
import { SPECIES_BIO, SPECIES_IDS, SPECIES_TUNING } from '../ecology/species';
import type { Location } from '../ecology/types';
import { createRng } from '../simulation/rng';

const spot = (id: string) => BAU_SEN.microhabitats.find((m) => m.id === id)!;
const ctx = (over = {}) => ({ location: BAU_SEN, spot: spot('lotus'), method: 'float' as const, bait: 'worm' as const, baitDepthM: 0.9, visibility: 0.3, ...over });

describe('species catalog', () => {
  it('keeps biology and tuning for the same ids, with sources and certainty on every bio field', () => {
    expect(Object.keys(SPECIES_TUNING).sort()).toEqual(SPECIES_IDS.slice().sort());
    for (const bio of Object.values(SPECIES_BIO)) {
      expect(bio.sources.length).toBeGreaterThan(0);
      for (const key of ['salinity', 'depthM', 'tempC', 'activity', 'diet', 'feedingZone', 'lengthCm', 'maxWeightKg', 'lengthWeight'] as const) {
        expect(['verified', 'approximate', 'unknown']).toContain(bio[key].certainty);
      }
      expect(bio.scientific).toMatch(/^[A-Z][a-z]+ [a-z]+$/);
    }
  });

  it('game sizes never exceed the recorded biological maximum', () => {
    for (const id of SPECIES_IDS) {
      expect(SPECIES_TUNING[id].size.maxCm).toBeLessThanOrEqual(SPECIES_BIO[id].lengthCm.value.max);
    }
  });

  it('every species has its own fight modes (no shared movement set)', () => {
    const signatures = SPECIES_IDS.map((id) => SPECIES_TUNING[id].modes.map((m) => m.id).sort().join(','));
    expect(new Set(signatures).size).toBe(SPECIES_IDS.length);
  });
});

describe('hard constraints', () => {
  it('excludes species outside their region', () => {
    const elsewhere: Location = { ...BAU_SEN, regionId: 'north-coast' };
    for (const id of SPECIES_IDS) expect(hardExclusion(id, ctx({ location: elsewhere }))).toBe('Ngoài vùng phân bố');
  });

  it('excludes freshwater-only species from salt water', () => {
    const sea: Location = { ...BAU_SEN, salinity: { value: { kind: 'marine', ppt: [30, 35] }, certainty: 'approximate' } };
    const report = scoreEncounters(ctx({ location: sea }));
    for (const e of report.entries) expect(e.excluded).not.toBeNull();
  });

  it('snakehead never takes rice bran; gourami never takes a lure', () => {
    expect(hardExclusion('channa-striata', ctx({ bait: 'bran' }))).toBe('Không ăn loại mồi này');
    expect(hardExclusion('trichopodus-pectoralis', ctx({ method: 'lure' }))).toBe('Phương pháp không phù hợp');
  });

  it('a sampled species is never an excluded one', () => {
    const rng = createRng(7);
    const report = scoreEncounters(ctx({ bait: 'bran' }));
    for (let i = 0; i < 500; i++) expect(sampleSpecies(rng, report)).not.toBe('channa-striata');
  });
});

describe('scoring', () => {
  it('microhabitats matter: snakehead is likelier at the roots than in the shallows', () => {
    const p = (id: string) => scoreEncounters(ctx({ spot: spot(id), bait: 'shrimp' })).entries.find((e) => e.speciesId === 'channa-striata')!.probability;
    expect(p('roots')).toBeGreaterThan(p('shallows') * 1.5);
  });

  it('bait depth matters: barb prefers a bottom bait in the deep channel', () => {
    const p = (d: number) => scoreEncounters(ctx({ spot: spot('deep'), bait: 'bran', baitDepthM: d })).entries.find((e) => e.speciesId === 'barbonymus-gonionotus')!.probability;
    expect(baitZone(2.4, 2.4)).toBe('bottom');
    expect(p(2.4)).toBeGreaterThan(p(0.4));
  });

  it('no valid species ever drops to a vanishing probability', () => {
    for (const m of BAU_SEN.microhabitats) {
      for (const bait of ['worm', 'bran', 'shrimp'] as const) {
        for (const depth of [0.4, 0.9, 1.8]) {
          const r = scoreEncounters(ctx({ spot: m, bait, baitDepthM: depth }));
          for (const e of r.entries) if (!e.excluded) expect(e.probability).toBeGreaterThan(0.01);
        }
      }
    }
  });

  it('maps landing points to microhabitats', () => {
    expect(microhabitatAt(BAU_SEN, 9, 15).id).toBe('roots');
    expect(microhabitatAt(BAU_SEN, -8, 12).id).toBe('lotus');
    expect(microhabitatAt(BAU_SEN, 0, 5).id).toBe('shallows');
    expect(microhabitatAt(BAU_SEN, 0, 20).id).toBe('deep');
  });

  it('individuals stay inside the game size range and weigh by length-weight', () => {
    const rng = createRng(3);
    for (const id of SPECIES_IDS) {
      for (let i = 0; i < 200; i++) {
        const fish = rollIndividual(rng, id);
        const { minCm, maxCm } = SPECIES_TUNING[id].size;
        expect(fish.lengthCm).toBeGreaterThanOrEqual(minCm);
        expect(fish.lengthCm).toBeLessThanOrEqual(maxCm);
        expect(fish.weightKg).toBeGreaterThan(0);
      }
    }
  });
});
