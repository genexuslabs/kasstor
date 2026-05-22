// CSR shadow lifecycle — adoption survives disconnect / reconnect, even when
// the joined promise resolves while the host is detached or while
// `scheduleUpdate` is still parked on its await.
//
// Shadow DOM is naturally robust here: the shadow root lives on the element,
// so `adoptedStyleSheets` is preserved across moves. The interesting bits
// concern timing — disconnect happening before the first scheduleUpdate
// starts (Lit defers the whole update) versus disconnect happening WHILE
// scheduleUpdate is parked on the promise (the parked `.then(adopt)` is what
// eventually adopts).

import { setStyleSheetMapping } from "@genexus/kasstor-design-system";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { cleanup } from "vitest-browser-lit";
import {
  cleanupHosts,
  clearDesignSystemState,
  flushMicroAndMacroTasks,
  makeStyleSheet,
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

      describe("[CSR shadow lifecycle] sheets persist on the element's shadow root", () => {
        test("disconnect does NOT remove the sheet from the component's shadow root (mirroring Lit's static styles)", async () => {
          const sheet = makeStyleSheet("p { color: rgb(30, 60, 90); }");
          setStyleSheetMapping("csr-shadow-move-bundle", sheet);

          const host = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["csr-shadow-move-bundle"]
          });
          await host.updateComplete;
          expect(shadowAdoptedSheets(host)).toContain(sheet);

          host.remove();
          expect(shadowAdoptedSheets(host)).toContain(sheet);
        });

        test("reconnect to a different parent keeps the sheet on the SAME shadow root (no duplicate adoption)", async () => {
          const sheet = makeStyleSheet("p { color: rgb(30, 60, 90); }");
          setStyleSheetMapping("csr-shadow-reparent-bundle", sheet);

          const host = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["csr-shadow-reparent-bundle"]
          });
          await host.updateComplete;

          const newParent = document.createElement("div");
          document.body.appendChild(newParent);
          trackHost(newParent);

          host.remove();
          newParent.appendChild(host);
          await host.updateComplete;

          // First render already happened, so `hasUpdated` is true and the
          // adoption helper is a no-op. The adoption stays exactly one entry.
          const adopted = shadowAdoptedSheets(host);
          expect(adopted).toContain(sheet);
          expect(adopted.filter(s => s === sheet)).toHaveLength(1);
          expect(document.adoptedStyleSheets).not.toContain(sheet);
        });

        test("a download that resolves WHILE the host is disconnected — disconnect happens BEFORE scheduleUpdate has even started: the sheet ends up on the host's shadow root after reconnect (Lit defers the whole update until reconnect)", async () => {
          const host = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["csr-shadow-resolve-while-disconnected"]
          });
          const parent = host.parentElement!;

          // Synchronous disconnect — no microtask runs in between, so Lit
          // defers the update entirely. This exercises the "Lit pauses the
          // whole update while disconnected" path.
          host.remove();

          const sheet = makeStyleSheet("p { color: rgb(200, 50, 50); }");
          setStyleSheetMapping("csr-shadow-resolve-while-disconnected", sheet);

          parent.appendChild(host);
          await host.updateComplete;
          expect(shadowAdoptedSheets(host)).toContain(sheet);
          expect(shadowAdoptedSheets(host).filter(s => s === sheet)).toHaveLength(1);
        });

        test("disconnect happens WHILE scheduleUpdate is parked on the joined promise; the promise then resolves while disconnected — on reconnect, the sheet still lands on the shadow root exactly once", async () => {
          // Different from the previous test: here we let the first
          // `scheduleUpdate` actually start and `await` the joined promise
          // BEFORE the host is disconnected. Then the bundle resolves
          // while the host is detached. For shadow DOM this must work
          // because adoption on `shadowRoot.adoptedStyleSheets` does not
          // depend on the host being in the document — the shadow root
          // lives on the element itself.
          const host = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["csr-shadow-park-then-disconnect"]
          });
          const parent = host.parentElement!;

          // Let scheduleUpdate run to its `await` of the joined promise.
          await flushMicroAndMacroTasks();

          host.remove();

          const sheet = makeStyleSheet("p { color: rgb(11, 22, 33); }");
          setStyleSheetMapping("csr-shadow-park-then-disconnect", sheet);

          // Give the .then chain a turn to run the adoption against the
          // (still-alive) shadow root.
          await flushMicroAndMacroTasks();

          parent.appendChild(host);
          await host.updateComplete;

          expect(shadowAdoptedSheets(host)).toContain(sheet);
          expect(shadowAdoptedSheets(host).filter(s => s === sheet)).toHaveLength(1);
        });

        test("many disconnect/reconnect cycles: the sheet stays on the shadow root the whole time (no churn)", async () => {
          const sheet = makeStyleSheet("p { color: rgb(70, 70, 70); }");
          setStyleSheetMapping("csr-shadow-cycle-bundle", sheet);

          const host = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["csr-shadow-cycle-bundle"]
          });
          const parent = host.parentElement!;
          await host.updateComplete;

          for (let i = 0; i < 5; i++) {
            host.remove();
            expect(shadowAdoptedSheets(host)).toContain(sheet);
            parent.appendChild(host);
            await host.updateComplete;
            expect(shadowAdoptedSheets(host).filter(s => s === sheet)).toHaveLength(1);
          }
        });

        test("the await is parked → host is reparented to a DIFFERENT document parent → promise resolves → sheet still ends on the host's own shadow root", async () => {
          // While the await is parked, `hasUpdated` is false, so the
          // reconnect's `if (this.hasUpdated)` branch is skipped — only the
          // originally-queued `.then(adopt)` runs when the promise resolves.
          // For shadow DOM, the shadow root is part of the element, so the
          // reparent has no effect on where the sheet lands.
          const host = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["csr-shadow-park-reparent"]
          });

          const newParent = document.createElement("div");
          document.body.appendChild(newParent);
          trackHost(newParent);

          // Park scheduleUpdate on the await.
          await flushMicroAndMacroTasks();

          // Move the host to a different parent — disconnectedCallback +
          // connectedCallback fire, but neither restarts the update.
          host.remove();
          newParent.appendChild(host);

          const sheet = makeStyleSheet("p { color: rgb(101, 102, 103); }");
          setStyleSheetMapping("csr-shadow-park-reparent", sheet);
          await host.updateComplete;

          expect(shadowAdoptedSheets(host)).toContain(sheet);
          expect(shadowAdoptedSheets(host).filter(s => s === sheet)).toHaveLength(1);
          expect(document.adoptedStyleSheets).not.toContain(sheet);
        });

        test("the await is parked → MANY disconnect/reconnect cycles WHILE the promise is still pending → promise resolves → sheet on the shadow root exactly once", async () => {
          const host = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["csr-shadow-park-many-cycles"]
          });
          const parent = host.parentElement!;

          await flushMicroAndMacroTasks();

          for (let i = 0; i < 5; i++) {
            host.remove();
            parent.appendChild(host);
          }

          const sheet = makeStyleSheet("p { color: rgb(50, 60, 70); }");
          setStyleSheetMapping("csr-shadow-park-many-cycles", sheet);
          await host.updateComplete;

          expect(shadowAdoptedSheets(host)).toContain(sheet);
          // Cycles must not have caused duplicate adoption.
          expect(shadowAdoptedSheets(host).filter(s => s === sheet)).toHaveLength(1);
        });
      });
    });
  });
});
