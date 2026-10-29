import {
  BlurMask,
  Canvas,
  Circle,
  DashPathEffect,
  Fill,
  Group,
  Image,
  ImageShader,
  Oval,
  Path,
  RadialGradient,
  Rect,
  RoundedRect,
  Shader,
  Skia,
  type SkImage,
  useClock,
  useImage,
  vec,
} from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { ART, LAKE_HORIZON, lakeLight } from '../art';
import { ART_SIZE } from '../artManifest';
import { makeView } from '../projection';
import type { SceneFrame } from '../sceneFrame';
import { WATER_EFFECT } from './waterShader';

type Props = {
  width: number;
  height: number;
  frame: SharedValue<SceneFrame>;
  quality: 'high' | 'low';
  reducedMotion: boolean;
  /** Screen rect of the float close-up, or null to hide it. */
  loupe?: { x: number; y: number; w: number; h: number } | null;
  /** Game clock in minutes since midnight; picks and crossfades the lake paintings. */
  minute?: number;
  /** Equipped rod and float: each draws as its own kind. */
  rod?: 'bamboo' | 'carbon';
  float?: 'quill' | 'balsa';
};

const LAKE = ART_SIZE['bg-fishing-lake-morning'];

/**
 * Cover-fit the lake painting, then slide it vertically (within cover) so its
 * shoreline sits on the projection's horizon and casts land on painted water.
 */
export function lakeRect(width: number, height: number, horizon: number) {
  const k = Math.max(width / LAKE.w, height / LAKE.h);
  const w = LAKE.w * k;
  const h = LAKE.h * k;
  const y = Math.min(0, Math.max(height - h, horizon - LAKE_HORIZON * h));
  return { x: (width - w) / 2, y, width: w, height: h };
}

/** Graphite blank guides, as a share of the blank from the grip socket to the tip. */
const GUIDES = [0.2, 0.38, 0.53, 0.66, 0.77, 0.86, 0.94];
/** Bamboo nodes, as a share of the pole from butt to tip. */
const NODES = [0.26, 0.37, 0.47, 0.56, 0.64, 0.72, 0.79, 0.86, 0.92];

/**
 * The carbon rod's grip and reel are painted (rod-grip-reel); its blank and line
 * are drawn. Anchors in the sprite's pixels: the butt cap, and the socket where
 * the blank leaves the grip.
 */
const GRIP = ART_SIZE['rod-grip-reel'];
const GRIP_BUTT = { x: 692, y: 628 };
const GRIP_SOCKET = { x: 58, y: 18 };
const GRIP_LEN = Math.hypot(GRIP_SOCKET.x - GRIP_BUTT.x, GRIP_SOCKET.y - GRIP_BUTT.y);
const GRIP_ANGLE = Math.atan2(GRIP_SOCKET.y - GRIP_BUTT.y, GRIP_SOCKET.x - GRIP_BUTT.x);
/** Blank width at the socket, in sprite pixels. */
const GRIP_SOCKET_W = 22;

/**
 * The balsa float sprite, drawn with its waterline at y = 0: everything above
 * `BALSA_WATERLINE` (share of its height, low on the body) shows above water.
 */
const BALSA = ART_SIZE['float-balsa'];
const BALSA_WATERLINE = 0.56;
const BALSA_K = 30 / (BALSA.h * BALSA_WATERLINE);

function FloatBody({ kind, balsa }: { kind: 'quill' | 'balsa'; balsa: SkImage | null }) {
  if (kind === 'balsa' && balsa) {
    return <Image image={balsa} x={(-BALSA.w * BALSA_K) / 2} y={-BALSA.h * BALSA_WATERLINE * BALSA_K} width={BALSA.w * BALSA_K} height={BALSA.h * BALSA_K} fit="fill" />;
  }
  // Porcupine quill: banded dark and pale, a red tip to read against the water.
  return (
    <>
      <Rect x={-1.5} y={-26} width={3} height={26} color="#E9E1CC" />
      <Rect x={-1.5} y={-17} width={3} height={4} color="#2B2A24" />
      <Rect x={-1.5} y={-9} width={3} height={4} color="#2B2A24" />
      <Rect x={-1.7} y={-26} width={3.4} height={7} color="#D8573A" />
      <Rect x={-0.6} y={-25} width={0.8} height={20} color="#FFFFFF" opacity={0.3} />
    </>
  );
}

