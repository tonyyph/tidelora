import { Skia, type SkCanvas } from '@shopify/react-native-skia';

import { range, type Rng } from '../../simulation/rng';
import { project, type View } from '../projection';
import { blob, fill, mix, radial, record, stroke, vGradient } from './paintKit';

/**
 * Bàu Sen at dawn, procedural placeholder art (see docs/ASSET_MANIFEST.md).
 * Everything here is static, so it is recorded once per screen size.
 */
export const DAWN = {
  skyTop: '#2C4650',
  skyMid: '#6F8C93',
  skyLow: '#D4B593',
  glow: '#F4C994',
  sun: '#FFF0D2',
  cloud: '#B8A79A',
  far: '#7F918F',
  mid: '#4C5D56',
  bank: '#2E3B33',
  water: '#16282A',
  trunk: '#B9AE9C',
  trunkShade: '#6E6658',
  foliage: '#3E5045',
  foliageLit: '#6E7F5E',
};

export const SUN_X = 0.3;

/** Sky, sun, clouds and the two distant treelines; sampled by the water shader for reflections. */
export function recordBackdrop(v: View) {
  const { width: w, horizon: hz } = v;
  return record(w, v.height, (c, rng) => {
    c.drawRect(Skia.XYWHRect(0, 0, w, hz + 2), vGradient(0, hz, [[DAWN.skyTop, 0], [DAWN.skyMid, 0.55], [DAWN.skyLow, 0.88], [DAWN.glow, 1]]));
    const sunX = w * SUN_X;
    const sunY = hz - v.height * 0.07;
    c.drawCircle(sunX, sunY, v.height * 0.55, radial(sunX, sunY, v.height * 0.55, [[DAWN.glow, 0, 0.55], [DAWN.glow, 0.35, 0.18], [DAWN.glow, 1, 0]]));
    // High stratus streaks catching the light.
    for (let i = 0; i < 9; i++) {
      const y = range(rng, hz * 0.12, hz * 0.62);
      const x = range(rng, -0.1, 1.1) * w;
      const len = range(rng, 0.18, 0.45) * w;
      const warm = 1 - y / hz;
      c.drawOval(Skia.XYWHRect(x - len / 2, y, len, range(rng, 3, 9)), fill(mix(DAWN.cloud, DAWN.glow, 1 - warm), range(rng, 0.18, 0.4), 4));
    }
    c.drawCircle(sunX, sunY, v.height * 0.035, fill(DAWN.sun, 0.95, 2));
    treeline(c, rng, v, hz + 1, 0.075, DAWN.far, 2.2, 0.0);
    // Haze between the treelines.
    c.drawRect(Skia.XYWHRect(0, hz - v.height * 0.06, w, v.height * 0.07), vGradient(hz - v.height * 0.06, hz + 2, [[DAWN.glow, 0], [DAWN.glow, 1]], [0, 0.35]));
    treeline(c, rng, v, hz + 2, 0.12, DAWN.mid, 1.1, 0.35);
    // Low bank with reeds along the far shore.
    const bank = Skia.PathBuilder.Make();
    bank.moveTo(0, hz + 2);
    for (let x = 0; x <= w; x += 6) bank.lineTo(x, hz - range(rng, 1, 4));
    bank.lineTo(w, hz + 3);
    bank.close();
    c.drawPath(bank.build(), fill(DAWN.bank, 1));
    for (let i = 0; i < w / 9; i++) {
      const x = range(rng, 0, w);
      const clump = Math.floor(range(rng, 2, 6));
      for (let k = 0; k < clump; k++) {
        const hgt = range(rng, 3, 9);
        const bx = x + range(rng, -4, 4);
        c.drawLine(bx, hz + 1, bx + range(rng, -3, 3), hz - hgt, stroke(DAWN.bank, range(rng, 0.6, 1.1), range(rng, 0.35, 0.7)));
      }
    }
    // Low mist lying on the far water.
    c.drawRect(Skia.XYWHRect(0, hz - v.height * 0.035, w, v.height * 0.05), fill('#E9E2D6', 0.32, 7));
  });
}

