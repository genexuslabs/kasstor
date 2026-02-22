import { endBatch, startBatch } from "alien-signals";

/**
 * Runs the callback and flushes all signal updates once it completes. Improves performance: computed values and effects that track multiple dependencies run only once when you change several of those dependencies inside the batch, instead of once per changed signal.
 *
 * Behavior:
 * - All signal writes inside `fn` are deferred; dependents (computed, effect) run only after `fn` returns.
 * - Nested batches are supported; the outer batch flushes when its callback completes.
 * - Reading a signal inside the batch sees the updated value.
 *
 * @param fn - Synchronous function that may update multiple signals.
 * @returns The return value of `fn`.
 *
 * @example
 * ```ts
 * const fullName = computed(() => `${firstName()} ${lastName()}`);
 * effect(() => {
 *   console.log("fullName is", fullName());
 * });
 *
 * // Without batch: effect runs after each write
 * firstName("Jane"); // logs "fullName is Jane Doe"
 * lastName("Smith"); // logs "fullName is Jane Smith"
 *
 * // With batch: effect runs once at the end
 * batch(() => {
 *   firstName("Alice");
 *   lastName("Brown");
 * }); // logs "fullName is Alice Brown"
 * ```
 */
export const batch = <T>(fn: () => T) => {
  startBatch();
  try {
    fn();
  } finally {
    endBatch();
  }
};
