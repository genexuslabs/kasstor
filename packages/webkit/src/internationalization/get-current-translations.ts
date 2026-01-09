import { getI18nGlobals } from "./get-i18n-globals";
import type { KasstorTranslationShape } from "./types";

/**
 * Retrieves translations for the current language and specified application
 * @param {string} applicationId - Unique identifier for the application/component
 * @returns {T | undefined} Loaded translations or undefined if not available
 */
export const getCurrentTranslations = <T extends KasstorTranslationShape>(
  applicationId: string
): T | undefined => {
  // Current language is not an object, so it won't be lively updated. That why
  // we can't destructure it outside the function
  const { currentLanguage, loadedTranslations } = getI18nGlobals();

  return currentLanguage
    ? (loadedTranslations.get(applicationId)?.get(currentLanguage) as
        | T
        | undefined)
    : undefined;
};

