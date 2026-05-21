// CSR cache hits — synchronous decoration-time path.
//
// When every declared bundle is already in the design-system cache by the
// time the decorator runs, the runtime takes a fast path:
//   - `successfulThemes` is populated synchronously with the cached sheets.
//   - No promise slot is allocated on the prototype (no microtask overhead).
//   - `scheduleUpdate` does not await anything before adopting.
//
// The adoption target is the component's OWN shadow root — these tests pin
// down that nothing leaks to the document.

import { setStyleSheetMapping } from "@genexus/kasstor-design-system";
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

      describe("[CSR cache hits] sheets adopt synchronously on the component's own shadow root", () => {
        test("a single cache-hit bundle is adopted on shadowRoot.adoptedStyleSheets (NOT document)", async () => {
          const sheet = makeStyleSheet("p { color: rgb(10, 20, 30); }");
          setStyleSheetMapping("csr-cache-hit-a", sheet);

          const host = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["csr-cache-hit-a"]
          });
          await host.updateComplete;

          expect(shadowAdoptedSheets(host)).toContain(sheet);
          expect(document.adoptedStyleSheets).not.toContain(sheet);
          expect(host.shadowRoot!.querySelector("kst-theme")).toBeNull();
          expect(host.shadowRoot!.querySelector("[data-original]")).not.toBeNull();
        });

        test("multiple cache-hit bundles are all adopted on the host's shadow root", async () => {
          const sheetA = makeStyleSheet(".a { color: rgb(1, 1, 1); }");
          const sheetB = makeStyleSheet(".b { color: rgb(2, 2, 2); }");
          setStyleSheetMapping("csr-cache-hit-multi-a", sheetA);
          setStyleSheetMapping("csr-cache-hit-multi-b", sheetB);

          const host = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["csr-cache-hit-multi-a", "csr-cache-hit-multi-b"]
          });
          await host.updateComplete;

          expect(shadowAdoptedSheets(host)).toContain(sheetA);
          expect(shadowAdoptedSheets(host)).toContain(sheetB);
          expect(document.adoptedStyleSheets).not.toContain(sheetA);
          expect(document.adoptedStyleSheets).not.toContain(sheetB);
        });

        test("when every bundle is a cache hit, no promise slot is created on the prototype", async () => {
          const sheet = makeStyleSheet("p { color: rgb(7, 7, 7); }");
          setStyleSheetMapping("csr-no-await", sheet);

          const host = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["csr-no-await"]
          });
          await host.updateComplete;

          const ctor = customElements.get(host.tagName.toLowerCase())!;
          const promiseSlotValue = readPrototypeSlot<Promise<void> | undefined>(
            ctor,
            PROMISE_SLOT_DESCRIPTION
          );
          // The slot was never written by the decorator (no async work needed).
          expect(promiseSlotValue).toBeUndefined();
        });

        test("a second instance of the same class also gets the cache-hit sheets adopted (no cross-instance interference)", async () => {
          const sheet = makeStyleSheet(".s { color: rgb(33, 33, 33); }");
          setStyleSheetMapping("csr-cache-hit-shared", sheet);

          const tag = uniqueTag();
          registerClass(tag, {
            sharedDesignSystemStyles: ["csr-cache-hit-shared"]
          });

          const a = document.createElement(tag) as KasstorElement;
          const b = document.createElement(tag) as KasstorElement;
          document.body.appendChild(a);
          document.body.appendChild(b);
          trackHost(a);
          trackHost(b);

          await a.updateComplete;
          await b.updateComplete;

          expect(shadowAdoptedSheets(a)).toContain(sheet);
          expect(shadowAdoptedSheets(b)).toContain(sheet);
          // Each instance has its OWN shadow root — the adoption is per-root.
          expect(a.shadowRoot).not.toBe(b.shadowRoot);
          // Sanity: each shadow root has exactly one entry for the sheet.
          expect(shadowAdoptedSheets(a).filter(s => s === sheet)).toHaveLength(1);
          expect(shadowAdoptedSheets(b).filter(s => s === sheet)).toHaveLength(1);
        });
      });
    });
  });
});
