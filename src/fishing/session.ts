import { expectedWaitSeconds, rollIndividual, sampleSpecies, scoreEncounters, type EncounterReport, type Individual } from '../ecology/encounter';
import { microhabitatAt } from '../ecology/locations';
import { SPECIES_TUNING } from '../ecology/species';
import type { BaitId, FightMode, Location, MethodId, Microhabitat } from '../ecology/types';
import type { ResolvedLoadout } from '../gear/catalog';
import { chance, clamp, createRng, gaussian, pickWeighted, rand, range, type Rng } from '../simulation/rng';

/**
 * Float-fishing session as an explicit state machine. `step` advances one fixed
 * timestep; `apply` handles player input. Both mutate the session in place and
 * never touch React, timers or I/O, so a session replays exactly from its seed.
 *
 * Units: metres, seconds, kgf. Stamina, power and dip are normalised 0..1.
 */

export type Phase =
  | 'preparing'
  | 'aiming'
  | 'casting'
  | 'settling'
  | 'waiting'
  | 'investigating'
  | 'nibbling'
  | 'hookWindow'
  | 'fighting'
  | 'landing'
  | 'catchResult'
  | 'missedHook'
  | 'baitLost'
  | 'fishEscaped'
  | 'lineBroken'
  | 'snagged'
  | 'cancelled';

export const FAIL_PHASES: Phase[] = ['missedHook', 'baitLost', 'fishEscaped', 'lineBroken', 'snagged', 'cancelled'];

/** Allowed transitions. `step`/`apply` only move along these edges (checked in tests and in dev). */
export const TRANSITIONS: Record<Phase, Phase[]> = {
  preparing: ['aiming', 'cancelled'],
  aiming: ['casting', 'cancelled'],
  casting: ['settling'],
  settling: ['waiting', 'aiming', 'cancelled'],
  waiting: ['investigating', 'missedHook', 'aiming', 'cancelled'],
  investigating: ['nibbling', 'waiting', 'missedHook', 'aiming', 'cancelled'],
  nibbling: ['hookWindow', 'waiting', 'missedHook', 'aiming', 'cancelled'],
  hookWindow: ['fighting', 'missedHook', 'baitLost', 'cancelled'],
  fighting: ['landing', 'fishEscaped', 'lineBroken', 'snagged'],
  landing: ['catchResult', 'fighting', 'fishEscaped'],
  catchResult: ['aiming'],
  missedHook: ['aiming'],
  baitLost: ['aiming'],
  fishEscaped: ['aiming'],
  lineBroken: ['aiming'],
  snagged: ['aiming'],
  cancelled: ['aiming'],
};

export type GameEvent =
  | { type: 'plop'; x: number; z: number }
  | { type: 'cue'; kind: 'wind' | 'fry' | 'leaf'; x: number; z: number }
  | { type: 'approach'; x: number; z: number }
  | { type: 'nibble'; strength: number }
  | { type: 'bite' }
  | { type: 'strike'; hooked: boolean }
  /** A strike with no fish on: the float stays out, only a hint is shown. */
  | { type: 'falseStrike'; text: string }
  | { type: 'splash'; x: number; z: number; strength: number }
  | { type: 'tensionWarn'; level: number }
  | { type: 'snap' }
  | { type: 'escape' }
  | { type: 'net' }
  | { type: 'baitUsed' }
  | { type: 'phase'; from: Phase; to: Phase };

export type Input =
  | { type: 'beginAim' }
  | { type: 'aim'; dir: number; power: number }
  | { type: 'cast' }
  | { type: 'strike' }
  | { type: 'reel'; on: boolean }
  | { type: 'drag'; level: number }
  | { type: 'steer'; dir: number }
  | { type: 'net' }
  | { type: 'retrieve' }
  | { type: 'cancel' }
  | { type: 'reset' };

export type SessionConfig = {
  location: Location;
  loadout: ResolvedLoadout;
  method: MethodId;
  bait: BaitId;
  baitDepthM: number;
  /** Relaxed mode: wider windows, gentler failures. */
  assist: boolean;
  tutorial: boolean;
};

export type Outcome = { reason: string; hint: string };

export type CatchRecord = {
  individual: Individual;
  spotId: string;
  method: MethodId;
  condition: 'excellent' | 'good' | 'bruised';
  fightSeconds: number;
};

