import { effectScope as alienEffectScope } from "alien-signals";

/**
 * Groups multiple reactive effects and computeds into a single scope and
 * returns a stop function. Calling it disposes all effects created inside,
 * so you can control them as one unit. Useful for modular, reusable logic and
 * to avoid memory leaks in long-lived applications.
 *
 * Behavior:
 * - The callback is run immediately. Effects/computeds created inside it are
 *   tied to this scope.
 * - The returned function stops the scope and disposes all of them. Call it
 *   when a component or feature unmounts, or when the scoped logic is no
 *   longer needed.
 * - Nested scopes are supported: stopping a parent stops its children.
 *
 * Use cases:
 * - **Avoid memory leaks:** Stopping the scope ensures resources are cleaned
 *   up.
 * - **Scoped state management:** Group reactive logic into reusable modules
 *   that can be cleanly started or stopped.
 *
 * @param fn - Callback that can create effects and computeds; they are tied
 *   to this scope.
 * @returns A function to stop the scope and dispose all effects created inside
 *   it.
 *
 * @example
 * ```ts
 * const count = signal(1);
 *
 * const stopScope = effectScope(() => {
 *   effect(() => {
 *     console.log(`Count in scope: ${count()}`);
 *   });
 * }); // Console: Count in scope: 1
 *
 * count(2); // Console: Count in scope: 2
 *
 * stopScope();
 * count(3); // No console output; effect is disposed
 * ```
 */
export const effectScope = alienEffectScope;
