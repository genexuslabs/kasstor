import {
  Component,
  KasstorElement
} from "@genexus/kasstor-core/decorators/component.js";
import { computed, signal } from "alien-signals";
import { html } from "lit";
import { property } from "lit/decorators/property.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { signalWatcher, watch } from "../index.js";

const UPDATE_DELAY = 30;

let computedReadCount = 0;
let renderCount = 0;

const count = signal(0);
const doubleCount = computed(() => {
  computedReadCount++;
  return count() * 2;
});

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
class WatchDirectiveComponentTest extends KasstorElement {
  @property({ type: Boolean }) useComputed = false;

  delayUpdateForSignal = false;

  protected override async scheduleUpdate() {
    if (this.delayUpdateForSignal) {
      await new Promise<void>(resolve => setTimeout(resolve, UPDATE_DELAY));
    }

    super.scheduleUpdate();
  }

  override render() {
    renderCount++;
    return this.useComputed
      ? html`<p>Count value<span>${watch(doubleCount)}</span></p>`
      : html`<p>Count value<span>${watch(count)}</span></p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "watch-directive-component-test": WatchDirectiveComponentTest;
  }
}

const renderElement = async (
  delayUpdateForSignal = false,
  useComputed = false
) => {
  const elementRef = document.createElement("watch-directive-component-test");
  elementRef.delayUpdateForSignal = delayUpdateForSignal;
  elementRef.useComputed = useComputed;
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
      beforeEach(async () => {
        computedReadCount = 0;
        renderCount = 0;
        count(0);
      });

      afterEach(() => {
        // Cleanup the DOM. Since we are not using the render from
        // vitest-browser-lit, we must do it "manually"
        document.body.innerHTML = "";
      });

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

      test("if the component is updating, the watch directive should not pinpoint update the part", async () => {
        const { elementRef, spanRef } = await renderElement(true);

        // Values after the first render
        checkPendingUpdates([elementRef]);
        checkSpanValues([spanRef], ["0"]);
        expect(renderCount).toBe(1);

        // Update the signal and then trigger an update in the component
        count(1);
        elementRef.requestUpdate();

        checkPendingUpdates([elementRef], [true]);

        // Changes to the DOM element must be queued in a microtask, so the DOM
        // should not be updated yet
        checkSpanValues([spanRef], ["0"]);

        // Wait for the signal microtask queue
        await renderFinalization();

        // The updating is still pending, as the delay is a timeout with 50ms
        checkPendingUpdates([elementRef], [true]);

        // The DOM must not be updated yet, as the component is still updating
        checkSpanValues([spanRef], ["0"]);
        await elementRef.updateComplete; // Wait for the component update to finish

        checkPendingUpdates([elementRef], [false]);
        checkSpanValues([spanRef], ["1"]); // The DOM was updated
        expect(renderCount).toBe(2);
      });

      test("should unsubscribe to the signal changes when the element is disconnected from the DOM", async () => {
        const { elementRef, spanRef } = await renderElement(false, true);

        // Values after the first render
        checkPendingUpdates([elementRef]);
        checkSpanValues([spanRef], ["0"]);
        expect(renderCount).toBe(1);
        expect(computedReadCount).toBe(1);

        // Disconnect the element
        elementRef.remove();

        // Update the signal
        count(1);

        // Ensure there are no pending signal updates
        expect(signalWatcher.getPending().length).toBe(0);

        // Even if the element updated, it is disconnected, so the DOM must not
        // be updated
        await elementRef.updateComplete;

        // The DOM must not be updated, as the element is disconnected
        expect(renderCount).toBe(1);
        expect(computedReadCount).toBe(1);
      });

      test("if the watched signal was updated when the element is reconnected to the DOM, the template should be correctly updated", async () => {
        const { elementRef, spanRef } = await renderElement(false, true);

        // Values after the first render
        checkPendingUpdates([elementRef]);
        checkSpanValues([spanRef], ["0"]);
        expect(renderCount).toBe(1);
        expect(computedReadCount).toBe(1);

        // Disconnect the element
        elementRef.remove();

        // Update the signal
        count(1);

        // Wait for any pending updates (there should be none)
        await renderFinalization();

        // Reconnect the element
        document.body.append(elementRef);

        // No re-render is scheduled, because the properties of the element
        // didn't change
        checkPendingUpdates([elementRef]);

        // The part is updated immediately upon reconnection
        expect(signalWatcher.getPending().length).toBe(0);

        // The span should be updated, because the signal was changed while the
        // element was disconnected
        checkSpanValues([spanRef], ["2"]);

        // The element didn't re-render
        expect(renderCount).toBe(1);

        // But the computed was read again to update the part
        expect(computedReadCount).toBe(2);
      });
    });
  });
});