export type FishState = {
  individual: Individual;
  mode: FightMode;
  modeLeft: number;
  stamina: number;
  /** Lateral direction of travel, -1..1. */
  heading: number;
  x: number;
  z: number;
  pullKgf: number;
  surface: boolean;
  coverTime: number;
};

export type FightState = {
  lineM: number;
  tension: number;
  dragLevel: number;
  reeling: boolean;
  reelHeld: number;
  steer: number;
  overload: number;
  tear: number;
  slack: number;
  spike: number;
  spikes: number;
  landingLeft: number;
  elapsed: number;
  warnCooldown: number;
};

export type Session = {
  seed: number;
  rng: Rng;
  config: SessionConfig;
  phase: Phase;
  phaseTime: number;
  time: number;
  aim: { dir: number; power: number };
  target: { x: number; z: number };
  landing: { x: number; z: number };
  castDuration: number;
  spot: Microhabitat | null;
  report: EncounterReport | null;
  waitLeft: number;
  cueLeft: number;
  pending: Individual | null;
  nibblesLeft: number;
  nibbleLeft: number;
  windowLeft: number;
  float: { x: number; z: number; dip: number; vel: number; target: number; lie: number; drift: number };
  fish: FishState | null;
  fight: FightState;
  outcome: Outcome | null;
  result: CatchRecord | null;
  events: GameEvent[];
  /** Total transitions, for a cheap "did anything change" check in the adapter. */
  revision: number;
};

const MIN_CAST = 4;

const freshFight = (): FightState => ({
  lineM: 0,
  tension: 0,
  dragLevel: 0.45,
  reeling: false,
  reelHeld: 0,
  steer: 0,
  overload: 0,
  tear: 0,
  slack: 0,
  spike: 0,
  spikes: 0,
  landingLeft: 0,
  elapsed: 0,
  warnCooldown: 0,
});

export function createSession(seed: number, config: SessionConfig): Session {
  return {
    seed,
    rng: createRng(seed),
    config,
    phase: 'aiming',
    phaseTime: 0,
    time: 0,
    aim: { dir: 0, power: 0.5 },
    target: { x: 0, z: 0 },
    landing: { x: 0, z: 0 },
    castDuration: 0,
    spot: null,
    report: null,
    waitLeft: 0,
    cueLeft: 0,
    pending: null,
    nibblesLeft: 0,
    nibbleLeft: 0,
    windowLeft: 0,
    float: { x: 0, z: 0, dip: 0, vel: 0, target: 0, lie: 0, drift: 0 },
    fish: null,
    fight: { ...freshFight() },
    outcome: null,
    result: null,
    events: [],
    revision: 0,
  };
}

export function maxCast(config: SessionConfig): number {
  return config.loadout.rod.castM + config.loadout.float.castBonusM;
}

/** Where a cast with this aim would land before wind and scatter. */
export function aimTarget(config: SessionConfig, dir: number, power: number): { x: number; z: number } {
  const z = MIN_CAST + clamp(power, 0, 1) * (maxCast(config) - MIN_CAST);
  const x = Math.tan(clamp(dir, -1, 1) * 0.62) * z;
  return { x, z };
}

export function windDrift(config: SessionConfig, z: number): number {
  const w = config.location.weather;
  return w.windMs * w.windDir * 0.35 * (z / 20);
}

function go(s: Session, to: Phase) {
  if (s.phase === to) return;
  if (!TRANSITIONS[s.phase].includes(to)) {
    throw new Error(`Illegal fishing transition ${s.phase} -> ${to}`);
  }
  s.events.push({ type: 'phase', from: s.phase, to });
  s.phase = to;
  s.phaseTime = 0;
  s.revision++;
}

function fail(s: Session, to: Phase, reason: string, hint: string, baitUsed: boolean) {
  go(s, to);
  s.outcome = { reason, hint };
  s.fight.reeling = false;
  if (baitUsed) s.events.push({ type: 'baitUsed' });
}

function visibility(c: SessionConfig) {
  return clamp(c.loadout.line.visibility * 0.75 + (1 - c.loadout.float.stability) * 0.1, 0, 1);
}

function windowScale(c: SessionConfig) {
  return (c.assist ? 1.8 : 1) * (c.tutorial ? 1.6 : 1);
}

