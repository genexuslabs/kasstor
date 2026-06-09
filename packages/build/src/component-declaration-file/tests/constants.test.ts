import { describe, expect, it } from "vitest";

import {
  FRAMEWORK_JSX_NAMESPACE_NAMES,
  NATIVE_DOM_EVENTS,
  REACT_NATIVE_EVENT_HANDLERS
} from "../constants.js";

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

describe("[component-declaration-file] REACT_NATIVE_EVENT_HANDLERS", () => {
  it("maps native DOM events to React's own handler prop names", () => {
    expect(REACT_NATIVE_EVENT_HANDLERS.get("input")).toBe("onInput");
    expect(REACT_NATIVE_EVENT_HANDLERS.get("change")).toBe("onChange");
    // Renamed / multi-word handlers are not a plain capitalize.
    expect(REACT_NATIVE_EVENT_HANDLERS.get("dblclick")).toBe("onDoubleClick");
    expect(REACT_NATIVE_EVENT_HANDLERS.get("mousedown")).toBe("onMouseDown");
    expect(REACT_NATIVE_EVENT_HANDLERS.get("loadstart")).toBe("onLoadStart");
  });

  it("does not map custom (non-native) event names", () => {
    expect(REACT_NATIVE_EVENT_HANDLERS.has("selectedItemsChange")).toBe(false);
  });

  it("uses lowercase native event names as keys (DOM events are case-sensitive)", () => {
    for (const eventName of REACT_NATIVE_EVENT_HANDLERS.keys()) {
      expect(eventName).toBe(eventName.toLowerCase());
    }
  });

  it("is a subset of NATIVE_DOM_EVENTS", () => {
    // Some native events have no React handler and are intentionally absent.
    for (const eventName of REACT_NATIVE_EVENT_HANDLERS.keys()) {
      expect(NATIVE_DOM_EVENTS.has(eventName)).toBe(true);
    }
  });

  it("uses the `on` + PascalCase handler shape for every value", () => {
    for (const handlerName of REACT_NATIVE_EVENT_HANDLERS.values()) {
      expect(handlerName).toMatch(/^on[A-Z]/);
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
