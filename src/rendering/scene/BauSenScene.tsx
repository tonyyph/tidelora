import {
  BlurMask,
  Canvas,
  Circle,
  DashPathEffect,
  Fill,
  Group,
  ImageShader,
  LinearGradient,
  Oval,
  Path,
  Picture,
  RadialGradient,
  Rect,
  RoundedRect,
  Shader,
  Skia,
  useClock,
  vec,
} from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { PixelRatio } from 'react-native';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { makeView } from '../projection';
import type { SceneFrame } from '../sceneFrame';
import { DAWN, recordBackdrop, recordForeground, recordGrass, recordLotus, recordRootTrees, SUN_X } from './bauSenBackdrop';
import { timeGrade } from './timeOfDay';
import { WATER_EFFECT } from './waterShader';

type Props = {
  width: number;
  height: number;
  frame: SharedValue<SceneFrame>;
  quality: 'high' | 'low';
  reducedMotion: boolean;
  /** Screen rect of the float close-up, or null to hide it. */
  loupe?: { x: number; y: number; w: number; h: number } | null;
  /** Game clock in minutes since midnight; grades the dawn painting to the hour. */
  minute?: number;
};

const hex3 = (h: string) => {
  const c = Skia.Color(h);
  return [c[0], c[1], c[2]];
};
const DEEP = hex3('#1C2D2A');
const SHALLOW = hex3('#44554A');

const MIDGES = Array.from({ length: 9 }, (_, i) => ({ phase: i * 1.7, ox: (i * 37) % 100, oy: (i * 53) % 100 }));

