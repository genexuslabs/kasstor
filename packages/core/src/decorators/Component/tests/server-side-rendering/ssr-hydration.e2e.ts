// SSR hydration — what happens to the DOM and lifecycle when an SSR'd
// component finishes its first client-side update.
//
// Kasstor doesn't load `@lit-labs/ssr-client/lit-element-hydrate-support.js`,
// so Lit's default behavior applies: on the first render, the existing shadow
// root contents are replaced by what the component's template produces. The
// `wasServerSideRendered` flag is still useful for in-template branching
// (see the `renderByPlatform` directive tests).

import { afterEach, describe, expect, test } from "vitest";
import { cleanup } from "vitest-browser-lit";
import { Component, KasstorElement } from "../../index.js";
import {
  cleanupSsrHosts,
  makeSsrAttributeAwareClass,
  makeSsrFirstWillUpdateSetterClass,
  makeSsrHookOrderClass,
  makeSsrLifecycleClass,
  makeSsrSimpleClass,
  setupServerRenderedHost,
  ssrCreatedHosts,
  type SsrAttributeAwareInstance,
  type SsrFirstWillUpdateSetterInstance,
  type SsrHookOrderInstance,
  type SsrLifecycleInstance
} from "./_helpers.js";

describe("[Decorator]", () => {
  describe("[Component]", () => {
    describe("[server-side rendering: hydration & lifecycle]", () => {
      afterEach(() => {
        cleanupSsrHosts();
        cleanup();
      });

      test("the server-rendered DOM is present in the shadow root immediately after upgrade, before any client render", () => {
        const host = setupServerRenderedHost(
          "ssr-hydration-dom-snapshot",
          makeSsrSimpleClass(),
          "<p data-source='server'>server-rendered</p>"
        );

        // We must read the shadow root BEFORE awaiting `updateComplete`,
        // because the first client render will replace the children (this
        // codebase does not load `lit-element-hydrate-support`).
        const p = host.shadowRoot!.querySelector("p")!;
        expect(p.getAttribute("data-source")).toBe("server");
        expect(p.textContent).toBe("server-rendered");
      });

      test("after the first client update the DOM matches the client template (no hydrate-support → client wins)", async () => {
        const host = setupServerRenderedHost(
          "ssr-hydration-after-update",
          makeSsrSimpleClass(),
          "<p data-source='server'>server-rendered</p>"
        ) as KasstorElement;

        await host.updateComplete;

        const p = host.shadowRoot!.querySelector("p")!;
        expect(p.getAttribute("data-source")).toBe("client");
        expect(p.textContent).toBe("client-rendered");
      });

      test("firstWillUpdate, willUpdate and firstUpdated each fire exactly once when an SSR'd component finishes its first update", async () => {
        const host = setupServerRenderedHost(
          "ssr-hydration-lifecycle-counts",
          makeSsrLifecycleClass(),
          "<span>server-content</span>"
        ) as unknown as SsrLifecycleInstance;

        await host.updateComplete;

        expect(host.firstWillUpdateMock).toHaveBeenCalledTimes(1);
        expect(host.willUpdateMock).toHaveBeenCalledTimes(1);
        expect(host.firstUpdatedMock).toHaveBeenCalledTimes(1);
      });

      test("firstWillUpdate during SSR sees `@property` values initialized from attributes (the documented SSR use case)", async () => {
        const TAG = "ssr-hydration-attribute-aware";
        const ctor = makeSsrAttributeAwareClass();

        // Host carries the attribute that would feed the @property during SSR
        const host = document.createElement(TAG);
        host.setAttribute("message", "from-attribute");
        document.body.appendChild(host);
        ssrCreatedHosts.push(host);
        host.attachShadow({ mode: "open" }).innerHTML = "<p>from-attribute</p>";

        Component({ tag: TAG })(ctor as never);

        const inst = host as unknown as SsrAttributeAwareInstance;
        await inst.updateComplete;

        // The hook ran AFTER attribute-to-property reflection happened — so the
        // attribute value is visible inside firstWillUpdate, not the default.
        expect(inst.capturedInFirstWillUpdate).toBe("from-attribute");
        expect(inst.message).toBe("from-attribute");
      });

      test("setting a `@property` inside firstWillUpdate does NOT trigger an extra render cycle during SSR hydration", async () => {
        const TAG = "ssr-hydration-firstwillupdate-setter";
        const ctor = makeSsrFirstWillUpdateSetterClass();

        const host = document.createElement(TAG);
        document.body.appendChild(host);
        ssrCreatedHosts.push(host);
        host.attachShadow({ mode: "open" }).innerHTML = "<p data-counter='0'>0</p>";

        Component({ tag: TAG })(ctor as never);

        const inst = host as unknown as SsrFirstWillUpdateSetterInstance;
        await inst.updateComplete;

        // The mutation in firstWillUpdate is folded into the SAME update cycle —
        // willUpdate runs exactly once.
        expect(inst.willUpdateCount).toBe(1);
        expect(inst.counter).toBe(42);

        // The first render uses the post-firstWillUpdate value (42), not 0.
        const p = (host as KasstorElement).shadowRoot!.querySelector("p")!;
        expect(p.textContent).toBe("42");
      });

      test("first update cycle runs hooks in the canonical Lit order: firstWillUpdate → willUpdate → render → firstUpdated → updated", async () => {
        const host = setupServerRenderedHost(
          "ssr-hydration-hook-order",
          makeSsrHookOrderClass(),
          "<span>server</span>"
        ) as unknown as SsrHookOrderInstance;

        await host.updateComplete;

        // LitElement.update() commits the render and then calls firstUpdated
        // BEFORE updated on the first cycle. Kasstor's willUpdate monkey-patch
        // injects firstWillUpdate at the start, ahead of willUpdate.
        expect(host.hookOrder).toEqual([
          "firstWillUpdate",
          "willUpdate",
          "render",
          "firstUpdated",
          "updated"
        ]);
      });

      test("the light-DOM children that the server rendered alongside the shadow root are preserved through hydration", async () => {
        const host = setupServerRenderedHost(
          "ssr-hydration-light-dom-preserved",
          makeSsrSimpleClass(),
          "<p>shadow</p>",
          { lightDomHtml: "<span data-slotted>server-slotted</span>" }
        );

        await (host as KasstorElement).updateComplete;

        // Light-DOM children survive — Lit's render only mutates the shadow root.
        const slotted = host.querySelector("[data-slotted]")!;
        expect(slotted.textContent).toBe("server-slotted");
      });
    });
  });
});
