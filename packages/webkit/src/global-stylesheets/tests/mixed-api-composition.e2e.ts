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
// These tests validate the interplay between the global API (element-based,
// idempotent) and the per-node API (node-based, not idempotent) at a deeper
// level: movement across roots, nested shadow roots, order independence,
// and a randomized stress scenario.
// ---------------------------------------------------------------------------

describe("Composition — idempotency boundary", () => {
  test("global is idempotent per element; per-node is not", () => {
    const el = createElement();
    const sheet = createSheet(":root { --mix-i1: 1; }");

    // 3 global adds for the same element = 1 ref (idempotent)
    addGlobalStyleSheet(el, sheet);
    addGlobalStyleSheet(el, sheet);
    addGlobalStyleSheet(el, sheet);

    // 3 per-node adds = 3 refs (not idempotent)
    addStyleSheet(document, sheet);
    addStyleSheet(document, sheet);
    addStyleSheet(document, sheet);

    // Sheet is only present once in adoptedStyleSheets
    expect(countOccurrences(document.adoptedStyleSheets, sheet)).toBe(1);

    // Releasing the global ref (single call) leaves 3 per-node refs alive
    removeGlobalStyleSheet(el, sheet);
    expect(document.adoptedStyleSheets).toContain(sheet);

    // Needs 3 per-node releases to reach 0
    removeStyleSheet(document, sheet);
    expect(document.adoptedStyleSheets).toContain(sheet);
    removeStyleSheet(document, sheet);
    expect(document.adoptedStyleSheets).toContain(sheet);
    removeStyleSheet(document, sheet);
    expect(document.adoptedStyleSheets).not.toContain(sheet);
  });

  test("two different elements via global + extra per-node refs", () => {
    const elA = createElement();
    const elB = createElement();
    const sheet = createSheet(":root { --mix-i2: 1; }");

    // 2 distinct global refs (one per element) + 2 per-node refs = 4 total
    addGlobalStyleSheet(elA, sheet);
    addGlobalStyleSheet(elB, sheet);
    addStyleSheet(document, sheet);
    addStyleSheet(document, sheet);

    // Release all but one — sheet should persist
    removeGlobalStyleSheet(elA, sheet);
    removeGlobalStyleSheet(elB, sheet);
    removeStyleSheet(document, sheet);
    expect(document.adoptedStyleSheets).toContain(sheet);

    // Last release
    removeStyleSheet(document, sheet);
    expect(document.adoptedStyleSheets).not.toContain(sheet);
  });
});

describe("Composition — element movement with both APIs", () => {
  test("element moves between roots while per-node refs exist on both", () => {
    const { shadowRoot } = createShadowHost();
    const el = createElement();
    const sheet = createSheet(":root, :host { --mix-m1: 1; }");

    // Document has a per-node ref that must persist through everything
    addStyleSheet(document, sheet);
    // Element adopts via global (root = document)
    addGlobalStyleSheet(el, sheet);

    expect(document.adoptedStyleSheets).toContain(sheet);

    // Lifecycle: simulate disconnect, move to shadow root, reconnect
    removeGlobalStyleSheet(el, sheet);
    // Per-node ref on document still alive
    expect(document.adoptedStyleSheets).toContain(sheet);

    shadowRoot.appendChild(el);
    addGlobalStyleSheet(el, sheet);

    // Sheet now in both roots, each via independent ref counts
    expect(document.adoptedStyleSheets).toContain(sheet);
    expect(shadowRoot.adoptedStyleSheets).toContain(sheet);

    // Add a per-node ref on the shadow root too
    addStyleSheet(shadowRoot, sheet);

    // Tear down: element disconnects from shadow, global ref released
    removeGlobalStyleSheet(el, sheet);
    // Shadow root still has per-node ref
    expect(shadowRoot.adoptedStyleSheets).toContain(sheet);

    removeStyleSheet(shadowRoot, sheet);
    expect(shadowRoot.adoptedStyleSheets).not.toContain(sheet);

    // Document still has per-node ref from the start
    expect(document.adoptedStyleSheets).toContain(sheet);
    removeStyleSheet(document, sheet);
    expect(document.adoptedStyleSheets).not.toContain(sheet);
  });

  test("element moves, its own global ref tracks new root (no stale adoption)", () => {
    const { shadowRoot } = createShadowHost();
    const el = createElement();
    const sheet = createSheet(":root, :host { --mix-m2: 1; }");

    addGlobalStyleSheet(el, sheet);
    expect(document.adoptedStyleSheets).toContain(sheet);

    // Proper lifecycle: release before moving
    removeGlobalStyleSheet(el, sheet);
    shadowRoot.appendChild(el);
    addGlobalStyleSheet(el, sheet);

    // Document no longer adopts; shadow root does
    expect(document.adoptedStyleSheets).not.toContain(sheet);
    expect(shadowRoot.adoptedStyleSheets).toContain(sheet);
  });
});

