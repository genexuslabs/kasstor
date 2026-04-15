import { afterEach, describe, expect, test } from "vitest";
import {
  addGlobalStyleSheet,
  removeGlobalStyleSheet
} from "../index.js";
import {
  cleanup,
  createElement,
  createSheet
} from "./global-stylesheets-helpers.js";

afterEach(cleanup);

describe("Multiple stylesheets", () => {
  test("multiple different sheets in same root", () => {
    const elA = createElement();
    const elB = createElement();
    const sheet1 = createSheet(":root { --test-c1a: 1; }");
    const sheet2 = createSheet(":root { --test-c1b: 1; }");

    addGlobalStyleSheet(elA, sheet1);
    addGlobalStyleSheet(elB, sheet2);

    expect(document.adoptedStyleSheets).toContain(sheet1);
    expect(document.adoptedStyleSheets).toContain(sheet2);
  });

  test("remove one sheet, other remains", () => {
    const elA = createElement();
    const elB = createElement();
    const sheet1 = createSheet(":root { --test-c2a: 1; }");
    const sheet2 = createSheet(":root { --test-c2b: 1; }");

    addGlobalStyleSheet(elA, sheet1);
    addGlobalStyleSheet(elB, sheet2);
    removeGlobalStyleSheet(elA, sheet1);

    expect(document.adoptedStyleSheets).not.toContain(sheet1);
    expect(document.adoptedStyleSheets).toContain(sheet2);
  });

  test("order preservation after removal", () => {
    const el1 = createElement();
    const el2 = createElement();
    const el3 = createElement();
    const sheet1 = createSheet(":root { --test-c3a: 1; }");
    const sheet2 = createSheet(":root { --test-c3b: 1; }");
    const sheet3 = createSheet(":root { --test-c3c: 1; }");

    addGlobalStyleSheet(el1, sheet1);
    addGlobalStyleSheet(el2, sheet2);
    addGlobalStyleSheet(el3, sheet3);

    // Remove the middle sheet
    removeGlobalStyleSheet(el2, sheet2);

    const remaining = document.adoptedStyleSheets;
    const idx1 = remaining.indexOf(sheet1);
    const idx3 = remaining.indexOf(sheet3);

    expect(idx1).not.toBe(-1);
    expect(idx3).not.toBe(-1);
    expect(idx1).toBeLessThan(idx3);
  });

  test("same element, two different sheets", () => {
    const el = createElement();
    const sheetA = createSheet(":root { --test-c4a: 1; }");
    const sheetB = createSheet(":root { --test-c4b: 1; }");

    addGlobalStyleSheet(el, sheetA);
    addGlobalStyleSheet(el, sheetB);

    expect(document.adoptedStyleSheets).toContain(sheetA);
    expect(document.adoptedStyleSheets).toContain(sheetB);

    // Remove sheetA — sheetB still present
    removeGlobalStyleSheet(el, sheetA);
    expect(document.adoptedStyleSheets).not.toContain(sheetA);
    expect(document.adoptedStyleSheets).toContain(sheetB);

    // Remove sheetB — both gone
    removeGlobalStyleSheet(el, sheetB);
    expect(document.adoptedStyleSheets).not.toContain(sheetB);
  });

  test("pre-existing adoptedStyleSheets are not affected", () => {
    const preExisting = createSheet(":root { --pre-existing: 1; }");
    document.adoptedStyleSheets.push(preExisting);

    const el = createElement();
    const sheet = createSheet(":root { --test-c5: 1; }");

    addGlobalStyleSheet(el, sheet);
    expect(document.adoptedStyleSheets).toContain(preExisting);
    expect(document.adoptedStyleSheets).toContain(sheet);

    removeGlobalStyleSheet(el, sheet);
    expect(document.adoptedStyleSheets).toContain(preExisting);
    expect(document.adoptedStyleSheets).not.toContain(sheet);
  });
});
