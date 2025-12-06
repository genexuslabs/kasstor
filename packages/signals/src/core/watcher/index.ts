import { effect } from "alien-signals";
import type { KasstorSignal, KasstorSignalComputed } from "../../typings/types";

// TODO: We can implement a better and more performant solution for the Watcher,
// that better matches the TC 39 proposal
export class Watcher {
  /** Callback supplied by user */
  #callback: (pendingComputations: KasstorSignalComputed[]) => void;

  /** Prevent reentrant notify loops */
  #notifying = false;

  /** Pending signals since last drain */
  #pendingDeps = new Set<KasstorSignal>();

  /** All watched signals */
  #watchedDeps = new Map<
    KasstorSignal,
    {
      deps: Set<KasstorSignalComputed>;
      stopEffect: () => void;
      firstEffectRun: boolean;
    }
  >();

  /**
   * @param notify When a (recursive) source of Watcher is written to, call this callback,
   * if it hasn't already been called since the last `watch` call.
   *
   * No signals may be read or written during the notify.
   */
  constructor(notify: (pendingComputations: KasstorSignalComputed[]) => void) {
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

      const pendingComputations = this.getPending();
      this.#pendingDeps.clear(); // Clear pending before callback to allow re-entrancy

      if (pendingComputations.length !== 0) {
        this.#callback(pendingComputations);
      }
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
        this.#watchedDeps.get(dependency)!.deps.add(computed);
      }
      // First time the dependency is added
      else {
        const dependencyInfo = {
          deps: new Set([computed]),
          stopEffect: () => {},
          firstEffectRun: true
        };

        this.#watchedDeps.set(dependency, dependencyInfo);

        // Create an effect that subscribes to the signal by reading it.
        // On change, it pushes to pending and schedules notify.
        const stopEffect = effect(() => {
          try {
            // This read registers this effect as a dependency, because the
            // effect is dispatched when the signal value changes. If we move
            // the if before this line, the effect will not be registered as
            // a consumer of this dependency
            dependency();

            // Skip the first run, as it is only used to register the effect
            // IMPORTANT: DON'T move this check before reading the dependency,
            // as it won't register the effect as a consumer of the signal
            if (dependencyInfo.firstEffectRun === true) {
              dependencyInfo.firstEffectRun = false;
              return;
            }

            // Mark as pending
            this.#pendingDeps.add(dependency);

            this.#scheduleNotify();
          } catch (err) {
            console.error(err);
          }
        });

        dependencyInfo.stopEffect = stopEffect;
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
        const dependencyInfo = this.#watchedDeps.get(dependency)!;

        dependencyInfo.deps.delete(computed);

        // The dependency no longer has computations, so we must remove it
        if (dependencyInfo.deps.size === 0) {
          // Dispose effect to avoid memory leak
          dependencyInfo.stopEffect();

          this.#pendingDeps.delete(dependency);
          this.#watchedDeps.delete(dependency);
        }
      }
    }
  }

  /**
   * Returns the pending signals to be processed in the next callback execution.
   * */
  getPending(): KasstorSignalComputed[] {
    const pendingComputations: KasstorSignalComputed[] = [];

    this.#pendingDeps.forEach(dependency =>
      pendingComputations.push(...this.#watchedDeps.get(dependency)!.deps)
    );

    return pendingComputations;
  }

  /** Dispose all subscriptions */
  dispose(): void {
    // Dispose all effects to avoid memory leaks
    this.#watchedDeps.forEach(dependencyInfo => dependencyInfo.stopEffect());

    this.#watchedDeps.clear();
    this.#pendingDeps.clear();
  }
}