function treeline(c: SkCanvas, rng: Rng, v: View, base: number, heightFrac: number, hex: string, blur: number, detail: number) {
  const { width: w } = v;
  const paint = fill(hex, 1, blur);
  const lit = fill(mix(hex, DAWN.glow, 0.28), 0.5, blur + 1);
  let x = -20;
  while (x < w + 20) {
    const hgt = v.height * heightFrac * range(rng, 0.55, 1.25);
    const cw = range(rng, 0.25, 0.42) * hgt;
    // Melaleuca: slim pale trunk, ragged columnar crown.
    if (detail > 0 && rng.s % 3 === 0) c.drawLine(x, base, x + range(rng, -2, 2), base - hgt * 0.7, stroke(mix(hex, DAWN.trunk, 0.35), 1.2, 0.9));
    const puffs = 5 + Math.floor(hgt / 9);
    for (let i = 0; i < puffs; i++) {
      const t = i / puffs;
      const py = base - hgt * (0.25 + 0.75 * t);
      const pr = cw * (1 - t * 0.55) * range(rng, 0.5, 0.85);
      c.drawPath(blob(rng, x + range(rng, -cw * 0.35, cw * 0.35), py, pr, pr * 0.8, 8, 0.3), paint);
      if (detail > 0 && t > 0.4 && rng.s % 2 === 0) c.drawPath(blob(rng, x - pr * 0.3, py - pr * 0.25, pr * 0.5, pr * 0.35, 7, 0.3), lit);
    }
    c.drawRect(Skia.XYWHRect(x - cw, base - hgt * 0.32, cw * 2, hgt * 0.32), paint);
    x += range(rng, 0.25, 0.7) * cw * 2;
  }
}

