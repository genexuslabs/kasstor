import { computed, effect, signal, trigger } from "alien-signals";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { batch } from "../../../core/batch/index.js";
import type { KasstorSignalState } from "../../../typings/types.js";
import { SignalProp } from "../index.js";

class Counter {
  // TODO: Add support to auto-generate this
  declare $average: KasstorSignalState<Counter["average"]>;
  declare $count: KasstorSignalState<Counter["count"]>;
  declare $min: KasstorSignalState<Counter["min"]>;
  declare $step: KasstorSignalState<Counter["step"]>;

  @SignalProp average: number | undefined;
  @SignalProp count = 1;

  max = 0;

  @SignalProp min = 0;
  @SignalProp step = 2;

  total = computed(() => this.count * this.step);
}

const length = signal(3);

class Prism {
  declare $color: KasstorSignalState<Prism["color"]>;
  declare $height: KasstorSignalState<Prism["height"]>;
  declare $width: KasstorSignalState<Prism["width"]>;

  constructor(height: number, width: number) {
    this.height = height;
    this.width = width;
  }

  @SignalProp color: string = "red";
  @SignalProp height = 2;
  @SignalProp width;

  volume = computed(() => this.height * this.width * length());
}

describe("[Decorator]", () => {
  describe("[SignalProp]", () => {
    beforeEach(() => {
      length(3);
    });

    test("property initializers, setters and getters should work normally", () => {
      const c = new Counter();

      // First we get the initial values
      expect(c.average).toBe(undefined);
      expect(c.$average()).toBe(undefined);
      expect(c.count).toBe(1);
      expect(c.$count()).toBe(1);
      expect(c.max).toBe(0);
      expect(c.min).toBe(0);
      expect(c.$min()).toBe(0);
      expect(c.step).toBe(2);
      expect(c.$step()).toBe(2);
      expect(c.total()).toBe(2);

      // Then we set new values
      c.average = 10;
      c.count = 2;
      c.max = 80;
      c.min = -1;
      c.step = 3;

      // Finally we get the updated values
      expect(c.average).toBe(10);
      expect(c.$average()).toBe(10);
      expect(c.count).toBe(2);
      expect(c.$count()).toBe(2);
      expect(c.max).toBe(80);
      expect(c.min).toBe(-1);
      expect(c.$min()).toBe(-1);
      expect(c.step).toBe(3);
      expect(c.$step()).toBe(3);
      expect(c.total()).toBe(6);
    });

    test("constructor based initializers should work normally", () => {
      const rect = new Prism(10, 20);

      // Check the initial values
      expect(rect.height).toBe(10);
      expect(rect.$height()).toBe(10);
      expect(rect.width).toBe(20);
      expect(rect.$width()).toBe(20);
      expect(rect.color).toBe("red");
      expect(rect.$color()).toBe("red");
    });

    test("constructor based initializers should work well with setters and getters", () => {
      const rect = new Prism(10, 20);

      rect.height = 15;
      rect.width = 10;
      rect.color = "yellow";

      expect(rect.height).toBe(15);
      expect(rect.$height()).toBe(15);
      expect(rect.width).toBe(10);
      expect(rect.$width()).toBe(10);
      expect(rect.color).toBe("yellow");
      expect(rect.$color()).toBe("yellow");
    });

    test("should work with computed", () => {
      const c = new Counter();
      expect(c.total()).toBe(2);

      c.count = 10;
      expect(c.total()).toBe(20);

      c.step = 5;
      expect(c.total()).toBe(50);

      c.$count(123);
      expect(c.total()).toBe(615);

      c.$step(2);
      expect(c.total()).toBe(246);

      c.$count(5);
      c.$step(1);
      expect(c.total()).toBe(5);
    });

    test("properties decorated with SignalProp should work with effects, without having to use the $propName accessor", () => {
      const c = new Counter();
      const effectFnMock = vi.fn();

      const stop = effect(() => {
        effectFnMock(c.min);
      });

      // Initial run
      expect(effectFnMock).toHaveBeenCalledTimes(1);
      expect(effectFnMock).toHaveBeenNthCalledWith(1, 0);

      // Update min, which should trigger the effect
      c.min = -10;
      expect(effectFnMock).toHaveBeenCalledTimes(2);
      expect(effectFnMock).toHaveBeenNthCalledWith(2, -10);

      // Update an unrelated property, which should NOT trigger the effect
      c.average = -10;
      expect(effectFnMock).toHaveBeenCalledTimes(2);

      // Set "min" to the same value, which should NOT trigger the effect
      c.min = -10;
      expect(effectFnMock).toHaveBeenCalledTimes(2);

      // Set "min" to different values, which should trigger an effect for each
      // change
      c.min = -5;
      c.min = -2;
      c.min = -3;
      expect(effectFnMock).toHaveBeenCalledTimes(5);
      expect(effectFnMock).toHaveBeenNthCalledWith(3, -5);
      expect(effectFnMock).toHaveBeenNthCalledWith(4, -2);
      expect(effectFnMock).toHaveBeenNthCalledWith(5, -3);

      // Stop the effect
      stop();

      // Further changes should NOT trigger the effect
      c.min = -40;
      expect(effectFnMock).toHaveBeenCalledTimes(5);
    });

    test("computed properties should work with effects", () => {
      const c = new Counter();
      let observedTotal = 0;

      const stop = effect(() => {
        observedTotal = c.total();
      });

      expect(observedTotal).toBe(2);

      c.count = 10;
      expect(observedTotal).toBe(20);

      c.step = 5;
      expect(observedTotal).toBe(50);

      c.$count(123);
      expect(observedTotal).toBe(615);

      c.$step(2);
      expect(observedTotal).toBe(246);

      c.$count(5);
      c.$step(1);
      expect(observedTotal).toBe(5);

      // Avoid memory leaks
      stop();
    });

    test("properties decorated with SignalProp should dispatch effects when using trigger", () => {
      const c = new Counter();
      const effectFnMock = vi.fn();

      const stop = effect(() => {
        effectFnMock(c.min + c.max);
      });

      // Initial run
      expect(effectFnMock).toHaveBeenCalledTimes(1);
      expect(effectFnMock).toHaveBeenNthCalledWith(1, 0);

      // Should trigger effect, because min is a signal-backed property
      trigger(c.$min);
      expect(effectFnMock).toHaveBeenCalledTimes(2);
      expect(effectFnMock).toHaveBeenNthCalledWith(2, 0); // Same value as nothing changed

      // Should NOT trigger effect, because it is not a signal-backed property
      c.max = 4;
      expect(effectFnMock).toHaveBeenCalledTimes(2);

      // Should trigger effect, because min is a signal-backed property
      trigger(c.$min);
      expect(effectFnMock).toHaveBeenCalledTimes(3);
      expect(effectFnMock).toHaveBeenNthCalledWith(3, 4);

      c.min = 10;
      expect(effectFnMock).toHaveBeenCalledTimes(4);
      expect(effectFnMock).toHaveBeenNthCalledWith(4, 14);

      // Stop the effect
      stop();

      // The effect was stopped so further triggers should NOT call it
      trigger(c.$min);
      expect(effectFnMock).toHaveBeenCalledTimes(4);
    });

    test("properties decorated with SignalProp should work with batch + effects + computed + trigger", () => {
      const c = new Counter();
      const effectFnMock = vi.fn();

      const stop = effect(() => {
        effectFnMock(c.min + c.max + c.count + c.$step() + c.total());
      });

      // Initial run
      expect(effectFnMock).toHaveBeenCalledTimes(1);
      expect(effectFnMock).toHaveBeenNthCalledWith(1, 5);

      // Should NOT trigger effect, because it is not a signal-backed property
      c.max = 4;
      expect(effectFnMock).toHaveBeenCalledTimes(1);

      trigger(c.$min);
      expect(effectFnMock).toHaveBeenCalledTimes(2);
      expect(effectFnMock).toHaveBeenNthCalledWith(2, 9);

      batch(() => {
        c.min = 10;
        c.max = 20;

        // Because it is inside the batch, the effect should NOT be triggered yet
        trigger(c.$min);

        c.count = 5;
        c.step = 3;

        expect(c.count).toBe(5);

        // Even if we read a computed here, it should not trigger the effect yet
        expect(c.total()).toBe(15);

        // Should still not have triggered the effect
        trigger(c.total);

        c.step = 2;
      });

      expect(effectFnMock).toHaveBeenCalledTimes(3);
      expect(effectFnMock).toHaveBeenNthCalledWith(3, 47);

      // Manually trigger the computed value, should trigger the effect, even
      // if it is memoized and the value didn't change
      trigger(c.total);
      expect(effectFnMock).toHaveBeenCalledTimes(4);
      expect(effectFnMock).toHaveBeenNthCalledWith(4, 47);

      // Stop the effect
      stop();

      c.step = 1;
      trigger(c.total);
      expect(effectFnMock).toHaveBeenCalledTimes(4);
    });

    test("mixin of SignalProp decorated properties and regular signals should work with computed", () => {
      const prism = new Prism(10, 20);

      expect(prism.volume()).toBe(600);

      length(4);
      expect(prism.volume()).toBe(800);

      prism.height = 5;
      expect(prism.volume()).toBe(400);

      prism.$width(10);
      expect(prism.volume()).toBe(200);
    });

    test("mixin of SignalProp decorated properties and regular signals should work with effect", () => {
      const prism = new Prism(10, 20);
      const effectFnMock = vi.fn();

      const stop = effect(() => {
        effectFnMock(prism.volume() + prism.height + prism.width);
      });

      // Initial run
      expect(effectFnMock).toHaveBeenCalledTimes(1);
      expect(effectFnMock).toHaveBeenNthCalledWith(1, 630);

      prism.height = 5;
      expect(effectFnMock).toHaveBeenCalledTimes(2);
      expect(effectFnMock).toHaveBeenNthCalledWith(2, 325);

      prism.$width(10);
      expect(effectFnMock).toHaveBeenCalledTimes(3);
      expect(effectFnMock).toHaveBeenNthCalledWith(3, 165);

      length(1);
      expect(effectFnMock).toHaveBeenCalledTimes(4);
      expect(effectFnMock).toHaveBeenNthCalledWith(4, 65);

      // Stop the effect
      stop();

      prism.height = 20;
      length(10);
      expect(effectFnMock).toHaveBeenCalledTimes(4);
    });

    test("mixin of SignalProp decorated properties and regular signals should work with batch + trigger", () => {
      const prism = new Prism(10, 20);
      const effectFnMock = vi.fn();

      const stop = effect(() => {
        effectFnMock(prism.volume() + prism.height + prism.width + length());
      });

      // Initial run
      expect(effectFnMock).toHaveBeenCalledTimes(1);
      expect(effectFnMock).toHaveBeenNthCalledWith(1, 633);

      batch(() => {
        prism.height = 5;
        prism.$width(10);
        length(4);

        // Effect should not be triggered yet
        expect(effectFnMock).toHaveBeenCalledTimes(1);
      });

      expect(effectFnMock).toHaveBeenCalledTimes(2);
      expect(effectFnMock).toHaveBeenNthCalledWith(2, 219);

      length(2);
      expect(effectFnMock).toHaveBeenCalledTimes(3);
      expect(effectFnMock).toHaveBeenNthCalledWith(3, 117);

      // Should trigger the effect 2 times, even if the computed value is
      // memoized and the length signal didn't change
      trigger(length);
      trigger(prism.volume);
      expect(effectFnMock).toHaveBeenCalledTimes(5);
      expect(effectFnMock).toHaveBeenNthCalledWith(4, 117);
      expect(effectFnMock).toHaveBeenNthCalledWith(5, 117);

      // Stop the effect
      stop();

      prism.height = 20;
      length(10);
      expect(effectFnMock).toHaveBeenCalledTimes(5);
    });
  });
});

