import { ALL_SUPPORTED_LANGUAGE_SUBTAGS } from "./all-supported-languages.js";
import { DEFAULT_LANGUAGE } from "./default-language.js";
import { getLanguageFromLocalStorage } from "./get-and-set-language-in-local-storage.js";
import type { KasstorLanguageSubtag } from "./types";

/**
 * Get the user's preferred language from the browser settings.
 * @returns The first supported language found in the user's preferences, or null if none is found.
 */
const getLanguageFromUserPreferences = (): KasstorLanguageSubtag | null => {
  const preferredLanguages = navigator.languages;

  // For index loop is the fastest "for"
  for (let index = 0; index < preferredLanguages.length; index++) {
    const preferredLanguage = preferredLanguages[index];

    // Remove the region
    const preferredLanguageWithoutRegion = preferredLanguage
      .split("-")[0]
      .toLowerCase() as KasstorLanguageSubtag;

    if (ALL_SUPPORTED_LANGUAGE_SUBTAGS.has(preferredLanguageWithoutRegion)) {
      return preferredLanguageWithoutRegion;
    }
  }

  return null;
};

/**
 * Get the client's language preference.
 *  - The function checks for a language setting in local storage first.
 *  - If not found, it checks the user's browser preferences.
 *  - If neither is available, it defaults to `"en"`.
 *
 * @returns The client's preferred language.
 */
export const getClientLanguage = (): KasstorLanguageSubtag =>
  typeof window === "undefined"
    ? DEFAULT_LANGUAGE
    : (getLanguageFromLocalStorage() ??
      getLanguageFromUserPreferences() ??
      DEFAULT_LANGUAGE);