describe("Composition — multiple sheets through mixed APIs", () => {
  test("different sheets routed via different APIs on same node", () => {
    const el = createElement();
    const sheetG = createSheet(":root { --mix-ms1a: 1; }");
    const sheetN = createSheet(":root { --mix-ms1b: 1; }");

    addGlobalStyleSheet(el, sheetG);
    addStyleSheet(document, sheetN);

    expect(document.adoptedStyleSheets).toContain(sheetG);
    expect(document.adoptedStyleSheets).toContain(sheetN);

    removeGlobalStyleSheet(el, sheetG);
    expect(document.adoptedStyleSheets).not.toContain(sheetG);
    expect(document.adoptedStyleSheets).toContain(sheetN);

    removeStyleSheet(document, sheetN);
    expect(document.adoptedStyleSheets).not.toContain(sheetN);
  });

  test("removing one sheet does not affect the other's ref counts", () => {
    const elA = createElement();
    const elB = createElement();
    const sheetX = createSheet(":root { --mix-ms2a: 1; }");
    const sheetY = createSheet(":root { --mix-ms2b: 1; }");

    addGlobalStyleSheet(elA, sheetX);
    addStyleSheet(document, sheetX);
    addGlobalStyleSheet(elB, sheetY);
    addStyleSheet(document, sheetY);

    // Release all refs for X
    removeGlobalStyleSheet(elA, sheetX);
    removeStyleSheet(document, sheetX);

    // Y must still be adopted
    expect(document.adoptedStyleSheets).not.toContain(sheetX);
    expect(document.adoptedStyleSheets).toContain(sheetY);

    removeGlobalStyleSheet(elB, sheetY);
    removeStyleSheet(document, sheetY);
    expect(document.adoptedStyleSheets).not.toContain(sheetY);
  });
});

describe("Composition — nested shadow roots", () => {
  test("global resolves to immediate containing root; per-node targets any level", () => {
    // Outer shadow host inside the document, inner shadow host inside outer
    const { shadowRoot: outer } = createShadowHost();
    const innerHost = document.createElement("div");
    outer.appendChild(innerHost);
    const inner = innerHost.attachShadow({ mode: "open" });

    const el = document.createElement("div");
    inner.appendChild(el);

    const sheet = createSheet(":host { --mix-ns1: 1; }");

    // Global adopts on the inner root (closest)
    addGlobalStyleSheet(el, sheet);
    expect(inner.adoptedStyleSheets).toContain(sheet);
    expect(outer.adoptedStyleSheets).not.toContain(sheet);
    expect(document.adoptedStyleSheets).not.toContain(sheet);

    // Per-node on the outer root — independent ref count
    addStyleSheet(outer, sheet);
    expect(outer.adoptedStyleSheets).toContain(sheet);

    // Per-node on the document too
    addStyleSheet(document, sheet);
    expect(document.adoptedStyleSheets).toContain(sheet);

    // All three roots adopt the sheet independently
    expect(countOccurrences(inner.adoptedStyleSheets, sheet)).toBe(1);
    expect(countOccurrences(outer.adoptedStyleSheets, sheet)).toBe(1);
    expect(countOccurrences(document.adoptedStyleSheets, sheet)).toBe(1);

    // Release each independently
    removeGlobalStyleSheet(el, sheet);
    expect(inner.adoptedStyleSheets).not.toContain(sheet);
    expect(outer.adoptedStyleSheets).toContain(sheet);
    expect(document.adoptedStyleSheets).toContain(sheet);

    removeStyleSheet(outer, sheet);
    expect(outer.adoptedStyleSheets).not.toContain(sheet);
    expect(document.adoptedStyleSheets).toContain(sheet);

    removeStyleSheet(document, sheet);
    expect(document.adoptedStyleSheets).not.toContain(sheet);
  });
});

