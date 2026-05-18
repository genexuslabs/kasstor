import { THEME_NAME_TO_STYLE_SHEET_MAPPING } from "./internal/store";

export const getLoadedStyleSheet = (themeName: string): CSSStyleSheet | undefined =>
  THEME_NAME_TO_STYLE_SHEET_MAPPING.get(themeName);

