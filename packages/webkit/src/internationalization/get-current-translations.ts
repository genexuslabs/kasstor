import { getBaseSubtag } from "./get-base-subtag";
import { getI18nGlobals } from "./get-i18n-globals";
import type { KasstorTranslationShape } from "./types";

/**
 * Returns the loaded translations for the current language and feature.
 *
 * Translations are keyed internally by base subtag — region variants share
 * the same translation file.
 *
 * @param featureId - Feature ID passed to `registerTranslations`.
 * @returns The translation shape for the current language, or `undefined` if
 *   not yet loaded or no language is set.
 */
export const getCurrentTranslations = <T extends KasstorTranslationShape>(
  featureId: string
): T | undefined => {
  // Read currentLanguage from inside the function (not destructured outside)
  // so the lookup picks up the latest value after burst language changes.
  const { currentLanguage, loadedTranslations } = getI18nGlobals();
  if (currentLanguage === undefined) {
    return undefined;
  }

  return loadedTranslations.get(featureId)?.get(getBaseSubtag(currentLanguage)) as
    | T
    | undefined;
};
