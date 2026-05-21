// CSR ordering — `adoptedStyleSheets` MUST reflect the declared order of the
// `sharedDesignSystemStyles` list. CSS cascade gives later-adopted sheets the
// edge for tied specificity, so the order of declaration is part of the
// contract.
//
// One test is currently marked `test.fails`: when the declared list mixes
// cache hits with pending bundles, the current implementation appends the
// async-resolved sheets AFTER the cache hits regardless of declared position.
// That test pins down the desired behaviour; flipping the implementation to
// preserve declared order will make `test.fails` start failing — at which
// point the `.fails` wrapper should be removed.

import { setStyleSheetMapping } from "@genexus/kasstor-design-system";
import { getStyleSheetPromiseInfo } from "@genexus/kasstor-design-system/get-style-sheet-promise-info.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { cleanup } from "vitest-browser-lit";
import { KasstorElement } from "../../index.js";
import {
  cleanupHosts,
  clearDesignSystemState,
  flushMicroAndMacroTasks,
  makeStyleSheet,
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

      describe("[CSR ordering] adoptedStyleSheets reflects the declared order", () => {
        test("all cache-hit bundles: the adoption order matches the declared order", async () => {
          const a = makeStyleSheet(".a {}");
          const b = makeStyleSheet(".b {}");
          const c = makeStyleSheet(".c {}");
          setStyleSheetMapping("csr-order-a", a);
          setStyleSheetMapping("csr-order-b", b);
          setStyleSheetMapping("csr-order-c", c);

          const host = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["csr-order-a", "csr-order-b", "csr-order-c"]
          });
          await host.updateComplete;

          const adopted = shadowAdoptedSheets(host);
          const positions = [a, b, c].map(s => adopted.indexOf(s));
          expect(positions.every(p => p >= 0)).toBe(true);
          // Strictly increasing → declaration order preserved.
          expect(positions[0]).toBeLessThan(positions[1]);
          expect(positions[1]).toBeLessThan(positions[2]);
        });

        test("all pending bundles: the adoption order matches the declared order", async () => {
          const a = makeStyleSheet(".a {}");
          const b = makeStyleSheet(".b {}");
          const c = makeStyleSheet(".c {}");

          const host = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: [
              "csr-order-pending-a",
              "csr-order-pending-b",
              "csr-order-pending-c"
            ]
          });

          // Resolve out of declared order — the implementation must still
          // adopt them in the order they were declared.
          setStyleSheetMapping("csr-order-pending-c", c);
          setStyleSheetMapping("csr-order-pending-a", a);
          setStyleSheetMapping("csr-order-pending-b", b);
          await host.updateComplete;

          const adopted = shadowAdoptedSheets(host);
          const positions = [a, b, c].map(s => adopted.indexOf(s));
          expect(positions.every(p => p >= 0)).toBe(true);
          expect(positions[0]).toBeLessThan(positions[1]);
          expect(positions[1]).toBeLessThan(positions[2]);
        });

        // KNOWN FAILURE: the current implementation pushes cache hits into
        // `successfulThemes` first and appends pending-bundle sheets AFTER —
        // the relative order between cache hits and pending bundles does not
        // reflect the declared list. This test pins down the desired
        // behaviour (declared order preserved across the cache/pending
        // boundary). Wrapped in `test.fails` so the suite stays green until
        // the ordering fix lands; remove the `.fails` wrapper once the
        // implementation puts the sheets in the right order.
        test.fails(
          "mixed cache-hit + pending bundles: the adoption order matches the declared order regardless of resolution order",
          async () => {
            const a = makeStyleSheet(".a {}");
            const b = makeStyleSheet(".b {}");
            const c = makeStyleSheet(".c {}");
            // B is cached at decoration time; A and C are pending.
            setStyleSheetMapping("csr-order-mixed-b", b);

            const host = setupHost(uniqueTag(), {
              sharedDesignSystemStyles: [
                "csr-order-mixed-a",
                "csr-order-mixed-b",
                "csr-order-mixed-c"
              ]
            });

            setStyleSheetMapping("csr-order-mixed-c", c);
            setStyleSheetMapping("csr-order-mixed-a", a);
            await host.updateComplete;

            const adopted = shadowAdoptedSheets(host);
            const positions = [a, b, c].map(s => adopted.indexOf(s));
            expect(positions.every(p => p >= 0)).toBe(true);
            // Strict declared-order adoption: [A, B, C].
            expect(positions[0]).toBeLessThan(positions[1]);
            expect(positions[1]).toBeLessThan(positions[2]);
          }
        );

        test("a failed download in the middle of the list: the surviving sheets keep their declared order with the failed slot silently skipped", async () => {
          // Pre-create the promise info for the middle bundle so we can
          // resolve it manually with `styleSheet: undefined` (simulated
          // timeout / fetch error).
          const failPromiseInfo = getStyleSheetPromiseInfo("csr-order-fail-middle-b");

          const a = makeStyleSheet(".order-fail-a {}");
          const c = makeStyleSheet(".order-fail-c {}");

          const host = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: [
              "csr-order-fail-middle-a",
              "csr-order-fail-middle-b",
              "csr-order-fail-middle-c"
            ]
          });

          // Resolve the failed bundle out of order, then resolve the
          // healthy ones — neither the resolution order nor the position
          // of the failure must shift the surviving sheets.
          failPromiseInfo.promiseResolver({
            name: "csr-order-fail-middle-b",
            styleSheet: undefined
          });
          setStyleSheetMapping("csr-order-fail-middle-c", c);
          setStyleSheetMapping("csr-order-fail-middle-a", a);
          await host.updateComplete;

          const adopted = shadowAdoptedSheets(host);
          const positionA = adopted.indexOf(a);
          const positionC = adopted.indexOf(c);
          expect(positionA).toBeGreaterThan(-1);
          expect(positionC).toBeGreaterThan(-1);
          // The failed slot is gone, but A is still BEFORE C.
          expect(positionA).toBeLessThan(positionC);
        });

        test("many bundles (10) resolved in a randomized order: the final adoption order matches the declared order", async () => {
          const length = 10;
          const declared = Array.from({ length }, (_, i) => `csr-order-many-${i}`);
          const sheets = declared.map(name => makeStyleSheet(`.${name} {}`));

          const host = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: declared
          });

          // Resolve in an order unrelated to the declared one. The
          // declared order MUST still be preserved at adoption time.
          const resolveOrder = [4, 0, 9, 6, 2, 8, 1, 5, 3, 7];
          for (const i of resolveOrder) {
            setStyleSheetMapping(declared[i], sheets[i]);
          }
          await host.updateComplete;

          const adopted = shadowAdoptedSheets(host);
          const positions = sheets.map(s => adopted.indexOf(s));
          expect(positions.every(p => p >= 0)).toBe(true);
          // Strictly monotonically increasing → declared order preserved.
          for (let i = 1; i < positions.length; i++) {
            expect(positions[i]).toBeGreaterThan(positions[i - 1]);
          }
        });

        test("two component classes that declare overlapping bundles in DIFFERENT orders each adopt sheets in their OWN declared order", async () => {
          const a = makeStyleSheet(".order-diff-a {}");
          const b = makeStyleSheet(".order-diff-b {}");
          setStyleSheetMapping("csr-order-diff-a", a);
          setStyleSheetMapping("csr-order-diff-b", b);

          const hostAB = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["csr-order-diff-a", "csr-order-diff-b"]
          });
          const hostBA = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["csr-order-diff-b", "csr-order-diff-a"]
          });
          await hostAB.updateComplete;
          await hostBA.updateComplete;

          const adoptedAB = shadowAdoptedSheets(hostAB);
          const adoptedBA = shadowAdoptedSheets(hostBA);

          // Class AB: A before B.
          expect(adoptedAB.indexOf(a)).toBeLessThan(adoptedAB.indexOf(b));
          // Class BA: B before A.
          expect(adoptedBA.indexOf(b)).toBeLessThan(adoptedBA.indexOf(a));
        });

        test("a second instance of the same class also adopts sheets in declared order (the rebuild ran exactly once at the class level)", async () => {
          const a = makeStyleSheet(".order-2nd-a {}");
          const b = makeStyleSheet(".order-2nd-b {}");
          const c = makeStyleSheet(".order-2nd-c {}");

          const tag = uniqueTag();
          registerClass(tag, {
            sharedDesignSystemStyles: ["csr-order-2nd-a", "csr-order-2nd-b", "csr-order-2nd-c"]
          });

          // Resolve out of order.
          setStyleSheetMapping("csr-order-2nd-c", c);
          setStyleSheetMapping("csr-order-2nd-a", a);
          setStyleSheetMapping("csr-order-2nd-b", b);
          // Let the rebuild run at the class level.
          await flushMicroAndMacroTasks();

          // Now create two instances — both must see the rebuilt order.
          const hostA = document.createElement(tag) as KasstorElement;
          const hostB = document.createElement(tag) as KasstorElement;
          document.body.appendChild(hostA);
          document.body.appendChild(hostB);
          trackHost(hostA);
          trackHost(hostB);
          await hostA.updateComplete;
          await hostB.updateComplete;

          for (const host of [hostA, hostB]) {
            const adopted = shadowAdoptedSheets(host);
            const positions = [a, b, c].map(s => adopted.indexOf(s));
            expect(positions.every(p => p >= 0)).toBe(true);
            expect(positions[0]).toBeLessThan(positions[1]);
            expect(positions[1]).toBeLessThan(positions[2]);
          }
        });
      });
    });
  });
});
