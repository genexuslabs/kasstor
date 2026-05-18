import type { ThemePromiseResolver } from "../typings/internal-types";

export const THEME_NAME_TO_STYLE_SHEET_MAPPING = new Map<string, CSSStyleSheet>();
export const THEME_NAME_TO_PROMISE_MAPPING = new Map<string, ThemePromiseResolver>();

