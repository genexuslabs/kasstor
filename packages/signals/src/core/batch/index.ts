import { endBatch, startBatch } from "alien-signals";

/**
 * Combine multiple value updates into one "commit" at the end of the provided
 * callback.
 *
 * Batches can be nested and changes are only flushed once the outermost batch
 * callback completes. Accessing a signal that has been modified within a batch
 * will reflect its updated value.
 */
export const batch = <T>(fn: () => T) => {
  startBatch();
  try {
    fn();
  } finally {
    endBatch();
  }
};
