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
  document.documentElement.setAttribute("dir", getLanguageDirection(languageSubtag));
};

/**
 * Sets the active language, loads its translations asynchronously, and notifies
 * subscribers when loading is done.
 *
 * @param language - Full name (e.g. `"english"`) or subtag (e.g. `"en"`).
 * @param executeLocationChange - If `true` (default), updates the browser URL
 *   to reflect the new language.
 * @returns The new pathname if the location was updated, otherwise `undefined`.
 *
 * Behavior:
 * - Sets `document.documentElement.lang` and `dir` (LTR/RTL).
 * - Persists the language in local storage (browser only).
 * - Loads translations for all registered features, then notifies
 *   subscribers; if the user changes language again before load finishes,
 *   only the latest language’s subscribers are notified.
 */
export const setLanguage = (
  language: KasstorLanguage | KasstorLanguageSubtag,
  executeLocationChange = true
) => {
  const { fullLanguageName, subtag } = fromLanguageToFullnameAndSubtag(language);
  kasstorWebkitI18n!.currentLanguage = fullLanguageName;

  // Install a pending `languageChangePromise` if none is currently in flight.
  // Burst `setLanguage` calls reuse the same resolver so they all share a
  // single promise that will only resolve once the *latest* language loads.
  if (kasstorWebkitI18n!.internalLanguageChangeResolver === undefined) {
    kasstorWebkitI18n!.languageChangePromise = new Promise<void>(resolve => {
      kasstorWebkitI18n!.internalLanguageChangeResolver = resolve;
    });
  }

  let newLocation = undefined;

  // TODO: Use different outputs for the browser and server, so we don't need
  // to add this check.
  if (typeof window !== "undefined") {
    setLanguageInLocalStorage(subtag);
    setLanguageInDocument(subtag);
    newLocation = updateLocation({ fullLanguageName, subtag }, executeLocationChange);
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

      // Finally, resolve `languageChangePromise` so awaiters of
      // `languageChangeComplete()` continue with the latest language already
      // applied. Clearing the resolver marks the change as "no longer in
      // flight" so the next `setLanguage` installs a fresh promise.
      if (kasstorWebkitI18n!.internalLanguageChangeResolver) {
        kasstorWebkitI18n!.internalLanguageChangeResolver();
        kasstorWebkitI18n!.internalLanguageChangeResolver = undefined;
      }
    }
  });

  return newLocation;
};
