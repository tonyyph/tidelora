import type { SharedValue } from 'react-native-reanimated';

import { SPECIES_TUNING } from '../ecology/species';
import { project, unproject, type View } from '../rendering/projection';
import type { SceneFrame } from '../rendering/sceneFrame';
import { advance, type Accumulator } from '../simulation/fixedStep';
import { clamp } from '../simulation/rng';
import { apply, aimTarget, drainEvents, dragKgf, step, windDrift, type GameEvent, type Input, type Phase, type Session, type SessionConfig } from './session';

/**
 * Adapter between a fishing Session and the screen. Runs the fixed-step loop on
 * requestAnimationFrame, converts session state into a SceneFrame (one shared
 * value write per frame), and reports phase changes and events to listeners.
 */
export type HudState = { phase: Phase; revision: number };

type Ripple = { x: number; y: number; born: number; strength: number };

export class FishingRuntime {
  readonly session: Session;
  private view: View;
  private frame: SharedValue<SceneFrame>;
  private acc: Accumulator = { acc: 0 };
  private raf: number | null = null;
  private last = 0;
  private ripples: Ripple[] = [];
  private lastRevision = -1;
  private paused = false;
  private onPhase: (phase: Phase) => void = () => {};
  private onEvents: (events: GameEvent[]) => void = () => {};

  constructor(session: Session, view: View, frame: SharedValue<SceneFrame>) {
    this.session = session;
    this.view = view;
    this.frame = frame;
  }

  setListeners(l: { onPhase?: (phase: Phase) => void; onEvents?: (events: GameEvent[]) => void }) {
    if (l.onPhase) this.onPhase = l.onPhase;
    if (l.onEvents) this.onEvents = l.onEvents;
  }

  /** Change bait or depth; the session reads its config at the next cast. */
  reconfigure(patch: Partial<SessionConfig>) {
    this.session.config = { ...this.session.config, ...patch };
  }

  setView(view: View) {
    this.view = view;
  }

  start() {
    if (this.raf !== null) return;
    this.paused = false;
    this.last = 0;
    const tick = (now: number) => {
      this.raf = requestAnimationFrame(tick);
      const dtMs = this.last ? now - this.last : 16;
      this.last = now;
      if (this.paused) return;
      advance(this.acc, dtMs / 1000, (dt) => step(this.session, dt));
      this.flush();
    };
    this.raf = requestAnimationFrame(tick);
  }

  /** Pause: the world stops; on resume nothing is fast-forwarded. */
  pause() {
    this.paused = true;
    this.session.fight.reeling = false;
  }

  resume() {
    this.paused = false;
    this.last = 0;
    this.acc.acc = 0;
  }

  get isPaused() {
    return this.paused;
  }

