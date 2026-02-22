import { setActiveSub } from "alien-signals";

/**
 * Runs the function without tracking any signal reads. Use inside a computed or effect when you need a value without adding a dependency.
 *
 * Behavior:
 * - Any signal/computed read inside `fn` does not register as a dependency of the current effect or computed.
 * - Common use: in an effect or computed that reads several signals, wrap the ones you don't want to track so it only re-runs when the others change. Ensure at least one read remains tracked so the reactive run can be triggered.
 *
 * @param fn - Function that may read signals; those reads are not tracked.
 * @returns The return value of `fn`.
 *
 * @example
 * ```ts
 * // Effect re-runs only when userName or theme change; logLevel is read but not tracked
 *
 * effect(() => {
 *   const name = userName();
 *   const themeValue = theme();
 *   const level = untrack(() => logLevel());
 *   console.log(`[${level}] ${name}, ${themeValue}`);
 * });
 * ```
 */
export const untrack = <T>(fn: () => T) => {
  const sub = setActiveSub(undefined);
  try {
    return fn();
  } finally {
    setActiveSub(sub);
  }
};
