// Unit test for the `@Component` decorator's dev-time SSR re-registration
// (see `docs/decorators.md → Dev-time SSR re-registration`).
//
// Why this test lives in kasstor-core and not next to the integration test in
// `@genexus/vite-plugin-kasstor`: the fix itself is in the decorator. If
// someone edits `src/decorators/Component/index.ts` and accidentally reverts
// the `DEV_MODE && IS_SERVER` branch, the package's own CI should catch it —
// without needing to spin up Vite, chokidar, and `@lit-labs/ssr` end-to-end.
// The plugin spec stays as a higher-level regression test for the full
// dev-cycle pipeline (Vite cache invalidation + decorator + watcher).
//
// To exercise the actual branch the test imports the BUILT node-development
// dist, where `IS_SERVER` is `true`. Importing the TypeScript source
// (`../index.js`) would resolve to `IS_SERVER = false` (it's a build-time
// constant that Vite/tsc swap when emitting the node bundle) and the branch
// would be skipped entirely.

// eslint-disable-next-line import/no-relative-packages
import { CustomElementRegistry } from "@lit-labs/ssr-dom-shim";
import { html } from "lit";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";

// Built node-development entry — `IS_SERVER = true`, `DEV_MODE = true`.
// Resolving via the package's exports map gives us the same module a real
// SSR consumer would load, without ambient changes to the source path.
import {
  Component,
  KasstorElement
  // eslint-disable-next-line import/no-relative-packages
} from "../../../../dist/node/development/decorators/Component/index.js";

// `customElements` is the globalThis registry the decorator reads from.
// Lit's SSR dom-shim provides it; in this test we install a fresh registry
// onto `globalThis` ourselves so we don't need to boot `@lit-labs/ssr` just
// to exercise the decorator.
beforeAll(() => {
  if ((globalThis as { customElements?: unknown }).customElements === undefined) {
    (globalThis as { customElements: CustomElementRegistry }).customElements =
      new CustomElementRegistry();
  }
});

/** Reads the constructor registered for `tag`. Narrows the DOM lib type. */
function ctorOf(tag: string): unknown {
  return (
    globalThis as { customElements: { get(t: string): unknown } }
  ).customElements.get(tag);
}

describe("@Component — dev-time SSR re-registration", () => {
  // Each test uses a unique tag so cross-test pollution can't mask bugs.
  // Tag base is the test name; tests append a marker to disambiguate.
  let tagCounter = 0;
  const uniqueTag = () => `kst-rereg-${++tagCounter}`;

  beforeEach(() => {
    // Defensive: if anything earlier filled in `customElements` with a non-shim
    // value (e.g. a future test importer), make sure we still have the shim
    // before each test runs.
    if (
      !((globalThis as { customElements?: unknown }).customElements instanceof
        CustomElementRegistry)
    ) {
      (globalThis as { customElements: CustomElementRegistry }).customElements =
        new CustomElementRegistry();
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
    expect(ctorOf(TAG)).toBe(V1);

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
      ctorOf(TAG),
      "Decorator did not re-register the tag with the new class. Check the `DEV_MODE && IS_SERVER` branch in `src/decorators/Component/index.ts`."
    ).toBe(V2);
  });

  test("repeated re-applications (V1 → V2 → V3 → V4) all succeed and the latest class wins each step", () => {
    const TAG = uniqueTag();

    const classes = Array.from({ length: 4 }, () =>
      class extends KasstorElement {
        override render() {
          return html`<p>x</p>`;
        }
      }
    );

    for (const cls of classes) {
      Component({ tag: TAG })(cls);
      expect(ctorOf(TAG)).toBe(cls);
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
    // Would throw inside the shim's `define` if the decorator's eviction
    // accidentally re-cleaned the reverse map AND something later relied on
    // ctor-based lookup. Today we deliberately don't touch the reverse map;
    // pin that down so a future "cleanup" doesn't sneak in a behavior change.
    expect(() => Component({ tag: TAG })(V2)).not.toThrow();
    expect(ctorOf(TAG)).toBe(V2);
  });

  test("first application of a tag uses the normal `customElements.define` path (no eviction needed)", () => {
    const TAG = uniqueTag();

    class V1 extends KasstorElement {
      override render() {
        return html`<p>v1</p>`;
      }
    }
    // The eviction branch is only entered when `existing && existing !== target`.
    // First-time application must take the regular path and define the tag
    // without any prior cleanup work. Asserting on the resulting registration
    // is the simplest way to lock that down.
    Component({ tag: TAG })(V1);
    expect(ctorOf(TAG)).toBe(V1);
  });
});
