import { trigger as alienTrigger } from "alien-signals";

/**
 * Manually notifies a signal's dependents without changing its value. Use when
 * you mutate a value in place (e.g. push into an array stored in the signal);
 * the setter is never called, so dependents would not run otherwise.
 *
 * Utility:
 * - After in-place mutation, call `trigger(signal)` so computed values and
 *   effects that depend on that signal recompute.
 * - To notify multiple signals at once, pass a function that reads them:
 *   `trigger(() => { src1(); src2(); })`.
 *
 * @param target - The signal (getter function) to trigger, or a function that
 *   reads one or more signals.
 *
 * @example
 * ```ts
 * const arr = signal<number[]>([]);
 * const length = computed(() => arr().length);
 *
 * console.log(length()); // 0
 *
 * arr().push(1);
 * console.log(length()); // Still 0
 *
 * trigger(arr);
 * console.log(length()); // 1
 * ```
 *
 * @example
 * ```ts
 * const src1 = signal<string[]>([]);
 * const src2 = signal<string[]>([]);
 * const total = computed(() => src1().length + src2().length);
 *
 * src1().push("Hello");
 * src2().push("World");
 * console.log(total()); // 0
 *
 * trigger(() => {
 *   src1();
 *   src2();
 * });
 * console.log(total()); // 2
 * ```
 */
export const trigger = alienTrigger;

