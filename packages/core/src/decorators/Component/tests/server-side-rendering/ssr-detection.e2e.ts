// SSR detection — when does `wasServerSideRendered` flip to `true`?
//
// The detection logic lives in `componentWasServerSideRendered`: it reads
// `element.shadowRoot.children.length` in the KasstorElement constructor.
// These tests pin down the boundaries of that detection contract.

import { html } from "lit/html.js";
import { afterEach, describe, expect, test } from "vitest";
import { cleanup } from "vitest-browser-lit";
import { Component, KasstorElement } from "../../index.js";
import {
  cleanupSsrHosts,
  makeSsrLifecycleClass,
  makeSsrPlainClass,
  makeSsrSimpleClass,
  readSsrFlag,
  setupServerRenderedHost,
  ssrCreatedHosts,
  type SsrLifecycleInstance
} from "./_helpers.js";

describe("[Decorator]", () => {
  describe("[Component]", () => {
    describe("[server-side rendering: detection]", () => {
      afterEach(() => {
        cleanupSsrHosts();
        cleanup();
      });

      test("wasServerSideRendered is `true` when the host upgrades with a pre-populated shadow root", () => {
        const host = setupServerRenderedHost(
          "ssr-detect-detected",
          makeSsrSimpleClass(),
          "<p data-source='server'>server-rendered</p>"
        );

        expect(readSsrFlag(host)).toBe(true);
      });

      test("wasServerSideRendered is `false` when there is no pre-existing shadow content (normal client mount)", async () => {
        // Register first, then create — i.e. the normal client-side path.
        Component({ tag: "ssr-detect-plain" })(makeSsrPlainClass() as never);
        const host = document.createElement("ssr-detect-plain") as KasstorElement;
        document.body.appendChild(host);
        ssrCreatedHosts.push(host);
        await host.updateComplete;

        expect(readSsrFlag(host)).toBe(false);
      });

      test("a shadow root that exists but has no element children is NOT detected as SSR (the check is `children.length !== 0`)", () => {
        const host = setupServerRenderedHost(
          "ssr-detect-empty-shadow",
          makeSsrSimpleClass(),
          "" // empty shadow root — no elements, no text
        );

        expect(readSsrFlag(host)).toBe(false);
      });

      test("a shadow root with only whitespace/text nodes (no element children) is NOT detected as SSR", () => {
        const host = setupServerRenderedHost(
          "ssr-detect-text-only-shadow",
          makeSsrSimpleClass(),
          "   \n   "
        );

        // `children` excludes text nodes — the SSR check only counts element children.
        expect(readSsrFlag(host)).toBe(false);
      });

      test("a `shadow: false` component does NOT trigger SSR detection, even when light-DOM children are present (documents the limitation)", async () => {
        const TAG = "ssr-detect-no-shadow";

        const ctor = class extends KasstorElement {
          override render() {
            return html`<p data-source="client">client-rendered</p>`;
          }
        };

        // Create the host with light-DOM "server" content BEFORE registering.
        const host = document.createElement(TAG);
        host.innerHTML = "<p data-source='server'>server-rendered</p>";
        document.body.appendChild(host);
        ssrCreatedHosts.push(host);

        // Register with `shadow: false` — the decorator overrides
        // `createRenderRoot` to use light DOM, so SSR detection (which only
        // checks `shadowRoot.children`) cannot see the pre-rendered content.
        Component({ tag: TAG, shadow: false })(ctor as never);

        expect(readSsrFlag(host)).toBe(false);

        // After hydration the client template replaces the light-DOM content,
        // confirming the component was treated as a fresh client-side mount.
        await (host as KasstorElement).updateComplete;
        expect(host.querySelector("[data-source='client']")).not.toBeNull();
      });

      test("two SSR'd components on the same page are flagged independently (per-instance state)", () => {
        const hostA = setupServerRenderedHost(
          "ssr-detect-multi-a",
          makeSsrSimpleClass(),
          "<p>a</p>"
        );
        const hostB = setupServerRenderedHost(
          "ssr-detect-multi-b",
          makeSsrSimpleClass(),
          "<p>b</p>"
        );
        Component({ tag: "ssr-detect-multi-c" })(makeSsrPlainClass() as never);
        const hostC = document.createElement("ssr-detect-multi-c");
        document.body.appendChild(hostC);
        ssrCreatedHosts.push(hostC);

        expect(readSsrFlag(hostA)).toBe(true);
        expect(readSsrFlag(hostB)).toBe(true);
        expect(readSsrFlag(hostC)).toBe(false);
      });

      test("`wasServerSideRendered` is already true inside the KasstorElement constructor (read post-super by user code)", () => {
        const host = setupServerRenderedHost(
          "ssr-detect-flag-at-ctor",
          makeSsrLifecycleClass(),
          "<span>server-content</span>"
        ) as unknown as SsrLifecycleInstance;

        expect(host.ssrFlagAtConstructor).toBe(true);
      });

      test("`wasServerSideRendered` persists across disconnect/reconnect — the flag is per-instance, not per-mount", async () => {
        const host = setupServerRenderedHost(
          "ssr-detect-persists",
          makeSsrSimpleClass(),
          "<p>server</p>"
        );
        const parent = host.parentElement!;
        await (host as KasstorElement).updateComplete;

        expect(readSsrFlag(host)).toBe(true);

        // Detach and re-attach — this fires connectedCallback again but should
        // NOT clear the SSR flag (it's captured at construction).
        host.remove();
        parent.appendChild(host);
        await (host as KasstorElement).updateComplete;

        expect(readSsrFlag(host)).toBe(true);
      });

      test("the protected `wasServerSideRendered` setter can override the auto-detected value (used by hydration tooling)", () => {
        const TAG = "ssr-detect-setter";

        // Subclass exposes the protected setter as public so the test can write it.
        const ctor = class extends KasstorElement {
          // Overrides the protected accessor pair with public visibility — TS
          // allows widening protected → public on override.
          override get wasServerSideRendered(): boolean {
            return super.wasServerSideRendered;
          }
          override set wasServerSideRendered(value: boolean) {
            super.wasServerSideRendered = value;
          }
          override render() {
            return html`<p>setter</p>`;
          }
        };
        Component({ tag: TAG })(ctor as never);

        const host = document.createElement(TAG) as InstanceType<typeof ctor>;
        document.body.appendChild(host);
        ssrCreatedHosts.push(host);

        // Initially false (no pre-rendered shadow root).
        expect(host.wasServerSideRendered).toBe(false);

        // The setter accepts overrides — e.g. a hydration tool flagging the
        // component as server-rendered post-construction.
        host.wasServerSideRendered = true;
        expect(host.wasServerSideRendered).toBe(true);

        host.wasServerSideRendered = false;
        expect(host.wasServerSideRendered).toBe(false);
      });
    });
  });
});
