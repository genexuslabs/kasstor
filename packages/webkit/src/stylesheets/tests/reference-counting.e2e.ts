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

describe("Reference counting", () => {
  test("two elements, same sheet, same root — sheet added only once", () => {
    const elA = createElement();
    const elB = createElement();
    const sheet = createSheet(":root { --test-b1: 1; }");

    addGlobalStyleSheet(elA, sheet);
    addGlobalStyleSheet(elB, sheet);

    expect(countOccurrences(document.adoptedStyleSheets, sheet)).toBe(1);
  });

  test("remove one of two references — sheet persists", () => {
    const elA = createElement();
    const elB = createElement();
    const sheet = createSheet(":root { --test-b2: 1; }");

    addGlobalStyleSheet(elA, sheet);
    addGlobalStyleSheet(elB, sheet);
    removeGlobalStyleSheet(elA, sheet);

    expect(document.adoptedStyleSheets).toContain(sheet);
  });

  test("remove last reference — sheet removed", () => {
    const elA = createElement();
    const elB = createElement();
    const sheet = createSheet(":root { --test-b3: 1; }");

    addGlobalStyleSheet(elA, sheet);
    addGlobalStyleSheet(elB, sheet);
    removeGlobalStyleSheet(elA, sheet);
    removeGlobalStyleSheet(elB, sheet);

    expect(document.adoptedStyleSheets).not.toContain(sheet);
  });

  test("many elements (5), progressive removal", () => {
    const elements = Array.from({ length: 5 }, () => createElement());
    const sheet = createSheet(":root { --test-b4: 1; }");

    // Add sheet via all 5 elements
    for (const el of elements) {
      addGlobalStyleSheet(el, sheet);
    }
    expect(countOccurrences(document.adoptedStyleSheets, sheet)).toBe(1);

    // Remove one by one; sheet persists until last removal
    for (let i = 0; i < elements.length - 1; i++) {
      removeGlobalStyleSheet(elements[i], sheet);
      expect(document.adoptedStyleSheets).toContain(sheet);
    }

    // Remove the last one
    removeGlobalStyleSheet(elements[elements.length - 1], sheet);
    expect(document.adoptedStyleSheets).not.toContain(sheet);
  });

  test("re-add after full cleanup", () => {
    const elA = createElement();
    const sheet = createSheet(":root { --test-b5: 1; }");

    // Add and fully remove
    addGlobalStyleSheet(elA, sheet);
    removeGlobalStyleSheet(elA, sheet);
    expect(document.adoptedStyleSheets).not.toContain(sheet);

    // Re-add with a new element
    const elB = createElement();
    addGlobalStyleSheet(elB, sheet);
    expect(document.adoptedStyleSheets).toContain(sheet);
  });
});
