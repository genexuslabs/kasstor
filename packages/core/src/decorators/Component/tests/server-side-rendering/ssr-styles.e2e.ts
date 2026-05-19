// SSR + styles: validates that the `@Component` decorator's `styles` and
// `globalStyles` options behave correctly when the host element is
// server-side rendered (shadow root pre-populated before upgrade).
//
// Two phases are exercised:
//
// 1. Initial render — the first update cycle right after the SSR'd element
//    upgrades. The SSR'd HTML typically includes a server-emitted inline
//    `<style>` inside the shadow root (because adoptedStyleSheets cannot be
//    serialized). Lit then replaces that content on the first render and
//    swaps in adoptedStyleSheets — these tests pin down what's visible at
//    each step.
//
// 2. Post-hydration updates — once Lit has taken over, property changes
//    re-render the template. Stylesheet adoption must be idempotent: no
//    duplicates accumulate on the shadow root or on the document.

import { html } from "lit/html.js";
import { afterEach, describe, expect, test } from "vitest";
import { cleanup } from "vitest-browser-lit";
import { Component, KasstorElement } from "../../index.js";
import {
  cleanupSsrHosts,
  readSsrFlag,
  ssrCreatedHosts,
  type KasstorElementClass
} from "./_helpers.js";

// ---------------------------------------------------------------------------
// Helpers local to this file
// ---------------------------------------------------------------------------

/** Counts how many entries in a sheets array reference the same sheet. */
function countSheet(sheets: readonly CSSStyleSheet[], target: CSSStyleSheet): number {
  let n = 0;
  for (const s of sheets) {
    if (s === target) {
      n++;
    }
  }
  return n;
}

/**
 * Reads the CSSStyleSheet the decorator stored on the prototype under the
 * private `kasstor-global-stylesheet` Symbol. Mirrors what the e2e tests in
 * `component-styles.e2e.ts` do — there's no public API, but the symbol's
 * JSDoc explicitly documents this lookup for tests/tooling.
 */
function prototypeGlobalStyles(ctor: CustomElementConstructor): CSSStyleSheet | undefined {
  const proto = ctor.prototype as object;
  const symbol = Object.getOwnPropertySymbols(proto).find(
    s => s.description === "kasstor-global-stylesheet"
  );
  if (!symbol) {
    return undefined;
  }
  return (proto as Record<symbol, CSSStyleSheet | undefined>)[symbol];
}

/** Returns the constructor registered for `tag`, asserting it exists. */
function getRegisteredCtor(tag: string): CustomElementConstructor {
  const ctor = customElements.get(tag);
  if (!ctor) {
    throw new Error(`Custom element "${tag}" is not registered`);
  }
  return ctor;
}

interface SetupSsrStyledOptions {
  styles?: string;
  globalStyles?: string;
}

/**
 * Like `setupServerRenderedHost`, but threads `styles` and `globalStyles`
 * through to the `@Component` decorator at registration time.
 */
function setupSsrStyledHost(
  tag: string,
  ctor: KasstorElementClass,
  shadowInnerHtml: string,
  componentOptions?: SetupSsrStyledOptions
): HTMLElement {
  if (customElements.get(tag)) {
    throw new Error(`Tag "${tag}" is already defined`);
  }

  const host = document.createElement(tag);
  document.body.appendChild(host);
  ssrCreatedHosts.push(host);
  host.attachShadow({ mode: "open" }).innerHTML = shadowInnerHtml;

  Component({
    tag: tag as `${string}-${string}`,
    styles: componentOptions?.styles,
    globalStyles: componentOptions?.globalStyles
  })(ctor as never);

  return host;
}

// ---------------------------------------------------------------------------
// Component factories
// ---------------------------------------------------------------------------

function makeSimpleStyledClass(): KasstorElementClass {
  return class extends KasstorElement {
    override render() {
      return html`<p data-source="client">client-rendered</p>`;
    }
  };
}

