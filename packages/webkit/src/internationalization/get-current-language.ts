import { fromLanguageToFullnameAndSubtag } from "./from-language-to-fullname-and-subtag";
import { getI18nGlobals } from "./get-i18n-globals";
import type { KasstorLanguageFullnameAndSubtag } from "./types";

/**
 * Returns the currently active language as full name and BCP 47 subtag.
 *
 * @returns `{ fullLanguageName, subtag }` if a language is set, otherwise `undefined`.
 */
export const getCurrentLanguage = (): KasstorLanguageFullnameAndSubtag | undefined => {
  const { currentLanguage } = getI18nGlobals();

  return currentLanguage ? fromLanguageToFullnameAndSubtag(currentLanguage) : undefined;
};
