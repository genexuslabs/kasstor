// CSR registration timing + interaction with Lit's static `styles`.
//
// Two related concerns:
//   - Registration timing: tests cover the matrix of "cache primed before
//     decoration" vs "design system registered after decoration".
//   - Static styles coexistence: when a component declares both Lit `styles`
//     and `sharedDesignSystemStyles`, both end up on the shadow root.

import { registerDesignSystem, setStyleSheetMapping } from "@genexus/kasstor-design-system";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { cleanup } from "vitest-browser-lit";
import { KasstorElement } from "../../index.js";
import {
  cleanupHosts,
  clearDesignSystemState,
  makeStyleSheet,
  PROMISE_SLOT_DESCRIPTION,
  readPrototypeSlot,
  registerClass,
  setupHost,
  shadowAdoptedSheets,
  trackHost,
  uniqueTag
} from "./_helpers.js";

describe("[Decorator]", () => {
  describe("[Component]", () => {
    describe("[sharedDesignSystemStyles]", () => {
      beforeEach(() => {
        clearDesignSystemState();
      });

      afterEach(() => {
        cleanupHosts();
        cleanup();
      });

      describe("[CSR registration timing] cache vs URL vs late registration", () => {
        test("`setStyleSheetMapping` called BEFORE decoration → the decorator sees a cache hit", async () => {
          const sheet = makeStyleSheet(".pre {}");
          setStyleSheetMapping("csr-timing-pre", sheet);

          const tag = uniqueTag();
          const ctor = registerClass(tag, {
            sharedDesignSystemStyles: ["csr-timing-pre"]
          });

          // No promise slot is allocated — the decorator took the cache-hit
          // path.
          expect(
            readPrototypeSlot<Promise<void> | undefined>(ctor, PROMISE_SLOT_DESCRIPTION)
          ).toBeUndefined();

          const host = document.createElement(tag) as KasstorElement;
          document.body.appendChild(host);
          trackHost(host);
          await host.updateComplete;

          expect(shadowAdoptedSheets(host)).toContain(sheet);
        });

        test("`registerDesignSystem` called AFTER decoration triggers the pending fetch and resolves the gate", async () => {
          // No DS registered yet at decoration time → the decorator creates
          // a pending promise. `fetchStyleSheet` inside the decorator finds
          // no URL, so the fetch is deferred until registration.
          const host = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["csr-timing-late-register"]
          });

          // Simulate the design system being registered later. The link
          // tag in the document head doesn't exist, so we cannot rely on
          // the real fetch — emulate the response with
          // `setStyleSheetMapping`. This mirrors what the design-system
          // pipeline would produce once the bundle resolves.
          registerDesignSystem("late-ds", {
            bundleLoaders: { "csr-timing-late-register": "/styles/late.css" }
          });
          const sheet = makeStyleSheet(".late {}");
          setStyleSheetMapping("csr-timing-late-register", sheet);
          await host.updateComplete;

          expect(shadowAdoptedSheets(host)).toContain(sheet);
        });
      });

      describe("[CSR + static styles] both kinds of styles coexist on the shadow root", () => {
        test("a component with both `styles` and `sharedDesignSystemStyles`: both stylesheets are present on shadowRoot.adoptedStyleSheets", async () => {
          const dsSheet = makeStyleSheet(".ds {}");
          setStyleSheetMapping("csr-with-static-ds", dsSheet);

          const host = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["csr-with-static-ds"],
            styles: ".local { color: rgb(11, 22, 33); }"
          });
          await host.updateComplete;

          const adopted = shadowAdoptedSheets(host);
          // The DS sheet is present.
          expect(adopted).toContain(dsSheet);
          // The component's static styles are also present (Lit adopts the
          // single merged stylesheet for `static styles`).
          expect(adopted.length).toBeGreaterThanOrEqual(2);
        });

        test("ordering: the component's static `styles` are adopted BEFORE the shared design-system sheets (DS sheets sit later in adoptedStyleSheets)", async () => {
          // This documents the CURRENT order. The order matters for tied
          // specificity in the CSS cascade — later sheets win.
          const dsSheet = makeStyleSheet(".ds {}");
          setStyleSheetMapping("csr-order-static-vs-ds", dsSheet);

          const host = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["csr-order-static-vs-ds"],
            styles: ".local {}"
          });
          await host.updateComplete;

          const adopted = shadowAdoptedSheets(host);
          const dsIndex = adopted.indexOf(dsSheet);
          expect(dsIndex).toBeGreaterThan(-1);
          // The static-styles entry sits at index 0 (Lit adopts it in
          // createRenderRoot), and the DS sheets are pushed after.
          expect(dsIndex).toBeGreaterThan(0);
        });
      });
    });
  });
});
