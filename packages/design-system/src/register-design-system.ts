import { DEV_MODE } from "./development-flags";
import { fetchStyleSheet } from "./fetch-style-sheet";
import {
  getDesignSystemLoaders,
  getDesignSystemRegistry
} from "./internal/get-design-system-registry";
import { isSomeoneWaitingForTheThemeToBeLoaded } from "./internal/is-someone-waiting-for-the-theme-to-be-loaded";
import type { DesignSystemRegistryOptions } from "./typings/types";

/**
 * Register a design system in the global registry.
 *
 * If the design system is already registered, a warning will be logged and the current design system won't be redefined.
 *
 * @param designSystemName - The name of the design system to register.
 * @param options - The options for the design system.
 *
 * @example
 * ```ts
 * registerDesignSystem("design-system-name", {
 *   bundleLoaders: {
 *     "components/accordion": bundleUrl,
 *   },
 * });
 * ```
 */
export const registerDesignSystem = (
  designSystemName: string,
  options: DesignSystemRegistryOptions
) => {
  const geneXusDesignSystemsRegistry = getDesignSystemRegistry();

  if (geneXusDesignSystemsRegistry.has(designSystemName)) {
    if (DEV_MODE) {
      console.warn(
        `[@genexus/kasstor-design-system | registerDesignSystem] The design system "${designSystemName}" is already registered. The current design system won't be redefined.\nIn some cases, this error can happen due to HMR (Hot Module Replacement) issues.`
      );
    }
    return;
  }
  geneXusDesignSystemsRegistry.set(designSystemName, options);

  const geneXusDesignSystemsLoaders = getDesignSystemLoaders();
  const bundleNames = Object.keys(options.bundleLoaders);

  // Register the bundle loaders.
  // For let i ... is the faster way to iterate over an array in JavaScript
  for (let i = 0; i < bundleNames.length; i++) {
    const bundleName = bundleNames[i];
    const loader = options.bundleLoaders[bundleName];

    // If the bundle loader is already registered, we log a warning and continue
    if (geneXusDesignSystemsLoaders.has(bundleName)) {
      if (DEV_MODE) {
        console.warn(
          `[@genexus/kasstor-design-system | registerDesignSystem] The bundle loader "${bundleName}" is already registered. The current bundle loader won't be redefined.\nIn some cases, this error can happen due to HMR (Hot Module Replacement) issues.`
        );
      }
      continue;
    }
    geneXusDesignSystemsLoaders.set(bundleName, loader);

    // Verify if someone is waiting for the theme to be loaded and fetch it if so.
    // We must check this to avoid fetching themes that no one is waiting for.
    if (isSomeoneWaitingForTheThemeToBeLoaded(bundleName)) {
      fetchStyleSheet(bundleName);
    }
  }
};