  stop() {
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  input(i: Input) {
    if (this.paused && i.type !== 'reset') return;
    apply(this.session, i);
    this.flush();
  }

  /** Screen-space aim: drag point on the water picks direction and distance. */
  aimAtScreen(sx: number, sy: number) {
    const s = this.session;
    const { x, z } = unproject(this.view, sx, Math.max(sy, this.view.horizon + 4));
    const far = aimTarget(s.config, 0, 1).z;
    const near = aimTarget(s.config, 0, 0).z;
    const power = clamp((z - near) / (far - near), 0, 1);
    const dir = clamp(Math.atan2(x, Math.max(z, 1)) / 0.62, -1, 1);
    this.input({ type: 'aim', dir, power });
  }

  private addRipple(x: number, z: number, strength: number) {
    const p = project(this.view, x, z);
    this.ripples.push({ x: p.sx, y: p.sy, born: this.session.time, strength });
    if (this.ripples.length > 4) this.ripples.shift();
  }

  private flush() {
    const s = this.session;
    const events = drainEvents(s);
    for (const e of events) {
      if (e.type === 'plop') this.addRipple(e.x, e.z, 0.9);
      else if (e.type === 'cue') this.addRipple(e.x, e.z, e.kind === 'fry' ? 0.35 : 0.2);
      else if (e.type === 'approach') this.addRipple(e.x, e.z, 0.25);
      else if (e.type === 'nibble') this.addRipple(s.float.x, s.float.z, 0.3 + e.strength);
      else if (e.type === 'bite') this.addRipple(s.float.x, s.float.z, 0.7);
      else if (e.type === 'splash') this.addRipple(e.x, e.z, e.strength);
    }
    if (events.length) this.onEvents(events);
    if (s.revision !== this.lastRevision) {
      this.lastRevision = s.revision;
      this.onPhase(s.phase);
    }
    this.frame.set(this.buildFrame());
  }

  private buildFrame(): SceneFrame {
    const s = this.session;
    const v = this.view;
    const phase = s.phase;
    const fl = s.float;

    // Rod: butt below the bottom edge, right of centre; the tip follows aim, steer and load.
    const aimDir = phase === 'aiming' ? s.aim.dir : clamp(Math.atan2(fl.x, Math.max(fl.z, 1)) / 0.62, -1, 1);
    const tension = s.fight.tension;
    const lineLimit = s.config.loadout.line.strengthKgf;
    const load = phase === 'fighting' || phase === 'landing' ? clamp(tension / lineLimit, 0, 1) : 0;
    const steer = phase === 'fighting' ? s.fight.steer : 0;
    const tipX = v.width * (0.6 + aimDir * 0.16 + steer * 0.1) - load * v.width * 0.03 * Math.sign(aimDir || 1);
    const tipY = v.height * (0.12 + load * 0.16) + (phase === 'aiming' ? -v.height * 0.04 * s.aim.power : 0);

    let floatX = 0;
    let floatY = 0;
    let floatScale = 1;
    let floatVisible = 0;
    const isAfloat = ['settling', 'waiting', 'investigating', 'nibbling', 'hookWindow'].includes(phase);
    if (phase === 'casting') {
      const k = clamp(s.phaseTime / s.castDuration, 0, 1);
      const land = project(v, s.landing.x, s.landing.z);
      const arc = Math.sin(k * Math.PI) * v.height * 0.28;
      floatX = tipX + (land.sx - tipX) * k;
      floatY = tipY + (land.sy - tipY) * (k * k) - arc;
      floatScale = 1 - 0.5 * k;
      floatVisible = 1;
    } else if (isAfloat) {
      const drift = fl.drift;
      const p = project(v, fl.x + drift * 0.6, fl.z + drift * 0.4);
      const bob = Math.sin(s.time * 1.9) * 0.6 + Math.sin(s.time * 0.7 + 1) * 0.4;
      floatX = p.sx;
      floatY = p.sy + bob;
      floatScale = clamp(p.scale / 38, 0.8, 1.6);
      floatVisible = 1;
    }

    let fishX = 0;
    let fishY = 0;
    let fishLen = 0;
    let fishAngle = 0;
    let fishAlpha = 0;
    if ((phase === 'investigating' || phase === 'nibbling' || phase === 'hookWindow') && s.pending) {
      const p = project(v, fl.x - 0.25, fl.z + 0.4);
      fishX = p.sx;
      fishY = p.sy;
      fishLen = (s.pending.lengthCm / 100) * p.scale * 1.6;
      fishAngle = 0.3;
      fishAlpha = phase === 'investigating' ? clamp(s.phaseTime / 1.5, 0, 0.32) : 0.4;
    } else if ((phase === 'fighting' || phase === 'landing') && s.fish) {
      const p = project(v, s.fish.x, s.fish.z);
      fishX = p.sx;
      fishY = p.sy;
      fishLen = (s.fish.individual.lengthCm / 100) * p.scale * 1.6;
      fishAngle = Math.atan2(0, s.fish.heading) * 0.6;
      fishAlpha = s.fish.surface || phase === 'landing' ? 0.75 : 0.45;
    }

    const lineVisible = phase === 'aiming' || phase === 'casting' ? (phase === 'casting' ? 1 : 0) : FAIL_LINE.includes(phase) ? 0 : 1;
    const lineToX = phase === 'fighting' || phase === 'landing' ? fishX : floatX;
    const lineToY = phase === 'fighting' || phase === 'landing' ? fishY : floatY;
    const lineSag = phase === 'fighting' || phase === 'landing' ? 1 - clamp(tension / Math.max(dragKgf(s), 0.2), 0, 1) : phase === 'casting' ? 0.2 : 0.7;

    let aimX = 0;
    let aimY = 0;
    let aimRx = 0;
    let aimRy = 0;
    if (phase === 'aiming') {
      const t = aimTarget(s.config, s.aim.dir, s.aim.power);
      const p = project(v, t.x + windDrift(s.config, t.z), t.z);
      const scatter = s.config.loadout.rod.errorM * (s.config.assist ? 0.5 : 1) * 0.8;
      aimX = p.sx;
      aimY = p.sy;
      aimRx = Math.max(10, scatter * p.scale);
      aimRy = Math.max(4, scatter * p.scale * (1.6 / t.z));
    }

    const fighting = phase === 'fighting' || phase === 'landing';
    let danger = 0;
    if (s.fish && fighting) {
      const hold = SPECIES_TUNING[s.fish.individual.speciesId].mouthHold * (s.config.loadout.hook.size === 'large' ? 1.25 : 1);
      danger = clamp(Math.max(tension / lineLimit, tension / hold), 0, 1.2);
    }

    const ripples = new Array(16).fill(0);
    this.ripples = this.ripples.filter((r) => s.time - r.born < 3.2);
    this.ripples.forEach((r, i) => {
      ripples[i * 4] = r.x;
      ripples[i * 4 + 1] = r.y;
      ripples[i * 4 + 2] = s.time - r.born;
      ripples[i * 4 + 3] = r.strength;
    });

    return {
      t: s.time,
      floatX,
      floatY,
      floatScale,
      floatDip: fl.dip,
      floatLie: fl.lie,
      floatVisible,
      tipX,
      tipY,
      bend: load,
      lineSag,
      lineToX,
      lineToY,
      lineVisible: floatVisible || phase === 'fighting' || phase === 'landing' ? lineVisible : 0,
      fishX,
      fishY,
      fishLen,
      fishAngle,
      fishAlpha,
      aimX,
      aimY,
      aimRx,
      aimRy,
      aimVisible: phase === 'aiming' ? 1 : 0,
      danger,
      bite: phase === 'hookWindow' ? 1 : phase === 'nibbling' ? 0.35 : 0,
      loupe: isAfloat ? 1 : 0,
      fishHeading: s.fish && fighting ? s.fish.heading : 0,
      fishStamina: s.fish && fighting ? s.fish.stamina : 0,
      fishCover: s.fish && fighting && s.fish.mode.id === 'cover' ? 1 : 0,
      ripples,
    };
  }
}

const FAIL_LINE: Phase[] = ['lineBroken', 'snagged', 'catchResult', 'cancelled'];
