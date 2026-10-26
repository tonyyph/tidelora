import { Skia } from '@shopify/react-native-skia';

/**
 * Water surface. Samples the backdrop mirrored about the horizon, then:
 * - displaces the reflection with layered ripples scaled by perspective,
 * - blends towards tea-dark water near the camera (fresnel),
 * - adds glitter along the sun's path and up to four live ripple rings
 *   (x, y in px, age in s, strength 0..1).
 */
const SKSL = `
uniform shader sky;
uniform float2 res;
uniform float horizon;
uniform float time;
uniform float sunX;
uniform float wind;
uniform float detail;
uniform float4 r0;
uniform float4 r1;
uniform float4 r2;
uniform float4 r3;
uniform float3 deep;
uniform float3 shallow;

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
  // Perspective: world distance grows as we approach the horizon.
  float z = 1.0 / (d + 0.035);
  float persp = d + 0.035;
  float2 wp = float2((p.x - res.x * 0.5) * z / res.x * 6.0, z * 1.2);
  float t = time * (0.35 + wind * 0.25);
  float n = noise(wp * float2(1.6, 0.9) + float2(t * 0.3, t)) * 0.6
          + noise(wp * float2(3.7, 2.1) - float2(t * 0.5, t * 1.3)) * 0.3 * detail
          + noise(wp * float2(8.0, 5.0) + float2(t, -t * 0.7)) * 0.1 * detail;
  float wave = (n - 0.5);
  float rings = ring(p, r0, persp) + ring(p, r1, persp) + ring(p, r2, persp) + ring(p, r3, persp);
  float2 offset = float2(wave * 5.0 * persp + rings * 3.0, wave * (2.0 + 26.0 * persp) + rings * 5.0);
  float2 m = float2(p.x + offset.x, 2.0 * horizon - p.y + offset.y * 0.6);
  m.y = clamp(m.y, 0.0, horizon - 1.0);
  half4 refl = sky.eval(m);
  // Fresnel: grazing angles reflect, steep angles show the water body.
  float fres = mix(0.92, 0.32, pow(d, 0.7));
  half3 body = mix(half3(shallow), half3(deep), half(d));
  half3 col = mix(body, refl.rgb * 0.9, half(fres));
  // Long horizontal sheen bands near the horizon.
  float band = smoothstep(0.55, 0.95, noise(float2(p.x * 0.004, z * 3.0 + t * 0.2))) * (1.0 - d) * 0.08;
  col += half3(band);
  // Glitter on the sun's path.
  float path = exp(-pow((p.x - sunX) / (30.0 + 90.0 * d), 2.0));
  float far = (1.0 - d) * (1.0 - d);
  float glint = smoothstep(0.86, 0.98, noise(wp * float2(9.0, 4.0) + float2(0.0, t * 2.0))) * path * far;
  col += half3(1.0, 0.86, 0.66) * half(glint * 0.45 + path * 0.07 * far);
  // Ring highlights catch the sky light.
  col += half3(rings * 0.10);
  return half4(col, 1.0);
}
`;

export const WATER_EFFECT = (() => {
  const effect = Skia.RuntimeEffect.Make(SKSL);
  if (!effect) throw new Error('Water shader failed to compile');
  return effect;
})();
