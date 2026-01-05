import { LitElement, type PropertyValues } from "lit";
import type { PerformanceScanItem } from "../components/performance-scan/types";

const REMOVE_OVERLAY_TIMEOUT = 600; // 600ms

// Skip overlay on the performance scan components
const COMPONENT_WITHOUT_OVERLAY = new Set([
  "kst-performance-scan",
  "kst-performance-scan-item",
  "kst-performance-scan-fps"
]);

let autoId = 0;

const global = globalThis;

const updateRenderedItems = (
  model: PerformanceScanItem,
  componentRef: LitElement
) => {
  if (COMPONENT_WITHOUT_OVERLAY.has(model.anchorTagName)) {
    return;
  }

  let item = global.kasstorInsightsUpdatedCustomElements!.get(componentRef);

  // Create the item the first time
  if (!item) {
    item = {
      id: autoId++,
      renderCount: 0,
      model
    };
    // For some reason, we have to do this. Otherwise, the reference is
    // undefined
    item.model.anchorRef = componentRef;

    global.kasstorInsightsUpdatedCustomElements!.set(componentRef, item);
  }

  item.renderCount++;

  // Reset the timeout to remove the overlay
  if (item.removeTimeout) {
    clearTimeout(item.removeTimeout);
  }

  // Remove overlay on timeout
  item.removeTimeout = setTimeout(() => {
    global.kasstorInsightsUpdatedCustomElements!.delete(componentRef);
    global.kasstorInsightsUpdateCallback?.();
  }, REMOVE_OVERLAY_TIMEOUT);

  // Add overlay for the incoming update of the component
  global.kasstorInsightsUpdateCallback?.();
};

/**
 * Applies a monkey patch to log re-renders on Lit components.
 */
export function patchLitUpdates() {
  global.kasstorInsightsUpdatedCustomElements ??= new Map();

  // @ts-expect-error - update is a protected property
  const originalUpdate = LitElement.prototype.update;

  // @ts-expect-error - update is a protected property
  LitElement.prototype.update = function (
    this: LitElement,
    changedProperties: PropertyValues
  ) {
    const componentName = this.constructor.name;
    const changes: PerformanceScanItem["changes"] = [];

    for (const [name, oldValue] of changedProperties) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newValue = (this as any)[name];
      changes.push({
        property: name,
        oldValue: oldValue,
        newValue: newValue,
        changed: oldValue !== newValue
      });
    }

    updateRenderedItems(
      {
        anchorRef: this,
        constructorName: componentName,
        anchorTagName: this.tagName.toLowerCase(),
        changes: changes,
        timeStamp: new Date()
      },
      this
    );

    return originalUpdate.call(this, changedProperties);
  };
}
