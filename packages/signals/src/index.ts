// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//                           Core
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export { batch } from "./core/batch/index.js";
export {
  computed,
  effect,
  effectScope,
  endBatch,
  getActiveSub,
  getBatchDepth,
  isComputed,
  isEffect,
  isEffectScope,
  isSignal,
  setActiveSub,
  signal,
  startBatch,
  trigger
} from "./core/index.js";
export { untracked } from "./core/untracked/index.js";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//                        Decorators
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export { SignalProp } from "./decorators/signal-prop/index.js";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//                        Directives
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export {
  watch,
  WatchDirective,
  type WatchDirectiveFunction
} from "./directives/watch/index.js";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//                           Types
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export type {
  KasstorSignal,
  KasstorSignalComputed,
  KasstorSignalState
} from "./typings/types";
