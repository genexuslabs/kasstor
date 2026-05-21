// Server-side guards for the `sharedDesignSystemStyles` runtime.
//
// This file lives next to the e2e suite but uses the `.spec.ts` extension so
// vitest picks it up under the "unit" project (Node environment) instead of
// the chromium browser project. Vitest resolves
// `@genexus/kasstor-core/decorators/component.js` through the package's
// `exports` map and, in Node, picks the `node` → `development` condition.
// That entry is the prebuilt module where `IS_SERVER === true`, which is the
// exact branch we want to exercise.
//
// Two SSR-only guarantees are pinned down:
//
//   1. The decorator's CSR-style processing is dead-code-eliminated on the
//      server: no calls to `new CSSStyleSheet`, no fetch, no promise slot
//      on the prototype. The decorator only stores the `names` list so the
//      runtime SSR render-patch can emit `<link>` tags later.
//
//   2. The runtime `applySharedDesignSystemStylesForSSR` throws when a
//      declared bundle has not been registered with `registerDesignSystem`.
//      This surfaces misconfigured SSR builds at element-upgrade time
//      instead of letting them silently emit a degraded page.
//
// Lit's `@lit-labs/ssr-dom-shim` provides a minimal `customElements`
// implementation in Node; we mount it on `globalThis` so the decorator's
// `customElements.define` call has somewhere to register.

import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { registerDesignSystem } from "@genexus/kasstor-design-system/register-design-system.js";
import { CustomElementRegistry } from "@lit-labs/ssr-dom-shim";
import { html } from "lit";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";

beforeAll(() => {
  if (globalThis.customElements === undefined) {
    globalThis.customElements = new CustomElementRegistry();
  }
});

const findSymbol = (target: object, description: string): symbol | undefined =>
  Object.getOwnPropertySymbols(target).find(s => s.description === description);

function readPrototypeSlot<T>(ctor: CustomElementConstructor, description: string): T | undefined {
  const symbol = findSymbol(ctor.prototype, description);
  if (symbol === undefined) {
    return undefined;
  }
  return (ctor.prototype as Record<symbol, T>)[symbol];
}

