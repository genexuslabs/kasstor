// Shared bundles + failed downloads.
//
// Two component classes that declare the same bundle name end up adopting
// the same `CSSStyleSheet` instance — the design-system cache hands the
// same object to both. When a download fails (the DS layer resolves the
// promise with `{ styleSheet: undefined }` after a timeout or fetch error)
// the joined `Promise.all` still settles, the render is unblocked, and the
// failed entry is silently dropped.

import { getStyleSheetPromiseInfo, setStyleSheetMapping } from "@genexus/kasstor-design-system";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { cleanup } from "vitest-browser-lit";
import {
  cleanupHosts,
  clearDesignSystemState,
  flushMicroAndMacroTasks,
  makeStyleSheet,
  setupHost,
  shadowAdoptedSheets,
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

      describe("[CSR shared bundles] one CSSStyleSheet instance, many adopting roots", () => {
        test("two component classes that declare the SAME bundle adopt the same CSSStyleSheet instance on their respective shadow roots", async () => {
          const sheet = makeStyleSheet("p { color: rgb(123, 123, 123); }");
          setStyleSheetMapping("csr-shared-bundle-name", sheet);

          const hostA = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["csr-shared-bundle-name"]
          });
          const hostB = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["csr-shared-bundle-name"]
          });
          await hostA.updateComplete;
          await hostB.updateComplete;

          expect(shadowAdoptedSheets(hostA)).toContain(sheet);
          expect(shadowAdoptedSheets(hostB)).toContain(sheet);
          // Each instance has its own shadow root, but the CSSStyleSheet is
          // a singleton — `===` identity must match across both adoptions.
          expect(shadowAdoptedSheets(hostA).find(s => s === sheet)).toBe(sheet);
          expect(shadowAdoptedSheets(hostB).find(s => s === sheet)).toBe(sheet);
        });

        test("two classes sharing a pending bundle: both unblock when the single in-flight promise resolves", async () => {
          const hostA = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["csr-shared-pending"]
          });
          const hostB = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["csr-shared-pending"]
          });

          // Neither has rendered yet — both gated on the same bundle.
          await flushMicroAndMacroTasks();
          expect(hostA.shadowRoot?.querySelector("[data-original]") ?? null).toBeNull();
          expect(hostB.shadowRoot?.querySelector("[data-original]") ?? null).toBeNull();

          const sheet = makeStyleSheet("p { color: rgb(0, 0, 0); }");
          setStyleSheetMapping("csr-shared-pending", sheet);

          await hostA.updateComplete;
          await hostB.updateComplete;

          expect(shadowAdoptedSheets(hostA)).toContain(sheet);
          expect(shadowAdoptedSheets(hostB)).toContain(sheet);
        });
      });

      describe("[CSR failures] failed/timed-out downloads do not block the render forever", () => {
        test("a single failed download: render proceeds without that sheet, no entry in adoptedStyleSheets", async () => {
          const promiseInfo = getStyleSheetPromiseInfo("csr-fail-single");

          const host = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["csr-fail-single"]
          });

          // Simulate a timeout / fetch error from the DS layer.
          promiseInfo.promiseResolver({ name: "csr-fail-single", styleSheet: undefined });
          await host.updateComplete;

          // No sheet was added; render proceeded with no shared styles.
          expect(shadowAdoptedSheets(host)).toHaveLength(0);
          expect(host.shadowRoot!.querySelector("[data-original]")?.textContent).toBe("client");
        });

        test("mixed success + failure: only the successful sheet is adopted; the failed entry is silently dropped", async () => {
          const okPromiseInfo = getStyleSheetPromiseInfo("csr-fail-mix-ok");
          const failPromiseInfo = getStyleSheetPromiseInfo("csr-fail-mix-bad");

          const host = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["csr-fail-mix-ok", "csr-fail-mix-bad"]
          });

          const okSheet = makeStyleSheet(".ok {}");
          okPromiseInfo.promiseResolver({ name: "csr-fail-mix-ok", styleSheet: okSheet });
          failPromiseInfo.promiseResolver({
            name: "csr-fail-mix-bad",
            styleSheet: undefined
          });
          await host.updateComplete;

          expect(shadowAdoptedSheets(host)).toContain(okSheet);
          expect(shadowAdoptedSheets(host)).toHaveLength(1);
        });

        test("all downloads fail: the render still proceeds, with no shared sheets adopted", async () => {
          const a = getStyleSheetPromiseInfo("csr-fail-all-a");
          const b = getStyleSheetPromiseInfo("csr-fail-all-b");

          const host = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["csr-fail-all-a", "csr-fail-all-b"]
          });

          a.promiseResolver({ name: "csr-fail-all-a", styleSheet: undefined });
          b.promiseResolver({ name: "csr-fail-all-b", styleSheet: undefined });
          await host.updateComplete;

          expect(shadowAdoptedSheets(host)).toHaveLength(0);
          expect(host.shadowRoot!.querySelector("[data-original]")?.textContent).toBe("client");
        });
      });
    });
  });
});
