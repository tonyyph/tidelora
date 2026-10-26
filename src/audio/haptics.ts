import * as Haptics from 'expo-haptics';

/**
 * Haptic vocabulary. Each cue is a single short pulse, throttled per kind, so a
 * fight never turns into continuous vibration.
 */
let enabled = true;
const last: Record<string, number> = {};

export function setHapticsEnabled(on: boolean) {
  enabled = on;
}

function gate(kind: string, minGapMs: number) {
  const now = Date.now();
  if (!enabled || (last[kind] && now - last[kind] < minGapMs)) return false;
  last[kind] = now;
  return true;
}

export const haptic = {
  /** A fish touching the bait. */
  nibble: () => gate('nibble', 120) && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  /** The real take. */
  bite: () => gate('bite', 300) && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  hooked: () => gate('hooked', 300) && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}),
  /** Danger pulse; the caller already throttles it to a rhythm. */
  tension: () => gate('tension', 380) && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(() => {}),
  landed: () => gate('landed', 500) && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  fail: () => gate('fail', 500) && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
  tap: () => gate('tap', 60) && Haptics.selectionAsync().catch(() => {}),
};