interface SsrUpdatableInstance extends KasstorElement {
  text: string;
}
function makeUpdatableStyledClass(): KasstorElementClass {
  return class extends KasstorElement implements SsrUpdatableInstance {
    static override properties = { text: { type: String } };
    text: string = "initial";
    override render() {
      return html`<p data-text>${this.text}</p>`;
    }
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("[Decorator]", () => {
  describe("[Component]", () => {
    describe("[server-side rendering: styles & globalStyles]", () => {
      afterEach(() => {
        cleanupSsrHosts();
        cleanup();
      });

      // ===================================================================
      // Phase 1 — initial render (immediately after SSR upgrade)
      // ===================================================================

      describe("phase 1: initial render after SSR", () => {
        test("shadow + styles: BEFORE the first update, both the SSR-emitted inline `<style>` AND Lit's adoptedStyleSheets are already in place (styles are adopted in connectedCallback, ahead of render)", () => {
          const host = setupSsrStyledHost(
            "ssr-styles-pre-render-inline",
            makeSimpleStyledClass(),
            "<style>p { color: rgb(0, 128, 0); }</style><p data-source='server'>server</p>",
            { styles: "p { color: rgb(0, 128, 0); }" }
          );

          // The shadow root contains the server's inline `<style>` AND content.
          const styleEl = host.shadowRoot!.querySelector("style");
          expect(styleEl).not.toBeNull();
          expect(styleEl!.textContent).toContain("color: rgb(0, 128, 0)");

          // adoptedStyleSheets is ALREADY populated — LitElement's
          // `connectedCallback` calls `createRenderRoot`, which adopts the
          // static `styles` onto the shadow root before the first render.
          expect(host.shadowRoot!.adoptedStyleSheets.length).toBe(1);

          // SSR detection succeeded.
          expect(readSsrFlag(host)).toBe(true);

          // The SSR'd `<p>` is the only `<p>` so far — Lit hasn't rendered yet.
          expect(host.shadowRoot!.querySelectorAll("p").length).toBe(1);
        });

        test("shadow + styles: AFTER the first update, Lit renders BEFORE the SSR'd content (LitElement's `renderBefore=firstChild` trick) — both `<p>`s coexist and both pick up the computed style", async () => {
          const host = setupSsrStyledHost(
            "ssr-styles-shadow-after-update",
            makeSimpleStyledClass(),
            "<style>p { color: rgb(0, 128, 0); }</style><p data-source='server'>server</p>",
            { styles: "p { color: rgb(0, 128, 0); }" }
          ) as KasstorElement;

          await host.updateComplete;

          // Lit (without `lit-element-hydrate-support`) does NOT clean up the
          // pre-existing shadow root content. It inserts the rendered template
          // BEFORE the original `firstChild`, so the SSR'd nodes survive as a
          // tail. The render order ends up: [Lit marker, client `<p>`,
          // SSR'd `<style>`, SSR'd `<p>server</p>`].
          const ps = host.shadowRoot!.querySelectorAll("p");
          expect(ps.length).toBe(2);
          expect(ps[0].getAttribute("data-source")).toBe("client");
          expect(ps[1].getAttribute("data-source")).toBe("server");

          // The server's inline `<style>` is also still present.
          expect(host.shadowRoot!.querySelector("style")).not.toBeNull();

          // adoptedStyleSheets stays at exactly one entry — no duplicates
          // accumulate even though there's also an inline `<style>` next to it.
          expect(host.shadowRoot!.adoptedStyleSheets.length).toBe(1);

          // Both `<p>`s are styled by the rule (it targets every `p`).
          for (const p of ps) {
            expect(getComputedStyle(p).color).toBe("rgb(0, 128, 0)");
          }
        });

        test("shadow + globalStyles: globalStyles are adopted on the document during connectedCallback — BEFORE the first update", () => {
          const TAG = "ssr-styles-global-pre-update";
          const host = setupSsrStyledHost(
            TAG,
            makeSimpleStyledClass(),
            "<p>server</p>",
            { globalStyles: `${TAG} { background-color: rgb(0, 0, 255); }` }
          );

          const sheet = prototypeGlobalStyles(getRegisteredCtor(TAG))!;
          expect(sheet).toBeInstanceOf(CSSStyleSheet);
          expect(document.adoptedStyleSheets).toContain(sheet);

          // The host (in the document) is styled by the global sheet from
          // outside. We use a non-inherited property so accidental inheritance
          // across the shadow boundary can't mask the result.
          expect(getComputedStyle(host).backgroundColor).toBe("rgb(0, 0, 255)");

          // The SSR'd inner content is still intact at this point — Lit
          // hasn't run yet.
          expect(host.shadowRoot!.querySelector("p")!.textContent).toBe("server");
        });

        test("shadow + globalStyles: after the first update, the sheet stays adopted exactly once on the document", async () => {
          const TAG = "ssr-styles-global-after-update";
          const host = setupSsrStyledHost(
            TAG,
            makeSimpleStyledClass(),
            "<p>server</p>",
            { globalStyles: `${TAG} { background-color: rgb(0, 0, 255); }` }
          ) as KasstorElement;

          await host.updateComplete;

          const sheet = prototypeGlobalStyles(getRegisteredCtor(TAG))!;
          expect(countSheet(document.adoptedStyleSheets, sheet)).toBe(1);
          expect(getComputedStyle(host).backgroundColor).toBe("rgb(0, 0, 255)");
        });

        test("shadow + styles + globalStyles: both apply independently — `styles` in the shadow root, `globalStyles` on the document", async () => {
          const TAG = "ssr-styles-both-after-update";
          const host = setupSsrStyledHost(
            TAG,
            makeSimpleStyledClass(),
            "<style>p { color: rgb(11, 22, 33); }</style><p>server</p>",
            {
              styles: "p { color: rgb(11, 22, 33); }",
              globalStyles: `${TAG} { background-color: rgb(44, 55, 66); }`
            }
          ) as KasstorElement;

          await host.updateComplete;

          // styles → shadow (exactly one entry; no leakage of the merged
          // server inline style)
          expect(host.shadowRoot!.adoptedStyleSheets.length).toBe(1);
          expect(getComputedStyle(host.shadowRoot!.querySelector("p")!).color).toBe(
            "rgb(11, 22, 33)"
          );

          // globalStyles → document
          const globalSheet = prototypeGlobalStyles(getRegisteredCtor(TAG))!;
          expect(document.adoptedStyleSheets).toContain(globalSheet);
          expect(getComputedStyle(host).backgroundColor).toBe("rgb(44, 55, 66)");
        });

        test("shadow: false + styles + light-DOM SSR: the merged stylesheet is adopted on document; Lit's render appends after the SSR'd light-DOM content (Kasstor overrides `createRenderRoot`, so the `renderBefore` trick doesn't apply)", async () => {
          const TAG = "ssr-styles-no-shadow";
          const ctor = class extends KasstorElement {
            override render() {
              return html`<p data-source="client">client</p>`;
            }
          };

          // Pre-populate the LIGHT DOM — this is what a SSR'd shadow:false
          // component would look like in the page.
          const host = document.createElement(TAG);
          host.innerHTML = "<p data-source='server'>server</p>";
          document.body.appendChild(host);
          ssrCreatedHosts.push(host);

          Component({
            tag: TAG,
            shadow: false,
            styles: `${TAG} p { color: rgb(200, 100, 0); }`
          })(ctor as never);

          await (host as KasstorElement).updateComplete;

          // SSR detection does NOT trigger for shadow:false (documented
          // limitation in `ssr-detection.e2e.ts`).
          expect(readSsrFlag(host)).toBe(false);

          // The decorator's `shadow: false` branch overrides `createRenderRoot`
          // with `return this`, bypassing LitElement's `renderBefore=firstChild`
          // trick. So lit-html appends its rendered template AFTER the existing
          // light-DOM content: [<p server>, marker, <p client>].
          const ps = host.querySelectorAll("p");
          expect(ps.length).toBe(2);
          expect(ps[0].getAttribute("data-source")).toBe("server");
          expect(ps[1].getAttribute("data-source")).toBe("client");

          // The decorator merged `styles` into the global sheet and adopted
          // it on the document — both light-DOM `<p>`s pick up the rule.
          const sheet = prototypeGlobalStyles(getRegisteredCtor(TAG))!;
          expect(document.adoptedStyleSheets).toContain(sheet);
          for (const p of ps) {
            expect(getComputedStyle(p).color).toBe("rgb(200, 100, 0)");
          }
        });
      });

      // ===================================================================
      // Phase 2 — post-hydration updates
      // ===================================================================

      describe("phase 2: post-hydration updates", () => {
        test("shadow + styles: adopted stylesheet survives many property updates with no duplicates and no loss", async () => {
          const host = setupSsrStyledHost(
            "ssr-styles-shadow-update",
            makeUpdatableStyledClass(),
            "<style>p { color: rgb(0, 128, 0); }</style><p data-text>initial</p>",
            { styles: "p { color: rgb(0, 128, 0); }" }
          ) as unknown as SsrUpdatableInstance;

          await host.updateComplete;

          const sheetsAfterFirst = host.shadowRoot!.adoptedStyleSheets.length;
          expect(sheetsAfterFirst).toBe(1);

          // Single property update — DOM changes, sheet count is stable.
          host.text = "updated";
          await host.updateComplete;

          expect(host.shadowRoot!.adoptedStyleSheets.length).toBe(sheetsAfterFirst);
          const p = host.shadowRoot!.querySelector("[data-text]") as HTMLElement;
          expect(p.textContent).toBe("updated");
          expect(getComputedStyle(p).color).toBe("rgb(0, 128, 0)");

          // Many more updates — adoption count must stay flat.
          for (let i = 0; i < 5; i++) {
            host.text = `update-${i}`;
            await host.updateComplete;
          }
          expect(host.shadowRoot!.adoptedStyleSheets.length).toBe(sheetsAfterFirst);
          expect((host.shadowRoot!.querySelector("[data-text]") as HTMLElement).textContent).toBe(
            "update-4"
          );
          expect(
            getComputedStyle(host.shadowRoot!.querySelector("[data-text]") as HTMLElement).color
          ).toBe("rgb(0, 128, 0)");
        });

        test("shadow + globalStyles: document.adoptedStyleSheets does not accumulate as the component re-renders", async () => {
          const TAG = "ssr-styles-global-update";
          const host = setupSsrStyledHost(
            TAG,
            makeUpdatableStyledClass(),
            "<p data-text>initial</p>",
            { globalStyles: `${TAG} { background-color: rgb(33, 66, 99); }` }
          ) as unknown as SsrUpdatableInstance;

          await host.updateComplete;

          const sheet = prototypeGlobalStyles(getRegisteredCtor(TAG))!;
          expect(countSheet(document.adoptedStyleSheets, sheet)).toBe(1);

          // 10 successive updates
          for (let i = 0; i < 10; i++) {
            host.text = `t-${i}`;
            await host.updateComplete;
          }

          expect(countSheet(document.adoptedStyleSheets, sheet)).toBe(1);
          expect(getComputedStyle(host as unknown as HTMLElement).backgroundColor).toBe(
            "rgb(33, 66, 99)"
          );
        });

        test("shadow + globalStyles: disconnect after SSR releases the sheet; reconnect re-adopts it and the computed style returns", async () => {
          const TAG = "ssr-styles-global-disconnect";
          const host = setupSsrStyledHost(
            TAG,
            makeSimpleStyledClass(),
            "<p>server</p>",
            { globalStyles: `${TAG} { background-color: rgb(123, 45, 67); }` }
          ) as KasstorElement;
          const parent = host.parentElement!;
          await host.updateComplete;

          const sheet = prototypeGlobalStyles(getRegisteredCtor(TAG))!;
          expect(countSheet(document.adoptedStyleSheets, sheet)).toBe(1);
          expect(getComputedStyle(host).backgroundColor).toBe("rgb(123, 45, 67)");

          host.remove();
          expect(countSheet(document.adoptedStyleSheets, sheet)).toBe(0);

          parent.appendChild(host);
          await host.updateComplete;

          expect(countSheet(document.adoptedStyleSheets, sheet)).toBe(1);
          expect(getComputedStyle(host).backgroundColor).toBe("rgb(123, 45, 67)");
        });

        test("multiple SSR'd instances of the same component share a single globalStyles sheet on the document (reference-counted)", async () => {
          const TAG = "ssr-styles-multi-instance";

          // Build three hosts BEFORE the tag is registered — each gets its
          // own pre-populated shadow root.
          const hosts = [0, 1, 2].map(i => {
            const h = document.createElement(TAG);
            document.body.appendChild(h);
            ssrCreatedHosts.push(h);
            h.attachShadow({ mode: "open" }).innerHTML = `<p>server-${i}</p>`;
            return h;
          });

          // Registering the class upgrades all three pending instances in
          // tree order — each runs its constructor + connectedCallback.
          Component({
            tag: TAG,
            globalStyles: `${TAG} { background-color: rgb(99, 0, 0); }`
          })(makeSimpleStyledClass() as never);

          // All three hosts are SSR-detected.
          for (const h of hosts) {
            expect(readSsrFlag(h)).toBe(true);
          }

          const sheet = prototypeGlobalStyles(getRegisteredCtor(TAG))!;

          // Reference counted: exactly one entry on document.adoptedStyleSheets
          // even though three instances each took a reference.
          expect(countSheet(document.adoptedStyleSheets, sheet)).toBe(1);

          // Wait for renders to finish and verify the host computed style
          // applies to every instance.
          await Promise.all(hosts.map(h => (h as KasstorElement).updateComplete));
          for (const h of hosts) {
            expect(getComputedStyle(h).backgroundColor).toBe("rgb(99, 0, 0)");
          }
        });
      });
    });
  });
});
