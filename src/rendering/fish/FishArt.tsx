import { BlurMask, Canvas, Circle, Group, LinearGradient, Oval, Path, Skia, vec, type SkPath } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import { FISH_SHAPES, type FishShape } from './fishShapes';

const parse = (d: string): SkPath => Skia.Path.MakeFromSVGString(d) ?? Skia.Path.Make();

/** Fin rays fanning from the fin's base to its outer edge. */
function rays(fin: string, count: number): SkPath {
  const path = parse(fin);
  const b = path.computeTightBounds();
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  const kind = cx > 74 && b.height > 6 ? 'caudal' : cy < -2 ? 'dorsal' : cy > 2 && b.width > 12 ? 'anal' : 'paired';
  const iter = Skia.ContourMeasureIter(path, true, 1);
  const contour = iter.next();
  const builder = Skia.PathBuilder.Make();
  if (!contour) return builder.build();
  const outer: { x: number; y: number }[] = [];
  const n = 120;
  for (let i = 0; i < n; i++) {
    const [pt] = contour.getPosTan((contour.length() * i) / n);
    const isOuter =
      kind === 'caudal' ? pt.x > b.x + b.width * 0.6 : kind === 'dorsal' ? pt.y < b.y + b.height * 0.4 : kind === 'anal' ? pt.y > b.y + b.height * 0.6 : pt.x > b.x + b.width * 0.55;
    if (isOuter) outer.push(pt);
  }
  outer.sort((a, c) => (kind === 'dorsal' || kind === 'anal' ? a.x - c.x : a.y - c.y));
  const step = Math.max(1, Math.floor(outer.length / count));
  for (let i = 0; i < outer.length; i += step) {
    const pt = outer[i];
    const root =
      kind === 'caudal'
        ? { x: b.x + 1, y: cy + (pt.y - cy) * 0.25 }
        : kind === 'dorsal'
          ? { x: pt.x - b.width * 0.06, y: b.y + b.height }
          : kind === 'anal'
            ? { x: pt.x - b.width * 0.06, y: b.y }
            : { x: b.x + 1, y: cy };
    builder.moveTo(root.x, root.y);
    builder.lineTo(pt.x + (root.x - pt.x) * 0.06, pt.y + (root.y - pt.y) * 0.06);
  }
  return builder.build();
}

function scales(shape: FishShape): SkPath {
  const b = Skia.PathBuilder.Make();
  const s = shape.scale;
  for (let row = shape.top; row < shape.bottom; row += s * 0.8) {
    const offset = Math.round((row - shape.top) / (s * 0.8)) % 2 ? s / 2 : 0;
    for (let x = 14 + offset; x < 90; x += s) {
      b.addArc(Skia.XYWHRect(x - s / 2, row - s / 2, s, s), -70, 140);
    }
  }
  return b.build();
}

type Props = { speciesId: string; width: number; shadow?: boolean };

