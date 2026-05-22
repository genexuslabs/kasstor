// Light DOM (`shadow: false`) — sheets adopt on the host's root node, not
// on a shadow root.
//
// Routing goes through `addGlobalStyleSheet` (webkit), which:
//   - Uses `getRootNode()` to find the correct `Document` / `ShadowRoot`.
//   - Is a no-op when the element is detached.
//   - Deduplicates via a per-element WeakSet, so reconnecting an already-
//     registered `(element, sheet)` pair is harmless.
//
// The interesting timing cases concern the disconnect-during-await edge: if
// the joined promise resolves while the host is detached, the parked `.then`
// must NOT mark the sheet as adopted; the next reconnect (where
// `hasUpdated === true` after Lit rendered into the detached element) is
// what closes the gap.

import { setStyleSheetMapping } from "@genexus/kasstor-design-system";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { cleanup } from "vitest-browser-lit";
import {
  cleanupHosts,
  clearDesignSystemState,
  flushMicroAndMacroTasks,
  makeStyleSheet,
  setupHost,
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

      describe("[Light DOM] sheets adopt on the host's root node, not on a shadow root", () => {
        test("a cache-hit bundle is adopted on the DOCUMENT (the host's root) when the component uses `shadow: false`", async () => {
          const sheet = makeStyleSheet(".light-hit { color: rgb(10, 20, 30); }");
          setStyleSheetMapping("csr-light-cache-hit", sheet);

          const host = setupHost(uniqueTag(), {
            shadow: false,
            sharedDesignSystemStyles: ["csr-light-cache-hit"]
          });
          await host.updateComplete;

          expect(host.shadowRoot).toBeNull();
          expect(document.adoptedStyleSheets).toContain(sheet);
        });

        test("an async-resolved bundle is adopted on the host's root once the download settles", async () => {
          const host = setupHost(uniqueTag(), {
            shadow: false,
            sharedDesignSystemStyles: ["csr-light-async"]
          });

          const sheet = makeStyleSheet(".light-async {}");
          setStyleSheetMapping("csr-light-async", sheet);
          await host.updateComplete;

          expect(document.adoptedStyleSheets).toContain(sheet);
        });

        test("disconnect releases the sheet from the host's root; reconnect re-acquires it (ref-counted)", async () => {
          const sheet = makeStyleSheet(".light-move {}");
          setStyleSheetMapping("csr-light-move-bundle", sheet);

          const host = setupHost(uniqueTag(), {
            shadow: false,
            sharedDesignSystemStyles: ["csr-light-move-bundle"]
          });
          const parent = host.parentElement!;
          await host.updateComplete;
          expect(document.adoptedStyleSheets).toContain(sheet);

          host.remove();
          expect(document.adoptedStyleSheets).not.toContain(sheet);

          parent.appendChild(host);
          await host.updateComplete;
          expect(document.adoptedStyleSheets).toContain(sheet);
        });

        test("two light-DOM components requesting the same bundle share a single physical adoption (webkit ref counting dedupes the (root, sheet) pair)", async () => {
          const sheet = makeStyleSheet(".light-shared {}");
          setStyleSheetMapping("csr-light-shared-bundle", sheet);

          const hostA = setupHost(uniqueTag(), {
            shadow: false,
            sharedDesignSystemStyles: ["csr-light-shared-bundle"]
          });
          const hostB = setupHost(uniqueTag(), {
            shadow: false,
            sharedDesignSystemStyles: ["csr-light-shared-bundle"]
          });
          await hostA.updateComplete;
          await hostB.updateComplete;

          expect(document.adoptedStyleSheets.filter(s => s === sheet)).toHaveLength(1);

          // Removing one component must NOT detach the sheet (the other
          // still holds a reference).
          hostA.remove();
          expect(document.adoptedStyleSheets).toContain(sheet);

          // Removing the second one finally releases it.
          hostB.remove();
          expect(document.adoptedStyleSheets).not.toContain(sheet);
        });

        test("a download that resolves WHILE `scheduleUpdate` is parked on the joined promise — and the host is disconnected at that moment — the sheet must end up on the host's root once the host reconnects", async () => {
          // Light DOM relies on the webkit `addGlobalStyleSheet` helper,
          // which is a no-op while the element is detached
          // (`getRootNode()` doesn't return a `Document` / `ShadowRoot`).
          // The first render is gated by `scheduleUpdate`'s await; if the
          // joined promise settles while the host is disconnected, the
          // helper bails. The runtime MUST re-attempt adoption when the
          // host reconnects — otherwise the styles would be silently lost.
          const host = setupHost(uniqueTag(), {
            shadow: false,
            sharedDesignSystemStyles: ["csr-light-resolve-while-disconnected"]
          });
          const parent = host.parentElement!;

          // Let scheduleUpdate start and park on the joined promise. Without
          // this, Lit just defers the entire update until reconnect and the
          // "promise resolves while disconnected" edge case is never reached.
          await flushMicroAndMacroTasks();

          host.remove();

          const sheet = makeStyleSheet(".light-disconnect {}");
          setStyleSheetMapping("csr-light-resolve-while-disconnected", sheet);

          // While disconnected, no document-level adoption can happen.
          await flushMicroAndMacroTasks();
          expect(document.adoptedStyleSheets).not.toContain(sheet);

          // Reconnect — the runtime must re-attempt adoption now that the
          // host has a real root, and the first render must complete with
          // the sheet on `document.adoptedStyleSheets`.
          parent.appendChild(host);
          await host.updateComplete;

          expect(document.adoptedStyleSheets).toContain(sheet);
          // Exactly one entry — no duplicate from the disconnected attempt.
          expect(document.adoptedStyleSheets.filter(s => s === sheet)).toHaveLength(1);
        });

        test("many disconnect/reconnect cycles stay ref-count balanced (no leak, no missing adoption)", async () => {
          const sheet = makeStyleSheet(".light-cycle {}");
          setStyleSheetMapping("csr-light-cycle-bundle", sheet);

          const host = setupHost(uniqueTag(), {
            shadow: false,
            sharedDesignSystemStyles: ["csr-light-cycle-bundle"]
          });
          const parent = host.parentElement!;
          await host.updateComplete;
          expect(document.adoptedStyleSheets).toContain(sheet);

          for (let i = 0; i < 5; i++) {
            host.remove();
            expect(document.adoptedStyleSheets).not.toContain(sheet);
            parent.appendChild(host);
            await host.updateComplete;
            expect(document.adoptedStyleSheets).toContain(sheet);
            // Exactly one adoption — webkit's WeakSet guards against
            // counting two references for the same `(element, sheet)`
            // pair, so the ref count stays balanced.
            expect(document.adoptedStyleSheets.filter(s => s === sheet)).toHaveLength(1);
          }
        });

        test("the await is parked → host is reparented to a DIFFERENT document parent → promise resolves → sheet is adopted on the document (no duplicate, no leak)", async () => {
          // While the await is parked, `hasUpdated === false`, so the
          // reconnect's `if (this.hasUpdated)` branch is skipped — the
          // originally-queued `.then(adopt)` is what fires on resolution,
          // reading the host's CURRENT `getRootNode()` at that moment.
          const host = setupHost(uniqueTag(), {
            shadow: false,
            sharedDesignSystemStyles: ["csr-light-park-reparent-doc"]
          });

          const newParent = document.createElement("div");
          document.body.appendChild(newParent);
          trackHost(newParent);

          await flushMicroAndMacroTasks();

          host.remove();
          newParent.appendChild(host);

          const sheet = makeStyleSheet(".light-reparent-doc {}");
          setStyleSheetMapping("csr-light-park-reparent-doc", sheet);
          await host.updateComplete;

          // Both parents live in the document, so the sheet ends up on
          // `document.adoptedStyleSheets`.
          expect(document.adoptedStyleSheets).toContain(sheet);
          expect(document.adoptedStyleSheets.filter(s => s === sheet)).toHaveLength(1);
        });

        test("the await is parked → host is moved INTO a wrapper's shadow root → promise resolves → sheet adopts on THAT shadow root (and NOT on the document)", async () => {
          // Light DOM components route adoption through
          // `addGlobalStyleSheet`, which uses `getRootNode()` to decide
          // where to adopt. After the move, the host's root is the
          // wrapper's shadow root, so that is where the sheet must land —
          // not on the document the host was originally inserted into.
          const host = setupHost(uniqueTag(), {
            shadow: false,
            sharedDesignSystemStyles: ["csr-light-park-move-into-shadow"]
          });

          const wrapper = document.createElement("div");
          const wrapperShadow = wrapper.attachShadow({ mode: "open" });
          document.body.appendChild(wrapper);
          trackHost(wrapper);

          await flushMicroAndMacroTasks();

          host.remove();
          wrapperShadow.appendChild(host);

          const sheet = makeStyleSheet(".light-move-shadow {}");
          setStyleSheetMapping("csr-light-park-move-into-shadow", sheet);
          await host.updateComplete;

          expect(wrapperShadow.adoptedStyleSheets).toContain(sheet);
          expect(wrapperShadow.adoptedStyleSheets.filter(s => s === sheet)).toHaveLength(1);
          expect(document.adoptedStyleSheets).not.toContain(sheet);
        });

        test("the await is parked → MANY disconnect/reconnect cycles WHILE the promise is still pending → promise resolves → sheet on document.adoptedStyleSheets exactly once", async () => {
          const host = setupHost(uniqueTag(), {
            shadow: false,
            sharedDesignSystemStyles: ["csr-light-park-many-cycles"]
          });
          const parent = host.parentElement!;

          await flushMicroAndMacroTasks();

          for (let i = 0; i < 5; i++) {
            host.remove();
            parent.appendChild(host);
          }

          const sheet = makeStyleSheet(".light-park-cycles {}");
          setStyleSheetMapping("csr-light-park-many-cycles", sheet);
          await host.updateComplete;

          expect(document.adoptedStyleSheets).toContain(sheet);
          expect(document.adoptedStyleSheets.filter(s => s === sheet)).toHaveLength(1);
        });

        test("the await is parked → the host hops BETWEEN different roots (document → shadow root → document) → promise resolves at the end → sheet on the CURRENT root only", async () => {
          // The parked `.then(adopt)` only fires once, reading the host's
          // CURRENT root at the moment of resolution. Intermediate hops do
          // not pre-attach anywhere (no adoption happens during the await
          // for light DOM, because `#sharedStylesWereAdopted` is gated by
          // the `isConnected` check inside `#adoptSharedStyleSheets`).
          const host = setupHost(uniqueTag(), {
            shadow: false,
            sharedDesignSystemStyles: ["csr-light-park-hop-between-roots"]
          });

          const wrapper = document.createElement("div");
          const wrapperShadow = wrapper.attachShadow({ mode: "open" });
          document.body.appendChild(wrapper);
          trackHost(wrapper);

          await flushMicroAndMacroTasks();

          // document → wrapperShadow
          host.remove();
          wrapperShadow.appendChild(host);
          // wrapperShadow → document (back)
          host.remove();
          document.body.appendChild(host);

          const sheet = makeStyleSheet(".light-park-hop {}");
          setStyleSheetMapping("csr-light-park-hop-between-roots", sheet);
          await host.updateComplete;

          expect(document.adoptedStyleSheets).toContain(sheet);
          expect(document.adoptedStyleSheets.filter(s => s === sheet)).toHaveLength(1);
          // The intermediate shadow root never received the sheet — there
          // was nothing to adopt while the await was pending (the gate in
          // `#adoptSharedStyleSheets` prevents pre-attachment on hops).
          expect(wrapperShadow.adoptedStyleSheets).not.toContain(sheet);
        });
      });
    });
  });
});
