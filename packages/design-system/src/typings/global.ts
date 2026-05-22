import type { ThemePromiseResolver } from "./internal-types";
import type { DesignSystemBundleUrl, DesignSystemRegistry } from "./types";

declare global {
  /**
   * Global registry of design systems, keyed by design-system name. The value
   * holds the system-level configuration (e.g. `bundleLoaders`) passed to
   * `registerDesignSystem`.
   *
   * @example
   * ```ts
   * globalThis.geneXusDesignSystemsRegistry?.set("my-ds", {
   *   bundleLoaders: {
   *     "components/accordion": "/themes/accordion.css"
   *   }
   * });
   * ```
   */
  var geneXusDesignSystemsRegistry: DesignSystemRegistry | undefined;

  /**
   * Global map of bundle name → URL. Populated automatically by
   * `registerDesignSystem` from the `bundleLoaders` of each design system, and
   * consumed by `fetchStyleSheet` (and any component built on top of the theme
   * loader, such as `kst-theme`) to resolve a name to a CSS URL.
   *
   * @example
   * ```ts
   * globalThis.geneXusDesignSystemsLoaders?.get("components/accordion");
   * // "/themes/accordion.css"
   * ```
   */
  var geneXusDesignSystemsLoaders: Map<string, DesignSystemBundleUrl> | undefined;

  /**
   * Global cache of `CSSStyleSheet` instances keyed by theme name. Populated
   * by `setStyleSheetMapping` once a bundle resolves successfully, and read
   * by `getLoadedStyleSheet`.
   *
   * Exposed on `globalThis` so test suites and HMR boundaries can clear it
   * (`?.clear()`) without going through a dedicated reset API.
   */
  var geneXusDesignSystemsStyleSheets: Map<string, CSSStyleSheet> | undefined;

  /**
   * Global cache of in-flight `getStyleSheetPromiseInfo` entries keyed by
   * theme name. Used to dedupe concurrent fetches for the same theme.
   *
   * Exposed on `globalThis` so test suites and HMR boundaries can clear it
   * (`?.clear()`) without going through a dedicated reset API.
   */
  var geneXusDesignSystemsStyleSheetPromises: Map<string, ThemePromiseResolver> | undefined;
}

export {};