function beginWaiting(s: Session) {
  const report = s.report!;
  s.waitLeft = expectedWaitSeconds(report) * range(s.rng, 0.6, 1.4) * (s.config.tutorial ? 0.5 : 1);
  s.cueLeft = range(s.rng, 1.5, 3.5);
  s.pending = null;
}

// ─── input ──────────────────────────────────────────────────────────────────

export function apply(s: Session, input: Input): void {
  const f = s.fight;
  switch (input.type) {
    case 'beginAim':
      if (s.phase === 'preparing') go(s, 'aiming');
      return;
    case 'aim':
      if (s.phase !== 'aiming') return;
      s.aim = { dir: clamp(input.dir, -1, 1), power: clamp(input.power, 0, 1) };
      s.target = aimTarget(s.config, s.aim.dir, s.aim.power);
      return;
    case 'cast': {
      if (s.phase !== 'aiming') return;
      const t = aimTarget(s.config, s.aim.dir, s.aim.power);
      const scatter = s.config.loadout.rod.errorM * (s.config.assist ? 0.5 : 1);
      const x = t.x + windDrift(s.config, t.z) + gaussian(s.rng) * scatter * 0.6;
      const z = clamp(t.z + gaussian(s.rng) * scatter * 0.4, MIN_CAST, maxCast(s.config) + 1);
      s.target = t;
      s.landing = { x, z };
      s.castDuration = 0.55 + z * 0.028;
      s.outcome = null;
      s.result = null;
      go(s, 'casting');
      return;
    }
    case 'strike':
      return strike(s);
    case 'reel':
      f.reeling = input.on && (s.phase === 'fighting' || s.phase === 'landing');
      if (!f.reeling) f.reelHeld = 0;
      return;
    case 'drag':
      f.dragLevel = clamp(input.level, 0.05, 1);
      return;
    case 'steer':
      f.steer = clamp(input.dir, -1, 1);
      return;
    case 'net':
      if (s.phase === 'landing' && s.fish) {
        const fishRecord: CatchRecord = {
          individual: s.fish.individual,
          spotId: s.spot?.id ?? 'unknown',
          method: s.config.method,
          condition: f.spikes > 6 ? 'bruised' : f.spikes > 2 ? 'good' : 'excellent',
          fightSeconds: Math.round(f.elapsed),
        };
        s.result = fishRecord;
        s.events.push({ type: 'net' }, { type: 'baitUsed' });
        go(s, 'catchResult');
      }
      return;
    case 'retrieve':
      if (s.phase === 'settling' || s.phase === 'waiting' || s.phase === 'investigating' || s.phase === 'nibbling') {
        s.fish = null;
        s.pending = null;
        go(s, 'aiming');
      }
      return;
    case 'cancel':
      if (TRANSITIONS[s.phase].includes('cancelled')) {
        fail(s, 'cancelled', 'Đã thu cần.', '', false);
      }
      return;
    case 'reset':
      if (s.phase === 'catchResult' || FAIL_PHASES.includes(s.phase)) {
        s.fish = null;
        s.pending = null;
        s.fight = freshFight();
        s.outcome = null;
        go(s, 'aiming');
      }
      return;
  }
}

function strike(s: Session) {
  const tutorialHint = 'Chờ phao bị kéo chìm hẳn hoặc trượt đi rồi mới giật.';
  switch (s.phase) {
    case 'waiting':
      // Nothing there yet. The float stays where it is; the twitch only pushes the next visit back a little.
      s.events.push({ type: 'strike', hooked: false }, { type: 'falseStrike', text: 'Chưa có cá. Phao rung nhẹ do gió hay cá con, cứ chờ tiếp.' });
      s.float.vel -= 0.8;
      s.waitLeft += 1.5;
      return;
    case 'investigating':
    case 'nibbling': {
      s.events.push({ type: 'strike', hooked: false });
      // Striking at a nibble usually just spooks the fish; sometimes it strips the bait.
      if (s.phase === 'nibbling' && chance(s.rng, 0.3)) {
        fail(s, 'missedHook', 'Giật sớm, cá mới rỉa mồi.', tutorialHint, true);
        return;
      }
      s.events.push({ type: 'falseStrike', text: 'Giật sớm, cá giật mình bỏ đi. ' + tutorialHint });
      s.float.vel -= 0.8;
      beginWaiting(s);
      s.waitLeft *= 0.7;
      go(s, 'waiting');
      return;
    }
    case 'hookWindow': {
      const species = s.pending!.speciesId;
      const t = SPECIES_TUNING[species];
      const fit = t.hookFit[s.config.loadout.hook.size];
      const p = clamp(fit + (s.config.assist ? 0.15 : 0) + (s.config.tutorial ? 0.5 : 0), 0, 0.97);
      if (chance(s.rng, p)) {
        s.events.push({ type: 'strike', hooked: true });
        startFight(s);
      } else {
        s.events.push({ type: 'strike', hooked: false });
        const hookHint =
          s.config.loadout.hook.size === 'small'
            ? 'Lưỡi nhỏ khó cắm vào miệng cá lớn. Thử lưỡi số 4.'
            : 'Lưỡi to quá so với miệng cá. Thử lưỡi số 10.';
        fail(s, 'missedHook', 'Giật đúng lúc nhưng lưỡi không ăn.', hookHint, true);
      }
      return;
    }
    default:
      return;
  }
}