/** A species drawn to `width` px = total length. */
export function FishArt({ speciesId, width, shadow = true }: Props) {
  const shape = FISH_SHAPES[speciesId];
  const paths = useMemo(() => {
    if (!shape) return null;
    return {
      body: parse(shape.body),
      caudal: parse(shape.caudal.d),
      caudalRays: shape.caudal.rays ? rays(shape.caudal.d, shape.caudal.rays) : null,
      fins: shape.fins.map((f) => ({ ...f, path: parse(f.d), rays: f.rays ? rays(f.d, f.rays) : null })),
      backFins: (shape.backFins ?? []).map((f) => ({ ...f, path: parse(f.d) })),
      markings: shape.markings.map((m) => ({ ...m, path: parse(m.d) })),
      scales: scales(shape),
      gill: parse(shape.gill),
      mouth: parse(shape.mouth),
      lateral: shape.lateral ? parse(shape.lateral) : null,
    };
  }, [shape]);
  if (!shape || !paths) return null;
  const k = width / 102;
  const height = (shape.bottom - shape.top + 10) * k;
  const top = shape.top - 4;

  return (
    <Canvas style={{ width, height }}>
      <Group transform={[{ scale: k }, { translateX: 1 }, { translateY: -top }]}>
        {shadow && (
          <Oval x={6} y={shape.bottom - 3} width={88} height={5} color="#000000" opacity={0.28}>
            <BlurMask blur={2.5} style="normal" />
          </Oval>
        )}
        {paths.backFins.map((f, i) => (
          <Path key={`b${i}`} path={f.path} style={f.stroke ? 'stroke' : 'fill'} strokeWidth={f.stroke ?? 0} strokeCap="round" color={f.color} opacity={f.alpha} />
        ))}
        <Path path={paths.caudal} color={shape.caudal.color} opacity={shape.caudal.alpha} />
        <Path path={paths.caudal} style="stroke" strokeWidth={0.3} color="#14140E" opacity={0.35} />
        {paths.caudalRays && <Path path={paths.caudalRays} style="stroke" strokeWidth={0.25} color="#1B1A12" opacity={0.35} />}
        {paths.fins.map((f, i) => (
          <Group key={`f${i}`}>
            <Path path={f.path} color={f.color} opacity={f.alpha} />
            <Path path={f.path} style="stroke" strokeWidth={0.3} color="#14140E" opacity={0.35} />
            {f.rays && <Path path={f.rays} style="stroke" strokeWidth={0.22} color="#1B1A12" opacity={0.35} />}
          </Group>
        ))}
        <Group clip={paths.body}>
          <Path path={paths.body}>
            <LinearGradient start={vec(0, shape.top * 0.75)} end={vec(0, shape.bottom * 0.75)} colors={shape.gradient} positions={[0.05, 0.55, 0.95]} />
          </Path>
          <Path path={paths.scales} style="stroke" strokeWidth={0.22} color="#FFFFFF" opacity={0.16} />
          <Path path={paths.scales} style="stroke" strokeWidth={0.18} color="#000000" opacity={0.1} transform={[{ translateY: 0.3 }]} />
          {paths.markings.map((m, i) => (
            <Path key={`m${i}`} path={m.path} style={m.fill ? 'fill' : 'stroke'} strokeWidth={m.width ?? 1} strokeCap="round" color={m.color} opacity={m.alpha} />
          ))}
          {/* Soft specular band along the upper flank. */}
          <Oval x={8} y={shape.top * 0.45} width={70} height={Math.max(3, -shape.top * 0.35)} color="#FFFFFF" opacity={0.1}>
            <BlurMask blur={2} style="normal" />
          </Oval>
        </Group>
        <Path path={paths.body} style="stroke" strokeWidth={0.35} color="#14140E" opacity={0.45} />
        {paths.lateral && <Path path={paths.lateral} style="stroke" strokeWidth={0.3} color="#FFFFFF" opacity={0.18} />}
        <Path path={paths.gill} style="stroke" strokeWidth={0.45} color="#1B1A12" opacity={0.5} />
        <Path path={paths.mouth} style="stroke" strokeWidth={0.5} strokeCap="round" color="#1B1A12" opacity={0.65} />
        <Circle cx={shape.eye.cx} cy={shape.eye.cy} r={shape.eye.r} color="#D8C690" />
        <Circle cx={shape.eye.cx} cy={shape.eye.cy} r={shape.eye.r * 0.62} color="#0D0D0A" />
        <Circle cx={shape.eye.cx - shape.eye.r * 0.3} cy={shape.eye.cy - shape.eye.r * 0.3} r={shape.eye.r * 0.22} color="#FFFFFF" opacity={0.8} />
      </Group>
    </Canvas>
  );
}

export function fishAspect(speciesId: string) {
  const s = FISH_SHAPES[speciesId];
  return s ? (s.bottom - s.top + 10) / 102 : 0.3;
}
