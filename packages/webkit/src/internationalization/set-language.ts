import { fromLanguageToFullnameAndSubtag } from "./from-language-to-fullname-and-subtag";
import { setLanguageInLocalStorage } from "./get-and-set-language-in-local-storage";
import { getI18nGlobals } from "./get-i18n-globals";
import { getLanguageDirection } from "./get-language-direction";
import { getTranslationsForLanguage } from "./get-translations-for-language";
import { notifyLanguageChange } from "./subscriber";
import type { KasstorLanguage, KasstorLanguageSubtag } from "./types";
import { updateLocation } from "./update-location";

// Side effect to initialize the i18n globals if not already done
getI18nGlobals();

const setLanguageInDocument = (languageSubtag: KasstorLanguageSubtag) => {
  document.documentElement.setAttribute("lang", languageSubtag);
  document.documentElement.setAttribute(
    "dir",
    getLanguageDirection(languageSubtag)
  );
};

/**
 * Sets the active language and loads translations
 * @param language - Language code to set as active
 * @param executeLocationChange - Whether to update the browser's URL to reflect the new language
 * @remarks Loads translations asynchronously and notifies subscribers when complete
 * @returns The new location pathname if it was updated, otherwise undefined
 */
export const setLanguage = (
  language: KasstorLanguage | KasstorLanguageSubtag,
  executeLocationChange = true
) => {
  const { fullLanguageName, subtag } =
    fromLanguageToFullnameAndSubtag(language);
  kasstorWebkitI18n!.currentLanguage = fullLanguageName;

  let newLocation = undefined;

  // TODO: Use different outputs for the browser and server, so we don't need
  // to add this check.
  if (typeof window !== "undefined") {
    setLanguageInLocalStorage(subtag);
    setLanguageInDocument(subtag);
    newLocation = updateLocation(
      { fullLanguageName, subtag },
      executeLocationChange
    );
  }

  getTranslationsForLanguage(fullLanguageName).then(() => {
    // If the user changed the language multiple times, we should check if the
    // resolved promise corresponds to the current language. Otherwise, we could
    // notify language changes that don't correspond with the current language
    if (kasstorWebkitI18n!.currentLanguage === fullLanguageName) {
      // Resolve the promise for the initial language, if it was not previously
      // initialized
      if (kasstorWebkitI18n!.internalLanguageInitializedResolver) {
        kasstorWebkitI18n!.internalLanguageInitializedResolver();
        kasstorWebkitI18n!.internalLanguageInitializedResolver = false;
      }

      // After that, notify all subscribers for the language change
      notifyLanguageChange();
    }
  });

  return newLocation;
};

