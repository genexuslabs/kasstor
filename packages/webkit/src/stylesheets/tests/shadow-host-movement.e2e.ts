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

// ---------------------------------------------------------------------------
// When a host with its own shadow DOM is moved around in the tree, the
// ShadowRoot object identity is preserved — its adoptedStyleSheets and
// everything inside it survive the move. Only the HOST itself changes its
// getRootNode() when it crosses between different roots (document, other
// shadow roots, etc.). These tests validate both invariants.
// ---------------------------------------------------------------------------

describe("Shadow host movement", () => {
  test("moving host within the same document preserves shadow-root adoptions", () => {
    const parentA = createElement();
    const parentB = createElement();

    const host = document.createElement("div");
    const shadowRoot = host.attachShadow({ mode: "open" });
    parentA.appendChild(host);

    const sheet = createSheet(":host { --shm-1: 1; }");
    addStyleSheet(shadowRoot, sheet);
    expect(shadowRoot.adoptedStyleSheets).toContain(sheet);

    // Move the host to a different parent inside the same document
    parentB.appendChild(host);

    // Shadow root identity preserved, adoptions preserved
    expect(host.shadowRoot).toBe(shadowRoot);
    expect(shadowRoot.adoptedStyleSheets).toContain(sheet);
    expect(countOccurrences(shadowRoot.adoptedStyleSheets, sheet)).toBe(1);

    // Release works on the same ShadowRoot reference
    removeStyleSheet(shadowRoot, sheet);
    expect(shadowRoot.adoptedStyleSheets).not.toContain(sheet);
  });

  test("children using addGlobalStyleSheet survive host movement", () => {
    // A child inside a shadow root has getRootNode() === shadowRoot. Moving
    // the host around does not change that, so global adoptions on children
    // remain on the same shadow root throughout.
    const parentA = createElement();
    const parentB = createElement();

    const host = document.createElement("div");
    const shadowRoot = host.attachShadow({ mode: "open" });
    parentA.appendChild(host);

    const child = createElementInShadow(shadowRoot);
    const sheet = createSheet(":host { --shm-2: 1; }");

    addGlobalStyleSheet(child, sheet);
    expect(shadowRoot.adoptedStyleSheets).toContain(sheet);
    expect(document.adoptedStyleSheets).not.toContain(sheet);

    // Move host — child's rootNode does NOT change
    parentB.appendChild(host);
    expect(child.getRootNode()).toBe(shadowRoot);
    expect(shadowRoot.adoptedStyleSheets).toContain(sheet);
    expect(document.adoptedStyleSheets).not.toContain(sheet);

    // Clean release uses the same ref
    removeGlobalStyleSheet(child, sheet);
    expect(shadowRoot.adoptedStyleSheets).not.toContain(sheet);
  });

  test("mixed APIs on the shadow root survive host movement", () => {
    const parentA = createElement();
    const parentB = createElement();

    const host = document.createElement("div");
    const shadowRoot = host.attachShadow({ mode: "open" });
    parentA.appendChild(host);

    const child = createElementInShadow(shadowRoot);
    const sheet = createSheet(":host { --shm-3: 1; }");

    // Both APIs hold a reference on the same shadow root
    addGlobalStyleSheet(child, sheet);
    addStyleSheet(shadowRoot, sheet);
    addStyleSheet(shadowRoot, sheet);

    expect(countOccurrences(shadowRoot.adoptedStyleSheets, sheet)).toBe(1);

    // Move host around repeatedly
    parentB.appendChild(host);
    parentA.appendChild(host);
    parentB.appendChild(host);

    // State is intact after movement
    expect(countOccurrences(shadowRoot.adoptedStyleSheets, sheet)).toBe(1);

    // Release all refs: one global + two per-node
    removeGlobalStyleSheet(child, sheet);
    expect(shadowRoot.adoptedStyleSheets).toContain(sheet);
    removeStyleSheet(shadowRoot, sheet);
    expect(shadowRoot.adoptedStyleSheets).toContain(sheet);
    removeStyleSheet(shadowRoot, sheet);
    expect(shadowRoot.adoptedStyleSheets).not.toContain(sheet);
  });

  test("host moving into another shadow root keeps its own shadow intact", () => {
    // Build two independent shadow hosts
    const { shadowRoot: outerShadow } = createShadowHost();

    const host = document.createElement("div");
    const hostShadow = host.attachShadow({ mode: "open" });
    document.body.appendChild(host);

    const sheet = createSheet(":host { --shm-4: 1; }");
    addStyleSheet(hostShadow, sheet);

    // Move host into the outer shadow root
    outerShadow.appendChild(host);

    // The host's OWN shadow root keeps its adoption (identity preserved)
    expect(host.shadowRoot).toBe(hostShadow);
    expect(hostShadow.adoptedStyleSheets).toContain(sheet);

    // The outer shadow root is NOT affected by the host's own adoption
    expect(outerShadow.adoptedStyleSheets).not.toContain(sheet);
    expect(document.adoptedStyleSheets).not.toContain(sheet);

    removeStyleSheet(hostShadow, sheet);
    expect(hostShadow.adoptedStyleSheets).not.toContain(sheet);
  });

  test("host's own global ref tracks its new root on a proper lifecycle round-trip", () => {
    // The host itself (as an element) uses the global API. When it moves
    // between roots, the documented pattern is: release in disconnectedCallback
    // and re-add in connectedCallback. This test exercises that.
    const { shadowRoot: outerShadow } = createShadowHost();

    const host = document.createElement("div");
    host.attachShadow({ mode: "open" });
    document.body.appendChild(host);

    const sheet = createSheet(":root, :host { --shm-5: 1; }");

    // Host adopts via global while in document
    addGlobalStyleSheet(host, sheet);
    expect(document.adoptedStyleSheets).toContain(sheet);
    expect(outerShadow.adoptedStyleSheets).not.toContain(sheet);

    // Proper lifecycle: release, move, re-add
    removeGlobalStyleSheet(host, sheet);
    outerShadow.appendChild(host);
    addGlobalStyleSheet(host, sheet);

    // Document released, outer shadow adopted
    expect(document.adoptedStyleSheets).not.toContain(sheet);
    expect(outerShadow.adoptedStyleSheets).toContain(sheet);

    removeGlobalStyleSheet(host, sheet);
    expect(outerShadow.adoptedStyleSheets).not.toContain(sheet);
  });

  test("multiple nested shadow hosts moved together preserve all inner state", () => {
    // A host contains another shadow host. Inner shadow holds adoptions.
    // Moving the outer host must not disturb any of that.
    const parentA = createElement();
    const parentB = createElement();

    const outerHost = document.createElement("div");
    const outerShadow = outerHost.attachShadow({ mode: "open" });
    parentA.appendChild(outerHost);

    const innerHost = document.createElement("div");
    const innerShadow = innerHost.attachShadow({ mode: "open" });
    outerShadow.appendChild(innerHost);

    const childInInner = createElementInShadow(innerShadow);

    const sheetInner = createSheet(":host { --shm-6a: 1; }");
    const sheetInnerNode = createSheet(":host { --shm-6b: 1; }");
    const sheetOuter = createSheet(":host { --shm-6c: 1; }");

    addGlobalStyleSheet(childInInner, sheetInner);
    addStyleSheet(innerShadow, sheetInnerNode);
    addStyleSheet(outerShadow, sheetOuter);

    // Move outer host to a different parent in the document
    parentB.appendChild(outerHost);

    // Every inner adoption is preserved across the move
    expect(innerShadow.adoptedStyleSheets).toContain(sheetInner);
    expect(innerShadow.adoptedStyleSheets).toContain(sheetInnerNode);
    expect(outerShadow.adoptedStyleSheets).toContain(sheetOuter);
    expect(document.adoptedStyleSheets).not.toContain(sheetInner);
    expect(document.adoptedStyleSheets).not.toContain(sheetInnerNode);
    expect(document.adoptedStyleSheets).not.toContain(sheetOuter);

    // All references release cleanly via the original references
    removeGlobalStyleSheet(childInInner, sheetInner);
    removeStyleSheet(innerShadow, sheetInnerNode);
    removeStyleSheet(outerShadow, sheetOuter);

    expect(innerShadow.adoptedStyleSheets).not.toContain(sheetInner);
    expect(innerShadow.adoptedStyleSheets).not.toContain(sheetInnerNode);
    expect(outerShadow.adoptedStyleSheets).not.toContain(sheetOuter);
  });
});
