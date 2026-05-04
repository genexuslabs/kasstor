import { DEFAULT_LANGUAGE } from "./default-language.js";
import { getI18nGlobals } from "./get-i18n-globals.js";
import type { KasstorLanguageSubtag } from "./types";

/**
 * Returns the default language subtag, preferring the host-configured value
 * when present, and falling back to the static `DEFAULT_LANGUAGE` ("en").
 */
export const resolveDefaultLanguage = (): KasstorLanguageSubtag =>
  getI18nGlobals().configuredDefaultLanguage ?? DEFAULT_LANGUAGE;
