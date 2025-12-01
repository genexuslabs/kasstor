import { computed } from "alien-signals";
import { describe, expect, test } from "vitest";
import { SignalProp } from "./index.js";

describe("[Decorator]", () => {
  describe("[SignalProp]", () => {
    test("should work with computed", () => {
      class Counter {
        @SignalProp count = 1;

        @SignalProp step = 2;

        total = computed(() => this.count * this.step);
      }

      const c = new Counter();

      expect(c.total()).toBe(2);

      c.count = 10;
      expect(c.total()).toBe(20);

      c.step = 5;
      expect(c.total()).toBe(50);

      c.$count(123);
      expect(c.total()).toBe(615);
    });
  });
});
