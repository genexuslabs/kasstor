import { getStyleSheetPromiseInfo } from "./get-style-sheet-promise-info";
import { THEME_NAME_TO_STYLE_SHEET_MAPPING } from "./internal/store";

/**
 * Set the style sheet mapping for the given name with the loaded CSS style sheet.
 *
 * @param name - The name of the theme.
 * @param loadedCssStyleSheet - The loaded CSS style sheet.
 *
 * @example
 * ```ts
 * setStyleSheetMapping("components/button", loadedCssStyleSheet);
 * ```
 */
export const setStyleSheetMapping = (name: string, loadedCssStyleSheet: CSSStyleSheet) => {
  const promiseInfo = getStyleSheetPromiseInfo(name);

  THEME_NAME_TO_STYLE_SHEET_MAPPING.set(name, loadedCssStyleSheet);

  promiseInfo.promiseResolver({ name, styleSheet: loadedCssStyleSheet });
};

