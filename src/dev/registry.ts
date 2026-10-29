import type { FishingRuntime } from '../fishing/runtime';

/** Development only: lets the /dev deep link drive the live fishing session. */
export const devRegistry: { runtime: FishingRuntime | null; openTackle?: () => void; pause?: () => void } = { runtime: null };