export function BauSenScene({ width, height, frame, quality, reducedMotion, loupe = null, minute = 6 * 60 }: Props) {
  const view = useMemo(() => makeView(width, height), [width, height]);
  const layers = useMemo(() => {
    const backdrop = recordBackdrop(view);
    // CPU raster: the reflection source is made once, off the GPU, at a modest scale
    // (it is always seen distorted, so full resolution would be wasted memory).
    const pr = Math.min(PixelRatio.get(), 1.5);
    const surface = Skia.Surface.Make(Math.round(width * pr), Math.round(height * pr));
    let image = null;
    if (surface) {
      const c = surface.getCanvas();
      c.scale(pr, pr);
      c.drawPicture(backdrop);
      surface.flush();
      image = surface.makeImageSnapshot();
    }
    return {
      backdrop,
      image,
      trees: recordRootTrees(view),
      lotus: recordLotus(view),
      foreground: recordForeground(view),
      grass: recordGrass(view),
    };
  }, [view, width, height]);

  const clock = useClock();
  const detail = quality === 'high' ? 1 : 0;
  const motion = reducedMotion ? 0.35 : 1;

  const uniforms = useDerivedValue(() => {
    const f = frame.value;
    const r = f.ripples;
    return {
      res: [width, height],
      horizon: view.horizon,
      time: (clock.value / 1000) * motion,
      sunX: width * SUN_X,
      wind: 0.4,
      detail,
      r0: [r[0], r[1], r[2], r[3]],
      r1: [r[4], r[5], r[6], r[7]],
      r2: [r[8], r[9], r[10], r[11]],
      r3: [r[12], r[13], r[14], r[15]],
      deep: DEEP,
      shallow: SHALLOW,
    };
  });

  // Rod: a tapered curve from the butt (off-screen, bottom right) to the tip, bent by load.
  const rodPath = useDerivedValue(() => {
    const f = frame.value;
    const bx = width * 0.8;
    const by = height + 40;
    const tx = f.tipX;
    const ty = f.tipY;
    const dx = tx - bx;
    const dy = ty - by;
    const len = Math.hypot(dx, dy);
    const nx = -dy / len;
    const ny = dx / len;
    const bend = 0.06 + f.bend * 0.22;
    const cx = bx + dx * 0.55 + nx * len * bend * Math.sign(dx || 1) * -1;
    const cy = by + dy * 0.55 + ny * len * bend * Math.sign(dx || 1) * -1;
    const p = Skia.PathBuilder.Make();
    const N = 14;
    const left: number[][] = [];
    const right: number[][] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const x = (1 - t) * (1 - t) * bx + 2 * (1 - t) * t * cx + t * t * tx;
      const y = (1 - t) * (1 - t) * by + 2 * (1 - t) * t * cy + t * t * ty;
      const gx = 2 * (1 - t) * (cx - bx) + 2 * t * (tx - cx);
      const gy = 2 * (1 - t) * (cy - by) + 2 * t * (ty - cy);
      const gl = Math.hypot(gx, gy) || 1;
      const w = 5.5 * (1 - t) + 0.9;
      left.push([x - (gy / gl) * w * 0.5, y + (gx / gl) * w * 0.5]);
      right.push([x + (gy / gl) * w * 0.5, y - (gx / gl) * w * 0.5]);
    }
    p.moveTo(left[0][0], left[0][1]);
    for (let i = 1; i < left.length; i++) p.lineTo(left[i][0], left[i][1]);
    for (let i = right.length - 1; i >= 0; i--) p.lineTo(right[i][0], right[i][1]);
    p.close();
    return p.build();
  });

  const linePath = useDerivedValue(() => {
    const f = frame.value;
    const p = Skia.PathBuilder.Make();
    if (!f.lineVisible) return p.build();
    const mx = (f.tipX + f.lineToX) / 2;
    const my = (f.tipY + f.lineToY) / 2;
    const dist = Math.hypot(f.lineToX - f.tipX, f.lineToY - f.tipY);
    p.moveTo(f.tipX, f.tipY);
    p.quadTo(mx, my + f.lineSag * dist * 0.22, f.lineToX, f.lineToY);
    return p.build();
  });

  const lineOpacity = useDerivedValue(() => (frame.value.lineVisible ? 0.6 + frame.value.bend * 0.3 : 0));

  // Float: clipped at the waterline, sinks with dip, lies down with lie.
  const floatTransform = useDerivedValue(() => {
    const f = frame.value;
    return [{ translateX: f.floatX }, { translateY: f.floatY }, { scale: f.floatScale }];
  });
  const floatInner = useDerivedValue(() => {
    const f = frame.value;
    const dip = Math.max(-0.4, Math.min(1.2, f.floatDip));
    return [{ translateY: dip * 22 }, { rotate: f.floatLie * 1.35 }];
  });
  const floatOpacity = useDerivedValue(() => frame.value.floatVisible);
  const floatRing = useDerivedValue(() => 0.25 + Math.min(0.5, Math.abs(frame.value.floatDip) * 0.6));

  // The take: rings pulse out from the float so the moment to strike reads at a glance.
  const biteRing = useDerivedValue(() => {
    const f = frame.value;
    const k = reducedMotion ? 0.5 : (clock.value / 700) % 1;
    const rx = (8 + k * 26) * f.floatScale;
    return Skia.XYWHRect(f.floatX - rx, f.floatY - rx * 0.3, rx * 2, rx * 0.6);
  });
  const biteRingOpacity = useDerivedValue(() => {
    const f = frame.value;
    const k = reducedMotion ? 0.5 : (clock.value / 700) % 1;
    return f.floatVisible * (f.bite >= 1 ? 0.95 : f.bite * 0.35) * (1 - k);
  });

  // Fight: a chevron ahead of the fish shows which way it is running; it warms when it heads for cover.
  const chevron = useDerivedValue(() => {
    const f = frame.value;
    const p = Skia.PathBuilder.Make();
    if (!f.fishHeading || f.fishAlpha <= 0) return p.build();
    const h = f.fishHeading;
    const x = f.fishX + h * (f.fishLen * 0.6 + 10);
    const y = f.fishY;
    for (let i = 0; i < 2; i++) {
      const ox = x + h * i * 8;
      p.moveTo(ox - h * 5, y - 6);
      p.lineTo(ox + h * 2, y);
      p.lineTo(ox - h * 5, y + 6);
    }
    return p.build();
  });
  const chevronColor = useDerivedValue(() => (frame.value.fishCover ? '#E08A6E' : '#F3EBDD'));

  const fishTransform = useDerivedValue(() => {
    const f = frame.value;
    return [{ translateX: f.fishX }, { translateY: f.fishY }, { rotate: f.fishAngle }];
  });
  const fishOpacity = useDerivedValue(() => frame.value.fishAlpha);
  const fishRect = useDerivedValue(() => {
    const l = Math.max(frame.value.fishLen, 1);
    return Skia.XYWHRect(-l / 2, -l * 0.12, l, l * 0.24);
  });

  const aimOpacity = useDerivedValue(() => frame.value.aimVisible * (0.55 + 0.25 * Math.sin(clock.value / 300)));
  const aimRect = useDerivedValue(() => {
    const f = frame.value;
    return Skia.XYWHRect(f.aimX - f.aimRx, f.aimY - f.aimRy, f.aimRx * 2, f.aimRy * 2);
  });
  const aimDotX = useDerivedValue(() => frame.value.aimX);
  const aimDotY = useDerivedValue(() => frame.value.aimY);

  const grassTransform = useDerivedValue(() => {
    const t = clock.value / 1000;
    return [{ skewX: reducedMotion ? 0 : Math.sin(t * 0.9) * 0.025 + Math.sin(t * 2.3) * 0.006 }];
  });

  const mistA = useDerivedValue(() => ((clock.value / 1000) * 4 * motion) % (width * 1.6));
  const mistRectA = useDerivedValue(() => Skia.XYWHRect(mistA.value - width * 0.6, view.horizon - height * 0.05, width * 0.7, height * 0.09));
  const mistRectB = useDerivedValue(() => Skia.XYWHRect(((mistA.value * 0.6 + width * 0.8) % (width * 1.6)) - width * 0.6, view.horizon + height * 0.02, width * 0.8, height * 0.06));

  const midges = useDerivedValue(() => {
    const t = clock.value / 1000;
    const p = Skia.PathBuilder.Make();
    if (detail === 0 || reducedMotion) return p.build();
    for (const m of MIDGES) {
      const x = width * (SUN_X + 0.02) + Math.sin(t * 0.7 + m.phase) * 40 + (m.ox - 50) * 1.4;
      const y = view.horizon - height * 0.12 + Math.cos(t * 1.1 + m.phase * 1.3) * 18 + (m.oy - 50) * 0.6;
      p.addCircle(x, y, 1.1);
    }
    return p.build();
  });

  const sunX = width * SUN_X;

  // Loupe: a close-up of the float so nibbles read even when it is cast far out.
  const L = loupe ?? { x: 0, y: 0, w: 1, h: 1 };
  const lcx = L.x + L.w * 0.5;
  const lcy = L.y + L.h * 0.72;
  const loupeClip = useMemo(() => Skia.RRectXY(Skia.XYWHRect(L.x, L.y, L.w, L.h), 14, 14), [L.x, L.y, L.w, L.h]);
  const loupeOpacity = useDerivedValue(() => frame.value.loupe);
  const loupeRings = useDerivedValue(() => {
    const p = Skia.PathBuilder.Make();
    for (let i = 0; i < 3; i++) {
      const k = reducedMotion ? (i + 1) / 4 : (clock.value / 1600 + i / 3) % 1;
      const rx = 14 + k * L.w * 0.42;
      p.addOval(Skia.XYWHRect(lcx - rx, lcy - rx * 0.2, rx * 2, rx * 0.4));
    }
    return p.build();
  });
  const loupeRingOpacity = useDerivedValue(() => {
    const f = frame.value;
    return 0.18 + 0.6 * Math.min(1, Math.max(f.bite, Math.abs(f.floatDip) * 0.9));
  });
  const loupeFloat = useDerivedValue(() => {
    const f = frame.value;
    const dip = Math.max(-0.4, Math.min(1.2, f.floatDip));
    return [{ translateX: lcx + f.floatLie * 10 }, { translateY: lcy }, { scale: 2.1 }, { translateY: dip * 22 }, { rotate: f.floatLie * 1.35 }];
  });
  const loupeFish = useDerivedValue(() => (frame.value.fishHeading ? 0 : frame.value.fishAlpha * 1.4));
  const grade = timeGrade(minute);
  const loupeHot = useDerivedValue(() => (frame.value.bite >= 1 ? (reducedMotion ? 1 : 0.6 + 0.4 * Math.abs(Math.sin(clock.value / 160))) : 0));

  return (
    <Canvas style={{ width, height }}>
      <Picture picture={layers.backdrop} />
      {layers.image ? (
        <Rect x={0} y={view.horizon} width={width} height={height - view.horizon}>
          <Shader source={WATER_EFFECT} uniforms={uniforms}>
            <ImageShader image={layers.image} fit="fill" rect={{ x: 0, y: 0, width, height }} />
          </Shader>
        </Rect>
      ) : (
        <Rect x={0} y={view.horizon} width={width} height={height - view.horizon} color={DAWN.water} />
      )}
      <Group opacity={0.5}>
        <Oval rect={mistRectB} color="#E7E3D8">
          <BlurMask blur={18} style="normal" />
        </Oval>
      </Group>
      <Picture picture={layers.trees} />
      <Picture picture={layers.lotus} />

      <Group transform={fishTransform} opacity={fishOpacity}>
        <Oval rect={fishRect} color="#0A1413">
          <BlurMask blur={4} style="normal" />
        </Oval>
      </Group>

      <Group opacity={aimOpacity}>
        <Oval rect={aimRect} style="stroke" strokeWidth={1.4} color="#F3EBDD">
          <DashPathEffect intervals={[6, 5]} />
        </Oval>
        <Circle cx={aimDotX} cy={aimDotY} r={2.5} color="#F3EBDD" />
      </Group>

      <Group transform={floatTransform} opacity={floatOpacity}>
        <Oval x={-9} y={-2} width={18} height={4} color="#E8E2D2" opacity={floatRing} style="stroke" strokeWidth={0.8} />
        <Group clip={Skia.XYWHRect(-30, -60, 60, 60)}>
          <Group transform={floatInner}>
            <Rect x={-1.6} y={-26} width={3.2} height={26} color="#2F3326" />
            <Rect x={-1.7} y={-26} width={3.4} height={9} color="#D8573A" />
            <Rect x={-1.7} y={-17} width={3.4} height={2} color="#F3EBDD" />
            <Rect x={-0.6} y={-25} width={0.8} height={20} color="#FFFFFF" opacity={0.25} />
          </Group>
        </Group>
      </Group>

      <Oval rect={biteRing} style="stroke" strokeWidth={1.6} color="#F3DDB0" opacity={biteRingOpacity} />

      <Path path={linePath} style="stroke" strokeWidth={0.9} color="#EDE6D6" opacity={lineOpacity} />
      <Path path={chevron} style="stroke" strokeWidth={2.2} strokeCap="round" strokeJoin="round" color={chevronColor} opacity={0.85} />

      <Picture picture={layers.foreground} />
      <Group transform={grassTransform} origin={vec(0, height)}>
        <Picture picture={layers.grass} />
      </Group>

      <Path path={rodPath} color="#2B241D" />
      <Path path={rodPath} style="stroke" strokeWidth={0.6} color="#A88F6A" opacity={0.5} />

      <Group opacity={0.32}>
        <Oval rect={mistRectA} color="#EFEBE1">
          <BlurMask blur={22} style="normal" />
        </Oval>
      </Group>
      <Path path={midges} color="#F6E3BC" opacity={0.7} />

      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient c={vec(sunX, view.horizon * 0.85)} r={Math.max(width, height) * 0.9} colors={['#00000000', '#00000000', '#0A12124D']} positions={[0, 0.55, 1]} />
      </Rect>
      <Fill color="#F1CFA0" opacity={0.035} blendMode="softLight" />
      {grade.tint !== '#FFFFFF' && <Fill color={grade.tint} blendMode="multiply" />}
      {grade.lift > 0 && <Fill color="#FFFFFF" opacity={grade.lift} blendMode="softLight" />}

      {loupe && (
        <Group opacity={loupeOpacity}>
          <Group clip={loupeClip}>
            <Rect x={L.x} y={L.y} width={L.w} height={L.h}>
              <LinearGradient
                start={vec(0, L.y)}
                end={vec(0, L.y + L.h)}
                colors={['#93A397', '#7E9186', '#4C665A', '#1F3832']}
                positions={[0, 0.7, 0.73, 1]}
              />
            </Rect>
            <Oval x={lcx - 52} y={lcy + 14} width={92} height={16} color="#0A1413" opacity={loupeFish}>
              <BlurMask blur={6} style="normal" />
            </Oval>
            <Path path={loupeRings} style="stroke" strokeWidth={1.4} color="#F3EBDD" opacity={loupeRingOpacity} />
            <Group transform={loupeFloat}>
              <Group clip={Skia.XYWHRect(-30, -60, 60, 60)}>
                <Rect x={-1.6} y={-26} width={3.2} height={26} color="#2F3326" />
                <Rect x={-1.7} y={-26} width={3.4} height={9} color="#D8573A" />
                <Rect x={-1.7} y={-17} width={3.4} height={2} color="#F3EBDD" />
                <Rect x={-0.6} y={-25} width={0.8} height={20} color="#FFFFFF" opacity={0.25} />
              </Group>
            </Group>
          </Group>
          <RoundedRect x={L.x} y={L.y} width={L.w} height={L.h} r={14} style="stroke" strokeWidth={1} color="#F3EBDD" opacity={0.35} />
          <RoundedRect x={L.x} y={L.y} width={L.w} height={L.h} r={14} style="stroke" strokeWidth={3} color="#D9B977" opacity={loupeHot} />
        </Group>
      )}
    </Canvas>
  );
}
