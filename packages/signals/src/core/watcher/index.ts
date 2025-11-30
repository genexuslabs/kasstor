import { effect } from "alien-signals";
import type { KasstorSignal, KasstorSignalComputed } from "../../typings/types";

// TODO: We can implement a better and more performant solution for the Watcher,
// that better matches the TC 39 proposal
export class Watcher {
  /** All watched signals */
  #watchedDeps = new Map<KasstorSignal, Set<KasstorSignalComputed>>();

  /** Per-signal effect disposer */
  #disposers = new Map<KasstorSignal, () => void>();

  /** Callback supplied by user */
  #callback: () => void;

  /** Pending signals since last drain */
  #pendingDeps = new Set<KasstorSignalComputed>();

  /** Prevent reentrant notify loops */
  #notifying = false;

  /**
   * @param notify When a (recursive) source of Watcher is written to, call this callback,
   * if it hasn't already been called since the last `watch` call.
   *
   * No signals may be read or written during the notify.
   */
  constructor(notify: (this: Watcher) => void) {
    this.#callback = notify;
  }

  // Avoid recursive infinite loops
  #scheduleNotify(): void {
    if (this.#notifying) {
      return;
    }
    this.#notifying = true;

    queueMicrotask(() => {
      this.#notifying = false;
      this.#callback();
    });
  }

  /**
   * Watch one or more signals.
   */
  watch(
    ...signals: { computed: KasstorSignalComputed; dependency: KasstorSignal }[]
  ): void {
    for (let index = 0; index < signals.length; index++) {
      const { dependency, computed } = signals[index];

      // There are existing computations for this dependency, so we only need
      // to add the current computation, because the dependency already has an
      // effect watching changes for it
      if (this.#watchedDeps.has(dependency)) {
        this.#watchedDeps.get(dependency)!.add(computed);
      }
      // First time the dependency is added
      else {
        this.#watchedDeps.set(dependency, new Set([computed]));

        // Create an effect that subscribes to the signal by reading it.
        // On change, it pushes to pending and schedules notify.
        const stopEffect = effect(() => {
          try {
            // This read registers this effect as a dependency, because the
            // effect is dispatched when the signal value changes
            dependency();

            // Mark as pending
            this.#pendingDeps.add(dependency);

            this.#scheduleNotify();
          } catch (err) {
            console.error(err);
          }
        });

        this.#disposers.set(dependency, stopEffect);
      }
    }
  }

  /**
   * Unwatch one or more signals.
   */
  unwatch(
    ...signals: { computed: KasstorSignalComputed; dependency: KasstorSignal }[]
  ): void {
    for (let index = 0; index < signals.length; index++) {
      const { dependency, computed } = signals[index];

      if (this.#watchedDeps.has(dependency)) {
        const computations = this.#watchedDeps.get(dependency)!;

        computations.delete(computed);

        // The dependency no longer has computations, so we must remove it
        if (computations.size === 0) {
          // Dispose effect to avoid memory leak
          this.#disposers.get(dependency)!();

          this.#pendingDeps.delete(dependency);
          this.#watchedDeps.delete(dependency);
        }

        // TODO: Should we cancel the scheduled notify if there are no more pendings?
      }
    }
  }

  /** Returns and clears pending signals */
  getPending(): KasstorSignalComputed[] {
    const pendingComputations: KasstorSignalComputed[] = [];

    this.#pendingDeps.forEach(dependency =>
      pendingComputations.push(...this.#watchedDeps.get(dependency)!)
    );

    this.#pendingDeps.clear();
    return pendingComputations;
  }

  /** Dispose all subscriptions */
  dispose(): void {
    // Dispose all effects to avoid memory leaks
    this.#disposers.forEach(stop => stop());

    this.#disposers.clear();
    this.#watchedDeps.clear();
    this.#pendingDeps.clear();

    // TODO: Should we cancel the scheduled notify?
  }
}
