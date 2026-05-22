import { html } from "lit/html.js";
import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render } from "vitest-browser-lit";
import { Component, KasstorElement } from "../index.js";

// ---------------------------------------------------------------------------
// Helpers
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
 * Constructor type that any KasstorElement subclass is assignable to. We
 * can't use `typeof KasstorElement` directly here because it's generic in
 * `Metadata` and concrete subclasses are not — TS rejects the call sites
 * with TS2345.
 */
type KasstorElementClass = abstract new () => KasstorElement;

/**
 * Reads the CSSStyleSheet stored on the component prototype by the `@Component`
 * decorator. The slot is a private `Symbol` (so it's not part of the public
 * API); the symbol's JSDoc documents that tests/tooling can find it via
 * `Object.getOwnPropertySymbols(proto).find(s => s.description === "kasstor-global-stylesheet")`.
 */
function prototypeGlobalStyles(ctor: KasstorElementClass): CSSStyleSheet | undefined {
  const proto = (ctor as unknown as { prototype: object }).prototype;
  const symbol = Object.getOwnPropertySymbols(proto).find(
    s => s.description === "kasstor-global-stylesheet"
  );
  if (!symbol) {
    return undefined;
  }
  return (proto as Record<symbol, CSSStyleSheet | undefined>)[symbol];
}

/** Reads the static `styles` placed on a LitElement subclass by the decorator. */
function staticStyles(ctor: KasstorElementClass): unknown {
  return (ctor as unknown as { styles?: unknown }).styles;
}

/** Returns the CSS text concatenation for a CSSStyleSheet (for content checks). */
function cssText(sheet: CSSStyleSheet): string {
  let out = "";
  for (const rule of sheet.cssRules) {
    out += rule.cssText + "\n";
  }
  return out;
}

// ---------------------------------------------------------------------------
// Component definitions — every scenario gets its own tag to avoid pollution.
// ---------------------------------------------------------------------------

// 1) Shadow DOM + only `styles` (the static Lit way)
@Component({
  tag: "styles-shadow-only-styles",
  styles: "p { color: rgb(0, 128, 0); }"
})
class StylesShadowOnlyStyles extends KasstorElement {
  override render() {
    return html`<p>shadow-only-styles</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "styles-shadow-only-styles": StylesShadowOnlyStyles;
  }
}

// 2) Shadow DOM + only `globalStyles` — adopted on the parent root, so they
//    target the host from outside, NOT the inner content of the shadow root.
//    `background-color` is non-inherited, so it never crosses the shadow
//    boundary and is a reliable indicator of where the rule was applied.
@Component({
  tag: "styles-shadow-only-global",
  globalStyles: "styles-shadow-only-global { background-color: rgb(0, 0, 255); }"
})
class StylesShadowOnlyGlobal extends KasstorElement {
  override render() {
    return html`<p>shadow-only-global</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "styles-shadow-only-global": StylesShadowOnlyGlobal;
  }
}

// 3) Shadow DOM + both `styles` and `globalStyles`
@Component({
  tag: "styles-shadow-both",
  styles: "p { color: rgb(255, 0, 0); }",
  globalStyles: "styles-shadow-both { background-color: rgb(10, 20, 30); }"
})
class StylesShadowBoth extends KasstorElement {
  override render() {
    return html`<p>shadow-both</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "styles-shadow-both": StylesShadowBoth;
  }
}

// 4) No Shadow DOM + only `styles` — the decorator merges them into globalStyles
@Component({
  tag: "styles-noshadow-only-styles",
  shadow: false,
  styles: "styles-noshadow-only-styles p { color: rgb(200, 100, 0); }"
})
class StylesNoShadowOnlyStyles extends KasstorElement {
  override render() {
    return html`<p>noshadow-only-styles</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "styles-noshadow-only-styles": StylesNoShadowOnlyStyles;
  }
}

