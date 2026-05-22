// Regression: components decorated without `sharedDesignSystemStyles` must
// render exactly as before — no `<link>` injection, no `render()` monkey
// patching, no prototype slot pollution.

import { html } from "lit/html.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { cleanup, render } from "vitest-browser-lit";
import { Component, KasstorElement } from "../../index.js";
import {
  cleanupHosts,
  clearDesignSystemState,
  NAMES_SLOT_DESCRIPTION,
  PROMISE_SLOT_DESCRIPTION,
  readPrototypeSlot,
  STYLESHEETS_SLOT_DESCRIPTION
} from "./_helpers.js";

// Class registered once at module load. Lives here (rather than in
// `_helpers.ts`) because the @Component decorator has the side effect of
// calling `customElements.define`, and a tag can only be defined once per
// page — keeping the declaration in a single file guarantees no other test
// file accidentally registers the same tag.
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

      describe("[regression] components without sharedDesignSystemStyles render exactly as before", () => {
        test("CSR: no theme element, no link tag, no slot pollution, original template renders verbatim", async () => {
          render(html`<regression-shared-no-prop></regression-shared-no-prop>`);
          const element = document.querySelector("regression-shared-no-prop")!;
          await (element as KasstorElement).updateComplete;

          expect(element.shadowRoot!.querySelector("kst-theme")).toBeNull();
          expect(element.shadowRoot!.querySelector("link[rel='stylesheet']")).toBeNull();
          expect(element.shadowRoot!.querySelector("[data-marker]")?.textContent).toBe("untouched");
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
            readPrototypeSlot<string[] | undefined>(RegressionNoProp, NAMES_SLOT_DESCRIPTION)
          ).toBeUndefined();
          expect(
            readPrototypeSlot<CSSStyleSheet[] | undefined>(
              RegressionNoProp,
              STYLESHEETS_SLOT_DESCRIPTION
            )
          ).toBeUndefined();
          expect(
            readPrototypeSlot<Promise<void> | undefined>(RegressionNoProp, PROMISE_SLOT_DESCRIPTION)
          ).toBeUndefined();
        });
      });
    });
  });
});
