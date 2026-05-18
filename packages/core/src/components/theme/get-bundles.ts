import type { ThemeItemModel } from "./types.js";

/**
 * Given the bundles array, returns the given bundles in the format of type `ThemeItemModel[]`.
 *
 * This is useful for loading the themes in a component. Example:
 *
 * ```tsx
 * const CSS_BUNDLES: ThemeModel = getBundles(
 *   [
 *     "components/accordion",
 *     "components/button",
 *     "components/checkbox",
 *     "components/combo-box",
 *     "components/edit",
 *     "components/tree-view",
 *     "utils/form",
 *     "utils/layout",
 *   ]
 * );
 *
 * HTML/render/template:
 *   <>
 *     <kst-theme model={CSS_BUNDLES}></kst-theme>
 *     ...
 *   </>
 * ```
 */
export const getBundles = <Bundle extends string>(
  bundles: (Bundle | { name: Bundle; attachStyleSheet?: boolean })[]
): ThemeItemModel[] => {
  const themeBundles: ThemeItemModel[] = [];

  // Iterate over the bundles and add them to the theme model
  for (let i = 0; i < bundles.length; i++) {
    const bundle = bundles[i];

    const actualBundle =
      typeof bundle === "string" ? { name: bundle, attachStyleSheet: true } : bundle;

    themeBundles.push(actualBundle);
  }

  return themeBundles;
};
