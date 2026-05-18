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
}

export {};

