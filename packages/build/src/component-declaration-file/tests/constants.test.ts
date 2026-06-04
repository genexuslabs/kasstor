import { describe, expect, it } from "vitest";

import { FRAMEWORK_JSX_NAMESPACE_NAMES, NATIVE_DOM_EVENTS } from "../constants.js";

describe("[component-declaration-file] NATIVE_DOM_EVENTS", () => {
  it("includes representative native DOM events", () => {
    // A handful of events frameworks expose through their HTMLAttributes.
    for (const native of [
      "input",
      "click",
      "change",
      "focus",
      "blur",
      "keydown",
      "pointerdown",
      "dblclick"
    ]) {
      expect(NATIVE_DOM_EVENTS.has(native)).toBe(true);
    }
  });

  it("excludes custom (non-native) event names", () => {
    for (const custom of ["selectedItemsChange", "valueChange", "kstReady", "someCustomEvent"]) {
      expect(NATIVE_DOM_EVENTS.has(custom)).toBe(false);
    }
  });

  it("uses all-lowercase native event names (DOM events are case-sensitive)", () => {
    for (const native of NATIVE_DOM_EVENTS) {
      expect(native).toBe(native.toLowerCase());
    }
  });
});

describe("[component-declaration-file] FRAMEWORK_JSX_NAMESPACE_NAMES", () => {
  it("maps each framework to its JSX namespace name", () => {
    expect(FRAMEWORK_JSX_NAMESPACE_NAMES).toEqual({
      react: "ReactJSX",
      solid: "SolidJsJSX",
      stencil: "StencilJSX"
    });
  });
});
