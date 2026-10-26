import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SPECIES_BIO } from '../../ecology/species';
import type { FishingRuntime } from '../../fishing/runtime';
import { T } from '../primitives';

/** Development only: why each species can or cannot appear at the current spot. */
export function DebugOverlay({ runtime }: { runtime: FishingRuntime }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, []);
  const s = runtime.session;
  const r = s.report;
  return (
    <View style={styles.box} pointerEvents="none">
      <T style={styles.t}>
        seed {s.seed} · {s.phase} · spot {s.spot?.id ?? '-'} · zone {r?.baitZone ?? '-'} · bait {s.config.bait} @ {s.config.baitDepthM} m
      </T>
      {s.fish && (
        <T style={styles.t}>
          fish {s.fish.individual.speciesId} {s.fish.individual.lengthCm}cm · mode {s.fish.mode.id} · stam {s.fish.stamina.toFixed(2)} · T {s.fight.tension.toFixed(2)}kgf · line {s.fight.lineM.toFixed(1)}m · cover {s.fish.coverTime.toFixed(1)}
        </T>
      )}
      {r?.entries.map((e) => (
        <T key={e.speciesId} style={styles.t}>
          {SPECIES_BIO[e.speciesId].nameVi.padEnd(14)} {e.excluded ? `✕ ${e.excluded}` : `${(e.probability * 100).toFixed(0)}% · ${Object.entries(e.factors!).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(' ')}`}
        </T>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { position: 'absolute', right: 12, top: 64, maxWidth: 560, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 6, gap: 2 },
  t: { fontSize: 10, fontFamily: 'Courier', color: '#BFF5C9', lineHeight: 13 },
});
