import { getI18nGlobals } from "./get-i18n-globals";
import type { KasstorLanguageTag } from "./types";

/**
 * Returns the currently active language tag.
 *
 * @returns The active `KasstorLanguageTag` (with region if any), or `undefined`
 *   if no language has been set yet.
 */
export const getCurrentLanguage = (): KasstorLanguageTag | undefined =>
  getI18nGlobals().currentLanguage;
