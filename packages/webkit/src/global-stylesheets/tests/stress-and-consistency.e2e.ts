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

describe("Stress & consistency", () => {
  test("rapid add/remove cycles — no duplicates, clean final state", () => {
    const sheet = createSheet(":root { --test-g1: 1; }");

    for (let i = 0; i < 20; i++) {
      const el = createElement();
      addGlobalStyleSheet(el, sheet);

      // Sheet must never appear more than once
      expect(countOccurrences(document.adoptedStyleSheets, sheet)).toBe(1);

      removeGlobalStyleSheet(el, sheet);
    }

    // After all cycles, sheet should not be present
    expect(document.adoptedStyleSheets).not.toContain(sheet);
  });

  test("interleaved add/remove across roots", () => {
    const sheet = createSheet(":root { --test-g2: 1; }");
    const { shadowRoot: sr1 } = createShadowHost();
    const { shadowRoot: sr2 } = createShadowHost();

    // Add to document
    const elDoc = createElement();
    addGlobalStyleSheet(elDoc, sheet);

    // Add to shadow root 1
    const elSR1 = createElementInShadow(sr1);
    addGlobalStyleSheet(elSR1, sheet);

    // Add to shadow root 2
    const elSR2 = createElementInShadow(sr2);
    addGlobalStyleSheet(elSR2, sheet);

    // All roots have the sheet
    expect(document.adoptedStyleSheets).toContain(sheet);
    expect(sr1.adoptedStyleSheets).toContain(sheet);
    expect(sr2.adoptedStyleSheets).toContain(sheet);

    // Remove from shadow root 2 first (out of order)
    removeGlobalStyleSheet(elSR2, sheet);
    expect(sr2.adoptedStyleSheets).not.toContain(sheet);
    expect(document.adoptedStyleSheets).toContain(sheet);
    expect(sr1.adoptedStyleSheets).toContain(sheet);

    // Remove from document
    removeGlobalStyleSheet(elDoc, sheet);
    expect(document.adoptedStyleSheets).not.toContain(sheet);
    expect(sr1.adoptedStyleSheets).toContain(sheet);

    // Remove from shadow root 1 last
    removeGlobalStyleSheet(elSR1, sheet);
    expect(sr1.adoptedStyleSheets).not.toContain(sheet);
  });
});