export function BauSenScene({ width, height, frame, quality, reducedMotion, loupe = null, minute = 6 * 60, rod = 'bamboo', float = 'quill' }: Props) {
  const view = useMemo(() => makeView(width, height), [width, height]);
  const light = lakeLight(minute);
  // Only the painting on show and the one it is fading into are loaded.
  const lakeA = useImage(ART[light.a]);
  const lakeB = useImage(light.mix > 0 ? ART[light.b] : null);
  const lake = lakeA;
  const grip = useImage(rod === 'carbon' ? ART['rod-grip-reel'] : null);
  const balsa = useImage(float === 'balsa' ? ART['float-balsa'] : null);
  const lr = useMemo(() => lakeRect(width, height, view.horizon), [width, height, view.horizon]);
  const sunX = lr.x + lr.width * light.glintX;

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
      sunX,
      detail,
      blend: lakeB ? light.mix : 0,
      glint: light.glint,
      glintCol: light.glintRGB,
      r0: [r[0], r[1], r[2], r[3]],
      r1: [r[4], r[5], r[6], r[7]],
      r2: [r[8], r[9], r[10], r[11]],
      r3: [r[12], r[13], r[14], r[15]],
    };
  });

  // Rod. Bamboo: one tapered pole from the butt (off-screen, bottom right) to the tip,
  // with a cord-wrapped grip and nodes. Carbon: the painted grip and reel lie straight
  // from the butt towards the tip, and a thin graphite blank runs on from its socket.
  // Either flexible part is a quadratic bent by load; `strip` builds the tapered outline
  // between two points along it, so the grip wrap, nodes and guides follow the bend.
  const rodParts = useDerivedValue(() => {
    const f = frame.value;
    const carbon = rod === 'carbon';
    const bx = width * (carbon ? 0.83 : 0.8);
    const by = height + (carbon ? height * 0.1 : 40);
    const tx = f.tipX;
    const ty = f.tipY;
    const reach = Math.hypot(tx - bx, ty - by) || 1;
    const gripLen = carbon ? Math.min(height * 0.48, reach * 0.55) : 0;
    const sx = bx + ((tx - bx) / reach) * gripLen;
    const sy = by + ((ty - by) / reach) * gripLen;
    const dx = tx - sx;
    const dy = ty - sy;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const bend = 0.06 + f.bend * 0.22;
    const cx = sx + dx * 0.55 + nx * len * bend * Math.sign(dx || 1) * -1;
    const cy = sy + dy * 0.55 + ny * len * bend * Math.sign(dx || 1) * -1;
    const at = (t: number) => {
      const x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * tx;
      const y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ty;
      const gx = 2 * (1 - t) * (cx - sx) + 2 * t * (tx - cx);
      const gy = 2 * (1 - t) * (cy - sy) + 2 * t * (ty - cy);
      const gl = Math.hypot(gx, gy) || 1;
      return { x, y, nx: -gy / gl, ny: gx / gl };
    };
    const scale = gripLen / GRIP_LEN;
    const socketW = GRIP_SOCKET_W * scale;
    const thick = carbon ? (t: number) => socketW * (1 - t) * (1 - t * 0.3) + 1.1 : (t: number) => 13 * (1 - t) * (1 - t * 0.35) + 2;
    const strip = (t0: number, t1: number, k: number) => {
      const p = Skia.PathBuilder.Make();
      const N = 14;
      const right: number[][] = [];
      for (let i = 0; i <= N; i++) {
        const t = t0 + ((t1 - t0) * i) / N;
        const q = at(t);
        const w = thick(t) * k * 0.5;
        if (i === 0) p.moveTo(q.x + q.nx * w, q.y + q.ny * w);
        else p.lineTo(q.x + q.nx * w, q.y + q.ny * w);
        right.push([q.x - q.nx * w, q.y - q.ny * w]);
      }
      for (let i = right.length - 1; i >= 0; i--) p.lineTo(right[i][0], right[i][1]);
      p.close();
      return p.build();
    };
    const marks = Skia.PathBuilder.Make();
    if (carbon) {
      for (const g of GUIDES) {
        const q = at(g);
        const r = thick(g) * 0.75 + 1.2;
        marks.addCircle(q.x + q.nx * r, q.y + q.ny * r, Math.max(1, thick(g) * 0.45));
      }
    } else {
      for (const n of NODES) {
        const q = at(n);
        const w = thick(n) * 0.62;
        marks.moveTo(q.x + q.nx * w, q.y + q.ny * w);
        marks.lineTo(q.x - q.nx * w, q.y - q.ny * w);
      }
    }
    const gripAt = [
      { translateX: bx },
      { translateY: by },
      { rotate: Math.atan2(ty - by, tx - bx) - GRIP_ANGLE },
      { scale: scale || 0.0001 },
      { translateX: -GRIP_BUTT.x },
      { translateY: -GRIP_BUTT.y },
    ];
    return { blank: strip(carbon ? 0 : 0.17, 1, 1), grip: strip(0, 0.2, 1.25), marks: marks.build(), gripAt };
  });
  const rodBlank = useDerivedValue(() => rodParts.value.blank);
  const rodGrip = useDerivedValue(() => rodParts.value.grip);
  const rodMarks = useDerivedValue(() => rodParts.value.marks);
  const gripTransform = useDerivedValue(() => rodParts.value.gripAt);

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

  const mistA = useDerivedValue(() => ((clock.value / 1000) * 4 * motion) % (width * 1.6));
  const mistRectA = useDerivedValue(() => Skia.XYWHRect(mistA.value - width * 0.6, view.horizon - height * 0.05, width * 0.7, height * 0.09));
  const mistRectB = useDerivedValue(() => Skia.XYWHRect(((mistA.value * 0.6 + width * 0.8) % (width * 1.6)) - width * 0.6, view.horizon + height * 0.02, width * 0.8, height * 0.06));

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
  // The loupe magnifies the painted water around the float, at the float's own zoom.
  const loupeWater = useDerivedValue(() => {
    const f = frame.value;
    const z = Math.min(5, 2.1 / Math.max(f.floatScale, 0.35));
    return [{ translateX: lcx }, { translateY: lcy }, { scale: z }, { translateX: -f.floatX }, { translateY: -f.floatY }];
  });
  const loupeHot = useDerivedValue(() => (frame.value.bite >= 1 ? (reducedMotion ? 1 : 0.6 + 0.4 * Math.abs(Math.sin(clock.value / 160))) : 0));

  return (
    <Canvas style={{ width, height }}>
      <Fill color="#1E2A26" />
      {lake && (
        <>
          <Image image={lake} x={lr.x} y={lr.y} width={lr.width} height={lr.height} fit="fill" />
          {lakeB && light.mix > 0 && <Image image={lakeB} x={lr.x} y={lr.y} width={lr.width} height={lr.height} fit="fill" opacity={light.mix} />}
          <Rect x={0} y={view.horizon} width={width} height={height - view.horizon}>
            <Shader source={WATER_EFFECT} uniforms={uniforms}>
              <ImageShader image={lake} fit="fill" rect={lr} />
              <ImageShader image={lakeB ?? lake} fit="fill" rect={lr} />
            </Shader>
          </Rect>
        </>
      )}
      <Group opacity={0.35 * (1 - light.night * 0.6)}>
        <Oval rect={mistRectB} color="#F4E9D6">
          <BlurMask blur={18} style="normal" />
        </Oval>
      </Group>

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
            <FloatBody kind={float} balsa={balsa} />
          </Group>
        </Group>
      </Group>

      <Oval rect={biteRing} style="stroke" strokeWidth={1.6} color="#F3DDB0" opacity={biteRingOpacity} />

      <Path path={linePath} style="stroke" strokeWidth={0.9} color="#EDE6D6" opacity={lineOpacity} />
      <Path path={chevron} style="stroke" strokeWidth={2.2} strokeCap="round" strokeJoin="round" color={chevronColor} opacity={0.85} />

      {rod === 'carbon' ? (
        <>
          <Path path={rodBlank} color="#15181B" />
          <Path path={rodBlank} style="stroke" strokeWidth={0.6} color="#8A949C" opacity={0.4} />
          <Path path={rodMarks} style="stroke" strokeWidth={1} color="#C7B184" opacity={0.9} />
          {grip && (
            <Group transform={gripTransform}>
              <Image image={grip} x={0} y={0} width={GRIP.w} height={GRIP.h} fit="fill" />
            </Group>
          )}
        </>
      ) : (
        <>
          <Path path={rodBlank} color="#B8975A" />
          <Path path={rodBlank} style="stroke" strokeWidth={0.8} color="#6E5530" opacity={0.6} />
          <Path path={rodMarks} style="stroke" strokeWidth={1.6} strokeCap="round" color="#6B4F28" opacity={0.85} />
          <Path path={rodGrip} color="#3A2C20" />
          <Path path={rodGrip} style="stroke" strokeWidth={0.8} color="#7A6046" opacity={0.6} />
        </>
      )}

      <Group opacity={0.28 * (1 - light.night * 0.6)}>
        <Oval rect={mistRectA} color="#F6ECDC">
          <BlurMask blur={22} style="normal" />
        </Oval>
      </Group>

      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient c={vec(sunX, view.horizon * 0.85)} r={Math.max(width, height) * 0.9} colors={['#00000000', '#00000000', '#0A121240']} positions={[0, 0.6, 1]} />
      </Rect>

      {loupe && (
        <Group opacity={loupeOpacity}>
          <Group clip={loupeClip}>
            <Rect x={L.x} y={L.y} width={L.w} height={L.h} color="#2F3F38" />
            {lake && (
              <Group transform={loupeWater}>
                <Image image={lake} x={lr.x} y={lr.y} width={lr.width} height={lr.height} fit="fill" />
                {lakeB && light.mix > 0 && <Image image={lakeB} x={lr.x} y={lr.y} width={lr.width} height={lr.height} fit="fill" opacity={light.mix} />}
              </Group>
            )}
            <Oval x={lcx - 52} y={lcy + 14} width={92} height={16} color="#0A1413" opacity={loupeFish}>
              <BlurMask blur={6} style="normal" />
            </Oval>
            <Path path={loupeRings} style="stroke" strokeWidth={1.4} color="#F3EBDD" opacity={loupeRingOpacity} />
            <Group transform={loupeFloat}>
              <Group clip={Skia.XYWHRect(-30, -60, 60, 60)}>
                <FloatBody kind={float} balsa={balsa} />
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