// ─── simulation ─────────────────────────────────────────────────────────────

export function step(s: Session, dt: number): void {
  s.time += dt;
  s.phaseTime += dt;
  switch (s.phase) {
    case 'casting':
      if (s.phaseTime >= s.castDuration) {
        s.float = { ...s.float, x: s.landing.x, z: s.landing.z, dip: 0.6, vel: 0, target: 0, lie: 1, drift: 0 };
        s.spot = microhabitatAt(s.config.location, s.landing.x, s.landing.z);
        s.report = scoreEncounters({
          location: s.config.location,
          spot: s.spot,
          method: s.config.method,
          bait: s.config.bait,
          baitDepthM: s.config.baitDepthM,
          visibility: visibility(s.config),
        });
        s.events.push({ type: 'plop', x: s.landing.x, z: s.landing.z });
        go(s, 'settling');
      }
      break;
    case 'settling':
      // The float lies flat, then cocks upright as the shot sinks.
      s.float.lie = Math.max(0, 1 - s.phaseTime / 1.1);
      if (s.phaseTime >= 1.3) {
        beginWaiting(s);
        go(s, 'waiting');
      }
      break;
    case 'waiting':
      ambientCues(s, dt);
      s.waitLeft -= dt;
      if (s.waitLeft <= 0) {
        const speciesId = s.report ? sampleSpecies(s.rng, s.report) : null;
        if (!speciesId) {
          s.waitLeft = 6;
        } else {
          s.pending = rollIndividual(s.rng, speciesId);
          s.nibbleLeft = range(s.rng, 1.2, 2.8);
          s.events.push({ type: 'approach', x: s.float.x + range(s.rng, -0.6, 0.6), z: s.float.z + range(s.rng, -0.4, 0.4) });
          go(s, 'investigating');
        }
      }
      break;
    case 'investigating': {
      ambientCues(s, dt);
      s.nibbleLeft -= dt;
      if (s.nibbleLeft <= 0) {
        const t = SPECIES_TUNING[s.pending!.speciesId];
        const leave = t.bite.leaveChance + t.wariness * visibility(s.config) * 0.3;
        if (!s.config.tutorial && chance(s.rng, leave)) {
          beginWaiting(s);
          go(s, 'waiting');
        } else {
          s.nibblesLeft = Math.round(range(s.rng, t.bite.nibbles[0], t.bite.nibbles[1]));
          s.nibbleLeft = range(s.rng, 0.25, 0.6);
          go(s, 'nibbling');
        }
      }
      break;
    }
    case 'nibbling': {
      const t = SPECIES_TUNING[s.pending!.speciesId];
      s.nibbleLeft -= dt;
      if (s.nibbleLeft <= 0) {
        if (s.nibblesLeft <= 0) {
          s.windowLeft = range(s.rng, t.bite.window[0], t.bite.window[1]) * windowScale(s.config);
          s.events.push({ type: 'bite' });
          go(s, 'hookWindow');
        } else {
          s.nibblesLeft--;
          const sign = t.bite.style === 'lift' ? -1 : 1;
          const strength = t.bite.nibbleDepth * (0.6 + rand(s.rng) * 0.6) * s.config.loadout.float.sensitivity;
          s.float.vel += sign * strength * 6;
          s.events.push({ type: 'nibble', strength });
          s.nibbleLeft = t.bite.style === 'jiggle' ? range(s.rng, 0.22, 0.45) : range(s.rng, 0.5, 1.1);
        }
      }
      break;
    }
    case 'hookWindow': {
      const t = SPECIES_TUNING[s.pending!.speciesId];
      // How the take looks: plunge = pulled under, slide = runs sideways, lift = rises and lies flat.
      if (t.bite.style === 'lift') {
        s.float.target = -0.35;
        s.float.lie = Math.min(1, s.float.lie + dt * 1.6);
      } else if (t.bite.style === 'slide') {
        s.float.target = 0.35;
        s.float.drift += dt * 0.9;
      } else {
        s.float.target = 1.15;
        s.float.drift += dt * (t.bite.style === 'plunge' ? 0.5 : 0.15);
      }
      s.windowLeft -= dt;
      if (s.windowLeft <= 0) {
        fail(s, 'baitLost', 'Cá ăn mất mồi.', 'Lúc phao chìm hẳn, nằm ngang hoặc trượt đi là lúc giật.', true);
      }
      break;
    }
    case 'fighting':
      fightStep(s, dt);
      break;
    case 'landing':
      landingStep(s, dt);
      break;
    default:
      break;
  }
  floatPhysics(s, dt);
}

