export { signal } from "./signal/index.js";
export { computed } from "./computed/index.js";
export { effect } from "./effect/index.js";
export { effectScope } from "./effect-scope/index.js";
export { trigger } from "./trigger/index.js";
export { batch } from "./batch/index.js";
export { untrack } from "./untrack/index.js";

import {
  endBatch as alienEndBatch,
  getActiveSub as alienGetActiveSub,
  getBatchDepth as alienGetBatchDepth,
  isComputed as alienIsComputed,
  isEffect as alienIsEffect,
  isEffectScope as alienIsEffectScope,
  isSignal as alienIsSignal,
  setActiveSub as alienSetActiveSub,
  startBatch as alienStartBatch
} from "alien-signals";

/**
 * Starts a batch. Updates to signals between {@link startBatch} and
 * {@link endBatch} are flushed when the batch ends. Prefer using {@link batch}
 * instead of calling start/end manually.
 */
export const startBatch = alienStartBatch;

/**
 * Ends the current batch and flushes pending updates. Pair with
 * {@link startBatch}; prefer {@link batch}.
 */
export const endBatch = alienEndBatch;

/**
 * Returns the current batch depth (number of nested batches). Useful for
 * debugging or conditional batching.
 */
export const getBatchDepth = alienGetBatchDepth;

/**
 * Returns the currently active subscriber (effect or computed) during a
 * reactive read. Used internally and for advanced use cases.
 */
export const getActiveSub = alienGetActiveSub;

/**
 * Sets the active subscriber. Used internally by {@link untrack} and similar
 * utilities.
 */
export const setActiveSub = alienSetActiveSub;

/**
 * Type guard: returns true if the value is a signal (getter/setter function
 * from {@link signal}).
 */
export const isSignal = alienIsSignal;

/**
 * Type guard: returns true if the value is a computed (getter from
 * {@link computed}).
 */
export const isComputed = alienIsComputed;

/**
 * Type guard: returns true if the value is an effect (returned from
 * {@link effect}).
 */
export const isEffect = alienIsEffect;

/**
 * Type guard: returns true if the value is an effect scope (returned from
 * {@link effectScope}).
 */
export const isEffectScope = alienIsEffectScope;
