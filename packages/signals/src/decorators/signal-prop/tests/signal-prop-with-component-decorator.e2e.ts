import {
  Component,
  SSRLitElement
} from "@genexus/kasstor-core/decorators/component.js";
import { html } from "lit";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { cleanup } from "vitest-browser-lit";
import { watch } from "../../../directives/watch/index.js";
import type { KasstorSignalState } from "../../../typings/types.js";
import { SignalProp } from "../index.js";

let renderCount = 0;

@Component({ tag: "signal-prop-component-test" })
class SignalPropComponentTest extends SSRLitElement {
  declare $average: KasstorSignalState<SignalPropComponentTest["average"]>;
  declare $count: KasstorSignalState<SignalPropComponentTest["count"]>;

  @SignalProp average = 1;
  @SignalProp count = 0;

  override render() {
    renderCount++;
    return html`<p>Count value<span>${watch(this.$count)}</span></p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "signal-prop-component-test": SignalPropComponentTest;
  }
}

const renderElement = async () => {
  const elementRef = document.createElement("signal-prop-component-test");
  document.body.append(elementRef);
  await elementRef!.updateComplete;

  return {
    elementRef: elementRef,
    spanRef: elementRef.shadowRoot!.querySelector("span")!
  };
};

const renderFinalization = () =>
  new Promise<void>(resolve => queueMicrotask(resolve));

const checkPendingUpdates = (
  elements: SignalPropComponentTest[],
  expectedValue?: boolean[]
) =>
  expect(elements.map(el => el.isUpdatePending)).toEqual(
    expectedValue ?? Array.from({ length: elements.length }, () => false)
  );

const checkSpanValues = (spans: HTMLSpanElement[], values: string[]) =>
  expect(spans.map(span => span.textContent)).toEqual(values);

describe("[Decorator]", () => {
  describe("[SignalProp + Component decorator]", () => {
    beforeEach(() => {
      renderCount = 0;
    });

    afterEach(() => cleanup());

    test("properties with SignalProp should not trigger component updates", async () => {
      const { elementRef } = await renderElement();

      // Values after the first render
      checkPendingUpdates([elementRef]);
      expect(renderCount).toBe(1);
      expect(elementRef.average).toBe(1);
      expect(elementRef.$average()).toBe(1);

      // Update the signal
      elementRef.average = 3;

      // The value should be reflected immediately
      expect(elementRef.average).toBe(3);
      expect(elementRef.$average()).toBe(3);

      // Setting a signal-prop should NOT schedule an update
      checkPendingUpdates([elementRef]);

      // Wait for the DOM update
      await renderFinalization();

      checkPendingUpdates([elementRef]);

      // The element was not updated, because the signals doesn't trigger an
      // update
      expect(renderCount).toBe(1);
    });

    test("properties with SignalProp should not trigger component updates and should work with the watch directive", async () => {
      const { elementRef, spanRef } = await renderElement();

      // Values after the first render
      checkPendingUpdates([elementRef]);
      checkSpanValues([spanRef], ["0"]);
      expect(renderCount).toBe(1);
      expect(elementRef.count).toBe(0);
      expect(elementRef.$count()).toBe(0);

      // Update the signal
      elementRef.count = 1;

      // The value should be reflected immediately
      expect(elementRef.count).toBe(1);
      expect(elementRef.$count()).toBe(1);

      // Setting a signal-prop should NOT schedule an update
      checkPendingUpdates([elementRef]);

      // Changes to the DOM element must be queued in a microtask, so the DOM
      // should not be updated yet
      checkSpanValues([spanRef], ["0"]);

      // Wait for the DOM update
      await renderFinalization();

      checkPendingUpdates([elementRef]);
      checkSpanValues([spanRef], ["1"]); // The DOM was updated
      expect(elementRef.count).toBe(1);
      expect(elementRef.$count()).toBe(1);

      // The element was not updated, because the signals doesn't trigger an
      // update
      expect(renderCount).toBe(1);
    });
  });
});

