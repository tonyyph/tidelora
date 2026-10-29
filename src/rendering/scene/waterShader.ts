import { Skia } from '@shopify/react-native-skia';

/**
 * Live water over the painted lake. The painting already has its reflections, so
 * this re-samples it (two paintings crossfaded by `blend`, for the time of day) with a small perspective-scaled shimmer (strongest mid-water,
 * fading out before the foreground lotus and dock so they stay put), up to four
 * live ripple rings (x, y in px, age in s, strength 0..1) and glitter on the light's path
 * (sun or moon, at `sunX`, scaled by `glint` and tinted `glintCol`).
 */
const SKSL = `
uniform shader painting;
uniform shader painting2;
uniform float blend;
uniform float glint;
uniform float3 glintCol;
uniform float2 res;
uniform float horizon;
uniform float time;
uniform float sunX;
uniform float detail;
uniform float4 r0;
uniform float4 r1;
uniform float4 r2;
uniform float4 r3;

float hash(float2 p) { return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453); }
float noise(float2 p) {
  float2 i = floor(p); float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + float2(1, 0)), u.x), mix(hash(i + float2(0, 1)), hash(i + float2(1, 1)), u.x), u.y);
}

float ring(float2 p, float4 r, float persp) {
  if (r.w <= 0.0) return 0.0;
  float2 d = p - r.xy;
  d.y /= max(persp, 0.12);
  float dist = length(d);
  float front = r.z * 70.0;
  float env = exp(-r.z * 1.6) * smoothstep(front + 26.0, front, dist) * smoothstep(0.0, 8.0, dist);
  return sin((dist - front) * 0.45) * env * r.w;
}

half4 main(float2 p) {
  float span = res.y - horizon;
  float d = clamp((p.y - horizon) / span, 0.0, 1.0);
  float persp = d + 0.035;
  float z = 1.0 / persp;
  float2 wp = float2((p.x - res.x * 0.5) * z / res.x * 6.0, z * 1.2);
  float t = time * 0.45;
  float n = noise(wp * float2(1.6, 0.9) + float2(t * 0.3, t)) * 0.65
          + noise(wp * float2(3.7, 2.1) - float2(t * 0.5, t * 1.3)) * 0.35 * detail;
  float wave = n - 0.5;
  // Shimmer lives in open water: none at the shoreline seam, none on the near lotus and dock.
  float amp = smoothstep(0.0, 0.05, d) * (1.0 - smoothstep(0.42, 0.7, d));
  float rings = ring(p, r0, persp) + ring(p, r1, persp) + ring(p, r2, persp) + ring(p, r3, persp);
  float2 offset = float2(wave * 2.2 * amp + rings * 3.0, wave * (1.2 + 7.0 * persp) * amp + rings * 5.0);
  half3 col = mix(painting.eval(p + offset).rgb, painting2.eval(p + offset).rgb, half(blend));
  // Glitter on the light's path, mostly far out.
  float path = exp(-pow((p.x - sunX) / (24.0 + 80.0 * d), 2.0));
  float far = (1.0 - d) * (1.0 - d);
  float sparkle = smoothstep(0.88, 0.98, noise(wp * float2(9.0, 4.0) + float2(0.0, t * 2.0))) * path * far * detail;
  col += half3(glintCol) * half(sparkle * 0.35 * glint);
  // Ring crests catch the sky.
  col += half3(rings * 0.09);
  return half4(col, 1.0);
}
`;

export const WATER_EFFECT = (() => {
  const effect = Skia.RuntimeEffect.Make(SKSL);
  if (!effect) throw new Error('Water shader failed to compile');
  return effect;
})();
