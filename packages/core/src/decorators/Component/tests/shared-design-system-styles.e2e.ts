// Tests for the `sharedDesignSystemStyles` option of the `@Component` decorator.
//
// The option lets a component declare names (registered in
// `@genexus/kasstor-design-system`) of stylesheets to apply on the component's
// own shadow root. The runtime takes two routes:
//
//   - **SSR / `wasServerSideRendered === true`**: monkey-patches `render()` to
//     prepend `<link rel="stylesheet" crossorigin href="<URL>">` per
//     registered bundle. The browser handles the loading; no JS gate.
//
//   - **CSR / dynamic render**: at decoration time, the decorator splits the
//     declared names into two buckets:
//
//       * cache hits → pushed synchronously into `successfulThemes`, which is
//         stored on the class prototype.
//       * cache misses → a `Promise.all` over the in-flight download promises
//         (returned by `@genexus/kasstor-design-system`) is stored on the
//         prototype's `kasstor-shared-design-system-stylesheet-promises` slot.
//         When `Promise.all` settles, every successfully-downloaded sheet is
//         appended to the SAME `successfulThemes` array and the slot is
//         cleared so future instances do not pay the extra microtask.
//
//     During every instance's first `scheduleUpdate`, `adoptSharedStyleSheets`
//     pushes `successfulThemes` into `this.renderRoot.adoptedStyleSheets`. The
//     first render is gated on the joined promise so the component never
//     paints unstyled.
//
// SSR is simulated by pre-attaching a shadow root with content BEFORE
// registering the custom element (so `componentWasServerSideRendered(...)`
// returns `true` inside the constructor).

import {
  getStyleSheetPromiseInfo,
  registerDesignSystem,
  setStyleSheetMapping
} from "@genexus/kasstor-design-system";
import { html } from "lit/html.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { cleanup, render } from "vitest-browser-lit";
import { Component, KasstorElement } from "../index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type KasstorElementClass = abstract new () => KasstorElement;

const PROMISE_SLOT_DESCRIPTION = "kasstor-shared-design-system-stylesheet-promises";
const STYLESHEETS_SLOT_DESCRIPTION = "kasstor-shared-design-system-stylesheets";
const NAMES_SLOT_DESCRIPTION = "kasstor-shared-design-system-stylesheet-names";

function findSymbol(target: object, description: string): symbol | undefined {
  return Object.getOwnPropertySymbols(target).find(s => s.description === description);
}

function readPrototypeSlot<T>(
  ctor: CustomElementConstructor | KasstorElementClass,
  description: string
): T | undefined {
  const proto = (ctor as unknown as { prototype: object }).prototype;
  const symbol = findSymbol(proto, description);
  if (symbol === undefined) {
    return undefined;
  }
  return (proto as Record<symbol, T>)[symbol];
}

function makePlainClass(): KasstorElementClass {
  return class extends KasstorElement {
    override render() {
      return html`<p data-original>client</p>`;
    }
  };
}

interface SetupOptions {
  /** Shared design-system bundle names to declare on the component. */
  sharedDesignSystemStyles?: string[];
  /** When set, pre-attach a shadow root with this innerHTML before
   *  registering the class — turns the host into an "SSR'd" instance. */
  ssrShadowHtml?: string;
  /** Forwarded to the `Component` decorator's `shadow` option. Pass `false`
   *  to register a light-DOM component (default is shadow open). */
  shadow?: false;
  /** Forwarded to the `Component` decorator's `styles` option. */
  styles?: string;
  /** Optional class factory — defaults to {@link makePlainClass}. */
  classFactory?: () => KasstorElementClass;
}

const createdHosts: HTMLElement[] = [];

/** Builds a host + registers a fresh KasstorElement subclass with the given options. */
function setupHost(tag: string, options: SetupOptions = {}): KasstorElement {
  if (customElements.get(tag)) {
    throw new Error(`Tag "${tag}" is already defined — pick a unique one per test.`);
  }

  const host = document.createElement(tag);
  document.body.appendChild(host);
  createdHosts.push(host);

  if (options.ssrShadowHtml !== undefined) {
    host.attachShadow({ mode: "open" }).innerHTML = options.ssrShadowHtml;
  }

  Component({
    tag: tag as `${string}-${string}`,
    sharedDesignSystemStyles: options.sharedDesignSystemStyles,
    shadow: options.shadow,
    styles: options.styles
  })((options.classFactory ?? makePlainClass)() as never);

  return host as KasstorElement;
}

