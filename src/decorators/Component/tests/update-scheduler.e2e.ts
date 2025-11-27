import { html } from "lit-html";
import { beforeEach, describe, expect, test } from "vitest";
import { render } from "vitest-browser-lit";
import { Component, SSRLitElement } from "../index.js";
import {
  getLastFrameBatchUpdateFinalization,
  updatesInEachBatch
} from "../update-scheduler.js";

let renderCount = 0;

const updateDelayTimeout = () =>
  new Promise<void>(resolve => setTimeout(resolve));

const updateFinalization = () =>
  new Promise<void>(resolve => queueMicrotask(resolve));

@Component({ tag: "scheduler-component-test" })
class SchedulerComponentTest extends SSRLitElement {
  override render() {
    renderCount++;
    return html`<p>Hello World</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "scheduler-component-test": SchedulerComponentTest;
  }
}

describe("[Decorator: Component]", () => {
  describe("[update-scheduler.ts]", () => {
    beforeEach(async () => {
      renderCount = 0;

      // Ensure all previous updates are done, because some tests rely on the
      // updatesInEachBatch being empty at the beginning of the tests
      if (getLastFrameBatchUpdateFinalization !== undefined) {
        await getLastFrameBatchUpdateFinalization();
      }
    });

    test("should render the component", async () => {
      render(html`<scheduler-component-test></scheduler-component-test>`);
      const element = document.querySelector("scheduler-component-test")!;

      // The component should not be rendered until updateComplete is awaited
      // In other words, the update is scheduled but the microtask is not yet executed
      expect(renderCount).toBe(0);

      await element.updateComplete;
      expect(renderCount).toBe(1);
    });

    test("should clear the updatesInEachBatch array after the last microtask", async () => {
      render(html`<scheduler-component-test></scheduler-component-test>`);
      const element = document.querySelector("scheduler-component-test")!;

      expect(renderCount).toBe(0);
      await element.updateComplete;
      expect(renderCount).toBe(1);

      if (getLastFrameBatchUpdateFinalization !== undefined) {
        await getLastFrameBatchUpdateFinalization();
      }

      expect(updatesInEachBatch.length).toBe(0);
    });

    test("should render the component after one microtask", async () => {
      render(html`<scheduler-component-test></scheduler-component-test>`);

      // The component should not be rendered until updateComplete is awaited
      // In other words, the update is scheduled but the microtask is not yet executed
      expect(renderCount).toBe(0);

      await updateFinalization();
      expect(renderCount).toBe(1);
    });

    test("following updates should only take one microtask", async () => {
      render(html`<scheduler-component-test></scheduler-component-test>`);
      const element = document.querySelector("scheduler-component-test")!;

      // The component should not be rendered until updateComplete is awaited
      // In other words, the update is scheduled but the microtask is not yet executed
      expect(renderCount).toBe(0);

      await updateFinalization();
      expect(renderCount).toBe(1);

      element.requestUpdate();
      await updateFinalization();
      expect(renderCount).toBe(2);
    });

    test("updates to the component should still be batched", async () => {
      render(html`<scheduler-component-test></scheduler-component-test>`);
      const element = document.querySelector("scheduler-component-test")!;

      expect(renderCount).toBe(0);

      await updateFinalization();
      expect(renderCount).toBe(1);

      element.requestUpdate();
      element.requestUpdate();
      element.requestUpdate();
      await updateFinalization();
      expect(renderCount).toBe(2);
    });

    test("updates to the component should still be batched", async () => {
      render(html`<scheduler-component-test></scheduler-component-test>`);
      const element = document.querySelector("scheduler-component-test")!;

      expect(renderCount).toBe(0);

      await updateFinalization();
      expect(renderCount).toBe(1);

      element.requestUpdate();
      element.requestUpdate();
      element.requestUpdate();
      await updateFinalization();
      expect(renderCount).toBe(2);
    });

    test("should partition updates in 256 component blocks when more than 256 components are rendered on the initial load", async () => {
      renderCount = 0;
      const elements = Array.from({ length: 600 }, () =>
        document.createElement("scheduler-component-test")
      );
      elements.forEach((element, index) => {
        element.id = `${index + 1}`;
        document.body.appendChild(element);
      });

      expect(renderCount).toBe(0);

      await updateFinalization();
      expect(renderCount).toBe(256);

      await updateDelayTimeout();
      expect(renderCount).toBe(512);

      await updateDelayTimeout();
      expect(renderCount).toBe(600);
    });
  });
});
