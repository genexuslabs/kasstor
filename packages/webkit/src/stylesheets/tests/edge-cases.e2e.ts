import { afterEach, describe, expect, test } from "vitest";
import {
  addGlobalStyleSheet,
  removeGlobalStyleSheet
} from "../index.js";
import {
  cleanup,
  countOccurrences,
  createElement,
  createSheet
} from "./global-stylesheets-helpers.js";

afterEach(cleanup);

describe("Edge cases", () => {
  test("detached element — add is a no-op", () => {
    const el = document.createElement("div");
    // NOT appended to DOM
    const sheet = createSheet(":root { --test-d1: 1; }");
    const lengthBefore = document.adoptedStyleSheets.length;

    addGlobalStyleSheet(el, sheet);

    expect(document.adoptedStyleSheets).not.toContain(sheet);
    expect(document.adoptedStyleSheets.length).toBe(lengthBefore);
  });

  test("remove without prior add — no-op", () => {
    const el = createElement();
    const sheet = createSheet(":root { --test-d2: 1; }");

    // Should not throw
    expect(() => removeGlobalStyleSheet(el, sheet)).not.toThrow();
  });

  test("double remove — second call is a no-op", () => {
    const el = createElement();
    const sheet = createSheet(":root { --test-d3: 1; }");

    addGlobalStyleSheet(el, sheet);
    removeGlobalStyleSheet(el, sheet);
    expect(document.adoptedStyleSheets).not.toContain(sheet);

    // Second remove should not throw
    expect(() => removeGlobalStyleSheet(el, sheet)).not.toThrow();
    expect(document.adoptedStyleSheets).not.toContain(sheet);
  });

  test("remove with a different sheet than was added", () => {
    const el = createElement();
    const sheetA = createSheet(":root { --test-d4a: 1; }");
    const sheetB = createSheet(":root { --test-d4b: 1; }");

    addGlobalStyleSheet(el, sheetA);

    // Remove a different sheet — should not affect sheetA
    removeGlobalStyleSheet(el, sheetB);
    expect(document.adoptedStyleSheets).toContain(sheetA);
  });

  test("external removal of managed sheet", () => {
    const el = createElement();
    const sheet = createSheet(":root { --test-d5: 1; }");

    addGlobalStyleSheet(el, sheet);
    expect(document.adoptedStyleSheets).toContain(sheet);

    // Externally remove the sheet
    const idx = document.adoptedStyleSheets.indexOf(sheet);
    document.adoptedStyleSheets.splice(idx, 1);
    expect(document.adoptedStyleSheets).not.toContain(sheet);

    // removeGlobalStyleSheet should not throw even though sheet is already gone
    expect(() => removeGlobalStyleSheet(el, sheet)).not.toThrow();

    // Internal state should be cleaned up — re-adding via a new element works
    const el2 = createElement();
    addGlobalStyleSheet(el2, sheet);
    expect(document.adoptedStyleSheets).toContain(sheet);
  });

  test("multiple adds for same element without remove (accidental double-connect)", () => {
    const el = createElement();
    const sheet = createSheet(":root { --test-d6: 1; }");

    addGlobalStyleSheet(el, sheet);
    addGlobalStyleSheet(el, sheet);

    // Sheet appears only once — second add is a no-op (idempotent)
    expect(countOccurrences(document.adoptedStyleSheets, sheet)).toBe(1);

    // A single remove is enough — ref count was not inflated by the duplicate add
    removeGlobalStyleSheet(el, sheet);
    expect(document.adoptedStyleSheets).not.toContain(sheet);
  });
});
