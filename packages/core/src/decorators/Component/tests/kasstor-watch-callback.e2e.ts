import type { PropertyValues } from "lit";
import { property } from "lit/decorators/property.js";
import { html } from "lit/html.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, render } from "vitest-browser-lit";
import { Component, KasstorElement } from "../index.js";

let watchCallbackMock = vi.fn();
let firstWillUpdateMock = vi.fn();
let willUpdateMock = vi.fn();

let callbacksDispatched: ("watch" | "firstWillUpdate" | "willUpdate")[] = [];

@Component({ tag: "watch-callback-test-1" })
class WatchCallbackTest1 extends KasstorElement {
  override render() {
    return html`<p>Hello World</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "watch-callback-test-1": WatchCallbackTest1;
  }
}

@Component({ tag: "watch-callback-test-2" })
class WatchCallbackTest2 extends KasstorElement {
  kasstorWatchCallback = () => {
    watchCallbackMock();
  };

  override render() {
    return html`<p>Hello World</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "watch-callback-test-2": WatchCallbackTest2;
  }
}

@Component({ tag: "watch-callback-test-3" })
class WatchCallbackTest3 extends KasstorElement {
  kasstorWatchCallback = () => {
    callbacksDispatched.push("watch");
    watchCallbackMock();
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
    "watch-callback-test-3": WatchCallbackTest3;
  }
}

@Component({ tag: "watch-callback-test-4" })
class WatchCallbackTest4 extends KasstorElement {
  kasstorWatchCallback = (changedProperties: PropertyValues) => {
    watchCallbackMock([...changedProperties.entries()]);
  };

  @property() name: string | undefined;

  @property() lastName: string | undefined;

  override render() {
    return html`<p>Hello World</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "watch-callback-test-4": WatchCallbackTest4;
  }
}

describe("[Decorator]", () => {
  describe("[Component]", () => {
    describe("[kasstorWatchCallback]", () => {
      beforeEach(() => {
        callbacksDispatched = [];
        watchCallbackMock = vi.fn();
        firstWillUpdateMock = vi.fn();
        willUpdateMock = vi.fn();
      });

      afterEach(() => cleanup());

      test("should not throw if the kasstorWatchCallback is not defined", async () => {
        render(html`<watch-callback-test-1></watch-callback-test-1>`);
        const element = document.querySelector("watch-callback-test-1")!;
        await element.updateComplete;
      });

      test("should call the kasstorWatchCallback even if the firstWillUpdate and willUpdate methods are not defined", async () => {
        render(html`<watch-callback-test-2></watch-callback-test-2>`);
        const element = document.querySelector("watch-callback-test-2")!;
        await element.updateComplete;

        expect(watchCallbackMock).toHaveBeenCalledTimes(1);
      });

      test("should call the kasstorWatchCallback before the firstWillUpdate and willUpdate method life cycle method", async () => {
        render(html`<watch-callback-test-3></watch-callback-test-3>`);
        const element = document.querySelector("watch-callback-test-3")!;
        await element.updateComplete;

        expect(callbacksDispatched).toEqual([
          "watch",
          "firstWillUpdate",
          "willUpdate"
        ]);
        expect(watchCallbackMock).toHaveBeenCalledTimes(1);
        expect(firstWillUpdateMock).toHaveBeenCalledTimes(1);
        expect(willUpdateMock).toHaveBeenCalledTimes(1);
      });

      test("the kasstorWatchCallback calls should contain the mapping for the changed properties with their previous values", async () => {
        render(html`<watch-callback-test-4></watch-callback-test-4>`);
        const elementRef = document.querySelector("watch-callback-test-4")!;
        await elementRef.updateComplete;

        expect(watchCallbackMock).toHaveBeenCalledTimes(1);
        expect(watchCallbackMock).toHaveBeenNthCalledWith(1, []);

        elementRef.name = "Pepe";
        await elementRef.updateComplete;
        expect(watchCallbackMock).toHaveBeenCalledTimes(2);
        expect(watchCallbackMock).toHaveBeenNthCalledWith(2, [
          ["name", undefined] // It was the last value
        ]);
        expect(elementRef.name).toBe("Pepe");

        elementRef.name = "John";
        elementRef.lastName = "Doe";
        await elementRef.updateComplete;
        expect(watchCallbackMock).toHaveBeenCalledTimes(3);
        expect(watchCallbackMock).toHaveBeenNthCalledWith(3, [
          ["name", "Pepe"], // It was the last value
          ["lastName", undefined] // It was the last value
        ]);
        expect(elementRef.name).toBe("John");
        expect(elementRef.lastName).toBe("Doe");
      });
    });
  });
});

