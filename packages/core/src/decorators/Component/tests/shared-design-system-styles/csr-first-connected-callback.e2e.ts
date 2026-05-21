// First `connectedCallback` contract — adoption is deferred to
// `scheduleUpdate`. The first connect MUST NOT eagerly adopt the shared
// sheets, because Lit's `connectedCallback` cannot return a Promise that
// gates the first render; that responsibility belongs to `scheduleUpdate`.
//
// These tests use a subclass-level `connectedCallback` override that
// captures the adoption-target state immediately after `super.connectedCallback()`
// returns, so we can assert "no adoption yet" before the first scheduleUpdate
// flushes.

import { setStyleSheetMapping } from "@genexus/kasstor-design-system";
import { html } from "lit/html.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { cleanup } from "vitest-browser-lit";
import { Component, KasstorElement } from "../../index.js";
import {
  cleanupHosts,
  clearDesignSystemState,
  makeStyleSheet,
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
          trackHost(host);

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
          trackHost(host);

          // The first connect must NOT eagerly call `addGlobalStyleSheet`.
          expect(docSheetsAtConnect).not.toContain(sheet);

          await host.updateComplete;
          expect(document.adoptedStyleSheets).toContain(sheet);
        });
      });
    });
  });
});
