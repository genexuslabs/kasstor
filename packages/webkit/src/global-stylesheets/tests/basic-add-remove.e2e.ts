import { afterEach, describe, expect, test } from "vitest";
import {
  addGlobalStyleSheet,
  removeGlobalStyleSheet
} from "../index.js";
import {
  cleanup,
  createElement,
  createElementInShadow,
  createSheet,
  createShadowHost
} from "./global-stylesheets-helpers.js";

afterEach(cleanup);

describe("Basic add & remove", () => {
  test("add to Document root", () => {
    const el = createElement();
    const sheet = createSheet(":root { --test-a1: 1; }");

    addGlobalStyleSheet(el, sheet);

    expect(document.adoptedStyleSheets).toContain(sheet);
  });

  test("remove from Document root", () => {
    const el = createElement();
    const sheet = createSheet(":root { --test-a2: 1; }");
    const lengthBefore = document.adoptedStyleSheets.length;

    addGlobalStyleSheet(el, sheet);
    removeGlobalStyleSheet(el, sheet);

    expect(document.adoptedStyleSheets).not.toContain(sheet);
    expect(document.adoptedStyleSheets.length).toBe(lengthBefore);
  });

  test("add to ShadowRoot", () => {
    const { shadowRoot } = createShadowHost();
    const el = createElementInShadow(shadowRoot);
    const sheet = createSheet(":host { --test-a3: 1; }");

    addGlobalStyleSheet(el, sheet);

    expect(shadowRoot.adoptedStyleSheets).toContain(sheet);
    expect(document.adoptedStyleSheets).not.toContain(sheet);
  });

  test("remove from ShadowRoot", () => {
    const { shadowRoot } = createShadowHost();
    const el = createElementInShadow(shadowRoot);
    const sheet = createSheet(":host { --test-a4: 1; }");

    addGlobalStyleSheet(el, sheet);
    removeGlobalStyleSheet(el, sheet);

    expect(shadowRoot.adoptedStyleSheets).not.toContain(sheet);
  });
});
