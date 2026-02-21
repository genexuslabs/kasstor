import { effect as alienEffect } from "alien-signals";

/**
 * Runs a watcher/effect: side-effectful code that re-runs whenever its
 * dependencies (signals or computeds read inside it) change.
 *
 * Behavior:
 * - Runs once immediately, then again whenever any tracked signal/computed
 *   read inside the function changes.
 * - Return value is a function that stops the effect (call it to avoid memory
 *   leaks).
 *
 * @param fn - Function that may read signals/computeds; they become
 *   dependencies.
 * @returns A function to stop the effect and remove all subscriptions.
 *
 * @example
 * ```ts
 * const theme = signal("light");
 * effect(() => {
 *   const value = theme();
 *   localStorage.setItem("theme", value);
 *   document.documentElement.setAttribute("data-theme", value);
 * });
 *
 * theme("dark"); // effect runs again
 * ```
 *
 * @example
 * Lit component: trigger a re-render when a signal changes. Start the effect in
 * connectedCallback and call the returned stop function in disconnectedCallback
 * (so the effect is cleaned up when the element is removed and re-created when
 * re-inserted). The effect is not auto-disposed—you must call the stop function.
 * ```ts
 * override connectedCallback(): void {
 *   super.connectedCallback();
 *   this.#stopEffect = effect(() => {
 *     mySignal(); // track as dependency
 *     this.requestUpdate();
 *   });
 * }
 * override disconnectedCallback(): void {
 *   this.#stopEffect?.();
 *   super.disconnectedCallback();
 * }
 * ```
 */
export const effect = alienEffect;
