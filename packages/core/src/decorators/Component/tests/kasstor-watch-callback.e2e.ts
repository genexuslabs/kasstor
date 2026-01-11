import type { PropertyValues } from "lit";
import { property } from "lit/decorators/property.js";
import { html } from "lit/html.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, render } from "vitest-browser-lit";
import { Component, KasstorElement } from "../index.js";

let observeCallbackMock = vi.fn();
let firstWillUpdateMock = vi.fn();
let willUpdateMock = vi.fn();

let callbacksDispatched: ("observe" | "firstWillUpdate" | "willUpdate")[] = [];

@Component({ tag: "observe-callback-test-1" })
class ObserveCallbackTest1 extends KasstorElement {
  override render() {
    return html`<p>Hello World</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "observe-callback-test-1": ObserveCallbackTest1;
  }
}

@Component({ tag: "observe-callback-test-2" })
class ObserveCallbackTest2 extends KasstorElement {
  kasstorObserveCallback = () => {
    observeCallbackMock();
  };

  override render() {
    return html`<p>Hello World</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "observe-callback-test-2": ObserveCallbackTest2;
  }
}

@Component({ tag: "observe-callback-test-3" })
class ObserveCallbackTest3 extends KasstorElement {
  kasstorObserveCallback = () => {
    callbacksDispatched.push("observe");
    observeCallbackMock();
  };

  protected override firstWillUpdate(): void {
    callbacksDispatched.push("firstWillUpdate");
    firstWillUpdateMock();
  }

  protected override willUpdate(): void {
    callbacksDispatched.push("willUpdate");
    willUpdateMock();
  }

  override render() {
    return html`<p>Hello World</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "observe-callback-test-3": ObserveCallbackTest3;
  }
}

@Component({ tag: "observe-callback-test-4" })
class ObserveCallbackTest4 extends KasstorElement {
  kasstorObserveCallback = (changedProperties: PropertyValues) => {
    observeCallbackMock([...changedProperties.entries()]);
  };

  @property() name: string | undefined;

  @property() lastName: string | undefined;

  override render() {
    return html`<p>Hello World</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "observe-callback-test-4": ObserveCallbackTest4;
  }
}

describe("[Decorator]", () => {
  describe("[Component]", () => {
    describe("[kasstorObserveCallback]", () => {
      beforeEach(() => {
        callbacksDispatched = [];
        observeCallbackMock = vi.fn();
        firstWillUpdateMock = vi.fn();
        willUpdateMock = vi.fn();
      });

      afterEach(() => cleanup());

      test("should not throw if the kasstorObserveCallback is not defined", async () => {
        render(html`<observe-callback-test-1></observe-callback-test-1>`);
        const element = document.querySelector("observe-callback-test-1")!;
        await element.updateComplete;
      });

      test("should call the kasstorObserveCallback even if the firstWillUpdate and willUpdate methods are not defined", async () => {
        render(html`<observe-callback-test-2></observe-callback-test-2>`);
        const element = document.querySelector("observe-callback-test-2")!;
        await element.updateComplete;

        expect(observeCallbackMock).toHaveBeenCalledTimes(1);
      });

      test("should call the kasstorObserveCallback before the firstWillUpdate and willUpdate method life cycle method", async () => {
        render(html`<observe-callback-test-3></observe-callback-test-3>`);
        const element = document.querySelector("observe-callback-test-3")!;
        await element.updateComplete;

        expect(callbacksDispatched).toEqual([
          "observe",
          "firstWillUpdate",
          "willUpdate"
        ]);
        expect(observeCallbackMock).toHaveBeenCalledTimes(1);
        expect(firstWillUpdateMock).toHaveBeenCalledTimes(1);
        expect(willUpdateMock).toHaveBeenCalledTimes(1);
      });

      test("the kasstorObserveCallback calls should contain the mapping for the changed properties with their previous values", async () => {
        render(html`<observe-callback-test-4></observe-callback-test-4>`);
        const elementRef = document.querySelector("observe-callback-test-4")!;
        await elementRef.updateComplete;

        expect(observeCallbackMock).toHaveBeenCalledTimes(1);
        expect(observeCallbackMock).toHaveBeenNthCalledWith(1, []);

        elementRef.name = "Pepe";
        await elementRef.updateComplete;
        expect(observeCallbackMock).toHaveBeenCalledTimes(2);
        expect(observeCallbackMock).toHaveBeenNthCalledWith(2, [
          ["name", undefined] // It was the last value
        ]);
        expect(elementRef.name).toBe("Pepe");

        elementRef.name = "John";
        elementRef.lastName = "Doe";
        await elementRef.updateComplete;
        expect(observeCallbackMock).toHaveBeenCalledTimes(3);
        expect(observeCallbackMock).toHaveBeenNthCalledWith(3, [
          ["name", "Pepe"], // It was the last value
          ["lastName", undefined] // It was the last value
        ]);
        expect(elementRef.name).toBe("John");
        expect(elementRef.lastName).toBe("Doe");
      });
    });
  });
});
