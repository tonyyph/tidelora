import { BlurStyle, Skia, TileMode, vec, type SkCanvas, type SkPaint, type SkPath, type SkPicture } from '@shopify/react-native-skia';

import { createRng, range, type Rng } from '../../simulation/rng';

/** Small helpers for the imperative, record-once scene layers. */

export const color = (hex: string, alpha = 1) => {
  const c = Skia.Color(hex);
  c[3] = alpha;
  return c;
};

export function fill(hex: string, alpha = 1, blur = 0): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setColor(color(hex, alpha));
  if (blur > 0) p.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, blur, true));
  return p;
}

export function stroke(hex: string, width: number, alpha = 1, blur = 0): SkPaint {
  const p = fill(hex, alpha, blur);
  p.setStyle(1);
  p.setStrokeWidth(width);
  p.setStrokeCap(1);
  return p;
}

export function vGradient(y0: number, y1: number, stops: [string, number][], alphas?: number[]): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setShader(
    Skia.Shader.MakeLinearGradient(
      vec(0, y0),
      vec(0, y1),
      stops.map(([h], i) => color(h, alphas?.[i] ?? 1)),
      stops.map(([, s]) => s),
      TileMode.Clamp,
    ),
  );
  return p;
}

export function radial(cx: number, cy: number, r: number, stops: [string, number, number][]): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setShader(
    Skia.Shader.MakeRadialGradient(
      vec(cx, cy),
      r,
      stops.map(([h, , a]) => color(h, a)),
      stops.map(([, s]) => s),
      TileMode.Clamp,
    ),
  );
  return p;
}

export function record(width: number, height: number, draw: (c: SkCanvas, rng: Rng) => void, seed = 1): SkPicture {
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, width, height));
  draw(canvas, createRng(seed));
  return recorder.finishRecordingAsPicture();
}

/** A soft, lumpy blob: a closed curve through jittered points on an ellipse. */
export function blob(rng: Rng, cx: number, cy: number, rx: number, ry: number, lumps = 9, jitter = 0.22): SkPath {
  const path = Skia.PathBuilder.Make();
  const pts: [number, number][] = [];
  for (let i = 0; i < lumps; i++) {
    const a = (i / lumps) * Math.PI * 2;
    const k = 1 + range(rng, -jitter, jitter);
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  const mid = (a: [number, number], b: [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as const;
  const start = mid(pts[pts.length - 1], pts[0]);
  path.moveTo(start[0], start[1]);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % pts.length]);
    path.quadTo(p[0], p[1], m[0], m[1]);
  }
  path.close();
  return path.build();
}

export const mix = (a: string, b: string, t: number) => {
  const pa = Skia.Color(a);
  const pb = Skia.Color(b);
  const to = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0');
  return `#${to(pa[0] + (pb[0] - pa[0]) * t)}${to(pa[1] + (pb[1] - pa[1]) * t)}${to(pa[2] + (pb[2] - pa[2]) * t)}`;
};
