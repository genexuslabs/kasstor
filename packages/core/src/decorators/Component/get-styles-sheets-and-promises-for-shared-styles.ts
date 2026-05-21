import { fetchStyleSheet } from "@genexus/kasstor-design-system/fetch-style-sheet.js";
import { getLoadedStyleSheet } from "@genexus/kasstor-design-system/get-loaded-style-sheet.js";
import { getStyleSheetPromiseInfo } from "@genexus/kasstor-design-system/get-style-sheet-promise-info.js";

export const getStylesheetsAndPromisesForSharedStyles = (
  model: string[]
): {
  successfulThemes: CSSStyleSheet[];
  promises: Promise<CSSStyleSheet | undefined>[];
} => {
  /**
   * Array of stylesheets that are being loaded or will be loaded in the future.
   */
  const promises: Promise<CSSStyleSheet | undefined>[] = [];
  const successfulThemes: CSSStyleSheet[] = [];

  // For let i ... is the faster way to iterate over an array in JavaScript
  for (let i = 0; i < model.length; i++) {
    const name = model[i];

    const loadedCssStyleSheet = getLoadedStyleSheet(name);

    // The stylesheet is already loaded and cached
    if (loadedCssStyleSheet !== undefined) {
      successfulThemes.push(loadedCssStyleSheet);
      continue;
    }

    // The stylesheet is not loaded yet, so we need to fetch it or await for
    // someone to do it if we don't have the URL mapping
    const promiseInfo = getStyleSheetPromiseInfo(name);

    // Try to fetch the theme
    fetchStyleSheet(name);

    promises.push(promiseInfo.promise.then(value => value?.styleSheet));
  }

  return { successfulThemes, promises };
};

