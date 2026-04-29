import { afterEach, describe, expect, test } from "vitest";
import {
  addGlobalStyleSheet,
  addStyleSheet,
  removeGlobalStyleSheet,
  removeStyleSheet
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

describe("addStyleSheet / removeStyleSheet — basic add & remove", () => {
  test("add directly to Document", () => {
    const sheet = createSheet(":root { --node-a1: 1; }");

    addStyleSheet(document, sheet);

    expect(document.adoptedStyleSheets).toContain(sheet);
  });

  test("remove directly from Document", () => {
    const sheet = createSheet(":root { --node-a2: 1; }");
    const lengthBefore = document.adoptedStyleSheets.length;

    addStyleSheet(document, sheet);
    removeStyleSheet(document, sheet);

    expect(document.adoptedStyleSheets).not.toContain(sheet);
    expect(document.adoptedStyleSheets.length).toBe(lengthBefore);
  });

  test("add directly to ShadowRoot", () => {
    const { shadowRoot } = createShadowHost();
    const sheet = createSheet(":host { --node-a3: 1; }");

    addStyleSheet(shadowRoot, sheet);

    expect(shadowRoot.adoptedStyleSheets).toContain(sheet);
    expect(document.adoptedStyleSheets).not.toContain(sheet);
  });

  test("remove directly from ShadowRoot", () => {
    const { shadowRoot } = createShadowHost();
    const sheet = createSheet(":host { --node-a4: 1; }");

    addStyleSheet(shadowRoot, sheet);
    removeStyleSheet(shadowRoot, sheet);

    expect(shadowRoot.adoptedStyleSheets).not.toContain(sheet);
  });
});

describe("addStyleSheet / removeStyleSheet — reference counting", () => {
  test("two adds on same node, same sheet — adopted only once", () => {
    const sheet = createSheet(":root { --node-r1: 1; }");

    addStyleSheet(document, sheet);
    addStyleSheet(document, sheet);

    expect(countOccurrences(document.adoptedStyleSheets, sheet)).toBe(1);
  });

  test("two adds, one remove — sheet persists", () => {
    const sheet = createSheet(":root { --node-r2: 1; }");

    addStyleSheet(document, sheet);
    addStyleSheet(document, sheet);
    removeStyleSheet(document, sheet);

    expect(document.adoptedStyleSheets).toContain(sheet);
  });

  test("N adds, N removes — sheet fully released", () => {
    const sheet = createSheet(":root { --node-r3: 1; }");
    const N = 5;

    for (let i = 0; i < N; i++) addStyleSheet(document, sheet);
    expect(countOccurrences(document.adoptedStyleSheets, sheet)).toBe(1);

    for (let i = 0; i < N - 1; i++) {
      removeStyleSheet(document, sheet);
      expect(document.adoptedStyleSheets).toContain(sheet);
    }

    removeStyleSheet(document, sheet);
    expect(document.adoptedStyleSheets).not.toContain(sheet);
  });

  test("extra remove beyond reference count is a no-op", () => {
    const sheet = createSheet(":root { --node-r4: 1; }");

    addStyleSheet(document, sheet);
    removeStyleSheet(document, sheet);
    expect(() => removeStyleSheet(document, sheet)).not.toThrow();
    expect(document.adoptedStyleSheets).not.toContain(sheet);
  });

  test("remove without add is a no-op", () => {
    const sheet = createSheet(":root { --node-r5: 1; }");

    expect(() => removeStyleSheet(document, sheet)).not.toThrow();
    expect(document.adoptedStyleSheets).not.toContain(sheet);
  });

  test("re-add after full release", () => {
    const sheet = createSheet(":root { --node-r6: 1; }");

    addStyleSheet(document, sheet);
    removeStyleSheet(document, sheet);
    expect(document.adoptedStyleSheets).not.toContain(sheet);

    addStyleSheet(document, sheet);
    expect(document.adoptedStyleSheets).toContain(sheet);
  });
});

describe("addStyleSheet / removeStyleSheet — node isolation", () => {
  test("Document and ShadowRoot track references independently", () => {
    const { shadowRoot } = createShadowHost();
    const sheet = createSheet(":host, :root { --node-i1: 1; }");

    addStyleSheet(document, sheet);
    addStyleSheet(shadowRoot, sheet);

    expect(document.adoptedStyleSheets).toContain(sheet);
    expect(shadowRoot.adoptedStyleSheets).toContain(sheet);

    removeStyleSheet(document, sheet);
    expect(document.adoptedStyleSheets).not.toContain(sheet);
    expect(shadowRoot.adoptedStyleSheets).toContain(sheet);

    removeStyleSheet(shadowRoot, sheet);
    expect(shadowRoot.adoptedStyleSheets).not.toContain(sheet);
  });

  test("two ShadowRoots are independent", () => {
    const { shadowRoot: sA } = createShadowHost();
    const { shadowRoot: sB } = createShadowHost();
    const sheet = createSheet(":host { --node-i2: 1; }");

    addStyleSheet(sA, sheet);
    expect(sA.adoptedStyleSheets).toContain(sheet);
    expect(sB.adoptedStyleSheets).not.toContain(sheet);

    removeStyleSheet(sA, sheet);
    expect(sA.adoptedStyleSheets).not.toContain(sheet);
  });
});

// ---------------------------------------------------------------------------
// The core of this validation: the per-node API and the global API must be
// safely composable on the same root + same stylesheet.
// ---------------------------------------------------------------------------
describe("Mixing with global API — same root, same stylesheet", () => {
  test("global then node on Document — both visible, both removable", () => {
    const el = createElement();
    const sheet = createSheet(":root { --node-m1: 1; }");

    addGlobalStyleSheet(el, sheet);
    expect(document.adoptedStyleSheets).toContain(sheet);

    addStyleSheet(document, sheet);
    expect(document.adoptedStyleSheets).toContain(sheet);

    removeGlobalStyleSheet(el, sheet);
    // Per-node API still holds a reference, so sheet must remain adopted
    expect(document.adoptedStyleSheets).toContain(sheet);

    removeStyleSheet(document, sheet);
    expect(document.adoptedStyleSheets).not.toContain(sheet);
  });

  test("node then global on Document — removing in opposite order", () => {
    const el = createElement();
    const sheet = createSheet(":root { --node-m2: 1; }");

    addStyleSheet(document, sheet);
    addGlobalStyleSheet(el, sheet);
    expect(document.adoptedStyleSheets).toContain(sheet);

    removeStyleSheet(document, sheet);
    // Global API still holds a reference, so sheet must remain adopted
    expect(document.adoptedStyleSheets).toContain(sheet);

    removeGlobalStyleSheet(el, sheet);
    expect(document.adoptedStyleSheets).not.toContain(sheet);
  });

  test("global then node on ShadowRoot — both visible, both removable", () => {
    const { shadowRoot } = createShadowHost();
    const el = createElementInShadow(shadowRoot);
    const sheet = createSheet(":host { --node-m3: 1; }");

    addGlobalStyleSheet(el, sheet);
    addStyleSheet(shadowRoot, sheet);
    expect(shadowRoot.adoptedStyleSheets).toContain(sheet);

    removeGlobalStyleSheet(el, sheet);
    expect(shadowRoot.adoptedStyleSheets).toContain(sheet);

    removeStyleSheet(shadowRoot, sheet);
    expect(shadowRoot.adoptedStyleSheets).not.toContain(sheet);
  });

  test("interleaved adds and removes keep ref counts independent", () => {
    const elA = createElement();
    const elB = createElement();
    const sheet = createSheet(":root { --node-m4: 1; }");

    // 2 global refs + 3 node refs
    addGlobalStyleSheet(elA, sheet);
    addStyleSheet(document, sheet);
    addGlobalStyleSheet(elB, sheet);
    addStyleSheet(document, sheet);
    addStyleSheet(document, sheet);

    expect(document.adoptedStyleSheets).toContain(sheet);

    // Release all global refs
    removeGlobalStyleSheet(elA, sheet);
    expect(document.adoptedStyleSheets).toContain(sheet);
    removeGlobalStyleSheet(elB, sheet);
    expect(document.adoptedStyleSheets).toContain(sheet);

    // Release node refs one by one
    removeStyleSheet(document, sheet);
    expect(document.adoptedStyleSheets).toContain(sheet);
    removeStyleSheet(document, sheet);
    expect(document.adoptedStyleSheets).toContain(sheet);
    removeStyleSheet(document, sheet);
    expect(document.adoptedStyleSheets).not.toContain(sheet);
  });

  test("mixed lifecycle keeps styles actually applied while any ref lives", () => {
    // Use a real style that has a measurable effect
    const target = createElement();
    target.className = "node-mixed-target";
    const sheet = createSheet(".node-mixed-target { width: 123px; }");

    expect(getComputedStyle(target).width).not.toBe("123px");

    addGlobalStyleSheet(target, sheet);
    expect(getComputedStyle(target).width).toBe("123px");

    addStyleSheet(document, sheet);
    expect(getComputedStyle(target).width).toBe("123px");

    removeGlobalStyleSheet(target, sheet);
    // Still applied via per-node API
    expect(getComputedStyle(target).width).toBe("123px");

    removeStyleSheet(document, sheet);
    expect(getComputedStyle(target).width).not.toBe("123px");
  });

  test("adoptedStyleSheets never holds duplicates of the same sheet", () => {
    // Per CSSOM, duplicate CSSStyleSheets in adoptedStyleSheets are not allowed.
    // This test guards against a regression where mixing APIs would push the
    // same sheet twice and either throw or silently duplicate.
    const elA = createElement();
    const elB = createElement();
    const sheet = createSheet(":root { --node-m5: 1; }");

    addGlobalStyleSheet(elA, sheet);
    addGlobalStyleSheet(elB, sheet);
    addStyleSheet(document, sheet);
    addStyleSheet(document, sheet);

    expect(countOccurrences(document.adoptedStyleSheets, sheet)).toBe(1);
  });
});