// 5) No Shadow DOM + only `globalStyles`
@Component({
  tag: "styles-noshadow-only-global",
  shadow: false,
  globalStyles: "styles-noshadow-only-global p { color: rgb(50, 60, 70); }"
})
class StylesNoShadowOnlyGlobal extends KasstorElement {
  override render() {
    return html`<p>noshadow-only-global</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "styles-noshadow-only-global": StylesNoShadowOnlyGlobal;
  }
}

// 6) No Shadow DOM + both `styles` and `globalStyles` (must be merged)
@Component({
  tag: "styles-noshadow-both",
  shadow: false,
  styles: "styles-noshadow-both .a { color: rgb(11, 22, 33); }",
  globalStyles: "styles-noshadow-both .b { color: rgb(44, 55, 66); }"
})
class StylesNoShadowBoth extends KasstorElement {
  override render() {
    return html`<p class="a">a</p><p class="b">b</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "styles-noshadow-both": StylesNoShadowBoth;
  }
}

// 7) Neither styles nor globalStyles — must not adopt anything
@Component({ tag: "styles-shadow-none" })
class StylesShadowNone extends KasstorElement {
  override render() {
    return html`<p>none</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "styles-shadow-none": StylesShadowNone;
  }
}

@Component({ tag: "styles-noshadow-none", shadow: false })
class StylesNoShadowNone extends KasstorElement {
  override render() {
    return html`<p>none</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "styles-noshadow-none": StylesNoShadowNone;
  }
}

// 8) Component used for reference-counting / lifecycle tests
@Component({
  tag: "styles-refcount",
  globalStyles: "styles-refcount { display: block; }"
})
class StylesRefcount extends KasstorElement {
  override render() {
    return html`<span>refcount</span>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "styles-refcount": StylesRefcount;
  }
}

// 9) Two different components with global styles — they must not collide
@Component({
  tag: "styles-iso-a",
  globalStyles: "styles-iso-a { color: rgb(1, 1, 1); }"
})
class StylesIsoA extends KasstorElement {
  override render() {
    return html`<p>iso-a</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "styles-iso-a": StylesIsoA;
  }
}

@Component({
  tag: "styles-iso-b",
  globalStyles: "styles-iso-b { color: rgb(2, 2, 2); }"
})
class StylesIsoB extends KasstorElement {
  override render() {
    return html`<p>iso-b</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "styles-iso-b": StylesIsoB;
  }
}

// 10) Component used to validate behavior when nested inside a parent shadow
//     root: globalStyles must adopt into the parent shadow root, not document.
@Component({
  tag: "styles-cross-root",
  globalStyles: "styles-cross-root { color: rgb(123, 45, 67); }"
})
class StylesCrossRoot extends KasstorElement {
  override render() {
    return html`<p>cross-root</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "styles-cross-root": StylesCrossRoot;
  }
}