function ambientCues(s: Session, dt: number) {
  s.cueLeft -= dt;
  if (s.cueLeft > 0) return;
  const stability = s.config.loadout.float.stability;
  const kind = pickWeighted(s.rng, [
    { item: 'wind' as const, weight: 2 },
    { item: 'fry' as const, weight: 1.2 },
    { item: 'leaf' as const, weight: 0.6 },
  ])!;
  const strength = kind === 'fry' ? 0.12 : kind === 'wind' ? 0.1 * (1.2 - stability) : 0.06;
  s.float.vel += strength * 5 * (kind === 'wind' ? 1 : s.config.loadout.float.sensitivity);
  s.events.push({ type: 'cue', kind, x: s.float.x + range(s.rng, -1, 1), z: s.float.z + range(s.rng, -0.5, 0.5) });
  s.cueLeft = range(s.rng, 2, 5);
}

function floatPhysics(s: Session, dt: number) {
  const fl = s.float;
  if (s.phase === 'fighting' || s.phase === 'landing') {
    fl.target = 1.2;
  } else if (s.phase !== 'hookWindow') {
    fl.target = 0;
    fl.drift = Math.max(0, fl.drift - dt * 0.5);
    if (s.phase !== 'settling') fl.lie = Math.max(0, fl.lie - dt * 0.8);
  }
  // Damped spring towards the target dip.
  const k = 38;
  const c = 7;
  fl.vel += (-(fl.dip - fl.target) * k - fl.vel * c) * dt;
  fl.dip += fl.vel * dt;
}

function pickMode(s: Session, fish: FishState): FightMode {
  const modes = SPECIES_TUNING[fish.individual.speciesId].modes;
  const w = (m: FightMode) => m.weightTired + (m.weightFresh - m.weightTired) * fish.stamina;
  return pickWeighted(s.rng, modes.map((m) => ({ item: m, weight: w(m) })))!;
}

function setMode(s: Session, fish: FishState, mode: FightMode) {
  fish.mode = mode;
  fish.modeLeft = range(s.rng, mode.duration[0], mode.duration[1]);
  if (mode.id === 'cover') {
    // Head for the nearest snag-rich cover on the side the fish already favours.
    const roots = s.config.location.microhabitats.find((m) => m.cover === 'roots');
    fish.heading = roots ? Math.sign((roots.area.x[0] + roots.area.x[1]) / 2 - fish.x) || 1 : fish.heading;
  } else if (mode.sideways > 0.5) {
    fish.heading = rand(s.rng) < 0.5 ? -1 : 1;
  }
  fish.surface = !!mode.surface;
  if (mode.pull > 1) {
    // A burst: the rod soaks up part of it, the rest reaches the line as a spike.
    s.fight.spike = fish.pullKgf * 0.7 * (1 - s.config.loadout.rod.flex);
    if (s.fight.spike > 0.3) s.fight.spikes++;
  }
  if (mode.surface) s.events.push({ type: 'splash', x: fish.x, z: fish.z, strength: 0.6 + rand(s.rng) * 0.4 });
}

