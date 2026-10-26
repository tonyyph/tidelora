import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

/**
 * Audio layers: one ambience bed, two state-driven loops (reel, drag) and one-shots.
 * Loops are started once and only have their volume and rate changed per state,
 * which avoids restarting players every frame.
 */
const SOURCES = {
  amb: require('../../assets/sounds/amb-dawn-marsh.wav'),
  cast: require('../../assets/sounds/cast.wav'),
  plop: require('../../assets/sounds/plop.wav'),
  nibble: require('../../assets/sounds/nibble.wav'),
  bite: require('../../assets/sounds/bite.wav'),
  reel: require('../../assets/sounds/reel.wav'),
  drag: require('../../assets/sounds/drag.wav'),
  splashSmall: require('../../assets/sounds/splash-small.wav'),
  splashBig: require('../../assets/sounds/splash-big.wav'),
  snap: require('../../assets/sounds/snap.wav'),
  net: require('../../assets/sounds/net.wav'),
  tap: require('../../assets/sounds/tap.wav'),
  coins: require('../../assets/sounds/coins.wav'),
  discovery: require('../../assets/sounds/discovery.wav'),
  sizzle: require('../../assets/sounds/sizzle.wav'),
  page: require('../../assets/sounds/page.wav'),
} as const;

export type SoundName = Exclude<keyof typeof SOURCES, 'amb' | 'reel' | 'drag' | 'sizzle'>;
type LoopName = 'amb' | 'reel' | 'drag' | 'sizzle';

const BASE: Record<keyof typeof SOURCES, number> = {
  amb: 0.8,
  cast: 0.5,
  plop: 0.7,
  nibble: 0.6,
  bite: 0.8,
  reel: 0.45,
  drag: 0.4,
  splashSmall: 0.6,
  splashBig: 0.8,
  snap: 0.8,
  net: 0.7,
  tap: 0.4,
  coins: 0.5,
  discovery: 0.5,
  sizzle: 0.5,
  page: 0.5,
};

let ready = false;
const players = new Map<string, AudioPlayer>();
let sfxVolume = 0.9;
let ambVolume = 0.7;
const loopLevel: Record<LoopName, number> = { amb: 0, reel: 0, drag: 0, sizzle: 0 };

export async function initAudio() {
  if (ready) return;
  ready = true;
  try {
    await setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false });
  } catch {}
}

function player(name: keyof typeof SOURCES): AudioPlayer | null {
  let p = players.get(name);
  if (!p) {
    try {
      p = createAudioPlayer(SOURCES[name]);
      players.set(name, p);
    } catch {
      return null;
    }
  }
  return p;
}

export function setVolumes(sfx: number, ambience: number) {
  sfxVolume = sfx;
  ambVolume = ambience;
  (Object.keys(loopLevel) as LoopName[]).forEach((n) => applyLoop(n));
}

export function play(name: SoundName, gain = 1, rate = 1) {
  if (sfxVolume <= 0) return;
  const p = player(name);
  if (!p) return;
  p.volume = Math.min(1, BASE[name] * gain * sfxVolume);
  if (rate !== 1) p.setPlaybackRate(rate);
  p.seekTo(0).then(() => p.play()).catch(() => {});
}

function applyLoop(name: LoopName) {
  const level = loopLevel[name];
  const vol = (name === 'amb' ? ambVolume : sfxVolume) * BASE[name] * level;
  const p = players.get(name);
  if (vol <= 0.001) {
    if (p?.playing) p.pause();
    return;
  }
  const lp = p ?? player(name);
  if (!lp) return;
  lp.loop = true;
  lp.volume = Math.min(1, vol);
  if (!lp.playing) lp.play();
}

/** Set a loop's level 0..1 and, optionally, its playback rate. */
export function setLoop(name: LoopName, level: number, rate?: number) {
  const changed = Math.abs(loopLevel[name] - level) > 0.02;
  loopLevel[name] = level;
  if (rate !== undefined) players.get(name)?.setPlaybackRate(Math.max(0.5, Math.min(2, rate)));
  if (changed || level === 0) applyLoop(name);
}

export function stopLoops(except: LoopName[] = []) {
  (Object.keys(loopLevel) as LoopName[]).forEach((n) => {
    if (!except.includes(n)) setLoop(n, 0);
  });
}