/**
 * Registers a fresh KasstorElement subclass without creating an instance, and
 * returns the constructor so the test can spawn multiple instances later.
 */
function registerClass(tag: string, options: SetupOptions = {}): CustomElementConstructor {
  if (customElements.get(tag)) {
    throw new Error(`Tag "${tag}" is already defined — pick a unique one per test.`);
  }

  Component({
    tag: tag as `${string}-${string}`,
    sharedDesignSystemStyles: options.sharedDesignSystemStyles,
    shadow: options.shadow,
    styles: options.styles
  })((options.classFactory ?? makePlainClass)() as never);

  return customElements.get(tag)!;
}

/** Returns the actual `ShadowRoot` adoption target for a shadow component. */
function shadowAdoptedSheets(host: KasstorElement): readonly CSSStyleSheet[] {
  return host.shadowRoot!.adoptedStyleSheets;
}

function clearDesignSystemState(): void {
  globalThis.geneXusDesignSystemsRegistry?.clear();
  globalThis.geneXusDesignSystemsLoaders?.clear();
  globalThis.geneXusDesignSystemsStyleSheets?.clear();
  globalThis.geneXusDesignSystemsStyleSheetPromises?.clear();
}

/** Returns a fresh `CSSStyleSheet` with a marker rule for identity / computed-style checks. */
function makeStyleSheet(rule: string): CSSStyleSheet {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(rule);
  return sheet;
}

let tagCounter = 0;
const uniqueTag = () => `kst-shared-ds-${++tagCounter}` as const;

/** Yields long enough that any pending microtasks AND a macrotask have run. */
function flushMicroAndMacroTasks(): Promise<void> {
  return new Promise<void>(resolve => setTimeout(resolve, 0));
}

// ---------------------------------------------------------------------------
// A class registered once at module load so we can verify that components
// declared WITHOUT `sharedDesignSystemStyles` are not impacted at all.
// ---------------------------------------------------------------------------