// 11) Edge case: empty string for both — must not create a sheet
@Component({
  tag: "styles-empty",
  styles: "",
  globalStyles: ""
})
class StylesEmpty extends KasstorElement {
  override render() {
    return html`<p>empty</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "styles-empty": StylesEmpty;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("[Decorator]", () => {
  describe("[Component]", () => {
    describe("[styles & globalStyles]", () => {
      afterEach(() => cleanup());

      describe("happy path: shadow + styles / globalStyles", () => {
        test("shadow + styles: static stylesheet is attached to the shadow root and styles inner content", async () => {
          render(html`<styles-shadow-only-styles></styles-shadow-only-styles>`);
          const element = document.querySelector(
            "styles-shadow-only-styles"
          )! as StylesShadowOnlyStyles;
          await element.updateComplete;

          // Lit puts static `styles` into shadow root via adoptedStyleSheets
          // (Chromium); the inner <p> should be green.
          const p = element.shadowRoot!.querySelector("p")!;
          expect(getComputedStyle(p).color).toBe("rgb(0, 128, 0)");

          // The static `styles` are NOT a global stylesheet: document.adoptedStyleSheets
          // is untouched for this component.
          expect(prototypeGlobalStyles(StylesShadowOnlyStyles)).toBeUndefined();
        });

        test("shadow + globalStyles: adopted into document and styles the host from outside; inner shadow content is unaffected", async () => {
          render(html`<styles-shadow-only-global></styles-shadow-only-global>`);
          const element = document.querySelector(
            "styles-shadow-only-global"
          )! as StylesShadowOnlyGlobal;
          await element.updateComplete;

          const sheet = prototypeGlobalStyles(StylesShadowOnlyGlobal)!;
          expect(sheet).toBeInstanceOf(CSSStyleSheet);
          expect(document.adoptedStyleSheets).toContain(sheet);

          // The host (in the document) is styled by the global sheet. Using a
          // non-inherited property (`background-color`) avoids accidental
          // inheritance across the shadow boundary masking the test.
          expect(getComputedStyle(element).backgroundColor).toBe("rgb(0, 0, 255)");

          // Content inside the shadow root is NOT styled by the global sheet,
          // which lives on the document. `background-color` is non-inherited,
          // so the inner `<p>` must have a transparent (i.e. unset) background.
          const innerBg = getComputedStyle(element.shadowRoot!.querySelector("p")!).backgroundColor;
          expect(innerBg).not.toBe("rgb(0, 0, 255)");
        });

        test("shadow + both: `styles` go to the shadow root, `globalStyles` go to the document", async () => {
          render(html`<styles-shadow-both></styles-shadow-both>`);
          const element = document.querySelector("styles-shadow-both")! as StylesShadowBoth;
          await element.updateComplete;

          // styles → shadow
          const p = element.shadowRoot!.querySelector("p")!;
          expect(getComputedStyle(p).color).toBe("rgb(255, 0, 0)");

          // globalStyles → document
          const sheet = prototypeGlobalStyles(StylesShadowBoth)!;
          expect(document.adoptedStyleSheets).toContain(sheet);
          expect(cssText(sheet)).toContain("background-color: rgb(10, 20, 30)");

          // globalStyles does NOT include the static `styles` content (no merge in shadow mode)
          expect(cssText(sheet)).not.toContain("color: rgb(255, 0, 0)");

          // Background must come from document-level globalStyles
          expect(getComputedStyle(element).backgroundColor).toBe("rgb(10, 20, 30)");
        });
      });

      describe("happy path: no-shadow", () => {
        test("no shadow: `createRenderRoot` returns `this` and the element renders into its own light DOM", async () => {
          render(html`<styles-noshadow-only-styles></styles-noshadow-only-styles>`);
          const element = document.querySelector(
            "styles-noshadow-only-styles"
          )! as StylesNoShadowOnlyStyles;
          await element.updateComplete;

          expect(element.shadowRoot).toBeNull();
          expect(element.querySelector("p")).not.toBeNull();
        });

        test("no shadow + styles: `styles` are merged into globalStyles and adopted on the document", async () => {
          render(html`<styles-noshadow-only-styles></styles-noshadow-only-styles>`);
          const element = document.querySelector(
            "styles-noshadow-only-styles"
          )! as StylesNoShadowOnlyStyles;
          await element.updateComplete;

          // No static `styles` on the constructor (we're in no-shadow mode)
          expect(staticStyles(StylesNoShadowOnlyStyles)).toBeUndefined();

          // Global stylesheet exists and is on document
          const sheet = prototypeGlobalStyles(StylesNoShadowOnlyStyles)!;
          expect(document.adoptedStyleSheets).toContain(sheet);

          // Light DOM child is styled
          const p = element.querySelector("p")!;
          expect(getComputedStyle(p).color).toBe("rgb(200, 100, 0)");
        });

        test("no shadow + globalStyles: adopted on document and styles the light-DOM child", async () => {
          render(html`<styles-noshadow-only-global></styles-noshadow-only-global>`);
          const element = document.querySelector(
            "styles-noshadow-only-global"
          )! as StylesNoShadowOnlyGlobal;
          await element.updateComplete;

          const sheet = prototypeGlobalStyles(StylesNoShadowOnlyGlobal)!;
          expect(document.adoptedStyleSheets).toContain(sheet);
          expect(getComputedStyle(element.querySelector("p")!).color).toBe("rgb(50, 60, 70)");
        });

        test("no shadow + both: a single merged sheet is created (`styles + ' ' + globalStyles`) — both rules apply", async () => {
          render(html`<styles-noshadow-both></styles-noshadow-both>`);
          const element = document.querySelector("styles-noshadow-both")! as StylesNoShadowBoth;
          await element.updateComplete;

          // A single CSSStyleSheet contains BOTH rules
          const sheet = prototypeGlobalStyles(StylesNoShadowBoth)!;
          expect(sheet).toBeInstanceOf(CSSStyleSheet);
          expect(sheet.cssRules.length).toBe(2);

          const merged = cssText(sheet);
          expect(merged).toContain("color: rgb(11, 22, 33)");
          expect(merged).toContain("color: rgb(44, 55, 66)");

          // Both rules style the light-DOM children
          expect(getComputedStyle(element.querySelector(".a")!).color).toBe("rgb(11, 22, 33)");
          expect(getComputedStyle(element.querySelector(".b")!).color).toBe("rgb(44, 55, 66)");
        });
      });

      describe("happy path: no styles configured", () => {
        test("shadow + neither styles nor globalStyles: nothing is adopted, no leftover sheet on prototype", async () => {
          const sheetsBefore = document.adoptedStyleSheets.length;

          render(html`<styles-shadow-none></styles-shadow-none>`);
          const element = document.querySelector("styles-shadow-none")! as StylesShadowNone;
          await element.updateComplete;

          expect(prototypeGlobalStyles(StylesShadowNone)).toBeUndefined();
          expect(document.adoptedStyleSheets.length).toBe(sheetsBefore);
          // The element still gets a shadow root (the default for KasstorElement).
          expect(element.shadowRoot).not.toBeNull();
        });

        test("no-shadow + neither: nothing is adopted and no sheet is created", async () => {
          const sheetsBefore = document.adoptedStyleSheets.length;

          render(html`<styles-noshadow-none></styles-noshadow-none>`);
          const element = document.querySelector("styles-noshadow-none")! as StylesNoShadowNone;
          await element.updateComplete;

          expect(prototypeGlobalStyles(StylesNoShadowNone)).toBeUndefined();
          expect(document.adoptedStyleSheets.length).toBe(sheetsBefore);
          expect(element.shadowRoot).toBeNull();
        });
      });

      describe("efficiency: a single CSSStyleSheet is shared across all instances", () => {
        test("the sheet on the prototype is identical across multiple instances", async () => {
          render(html`
            <styles-refcount></styles-refcount>
            <styles-refcount></styles-refcount>
            <styles-refcount></styles-refcount>
          `);
          const elements = Array.from(
            document.querySelectorAll("styles-refcount")
          ) as StylesRefcount[];
          await Promise.all(elements.map(el => el.updateComplete));

          expect(elements.length).toBe(3);

          const protoSheet = prototypeGlobalStyles(StylesRefcount)!;
          // The slot lives on the prototype under a private Symbol; each instance
          // sees it via prototype-chain lookup, so every instance returns the
          // same reference.
          const slot = Object.getOwnPropertySymbols(
            Object.getPrototypeOf(elements[0]) as object
          ).find(s => s.description === "kasstor-global-stylesheet")!;
          for (const el of elements) {
            const instanceSheet = (el as unknown as Record<symbol, CSSStyleSheet | undefined>)[
              slot
            ];
            expect(instanceSheet).toBe(protoSheet);
          }
        });

        test("with N connected instances, document.adoptedStyleSheets still contains the sheet exactly once", async () => {
          render(html`
            <styles-refcount></styles-refcount>
            <styles-refcount></styles-refcount>
            <styles-refcount></styles-refcount>
            <styles-refcount></styles-refcount>
            <styles-refcount></styles-refcount>
          `);
          const elements = Array.from(
            document.querySelectorAll("styles-refcount")
          ) as StylesRefcount[];
          await Promise.all(elements.map(el => el.updateComplete));

          const sheet = prototypeGlobalStyles(StylesRefcount)!;
          // Reference-counted: 5 instances → still just one entry on the doc
          expect(countSheet(document.adoptedStyleSheets, sheet)).toBe(1);
        });

        test("two different components contribute two independent sheets to the document", async () => {
          render(html`
            <styles-iso-a></styles-iso-a>
            <styles-iso-b></styles-iso-b>
          `);
          const a = document.querySelector("styles-iso-a")! as StylesIsoA;
          const b = document.querySelector("styles-iso-b")! as StylesIsoB;
          await a.updateComplete;
          await b.updateComplete;

          const sheetA = prototypeGlobalStyles(StylesIsoA)!;
          const sheetB = prototypeGlobalStyles(StylesIsoB)!;
          expect(sheetA).not.toBe(sheetB);
          expect(document.adoptedStyleSheets).toContain(sheetA);
          expect(document.adoptedStyleSheets).toContain(sheetB);

          expect(getComputedStyle(a).color).toBe("rgb(1, 1, 1)");
          expect(getComputedStyle(b).color).toBe("rgb(2, 2, 2)");
        });
      });

      describe("lifecycle & memory: disconnect releases, reconnect re-adopts", () => {
        test("removing the only instance removes the sheet from the document; readding restores it", async () => {
          render(html`<styles-refcount></styles-refcount>`);
          const element = document.querySelector("styles-refcount")! as StylesRefcount;
          const parent = element.parentElement!;
          await element.updateComplete;

          const sheet = prototypeGlobalStyles(StylesRefcount)!;
          expect(countSheet(document.adoptedStyleSheets, sheet)).toBe(1);

          element.remove();
          // disconnectedCallback runs synchronously on remove
          expect(countSheet(document.adoptedStyleSheets, sheet)).toBe(0);

          parent.appendChild(element);
          await element.updateComplete;
          expect(countSheet(document.adoptedStyleSheets, sheet)).toBe(1);
        });

        test("with two instances, removing one keeps the sheet adopted; removing the second removes it", async () => {
          render(html`
            <styles-refcount></styles-refcount>
            <styles-refcount></styles-refcount>
          `);
          const [first, second] = Array.from(
            document.querySelectorAll("styles-refcount")
          ) as StylesRefcount[];
          await first.updateComplete;
          await second.updateComplete;

          const sheet = prototypeGlobalStyles(StylesRefcount)!;
          expect(countSheet(document.adoptedStyleSheets, sheet)).toBe(1);

          first.remove();
          expect(countSheet(document.adoptedStyleSheets, sheet)).toBe(1);

          second.remove();
          expect(countSheet(document.adoptedStyleSheets, sheet)).toBe(0);
        });

        test("rapid connect/disconnect cycles do not leak (counter stays balanced)", async () => {
          render(html`<div id="rapid-host"></div>`);
          const host = document.getElementById("rapid-host")!;
          const sheet = prototypeGlobalStyles(StylesRefcount)!;

          for (let i = 0; i < 25; i++) {
            const el = document.createElement("styles-refcount");
            host.appendChild(el);
            await (el as StylesRefcount).updateComplete;
            expect(countSheet(document.adoptedStyleSheets, sheet)).toBe(1);
            el.remove();
            expect(countSheet(document.adoptedStyleSheets, sheet)).toBe(0);
          }
        });

        test("connectedCallback called manually a second time on the same instance is idempotent (no double-adoption)", async () => {
          render(html`<styles-refcount></styles-refcount>`);
          const element = document.querySelector("styles-refcount")! as StylesRefcount;
          await element.updateComplete;

          const sheet = prototypeGlobalStyles(StylesRefcount)!;
          expect(countSheet(document.adoptedStyleSheets, sheet)).toBe(1);

          // Defensive: directly invoke connectedCallback again — the idempotent
          // guard in `addGlobalStyleSheet` must keep the count at exactly 1.
          element.connectedCallback();
          expect(countSheet(document.adoptedStyleSheets, sheet)).toBe(1);

          element.connectedCallback();
          expect(countSheet(document.adoptedStyleSheets, sheet)).toBe(1);
        });

        test("moving an instance between two siblings in the document keeps the sheet adopted exactly once", async () => {
          render(html`
            <div id="container-a"><styles-refcount></styles-refcount></div>
            <div id="container-b"></div>
          `);
          const containerA = document.getElementById("container-a")!;
          const containerB = document.getElementById("container-b")!;
          const element = document.querySelector("styles-refcount")! as StylesRefcount;
          await element.updateComplete;

          const sheet = prototypeGlobalStyles(StylesRefcount)!;
          expect(countSheet(document.adoptedStyleSheets, sheet)).toBe(1);

          containerB.appendChild(element);
          await element.updateComplete;

          expect(countSheet(document.adoptedStyleSheets, sheet)).toBe(1);
          expect(containerA.querySelector("styles-refcount")).toBeNull();
          expect(containerB.querySelector("styles-refcount")).toBe(element);
        });
      });

      describe("cross-root: globalStyles adopt into the root that actually contains the element", () => {
        test("element nested inside a parent shadow root: globalStyles land in that shadow root, not the document", async () => {
          // Build the host manually since vitest-browser-lit renders into the document.
          const host = document.createElement("div");
          const shadow = host.attachShadow({ mode: "open" });
          document.body.appendChild(host);

          const element = document.createElement("styles-cross-root") as StylesCrossRoot;
          shadow.appendChild(element);
          await element.updateComplete;

          const sheet = prototypeGlobalStyles(StylesCrossRoot)!;
          expect(shadow.adoptedStyleSheets).toContain(sheet);
          expect(document.adoptedStyleSheets).not.toContain(sheet);

          // Cleanup: removing the host detaches the inner element, which fires
          // disconnectedCallback and releases the reference on the shadow root.
          host.remove();
          expect(shadow.adoptedStyleSheets).not.toContain(sheet);
        });

        test("element moved from a parent shadow root to the document re-adopts the sheet on the document", async () => {
          const shadowHost = document.createElement("div");
          const shadow = shadowHost.attachShadow({ mode: "open" });
          document.body.appendChild(shadowHost);

          const element = document.createElement("styles-cross-root") as StylesCrossRoot;
          shadow.appendChild(element);
          await element.updateComplete;

          const sheet = prototypeGlobalStyles(StylesCrossRoot)!;
          expect(shadow.adoptedStyleSheets).toContain(sheet);
          expect(document.adoptedStyleSheets).not.toContain(sheet);

          // Move to the document — disconnect fires first (releasing the shadow
          // root's reference) then connect fires for the new root.
          document.body.appendChild(element);
          await element.updateComplete;

          expect(shadow.adoptedStyleSheets).not.toContain(sheet);
          expect(document.adoptedStyleSheets).toContain(sheet);

          // Cleanup
          element.remove();
          shadowHost.remove();
          expect(document.adoptedStyleSheets).not.toContain(sheet);
        });
      });

      describe("edge cases", () => {
        test("empty string `styles` and `globalStyles` are treated as none — no sheet is created", () => {
          // No need to render: the decorator already ran when the class was defined.
          expect(prototypeGlobalStyles(StylesEmpty)).toBeUndefined();
          expect(staticStyles(StylesEmpty)).toBeUndefined();
        });

        test("shadow: false disables LitElement's static `styles` slot (the decorator never sets it)", () => {
          expect(staticStyles(StylesNoShadowOnlyStyles)).toBeUndefined();
          expect(staticStyles(StylesNoShadowOnlyGlobal)).toBeUndefined();
          expect(staticStyles(StylesNoShadowBoth)).toBeUndefined();
        });

        test("shadow mode: only `styles` (not `globalStyles`) is wired into LitElement.styles", () => {
          // The decorator wraps `styles` via `unsafeCSS`, so the static `styles`
          // value must be defined and a CSSResult-like object (`.cssText` exists).
          const stylesProp = staticStyles(StylesShadowOnlyStyles) as { cssText?: string };
          expect(stylesProp).toBeDefined();
          expect(typeof stylesProp.cssText).toBe("string");
          expect(stylesProp.cssText).toContain("color: rgb(0, 128, 0)");
        });

        test("a totally detached instance (never connected) does not adopt anywhere", async () => {
          // Creating an element via `document.createElement` does NOT connect it.
          const element = document.createElement("styles-refcount") as StylesRefcount;

          const sheet = prototypeGlobalStyles(StylesRefcount)!;
          // Sheet is on the prototype but is not adopted into any root yet.
          expect(sheet).toBeInstanceOf(CSSStyleSheet);
          expect(document.adoptedStyleSheets).not.toContain(sheet);

          // Connect it, then remove — final state must be clean.
          document.body.appendChild(element);
          await element.updateComplete;
          expect(countSheet(document.adoptedStyleSheets, sheet)).toBe(1);
          element.remove();
          expect(countSheet(document.adoptedStyleSheets, sheet)).toBe(0);
        });

        test("the global stylesheet content actually matches what the decorator received (not mutated)", () => {
          const sheet = prototypeGlobalStyles(StylesShadowOnlyGlobal)!;
          const text = cssText(sheet);
          expect(text).toContain("styles-shadow-only-global");
          expect(text).toContain("background-color: rgb(0, 0, 255)");
        });

        test("no-shadow + both merges `styles` first, then `globalStyles` (order is `styles + globalStyles`)", () => {
          const sheet = prototypeGlobalStyles(StylesNoShadowBoth)!;
          const rules = Array.from(sheet.cssRules).map(r => r.cssText);
          // Order matters because later rules with the same specificity win in CSS.
          // The decorator must put `styles` first and `globalStyles` second.
          expect(rules[0]).toContain("styles-noshadow-both .a");
          expect(rules[1]).toContain("styles-noshadow-both .b");
        });
      });
    });
  });
});
