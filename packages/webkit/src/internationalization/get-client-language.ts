import { getLanguageFromLocalStorage } from "./get-and-set-language-in-local-storage.js";
import { getLanguageFromUserPreferences } from "./get-language-from-user-preferences.js";
import { isLanguageAvailable } from "./is-language-available.js";
import { normalizeTag } from "./normalize-tag.js";
import { resolveDefaultLanguage } from "./resolve-default-language.js";
import type { KasstorLanguageTag } from "./types";

/**
 * Returns the client’s preferred language tag. Safe to call on the server;
 * returns the configured default language when `window` is undefined.
 *
 * Behavior:
 * - In the browser: reads local storage first (only when the persisted value
 *   is valid and available), then `navigator.languages`, then falls back to
 *   the configured default language (or `"en"` when no default is configured).
 * - On the server: returns the configured default language (or `"en"`).
 *
 * @returns A supported BCP 47 language tag; never `null`.
 */
export const getClientLanguage = (): KasstorLanguageTag => {
  if (typeof window === "undefined") {
    return resolveDefaultLanguage();
  }

  const fromStorage = getLanguageFromLocalStorage();
  if (fromStorage !== null) {
    const canonical = normalizeTag(fromStorage);
    if (canonical !== undefined && isLanguageAvailable(canonical)) {
      return canonical;
    }
  }

  return getLanguageFromUserPreferences() ?? resolveDefaultLanguage();
};
