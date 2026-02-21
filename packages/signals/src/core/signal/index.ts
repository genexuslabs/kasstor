import { signal as alienSignal } from "alien-signals";

/**
 * Creates a reactive value. The returned function is the signal: call with no
 * arguments to read, call with one argument to set.
 *
 * Behavior:
 * - Reading the signal (e.g. inside `computed` or `effect`) tracks it as a
 *   dependency.
 * - Setting the value notifies dependents. Updates can be batched with
 *   {@link batch}.
 *
 * @param initialValue - Initial value of the signal.
 * @returns A getter/setter function: `signal()` returns the current value;
 *   `signal(newValue)` sets the value (returns void).
 *
 * @example
 * ```ts
 * const count = signal(0);
 *
 * count(); // 0
 * count(5); // set to 5
 * count(); // 5
 * ```
 */
export const signal = alienSignal;
