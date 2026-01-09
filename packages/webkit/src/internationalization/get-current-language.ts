import { fromLanguageToFullnameAndSubtag } from "./from-language-to-fullname-and-subtag";
import { getI18nGlobals } from "./get-i18n-globals";
import type { KasstorLanguageFullnameAndSubtag } from "./types";

/**
 * Gets the currently active language for internationalization
 * @returns The current language code or undefined if not set
 */
export const getCurrentLanguage = ():
  | KasstorLanguageFullnameAndSubtag
  | undefined => {
  const { currentLanguage } = getI18nGlobals();

  return currentLanguage
    ? fromLanguageToFullnameAndSubtag(currentLanguage)
    : undefined;
};