describe("[Decorator] [Component] [sharedDesignSystemStyles] [server-side guards]", () => {
  let tagCounter = 0;
  const uniqueTag = (): `kst-${string}` => `kst-ssr-guard-${++tagCounter}`;

  beforeEach(() => {
    if (!(globalThis.customElements instanceof CustomElementRegistry)) {
      globalThis.customElements = new CustomElementRegistry();
    }
    // Reset the design-system registry between tests.
    globalThis.geneXusDesignSystemsRegistry?.clear();
    globalThis.geneXusDesignSystemsLoaders?.clear();
    globalThis.geneXusDesignSystemsStyleSheets?.clear();
    globalThis.geneXusDesignSystemsStyleSheetPromises?.clear();
  });

  describe("decoration-time guard: no CSR-style processing on the server", () => {
    test("registering a component with `sharedDesignSystemStyles` does NOT throw under `IS_SERVER=true` (no `new CSSStyleSheet`, no `document.head` access)", () => {
      const TAG = uniqueTag();

      class C extends KasstorElement {
        override render() {
          return html`<p>server</p>`;
        }
      }
      registerDesignSystem("ds-server-guard-no-throw", {
        bundleLoaders: { "ssr-guard-no-throw": "/styles/ssr-guard-no-throw.css" }
      });

      // If the decorator went down the CSR path it would call
      // `getStylesheetsAndPromisesForSharedStyles`, which constructs a new
      // `CSSStyleSheet` for the link in `document.head` — neither of which
      // exists in Node. The IS_SERVER guard must prevent that path.
      expect(() =>
        Component({
          tag: TAG,
          sharedDesignSystemStyles: ["ssr-guard-no-throw"]
        })(C as never)
      ).not.toThrow();
    });

    test("the `stylesheets` and `promises` prototype slots are NOT populated on the server (the CSR processing was skipped)", () => {
      const TAG = uniqueTag();
      registerDesignSystem("ds-server-guard-no-slots", {
        bundleLoaders: { "ssr-guard-no-slots": "/styles/ssr-guard-no-slots.css" }
      });

      class C extends KasstorElement {
        override render() {
          return html`<p>server</p>`;
        }
      }
      Component({
        tag: TAG,
        sharedDesignSystemStyles: ["ssr-guard-no-slots"]
      })(C as never);

      const ctor = customElements.get(TAG)!;

      // No runtime stylesheets array — the helper that builds it was never
      // invoked on the server.
      expect(
        readPrototypeSlot<CSSStyleSheet[] | undefined>(
          ctor,
          "kasstor-shared-design-system-stylesheets"
        )
      ).toBeUndefined();

      // No joined promise either.
      expect(
        readPrototypeSlot<Promise<void> | undefined>(
          ctor,
          "kasstor-shared-design-system-stylesheet-promises"
        )
      ).toBeUndefined();
    });

    test("the `names` prototype slot IS populated on the server — the SSR render-patch needs it to emit `<link>` tags", () => {
      const TAG = uniqueTag();
      registerDesignSystem("ds-server-guard-names", {
        bundleLoaders: {
          "ssr-guard-names-a": "/styles/ssr-guard-names-a.css",
          "ssr-guard-names-b": "/styles/ssr-guard-names-b.css"
        }
      });

      class C extends KasstorElement {
        override render() {
          return html`<p>server</p>`;
        }
      }
      Component({
        tag: TAG,
        sharedDesignSystemStyles: ["ssr-guard-names-a", "ssr-guard-names-b"]
      })(C as never);

      const ctor = customElements.get(TAG)!;

      expect(
        readPrototypeSlot<string[] | undefined>(
          ctor,
          "kasstor-shared-design-system-stylesheet-names"
        )
      ).toEqual(["ssr-guard-names-a", "ssr-guard-names-b"]);
    });

    test("a component declared WITHOUT `sharedDesignSystemStyles` has every related slot left untouched on the server", () => {
      const TAG = uniqueTag();

      class C extends KasstorElement {
        override render() {
          return html`<p>server</p>`;
        }
      }
      Component({ tag: TAG })(C as never);

      const ctor = customElements.get(TAG)!;
      for (const description of [
        "kasstor-shared-design-system-stylesheet-names",
        "kasstor-shared-design-system-stylesheets",
        "kasstor-shared-design-system-stylesheet-promises"
      ]) {
        expect(
          readPrototypeSlot<unknown>(ctor, description),
          `Slot "${description}" should be undefined when the option is omitted`
        ).toBeUndefined();
      }
    });
  });

  describe("constructor-time fail-fast: unregistered bundle throws on the server", () => {
    test("instantiating a SSR'd component with an unregistered bundle throws — the error names the missing bundle", () => {
      const TAG = uniqueTag();

      class C extends KasstorElement {
        override render() {
          return html`<p>server</p>`;
        }
      }
      Component({
        tag: TAG,
        sharedDesignSystemStyles: ["ssr-guard-missing-bundle"]
      })(C as never);

      const Ctor = customElements.get(TAG)!;

      // Construction triggers `applySharedDesignSystemStylesForSSR` via
      // `componentWasServerSideRendered`, which returns `true` whenever
      // `IS_SERVER` is true (regardless of shadow-root content). The
      // unregistered bundle must surface as a thrown Error.
      expect(() => new (Ctor as new () => unknown)()).toThrow(/ssr-guard-missing-bundle/);
    });

    test("the thrown error mentions `registerDesignSystem` so the developer knows how to fix it", () => {
      const TAG = uniqueTag();

      class C extends KasstorElement {
        override render() {
          return html`<p>server</p>`;
        }
      }
      Component({
        tag: TAG,
        sharedDesignSystemStyles: ["ssr-guard-points-to-fix"]
      })(C as never);

      const Ctor = customElements.get(TAG)!;

      let caught: unknown;
      try {
        new (Ctor as new () => unknown)();
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(Error);
      expect((caught as Error).message).toMatch(/registerDesignSystem/);
    });

    test("a fully-registered design system does NOT throw on the server — every declared bundle resolves to a URL", () => {
      const TAG = uniqueTag();

      registerDesignSystem("ds-server-guard-happy-path", {
        bundleLoaders: {
          "ssr-guard-happy-a": "/styles/ssr-guard-happy-a.css",
          "ssr-guard-happy-b": "/styles/ssr-guard-happy-b.css"
        }
      });

      class C extends KasstorElement {
        override render() {
          return html`<p>server</p>`;
        }
      }
      Component({
        tag: TAG,
        sharedDesignSystemStyles: ["ssr-guard-happy-a", "ssr-guard-happy-b"]
      })(C as never);

      const Ctor = customElements.get(TAG)!;
      expect(() => new (Ctor as new () => unknown)()).not.toThrow();
    });

    test("partial registration: the first unregistered bundle throws even if later bundles in the list ARE registered", () => {
      const TAG = uniqueTag();

      registerDesignSystem("ds-server-guard-partial", {
        bundleLoaders: {
          "ssr-guard-partial-known": "/styles/ssr-guard-partial-known.css"
        }
      });

      class C extends KasstorElement {
        override render() {
          return html`<p>server</p>`;
        }
      }
      Component({
        tag: TAG,
        sharedDesignSystemStyles: ["ssr-guard-partial-missing", "ssr-guard-partial-known"]
      })(C as never);

      const Ctor = customElements.get(TAG)!;
      expect(() => new (Ctor as new () => unknown)()).toThrow(/ssr-guard-partial-missing/);
    });
  });
});
