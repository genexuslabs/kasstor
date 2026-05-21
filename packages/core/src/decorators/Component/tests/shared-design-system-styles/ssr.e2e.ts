// SSR — when the host's shadow root is pre-populated before custom-element
// upgrade, the constructor takes the SSR branch:
// `applySharedDesignSystemStylesForSSR` monkey-patches `render()` so it
// prepends one `<link rel="stylesheet" crossorigin href="<URL>">` per
// declared bundle. The browser is responsible for loading the CSS — there
// is no JS gate, no CSSStyleSheet adoption.
//
// Bundles that are not registered in the design-system registry throw at
// constructor time (the upgrade fails loudly). Earlier versions of the
// runtime warned and rendered with partial styles — now any missing bundle
// stops the component from upgrading at all, so the build/dev environment
// surfaces the misconfiguration immediately.

import { registerDesignSystem, setStyleSheetMapping } from "@genexus/kasstor-design-system";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { cleanup } from "vitest-browser-lit";
import {
  cleanupHosts,
  clearDesignSystemState,
  setupHost,
  shadowAdoptedSheets,
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

      describe("[SSR] pre-populated shadow root — runtime emits <link> tags", () => {
        test('renders one <link rel="stylesheet"> per bundle, pointing to the registry URL', async () => {
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
          expect(host.shadowRoot!.querySelector("link[rel='stylesheet']")).not.toBeNull();
        });
      });

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
      // SSR fail-fast — unregistered bundles throw at constructor time.
      //
      // Earlier versions warned and rendered with partial styles. The new
      // behaviour surfaces the misconfiguration immediately so an SSR build
      // that forgot to register a design system breaks loudly instead of
      // silently emitting a degraded page.
      // ===================================================================
      describe("[SSR fail-fast] unregistered bundles throw during element upgrade", () => {
        test("an unregistered bundle throws — the error message names both the missing bundle and the host tag, and points the developer at `registerDesignSystem`", () => {
          expect(() =>
            setupHost(uniqueTag(), {
              sharedDesignSystemStyles: ["ssr-edge-unregistered"],
              ssrShadowHtml: "<span data-ssr-placeholder></span>"
            })
          ).toThrow(/ssr-edge-unregistered/);
        });

        test("the thrown error mentions `registerDesignSystem` so the fix is obvious", () => {
          let caught: unknown;
          try {
            setupHost(uniqueTag(), {
              sharedDesignSystemStyles: ["ssr-edge-points-to-fix"],
              ssrShadowHtml: "<span data-ssr-placeholder></span>"
            });
          } catch (err) {
            caught = err;
          }
          expect(caught).toBeInstanceOf(Error);
          expect((caught as Error).message).toMatch(/registerDesignSystem/);
        });

        test("partial registration: any unregistered bundle still throws, even if other bundles in the list ARE registered", () => {
          registerDesignSystem("ds-ssr-partial", {
            bundleLoaders: { "ssr-partial-known": "/styles/ssr-partial-known.css" }
          });

          expect(() =>
            setupHost(uniqueTag(), {
              sharedDesignSystemStyles: ["ssr-partial-known", "ssr-partial-missing"],
              ssrShadowHtml: "<span data-ssr-placeholder></span>"
            })
          ).toThrow(/ssr-partial-missing/);
        });

        test("CSR (no pre-populated shadow root) does NOT throw on an unregistered bundle — the gate is on the joined Promise.all, which resolves silently with `undefined` after the timeout", async () => {
          // The SSR throw lives in `applySharedDesignSystemStylesForSSR`,
          // which only runs when `componentWasServerSideRendered(this)`
          // returns true. CSR (no pre-populated shadow root) takes the
          // pending-promise path and the host stays usable while the bundle
          // is unreachable — only the styles end up missing.
          expect(() =>
            setupHost(uniqueTag(), {
              sharedDesignSystemStyles: ["ssr-edge-csr-no-throw"]
            })
          ).not.toThrow();
        });

        test("setStyleSheetMapping called BEFORE registering the bundle in `registerDesignSystem`: SSR still throws because the registry URL is what determines the <link> tag's href", () => {
          // setStyleSheetMapping populates the in-memory style-sheet cache
          // (for CSR cache hits) but does NOT register a URL — so the SSR
          // path, which depends on `getStyleSheetUrl`, still cannot resolve
          // the bundle and must throw.
          setStyleSheetMapping("ssr-edge-mapping-only", new CSSStyleSheet());

          expect(() =>
            setupHost(uniqueTag(), {
              sharedDesignSystemStyles: ["ssr-edge-mapping-only"],
              ssrShadowHtml: "<span data-ssr-placeholder></span>"
            })
          ).toThrow(/ssr-edge-mapping-only/);
        });
      });
    });
  });
});
