import { create } from 'zustand';

import { cook as cookTx } from '../cooking/cook';
import type { BaitId } from '../ecology/types';
import { buyBait, buyGear, buyPantry, consumeBait, equip, sellCatches, sellDishes } from '../economy/market';
import type { CatchRecord } from '../fishing/session';
import { endTrip, keepPending, landCatch, pruneHistory, releaseKept, releasePending, startTrip, type Tx } from '../inventory/catches';
import { newSave, type SaveGame } from '../persistence/schema';
import { DEFAULT_SETTINGS, clearSave, loadSave, loadSettings, persistSave, persistSettings, type Settings } from '../persistence/storage';
import { advanceTime } from '../preservation/freshness';

type Result = { ok: true } | { ok: false; error: string };

type GameStore = {
  ready: boolean;
  save: SaveGame | null;
  settings: Settings;
  /** A one-line message for the fishing HUD (bait ran out, no ice money…). */
  notice: string | null;
  setNotice: (n: string | null) => void;
  boot: () => Promise<void>;
  newGame: () => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => void;
  /** Run a domain transaction; commit and persist only when it succeeds. */
  run: <T extends object>(fn: (s: SaveGame) => Tx<T>) => Tx<T>;
  patch: (fn: (s: SaveGame) => SaveGame) => void;
  setBait: (bait: BaitId) => void;
  setBaitDepth: (m: number) => void;
  completeTutorial: () => void;
  beginTrip: () => Result;
  /** Make sure a trip is running; falls back to the free basket if ice is unaffordable. Returns a notice, if any. */
  enterWater: () => void;
  landFish: (record: CatchRecord, bait: BaitId) => Result;
  usedBait: (bait: BaitId) => void;
  passTime: (minutes: number) => void;
  keep: () => Result;
  release: () => Result;
  /** Ends the trip; returns the ids of the fish carried home, for the trip summary. */
  goHome: () => Result & { movedIds?: string[] };
  sell: (ids: string[]) => Result;
  sellDish: (ids: string[]) => Result;
  releaseFromCooler: (ids: string[]) => Result;
  buy: (gearId: string) => Result;
  buyBaitPack: (bait: BaitId) => Result;
  buyPantry: () => Result;
  equip: (gearId: string) => Result;
  cook: (recipeId: string, ids: string[], skill: number) => Result;
};

const strip = <T extends object>(r: Tx<T>): Result => (r.ok ? { ok: true } : { ok: false, error: r.error });

export const useGame = create<GameStore>((set, get) => ({
  ready: false,
  save: null,
  settings: DEFAULT_SETTINGS,
  notice: null,
  setNotice: (notice) => set({ notice }),

  boot: async () => {
    const [save, settings] = await Promise.all([loadSave(), loadSettings()]);
    set({ save, settings, ready: true });
  },

  newGame: async () => {
    await clearSave();
    const save = newSave();
    set({ save });
    persistSave(save);
  },

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    persistSettings(settings);
  },

  run: (fn) => {
    const save = get().save;
    if (!save) return { ok: false, error: 'no-save' };
    const r = fn(save);
    if (r.ok) {
      const next = pruneHistory(r.save);
      set({ save: next });
      persistSave(next);
    }
    return r;
  },

  patch: (fn) => {
    const save = get().save;
    if (!save) return;
    const next = fn(save);
    set({ save: next });
    persistSave(next);
  },

  setBait: (bait) => get().patch((s) => ({ ...s, bait })),
  setBaitDepth: (m) => get().patch((s) => ({ ...s, baitDepthM: m })),
  completeTutorial: () => get().patch((s) => ({ ...s, tutorialDone: true })),
  beginTrip: () => strip(get().run((s) => startTrip(s, 'bau-sen'))),
  enterWater: () => {
    const s = get().save;
    if (!s || s.trip) return;
    const r = get().beginTrip();
    if (!r.ok && r.error === 'no-money-ice') {
      get().equip('cooler-basket');
      get().beginTrip();
      set({ notice: 'Không đủ tiền mua đá, mang giỏ tre thay thùng đá.' });
    }
  },
  landFish: (record, bait) => strip(get().run((s) => landCatch(s, record, bait, 'bau-sen'))),
  usedBait: (bait) => get().patch((s) => consumeBait({ ...s, stats: { ...s.stats, casts: s.stats.casts + 1 } }, bait)),
  passTime: (minutes) => get().patch((s) => advanceTime(s, minutes)),
  keep: () => strip(get().run(keepPending)),
  release: () => strip(get().run(releasePending)),
  goHome: () => {
    const r = get().run(endTrip);
    return r.ok ? { ok: true, movedIds: r.movedIds } : { ok: false, error: r.error };
  },
  sell: (ids) => strip(get().run((s) => sellCatches(s, ids))),
  sellDish: (ids) => strip(get().run((s) => sellDishes(s, ids))),
  releaseFromCooler: (ids) => strip(get().run((s) => releaseKept(s, ids))),
  buy: (id) => strip(get().run((s) => buyGear(s, id))),
  buyBaitPack: (bait) => strip(get().run((s) => buyBait(s, bait))),
  buyPantry: () => strip(get().run((s) => buyPantry(s, 1))),
  equip: (id) => strip(get().run((s) => equip(s, id))),
  cook: (recipeId, ids, skill) => strip(get().run((s) => cookTx(s, recipeId, ids, skill))),
}));
