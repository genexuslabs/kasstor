import { computed, signal } from "alien-signals";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { Watcher } from "../index.js";

let renderCount = 0;

const count = signal(0);
const doubleCount = computed(() => count() * 2);
const tripleCount = computed(() => count() * 3);
const quadrupleCount = computed(() => doubleCount() * 2);

const callbackExecutionEnd = () =>
  new Promise<void>(resolve => queueMicrotask(resolve));

describe("[core]", () => {
  describe("[Watcher]", () => {
    beforeEach(() => {
      count(0);
    });

    test("should not execute the callback when it doesn't track any signal changes", async () => {
      const watcherCallback = vi.fn();
      new Watcher(watcherCallback);

      // Dummy signal set
      count(1);

      await callbackExecutionEnd();
      expect(watcherCallback).toHaveBeenCalledTimes(0);
    });

    test("should not execute the callback when adding a new signal", async () => {
      const watcherCallback = vi.fn();
      const signalWatcher = new Watcher(watcherCallback);

      signalWatcher.watch({ computed: doubleCount, dependency: count });

      // Only read the signal, but do not change its value
      count();

      await callbackExecutionEnd();
      expect(watcherCallback).toHaveBeenCalledTimes(0);
    });

    test("should execute the callback when a dependency changes", async () => {
      const watcherCallback = vi.fn();
      const signalWatcher = new Watcher(watcherCallback);

      signalWatcher.watch({ computed: doubleCount, dependency: count });

      // Update the signal value
      count(1);
      await callbackExecutionEnd();
      expect(watcherCallback).toHaveBeenCalledTimes(1);

      // The signal value didn't change, so the callback shouldn't be called again
      count(1);
      await callbackExecutionEnd();
      expect(watcherCallback).toHaveBeenCalledTimes(1);

      count(2);
      await callbackExecutionEnd();
      expect(watcherCallback).toHaveBeenCalledTimes(2);
    });

    test("getPending should contain the pending computations to be read", async () => {
      const watcherCallback = vi.fn();
      const signalWatcher = new Watcher(watcherCallback);

      signalWatcher.watch({ computed: doubleCount, dependency: count });
      signalWatcher.watch({
        computed: quadrupleCount,
        dependency: doubleCount
      });

      expect(signalWatcher.getPending().length).toBe(0);

      // Update the signal value
      count(1);

      expect(signalWatcher.getPending()).toEqual([doubleCount, quadrupleCount]);

      // Callbacks should work normally besides getPending was used
      await callbackExecutionEnd();

      // When the callback is executed, the pending list is cleared
      expect(signalWatcher.getPending().length).toBe(0);

      expect(watcherCallback).toHaveBeenCalledTimes(1);

      // The signal value didn't change, so the callback shouldn't be called again
      count(1);
      await callbackExecutionEnd();
      expect(watcherCallback).toHaveBeenCalledTimes(1);
      expect(signalWatcher.getPending().length).toBe(0); // Since the signal value didn't change, the pending list should be empty

      count(2);
      expect(signalWatcher.getPending()).toEqual([doubleCount, quadrupleCount]);

      await callbackExecutionEnd();
      expect(watcherCallback).toHaveBeenCalledTimes(2);
    });

    test("unwatch should remove the watched computation and dependency if it no longer was computations", async () => {
      const watcherCallback = vi.fn();
      const signalWatcher = new Watcher(watcherCallback);

      signalWatcher.watch({ computed: doubleCount, dependency: count });
      signalWatcher.watch({
        computed: tripleCount,
        dependency: count
      });

      expect(signalWatcher.getPending().length).toBe(0);

      // Update the signal value
      count(1);

      expect(signalWatcher.getPending()).toEqual([doubleCount, tripleCount]);

      // Callbacks should work normally besides getPending was used
      await callbackExecutionEnd();
      expect(signalWatcher.getPending().length).toBe(0);
      expect(watcherCallback).toHaveBeenCalledTimes(1);

      signalWatcher.unwatch({ computed: doubleCount, dependency: count });
      expect(signalWatcher.getPending().length).toBe(0);

      // The signal value didn't change, so the callback shouldn't be called again
      count(1);
      await callbackExecutionEnd();
      expect(watcherCallback).toHaveBeenCalledTimes(1);
      expect(signalWatcher.getPending().length).toBe(0); // Since the signal value didn't change, the pending list should be empty

      count(2);
      expect(signalWatcher.getPending()).toEqual([tripleCount]); // Only tripleCount should be pending

      await callbackExecutionEnd();
      expect(signalWatcher.getPending().length).toBe(0);
      expect(watcherCallback).toHaveBeenCalledTimes(2);

      // Remove the last computation of the count dependency
      signalWatcher.unwatch({
        computed: tripleCount,
        dependency: count
      });

      // Trigger an update without any watched computations
      count(3);

      // No computations should be pending, as we removed all watchers for the count signal
      expect(signalWatcher.getPending().length).toBe(0);

      await callbackExecutionEnd();
      expect(watcherCallback).toHaveBeenCalledTimes(2);
    });

    test("should abort the callback execution if all pendings computation are disposed", async () => {
      const watcherCallback = vi.fn();
      const signalWatcher = new Watcher(watcherCallback);

      signalWatcher.watch({ computed: doubleCount, dependency: count });

      // Update the signal value
      count(1);

      // Dispose the computation before the microtask execution
      signalWatcher.unwatch({ computed: doubleCount, dependency: count });

      await callbackExecutionEnd();
      expect(watcherCallback).toHaveBeenCalledTimes(0);
    });
  });
});

