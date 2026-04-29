import { afterEach, describe, expect, test } from "vitest";
import {
  addGlobalStyleSheet,
  removeGlobalStyleSheet
} from "../index.js";
import {
  cleanup,
  countOccurrences,
  createElement,
  createElementInShadow,
  createSheet,
  createShadowHost
} from "./global-stylesheets-helpers.js";

afterEach(cleanup);

describe("Element lifecycle & movement", () => {
  test("element moves from Document to ShadowRoot", () => {
    const el = createElement();
    const sheet = createSheet(":root { --test-f1: 1; }");

    // Phase 1: element in document
    addGlobalStyleSheet(el, sheet);
    expect(document.adoptedStyleSheets).toContain(sheet);

    // Simulate disconnect lifecycle
    removeGlobalStyleSheet(el, sheet);
    expect(document.adoptedStyleSheets).not.toContain(sheet);

    // Phase 2: move element to shadow root
    const { shadowRoot } = createShadowHost();
    shadowRoot.appendChild(el);
    addGlobalStyleSheet(el, sheet);

    expect(document.adoptedStyleSheets).not.toContain(sheet);
    expect(shadowRoot.adoptedStyleSheets).toContain(sheet);
  });

  test("element moves from ShadowRoot to Document", () => {
    const { shadowRoot } = createShadowHost();
    const el = createElementInShadow(shadowRoot);
    const sheet = createSheet(":root { --test-f2: 1; }");

    // Phase 1: element in shadow root
    addGlobalStyleSheet(el, sheet);
    expect(shadowRoot.adoptedStyleSheets).toContain(sheet);

    // Simulate disconnect lifecycle
    removeGlobalStyleSheet(el, sheet);
    expect(shadowRoot.adoptedStyleSheets).not.toContain(sheet);

    // Phase 2: move element to document
    document.body.appendChild(el);
    addGlobalStyleSheet(el, sheet);

    expect(shadowRoot.adoptedStyleSheets).not.toContain(sheet);
    expect(document.adoptedStyleSheets).toContain(sheet);
  });

  test("runtime parent removal — stored rootNode still works", () => {
    const parent = createElement();

    const el = document.createElement("div");
    parent.appendChild(el);

    const sheet = createSheet(":root { --test-f3: 1; }");
    addGlobalStyleSheet(el, sheet);
    expect(document.adoptedStyleSheets).toContain(sheet);

    // Remove parent from DOM — element is now detached
    parent.remove();

    // removeGlobalStyleSheet should still work via stored rootNode reference
    removeGlobalStyleSheet(el, sheet);
    expect(document.adoptedStyleSheets).not.toContain(sheet);
  });

  test("multiple elements inside removed parent", () => {
    const parent = createElement();

    const sheet = createSheet(":root { --test-f4: 1; }");
    const elements: HTMLDivElement[] = [];

    for (let i = 0; i < 3; i++) {
      const el = document.createElement("div");
      parent.appendChild(el);
      addGlobalStyleSheet(el, sheet);
      elements.push(el);
    }

    expect(countOccurrences(document.adoptedStyleSheets, sheet)).toBe(1);

    // Remove parent from DOM — all children are now detached
    parent.remove();

    // Remove sheets for each child; sheet persists until last removal
    removeGlobalStyleSheet(elements[0], sheet);
    expect(document.adoptedStyleSheets).toContain(sheet);

    removeGlobalStyleSheet(elements[1], sheet);
    expect(document.adoptedStyleSheets).toContain(sheet);

    removeGlobalStyleSheet(elements[2], sheet);
    expect(document.adoptedStyleSheets).not.toContain(sheet);
  });
});