describe("Composition — coexistence with external mutations", () => {
  test("pre-existing adoptedStyleSheets on a node are untouched", () => {
    const preExisting = createSheet(":root { --pre-mix: 1; }");
    document.adoptedStyleSheets.push(preExisting);

    const el = createElement();
    const sheet = createSheet(":root { --mix-pre1: 1; }");

    addGlobalStyleSheet(el, sheet);
    addStyleSheet(document, sheet);

    expect(document.adoptedStyleSheets).toContain(preExisting);
    expect(document.adoptedStyleSheets).toContain(sheet);

    removeStyleSheet(document, sheet);
    removeGlobalStyleSheet(el, sheet);

    expect(document.adoptedStyleSheets).toContain(preExisting);
    expect(document.adoptedStyleSheets).not.toContain(sheet);
  });

  test("external removal mid-lifecycle — subsequent releases are safe", () => {
    const el = createElement();
    const sheet = createSheet(":root { --mix-ext1: 1; }");

    addGlobalStyleSheet(el, sheet);
    addStyleSheet(document, sheet);
    expect(document.adoptedStyleSheets).toContain(sheet);

    // Externally yank the sheet out while both APIs still think it's adopted
    const idx = document.adoptedStyleSheets.indexOf(sheet);
    document.adoptedStyleSheets.splice(idx, 1);
    expect(document.adoptedStyleSheets).not.toContain(sheet);

    // Releases must not throw and must leave internal state clean enough to
    // allow re-adoption afterwards
    expect(() => removeGlobalStyleSheet(el, sheet)).not.toThrow();
    expect(() => removeStyleSheet(document, sheet)).not.toThrow();

    // Re-adopt via a fresh element / fresh per-node call — both work
    const elNew = createElement();
    addGlobalStyleSheet(elNew, sheet);
    expect(document.adoptedStyleSheets).toContain(sheet);

    removeGlobalStyleSheet(elNew, sheet);
    expect(document.adoptedStyleSheets).not.toContain(sheet);
  });
});

describe("Composition — order independence & stress", () => {
  test("balanced sequence in any order reaches clean final state", () => {
    // Build a set of balanced (add, remove) operations across multiple
    // elements, sheets and roots, shuffle them, and verify that after all
    // runs the DOM is clean.
    const { shadowRoot: sA } = createShadowHost();
    const { shadowRoot: sB } = createShadowHost();
    const roots: Array<Document | ShadowRoot> = [document, sA, sB];

    const sheets = [
      createSheet(":root, :host { --mix-ord1: 1; }"),
      createSheet(":root, :host { --mix-ord2: 1; }"),
      createSheet(":root, :host { --mix-ord3: 1; }")
    ];

    type Op = () => void;
    const pairs: Array<{ add: Op; remove: Op }> = [];

    // Global pairs — 2 elements per root × each sheet
    for (const root of roots) {
      for (const sheet of sheets) {
        for (let i = 0; i < 2; i++) {
          const el =
            root === document
              ? createElement()
              : createElementInShadow(root as ShadowRoot);
          pairs.push({
            add: () => addGlobalStyleSheet(el, sheet),
            remove: () => removeGlobalStyleSheet(el, sheet)
          });
        }
      }
    }

    // Per-node pairs — 3 per (root, sheet)
    for (const root of roots) {
      for (const sheet of sheets) {
        for (let i = 0; i < 3; i++) {
          pairs.push({
            add: () => addStyleSheet(root, sheet),
            remove: () => removeStyleSheet(root, sheet)
          });
        }
      }
    }

    // Seeded PRNG for determinism
    let seed = 0xdeadbeef;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
    const shuffle = <T>(arr: T[]) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    // Run all adds in a random order
    shuffle(pairs.slice()).forEach(p => p.add());

    // Invariant: each sheet appears at most once per root while adds happen
    for (const root of roots) {
      for (const sheet of sheets) {
        expect(countOccurrences(root.adoptedStyleSheets, sheet)).toBe(1);
      }
    }

    // Run all removes in a different random order
    shuffle(pairs.slice()).forEach(p => p.remove());

    // Final state: none of the sheets remain anywhere
    for (const root of roots) {
      for (const sheet of sheets) {
        expect(root.adoptedStyleSheets).not.toContain(sheet);
      }
    }
  });

  test("rapid mixed add/remove cycles leave no residue", () => {
    const sheet = createSheet(":root { --mix-stress1: 1; }");
    const { shadowRoot } = createShadowHost();

    for (let i = 0; i < 50; i++) {
      const el =
        i % 2 === 0 ? createElement() : createElementInShadow(shadowRoot);
      const target = i % 2 === 0 ? document : shadowRoot;

      addGlobalStyleSheet(el, sheet);
      addStyleSheet(target, sheet);
      addStyleSheet(target, sheet);

      // At any moment the sheet is adopted exactly once in the active root
      expect(countOccurrences(target.adoptedStyleSheets, sheet)).toBe(1);

      removeStyleSheet(target, sheet);
      removeGlobalStyleSheet(el, sheet);
      removeStyleSheet(target, sheet);
    }

    expect(document.adoptedStyleSheets).not.toContain(sheet);
    expect(shadowRoot.adoptedStyleSheets).not.toContain(sheet);
  });
});
