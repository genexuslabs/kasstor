import type { KstTheme } from "../theme.lit";

export const canAttachStyleSheet = (
  attachStyleSheet: boolean | undefined,
  loadedCssStyleSheet: CSSStyleSheet | undefined,
  kstThemeRef: KstTheme
) =>
  attachStyleSheet !== false &&
  loadedCssStyleSheet !== undefined &&
  kstThemeRef.isConnected &&
  kstThemeRef.attachStyleSheetsDisabled !== true;
