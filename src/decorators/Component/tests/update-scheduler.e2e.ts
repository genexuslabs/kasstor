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

const renderFinalization = () =>
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

describe("[Decorator | Component]", () => {
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

    test("should clear the updatesInEachBatch array after the last microtask, even when the render is partitioned", async () => {
      const elements = Array.from({ length: 1200 }, () =>
        document.createElement("scheduler-component-test")
      );
      elements.forEach(element => document.body.appendChild(element));

      expect(renderCount).toBe(0);

      await renderFinalization();
      expect(renderCount).toBe(512);

      await updateDelayTimeout();
      expect(renderCount).toBe(1024);

      await updateDelayTimeout();
      expect(renderCount).toBe(1200);

      expect(updatesInEachBatch.length).toBe(0);
    });

    test("should render the component after one microtask", async () => {
      render(html`<scheduler-component-test></scheduler-component-test>`);

      // The component should not be rendered until updateComplete is awaited
      // In other words, the update is scheduled but the microtask is not yet executed
      expect(renderCount).toBe(0);

      await renderFinalization();
      expect(renderCount).toBe(1);
    });

    test("following updates should only take one microtask", async () => {
      render(html`<scheduler-component-test></scheduler-component-test>`);
      const element = document.querySelector("scheduler-component-test")!;

      // The component should not be rendered until updateComplete is awaited
      // In other words, the update is scheduled but the microtask is not yet executed
      expect(renderCount).toBe(0);

      await renderFinalization();
      expect(renderCount).toBe(1);

      element.requestUpdate();
      await renderFinalization();
      expect(renderCount).toBe(2);
    });

    test("updates to the component should still be batched", async () => {
      render(html`<scheduler-component-test></scheduler-component-test>`);
      const element = document.querySelector("scheduler-component-test")!;

      expect(renderCount).toBe(0);

      await renderFinalization();
      expect(renderCount).toBe(1);

      element.requestUpdate();
      element.requestUpdate();
      element.requestUpdate();
      await renderFinalization();
      expect(renderCount).toBe(2);
    });

    test("updates to the component should still be batched", async () => {
      render(html`<scheduler-component-test></scheduler-component-test>`);
      const element = document.querySelector("scheduler-component-test")!;

      expect(renderCount).toBe(0);

      await renderFinalization();
      expect(renderCount).toBe(1);

      element.requestUpdate();
      element.requestUpdate();
      element.requestUpdate();
      await renderFinalization();
      expect(renderCount).toBe(2);
    });

    test("should partition updates in 256 component blocks when more than 256 components are rendered on the initial load", async () => {
      const elements = Array.from({ length: 1200 }, () =>
        document.createElement("scheduler-component-test")
      );
      elements.forEach(element => document.body.appendChild(element));

      expect(renderCount).toBe(0);

      await renderFinalization();
      expect(renderCount).toBe(512);

      await updateDelayTimeout();
      expect(renderCount).toBe(1024);

      await updateDelayTimeout();
      expect(renderCount).toBe(1200);
    });

    test("when the render is partitioned, elements that are rendered in following batches should have the corresponding updateComplete promise", async () => {
      const getPendingUpdates = (elements: SchedulerComponentTest[]) =>
        elements.map(e => e.isUpdatePending);

      const elements = Array.from({ length: 1200 }, () =>
        document.createElement("scheduler-component-test")
      );
      elements.forEach(element => document.body.appendChild(element));
      const first256 = elements.slice(0, 512);
      const second256 = elements.slice(512, 1024);
      const lastElements = elements.slice(1024, 1200);

      expect(renderCount).toBe(0);
      expect(getPendingUpdates(elements).every(p => p === true)).toBe(true);

      await renderFinalization();
      expect(getPendingUpdates(first256).every(p => p === false)).toBe(true);
      expect(getPendingUpdates(second256).every(p => p === true)).toBe(true);
      expect(getPendingUpdates(lastElements).every(p => p === true)).toBe(true);

      await updateDelayTimeout();
      expect(getPendingUpdates(first256).every(p => p === false)).toBe(true);
      expect(getPendingUpdates(second256).every(p => p === false)).toBe(true);
      expect(getPendingUpdates(lastElements).every(p => p === true)).toBe(true);

      await updateDelayTimeout();
      expect(getPendingUpdates(first256).every(p => p === false)).toBe(true);
      expect(getPendingUpdates(second256).every(p => p === false)).toBe(true);
      expect(getPendingUpdates(lastElements).every(p => p === false)).toBe(
        true
      );
    });

    test("when the render is partitioned, elements that are rendered for the first time should have the corresponding hasUpdated value", async () => {
      const getHasUpdated = (elements: SchedulerComponentTest[]) =>
        elements.map(e => e.hasUpdated);

      const elements = Array.from({ length: 1200 }, () =>
        document.createElement("scheduler-component-test")
      );
      elements.forEach(element => document.body.appendChild(element));
      const first256 = elements.slice(0, 512);
      const second256 = elements.slice(512, 1024);
      const lastElements = elements.slice(1024, 1200);

      expect(renderCount).toBe(0);
      expect(getHasUpdated(elements).every(p => p === false)).toBe(true);

      await renderFinalization();
      expect(getHasUpdated(first256).every(p => p === true)).toBe(true);
      expect(getHasUpdated(second256).every(p => p === false)).toBe(true);
      expect(getHasUpdated(lastElements).every(p => p === false)).toBe(true);

      await updateDelayTimeout();
      expect(getHasUpdated(first256).every(p => p === true)).toBe(true);
      expect(getHasUpdated(second256).every(p => p === true)).toBe(true);
      expect(getHasUpdated(lastElements).every(p => p === false)).toBe(true);

      await updateDelayTimeout();
      expect(getHasUpdated(first256).every(p => p === true)).toBe(true);
      expect(getHasUpdated(second256).every(p => p === true)).toBe(true);
      expect(getHasUpdated(lastElements).every(p => p === true)).toBe(true);
    });

    test("when the render is partitioned, the updateComplete promises should resolve correctly", async () => {
      const completedUpdates: Set<number> = new Set();

      const elements = Array.from({ length: 1200 }, () =>
        document.createElement("scheduler-component-test")
      );
      elements.forEach((element, index) => {
        element.updateComplete.then(() => completedUpdates.add(index + 1));
        document.body.appendChild(element);
      });

      expect(completedUpdates.size).toBe(0);

      await renderFinalization();
      await renderFinalization(); // Wait one extra microtask to ensure the updateCompletes are resolved
      expect(completedUpdates.size).toBe(512);

      // Check the ids of the elements that have completed their updates
      expect([...completedUpdates.keys()]).toEqual(
        Array.from({ length: 512 }, (_, index) => index + 1)
      );

      await updateDelayTimeout();
      expect(completedUpdates.size).toBe(1024);

      // Check the ids of the elements that have completed their updates
      expect([...completedUpdates.keys()]).toEqual(
        Array.from({ length: 1024 }, (_, index) => index + 1)
      );

      await updateDelayTimeout();
      expect(completedUpdates.size).toBe(1200);

      // Check the ids of the elements that have completed their updates
      expect([...completedUpdates.keys()]).toEqual(
        Array.from({ length: 1200 }, (_, index) => index + 1)
      );
    });

    test.todo(
      "should not change the order of updates when partitioned",
      async () => {}
    );
  });
});

