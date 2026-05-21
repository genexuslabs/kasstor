// Edge cases for the `sharedDesignSystemStyles` option:
//   - The option is omitted entirely.
//   - The option is an empty array.
//   - A subset of the bundles are cached at decoration time.

import { setStyleSheetMapping } from "@genexus/kasstor-design-system";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { cleanup } from "vitest-browser-lit";
import { KasstorElement } from "../../index.js";
import {
  cleanupHosts,
  clearDesignSystemState,
  flushMicroAndMacroTasks,
  makeStyleSheet,
  NAMES_SLOT_DESCRIPTION,
  PROMISE_SLOT_DESCRIPTION,
  readPrototypeSlot,
  registerClass,
  setupHost,
  shadowAdoptedSheets,
  STYLESHEETS_SLOT_DESCRIPTION,
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
            readPrototypeSlot<CSSStyleSheet[] | undefined>(ctor, STYLESHEETS_SLOT_DESCRIPTION)
          ).toBeUndefined();
          expect(
            readPrototypeSlot<Promise<void> | undefined>(ctor, PROMISE_SLOT_DESCRIPTION)
          ).toBeUndefined();

          const host = document.createElement(tag) as KasstorElement;
          document.body.appendChild(host);
          trackHost(host);
          await host.updateComplete;

          expect(host.shadowRoot!.querySelector("[data-original]")?.textContent).toBe("client");
        });

        test("an empty array `[]` is treated as 'no shared styles' — empty stylesheets array, no promise slot", async () => {
          const tag = uniqueTag();
          const ctor = registerClass(tag, { sharedDesignSystemStyles: [] });

          // The names slot is set (the empty array), so the SSR render patch
          // is invoked but no-ops since `styleSheetUrls` ends up empty.
          expect(readPrototypeSlot<string[] | undefined>(ctor, NAMES_SLOT_DESCRIPTION)).toEqual([]);
          expect(
            readPrototypeSlot<CSSStyleSheet[] | undefined>(ctor, STYLESHEETS_SLOT_DESCRIPTION)
          ).toEqual([]);
          expect(
            readPrototypeSlot<Promise<void> | undefined>(ctor, PROMISE_SLOT_DESCRIPTION)
          ).toBeUndefined();

          const host = document.createElement(tag) as KasstorElement;
          document.body.appendChild(host);
          trackHost(host);
          await host.updateComplete;

          expect(host.shadowRoot!.querySelector("kst-theme")).toBeNull();
          expect(host.shadowRoot!.querySelector("link[rel='stylesheet']")).toBeNull();
          expect(host.shadowRoot!.querySelector("[data-original]")?.textContent).toBe("client");
          expect(shadowAdoptedSheets(host)).toHaveLength(0);
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
    });
  });
});