/** Melaleuca trees standing in the water on the right (the "roots" microhabitat). */
export function recordRootTrees(v: View) {
  return record(v.width, v.height, (c, rng) => {
    const trees = [
      { x: 13.5, z: 17 },
      { x: 7.5, z: 19.5 },
      { x: 10.5, z: 13.5 },
      { x: 16, z: 12.5 },
      { x: 5.6, z: 15.5 },
    ];
    for (const t of trees.sort((a, b) => b.z - a.z)) {
      const base = project(v, t.x, t.z);
      const top = project(v, t.x + range(rng, -0.8, 0.4), t.z, range(rng, 5.2, 7.2));
      const bw = Math.max(1.6, 0.13 * base.scale);
      const depthFade = Math.min(1, 10 / t.z);
      const trunkColor = mix(mix(DAWN.trunk, '#8D8676', 0.35), DAWN.mid, 1 - depthFade * 0.8);
      // Reflection: a darker, slightly wider trunk falling down into the water.
      const refl = Skia.PathBuilder.Make();
      refl.moveTo(base.sx - bw * 0.6, base.sy);
      refl.lineTo(base.sx + bw * 0.6, base.sy);
      refl.lineTo(base.sx + bw * 0.3 + (base.sx - top.sx) * 0.15, base.sy + (base.sy - top.sy) * 0.35);
      refl.lineTo(base.sx - bw * 0.3 + (base.sx - top.sx) * 0.15, base.sy + (base.sy - top.sy) * 0.35);
      refl.close();
      c.drawPath(refl.build(), fill(DAWN.trunkShade, 0.35, 3));
      // Trunk with a peeling-bark shade on the shadow side.
      const trunk = Skia.PathBuilder.Make();
      trunk.moveTo(base.sx - bw, base.sy);
      trunk.cubicTo(base.sx - bw * 0.7, base.sy - (base.sy - top.sy) * 0.4, top.sx - bw * 0.4, top.sy + 40, top.sx - bw * 0.3, top.sy);
      trunk.lineTo(top.sx + bw * 0.3, top.sy);
      trunk.cubicTo(top.sx + bw * 0.4, top.sy + 40, base.sx + bw * 0.7, base.sy - (base.sy - top.sy) * 0.4, base.sx + bw, base.sy);
      trunk.close();
      c.drawPath(trunk.build(), fill(trunkColor));
      c.save();
      c.clipPath(trunk.build(), 1, true);
      c.drawRect(Skia.XYWHRect(base.sx, top.sy, bw * 1.2, base.sy - top.sy), fill(DAWN.trunkShade, 0.45, 2));
      for (let i = 0; i < 14; i++) {
        const y = range(rng, top.sy, base.sy);
        c.drawLine(base.sx - bw, y, base.sx + bw, y + range(rng, -3, 3), stroke(DAWN.trunkShade, range(rng, 0.6, 1.6), 0.35));
      }
      c.restore();
      // Knees and roots breaking the surface.
      for (let i = 0; i < 4; i++) {
        const rx = base.sx + range(rng, -bw * 3, bw * 3);
        c.drawOval(Skia.XYWHRect(rx - bw * 0.4, base.sy - bw * 0.5, bw * 0.8, bw * 0.7), fill(trunkColor, 0.85));
      }
      c.drawOval(Skia.XYWHRect(base.sx - bw * 3, base.sy - 1, bw * 6, bw * 0.6), fill('#0E1B1C', 0.45, 2));
      // Crown: drooping clusters of narrow leaves.
      // Crown: an open, ragged column of drooping leaf clusters, lit from the left.
      const crownR = 1.5 * top.scale;
      const crownH = 2.6 * top.scale;
      const dark = mix(DAWN.foliage, DAWN.mid, 1 - depthFade);
      for (let i = 0; i < 26; i++) {
        const u = range(rng, 0, 1);
        const cx = top.sx + range(rng, -crownR, crownR) * (0.55 + 0.45 * Math.sin(u * Math.PI));
        const cy = top.sy - crownH * 0.35 + u * crownH;
        const r = range(rng, 0.22, 0.42) * crownR;
        c.drawPath(blob(rng, cx, cy, r, r * 0.8, 9, 0.38), fill(dark, 0.96, 1));
        if (cx < top.sx - r * 0.2) c.drawPath(blob(rng, cx - r * 0.25, cy - r * 0.2, r * 0.6, r * 0.42, 8, 0.4), fill(DAWN.foliageLit, 0.5, 1.5));
      }
      // Branches reaching into the crown.
      for (let i = 0; i < 3; i++) {
        const by = top.sy + crownH * range(rng, 0.2, 0.6);
        c.drawLine(top.sx, by + 20, top.sx + range(rng, -crownR, crownR) * 0.7, by - range(rng, 5, 25), stroke(trunkColor, Math.max(1, bw * 0.35), 0.9));
      }
    }
  }, 7);
}

