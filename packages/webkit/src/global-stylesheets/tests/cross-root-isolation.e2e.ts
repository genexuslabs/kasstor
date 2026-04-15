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

describe("Cross-root isolation", () => {
  test("same sheet in Document and ShadowRoot — independent", () => {
    const elDoc = createElement();
    const { shadowRoot } = createShadowHost();
    const elShadow = createElementInShadow(shadowRoot);
    const sheet = createSheet(":root { --test-e1: 1; }");

    addGlobalStyleSheet(elDoc, sheet);
    addGlobalStyleSheet(elShadow, sheet);

    expect(document.adoptedStyleSheets).toContain(sheet);
    expect(shadowRoot.adoptedStyleSheets).toContain(sheet);

    // Remove from document — shadow root still has it
    removeGlobalStyleSheet(elDoc, sheet);
    expect(document.adoptedStyleSheets).not.toContain(sheet);
    expect(shadowRoot.adoptedStyleSheets).toContain(sheet);

    // Remove from shadow root — now gone from both
    removeGlobalStyleSheet(elShadow, sheet);
    expect(shadowRoot.adoptedStyleSheets).not.toContain(sheet);
  });

  test("multiple shadow roots with shared sheet", () => {
    const sheet = createSheet(":root { --test-e2: 1; }");

    // Create 3 shadow hosts, each with 2 elements sharing the same sheet
    const shadowRoots: ShadowRoot[] = [];
    const elementsByShadow: HTMLDivElement[][] = [];

    for (let i = 0; i < 3; i++) {
      const { shadowRoot } = createShadowHost();
      shadowRoots.push(shadowRoot);
      const elements: HTMLDivElement[] = [];

      for (let j = 0; j < 2; j++) {
        const el = createElementInShadow(shadowRoot);
        addGlobalStyleSheet(el, sheet);
        elements.push(el);
      }
      elementsByShadow.push(elements);
    }

    // All 3 shadow roots have the sheet
    for (const sr of shadowRoots) {
      expect(sr.adoptedStyleSheets).toContain(sheet);
    }

    // Remove all elements from shadow root 0
    for (const el of elementsByShadow[0]) {
      removeGlobalStyleSheet(el, sheet);
    }
    expect(shadowRoots[0].adoptedStyleSheets).not.toContain(sheet);
    expect(shadowRoots[1].adoptedStyleSheets).toContain(sheet);
    expect(shadowRoots[2].adoptedStyleSheets).toContain(sheet);

    // Remove from shadow root 1
    for (const el of elementsByShadow[1]) {
      removeGlobalStyleSheet(el, sheet);
    }
    expect(shadowRoots[1].adoptedStyleSheets).not.toContain(sheet);
    expect(shadowRoots[2].adoptedStyleSheets).toContain(sheet);

    // Remove from shadow root 2
    for (const el of elementsByShadow[2]) {
      removeGlobalStyleSheet(el, sheet);
    }
    expect(shadowRoots[2].adoptedStyleSheets).not.toContain(sheet);
  });

  test("nested shadow DOM — sheet goes to immediate root", () => {
    // Outer host with shadow root
    const { shadowRoot: outerShadow } = createShadowHost();

    // Inner host inside the outer shadow
    const innerHost = document.createElement("div");
    outerShadow.appendChild(innerHost);
    const innerShadow = innerHost.attachShadow({ mode: "open" });

    // Element inside the inner shadow
    const el = document.createElement("div");
    innerShadow.appendChild(el);

    const sheet = createSheet(":root { --test-e3: 1; }");
    addGlobalStyleSheet(el, sheet);

    // Sheet should be in the immediate (inner) shadow root only
    expect(innerShadow.adoptedStyleSheets).toContain(sheet);
    expect(outerShadow.adoptedStyleSheets).not.toContain(sheet);
    expect(document.adoptedStyleSheets).not.toContain(sheet);
  });
});
