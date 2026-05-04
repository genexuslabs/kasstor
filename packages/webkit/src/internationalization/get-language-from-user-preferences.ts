import { ALL_SUPPORTED_LANGUAGE_SUBTAGS } from "./all-supported-languages.js";
import { isLanguageAvailable } from "./is-language-available.js";
import type { KasstorLanguageSubtag } from "./types";

/**
 * Returns the first supported and currently-available language from the
 * user’s browser preferences (`navigator.languages`), stripping the region
 * subtag (e.g. `"en-US"` → `"en"`).
 *
 * Safe to call on the server: returns `null` when `navigator` is undefined.
 *
 * @returns The matching subtag, or `null` if none of the user’s preferred
 *   languages are supported and available.
 */
export const getLanguageFromUserPreferences = (): KasstorLanguageSubtag | null => {
  if (typeof navigator === "undefined") {
    return null;
  }

  const preferredLanguages = navigator.languages;

  // For index loop is the fastest "for"
  for (let index = 0; index < preferredLanguages.length; index++) {
    const preferredLanguage = preferredLanguages[index];

    // Remove the region
    const preferredLanguageWithoutRegion = preferredLanguage
      .split("-")[0]
      .toLowerCase() as KasstorLanguageSubtag;

    if (
      ALL_SUPPORTED_LANGUAGE_SUBTAGS.has(preferredLanguageWithoutRegion) &&
      isLanguageAvailable(preferredLanguageWithoutRegion)
    ) {
      return preferredLanguageWithoutRegion;
    }
  }

  return null;
};
