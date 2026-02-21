import { computed as alienComputed } from "alien-signals";

/**
 * Creates a memoized derived value. Read-only. The computation runs only when
 * someone reads the value; if nobody reads it, the computation is not executed.
 *
 * Behavior:
 * - **Lazy / on read:** The getter function runs only when the computed is read
 *   (e.g. `computed()`). If no effect or code reads it, the computation does
 *   not run. When dependencies change, the computed is marked for
 *   recomputation but only runs again on the next read.
 * - Only signals (and computeds) read during the run are tracked as
 *   dependencies.
 * - Use {@link untrack} inside the function to read a value without adding a
 *   dependency.
 *
 * @param fn - Function that returns the derived value. Must only read reactive
 *   values (signals, computeds) to track them.
 * @returns A getter function: call with no arguments to read the current
 *   (memoized) value.
 *
 * @example
 * ```ts
 * const count = signal(1);
 * const doubleCount = computed(() => count() * 2);
 *
 * effect(() => {
 *   console.log(`Count is: ${count()}`);
 * }); // Console: Count is: 1
 *
 * console.log(doubleCount()); // 2
 *
 * count(2); // Console: Count is: 2
 * console.log(doubleCount()); // 4
 * ```
 */
export const computed = alienComputed;
