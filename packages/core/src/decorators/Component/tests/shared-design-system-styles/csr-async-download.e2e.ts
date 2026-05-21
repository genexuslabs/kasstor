// CSR async download — first render is gated on the joined promise.
//
// When at least one declared bundle is not in the cache, the decorator stores
// a joined `Promise<void>` on the prototype's
// `kasstor-shared-design-system-stylesheet-promises` slot. `scheduleUpdate`
// awaits that promise before letting Lit run `update()` / `render()`, so the
// component never paints unstyled. The promise slot is then cleared so future
// instances of the same class skip the await microtask entirely.

import { setStyleSheetMapping } from "@genexus/kasstor-design-system";
import { html } from "lit/html.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { cleanup } from "vitest-browser-lit";
import { Component, KasstorElement } from "../../index.js";
import {
  cleanupHosts,
  clearDesignSystemState,
  flushMicroAndMacroTasks,
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

      describe("[CSR async download] first render is gated on the joined promise", () => {
        test("render() is NOT called until the pending promise resolves (the component never paints unstyled)", async () => {
          // The fact this test is meaningful relies on the decorator gating
          // the first scheduleUpdate on the joined Promise.all. If gating is
          // broken, render() fires on a microtask and this test fails on the
          // first `expect(renderCalls).toBe(0)`.
          let renderCalls = 0;
          let adoptedAtFirstRender: readonly CSSStyleSheet[] | undefined;

          const tag = uniqueTag();
          const host = document.createElement(tag);
          document.body.appendChild(host);
          trackHost(host);

          class C extends KasstorElement {
            override render() {
              renderCalls++;
              if (adoptedAtFirstRender === undefined) {
                adoptedAtFirstRender = this.shadowRoot
                  ? [...this.shadowRoot.adoptedStyleSheets]
                  : undefined;
              }
              return html`<p data-marker>rendered</p>`;
            }
          }
          Component({
            tag: tag as `${string}-${string}`,
            sharedDesignSystemStyles: ["csr-gated"]
          })(C as never);

          // Let the event loop spin: microtasks AND a macrotask. With the
          // promise still pending, no render must have happened.
          await flushMicroAndMacroTasks();
          expect(
            renderCalls,
            "render() must NOT be called while a shared design-system bundle is still downloading"
          ).toBe(0);
          // The shadow root, if Lit has created it already, still has no
          // rendered content.
          if ((host as KasstorElement).shadowRoot) {
            expect((host as KasstorElement).shadowRoot!.querySelector("[data-marker]")).toBeNull();
          }

          // Resolve the pending bundle.
          const sheet = makeStyleSheet("p { color: rgb(50, 100, 150); }");
          setStyleSheetMapping("csr-gated", sheet);

          await (host as KasstorElement).updateComplete;

          expect(renderCalls).toBe(1);
          expect(adoptedAtFirstRender).toBeDefined();
          // The sheet must be present in adoptedStyleSheets AT THE MOMENT
          // render() runs — proving the gate held until adoption.
          expect(adoptedAtFirstRender!).toContain(sheet);
          expect(shadowAdoptedSheets(host as KasstorElement)).toContain(sheet);
          expect(
            (host as KasstorElement).shadowRoot!.querySelector("[data-marker]")
          ).not.toBeNull();
        });

        test("multiple pending bundles are downloaded in parallel — a single Promise.all joins all the resolutions", async () => {
          const sheetA = makeStyleSheet(".x { color: rgb(11, 11, 11); }");
          const sheetB = makeStyleSheet(".y { color: rgb(22, 22, 22); }");

          const host = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["csr-parallel-a", "csr-parallel-b"]
          });

          // Resolving one is not enough — the joined promise still pends.
          setStyleSheetMapping("csr-parallel-a", sheetA);
          await flushMicroAndMacroTasks();
          // The host has not rendered yet because B is still pending.
          expect(host.shadowRoot?.querySelector("[data-original]") ?? null).toBeNull();

          setStyleSheetMapping("csr-parallel-b", sheetB);
          await host.updateComplete;

          expect(shadowAdoptedSheets(host)).toContain(sheetA);
          expect(shadowAdoptedSheets(host)).toContain(sheetB);
          expect(host.shadowRoot!.querySelector("[data-original]")).not.toBeNull();
        });

        test("late `setStyleSheetMapping` (i.e. the DS finishes registering after the component is constructed) still results in the styles being applied", async () => {
          const host = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["csr-late-resolve"]
          });

          const sheet = makeStyleSheet("p { color: rgb(99, 0, 99); }");
          setStyleSheetMapping("csr-late-resolve", sheet);
          await host.updateComplete;

          expect(shadowAdoptedSheets(host)).toContain(sheet);
        });

        test("the prototype's promise slot is cleared after the joined promise resolves (so future instances skip the extra microtask)", async () => {
          const tag = uniqueTag();
          const ctor = registerClass(tag, {
            sharedDesignSystemStyles: ["csr-clear-slot"]
          });

          const promiseBefore = readPrototypeSlot<Promise<void> | undefined>(
            ctor,
            PROMISE_SLOT_DESCRIPTION
          );
          expect(
            promiseBefore,
            "The promise slot must be populated while the bundle is pending"
          ).toBeInstanceOf(Promise);

          const sheet = makeStyleSheet("p { color: rgb(0, 255, 0); }");
          setStyleSheetMapping("csr-clear-slot", sheet);

          // Give the .then in the decorator a chance to run.
          await flushMicroAndMacroTasks();

          const promiseAfter = readPrototypeSlot<Promise<void> | undefined>(
            ctor,
            PROMISE_SLOT_DESCRIPTION
          );
          expect(
            promiseAfter,
            "The promise slot must be cleared after the joined promise resolves"
          ).toBeUndefined();
        });

        test("an instance constructed AFTER the promise resolves does not await anything (cache-hit path)", async () => {
          const tag = uniqueTag();
          const ctor = registerClass(tag, {
            sharedDesignSystemStyles: ["csr-construct-after-resolve"]
          });

          const sheet = makeStyleSheet("p { color: rgb(0, 0, 200); }");
          setStyleSheetMapping("csr-construct-after-resolve", sheet);
          // Let the decorator's .then run, clearing the promise slot.
          await flushMicroAndMacroTasks();

          // Now create the first instance. The promise slot is already
          // undefined, so adoptSharedStyleSheets returns synchronously.
          const host = document.createElement(tag) as KasstorElement;
          document.body.appendChild(host);
          trackHost(host);

          await host.updateComplete;

          expect(shadowAdoptedSheets(host)).toContain(sheet);
          // Slot is still undefined post-update.
          expect(
            readPrototypeSlot<Promise<void> | undefined>(ctor, PROMISE_SLOT_DESCRIPTION)
          ).toBeUndefined();
        });
      });
    });
  });
});
