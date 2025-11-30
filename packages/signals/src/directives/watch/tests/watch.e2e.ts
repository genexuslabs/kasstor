import {
  Component,
  SSRLitElement
} from "@genexus/kasstor-core/decorators/component.js";
import { computed, signal } from "alien-signals";
import { html } from "lit";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { cleanup } from "vitest-browser-lit";
import { watch } from "../index.js";

let renderCount = 0;
const count = signal(0);
const doubleCount = computed(() => count() * 2);

const renderFinalization = () =>
  new Promise<void>(resolve => queueMicrotask(resolve));

const checkPendingUpdates = (
  elements: WatchDirectiveComponentTest[],
  expectedValue?: boolean[]
) =>
  expect(elements.map(el => el.isUpdatePending)).toEqual(
    expectedValue ?? Array.from({ length: elements.length }, () => false)
  );

const checkSpanValues = (spans: HTMLSpanElement[], values: string[]) =>
  expect(spans.map(span => span.textContent)).toEqual(values);

@Component({ tag: "watch-directive-component-test" })
class WatchDirectiveComponentTest extends SSRLitElement {
  override render() {
    renderCount++;
    return html`<p>Count value<span>${watch(count)}</span></p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "watch-directive-component-test": WatchDirectiveComponentTest;
  }
}

const renderElement = async () => {
  const elementRef = document.createElement("watch-directive-component-test");
  document.body.append(elementRef);
  await elementRef!.updateComplete;

  return {
    elementRef: elementRef,
    spanRef: elementRef.shadowRoot!.querySelector("span")!
  };
};

describe("[directives]", () => {
  describe("[watch]", () => {
    describe("[signals outside the component]", () => {
      beforeEach(() => {
        renderCount = 0;
        count(0);
      });

      afterEach(() => cleanup());

      test("should properly watch the signal without triggering updates in the component when the signal changes", async () => {
        const { elementRef, spanRef } = await renderElement();

        // Values after the first render
        checkPendingUpdates([elementRef]);
        checkSpanValues([spanRef], ["0"]);
        expect(renderCount).toBe(1);

        // Update the signal
        count(1);

        // Watch must not trigger an update
        checkPendingUpdates([elementRef]);

        // Changes to the DOM element must be queued in a microtask, so the DOM
        // should not be updated yet
        checkSpanValues([spanRef], ["0"]);

        // Wait for the DOM update
        await renderFinalization();

        checkPendingUpdates([elementRef]);
        checkSpanValues([spanRef], ["1"]); // The DOM was updated

        // The element was not updated, because the signals doesn't trigger an
        // update
        expect(renderCount).toBe(1);
      });

      test("when multiples elements watches the same signal, the DOM update must be executed in the same microtask", async () => {
        const { elementRef: el1, spanRef: spanRef1 } = await renderElement();
        const { elementRef: el2, spanRef: spanRef2 } = await renderElement();
        const { elementRef: el3, spanRef: spanRef3 } = await renderElement();

        // Values after the first render
        checkPendingUpdates([el1, el2, el3]);
        checkSpanValues([spanRef1, spanRef2, spanRef3], ["0", "0", "0"]);
        expect(renderCount).toBe(3);

        // Update the signal
        count(1);

        // Watch must not trigger an update
        checkPendingUpdates([el1, el2, el3]);

        // Changes to the DOM element must be queued in a microtask, so the DOM
        // should not be updated yet
        checkSpanValues([spanRef1, spanRef2, spanRef3], ["0", "0", "0"]);

        // Wait for the DOM update
        await renderFinalization();

        checkPendingUpdates([el1, el2, el3]);
        checkSpanValues([spanRef1, spanRef2, spanRef3], ["1", "1", "1"]); // The DOM was updated

        // The element was not updated, because the signals doesn't trigger an
        // update
        expect(renderCount).toBe(3);
      });
    });
  });
});
