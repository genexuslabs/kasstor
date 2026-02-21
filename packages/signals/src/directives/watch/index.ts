import type { LitElement, Part } from "lit";
import { AsyncDirective, directive } from "lit/async-directive.js";

import { effect } from "alien-signals";
import { untrack } from "../../core/untrack/index.js";
import { Watcher } from "../../core/watcher/index.js";
import type { KasstorSignal } from "../../typings/types.js";
import type { WatchDirectiveFunction } from "./types.js";

export type { WatchDirectiveFunction } from "./types.js";

export const signalWatcher = new Watcher(pendingComputations => {
  for (let index = 0; index < pendingComputations.length; index++) {
    const setValueComputation = pendingComputations[index];
    setValueComputation();
  }
});

type WatchedSignalInfo = {
  computations: Set<(value: unknown) => void>;
  stopEffect: () => void;
  firstEffectCall: boolean;
};

const watchedSignals = new WeakMap<KasstorSignal, WatchedSignalInfo>();

const dummyStopEffect = () => {};

let queuedMicroTask = false;
const signalsComputationsForNextMicroTask = new Set<KasstorSignal>();

export class WatchDirective<T> extends AsyncDirective {
  #host?: LitElement | undefined;

  #setValueComputation?: (value: unknown) => void;

  #signalRef?: KasstorSignal<T>;

  #watching?: boolean;

  #watchSignal = () => {
    if (this.#watching === true) {
      return;
    }
    this.#watching = true;

    const watchedSignal = this.#signalRef!;
    const signalComputations = watchedSignals.get(watchedSignal);

    this.#setValueComputation = (value: unknown) => {
      // Only update the template imperatively if there is not a pending update.
      // Otherwise, the host's render method will update the value
      if (this.#host === undefined || this.#host.isUpdatePending === false) {
        // Side effect when this computed signals is read, which sets the value
        // in the template
        this.setValue(value);

        // TODO: What happens if the host canceled the update?
        // Should we re-schedule the signal update?
      }
    };

    if (signalComputations === undefined) {
      const watchedSignalInfo: WatchedSignalInfo = {
        computations: new Set([this.#setValueComputation]),
        firstEffectCall: true,
        stopEffect: dummyStopEffect
      };

      effect(() => {
        watchedSignal(); // Read the signal

        if (watchedSignalInfo.firstEffectCall === true) {
          watchedSignalInfo.firstEffectCall = false;
          return;
        }
        signalsComputationsForNextMicroTask.add(watchedSignal);

        if (queuedMicroTask === true) {
          return;
        }
        queuedMicroTask = true;

        // This should not be called if the effect is stopped when it is queued. Can this happen????
        queueMicrotask(() => {
          queuedMicroTask = false;

          const newValue = watchedSignal();

          signalsComputationsForNextMicroTask.forEach(watchedSignal =>
            watchedSignals
              .get(watchedSignal)
              ?.computations.forEach(computation => computation(newValue))
          );

          signalsComputationsForNextMicroTask.clear();
        });
      });

      watchedSignals.set(watchedSignal, watchedSignalInfo);
    } else {
      signalComputations.computations.add(this.#setValueComputation);
    }
  };

  #unwatchSignal = () => {
    const { computations, stopEffect } = watchedSignals.get(this.#signalRef!)!;
    computations.delete(this.#setValueComputation!);

    if (computations.size === 0) {
      stopEffect();
    }

    this.#watching = false;
  };

  protected override disconnected(): void {
    this.#unwatchSignal();
  }

  protected override reconnected(): void {
    this.#watchSignal();

    // The host was reconnected, so we must update the value in the template
    // in case it changed while disconnected. For example, setting a signal
    // while the host was disconnected
    untrack(() => this.#setValueComputation!(this.#signalRef?.()));
  }

  // Only called on the client when the template changes
  override update(part: Part, [signal]: [signal: KasstorSignal<T>]) {
    this.#host ??= part.options?.host as LitElement;

    // The current bounded signal changed, unwatch the old one and watch the
    // changes for the new one
    if (signal !== this.#signalRef && this.#signalRef !== undefined) {
      this.#unwatchSignal();
    }

    this.#signalRef = signal;
    this.#watchSignal();

    // Render the value when called in a normal update lifecycle
    return this.render(signal);
  }

  // This ensures that the watch directive properly works with SSR
  render(signal: KasstorSignal<T>): T {
    return untrack(() => signal());
  }
}

/**
 * Subscribes to a signal in a Lit template and updates only this part when the signal changes.
 *
 * **Important:** Without `watch`, Lit templates do not update when a signal changes. Modifying a signal does not trigger a Lit component update (Lit does not call `requestUpdate()` when a signal changes). This design allows pin-point updates: only the parts wrapped in `watch` re-render when their signal changes, improving performance. You must use `watch(signal)` wherever you render a signal in the template so that part subscribes and re-renders when the value changes.
 *
 * Behavior:
 * - Renders the current signal value and subscribes so future changes update this part.
 * - If the host component has a pending update when the signal changes, the part updates in that cycle; otherwise updates in a microtask.
 * - Works with SSR: renders the value on the server without subscribing.
 *
 * Restrictions:
 * - Pass a signal (or computed) getter function. Do not pass a plain value or non-reactive source.
 *
 * @param signal - A signal or computed (getter function). Called to read the value and to establish the subscription.
 * @returns The current value for rendering.
 *
 * @example
 * ```ts
 * import { signal } from "@genexus/kasstor-signals/core.js";
 * import { watch } from "@genexus/kasstor-signals/directives/watch.js";
 * import { html } from "lit";
 *
 * const count = signal(0);
 *
 * html`<p>Count: ${watch(count)}</p>`;
 * ```
 */
export const watch = directive(WatchDirective) as WatchDirectiveFunction;
