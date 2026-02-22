import { ALL_SUPPORTED_LANGUAGE_SUBTAGS } from "./all-supported-languages.js";
import { DEFAULT_LANGUAGE } from "./default-language.js";
import { getLanguageFromLocalStorage } from "./get-and-set-language-in-local-storage.js";
import type { KasstorLanguageSubtag } from "./types";

/**
 * Returns the first supported language from the user’s browser preferences.
 *
 * @returns The matching subtag, or `null` if none of the user’s preferred
 *   languages are supported.
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
 * Returns the client’s preferred language (subtag). Safe to call on the server;
 * returns the default language when `window` is undefined.
 *
 * Behavior:
 * - In the browser: reads local storage first, then `navigator.languages`, then defaults to `"en"`.
 * - On the server: returns the default language (e.g. `"en"`).
 *
 * @returns A supported BCP 47 language subtag; never `null`.
 */
export const getClientLanguage = (): KasstorLanguageSubtag =>
  typeof window === "undefined"
    ? DEFAULT_LANGUAGE
    : (getLanguageFromLocalStorage() ?? getLanguageFromUserPreferences() ?? DEFAULT_LANGUAGE);
