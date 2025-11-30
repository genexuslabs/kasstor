import { computed, effect, signal } from "alien-signals";
import { describe, expect, test, vi } from "vitest";
import { batch } from "../index.js";

describe("[core]", () => {
  describe("[batch]", () => {
    test("effects should work normally without the batch", async () => {
      const letter = signal("a");
      const effectFnMock = vi.fn();

      const stopEffect = effect(() => {
        effectFnMock(letter());
      });

      // First time
      expect(effectFnMock).toHaveBeenCalledTimes(1);
      expect(effectFnMock).toHaveBeenCalledWith("a");

      letter("b");
      letter("c");

      expect(effectFnMock).toHaveBeenCalledTimes(3);
      expect(effectFnMock).toHaveBeenNthCalledWith(2, "b");
      expect(effectFnMock).toHaveBeenNthCalledWith(3, "c");

      // Stop the effect
      stopEffect();

      // Trigger a change
      letter("d");

      // The mock should not be called again
      expect(effectFnMock).toHaveBeenCalledTimes(3);
    });

    test("effects with computed should work normally without the batch", async () => {
      const letter = signal("a");
      const doubleLetter = computed(() => letter() + letter());
      const effectFnMock = vi.fn();

      const stopEffect = effect(() => {
        effectFnMock(doubleLetter());
      });

      // First time
      expect(effectFnMock).toHaveBeenCalledTimes(1);
      expect(effectFnMock).toHaveBeenCalledWith("aa");

      letter("b");
      letter("c");

      expect(effectFnMock).toHaveBeenCalledTimes(3);
      expect(effectFnMock).toHaveBeenNthCalledWith(2, "bb");
      expect(effectFnMock).toHaveBeenNthCalledWith(3, "cc");

      // Stop the effect
      stopEffect();

      // Trigger a change
      letter("d");

      // The mock should not be called again
      expect(effectFnMock).toHaveBeenCalledTimes(3);
    });

    test("batch should only dispatch changes at the end of the function, so effects must run once", async () => {
      const letter = signal("a");
      const effectFnMock = vi.fn();

      const stopEffect = effect(() => {
        effectFnMock(letter());
      });

      // First time
      expect(effectFnMock).toHaveBeenCalledTimes(1);
      expect(effectFnMock).toHaveBeenCalledWith("a");

      batch(() => {
        letter("b");
        letter("c");
        letter("d");
      });

      // The effect was dispatched only one more time, instead of 3 more times
      expect(effectFnMock).toHaveBeenCalledTimes(2);
      expect(effectFnMock).toHaveBeenNthCalledWith(2, "d");

      // Stop the effect
      stopEffect();

      // Trigger a change
      letter("e");

      // The mock should not be called again
      expect(effectFnMock).toHaveBeenCalledTimes(2);
    });

    test("batch with computed should only dispatch changes at the end of the function, so effects must run once", async () => {
      const letter = signal("a");
      const doubleLetter = computed(() => letter() + letter());
      const effectFnMock = vi.fn();

      const stopEffect = effect(() => {
        effectFnMock(doubleLetter());
      });

      // First time
      expect(effectFnMock).toHaveBeenCalledTimes(1);
      expect(effectFnMock).toHaveBeenCalledWith("aa");

      batch(() => {
        letter("b");
        letter("c");
        letter("d");
      });

      // The effect was dispatched only one more time, instead of 3 more times
      expect(effectFnMock).toHaveBeenCalledTimes(2);
      expect(effectFnMock).toHaveBeenNthCalledWith(2, "dd");

      // Stop the effect
      stopEffect();

      // Trigger a change
      letter("e");

      // The mock should not be called again
      expect(effectFnMock).toHaveBeenCalledTimes(2);
    });

    test("combining multiple signals should trigger only one effect when using batch", async () => {
      const letter = signal("a");
      const vowel = signal("a");
      const vowelAndLetter = computed(() => vowel() + letter());
      const effectFnMock = vi.fn();

      const stopEffect = effect(() => {
        effectFnMock(letter() + vowel() + vowelAndLetter());
      });

      // First time
      expect(effectFnMock).toHaveBeenCalledTimes(1);
      expect(effectFnMock).toHaveBeenCalledWith("aaaa");

      batch(() => {
        vowel("e");
        letter("b");
        letter("c");
        letter("d");
        vowel("i");
      });

      // The effect was dispatched only one more time, instead of 3 more times
      expect(effectFnMock).toHaveBeenCalledTimes(2);
      expect(effectFnMock).toHaveBeenNthCalledWith(2, "diid");

      // Stop the effect
      stopEffect();

      // Trigger a change
      letter("e");

      // The mock should not be called again
      expect(effectFnMock).toHaveBeenCalledTimes(2);
    });

    test("if the signal value at the end of the batch is the same at the beginning, the effect should not be triggered", async () => {
      const letter = signal("a");
      const effectFnMock = vi.fn();

      const stopEffect = effect(() => {
        effectFnMock(letter());
      });

      // First time
      expect(effectFnMock).toHaveBeenCalledTimes(1);
      expect(effectFnMock).toHaveBeenCalledWith("a");

      batch(() => {
        letter("b");
        letter("c");
        letter("d");
        letter("a"); // Same as the initial value
      });

      expect(effectFnMock).toHaveBeenCalledTimes(1);
      expect(effectFnMock).toHaveBeenNthCalledWith(1, "a");

      // Stop the effect
      stopEffect();

      // Trigger a change
      letter("e");

      // The mock should not be called again
      expect(effectFnMock).toHaveBeenCalledTimes(1);
    });

    test("if the computed value at the end of the batch is the same at the beginning, the effect should not be triggered", async () => {
      const letter = signal("a");
      const doubleLetter = computed(() => letter() + letter());
      const effectFnMock = vi.fn();

      const stopEffect = effect(() => {
        effectFnMock(doubleLetter());
      });

      // First time
      expect(effectFnMock).toHaveBeenCalledTimes(1);
      expect(effectFnMock).toHaveBeenCalledWith("aa");

      batch(() => {
        letter("b");
        letter("c");
        letter("d");
        letter("a"); // Same as the initial value
      });

      expect(effectFnMock).toHaveBeenCalledTimes(1);
      expect(effectFnMock).toHaveBeenNthCalledWith(1, "aa");

      // Stop the effect
      stopEffect();

      // Trigger a change
      letter("e");

      // The mock should not be called again
      expect(effectFnMock).toHaveBeenCalledTimes(1);
    });

    test("if a signal is accessed inside the batch, the computation must be forced, but effects should not run", async () => {
      const letter = signal("a");
      const vowel = signal("a");
      const vowelAndLetter = computed(() => vowel() + letter());
      const effectFnMock = vi.fn();

      const stopEffect = effect(() => {
        effectFnMock(letter() + vowel() + vowelAndLetter());
      });

      // First time
      expect(effectFnMock).toHaveBeenCalledTimes(1);
      expect(effectFnMock).toHaveBeenCalledWith("aaaa");

      batch(() => {
        vowel("e");
        letter("b");
        expect(vowelAndLetter()).toBe("eb");
        letter("c");
        letter("d");
        vowel("i");
      });

      // Even though we accessed the computed value that is tracked by the
      // effect, it didn't trigger the effect callback
      expect(effectFnMock).toHaveBeenCalledTimes(2);
      expect(effectFnMock).toHaveBeenNthCalledWith(2, "diid");

      // Stop the effect
      stopEffect();

      // Trigger a change
      letter("e");

      // The mock should not be called again
      expect(effectFnMock).toHaveBeenCalledTimes(2);
    });

    test("combining normal writes with batch should work", async () => {
      const letter = signal("a");
      const doubleLetter = computed(() => letter() + letter());
      const effectFnMock = vi.fn();

      const stopEffect = effect(() => {
        effectFnMock(doubleLetter());
      });

      // First time
      expect(effectFnMock).toHaveBeenCalledTimes(1);
      expect(effectFnMock).toHaveBeenCalledWith("aa");

      batch(() => {
        letter("b");
        letter("c");
        letter("d");
      });

      expect(effectFnMock).toHaveBeenCalledTimes(2);
      expect(effectFnMock).toHaveBeenNthCalledWith(2, "dd");

      // This must trigger two effect calls, even though the "end" value is the
      // same as the current one
      letter("c");
      letter("d");

      expect(effectFnMock).toHaveBeenCalledTimes(4);
      expect(effectFnMock).toHaveBeenNthCalledWith(3, "cc");
      expect(effectFnMock).toHaveBeenNthCalledWith(4, "dd");

      batch(() => {
        letter("d");
        letter("b");
        letter("c");
      });

      expect(effectFnMock).toHaveBeenCalledTimes(5);
      expect(effectFnMock).toHaveBeenNthCalledWith(5, "cc");

      // Stop the effect
      stopEffect();

      // Trigger a change
      letter("e");

      // The mock should not be called again
      expect(effectFnMock).toHaveBeenCalledTimes(5);
    });

    test("batch should not trigger the effect function after the effect has been disposed", async () => {
      const letter = signal("a");
      const doubleLetter = computed(() => letter() + letter());
      const effectFnMock = vi.fn();

      const stopEffect = effect(() => {
        effectFnMock(doubleLetter());
      });

      // First time
      expect(effectFnMock).toHaveBeenCalledTimes(1);
      expect(effectFnMock).toHaveBeenCalledWith("aa");

      batch(() => {
        letter("b");
        letter("c");
        letter("d");
      });

      expect(effectFnMock).toHaveBeenCalledTimes(2);
      expect(effectFnMock).toHaveBeenNthCalledWith(2, "dd");

      // Stop the effect
      stopEffect();

      batch(() => {
        letter("d");
        letter("b");
        letter("c");
      });

      expect(effectFnMock).toHaveBeenCalledTimes(2);
    });
  });
});
