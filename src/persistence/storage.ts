import AsyncStorage from '@react-native-async-storage/async-storage';

import { migrate, newSave, type SaveGame } from './schema';

const SAVE_KEY = 'tidelora/save';
const CORRUPT_KEY = 'tidelora/save.corrupt';
const SETTINGS_KEY = 'tidelora/settings';

export type Settings = {
  sfx: number;
  ambience: number;
  haptics: boolean;
  /** Relaxed mode: wider strike and landing windows. */
  assist: boolean;
  reducedMotion: boolean;
  leftHanded: boolean;
  largeText: boolean;
  quality: 'high' | 'low';
  debug: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  sfx: 0.9,
  ambience: 0.7,
  haptics: true,
  assist: false,
  reducedMotion: false,
  leftHanded: false,
  largeText: false,
  quality: 'high',
  debug: false,
};

export async function loadSave(): Promise<SaveGame | null> {
  const raw = await AsyncStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    return migrate(JSON.parse(raw));
  } catch (e) {
    // Keep the unreadable save aside instead of overwriting it silently.
    await AsyncStorage.setItem(CORRUPT_KEY, raw);
    console.warn('Save could not be read, starting fresh', e);
    return null;
  }
}

/**
 * Serialised, coalescing writer: at most one write in flight, and only the latest
 * snapshot is written after it. Callers never wait on disk.
 */
let inFlight: Promise<void> | null = null;
let queued: SaveGame | null = null;

export function persistSave(save: SaveGame): Promise<void> {
  queued = save;
  if (!inFlight) inFlight = drain();
  return inFlight;
}

async function drain() {
  while (queued) {
    const next = queued;
    queued = null;
    try {
      await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('Save failed', e);
    }
  }
  inFlight = null;
}

export async function flushSaves() {
  if (inFlight) await inFlight;
}

export async function clearSave() {
  queued = null;
  await flushSaves();
  await AsyncStorage.removeItem(SAVE_KEY);
}

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function persistSettings(s: Settings) {
  return AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s)).catch(() => {});
}

export { newSave };
