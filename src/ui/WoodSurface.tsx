import { Canvas, Picture, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';

import { fill, mix, radial, record, stroke, vGradient } from '../rendering/scene/paintKit';
import { range } from '../simulation/rng';

/**
 * A worn plank tabletop under a warm window light. Procedural placeholder
 * material; `tone` shifts it between the prep bench (cool) and the kitchen (warm).
 */
export function WoodSurface({ tone = 'bench' }: { tone?: 'bench' | 'kitchen' | 'paper' }) {
  const { width: w, height: h } = useWindowDimensions();
  const pic = useMemo(
    () =>
      record(w, h, (c, rng) => {
        const base = tone === 'kitchen' ? '#5A4130' : '#4A3C2F';
        const light = tone === 'kitchen' ? '#8A6446' : '#6F5B47';
        const planks = 6;
        const ph = h / planks;
        for (let i = 0; i < planks; i++) {
          const y = i * ph;
          const t = range(rng, 0, 1);
          c.drawRect(Skia.XYWHRect(0, y, w, ph), vGradient(y, y + ph, [[mix(base, light, 0.3 + t * 0.4), 0], [mix(base, light, t * 0.3), 1]]));
          for (let g = 0; g < 26; g++) {
            const gy = y + range(rng, 4, ph - 4);
            const p = Skia.PathBuilder.Make();
            p.moveTo(0, gy);
            const segs = 6;
            for (let k = 1; k <= segs; k++) p.quadTo((w * (k - 0.5)) / segs, gy + range(rng, -3, 3), (w * k) / segs, gy + range(rng, -1.5, 1.5));
            c.drawPath(p.build(), stroke('#24190F', range(rng, 0.4, 1.3), range(rng, 0.08, 0.22)));
          }
          // A knot or two.
          if (rng.s % 2 === 0) {
            const kx = range(rng, 0.1, 0.9) * w;
            const ky = y + ph * range(rng, 0.3, 0.7);
            c.drawOval(Skia.XYWHRect(kx - 14, ky - 5, 28, 10), fill('#2A1D12', 0.35, 2));
          }
          c.drawRect(Skia.XYWHRect(0, y + ph - 2, w, 2), fill('#1A120B', 0.7));
          c.drawRect(Skia.XYWHRect(0, y, w, 1), fill('#FFFFFF', 0.05));
        }
        // Window light from the upper left, and a darker room edge.
        c.drawRect(Skia.XYWHRect(0, 0, w, h), radial(w * 0.22, -h * 0.1, Math.max(w, h) * 0.9, [[tone === 'kitchen' ? '#FFC98A' : '#F6E4C2', 0, 0.28], ['#000000', 0.6, 0], ['#000000', 1, 0.45]]));
        if (tone === 'paper') c.drawRect(Skia.XYWHRect(0, 0, w, h), fill('#0B1A1D', 0.35));
      }, tone === 'kitchen' ? 41 : 43),
    [w, h, tone],
  );
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Picture picture={pic} />
    </Canvas>
  );
}
