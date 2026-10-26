import { BlurMask, Canvas, Circle, Group, Oval, Path, RadialGradient, Skia, vec } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import type { Recipe } from '../../cooking/recipes';

/**
 * Procedural dish placeholders (see docs/ASSET_MANIFEST.md): clay pot, soup bowl,
 * straw-grilled fish on banana leaf. Drawn in a 200×140 box and scaled.
 */
export function DishArt({ kind, width, steam = 0 }: { kind: Recipe['dish']; width: number; steam?: number }) {
  const k = width / 200;
  const paths = useMemo(() => {
    const p = (d: string) => Skia.Path.MakeFromSVGString(d)!;
    return {
      leaf: p('M18,92 C40,60 160,52 186,84 C170,112 50,124 18,92 Z'),
      leafVein: p('M22,92 C70,80 130,76 184,84'),
      fishBody: p('M40,86 C52,70 120,66 150,76 C156,78 160,80 162,82 C158,86 150,90 140,92 C110,98 60,100 40,86 Z'),
      fishTail: p('M158,80 C170,70 178,70 182,72 C178,80 178,86 182,94 C176,96 168,92 158,86 Z'),
      char: p('M60,78 L68,84 M80,74 L88,82 M100,72 L108,80 M120,72 L128,80 M140,74 L146,80'),
      potBody: p('M38,62 C36,100 60,124 100,124 C140,124 164,100 162,62 Z'),
      bowlBody: p('M26,66 C30,106 66,124 100,124 C134,124 170,106 174,66 Z'),
    };
  }, []);

  return (
    <Canvas style={{ width, height: 140 * k }}>
      <Group transform={[{ scale: k }]}>
        <Oval x={20} y={108} width={160} height={22} color="#000" opacity={0.35}>
          <BlurMask blur={8} style="normal" />
        </Oval>
        {kind === 'grilled' && (
          <Group>
            <Path path={paths.leaf} color="#3E6B3A" />
            <Path path={paths.leafVein} style="stroke" strokeWidth={1.4} color="#6D9A5C" opacity={0.7} />
            <Path path={paths.fishTail} color="#2A2016" />
            <Path path={paths.fishBody}>
              <RadialGradient c={vec(96, 80)} r={70} colors={['#B9783E', '#6E4223', '#2B1D12']} />
            </Path>
            <Path path={paths.char} style="stroke" strokeWidth={3} strokeCap="round" color="#1A120B" opacity={0.7} />
            <Circle cx={52} cy={80} r={2.4} color="#E9DFC6" />
            {[0, 1, 2, 3].map((i) => (
              <Oval key={i} x={120 + i * 10} y={92 + (i % 2) * 6} width={18} height={8} color={i % 2 ? '#7FB069' : '#5E9150'} />
            ))}
          </Group>
        )}
        {kind === 'clay-pot' && (
          <Group>
            <Path path={paths.potBody}>
              <RadialGradient c={vec(80, 80)} r={90} colors={['#9A5636', '#6A3620', '#3A1C10']} />
            </Path>
            <Oval x={36} y={52} width={128} height={22} color="#4A2414" />
            <Oval x={42} y={55} width={116} height={16}>
              <RadialGradient c={vec(90, 60)} r={60} colors={['#B5652B', '#7A3A14', '#4D220C']} />
            </Oval>
            {[0, 1, 2].map((i) => (
              <Oval key={i} x={60 + i * 26} y={57 + (i % 2) * 2} width={24} height={9} color="#5A3018" />
            ))}
            <Circle cx={74} cy={60} r={1.6} color="#E7C9A0" opacity={0.8} />
            <Circle cx={118} cy={62} r={1.2} color="#2B1A0E" />
            <Circle cx={96} cy={58} r={1.2} color="#2B1A0E" />
          </Group>
        )}
        {kind === 'soup-bowl' && (
          <Group>
            <Path path={paths.bowlBody}>
              <RadialGradient c={vec(80, 80)} r={100} colors={['#EFE8DA', '#C9C0AE', '#8E8676']} />
            </Path>
            <Oval x={24} y={56} width={152} height={24} color="#B8AE98" />
            <Oval x={30} y={59} width={140} height={18}>
              <RadialGradient c={vec(100, 66)} r={70} colors={['#E3A04A', '#C66E2A', '#8C4419']} />
            </Oval>
            <Oval x={66} y={62} width={20} height={8} color="#D64B32" />
            <Oval x={112} y={63} width={18} height={7} color="#D64B32" />
            {[0, 1, 2, 3, 4].map((i) => (
              <Oval key={i} x={50 + i * 20} y={60 + (i % 2) * 4} width={10} height={5} color="#5E9A4C" />
            ))}
            <Oval x={88} y={64} width={26} height={8} color="#F2E8D4" />
          </Group>
        )}
        {steam > 0 &&
          [0, 1, 2].map((i) => (
            <Oval key={`s${i}`} x={70 + i * 24} y={10 + i * 6} width={16} height={46} color="#FFFFFF" opacity={0.08 * steam}>
              <BlurMask blur={8} style="normal" />
            </Oval>
          ))}
      </Group>
    </Canvas>
  );
}