function startFight(s: Session) {
  const individual = s.pending!;
  const t = SPECIES_TUNING[individual.speciesId];
  const fish: FishState = {
    individual,
    mode: t.modes[0],
    modeLeft: 0,
    stamina: 1,
    heading: rand(s.rng) < 0.5 ? -1 : 1,
    x: s.float.x,
    z: s.float.z,
    pullKgf: 0,
    surface: false,
    coverTime: 0,
  };
  s.fish = fish;
  const dragLevel = s.fight.dragLevel;
  s.fight = { ...freshFight(), dragLevel, lineM: Math.hypot(s.float.x, s.float.z) };
  fish.pullKgf = basePull(fish);
  setMode(s, fish, t.modes[0]);
  s.events.push({ type: 'splash', x: fish.x, z: fish.z, strength: 0.4 });
  go(s, 'fighting');
}

function basePull(fish: FishState) {
  const t = SPECIES_TUNING[fish.individual.speciesId];
  return t.power * Math.pow(fish.individual.weightKg, 0.7);
}

export function dragKgf(s: Session) {
  return s.fight.dragLevel * s.config.loadout.reel.dragMaxKgf;
}

function fightStep(s: Session, dt: number) {
  const fish = s.fish!;
  const f = s.fight;
  const gear = s.config.loadout;
  const t = SPECIES_TUNING[fish.individual.speciesId];
  f.elapsed += dt;
  f.warnCooldown = Math.max(0, f.warnCooldown - dt);

  fish.modeLeft -= dt;
  if (fish.modeLeft <= 0) setMode(s, fish, pickMode(s, fish));
  const mode = fish.mode;

  const full = basePull(fish);
  const shake = mode.shakeHz > 0 ? 1 + 0.35 * Math.sin(2 * Math.PI * mode.shakeHz * s.time) : 1;
  fish.pullKgf = full * mode.pull * (0.3 + 0.7 * fish.stamina) * shake;

  // Reeling ramps in over ~0.4 s, so tapping does almost nothing.
  if (f.reeling) f.reelHeld = Math.min(1, f.reelHeld + dt / 0.4);
  const reelEffort = f.reeling ? f.reelHeld : 0;

  const radial = fish.pullKgf * (0.45 + 0.55 * Math.max(0, mode.away));
  const drag = dragKgf(s);
  let raw = radial * (reelEffort > 0 ? 1 : 0.75) + reelEffort * (0.12 + radial * 0.45);
  // Winding against a head-shaking fish loads the hook hold in pulses.
  if (reelEffort > 0 && mode.shakeHz > 0) raw += reelEffort * full * 0.4 * Math.max(0, Math.sin(2 * Math.PI * mode.shakeHz * s.time));

  // Steering against the fish's heading costs tension but turns it.
  const opposing = f.steer * fish.heading < 0 ? Math.abs(f.steer) : 0;
  raw += opposing * 0.12 * full;

  f.spike = Math.max(0, f.spike - dt * 4);
  const jitter = (1 - gear.reel.dragSmooth) * 0.25 * drag * Math.sin(s.time * 37);

  if (raw > drag) {
    f.lineM += (raw - drag) * 1.3 * dt;
    f.tension = drag + Math.max(0, jitter) + f.spike;
  } else {
    if (reelEffort > 0) {
      f.lineM -= gear.reel.retrieveMs * reelEffort * (1 - 0.6 * (raw / Math.max(drag, 0.01))) * dt;
    } else {
      // Rod held still: a running fish slowly takes line as the tip bends.
      f.lineM += 0.25 * Math.max(0, mode.away) * fish.stamina * dt;
    }
    f.tension = raw + f.spike;
  }
  f.lineM = Math.max(1, f.lineM);

  // Lateral motion and position on the water plane.
  const lateral = fish.heading * mode.sideways * 0.9 * (0.4 + 0.6 * fish.stamina) * (1 - opposing * 0.75);
  fish.x = clamp(fish.x + lateral * dt, -16, 16);
  fish.z = Math.sqrt(Math.max(f.lineM * f.lineM - fish.x * fish.x, 1));
  if (Math.abs(fish.x) > f.lineM) fish.x = Math.sign(fish.x) * f.lineM * 0.95;

  // Stamina: drained by tension, partly regained while resting on a slack line.
  const drain = (f.tension / Math.max(full, 0.05)) * 0.085 / t.endurance + opposing * 0.03;
  fish.stamina = clamp(fish.stamina - drain * dt + (mode.id === 'rest' && f.tension < full * 0.25 ? 0.05 * dt : 0), 0, 1);

  // Cover: a fish that reaches the roots and stays there wraps the line.
  const here = microhabitatAt(s.config.location, fish.x, fish.z);
  if (here.cover === 'roots' && mode.id === 'cover') fish.coverTime += dt * (1 - opposing * 0.85);
  else fish.coverTime = Math.max(0, fish.coverTime - dt * 0.5);

  // Failure checks.
  const lineLimit = gear.line.strengthKgf;
  const mouthLimit = t.mouthHold * (gear.hook.size === 'large' ? 1.25 : 1);
  f.overload = f.tension > lineLimit ? f.overload + dt : Math.max(0, f.overload - dt * 2);
  f.tear = f.tension > mouthLimit ? f.tear + dt : Math.max(0, f.tear - dt * 0.4);
  const thrashing = mode.shakeHz > 0 || mode.id === 'thrash';
  f.slack = f.tension < Math.max(0.05, full * 0.1) && thrashing ? f.slack + dt : Math.max(0, f.slack - dt);

  const danger = Math.max(f.tension / lineLimit, f.tension / mouthLimit);
  if (danger > 0.8 && f.warnCooldown <= 0) {
    s.events.push({ type: 'tensionWarn', level: danger });
    f.warnCooldown = 0.45;
  }

  if (f.lineM > gear.reel.spoolM) {
    s.events.push({ type: 'snap' });
    fail(s, 'lineBroken', 'Cá kéo hết cước trên ống.', 'Cá quá lớn so với bộ đồ: siết drag thêm hoặc dùng máy và cước khỏe hơn.', true);
    return;
  }
  if (f.overload > 0.22 || f.tension > lineLimit * 1.3) {
    s.events.push({ type: 'snap' });
    fail(s, 'lineBroken', 'Đứt dây.', 'Nới drag khi cá bứt tốc, hoặc dùng cước to hơn.', true);
    return;
  }
  if (f.tear > 0.6) {
    s.events.push({ type: 'escape' });
    fail(s, 'fishEscaped', 'Lưỡi xé khỏi miệng cá.', 'Loài này miệng mềm: drag nhẹ và đừng thu khi cá đang giãy.', true);
    return;
  }
  if (f.slack > 2.2) {
    s.events.push({ type: 'escape' });
    fail(s, 'fishEscaped', 'Dây chùng, cá lắc văng lưỡi.', 'Giữ dây hơi căng khi cá lắc đầu, đừng buông hẳn.', true);
    return;
  }
  if (fish.coverTime > 3.2) {
    const snag = chance(s.rng, 0.3 + (s.spot?.snagRisk ?? 0.2));
    fish.coverTime = 0;
    if (snag) {
      fail(s, 'snagged', 'Cá chui vào gốc tràm, dây mắc kẹt.', 'Kéo cần ngược hướng cá lao để lái nó ra khỏi gốc cây.', true);
      return;
    }
  }

  if (f.lineM <= 2.8) {
    if (fish.stamina < 0.5) {
      f.landingLeft = (s.config.assist ? 7 : 5) * (s.config.tutorial ? 1.5 : 1);
      fish.surface = true;
      s.events.push({ type: 'splash', x: fish.x, z: fish.z, strength: 0.35 });
      go(s, 'landing');
    } else if (mode.away < 0.5) {
      // Still fresh at the bank: it bolts.
      const run = SPECIES_TUNING[fish.individual.speciesId].modes.reduce((a, b) => (b.away > a.away ? b : a));
      setMode(s, fish, run);
    }
  }
}

function landingStep(s: Session, dt: number) {
  const fish = s.fish!;
  const f = s.fight;
  f.landingLeft -= dt;
  fish.stamina = Math.min(1, fish.stamina + dt * 0.04);
  f.tension = basePull(fish) * 0.3;
  if (f.landingLeft <= 0) {
    fish.stamina = Math.min(1, fish.stamina + 0.25);
    f.lineM = 4;
    const t = SPECIES_TUNING[fish.individual.speciesId];
    const run = t.modes.reduce((a, b) => (b.away > a.away ? b : a));
    go(s, 'fighting');
    setMode(s, fish, run);
    s.events.push({ type: 'splash', x: fish.x, z: fish.z, strength: 0.7 });
  }
}

export function drainEvents(s: Session): GameEvent[] {
  const out = s.events;
  s.events = [];
  return out;
}
