import { computed } from "alien-signals";
import type { LitElement, Part } from "lit";
import { AsyncDirective, directive } from "lit/async-directive.js";

import { untracked } from "../../core/untrack/index.js";
import { Watcher } from "../../core/watcher/index.js";
import type {
  KasstorSignal,
  KasstorSignalComputed
} from "../../typings/types.js";
import type { WatchDirectiveFunction } from "./types.js";

export type { WatchDirectiveFunction } from "./types.js";

const signalWatcher = new Watcher(() => {
  const computations = signalWatcher.getPending();

  for (let index = 0; index < computations.length; index++) {
    const setValueComputation = computations[index];
    setValueComputation();
  }
});

export class WatchDirective<T> extends AsyncDirective {
  #host?: LitElement | undefined;

  #setValueComputation?: KasstorSignalComputed<T | undefined> | undefined;

  #signalRef?: KasstorSignal<T>;

  #watching?: boolean;

  #watchSignal = () => {
    if (this.#watching === true) {
      return;
    }
    this.#watching = true;

    // We use a computed value to avoid setting the value in the following scenario:
    //   - signalRef has value = 1
    //   - signalRef(2) // now has the value = 2
    //   - signalRef(1) // now has the value = 1
    //
    // After the microtask has ended, the computed value didn't change, even
    // when the signal's value was changed
    this.#setValueComputation = computed(() => {
      const value = this.#signalRef!();

      // Only update the template imperatively if there is not a pending update.
      // Otherwise, the host's render method will update the value
      if (this.#host === undefined || this.#host.isUpdatePending === false) {
        // Side effect when this computed signals is read, which sets the value
        // in the template
        this.setValue(value);
      }

      return value;
    });

    // Observe the changes in the signal
    signalWatcher.watch({
      dependency: this.#signalRef!,
      computed: this.#setValueComputation!
    });
  };

  #unwatchSignal = () => {
    signalWatcher.unwatch({
      dependency: this.#signalRef!,
      computed: this.#setValueComputation!
    });

    this.#watching = false;
  };

  protected override disconnected(): void {
    this.#unwatchSignal();
  }

  protected override reconnected(): void {
    this.#watchSignal();
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
    return untracked(() => signal());
  }
}

/**
 * Renders a signal and subscribes to it, updating the part when the signal
 * changes.
 */
export const watch = directive(WatchDirective) as WatchDirectiveFunction;
