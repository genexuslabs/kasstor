// `registerDesignSystem` is the single entry point a host app uses to make
// design-system bundles discoverable to Kasstor components. Two registries
// live on `globalThis` (shared across HMR boundaries and duplicate-package
// installs):
//
//   - `geneXusDesignSystemsRegistry` — design-system name → options blob.
//   - `geneXusDesignSystemsLoaders`  — bundle name → URL (used by the
//     decorator's CSR pre-fetch and by `applySharedDesignSystemStylesForSSR`).
//
// These tests pin down the registry mutations that the decorator depends on,
// the per-bundle URL look-up done by `getStyleSheetUrl`, and the dev-mode
// "already registered" warnings that surface HMR-induced double-registrations
// without breaking the second registrant.

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { registerDesignSystem } from "../register-design-system";
import { getStyleSheetUrl } from "../get-style-sheet-url";

/**
 * The registry maps are stored on `globalThis` and persist across imports;
 * we clear them before every test so each scenario starts from an empty
 * state. The optional chaining mirrors how the runtime initializes the maps
 * lazily — the first import of `internal/store.ts` populates them.
 */
function clearRegistry(): void {
  globalThis.geneXusDesignSystemsRegistry?.clear();
  globalThis.geneXusDesignSystemsLoaders?.clear();
  globalThis.geneXusDesignSystemsStyleSheets?.clear();
  globalThis.geneXusDesignSystemsStyleSheetPromises?.clear();
}

describe("[design-system] [registerDesignSystem]", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clearRegistry();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    clearRegistry();
  });

  test("registers the design system AND every bundle loader it declares — both global maps are populated", () => {
    registerDesignSystem("my-ds", {
      bundleLoaders: {
        "components/accordion": "/themes/accordion.css",
        "components/button": "/themes/button.css"
      }
    });

    // Design-system registry entry exists with the original options blob.
    expect(globalThis.geneXusDesignSystemsRegistry?.get("my-ds")).toEqual({
      bundleLoaders: {
        "components/accordion": "/themes/accordion.css",
        "components/button": "/themes/button.css"
      }
    });

    // Each bundle loader is fanned out into the per-bundle URL map.
    expect(globalThis.geneXusDesignSystemsLoaders?.get("components/accordion")).toBe(
      "/themes/accordion.css"
    );
    expect(globalThis.geneXusDesignSystemsLoaders?.get("components/button")).toBe(
      "/themes/button.css"
    );

    // No warnings on the happy path.
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test("re-registering the SAME design-system name is a no-op — the original options stay, and a single dev-mode warning is emitted (HMR/double-import diagnostic)", () => {
    registerDesignSystem("collision-ds", {
      bundleLoaders: { "components/foo": "/v1/foo.css" }
    });

    // Second registration with DIFFERENT options must be ignored.
    registerDesignSystem("collision-ds", {
      bundleLoaders: { "components/foo": "/v2/foo.css" }
    });

    expect(globalThis.geneXusDesignSystemsRegistry?.get("collision-ds")).toEqual({
      bundleLoaders: { "components/foo": "/v1/foo.css" }
    });
    expect(globalThis.geneXusDesignSystemsLoaders?.get("components/foo")).toBe("/v1/foo.css");

    // Exactly one warning, mentioning the offending design-system name.
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/collision-ds/);
    expect(warnSpy.mock.calls[0][0]).toMatch(/already registered/i);
  });

  test("two different design systems declaring DIFFERENT bundles coexist independently — bundle look-ups stay correctly partitioned", () => {
    registerDesignSystem("ds-a", {
      bundleLoaders: { "ds-a-bundle": "/a/bundle.css" }
    });
    registerDesignSystem("ds-b", {
      bundleLoaders: { "ds-b-bundle": "/b/bundle.css" }
    });

    expect(globalThis.geneXusDesignSystemsRegistry?.size).toBe(2);
    expect(globalThis.geneXusDesignSystemsLoaders?.get("ds-a-bundle")).toBe("/a/bundle.css");
    expect(globalThis.geneXusDesignSystemsLoaders?.get("ds-b-bundle")).toBe("/b/bundle.css");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test("two different design systems declaring the SAME bundle name: first registration wins, second emits a per-bundle warning (one warning per collision, NOT per design-system)", () => {
    registerDesignSystem("first-ds", {
      bundleLoaders: { "shared/bundle": "/first.css" }
    });
    registerDesignSystem("second-ds", {
      bundleLoaders: { "shared/bundle": "/second.css" }
    });

    // The loader URL stays at the FIRST registration's value — the spec
    // intentionally does not let later registrants overwrite an existing
    // bundle, so an HMR'd module never quietly steals an in-flight loader
    // out from under a still-pending component.
    expect(globalThis.geneXusDesignSystemsLoaders?.get("shared/bundle")).toBe("/first.css");

    // The second design system IS still in the registry — only the loader
    // collision is rejected. That is the intent: the design-system slot is
    // independent of the per-bundle loader slot.
    expect(globalThis.geneXusDesignSystemsRegistry?.has("second-ds")).toBe(true);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/shared\/bundle/);
    expect(warnSpy.mock.calls[0][0]).toMatch(/already registered/i);
  });

  test("a design system with an empty `bundleLoaders` map registers cleanly — the DS itself is recorded, the loader map stays empty", () => {
    registerDesignSystem("empty-bundles-ds", { bundleLoaders: {} });

    expect(globalThis.geneXusDesignSystemsRegistry?.has("empty-bundles-ds")).toBe(true);
    expect(globalThis.geneXusDesignSystemsLoaders?.size).toBe(0);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test("interoperates with `getStyleSheetUrl`: after registration, the public helper resolves every declared bundle name", () => {
    registerDesignSystem("integration-ds", {
      bundleLoaders: {
        "components/accordion": "/integration/accordion.css",
        "components/dialog": "/integration/dialog.css"
      }
    });

    expect(getStyleSheetUrl("components/accordion")).toBe("/integration/accordion.css");
    expect(getStyleSheetUrl("components/dialog")).toBe("/integration/dialog.css");
    // Unknown bundles stay `undefined` — `getStyleSheetUrl` is a pure
    // map look-up, it does not auto-resolve.
    expect(getStyleSheetUrl("components/unknown")).toBeUndefined();
  });
});
