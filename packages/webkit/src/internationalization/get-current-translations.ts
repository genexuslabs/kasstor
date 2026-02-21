import { getI18nGlobals } from "./get-i18n-globals";
import type { KasstorTranslationShape } from "./types";

/**
 * Returns the loaded translations for the current language and feature.
 *
 * @param featureId - Feature ID passed to `registerTranslations`.
 * @returns The translation shape for the current language, or `undefined` if
 *   not yet loaded or no language is set.
 */
export const getCurrentTranslations = <T extends KasstorTranslationShape>(
  featureId: string
): T | undefined => {
  // Current language is not an object, so it won't be lively updated. That why
  // we can't destructure it outside the function
  const { currentLanguage, loadedTranslations } = getI18nGlobals();

  return currentLanguage
    ? (loadedTranslations.get(featureId)?.get(currentLanguage) as T | undefined)
    : undefined;
};
