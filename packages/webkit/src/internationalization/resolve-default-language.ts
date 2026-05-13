import { DEFAULT_LANGUAGE } from "./default-language.js";
import { getI18nGlobals } from "./get-i18n-globals.js";
import type { KasstorLanguageTag } from "./types";

/**
 * Returns the default language tag, preferring the host-configured value
 * when present, and falling back to the static `DEFAULT_LANGUAGE` ("en").
 */
export const resolveDefaultLanguage = (): KasstorLanguageTag =>
  getI18nGlobals().configuredDefaultLanguage ?? DEFAULT_LANGUAGE;
