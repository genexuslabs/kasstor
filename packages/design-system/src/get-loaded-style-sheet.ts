import { getStyleSheetCache } from "./internal/store";

export const getLoadedStyleSheet = (themeName: string): CSSStyleSheet | undefined =>
  getStyleSheetCache().get(themeName);

