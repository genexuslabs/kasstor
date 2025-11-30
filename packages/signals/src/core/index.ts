import {
  computed as alienComputed,
  effect as alienEffect,
  effectScope as alienEffectScope,
  signal as alienSignal,
  trigger as alienTrigger
} from "alien-signals";

export {
  endBatch,
  getActiveSub,
  getBatchDepth,
  isComputed,
  isEffect,
  isEffectScope,
  isSignal,
  setActiveSub,
  startBatch
} from "alien-signals";

/**
 *
 */
export const computed = alienComputed;

/**
 * The `effect` primitive creates a reactive computation. It automatically
 * tracks reactive values, such as signals (and computed), accessed within the
 * provided function. This function will re-run whenever any of its
 * dependencies change.
 *
 * Initial run:
 *   - Effects run after just after they are instantiated.
 *
 * Subsequent Runs:
 *   - Complete...
 *
 * Important:
 *   - To avoid memory leaks...
 *
 * @returns A callback to stop the effect and thus avoid memory leaks.
 */
export const effect = alienEffect;

/**
 *
 */
export const effectScope = alienEffectScope;

/**
 *
 */
export const signal = alienSignal;

/**
 *
 */
export const trigger = alienTrigger;
