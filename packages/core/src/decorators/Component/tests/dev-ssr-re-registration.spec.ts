// Unit test for the `@Component` decorator's dev-time SSR re-registration
// (see `docs/decorators.md → Dev-time SSR re-registration`).
//
// Lives in kasstor-core (rather than only in `@genexus/vite-plugin-kasstor`'s
// integration spec) so that anyone editing the decorator sees the regression
// fire in the SAME package's CI — no need to go look in another package to
// realize a fix was reverted.
//
// Vitest resolves `@genexus/kasstor-core/decorators/component.js` through the
// package's `exports` map and, in a Node test environment, picks the `node`
// → `development` condition. That entry is the prebuilt module where
// `IS_SERVER` is `true` and `DEV_MODE` is `true`, which is the exact branch
// the test wants to exercise. Importing the TypeScript source instead would
// resolve to `IS_SERVER = false` and skip the branch entirely.

import {
  Component,
  KasstorElement
} from "@genexus/kasstor-core/decorators/component.js";
import { CustomElementRegistry } from "@lit-labs/ssr-dom-shim";
import { html } from "lit";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";

// `customElements` is the globalThis registry the decorator reads from. Lit's
// SSR dom-shim provides it; we install a fresh registry here so we don't need
// to boot all of `@lit-labs/ssr` just to exercise the decorator.
beforeAll(() => {
  if (globalThis.customElements === undefined) {
    globalThis.customElements = new CustomElementRegistry();
  }
});

describe("@Component — dev-time SSR re-registration", () => {
  let tagCounter = 0;
  const uniqueTag = (): `kst-${string}` => `kst-rereg-${++tagCounter}`;

  beforeEach(() => {
    // Defensive: if another spec installs a non-shim registry on globalThis
    // we replace it with the shim so the decorator's eviction path can run.
    if (!(globalThis.customElements instanceof CustomElementRegistry)) {
      globalThis.customElements = new CustomElementRegistry();
    }
  });

  test("re-applying @Component with a different class for the same tag makes the NEW class win", () => {
    const TAG = uniqueTag();

    class V1 extends KasstorElement {
      override render() {
        return html`<p>v1</p>`;
      }
    }
    Component({ tag: TAG })(V1);
    expect(customElements.get(TAG)).toBe(V1);

    class V2 extends KasstorElement {
      override render() {
        return html`<p>v2</p>`;
      }
    }
    Component({ tag: TAG })(V2);

    // The whole contract in one assertion: without the dev-SSR eviction in
    // the decorator this would still be `V1` (the early-return path) and
    // every subsequent SSR render would emit V1's HTML.
    expect(
      customElements.get(TAG),
      "Decorator did not re-register the tag with the new class. Check the `DEV_MODE && IS_SERVER` branch in `src/decorators/Component/index.ts`."
    ).toBe(V2);
  });

  test("repeated re-applications (V1 → V2 → V3 → V4) all succeed and the latest class wins each step", () => {
    const TAG = uniqueTag();

    const classes = Array.from(
      { length: 4 },
      () =>
        class extends KasstorElement {
          override render() {
            return html`<p>x</p>`;
          }
        }
    );

    for (const cls of classes) {
      Component({ tag: TAG })(cls);
      expect(customElements.get(TAG)).toBe(cls);
    }
  });

  test("re-applying does not throw even though the dom-shim's `__reverseDefinitions` keeps stale entries (best-effort cleanup)", () => {
    const TAG = uniqueTag();

    class V1 extends KasstorElement {
      override render() {
        return html`<p>v1</p>`;
      }
    }
    Component({ tag: TAG })(V1);

    class V2 extends KasstorElement {
      override render() {
        return html`<p>v2</p>`;
      }
    }
    // The fix deliberately does NOT touch `__reverseDefinitions` (it's only
    // consulted by the shim's `getName` and the strict ctor-already-used
    // check). Pin that down so a future "cleanup" doesn't accidentally make
    // the next `define` call throw.
    expect(() => Component({ tag: TAG })(V2)).not.toThrow();
    expect(customElements.get(TAG)).toBe(V2);
  });

  test("first application of a tag uses the normal `customElements.define` path (no eviction needed)", () => {
    const TAG = uniqueTag();

    class V1 extends KasstorElement {
      override render() {
        return html`<p>v1</p>`;
      }
    }
    // The eviction branch only runs when `existing && existing !== target`.
    // First-time application must take the regular path and define the tag
    // without prior cleanup work.
    Component({ tag: TAG })(V1);
    expect(customElements.get(TAG)).toBe(V1);
  });
});