/** Lotus and water-lily field on the left (the "lotus" microhabitat). */
export function recordLotus(v: View) {
  return record(v.width, v.height, (c, rng) => {
    const items: { x: number; z: number; kind: 'pad' | 'leaf' | 'bud' | 'flower' }[] = [];
    for (let i = 0; i < 150; i++) {
      const z = range(rng, 5.5, 16);
      const x = range(rng, -14, -2.6 - (16 - z) * 0.12);
      const roll = range(rng, 0, 1);
      items.push({ x, z, kind: roll < 0.45 ? 'pad' : roll < 0.85 ? 'leaf' : roll < 0.93 ? 'bud' : 'flower' });
    }
    // Scattered pads drifting into the open water.
    for (let i = 0; i < 8; i++) items.push({ x: range(rng, -4, 2), z: range(rng, 6, 12), kind: 'pad' });
    items.sort((a, b) => b.z - a.z);
    for (const it of items) {
      const p = project(v, it.x, it.z);
      const fore = 1.6 / it.z;
      if (it.kind === 'pad') {
        const r = range(rng, 0.3, 0.55) * p.scale;
        c.drawOval(Skia.XYWHRect(p.sx - r, p.sy - r * fore, r * 2, r * 2 * fore), fill('#3F5A3C', 0.95));
        c.drawOval(Skia.XYWHRect(p.sx - r * 0.8, p.sy - r * fore * 0.9, r * 1.4, r * 1.2 * fore), fill('#5E7A4E', 0.5, 1));
        c.drawLine(p.sx, p.sy, p.sx + r * 0.9, p.sy + r * fore * 0.2, stroke('#22311F', 1, 0.6));
        continue;
      }
      const stemH = it.kind === 'leaf' ? range(rng, 0.35, 0.7) : range(rng, 0.5, 0.9);
      const top = project(v, it.x, it.z, stemH);
      const lean = range(rng, -0.25, 0.25) * p.scale;
      c.drawLine(p.sx, p.sy, top.sx + lean, top.sy, stroke('#4A5F3E', Math.max(1, 0.025 * p.scale), 0.9));
      // Mirror image of the stem in still water.
      c.drawLine(p.sx, p.sy, top.sx + lean, p.sy + (p.sy - top.sy) * 0.7, stroke('#1F2D25', Math.max(1, 0.025 * p.scale), 0.35, 1));
      if (it.kind === 'leaf') {
        // Emergent lotus leaf seen from the side: a shallow cup with a pale underside.
        const r = range(rng, 0.3, 0.5) * p.scale;
        const tilt = range(rng, 0.2, 0.55);
        const cx = top.sx + lean;
        c.drawOval(Skia.XYWHRect(cx - r, top.sy - r * tilt, r * 2, r * 2 * tilt), fill('#8A9A72', 0.95));
        c.drawOval(Skia.XYWHRect(cx - r * 0.96, top.sy - r * tilt * 1.15, r * 1.92, r * 1.6 * tilt), fill('#4F6A40'));
        c.drawOval(Skia.XYWHRect(cx - r * 0.75, top.sy - r * tilt * 1.05, r * 1.1, r * tilt * 0.9), fill('#6F8A55', 0.55, 1));
        c.drawCircle(cx, top.sy - r * tilt * 0.4, Math.max(0.8, r * 0.06), fill('#2E4025', 0.8));
      } else {
        const r = range(rng, 0.09, 0.14) * p.scale * (it.kind === 'flower' ? 1.4 : 1);
        const cx = top.sx + lean;
        if (it.kind === 'bud') {
          const bud = Skia.PathBuilder.Make();
          bud.moveTo(cx, top.sy - r * 2.2);
          bud.quadTo(cx + r * 1.2, top.sy - r * 0.6, cx, top.sy);
          bud.quadTo(cx - r * 1.2, top.sy - r * 0.6, cx, top.sy - r * 2.2);
          c.drawPath(bud.build(), fill('#D88E98'));
          c.drawPath(bud.build(), stroke('#9E5966', 0.6, 0.6));
        } else {
          for (let k = -3; k <= 3; k++) {
            const petal = Skia.PathBuilder.Make();
            const a = (k / 3) * 0.95;
            const tx = cx + Math.sin(a) * r * 1.6;
            const ty = top.sy - Math.cos(a) * r * 1.6;
            petal.moveTo(cx, top.sy);
            petal.quadTo(cx + Math.sin(a - 0.4) * r * 1.3, top.sy - Math.cos(a - 0.4) * r * 1.3, tx, ty);
            petal.quadTo(cx + Math.sin(a + 0.4) * r * 1.3, top.sy - Math.cos(a + 0.4) * r * 1.3, cx, top.sy);
            c.drawPath(petal.build(), fill(Math.abs(k) === 3 ? '#C77D89' : '#EBC3C6', 0.95));
          }
          c.drawCircle(cx, top.sy - r * 0.5, r * 0.4, fill('#E2C35A'));
        }
      }
    }
  }, 11);
}

