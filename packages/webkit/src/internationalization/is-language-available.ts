import { getBaseSubtag } from "./get-base-subtag.js";
import { getI18nGlobals } from "./get-i18n-globals.js";
import type { KasstorLanguageTag } from "./types";

/**
 * Returns whether `tag` is acceptable under the host's `availableLanguages`.
 *
 * When the host has not configured `availableLanguages`, every tag is
 * considered available (legacy behavior — no restriction).
 *
 * Wildcard-by-base matching when a list is configured:
 * - Exact match (`"es-AR"` in `["es-AR", "en-US"]`) → available.
 * - Query base in set (`"es-AR"` matches `["es"]` because `"es"` is the
 *   base) → available.
 * - Set member base equals query (`"es"` matches `["es-AR"]` because the
 *   query is the base of an entry) → available.
 *
 * Note: this is **not** the same as `isValidLanguage`, which checks whether
 * the tag's base is a supported subtag at all. A tag can be valid but not
 * available (e.g. supported by the library but excluded by the host).
 */
export const isLanguageAvailable = (tag: KasstorLanguageTag): boolean => {
  const { availableLanguages } = getI18nGlobals();
  if (availableLanguages === undefined) {
    return true;
  }

  if (availableLanguages.has(tag)) {
    return true;
  }

  const queryBase = getBaseSubtag(tag);

  // Direction 1: query is a tag-with-region, and the base is in the set.
  if (queryBase !== tag && availableLanguages.has(queryBase)) {
    return true;
  }

  // Direction 2: query is a bare subtag, and any member shares that base.
  for (const entry of availableLanguages) {
    if (getBaseSubtag(entry) === queryBase) {
      return true;
    }
  }

  return false;
};