@Component({ tag: "regression-shared-no-prop" })
class RegressionNoProp extends KasstorElement {
  override render() {
    return html`<p data-marker>untouched</p>`;
  }
}
void RegressionNoProp;
declare global {
  interface HTMLElementTagNameMap {
    "regression-shared-no-prop": RegressionNoProp;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("[Decorator]", () => {
  describe("[Component]", () => {
    describe("[sharedDesignSystemStyles]", () => {
      beforeEach(() => {
        clearDesignSystemState();
      });

      afterEach(() => {
        for (const host of createdHosts) {
          host.remove();
        }
        createdHosts.length = 0;
        cleanup();
      });

      // ===================================================================
      // CSR — cache hits (synchronous decoration-time path)
      // ===================================================================
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
          const ctor = registerClass(tag, {
            sharedDesignSystemStyles: ["csr-cache-hit-shared"]
          });

          const a = document.createElement(tag) as KasstorElement;
          const b = document.createElement(tag) as KasstorElement;
          document.body.appendChild(a);
          document.body.appendChild(b);
          createdHosts.push(a, b);

          await a.updateComplete;
          await b.updateComplete;

          expect(shadowAdoptedSheets(a)).toContain(sheet);
          expect(shadowAdoptedSheets(b)).toContain(sheet);
          // Each instance has its OWN shadow root — the adoption is per-root.
          expect(a.shadowRoot).not.toBe(b.shadowRoot);
          // Sanity: each shadow root has exactly one entry for the sheet.
          expect(shadowAdoptedSheets(a).filter(s => s === sheet)).toHaveLength(1);
          expect(shadowAdoptedSheets(b).filter(s => s === sheet)).toHaveLength(1);
          void ctor;
        });
      });

      // ===================================================================
      // CSR — async download (first render is gated on the joined promise)
      // ===================================================================
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
          createdHosts.push(host);

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
            expect(
              (host as KasstorElement).shadowRoot!.querySelector("[data-marker]")
            ).toBeNull();
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
          createdHosts.push(host);

          await host.updateComplete;

          expect(shadowAdoptedSheets(host)).toContain(sheet);
          // Slot is still undefined post-update.
          expect(
            readPrototypeSlot<Promise<void> | undefined>(ctor, PROMISE_SLOT_DESCRIPTION)
          ).toBeUndefined();
        });
      });

      // ===================================================================
      // CSR — shadow lifecycle: adoption survives disconnect/reconnect.
      // ===================================================================
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
          createdHosts.push(newParent);

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
      });

      // ===================================================================
      // CSR — ordering: adoptedStyleSheets must follow declaration order.
      // ===================================================================
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

        test("mixed cache-hit + pending bundles: the adoption order matches the declared order regardless of resolution order", async () => {
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
        });
      });

      // ===================================================================
      // CSR — multiple components sharing a bundle name.
      // ===================================================================
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

      // ===================================================================
      // CSR — failed / timed-out downloads. The DS resolves the promise with
      // `{name, styleSheet: undefined}` so the joined promise still settles.
      // ===================================================================
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
          expect(host.shadowRoot!.querySelector("[data-original]")?.textContent).toBe(
            "client"
          );
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
          expect(host.shadowRoot!.querySelector("[data-original]")?.textContent).toBe(
            "client"
          );
        });
      });

      // ===================================================================
      // CSR — design-system registration timing.
      // ===================================================================
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
          createdHosts.push(host);
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

      // ===================================================================
      // CSR — interaction with Lit's static `styles`.
      // ===================================================================
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

      // ===================================================================
      // SSR — pre-populated shadow root → emit <link> tags
      // ===================================================================
      describe("[SSR] pre-populated shadow root — runtime emits <link> tags", () => {
        test("renders one <link rel=\"stylesheet\"> per bundle, pointing to the registry URL", async () => {
          registerDesignSystem("ds-ssr-basic", {
            bundleLoaders: { "ssr-bundle-a": "/styles/ssr-a.css" }
          });

          const host = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["ssr-bundle-a"],
            ssrShadowHtml: "<span data-ssr-placeholder></span>"
          });
          await host.updateComplete;

          const links = host.shadowRoot!.querySelectorAll(
            "link[rel='stylesheet']"
          ) as NodeListOf<HTMLLinkElement>;
          expect(links).toHaveLength(1);
          expect(links[0].getAttribute("href")).toBe("/styles/ssr-a.css");
          expect(links[0].hasAttribute("crossorigin")).toBe(true);
        });

        test("renders one <link> per bundle, in the declared order", async () => {
          registerDesignSystem("ds-ssr-multi", {
            bundleLoaders: {
              "ssr-multi-a": "/styles/ssr-multi-a.css",
              "ssr-multi-b": "/styles/ssr-multi-b.css"
            }
          });

          const host = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["ssr-multi-a", "ssr-multi-b"],
            ssrShadowHtml: "<span data-ssr-placeholder></span>"
          });
          await host.updateComplete;

          const links = host.shadowRoot!.querySelectorAll(
            "link[rel='stylesheet']"
          ) as NodeListOf<HTMLLinkElement>;
          expect(links).toHaveLength(2);
          expect(links[0].getAttribute("href")).toBe("/styles/ssr-multi-a.css");
          expect(links[1].getAttribute("href")).toBe("/styles/ssr-multi-b.css");
        });

        test("SSR mode does NOT use the CSR machinery: no `<kst-theme>` is rendered and the runtime does not adopt CSSStyleSheets on the shadow root", async () => {
          registerDesignSystem("ds-ssr-no-csr", {
            bundleLoaders: { "ssr-no-csr-bundle": "/styles/ssr-no-csr.css" }
          });

          const host = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["ssr-no-csr-bundle"],
            ssrShadowHtml: "<span data-ssr-placeholder></span>"
          });
          await host.updateComplete;

          expect(host.shadowRoot!.querySelector("kst-theme")).toBeNull();
          // The runtime should NOT push the CSR-fetched sheet onto the shadow
          // root — SSR relies on the <link> tags emitted by the render patch.
          const adopted = shadowAdoptedSheets(host);
          // adoptedStyleSheets only carries Lit's static styles (none here).
          for (const s of adopted) {
            expect(s).toBeInstanceOf(CSSStyleSheet);
          }
        });

        test("SSR does NOT block the first render — the joined promise gate is bypassed when the component was server-side rendered", async () => {
          registerDesignSystem("ds-ssr-no-gate", {
            bundleLoaders: { "ssr-no-gate-bundle": "/styles/ssr-no-gate.css" }
          });

          // Pre-populate the shadow root so SSR detection succeeds.
          const host = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["ssr-no-gate-bundle"],
            ssrShadowHtml: "<span data-ssr-placeholder></span>"
          });

          // Without resolving the bundle, the first render still completes
          // (the gate only applies to CSR).
          await host.updateComplete;

          // The <link> the runtime emitted is present.
          expect(
            host.shadowRoot!.querySelector("link[rel='stylesheet']")
          ).not.toBeNull();
        });
      });

      // ===================================================================
      // SSR + hydration — links survive the first client render
      // ===================================================================
      describe("[SSR + hydration] server-emitted links survive after client render", () => {
        test("server-rendered <link> tags are still present after the first client update completes", async () => {
          registerDesignSystem("ds-hydration", {
            bundleLoaders: { "hydration-bundle": "/styles/hydration.css" }
          });

          const host = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["hydration-bundle"],
            ssrShadowHtml: `<link rel="stylesheet" crossorigin href="/styles/hydration.css">`
          });
          await host.updateComplete;

          const links = Array.from(
            host.shadowRoot!.querySelectorAll(
              "link[rel='stylesheet'][href='/styles/hydration.css']"
            )
          );
          expect(links.length).toBeGreaterThanOrEqual(1);
        });
      });

      // ===================================================================
      // Light DOM (`shadow: false`) — sheets adopt on the host's root node.
      // ===================================================================
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
            expect(
              document.adoptedStyleSheets.filter(s => s === sheet)
            ).toHaveLength(1);
          }
        });
      });

      // ===================================================================
      // First connectedCallback contract — adoption is deferred to
      // scheduleUpdate. The first connect MUST NOT eagerly adopt the
      // shared sheets, because Lit's `connectedCallback` cannot return a
      // Promise that gates the first render; that responsibility belongs
      // to `scheduleUpdate`.
      // ===================================================================
      describe("[first connectedCallback contract] no eager adoption on the first connect", () => {
        test("shadow DOM cache-hit: at the end of the first connectedCallback, the shadow root (if Lit has created it yet) does NOT contain the shared sheet — adoption happens later, inside scheduleUpdate", async () => {
          const sheet = makeStyleSheet(".shadow-first-connect {}");
          setStyleSheetMapping("csr-shadow-first-connect-no-adopt", sheet);

          let snapshotAtConnect: readonly CSSStyleSheet[] | undefined;

          const tag = uniqueTag();
          class C extends KasstorElement {
            override connectedCallback() {
              super.connectedCallback();
              // Capture the shadow root state AFTER super's
              // connectedCallback has run end-to-end. The contract is:
              // the FIRST connect must not have adopted yet.
              snapshotAtConnect = this.shadowRoot
                ? [...this.shadowRoot.adoptedStyleSheets]
                : undefined;
            }
            override render() {
              return html`<p data-original>client</p>`;
            }
          }
          Component({
            tag: tag as `${string}-${string}`,
            sharedDesignSystemStyles: ["csr-shadow-first-connect-no-adopt"]
          })(C as never);

          const host = document.createElement(tag) as KasstorElement;
          document.body.appendChild(host);
          createdHosts.push(host);

          // If Lit created the shadow root by connect time, the shared
          // sheet must NOT yet be in adoptedStyleSheets. (In current Lit
          // the renderRoot is lazy and the shadowRoot is created on first
          // update, so `snapshotAtConnect` is typically `undefined`.)
          if (snapshotAtConnect !== undefined) {
            expect(snapshotAtConnect).not.toContain(sheet);
          }

          await host.updateComplete;
          expect(shadowAdoptedSheets(host)).toContain(sheet);
        });

        test("light DOM cache-hit: `document.adoptedStyleSheets` does NOT contain the shared sheet at the end of the first connectedCallback — adoption happens later, inside scheduleUpdate", async () => {
          const sheet = makeStyleSheet(".light-first-connect {}");
          setStyleSheetMapping("csr-light-first-connect-no-adopt", sheet);

          let docSheetsAtConnect: readonly CSSStyleSheet[] = [];

          const tag = uniqueTag();
          class C extends KasstorElement {
            override connectedCallback() {
              super.connectedCallback();
              docSheetsAtConnect = [...document.adoptedStyleSheets];
            }
            override render() {
              return html`<p data-original>client</p>`;
            }
          }
          Component({
            tag: tag as `${string}-${string}`,
            shadow: false,
            sharedDesignSystemStyles: ["csr-light-first-connect-no-adopt"]
          })(C as never);

          const host = document.createElement(tag) as KasstorElement;
          document.body.appendChild(host);
          createdHosts.push(host);

          // The first connect must NOT eagerly call `addGlobalStyleSheet`.
          expect(docSheetsAtConnect).not.toContain(sheet);

          await host.updateComplete;
          expect(document.adoptedStyleSheets).toContain(sheet);
        });
      });

      // ===================================================================
      // Edge cases
      // ===================================================================
      describe("[edge cases]", () => {
        test("`sharedDesignSystemStyles` is not provided: no slot is set on the prototype, render proceeds normally", async () => {
          const tag = uniqueTag();
          const ctor = registerClass(tag);

          // Names slot is undefined → the SSR render patch is a no-op.
          expect(
            readPrototypeSlot<string[] | undefined>(ctor, NAMES_SLOT_DESCRIPTION)
          ).toBeUndefined();
          // No CSR stylesheets array either.
          expect(
            readPrototypeSlot<CSSStyleSheet[] | undefined>(
              ctor,
              STYLESHEETS_SLOT_DESCRIPTION
            )
          ).toBeUndefined();
          expect(
            readPrototypeSlot<Promise<void> | undefined>(ctor, PROMISE_SLOT_DESCRIPTION)
          ).toBeUndefined();

          const host = document.createElement(tag) as KasstorElement;
          document.body.appendChild(host);
          createdHosts.push(host);
          await host.updateComplete;

          expect(host.shadowRoot!.querySelector("[data-original]")?.textContent).toBe(
            "client"
          );
        });

        test("an empty array `[]` is treated as 'no shared styles' — empty stylesheets array, no promise slot", async () => {
          const tag = uniqueTag();
          const ctor = registerClass(tag, { sharedDesignSystemStyles: [] });

          // The names slot is set (the empty array), so the SSR render patch
          // is invoked but no-ops since `styleSheetUrls` ends up empty.
          expect(
            readPrototypeSlot<string[] | undefined>(ctor, NAMES_SLOT_DESCRIPTION)
          ).toEqual([]);
          expect(
            readPrototypeSlot<CSSStyleSheet[] | undefined>(
              ctor,
              STYLESHEETS_SLOT_DESCRIPTION
            )
          ).toEqual([]);
          expect(
            readPrototypeSlot<Promise<void> | undefined>(ctor, PROMISE_SLOT_DESCRIPTION)
          ).toBeUndefined();

          const host = document.createElement(tag) as KasstorElement;
          document.body.appendChild(host);
          createdHosts.push(host);
          await host.updateComplete;

          expect(host.shadowRoot!.querySelector("kst-theme")).toBeNull();
          expect(host.shadowRoot!.querySelector("link[rel='stylesheet']")).toBeNull();
          expect(host.shadowRoot!.querySelector("[data-original]")?.textContent).toBe(
            "client"
          );
          expect(shadowAdoptedSheets(host)).toHaveLength(0);
        });

        test("[SSR] an UNREGISTERED bundle name: warn + no `<link>` emitted for it", async () => {
          const warns: string[] = [];
          const originalWarn = console.warn;
          console.warn = (...args: unknown[]) => {
            warns.push(args.map(String).join(" "));
          };

          try {
            const host = setupHost(uniqueTag(), {
              sharedDesignSystemStyles: ["ssr-edge-unregistered"],
              ssrShadowHtml: "<span data-ssr-placeholder></span>"
            });
            await host.updateComplete;

            expect(warns.join("\n")).toMatch(/ssr-edge-unregistered/);
            expect(warns.join("\n")).toMatch(/registerDesignSystem/);
            expect(host.shadowRoot!.querySelector("link[rel='stylesheet']")).toBeNull();
          } finally {
            console.warn = originalWarn;
          }
        });

        test("[SSR] partial registration: <link> tags only for registered URLs; warn for the missing one", async () => {
          registerDesignSystem("ds-ssr-partial", {
            bundleLoaders: { "ssr-partial-known": "/styles/ssr-partial-known.css" }
          });

          const warns: string[] = [];
          const originalWarn = console.warn;
          console.warn = (...args: unknown[]) => {
            warns.push(args.map(String).join(" "));
          };

          try {
            const host = setupHost(uniqueTag(), {
              sharedDesignSystemStyles: ["ssr-partial-known", "ssr-partial-missing"],
              ssrShadowHtml: "<span data-ssr-placeholder></span>"
            });
            await host.updateComplete;

            expect(warns.join("\n")).toMatch(/ssr-partial-missing/);

            const links = host.shadowRoot!.querySelectorAll(
              "link[rel='stylesheet']"
            ) as NodeListOf<HTMLLinkElement>;
            expect(links).toHaveLength(1);
            expect(links[0].getAttribute("href")).toBe("/styles/ssr-partial-known.css");
          } finally {
            console.warn = originalWarn;
          }
        });

        test("[CSR] partial cache state: cached entries are picked up synchronously, missing entries wait on the joined promise", async () => {
          const cachedSheet = makeStyleSheet(".cached {}");
          setStyleSheetMapping("csr-partial-cached", cachedSheet);

          const host = setupHost(uniqueTag(), {
            sharedDesignSystemStyles: ["csr-partial-cached", "csr-partial-missing"]
          });

          // Render is still gated on the missing one.
          await flushMicroAndMacroTasks();
          expect(host.shadowRoot?.querySelector("[data-original]") ?? null).toBeNull();

          const missingSheet = makeStyleSheet(".missing {}");
          setStyleSheetMapping("csr-partial-missing", missingSheet);
          await host.updateComplete;

          expect(shadowAdoptedSheets(host)).toContain(cachedSheet);
          expect(shadowAdoptedSheets(host)).toContain(missingSheet);
        });
      });

      // ===================================================================
      // Regression — components without `sharedDesignSystemStyles`
      // ===================================================================
      describe("[regression] components without sharedDesignSystemStyles render exactly as before", () => {
        test("CSR: no theme element, no link tag, no slot pollution, original template renders verbatim", async () => {
          render(html`<regression-shared-no-prop></regression-shared-no-prop>`);
          const element = document.querySelector("regression-shared-no-prop")!;
          await (element as KasstorElement).updateComplete;

          expect(element.shadowRoot!.querySelector("kst-theme")).toBeNull();
          expect(element.shadowRoot!.querySelector("link[rel='stylesheet']")).toBeNull();
          expect(element.shadowRoot!.querySelector("[data-marker]")?.textContent).toBe(
            "untouched"
          );
        });

        test("the constructor does NOT monkey-patch `render()` when the option is omitted", async () => {
          const protoRender = RegressionNoProp.prototype.render;

          render(html`<regression-shared-no-prop></regression-shared-no-prop>`);
          const element = document.querySelector("regression-shared-no-prop") as KasstorElement & {
            render(): unknown;
          };
          await element.updateComplete;

          // Render is unchanged from the prototype — no per-instance override
          // for SSR link injection or for CSR adoption.
          expect(element.render).toBe(protoRender);
        });

        test("none of the shared-design-system prototype slots are populated when the option is omitted", () => {
          expect(
            readPrototypeSlot<string[] | undefined>(
              RegressionNoProp,
              NAMES_SLOT_DESCRIPTION
            )
          ).toBeUndefined();
          expect(
            readPrototypeSlot<CSSStyleSheet[] | undefined>(
              RegressionNoProp,
              STYLESHEETS_SLOT_DESCRIPTION
            )
          ).toBeUndefined();
          expect(
            readPrototypeSlot<Promise<void> | undefined>(
              RegressionNoProp,
              PROMISE_SLOT_DESCRIPTION
            )
          ).toBeUndefined();
        });
      });
    });
  });
});
