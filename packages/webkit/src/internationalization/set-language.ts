import { DEV_MODE } from "../development-flags.js";
import { setLanguageInLocalStorage } from "./get-and-set-language-in-local-storage";
import { getI18nGlobals } from "./get-i18n-globals";
import { getLanguageDirection } from "./get-language-direction";
import { getTranslationsForLanguage } from "./get-translations-for-language";
import { normalizeTag } from "./normalize-tag";
import { notifyLanguageChange } from "./subscriber";
import type { KasstorLanguageTag } from "./types";
import { updateLocation } from "./update-location";

// Side effect to initialize the i18n globals if not already done
getI18nGlobals();

const setLanguageInDocument = (tag: KasstorLanguageTag) => {
  document.documentElement.setAttribute("lang", tag);
  document.documentElement.setAttribute("dir", getLanguageDirection(tag));
};

/**
 * Sets the active language, loads its translations asynchronously, and
 * notifies subscribers when loading is done.
 *
 * @param language - A BCP47 tag (bare subtag like `"en"` or tag-with-region
 *   like `"en-US"`). The input is canonicalized via `normalizeTag` (base
 *   lowercased, region uppercased). Invalid inputs are no-ops with a
 *   `DEV_MODE` warning.
 * @param executeLocationChange - If `true` (default), updates the browser URL
 *   to reflect the new language.
 * @returns The new pathname if the location was updated, otherwise `undefined`.
 *
 * Behavior:
 * - Sets `document.documentElement.lang` (the full tag, region included) and
 *   `document.documentElement.dir` (based on the base subtag).
 * - Persists the language tag in local storage (browser only).
 * - Loads translations for all registered features (per-feature cache means
 *   region-only changes hit the cache); then notifies subscribers. If the
 *   user changes language again before load finishes, only the latest
 *   language's subscribers are notified.
 */
export const setLanguage = (
  language: KasstorLanguageTag,
  executeLocationChange = true
): string | undefined => {
  const tag = normalizeTag(language);
  if (tag === undefined) {
    if (DEV_MODE) {
      console.warn(
        `[kasstor i18n] "setLanguage" received an invalid language tag "${String(language)}"; ignoring.`
      );
    }
    return undefined;
  }

  kasstorWebkitI18n!.currentLanguage = tag;

  // Install a pending `languageChangePromise` if none is currently in flight.
  if (kasstorWebkitI18n!.internalLanguageChangeResolver === undefined) {
    kasstorWebkitI18n!.languageChangePromise = new Promise<void>(resolve => {
      kasstorWebkitI18n!.internalLanguageChangeResolver = resolve;
    });
  }

  let newLocation = undefined;

  // TODO: Use different outputs for the browser and server, so we don't need
  // to add this check.
  if (typeof window !== "undefined") {
    setLanguageInLocalStorage(tag);
    setLanguageInDocument(tag);
    newLocation = updateLocation(tag, executeLocationChange);
  }

  // Pass the full tag (region included) so per-feature loaders can pick
  // their regional override when present, falling back to the base subtag
  // otherwise. See `resolveLoaderKey` in `get-translations-for-language`.
  getTranslationsForLanguage(tag).then(() => {
    // If the user changed the language multiple times, only the latest one
    // should notify subscribers.
    if (kasstorWebkitI18n!.currentLanguage === tag) {
      if (kasstorWebkitI18n!.internalLanguageInitializedResolver) {
        kasstorWebkitI18n!.internalLanguageInitializedResolver();
        kasstorWebkitI18n!.internalLanguageInitializedResolver = false;
      }

      notifyLanguageChange();

      if (kasstorWebkitI18n!.internalLanguageChangeResolver) {
        kasstorWebkitI18n!.internalLanguageChangeResolver();
        kasstorWebkitI18n!.internalLanguageChangeResolver = undefined;
      }
    }
  });

  return newLocation;
};