/** Wooden landing stage and a grassy bank in the near foreground. */
export function recordForeground(v: View) {
  const { width: w, height: h } = v;
  return record(w, h, (c, rng) => {
    // Posts of the landing stage standing in the water.
    for (const px of [0.36, 0.64]) {
      const post = project(v, (px - 0.5) * 2.4, 3.6);
      c.drawRect(Skia.XYWHRect(post.sx - 5, post.sy - 26, 10, 40), fill('#3B3027'));
      c.drawOval(Skia.XYWHRect(post.sx - 12, post.sy + 10, 24, 5), fill('#0D191A', 0.5, 2));
    }
    // Planks running toward the water in perspective.
    const near = h + 30;
    const far = project(v, 0, 3.5).sy - 18;
    const planks = 7;
    for (let i = 0; i < planks; i++) {
      const t0 = i / planks;
      const t1 = (i + 1) / planks;
      const xNear0 = w * (0.28 + 0.5 * t0);
      const xNear1 = w * (0.28 + 0.5 * t1) - 2;
      const xFar0 = w * (0.42 + 0.2 * t0);
      const xFar1 = w * (0.42 + 0.2 * t1) - 1;
      const plank = Skia.PathBuilder.Make();
      plank.moveTo(xNear0, near);
      plank.lineTo(xFar0, far);
      plank.lineTo(xFar1, far);
      plank.lineTo(xNear1, near);
      plank.close();
      const tone = range(rng, 0, 1);
      c.drawPath(plank.build(), vGradient(far, near, [[mix('#6E5A45', '#8A735A', tone), 0], [mix('#4A3B2E', '#5D4A38', tone), 1]]));
      c.save();
      c.clipPath(plank.build(), 1, true);
      for (let g = 0; g < 8; g++) {
        const gx = range(rng, 0.1, 0.9);
        c.drawLine(xNear0 + (xNear1 - xNear0) * gx, near, xFar0 + (xFar1 - xFar0) * gx, far, stroke('#2E241B', range(rng, 0.5, 1.2), 0.35));
      }
      c.restore();
      c.drawLine(xNear1 + 1, near, xFar1 + 0.5, far, stroke('#1E1712', 2, 0.7));
    }
    c.drawRect(Skia.XYWHRect(w * 0.41, far - 4, w * 0.22, 6), fill('#5A4837'));
    // Bank and grass in the near left corner, slightly out of focus.
    const bank = Skia.PathBuilder.Make();
    bank.moveTo(0, h * 0.72);
    bank.cubicTo(w * 0.12, h * 0.76, w * 0.22, h * 0.86, w * 0.3, h + 10);
    bank.lineTo(0, h + 10);
    bank.close();
    c.drawPath(bank.build(), vGradient(h * 0.72, h, [['#3A4632', 0], ['#1E261C', 1]]));
    c.drawPath(bank.build(), stroke('#56634A', 2, 0.4, 2));
  }, 23);
}

/** Grass blades in the near-left corner; drawn separately so they can sway. */
export function recordGrass(v: View) {
  const { width: w, height: h } = v;
  return record(w, h, (c, rng) => {
    for (let i = 0; i < 70; i++) {
      const bx = range(rng, -10, w * 0.27);
      const by = h * 0.78 + range(rng, 0, h * 0.25) + (bx / w) * h * 0.4;
      const len = range(rng, h * 0.12, h * 0.34);
      const bend = range(rng, -0.4, 0.5) * len;
      const blade = Skia.PathBuilder.Make();
      const wBase = range(rng, 2, 4.5);
      blade.moveTo(bx - wBase, by);
      blade.quadTo(bx + bend * 0.3, by - len * 0.6, bx + bend, by - len);
      blade.quadTo(bx + bend * 0.3 + wBase, by - len * 0.55, bx + wBase, by);
      blade.close();
      const tone = range(rng, 0, 1);
      c.drawPath(blade.build(), fill(mix('#2F3B27', '#7A8256', tone * tone), 0.95, i % 4 === 0 ? 1.5 : 0));
    }
  }, 31);
}
