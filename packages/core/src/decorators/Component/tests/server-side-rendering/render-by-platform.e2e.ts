// Tests for the `renderByPlatform` directive interaction with SSR.
//
// Behavior contract:
// - On an SSR'd component, the directive returns the `serverValue` during the
//   first update (to avoid a hydration mismatch) and then queues a microtask
//   to flip to the `browserValue`.
// - On a normal client mount (no SSR), the directive returns the `browserValue`
//   straight away — no flicker, no microtask flip.
// - When `serverValue` is omitted, the directive renders nothing on the server
//   and only fills in `browserValue` after hydration.

import { afterEach, describe, expect, test } from "vitest";
import { cleanup } from "vitest-browser-lit";
import { Component, KasstorElement } from "../../index.js";
import {
  cleanupSsrHosts,
  makeSsrRenderByPlatformBrowserOnlyClass,
  makeSsrRenderByPlatformClass,
  setupServerRenderedHost,
  ssrCreatedHosts
} from "./_helpers.js";

/** Awaits the microtask queue so the directive's `setValue` flip can run. */
function awaitMicrotask(): Promise<void> {
  return new Promise(resolve => queueMicrotask(() => resolve()));
}

describe("[Decorator]", () => {
  describe("[Component]", () => {
    describe("[server-side rendering: renderByPlatform directive]", () => {
      afterEach(() => {
        cleanupSsrHosts();
        cleanup();
      });

      test("SSR + server value: DOM shows the server value first, then swaps to the browser value after the first update", async () => {
        const host = setupServerRenderedHost(
          "ssr-rbp-server-then-browser",
          makeSsrRenderByPlatformClass(),
          "<span data-host='rbp'>server-value</span>"
        ) as KasstorElement;

        // Snapshot before first client render
        const beforeSpan = host.shadowRoot!.querySelector("span[data-host='rbp']")!;
        expect(beforeSpan.textContent).toBe("server-value");

        // Lit re-renders right away; the directive holds the server value during
        // hydration and then queues a microtask to flip to the browser value.
        await host.updateComplete;
        await awaitMicrotask();
        await host.updateComplete;

        const afterSpan = host.shadowRoot!.querySelector("span[data-host='rbp']")!;
        expect(afterSpan.textContent).toBe("browser-value");
      });

      test("SSR without a server value: host shadow is empty, browser fills it in after hydration", async () => {
        const host = setupServerRenderedHost(
          "ssr-rbp-browser-only",
          makeSsrRenderByPlatformBrowserOnlyClass(),
          "<span data-host='rbp-bo'></span>"
        ) as KasstorElement;

        // Before hydration: empty (matches what SSR would produce when no serverValue is given)
        expect(host.shadowRoot!.querySelector("span[data-host='rbp-bo']")!.textContent).toBe("");

        await host.updateComplete;
        await awaitMicrotask();
        await host.updateComplete;

        expect(host.shadowRoot!.querySelector("span[data-host='rbp-bo']")!.textContent).toBe(
          "browser-only-content"
        );
      });

      test("normal client mount (no SSR) returns the browser value on the first render — no microtask flip", async () => {
        // Use the SAME class as the SSR'd test, but mount it the normal client
        // way: register first, then create. The directive's `update` path
        // should short-circuit because `wasServerSideRendered` is false.
        Component({ tag: "ssr-rbp-client-only" })(makeSsrRenderByPlatformClass() as never);
        const host = document.createElement("ssr-rbp-client-only") as KasstorElement;
        document.body.appendChild(host);
        ssrCreatedHosts.push(host);

        await host.updateComplete;

        // First render should already be the browser value (no flicker through
        // the server value at all).
        expect(host.shadowRoot!.querySelector("span[data-host='rbp']")!.textContent).toBe(
          "browser-value"
        );
      });
    });
  });
});
