import { fetchStyleSheet } from "@genexus/kasstor-design-system/fetch-style-sheet.js";
import { getLoadedStyleSheet } from "@genexus/kasstor-design-system/get-loaded-style-sheet.js";
import { getStyleSheetPromiseInfo } from "@genexus/kasstor-design-system/get-style-sheet-promise-info.js";
import { addGlobalStyleSheet } from "@genexus/kasstor-webkit/stylesheets.js";

import type { KstTheme } from "../theme.lit";
import type { ThemeItemModel } from "../types";
import { canAttachStyleSheet } from "./can-attach-stylesheet";

/**
 * Loads the themes from the model into the DOM.
 *
 * @returns Array of promises that will be resolved when the themes are loaded.
 */
export const loadThemes = (
  model: ThemeItemModel[],
  kstThemeRef: KstTheme
): {
  successfulThemes: string[];
  promises: Promise<{ name: string; styleSheet: CSSStyleSheet | undefined }>[];
} => {
  /**
   * Array of stylesheets that are being loaded or will be loaded in the future.
   */
  const promises: Promise<{ name: string; styleSheet: CSSStyleSheet | undefined }>[] = [];
  const successfulThemes: string[] = [];

  // For let i ... is the faster way to iterate over an array in JavaScript
  for (let i = 0; i < model.length; i++) {
    const themeItem = model[i];
    const { attachStyleSheet, name } = themeItem;

    const loadedCssStyleSheet = getLoadedStyleSheet(name);

    // The stylesheet is already loaded and cached
    if (loadedCssStyleSheet !== undefined) {
      // Sometimes we only want to cache the stylesheet and not attach it to the DOM
      if (canAttachStyleSheet(attachStyleSheet, loadedCssStyleSheet, kstThemeRef)) {
        addGlobalStyleSheet(kstThemeRef, loadedCssStyleSheet);
      }
      successfulThemes.push(name);
      continue;
    }

    // The stylesheet is not loaded yet, so we need to fetch it or await for
    // someone to do it if we don't have the URL mapping
    const promiseInfo = getStyleSheetPromiseInfo(name);

    // Try to fetch the theme
    fetchStyleSheet(name);

    // Attach the stylesheet to the DOM if it's not already attached
    promiseInfo.promise.then(value => {
      // TODO: Add a test to each of one of these conditions.
      // TODO: What should happen if the promise is resolved while the element is disconnected, but after some milliseconds it is connected again?
      if (canAttachStyleSheet(attachStyleSheet, value?.styleSheet, kstThemeRef)) {
        // TODO: If we are going to make reactive the attachStyleSheet and model
        // properties, we need to re-validate this code here because the model of the
        // kst-theme could have changed since the promise was created.
        addGlobalStyleSheet(kstThemeRef, value.styleSheet!);
      }
    });

    promises.push(promiseInfo.promise);
  }

  return { successfulThemes, promises };
};

